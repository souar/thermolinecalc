## Goal

For a 5 × 20 × 4 m marquee on MAL 30 (5 × 3 m panels, 7.4 kg/m² → 111 kg cap), gable infills should stay as single pieces — they're 5 × 1.625 m ≈ 8.1 m² ≈ 60 kg, well under the cap. They shouldn't visually split.

## What's actually happening

In `src/lib/calculator.ts`, the gable splitter uses:

```ts
const maxPieceWeight = panelW * panelH * wpm2;     // 5·3·7.4 = 111 kg
const splits = Math.ceil(totalInfillWeight / maxPieceWeight);
```

For the 5 × 20 × 4 case `splits = ceil(60 / 111) = 1`, so the maths is already correct. The reason the diagram still shows split pieces is that `panelW`, `panelH`, and `weightPerM2` reaching the calculator aren't the MAL 30 values — they fall back to internal defaults (`panelW = panelH = 5`, `weightPerM2 = 0`) when the selected lining variant doesn't propagate its pricing-row overrides, which makes `maxPieceWeight = Infinity` *or* shrinks the cap depending on the path.

I need to verify which of these is the case before changing the splitter rule itself.

## Plan

### 1. Investigate the variant → calculator wiring

Trace how the active lining variant's panel width/height and weight reach `CalcInput` for the gable-end view. Files to read:

- `src/components/CalculatorPanel.tsx` — where `calculate(...)` is called and where `panelW` / `panelH` / `weightPerM2` are sourced.
- `src/lib/variantsQuery.ts` — what fields the variant query exposes.
- `src/routes/jobs.$jobId.tsx` — the job-level entry that feeds the same calculator.

Confirm whether MAL 30's `panelW=5`, `panelH=3`, `weightPerM2=7.4` actually reach `calculate()` or get dropped on the way.

### 2. Fix the wiring (most likely root cause)

If the variant values aren't being passed through, plumb them into `CalcInput.panelW / panelH / weightPerM2` at the call site. No change to the splitter rule itself — once `maxPieceWeight = 111 kg` is correct, the current `Math.ceil(weight / cap)` math will stop splitting the 60 kg infill.

### 3. Guardrail in the calculator

In `src/lib/calculator.ts` gable-triangle loop:

- Keep the rule **weight-only**, as agreed. No new dimension check.
- When `weightPerM2 <= 0`, treat `maxPieceWeight = Infinity` (never split) instead of falling through to the existing `> 0` guard ambiguously — makes behaviour explicit when weight data is missing.
- Drop the implicit `> 0` re-check on `maxPieceWeight`; with the explicit `Infinity` fallback the `splits = Math.max(1, Math.ceil(totalInfillWeight / maxPieceWeight))` line is always meaningful.

### 4. Verify against the 5 × 20 × 4 case

After the fix, reproduce 5 × 20 × 4 on MAL 30 and confirm:

- Each gable half has 1 triangle + 1 infill (no further infill splits).
- `gableInfillCount = 2` per end (4 total).
- `Slice pieces` table in the gable diagram shows one row of type `infill` per slice that has any infill.

### Out of scope

- No change to how triangles themselves are decomposed (the hypotenuse-on-rafter constraint stays).
- No dimensional split check — explicitly rejected per your choice.
- No changes to roof/apex/wall splitting.
