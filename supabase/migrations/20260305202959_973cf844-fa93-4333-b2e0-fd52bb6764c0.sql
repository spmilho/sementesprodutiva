
-- Feed permissions table (independent from app roles)
CREATE TABLE public.feed_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_access_feed boolean NOT NULL DEFAULT true,
  role_feed text NOT NULL DEFAULT 'viewer' CHECK (role_feed IN ('viewer', 'poster', 'moderator', 'admin')),
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Feed posts
CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  stage text,
  safra text,
  cliente text,
  fazenda text,
  pivo text,
  talhao text,
  hibrido text,
  tags text[] DEFAULT '{}',
  location_text text,
  gps_lat double precision,
  gps_lng double precision,
  is_hidden boolean NOT NULL DEFAULT false
);

-- Feed media (multiple per post)
CREATE TABLE public.feed_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Feed likes
CREATE TABLE public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- Feed comments (1-level threading)
CREATE TABLE public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

-- Feed moderation log
CREATE TABLE public.feed_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  moderator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Security definer functions for feed access checks
CREATE OR REPLACE FUNCTION public.feed_has_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feed_user_permissions
    WHERE user_id = _user_id AND can_access_feed = true AND is_banned = false
  )
$$;

CREATE OR REPLACE FUNCTION public.feed_get_role(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role_feed FROM public.feed_user_permissions
  WHERE user_id = _user_id AND can_access_feed = true AND is_banned = false
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.feed_is_mod_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.feed_user_permissions
    WHERE user_id = _user_id AND can_access_feed = true AND is_banned = false
      AND role_feed IN ('moderator', 'admin')
  )
$$;

-- RLS on all feed tables
ALTER TABLE public.feed_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_moderation_log ENABLE ROW LEVEL SECURITY;

-- feed_user_permissions policies
CREATE POLICY "feed_perm_select_own" ON public.feed_user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "feed_perm_select_admin" ON public.feed_user_permissions FOR SELECT TO authenticated USING (public.feed_get_role(auth.uid()) = 'admin');
CREATE POLICY "feed_perm_insert_admin" ON public.feed_user_permissions FOR INSERT TO authenticated WITH CHECK (public.feed_get_role(auth.uid()) = 'admin' OR public.is_admin());
CREATE POLICY "feed_perm_update_admin" ON public.feed_user_permissions FOR UPDATE TO authenticated USING (public.feed_get_role(auth.uid()) = 'admin' OR public.is_admin());
CREATE POLICY "feed_perm_delete_admin" ON public.feed_user_permissions FOR DELETE TO authenticated USING (public.feed_get_role(auth.uid()) = 'admin' OR public.is_admin());

-- feed_posts policies
CREATE POLICY "feed_posts_select" ON public.feed_posts FOR SELECT TO authenticated USING (public.feed_has_access(auth.uid()) AND (is_hidden = false OR author_user_id = auth.uid() OR public.feed_is_mod_or_admin(auth.uid())));
CREATE POLICY "feed_posts_insert" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (public.feed_has_access(auth.uid()) AND public.feed_get_role(auth.uid()) IN ('poster', 'moderator', 'admin') AND author_user_id = auth.uid());
CREATE POLICY "feed_posts_update" ON public.feed_posts FOR UPDATE TO authenticated USING (public.feed_has_access(auth.uid()) AND (author_user_id = auth.uid() OR public.feed_is_mod_or_admin(auth.uid())));
CREATE POLICY "feed_posts_delete" ON public.feed_posts FOR DELETE TO authenticated USING (public.feed_has_access(auth.uid()) AND (author_user_id = auth.uid() OR public.feed_is_mod_or_admin(auth.uid())));

-- feed_media policies
CREATE POLICY "feed_media_select" ON public.feed_media FOR SELECT TO authenticated USING (public.feed_has_access(auth.uid()));
CREATE POLICY "feed_media_insert" ON public.feed_media FOR INSERT TO authenticated WITH CHECK (public.feed_has_access(auth.uid()) AND public.feed_get_role(auth.uid()) IN ('poster', 'moderator', 'admin'));
CREATE POLICY "feed_media_delete" ON public.feed_media FOR DELETE TO authenticated USING (public.feed_has_access(auth.uid()) AND public.feed_is_mod_or_admin(auth.uid()));

-- feed_likes policies
CREATE POLICY "feed_likes_select" ON public.feed_likes FOR SELECT TO authenticated USING (public.feed_has_access(auth.uid()));
CREATE POLICY "feed_likes_insert" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (public.feed_has_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "feed_likes_delete" ON public.feed_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- feed_comments policies
CREATE POLICY "feed_comments_select" ON public.feed_comments FOR SELECT TO authenticated USING (public.feed_has_access(auth.uid()));
CREATE POLICY "feed_comments_insert" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (public.feed_has_access(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "feed_comments_update" ON public.feed_comments FOR UPDATE TO authenticated USING (public.feed_has_access(auth.uid()) AND (user_id = auth.uid() OR public.feed_is_mod_or_admin(auth.uid())));
CREATE POLICY "feed_comments_delete" ON public.feed_comments FOR DELETE TO authenticated USING (public.feed_has_access(auth.uid()) AND (user_id = auth.uid() OR public.feed_is_mod_or_admin(auth.uid())));

-- feed_moderation_log policies
CREATE POLICY "feed_modlog_select" ON public.feed_moderation_log FOR SELECT TO authenticated USING (public.feed_is_mod_or_admin(auth.uid()));
CREATE POLICY "feed_modlog_insert" ON public.feed_moderation_log FOR INSERT TO authenticated WITH CHECK (public.feed_is_mod_or_admin(auth.uid()));

-- Storage bucket for feed media
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-media', 'feed-media', false);

-- Storage policies
CREATE POLICY "feed_media_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'feed-media' AND public.feed_has_access(auth.uid()));
CREATE POLICY "feed_media_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'feed-media' AND public.feed_has_access(auth.uid()) AND public.feed_get_role(auth.uid()) IN ('poster', 'moderator', 'admin'));
CREATE POLICY "feed_media_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'feed-media' AND public.feed_is_mod_or_admin(auth.uid()));
