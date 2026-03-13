
CREATE TABLE public.weather_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  record_date DATE NOT NULL,
  temp_max_c NUMERIC,
  temp_min_c NUMERIC,
  temp_avg_c NUMERIC,
  humidity_max_pct NUMERIC,
  humidity_min_pct NUMERIC,
  humidity_avg_pct NUMERIC,
  wind_max_kmh NUMERIC,
  wind_avg_kmh NUMERIC,
  radiation_mj NUMERIC,
  eto_mm NUMERIC,
  precipitation_mm NUMERIC,
  source TEXT NOT NULL DEFAULT 'imported',
  source_file_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.weather_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weather_records of their org"
  ON public.weather_records FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert weather_records"
  ON public.weather_records FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update weather_records"
  ON public.weather_records FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id());

-- Add to soft_delete_record function
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
  ELSIF _table_name = 'weather_records' THEN UPDATE public.weather_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
