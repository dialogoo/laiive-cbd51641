import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

const PrintableFlyer = () => {
  const flyerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // QR code pointing to the promoters page
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://laiive.com/promoters";

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90">
          <Printer className="w-4 h-4 mr-2" />
          Print Flyer
        </Button>
      </div>

      {/* Back link - Hidden when printing */}
      <div className="print:hidden p-4">
        <a href="/promoters/about" className="text-muted-foreground hover:text-foreground transition-colors">
          ← back
        </a>
      </div>

      {/* Flyer Content */}
      <div 
        ref={flyerRef}
        className="max-w-md mx-auto bg-[#0a0a0a] p-8 print:p-0 print:max-w-full print:mx-0"
      >
        <div className="bg-[#0a0a0a] text-white aspect-[3/4] flex flex-col items-center justify-between p-8 print:p-12 border border-border print:border-none">
          {/* Top Section - Logo & Tagline */}
          <div className="text-center space-y-4">
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl pb-0.5">🫦</span>
              <span className="font-montserrat font-bold text-4xl text-[#FF2AA0]">laiive</span>
            </div>
            <p className="font-ibm-plex text-lg text-gray-300">
              Small stages. Big connections.
            </p>
          </div>

          {/* Middle Section - Main Message */}
          <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
            <h1 className="font-montserrat font-bold text-2xl md:text-3xl leading-tight">
              Discover live music
              <br />
              <span className="text-[#00CFEA]">in your neighborhood</span>
            </h1>
            
            <p className="font-ibm-plex text-gray-400 text-sm max-w-[280px]">
              Connecting music lovers with local concerts, small venues, and emerging artists.
            </p>
          </div>

          {/* QR Code Section */}
          <div className="text-center space-y-4">
            <div className="bg-white p-3 rounded-lg inline-block">
              <img 
                src={qrCodeUrl} 
                alt="Scan to visit laiive" 
                className="w-32 h-32 md:w-40 md:h-40"
              />
            </div>
            <p className="font-ibm-plex text-sm text-gray-400">
              Scan to join the movement
            </p>
            <p className="font-montserrat font-bold text-[#FF2AA0] text-lg">
              laiive.com
            </p>
          </div>

          {/* Bottom - Call to Action */}
          <div className="text-center mt-6">
            <p className="font-ibm-plex text-xs text-gray-500">
              Free for musicians • Free for venues • Free for music lovers
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableFlyer;
