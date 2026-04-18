

## Increase diagram readability

### 1. Larger, readable text (`src/components/diagrams/cad.tsx`)
Bump the CAD font constants ~2.5×:
- `CAD_FONT` 0.22 → 0.55
- `CAD_FONT_SM` 0.16 → 0.40
- `CAD_FONT_XS` 0.13 → 0.32

This scales every label/dimension/legend across all three diagrams in one place. Also bump default `Legend`/`TitleBlock` row heights and padding proportionally so text doesn't overflow their boxes.

### 2. Bolder panel-join markers (`cad.tsx` + diagrams)
Make `TickMark` more prominent:
- Default `size` 0.18 → 0.45
- Stroke uses `CAD_STROKE_THICK` already; bump to 0.08 for visibility
- Add a small filled dot at the join centre for extra clarity

Also thicken the main outline strokes:
- `CAD_STROKE` 0.025 → 0.04
- `CAD_STROKE_THICK` 0.05 → 0.08

### 3. Apex integration (`src/components/BayDiagram.tsx`)
Currently the apex infill is drawn as a separate horizontal band sitting above the ridge line, making it look detached. Fix:
- Remove the visual gap between the top of each roof slope and the apex piece
- Draw the apex as a small triangular/trapezoidal cap that sits flush on the ridge, with its base aligned to where the two slopes meet
- Keep the pink fill colour but use the same outline weight as the rafters so it reads as one continuous structure
- Move the "thermoline panel fitting piece — {apexWidth}mm" label to sit just above the apex with a leader line if needed, rather than inside a detached rectangle

### Files to change
- `src/components/diagrams/cad.tsx` — font + tick + stroke constants, legend/title block padding
- `src/components/BayDiagram.tsx` — apex geometry rework

### Out of scope
- Re-sizing viewBox padding (current padding should still fit; will adjust only if labels clip after the font bump)
- Changes to RoofPlanDiagram / GableDiagram beyond what the shared constants give them automatically

