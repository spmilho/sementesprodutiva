
-- Tabela principal de tratamento de sementes
CREATE TABLE public.seed_treatment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  parent_type TEXT NOT NULL, -- "female", "male_1", "male_2", "male_3"
  treatment_origin TEXT NOT NULL, -- "client_treated", "in_house", "no_treatment"
  treatment_date DATE,
  treatment_location TEXT,
  responsible_person TEXT,
  equipment_used TEXT,
  seed_lot TEXT,
  germination_before NUMERIC,
  vigor_before NUMERIC,
  germination_after NUMERIC,
  total_slurry_volume TEXT,
  visual_quality TEXT, -- "excellent","good","regular","poor"
  client_document_url TEXT,
  seed_condition_notes TEXT,
  no_treatment_reason TEXT,
  photos TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.seed_treatment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seed_treatment"
  ON public.seed_treatment FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert seed_treatment"
  ON public.seed_treatment FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update seed_treatment"
  ON public.seed_treatment FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

-- Tabela de produtos do tratamento
CREATE TABLE public.seed_treatment_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_treatment_id UUID NOT NULL REFERENCES public.seed_treatment(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  active_ingredient TEXT,
  product_type TEXT, -- "fungicide","insecticide","nematicide","inoculant","biostimulant","polymer","graphite","micronutrient","other"
  category TEXT, -- "chemical","biological","mixed"
  dose NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL, -- "mL/60k_seeds","g/60k_seeds","mL/kg","mL/sack_20kg","L/ton"
  application_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_treatment_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seed_treatment_products"
  ON public.seed_treatment_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.seed_treatment st
    WHERE st.id = seed_treatment_products.seed_treatment_id
    AND st.org_id = user_org_id()
    AND st.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert seed_treatment_products"
  ON public.seed_treatment_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.seed_treatment st
    WHERE st.id = seed_treatment_products.seed_treatment_id
    AND st.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update seed_treatment_products"
  ON public.seed_treatment_products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.seed_treatment st
    WHERE st.id = seed_treatment_products.seed_treatment_id
    AND st.org_id = user_org_id()
    AND st.deleted_at IS NULL
  ));

CREATE POLICY "Org members can delete seed_treatment_products"
  ON public.seed_treatment_products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.seed_treatment st
    WHERE st.id = seed_treatment_products.seed_treatment_id
    AND st.org_id = user_org_id()
    AND st.deleted_at IS NULL
  ));

CREATE TRIGGER update_seed_treatment_updated_at
  BEFORE UPDATE ON public.seed_treatment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
