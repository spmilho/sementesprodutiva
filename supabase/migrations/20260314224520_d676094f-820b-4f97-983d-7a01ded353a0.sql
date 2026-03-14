CREATE TABLE public.weather_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.production_cycles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  analysis_text TEXT NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'general',
  growth_stage TEXT,
  dap INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.weather_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weather analyses for their org"
  ON public.weather_analyses FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY "Admins and managers can insert weather analyses"
  ON public.weather_analyses FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id() AND (public.is_admin() OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'field_user')));

CREATE POLICY "Admins can delete weather analyses"
  ON public.weather_analyses FOR DELETE TO authenticated
  USING (public.is_admin());