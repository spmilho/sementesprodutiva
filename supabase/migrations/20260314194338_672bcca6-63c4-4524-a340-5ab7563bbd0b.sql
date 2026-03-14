
CREATE TABLE public.stand_cv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  type TEXT NOT NULL, -- female, male_1, male_2
  cv_percent NUMERIC NOT NULL,
  photo_url TEXT,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(cycle_id, type, deleted_at)
);

ALTER TABLE public.stand_cv_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stand_cv_records in their org"
  ON public.stand_cv_records FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert stand_cv_records in their org"
  ON public.stand_cv_records FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update stand_cv_records in their org"
  ON public.stand_cv_records FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
