
-- Create public bucket for shared reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-reports', 'shared-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to shared-reports
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shared-reports');

-- Anyone can read (public bucket)
CREATE POLICY "Public read access for shared reports"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'shared-reports');

-- Authenticated users can delete their own reports
CREATE POLICY "Authenticated users can delete own reports"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shared-reports' AND (storage.foldername(name))[1] = auth.uid()::text);
