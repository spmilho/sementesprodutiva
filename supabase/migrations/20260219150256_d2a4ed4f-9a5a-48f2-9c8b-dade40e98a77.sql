
-- Create harvest_plan table
CREATE TABLE public.harvest_plan (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  gleba_id uuid REFERENCES public.pivot_glebas(id),
  cycle_days_used integer NOT NULL,
  target_moisture_pct numeric,
  target_ha_per_day numeric,
  bag_weight_kg numeric NOT NULL DEFAULT 20,
  planting_source text NOT NULL DEFAULT 'planned',
  planting_date_used date,
  planned_harvest_start date,
  planned_harvest_end date,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.harvest_plan ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "rbac_select" ON public.harvest_plan
FOR SELECT USING (
  (deleted_at IS NULL) AND (
    is_admin()
    OR ((org_id = user_org_id()) AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc
      WHERE pc.id = harvest_plan.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_insert" ON public.harvest_plan
FOR INSERT WITH CHECK (
  is_admin()
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_update" ON public.harvest_plan
FOR UPDATE USING (
  (deleted_at IS NULL) AND (
    is_admin()
    OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
  )
) WITH CHECK (
  is_admin()
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
);

-- Add to soft_delete function
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
  ELSIF _table_name = 'harvest_plan' THEN UPDATE public.harvest_plan SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
