
DROP POLICY IF EXISTS "Anyone can read shared report links" ON public.shared_report_links;

DROP POLICY IF EXISTS "Org members can view cycle media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload cycle media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update cycle media" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete cycle media" ON storage.objects;

CREATE POLICY "cycle_media_select_own_org" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cycle-media'
  AND (
    ((storage.foldername(name))[1])::uuid = public.user_org_id()
    OR (
      (storage.foldername(name))[1] = 'reports'
      AND ((storage.foldername(name))[2])::uuid = public.user_org_id()
    )
  )
);
CREATE POLICY "cycle_media_insert_own_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cycle-media'
  AND (
    ((storage.foldername(name))[1])::uuid = public.user_org_id()
    OR (
      (storage.foldername(name))[1] = 'reports'
      AND ((storage.foldername(name))[2])::uuid = public.user_org_id()
    )
  )
);
CREATE POLICY "cycle_media_update_own_org" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'cycle-media'
  AND (
    ((storage.foldername(name))[1])::uuid = public.user_org_id()
    OR (
      (storage.foldername(name))[1] = 'reports'
      AND ((storage.foldername(name))[2])::uuid = public.user_org_id()
    )
  )
);
CREATE POLICY "cycle_media_delete_own_org" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cycle-media'
  AND (
    ((storage.foldername(name))[1])::uuid = public.user_org_id()
    OR (
      (storage.foldername(name))[1] = 'reports'
      AND ((storage.foldername(name))[2])::uuid = public.user_org_id()
    )
  )
);

DROP POLICY IF EXISTS "field_visit_photos_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "field_visit_photos_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "field_visit_photos_storage_delete" ON storage.objects;

CREATE POLICY "field_visit_photos_select_own_org" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'field-visit-photos'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
);
CREATE POLICY "field_visit_photos_insert_own_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'field-visit-photos'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
);
CREATE POLICY "field_visit_photos_delete_own_org" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'field-visit-photos'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
);

DROP POLICY IF EXISTS "org_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_delete" ON storage.objects;

CREATE POLICY "org_assets_select_own_org" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'org-assets'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
);
CREATE POLICY "org_assets_insert_own_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role))
);
CREATE POLICY "org_assets_update_own_org" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role))
);
CREATE POLICY "org_assets_delete_own_org" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND ((storage.foldername(name))[1])::uuid = public.user_org_id()
  AND (public.is_admin() OR public.has_role(auth.uid(), 'manager'::app_role))
);

DROP POLICY IF EXISTS "plano_storage_select" ON storage.objects;
CREATE POLICY "plano_storage_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'plano-acoes-anexos'
  AND public.has_plano_acoes_access(auth.uid())
);

DROP POLICY IF EXISTS "notif_insert" ON public.notificacoes;
CREATE POLICY "notif_insert" ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (gerado_por = auth.uid());

CREATE OR REPLACE FUNCTION public.update_plano_acoes_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.criar_notificacao(uuid, text, text, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_notif_nova_acao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_notif_comentario_acao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_notif_mencao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_notif_post_feed() FROM PUBLIC, anon, authenticated;
