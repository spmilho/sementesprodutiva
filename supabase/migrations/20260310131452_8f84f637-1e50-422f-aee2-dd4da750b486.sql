
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Leitura com acesso" ON plano_acoes;
DROP POLICY IF EXISTS "Escrita acoes" ON plano_acoes;
DROP POLICY IF EXISTS "acesso_plano_acoes_select" ON plano_acoes;
DROP POLICY IF EXISTS "acesso_plano_acoes_insert" ON plano_acoes;
DROP POLICY IF EXISTS "acesso_plano_acoes_update" ON plano_acoes;
DROP POLICY IF EXISTS "acesso_plano_acoes_delete" ON plano_acoes;

DROP POLICY IF EXISTS "Leitura comentarios" ON plano_acoes_comentarios;
DROP POLICY IF EXISTS "Escrita comentarios" ON plano_acoes_comentarios;
DROP POLICY IF EXISTS "acesso_comentarios_select" ON plano_acoes_comentarios;
DROP POLICY IF EXISTS "acesso_comentarios_insert" ON plano_acoes_comentarios;
DROP POLICY IF EXISTS "acesso_comentarios_update" ON plano_acoes_comentarios;
DROP POLICY IF EXISTS "acesso_comentarios_delete" ON plano_acoes_comentarios;

DROP POLICY IF EXISTS "Leitura anexos" ON plano_acoes_anexos;
DROP POLICY IF EXISTS "acesso_anexos_select" ON plano_acoes_anexos;
DROP POLICY IF EXISTS "acesso_anexos_insert" ON plano_acoes_anexos;
DROP POLICY IF EXISTS "acesso_anexos_delete" ON plano_acoes_anexos;

DROP POLICY IF EXISTS "Admin gerencia acesso" ON plano_acoes_acesso;
DROP POLICY IF EXISTS "usuario_le_proprio_acesso" ON plano_acoes_acesso;
DROP POLICY IF EXISTS "admin_gerencia_acesso_insert" ON plano_acoes_acesso;
DROP POLICY IF EXISTS "admin_gerencia_acesso_update" ON plano_acoes_acesso;
DROP POLICY IF EXISTS "admin_gerencia_acesso_delete" ON plano_acoes_acesso;

DROP POLICY IF EXISTS "Leitura mencoes" ON plano_acoes_mencoes;
DROP POLICY IF EXISTS "Escrita mencoes" ON plano_acoes_mencoes;
DROP POLICY IF EXISTS "acesso_mencoes_select" ON plano_acoes_mencoes;
DROP POLICY IF EXISTS "acesso_mencoes_insert" ON plano_acoes_mencoes;

DROP POLICY IF EXISTS "Usuario ve suas notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "Usuario atualiza suas notificacoes" ON notificacoes;
DROP POLICY IF EXISTS "notif_select" ON notificacoes;
DROP POLICY IF EXISTS "notif_update" ON notificacoes;
DROP POLICY IF EXISTS "notif_insert" ON notificacoes;

-- Recreate policies using existing has_plano_acoes_access function

-- plano_acoes
CREATE POLICY "acesso_plano_acoes_select" ON plano_acoes FOR SELECT TO authenticated USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_plano_acoes_insert" ON plano_acoes FOR INSERT TO authenticated WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_plano_acoes_update" ON plano_acoes FOR UPDATE TO authenticated USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_plano_acoes_delete" ON plano_acoes FOR DELETE TO authenticated USING (public.has_plano_acoes_access(auth.uid()));

-- plano_acoes_comentarios
CREATE POLICY "acesso_comentarios_select" ON plano_acoes_comentarios FOR SELECT TO authenticated USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_comentarios_insert" ON plano_acoes_comentarios FOR INSERT TO authenticated WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_comentarios_update" ON plano_acoes_comentarios FOR UPDATE TO authenticated USING (autor_id = auth.uid());
CREATE POLICY "acesso_comentarios_delete" ON plano_acoes_comentarios FOR DELETE TO authenticated USING (autor_id = auth.uid() OR public.is_admin());

-- plano_acoes_anexos
CREATE POLICY "acesso_anexos_select" ON plano_acoes_anexos FOR SELECT TO authenticated USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_anexos_insert" ON plano_acoes_anexos FOR INSERT TO authenticated WITH CHECK (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_anexos_delete" ON plano_acoes_anexos FOR DELETE TO authenticated USING (enviado_por = auth.uid() OR public.is_admin());

-- plano_acoes_acesso: user reads own row, admin manages all
CREATE POLICY "usuario_le_proprio_acesso" ON plano_acoes_acesso FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin_gerencia_acesso_insert" ON plano_acoes_acesso FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "admin_gerencia_acesso_update" ON plano_acoes_acesso FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "admin_gerencia_acesso_delete" ON plano_acoes_acesso FOR DELETE TO authenticated USING (public.is_admin());

-- plano_acoes_mencoes
CREATE POLICY "acesso_mencoes_select" ON plano_acoes_mencoes FOR SELECT TO authenticated USING (public.has_plano_acoes_access(auth.uid()));
CREATE POLICY "acesso_mencoes_insert" ON plano_acoes_mencoes FOR INSERT TO authenticated WITH CHECK (public.has_plano_acoes_access(auth.uid()));

-- notificacoes
CREATE POLICY "notif_select" ON notificacoes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON notificacoes FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON notificacoes FOR INSERT TO authenticated WITH CHECK (TRUE);
