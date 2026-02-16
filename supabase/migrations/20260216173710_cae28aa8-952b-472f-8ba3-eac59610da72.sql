
-- Add contract_number to production_cycles
ALTER TABLE public.production_cycles ADD COLUMN IF NOT EXISTS contract_number text;
