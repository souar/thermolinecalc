

## Gable triangle filling logic — right triangles + custom infill, weight-capped

### What the screenshot shows
Half of a gable. Three vertical roof beams divide the half-gable into bay-wide vertical strips. Each strip is filled by a right-angle triangle whose hypotenuse runs along the roof beam (the slope), base sits on top of something, and vertical leg sits on the inner beam. The triangles get progressively taller toward the apex (right side of image). The shaded green areas show the fabric pieces.

### Current code (just shipped)
For each half-gable we generate `slicesPerHalf` right triangles with:
- `base = baySize` (horizontal leg along the eave line)
- `height = (xCursor + base) × slope` (vertical leg on the inner edge, meeting the roof slope)
- hypotenuse along the roof slope

Total area per end = full gable triangle area. No weight check. No splitting. The whole triangle is assumed to be a single fabric piece sitting from eave up to the slope.

### What's missing vs. your spec

**1. The triangle alone may not fit a standard panel.**
A right triangle with `base × height` is cut from a rectangle of `base × height`. If both `base ≤ panelW` AND `height ≤ panelH` it cuts from a single stock panel — fine. If not, it can't be made from one panel and we currently ignore that.

**2. Weight cap rule.**
A modified/custom piece is allowed *as long as its weight ≤ max weight of a standard wall or roof panel*. Standard max weight = `panelW × panelH × weight_per_m2` (from `lining_pricing.weight_per_m2`). If a triangle's bounding rectangle weight ≤ that cap, it can be one custom-shaped piece. If it exceeds, we must split.

**3. Split rule (when too heavy).**
- **Piece 1 (top):** a right-angle triangle that respects the slope geometry but is sized to fit within the weight/panel limits. Its hypotenuse still runs along the roof beam.
- **Piece 2 (bottom):** a custom rectangle/trapezoid sitting *under* piece 1, filling down to the eave line. It's the leftover area that piece 1 didn't cover within that bay strip.

### Proposed algorithm (per half-gable, per bay-slice)

For each slice `i` in `[0, slicesPerHalf)`:
```
base   = min(baySize, halfW - xCursor)         // horizontal span on eave
hInner = (xCursor + base) × slope              // tall edge (toward apex)
hOuter = xCursor × slope                       // short edge (toward eave corner)
```

The slice area above the eave is a **right trapezoid** (or a triangle when `xCursor = 0`):
- vertices: `(xCursor, 0)`, `(xCursor+base, 0)`, `(xCursor+base, hInner)`, `(xCursor, hOuter)`
- The hypotenuse `(xCursor, hOuter) → (xCursor+base, hInner)` lies on the roof slope.

**Step A — try a single right triangle that covers the whole trapezoid.**
The smallest right triangle that contains the trapezoid has base `base` and height `hInner` (cut from a `base × hInner` rectangle). Weight = `base × hInner × weight_per_m2`.

- If `base ≤ panelW` AND `hInner ≤ panelH` AND weight ≤ panel-weight cap → **one piece**, area billed = trapezoid area = `base × (hInner + hOuter) / 2`. Stock used = `base × hInner` (offcut = the small lower-outer triangle).

**Step B — if weight cap exceeded, split into two pieces.**
- **Piece 1 (top right triangle):** keep the slope. Reduce its height to `h1 ≤ panelH` such that `base × h1 × weight_per_m2 ≤ maxPanelWeight`. The triangle's top vertex is still at `(xCursor+base, hInner)` and it follows the slope down to where it meets a horizontal cut line at height `hInner − h1` from the trapezoid base. This horizontal line is the bottom of piece 1 / top of piece 2.
- **Piece 2 (custom infill):** a rectangle (or right trapezoid if the slope exits piece 1 inside the bay) of width `base` and height `hInner − h1` on the inner edge. This sits below piece 1, down to the eave line. Weight check: must also be ≤ cap.
- If piece 2 still exceeds cap → recurse: split piece 2 horizontally again.

