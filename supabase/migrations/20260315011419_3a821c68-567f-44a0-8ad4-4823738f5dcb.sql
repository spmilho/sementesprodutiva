
-- Add deleted_at to tables that don't have it yet but use hard deletes
ALTER TABLE public.field_visits ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.field_visit_scores ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.field_visit_photos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.plano_acoes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.plano_acoes_comentarios ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.feed_user_permissions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.yield_sample_points ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.yield_ear_samples ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.planting_cv_points ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.stand_count_points ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.seed_treatment_products ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;
ALTER TABLE public.cycle_team ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- Create cascade soft delete function for production cycles
CREATE OR REPLACE FUNCTION public.soft_delete_cycle_cascade(_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_admin()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Soft delete the cycle itself
  UPDATE public.production_cycles SET deleted_at = now() WHERE id = _cycle_id AND deleted_at IS NULL;

  -- Soft delete all child tables
  UPDATE public.planting_plan SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.planting_actual SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.emergence_counts SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.phenology_records SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.chemical_applications SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.fertilization_records SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.detasseling_records SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.pest_disease_records SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.crop_inputs SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.harvest_plan SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.harvest_records SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.moisture_samples SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.ndvi_polygons SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.attachments SET deleted_at = now() WHERE entity_id = _cycle_id::text AND deleted_at IS NULL;
  UPDATE public.yield_estimates SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;
  UPDATE public.field_visits SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;

  -- Child-of-child tables
  UPDATE public.stand_count_points SET deleted_at = now() WHERE stand_count_id IN (
    SELECT id FROM public.stand_counts WHERE cycle_id = _cycle_id
  ) AND deleted_at IS NULL;
  UPDATE public.stand_counts SET deleted_at = now() WHERE cycle_id = _cycle_id AND deleted_at IS NULL;

  UPDATE public.yield_sample_points SET deleted_at = now() WHERE yield_estimate_id IN (
    SELECT id FROM public.yield_estimates WHERE cycle_id = _cycle_id
  ) AND deleted_at IS NULL;
  UPDATE public.yield_ear_samples SET deleted_at = now() WHERE sample_point_id IN (
    SELECT ysp.id FROM public.yield_sample_points ysp
    JOIN public.yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ye.cycle_id = _cycle_id
  ) AND deleted_at IS NULL;

  UPDATE public.field_visit_scores SET deleted_at = now() WHERE visit_id IN (
    SELECT id FROM public.field_visits WHERE cycle_id = _cycle_id
  ) AND deleted_at IS NULL;
  UPDATE public.field_visit_photos SET deleted_at = now() WHERE visit_id IN (
    SELECT id FROM public.field_visits WHERE cycle_id = _cycle_id
  ) AND deleted_at IS NULL;

  UPDATE public.planting_cv_points SET deleted_at = now() WHERE planting_actual_id IN (
    SELECT id FROM public.planting_actual WHERE cycle_id = _cycle_id
  ) AND deleted_at IS NULL;
END;
$$;

-- Create restore cycle function
CREATE OR REPLACE FUNCTION public.restore_cycle(_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_admin()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.production_cycles SET deleted_at = NULL WHERE id = _cycle_id;
  UPDATE public.planting_plan SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.planting_actual SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.emergence_counts SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.phenology_records SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.chemical_applications SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.fertilization_records SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.detasseling_records SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.pest_disease_records SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.crop_inputs SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.harvest_plan SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.harvest_records SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.moisture_samples SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.ndvi_polygons SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.attachments SET deleted_at = NULL WHERE entity_id = _cycle_id::text;
  UPDATE public.yield_estimates SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.field_visits SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.stand_counts SET deleted_at = NULL WHERE cycle_id = _cycle_id;
  UPDATE public.stand_count_points SET deleted_at = NULL WHERE stand_count_id IN (
    SELECT id FROM public.stand_counts WHERE cycle_id = _cycle_id
  );
  UPDATE public.yield_sample_points SET deleted_at = NULL WHERE yield_estimate_id IN (
    SELECT id FROM public.yield_estimates WHERE cycle_id = _cycle_id
  );
  UPDATE public.yield_ear_samples SET deleted_at = NULL WHERE sample_point_id IN (
    SELECT ysp.id FROM public.yield_sample_points ysp
    JOIN public.yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ye.cycle_id = _cycle_id
  );
  UPDATE public.field_visit_scores SET deleted_at = NULL WHERE visit_id IN (
    SELECT id FROM public.field_visits WHERE cycle_id = _cycle_id
  );
  UPDATE public.field_visit_photos SET deleted_at = NULL WHERE visit_id IN (
    SELECT id FROM public.field_visits WHERE cycle_id = _cycle_id
  );
  UPDATE public.planting_cv_points SET deleted_at = NULL WHERE planting_actual_id IN (
    SELECT id FROM public.planting_actual WHERE cycle_id = _cycle_id
  );
END;
$$;

-- Update soft_delete_record to support new tables
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
