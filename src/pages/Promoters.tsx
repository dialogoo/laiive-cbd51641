import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Rocket } from "lucide-react";

const Promoters = () => {
  const tiers = [
    {
      name: "Free Tier",
      price: "$0",
      period: "/month",
      events: "30 events/year",
      promoted: "5 promoted events/year",
      icon: null,
      variant: "outline" as const,
    },
    {
      name: "Promoter Pro",
      price: "$59",
      period: "/month",
      events: "250 events/year",
      promoted: "20 promoted events/year",
      icon: <Crown className="w-6 h-6" />,
      variant: "hero" as const,
      popular: true,
    },
    {
      name: "Event Hub",
      price: "$279",
      period: "/month",
      events: "1,000 events/year",
      promoted: "100 promoted events/year",
      icon: <Rocket className="w-6 h-6" />,
      variant: "outline-hero" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
            <span className="font-ibm-plex text-muted-foreground">for Promoters</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="font-montserrat font-bold text-4xl md:text-5xl mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Grow Your Events
          </h1>
          <p className="font-ibm-plex text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach thousands of music lovers and fill your venues with the right crowd
          </p>
        </div>

        {/* Subscription tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative p-6 bg-card border-border hover:shadow-glow-primary transition-all duration-300",
                tier.popular && "border-primary shadow-glow-primary scale-105"
              )}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-montserrat font-bold">
                  POPULAR
                </div>
              )}
              
              <div className="text-center mb-6">
                {tier.icon && (
                  <div className="flex justify-center mb-3 text-primary">
                    {tier.icon}
                  </div>
                )}
                <h3 className="font-montserrat font-bold text-2xl mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-montserrat font-bold text-primary">
                    {tier.price}
                  </span>
                  <span className="text-muted-foreground font-ibm-plex">
                    {tier.period}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="font-ibm-plex">{tier.events}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="font-ibm-plex">{tier.promoted}</span>
                </div>
              </div>

              <Button
                variant={tier.variant}
                size="lg"
                className="w-full"
              >
                {tier.price === "$0" ? "Get Started" : "Go Pro"}
              </Button>
            </Card>
          ))}
        </div>

        {/* Sign in section */}
        <div className="text-center">
          <p className="font-ibm-plex text-muted-foreground mb-4">
            Sign in with Google to start posting events
          </p>
          <Button variant="hero" size="xl">
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
};

// Add missing import
import { cn } from "@/lib/utils";

export default Promoters;