**Step C — special case for the centre slice when `width / (2·baySize)` isn't whole.**
The innermost slice has `base < baySize` and `hInner = ridgeHeight` (apex). Same algorithm applies — outer height is `(halfW − base) × slope`, inner height is `ridgeHeight`.

### Data model changes

Extend each entry in `gableTriSlices` to describe the actual cut pieces:
```ts
type GablePiece =
  | { kind: "triangle"; base: number; height: number; m2: number; weight: number }
  | { kind: "infill";   base: number; height: number; m2: number; weight: number };

gableTriSlices: Array<{
  base: number;          // bay-slice horizontal span
  hInner: number;        // tall edge (slope at inner side)
  hOuter: number;        // short edge (slope at outer side)
  pieces: GablePiece[];  // 1 or more pieces filling this slice
}>;
```

Aggregate counts for the summary card:
- `gableTriCount` = total triangle pieces across both ends
- `gableInfillCount` = total custom-infill pieces across both ends
- `gableTriM2` = sum of all piece areas (still equals `width × ridgeHeight` total — geometry is conserved)

### Calculator changes (`src/lib/calculator.ts`)
- Read `weight_per_m2` from pricing (already on `LiningPricing`). If null → skip weight cap and only enforce panel-size cap.
- Compute `maxPieceWeight = panelW × panelH × weight_per_m2` (or `Infinity` if no weight).
- Replace the slice-building loop with the algorithm above (Step A → Step B recursion).
- Return the richer `gableTriSlices` shape plus piece counts.

### Diagram changes (`src/components/GableDiagram.tsx`)
- Render each slice's pieces as separate polygons:
  - Triangle pieces: same right-triangle shape as today, but possibly shorter (top-anchored on the slope).
  - Infill pieces: rectangles below the triangle, in a different shade (e.g. `fill-secondary/30`) so users can see split slices.
- Update the legend / label to show `X triangles + Y infill pieces per end`.

### Table changes (`src/components/GableDiagram.tsx`)
- "Triangles" row: count of triangle pieces only.
- New "Gable infill" row: count + m² of custom infill pieces below split triangles.
- "Slice sizes" row: per slice, list each piece (e.g. `5×3.25 tri + 5×1.62 infill`).

### CalculatorPanel (`src/components/CalculatorPanel.tsx`)
- Update Gable Triangles card sub-text to: `right-angle, base = {baySize}m bay; splits into infill if over panel weight`.
- Optionally add a separate "Gable infill" `AreaCard` (custom-cut badge) when `gableInfillCount > 0`.

### Files
- `src/lib/calculator.ts` — algorithm, types, weight cap.
- `src/components/GableDiagram.tsx` — render pieces, table rows.
- `src/components/CalculatorPanel.tsx` — sub-text, optional infill card.

### Worked example: 30m wide × 18° pitch, baySize 5m, MAL30 (5×3 panel, ~0.6 kg/m² placeholder)
- `halfW=15`, `slicesPerHalf=3`, slope = `4.87/15 = 0.325`.
- Slice 1 (eave→bay1): base 5, hOuter 0, hInner 1.62. Bounding rect 5×1.62 = 8.1 m². Fits in 5×3 panel ✓. **1 triangle piece.**
- Slice 2: base 5, hOuter 1.62, hInner 3.25. Bounding rect 5×3.25 = 16.25 m². Height 3.25 > panelH 3 ✗. **Split:** piece 1 = right triangle base 5, height 3.0 (top of slice, hugging slope); piece 2 = infill 5 wide × 0.25 tall along the bottom. Both fit weight & panel cap.
- Slice 3: base 5, hOuter 3.25, hInner 4.87. Height 4.87 > 3 ✗. **Split:** triangle 5×3.0 on top + infill 5×1.87 below.
- Per end: 3 triangles + 2 infill pieces. Both ends: 6 triangles + 4 infill.

