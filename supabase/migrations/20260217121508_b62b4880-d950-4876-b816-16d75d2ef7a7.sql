
-- Create nicking_fixed_points table
CREATE TABLE public.nicking_fixed_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  parent_type TEXT NOT NULL, -- 'male_1', 'male_2', 'male_3', 'female'
  plants_monitored INTEGER NOT NULL DEFAULT 10,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  reference_description TEXT,
  photo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.nicking_fixed_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view nicking_fixed_points"
  ON public.nicking_fixed_points FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert nicking_fixed_points"
  ON public.nicking_fixed_points FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update nicking_fixed_points"
  ON public.nicking_fixed_points FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

-- Restructure nicking_observations: drop old columns, add new ones
ALTER TABLE public.nicking_observations
  ADD COLUMN IF NOT EXISTS observation_time TEXT,
  ADD COLUMN IF NOT EXISTS observer_name TEXT,
  ADD COLUMN IF NOT EXISTS temp_max_c DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS temp_min_c DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gdu_accumulated DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS water_stress TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS technical_notes TEXT,
  ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Make latitude/longitude nullable on nicking_observations (now GPS per fixed point)
ALTER TABLE public.nicking_observations ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN longitude DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN latitude SET DEFAULT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN longitude SET DEFAULT NULL;

-- Keep old columns (male_stage, female_stage, etc.) for backward compat but they become optional
ALTER TABLE public.nicking_observations ALTER COLUMN male_stage DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN female_stage DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN pollen_availability DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN synchrony_status DROP NOT NULL;
ALTER TABLE public.nicking_observations ALTER COLUMN silk_reception_pct DROP NOT NULL;

-- Rename synchrony_status to overall_synchrony_status via new column
ALTER TABLE public.nicking_observations ADD COLUMN IF NOT EXISTS overall_synchrony_status TEXT;
-- Copy existing data
UPDATE public.nicking_observations SET overall_synchrony_status = synchrony_status WHERE overall_synchrony_status IS NULL;

-- Create nicking_point_readings table
CREATE TABLE public.nicking_point_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES public.nicking_observations(id) ON DELETE CASCADE,
  fixed_point_id UUID NOT NULL REFERENCES public.nicking_fixed_points(id),
  parent_type TEXT NOT NULL,
  -- Male fields
  male_anthers_exposed_pct DOUBLE PRECISION,
  male_pollen_release_pct DOUBLE PRECISION,
  male_pollen_intensity TEXT, -- none, low, medium, high
  male_tassel_stage TEXT, -- vegetative, vt_visible, anthesis_start, anthesis_50pct, anthesis_peak, anthesis_decline, anthesis_end, tassel_dry
  -- Female fields
  female_silk_visible_pct DOUBLE PRECISION,
  female_silk_receptive_pct DOUBLE PRECISION,
  female_pollination_evidence TEXT, -- none, low, moderate, good
  female_silk_stage TEXT, -- pre_silking, silk_start, silk_50pct, silk_full, silk_receptive, silk_browning, silk_dry
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nicking_point_readings ENABLE ROW LEVEL SECURITY;

-- RLS via observation's org_id
CREATE POLICY "Org members can view nicking_point_readings"
  ON public.nicking_point_readings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nicking_observations o
    WHERE o.id = observation_id AND o.org_id = user_org_id() AND o.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert nicking_point_readings"
  ON public.nicking_point_readings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nicking_observations o
    WHERE o.id = observation_id AND o.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update nicking_point_readings"
  ON public.nicking_point_readings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.nicking_observations o
    WHERE o.id = observation_id AND o.org_id = user_org_id() AND o.deleted_at IS NULL
  ));

-- Create nicking_milestones table
CREATE TABLE public.nicking_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  fixed_point_id UUID NOT NULL REFERENCES public.nicking_fixed_points(id),
  parent_type TEXT NOT NULL,
  -- Male milestones
  anthesis_start_date DATE,
  anthesis_50pct_date DATE,
  anthesis_end_date DATE,
  -- Female milestones
  silk_start_date DATE,
  silk_50pct_date DATE,
  silk_end_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, fixed_point_id)
);

ALTER TABLE public.nicking_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view nicking_milestones"
  ON public.nicking_milestones FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.nicking_fixed_points fp
    WHERE fp.id = fixed_point_id AND fp.org_id = user_org_id() AND fp.deleted_at IS NULL
  ));

CREATE POLICY "Org members can insert nicking_milestones"
  ON public.nicking_milestones FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nicking_fixed_points fp
    WHERE fp.id = fixed_point_id AND fp.org_id = user_org_id()
  ));

CREATE POLICY "Org members can update nicking_milestones"
  ON public.nicking_milestones FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.nicking_fixed_points fp
    WHERE fp.id = fixed_point_id AND fp.org_id = user_org_id() AND fp.deleted_at IS NULL
  ));
