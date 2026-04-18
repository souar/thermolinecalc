

## Redesign diagrams to match real assembly drawings

Three diagrams will be reworked to mirror the technical-drawing style of the reference PDFs: clean line-work on white, color-coded edge lines (green/blue/pink) shown in a legend, small italic part labels positioned over each piece, dimension lines with arrowheads, panel-join tick marks, and a thin title block in the corner.

### 1. BayDiagram — cross-section (San Diego reference)

Replace the filled-rectangle look with a CAD-style elevation:
- White background, thin black outline of the marquee profile (legs + rafters + ridge).
- Vertical legs drawn as thin double lines (representing leg posts), with floor line below.
- Tick marks (short red diagonals) at every panel join: along each leg between wall stacks, along each roof slope between roof panels, and at the ridge.
- Each panel area gets a small italic label centered on it: e.g. `thermoline panel 5x5` + part code line beneath. Wall panels labelled per stack column; roof panels per slope segment; apex labelled `thermoline panel fitting piece - {apexWidth}mm`.
- Rafter flap labels rotated 90° and placed over each leg ("rafter flap - 0.4 × 10m").
- Dimension lines: eave height annotated on the right with arrow heads (e.g. `5.160`), 250mm seal callout at the bottom-left and bottom-right with leader text "250mm of the filled panels rest on the floor as a seal".
- Up/down arrows on outer legs and arrows running along the roof slopes (decorative, matches reference).
- Top-right legend with three colored swatch lines: bottom-edge gable / top-edge standard / bottom-edge standard.
- Bottom-right title block: date, project name, dimensions (e.g. `{length}×{width}m`).

### 2. GableDiagram — elevation (Gable San Diego reference)

Keep current geometry (already accurate) but restyle to match:
- Same white CAD background, thin outline frame, internal vertical struts shown as double lines for each rafter junction.
- Wall panel grid drawn with thin lines + italic `thermoline panel 5x5` + part code labels in each cell.
- Triangle gable area filled light green (matching reference green), with each labelled section: `thermoline left/middle/ridge gable panel` + part code, mirrored on left and right.
- "additional strut" callout near apex.
- Rafter flap vertical labels on each leg, 250mm seal callouts, eave height dimension line, top-right color legend, bottom-right title block — all consistent with BayDiagram.

### 3. NEW RoofPlanDiagram — top-down (Ashchurch reference)

A new component `src/components/RoofPlanDiagram.tsx` rendered alongside the others:
- Top-down rectangle of full marquee footprint (`length × width`).
- Vertical column lines per bay junction (numbered 1..bays+1 along bottom).
- Horizontal row lines splitting roof into eave / ridge zones (lettered A..E on the left).
- Color zones: light cyan for eave/lower-roof bands, light blue for upper-roof bands, light pink/red for the apex ridge band running down the centre.
- X-pattern bracing lines drawn diagonally inside each bay cell (decorative, matches reference).
- Dimension lines along bottom (bay sizes in mm: e.g. `5000` between centerlines, `4878` for panel widths, `122` for joins) and along left edge (slope-length zones).
- Bay-junction labels at top: `RB / VB / NB / NB / NB / VB / RB`.
- Bottom-left legend: swatches for "Apex Ridge", "Upper Roof", "Lower Roof", "Keder Track".
- Title block bottom-right.

Display below or next to BayDiagram on the Calculator page (will live in a new tab or section — see "Routing" below).

### Shared building blocks

New helper module `src/components/diagrams/cad.tsx` exporting reusable SVG primitives:
- `<DimLine>` — line with arrowheads and dimension text.
- `<TickMark>` — short red join-tick at a given point/angle.
- `<PartLabel>` — italic two-line text (description + part code), with optional rotation.
- `<TitleBlock>` — bottom-right project info card.
- `<Legend>` — top-right colored line legend.

This keeps the three diagrams consistent and trims duplication.

### Files to change

- **`src/components/BayDiagram.tsx`** — full redesign to CAD style.
- **`src/components/GableDiagram.tsx`** — restyle to CAD style, keep geometry.
- **`src/components/RoofPlanDiagram.tsx`** — new file.
- **`src/components/diagrams/cad.tsx`** — new shared primitives.
- **`src/components/CalculatorPanel.tsx`** — render `RoofPlanDiagram` in the Diagrams tab below the existing two.

### Out of scope

- Rafter flap visualization on the new roof plan (the plan focuses on roof panels; flaps live in the bay/gable views).
- Editable part numbers / per-customer title block content (using static date + project size for now).
- Printing/export of diagrams as PDF (can be added later).
- Hatching/fill textures on metal beams (using simple double-line strokes instead).

