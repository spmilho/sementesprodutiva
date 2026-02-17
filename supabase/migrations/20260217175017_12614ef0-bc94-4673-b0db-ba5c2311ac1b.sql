
-- ============================================
-- RBAC SYSTEM - Complete Implementation
-- ============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'field_user', 'client');

-- 2. User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'field_user',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;

CREATE OR REPLACE FUNCTION public.user_client_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT client_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'client' LIMIT 1
$$;

-- 4. RLS on user_roles itself
CREATE POLICY "admins_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "self_view" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Seed existing users as admin
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Org members can view their org" ON public.organizations;

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

DROP POLICY IF EXISTS "Org members can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Org members can update clients" ON public.clients;
DROP POLICY IF EXISTS "Org members can view clients" ON public.clients;

DROP POLICY IF EXISTS "Org members can insert client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Org members can update client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Org members can view client_contacts" ON public.client_contacts;

DROP POLICY IF EXISTS "Org members can insert cooperators" ON public.cooperators;
DROP POLICY IF EXISTS "Org members can update cooperators" ON public.cooperators;
DROP POLICY IF EXISTS "Org members can view cooperators" ON public.cooperators;

DROP POLICY IF EXISTS "Org members can insert farms" ON public.farms;
DROP POLICY IF EXISTS "Org members can update farms" ON public.farms;
DROP POLICY IF EXISTS "Org members can view farms" ON public.farms;

DROP POLICY IF EXISTS "Org members can insert pivots" ON public.pivots;
DROP POLICY IF EXISTS "Org members can update pivots" ON public.pivots;
DROP POLICY IF EXISTS "Org members can view pivots" ON public.pivots;

DROP POLICY IF EXISTS "Org members can insert cycles" ON public.production_cycles;
DROP POLICY IF EXISTS "Org members can update cycles" ON public.production_cycles;
DROP POLICY IF EXISTS "Org members can view cycles" ON public.production_cycles;

DROP POLICY IF EXISTS "Org members can insert planting_plan" ON public.planting_plan;
DROP POLICY IF EXISTS "Org members can update planting_plan" ON public.planting_plan;
DROP POLICY IF EXISTS "Org members can view planting_plan" ON public.planting_plan;

DROP POLICY IF EXISTS "Org members can insert planting_actual" ON public.planting_actual;
DROP POLICY IF EXISTS "Org members can update planting_actual" ON public.planting_actual;
DROP POLICY IF EXISTS "Org members can view planting_actual" ON public.planting_actual;

DROP POLICY IF EXISTS "Org members can insert emergence_counts" ON public.emergence_counts;
DROP POLICY IF EXISTS "Org members can update emergence_counts" ON public.emergence_counts;
DROP POLICY IF EXISTS "Org members can view emergence_counts" ON public.emergence_counts;

DROP POLICY IF EXISTS "Org members can insert fertilization_records" ON public.fertilization_records;
DROP POLICY IF EXISTS "Org members can update fertilization_records" ON public.fertilization_records;
DROP POLICY IF EXISTS "Org members can view fertilization_records" ON public.fertilization_records;

DROP POLICY IF EXISTS "Org members can insert phenology_records" ON public.phenology_records;
DROP POLICY IF EXISTS "Org members can update phenology_records" ON public.phenology_records;
DROP POLICY IF EXISTS "Org members can view phenology_records" ON public.phenology_records;

DROP POLICY IF EXISTS "Org members can insert nicking_fixed_points" ON public.nicking_fixed_points;
DROP POLICY IF EXISTS "Org members can update nicking_fixed_points" ON public.nicking_fixed_points;
DROP POLICY IF EXISTS "Org members can view nicking_fixed_points" ON public.nicking_fixed_points;

DROP POLICY IF EXISTS "Org members can insert nicking_observations" ON public.nicking_observations;
DROP POLICY IF EXISTS "Org members can update nicking_observations" ON public.nicking_observations;
DROP POLICY IF EXISTS "Org members can view nicking_observations" ON public.nicking_observations;

DROP POLICY IF EXISTS "Org members can insert nicking_point_readings" ON public.nicking_point_readings;
DROP POLICY IF EXISTS "Org members can update nicking_point_readings" ON public.nicking_point_readings;
DROP POLICY IF EXISTS "Org members can view nicking_point_readings" ON public.nicking_point_readings;

