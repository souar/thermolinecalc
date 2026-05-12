## Goal
Add edit (and delete) capability for customers (projects) and jobs.

## Scope
- **Customer**: rename from index page (`src/routes/index.tsx`) and from customer detail page (`src/routes/customers.$customerId.tsx`). Allow delete with confirmation.
- **Job**: edit name / reference / reference_url / notes from customer page (`src/routes/customers.$customerId.tsx`) and from the job detail page (`src/routes/jobs.$jobId.tsx`). Allow delete with confirmation.

## UX
- Add a small "pencil" edit icon next to each customer card title and each job card title, plus next to the H1 on detail pages.
- Clicking opens the existing-style `Dialog` pre-filled with current values; "Save" updates via Supabase `update`, then invalidates the relevant queries.
- Add a "Delete" button inside the same dialog (destructive variant) that uses `AlertDialog` confirmation. Deleting a customer cascades manually: delete jobs → marquee_specs → lining_results first (no FKs in DB), or warn if jobs exist and require deleting jobs first. **Recommended: block customer delete if it has jobs**, to avoid accidental data loss.
- Deleting a job from the detail page navigates back to the customer.

## Files to edit
- `src/routes/index.tsx` — add inline edit/delete for each customer card.
- `src/routes/customers.$customerId.tsx` — edit/delete customer (H1 area), edit/delete job (per card). Reuse the existing job dialog form for edit mode.
- `src/routes/jobs.$jobId.tsx` — edit/delete buttons in the header for the current job.

## Technical notes
- All tables already have permissive RLS (`public_all_*`), so plain `supabase.from(...).update(...)` / `.delete()` works.
- Job delete must also remove related `marquee_specs` (and their `lining_results`) since there are no DB FKs/cascades. Order: `lining_results` (by spec_ids) → `marquee_specs` → `jobs`.
- Use `AlertDialog` for destructive confirmations, `toast` for feedback, and `queryClient.invalidateQueries` for `["customers"]`, `["customer", id]`, `["jobs", customerId]`, `["job", jobId]`.
- No schema changes, no new dependencies.
