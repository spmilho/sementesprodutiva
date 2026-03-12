
-- New unified crop inputs table
CREATE TABLE public.crop_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  source text NOT NULL DEFAULT 'manual',
  import_file_id uuid,
  group_category text,
  input_type text NOT NULL DEFAULT 'other',
  product_name text NOT NULL,
  active_ingredient text,
  recommendation_date date,
  execution_date date,
  event_type text,
  event_code text,
  qty_recommended numeric,
  qty_applied numeric,
  unit text,
  dose_per_ha numeric,
  status text NOT NULL DEFAULT 'recommended',
  growth_stage_at_application text,
  dap_at_application integer,
  notes text,
  photos text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Import history table
CREATE TABLE public.crop_input_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  file_url text,
  records_total integer NOT NULL DEFAULT 0,
  records_new integer NOT NULL DEFAULT 0,
  records_updated integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid
);

-- Enable RLS
ALTER TABLE public.crop_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_input_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies for crop_inputs
CREATE POLICY "Users can view crop_inputs in their org"
  ON public.crop_inputs FOR SELECT TO authenticated
  USING (org_id = public.user_org_id() OR public.is_admin());

CREATE POLICY "Users can insert crop_inputs in their org"
  ON public.crop_inputs FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id() OR public.is_admin());

CREATE POLICY "Users can update crop_inputs in their org"
  ON public.crop_inputs FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id() OR public.is_admin());

CREATE POLICY "Users can delete crop_inputs in their org"
  ON public.crop_inputs FOR DELETE TO authenticated
  USING (org_id = public.user_org_id() OR public.is_admin());

-- RLS policies for crop_input_imports
CREATE POLICY "Users can view crop_input_imports in their org"
  ON public.crop_input_imports FOR SELECT TO authenticated
  USING (org_id = public.user_org_id() OR public.is_admin());

CREATE POLICY "Users can insert crop_input_imports in their org"
  ON public.crop_input_imports FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id() OR public.is_admin());

-- Add soft_delete support
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
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
