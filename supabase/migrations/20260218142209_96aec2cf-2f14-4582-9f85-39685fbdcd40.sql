
-- Fix yield_estimates policies: RESTRICTIVE -> PERMISSIVE
DROP POLICY IF EXISTS "rbac_insert" ON public.yield_estimates;
DROP POLICY IF EXISTS "rbac_select" ON public.yield_estimates;
DROP POLICY IF EXISTS "rbac_update" ON public.yield_estimates;

CREATE POLICY "rbac_insert" ON public.yield_estimates
FOR INSERT
WITH CHECK (
  is_admin() OR 
  ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)) OR 
  ((org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_select" ON public.yield_estimates
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    is_admin() OR 
    ((org_id = user_org_id()) AND (NOT has_role(auth.uid(), 'client'::app_role))) OR 
    (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc 
      WHERE pc.id = yield_estimates.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_update" ON public.yield_estimates
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

-- Fix yield_sample_points policies: RESTRICTIVE -> PERMISSIVE
DROP POLICY IF EXISTS "rbac_insert" ON public.yield_sample_points;
DROP POLICY IF EXISTS "rbac_select" ON public.yield_sample_points;
DROP POLICY IF EXISTS "rbac_update" ON public.yield_sample_points;
DROP POLICY IF EXISTS "rbac_delete" ON public.yield_sample_points;

CREATE POLICY "rbac_insert" ON public.yield_sample_points
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM yield_estimates ye
    WHERE ye.id = yield_sample_points.yield_estimate_id
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)) OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role)))
  )
);

CREATE POLICY "rbac_select" ON public.yield_sample_points
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM yield_estimates ye
    WHERE ye.id = yield_sample_points.yield_estimate_id
    AND ye.deleted_at IS NULL
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND (NOT has_role(auth.uid(), 'client'::app_role))) OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = ye.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    )))
  )
);

CREATE POLICY "rbac_update" ON public.yield_sample_points
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM yield_estimates ye
    WHERE ye.id = yield_sample_points.yield_estimate_id
    AND ye.deleted_at IS NULL
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)))
  )
);

CREATE POLICY "rbac_delete" ON public.yield_sample_points
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM yield_estimates ye
    WHERE ye.id = yield_sample_points.yield_estimate_id
    AND ye.deleted_at IS NULL
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)))
  )
);

-- Fix yield_ear_samples policies: RESTRICTIVE -> PERMISSIVE
DROP POLICY IF EXISTS "rbac_insert" ON public.yield_ear_samples;
DROP POLICY IF EXISTS "rbac_select" ON public.yield_ear_samples;
DROP POLICY IF EXISTS "rbac_delete" ON public.yield_ear_samples;

CREATE POLICY "rbac_insert" ON public.yield_ear_samples
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM yield_sample_points ysp
    JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)) OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role)))
  )
);

CREATE POLICY "rbac_select" ON public.yield_ear_samples
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM yield_sample_points ysp
    JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id
    AND ye.deleted_at IS NULL
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND (NOT has_role(auth.uid(), 'client'::app_role))) OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = ye.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    )))
  )
);

CREATE POLICY "rbac_delete" ON public.yield_ear_samples
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM yield_sample_points ysp
    JOIN yield_estimates ye ON ye.id = ysp.yield_estimate_id
    WHERE ysp.id = yield_ear_samples.sample_point_id
    AND ye.deleted_at IS NULL
    AND (is_admin() OR ((ye.org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)))
  )
);
