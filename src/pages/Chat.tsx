import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Loader2, MicOff, Calendar, MapPin, Ticket, Music, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { AudioRecorder } from "@/utils/audioRecorder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

// Parse event blocks from message content
const parseEventContent = (content: string) => {
  // Match event pattern: **Artist** at Venue, City\nDate | Price\n...
  const eventPattern = /\*\*(.+?)\*\*\s+at\s+(.+?),\s+(.+?)\n(.+?)\s*\|\s*(.+?)(?:\n(.+?))?(?:\n\[(.+?)\]\((.+?)\))?/g;
  const events: Array<{
    artist: string;
    venue: string;
    city: string;
    dateTime: string;
    price: string;
    description?: string;
    ticketUrl?: string;
    ticketLabel?: string;
  }> = [];
  
  let match;
  let lastIndex = 0;
  const textParts: string[] = [];
  
  while ((match = eventPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      textParts.push(content.slice(lastIndex, match.index));
    }
    events.push({
      artist: match[1],
      venue: match[2],
      city: match[3],
      dateTime: match[4],
      price: match[5],
      description: match[6]?.trim(),
      ticketLabel: match[7],
      ticketUrl: match[8],
    });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    textParts.push(content.slice(lastIndex));
  }
  
  return { events, textParts, hasEvents: events.length > 0 };
};

