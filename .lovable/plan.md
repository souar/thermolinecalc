## Diagram downloads

### 1. Make each diagram's SVG capturable
Update `CadFrame` (`src/components/diagrams/cad.tsx`) to accept an optional `svgRef?: React.Ref<SVGSVGElement>` and forward it to its `<svg>` element. Also embed the viewBox metadata needed for standalone export (xmlns attribute).

### 2. New utility `src/lib/diagramExport.ts`
Pure browser helpers (no new deps for SVG/PNG; uses `jspdf` for PDF):
- `svgElementToString(svg)` → serialized standalone SVG with xmlns.
- `downloadSVG(svg, filename)`.
- `downloadPNG(svg, filename, scale=2)` — rasterise via `<canvas>` + `Image` from a data URL.
- `downloadPDF(svg, filename)` — single-page PDF sized to the SVG's aspect ratio, using `jspdf` + the rasterised PNG.
- `downloadCombinedPDF(items: {svg, title}[], filename, meta)` — multi-page PDF, one diagram per page, with a small header showing project name + diagram title.

Add `jspdf` via `bun add jspdf`. (No `svg2pdf.js` — rasterising to PNG is good enough and avoids font issues.)

### 3. Per-diagram download menu
Add a small `DiagramDownloadMenu` component (`src/components/diagrams/DiagramDownloadMenu.tsx`) — a shadcn `DropdownMenu` button (Download icon) with items "SVG", "PNG", "PDF". Takes `getSvg: () => SVGSVGElement | null` and `filename: string`.

Wire it into each diagram (`BayDiagram`, `GableDiagram`, `RoofPlanDiagram`):
- Create a local `useRef<SVGSVGElement>(null)` and pass to `<CadFrame svgRef={ref}>`.
- Render the menu in the `CardHeader` (right side, next to the title) using a flex layout.
- Filename: `{projectName}-{diagram-slug}` sanitised (e.g. `gaylord-cross-section.svg`).

### 4. Combined PDF button
In `CalculatorPanel` diagrams tab (`src/components/CalculatorPanel.tsx`), add a "Download all (PDF)" button above the three diagrams. To collect SVGs from the three child components without prop drilling refs upward, lift the refs: create three refs in `CalculatorPanel` and pass each as a prop (`svgRef`) into the diagram, which forwards it to `CadFrame`. Button calls `downloadCombinedPDF` with the three refs and `{ projectName, variantName }` metadata.

### Out of scope
- No server-side rendering; all export is client-side (downloads work in the preview/published browser).
- No styling overhaul of the diagrams themselves.
- Tables under each diagram are NOT included in the PDF — only the CAD drawing.
