
-- Table to persist UBS capacity planning state per organization
CREATE TABLE public.ubs_capacity_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  state_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS
ALTER TABLE public.ubs_capacity_state ENABLE ROW LEVEL SECURITY;

-- Policies: only non-client users in the same org can read/write
CREATE POLICY "rbac_select" ON public.ubs_capacity_state
  FOR SELECT TO authenticated
  USING (
    is_admin() OR
    (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role))
  );

CREATE POLICY "rbac_insert" ON public.ubs_capacity_state
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin() OR
    (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
  );

CREATE POLICY "rbac_update" ON public.ubs_capacity_state
  FOR UPDATE TO authenticated
  USING (
    is_admin() OR
    (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
  )
  WITH CHECK (
    is_admin() OR
    (org_id = user_org_id() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)))
  );

-- Trigger for updated_at
CREATE TRIGGER update_ubs_capacity_state_updated_at
  BEFORE UPDATE ON public.ubs_capacity_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
