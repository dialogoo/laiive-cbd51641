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
    // Be PERMISSIVE - only block obvious spam, not edge cases
    const validationPrompt = `You are a permissive content moderator for a live music events platform. Your job is to ALLOW most events and only BLOCK obvious spam or fraud.

Event details:
- Name: ${event.name}
- Artist: ${event.artist || "Not specified"}
- Venue: ${event.venue}
- City: ${event.city}
- Date: ${event.event_date}
- Price: ${event.price || "Free"}
- Ticket URL: ${event.ticket_url || "None"}
- Description: ${event.description || "None"}

ONLY block if you see CLEAR signs of:
1. Gibberish or random characters in name/venue
2. Obvious phishing URLs (not just unfamiliar domains)
3. Sexually explicit or illegal content
4. Clear spam patterns (repeated text, promotional garbage)

DO NOT block for:
- Unknown artists or venues (new artists are fine)
- Historical dates or tribute concerts
- Missing optional information
- Unusual but plausible event details

Default to ALLOW. When in doubt, ALLOW.

Respond with ONLY one word: "ALLOW" or "BLOCK"

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

    // Event is legitimate, check for duplicates before inserting
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing similar event (same venue, city, and date within 2 hours)
    const eventDate = new Date(event.event_date);
    const dateMin = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const dateMax = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const { data: existingEvents } = await supabase
      .from("events")
      .select("*")
      .ilike("venue", event.venue)
      .ilike("city", event.city)
      .gte("event_date", dateMin)
      .lte("event_date", dateMax);

    let data, error;

    if (existingEvents && existingEvents.length > 0) {
      // Update existing event instead of creating duplicate
      const existingEvent = existingEvents[0];
      console.log("Found existing event, updating:", existingEvent.id);
      
      const { data: updatedData, error: updateError } = await supabase
        .from("events")
        .update({
          name: event.name,
          artist: event.artist,
          description: event.description,
          price: event.price,
          ticket_url: event.ticket_url,
          event_date: event.event_date,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingEvent.id)
        .select();
      
      data = updatedData;
      error = updateError;
    } else {
      // Insert new event
      const { data: insertedData, error: insertError } = await supabase
        .from("events")
        .insert([event])
        .select();
      
      data = insertedData;
      error = insertError;
    }

    if (error) {
      console.error("Database insertion error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, event: data?.[0] ?? null }),
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
