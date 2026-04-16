
## Calculator output redesign

### 1. Panel count as primary metric
In `AreaCard` (CalculatorPanel.tsx), swap the visual hierarchy:
- **Primary (large)**: panel count + "panels"
- **Secondary (smaller)**: m² value
- Keep `sub` description below

Apply same swap to top stats row: "Total panels" becomes the highlighted/largest stat, "Total area" becomes secondary.

### 2. Stable layout for section cards
Current issue: `customWallInfill` card only renders when needed, shifting all other cards in the grid.

Fix: use a **fixed 2-column grid grouped by area type**, with each section in a deterministic slot:

```text
┌─────────────────┬─────────────────┐
│ Walls           │ Custom infill   │  ← infill slot always present
│                 │ (or "—" empty)  │
├─────────────────┼─────────────────┤
│ Roof            │ Apex            │
├─────────────────┼─────────────────┤
│ Gable walls     │ Gable triangles │
└─────────────────┴─────────────────┘
```

When no custom infill is needed, render a muted placeholder card ("No custom infill needed") in that slot so positions never shift. Group walls/infill, roof/apex, gables together for logical scanning.

### 3. Ridge height from ground
In `calculator.ts`, currently `ridgeHeight = halfWidth * tan(pitch)` = peak above eave only.
Change displayed ridge height to `eaveHeight + halfWidth * tan(pitch)` = total ground-to-peak.
- Add new field `ridgeHeightTotal` to `CalcResult` (keep `ridgeHeight` as the apex-rise above eave for internal gable triangle math)
- Update Geometry card KV to show `ridgeHeightTotal`

### 4. Single bay diagram + table
New component `BayDiagram.tsx` rendering an inline SVG cross-section of one bay viewed from the end:
- Two wall stacks (left + right) showing N stacked panels + optional infill strip
- Two roof slopes meeting at apex
- Apex strip highlighted at top
- Labels: panel count per zone, dimensions

Plus a compact table beside it:
| Section | Per bay | Panel size | m² per bay |
|---|---|---|---|
| Wall (each side) | 1 stack × N | 5×5 | … |
| Custom infill | 1 (if needed) | 5×0.65 | … |
| Roof (each side) | N panels | 5×5 | … |
| Apex | 1 strip | W×bay | … |

### 5. Gable end diagram
New component `GableDiagram.tsx` rendering the gable end elevation:
- Rectangular gable wall section (full panels grid based on `width / panelW × fullStacks`)
- Triangle on top split into the calculated even-numbered slices (max baySize wide)
- Labels showing panel count per zone

Both diagrams: pure SVG, use `currentColor` / theme tokens (`stroke-border`, `fill-muted`, `fill-primary/10` for highlights). Responsive via viewBox. Numbers fed from `CalcResult`.

### Layout order in CalculatorPanel results column
1. Warnings alert (unchanged)
2. Top stats (panel count primary)
3. **Bay diagram + table** (new card)
4. **Gable end diagram** (new card)
5. Section cards grid (stable 6-slot layout)
6. Geometry card (with corrected ridge height)

### Files
- `src/lib/calculator.ts` — add `ridgeHeightTotal` to result
- `src/components/CalculatorPanel.tsx` — restructure stats, swap card hierarchy, stable grid, integrate new diagrams
- `src/components/BayDiagram.tsx` — new
- `src/components/GableDiagram.tsx` — new
