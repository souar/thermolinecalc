CREATE TABLE public.install_time_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key text NOT NULL UNIQUE,
  label text NOT NULL,
  minutes_per_panel numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_by text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.install_time_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all_install_defaults"
  ON public.install_time_defaults
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER install_time_defaults_touch
  BEFORE UPDATE ON public.install_time_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.install_time_defaults (section_key, label, minutes_per_panel, sort_order) VALUES
  ('roof',         'Roof panels',                 60, 1),
  ('walls',        'Wall panels',                 45, 2),
  ('gable_walls',  'Gable wall panels',           45, 3),
  ('gable_tri',    'Gable triangles & infills',   60, 4),
  ('apex',         'Apex infill',                 45, 5),
  ('eave',         'Eave infill',                 45, 6),
  ('wall_infill',  'Custom wall infill',          45, 7),
  ('rafters',      'Rafter covers',               20, 8);