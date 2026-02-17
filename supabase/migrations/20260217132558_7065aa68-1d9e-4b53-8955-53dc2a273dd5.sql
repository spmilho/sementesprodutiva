
-- ═══════════════════════════════════════
-- SEED LOTS (lotes de semente básica)
-- ═══════════════════════════════════════
CREATE TABLE public.seed_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  parent_type TEXT NOT NULL, -- "female", "male"
  designated_male_planting TEXT, -- "any", "male_1", "male_2", "male_3"
  lot_number TEXT NOT NULL,
  origin_season TEXT NOT NULL,
  received_date DATE,
  quantity NUMERIC NOT NULL,
  quantity_unit TEXT NOT NULL DEFAULT 'sacks_20kg',
  quantity_kg NUMERIC,
  thousand_seed_weight_g NUMERIC,
  sieve_classification TEXT,
  supplier_origin TEXT,
  germination_pct NUMERIC NOT NULL,
  vigor_aa_pct NUMERIC,
  vigor_cold_pct NUMERIC,
  tetrazolium_viability_pct NUMERIC,
  tetrazolium_vigor_pct NUMERIC,
  physical_purity_pct NUMERIC,
  genetic_purity_pct NUMERIC,
  seed_moisture_pct NUMERIC,
  quality_analysis_date DATE,
  analysis_report_number TEXT,
  analysis_report_url TEXT,
  packaging_condition TEXT,
  pest_presence TEXT,
  reception_notes TEXT,
  reception_photos TEXT[],
  status TEXT NOT NULL DEFAULT 'available',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.seed_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seed_lots" ON public.seed_lots
  FOR SELECT USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert seed_lots" ON public.seed_lots
  FOR INSERT WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update seed_lots" ON public.seed_lots
  FOR UPDATE USING (org_id = user_org_id() AND deleted_at IS NULL);

-- ═══════════════════════════════════════
-- SEED LOT TREATMENTS (TS por lote)
-- ═══════════════════════════════════════
CREATE TABLE public.seed_lot_treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_lot_id UUID NOT NULL REFERENCES public.seed_lots(id),
  treatment_origin TEXT NOT NULL, -- "client_treated", "in_house", "no_treatment"
  treatment_date DATE,
  treatment_location TEXT,
  responsible_person TEXT,
  equipment_used TEXT,
  total_slurry_volume TEXT,
  visual_quality TEXT,
  germination_after_ts NUMERIC,
  client_document_url TEXT,
  no_treatment_reason TEXT,
  photos TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.seed_lot_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seed_lot_treatments" ON public.seed_lot_treatments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert seed_lot_treatments" ON public.seed_lot_treatments
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update seed_lot_treatments" ON public.seed_lot_treatments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL
  ));

-- ═══════════════════════════════════════
-- SEED LOT TREATMENT PRODUCTS
-- ═══════════════════════════════════════
CREATE TABLE public.seed_lot_treatment_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_lot_treatment_id UUID NOT NULL REFERENCES public.seed_lot_treatments(id),
  product_name TEXT NOT NULL,
  active_ingredient TEXT,
  product_type TEXT,
  category TEXT,
  dose NUMERIC NOT NULL,
  dose_unit TEXT NOT NULL,
  application_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_lot_treatment_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view seed_lot_treatment_products" ON public.seed_lot_treatment_products
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM seed_lot_treatments slt
    JOIN seed_lots sl ON sl.id = slt.seed_lot_id
    WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert seed_lot_treatment_products" ON public.seed_lot_treatment_products
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM seed_lot_treatments slt
    JOIN seed_lots sl ON sl.id = slt.seed_lot_id
    WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update seed_lot_treatment_products" ON public.seed_lot_treatment_products
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM seed_lot_treatments slt
    JOIN seed_lots sl ON sl.id = slt.seed_lot_id
    WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL
  ));

CREATE POLICY "Org members can delete seed_lot_treatment_products" ON public.seed_lot_treatment_products
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM seed_lot_treatments slt
    JOIN seed_lots sl ON sl.id = slt.seed_lot_id
    WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL
  ));
