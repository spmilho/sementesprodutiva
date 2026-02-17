
-- Fix UPDATE policies: add explicit WITH CHECK (true) so soft-delete (setting deleted_at) works
-- The USING clause still protects: only rows with deleted_at IS NULL can be selected for update
-- But the WITH CHECK must allow the updated row to have deleted_at set

-- client_contacts
DROP POLICY IF EXISTS rbac_update ON public.client_contacts;
CREATE POLICY rbac_update ON public.client_contacts FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- clients
DROP POLICY IF EXISTS rbac_update ON public.clients;
CREATE POLICY rbac_update ON public.clients FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- cooperators
DROP POLICY IF EXISTS rbac_update ON public.cooperators;
CREATE POLICY rbac_update ON public.cooperators FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- emergence_counts
DROP POLICY IF EXISTS rbac_update ON public.emergence_counts;
CREATE POLICY rbac_update ON public.emergence_counts FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- farms
DROP POLICY IF EXISTS rbac_update ON public.farms;
CREATE POLICY rbac_update ON public.farms FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- fertilization_records
DROP POLICY IF EXISTS rbac_update ON public.fertilization_records;
CREATE POLICY rbac_update ON public.fertilization_records FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- inspection_imports
DROP POLICY IF EXISTS rbac_update ON public.inspection_imports;
CREATE POLICY rbac_update ON public.inspection_imports FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- nicking_fixed_points
DROP POLICY IF EXISTS rbac_update ON public.nicking_fixed_points;
CREATE POLICY rbac_update ON public.nicking_fixed_points FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- nicking_observations
DROP POLICY IF EXISTS rbac_update ON public.nicking_observations;
CREATE POLICY rbac_update ON public.nicking_observations FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- phenology_records
DROP POLICY IF EXISTS rbac_update ON public.phenology_records;
CREATE POLICY rbac_update ON public.phenology_records FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- pivots
DROP POLICY IF EXISTS rbac_update ON public.pivots;
CREATE POLICY rbac_update ON public.pivots FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- planting_actual
DROP POLICY IF EXISTS rbac_update ON public.planting_actual;
CREATE POLICY rbac_update ON public.planting_actual FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- planting_plan
DROP POLICY IF EXISTS rbac_update ON public.planting_plan;
CREATE POLICY rbac_update ON public.planting_plan FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));

-- production_cycles
DROP POLICY IF EXISTS rbac_update ON public.production_cycles;
CREATE POLICY rbac_update ON public.production_cycles FOR UPDATE TO authenticated
  USING ((deleted_at IS NULL) AND (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))))
  WITH CHECK (is_admin() OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role)));
