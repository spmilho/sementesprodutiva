
CREATE TABLE public.nicking_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  observation_date DATE NOT NULL,
  male_stage TEXT NOT NULL,
  female_stage TEXT NOT NULL,
  silk_reception_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  pollen_availability TEXT NOT NULL,
  synchrony_status TEXT NOT NULL,
  action_taken TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.nicking_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view nicking_observations"
  ON public.nicking_observations FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert nicking_observations"
  ON public.nicking_observations FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update nicking_observations"
  ON public.nicking_observations FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_nicking_observations_updated_at
  BEFORE UPDATE ON public.nicking_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
