

## Fix wall/roof sizing rules: prefer cut panels at the eave, keep apex small

### Diagnosis from your screenshot (50×25, eave 3m, pitch 18°, MAL18 5×5)
- **Effective slope** = 12.5/cos(18°) + 0.25 overhang ≈ **13.39m**
- **Current code:** `wholeAlongSlope = floor(13.39/5) = 2` → leftover = 3.39m × 2 sides = 6.79m apex. Apex > 5m cap, so the `while` loop drops roof rows trying to shrink apex. It drops to 1, then to 0, ending at **roof = 0 panels, apex = 27.29m**. That's the bug.
- **Walls:** wallHeight 3.25m ≤ 5m → currently outputs "5.00×5.00m panels" sub-text even though each panel is actually cut to 5×3.25m. Number is right (325 m²), label is misleading.

### Your stated rules → corrected algorithm

**Roof (per side, per bay):**
1. Lay as many full-height roof panels (5m along slope) as possible: `fullRoofRows = floor(effectiveSlope / panelH)`.
2. Remaining slope = `effectiveSlope − fullRoofRows × panelH`. Combined across both sides = apex strip = `remaining × 2`.
3. **If apex ≤ panelMax (max of panelW, panelH)** → one apex piece per bay, done. Roof rows stay at full count.
4. **If apex > panelMax** → the remaining slope per side is too long for a single apex piece to span the ridge. Keep the full roof rows AND add one **custom-cut roof panel per side** at the eave (smaller height = `remaining − apexHalfFromEachSide`), so that the apex strip narrows to ≤ panelMax. Concretely: target apex = panelMax → each side absorbs `(remaining − panelMax/2)` into a cut eave panel of that height.
5. **Special case — slope ≤ panelH:** one cut roof panel per side covers the whole slope, apex = 0 (already implemented).

For the screenshot: `fullRoofRows = 2`, remaining = 3.39m/side, apex = 6.79m > 5m cap. Add a cut eave panel per side of height `3.39 − 5/2 = 0.89m`, apex becomes **5m**.
- Result: **40 full roof panels (2×2×10) + 20 cut eave panels (0.89m tall) + 10 apex pieces (5m wide)** instead of 0 roof panels and a 27.29m apex.

**Walls (per bay, per side):**
1. `fullWallRows = floor(wallHeight / panelH)` full-height stacked panels.
2. `leftover = wallHeight − fullWallRows × panelH`.
3. **If wallHeight ≤ panelH** (no full rows fit) → one cut wall panel per bay-side, sized `panelW × wallHeight` (already implemented; just relabel).
4. **If leftover ≤ 0.25m AND `roofOverhangEnabled`** → ignore leftover; the roof's 250mm seal-to-wall overlap absorbs it. Add a notification ("Wall has Xmm excess absorbed by roof overhang"). No custom infill panel.
5. **If leftover > 0.25m** → add custom wall infill strip of height `leftover` (current behavior).
6. **If wallHeight > panelH × N for large N** → already handled by stacking; custom infill only when leftover remains after full stacks.

For a 3m wall (3.25m with seal): `fullWallRows = 0`, wallHeight ≤ 5m → 20 cut panels at 5×3.25m. Same numbers, but the sub-text card should say **"cut panels · 5.00×3.25m"** not "5.00×5.00m".

### Calculator changes (`src/lib/calculator.ts`)

Add to `CalcResult`:
```ts
// Custom-cut roof panels at the eave (when apex would otherwise exceed panel max)
customRoofEave: { height: number; panelsCount: number; m2: number } | null;
// Actual wall panel cut height (for accurate labelling)
wallPanelHeight: number;
roofPanelHeight: number; // along-slope dimension of each full roof panel piece
```

