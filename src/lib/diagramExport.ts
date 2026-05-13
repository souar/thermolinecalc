import { jsPDF } from "jspdf";

/** Serialize an <svg> element as a standalone SVG document string. */
export function svgElementToString(svg: SVGSVGElement, sized?: { width: number; height: number }): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("xmlns:xlink")) clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  if (sized) {
    clone.setAttribute("width", String(sized.width));
    clone.setAttribute("height", String(sized.height));
  } else {
    const vb = clone.viewBox?.baseVal;
    if (vb && vb.width && vb.height) {
      clone.setAttribute("width", String(vb.width));
      clone.setAttribute("height", String(vb.height));
    }
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

interface RasterOpts {
  targetWidth?: number; // target output width in pixels
  maxWidth?: number;
}

/** Rasterise an SVG element to a high-resolution PNG data URL. */
export async function svgToPngDataURL(svg: SVGSVGElement, opts: RasterOpts = {}): Promise<{ dataUrl: string; width: number; height: number }> {
  const vb = svg.viewBox?.baseVal;
  const vbW = vb?.width || svg.clientWidth || 800;
  const vbH = vb?.height || svg.clientHeight || 600;
  const targetWidth = Math.min(opts.maxWidth ?? 8000, Math.max(800, opts.targetWidth ?? 3200));
  const pxW = Math.round(targetWidth);
  const pxH = Math.max(1, Math.round((vbH / vbW) * pxW));

  // Bake the chosen pixel size into the cloned SVG so the off-screen <img>
  // uses it as its intrinsic resolution when drawn onto the canvas.
  const str = svgElementToString(svg, { width: pxW, height: pxH });
  const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(str)));

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load SVG for rasterisation"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, pxW, pxH);
  ctx.drawImage(img, 0, 0, pxW, pxH);
  return { dataUrl: canvas.toDataURL("image/png"), width: pxW, height: pxH };
}

export async function downloadPNG(svg: SVGSVGElement, filename: string, opts: RasterOpts = {}) {
  const { dataUrl } = await svgToPngDataURL(svg, { targetWidth: 3200, ...opts });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  triggerDownload(blob, ensureExt(filename, "png"));
}

function fitImageOnPage(pdf: jsPDF, dataUrl: string, pxW: number, pxH: number, opts?: { headerH?: number }) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const headerH = opts?.headerH ?? 0;
  const availW = pageW - margin * 2;
  const availH = pageH - margin * 2 - headerH;
  const ratio = pxW / pxH;
  let drawW = availW;
  let drawH = drawW / ratio;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * ratio;
  }
  const x = (pageW - drawW) / 2;
  const y = margin + headerH + (availH - drawH) / 2;
  pdf.addImage(dataUrl, "PNG", x, y, drawW, drawH, undefined, "NONE");
}

export async function downloadPDF(svg: SVGSVGElement, filename: string) {
  const { dataUrl, width, height } = await svgToPngDataURL(svg, { targetWidth: 4000 });
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  fitImageOnPage(pdf, dataUrl, width, height);
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
    const { dataUrl, width, height } = await svgToPngDataURL(item.svg, { targetWidth: 4000 });
    const orientation = width >= height ? "landscape" : "portrait";
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
    } else {
      pdf.addPage("a4", orientation);
    }
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const headerH = 12;
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    pdf.text(`${meta?.projectName ?? "Marquee"} – ${item.title}`, margin, margin + 4);
    if (meta?.variantName) {
      pdf.setFontSize(9);
      pdf.setTextColor(90);
      pdf.text(meta.variantName, pageW - margin, margin + 4, { align: "right" });
    }
    fitImageOnPage(pdf, dataUrl, width, height, { headerH });
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
