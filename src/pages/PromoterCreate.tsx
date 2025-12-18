import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Loader2, Camera, MicOff, Plus, X, Upload } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EventConfirmationForm } from "@/components/EventConfirmationForm";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AudioRecorder } from "@/utils/audioRecorder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

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
  const { language, setLanguage, t } = useTranslation();
  const { sessionId, deviceType, userAgent } = useSession();
  const { user, session, isLoading: authLoading, signOut } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedEvent, setExtractedEvent] = useState<EventDetails | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promoterName, setPromoterName] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());

  // Redirect to promoter auth if not logged in or not a promoter
  const { isPromoter } = useAuth();
  
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/promoters/auth');
      } else if (!isPromoter) {
        navigate('/promoters/auth');
      }
    }
  }, [user, isPromoter, authLoading, navigate]);

  // Fetch promoter profile name
  useEffect(() => {
    const fetchPromoterName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('promoter_profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setPromoterName(`${data.first_name} ${data.last_name}`);
        }
      }
    };
    fetchPromoterName();
  }, [user?.id]);

  // Detect language from user message
  const detectLanguageFromText = (text: string): string | null => {
    const spanishIndicators = /\b(hola|qué|dónde|cuándo|cómo|quiero|busco|hay|para|esta|evento|música|concierto)\b/i;
    const italianIndicators = /\b(ciao|dove|quando|come|voglio|cerco|c'è|per|questa|evento|musica|concerto)\b/i;
    const catalanIndicators = /\b(hola|què|on|quan|com|vull|busco|hi ha|per|aquesta|esdeveniment|música|concert)\b/i;
    const englishIndicators = /\b(hello|hi|what|where|when|how|want|looking|is there|for|this|event|music|concert)\b/i;

    if (spanishIndicators.test(text)) return 'es';
    if (italianIndicators.test(text)) return 'it';
    if (catalanIndicators.test(text)) return 'ca';
    if (englishIndicators.test(text)) return 'en';
    
    return null;
  };

  // Detect URL in text
  const extractUrl = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = text.match(urlRegex);
    return match ? match[1] : null;
  };

  // Extract event from URL
  const extractEventFromUrl = async (url: string) => {
    setIsExtracting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-event-from-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ url, language }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to extract event from URL");
      }

      const data = await response.json();
      
        if (data.success && data.eventData) {
          setExtractedEvent(data.eventData);
          return true;
      } else {
        throw new Error(data.error || "Could not extract event details");
      }
    } catch (error) {
      console.error("Error extracting from URL:", error);
      toast({
        title: "Extraction failed",
        description: "Could not extract event details from this URL. Please enter manually.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsExtracting(false);
    }
  };

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
    setIsMenuOpen(false);

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
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    }
  };

  const handleConfirmEvent = async (eventDetails: EventDetails): Promise<void> => {
    const response = await supabase.functions.invoke("validate-event", {
      body: {
        event: {
          name: eventDetails.name,
          artist: eventDetails.artist,
          description: eventDetails.description,
          event_date: eventDetails.event_date,
          venue: eventDetails.venue,
          city: eventDetails.city,
          price: eventDetails.price,
          ticket_url: eventDetails.ticket_url,
        },
        session_id: sessionId,
        user_id: user?.id,
      },
    });

    if (response.error) {
      toast({
        title: "Error",
        description: response.error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
      throw new Error(response.error.message || "Event validation failed");
    }
  };

  const handleFormClose = () => {
    setExtractedEvent(null);
    setMessages([
      ...messages,
      {
        role: "assistant",
        content: t.promoterCreate.welcome,
      },
    ]);
  };


  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Detect language from user message and update if different
    const detected = detectLanguageFromText(message);
    if (detected && detected !== language) {
      setLanguage(detected as 'en' | 'es' | 'it' | 'ca');
    }

    const currentLanguage = detected || language;

    // Check if message contains a URL and try to extract event
    const url = extractUrl(message);
    if (url) {
      const userMessage = { role: "user" as const, content: message };
      setMessages([...messages, userMessage]);
      setMessage("");
      
      const extracted = await extractEventFromUrl(url);
      if (extracted) {
        return; // Event form will be shown
      }
      // If extraction failed, continue with normal chat flow
    }

    const userMessage = { role: "user" as const, content: message };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
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
          conversation_type: 'promoter',
          message_role: 'user',
          message_content: userMessage.content,
          device_type: deviceType,
          user_agent: userAgent,
          language: currentLanguage,
        }),
      }).catch((error) => console.error('Error logging user message:', error));
    }

    try {
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promoter-create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            language: currentLanguage,
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
                // Check if this is an extracted event
                const extractedMatch = content.match(/__EVENT_EXTRACTED__(.+)__EVENT_EXTRACTED__/);
                if (extractedMatch) {
                  const eventDetails = JSON.parse(extractedMatch[1]);
                  // Directly show the form without adding a chat confirmation message
                  setExtractedEvent(eventDetails);
                  setIsLoading(false);
                  return;
                }
                
                assistantMessage += content;
                setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }

      // Log assistant message with validation
      if (sessionId && assistantMessage) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-conversation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            conversation_type: 'promoter',
            message_role: 'assistant',
            message_content: assistantMessage,
            device_type: deviceType,
            user_agent: userAgent,
            language: currentLanguage,
          }),
        }).catch((error) => console.error('Error logging assistant message:', error));
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

  const handleMicClick = async () => {
    setIsMenuOpen(false);
    
    if (isRecording) {
      try {
        const audioBase64 = await audioRecorderRef.current.stop();
        setIsRecording(false);
        setIsExtracting(true);

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

        console.log("Transcribed text:", text);

        // Extract event details from transcribed text via backend
        const extractResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-event-from-text`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!extractResponse.ok) {
          throw new Error("Event extraction failed");
        }

        const extractData = await extractResponse.json();
        
        if (!extractData.success) {
          throw new Error(extractData.error || "Failed to extract event details");
        }

        const eventDetails = extractData.eventDetails;
        setExtractedEvent(eventDetails);
        
        toast({
          title: "Event details extracted!",
          description: "Please review and confirm the information.",
        });
      } catch (error) {
        console.error("Error processing audio:", error);
        toast({
          title: "Extraction failed",
          description: "We couldn't understand the audio. Please try speaking again.",
          variant: "destructive",
        });
      } finally {
        setIsExtracting(false);
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
    <div className="flex flex-col h-screen bg-[#1a1a1a]">
      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-[#1a1a1a] p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-foreground">laiive</span>
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                PRO
              </span>
            </div>
            <button
              onClick={() => navigate("/")}
              className="font-ibm-plex text-[10px] text-muted-foreground hover:text-cyan-400 transition-colors pb-0.5"
            >
              go to laiive →
            </button>
          </div>
          
          <UserAvatar variant="pro" />
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {extractedEvent ? (
            <EventConfirmationForm
              eventDetails={extractedEvent}
              onConfirm={handleConfirmEvent}
              onCancel={handleFormClose}
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            {/* Plus button with expandable menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                disabled={isExtracting || isLoading || extractedEvent !== null}
                className={cn(
                  "text-muted-foreground hover:text-primary transition-transform",
                  isMenuOpen && "rotate-45"
                )}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </Button>
              
              {/* Expandable menu */}
              {isMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 flex flex-col gap-1 bg-card border border-border rounded-lg p-1 shadow-lg">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            cameraInputRef.current?.click();
                          }}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Camera className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">Take a photo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
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
                        >
                          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">Voice input (Beta)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Upload className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-xs">Upload image or document</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={t.promoterCreate.placeholder}
              className="flex-1 bg-background border-border font-ibm-plex focus-visible:ring-cyan-500 focus-visible:border-cyan-500"
              disabled={extractedEvent !== null}
            />
            
            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={isLoading || !message.trim() || extractedEvent !== null}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoterCreate;