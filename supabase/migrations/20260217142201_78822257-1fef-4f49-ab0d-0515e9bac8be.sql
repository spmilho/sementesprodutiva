
-- Table: inspection_imports
CREATE TABLE public.inspection_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  file_name TEXT NOT NULL,
  file_url TEXT,
  field_code TEXT,
  hybrid_name TEXT,
  endosperm TEXT,
  isolation TEXT,
  technician TEXT,
  leader TEXT,
  area_ha NUMERIC,
  total_inspections INTEGER NOT NULL DEFAULT 0,
  imported_by UUID,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.inspection_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspection_imports" ON public.inspection_imports FOR SELECT USING (org_id = user_org_id() AND deleted_at IS NULL);
CREATE POLICY "Org members can insert inspection_imports" ON public.inspection_imports FOR INSERT WITH CHECK (org_id = user_org_id());
CREATE POLICY "Org members can update inspection_imports" ON public.inspection_imports FOR UPDATE USING (org_id = user_org_id() AND deleted_at IS NULL);

-- Table: inspection_data
CREATE TABLE public.inspection_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.inspection_imports(id) ON DELETE CASCADE,
  inspection_number INTEGER NOT NULL,
  inspection_date DATE,
  inspection_time TIME,
  inspector_name TEXT,
  pct_detasseled NUMERIC,
  pct_stigma_receptive NUMERIC,
  pct_female_pollinating NUMERIC,
  pct_male1_pollinating NUMERIC,
  pct_male2_pollinating NUMERIC,
  pct_male3_pollinating NUMERIC,
  pf_stigma_receptive NUMERIC,
  pf_male1_pollinating NUMERIC,
  pf_male2_pollinating NUMERIC,
  pf_male3_pollinating NUMERIC,
  pct_normal_pollinating NUMERIC,
  pct_short_pollinating NUMERIC,
  pct_pse_pollinating NUMERIC,
  pct_stump_pollinating NUMERIC,
  pct_rogue_female NUMERIC,
  pct_rogue_male NUMERIC,
  pct_volunteer_female NUMERIC,
  pct_volunteer_male NUMERIC,
  total_atypical_pollinating NUMERIC,
  observations TEXT,
  weather TEXT,
  temperature TEXT,
  wind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspection_data" ON public.inspection_data FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id() AND ii.deleted_at IS NULL)
);
CREATE POLICY "Org members can insert inspection_data" ON public.inspection_data FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id())
);
CREATE POLICY "Org members can delete inspection_data" ON public.inspection_data FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id())
);

-- Table: inspection_counting_points
CREATE TABLE public.inspection_counting_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_data_id UUID NOT NULL REFERENCES public.inspection_data(id) ON DELETE CASCADE,
  point_number INTEGER NOT NULL,
  detasseled_count INTEGER,
  stigma_receptive_count INTEGER,
  male1_count INTEGER,
  male2_count INTEGER,
  male3_count INTEGER,
  normal_pol INTEGER,
  normal_not_pol INTEGER,
  short_pol INTEGER,
  short_not_pol INTEGER,
  pse_pol INTEGER,
  pse_not_pol INTEGER,
  stump_pol INTEGER,
  stump_not_pol INTEGER,
  rogue_male_pol INTEGER,
  rogue_male_not_pol INTEGER,
  rogue_female_pol INTEGER,
  rogue_female_not_pol INTEGER,
  volunteer_male_pol INTEGER,
  volunteer_male_not_pol INTEGER,
  volunteer_female_pol INTEGER,
  volunteer_female_not_pol INTEGER,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.inspection_counting_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspection_counting_points" ON public.inspection_counting_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.inspection_data id2 JOIN public.inspection_imports ii ON ii.id = id2.import_id WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id() AND ii.deleted_at IS NULL)
);
CREATE POLICY "Org members can insert inspection_counting_points" ON public.inspection_counting_points FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.inspection_data id2 JOIN public.inspection_imports ii ON ii.id = id2.import_id WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id())
);
CREATE POLICY "Org members can delete inspection_counting_points" ON public.inspection_counting_points FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.inspection_data id2 JOIN public.inspection_imports ii ON ii.id = id2.import_id WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id())
);
