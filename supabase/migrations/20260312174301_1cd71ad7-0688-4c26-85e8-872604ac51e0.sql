CREATE TABLE public.planting_cv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  type TEXT NOT NULL CHECK (type IN ('female', 'male_1', 'male_2')),
  cv_percent NUMERIC NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(cycle_id, type, deleted_at)
);

ALTER TABLE public.planting_cv_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read planting_cv_records"
  ON public.planting_cv_records FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can insert planting_cv_records"
  ON public.planting_cv_records FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update planting_cv_records"
  ON public.planting_cv_records FOR UPDATE TO authenticated
  USING (true);
