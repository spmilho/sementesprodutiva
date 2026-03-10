import { useState } from "react";
import type { Acao } from "@/hooks/usePlanoAcoes";

interface QuadranteDef {
  id: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  cor: string;
  emoji: string;
}

interface Props {
  quadrante: QuadranteDef;
  acoes: Acao[];
  onAbrirDetalhe: (acao: Acao) => void;
}

const COR_STATUS: Record<string, string> = {
  aberta: "bg-blue-500",
  em_andamento: "bg-violet-500",
  concluida: "bg-primary",
  cancelada: "bg-muted-foreground",
};

export function QuadranteMatriz({ quadrante, acoes, onAbrirDetalhe }: Props) {
  const [expandido, setExpandido] = useState(false);
  const MAX_VISIVEIS = 3;
  const visiveis = expandido ? acoes : acoes.slice(0, MAX_VISIVEIS);
  const temMais = acoes.length > MAX_VISIVEIS;

  const isPrazoVencido = (a: Acao) =>
    ["aberta", "em_andamento"].includes(a.status) &&
    new Date(a.when_prazo + "T23:59:59") < new Date();

  return (
    <div className="rounded-xl border bg-card p-3 min-h-[180px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{quadrante.emoji}</span>
            <span className="text-sm font-semibold">{quadrante.titulo}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{quadrante.subtitulo}</p>
        </div>
        <span className="text-xs font-bold bg-muted rounded-full h-6 min-w-[24px] flex items-center justify-center px-2">
          {acoes.length}
        </span>
      </div>

      <div className="h-px bg-border mb-2" />

      {/* Action list */}
      <div className="flex-1 space-y-1.5">
        {acoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <span className="text-lg opacity-50">—</span>
            <p className="text-[10px]">Nenhuma ação</p>
          </div>
        ) : (
          <>
            {visiveis.map(acao => (
              <button
                key={acao.id}
                onClick={() => onAbrirDetalhe(acao)}
                className="w-full text-left p-2 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${COR_STATUS[acao.status] || "bg-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {acao.what}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {acao.responsavel?.full_name && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {acao.responsavel.full_name.split(" ")[0]}
                        </span>
                      )}
                      <span className={`text-[10px] ${isPrazoVencido(acao) ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                        {isPrazoVencido(acao) ? "⚠️ " : ""}
                        {new Date(acao.when_prazo + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {temMais && (
              <button
                onClick={e => { e.stopPropagation(); setExpandido(v => !v); }}
                className="text-[10px] text-primary hover:underline w-full text-center py-1"
              >
                {expandido ? "↑ Ver menos" : `+ ${acoes.length - MAX_VISIVEIS} mais`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
