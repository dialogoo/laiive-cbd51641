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
    const { messages } = await req.json();
    console.log("Promoter create request:", { messageCount: messages.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const tools = [
      {
        type: "function",
        function: {
          name: "insert_event",
          description: "Insert a new event into the database after all information is confirmed",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Event or artist name" },
              artist: { type: ["string", "null"], description: "Artist name (optional)" },
              description: { type: ["string", "null"], description: "Event description (optional)" },
              venue: { type: "string", description: "Venue name" },
              city: { type: "string", description: "City name" },
              event_date: { type: "string", description: "Event date and time in ISO format" },
              price: { type: ["number", "null"], description: "Ticket price (optional)" },
              latitude: { type: ["number", "null"], description: "Venue latitude (optional)" },
              longitude: { type: ["number", "null"], description: "Venue longitude (optional)" },
              ticket_url: { type: ["string", "null"], description: "Ticket URL (optional)" },
            },
            required: ["name", "venue", "city", "event_date"],
          },
        },
      },
    ];

    const systemPrompt = `You are an AI assistant helping event promoters add their events to the laiive platform. 

Follow this conversation flow:

1. WELCOME & COLLECT: Start with a friendly welcome and ask for these REQUIRED fields:
   - Event name (REQUIRED)
   - Date and time (REQUIRED)
   - Venue name (REQUIRED)
   - City (REQUIRED)
   
   And these OPTIONAL fields:
   - Artist name (optional)
   - Event description (optional)
   - Ticket price (optional)

2. VALIDATE & CONFIRM: Once you have all information, show a checklist for confirmation:
   ✓ Artist: [name]
   ✓ Description: [description]
   ✓ Date & Time: [date]
   ✓ Venue: [venue]
   ✓ City: [city]
   ✓ Price: [price]
   
   Ask "Does everything look correct? If not, please let me know what needs to be changed."

3. ENRICH DATA: Tell the user you're searching for venue location and artist information online to complete the listing.

4. VENUE & ARTIST CONFIRMATION: Show what you found:
   📍 Venue: [venue name] in [city]
   🎤 Artist: [artist info you found]
   
   Ask for confirmation with: "Does this information look correct?"

5. INSERT TO DATABASE: After final confirmation, use the insert_event tool to save the event and confirm success.

Be conversational, helpful, and guide the user through each step. If information is missing or incorrect, politely ask for clarification.`;

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

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = "";
        let toolCallBuffer = "";

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
                  for (const toolCall of toolCalls) {
                    if (toolCall.function?.name === "insert_event") {
                      // Accumulate tool call arguments
                      if (toolCall.function?.arguments) {
                        toolCallBuffer += toolCall.function.arguments;
                      }

                      // Try to parse when we have complete JSON
                      try {
                        const args = JSON.parse(toolCallBuffer);
                        console.log("Inserting event:", args);

                        const insertData: any = {
                          name: args.name,
                          venue: args.venue,
                          city: args.city,
                          event_date: args.event_date,
                        };

                        // Only include optional fields if they have actual values
                        if (args.artist) insertData.artist = args.artist;
                        if (args.description) insertData.description = args.description;
                        if (args.price !== null && args.price !== undefined) insertData.price = args.price;
                        if (args.latitude !== null && args.latitude !== undefined) insertData.latitude = args.latitude;
                        if (args.longitude !== null && args.longitude !== undefined) insertData.longitude = args.longitude;
                        if (args.ticket_url) insertData.ticket_url = args.ticket_url;

                        const { data: eventData, error } = await supabaseClient
                          .from("events")
                          .insert(insertData)
                          .select()
                          .single();

                        if (error) {
                          console.error("Database insert error:", error);
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({
                                choices: [{ delta: { content: "Sorry, I couldn't save the event to the database. Please try again." } }],
                              })}\n\n`
                            )
                          );
                        } else {
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({
                                choices: [
                                  {
                                    delta: {
                                      content: `✅ **Event successfully posted!**\n\nYour event "${args.name}" has been added to laiive and will be visible to users searching for live music events in ${args.city}.`,
                                    },
                                  },
                                ],
                              })}\n\n`
                            )
                          );
                        }

                        toolCallBuffer = "";
                      } catch (e) {
                        // JSON not complete yet, continue accumulating
                        console.log("Waiting for complete JSON...");
                      }
                    }
                  }
                } else {
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
    console.error("Promoter create error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
