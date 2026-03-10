import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  modulo: string | null;
  referencia_id: string | null;
  gerado_por: string | null;
  lida: boolean;
  lida_em: string | null;
  criado_em: string;
  gerador?: { full_name: string } | null;
}

export const CONFIG_TIPO: Record<string, { icone: string; cor: string }> = {
  comentario_acao:   { icone: "💬", cor: "hsl(var(--primary))" },
  mencao_comentario: { icone: "👋", cor: "hsl(var(--destructive))" },
  nova_acao:         { icone: "📋", cor: "hsl(var(--chart-1))" },
  prazo_acao:        { icone: "⏰", cor: "hsl(var(--chart-4))" },
  post_feed_campo:   { icone: "🌾", cor: "hsl(var(--primary))" },
  aplicacao_campo:   { icone: "🧪", cor: "hsl(var(--chart-3))" },
  visita_campo:      { icone: "📍", cor: "hsl(var(--chart-5))" },
};

export function useNotificacoes() {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotificacoes = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase as any)
      .from("notificacoes")
      .select("*, gerador:gerado_por(full_name)")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(50);

    if (data) {
      setNotificacoes(data);
      setNaoLidas(data.filter((n: any) => !n.lida).length);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchNotificacoes(); }, [fetchNotificacoes]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notificacoes_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch to get joined data (gerador name)
          fetchNotificacoes();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchNotificacoes]);

  const marcarLida = async (id: string) => {
    await (supabase as any)
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user?.id);

    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setNaoLidas(prev => Math.max(0, prev - 1));
  };

  const marcarTodasLidas = async () => {
    await (supabase as any)
      .from("notificacoes")
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq("user_id", user?.id)
      .eq("lida", false);

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setNaoLidas(0);
  };

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, refetch: fetchNotificacoes };
}
