import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";

const PromoterAbout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🫦</span>
            <span className="font-montserrat font-bold text-xl text-primary">laiive</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/promoters")}
              className="font-ibm-plex text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t.about.back}
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="font-montserrat font-bold text-4xl md:text-5xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t.about.title}
          </h1>
        </div>

        {/* Content Cards */}
        <div className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              {t.about.philosophyTitle}
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              {t.about.philosophyText}
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              {t.about.aiEthicsTitle}
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              {t.about.aiEthicsText}
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              {t.about.smallVenuesTitle}
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              {t.about.smallVenuesText}
            </p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="font-montserrat font-bold text-2xl mb-4">
              {t.about.joinTitle}
            </h2>
            <p className="font-ibm-plex text-muted-foreground leading-relaxed">
              {t.about.joinText}
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
            {t.promoter.ctaButton}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PromoterAbout;
