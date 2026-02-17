
-- YIELD ESTIMATES
CREATE TABLE public.yield_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  estimate_number integer NOT NULL DEFAULT 1,
  estimate_date date NOT NULL,
  moisture_reference_pct numeric NOT NULL DEFAULT 13.0,
  default_tgw_g numeric NOT NULL DEFAULT 300,
  dehusking_loss_pct numeric NOT NULL DEFAULT 3.0,
  classification_loss_pct numeric NOT NULL DEFAULT 10.0,
  other_loss_pct numeric NOT NULL DEFAULT 2.0,
  bag_weight_kg numeric NOT NULL DEFAULT 20.0,
  final_pms_g numeric,
  avg_ears_per_ha numeric,
  avg_kernels_per_ear numeric,
  gross_yield_kg_ha numeric,
  net_yield_kg_ha numeric,
  total_production_tons numeric,
  total_production_bags numeric,
  total_sample_points integer DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
ALTER TABLE public.yield_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.yield_estimates AS RESTRICTIVE FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    is_admin()
    OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = yield_estimates.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.yield_estimates AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)) OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role)));
CREATE POLICY "rbac_update" ON public.yield_estimates AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE TRIGGER update_yield_estimates_updated_at BEFORE UPDATE ON public.yield_estimates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- YIELD SAMPLE POINTS
CREATE TABLE public.yield_sample_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yield_estimate_id uuid NOT NULL REFERENCES public.yield_estimates(id) ON DELETE CASCADE,
  point_number text NOT NULL,
  sample_date date,
  sample_time time,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  pivot_position text,
  sample_length_m numeric NOT NULL DEFAULT 5.0,
  row_spacing_cm numeric NOT NULL,
  viable_ears_counted integer NOT NULL,
  discarded_ears_counted integer NOT NULL DEFAULT 0,
  ears_per_ha numeric,
  viable_ears_pct numeric,
  avg_kernels_per_ear numeric,
  kernels_cv_pct numeric,
  sample_moisture_pct numeric NOT NULL,
  sample_tgw_g numeric,
  point_gross_yield_kg_ha numeric,
  plant_condition text,
  photos text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.yield_sample_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.yield_sample_points AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM yield_estimates ye WHERE ye.id = yield_sample_points.yield_estimate_id AND ye.deleted_at IS NULL AND (
    is_admin() OR (ye.org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (SELECT 1 FROM production_cycles pc WHERE pc.id = ye.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL))
  )));
CREATE POLICY "rbac_insert" ON public.yield_sample_points AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM yield_estimates ye WHERE ye.id = yield_sample_points.yield_estimate_id AND (
    is_admin() OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)) OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  )));
CREATE POLICY "rbac_update" ON public.yield_sample_points AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM yield_estimates ye WHERE ye.id = yield_sample_points.yield_estimate_id AND ye.deleted_at IS NULL AND (
    is_admin() OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  )));
CREATE POLICY "rbac_delete" ON public.yield_sample_points AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM yield_estimates ye WHERE ye.id = yield_sample_points.yield_estimate_id AND ye.deleted_at IS NULL AND (
    is_admin() OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  )));

-- YIELD EAR SAMPLES
CREATE TABLE public.yield_ear_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_point_id uuid NOT NULL REFERENCES public.yield_sample_points(id) ON DELETE CASCADE,
  ear_number integer NOT NULL,
  kernel_rows integer NOT NULL,
  kernels_per_row integer NOT NULL,
  total_kernels integer NOT NULL,
  ear_length_cm numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.yield_ear_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.yield_ear_samples AS RESTRICTIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM yield_sample_points ysp JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id AND ye.deleted_at IS NULL AND (
      is_admin() OR (ye.org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
      OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (SELECT 1 FROM production_cycles pc WHERE pc.id = ye.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL))
  )));
CREATE POLICY "rbac_insert" ON public.yield_ear_samples AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM yield_sample_points ysp JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id AND (
      is_admin() OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)) OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  )));
CREATE POLICY "rbac_delete" ON public.yield_ear_samples AS RESTRICTIVE FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM yield_sample_points ysp JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id AND ye.deleted_at IS NULL AND (
      is_admin() OR (ye.org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  )));

-- Update soft_delete_record
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
