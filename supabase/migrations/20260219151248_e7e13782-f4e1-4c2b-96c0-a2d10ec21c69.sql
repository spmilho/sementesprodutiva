
-- Table to store Agromonitoring polygon references per cycle
CREATE TABLE public.ndvi_polygons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id uuid NOT NULL REFERENCES public.production_cycles(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  agro_polygon_id text NOT NULL,
  polygon_name text,
  polygon_geo jsonb NOT NULL,
  area_ha numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  UNIQUE(cycle_id)
);

ALTER TABLE public.ndvi_polygons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rbac_select" ON public.ndvi_polygons
FOR SELECT USING (
  (deleted_at IS NULL) AND (
    is_admin()
    OR ((org_id = user_org_id()) AND NOT has_role(auth.uid(), 'client'::app_role))
    OR (has_role(auth.uid(), 'client'::app_role) AND EXISTS (
      SELECT 1 FROM production_cycles pc
      WHERE pc.id = ndvi_polygons.cycle_id AND pc.client_id = user_client_id() AND pc.deleted_at IS NULL
    ))
  )
);

CREATE POLICY "rbac_insert" ON public.ndvi_polygons
FOR INSERT WITH CHECK (
  is_admin()
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'field_user'::app_role))
);

CREATE POLICY "rbac_update" ON public.ndvi_polygons
FOR UPDATE USING (
  (deleted_at IS NULL) AND (
    is_admin()
    OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
  )
) WITH CHECK (
  is_admin()
  OR ((org_id = user_org_id()) AND has_role(auth.uid(), 'manager'::app_role))
);
