import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

const PromoterAbout = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-end gap-1 hover:opacity-80 transition-opacity">
            <span className="text-xl sm:text-2xl pb-0.5">🫦</span>
            <span className="font-montserrat font-bold text-xl sm:text-2xl text-primary">laiive</span>
          </Link>
          <Link to="/promoters" className="flex items-end gap-1 hover:opacity-80 transition-opacity">
            <span className="text-xl sm:text-2xl pb-0.5">🫦</span>
            <span className="font-montserrat font-bold text-xl sm:text-2xl text-accent">laiive</span>
            <span className="ml-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent rounded mb-1">
              Pro
            </span>
          </Link>
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
      </div>
    </div>
  );
};

export default PromoterAbout;
