import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";

const Promoters = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="font-ibm-plex text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← back to user app
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero section */}
        <div className="text-center space-y-4">
          <h1 className="font-montserrat font-bold text-4xl md:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            For Promoters & Musicians
          </h1>
          <p className="font-ibm-plex text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your events with thousands of music lovers
          </p>
        </div>

        {/* Video section */}
        <Card className="p-8 bg-card border-border">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Play className="w-10 h-10 text-primary" />
              </div>
              <p className="font-ibm-plex text-muted-foreground">
                Walkthrough video placeholder
              </p>
              <p className="font-ibm-plex text-sm text-muted-foreground">
                Video will be embedded here
              </p>
            </div>
          </div>
        </Card>

        {/* Primary CTA */}
        <div className="text-center space-y-4">
          <Button
            size="lg"
            variant="default"
            onClick={() => navigate("/promoters/create")}
            className="text-lg px-8 py-6 h-auto font-montserrat font-bold"
          >
            Push your event now
          </Button>
          
          <div>
            <button
              onClick={() => navigate("/promoters/about")}
              className="font-ibm-plex text-sm text-primary hover:underline"
            >
              Learn more about the project →
            </button>
          </div>
        </div>

        {/* Early partner block */}
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <h3 className="font-montserrat font-bold text-xl text-center">
              You're an Early Partner 🎵
            </h3>
            <p className="font-ibm-plex text-muted-foreground text-center">
              You are one of our first partners. Your feedback helps us build something big for small live music scenes.
              If you have ideas or notice anything, please contact us:
            </p>
            <div className="text-center space-y-2">
              <p className="font-ibm-plex">
                <span className="text-muted-foreground">Email:</span>{" "}
                <a href="mailto:hello@laiive.app" className="text-primary hover:underline">
                  hello@laiive.app
                </a>
              </p>
              <p className="font-ibm-plex">
                <span className="text-muted-foreground">Phone:</span>{" "}
                <a href="tel:+1234567890" className="text-primary hover:underline">
                  +1 (234) 567-890
                </a>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Promoters;
