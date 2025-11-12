import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Users } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-glow blur-3xl opacity-30" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl opacity-20" />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo and branding */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-8xl mb-4 animate-pulse">🫦</div>
          <h1 className="text-7xl md:text-8xl font-montserrat font-bold mb-4 bg-gradient-to-r from-primary via-orange to-accent bg-clip-text text-transparent">
            laiive
          </h1>
          <p className="text-xl md:text-2xl font-ibm-plex text-muted-foreground max-w-md mx-auto">
            Discover live music near you
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <Button 
            variant="hero" 
            size="xl"
            onClick={() => navigate("/chat")}
            className="group"
          >
            <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Start Chatting
          </Button>
          
          <Button 
            variant="outline-hero" 
            size="xl"
            onClick={() => navigate("/chat")}
          >
            Sign in with Google
          </Button>
        </div>

        {/* Promoters section */}
        <div className="animate-in fade-in duration-700 delay-300">
          <button
            onClick={() => navigate("/promoters")}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-ibm-plex"
          >
            <Users className="w-5 h-5" />
            <span>Are you a promoter?</span>
            <span className="text-primary group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Landing;
