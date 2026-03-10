
-- Fix trigger: use user_roles instead of profiles.role
CREATE OR REPLACE FUNCTION trigger_notif_nova_acao()
RETURNS TRIGGER AS $$
DECLARE
  v_criador_nome TEXT;
  v_destinatario RECORD;
BEGIN
  SELECT full_name INTO v_criador_nome FROM profiles WHERE id = NEW.criado_por;

  -- Users with module access
  FOR v_destinatario IN
    SELECT user_id FROM plano_acoes_acesso WHERE habilitado = TRUE
  LOOP
    PERFORM criar_notificacao(
      v_destinatario.user_id, 'nova_acao',
      v_criador_nome || ' criou uma nova ação', LEFT(NEW.what, 120),
      'plano_acoes', NEW.id, NEW.criado_por
    );
  END LOOP;

  -- Admins (from user_roles table)
  FOR v_destinatario IN
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM criar_notificacao(
      v_destinatario.user_id, 'nova_acao',
      v_criador_nome || ' criou uma nova ação', LEFT(NEW.what, 120),
      'plano_acoes', NEW.id, NEW.criado_por
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
