import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to parse relative dates
function parseRelativeDate(expression: string, referenceDate: Date): { start: string; end: string } {
  const expr = expression.toLowerCase().trim();
  const ref = new Date(referenceDate);
  
  if (expr.includes("tomorrow")) {
    const tomorrow = new Date(ref);
    tomorrow.setDate(ref.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return { start: dateStr, end: dateStr };
  }
  
  if (expr.includes("today")) {
    const dateStr = ref.toISOString().split('T')[0];
    return { start: dateStr, end: dateStr };
  }
  
  if (expr.includes("this weekend") || expr.includes("weekend")) {
    const dayOfWeek = ref.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(ref);
    saturday.setDate(ref.getDate() + daysUntilSaturday);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    return {
      start: saturday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  }
  
  if (expr.includes("next week")) {
    const nextWeekStart = new Date(ref);
    nextWeekStart.setDate(ref.getDate() + (7 - ref.getDay() + 1));
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
    return {
      start: nextWeekStart.toISOString().split('T')[0],
      end: nextWeekEnd.toISOString().split('T')[0]
    };
  }
  
  if (expr.includes("this week")) {
    const weekStart = new Date(ref);
    weekStart.setDate(ref.getDate() - ref.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    };
  }
  
  // Default: return the expression as-is if it looks like a date
  return { start: expression, end: expression };
}

// Helper function to standardize city names
function standardizeCityName(cityInput: string): string {
  const normalized = cityInput.toLowerCase().trim();
  
  // Common misspellings and variations
  const cityMap: Record<string, string> = {
    "bergamo": "Bergamo",
    "bergmo": "Bergamo",
    "milan": "Milan",
    "milano": "Milan",
    "rome": "Rome",
    "roma": "Rome",
    "florence": "Florence",
    "firenze": "Florence",
    "venice": "Venice",
    "venezia": "Venice",
    "turin": "Turin",
    "torino": "Turin",
    "naples": "Naples",
    "napoli": "Naples",
  };
  
  return cityMap[normalized] || cityInput.charAt(0).toUpperCase() + cityInput.slice(1);
}

// Helper function to search web for events
async function searchWebEvents(query: string, filters: any): Promise<any[]> {
  console.log("Searching web for:", query, filters);
  
  // Simple web scraping approach - search common event platforms
  const results: any[] = [];
  
  try {
    // Search Google for events (basic approach)
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Basic parsing - look for common event patterns
      // This is a simplified version - in production you'd use proper HTML parsing
      const eventPatterns = [
        /live music/gi,
        /concert/gi,
        /tickets/gi,
      ];
      
      // For now, return a placeholder that indicates search was attempted
      console.log("Web search completed, found content length:", html.length);
    }
  } catch (error) {
    console.error("Web search error:", error);
  }
  
  // Return empty array for now - actual web scraping would need more robust implementation
  // or integration with event APIs like Ticketmaster, Songkick, etc.
  return results;
}

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

    // Get current date/time for context
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    // Define single search tool based on mode
    const tools: any[] = [];

    if (searchMode === "internet") {
      tools.push({
        type: "function",
        function: {
          name: "search_internet_events",
          description: "Search the internet for live music events. Parse dates like 'tomorrow', 'this weekend' to ISO format yourself. Standardize city names yourself.",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string", description: "City name (standardized)" },
              startDate: { type: "string", description: "Start date in ISO format (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date in ISO format (YYYY-MM-DD)" },
            },
            required: ["city", "startDate", "endDate"],
          },
        },
      });
    } else {
      tools.push({
        type: "function",
        function: {
          name: "query_database_events",
          description: "Query the laiive database for live music events. Parse dates like 'tomorrow', 'this weekend' to ISO format yourself. Standardize city names yourself. Use city filter if user specifies a city, otherwise use lat/long.",
          parameters: {
            type: "object",
            properties: {
              latitude: { type: "number", description: "User latitude for proximity search" },
              longitude: { type: "number", description: "User longitude for proximity search" },
              startDate: { type: "string", description: "Start date ISO format (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date ISO format (YYYY-MM-DD)" },
              city: { type: "string", description: "City name filter (optional, use instead of lat/long if specified)" },
            },
            required: ["startDate", "endDate"],
          },
        },
      });
    }

    const locationInfo = location ? `User location: ${location.city || 'Unknown'} (${location.latitude}, ${location.longitude})` : "No location";

    const systemPrompt = `You help users find live music events. Today is ${currentDate}. ${locationInfo}.

${searchMode === "database" ? "Use query_database_events to search the laiive database." : "Use search_internet_events to search the web."}

WORKFLOW:
1. Greet user and understand their request
2. Extract date (convert "tomorrow", "this weekend" etc. to YYYY-MM-DD) and place (use user's location if not specified)
3. Call the search tool immediately with extracted parameters
4. Display results with this format:
   🎵 **Artist** at Venue, City
   📝 Description (short)
   📅 Date & Time
   💰 Price
   🎫 [Tickets] | 📍 [Map]
5. If user changes date/place, call search tool again with new parameters

Parse dates yourself:
- "tomorrow" → ${new Date(new Date(currentDate).getTime() + 86400000).toISOString().split('T')[0]}
- "today" → ${currentDate}
- "this weekend" → next Saturday to Sunday

Standardize cities: Bergamo, Milan, Rome, etc. (capitalize first letter).

Use user's location (${location?.city || location?.latitude + ',' + location?.longitude}) as default if not specified.`;

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
                  for (const toolCall of toolCalls) {
                    if (toolCall.function?.name === "query_database_events") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Querying database:", args);

                      // Build full-day range
                      const startBound = new Date(`${args.startDate}T00:00:00Z`).toISOString();
                      const endExclusive = new Date(new Date(`${args.endDate}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();

                      let query = supabaseClient
                        .from("events")
                        .select("*")
                        .gte("event_date", startBound)
                        .lt("event_date", endExclusive)
                        .order("event_date");

                      if (args.city) {
                        query = query.ilike("city", args.city);
                      }

                      const { data: events, error } = await query;

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
                        // If no city filter, apply 10km proximity filter
                        const useProximity = !args.city && typeof args.latitude === 'number' && typeof args.longitude === 'number';
                        const filteredEvents = (events || []).filter((event) => {
                          if (useProximity) {
                            if (!event.latitude || !event.longitude) return false;
                            const distance = Math.sqrt(
                              Math.pow(event.latitude - args.latitude, 2) +
                              Math.pow(event.longitude - args.longitude, 2)
                            ) * 111;
                            return distance <= 10;
                          }
                          return true;
                        });

                        if (filteredEvents.length > 0) {
                          const formattedEvents = filteredEvents
                            .map((e) => {
                              const date = new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                              const time = new Date(e.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                              const ticketLink = e.ticket_url ? `🎫 [Tickets](${e.ticket_url})` : '';
                              const mapsLink = e.latitude && e.longitude ? `📍 [Map](https://maps.google.com/?q=${e.latitude},${e.longitude})` : '';
                              const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                              const place = e.city ? `${e.venue}, ${e.city}` : e.venue;
                              return `🎵 **${e.artist || e.name}** at ${place}\n${e.description ? `📝 ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}\n` : ''}📅 ${date} at ${time}\n💰 ${e.price ? `€${e.price}` : "Free"}\n${links}`;
                            })
                            .join("\n\n");

                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ choices: [{ delta: { content: `I found ${filteredEvents.length} event${filteredEvents.length > 1 ? 's' : ''}:\n\n${formattedEvents}` } }] })}\n\n`
                            )
                          );
                        } else {
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ choices: [{ delta: { content: `I couldn't find any events matching your criteria. Try adjusting the date or location.` } }] })}\n\n`
                            )
                          );
                        }
                      }
                    } else if (toolCall.function?.name === "search_internet_events") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Internet search requested:", args);
                      
                      const searchQuery = `live music events ${args.city} ${args.startDate} ${args.endDate} tickets`;
                      
                      try {
                        const searchResults = await searchWebEvents(searchQuery, args);
                        
                        if (searchResults.length > 0) {
                          const formattedResults = searchResults.map(event => {
                            const ticketLink = event.ticketUrl ? `🎫 [Tickets](${event.ticketUrl})` : '';
                            const mapsLink = event.mapsUrl ? `📍 [Map](${event.mapsUrl})` : '';
                            const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                            return `🎵 **${event.artist}** at ${event.venue}\n${event.description ? `📝 ${event.description}\n` : ''}📅 ${event.date}\n💰 ${event.price}\n${links}`;
                          }).join("\n\n");
                          
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ choices: [{ delta: { content: `I found ${searchResults.length} event${searchResults.length > 1 ? 's' : ''}:\n\n${formattedResults}` } }] })}\n\n`
                            )
                          );
                        } else {
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({ choices: [{ delta: { content: `I searched for events in ${args.city} but couldn't find any results. The internet search feature is still in development - try the laiive database search instead.` } }] })}\n\n`
                            )
                          );
                        }
                      } catch (searchError) {
                        console.error("Web search error:", searchError);
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ I encountered an issue searching the web. Please try the laiive database search instead.` } }] })}\n\n`
                          )
                        );
                      }
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
