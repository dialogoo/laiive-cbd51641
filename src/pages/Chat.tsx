import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Loader2, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { AudioRecorder } from "@/utils/audioRecorder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { useAuth } from "@/hooks/useAuth";
import { useQueryLimit } from "@/components/QueryCounter";
import { UserAvatar } from "@/components/UserAvatar";

// Pro mode styling constants
const proStyles = {
  bg: "bg-[hsl(var(--pro-bg))]",
  bgElevated: "bg-[hsl(var(--pro-bg-elevated))]",
  bgCard: "bg-[hsl(var(--pro-bg-card))]",
  border: "border-[hsl(var(--pro-border))]",
  accent: "text-accent",
  accentBg: "bg-accent/10",
};

// Parse event blocks from message content
const parseEventContent = (content: string) => {
  // Match new event pattern: **Artist**\nTagline\nVenue | Time | Price\nDescription\n[tickets](url)
  const eventPattern = /\*\*(.+?)\*\*\n(.+?)\n(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)(?:\n(.+?))?(?:\n\[tickets\]\((.+?)\))?(?=\n\n\*\*|$)/gs;
  const events: Array<{
    artist: string;
    tagline: string;
    venue: string;
    time: string;
    price: string;
    description?: string;
    ticketUrl?: string;
  }> = [];
  
  let match;
  let lastIndex = 0;
  const textParts: string[] = [];
  
  // Get text before first event (intro sentence)
  const firstEventMatch = content.match(/\*\*(.+?)\*\*\n/);
  if (firstEventMatch && firstEventMatch.index !== undefined && firstEventMatch.index > 0) {
    textParts.push(content.slice(0, firstEventMatch.index));
    lastIndex = firstEventMatch.index;
  }
  
  while ((match = eventPattern.exec(content)) !== null) {
    events.push({
      artist: match[1]?.trim(),
      tagline: match[2]?.trim(),
      venue: match[3]?.trim(),
      time: match[4]?.trim(),
      price: match[5]?.trim(),
      description: match[6]?.trim(),
      ticketUrl: match[7]?.trim(),
    });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length && events.length > 0) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) textParts.push(remaining);
  }
  
  // If no events found, put entire content in textParts
  if (events.length === 0) {
    textParts.push(content);
  }
  
  return { events, textParts, hasEvents: events.length > 0 };
};

