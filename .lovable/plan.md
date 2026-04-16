
## Stack diagrams side-by-side, full width below sidebar

### Changes in `src/components/CalculatorPanel.tsx`

**1. Restructure root layout**
Current: `grid lg:grid-cols-[420px_1fr]` wraps the inputs sidebar AND the entire results column (including diagrams). This forces diagrams into the narrow right column.

New: split into two stacked sections:
- **Top row**: `grid lg:grid-cols-[420px_1fr]` containing the inputs Card (left) and the results stack — warnings, top stats, section cards grid, geometry card (right).
- **Bottom row**: full-width container holding both diagrams in `grid lg:grid-cols-2 gap-4` so `BayDiagram` and `GableDiagram` sit side-by-side and span the full panel width below the sidebar.

The inputs Card naturally shrinks to its content height; the results column ends at the geometry card; diagrams flow underneath both, full width.

**2. No changes to** `BayDiagram.tsx` or `GableDiagram.tsx` — they already use responsive SVG and internal grid layouts that will adapt to the wider/narrower container.

### Result
```text
┌──────────────┬──────────────────────┐
│ Inputs       │ Warnings             │
│ (sidebar,    │ Stats                │
│ auto-height) │ Section cards        │
│              │ Geometry             │
└──────────────┴──────────────────────┘
┌─────────────────┬───────────────────┐
│ Bay diagram     │ Gable diagram     │  ← full width
└─────────────────┴───────────────────┘
```

### Files
- `src/components/CalculatorPanel.tsx`
