

## Fix RoofPlanDiagram to show actual number of roof linings per side

### Problem
Current diagram hardcodes 5 horizontal bands (lower-roof, upper-roof, apex, upper-roof, lower-roof) regardless of how many panels actually run from eave to ridge. The blue/green colours imply panel-types but were really just alternating fills from the reference image. For larger marquees the slope can need 3, 4, 5+ panels per side.

### Fix

**1. Derive `panelsPerSide` from `result`:**
- `panelsPerSide = roofPanels / (2 * bays)` (count of full panels along one slope)
- Plus the `customRoofEave` cut panel at the eave when present
- Plus apex strip at the ridge when `apexWidth > 0`

**2. Compute band heights in plan-projection (m):**
- Each full panel band's plan height = `panelHeight × (width / slopeLength)` where `panelHeight = result.roofPanelHeight` (already accounts for single-panel slopes vs full panels)
- For multi-panel slopes use `input.panelH` for full panels and `customRoofEave.height` for the eave cut
- Apex band plan height = `apexWidth × (width / slopeLength)` (split equally either side of centreline)
- Mirror the same band stack on the opposite side of the apex

**3. Render N bands per side + apex strip:**
- Build a `bands[]` array: `[eaveCut?, fullPanel × N, apexHalf, apexHalf, fullPanel × N, eaveCut?]`
- Draw a horizontal divider at every band boundary
- Apex band stays pink (`fillApex`); all other panel bands use a single neutral fill (e.g. `fillLowerRoof` light green) so colour no longer implies a "type"
- Keep keder track strips at top/bottom eaves
- Keep X-bracing per cell (per band × per bay)

**4. Left-side dimension labels:**
- Replace the fixed A/B/C/D/E letters with one letter per band, generated dynamically (`A, B, C, …`)
- Each `DimLine` shows the actual band height in mm

**5. Legend simplification:**
- Drop "Upper Roof" / "Lower Roof" entries (no longer meaningful)
- Keep: "Roof Panel", "Apex Ridge", "Eave Cut" (only when present), "Keder Track"

### Files to change
- `src/components/RoofPlanDiagram.tsx` — full rework of band computation + rendering loop
- `src/lib/calculator.ts` — expose `roofPanelsPerSide` on `CalcResult` so the diagram doesn't have to back-calculate it (small additive change)

### Out of scope
- Showing per-bay panel-stagger / brick-bond pattern
- Showing rafter flap rectangles (lives in BayDiagram)
- Changing colour palette beyond removing the misleading blue/green band split