DROP POLICY IF EXISTS "Org members can insert nicking_milestones" ON public.nicking_milestones;
DROP POLICY IF EXISTS "Org members can update nicking_milestones" ON public.nicking_milestones;
DROP POLICY IF EXISTS "Org members can view nicking_milestones" ON public.nicking_milestones;

DROP POLICY IF EXISTS "Org members can insert inspection_imports" ON public.inspection_imports;
DROP POLICY IF EXISTS "Org members can update inspection_imports" ON public.inspection_imports;
DROP POLICY IF EXISTS "Org members can view inspection_imports" ON public.inspection_imports;

DROP POLICY IF EXISTS "Org members can insert inspection_data" ON public.inspection_data;
DROP POLICY IF EXISTS "Org members can delete inspection_data" ON public.inspection_data;
DROP POLICY IF EXISTS "Org members can view inspection_data" ON public.inspection_data;

DROP POLICY IF EXISTS "Org members can insert inspection_counting_points" ON public.inspection_counting_points;
DROP POLICY IF EXISTS "Org members can delete inspection_counting_points" ON public.inspection_counting_points;
DROP POLICY IF EXISTS "Org members can view inspection_counting_points" ON public.inspection_counting_points;

DROP POLICY IF EXISTS "Org members can insert nutrition_targets" ON public.nutrition_targets;
DROP POLICY IF EXISTS "Org members can update nutrition_targets" ON public.nutrition_targets;
DROP POLICY IF EXISTS "Org members can view nutrition_targets" ON public.nutrition_targets;

DROP POLICY IF EXISTS "Org members can insert seed_lots" ON public.seed_lots;
DROP POLICY IF EXISTS "Org members can update seed_lots" ON public.seed_lots;
DROP POLICY IF EXISTS "Org members can view seed_lots" ON public.seed_lots;

DROP POLICY IF EXISTS "Org members can insert seed_lot_treatments" ON public.seed_lot_treatments;
DROP POLICY IF EXISTS "Org members can update seed_lot_treatments" ON public.seed_lot_treatments;
DROP POLICY IF EXISTS "Org members can view seed_lot_treatments" ON public.seed_lot_treatments;

DROP POLICY IF EXISTS "Org members can insert seed_lot_treatment_products" ON public.seed_lot_treatment_products;
DROP POLICY IF EXISTS "Org members can update seed_lot_treatment_products" ON public.seed_lot_treatment_products;
DROP POLICY IF EXISTS "Org members can delete seed_lot_treatment_products" ON public.seed_lot_treatment_products;
DROP POLICY IF EXISTS "Org members can view seed_lot_treatment_products" ON public.seed_lot_treatment_products;

-- ============================================
-- NEW RBAC POLICIES
-- ============================================
-- Legend:
--   admin: full access, no org/client filter
--   manager: full CRUD within org
--   field_user: SELECT + INSERT within org
--   client: SELECT only, scoped to their client_id

-- ---- organizations ----
CREATE POLICY "rbac_select" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_admin() OR id = user_org_id());

-- ---- profiles ----
CREATE POLICY "rbac_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin() OR id = auth.uid());
CREATE POLICY "rbac_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "rbac_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ---- clients ----
CREATE POLICY "rbac_select" ON public.clients FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND id = public.user_client_id())
  ));
CREATE POLICY "rbac_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.clients FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- client_contacts ----
CREATE POLICY "rbac_select" ON public.client_contacts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND client_id = public.user_client_id())
  ));
CREATE POLICY "rbac_insert" ON public.client_contacts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.client_contacts FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- cooperators ----
CREATE POLICY "rbac_select" ON public.cooperators FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
  ));
CREATE POLICY "rbac_insert" ON public.cooperators FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.cooperators FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- farms ----
CREATE POLICY "rbac_select" ON public.farms FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND client_id = public.user_client_id())
  ));
CREATE POLICY "rbac_insert" ON public.farms FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.farms FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- pivots ----
CREATE POLICY "rbac_select" ON public.pivots FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM farms f WHERE f.id = pivots.farm_id AND f.client_id = public.user_client_id()
    ))
  ));
