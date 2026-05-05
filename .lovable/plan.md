## /components admin route

### New file: `src/routes/components.tsx`

Route at `/components` with three Tabs (Sleeves / Materials / Labour) over a shared component list filtered by `kind`.

**Queries**
- `useQuery(["components"])` → all rows from `components` ordered by name; filtered client-side by active tab.
- `useQuery(["suppliers", { active: true }])` → id+name list for joining and Select dropdowns.
- `useQuery(["component_supplier_prices", componentId])` → loaded only when a row is expanded.

**Per-tab table columns**
- Common: expand toggle, Name, SKU, Unit, Cost/unit (£), Cost/m² (cost_per_unit / m2_per_unit, "—" if no m2_per_unit), Supplier (looked up from suppliers query), Active (Switch toggles via mutation), Edit.
- Sleeves: + Panel W, Panel H, Weight kg/m².
- Materials: + m²/unit, Weight kg/m².
- Labour: + Manufacturing stage, Minutes/unit.

**New / Edit Dialog**
- Fields rendered conditionally by kind:
  - All: Name, SKU, Unit (Input with `<datalist>` of piece/m2/m/roll/hour/panel), Cost/unit, Notes, Active Switch.
  - Sleeves & Materials: m²/unit, Weight per m², Primary supplier (Select sourced from suppliers query, with "—" option), Manufacturing stage (Select with the 6 conventional stage values plus "—").
  - Sleeves only: Panel width, Panel height.
  - Labour: Minutes/unit, Manufacturing stage (Select; required at submit time).
- Below the Cost/unit input, a live helper line: "Cost per m²: £X.XX" computed from form values (or "—" when m2_per_unit is empty/zero).
- Submit upserts via `supabase.from("components").insert/update`, sets `created_by`/`updated_by` to `getUsername()`, kind-irrelevant fields are nulled out (e.g. labour rows don't carry m2_per_unit).
- On success: toast + `qc.invalidateQueries(["components"])` + close.

**Row expansion → Alternative supplier quotes**
- A small inline `<Table>` rendered under the row when expanded.
- Columns: Supplier, Cost/unit, Lead time (days), Preferred, Notes, Edit/✕.
- Add/edit happens in an inline editable row (Select + Inputs + Switch + Save/Cancel) — no Dialog.
- Mutations on `component_supplier_prices` (insert/update/delete) invalidate `["component_supplier_prices", componentId]`.

**UI deps** (all already present): `tabs`, `table`, `dialog`, `select`, `switch`, `input`, `textarea`, `label`, `button`, `sonner`.

### Edit `src/routes/__root.tsx`

Add a `<Link to="/components">Components</Link>` nav item in `Header`, placed after the Suppliers link, with the same className/activeProps styling.

### Types

`src/integrations/supabase/types.ts` is auto-regenerated and already contains `components`, `component_supplier_prices`, and the `component_kind` enum from the previous migration — no extra migration needed. The route imports the generated `Database` type for `ComponentRow` / `Quote` / `Kind`.

### Out of scope

- Manufacturing stage grouping view.
- Wiring components into the calculator / BOM.
- Migrating sleeve data from `lining_pricing` into `components`.
