## The problem

Labour components are priced per time unit (e.g. **Material Prep — £25.00/Hour**), but the BOM line only stores `qty_per_m2` — i.e. "fractional hours per m²". To say "9 minutes per panel" on a 15 m² panel you have to mentally compute `9 / 60 / 15 = 0.01` and type that into Qty per m². Easy to get wrong, and the dialog gives no feedback in minutes.

The component itself already carries `unit` ("Hour") and `time_minutes_per_unit` (typically 60 for an hourly rate, or 1 if priced per minute), so we have everything we need to convert — we just don't expose it in the BOM editor.

## The fix: add minutes-based inputs to the BOM dialog (labour only)

No schema change. No calculator change. Pure UX improvement in `BomDialog` (`src/routes/products.$variantId.tsx`).

When the selected component has `kind === "labour"`, show two extra inputs **above** the existing Qty fields:

- **Minutes per panel**
- **Minutes per m²**

These are two-way bound with the existing `qtyPerM2` / `qtyPerPanel` fields via the component's time unit. The existing fields stay visible (collapsed under a small "Advanced (raw qty)" disclosure) so power users can still see/edit the underlying number, and so non-labour components are unaffected.

### Conversion logic

For a labour component, define `minutesPerUnit`:
- If `time_minutes_per_unit` is set on the component, use it (this is the canonical field — already populated for labour rows).
- Otherwise fall back to inferring from `unit`: `hour|hours|hr|h` → 60, `minute|minutes|min` → 1, else treat as 1 with a small inline warning ("Component has no time unit — set it in Components").

Then:
```
qtyPerPanel (units, e.g. hours) = minutesPerPanel / minutesPerUnit
qtyPerM2                        = qtyPerPanel / panelM2
minutesPerM2                    = minutesPerPanel / panelM2
```

Editing any one of {minutes/panel, minutes/m², qty/panel, qty/m², panel m²} updates the others. Same pattern as today's two-way binding, just with two more fields in the chain.

### Live readback

Replace the bottom "Cost contribution: £X/m²" chip with a labour-aware version when kind = labour:

> **9 min/panel** · **0.6 min/m²** · **0.15 h/panel** · **£3.75/panel** · **£0.25/m²**

For sleeve/material the chip stays exactly as it is today.

### Selector hint

In the component `<Select>`, when rendering a labour option, append the time unit so users see what they're picking:

> Material Prep — £25.00/Hour (60 min/unit)

## Small accompanying touches

1. **Components page (`src/routes/components.tsx`)** — labour edit form: relabel "Min/unit" to "Minutes per priced unit" and add a one-line helper: *"For an hourly rate enter 60. For a per-minute rate enter 1."* No data change.

2. **BOM table column** — in the BOM table row on the variant detail page, for labour rows show a small grey suffix under Qty/m² with the minutes equivalent: `0.0100 (0.6 min/m²)`. Read-only, helps sanity-check existing rows.

## Why not change the schema instead?

Three options were considered:

- **(A) Add `minutes_per_panel` column on `lining_variant_components`** — duplicates data, two sources of truth, calculator still needs qty_per_m2. Rejected.
- **(B) Change labour pricing to be per-minute everywhere** — forces editing all existing labour components, breaks the "£/Hour" mental model used in supplier pricing. Rejected.
- **(C) Compute in the dialog only, store qty_per_m2 unchanged** — zero schema risk, calculator unchanged, fixes the actual UX problem. **Chosen.**

## Files touched

- `src/routes/products.$variantId.tsx` — `BomDialog`: minutes inputs, two-way bindings, labour-aware readback chip, richer labour `<SelectItem>` label. Plus the small "(N min/m²)" suffix on the BOM table for labour rows.
- `src/routes/components.tsx` — relabel + helper text for the labour "minutes per priced unit" field. No logic change.

No DB migration. No calculator change. No new queries.
