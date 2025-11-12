import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Search, Globe, Mic, Send, Loader2, Users, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

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
  const [mode, setMode] = useState<"user" | "promoter">("user");
  const [searchMode, setSearchMode] = useState<"database" | "internet">("database");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! 👋 I'm here to help you discover amazing live music events near you. What are you in the mood for today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? "promoter" : "user";
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
      setMessages([
        {
          role: "assistant",
          content: "Hey! 👋 I'm here to help you discover amazing live music events near you. What are you in the mood for today?",
        },
      ]);
    }
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

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

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
              ? { messages: [...messages, userMessage] }
              : {
                  messages: [...messages, userMessage],
                  location,
                  searchMode,
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

  return (
    <div className={cn(
      "flex flex-col h-screen",
      mode === "promoter" ? "bg-[hsl(0,0%,12%)]" : "bg-background"
    )}>
      {/* Header with mode toggle and search options */}
      <header className={cn(
        "border-b border-border p-4",
        mode === "promoter" ? "bg-[hsl(0,0%,18%)]" : "bg-card"
      )}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
          </div>
          
          {/* Mode Switch */}
          <div className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <Switch
              id="mode-toggle"
              checked={mode === "promoter"}
              onCheckedChange={handleModeChange}
            />
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Search Mode Toggle - Only visible in user mode */}
          {mode === "user" && (
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant={searchMode === "database" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSearchMode("database")}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">laiive search</span>
              </Button>
              <Button
                variant={searchMode === "internet" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSearchMode("internet")}
                className="gap-2"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Internet search</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
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
                    ? mode === "promoter"
                      ? "bg-[hsl(0,0%,22%)] text-foreground border border-[hsl(0,0%,30%)]"
                      : "bg-muted text-foreground border border-border"
                    : mode === "promoter"
                    ? "bg-[hsl(0,0%,18%)] text-card-foreground border border-[hsl(0,0%,30%)]"
                    : "bg-card text-card-foreground border border-border"
                )}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'),
                }}
              />
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={cn(
                "text-card-foreground border rounded-2xl px-4 py-3",
                mode === "promoter" 
                  ? "bg-[hsl(0,0%,18%)] border-[hsl(0,0%,30%)]"
                  : "bg-card border-border"
              )}>
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className={cn(
        "border-t border-border p-4",
        mode === "promoter" ? "bg-[hsl(0,0%,18%)]" : "bg-card"
      )}>
        <div className="max-w-4xl mx-auto flex items-center gap-2">
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
            placeholder={mode === "promoter" ? "Tell me about your event..." : "Tell me what you're looking for..."}
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
