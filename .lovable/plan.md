

## Add Rafter Covers calculation

### Spec section toggles
Add two switches in the spec card under existing seal/overhang toggles:
- **Roof rafter covers** (on/off)
- **Leg rafter covers** (on/off)
- **Rafter flap width** number input (default 400mm, editable, shown when either toggle is on)
- **Roof rafter length** number input (default 10m, editable per rule 3, shown when roof rafters on)

### Calculation logic (`src/lib/calculator.ts`)

Add to `CalcInput`:
```ts
roofRaftersEnabled: boolean;
legRaftersEnabled: boolean;
rafterFlapWidth?: number;   // m, default 0.4
roofRafterLength?: number;  // m, default 10
```

Add constants: `RAFTER_FLAP_DEFAULT = 0.4`, `RAFTER_LENGTH_DEFAULT = 10`, `RAFTER_OVERLAP = 0.15`.

**Rafter count**: One rafter per bay junction = `bays + 1` rafters per side. Roof has 2 sides, legs have 2 sides → `(bays + 1) × 2` of each.

**Roof rafter cover** (per rafter):
- Required cover length = `slopeLength + RAFTER_OVERLAP` (eave overlap to leg, rule 5)
- Number of flaps along length = `ceil((coverLength - overlap) / (rafterLength - overlap))` accounting for 150mm joins (rule 6)
- Effective fabric length per flap = user-set rafterLength (or shorter custom for last piece if it'd be wasteful — surface as "custom length" row)
- Area per flap = `flapWidth × rafterLength`

**Leg rafter cover** (per rafter):
- Length = `eaveHeight + RAFTER_OVERLAP` (overlap onto roof rafter at eave, rule 5)
- One flap per leg rafter (legs typically single piece, rule 4)
- Area = `flapWidth × legLength`

Add to `CalcResult`:
```ts
roofRafterCovers: { count: number; flapsPerRafter: number; flapLength: number; customLastFlap: number | null; m2: number; panels: number } | null;
legRafterCovers:  { count: number; legLength: number; m2: number; panels: number } | null;
```

Include their `m2` and `panels` in `totalM2` / `totalPanels` (and weight/cost).

### UI updates (`src/components/CalculatorPanel.tsx`)

**Spec card**: Add the two switches + two conditional number inputs (flap width in mm, rafter length in m).

**Rafter covers section table**: Replace placeholder rows with real rows when toggles enabled:
- "Roof rafter covers (full)" — count of full-length flaps
- "Roof rafter covers (custom length)" — only if last flap is shorter than default (custom badge)
- "Leg rafter covers" — one row, count = `(bays + 1) × 2`
- Conditional rows; if both toggles off, keep "Coming soon" placeholder.

Notes column shows things like "10m × 0.4m", "150mm overlap at joins", "Spans eave to leg".

### Diagram updates
Out of scope this round — rafter covers are linear strips along structural rafters and don't affect the bay/gable diagrams meaningfully. Can add overlay lines later if wanted.

### Default values for `DEFAULT_INPUT`
```ts
roofRaftersEnabled: false,
legRaftersEnabled: false,
rafterFlapWidth: 0.4,
roofRafterLength: 10,
```

### Files to change
- `src/lib/calculator.ts` — input/result types, calculation, defaults
- `src/components/CalculatorPanel.tsx` — spec switches/inputs, rafter section rows

### Out of scope
- Pricing differentiation for rafter covers (uses selected lining's cost/weight per m²)
- Visual diagrams of rafter cover layout
- Saving rafter toggle state per job (will inherit from existing job persistence path automatically)

