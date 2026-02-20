-- Add DELETE policy for yield_estimates
CREATE POLICY "rbac_delete" ON public.yield_estimates
FOR DELETE
USING (
  is_admin()
  OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role))
);