
## Calculator maths rewrite (final)

### Accounting rules
1. **m² = panels × actual panel size** (5×5 = 25 m², 3×5 = 15 m²)
2. **Apex absorbs roof-to-wall overlap**: if `eaveHeight + roof_overlap > panelH`, grow apex width by the excess (×2 sides) so wall + roof panels stay full-size
3. **Wall height handling** (after apex absorption):
   - Fits in N full panels → stack N full panels per bay per side
   - Leftover height < panelH → add **one custom-height wall panel** per bay per side (reported as a separate "Custom wall infill" sub-section under Walls)
4. **Sections** (5 separate categories):
   - **Walls** (full panels) — long sides, bay × 2 × stacks
   - **Custom wall infill** (only if leftover) — short panels at bay width, leftover height
   - **Gable walls** — rectangular fill below eave, both ends
   - **Gable triangles** — custom triangles, max width = baySize, count forced **even** (split centre triangle if odd)
   - **Apex** — custom strip, width × bay × bays
5. **Roof** — full panels only (overlap pushed into apex)

### `src/lib/calculator.ts` changes
- Replace `gablesM2` / `gablePanels` with split fields: `gableWallsM2`, `gableWallsPanels`, `gableTriM2`, `gableTriCount`
- Add `apexM2` as own field (remove apex-in-roof bundling)
- Add `customWallInfill: { height, panelsCount, m2 } | null`
- Add `warnings: string[]` (e.g. "Floor seal exceeds panel size — custom infill added")
- New apex formula:
  ```
  excess = max(0, (eaveHeight + roofOverlap) - panelH)
  apexWidth = geometricApex + 2 × excess
  ```
- Wall stacking:
  ```
  remainingWallH = eaveHeight + floorSeal - (apex absorbed amount)
  fullStacks = floor(remainingWallH / panelH)
  leftover = remainingWallH - fullStacks × panelH
  wallPanels = bays × 2 × fullStacks
  if leftover > 0: customInfill = { height: leftover, count: bays × 2 }
  ```
- Gable triangle count: `slices = ceil(width / baySize)`; if odd → `slices + 1` (centre split)

### `src/components/CalculatorPanel.tsx` changes
- Replace 3 area cards with **5 cards**: Walls · Custom infill (conditional) · Gable walls · Gable triangles · Apex
- Add Alert banner above results when `warnings.length > 0`
- Update top stats: total panels = sum of all sections + roof
- Update per-bay table to reflect new section split

### Verification target
Re-running your spreadsheet specs (30×50m, 5.4m eave, ~18° pitch) should yield wall/roof/apex/gable counts matching the spreadsheet, with apex auto-growing past geometric leftover when wall height pushes it.