Roof block (replace lines ~120–176):
```ts
const apexMax = Math.max(panelW, panelH);
let roofPanelsPerSide: number;       // full-height roof rows
let roofM2PerPanel: number;
let apexAuto: number;
let customRoofEave: CustomInfill | null = null;
let roofPanelHeight = panelH;

if (effectiveSlope <= panelH + 1e-6) {
  roofPanelsPerSide = 1;
  roofPanelHeight = effectiveSlope;
  roofM2PerPanel = panelW * effectiveSlope;
  apexAuto = 0;
} else {
  const fullRows = Math.floor(effectiveSlope / panelH);
  const remainingPerSide = effectiveSlope - fullRows * panelH;
  const naturalApex = remainingPerSide * 2;

  roofPanelsPerSide = fullRows;
  roofM2PerPanel = panelArea;

  if (naturalApex <= apexMax + 1e-6) {
    apexAuto = naturalApex; // fits — no eave cut needed
  } else {
    // Apex would exceed panel max — narrow apex to panelMax and absorb the
    // excess per side into a custom-cut eave panel.
    apexAuto = apexMax;
    const eaveCutHeight = remainingPerSide - apexMax / 2;
    if (eaveCutHeight > 1e-6) {
      const eaveCount = bays * 2; // one per side per bay
      customRoofEave = {
        height: eaveCutHeight,
        panelsCount: eaveCount,
        m2: eaveCount * panelW * eaveCutHeight,
      };
    }
  }
}

const roofPanels = roofPanelsPerSide * 2 * bays;
const roofM2 = roofPanels * roofM2PerPanel;
const apexWidth = apexOverride != null && apexOverride > 0 ? apexOverride : apexAuto;
const apexPieces = apexWidth > 1e-6 ? bays : 0;
const apexM2 = apexWidth * baySize * bays;
```

Remove the old `while` loop that was dropping roof rows.

Wall block — add overhang-absorption branch:
```ts
const OVERHANG_ABSORB = 0.25;
// after computing fullStacks/leftover in the stacked branch:
if (leftover > 1e-6) {
  if (leftover <= OVERHANG_ABSORB && roofOverhangEnabled) {
    warnings.push(
      `Wall has ${(leftover*1000).toFixed(0)}mm excess above ${fullStacks} × ${panelH}m — absorbed by roof overhang.`
    );
    // no customWallInfill
  } else {
    // existing custom infill creation
  }
}
```

Track `wallPanelHeight = wallHeight <= panelH ? wallHeight : panelH`.

Update totals to include `customRoofEave`:
```ts
const totalM2 = wallsM2 + customM2 + roofM2 + (customRoofEave?.m2 ?? 0) + apexM2 + gableWallsM2 + gableTriM2;
const totalPanels = wallsPanels + (customWallInfill?.panelsCount ?? 0) + roofPanels
  + (customRoofEave?.panelsCount ?? 0) + apexPieces + gableWallsPanels + gableTriCount + gableInfillCount;
```

### UI changes (`src/components/CalculatorPanel.tsx`)
- **Walls card sub:** change `${fmt(panelW)}×${fmt(panelH)}m panels` → `${fmt(panelW)}×${fmt(result.wallPanelHeight)}m panels`.
- **Roof card sub:** change to `${fmt(panelW)}×${fmt(result.roofPanelHeight)}m panels`.
- Add new **"Custom roof eave"** `AreaCard` with `Custom cut` badge, shown when `result.customRoofEave` is set, mirroring the custom-wall-infill card layout.

### BayDiagram (`src/components/BayDiagram.tsx`)
- If `customRoofEave` is present, render an additional thin strip at the eave on each roof side in the diagram, labelled with its cut height. Quick check needed of this file to confirm exact rendering approach — done during implementation.

### Expected outcome for the screenshot
| Section | Before | After |
|---|---|---|
| Roof panels | 0 | 40 (2 rows × 2 sides × 10 bays @ 5×5m) |
| Custom roof eave | — | 20 panels @ 5×0.89m = 89 m² |
| Apex | 10 pcs × 27.29m × 5m = 1,364 m² | 10 pcs × 5m × 5m = 250 m² |
| Walls sub-text | "5.00×5.00m panels" | "5.00×3.25m panels" |
| Total m² | 1,953 m² (wildly inflated by giant apex) | ~830 m² (correct) |
| Warning | "Apex 27.29m exceeds max" | gone |

### Files
- `src/lib/calculator.ts` — roof loop rewrite, wall overhang-absorption branch, new `customRoofEave` + `wallPanelHeight`/`roofPanelHeight` on result.
- `src/components/CalculatorPanel.tsx` — accurate panel-size labels, new custom-roof-eave card.
- `src/components/BayDiagram.tsx` — render eave cut strip when present.

