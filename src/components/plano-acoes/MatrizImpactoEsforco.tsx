import { useState, useRef, useCallback } from "react";
import { X, ExternalLink, Calendar, User, AlertCircle } from "lucide-react";
import type { Acao } from "@/hooks/usePlanoAcoes";

interface Props {
  acoes: Acao[];
  onAbrirDetalhe: (acao: Acao) => void;
}

const COORD_MAP: Record<string, number> = {
  baixo: 20,
  medio: 50,
  alto: 80,
};

function jitter(id: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return ((Math.abs(hash) % 1000) / 1000 - 0.5) * range;
}

function getPosicao(acao: Acao) {
  const impacto = (acao as any).impacto || "medio";
  const esforco = (acao as any).esforco || "medio";
  const baseX = COORD_MAP[impacto];
  const baseY = 100 - COORD_MAP[esforco];
  return {
    x: Math.max(4, Math.min(96, baseX + jitter(acao.id, 14))),
    y: Math.max(4, Math.min(96, baseY + jitter(acao.id + "y", 14))),
  };
}

const COR_PRIORIDADE: Record<string, string> = {
  critica: "hsl(0 84% 60%)",
  alta: "hsl(25 95% 53%)",
  media: "hsl(43 80% 60%)",
  baixa: "hsl(140 30% 45%)",
};

function isPrazoVencido(acao: Acao) {
  return (
    ["aberta", "em_andamento"].includes(acao.status) &&
    new Date(acao.when_prazo + "T23:59:59") < new Date()
  );
}

interface PopoverData {
  acao: Acao;
  x: number;
  y: number;
}

