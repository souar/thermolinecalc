
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  reference_url TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.marquee_specs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  length NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  eave_height NUMERIC NOT NULL,
  pitch_deg NUMERIC NOT NULL,
  bay_size NUMERIC NOT NULL DEFAULT 5,
  lining_type TEXT NOT NULL,
  roof_overhang_enabled BOOLEAN NOT NULL DEFAULT true,
  wall_floor_seal_enabled BOOLEAN NOT NULL DEFAULT true,
  apex_override NUMERIC,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lining_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spec_id UUID NOT NULL REFERENCES public.marquee_specs(id) ON DELETE CASCADE,
  walls_m2 NUMERIC NOT NULL,
  roof_m2 NUMERIC NOT NULL,
  gables_m2 NUMERIC NOT NULL,
  total_m2 NUMERIC NOT NULL,
  walls_panels INTEGER NOT NULL,
  roof_panels INTEGER NOT NULL,
  gable_panels INTEGER NOT NULL,
  apex_width NUMERIC,
  total_weight_kg NUMERIC,
  total_cost NUMERIC,
  breakdown_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.lining_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lining_type TEXT NOT NULL,
  panel_width NUMERIC NOT NULL,
  panel_height NUMERIC NOT NULL,
  cost_per_m2 NUMERIC NOT NULL DEFAULT 0,
  weight_per_m2 NUMERIC,
  component_cost NUMERIC,
  labour_cost_per_panel NUMERIC,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lining_type, panel_width, panel_height)
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marquee_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lining_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lining_pricing ENABLE ROW LEVEL SECURITY;

-- Permissive policies (no auth yet — to be tightened later)
CREATE POLICY "public_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_specs" ON public.marquee_specs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_results" ON public.lining_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_pricing" ON public.lining_pricing FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger for jobs
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_touch_updated BEFORE UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER pricing_touch_updated BEFORE UPDATE ON public.lining_pricing
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default lining pricing rows (cost can be edited in UI)
INSERT INTO public.lining_pricing (lining_type, panel_width, panel_height, cost_per_m2, weight_per_m2) VALUES
  ('MAL18 / Thermoline', 5, 5, 0, 0.18),
  ('MAL22', 5, 5, 0, 0.22),
  ('MAL30 / ThermoAcoustic', 3, 5, 0, 0.30);

-- Indexes
CREATE INDEX idx_jobs_customer ON public.jobs(customer_id);
CREATE INDEX idx_specs_job ON public.marquee_specs(job_id);
CREATE INDEX idx_results_spec ON public.lining_results(spec_id);
