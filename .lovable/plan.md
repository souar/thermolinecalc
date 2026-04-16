
## Marquee Lining Calculator + Project Persistence (revised)

### Scope changes from previous plan
- **No auth** — skip Supabase auth entirely for now
- **Shared workspace** — all users see all customers/jobs/pricing
- **Username gate** — first visit prompts for a display name, stored in localStorage, attached to records as `created_by` for attribution

### Data model

```text
users (lightweight, no auth)
  id, username, created_at

customers
  id, name, created_by (username), created_at

jobs
  id, customer_id, name, reference, reference_url (nullable),
  notes, created_by, created_at, updated_at

marquee_specs
  id, job_id, length, width, eave_height, pitch_deg, bay_size,
  lining_type, roof_overhang_enabled, wall_floor_seal_enabled,
  apex_override (nullable), created_by, created_at

lining_results (cached calc snapshot)
  id, spec_id, walls_m2, roof_m2, gables_m2, total_m2,
  walls_panels, roof_panels, gable_panels, apex_width,
  total_weight_kg, total_cost, breakdown_json, created_at

lining_pricing (shared price book)
  id, lining_type, panel_width, panel_height, cost_per_m2,
  component_cost (nullable, future), labour_cost_per_panel (nullable, future),
  updated_by, updated_at
```

RLS: enabled but permissive (public read + public write) so anyone can use it. Structure is ready to tighten when auth is added later.

### Username flow
- On first load, modal asks "What's your name?" → saved to `users` table + localStorage
- Username displayed in header with a "switch user" option
- Every create/update writes `created_by` so the UI can show "Created by Alice" on cards

### Routes
- `/` — dashboard: customer list + recent jobs across everyone
- `/customers/$customerId` — jobs under that customer
- `/jobs/$jobId` — calculator + saved spec + cached results
- `/calculator` — standalone quick calc (no save)
- `/pricing` — shared price book editor

### Calculator behaviour
- Standalone (`/calculator`): pure math, localStorage only
- Job mode: inputs auto-save to `marquee_specs`, results cached, costs pulled from `lining_pricing`
- "Save as new revision" creates a new spec row to preserve history

### Future-ready
- `lining_pricing` already has nullable `component_cost` and `labour_cost_per_panel` columns
- Schema includes `created_by` everywhere → trivial to wire to real auth later by mapping to `auth.uid()`

### Stack
- Lovable Cloud (Supabase) for DB only, no auth module
- TanStack Query for data fetching
- shadcn/ui + react-hook-form + zod
- Clean technical/engineering visual style, monospace numbers
