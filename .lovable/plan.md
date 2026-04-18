

## Add "sections to line" selection to marquee specification

Let users toggle which parts of the marquee are actually being lined. Unselected sections are excluded from m², panels, weight, cost, install time, and diagrams.

### New inputs (CalcInput)

Boolean flags, all default `true` for backwards compatibility:
- `lineRoof`
- `lineWalls` (long sides)
- `lineGableWalls` (rectangular fill below eave on each end)
- `lineGableTriangles` (triangles + infills above eave on each end)
- `lineApex`

Existing `roofRaftersEnabled` / `legRaftersEnabled` already cover rafter flaps — keep as-is but group them into the same UI block.

### UI — CalculatorPanel spec card

Add a new "Sections to line" sub-section above the lining type/pricing rows, styled like the existing toggle group (overhang / floor seal). A grid of switches:
- Roof
- Walls
- Gable walls
- Gable triangles & infills
- Apex infill
- Roof rafter covers (existing)
- Leg rafter covers (existing)

Sensible interactions:
- If Roof is off → Apex auto-disables and is hidden (apex only exists with a roof)
- If Roof is off → Roof rafter covers auto-disable
- If Walls is off → Leg rafter covers auto-disable
- Gable walls and Gable triangles are independent (can line just triangles, just walls, both, or neither)

### Calculation logic (`src/lib/calculator.ts`)

In `calculate()`, gate each section's outputs on its flag. When a section is off, set its panels/m²/pieces to 0 and its custom infill to `null`. Specifically:
- `lineRoof = false` → `roofPanels=0, roofM2=0, customRoofEave=null`, also force `apexPieces=0, apexM2=0`
- `lineApex = false` → `apexPieces=0, apexM2=0` (apex still possible without if roof on but user opted out)
- `lineWalls = false` → `wallsPanels=0, wallsM2=0, customWallInfill=null`
- `lineGableWalls = false` → `gableWallsPanels=0, gableWallsM2=0`
- `lineGableTriangles = false` → `gableTriCount=0, gableInfillCount=0, gableTriM2=0, gableInfillM2=0, gableTriSlices=[]`
- Existing rafter flags already gate `roofRafterCovers` / `legRafterCovers`

Totals (`totalM2`, `totalPanels`, `totalWeightKg`, `totalCost`) recompute from the gated values automatically.

### Diagrams

- `BayDiagram` — hide roof slopes/apex when roof off, hide wall rectangles when walls off, hide gable triangles & gable wall band per their flags. Always keep the structural outline (rafters/legs) so the drawing still makes sense; only the colored lining fills/labels disappear.
- `GableDiagram` — same gating for gable wall rect and gable triangles/infills.
- `RoofPlanDiagram` — hide when roof is off (or show empty frame with "Roof not lined" caption).

### Install panel

`panelsBySection()` already reads from the gated `CalcResult` fields, so install times for excluded sections drop to 0 automatically — no changes needed beyond the calculator gating.

### Persistence

- `marquee_specs` table — add 5 nullable boolean columns (`line_roof`, `line_walls`, `line_gable_walls`, `line_gable_triangles`, `line_apex`), default `true`. Migration only.
- `src/routes/jobs.$jobId.tsx` — load/save the new flags alongside existing spec fields.
- `src/routes/calculator.tsx` — persist in localStorage with the rest of the input.

### Files to change

- `src/lib/calculator.ts` — extend `CalcInput`, `DEFAULT_INPUT`, gate outputs in `calculate()`
- `src/components/CalculatorPanel.tsx` — new "Sections to line" toggle group
- `src/components/BayDiagram.tsx`, `GableDiagram.tsx`, `RoofPlanDiagram.tsx` — conditional rendering per flag
- `src/routes/calculator.tsx`, `src/routes/jobs.$jobId.tsx` — wire new inputs
- New migration — add 5 boolean columns to `marquee_specs`

### Out of scope

- Per-bay section selection (e.g. line only bays 1–3 of the roof)
- Partial-wall lining (e.g. only one long side)
- Recalculating structural geometry — outlines/dimensions in diagrams stay the same regardless of which lining is selected

