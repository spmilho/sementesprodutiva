
-- Tabela de registros de adubação
CREATE TABLE public.fertilization_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  application_date DATE NOT NULL,
  fertilization_type TEXT NOT NULL,
  growth_stage TEXT,
  target_parent TEXT,
  area_applied_ha NUMERIC NOT NULL,
  application_method TEXT,
  product_name TEXT NOT NULL,
  formulation_n_pct NUMERIC DEFAULT 0,
  formulation_p_pct NUMERIC DEFAULT 0,
  formulation_k_pct NUMERIC DEFAULT 0,
  dose_per_ha NUMERIC NOT NULL,
  dose_unit TEXT DEFAULT 'kg/ha',
  n_supplied_kg_ha NUMERIC,
  p2o5_supplied_kg_ha NUMERIC,
  k2o_supplied_kg_ha NUMERIC,
  s_kg_ha NUMERIC,
  ca_kg_ha NUMERIC,
  mg_kg_ha NUMERIC,
  zn_kg_ha NUMERIC,
  b_kg_ha NUMERIC,
  mn_kg_ha NUMERIC,
  cu_kg_ha NUMERIC,
  fe_kg_ha NUMERIC,
  mo_kg_ha NUMERIC,
  co_kg_ha NUMERIC,
  si_kg_ha NUMERIC,
  micro_unit TEXT DEFAULT 'kg/ha',
  foliar_spray_volume NUMERIC,
  foliar_product_detail TEXT,
  foliar_mixed_with_pesticide BOOLEAN,
  foliar_pesticide_name TEXT,
  foliar_application_time TIME,
  responsible_person TEXT,
  equipment_used TEXT,
  conditions TEXT,
  photos TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.fertilization_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view fertilization_records"
  ON public.fertilization_records FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert fertilization_records"
  ON public.fertilization_records FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update fertilization_records"
  ON public.fertilization_records FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_fertilization_records_updated_at
  BEFORE UPDATE ON public.fertilization_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de metas nutricionais
CREATE TABLE public.nutrition_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) UNIQUE,
  n_target NUMERIC NOT NULL DEFAULT 150,
  p2o5_target NUMERIC NOT NULL DEFAULT 80,
  k2o_target NUMERIC NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view nutrition_targets"
  ON public.nutrition_targets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.production_cycles pc
    WHERE pc.id = nutrition_targets.cycle_id
    AND pc.org_id = user_org_id()
    AND pc.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert nutrition_targets"
  ON public.nutrition_targets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.production_cycles pc
    WHERE pc.id = nutrition_targets.cycle_id
    AND pc.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update nutrition_targets"
  ON public.nutrition_targets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.production_cycles pc
    WHERE pc.id = nutrition_targets.cycle_id
    AND pc.org_id = user_org_id()
    AND pc.deleted_at IS NULL
  ));

CREATE TRIGGER update_nutrition_targets_updated_at
  BEFORE UPDATE ON public.nutrition_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
