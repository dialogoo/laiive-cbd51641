import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Globe, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const Chat = () => {
  const [searchMode, setSearchMode] = useState<"database" | "internet">("database");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hey! 👋 I'm here to help you discover amazing live music events near you. What are you in the mood for today?",
    },
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setMessages([...messages, { role: "user", content: message }]);
    setMessage("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm searching for events near you... (AI integration coming soon!)"
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header with search toggle */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
          </div>
          
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
                "max-w-[80%] rounded-2xl px-4 py-3 font-ibm-plex",
                msg.role === "user"
                  ? "bg-muted text-foreground border border-border"
                  : "bg-card text-card-foreground border border-border"
              )}
            >
              {msg.content}
            </div>
            </div>
          ))}
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
            placeholder="Tell me what you're looking for..."
            className="flex-1 bg-background border-border font-ibm-plex"
          />
          
          <Button
            onClick={handleSendMessage}
            variant="default"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
