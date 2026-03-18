
DROP POLICY IF EXISTS "rbac_insert" ON public.roguing_records;

CREATE POLICY "rbac_insert" ON public.roguing_records
FOR INSERT TO authenticated
WITH CHECK (
  is_admin()
  OR (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
);
