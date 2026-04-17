
## Tabbed layout for the calculator

Restructure `/calculator` (and the same panel used in jobs) into a 4-tab interface using existing `Tabs` UI primitive.

### Tabs
1. **Overview** — current spec inputs (left card) + results cards/stats/geometry (right). Diagrams REMOVED from this tab.
2. **Diagrams** — `BayDiagram` and `GableDiagram` rendered larger (full width each, stacked), plus a redesigned breakdown table.
3. **Install & Labour** — placeholder "Coming soon" card describing future scope (install time per team size, equipment list).
4. **Manufacturing** — placeholder "Coming soon" card describing future scope (material costs, production time). Note in plan only: will need new backend tables later (`manufacturing_materials`, `manufacturing_rates`) — not built now.

### Files to change
- **`src/components/CalculatorPanel.tsx`**: wrap return in `<Tabs defaultValue="overview">`. Move existing inputs+results grid into `TabsContent value="overview"`. Move the two diagrams into `TabsContent value="diagrams"` with `lg:grid-cols-1` (full width) and larger min-heights. Add two `TabsContent` placeholder tabs.
- **`src/components/BayDiagram.tsx` & `src/components/GableDiagram.tsx`**: 
  - Remove the fixed/small SVG container constraints; let them fill the tab width with a larger aspect ratio.
  - Redesign the piece-breakdown table: cleaner header styling, zebra rows, right-aligned numerics with `tabular-nums`, grouped sections (Triangles / Infills / Eave cuts), bold totals row, badge chips for "Custom cut" pieces, better spacing.

### Placeholder tab content
Each "coming soon" tab: dashed-border `Card` with icon (lucide `HardHat` for labour, `Factory` for manufacturing), title, short description of what it will do, and a muted "Coming soon" badge. No inputs.

### Persistence
Active tab stored in component state only (no need to persist to localStorage — current behaviour).

### Out of scope this round
- Backend tables for Manufacturing (will be a later request).
- Actual labour/manufacturing calculations.
