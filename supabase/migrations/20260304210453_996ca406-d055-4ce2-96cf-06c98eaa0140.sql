
-- field_visits table
CREATE TABLE public.field_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) NOT NULL,
  cycle_id uuid REFERENCES public.production_cycles(id) NOT NULL,
  visit_date date NOT NULL,
  visit_number integer,
  technician_name text,
  stage text,
  general_notes text,
  final_score numeric DEFAULT 0,
  max_possible_score numeric DEFAULT 0,
  status text DEFAULT 'em_andamento',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.field_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_visits_select" ON public.field_visits FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visits_insert" ON public.field_visits FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visits_update" ON public.field_visits FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visits_delete" ON public.field_visits FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- field_visit_scores table
CREATE TABLE public.field_visit_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) NOT NULL,
  visit_id uuid REFERENCES public.field_visits(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL,
  subitem text NOT NULL,
  score_value text,
  score_points numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.field_visit_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_visit_scores_select" ON public.field_visit_scores FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visit_scores_insert" ON public.field_visit_scores FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visit_scores_update" ON public.field_visit_scores FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visit_scores_delete" ON public.field_visit_scores FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- field_visit_photos table
CREATE TABLE public.field_visit_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) NOT NULL,
  visit_id uuid REFERENCES public.field_visits(id) ON DELETE CASCADE NOT NULL,
  score_id uuid REFERENCES public.field_visit_scores(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.field_visit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "field_visit_photos_select" ON public.field_visit_photos FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visit_photos_insert" ON public.field_visit_photos FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "field_visit_photos_delete" ON public.field_visit_photos FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

-- Storage bucket for field visit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('field-visit-photos', 'field-visit-photos', true);

CREATE POLICY "field_visit_photos_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'field-visit-photos');

CREATE POLICY "field_visit_photos_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'field-visit-photos');

CREATE POLICY "field_visit_photos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'field-visit-photos');
