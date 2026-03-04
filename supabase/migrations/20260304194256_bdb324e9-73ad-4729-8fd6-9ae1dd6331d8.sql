ALTER TABLE public.planting_plan 
  ADD COLUMN spacing_ff_cm integer DEFAULT 70,
  ADD COLUMN spacing_fm_cm integer DEFAULT 70,
  ADD COLUMN spacing_mm_cm integer DEFAULT 70;