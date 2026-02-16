
-- Table for multiple contacts per client
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client_contacts"
  ON public.client_contacts FOR SELECT
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE POLICY "Org members can insert client_contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (org_id = user_org_id());

CREATE POLICY "Org members can update client_contacts"
  ON public.client_contacts FOR UPDATE
  USING (org_id = user_org_id() AND deleted_at IS NULL);

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add cooperado fields to farms
ALTER TABLE public.farms
  ADD COLUMN cooperado_name TEXT,
  ADD COLUMN cooperado_phone TEXT,
  ADD COLUMN cooperado_email TEXT;
