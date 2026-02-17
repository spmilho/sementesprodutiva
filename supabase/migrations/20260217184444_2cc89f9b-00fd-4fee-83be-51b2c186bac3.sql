
CREATE TABLE public.pest_disease_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  created_by UUID,
  observation_date DATE NOT NULL,
  pest_name TEXT NOT NULL,
  pest_type TEXT NOT NULL,
  incidence_pct NUMERIC,
  severity TEXT NOT NULL DEFAULT 'Baixa',
  severity_score INTEGER NOT NULL DEFAULT 1,
  growth_stage TEXT,
  affected_parent TEXT NOT NULL DEFAULT 'Ambos',
  affected_area_ha NUMERIC,
  action_taken TEXT,
  economic_damage_reached BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  photos TEXT[],
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pest_disease_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.pest_disease_records FOR SELECT USING (
  deleted_at IS NULL AND (
    is_admin()
    OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = pest_disease_records.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_insert" ON public.pest_disease_records FOR INSERT WITH CHECK (
  is_admin()
  OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_update" ON public.pest_disease_records FOR UPDATE
  USING (deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE TRIGGER update_pest_disease_records_updated_at
  BEFORE UPDATE ON public.pest_disease_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update soft_delete_record
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
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
