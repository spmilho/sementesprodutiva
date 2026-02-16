
-- 1. Make client_id nullable on farms (can't drop due to FK references in production_cycles)
ALTER TABLE public.farms ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add new cooperado fields to farms
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS cooperator_name text;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS cooperator_document text;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS cooperator_phone text;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS cooperator_email text;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Migrate existing cooperado data to new columns
UPDATE public.farms SET
  cooperator_name = cooperado_name,
  cooperator_phone = cooperado_phone,
  cooperator_email = cooperado_email
WHERE cooperado_name IS NOT NULL OR cooperado_phone IS NOT NULL OR cooperado_email IS NOT NULL;

-- 3. Add contact_email to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_email text;
