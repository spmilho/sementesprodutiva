CREATE POLICY "Admins can delete analyses"
ON public.ndvi_analyses
FOR DELETE
TO authenticated
USING (public.is_admin());