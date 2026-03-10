
-- ─── TABELA PRINCIPAL DE AÇÕES ─────────────────────────────────────────────
CREATE TABLE plano_acoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  what            TEXT NOT NULL,
  why             TEXT NOT NULL,
  where_local     TEXT NOT NULL,
  who_resp        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  when_prazo      DATE NOT NULL,
  how             TEXT NOT NULL,
  how_much        TEXT,
  status          TEXT NOT NULL DEFAULT 'aberta'
                  CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
  prioridade      TEXT NOT NULL DEFAULT 'media'
                  CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
  categoria       TEXT,
  concluida_em    TIMESTAMPTZ,
  ocultar_concluida BOOLEAN DEFAULT FALSE,
  criado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COMENTÁRIOS ──────────────────────────────────────────────────────────
CREATE TABLE plano_acoes_comentarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id         UUID NOT NULL REFERENCES plano_acoes(id) ON DELETE CASCADE,
  autor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  texto           TEXT NOT NULL,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  editado_em      TIMESTAMPTZ
);

-- ─── ANEXOS ───────────────────────────────────────────────────────────────
CREATE TABLE plano_acoes_anexos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id         UUID NOT NULL REFERENCES plano_acoes(id) ON DELETE CASCADE,
  comentario_id   UUID REFERENCES plano_acoes_comentarios(id) ON DELETE CASCADE,
  enviado_por     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nome_arquivo    TEXT NOT NULL,
  url             TEXT NOT NULL,
  tipo_mime       TEXT,
  tamanho_bytes   BIGINT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTROLE DE ACESSO AO MÓDULO ─────────────────────────────────────────
CREATE TABLE plano_acoes_acesso (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  habilitado      BOOLEAN DEFAULT TRUE,
  habilitado_por  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  habilitado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LOG DE NOTIFICAÇÕES ──────────────────────────────────────────────────
CREATE TABLE plano_acoes_notif_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao_id         UUID NOT NULL REFERENCES plano_acoes(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  enviado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ÍNDICES ──────────────────────────────────────────────────────────────
CREATE INDEX idx_plano_acoes_status ON plano_acoes (status);
CREATE INDEX idx_plano_acoes_prazo ON plano_acoes (when_prazo);
CREATE INDEX idx_plano_acoes_resp ON plano_acoes (who_resp);
CREATE INDEX idx_plano_acoes_comentarios_acao ON plano_acoes_comentarios (acao_id);
CREATE INDEX idx_plano_acoes_anexos_acao ON plano_acoes_anexos (acao_id);

-- ─── TRIGGER: atualiza atualizado_em ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_plano_acoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizado_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plano_acoes_updated
  BEFORE UPDATE ON plano_acoes
  FOR EACH ROW EXECUTE FUNCTION update_plano_acoes_timestamp();

-- ─── HELPER FUNCTION ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION has_plano_acoes_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.plano_acoes_acesso WHERE user_id = _user_id AND habilitado = TRUE)
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE plano_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_acoes_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_acoes_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_acoes_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE plano_acoes_notif_log ENABLE ROW LEVEL SECURITY;

-- plano_acoes policies
CREATE POLICY "plano_acoes_select" ON plano_acoes FOR SELECT TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_acoes_insert" ON plano_acoes FOR INSERT TO authenticated
  WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_acoes_update" ON plano_acoes FOR UPDATE TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_acoes_delete" ON plano_acoes FOR DELETE TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()));

-- comentarios policies
CREATE POLICY "plano_comentarios_select" ON plano_acoes_comentarios FOR SELECT TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_comentarios_insert" ON plano_acoes_comentarios FOR INSERT TO authenticated
  WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_comentarios_update" ON plano_acoes_comentarios FOR UPDATE TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()) AND autor_id = auth.uid());
CREATE POLICY "plano_comentarios_delete" ON plano_acoes_comentarios FOR DELETE TO authenticated
  USING (public.is_admin() OR autor_id = auth.uid());

-- anexos policies
CREATE POLICY "plano_anexos_select" ON plano_acoes_anexos FOR SELECT TO authenticated
  USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_anexos_insert" ON plano_acoes_anexos FOR INSERT TO authenticated
  WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "plano_anexos_delete" ON plano_acoes_anexos FOR DELETE TO authenticated
  USING (public.is_admin());

-- acesso policies (admin only)
CREATE POLICY "plano_acesso_select" ON plano_acoes_acesso FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "plano_acesso_insert" ON plano_acoes_acesso FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "plano_acesso_update" ON plano_acoes_acesso FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "plano_acesso_delete" ON plano_acoes_acesso FOR DELETE TO authenticated
  USING (public.is_admin());

-- notif log policies
CREATE POLICY "plano_notif_select" ON plano_acoes_notif_log FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "plano_notif_insert" ON plano_acoes_notif_log FOR INSERT TO authenticated
  WITH CHECK (public.has_plano_acoes_access(auth.uid()));

-- ─── REALTIME ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE plano_acoes;
ALTER PUBLICATION supabase_realtime ADD TABLE plano_acoes_comentarios;

-- ─── STORAGE BUCKET ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plano-acoes-anexos', 'plano-acoes-anexos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

CREATE POLICY "plano_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plano-acoes-anexos' AND public.has_plano_acoes_access(auth.uid()));

CREATE POLICY "plano_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'plano-acoes-anexos');
