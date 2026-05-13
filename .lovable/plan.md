## Diagram refinements

### 1. BayDiagram (`src/components/BayDiagram.tsx`)

- Recolour the apex piece: change polygon `fill` to `CAD_COLORS.fillUpperRoof` (blue) and the two edge lines + `panelEdgePink` strokes to `CAD_COLORS.panelEdgeBlue`.
- Replace the legend with entries that match what's actually on the canvas:
  - red — "Panel connection marking" (matches the red `TickMark`s)
  - blue — "Apex piece"

### 2. GableDiagram (`src/components/GableDiagram.tsx`)

- Delete the "additional strut" `<text>` label and its leader `<line>` (lines ~156-158).
- Remove the "ridge edge" (pink) entry from the `Legend` items array.

### 3. RoofPlanDiagram (`src/components/RoofPlanDiagram.tsx`)

- Remove the "Keder Track" entry from `legendItems` 
- Remove the orange strip too

### 4. Title block — wire to project/variant info

Update `TitleBlock` (`src/components/diagrams/cad.tsx`) so the lines are dynamic:

- `PROJECT` → `"{projectName} – {diagramTitle}"` (e.g. "Gaylord 30×20 – Cross-section")
- `SIZE` →  (`30×20m`) Add the leg height and roof pitch
- `DATE` → unchanged
- New `PANEL SPEC` row → variant name (e.g. "Thermoline 5×3"); only rendered when supplied.

Add optional props `projectName` and `panelSpec` to `TitleBlock`. Each diagram passes its own short `diagramTitle` ("Cross-section", "Gable elevation", "Roof plan") plus the `projectName` and `panelSpec` it receives via props.

Propagate the new context:

- `BayDiagram`, `GableDiagram`, `RoofPlanDiagram` gain optional `projectName?: string` and `variantName?: string | null` props.
- `CalculatorPanel` (`src/components/CalculatorPanel.tsx`) gains an optional `projectName?: string` prop; passes `projectName` and `selectedVariant?.name` into all three diagrams.
- `src/routes/jobs.$jobId.tsx` passes `projectName={job?.name}` to `<CalculatorPanel>`.
- `src/routes/calculator.tsx` passes `projectName="Calculator"` (or omits — falls back to "Marquee Lining").

### Out of scope

- No schema changes, no DB calls, no calculator math changes.