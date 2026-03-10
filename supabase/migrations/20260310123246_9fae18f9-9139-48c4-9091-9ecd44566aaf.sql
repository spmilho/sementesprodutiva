
-- Fix search_path for all new functions
ALTER FUNCTION criar_notificacao(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID) SET search_path = public;
ALTER FUNCTION trigger_notif_comentario_acao() SET search_path = public;
ALTER FUNCTION trigger_notif_nova_acao() SET search_path = public;
ALTER FUNCTION trigger_notif_mencao() SET search_path = public;
