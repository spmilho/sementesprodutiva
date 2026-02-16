
-- Create table for actual planting records
CREATE TABLE public.planting_actual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  planting_plan_id UUID REFERENCES public.planting_plan(id),
  planting_date DATE NOT NULL,
  type TEXT NOT NULL,
  actual_area DOUBLE PRECISION NOT NULL,
  seeds_per_meter DOUBLE PRECISION,
  row_spacing INTEGER,
  planter_speed DOUBLE PRECISION,
  cv_percent DOUBLE PRECISION,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.planting_actual ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view planting_actual"
  ON public.planting_actual FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert planting_actual"
  ON public.planting_actual FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update planting_actual"
  ON public.planting_actual FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

-- Updated_at trigger
CREATE TRIGGER update_planting_actual_updated_at
  BEFORE UPDATE ON public.planting_actual
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
