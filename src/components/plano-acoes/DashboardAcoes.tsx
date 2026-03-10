import { ClipboardList, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Acao } from "@/hooks/usePlanoAcoes";

const prioridadeCores: Record<string, string> = {
  critica: "#ef4444", alta: "#f97316", media: "#eab308", baixa: "#22c55e",
};

interface Props { acoes: Acao[] }

export function DashboardAcoes({ acoes }: Props) {
  const total = acoes.length;
  const emAberto = acoes.filter(a => ["aberta", "em_andamento"].includes(a.status)).length;
  const vencidas = acoes.filter(a => ["aberta", "em_andamento"].includes(a.status) && new Date(a.when_prazo) < new Date()).length;
  const concluidas = acoes.filter(a => a.status === "concluida").length;

  const chartData = (["critica", "alta", "media", "baixa"] as const).map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    count: acoes.filter(a => a.prioridade === p && a.status !== "cancelada").length,
    color: prioridadeCores[p],
  }));

  const cards = [
    { label: "Total", value: total, icon: ClipboardList, color: "text-primary" },
    { label: "Em aberto", value: emAberto, icon: Clock, color: "text-blue-600" },
    { label: "Vencidas", value: vencidas, icon: AlertCircle, color: "text-red-600", highlight: vencidas > 0 },
    { label: "Concluídas", value: concluidas, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <Card key={c.label} className={c.highlight ? "border-red-300 bg-red-50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase">{c.label}</span>
                <c.icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Ações por prioridade</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
