
## Cap apex at max panel size — final fix

### Diagnosis
With MAL30 (5×3m), eave 15m, no overlaps:
- `wallWithOverlap = 15 + 0 = 15m`, `panelH = 3m` → `overlapExcess = 12m`
- Apex grows by `2 × 12 = 24m` → 24.8m apex

The "absorb overlap into apex" branch is wrong when the wall itself is taller than one panel — that's not overlap, that's just a tall wall that needs **stacked panels**, not apex absorption.

### Correct rule
Overlap absorption should only consider the **excess from the overhang/seal**, not the entire wall height. Walls > panelH are handled by stacking (already works correctly via `fullStacks`).

Then **clamp apex at `max(panelW, panelH)`**. If geometric apex still exceeds that cap, drop one roof panel row per side (apex absorbs the freed slope length instead).

### Changes in `src/lib/calculator.ts`

**1. Fix overlap excess calculation:**
```ts
// OLD: const wallWithOverlap = eaveHeight + roofOverlap;
//      const overlapExcess = Math.max(0, wallWithOverlap - panelH);

// NEW: only the overhang itself can push apex; wall stacking handles tall walls
const overlapExcess = roofOverlap; // 0 or 0.25m
```
(The intent of the original was to handle roof-overlap eating into wall panels — but with overlap of 0.25m and panels ≥ 3m, this is always just the overhang itself.)

**2. Clamp apex at panel max with roof-row fallback:**
```ts
const apexMax = Math.max(panelW, panelH);
let apexAuto = geometricApex + 2 * overlapExcess;
let roofPanelsPerSide = wholeAlongSlope;

while (apexAuto > apexMax && roofPanelsPerSide > 0) {
  roofPanelsPerSide -= 1;
  const newGeo = Math.max(0, (effectiveSlope - roofPanelsPerSide * panelH) * 2);
  apexAuto = newGeo + 2 * overlapExcess;
}

if (apexAuto > apexMax) {
  warnings.push(`Apex ${apexAuto.toFixed(2)}m exceeds max panel ${apexMax}m — geometry may need review.`);
}
```

**3. Clamp manual override too:**
```ts
if (apexOverride && apexOverride > apexMax) {
  warnings.push(`Apex override ${apexOverride}m exceeds max panel size ${apexMax}m.`);
}
```

**4. Use `roofPanelsPerSide` (not `wholeAlongSlope`) for `roofPanels`.**

### Verification matrix
| Config | Expected |
|---|---|
| 50×35, eave 15, MAL30, no overlaps | apex ≤ 5m, walls 5 stacks, roof recalculated |
| 50×30, eave 5.4, MAL18, both overlaps | apex ~1.55m + 0.5m = 2.05m (under 5m cap) |
| 50×30, eave 3, MAL18 defaults | apex unchanged from current correct behaviour |

### Files
- `src/lib/calculator.ts` only
