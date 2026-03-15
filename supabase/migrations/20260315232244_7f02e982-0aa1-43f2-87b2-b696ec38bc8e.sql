
CREATE TABLE public.shared_report_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  storage_path text NOT NULL,
  created_by uuid NOT NULL,
  cycle_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_report_links_code ON public.shared_report_links (code);

ALTER TABLE public.shared_report_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read by code (public links)
CREATE POLICY "Anyone can read shared report links"
  ON public.shared_report_links
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert their own links
CREATE POLICY "Authenticated users can create shared report links"
  ON public.shared_report_links
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());
