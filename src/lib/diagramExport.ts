import { jsPDF } from "jspdf";

/** Serialize an <svg> element as a standalone SVG document string. */
export function svgElementToString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("xmlns:xlink")) clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  // Ensure explicit width/height for downstream rasterisers (uses viewBox if present).
  const vb = clone.viewBox?.baseVal;
  if (vb && vb.width && vb.height) {
    clone.setAttribute("width", String(vb.width));
    clone.setAttribute("height", String(vb.height));
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSVG(svg: SVGSVGElement, filename: string) {
  const str = svgElementToString(svg);
  triggerDownload(new Blob([str], { type: "image/svg+xml;charset=utf-8" }), ensureExt(filename, "svg"));
}

/** Rasterise an SVG element to a PNG data URL. */
export async function svgToPngDataURL(svg: SVGSVGElement, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const vb = svg.viewBox?.baseVal;
  const w = (vb?.width || svg.clientWidth || 800);
  const h = (vb?.height || svg.clientHeight || 600);
  const str = svgElementToString(svg);
  const blob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG for rasterisation"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const pxW = Math.max(1, Math.round(w * scale * 10));
    const pxH = Math.max(1, Math.round(h * scale * 10));
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.drawImage(img, 0, 0, pxW, pxH);
    return { dataUrl: canvas.toDataURL("image/png"), width: pxW, height: pxH };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPNG(svg: SVGSVGElement, filename: string, scale = 2) {
  const { dataUrl } = await svgToPngDataURL(svg, scale);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  triggerDownload(blob, ensureExt(filename, "png"));
}

function pdfFromImage(dataUrl: string, pxW: number, pxH: number): jsPDF {
  const orientation = pxW >= pxH ? "landscape" : "portrait";
  // Use a fixed page size (A4) and fit the image inside with margins.
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2;
  const ratio = pxW / pxH;
  let drawW = availW;
  let drawH = drawW / ratio;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * ratio;
  }
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH);
  return pdf;
}

export async function downloadPDF(svg: SVGSVGElement, filename: string) {
  const { dataUrl, width, height } = await svgToPngDataURL(svg, 2);
  const pdf = pdfFromImage(dataUrl, width, height);
  pdf.save(ensureExt(filename, "pdf"));
}

export interface CombinedItem {
  svg: SVGSVGElement;
  title: string;
}

export async function downloadCombinedPDF(
  items: CombinedItem[],
  filename: string,
  meta?: { projectName?: string | null; variantName?: string | null },
) {
  let pdf: jsPDF | null = null;
  for (const item of items) {
    const { dataUrl, width, height } = await svgToPngDataURL(item.svg, 2);
    const orientation = width >= height ? "landscape" : "portrait";
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
    } else {
      pdf.addPage("a4", orientation);
    }
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const headerH = 12;
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    const headerLeft = `${meta?.projectName ?? "Marquee"} – ${item.title}`;
    pdf.text(headerLeft, margin, margin + 4);
    if (meta?.variantName) {
      pdf.setFontSize(9);
      pdf.setTextColor(90);
      pdf.text(meta.variantName, pageW - margin, margin + 4, { align: "right" });
    }
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2 - headerH;
    const ratio = width / height;
    let drawW = availW;
    let drawH = drawW / ratio;
    if (drawH > availH) {
      drawH = availH;
      drawW = drawH * ratio;
    }
    const x = (pageW - drawW) / 2;
    const y = margin + headerH + (availH - drawH) / 2;
    pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH);
  }
  if (pdf) pdf.save(ensureExt(filename, "pdf"));
}

export function slugify(s: string): string {
  return (s || "diagram")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "diagram";
}

function ensureExt(filename: string, ext: string): string {
  return filename.toLowerCase().endsWith("." + ext) ? filename : `${filename}.${ext}`;
}
