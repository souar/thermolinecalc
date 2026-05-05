## What already exists (and how to use it today)

The data model is: **Suppliers → Components → Variant BOM lines → Calculator/Manufacturing**.

- **Suppliers** are managed at `/suppliers`.
- **Components** (sleeves, materials, labour) are managed at `/components`. Each component picks a primary supplier and (for labour) a manufacturing stage + minutes/unit.
- **Variants** are managed at `/products`. Clicking **View / Edit** opens `/products/:variantId`, which already has a full **Bill of Materials** table with a **+ Add component** button. That dialog lets you pick any sleeve/material/labour component, set qty per panel or qty per m², choose which sections it applies to (roof / walls / gables / apex / all), and set sort order.
- The calculator reads variants via `fetchVariantsWithBom` (`["lining_variants_with_bom"]`), and the Manufacturing tab + reference cost on the variant detail page derive entirely from those BOM rows.

So the missing piece isn't code — it's that none of your three variants (MAL22, MAL30 / ThermoAcoustic, MAL18 / Thermoline) have any BOM lines yet. Until each variant has at least one component attached, the calculator's Cost / Weight / Labour cards and the Manufacturing tab will stay empty.

## Proposed changes (discoverability + small UX fixes)

### 1. Make the BOM editor obvious from the variants list
In `src/routes/products.tsx`:
- Replace the "View / Edit" button label with **"Edit BOM"** when `# section lines == 0` and base £/m² == 0, otherwise keep "View / Edit".
- Add an empty-state badge in the row when a variant has zero BOM lines: a small amber `Badge` reading "No components" so it's visually obvious which variants are unconfigured.
- Add a one-line helper above the table: *"Each variant needs components assigned before it can be used in the calculator. Click a variant to edit its bill of materials."*

### 2. Quick-add affordance on the variant detail page
In `src/routes/products.$variantId.tsx`:
- When the BOM table is empty, replace the "No components yet." row with a friendlier empty state inside the card body: heading "No components attached yet", subtext explaining that the variant won't appear with cost/weight/labour in the calculator until at least one component is added, and a prominent **+ Add your first component** button (same handler as the existing `+ Add component`).
- If `componentsQ.data` is empty, show a secondary note: *"You have no components defined. Create sleeves, materials and labour in the Components page first."* with a `Link` to `/components`.

### 3. Calculator: hint when the selected variant has no BOM
In `src/components/CalculatorPanel.tsx`, where `selectedVariant` is resolved:
- If `selectedVariant && selectedVariant.bom.length === 0`, render a small inline warning under the variant Select: *"This variant has no bill of materials yet. Open it in Products to add components."* with a `Link` to `/products/$variantId`.

### 4. Tiny consistency fix
In the BOM dialog (`BomDialog`), default `allSections` is true for new rows, which is correct. Confirm the empty-state copy on the detail page mentions: "Sleeves typically apply to specific sections (roof, walls, gables); materials and labour can apply to all sections."

## Out of scope (call out, don't build)

- Per-variant supplier overrides (e.g. "use Supplier B's Tecsound just for MAL30") — this is the future "P&L phase" already noted in the Procurement summary. Not in this change.
- Bulk BOM templating (copy BOM from one variant to another). Would be a nice follow-up.

## Files touched

- `src/routes/products.tsx` — list-page empty-state badge, helper text, button label.
- `src/routes/products.$variantId.tsx` — friendlier empty state inside the BOM card.
- `src/components/CalculatorPanel.tsx` — inline "no BOM" warning under the variant selector.

No DB schema changes, no new queries, no migrations.
