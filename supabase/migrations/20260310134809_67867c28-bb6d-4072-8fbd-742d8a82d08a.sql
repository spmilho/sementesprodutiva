-- Create a SECURITY DEFINER function to fetch profile names
-- This bypasses RLS so any authenticated user can see other users' names
CREATE OR REPLACE FUNCTION public.get_profiles_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
$$;