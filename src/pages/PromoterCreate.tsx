import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Mic, Loader2, Upload, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EventConfirmationForm } from "@/components/EventConfirmationForm";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EventDetails {
  name: string;
  artist?: string | null;
  description?: string | null;
  event_date: string;
  venue: string;
  city: string;
  price?: number | null;
  ticket_url?: string | null;
}

const PromoterCreate = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Hello! I can help you add your event to the laiive platform. To start, please provide me with the following information:\n\n*   **Artist name**\n*   **Event description**\n*   **Date and time**\n*   **Venue name**\n*   **City**\n*   **Ticket price**",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedEvent, setExtractedEvent] = useState<EventDetails | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-event-details`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ imageBase64: base64 }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to extract event details");
        }

        const data = await response.json();
        
        if (data.success) {
          setExtractedEvent(data.eventDetails);
          toast({
            title: "Event details extracted!",
            description: "Please review and confirm the information.",
          });
        } else {
          throw new Error(data.error || "Extraction failed");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error extracting event details:", error);
      toast({
        title: "Extraction failed",
        description: "We couldn't read all details from this file. Please try again or enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmEvent = async (eventDetails: EventDetails) => {
    try {
      const { error } = await supabase.from("events").insert({
        name: eventDetails.name,
        artist: eventDetails.artist,
        description: eventDetails.description,
        event_date: eventDetails.event_date,
        venue: eventDetails.venue,
        city: eventDetails.city,
        price: eventDetails.price,
        ticket_url: eventDetails.ticket_url,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Event created from your poster.",
      });

      setExtractedEvent(null);
      setMessages([
        ...messages,
        {
          role: "assistant",
          content: `Great! I've created the event "${eventDetails.name}" at ${eventDetails.venue} in ${eventDetails.city}. Would you like to add another event?`,
        },
      ]);
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promoter-create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages,
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to send message");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/promoters")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🫦</span>
              <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
              <span className="font-ibm-plex text-muted-foreground">Create Event</span>
            </div>
          </div>
          
          <div className="font-ibm-plex text-sm text-muted-foreground">
            Free Tier
          </div>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {extractedEvent ? (
            <EventConfirmationForm
              eventDetails={extractedEvent}
              onConfirm={handleConfirmEvent}
              onCancel={() => setExtractedEvent(null)}
            />
          ) : (
            <>
              {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 font-ibm-plex whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-muted text-foreground border border-border"
                    : "bg-card text-card-foreground border border-border"
                )}
              >
                {msg.content}
              </div>
            </div>
              ))}
              {(isLoading || isExtracting) && (
                <div className="flex justify-start">
                  <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-ibm-plex text-sm">
                      {isExtracting ? "Extracting event details..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting || isLoading || extractedEvent !== null}
              className="flex items-center gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              <span className="font-ibm-plex text-sm">Upload poster or file</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
            >
              <Mic className="w-5 h-5" />
            </Button>
          
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Tell me about your event..."
              className="flex-1 bg-background border-border font-ibm-plex"
              disabled={extractedEvent !== null}
            />
            
            <Button
              onClick={handleSendMessage}
              variant="default"
              size="icon"
              disabled={isLoading || extractedEvent !== null}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoterCreate;
