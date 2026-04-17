
User chose Interpretation B: each slice's triangle hugs the roof beam only (vertical leg = base × slope), and a rectangle below it always fills down to the eave when hOuter > 0. Splits only happen when a piece exceeds weight cap.

## Gable triangles — Interpretation B

### Geometry per bay-slice (eave→apex)
- `base` = baySize (or remainder for the centre slice)
- `hOuter` = xCursor × slope (height at outer edge)
- `hInner` = (xCursor + base) × slope (height at inner edge)
- **Triangle**: right-angle, vertical leg = `hInner − hOuter` (= `base × slope`), horizontal leg = `base`, hypotenuse on the roof beam. Sits at the TOP of the slice, hugging the slope.
- **Infill rectangle (below triangle)**: width `base` × height `hOuter`. Present whenever `hOuter > 0` (every slice except the eave-most one).

The eave-most slice (xCursor=0): hOuter=0, no infill, just the triangle.

### Weight cap (bespoke pieces, not stock-cut)
`maxPieceWeight = panelW × panelH × weightPerM2` (one full standard panel). If `weightPerM2` is null, skip weight check.

- **Triangle**: area = `base × (hInner−hOuter) / 2`. If weight > cap → impossible to split a triangle further while keeping hypotenuse on slope; emit a warning. (In practice triangles are small, this won't trigger for normal pitches.)
- **Infill rectangle**: area = `base × hOuter`. If weight > cap → split horizontally into N stacked rectangles each ≤ cap. Each piece height = `hOuter / N` where `N = ceil(area × wpm2 / maxPieceWeight)`.

### Data model (`gableTriSlices` entries)
```ts
pieces: GablePiece[] // 1 triangle (top) + 0..N infill rectangles (below)
```
Triangle always first; infills stacked top-down below it.

### Files to change
- **`src/lib/calculator.ts`**: rewrite slice loop. Triangle vertical leg = `base × slope` (not `hInner`). Always emit infill when `hOuter > 0`. Remove `panelH` cap on triangle/infill heights — only weight cap applies. Update `gableTriM2` (sum of triangle areas), add `gableInfillM2` (sum of infill rectangle areas). Both ends total = full gable area.
- **`src/components/GableDiagram.tsx`**: triangle polygon now uses vertices `(x1, eaveY−hOuter)`, `(x2, eaveY−hOuter)`, `(x2, eaveY−hInner)` — top of trapezoid only. Infill rectangle: `(x1, eaveY)` to `(x2, eaveY−hOuter)`. Update slice-sizes table to show triangle + infill per slice.
- **`src/components/CalculatorPanel.tsx`**: gable infill card now shows for any non-trivial gable (not just overweight splits). Update sub-text: "rectangle below each triangle, down to eave".

### Expected for 30×? eave 3m, pitch 18°, baySize 5m (halfW=15, slope=ridgeHeight/halfW)
ridgeHeight = 15 × tan(18°) ≈ 4.87m, slope ≈ 0.325.
Per half (3 slices):
| Slice | base | hOuter | hInner | Triangle (b×h) | Infill (w×h) |
|---|---|---|---|---|---|
| 1 (eave) | 5 | 0 | 1.62 | 5×1.62 | — |
| 2 | 5 | 1.62 | 3.25 | 5×1.62 | 5×1.62 |
| 3 (apex) | 5 | 3.25 | 4.87 | 5×1.62 | 5×3.25 |

Per end: 3 triangles + 2 infill rectangles. Both ends: 6 + 4. Triangles all identical (5×1.62 right-angles); infills grow toward apex.
