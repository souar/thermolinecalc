

## Overview tab → comparison table view

Replace the AreaCard grid with a single sectioned table comparing **all lining types** side-by-side, broken into 4 sections: Roof, Walls, Gables, Rafter covers (placeholder).

### Data model
For each lining type (loop over `LINING_TYPES` + override panel sizes from `lining_pricing` rows), run `calculate()` with the user's current geometry inputs. This gives us 3 result sets in parallel. Build derived rows per section from each result.

### Table layout

One `Card` per section, each containing a `Table`. Columns:

| Lining | Panel count (total) | Panel size | Panels per bay | Total m² | Weight (kg) | Cost | Notes |
|---|---|---|---|---|---|---|---|
| MAL18 / Thermoline | … | 5.00×5.00 m | … | … | … | … | e.g. "Custom cut" / "Includes infill" |

- **Lining**: name + small badge if it's the currently-selected one (so the user keeps context).
- **Panel count**: sum of all panel pieces in that section across the whole marquee.
- **Panel size**: nominal stock panel size from pricing (or actual cut height for sections like roof when slope < panelH — show as "5.00×3.39 m (cut)").
- **Panels per bay**: section panels ÷ bays (rounded sensibly; for gables show "n/a" since not bay-based, or pieces per gable end).
- **Total m²**: section m² across whole marquee.
- **Weight**: section m² × weight_per_m2 of that lining.
- **Cost**: section m² × cost_per_m2.
- **Notes**: free text — "Custom cut" badge, "Apex included", "Infill needed", etc.

### Section breakdowns

1. **Roof** — sums: `roofPanels + apexPieces + customRoofEave?.panelsCount` and `roofM2 + apexM2 + customRoofEave?.m2`. Sub-rows? No — one row per lining for clarity. Notes column lists which sub-pieces are present (e.g. "40 full + 10 apex + 20 eave cut").
2. **Walls** — `wallsPanels + customWallInfill?.panelsCount`, `wallsM2 + customWallInfill?.m2`. Notes if custom infill present.
3. **Gables** — `gableWallsPanels + gableTriCount + gableInfillCount`, `gableWallsM2 + gableTriM2`. Per-end count shown in notes.
4. **Rafter covers** — placeholder row per lining showing "—" with a muted "Coming soon" note. No calculation yet.

### Totals
Footer row in each section table: bold "Totals" — but since each row is a different lining (not additive), the footer instead highlights the **currently-selected lining's totals** for quick reference. Skip footer if it adds noise; let user compare row-to-row.

A separate top-of-tab summary strip keeps the existing 4 `Stat` tiles (Total panels / Total area / Weight / Cost) — but only for the **selected** lining. Inputs card stays on the left as it is.

### Files to change
- **`src/components/CalculatorPanel.tsx`**:
  - In Overview tab, keep left inputs Card unchanged.
  - Replace the right-hand AreaCard grid (lines 152–223) with: warning Alert (kept) + 4-Stat summary strip (kept, selected lining only) + 4 section tables + Geometry card (kept).
  - Compute `allResults = LINING_TYPES.map(l => ({ lining: l, result: calculate({...calcInput, liningType: l.id, panelW: pricingFor(l).panelW, panelH: pricingFor(l).panelH, weightPerM2: pricingFor(l).weight, costPerM2: pricingFor(l).cost})}))`.
  - New helper `SectionTable({ title, rows })` using shadcn `Table` primitives with `tabular-nums`, right-aligned numerics, currently-selected row highlighted (`bg-primary/5`).
- **`src/routes/calculator.tsx`** & **`src/routes/jobs.$jobId.tsx`**: pass full pricing list (not just selected) into `CalculatorPanel` so it can compute per-lining. Add new optional prop `pricingAll?: Array<{lining_type, cost_per_m2, weight_per_m2, panel_width, panel_height}>`. Falls back to `LINING_TYPES` defaults when missing.

### Out of scope
- Rafter covers calculation logic (placeholder rows only — will be added when the lining type is created later).
- Editing pricing inline from the table.
- CSV export of the comparison.
