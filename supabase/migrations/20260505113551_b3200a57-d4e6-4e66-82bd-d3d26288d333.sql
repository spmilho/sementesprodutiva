DROP POLICY IF EXISTS "rbac_select" ON public.detasseling_records;
DROP POLICY IF EXISTS "rbac_update" ON public.detasseling_records;

CREATE POLICY "rbac_select"
ON public.detasseling_records
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.is_admin()
    OR (
      org_id = public.user_org_id()
      AND NOT public.has_role(auth.uid(), 'client'::public.app_role)
    )
    OR (
      public.has_role(auth.uid(), 'client'::public.app_role)
      AND EXISTS (
        SELECT 1
        FROM public.production_cycles pc
        WHERE pc.id = detasseling_records.cycle_id
          AND pc.client_id = public.user_client_id()
          AND pc.deleted_at IS NULL
      )
    )
  )
);

CREATE POLICY "rbac_update"
ON public.detasseling_records
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND (
    public.is_admin()
    OR (
      org_id = public.user_org_id()
      AND public.has_role(auth.uid(), 'manager'::public.app_role)
    )
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    org_id = public.user_org_id()
    AND public.has_role(auth.uid(), 'manager'::public.app_role)
  )
);