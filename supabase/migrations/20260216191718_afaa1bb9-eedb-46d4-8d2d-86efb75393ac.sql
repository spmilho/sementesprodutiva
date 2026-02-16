
-- Create table for phenology records
CREATE TABLE public.phenology_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  observation_date DATE NOT NULL,
  type TEXT NOT NULL, -- 'male' or 'female'
  stage TEXT NOT NULL, -- VE, V2, V4, V6, V8, V10, V12, VT, R1, R2, R3, R4, R5, R6
  description TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.phenology_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view phenology_records"
  ON public.phenology_records FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert phenology_records"
  ON public.phenology_records FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update phenology_records"
  ON public.phenology_records FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_phenology_records_updated_at
  BEFORE UPDATE ON public.phenology_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for cycle media
INSERT INTO storage.buckets (id, name, public) VALUES ('cycle-media', 'cycle-media', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Org members can upload cycle media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cycle-media');

CREATE POLICY "Org members can view cycle media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cycle-media');

CREATE POLICY "Org members can update cycle media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cycle-media');

CREATE POLICY "Org members can delete cycle media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cycle-media');
