
DROP POLICY IF EXISTS "Public read access for shared reports" ON storage.objects;

CREATE POLICY "shared_reports_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'shared-reports'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);
CREATE POLICY "shared_reports_select_own" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'shared-reports'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);
CREATE POLICY "shared_reports_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'shared-reports'
  AND ((storage.foldername(name))[1])::uuid = auth.uid()
);