CREATE POLICY "rbac_insert" ON public.pivots FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.pivots FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- production_cycles ----
CREATE POLICY "rbac_select" ON public.production_cycles FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND client_id = public.user_client_id())
  ));
CREATE POLICY "rbac_insert" ON public.production_cycles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.production_cycles FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- CYCLE-CHILD TABLES (planting_plan, planting_actual, emergence_counts, fertilization_records, phenology_records) ----
-- These all have org_id + cycle_id + deleted_at

-- planting_plan
CREATE POLICY "rbac_select" ON public.planting_plan FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = planting_plan.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.planting_plan FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.planting_plan FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- planting_actual
CREATE POLICY "rbac_select" ON public.planting_actual FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = planting_actual.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.planting_actual FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.planting_actual FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- emergence_counts
CREATE POLICY "rbac_select" ON public.emergence_counts FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = emergence_counts.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.emergence_counts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.emergence_counts FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- fertilization_records
CREATE POLICY "rbac_select" ON public.fertilization_records FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = fertilization_records.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.fertilization_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.fertilization_records FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- phenology_records
CREATE POLICY "rbac_select" ON public.phenology_records FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = phenology_records.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.phenology_records FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.phenology_records FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- nicking_fixed_points ----
CREATE POLICY "rbac_select" ON public.nicking_fixed_points FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = nicking_fixed_points.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.nicking_fixed_points FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.nicking_fixed_points FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- nicking_observations ----
CREATE POLICY "rbac_select" ON public.nicking_observations FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = nicking_observations.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.nicking_observations FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.nicking_observations FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- nicking_point_readings (no org_id, accessed through observation) ----
CREATE POLICY "rbac_select" ON public.nicking_point_readings FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_observations o WHERE o.id = nicking_point_readings.observation_id AND o.org_id = user_org_id() AND o.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM nicking_observations o JOIN production_cycles pc ON pc.id = o.cycle_id
      WHERE o.id = nicking_point_readings.observation_id AND pc.client_id = public.user_client_id() AND o.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.nicking_point_readings FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_observations o WHERE o.id = nicking_point_readings.observation_id AND o.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')))
  );
CREATE POLICY "rbac_update" ON public.nicking_point_readings FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_observations o WHERE o.id = nicking_point_readings.observation_id AND o.org_id = user_org_id() AND o.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager'))
  );

-- ---- nicking_milestones (no org_id, accessed through fixed_point) ----
CREATE POLICY "rbac_select" ON public.nicking_milestones FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_fixed_points fp WHERE fp.id = nicking_milestones.fixed_point_id AND fp.org_id = user_org_id() AND fp.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM nicking_fixed_points fp JOIN production_cycles pc ON pc.id = fp.cycle_id
      WHERE fp.id = nicking_milestones.fixed_point_id AND pc.client_id = public.user_client_id() AND fp.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.nicking_milestones FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_fixed_points fp WHERE fp.id = nicking_milestones.fixed_point_id AND fp.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')))
  );
CREATE POLICY "rbac_update" ON public.nicking_milestones FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM nicking_fixed_points fp WHERE fp.id = nicking_milestones.fixed_point_id AND fp.org_id = user_org_id() AND fp.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager'))
  );

-- ---- inspection_imports ----
CREATE POLICY "rbac_select" ON public.inspection_imports FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = inspection_imports.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.inspection_imports FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.inspection_imports FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- inspection_data (no org_id, through import) ----
CREATE POLICY "rbac_select" ON public.inspection_data FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id() AND ii.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM inspection_imports ii JOIN production_cycles pc ON pc.id = ii.cycle_id
      WHERE ii.id = inspection_data.import_id AND pc.client_id = public.user_client_id() AND ii.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.inspection_data FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')))
  );
CREATE POLICY "rbac_delete" ON public.inspection_data FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM inspection_imports ii WHERE ii.id = inspection_data.import_id AND ii.org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  );

