
-- Table: water_files
CREATE TABLE public.water_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  file_name text NOT NULL,
  file_type text NOT NULL, -- xlsx, csv, docx, pdf
  content_type text NOT NULL DEFAULT 'other', -- irrigation, rainfall, climate, management, water_balance, pivot_report, other
  description text,
  reference_date date,
  file_url text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  parsed_data jsonb,
  extracted_html text,
  extracted_images text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.water_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_files_select" ON public.water_files FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id());
CREATE POLICY "water_files_insert" ON public.water_files FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());
CREATE POLICY "water_files_update" ON public.water_files FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

-- Table: irrigation_records
CREATE TABLE public.irrigation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  source text NOT NULL DEFAULT 'manual', -- manual, imported
  source_file_id uuid REFERENCES public.water_files(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date,
  depth_mm numeric NOT NULL,
  duration_hours numeric,
  system_type text,
  sector text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.irrigation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "irrigation_records_select" ON public.irrigation_records FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id());
CREATE POLICY "irrigation_records_insert" ON public.irrigation_records FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());
CREATE POLICY "irrigation_records_update" ON public.irrigation_records FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

-- Table: rainfall_records
CREATE TABLE public.rainfall_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  source text NOT NULL DEFAULT 'manual', -- manual, imported
  source_file_id uuid REFERENCES public.water_files(id) ON DELETE SET NULL,
  record_date date NOT NULL,
  precipitation_mm numeric NOT NULL,
  method text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.rainfall_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rainfall_records_select" ON public.rainfall_records FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id());
CREATE POLICY "rainfall_records_insert" ON public.rainfall_records FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());
CREATE POLICY "rainfall_records_update" ON public.rainfall_records FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND org_id = public.user_org_id())
  WITH CHECK (org_id = public.user_org_id());

-- Add soft delete support
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
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
