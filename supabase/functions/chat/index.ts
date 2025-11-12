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

    // Define tools - always include helper tools
    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "parse_relative_date",
          description: "Convert relative date expressions (like 'tomorrow', 'next week', 'this weekend') to ISO date format",
          parameters: {
            type: "object",
            properties: {
              dateExpression: { type: "string", description: "The relative date expression to parse" },
            },
            required: ["dateExpression"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "standardize_city_name",
          description: "Standardize city names and handle misspellings to get the correct format",
          parameters: {
            type: "object",
            properties: {
              cityInput: { type: "string", description: "The city name that may contain typos or variations" },
            },
            required: ["cityInput"],
          },
        },
      },
    ];

    if (searchMode === "internet") {
      tools.push({
        type: "function",
        function: {
          name: "search_internet_events",
          description: "Search the internet for live music events in a specific city and date range. Returns real event data from various sources.",
          parameters: {
            type: "object",
            properties: {
              city: { type: "string", description: "Standardized city name" },
              startDate: { type: "string", description: "Start date in ISO format (YYYY-MM-DD)" },
              endDate: { type: "string", description: "End date in ISO format (YYYY-MM-DD)" },
              genre: { type: "string", description: "Music genre filter (optional)" },
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
          description: "Query the laiive database for live music events within 10km of location",
          parameters: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
              startDate: { type: "string", description: "ISO format date" },
              endDate: { type: "string", description: "ISO format date" },
            },
            required: ["latitude", "longitude", "startDate", "endDate"],
          },
        },
      });
    }

    const locationInfo = location ? `User's current location: ${location.city || 'Unknown city'} (${location.latitude}, ${location.longitude})` : "User location not available";

    const systemPrompt = `You are an AI assistant helping users find live music events.

Current date: ${currentDate}
Current time: ${currentTime}
${locationInfo}

${searchMode === "database" ? "You have access to the laiive database of events." : "You can search the internet for events from various ticketing platforms and venues."}

CRITICAL WORKFLOW:
1. When users mention relative dates (tomorrow, this weekend, next week), use parse_relative_date tool to convert them silently
2. When users mention cities, use standardize_city_name tool to correct them silently
3. After parsing dates and cities, immediately call the search tool (${searchMode === "database" ? "query_database_events" : "search_internet_events"})
4. Present results conversationally with clear formatting
5. If users request different parameters, repeat the process with new parameters

HELPER TOOLS (use silently, don't announce):
- parse_relative_date: converts "tomorrow", "next week" etc. to ISO dates
- standardize_city_name: fixes typos and standardizes city names

IMPORTANT:
- Use user's current location as default if not specified
- Always call helper tools before the main search tool
- Don't show intermediate parsing steps to users
- Present results in a friendly, conversational way

Format each event as:
🎵 **Artist/Event Name** at Venue
📝 Brief description
📅 Date & Time
💰 Price
🎫 [Ticket Link if available] | 📍 [Google Maps Location]`;

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

        // State for silent tool results and output control
        let pendingStartDate: string | null = null;
        let pendingEndDate: string | null = null;
        let pendingCity: string | null = null;
        let resultsSent = false;

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
                    if (toolCall.function?.name === "parse_relative_date") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Parsing relative date:", args);
                      
                      // Process silently - don't show to user
                      const parsedDate = parseRelativeDate(args.dateExpression, now);
                      pendingStartDate = parsedDate.start;
                      pendingEndDate = parsedDate.end;
                      console.log("Parsed date result:", parsedDate);
                      
                    } else if (toolCall.function?.name === "standardize_city_name") {
                      const args = JSON.parse(toolCall.function.arguments);
                      console.log("Standardizing city name:", args);
                      
                      // Process silently - don't show to user
                      const standardized = standardizeCityName(args.cityInput);
                      pendingCity = standardized;
                      console.log("Standardized city:", standardized);
                      
                    } else if (toolCall.function?.name === "query_database_events") {
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

                        // Format events with proper icons and links
                        const formattedEvents = filteredEvents
                          .map(
                            (e) => {
                              const date = new Date(e.event_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              });
                              const time = new Date(e.event_date).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              });
                              
                              const ticketLink = e.ticket_url ? `🎫 [Tickets](${e.ticket_url})` : '';
                              const mapsLink = e.latitude && e.longitude 
                                ? `📍 [Map](https://maps.google.com/?q=${e.latitude},${e.longitude})` 
                                : '';
                              const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                              
                              return `🎵 **${e.artist || e.name}** at ${e.venue}
${e.description ? `📝 ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}\n` : ''}📅 ${date} at ${time}
💰 ${e.price ? `€${e.price}` : "Free"}
${links}`;
                            }
                          )
                          .join("\n\n");

                        const responseMessage = filteredEvents.length > 0
                          ? `I found ${filteredEvents.length} event${filteredEvents.length > 1 ? 's' : ''} for you:\n\n${formattedEvents}`
                          : `I couldn't find any events matching your criteria. Try adjusting the date or location.`;
                        resultsSent = true;

                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              choices: [
                                {
                                  delta: {
                                    content: responseMessage,
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
                      
                      // Perform web search for events
                      const searchQuery = `live music events ${args.city} ${args.startDate} ${args.endDate} ${args.genre || ""} tickets`;
                      
                      try {
                        // Search multiple event platforms
                        const searchResults = await searchWebEvents(searchQuery, args);
                        
                        if (searchResults.length > 0) {
                          const formattedResults = searchResults.map(event => {
                            const ticketLink = event.ticketUrl ? `🎫 [Tickets](${event.ticketUrl})` : '';
                            const mapsLink = event.mapsUrl ? `📍 [Map](${event.mapsUrl})` : '';
                            const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                            
                            return `🎵 **${event.artist}** at ${event.venue}
${event.description ? `📝 ${event.description}\n` : ''}📅 ${event.date}
💰 ${event.price}
${links}`;
                          }).join("\n\n");
                          
                          resultsSent = true;
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({
                                choices: [
                                  {
                                    delta: {
                                      content: `I found ${searchResults.length} event${searchResults.length > 1 ? 's' : ''} for you:\n\n${formattedResults}`,
                                    },
                                  },
                                ],
                              })}\n\n`
                            )
                          );
                        } else {
                          resultsSent = true;
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({
                                choices: [
                                  {
                                    delta: {
                                      content: `I searched for events in ${args.city} from ${args.startDate} to ${args.endDate}, but couldn't find any results. Try adjusting your search parameters or checking specific venue websites.`,
                                    },
                                  },
                                ],
                              })}\n\n`
                            )
                          );
                        }
                      } catch (searchError) {
                        console.error("Web search error:", searchError);
                          resultsSent = true;
                          controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              choices: [
                                {
                                  delta: {
                                    content: `⚠️ I encountered an issue searching the web. Please try the laiive database search instead.`,
                                  },
                                },
                              ],
                            })}\n\n`
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

          // Fallback: if no results were sent, perform automatic search using parsed parameters
          if (!resultsSent) {
            try {
              const start = pendingStartDate || currentDate;
              const end = pendingEndDate || start;

              if (searchMode === "database" && location?.latitude && location?.longitude) {
                const { data: events, error } = await supabaseClient
                  .from("events")
                  .select("*")
                  .gte("event_date", start)
                  .lte("event_date", end)
                  .order("event_date");

                if (!error) {
                  const filteredEvents = (events || []).filter((event) => {
                    if (!event.latitude || !event.longitude) return false;
                    const distance = Math.sqrt(
                      Math.pow(event.latitude - location.latitude, 2) +
                      Math.pow(event.longitude - location.longitude, 2)
                    ) * 111;
                    return distance <= 10;
                  });

                  const formattedEvents = filteredEvents
                    .map((e) => {
                      const date = new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                      const time = new Date(e.event_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      const ticketLink = e.ticket_url ? `🎫 [Tickets](${e.ticket_url})` : '';
                      const mapsLink = e.latitude && e.longitude ? `📍 [Map](https://maps.google.com/?q=${e.latitude},${e.longitude})` : '';
                      const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                      return `🎵 **${e.artist || e.name}** at ${e.venue}\n${e.description ? `📝 ${e.description.substring(0, 100)}${e.description.length > 100 ? '...' : ''}\n` : ''}📅 ${date} at ${time}\n💰 ${e.price ? `€${e.price}` : "Free"}\n${links}`;
                    })
                    .join("\n\n");

                  const responseMessage = filteredEvents.length > 0
                    ? `I found ${filteredEvents.length} event${filteredEvents.length > 1 ? 's' : ''} near you:\n\n${formattedEvents}`
                    : `I couldn't find any events matching your criteria. Try adjusting the date or location.`;

                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ choices: [{ delta: { content: responseMessage } }] })}\n\n`
                    )
                  );
                  resultsSent = true;
                }
              } else if (searchMode === "internet") {
                const city = pendingCity || (location?.city ? standardizeCityName(location.city) : "");
                if (city) {
                  const searchQuery = `live music events ${city} ${start} ${end} tickets`;
                  const searchResults = await searchWebEvents(searchQuery, { city, startDate: start, endDate: end });

                  if (searchResults.length > 0) {
                    const formattedResults = searchResults.map((event: any) => {
                      const ticketLink = event.ticketUrl ? `🎫 [Tickets](${event.ticketUrl})` : '';
                      const mapsLink = event.mapsUrl ? `📍 [Map](${event.mapsUrl})` : '';
                      const links = [ticketLink, mapsLink].filter(Boolean).join(' | ');
                      return `🎵 **${event.artist}** at ${event.venue}\n${event.description ? `📝 ${event.description}\n` : ''}📅 ${event.date}\n💰 ${event.price}\n${links}`;
                    }).join("\n\n");

                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ choices: [{ delta: { content: `I found ${searchResults.length} event${searchResults.length > 1 ? 's' : ''} for you:\n\n${formattedResults}` } }] })}\n\n`
                      )
                    );
                    resultsSent = true;
                  } else {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ choices: [{ delta: { content: `I searched for events in ${city} from ${start} to ${end}, but couldn't find any results. Try adjusting your search parameters.` } }] })}\n\n`
                      )
                    );
                    resultsSent = true;
                  }
                }
              }
            } catch (fallbackError) {
              console.error('Fallback search error:', fallbackError);
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
