
-- ═══════════════════════════════════════════════════════════
-- Add columns to planting_plan
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.planting_plan ADD COLUMN IF NOT EXISTS seed_lot_id uuid REFERENCES public.seed_lots(id);

-- ═══════════════════════════════════════════════════════════
-- Add columns to planting_actual
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS seed_lot_id uuid REFERENCES public.seed_lots(id);
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS gleba_id uuid REFERENCES public.pivot_glebas(id);
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS seeds_per_meter_actual double precision;
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS sowing_depth_cm double precision;
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS soil_condition text;
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS gps_latitude double precision;
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS gps_longitude double precision;
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS photos text[];
ALTER TABLE public.planting_actual ADD COLUMN IF NOT EXISTS created_by uuid;

-- ═══════════════════════════════════════════════════════════
-- Create planting_cv_points (seed distribution measurement points)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.planting_cv_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_actual_id uuid NOT NULL REFERENCES public.planting_actual(id) ON DELETE CASCADE,
  point_number integer NOT NULL,
  seeds_counted numeric NOT NULL,
  sample_length_m numeric NOT NULL DEFAULT 1.0,
  seeds_per_meter numeric GENERATED ALWAYS AS (seeds_counted / NULLIF(sample_length_m, 0)) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.planting_cv_points ENABLE ROW LEVEL SECURITY;

-- RLS via parent planting_actual
CREATE POLICY "rbac_select" ON public.planting_cv_points FOR SELECT TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM planting_actual pa
      WHERE pa.id = planting_cv_points.planting_actual_id
        AND pa.org_id = user_org_id()
        AND pa.deleted_at IS NULL
        AND NOT has_role(auth.uid(), 'client'::app_role)
    ) OR
    (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM planting_actual pa
      JOIN production_cycles pc ON pc.id = pa.cycle_id
      WHERE pa.id = planting_cv_points.planting_actual_id
        AND pc.client_id = user_client_id()
        AND pa.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );

CREATE POLICY "rbac_insert" ON public.planting_cv_points FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM planting_actual pa
      WHERE pa.id = planting_cv_points.planting_actual_id
        AND pa.org_id = user_org_id()
        AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role))
    )
  );

CREATE POLICY "rbac_update" ON public.planting_cv_points FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM planting_actual pa
      WHERE pa.id = planting_cv_points.planting_actual_id
        AND pa.org_id = user_org_id()
        AND has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "rbac_delete" ON public.planting_cv_points FOR DELETE TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM planting_actual pa
      WHERE pa.id = planting_cv_points.planting_actual_id
        AND pa.org_id = user_org_id()
        AND has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Create stand_counts (emergence/stand count headers)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.stand_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  count_date date NOT NULL,
  count_type text NOT NULL DEFAULT 'emergence',
  parent_type text NOT NULL,
  gleba_id uuid REFERENCES public.pivot_glebas(id),
  row_spacing_cm numeric NOT NULL DEFAULT 70,
  days_after_planting integer,
  avg_plants_per_meter numeric,
  avg_plants_per_ha numeric,
  std_plants_per_ha numeric,
  cv_stand_pct numeric,
  planned_population_ha numeric,
  emergence_pct numeric,
  photos text[],
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

ALTER TABLE public.stand_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.stand_counts FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      is_admin() OR
      (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role)) OR
      (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
        SELECT 1 FROM production_cycles pc
        WHERE pc.id = stand_counts.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
      ))
    )
  );

CREATE POLICY "rbac_insert" ON public.stand_counts FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR
    (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)) OR
    (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
  );

CREATE POLICY "rbac_update" ON public.stand_counts FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

-- ═══════════════════════════════════════════════════════════
-- Create stand_count_points (individual count points)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE public.stand_count_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stand_count_id uuid NOT NULL REFERENCES public.stand_counts(id) ON DELETE CASCADE,
  point_number integer NOT NULL,
  plants_counted integer NOT NULL,
  sample_length_m numeric NOT NULL DEFAULT 5.0,
  plants_per_meter numeric GENERATED ALWAYS AS (plants_counted::numeric / NULLIF(sample_length_m, 0)) STORED,
  row_spacing_cm numeric NOT NULL DEFAULT 70,
  plants_per_ha numeric GENERATED ALWAYS AS (
    (plants_counted::numeric / NULLIF(sample_length_m, 0)) * (10000.0 / NULLIF(row_spacing_cm / 100.0, 0))
  ) STORED,
  gps_latitude numeric,
  gps_longitude numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stand_count_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.stand_count_points FOR SELECT TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM stand_counts sc
      WHERE sc.id = stand_count_points.stand_count_id
        AND sc.org_id = user_org_id()
        AND sc.deleted_at IS NULL
        AND NOT has_role(auth.uid(), 'client'::app_role)
    ) OR
    (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM stand_counts sc
      JOIN production_cycles pc ON pc.id = sc.cycle_id
      WHERE sc.id = stand_count_points.stand_count_id
        AND pc.client_id = user_client_id()
        AND sc.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );

CREATE POLICY "rbac_insert" ON public.stand_count_points FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM stand_counts sc
      WHERE sc.id = stand_count_points.stand_count_id
        AND sc.org_id = user_org_id()
        AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role))
    )
  );

CREATE POLICY "rbac_update" ON public.stand_count_points FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM stand_counts sc
      WHERE sc.id = stand_count_points.stand_count_id
        AND sc.org_id = user_org_id()
        AND has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "rbac_delete" ON public.stand_count_points FOR DELETE TO authenticated
  USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM stand_counts sc
      WHERE sc.id = stand_count_points.stand_count_id
        AND sc.org_id = user_org_id()
        AND has_role(auth.uid(), 'manager'::app_role)
    )
  );

-- ═══════════════════════════════════════════════════════════
-- Update soft_delete_record to include stand_counts
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  ELSIF _table_name = 'harvest_records' THEN UPDATE public.harvest_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'attachments' THEN UPDATE public.attachments SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'stand_counts' THEN UPDATE public.stand_counts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$$;
