
-- Create production_cycles table
CREATE TABLE public.production_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  farm_id UUID NOT NULL REFERENCES public.farms(id),
  field_name TEXT NOT NULL,
  season TEXT NOT NULL,
  hybrid_name TEXT NOT NULL,
  female_line TEXT NOT NULL,
  male_line TEXT NOT NULL,
  total_area DOUBLE PRECISION NOT NULL,
  female_male_ratio TEXT NOT NULL DEFAULT '4F:2M',
  female_area DOUBLE PRECISION NOT NULL,
  male_area DOUBLE PRECISION NOT NULL,
  irrigation_system TEXT NOT NULL DEFAULT 'Pivô Central',
  pivot_area DOUBLE PRECISION,
  material_cycle_days INTEGER,
  expected_productivity DOUBLE PRECISION,
  expected_production DOUBLE PRECISION,
  target_moisture DOUBLE PRECISION DEFAULT 18,
  isolation_distance DOUBLE PRECISION DEFAULT 300,
  temporal_isolation_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'planning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.production_cycles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org members can view cycles"
  ON public.production_cycles FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert cycles"
  ON public.production_cycles FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update cycles"
  ON public.production_cycles FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

-- Updated_at trigger
CREATE TRIGGER update_production_cycles_updated_at
  BEFORE UPDATE ON public.production_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