// Event card component with expandable description
const EventCard = ({ event }: { event: { artist: string; tagline: string; venue: string; time: string; price: string; description?: string; ticketUrl?: string } }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-border/50 rounded-lg p-3 sm:p-4 my-2 bg-card hover:border-primary/30 transition-colors">
      <div className="space-y-1">
        <h4 className="font-semibold text-foreground text-base">{event.artist}</h4>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground flex-1">{event.tagline}</p>
          {event.description && event.description !== event.tagline && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground/70 hover:text-primary transition-colors shrink-0"
            >
              {expanded ? '− less' : '+ more'}
            </button>
          )}
        </div>
        {expanded && event.description && event.description !== event.tagline && (
          <p className="text-sm text-muted-foreground pt-1">{event.description}</p>
        )}
        <div className="flex items-center gap-3 text-sm pt-1">
          <span className="text-muted-foreground">{event.venue}</span>
          <span className="text-muted-foreground">{event.time}</span>
          <span className="text-primary font-medium">{event.price}</span>
        </div>
        {event.ticketUrl && (
          <a 
            href={event.ticketUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline pt-1"
          >
            tickets →
          </a>
        )}
      </div>
    </div>
  );
};

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
  const { user, session, isLoading: authLoading } = useAuth();
  const { canQuery, incrementCount, isPromoter } = useQueryLimit();
  const [mode, setMode] = useState<"user" | "promoter">("user");
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // No auth redirect - allow anonymous users to view chat

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

    // Check if user is logged in
    if (!user) {
      // Show in-chat prompt to sign in
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: "Sign in to start discovering live music events 🎵\n\n[Sign in →](/auth)" }
      ]);
      setMessage("");
      return;
    }

    // Check query limit for non-promoters
    if (!canQuery) {
      // Show in-chat message instead of toast
      setMessages((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: "You've used all 5 free queries this week. Upgrade to Pro for unlimited access! 🚀\n\n[Become a Pro →](/promoters)" }
      ]);
      setMessage("");
      return;
    }

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
    
    // Increment local query count for free users
    incrementCount();

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
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
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
        if (response.status === 401) {
          // Session expired - show in-chat message
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Your session has expired. Please sign in again.\n\n[Sign in →](/auth)" }
          ]);
          return;
        }
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.queries_remaining === 0) {
            // Weekly limit - show in-chat message
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "You've used all 5 free queries this week. Upgrade to Pro for unlimited access! 🚀\n\n[Become a Pro →](/promoters)" }
            ]);
          } else {
            toast({
              title: "Rate limit exceeded",
              description: "Please try again later.",
              variant: "destructive",
            });
          }
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
      "flex flex-col h-[100dvh] overflow-hidden",
      mode === "promoter" ? proStyles.bg : "bg-background"
    )}>
      {/* Header with mode toggle */}
      <header className={cn(
        "border-b p-3 sm:p-4",
        mode === "promoter" 
          ? `${proStyles.bgElevated} ${proStyles.border}` 
          : "bg-card border-border"
      )}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-end gap-4">
            <div className="flex items-end gap-1">
              <span className="text-xl sm:text-2xl pb-0.5">🫦</span>
              <span className={cn(
                "font-montserrat font-bold text-lg sm:text-xl",
                mode === "promoter" ? "text-accent" : "text-primary"
              )}>laiive</span>
              {mode === "promoter" && (
                <span className="ml-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent rounded mb-1">
                  Pro
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/promoters")}
              className={cn(
                "font-ibm-plex text-[10px] transition-colors pb-0.5",
                mode === "promoter" 
                  ? "text-muted-foreground hover:text-accent" 
                  : "text-muted-foreground hover:text-accent"
              )}
            >
              laiive.pro
            </button>
          </div>
          
          <UserAvatar />
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
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
                        "max-w-[92%] sm:max-w-[85%] rounded-2xl font-ibm-plex text-base sm:text-base",
                        msg.role === "user"
                          ? mode === "promoter"
                            ? `${proStyles.bgCard} text-foreground ${proStyles.border} border px-4 py-3 sm:px-4 sm:py-3`
                            : "bg-muted text-foreground border border-border px-4 py-3 sm:px-4 sm:py-3"
                          : mode === "promoter"
                          ? `${proStyles.bgElevated} text-card-foreground ${proStyles.border} border px-4 py-3 sm:px-4 sm:py-3`
                          : parsed?.hasEvents
                          ? "bg-transparent p-0"
                          : "bg-card text-card-foreground border border-border px-4 py-3 sm:px-4 sm:py-3"
                      )}
                    >
                      {parsed?.hasEvents ? (
                        <div className="space-y-3">
                          {parsed.textParts.map((text, i) => 
                            text.trim() && (
                              <p 
                                key={`text-${i}`} 
                                className="whitespace-pre-wrap text-muted-foreground text-base sm:text-sm"
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
                    "rounded-2xl px-4 py-3 border",
                    mode === "promoter" 
                      ? `${proStyles.bgElevated} ${proStyles.border}`
                      : "bg-card border-border"
                  )}>
                    <div className={cn(
                      "w-5 h-5 border-2 border-muted-foreground/30 rounded-full animate-spin",
                      mode === "promoter" ? "border-t-accent" : "border-t-primary"
                    )} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input area - fixed at bottom */}
      <div className={cn(
        "flex-shrink-0 border-t p-3 sm:p-4 pb-[env(safe-area-inset-bottom,12px)]",
        mode === "promoter" 
          ? `${proStyles.bgElevated} ${proStyles.border}` 
          : "bg-card border-border"
      )}>
        <div className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMicClick}
                  className={cn(
                    "h-10 w-10 sm:h-10 sm:w-10",
                    mode === "promoter" 
                      ? "text-muted-foreground hover:text-accent" 
                      : "text-muted-foreground hover:text-primary",
                    isRecording && "text-destructive animate-pulse"
                  )}
                  disabled={isLoading}
                >
                  {isRecording ? <MicOff className="w-5 h-5 sm:w-5 sm:h-5" /> : <Mic className="w-5 h-5 sm:w-5 sm:h-5" />}
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
              "flex-1 font-ibm-plex text-base sm:text-base h-11 sm:h-10",
              mode === "promoter" 
                ? `${proStyles.bgCard} ${proStyles.border} focus-visible:ring-accent` 
                : "bg-background border-border"
            )}
          />
          
          <Button
            onClick={handleSendMessage}
            variant={mode === "promoter" ? "secondary" : "default"}
            size="icon"
            disabled={isLoading || !message.trim()}
            className={cn(
              "h-10 w-10 sm:h-10 sm:w-10",
              mode === "promoter" && "bg-accent text-accent-foreground hover:bg-accent/90"
            )}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;