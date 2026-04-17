
## Fix: short walls/roofs should count as 1 cut panel, not 0

### The bug
When `wallHeight < panelH`, `Math.floor(3.25/5) = 0` → 0 wall panels, and the entire wall gets dumped into "custom infill." Same flaw applies to the roof slope when `slopeLength < panelH`.

Your rule: **if a section's dimension is less than a panel's max size, it still consumes one panel (cut to fit) — not custom infill.** Custom infill is only for the *leftover* on top of full stacks when the section is taller than at least one full panel.

### Fix in `src/lib/calculator.ts`

**Walls (lines 158–177):**
Replace the `floor + leftover` logic with: if `wallHeight ≤ panelH`, count 1 panel per stack position (cut to `wallHeight` tall, billed as a full panel — same model as apex/gable triangles which already bill `panelW × actualHeight`). Only treat as custom infill when there are full stacks AND a leftover above them.

```ts
const wallHeight = eaveHeight + (wallFloorSealEnabled ? FLOOR_SEAL : 0);
let wallStacks: number;
let wallsPanels: number;
let wallsM2: number;
let customWallInfill: CustomInfill | null = null;

if (wallHeight <= panelH + 1e-6) {
  // Single cut panel per bay-side (wall fits within one panel height)
  wallStacks = 1;
  wallsPanels = bays * 2;
  wallsM2 = wallsPanels * panelW * wallHeight; // billed at actual cut size
} else {
  const fullStacks = Math.floor(wallHeight / panelH);
  const leftover = wallHeight - fullStacks * panelH;
  wallStacks = fullStacks;
  wallsPanels = bays * 2 * fullStacks;
  wallsM2 = wallsPanels * panelArea;
  if (leftover > 1e-6) {
    const infillCount = bays * 2;
    customWallInfill = {
      height: leftover,
      panelsCount: infillCount,
      m2: infillCount * panelW * leftover,
    };
    warnings.push(`Wall height ${wallHeight.toFixed(2)}m exceeds ${fullStacks} × ${panelH}m — added ${infillCount} custom infill panels at ${leftover.toFixed(2)}m tall.`);
  }
}
```

**Roof (lines 121–149):**
Apply same rule — if `effectiveSlope ≤ panelH`, that's 1 cut panel per side per bay (billed at `panelW × effectiveSlope`), and apex covers any remainder via existing geometric logic. Currently `wholeAlongSlope = floor(slope/panelH)` returns 0 for short roofs and the entire slope becomes apex (which then trips the apexMax cap).

```ts
let roofPanelsPerSide: number;
let roofM2PerPanel: number; // area billed per panel
let apexAuto: number;

if (effectiveSlope <= panelH + 1e-6) {
  roofPanelsPerSide = 1;
  roofM2PerPanel = panelW * effectiveSlope; // cut panel
  apexAuto = 0; // panel covers full slope incl. overhang
} else {
  const wholeAlongSlope = Math.floor(effectiveSlope / panelH);
  const geometricApex = Math.max(0, (effectiveSlope - wholeAlongSlope * panelH) * 2);
  roofPanelsPerSide = wholeAlongSlope;
  roofM2PerPanel = panelArea;
  apexAuto = geometricApex + 2 * overlapExcess;
  // existing apexMax loop to drop a row if needed
  while (apexAuto > apexMax && roofPanelsPerSide > 0) {
    roofPanelsPerSide -= 1;
    const newGeo = Math.max(0, (effectiveSlope - roofPanelsPerSide * panelH) * 2);
    apexAuto = newGeo + 2 * overlapExcess;
  }
}

const roofPanels = roofPanelsPerSide * 2 * bays;
const roofM2 = roofPanels * roofM2PerPanel;
```

**Gable walls (line 180):**
Already protected by `Math.max(1, fullStacks)`, but currently bills at full `panelArea` even when wall is short. Fix to bill cut height when `wallHeight ≤ panelH`:

```ts
const gableRowHeight = wallHeight <= panelH + 1e-6 ? wallHeight : panelH * Math.max(1, fullStacks);
const gableWallsPanelsPerEnd = Math.ceil(width / panelW) * Math.max(1, fullStacks || 1);
const gableWallsPanels = gableWallsPanelsPerEnd * 2;
const gableWallsM2 = gableWallsPanels * panelW * gableRowHeight / Math.max(1, fullStacks || 1);
// (or simpler: bill per-panel area = panelW × min(panelH, wallHeight))
```

Simpler restatement:
```ts
const gablePerPanelArea = panelW * Math.min(panelH, wallHeight);
const gableWallsM2 = gableWallsPanels * gablePerPanelArea;
```

### Expected result for the screenshot config (3m eave, MAL18 5×5)
- Walls: **20 panels** (10 bays × 2 sides), 195 m² (cut at 3.25m tall × 5m wide)
- Custom infill: **none** (no warning)
- Roof: 60 panels at full 5×5 (slope ≈15.77m → still 3 stacks, unchanged)
- Gable walls: 12 panels at 5×3.25 = 195 m² (was 300 m² at full 5×5)

### Files
- `src/lib/calculator.ts` — wall, roof, and gable-wall sizing logic. No UI changes needed; `AreaCard` already handles whatever `panels`/`m2` values come back.
