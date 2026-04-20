

## Fix apex shown as two halves in RoofPlanDiagram

### Problem
In the recent rework I split the apex band into two halves (`apexHalf` × 2) so the band stack would mirror symmetrically around the ridge centreline. Visually this draws a divider line straight down the middle of the pink apex strip, making it look like two separate apex pieces. The apex infill is actually one continuous strip running the full length of the marquee.

### Fix
In `src/components/RoofPlanDiagram.tsx`:
- Replace the two `apexHalf` bands with a single `apex` band of full `apexWidth` (slope-m).
- Band stack becomes: `[eaveCut?, fullPanel × N, apex, fullPanel × N, eaveCut?]`.
- Everything else (projection scaling, dynamic letters A/B/C…, legend, dim lines) keeps working unchanged because it iterates the band array.

### Files to change
- `src/components/RoofPlanDiagram.tsx` — collapse the two apex halves into one band.

### Out of scope
- Any change to calculator output (`apexWidth`, `apexPieces`) — the underlying value is already a single strip.

