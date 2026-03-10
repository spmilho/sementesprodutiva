import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

export type StatusAcao = "aberta" | "em_andamento" | "concluida" | "cancelada";
export type PrioridadeAcao = "baixa" | "media" | "alta" | "critica";

export interface Acao {
  id: string;
  what: string;
  why: string;
  where_local: string;
  who_resp: string | null;
  when_prazo: string;
  how: string;
  how_much: string | null;
  status: StatusAcao;
  prioridade: PrioridadeAcao;
  categoria: string | null;
  concluida_em: string | null;
  ocultar_concluida: boolean;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  responsavel?: { full_name: string } | null;
  criador?: { full_name: string } | null;
}

export interface Comentario {
  id: string;
  acao_id: string;
  autor_id: string;
  texto: string;
  criado_em: string;
  editado_em: string | null;
  autor?: { full_name: string } | null;
  anexos?: Anexo[];
}

export interface Anexo {
  id: string;
  acao_id: string;
  comentario_id: string | null;
  enviado_por: string | null;
  nome_arquivo: string;
  url: string;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  criado_em: string;
}

export function usePlanoAcoesAccess() {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    if (isAdmin) { setHasAccess(true); setLoading(false); return; }

    (supabase as any)
      .from("plano_acoes_acesso")
      .select("habilitado")
      .eq("user_id", user.id)
      .eq("habilitado", true)
      .maybeSingle()
      .then(({ data }: any) => {
        setHasAccess(!!data);
        setLoading(false);
      });
  }, [user?.id, isAdmin]);

  return { hasAccess, loading };
}

export function usePlanoAcoes(mostrarConcluidas = false) {
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAcoes = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("plano_acoes")
      .select(`*, responsavel:who_resp(full_name), criador:criado_por(full_name)`)
      .order("when_prazo", { ascending: true });

    if (!mostrarConcluidas) {
      query = query.or("status.neq.concluida,and(status.eq.concluida,ocultar_concluida.eq.false)");
    }

    const { data, error } = await query;
    if (!error && data) setAcoes(data);
    setLoading(false);
  }, [mostrarConcluidas]);

  useEffect(() => { fetchAcoes(); }, [fetchAcoes]);

  useEffect(() => {
    const channel = supabase
      .channel("plano_acoes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "plano_acoes" }, fetchAcoes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAcoes]);

  return { acoes, loading, refetch: fetchAcoes };
}

export function useComentarios(acaoId: string | null) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComentarios = useCallback(async () => {
    if (!acaoId) return;
    const { data } = await (supabase as any)
      .from("plano_acoes_comentarios")
      .select(`*, autor:autor_id(full_name), anexos:plano_acoes_anexos(*)`)
      .eq("acao_id", acaoId)
      .order("criado_em", { ascending: true });
    if (data) setComentarios(data);
    setLoading(false);
  }, [acaoId]);

  useEffect(() => {
    if (!acaoId) return;
    fetchComentarios();
    const channel = supabase
      .channel(`comentarios_${acaoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plano_acoes_comentarios", filter: `acao_id=eq.${acaoId}` }, fetchComentarios)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [acaoId, fetchComentarios]);

  return { comentarios, loading, refetch: fetchComentarios };
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null }[]>([]);

  useEffect(() => {
    (supabase as any).rpc("get_all_profiles")
      .then(({ data }: any) => { if (data) setProfiles(data); });
  }, []);

  return profiles;
}
