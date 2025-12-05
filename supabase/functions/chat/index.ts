import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to parse relative dates with time-of-day awareness
function parseRelativeDate(expression: string, referenceDate: Date): { start: string; end: string; timeContext?: string } {
  const expr = expression.toLowerCase().trim();
  const ref = new Date(referenceDate);
  const currentHour = ref.getHours();
  
  // Extract time-of-day context
  let timeContext = "";
  let targetDate = new Date(ref);
  
  // Parse day modifiers
  if (expr.includes("tomorrow")) {
    targetDate.setDate(ref.getDate() + 1);
  } else if (expr.includes("today") || expr.includes("tonight") || expr.includes("this evening") || expr.includes("this afternoon") || expr.includes("this morning")) {
    // Keep current date
  } else if (expr.includes("this weekend") || expr.includes("weekend")) {
    const dayOfWeek = ref.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    targetDate.setDate(ref.getDate() + daysUntilSaturday);
    const sunday = new Date(targetDate);
    sunday.setDate(targetDate.getDate() + 1);
    return {
      start: targetDate.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      timeContext: "evening"
    };
  } else if (expr.includes("next week")) {
    targetDate.setDate(ref.getDate() + (7 - ref.getDay() + 1));
    const nextWeekEnd = new Date(targetDate);
    nextWeekEnd.setDate(targetDate.getDate() + 6);
    return {
      start: targetDate.toISOString().split('T')[0],
      end: nextWeekEnd.toISOString().split('T')[0]
    };
  } else if (expr.includes("this week")) {
    targetDate.setDate(ref.getDate() - ref.getDay() + 1);
    const weekEnd = new Date(targetDate);
    weekEnd.setDate(targetDate.getDate() + 6);
    return {
      start: targetDate.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    };
  }
  
  // Parse time-of-day
  if (expr.includes("tonight") || expr.includes("this evening") || expr.includes("evening")) {
    timeContext = "evening";
  } else if (expr.includes("this afternoon") || expr.includes("afternoon")) {
    timeContext = "afternoon";
  } else if (expr.includes("this morning") || expr.includes("morning")) {
    timeContext = "morning";
  } else if (expr.includes("this night") || expr.includes("night")) {
    timeContext = "night";
  }
  
  const dateStr = targetDate.toISOString().split('T')[0];
  return { start: dateStr, end: dateStr, timeContext };
}

