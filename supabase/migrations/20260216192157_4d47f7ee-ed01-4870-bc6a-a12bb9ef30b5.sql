
CREATE TABLE public.emergence_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  count_date DATE NOT NULL,
  type TEXT NOT NULL,
  sample_point TEXT NOT NULL,
  line_length DOUBLE PRECISION NOT NULL DEFAULT 10,
  plant_count INTEGER NOT NULL,
  plants_per_meter DOUBLE PRECISION NOT NULL,
  plants_per_ha DOUBLE PRECISION NOT NULL,
  emergence_pct DOUBLE PRECISION NOT NULL,
  row_spacing INTEGER NOT NULL DEFAULT 70,
  target_population INTEGER NOT NULL DEFAULT 62000,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.emergence_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view emergence_counts"
  ON public.emergence_counts FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert emergence_counts"
  ON public.emergence_counts FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update emergence_counts"
  ON public.emergence_counts FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_emergence_counts_updated_at
  BEFORE UPDATE ON public.emergence_counts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
