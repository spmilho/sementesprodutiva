ALTER TABLE public.production_cycles
  ADD COLUMN IF NOT EXISTS male_cut_date date,
  ADD COLUMN IF NOT EXISTS male_cut_stage text;