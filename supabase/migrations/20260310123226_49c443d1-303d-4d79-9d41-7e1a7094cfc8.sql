
-- Tabela de notificações in-app
CREATE TABLE notificacoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL,
  titulo        TEXT NOT NULL,
  mensagem      TEXT NOT NULL,
  modulo        TEXT,
  referencia_id UUID,
  gerado_por    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lida          BOOLEAN DEFAULT FALSE,
  lida_em       TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON notificacoes (user_id, lida, criado_em DESC);
CREATE INDEX ON notificacoes (user_id, criado_em DESC);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve suas notificacoes"
  ON notificacoes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuario atualiza suas notificacoes"
  ON notificacoes FOR UPDATE
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Função centralizada para criar notificações
CREATE OR REPLACE FUNCTION criar_notificacao(
  p_user_id       UUID,
  p_tipo          TEXT,
  p_titulo        TEXT,
  p_mensagem      TEXT,
  p_modulo        TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_gerado_por    UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id = p_gerado_por THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO notificacoes (user_id, tipo, titulo, mensagem, modulo, referencia_id, gerado_por)
  VALUES (p_user_id, p_tipo, p_titulo, p_mensagem, p_modulo, p_referencia_id, p_gerado_por)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: novo comentário em ação
CREATE OR REPLACE FUNCTION trigger_notif_comentario_acao()
RETURNS TRIGGER AS $$
DECLARE
  v_acao RECORD;
  v_autor_nome TEXT;
BEGIN
  SELECT what, criado_por, who_resp INTO v_acao
  FROM plano_acoes WHERE id = NEW.acao_id;
  
  SELECT full_name INTO v_autor_nome
  FROM profiles WHERE id = NEW.autor_id;

  IF v_acao.criado_por IS NOT NULL AND v_acao.criado_por != NEW.autor_id THEN
    PERFORM criar_notificacao(
      v_acao.criado_por, 'comentario_acao',
      v_autor_nome || ' comentou na ação', LEFT(NEW.texto, 120),
      'plano_acoes', NEW.acao_id, NEW.autor_id
    );
  END IF;

  IF v_acao.who_resp IS NOT NULL
     AND v_acao.who_resp != NEW.autor_id
     AND v_acao.who_resp != COALESCE(v_acao.criado_por, gen_random_uuid())
  THEN
    PERFORM criar_notificacao(
      v_acao.who_resp, 'comentario_acao',
      v_autor_nome || ' comentou na ação', LEFT(NEW.texto, 120),
      'plano_acoes', NEW.acao_id, NEW.autor_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notif_comentario_acao
  AFTER INSERT ON plano_acoes_comentarios
  FOR EACH ROW EXECUTE FUNCTION trigger_notif_comentario_acao();

-- Trigger: nova ação criada
CREATE OR REPLACE FUNCTION trigger_notif_nova_acao()
RETURNS TRIGGER AS $$
DECLARE
  v_criador_nome TEXT;
  v_destinatario RECORD;
BEGIN
  SELECT full_name INTO v_criador_nome FROM profiles WHERE id = NEW.criado_por;

  FOR v_destinatario IN
    SELECT user_id FROM plano_acoes_acesso WHERE habilitado = TRUE
  LOOP
    PERFORM criar_notificacao(
      v_destinatario.user_id, 'nova_acao',
      v_criador_nome || ' criou uma nova ação', LEFT(NEW.what, 120),
      'plano_acoes', NEW.id, NEW.criado_por
    );
  END LOOP;

  FOR v_destinatario IN
    SELECT id AS user_id FROM profiles WHERE role = 'Admin' AND is_active = TRUE
  LOOP
    PERFORM criar_notificacao(
      v_destinatario.user_id, 'nova_acao',
      v_criador_nome || ' criou uma nova ação', LEFT(NEW.what, 120),
      'plano_acoes', NEW.id, NEW.criado_por
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notif_nova_acao
  AFTER INSERT ON plano_acoes
  FOR EACH ROW EXECUTE FUNCTION trigger_notif_nova_acao();

-- Trigger: menção em comentário
CREATE OR REPLACE FUNCTION trigger_notif_mencao()
RETURNS TRIGGER AS $$
DECLARE
  v_autor_id UUID;
  v_autor_nome TEXT;
  v_texto TEXT;
  v_acao_what TEXT;
BEGIN
  -- Get author from the comment
  SELECT c.autor_id, c.texto, a.what INTO v_autor_id, v_texto, v_acao_what
  FROM plano_acoes_comentarios c
  JOIN plano_acoes a ON a.id = c.acao_id
  WHERE c.id = NEW.comentario_id;

  SELECT full_name INTO v_autor_nome FROM profiles WHERE id = v_autor_id;

  PERFORM criar_notificacao(
    NEW.usuario_id, 'mencao_comentario',
    v_autor_nome || ' mencionou você em um comentário', LEFT(v_texto, 120),
    'plano_acoes', NEW.acao_id, v_autor_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notif_mencao
  AFTER INSERT ON plano_acoes_mencoes
  FOR EACH ROW EXECUTE FUNCTION trigger_notif_mencao();
