

## Install & Labour — Phase 1: Install time

Add install time calculation as a new **Install & Labour** tab in the Calculator page (sibling to existing Specification / Diagrams tabs). All inputs and outputs live inside this tab.

### Tab contents

**1. Time per panel (editable table)** — same styling as the spec card:
| Section | Default | Unit |
|---|---|---|
| Roof panels | 60 | min/panel |
| Wall panels | 45 | min/panel |
| Gable wall panels | 45 | min/panel |
| Gable triangles & infills | 60 | min/panel |
| Apex infill | 45 | min/panel |
| Eave infill | 45 | min/panel |
| Custom wall infill | 45 | min/panel |
| Rafter covers | 20 | min/panel |

**2. Team controls:**
- Number of teams (default 1, min 1)
- People per team (default 6, min 6 — enforced)
- Hours per working day (default 8) — *suggested, captures shorter/longer shifts*
- Parallel sections toggle (default on) — *suggested, sections run concurrently across teams when on*

**3. Results:**
- Headline tiles: total install days, total person-hours, avg panels/day/team
- Per-section breakdown table: panels, min/panel, hours, days

### Calculation (`src/lib/calculator.ts`)

For each section: `hours = panels × min / 60`, `days = hours / (hoursPerDay × teams)`.
Totals sum hours then divide by `(hoursPerDay × teams)`.
Person-hours = `totalHours × peoplePerTeam × teams` (informational).

### Persistence

- New Supabase table `install_time_defaults` — single editable row of global defaults (pattern matches `lining_pricing`).
- Team config persists via existing per-job / localStorage paths.

### Files to change

- `src/lib/calculator.ts` — add `InstallInput`, `InstallResult`, `calculateInstall()`
- `src/components/InstallPanel.tsx` — new component (inputs + results)
- `src/components/CalculatorPanel.tsx` — add **Install & Labour** tab, render `<InstallPanel />` inside it
- `src/routes/calculator.tsx` & `src/routes/jobs.$jobId.tsx` — wire install state through
- New migration — `install_time_defaults` table seeded with defaults

### Out of scope

- Cost / labour rates (later phase)
- Crew skill / ramp-up factor, travel, weather contingency
- Per-job override of time-per-panel defaults (global only for now)

