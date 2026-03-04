
CREATE OR REPLACE FUNCTION public.upsert_ndvi_polygon(
  _cycle_id uuid,
  _org_id uuid,
  _agro_polygon_id text,
  _polygon_name text,
  _polygon_geo jsonb,
  _area_ha numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (is_admin() OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'field_user'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.ndvi_polygons (cycle_id, org_id, agro_polygon_id, polygon_name, polygon_geo, area_ha, deleted_at)
  VALUES (_cycle_id, _org_id, _agro_polygon_id, _polygon_name, _polygon_geo, _area_ha, NULL)
  ON CONFLICT (cycle_id) DO UPDATE SET
    agro_polygon_id = EXCLUDED.agro_polygon_id,
    polygon_name = EXCLUDED.polygon_name,
    polygon_geo = EXCLUDED.polygon_geo,
    area_ha = EXCLUDED.area_ha,
    deleted_at = NULL,
    updated_at = now();
END;
$$;