export function MatrizImpactoEsforco({ acoes, onAbrirDetalhe }: Props) {
  const [filtroStatus, setFiltroStatus] = useState<"ativas" | "todas" | "concluida">("ativas");
  const [popover, setPopover] = useState<PopoverData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const acoesFiltradas = acoes.filter((a) => {
    if (filtroStatus === "ativas") return ["aberta", "em_andamento"].includes(a.status);
    if (filtroStatus === "concluida") return a.status === "concluida";
    return true;
  });

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-bloco-acao]")) return;
    setPopover(null);
  }, []);

  const contagem = {
    quickWins: acoesFiltradas.filter((a) => COORD_MAP[(a as any).impacto || "medio"] >= 50 && COORD_MAP[(a as any).esforco || "medio"] <= 50).length,
    grandesApostas: acoesFiltradas.filter((a) => COORD_MAP[(a as any).impacto || "medio"] >= 50 && COORD_MAP[(a as any).esforco || "medio"] > 50).length,
    enchimento: acoesFiltradas.filter((a) => COORD_MAP[(a as any).impacto || "medio"] < 50 && COORD_MAP[(a as any).esforco || "medio"] <= 50).length,
    reconsiderar: acoesFiltradas.filter((a) => COORD_MAP[(a as any).impacto || "medio"] < 50 && COORD_MAP[(a as any).esforco || "medio"] > 50).length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Matriz Impacto × Esforço</h2>
          <p className="text-xs text-muted-foreground">
            {acoesFiltradas.length} ações · clique em um bloco para ver os detalhes
          </p>
        </div>
        <div className="flex gap-1">
          {(["ativas", "todas", "concluida"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroStatus === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f === "ativas" ? "Ativas" : f === "todas" ? "Todas" : "Concluídas"}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap items-center gap-3 text-[10px]">
        {Object.entries(COR_PRIORIDADE).map(([prioridade, cor]) => (
          <div key={prioridade} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor }} />
            <span className="capitalize text-muted-foreground">{prioridade}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-2.5 rounded-sm border-2 border-dashed border-destructive" />
          <span className="text-muted-foreground">Prazo vencido</span>
        </div>
      </div>

      {/* Container da matriz */}
      <div className="flex gap-0">
        {/* Label eixo Y */}
        <div className="flex flex-col items-center justify-center w-5 relative">
          <span
            className="text-[10px] font-semibold text-muted-foreground tracking-wider absolute"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Esforço
          </span>
        </div>
        <div className="flex flex-col items-center justify-between py-2 w-7 text-[9px] text-muted-foreground">
          <span>Alto</span>
          <span>Baixo</span>
        </div>

        {/* Área da matriz */}
        <div className="flex-1 flex flex-col">
          <div
            ref={containerRef}
            className="relative w-full border border-border rounded-xl overflow-hidden bg-card"
            style={{ aspectRatio: "4/3" }}
            onClick={handleContainerClick}
          >
            {/* Fundo dos 4 quadrantes */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {/* Topo-Esquerda: Alto Esforço + Baixo Impacto = Reconsiderar */}
              <div className="bg-destructive/5 flex items-start justify-start p-3">
                <div className="opacity-40">
                  <p className="text-[10px] font-bold text-destructive">⚠️ Reconsiderar</p>
                  <p className="text-[9px] text-muted-foreground">Evite ou delegue</p>
                  <p className="text-lg font-bold text-destructive/60">{contagem.reconsiderar}</p>
                </div>
              </div>
              {/* Topo-Direita: Alto Esforço + Alto Impacto = Grandes Apostas */}
              <div className="bg-blue-500/5 flex items-start justify-end p-3">
                <div className="opacity-40 text-right">
                  <p className="text-[10px] font-bold text-blue-600">🏆 Grandes Apostas</p>
                  <p className="text-[9px] text-muted-foreground">Planeje bem</p>
                  <p className="text-lg font-bold text-blue-500/60">{contagem.grandesApostas}</p>
                </div>
              </div>
              {/* Baixo-Esquerda: Baixo Esforço + Baixo Impacto = Preencher Agenda */}
              <div className="bg-muted/30 flex items-end justify-start p-3">
                <div className="opacity-40">
                  <p className="text-[10px] font-bold text-muted-foreground">📥 Preencher Agenda</p>
                  <p className="text-[9px] text-muted-foreground">Se sobrar tempo</p>
                  <p className="text-lg font-bold text-muted-foreground/60">{contagem.enchimento}</p>
                </div>
              </div>
              {/* Baixo-Direita: Baixo Esforço + Alto Impacto = Quick Wins */}
              <div className="bg-primary/5 flex items-end justify-end p-3">
                <div className="opacity-40 text-right">
                  <p className="text-[10px] font-bold text-primary">🚀 Quick Wins</p>
                  <p className="text-[9px] text-muted-foreground">Faça agora</p>
                  <p className="text-lg font-bold text-primary/60">{contagem.quickWins}</p>
                </div>
              </div>
            </div>

            {/* Linhas divisórias centrais */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

            {/* Blocos das ações */}
            {acoesFiltradas.map((acao) => {
              const pos = getPosicao(acao);
              const cor = COR_PRIORIDADE[acao.prioridade] || COR_PRIORIDADE.media;
              const vencida = isPrazoVencido(acao);
              const concluida = acao.status === "concluida";
              const isAtivo = popover?.acao.id === acao.id;

              return (
                <div
                  key={acao.id}
                  data-bloco-acao
                  className="absolute cursor-pointer group z-10"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopover(isAtivo ? null : { acao, x: pos.x, y: pos.y });
                  }}
                >
                  <div
                    className={`h-4 w-4 rounded-sm shadow-md transition-all duration-150 ${
                      isAtivo ? "scale-150 ring-2 ring-primary" : "hover:scale-125"
                    } ${concluida ? "opacity-40" : ""}`}
                    style={{
                      backgroundColor: cor,
                      border: vencida ? "2px dashed hsl(var(--destructive))" : "1px solid rgba(255,255,255,0.3)",
                    }}
                  />
                  {/* Tooltip hover */}
                  {!isAtivo && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30 pointer-events-none">
                      <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-lg max-w-[180px]">
                        <p className="text-[10px] font-medium text-foreground line-clamp-2">{acao.what}</p>
                      </div>
                      <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Popover da ação selecionada */}
            {popover && (() => {
              const abrirDireita = popover.x < 60;
              const abrirBaixo = popover.y < 45;
              const cor = COR_PRIORIDADE[popover.acao.prioridade] || COR_PRIORIDADE.media;

              return (
                <div
                  className="absolute z-40"
                  style={{
                    left: `${popover.x}%`,
                    top: `${popover.y}%`,
                    transform: `translate(${abrirDireita ? "8px" : "calc(-100% - 8px)"}, ${abrirBaixo ? "8px" : "calc(-100% - 8px)"})`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-popover border border-border rounded-xl shadow-2xl w-[260px] overflow-hidden">
                    {/* Header */}
                    <div className="p-3 border-b border-border" style={{ borderTopColor: cor, borderTopWidth: 3 }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground line-clamp-2 flex-1">
                          {popover.acao.what}
                        </p>
                        <button
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => setPopover(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Corpo */}
                    <div className="p-3 space-y-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          ↑ Impacto {(popover.acao as any).impacto || "médio"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">
                          ◆ Esforço {(popover.acao as any).esforco || "médio"}
                        </span>
                      </div>

                      {popover.acao.responsavel?.full_name && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          {popover.acao.responsavel.full_name}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {isPrazoVencido(popover.acao) ? (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        ) : (
                          <Calendar className="h-3 w-3" />
                        )}
                        <span className={isPrazoVencido(popover.acao) ? "text-destructive font-semibold" : ""}>
                          {isPrazoVencido(popover.acao) ? "⚠️ Vencida · " : ""}
                          {new Date(popover.acao.when_prazo + "T12:00:00").toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {{ aberta: "📋 Aberta", em_andamento: "⚙️ Em andamento", concluida: "✅ Concluída", cancelada: "❌ Cancelada" }[popover.acao.status]}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border p-2">
                      <button
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium py-1"
                        onClick={() => {
                          setPopover(null);
                          onAbrirDetalhe(popover.acao);
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver ação completa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Rótulos eixo X */}
          <div className="flex items-center justify-between px-2 pt-1 text-[9px] text-muted-foreground">
            <span>Baixo</span>
            <span className="font-semibold tracking-wider">Impacto</span>
            <span>Alto</span>
          </div>
        </div>
      </div>

      {/* Resumo por quadrante */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { emoji: "🚀", label: "Quick Wins", count: contagem.quickWins, cor: "text-primary" },
          { emoji: "🏆", label: "Grandes Apostas", count: contagem.grandesApostas, cor: "text-blue-500" },
          { emoji: "📥", label: "Preencher Agenda", count: contagem.enchimento, cor: "text-muted-foreground" },
          { emoji: "⚠️", label: "Reconsiderar", count: contagem.reconsiderar, cor: "text-destructive" },
        ].map((q) => (
          <div key={q.label} className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg">{q.emoji}</p>
            <p className={`text-xl font-bold ${q.cor}`}>{q.count}</p>
            <p className="text-[10px] text-muted-foreground">{q.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
