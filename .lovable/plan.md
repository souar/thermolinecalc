## Catalogue schema migration + /suppliers admin route

### 1. Database migration

Single migration creating the catalogue schema. Existing `lining_pricing`, `marquee_specs`, `lining_results`, `install_time_defaults` tables are left untouched.

- Create enum `component_kind` ('sleeve','material','labour').
- Create `suppliers` (id, name, contact_name, contact_email, contact_phone, address, notes, active default true, created_by, created_at, updated_at). RLS enabled, permissive `public_all_suppliers` policy. BEFORE UPDATE trigger using existing `public.touch_updated_at()`.
- Create `components` (id, kind, name, sku, unit, cost_per_unit default 0, m2_per_unit, weight_per_m2, primary_supplier_id → suppliers(id) ON DELETE SET NULL, panel_width, panel_height, manufacturing_stage, time_minutes_per_unit, active default true, notes, created_by, updated_by, timestamps). Indexes on `kind` and `primary_supplier_id`. RLS permissive. Update trigger.
- Create `component_supplier_prices` (component_id → components ON DELETE CASCADE, supplier_id → suppliers ON DELETE CASCADE, cost_per_unit, is_preferred default false, lead_time_days, notes, timestamps; UNIQUE(component_id, supplier_id)). RLS permissive. Update trigger.
- Create `lining_variants` (name unique, description, default_panel_width, default_panel_height, active default true, notes, created_by, updated_by, timestamps). RLS permissive. Update trigger.
- Create `lining_variant_components` BOM (variant_id → lining_variants ON DELETE CASCADE, component_id → components ON DELETE RESTRICT, qty_per_m2 default 0, panel_m2, sections text[] (no CHECK), notes, sort_order default 0, timestamps). Index on `variant_id`. RLS permissive. Update trigger.
- Seed `lining_variants` from existing `lining_pricing` rows (name = lining_type, default_panel_width/height) ON CONFLICT DO NOTHING.

After the migration is applied, `src/integrations/supabase/types.ts` is regenerated automatically.

### 2. /suppliers route

New file `src/routes/suppliers.tsx` modelled on `/pricing`:

- `createFileRoute("/suppliers")` exporting `Route` with `component: SuppliersPage`.
- Page header: title "Suppliers", an "Archived" toggle (Switch or Button) that flips between active=true / active=false views, and a "+ New supplier" Button opening a create Dialog.
- TanStack Query `useQuery({ queryKey: ["suppliers", { active }] })` selecting from `suppliers` filtered by `active`, ordered by `name`.
- shadcn `Table` with columns: Name, Contact (contact_name), Email, Phone, Notes, Actions (Edit button per row).
- Create Dialog: form fields for name (required), contact_name, contact_email, contact_phone, address, notes. On submit insert with `created_by: getUsername()`. Invalidate `["suppliers"]`. Toast on success/error.
- Edit Dialog: pre-filled fields for all editable columns. Footer has Save plus an Archive (when active) or Restore (when archived) button that toggles `active` and saves. Invalidate `["suppliers"]`.
- Components used: `Dialog`, `Input`, `Textarea`, `Label`, `Button`, `Table`, `Switch` (or toggle Button) — all already in `src/components/ui`.

### 3. Header nav

Add a "Suppliers" `<Link to="/suppliers">` entry in `__root.tsx`'s `Header`, styled identically to existing nav links, placed after "Pricing".

### Files

- New migration (catalogue schema + seed).
- New `src/routes/suppliers.tsx`.
- Edit `src/routes/__root.tsx` (one nav link).
- Auto-regenerated `src/integrations/supabase/types.ts`.

### Out of scope

- Components / variants / BOM admin UIs (separate future routes).
- Wiring catalogue into the calculator.
- Migrating existing `lining_pricing` data into `components` / BOM rows.
