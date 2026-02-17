
-- Function to let admins fetch user emails (security definer, checks admin role)
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin()
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY SELECT au.id, au.email::text FROM auth.users au;
END;
$$;
