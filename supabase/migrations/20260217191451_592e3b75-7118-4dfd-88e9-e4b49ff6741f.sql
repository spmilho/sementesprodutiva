
-- ================================================
-- TABLE: pivot_glebas (subdivisions of a pivot)
-- ================================================
CREATE TABLE public.pivot_glebas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  area_ha NUMERIC,
  parent_type TEXT NOT NULL DEFAULT 'female',
  planting_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.pivot_glebas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.pivot_glebas AS RESTRICTIVE FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
      OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
        SELECT 1 FROM production_cycles pc WHERE pc.id = pivot_glebas.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
      ))
    )
  );

CREATE POLICY "rbac_insert" ON public.pivot_glebas AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    is_admin()
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  );

CREATE POLICY "rbac_update" ON public.pivot_glebas AS RESTRICTIVE FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
    )
  )
  WITH CHECK (
    is_admin()
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  );

CREATE TRIGGER update_pivot_glebas_updated_at
  BEFORE UPDATE ON public.pivot_glebas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- TABLE: moisture_samples
-- ================================================
CREATE TABLE public.moisture_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  gleba_id UUID REFERENCES public.pivot_glebas(id),
  point_identifier TEXT,
  sample_date DATE NOT NULL,
  sample_time TIME NOT NULL,
  moisture_pct NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'portable_digital',
  grain_temperature_c NUMERIC,
  field_position TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  photos TEXT[],
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.moisture_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.moisture_samples AS RESTRICTIVE FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
      OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
        SELECT 1 FROM production_cycles pc WHERE pc.id = moisture_samples.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
      ))
    )
  );

CREATE POLICY "rbac_insert" ON public.moisture_samples AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    is_admin()
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  );

CREATE POLICY "rbac_update" ON public.moisture_samples AS RESTRICTIVE FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_admin()
      OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
    )
  )
  WITH CHECK (
    is_admin()
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  );

CREATE INDEX idx_moisture_gleba ON public.moisture_samples(cycle_id, gleba_id);
CREATE INDEX idx_moisture_date ON public.moisture_samples(cycle_id, sample_date);

-- Update soft_delete_record to support new tables
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_admin() OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: admin or manager role required';
  END IF;
  IF _table_name = 'inspection_imports' THEN UPDATE public.inspection_imports SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'nicking_observations' THEN UPDATE public.nicking_observations SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'nicking_fixed_points' THEN UPDATE public.nicking_fixed_points SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'phenology_records' THEN UPDATE public.phenology_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'fertilization_records' THEN UPDATE public.fertilization_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'emergence_counts' THEN UPDATE public.emergence_counts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'planting_plan' THEN UPDATE public.planting_plan SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'planting_actual' THEN UPDATE public.planting_actual SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'production_cycles' THEN UPDATE public.production_cycles SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'seed_lots' THEN UPDATE public.seed_lots SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'seed_lot_treatments' THEN UPDATE public.seed_lot_treatments SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'client_contacts' THEN UPDATE public.client_contacts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'clients' THEN UPDATE public.clients SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'cooperators' THEN UPDATE public.cooperators SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'farms' THEN UPDATE public.farms SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pivots' THEN UPDATE public.pivots SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'detasseling_records' THEN UPDATE public.detasseling_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'roguing_records' THEN UPDATE public.roguing_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'chemical_applications' THEN UPDATE public.chemical_applications SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pest_disease_records' THEN UPDATE public.pest_disease_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'yield_estimates' THEN UPDATE public.yield_estimates SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'moisture_samples' THEN UPDATE public.moisture_samples SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pivot_glebas' THEN UPDATE public.pivot_glebas SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
