import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPDF, downloadPNG, downloadSVG } from "@/lib/diagramExport";
import { toast } from "sonner";

interface Props {
  getSvg: () => SVGSVGElement | null;
  filename: string;
}

export function DiagramDownloadMenu({ getSvg, filename }: Props) {
  const run = async (fn: (svg: SVGSVGElement, name: string) => void | Promise<void>) => {
    const svg = getSvg();
    if (!svg) {
      toast.error("Diagram not ready");
      return;
    }
    try {
      await fn(svg, filename);
    } catch (e) {
      console.error(e);
      toast.error("Download failed");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run(downloadSVG)}>SVG</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((s, n) => downloadPNG(s, n))}>PNG</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((s, n) => downloadPDF(s, n))}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
