-- Function to get ALL profile names (for mention dropdowns)
CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p;
$$;