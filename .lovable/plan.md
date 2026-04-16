
## Diagnosis: panel counts ARE updating — math just produces identical numbers for this config

I traced the calculation and database against your two screenshots (MAL18 vs MAL30, 50×30, eave 5m, pitch 18°). The calculator is wiring panel sizes correctly from `lining_pricing` and recomputing on every lining-type change. The reason it *looks* like nothing updates is that for this specific marquee, several sections coincidentally land on the same panel count.

### Verification against your screenshots

DB panel sizes (confirmed via query):
- MAL18 / Thermoline → 5 × 5 m
- MAL30 / ThermoAcoustic → **5 × 3 m** (wide & short, not 3 × 5)

| Section | MAL18 (5×5) | MAL30 (5×3) | Why |
|---|---|---|---|
| Walls | 20 panels, 500 m² | 20 panels, 300 m² | wallHeight 5.25 ÷ panelH: floor(5.25/5)=1 stack, floor(5.25/3)=1 stack → same count, different area |
| Custom infill | 20 @ 0.25m, 25 m² | 20 @ 2.25m, 225 m² | leftover height differs, count is same (bays×2) |
| Roof | 60, 1,500 m² | 100, 1,500 m² | 60×25 = 100×15 = 1,500 — pure coincidence |
| Apex | 10, 127.19 m² | 10, 127.19 m² | apex width converges to 2.54m for both (geometry-driven, panel-independent) |
| Gable walls | 12, 300 m² | 12, 180 m² | ceil(30/5)=6 cols × 1 row × 2 ends = 12 in both (panelW=5 in both DBs) |
| Gable triangles | 12, 146.21 m² | 12, 146.21 m² | slice count driven by `width / baySize`, area is geometric — neither depends on panel size |

So: **walls, infill, gable walls all DID update m² correctly. Roof m² is identical by arithmetic accident. Apex and gable triangles are intentionally panel-independent (geometry-driven custom cuts).**

### The real "issues" to fix

1. **Apex panel count is hardcoded to `bays` (one strip per bay).** It never reflects how many physical panels the apex strip consumes. If apex width 2.54m comes from a 5m or 3m panel, that's still one panel cut per bay — but if apex exceeded panel width it would need multiple. Current behaviour matches the spec rule "apex ≤ max panel size", so count = bays is correct. No change needed unless you want it shown as "from X panels of stock".

2. **Gable triangles count (12) is independent of lining type by design** (slice count = `ceil(width/baySize)` rounded to even, ×2 ends). This is correct per spec — triangles are custom-cut. No fix.

3. **Roof m² coincidence (1,500 = 1,500) is not a bug** — different panel counts × different areas multiply to the same total. This will diverge for any other marquee size.

### Proposed plan: improve visibility of what's panel-dependent

Since the math is right but the UX is misleading, I propose **two small UX changes** so users immediately see *why* numbers do or don't change between linings:

**A. Show panel size next to each section's panel count.**
In `AreaCard`, when a section uses full panels, append the panel size to the `sub` text:
- Walls sub: `1 stack × 10 bays × 2 sides · 5×3m panels`
- Roof sub: `full panels only · 5×3m panels`
- Gable walls sub: `rectangular fill, both ends · 5×3m panels`

This makes it obvious that swapping linings changed the panel size (and therefore m²) even when count happens to match.

**B. Mark custom-cut sections explicitly.**
Apex and Gable triangles cards already say "custom triangles" / show apex dimensions, but add a small `Custom cut` badge so users understand those counts are geometry-driven, not panel-grid driven.

### Files
- `src/components/CalculatorPanel.tsx` — extend `AreaCard` to accept panel size info; add `Custom cut` badge for apex / gable triangles; pass `panelW`/`panelH` strings into the relevant `sub` lines.

No changes to `calculator.ts` — calculations are correct.
