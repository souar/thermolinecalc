

## Scale install time by team size

### Problem
The "minutes per panel" defaults (roof 60min, walls 45min, etc.) describe a baseline 6-person team. Right now, changing **People / team** has no effect on install hours/days — it only changes the `personHours` total. The user expects more people on a team to finish faster.

### Fix
In `src/lib/calculator.ts` → `calculateInstall`:

- Treat `MIN_PEOPLE_PER_TEAM` (6) as the calibration baseline for the per-panel times.
- Apply a team-size scale factor `teamScale = MIN_PEOPLE_PER_TEAM / people` to each section's hours.
  - 6 people → ×1.0 (unchanged)
  - 12 people → ×0.5 (half the time)
  - 9 people → ×0.667
- Section `hours` and `days` are derived from the scaled hours; `totalDays` follows automatically.
- `personHours` keeps multiplying by actual `people * teams`, so the labour-cost figure stays accurate (bigger team = same person-hours, less calendar time — ideal linear scaling).
- `panelsPerDayPerTeam` rises naturally because days shrink.

### UI hint (optional, same edit)
Add a small helper line under the **People / team** input: "Baseline 6 — extra people scale install time down proportionally." So the relationship is discoverable.

### Files to change
- `src/lib/calculator.ts` — apply `teamScale` in `calculateInstall` (one block, lines ~589–607).
- `src/components/InstallPanel.tsx` — add the helper caption under the People / team field.

### Out of scope
- Diminishing-returns curves (e.g. 12 people ≠ exactly 2× faster in reality). Linear scaling matches the user's stated rule ("equally distribute the time").
- Per-section different team sizes.
- Wiring the existing `parallelSections` toggle into the maths (still informational).

