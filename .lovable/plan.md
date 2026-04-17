
## Restructure Overview tables: rows = sub-pieces of selected lining

Replace per-lining-comparison tables with per-sub-piece tables for the **currently selected** lining only. Tables update dynamically when the user changes the lining type in the spec.

### New table structure
Same columns as before, minus the "Lining" column (since it's a single lining throughout):
| Component | Panels | Panel size | Per bay | m² | Weight (kg) | Cost | Notes |

### Section row breakdowns (selected lining only)
1. **Roof**
   - Roof panels (full) — `roofPanels`, `panelW × roofPanelHeight`, `roofM2`
   - Apex strips — `apexPieces`, `apexWidth × baySize`, `apexM2` (only if > 0)
   - Custom eave cuts — from `customRoofEave` (only if present)
2. **Walls**
   - Wall panels — `wallsPanels`, `panelW × wallPanelHeight`, `wallsM2`
   - Custom infill — from `customWallInfill` (only if present)
3. **Gables**
   - Rectangular wall fill — `gableWallsPanels`, `gableWallsM2`
   - Triangles (custom) — `gableTriCount`, area = `gableTriM2 - gableInfillM2`
   - Infills (custom) — `gableInfillCount`, `gableInfillM2`
4. **Rafter covers** — single placeholder row "Coming soon"

Each section gets a bold **Totals** footer row (sum of its sub-pieces).

### Files to change
- **`src/components/CalculatorPanel.tsx`**:
  - Remove `allResults` useMemo (no longer needed for tables; selected `result` already exists).
  - Update `SectionRow` type: rename `liningId` → `component` (string label), drop `selectedId` prop, drop selection highlighting.
  - Rebuild the four `SectionTable` calls to emit one row per sub-piece using `result` (selected lining), conditionally including apex/eave/infill rows when their counts > 0.
  - Add a totals footer row to `SectionTable` (computed from rows).
  - "Custom" badge on bespoke piece rows (apex, eave cut, wall infill, gable triangles, gable infills).
- **`src/routes/calculator.tsx`** & **`src/routes/jobs.$jobId.tsx`**: no changes needed (already pass `pricingAll` which is harmless; selected `pricing` drives the now-single result).

### Out of scope
- Cross-lining comparison view (removed by this change; can be re-added later behind a toggle if wanted).
