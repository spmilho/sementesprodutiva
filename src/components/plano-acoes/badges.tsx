import { Badge } from "@/components/ui/badge";
import type { StatusAcao, PrioridadeAcao } from "@/hooks/usePlanoAcoes";

const coresPrioridade: Record<PrioridadeAcao, string> = {
  critica: "bg-red-100 text-red-800 border-red-200",
  alta: "bg-orange-100 text-orange-800 border-orange-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixa: "bg-green-100 text-green-800 border-green-200",
};
const labelsPrioridade: Record<PrioridadeAcao, string> = {
  critica: "🔴 Crítica", alta: "🟠 Alta", media: "🟡 Média", baixa: "🟢 Baixa",
};

const coresStatus: Record<StatusAcao, string> = {
  aberta: "bg-blue-100 text-blue-800 border-blue-200",
  em_andamento: "bg-purple-100 text-purple-800 border-purple-200",
  concluida: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelada: "bg-gray-100 text-gray-500 border-gray-200",
};
const labelsStatus: Record<StatusAcao, string> = {
  aberta: "📋 Aberta", em_andamento: "⚙️ Em andamento", concluida: "✅ Concluída", cancelada: "❌ Cancelada",
};

export function BadgePrioridade({ p }: { p: PrioridadeAcao }) {
  return <Badge variant="outline" className={coresPrioridade[p]}>{labelsPrioridade[p]}</Badge>;
}

export function BadgeStatus({ s }: { s: StatusAcao }) {
  return <Badge variant="outline" className={coresStatus[s]}>{labelsStatus[s]}</Badge>;
}
