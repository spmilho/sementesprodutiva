
-- Create a security definer function for admins to manage roles
-- This function bypasses RLS and checks admin status internally
CREATE OR REPLACE FUNCTION public.admin_upsert_role(_user_id uuid, _role app_role, _client_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Delete existing role
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role, client_id)
  VALUES (_user_id, _role, _client_id);
END;
$$;

-- Create a security definer function for admins to delete roles
CREATE OR REPLACE FUNCTION public.admin_delete_role(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Prevent deleting your own admin role
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove your own role';
  END IF;
  
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END;
$$;
