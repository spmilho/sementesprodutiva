DROP POLICY IF EXISTS "rbac_insert" ON public.detasseling_records;

CREATE POLICY "rbac_insert" ON public.detasseling_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      org_id = public.user_org_id()
      AND (
        public.has_role(auth.uid(), 'manager'::public.app_role)
        OR public.has_role(auth.uid(), 'field_user'::public.app_role)
      )
    )
  );