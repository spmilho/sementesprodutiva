-- Fix moisture_samples policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "rbac_insert" ON public.moisture_samples;
DROP POLICY IF EXISTS "rbac_select" ON public.moisture_samples;
DROP POLICY IF EXISTS "rbac_update" ON public.moisture_samples;

CREATE POLICY "rbac_insert" ON public.moisture_samples
FOR INSERT
WITH CHECK (
  is_admin() OR 
  ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)) OR 
  ((org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_select" ON public.moisture_samples
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    is_admin() OR 
    ((org_id = user_org_id()) AND (NOT has_role(auth.uid(), 'client'::app_role))) OR 
    (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc 
      WHERE pc.id = moisture_samples.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_update" ON public.moisture_samples
FOR UPDATE
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