import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const PrintableFlyer = () => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<'A4' | 'A5' | 'Letter'>('A5');

  const handlePrint = (size: 'A4' | 'A5' | 'Letter') => {
    setPageSize(size);
    setTimeout(() => window.print(), 100);
  };

  const handleDownload = async (format: 'png' | 'jpg' | 'svg') => {
    if (!flyerRef.current) return;

    const flyer = flyerRef.current.querySelector('.flyer-content') as HTMLElement;
    if (!flyer) return;

    // Create canvas from the flyer
    const canvas = document.createElement('canvas');
    const scale = 2; // Higher resolution
    canvas.width = flyer.offsetWidth * scale;
    canvas.height = flyer.offsetHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // For simple download, we'll use a different approach - create an SVG or use the print CSS
    if (format === 'svg') {
      // Create SVG version
      const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="533" viewBox="0 0 400 533">
  <rect width="400" height="533" fill="#0a0a0a"/>
  <text x="200" y="60" text-anchor="middle" font-family="sans-serif" font-size="32" fill="#FF2AA0" font-weight="bold">🫦 laiive</text>
  <text x="200" y="240" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" font-weight="bold">Discover live music</text>
  <text x="200" y="280" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#00CFEA" font-weight="bold">in your neighborhood</text>
  <rect x="130" y="340" width="140" height="140" fill="white" rx="8"/>
  <image x="140" y="350" width="120" height="120" href="https://api.qrserver.com/v1/create-qr-code/?size=200x200&amp;data=https://laiive.com"/>
  <text x="200" y="510" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#FF2AA0" font-weight="bold">laiive.com</text>
</svg>`;
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laiive-flyer.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // For PNG/JPG, use html2canvas approach with a simple workaround
    // Since we can't use html2canvas, we'll create a data URL from the SVG
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1066" viewBox="0 0 400 533">
  <rect width="400" height="533" fill="#0a0a0a"/>
  <text x="200" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="#FF2AA0" font-weight="bold">🫦 laiive</text>
  <text x="200" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="bold">Discover live music</text>
  <text x="200" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#00CFEA" font-weight="bold">in your neighborhood</text>
  <rect x="130" y="340" width="140" height="140" fill="white" rx="8"/>
  <text x="200" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#FF2AA0" font-weight="bold">laiive.com</text>
  <text x="200" y="530" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#666">Free for musicians • Free for venues • Free for music lovers</text>
</svg>`;
    
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.95 : undefined;
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `laiive-flyer.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, mimeType, quality);
      
      URL.revokeObjectURL(svgUrl);
    };
    
    img.src = svgUrl;
  };

  // QR code pointing to laiive.com
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://laiive.com";

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Printer className="w-4 h-4 mr-2" />
              Print
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Paper Size</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handlePrint('A4')}>
              A4 (210 × 297 mm)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint('A5')}>
              A5 (148 × 210 mm)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint('Letter')}>
              Letter (8.5 × 11 in)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border">
              <Download className="w-4 h-4 mr-2" />
              Download
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Format</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleDownload('png')}>
              PNG (High Quality)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('jpg')}>
              JPG (Smaller File)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDownload('svg')}>
              SVG (Vector)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <div className="flyer-content bg-[#0a0a0a] text-white aspect-[3/4] flex flex-col items-center justify-between p-8 print:p-12 border border-border print:border-none">
          {/* Top Section - Logo */}
          <div className="text-center">
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl pb-0.5">🫦</span>
              <span className="font-montserrat font-bold text-4xl text-[#FF2AA0]">laiive</span>
            </div>
          </div>

          {/* Middle Section - Main Message */}
          <div className="text-center space-y-6 flex-1 flex flex-col justify-center">
            <h1 className="font-montserrat font-bold text-2xl md:text-3xl leading-tight">
              Discover live music
              <br />
              <span className="text-[#00CFEA]">in your neighborhood</span>
            </h1>
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

      {/* Print Styles - Dynamic based on selected size */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize === 'A4' ? 'A4' : pageSize === 'A5' ? 'A5' : 'letter'} portrait;
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
