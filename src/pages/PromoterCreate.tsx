import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Mic, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const PromoterCreate = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Send initial welcome message
    const fetchWelcome = async () => {
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
              messages: [{ role: "user", content: "start" }],
            }),
          }
        );

        if (!response.ok || !response.body) {
          throw new Error("Failed to start conversation");
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
                  setMessages([{ role: "assistant", content: assistantMessage }]);
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching welcome:", error);
        setMessages([
          {
            role: "assistant",
            content: "Hey! 👋 I'll help you add your event to laiive. Let's start - what's the artist or band name?",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWelcome();
  }, []);

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
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card text-card-foreground border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-ibm-plex text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card p-4">
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
            placeholder="Tell me about your event..."
            className="flex-1 bg-background border-border font-ibm-plex"
          />
          
          <Button
            onClick={handleSendMessage}
            variant="default"
            size="icon"
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoterCreate;
