
-- Create attachments table
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'cycle',
  entity_id uuid NOT NULL,
  org_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  document_category text NOT NULL,
  description text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.attachments FOR SELECT USING (
  deleted_at IS NULL AND (
    is_admin()
    OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc
      WHERE pc.id = attachments.entity_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_insert" ON public.attachments FOR INSERT WITH CHECK (
  is_admin()
  OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
  OR (org_id = user_org_id() AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_update" ON public.attachments FOR UPDATE
  USING (deleted_at IS NULL AND (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cycle-documents', 'cycle-documents', false);

CREATE POLICY "docs_select" ON storage.objects FOR SELECT USING (
  bucket_id = 'cycle-documents' AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = public.user_org_id()::text
  )
);

CREATE POLICY "docs_insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'cycle-documents' AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = public.user_org_id()::text AND (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'field_user'::app_role)))
  )
);

CREATE POLICY "docs_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'cycle-documents' AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = public.user_org_id()::text AND public.has_role(auth.uid(), 'manager'::app_role))
  )
);
