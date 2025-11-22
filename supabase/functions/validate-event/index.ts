import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { event, session_id } = await req.json();

    // Basic validation
    if (!event || !session_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use lightweight LLM to validate event legitimacy
    const validationPrompt = `You are a content moderator for a live music events platform. Analyze if this event submission is legitimate or spam/fraud.

Event details:
- Name: ${event.name}
- Artist: ${event.artist || "Not specified"}
- Venue: ${event.venue}
- City: ${event.city}
- Date: ${event.event_date}
- Price: ${event.price || "Free"}
- Ticket URL: ${event.ticket_url || "None"}
- Description: ${event.description || "None"}

Check for:
1. Is this a real venue/city combination?
2. Is the ticket URL from a legitimate ticketing service (or no URL provided)?
3. Are there suspicious patterns (impossible date, unrealistic price)?
4. Does this appear to be a legitimate music event?

Respond with ONLY one word:
- "ALLOW" if the event appears legitimate
- "BLOCK" if it appears fake, spam, or fraudulent

Response:`;

    const validationResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: "You are a content moderator. Respond with only ALLOW or BLOCK.",
            },
            {
              role: "user",
              content: validationPrompt,
            },
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
      }
    );

    if (!validationResponse.ok) {
      console.error("LLM validation failed:", validationResponse.status);
      // Fail closed - don't allow events during validation service outage
      return new Response(
        JSON.stringify({ error: "Validation service unavailable, please try again" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = await validationResponse.json();
    const decision = validationResult.choices?.[0]?.message?.content?.trim().toUpperCase();

    console.log("Event validation decision:", decision);

    if (decision !== "ALLOW") {
      return new Response(
        JSON.stringify({ 
          error: "Event submission rejected",
          reason: "This event appears to be invalid or spam"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Event is legitimate, insert into database
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.from("events").insert([event]).select();

    if (error) {
      console.error("Database insertion error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, event: data[0] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error validating event:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
