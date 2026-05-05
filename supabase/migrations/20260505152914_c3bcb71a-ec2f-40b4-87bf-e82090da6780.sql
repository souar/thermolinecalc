CREATE TYPE public.component_kind AS ENUM ('sleeve','material','labour');

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all_suppliers ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER suppliers_touch_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind public.component_kind NOT NULL,
  name text NOT NULL,
  sku text,
  unit text NOT NULL,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  m2_per_unit numeric,
  weight_per_m2 numeric,
  primary_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  panel_width numeric,
  panel_height numeric,
  manufacturing_stage text,
  time_minutes_per_unit numeric,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all_components ON public.components FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_components_kind ON public.components(kind);
CREATE INDEX idx_components_primary_supplier ON public.components(primary_supplier_id);
CREATE TRIGGER components_touch_updated_at BEFORE UPDATE ON public.components FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.component_supplier_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  cost_per_unit numeric NOT NULL,
  is_preferred boolean NOT NULL DEFAULT false,
  lead_time_days integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_id, supplier_id)
);
ALTER TABLE public.component_supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all_component_supplier_prices ON public.component_supplier_prices FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER component_supplier_prices_touch_updated_at BEFORE UPDATE ON public.component_supplier_prices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.lining_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  default_panel_width numeric,
  default_panel_height numeric,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lining_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all_lining_variants ON public.lining_variants FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER lining_variants_touch_updated_at BEFORE UPDATE ON public.lining_variants FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.lining_variant_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES public.lining_variants(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.components(id) ON DELETE RESTRICT,
  qty_per_m2 numeric NOT NULL DEFAULT 0,
  panel_m2 numeric,
  sections text[],
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lining_variant_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all_lining_variant_components ON public.lining_variant_components FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_lining_variant_components_variant ON public.lining_variant_components(variant_id);
CREATE TRIGGER lining_variant_components_touch_updated_at BEFORE UPDATE ON public.lining_variant_components FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.lining_variants (name, default_panel_width, default_panel_height)
SELECT lining_type, panel_width, panel_height FROM public.lining_pricing
ON CONFLICT (name) DO NOTHING;