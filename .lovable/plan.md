
## Make panel dimensions editable in Pricing

### Current state
- `lining_pricing` table already has `panel_width` and `panel_height` columns (numeric, not null)
- `src/routes/pricing.tsx` displays them as read-only text: `{Number(p.panel_width)}×{Number(p.panel_height)}`
- `src/lib/calculator.ts` has hard-coded `LINING_TYPES` array with `panelW`/`panelH` — this is used as the source of truth in the calculator
- `jobs.$jobId.tsx` matches pricing rows by looking up `LINING_TYPES` panel dims — creates a coupling that breaks if pricing dims diverge

### Changes

**1. `src/routes/pricing.tsx`** — make width/height editable
- Replace the static `Panel (m)` cell with two `Input type="number"` fields (width, height)
- Extend `edits` state to include `width` and `height`
- Update the save mutation to write `panel_width` and `panel_height` alongside cost/weight

**2. `src/lib/calculator.ts`** — accept panel dims via input
- Add optional `panelW?: number` and `panelH?: number` to `CalcInput`
- When provided, override the values from `LINING_TYPES` (which becomes a fallback / default seed only)
- Keep `LINING_TYPES` as the list of available lining type IDs + default dims/weight

**3. `src/components/CalculatorPanel.tsx`** — pass through dims from pricing
- Already receives `pricing` prop; extend it to include `panel_width` / `panel_height`
- Pass these into the `calculate()` call

**4. `src/routes/jobs.$jobId.tsx` & `src/routes/calculator.tsx`** — use pricing dims
- When looking up `linePrice`, match by `lining_type` only (not by hard-coded panel dims), OR use the dims from the pricing row
- Pass `panel_width` / `panel_height` through to `CalculatorPanel` / `calculate()`

### Notes
- No DB migration needed — columns already exist
- Validation: width and height must be > 0; show inline error if not
- Saving new dims will change calc results immediately (live re-render via query invalidation)

### Files touched
- `src/routes/pricing.tsx`
- `src/lib/calculator.ts`
- `src/components/CalculatorPanel.tsx`
- `src/routes/jobs.$jobId.tsx`
- `src/routes/calculator.tsx` (if it also passes pricing — verify during implementation)
