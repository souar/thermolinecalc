## Plan: Replace `/pricing` with `/products` (variants editor)

### 1. `src/lib/calculator.ts`
Add (no other changes):
```ts
export const SECTION_KEYS = [
  { key: 'roof', label: 'Roof' },
  { key: 'walls', label: 'Walls' },
  { key: 'gable_walls', label: 'Gable walls' },
  { key: 'gable_triangles', label: 'Gable triangles' },
  { key: 'apex', label: 'Apex' },
  { key: 'eave', label: 'Eave' },
  { key: 'wall_infill', label: 'Wall infill' },
  { key: 'roof_rafters', label: 'Roof rafters' },
  { key: 'leg_rafters', label: 'Leg rafters' },
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number]['key'];
```

### 2. Routes
- **Delete** `src/routes/pricing.tsx` and replace with a redirect-only route:
  ```ts
  export const Route = createFileRoute('/pricing')({
    beforeLoad: () => { throw redirect({ to: '/products' }); },
  });
  ```
- **Create** `src/routes/products.tsx` — list page.
- **Create** `src/routes/products.$variantId.tsx` — detail page.

### 3. `/products` list page
- Query `["lining_variants"]`: select variants + nested `lining_variant_components(qty_per_m2, sections, components(cost_per_unit))` to compute base cost/m² and section-specific line counts client-side.
- Columns: Name, Default panel size (`w × h m`), Base cost/m² (Σ qty_per_m2 × cost_per_unit where `sections` null/empty), # section-specific BOM lines, Active Switch (mutates `active`), "View / Edit" button → navigates to `/products/$variantId`.
- "+ New variant" Dialog fields: name, description, default_panel_width, default_panel_height, notes. Insert into `lining_variants` with `created_by = getUsername()`, then navigate to detail page.

### 4. `/products/$variantId` detail page
Layout: 2-col grid (BOM card left, summary card right), header bar above.

**Header**: variant name, `width × height m`, "Edit details" Dialog (name, description, panel w/h, active Switch, notes) → updates `lining_variants` with `updated_by`.

**Bill of materials Card**:
- Query `["lining_variant_components", variantId]`: `select('*, components(*)').eq('variant_id', variantId).order('sort_order')`.
- Query `["components"]` for the picker.
- Table columns: Component name, Kind Badge, Sections (chips per section label, or "All sections" chip if null/empty array), Qty/m², Unit (from component), Cost/unit, Cost/m² (`qty_per_m2 × cost_per_unit`), Stage (`manufacturing_stage`), Edit, Remove.
- "+ Add component" button opens Dialog (also reused for Edit).

**Add/Edit BOM Dialog**:
- Component `Select` grouped by kind (`sleeve` / `material` / `labour`); each item shows `name — £cost/unit`.
- Two linked numeric inputs: `qty_per_panel` and `qty_per_m2`, with editable `panel_m2` denominator (default `variant.default_panel_width * variant.default_panel_height`). Local state holds all three; editing `qty_per_panel` recomputes `qty_per_m2 = qty_per_panel / panel_m2`; editing `qty_per_m2` recomputes `qty_per_panel = qty_per_m2 * panel_m2`; editing `panel_m2` keeps `qty_per_m2` fixed and recomputes `qty_per_panel`. Persist `qty_per_m2` and `panel_m2` to row.
- Sections multi-select: checkbox list of `SECTION_KEYS` plus "All sections" option (mutually exclusive — selecting "All sections" clears array; selecting any specific deselects "All"). Stores `null` (empty) when "All sections".
- `sort_order` numeric input.
- `notes` textarea.
- Live preview: `qty_per_m2 × component.cost_per_unit` £/m².
- Insert/update `lining_variant_components`; invalidate `["lining_variant_components", variantId]` and `["lining_variants"]`.

**Summary Card** (right):
- Base cost/m² = Σ over BOM rows where `sections` is null/empty: `qty_per_m2 × component.cost_per_unit`.
- Section breakdown: group section-specific rows by section key; render small table per section listing component name and £/m² of that section.

### 5. `__root.tsx`
Change the `/pricing` nav link label from "Pricing" to "Products" and update `to="/products"`.

### 6. `src/integrations/supabase/types.ts`
Auto-regenerated; no manual edits needed (tables already exist from prior migration).

### Files
- Edit: `src/lib/calculator.ts`, `src/routes/__root.tsx`, `src/routes/pricing.tsx` (becomes redirect).
- Create: `src/routes/products.tsx`, `src/routes/products.$variantId.tsx`.