// Event card component
const EventCard = ({ event }: { event: { artist: string; venue: string; city: string; dateTime: string; price: string; description?: string; ticketUrl?: string; ticketLabel?: string } }) => (
  <div className="border border-border/50 rounded-xl p-4 my-2 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Music className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate">{event.artist}</h4>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{event.venue}, {event.city}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{event.dateTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <Ticket className="w-3.5 h-3.5" />
            <span>{event.price}</span>
          </div>
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
        )}
        {event.ticketUrl && (
          <a 
            href={event.ticketUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {event.ticketLabel || "Get tickets"}
          </a>
        )}
      </div>
    </div>
  </div>
);

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const { sessionId, deviceType, userAgent } = useSession();
  const [mode, setMode] = useState<"user" | "promoter">("user");
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleModeChange = () => {
    const newMode = mode === "user" ? "promoter" : "user";
    setMode(newMode);
    
    // Reset messages with appropriate initial message
    if (newMode === "promoter") {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I can help you add your event to the laiive platform. To start, please provide me with the following information:\n\n*   **Artist name**\n*   **Event description**\n*   **Date and time**\n*   **Venue name**\n*   **City**\n*   **Ticket price**",
        },
      ]);
    } else {
      setMessages([]);
    }
  };

  // Detect language from user message
  const detectLanguageFromText = (text: string): string | null => {
    // Simple language detection based on common words
    const spanishIndicators = /\b(hola|qué|dónde|cuándo|cómo|quiero|busco|hay|para|esta|esta noche|cerca|evento|música|concierto)\b/i;
    const italianIndicators = /\b(ciao|dove|quando|come|voglio|cerco|c'è|per|questa|stasera|vicino|evento|musica|concerto)\b/i;
    const catalanIndicators = /\b(hola|què|on|quan|com|vull|busco|hi ha|per|aquesta|avui|prop|esdeveniment|música|concert)\b/i;
    const englishIndicators = /\b(hello|hi|what|where|when|how|want|looking|is there|for|this|tonight|near|event|music|concert)\b/i;

    if (spanishIndicators.test(text)) return 'es';
    if (italianIndicators.test(text)) return 'it';
    if (catalanIndicators.test(text)) return 'ca';
    if (englishIndicators.test(text)) return 'en';
    
    return null;
  };

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location access denied",
            description: "Using default location. Grant location access for better results.",
            variant: "destructive",
          });
        }
      );
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Detect language from user message and update if different
    const detected = detectLanguageFromText(message);
    if (detected && detected !== language) {
      setLanguage(detected as 'en' | 'es' | 'it' | 'ca');
      setDetectedLanguage(detected);
    }

    const currentLanguage = detected || language;

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    // Log user message with validation
    if (sessionId) {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          conversation_type: 'user',
          message_role: 'user',
          message_content: userMessage.content,
          device_type: deviceType,
          user_agent: userAgent,
          language: currentLanguage,
        }),
      }).catch((error) => console.error('Error logging user message:', error));
    }

    try {
      const endpoint = mode === "promoter" ? "promoter-create" : "chat";
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(
            mode === "promoter"
              ? { messages: [...messages, userMessage], language: currentLanguage }
              : {
                  messages: [...messages, userMessage],
                  location,
                  language: currentLanguage,
                }
          ),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again later.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Payment required",
            description: "Please add funds to continue.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      const updateAssistantMessage = (content: string) => {
        assistantContent = content;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              updateAssistantMessage(assistantContent);
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }

      // Log assistant message with validation
      if (sessionId && assistantContent) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            conversation_type: 'user',
            message_role: 'assistant',
            message_content: assistantContent,
            device_type: deviceType,
            user_agent: userAgent,
            language: currentLanguage,
          }),
        }).catch((error) => console.error('Error logging assistant message:', error));
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      try {
        const audioBase64 = await audioRecorderRef.current.stop();
        setIsRecording(false);

        // Transcribe audio
        const transcribeResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ audio: audioBase64 }),
          }
        );

        if (!transcribeResponse.ok) {
          throw new Error("Transcription failed");
        }

        const { text } = await transcribeResponse.json();
        
        // Set the transcribed text as the message
        setMessage(text);
        
        toast({
          title: "Audio transcribed",
          description: "Please review and send the message.",
        });
      } catch (error) {
        console.error("Error processing audio:", error);
        toast({
          title: "Transcription failed",
          description: "We couldn't understand the audio. Please try speaking again.",
          variant: "destructive",
        });
      }
    } else {
      try {
        await audioRecorderRef.current.start();
        setIsRecording(true);
        toast({
          title: "Recording...",
          description: "Speak now. Click again to stop.",
        });
      } catch (error) {
        console.error("Error starting recording:", error);
        toast({
          title: "Microphone access denied",
          description: "Please grant microphone permission to use voice input.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen",
      mode === "promoter" ? "bg-[hsl(0,0%,12%)]" : "bg-background"
    )}>
      {/* Header with mode toggle */}
      <header className={cn(
        "border-b border-border p-4",
        mode === "promoter" ? "bg-[hsl(0,0%,18%)]" : "bg-card"
      )}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mode Link */}
            <button
              onClick={() => navigate("/promoters")}
              className="font-ibm-plex text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t.chat.promoterLink}
            </button>
          </div>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? null : (
            <>
              {messages.map((msg, idx) => {
                // For assistant messages, try to parse events
                const parsed = msg.role === "assistant" ? parseEventContent(msg.content) : null;
                
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl font-ibm-plex",
                        msg.role === "user"
                          ? mode === "promoter"
                            ? "bg-[hsl(0,0%,22%)] text-foreground border border-[hsl(0,0%,30%)] px-4 py-3"
                            : "bg-muted text-foreground border border-border px-4 py-3"
                          : mode === "promoter"
                          ? "bg-[hsl(0,0%,18%)] text-card-foreground border border-[hsl(0,0%,30%)] px-4 py-3"
                          : parsed?.hasEvents
                          ? "bg-transparent p-0"
                          : "bg-card text-card-foreground border border-border px-4 py-3"
                      )}
                    >
                      {parsed?.hasEvents ? (
                        <div className="space-y-3">
                          {parsed.textParts.map((text, i) => 
                            text.trim() && (
                              <p 
                                key={`text-${i}`} 
                                className="whitespace-pre-wrap text-muted-foreground text-sm"
                                dangerouslySetInnerHTML={{
                                  __html: DOMPurify.sanitize(
                                    text
                                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'),
                                    { ALLOWED_TAGS: ['strong', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] }
                                  ),
                                }}
                              />
                            )
                          )}
                          {parsed.events.map((event, i) => (
                            <EventCard key={`event-${i}`} event={event} />
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(
                              msg.content
                                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'),
                              { ALLOWED_TAGS: ['strong', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] }
                            ),
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={cn(
                    "rounded-2xl px-4 py-3",
                    mode === "promoter" 
                      ? "bg-[hsl(0,0%,18%)]"
                      : "bg-card"
                  )}>
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className={cn(
        "border-t border-border p-4",
        mode === "promoter" ? "bg-[hsl(0,0%,18%)]" : "bg-card"
      )}>
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMicClick}
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    isRecording && "text-destructive animate-pulse"
                  )}
                  disabled={isLoading}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Beta — voice transcription may contain errors</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={mode === "promoter" ? "Tell me about your event..." : t.chat.placeholder}
            className={cn(
              "flex-1 border-border font-ibm-plex",
              mode === "promoter" ? "bg-[hsl(0,0%,12%)]" : "bg-background"
            )}
          />
          
          <Button
            onClick={handleSendMessage}
            variant="default"
            size="icon"
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;