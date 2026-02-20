
-- Add logo_url and slogan to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slogan text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- RLS UPDATE policy for organizations (admin or manager of same org)
CREATE POLICY "rbac_update" ON public.organizations FOR UPDATE
USING (is_admin() OR (id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)))
WITH CHECK (is_admin() OR (id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

-- organization_settings table
CREATE TABLE public.organization_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) UNIQUE,
  report_logo_url text,
  report_cover_url text,
  report_footer_text text DEFAULT 'Produtiva Sementes — Caderno de Campo Digital',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.organization_settings FOR SELECT
USING (is_admin() OR (org_id = user_org_id()));

CREATE POLICY "rbac_insert" ON public.organization_settings FOR INSERT
WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "rbac_update" ON public.organization_settings FOR UPDATE
USING (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)))
WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

-- cycle_team table
CREATE TABLE public.cycle_team (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  user_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  role_in_cycle text NOT NULL DEFAULT 'observador',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, user_id)
);

ALTER TABLE public.cycle_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.cycle_team FOR SELECT
USING (is_admin() OR (org_id = user_org_id() AND NOT has_role(auth.uid(), 'client'::app_role)));

CREATE POLICY "rbac_insert" ON public.cycle_team FOR INSERT
WITH CHECK (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "rbac_delete" ON public.cycle_team FOR DELETE
USING (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "rbac_update" ON public.cycle_team FOR UPDATE
USING (is_admin() OR (org_id = user_org_id() AND has_role(auth.uid(), 'manager'::app_role)));

-- Storage bucket for org assets (logos, covers)
INSERT INTO storage.buckets (id, name, public) VALUES ('org-assets', 'org-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org_assets_select" ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');

CREATE POLICY "org_assets_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'org-assets' AND (is_admin() OR has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "org_assets_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'org-assets' AND (is_admin() OR has_role(auth.uid(), 'manager'::app_role)));

CREATE POLICY "org_assets_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'org-assets' AND (is_admin() OR has_role(auth.uid(), 'manager'::app_role)));
