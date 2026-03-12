
-- Contratos table
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  tipo TEXT NOT NULL DEFAULT 'producao_campo' CHECK (tipo IN ('producao_campo', 'beneficiamento')),
  titulo TEXT NOT NULL,
  numero_contrato TEXT,
  contratante TEXT,
  contratado TEXT,
  hibrido TEXT,
  safra TEXT,
  data_inicio DATE,
  data_fim DATE,
  area_ha NUMERIC,
  volume_sacos NUMERIC,
  preco_por_ha NUMERIC,
  preco_por_saco NUMERIC,
  valor_total NUMERIC,
  observacoes TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  dados_ia JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'vigente' CHECK (status IN ('vigente', 'vencido', 'cancelado', 'encerrado')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Aditivos table
CREATE TABLE public.contrato_aditivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  numero_aditivo INT NOT NULL DEFAULT 1,
  data_aditivo DATE,
  descricao TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  dados_ia JSONB DEFAULT '{}'::jsonb,
  novo_preco_por_ha NUMERIC,
  novo_preco_por_saco NUMERIC,
  novo_volume_sacos NUMERIC,
  nova_area_ha NUMERIC,
  novo_valor_total NUMERIC,
  nova_data_fim DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Access control table
CREATE TABLE public.contrato_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pode_visualizar BOOLEAN NOT NULL DEFAULT false,
  pode_inserir BOOLEAN NOT NULL DEFAULT false,
  pode_deletar BOOLEAN NOT NULL DEFAULT false,
  habilitado_por UUID,
  habilitado_em TIMESTAMPTZ DEFAULT now()
);

-- Access check function
CREATE OR REPLACE FUNCTION public.has_contrato_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
    OR EXISTS (SELECT 1 FROM public.contrato_acesso WHERE user_id = _user_id AND pode_visualizar = true)
$$;

CREATE OR REPLACE FUNCTION public.has_contrato_insert(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
    OR EXISTS (SELECT 1 FROM public.contrato_acesso WHERE user_id = _user_id AND pode_inserir = true)
$$;

CREATE OR REPLACE FUNCTION public.has_contrato_delete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_admin()
    OR EXISTS (SELECT 1 FROM public.contrato_acesso WHERE user_id = _user_id AND pode_deletar = true)
$$;

-- RLS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_aditivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato_acesso ENABLE ROW LEVEL SECURITY;

-- Contratos policies
CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.has_contrato_access(auth.uid()));

CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated
  WITH CHECK (public.has_contrato_insert(auth.uid()));

CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated
  USING (deleted_at IS NULL AND public.has_contrato_insert(auth.uid()))
  WITH CHECK (true);

CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated
  USING (public.has_contrato_delete(auth.uid()));

-- Aditivos policies
CREATE POLICY "aditivos_select" ON public.contrato_aditivos FOR SELECT TO authenticated
  USING (public.has_contrato_access(auth.uid()));

CREATE POLICY "aditivos_insert" ON public.contrato_aditivos FOR INSERT TO authenticated
  WITH CHECK (public.has_contrato_insert(auth.uid()));

CREATE POLICY "aditivos_update" ON public.contrato_aditivos FOR UPDATE TO authenticated
  USING (public.has_contrato_insert(auth.uid()));

-- Acesso policies (admin only)
CREATE POLICY "contrato_acesso_select" ON public.contrato_acesso FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "contrato_acesso_all" ON public.contrato_acesso FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Storage bucket for contract PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('contratos', 'contratos', false);

CREATE POLICY "contratos_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contratos' AND public.has_contrato_access(auth.uid()));

CREATE POLICY "contratos_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos' AND public.has_contrato_insert(auth.uid()));

CREATE POLICY "contratos_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contratos' AND public.has_contrato_delete(auth.uid()));

-- Updated at trigger
CREATE TRIGGER contratos_updated_at BEFORE UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add soft delete support
ALTER FUNCTION public.soft_delete_record(_table_name text, _record_id uuid) SET search_path TO 'public';

-- We need to recreate soft_delete_record to include contratos
CREATE OR REPLACE FUNCTION public.soft_delete_record(_table_name text, _record_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (is_admin() OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: admin or manager role required';
  END IF;
  IF _table_name = 'contratos' THEN UPDATE public.contratos SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'inspection_imports' THEN UPDATE public.inspection_imports SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'nicking_observations' THEN UPDATE public.nicking_observations SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'nicking_fixed_points' THEN UPDATE public.nicking_fixed_points SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'phenology_records' THEN UPDATE public.phenology_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'fertilization_records' THEN UPDATE public.fertilization_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'emergence_counts' THEN UPDATE public.emergence_counts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'planting_plan' THEN UPDATE public.planting_plan SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'planting_actual' THEN UPDATE public.planting_actual SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'production_cycles' THEN UPDATE public.production_cycles SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'seed_lots' THEN UPDATE public.seed_lots SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'seed_lot_treatments' THEN UPDATE public.seed_lot_treatments SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'client_contacts' THEN UPDATE public.client_contacts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'clients' THEN UPDATE public.clients SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'cooperators' THEN UPDATE public.cooperators SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'farms' THEN UPDATE public.farms SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pivots' THEN UPDATE public.pivots SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'detasseling_records' THEN UPDATE public.detasseling_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'roguing_records' THEN UPDATE public.roguing_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'chemical_applications' THEN UPDATE public.chemical_applications SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pest_disease_records' THEN UPDATE public.pest_disease_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'yield_estimates' THEN UPDATE public.yield_estimates SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'moisture_samples' THEN UPDATE public.moisture_samples SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'pivot_glebas' THEN UPDATE public.pivot_glebas SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'harvest_plan' THEN UPDATE public.harvest_plan SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'harvest_records' THEN UPDATE public.harvest_records SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'attachments' THEN UPDATE public.attachments SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'stand_counts' THEN UPDATE public.stand_counts SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSIF _table_name = 'ndvi_polygons' THEN UPDATE public.ndvi_polygons SET deleted_at = now() WHERE id = _record_id AND deleted_at IS NULL;
  ELSE RAISE EXCEPTION 'Table not supported for soft delete: %', _table_name;
  END IF;
END;
$function$;
