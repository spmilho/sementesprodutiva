
-- 1. Create cooperators table
CREATE TABLE public.cooperators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.cooperators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view cooperators" ON public.cooperators FOR SELECT USING (org_id = user_org_id() AND deleted_at IS NULL);
CREATE POLICY "Org members can insert cooperators" ON public.cooperators FOR INSERT WITH CHECK (org_id = user_org_id());
CREATE POLICY "Org members can update cooperators" ON public.cooperators FOR UPDATE USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_cooperators_updated_at BEFORE UPDATE ON public.cooperators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add cooperator_id to farms, add total_area_ha, notes, active columns
ALTER TABLE public.farms ADD COLUMN cooperator_id uuid REFERENCES public.cooperators(id);
ALTER TABLE public.farms ADD COLUMN total_area_ha numeric;
ALTER TABLE public.farms ADD COLUMN notes text;
ALTER TABLE public.farms ADD COLUMN active boolean NOT NULL DEFAULT true;

-- 3. Create pivots table
CREATE TABLE public.pivots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  farm_id uuid NOT NULL REFERENCES public.farms(id),
  name text NOT NULL,
  area_ha numeric,
  latitude double precision,
  longitude double precision,
  irrigation_type text,
  status text NOT NULL DEFAULT 'available',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.pivots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view pivots" ON public.pivots FOR SELECT USING (org_id = user_org_id() AND deleted_at IS NULL);
CREATE POLICY "Org members can insert pivots" ON public.pivots FOR INSERT WITH CHECK (org_id = user_org_id());
CREATE POLICY "Org members can update pivots" ON public.pivots FOR UPDATE USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_pivots_updated_at BEFORE UPDATE ON public.pivots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add cooperator_id and pivot_id to production_cycles
ALTER TABLE public.production_cycles ADD COLUMN cooperator_id uuid REFERENCES public.cooperators(id);
ALTER TABLE public.production_cycles ADD COLUMN pivot_id uuid REFERENCES public.pivots(id);
