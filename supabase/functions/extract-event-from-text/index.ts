import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Extracting event details from text:", text);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting event information from natural language text in ANY language (English, Spanish, Catalan, French, etc.). 
            Extract the following information and return it as JSON:
            - name (event/concert name) - REQUIRED
            - artist (artist/band name) - optional, omit if not found
            - description (brief description if available) - optional, omit if not found
            - event_date (ISO 8601 format YYYY-MM-DDTHH:MM:SS) - REQUIRED. If only time is mentioned, use the next occurrence of that day/time
            - venue (venue name) - REQUIRED
            - city (city name) - REQUIRED
            - price (ticket price as number only, omit if free or not mentioned) - optional, omit if not found
            - ticket_url (ticket link if available) - optional, omit if not found
            
            IMPORTANT: 
            - For optional fields you cannot find, simply omit them from the response
            - If the text says "free" or "gratuït" or similar, omit the price field entirely
            - Parse dates intelligently: "Sunday 28th at 19 hours" means the next Sunday the 28th at 19:00
            - Handle any language input naturally
            - Do NOT use the string "null" - either provide the value or omit the field`,
          },
          {
            role: "user",
            content: `Extract event details from this text: ${text}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_event_details",
              description: "Extract event details from natural language text",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Event or concert name" },
                  artist: { type: ["string", "null"], description: "Artist or band name (optional)" },
                  description: { type: ["string", "null"], description: "Event description (optional)" },
                  event_date: { type: "string", description: "Event date and time in ISO 8601 format" },
                  venue: { type: "string", description: "Venue name" },
                  city: { type: "string", description: "City name" },
                  price: { type: ["number", "null"], description: "Ticket price (optional)" },
                  ticket_url: { type: ["string", "null"], description: "Ticket purchase URL (optional)" },
                },
                required: ["name", "event_date", "venue", "city"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_event_details" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const eventDetails = JSON.parse(toolCall.function.arguments);
    console.log("Extracted event details:", eventDetails);

    return new Response(JSON.stringify({ success: true, eventDetails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error extracting event details:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});