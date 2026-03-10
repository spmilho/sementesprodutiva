import { useState } from "react";
import type { Acao } from "@/hooks/usePlanoAcoes";
import { QuadranteMatriz } from "./QuadranteMatriz";

interface Props {
  acoes: Acao[];
  onAbrirDetalhe: (acao: Acao) => void;
}

export const QUADRANTES = [
  {
    id: "quick_wins",
    titulo: "Quick Wins",
    subtitulo: "Faça agora",
    descricao: "Alto impacto, baixo esforço",
    cor: "hsl(var(--primary))",
    emoji: "🚀",
  },
  {
    id: "grandes_apostas",
    titulo: "Grandes Apostas",
    subtitulo: "Planeje bem",
    descricao: "Alto impacto, alto esforço",
    cor: "hsl(217 91% 60%)",
    emoji: "🏆",
  },
  {
    id: "enchimento",
    titulo: "Preencher Agenda",
    subtitulo: "Se sobrar tempo",
    descricao: "Baixo impacto, baixo esforço",
    cor: "hsl(var(--muted-foreground))",
    emoji: "📥",
  },
  {
    id: "reconsiderar",
    titulo: "Reconsiderar",
    subtitulo: "Evite ou delegue",
    descricao: "Baixo impacto, alto esforço",
    cor: "hsl(var(--destructive))",
    emoji: "⚠️",
  },
] as const;

function getQuadrante(acao: Acao) {
  const impacto = (acao as any).impacto || "medio";
  const esforco = (acao as any).esforco || "medio";

  if (impacto === "alto" && esforco === "baixo") return "quick_wins";
  if (impacto === "alto" && esforco === "alto") return "grandes_apostas";
  if (impacto === "baixo" && esforco === "baixo") return "enchimento";
  if (impacto === "baixo" && esforco === "alto") return "reconsiderar";
  if (impacto === "alto" && esforco === "medio") return "grandes_apostas";
  if (impacto === "medio" && esforco === "baixo") return "quick_wins";
  if (impacto === "medio" && esforco === "alto") return "reconsiderar";
  return "enchimento";
}

export function MatrizImpactoEsforco({ acoes, onAbrirDetalhe }: Props) {
  const [filtroStatus, setFiltroStatus] = useState("ativas");

  const acoesFiltradas = acoes.filter(a => {
    if (filtroStatus === "ativas") return ["aberta", "em_andamento"].includes(a.status);
    if (filtroStatus === "todas") return true;
    return a.status === filtroStatus;
  });

  const acoesPorQuadrante: Record<string, Acao[]> = {
    quick_wins: [],
    grandes_apostas: [],
    enchimento: [],
    reconsiderar: [],
  };

  acoesFiltradas.forEach(a => {
    const q = getQuadrante(a);
    acoesPorQuadrante[q].push(a);
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Matriz Impacto × Esforço</h2>
          <p className="text-xs text-muted-foreground">{acoesFiltradas.length} ações exibidas</p>
        </div>
        <div className="flex gap-1">
          {[
            { valor: "ativas", label: "Ativas" },
            { valor: "todas", label: "Todas" },
            { valor: "concluida", label: "Concluídas" },
          ].map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltroStatus(f.valor)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtroStatus === f.valor
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>← Baixo Esforço</span>
        <span className="font-semibold">ESFORÇO →</span>
        <span>Alto Esforço →</span>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Top row: Alto Impacto */}
        <QuadranteMatriz
          quadrante={QUADRANTES[0]}
          acoes={acoesPorQuadrante.quick_wins}
          onAbrirDetalhe={onAbrirDetalhe}
        />
        <QuadranteMatriz
          quadrante={QUADRANTES[1]}
          acoes={acoesPorQuadrante.grandes_apostas}
          onAbrirDetalhe={onAbrirDetalhe}
        />
        {/* Bottom row: Baixo Impacto */}
        <QuadranteMatriz
          quadrante={QUADRANTES[2]}
          acoes={acoesPorQuadrante.enchimento}
          onAbrirDetalhe={onAbrirDetalhe}
        />
        <QuadranteMatriz
          quadrante={QUADRANTES[3]}
          acoes={acoesPorQuadrante.reconsiderar}
          onAbrirDetalhe={onAbrirDetalhe}
        />
      </div>

      {/* Axis label bottom */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <span>↑ Alto Impacto (topo)</span>
        <span>·</span>
        <span>↓ Baixo Impacto (baixo)</span>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-4 gap-2">
        {QUADRANTES.map(q => (
          <div key={q.id} className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg">{q.emoji}</p>
            <p className="text-xl font-bold">{acoesPorQuadrante[q.id].length}</p>
            <p className="text-[10px] text-muted-foreground">{q.titulo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
