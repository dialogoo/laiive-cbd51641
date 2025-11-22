import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const PromoterAbout = () => {
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
            onClick={() => navigate("/promoters")}
            className="font-ibm-plex text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="font-montserrat font-bold text-4xl md:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About the Project
          </h1>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              Our Philosophy
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              We believe live music is the heartbeat of local communities. Small venues, emerging artists, 
              and independent promoters deserve the same visibility as major events. Our platform connects 
              passionate music lovers with authentic live experiences, making it easier to discover what's 
              happening in your neighborhood.
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              AI Ethics Layer
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              Our AI-powered search is designed to be fair and transparent. We don't favor paid promotions 
              or big venues. Instead, we match users with events based on their genuine interests and location. 
              The AI learns what matters to local music scenes—authenticity, diversity, and accessibility. 
              Your data stays private, and our recommendations stay honest.
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              Why Small Venues Matter
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              Small venues are where legends are born. They're where communities gather, where new sounds emerge, 
              and where music stays real. But they often struggle with visibility and marketing. We're building 
              tools to amplify their voice without changing their soul. By making event discovery smarter and 
              more accessible, we help keep local music scenes alive and thriving.
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              Join the Movement
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              As an early partner, you're helping us shape the future of live music discovery. Your feedback, 
              your events, and your community make this platform what it is. Together, we're creating something 
              that puts people and music first—not algorithms and advertising.
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center pt-8">
          <Button
            size="lg"
            onClick={() => navigate("/promoters/create")}
            className="font-montserrat font-bold"
          >
            Push your event now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoterAbout;
