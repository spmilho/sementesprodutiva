
-- 1) Allow male sub-types in planting_plan and planting_actual
ALTER TABLE public.planting_plan DROP CONSTRAINT IF EXISTS planting_plan_type_check;
ALTER TABLE public.planting_plan ADD CONSTRAINT planting_plan_type_check CHECK (type IN ('female', 'male', 'male_1', 'male_2', 'male_3'));

ALTER TABLE public.planting_actual DROP CONSTRAINT IF EXISTS planting_actual_type_check;
ALTER TABLE public.planting_actual ADD CONSTRAINT planting_actual_type_check CHECK (type IN ('female', 'male', 'male_1', 'male_2', 'male_3'));

-- 2) Add per-sub-type planting completion columns
ALTER TABLE public.production_cycles ADD COLUMN IF NOT EXISTS male_1_planting_finished boolean DEFAULT false;
ALTER TABLE public.production_cycles ADD COLUMN IF NOT EXISTS male_2_planting_finished boolean DEFAULT false;
ALTER TABLE public.production_cycles ADD COLUMN IF NOT EXISTS male_3_planting_finished boolean DEFAULT false;

-- 3) Create TS product catalog table
CREATE TABLE IF NOT EXISTS public.ts_product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  product_name text NOT NULL,
  active_ingredient text,
  product_type text,
  category text,
  default_dose numeric,
  default_dose_unit text DEFAULT 'mL/100kg',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.ts_product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ts_product_catalog" ON public.ts_product_catalog
  FOR SELECT TO authenticated USING (deleted_at IS NULL);

CREATE POLICY "Admin/manager can insert ts_product_catalog" ON public.ts_product_catalog
  FOR INSERT TO authenticated WITH CHECK (
    public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admin/manager can update ts_product_catalog" ON public.ts_product_catalog
  FOR UPDATE TO authenticated USING (
    public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Admin/manager can delete ts_product_catalog" ON public.ts_product_catalog
  FOR DELETE TO authenticated USING (
    public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role)
  );
