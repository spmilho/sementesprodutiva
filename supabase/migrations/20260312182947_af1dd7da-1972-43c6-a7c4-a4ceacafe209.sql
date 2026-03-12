
CREATE TABLE public.ndvi_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL,
  ndvi_value NUMERIC(6,4),
  growth_stage TEXT,
  dap INTEGER,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  filter_start_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ndvi_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org analyses"
  ON public.ndvi_analyses FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org analyses"
  ON public.ndvi_analyses FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
