CREATE TABLE plano_acoes_mencoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id  UUID NOT NULL REFERENCES plano_acoes_comentarios(id) ON DELETE CASCADE,
  acao_id        UUID NOT NULL REFERENCES plano_acoes(id) ON DELETE CASCADE,
  usuario_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON plano_acoes_mencoes (comentario_id);
CREATE INDEX ON plano_acoes_mencoes (usuario_id);

ALTER TABLE plano_acoes_mencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura mencoes"
  ON plano_acoes_mencoes FOR SELECT
  USING (public.has_plano_acoes_access(auth.uid()));

CREATE POLICY "Escrita mencoes"
  ON plano_acoes_mencoes FOR INSERT
  WITH CHECK (public.has_plano_acoes_access(auth.uid()));