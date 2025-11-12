import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, location, searchMode } = await req.json();
    console.log("Chat request:", { searchMode, location, messageCount: messages.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Define tools based on search mode
    const tools = [];

    if (searchMode === "internet") {
      tools.push({
        type: "function",
        function: {
          name: "search_internet_events",
          description: "Search the internet for live music events near a location and date",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string", description: "City name" },
              date: { type: "string", description: "Date or date range" },
            },
            required: ["city", "date"],
          },
        },
      });
    } else {
      tools.push({
        type: "function",
        function: {
          name: "query_database_events",
          description: "Query the laiive database for live music events within 10km of location",
          parameters: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
              startDate: { type: "string" },
              endDate: { type: "string" },
            },
            required: ["latitude", "longitude", "startDate", "endDate"],
          },
        },
      });
    }

    const systemPrompt = `You are an AI assistant helping users find live music events. 
${searchMode === "database" ? `You have access to the laiive database of events. User location: ${JSON.stringify(location)}.` : "You can search the internet for events."}

When users ask about events, use the appropriate tool to search and format results as a list with:
- Event/Artist name
- Venue
- Price
- Ticket link (🎫)
- Google Maps directions (📍)

If users change their search parameters (location, date, genre, etc.), call the search tool again with updated parameters.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle streaming with tool calls
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;

                if (toolCalls) {
                  // Handle tool calls
                  for (const toolCall of toolCalls) {
                    if (toolCall.function?.name === "query_database_events") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Querying database:", args);

                      // Query events within 10km radius
                      const { data: events, error } = await supabaseClient
                        .from("events")
                        .select("*")
                        .gte("event_date", args.startDate)
                        .lte("event_date", args.endDate)
                        .order("event_date");

                      if (error) {
                        console.error("Database query error:", error);
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              choices: [{ delta: { content: "Sorry, I couldn't search the database. " } }],
                            })}\n\n`
                          )
                        );
                      } else {
                        // Filter by distance (simple approximation)
                        const filteredEvents = events?.filter((event) => {
                          if (!event.latitude || !event.longitude) return false;
                          const distance = Math.sqrt(
                            Math.pow(event.latitude - args.latitude, 2) +
                              Math.pow(event.longitude - args.longitude, 2)
                          ) * 111; // rough km conversion
                          return distance <= 10;
                        }) || [];

                        // Format events
                        const formattedEvents = filteredEvents
                          .map(
                            (e) =>
                              `**${e.artist || e.name}** at ${e.venue}\n📅 ${new Date(e.event_date).toLocaleDateString()}\n💰 ${e.price ? `$${e.price}` : "Free"}\n${e.ticket_url ? `🎫 [Get Tickets](${e.ticket_url})` : ""}\n📍 [Directions](https://maps.google.com/?q=${e.latitude},${e.longitude})`
                          )
                          .join("\n\n");

                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              choices: [
                                {
                                  delta: {
                                    content: `Found ${filteredEvents.length} events near you:\n\n${formattedEvents || "No events found."}`,
                                  },
                                },
                              ],
                            })}\n\n`
                          )
                        );
                      }
                    } else if (toolCall.function?.name === "search_internet_events") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Internet search requested:", args);
                      
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            choices: [
                              {
                                delta: {
                                  content: `🔍 Searching for live music events in ${args.city} around ${args.date}...\n\n(Internet search integration coming soon - this will search across ticketing platforms and venue websites)`,
                                },
                              },
                            ],
                          })}\n\n`
                        )
                      );
                    }
                  }
                } else {
                  // Regular content streaming
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
