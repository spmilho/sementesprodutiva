
DROP POLICY IF EXISTS "rbac_update" ON public.ndvi_polygons;

CREATE POLICY "rbac_update" ON public.ndvi_polygons
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  (deleted_at IS NULL) AND (
    is_admin() OR 
    ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
  )
)
WITH CHECK (
  is_admin() OR 
  ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
);
