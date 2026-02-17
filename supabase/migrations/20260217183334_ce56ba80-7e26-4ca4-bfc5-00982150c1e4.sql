
CREATE TABLE public.roguing_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  observation_date date NOT NULL,
  off_type text NOT NULL,
  affected_parent text NOT NULL,
  description text NOT NULL,
  affected_area_m2 numeric NULL,
  plants_removed integer NOT NULL,
  corrective_action text NULL,
  growth_stage text NULL,
  photos text[] NULL,
  gps_latitude numeric NULL,
  gps_longitude numeric NULL,
  notes text NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL
);

ALTER TABLE public.roguing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.roguing_records
  AS RESTRICTIVE FOR SELECT USING (
    deleted_at IS NULL AND (
      is_admin()
      OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
      OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
        SELECT 1 FROM production_cycles pc
        WHERE pc.id = roguing_records.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
      ))
    )
  );

CREATE POLICY "rbac_insert" ON public.roguing_records
  AS RESTRICTIVE FOR INSERT WITH CHECK (
    is_admin()
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
    OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  );

CREATE POLICY "rbac_update" ON public.roguing_records
  AS RESTRICTIVE FOR UPDATE
  USING (deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$$;

CREATE TRIGGER update_roguing_records_updated_at
  BEFORE UPDATE ON public.roguing_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
