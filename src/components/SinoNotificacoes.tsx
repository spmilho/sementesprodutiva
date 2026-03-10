import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNotificacoes, CONFIG_TIPO, type Notificacao } from "@/hooks/useNotificacoes";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotificacaoNav } from "@/contexts/NotificacaoNavContext";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SinoNotificacoes() {
  const [aberto, setAberto] = useState(false);
  const { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas } = useNotificacoes();
  const painelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { navegarPara } = useNotificacaoNav();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const ROTA_POR_MODULO: Record<string, string> = {
    plano_acoes: "/plano-acao",
  };

  const handleClick = async (notif: Notificacao) => {
    if (!notif.lida) await marcarLida(notif.id);
    setAberto(false);

    if (!notif.modulo || !notif.referencia_id) return;

    navegarPara({
      modulo: notif.modulo,
      referenciaId: notif.referencia_id,
      tipo: notif.tipo,
    });

    const rotaAlvo = ROTA_POR_MODULO[notif.modulo];
    if (rotaAlvo && !location.pathname.startsWith(rotaAlvo)) {
      navigate(rotaAlvo);
    }
  };

  return (
    <div className="relative" ref={painelRef}>
      {/* Bell button */}
      <button
        onClick={() => setAberto(v => !v)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notificações"
      >
        <Bell className={`h-5 w-5 ${naoLidas > 0 ? "text-primary" : "text-muted-foreground"}`} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">Notificações</span>
              {naoLidas > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {naoLidas}
                </span>
              )}
            </div>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-sm font-medium text-foreground">Nenhuma notificação</p>
                <p className="text-xs text-muted-foreground">Você está em dia!</p>
              </div>
            ) : (
              <div>
                {notificacoes.map((notif) => {
                  const config = CONFIG_TIPO[notif.tipo] || { icone: "🔔", cor: "hsl(var(--muted-foreground))" };

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 ${
                        !notif.lida ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Icon / Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                          {notif.gerador?.full_name ? (
                            <span className="text-sm font-bold text-primary">
                              {notif.gerador.full_name.charAt(0).toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-sm">{config.icone}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">
                          {config.icone}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight truncate">
                          {notif.titulo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.mensagem}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(notif.criado_em), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.lida && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <p className="text-[10px] text-muted-foreground text-center">
                Mostrando as últimas {notificacoes.length} notificações
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