-- ---- inspection_counting_points (no org_id, through inspection_data -> import) ----
CREATE POLICY "rbac_select" ON public.inspection_counting_points FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM inspection_data id2 JOIN inspection_imports ii ON ii.id = id2.import_id
      WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id() AND ii.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client')
    )
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM inspection_data id2 JOIN inspection_imports ii ON ii.id = id2.import_id JOIN production_cycles pc ON pc.id = ii.cycle_id
      WHERE id2.id = inspection_counting_points.inspection_data_id AND pc.client_id = public.user_client_id() AND ii.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.inspection_counting_points FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM inspection_data id2 JOIN inspection_imports ii ON ii.id = id2.import_id
      WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user'))
    )
  );
CREATE POLICY "rbac_delete" ON public.inspection_counting_points FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM inspection_data id2 JOIN inspection_imports ii ON ii.id = id2.import_id
      WHERE id2.id = inspection_counting_points.inspection_data_id AND ii.org_id = user_org_id() AND public.has_role(auth.uid(), 'manager')
    )
  );

-- ---- nutrition_targets (no org_id, through cycle) ----
CREATE POLICY "rbac_select" ON public.nutrition_targets FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM production_cycles pc WHERE pc.id = nutrition_targets.cycle_id AND pc.org_id = user_org_id() AND pc.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = nutrition_targets.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.nutrition_targets FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM production_cycles pc WHERE pc.id = nutrition_targets.cycle_id AND pc.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')))
  );
CREATE POLICY "rbac_update" ON public.nutrition_targets FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM production_cycles pc WHERE pc.id = nutrition_targets.cycle_id AND pc.org_id = user_org_id() AND pc.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager'))
  );

-- ---- seed_lots ----
CREATE POLICY "rbac_select" ON public.seed_lots FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM production_cycles pc WHERE pc.id = seed_lots.cycle_id AND pc.client_id = public.user_client_id() AND pc.deleted_at IS NULL
    ))
  ));
CREATE POLICY "rbac_insert" ON public.seed_lots FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'field_user'))
  );
CREATE POLICY "rbac_update" ON public.seed_lots FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND (
    public.is_admin()
    OR (org_id = user_org_id() AND public.has_role(auth.uid(), 'manager'))
  ));

-- ---- seed_lot_treatments (no org_id, through seed_lot) ----
CREATE POLICY "rbac_select" ON public.seed_lot_treatments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client'))
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM seed_lots sl JOIN production_cycles pc ON pc.id = sl.cycle_id
      WHERE sl.id = seed_lot_treatments.seed_lot_id AND pc.client_id = public.user_client_id() AND sl.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.seed_lot_treatments FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')))
  );
CREATE POLICY "rbac_update" ON public.seed_lot_treatments FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM seed_lots sl WHERE sl.id = seed_lot_treatments.seed_lot_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager'))
  );

-- ---- seed_lot_treatment_products (no org_id, through treatment -> lot) ----
CREATE POLICY "rbac_select" ON public.seed_lot_treatment_products FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seed_lot_treatments slt JOIN seed_lots sl ON sl.id = slt.seed_lot_id
      WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL AND NOT public.has_role(auth.uid(), 'client')
    )
    OR (public.has_role(auth.uid(), 'client') AND EXISTS (
      SELECT 1 FROM seed_lot_treatments slt JOIN seed_lots sl ON sl.id = slt.seed_lot_id JOIN production_cycles pc ON pc.id = sl.cycle_id
      WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND pc.client_id = public.user_client_id() AND sl.deleted_at IS NULL AND pc.deleted_at IS NULL
    ))
  );
CREATE POLICY "rbac_insert" ON public.seed_lot_treatment_products FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seed_lot_treatments slt JOIN seed_lots sl ON sl.id = slt.seed_lot_id
      WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id()
      AND (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user'))
    )
  );
CREATE POLICY "rbac_update" ON public.seed_lot_treatment_products FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seed_lot_treatments slt JOIN seed_lots sl ON sl.id = slt.seed_lot_id
      WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager')
    )
  );
CREATE POLICY "rbac_delete" ON public.seed_lot_treatment_products FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seed_lot_treatments slt JOIN seed_lots sl ON sl.id = slt.seed_lot_id
      WHERE slt.id = seed_lot_treatment_products.seed_lot_treatment_id AND sl.org_id = user_org_id() AND sl.deleted_at IS NULL AND public.has_role(auth.uid(), 'manager')
    )
  );
