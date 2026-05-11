ALTER TABLE public.leaves_above_ear_evaluations
  ADD COLUMN IF NOT EXISTS planting_scheme text,
  ADD COLUMN IF NOT EXISTS female_rows integer,
  ADD COLUMN IF NOT EXISTS plants_per_female_row integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS total_plants_sampled integer;

ALTER TABLE public.leaves_above_ear_points
  ADD COLUMN IF NOT EXISTS row_number integer DEFAULT 1;