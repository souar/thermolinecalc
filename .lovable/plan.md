

## Fix gable triangle geometry: right-angle slices aligned to bay widths

### Current behavior (wrong)
Triangles are sliced from the apex down to the eave like pizza slices — all meeting at the ridge point. Count = `ceil(width/baySize)` rounded to even, ×2 ends. This produces isoceles-ish slices that don't align to bay widths.

### Required behavior
Each gable triangle is a **right-angle triangle**:
- The horizontal leg (90° base) aligns with one bay width along the eave
- The vertical leg rises to meet the roof slope at that bay's edge
- Triangles get progressively **taller** moving from the eave corners toward the apex (because the roof slope rises toward the centre)

For a gable with `n = ceil((width/2) / baySize)` bay-slices per half:
- Half the gable has `n` right triangles, mirrored on the other half → `2n` per end → `4n` both ends
- Each triangle's base = `baySize` (or remainder for the slice nearest the apex if width/2 isn't a clean multiple)
- Each triangle's height = roof slope rise across that bay's horizontal span
- For the slice straddling the centre line (when `width/(2·baySize)` isn't whole), it becomes a single triangle peaked at the apex

### Calculator changes (`src/lib/calculator.ts`)

**Replace gable triangle block:**
```ts
// Right-angle triangles, base = baySize, aligned to eave
const halfW = width / 2;
const slope = ridgeHeight / halfW; // rise per metre of horizontal run
const slicesPerHalf = Math.ceil(halfW / baySize);
const gableTriCount = slicesPerHalf * 2 * 2; // both halves, both ends
// Total triangle area is still the full gable triangle area: width × ridgeHeight
// (sum of right triangles equals the whole gable on each end)
const gableTriM2 = width * ridgeHeight;
```

This preserves the correct **total area** (sum of right triangles = full gable triangle area on each end × 2 ends = `width × ridgeHeight`) while changing the **count** to reflect the new slicing scheme.

**Add per-triangle dimension data** so the diagram can render them. Extend `CalcResult`:
```ts
gableTriSlices: Array<{ base: number; height: number }>; // per half-gable, eave→apex
```

Build the slices array:
```ts
const gableTriSlices: Array<{ base: number; height: number }> = [];
let xCursor = 0;
for (let i = 0; i < slicesPerHalf; i++) {
  const base = Math.min(baySize, halfW - xCursor);
  // Triangle's tall edge is at the inner side (toward apex)
  const heightAtInner = (xCursor + base) * slope;
  gableTriSlices.push({ base, height: heightAtInner });
  xCursor += base;
}
```

### Diagram changes (`src/components/GableDiagram.tsx`)

Replace pizza-slice rendering with right-triangle rendering:
- For left half: draw `slicesPerHalf` right triangles. Triangle `i` occupies horizontal `[i·baySize, (i+1)·baySize]` along the eave, rising to the roof slope on the **inner** edge (toward the centre). Hypotenuse runs along the roof slope.
- Mirror for right half.
- Update label to show `slicesPerHalf × 2 = N triangles per end`.

### Table updates (`src/components/GableDiagram.tsx` and `CalculatorPanel.tsx`)
- "Triangles" row: per-end count = `slicesPerHalf × 2`, both ends = `× 2`
- Note text: change "max {baySize}m wide" to "right-angle, base = bay width"

### Files
- `src/lib/calculator.ts` — replace gable triangle slicing logic, add `gableTriSlices` to result
- `src/components/GableDiagram.tsx` — render right triangles, update label
- `src/components/CalculatorPanel.tsx` — update gable triangle card sub-text if it references the old slicing

### Expected for 30m wide × 18° pitch (ridgeHeight ≈ 4.87m, baySize 5m):
- `halfW = 15`, `slicesPerHalf = 3`
- Per half (eave→apex): bases [5, 5, 5], heights at inner edge [1.62, 3.25, 4.87]
- Per end: 6 right triangles. Both ends: **12** (same total count as before by coincidence at this size, but geometry is now correct and will differ for non-multiples of baySize)

