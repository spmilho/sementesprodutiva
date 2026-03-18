
-- =============================================
-- TABELA 1: roguing_evaluations (avaliações)
-- =============================================
CREATE TABLE public.roguing_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  evaluation_date date NOT NULL DEFAULT CURRENT_DATE,
  evaluator_name text,
  growth_stage text,
  dap integer,
  parent_evaluated text NOT NULL DEFAULT 'both',
  gleba_id uuid,
  area_covered_ha numeric,
  gps_latitude numeric,
  gps_longitude numeric,
  -- Voluntárias
  has_volunteers boolean NOT NULL DEFAULT false,
  volunteers_frequency text,
  volunteers_location text,
  volunteers_parent text,
  volunteers_identification text,
  volunteers_notes text,
  volunteers_photos text[],
  -- Off-type
  has_offtype boolean NOT NULL DEFAULT false,
  offtype_types text[],
  offtype_frequency text,
  offtype_location text,
  offtype_parent text,
  offtype_notes text,
  offtype_photos text[],
  -- Doentes
  has_diseased boolean NOT NULL DEFAULT false,
  diseased_types text[],
  diseased_frequency text,
  diseased_parent text,
  diseased_notes text,
  diseased_photos text[],
  -- Fêmea no macho
  has_female_in_male boolean NOT NULL DEFAULT false,
  female_in_male_type text,
  female_in_male_frequency text,
  female_in_male_location text,
  female_in_male_notes text,
  female_in_male_photos text[],
  -- Conclusão
  overall_condition text NOT NULL DEFAULT 'clean',
  auto_conclusion text NOT NULL DEFAULT 'clean',
  auto_conclusion_message text,
  general_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.roguing_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.roguing_evaluations
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin() OR org_id = user_org_id()
  )
);

CREATE POLICY "rbac_insert" ON public.roguing_evaluations
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);

CREATE POLICY "rbac_update" ON public.roguing_evaluations
FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)))
)
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
);

-- =============================================
-- TABELA 2: roguing_requests (solicitações)
-- =============================================
CREATE TABLE public.roguing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  evaluation_id uuid REFERENCES public.roguing_evaluations(id),
  request_number integer NOT NULL DEFAULT 1,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  priority text NOT NULL DEFAULT 'recommended',
  parent_target text NOT NULL DEFAULT 'both',
  gleba_id uuid,
  growth_stage text,
  occurrence_types text[],
  occurrence_summary text,
  status text NOT NULL DEFAULT 'pending',
  execution_date date,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.roguing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.roguing_requests
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR org_id = user_org_id())
);

CREATE POLICY "rbac_insert" ON public.roguing_requests
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);

CREATE POLICY "rbac_update" ON public.roguing_requests
FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role))))
)
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);

-- =============================================
-- TABELA 3: roguing_executions (execuções)
-- =============================================
CREATE TABLE public.roguing_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  request_id uuid NOT NULL REFERENCES public.roguing_requests(id),
  execution_date date NOT NULL DEFAULT CURRENT_DATE,
  team_size integer,
  hours_spent numeric,
  area_covered_ha numeric,
  volunteers_removed integer NOT NULL DEFAULT 0,
  offtype_removed integer NOT NULL DEFAULT 0,
  diseased_removed integer NOT NULL DEFAULT 0,
  female_in_male_removed integer NOT NULL DEFAULT 0,
  total_plants_removed integer NOT NULL DEFAULT 0,
  efficacy text NOT NULL DEFAULT 'complete',
  needs_followup text NOT NULL DEFAULT 'no',
  followup_days integer,
  result_notes text,
  photos_post text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.roguing_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.roguing_executions
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR org_id = user_org_id())
);

CREATE POLICY "rbac_insert" ON public.roguing_executions
FOR INSERT TO authenticated
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);

CREATE POLICY "rbac_update" ON public.roguing_executions
FOR UPDATE TO authenticated
USING (
  deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role))))
)
WITH CHECK (
  is_admin() OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);

-- Add roguing tables to soft_delete_record function
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
  IF _table_name = 'contratos' THEN UPDATE public.contratos SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'inspection_imports' THEN UPDATE public.inspection_imports SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
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
  ELSIF _table_name = 'roguing_evaluations' THEN UPDATE public.roguing_evaluations SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'roguing_requests' THEN UPDATE public.roguing_requests SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'roguing_executions' THEN UPDATE public.roguing_executions SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'chemical_applications' THEN UPDATE public.chemical_applications SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pest_disease_records' THEN UPDATE public.pest_disease_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'yield_estimates' THEN UPDATE public.yield_estimates SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'moisture_samples' THEN UPDATE public.moisture_samples SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pivot_glebas' THEN UPDATE public.pivot_glebas SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'harvest_plan' THEN UPDATE public.harvest_plan SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'harvest_records' THEN UPDATE public.harvest_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'attachments' THEN UPDATE public.attachments SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'stand_counts' THEN UPDATE public.stand_counts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'ndvi_polygons' THEN UPDATE public.ndvi_polygons SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'water_files' THEN UPDATE public.water_files SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'irrigation_records' THEN UPDATE public.irrigation_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'rainfall_records' THEN UPDATE public.rainfall_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'crop_inputs' THEN UPDATE public.crop_inputs SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'crop_input_imports' THEN UPDATE public.crop_input_imports SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'weather_records' THEN UPDATE public.weather_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'field_visits' THEN UPDATE public.field_visits SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'field_visit_scores' THEN UPDATE public.field_visit_scores SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'field_visit_photos' THEN UPDATE public.field_visit_photos SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'plano_acoes' THEN UPDATE public.plano_acoes SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'plano_acoes_comentarios' THEN UPDATE public.plano_acoes_comentarios SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'feed_posts' THEN UPDATE public.feed_posts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'yield_sample_points' THEN UPDATE public.yield_sample_points SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'planting_cv_points' THEN UPDATE public.planting_cv_points SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
