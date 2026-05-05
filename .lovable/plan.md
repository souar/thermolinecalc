
## Goal

Replace the hardcoded `LINING_TYPES` pricing model with database-driven lining variants whose Bills of Materials (BOMs) drive cost, weight, and labour. Costs become section-aware: each BOM line targets specific sections (or all) and is charged against that section's m².

## 1. `src/lib/calculator.ts` changes

- **Remove** the `LINING_TYPES` constant export and `LiningTypeId` type.
- **Change** `CalcInput.liningType` from `LiningTypeId` to `string` (variant id).
- Keep `costPerM2`, `weightPerM2`, `panelW`, `panelH` on `CalcInput` for back-compat, but `costPerM2`/`weightPerM2` are no longer used by `calculate()` for cost/weight. `panelW`/`panelH` continue to drive geometry — populated from variant defaults by the caller.
- Default `DEFAULT_INPUT.liningType` to `""`.
- In `calculate()`:
  - Stop reading `costPerM2`/`weightPerM2`. Set `totalCost = 0` and `totalWeightKg = 0` in the returned `CalcResult`.
  - For gable-piece weight splitting (currently uses `weightPerM2`), fall back to `input.weightPerM2 ?? 0`. If 0 (no weight known yet), skip the per-piece weight cap (treat `maxPieceWeight = Infinity`) so geometry stays sensible without pricing data.
  - Drop the `LINING_TYPES` lookup — `panelW`/`panelH` come purely from `input.panelW`/`input.panelH` with sensible fallbacks (e.g., 5×5 if both missing) to keep the function safe when called without a variant.
- **Add** `m2BySections(result, sections)` helper exactly as specified.
- **Add** `BomLine`, `ResolvedBomLine`, and `calculateJobCosts(result, bom)`:
  - `materialsCost` = sum of cost across non-labour lines.
  - `labourCost` = sum of cost across labour lines.
  - `totalCost` = materials + labour.
  - `totalWeightKg` = Σ over non-labour lines with `weightPerM2` set: `m2 × qtyPerM2 × weightPerM2`.
  - `totalLabourMinutes` = Σ over labour lines: `qty × (timeMinutesPerUnit ?? 0)`.

## 2. `src/components/CalculatorPanel.tsx` changes

- Remove imports of `LINING_TYPES`, the `LT` alias, the `pricing`/`pricingAll` props and `PricingRow` interface.
- Add a TanStack Query:
  - `queryKey: ["lining_variants_with_bom"]`
  - Fetches `lining_variants` where `active = true`, joining `lining_variant_components` and nested `components` and `components.suppliers` (primary supplier name).
- Build a `Map<string, VariantWithBom>` from the query for O(1) lookup.
- For the selected variant id (`value.liningType`):
  - Derive `panelW`/`panelH` from `default_panel_width`/`default_panel_height`.
  - Build `BomLine[]` from joined rows.
  - Run `calculate({ ...value, panelW, panelH, weightPerM2: <approx blended weightPerM2 from BOM materials, used only for gable splitting> })`.
  - Run `calculateJobCosts(result, bom)`.
- Replace all `costPerM2 * m2` and `weightPerM2 * m2` math in `mkRow` with per-line resolved values from `calculateJobCosts`. Section tables show row m² and a per-section cost contribution sourced from BOM lines targeting that section (plus their share of "all sections" lines, scaled by `sectionM2 / totalM2`).
- Stat cards read from `calculateJobCosts` (`totalCost`, `totalWeightKg`) and surface `totalLabourMinutes` (replace cost stat caption "(set price)" with "(no variant)" when none selected).
- The **Lining type** Select renders from the variants query. Each option label: `{name} (£{baseCostPerM2}/m² base + N section costs)` where `baseCostPerM2 = sum(costPerUnit * qtyPerM2)` over BOM lines whose `sections` is null/empty, and N = count of distinct section keys mentioned across the variant's other BOM lines.

## 3. `src/routes/calculator.tsx`

- Remove `pricingQ` (the `lining_pricing` query) and the `pricing`/`pricingAll` props passed to `CalculatorPanel`.
- Pass `value`/`onChange`/`install`/`onInstallChange` only. The panel handles variant fetching itself.

## 4. `src/routes/jobs.$jobId.tsx`

- Remove `pricingQ` and the `pricing`/`pricingAll` props.
- The save mutation must:
  - Look up the selected variant (by id from `input.liningType`) via a fresh query against `lining_variants_with_bom` (use `queryClient.getQueryData(["lining_variants_with_bom"])` cache, fallback to refetch).
  - Build the BOM, run `calculate(input)` then `calculateJobCosts(result, bom)`.
  - Save `total_cost`, `total_weight_kg`, and `breakdown_json: { ...result, jobCosts }` to `lining_results`.
  - Save `lining_type` in `marquee_specs` as the **variant name** (string) — not the id — for compatibility with old saved rows.
- On hydrate from the latest spec, look up the variant by `name` from the cache and set `input.liningType = variant.id`. If none found, leave `liningType = ""`.
- Disable the **Save revision** button while `input.liningType === ""` or while the variants query is loading.

## 5. `/products/$variantId` reference cost card

In `src/routes/products.$variantId.tsx`, add a **"Reference total cost"** Card next to the existing per-m² breakdown panel:

- Build a `BomLine[]` from the current variant's BOM rows.
- Call `calculate(DEFAULT_INPUT)` then `calculateJobCosts(result, bom)`.
- Display:
  - Total cost
  - Total m²
  - Blended cost / m² (`totalCost / totalM2`)
  - Materials breakdown (per line: name, m², qty, cost)
  - Labour breakdown (per line: name, m², qty, minutes, cost)
- Caption: *"Reference: 50×30m at 18° pitch with all sections lined"*.

## 6. Follow-up migration (created, not run)

Create `supabase/migrations/<timestamp>_drop_lining_pricing.sql` containing:

```sql
-- Drops the legacy lining_pricing table.
-- SAFE TO APPLY ONLY ONCE:
--   1. All in-use lining_variants have BOM rows populated, AND
--   2. The calculator + jobs save flow has been verified end-to-end against
--      the new BOM-driven pricing in production.
-- Until then, keep this file unapplied; lining_pricing is no longer read by
-- the app but remains for rollback safety.
DROP TABLE IF EXISTS public.lining_pricing;
```

Do NOT run this migration in this iteration.

## Files touched

- `src/lib/calculator.ts` (modify)
- `src/components/CalculatorPanel.tsx` (modify)
- `src/routes/calculator.tsx` (modify)
- `src/routes/jobs.$jobId.tsx` (modify)
- `src/routes/products.$variantId.tsx` (add reference cost card)
- `supabase/migrations/<ts>_drop_lining_pricing.sql` (new, unapplied)

## Notes

- `src/integrations/supabase/types.ts` is up to date — no schema change in this prompt.
- `lining_pricing` is left in place; only the app stops reading from it.
- `weightPerM2` on `CalcInput` is repurposed as an optional hint to keep gable-piece weight splitting working; the canonical weight comes from `calculateJobCosts`.
