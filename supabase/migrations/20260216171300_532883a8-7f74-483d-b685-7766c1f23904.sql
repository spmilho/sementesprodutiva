
CREATE TABLE public.planting_plan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  planned_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('male', 'female')),
  planned_area DOUBLE PRECISION NOT NULL,
  target_population INTEGER NOT NULL DEFAULT 62000,
  germination_rate DOUBLE PRECISION NOT NULL DEFAULT 92,
  row_spacing INTEGER NOT NULL DEFAULT 70,
  seeds_per_meter DOUBLE PRECISION NOT NULL,
  planting_order INTEGER NOT NULL DEFAULT 1,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.planting_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view planting_plan"
  ON public.planting_plan FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert planting_plan"
  ON public.planting_plan FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update planting_plan"
  ON public.planting_plan FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_planting_plan_updated_at
  BEFORE UPDATE ON public.planting_plan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add finalization flags to production_cycles
ALTER TABLE public.production_cycles
  ADD COLUMN male_planting_finished BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN female_planting_finished BOOLEAN NOT NULL DEFAULT false;
