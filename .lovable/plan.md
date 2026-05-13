## Higher-resolution diagram exports

The blur comes from `svgToPngDataURL` in `src/lib/diagramExport.ts` rasterising at viewBox-units × 20 (~600 px wide for a 30 m drawing). Replace the scaling rule with a target pixel size so output is crisp regardless of viewBox units.

### Changes to `src/lib/diagramExport.ts`
- Change `svgToPngDataURL(svg, scale)` to `svgToPngDataURL(svg, opts?: { targetWidth?: number; pixelRatio?: number })`.
- Default `targetWidth = 3200` px; compute height from the SVG's aspect ratio. Cap to a sensible max (8000 px) to avoid memory blow-ups.
- Set `imageSmoothingEnabled = true` and `imageSmoothingQuality = "high"` on the canvas context.
- Inline the SVG as a data URL (`data:image/svg+xml;base64,…`) instead of an object URL so the rasteriser uses the larger intrinsic size we just set on the cloned element. Also write the chosen pixel `width` / `height` attributes onto the cloned `<svg>` before serialising — this is what the browser uses when sizing the off-screen `<img>`.
- `downloadPNG` defaults to `targetWidth = 3200`.
- `downloadPDF` and `downloadCombinedPDF` raster at `targetWidth = 4000` (high enough to look sharp at A4 / A3 print scale) and pass `pdf.addImage(..., "PNG", x, y, w, h, undefined, "FAST")` — actually use `"NONE"` compression so jsPDF doesn't downsample; rely on the inherent file size.

### No other surface changes
- The per-diagram menu and the combined-PDF button keep the same labels and call sites.
- SVG export is already vector — no change needed there, only PNG and PDF get the resolution bump.
