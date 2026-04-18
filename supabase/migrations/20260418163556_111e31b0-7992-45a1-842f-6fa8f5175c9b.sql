ALTER TABLE public.marquee_specs
  ADD COLUMN IF NOT EXISTS line_roof boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS line_walls boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS line_gable_walls boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS line_gable_triangles boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS line_apex boolean NOT NULL DEFAULT true;