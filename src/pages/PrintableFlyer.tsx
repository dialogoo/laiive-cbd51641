import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Share2, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ColorTheme = 'fuchsia' | 'cyan' | 'yellow' | 'orange';

const colorThemes: Record<ColorTheme, { primary: string; accent: string; hex: string }> = {
  fuchsia: { primary: '#FF2AA0', accent: '#00CFEA', hex: '#FF2AA0' },
  cyan: { primary: '#00CFEA', accent: '#FF2AA0', hex: '#00CFEA' },
  yellow: { primary: '#FFD500', accent: '#FF2AA0', hex: '#FFD500' },
  orange: { primary: '#FF8C00', accent: '#00CFEA', hex: '#FF8C00' },
};

const PrintableFlyer = () => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('fuchsia');

  const theme = colorThemes[colorTheme];

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (format: 'png' | 'jpg' | 'svg') => {
    const svgContent = generateSvg(format === 'svg' ? 400 : 800, format === 'svg' ? 600 : 1200);
    
    if (format === 'svg') {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laiive-flyer.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'laiive - Discover live music in your neighborhood',
          text: 'Discover live music in your neighborhood with laiive',
          url: 'https://laiive.com',
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText('https://laiive.com');
      alert('Link copied to clipboard!');
    }
  };

  const generateSvg = (width: number, height: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 400 600">
  <rect width="400" height="600" fill="#0a0a0a"/>
  <text x="200" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" fill="${theme.primary}" font-weight="bold">🫦 laiive</text>
  <text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">Discover live music</text>
  <text x="200" y="310" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="${theme.accent}" font-weight="bold">in your neighborhood</text>
  <rect x="100" y="360" width="200" height="200" fill="white" rx="12"/>
  <image x="115" y="375" width="170" height="170" href="https://api.qrserver.com/v1/create-qr-code/?size=200x200&amp;data=https://laiive.com&amp;color=${theme.primary.replace('#', '')}"/>
  <text x="200" y="595" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${theme.primary}" font-weight="bold">laiive.com</text>
</svg>`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://laiive.com&color=${theme.primary.replace('#', '')}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                className="bg-primary hover:bg-primary/90"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="outline" className="border-border">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="outline" 
                className="border-border"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        className="max-w-lg mx-auto bg-[#0a0a0a] p-4 print:p-0 print:max-w-full print:mx-0 relative"
      >
        {/* Color Theme Selector - 4 balls */}
        <div className="print:hidden absolute top-2 left-1/2 -translate-x-1/2 flex gap-3 z-10">
          {(Object.keys(colorThemes) as ColorTheme[]).map((key) => (
            <button
              key={key}
              onClick={() => setColorTheme(key)}
              className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 ${
                colorTheme === key ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a] scale-110' : ''
              }`}
              style={{ backgroundColor: colorThemes[key].hex }}
              aria-label={`${key} theme`}
            />
          ))}
        </div>

        <div className="flyer-content bg-[#0a0a0a] text-white aspect-[2/3] flex flex-col items-center justify-between py-12 px-6 print:py-16 print:px-8 border border-border print:border-none">
          {/* Top Section - Logo */}
          <div className="text-center">
            <div className="flex items-end justify-center gap-2">
              <span className="text-6xl pb-1">🫦</span>
              <span 
                className="font-montserrat font-bold text-6xl"
                style={{ color: theme.primary }}
              >
                laiive
              </span>
            </div>
          </div>

          {/* Middle Section - Main Message */}
          <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
            <h1 className="font-montserrat font-bold text-4xl md:text-5xl leading-tight">
              Discover live music
              <br />
              <span style={{ color: theme.accent }}>in your neighborhood</span>
            </h1>
          </div>

          {/* QR Code Section */}
          <div className="text-center space-y-4">
            <div className="bg-white p-4 rounded-xl inline-block">
              <img 
                src={qrCodeUrl} 
                alt="Scan to visit laiive" 
                className="w-44 h-44 md:w-52 md:h-52"
              />
            </div>
            <p 
              className="font-montserrat font-bold text-2xl"
              style={{ color: theme.primary }}
            >
              laiive.com
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .flyer-content {
            width: 100vw;
            height: 100vh;
            max-width: none;
            aspect-ratio: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableFlyer;