// Helper function to parse location phrases
function parseLocationPhrase(userMessage: string, userLocation: any): { useUserLocation: boolean; city?: string } {
  const msg = userMessage.toLowerCase();
  
  // Check for explicit location phrases
  if (msg.includes("here") || msg.includes("around me") || msg.includes("near me") || msg.includes("close to me") || msg.includes("nearby")) {
    return { useUserLocation: true };
  }
  
  // Check if user mentions a specific city
  const cityPatterns = [
    /\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:concert|event|show)/i
  ];
  
  for (const pattern of cityPatterns) {
    const match = userMessage.match(pattern);
    if (match && match[1]) {
      const city = match[1].trim();
      // Filter out common words that aren't cities
      const excludeWords = ["live", "music", "friday", "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "tomorrow", "today", "weekend"];
      if (!excludeWords.includes(city.toLowerCase())) {
        return { useUserLocation: false, city: standardizeCityName(city) };
      }
    }
  }
  
  // Default: use user location if available
  return { useUserLocation: true };
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
  
  const results: any[] = [];
  
  try {
    // Search Google for events
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      console.log("Web search completed, found content length:", html.length);
      
      // Extract event information using regex patterns
      // Look for text blocks that mention concerts, venues, dates, and prices
      
      // Pattern for extracting artist/venue combinations
      const titlePattern = /<h3[^>]*>(.*?)<\/h3>/gi;
      const titles = [];
      let match;
      
      while ((match = titlePattern.exec(html)) !== null) {
        const cleanText = match[1].replace(/<[^>]*>/g, '').trim();
        if (cleanText && (
          cleanText.toLowerCase().includes('concert') ||
          cleanText.toLowerCase().includes('live') ||
          cleanText.toLowerCase().includes('music') ||
          cleanText.toLowerCase().includes('show')
        )) {
          titles.push(cleanText);
        }
      }
      
      // Look for price patterns (€, EUR, $, USD)
      const pricePattern = /(?:€|EUR|&#8364;)\s*(\d+(?:[.,]\d{2})?)|(?:\$|USD)\s*(\d+(?:[.,]\d{2})?)/gi;
      const prices = [];
      while ((match = pricePattern.exec(html)) !== null) {
        prices.push(match[0]);
      }
      
      // Look for date patterns
      const datePattern = /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi;
      const dates = [];
      while ((match = datePattern.exec(html)) !== null) {
        dates.push(match[0]);
      }
      
      // Create event objects from extracted data
      const maxEvents = Math.min(titles.length, 5); // Limit to 5 events
      for (let i = 0; i < maxEvents; i++) {
        if (titles[i]) {
          results.push({
            artist: titles[i].split(/\sat\s|\s-\s|,/i)[0] || titles[i],
            venue: filters.city,
            date: dates[i] || filters.startDate,
            price: prices[i] || "Check website",
            description: "",
            ticketUrl: "",
            mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(filters.city)}`
          });
        }
      }
    }
  } catch (error) {
    console.error("Web search error:", error);
  }
  
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, location, searchMode, language = 'en' } = await req.json();
    console.log("Chat request:", { searchMode, location, language, messageCount: messages.length });

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
          description: "Query the laiive database for live music events. IMPORTANT: When user says 'here', 'around me', 'near me', use latitude/longitude. When user specifies a city name, use city filter only (not lat/long). Parse time phrases: 'tonight'=today evening, 'tomorrow night'=tomorrow evening, 'this weekend'=Sat-Sun. Supports artist/group and venue searches.",
          parameters: {
            type: "object",
            properties: {
              latitude: { type: "number", description: "User latitude for proximity search (use when user says 'here', 'around me', 'near me', 'nearby')" },
              longitude: { type: "number", description: "User longitude for proximity search (use when user says 'here', 'around me', 'near me', 'nearby')" },
              startDate: { type: "string", description: "Start date ISO format (YYYY-MM-DD). Parse 'tonight'/'today' as current date, 'tomorrow' as next day. Optional if searching by artist or venue only." },
              endDate: { type: "string", description: "End date ISO format (YYYY-MM-DD). Same as startDate for single day events. Optional if searching by artist or venue only." },
              city: { type: "string", description: "City name filter (only when user specifies a city explicitly, not for 'here'/'around me')" },
              timeContext: { type: "string", enum: ["morning", "afternoon", "evening", "night"], description: "Time of day context: morning (before 12:00), afternoon (12:00-18:00), evening/night (after 18:00)" },
              artist: { type: "string", description: "Artist or group name to search for (fuzzy match supported)" },
              venue: { type: "string", description: "Venue name to search for (fuzzy match supported)" },
            },
            required: [],
          },
        },
      });
    }

    // Get the last user message to parse location and date context
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const locationParse = parseLocationPhrase(lastUserMessage, location);
    const dateParse = parseRelativeDate(lastUserMessage, now);
    
    const locationInfo = location ? `User location: ${location.city || 'Unknown'} (${location.latitude}, ${location.longitude})` : "No location";
    
    // Build smart defaults based on parsing
    const defaultLocation = locationParse.city || location?.city || "nearby";
    const isUsingUserCoords = locationParse.useUserLocation && !locationParse.city;

    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'it': 'Italian',
      'ca': 'Catalan'
    };
    const userLanguage = languageMap[language] || 'English';

    const systemPrompt = `You help users find live music events. IMPORTANT: Always respond in ${userLanguage}. Today is ${currentDate} at ${currentTime}. ${locationInfo}.

${searchMode === "database" ? "Use query_database_events to search the laiive database." : "Use search_internet_events to search the web."}

NATURAL LANGUAGE UNDERSTANDING:
When users say phrases like:
- "tonight here" / "this evening around me" → today's date + user's location coordinates
- "tomorrow near me" → tomorrow's date + user's location coordinates  
- "Friday night in Milan" → next Friday + Milan city
- "this weekend close to me" → Sat-Sun + user's location coordinates
- "what to do tonight" → today + user's location coordinates
- "when is [artist/group] playing" → artist: [artist name], startDate: today (or omit if asking in general)
- "concerts at [venue]" → venue: [venue name]
- "where is [artist] playing" → artist: [artist name]

TIME OF DAY CONTEXT:
- "tonight", "this evening" = today after 18:00
- "this afternoon" = today 12:00-18:00
- "this morning" = today before 12:00
- "tomorrow night" = tomorrow after 18:00

LOCATION CONTEXT:
- "here", "around me", "near me", "close to me", "nearby" → use latitude/longitude (${location?.latitude}, ${location?.longitude})
- Specific city name → use city filter (DO NOT use lat/long when city is specified)

ARTIST & VENUE SEARCHES:
- When user asks about a specific artist/group: use artist parameter (supports partial matches)
- When user asks about a specific venue: use venue parameter (supports partial matches)
- You can combine artist/venue with date filters or use them alone
- Fuzzy matching is automatic - don't worry about exact spelling

WORKFLOW:
1. Parse user's natural language to extract:
   - Date/time context (convert "tonight", "tomorrow", "this weekend" to YYYY-MM-DD) - OPTIONAL for artist/venue searches
   - Location context (use coordinates for "here"/"around me", or city name if specified) - OPTIONAL
   - Artist/group name if mentioned
   - Venue name if mentioned
2. Call the appropriate search tool with extracted parameters
3. Display results with this format:
   🎵 **Artist** at Venue, City
   📝 Description (short)
   📅 Date & Time
   💰 Price (show "Free" if price is 0 or null/empty)
   🎫 [Tickets] | 📍 [Map]

EXAMPLES:
- "concert tonight here" → startDate: ${currentDate}, endDate: ${currentDate}, latitude: ${location?.latitude}, longitude: ${location?.longitude}
- "what to do tomorrow in Bergamo" → startDate: ${new Date(now.getTime() + 86400000).toISOString().split('T')[0]}, city: "Bergamo"
- "when is coldplay playing" → artist: "coldplay"
- "concerts at sala apollo" → venue: "sala apollo"
- "where is madonna playing this month" → artist: "madonna", startDate: [first of month], endDate: [last of month]
- "coldplay tonight in Barcelona" → artist: "coldplay", startDate: ${currentDate}, city: "Barcelona"

Default location when not specified: ${isUsingUserCoords ? `coordinates (${location?.latitude}, ${location?.longitude})` : `${defaultLocation}`}`;

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

                      let query = supabaseClient
                        .from("events")
                        .select("*");

                      // Apply date filters if provided
                      if (args.startDate && args.endDate) {
                        const startBound = new Date(`${args.startDate}T00:00:00Z`).toISOString();
                        const endExclusive = new Date(new Date(`${args.endDate}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString();
                        
                        query = query
                          .gte("event_date", startBound)
                          .lt("event_date", endExclusive);

                        // Apply time-of-day filter if specified
                        if (args.timeContext) {
                          const timeRanges: Record<string, { start: number; end: number }> = {
                            morning: { start: 0, end: 12 },
                            afternoon: { start: 12, end: 18 },
                            evening: { start: 18, end: 23 },
                            night: { start: 18, end: 23 },
                          };
                          const range = timeRanges[args.timeContext];
                          if (range) {
                            const startTime = `T${String(range.start).padStart(2, '0')}:00:00`;
                            const endTime = `T${String(range.end).padStart(2, '0')}:59:59`;
                            query = query
                              .gte("event_date", `${args.startDate}${startTime}`)
                              .lte("event_date", `${args.endDate}${endTime}`);
                          }
                        }
                      } else {
                        // If no date specified, get future events
                        query = query.gte("event_date", now.toISOString());
                      }

                      // Apply artist filter with fuzzy matching
                      if (args.artist) {
                        query = query.ilike("artist", `%${args.artist}%`);
                      }

                      // Apply venue filter with fuzzy matching
                      if (args.venue) {
                        query = query.ilike("venue", `%${args.venue}%`);
                      }

                      // Apply city filter
                      if (args.city) {
                        query = query.ilike("city", `%${args.city}%`);
                      }

                      query = query.order("event_date").limit(20);

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
