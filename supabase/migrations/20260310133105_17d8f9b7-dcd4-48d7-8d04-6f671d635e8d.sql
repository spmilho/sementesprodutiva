
-- Make feed-media bucket public
UPDATE storage.buckets SET public = TRUE WHERE id = 'feed-media';

-- Ensure public read policy
DROP POLICY IF EXISTS "Public read feed media" ON storage.objects;
CREATE POLICY "Public read feed media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'feed-media');

-- Create trigger for feed post notifications
CREATE OR REPLACE FUNCTION public.trigger_notif_post_feed()
RETURNS TRIGGER AS $$
DECLARE
  v_autor_nome TEXT;
  v_destinatario RECORD;
BEGIN
  SELECT full_name INTO v_autor_nome
  FROM profiles WHERE id = NEW.author_user_id;

  FOR v_destinatario IN
    SELECT p.id AS user_id FROM profiles p
    JOIN feed_user_permissions fup ON fup.user_id = p.id
    WHERE fup.can_access_feed = TRUE AND fup.is_banned = FALSE
      AND p.id != NEW.author_user_id
  LOOP
    PERFORM public.criar_notificacao(
      v_destinatario.user_id,
      'post_feed_campo',
      COALESCE(v_autor_nome, 'Alguém') || ' postou no Feed de Campo',
      LEFT(COALESCE(NEW.caption, 'Nova publicação'), 120),
      'campo',
      NEW.id,
      NEW.author_user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_notif_post_feed ON feed_posts;
CREATE TRIGGER trg_notif_post_feed
  AFTER INSERT ON feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_post_feed();
