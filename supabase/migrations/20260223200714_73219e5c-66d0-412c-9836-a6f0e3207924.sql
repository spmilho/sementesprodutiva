ALTER TABLE public.production_cycles
  ADD COLUMN IF NOT EXISTS spacing_female_female_cm integer,
  ADD COLUMN IF NOT EXISTS spacing_female_male_cm integer,
  ADD COLUMN IF NOT EXISTS spacing_male_male_cm integer;