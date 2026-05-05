## Manufacturing tab — section-aware breakdown

Replace the `ComingSoon` placeholder in CalculatorPanel.tsx Manufacturing TabsContent with a full breakdown built from the existing `jobCosts.lines` (`ResolvedBomLine[]`) — no new data fetches.

### Sections

1. **Header stat row** (`grid grid-cols-2 sm:grid-cols-6` of the existing `Stat` component):
   - Variant (`selectedVariant?.name ?? "—"`)
   - Total panels (`result.totalPanels`)
   - Total m² (`fmt(result.totalM2)`)
   - Total cost (`fmt(jobCosts.totalCost)`)
   - Materials £ (`fmt(jobCosts.materialsCost)`)
   - Labour £ (`fmt(jobCosts.labourCost)`)

2. **Sleeves and section materials** Card. Filter `jobCosts.lines` to non-labour with non-empty `sections`. Group by section in fixed order: `roof, walls, gable_walls, gable_triangles, apex, eave, wall_infill, roof_rafters, leg_rafters`. Each subheader: `${label} — ${fmt(m2BySections(result, [key]))} m²`. A line that targets multiple sections appears once per section it includes — `qty/cost` displayed for that section is the line's full resolved `qty`/`cost` (since the BOM line's qty is computed from the union of its sections' m², we re-derive the per-section qty as `qtyPerM2 * sectionM2` and `costPerUnit * sectionQty` for legible procurement). Columns: Component, Kind (Badge), Supplier, Qty (`fmt(qty) + " " + unit`), Cost/unit, Total cost.

3. **General materials** Card. Lines where `componentKind !== 'labour'` and `(!sections || sections.length === 0)`. Same columns as above, no grouping. Total row.

4. **Manufacturing labour** Card. Lines where `componentKind === 'labour'`. Group by `manufacturingStage` in order `material_prep, material_application, welding, trimming, bagging`, then null/other. Columns: Component, Stage (Badge), Total minutes (`fmt(line.minutes, 0)` if `timeMinutesPerUnit != null` else `"—"`), Total hours (`fmt(line.minutes / 60, 1)`), Total cost. Footer total row (sum minutes + cost).

5. **Procurement summary** Card. Aggregate non-labour lines by `componentId`: `totalQty = sum of qty across appearances` (use the resolved line — single appearance per BOM row, qty already covers all sections). Sort/group by `primarySupplierName` (nulls last) so each supplier's lines cluster; render a subtle supplier subheader row. Columns: Component, Supplier, Total qty (`fmt(qty) + " " + unit`), Total cost.

6. Grey footer note under procurement summary:
   > Per-line supplier overrides and split sourcing across multiple suppliers will be added in the P&L phase. For now this view uses each component's primary supplier.

### Implementation notes

- Empty state: if `!selectedVariant` or `jobCosts.lines.length === 0`, render a single muted Card "Select a lining variant to see the manufacturing breakdown."
- Section-by-section qty derivation: for a multi-section line, `perSectionQty = line.qtyPerM2 * m2BySections(result, [sectionKey])`, `perSectionCost = perSectionQty * line.costPerUnit`. The procurement summary uses `line.qty` directly to avoid double-counting.
- Use `m2BySections` (already imported via `@/lib/calculator`? — confirm and add to imports if missing) and `SECTION_KEYS` for label lookup.
- Stage label map: `{ material_prep: 'Material prep', material_application: 'Material application', welding: 'Welding', trimming: 'Trimming', bagging: 'Bagging' }`; fall back to raw value or "Other".
- All numeric values via `fmt()`. Tables use the existing `Table*` primitives, badges via `Badge`.
- No DB changes, no new files. Single edit to `src/components/CalculatorPanel.tsx`.
