import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import type { RoguingEvaluation, RoguingRequest, RoguingExecution } from "./types";
import { getFrequencyLabel, getParentLabel } from "./types";
import EvaluationDetailDrawer from "./EvaluationDetailDrawer";

interface Props {
  evaluations: RoguingEvaluation[];
  requests: RoguingRequest[];
  executions: RoguingExecution[];
}

interface TimelineItem {
  date: string;
  type: "evaluation" | "request" | "execution";
  data: any;
}

export default function RoguingTimeline({ evaluations, requests, executions }: Props) {
  const [selectedEval, setSelectedEval] = useState<RoguingEvaluation | null>(null);

  const items = useMemo(() => {
    const all: TimelineItem[] = [];
    evaluations.forEach(e => all.push({ date: e.evaluation_date, type: "evaluation", data: e }));
    requests.forEach(r => all.push({ date: r.request_date, type: "request", data: r }));
    executions.forEach(x => all.push({ date: x.execution_date, type: "execution", data: x }));
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evaluations, requests, executions]);

  if (items.length === 0) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum histórico de roguing.</CardContent></Card>;
  }

  const conclusionColors: Record<string, string> = {
    clean: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
    observe: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
    roguing: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    urgent_roguing: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  };

  const conclusionLabels: Record<string, string> = {
    clean: "🟢 Campo limpo",
    observe: "🟡 Observar",
    roguing: "🟠 Roguing recomendado",
    urgent_roguing: "🔴 Roguing urgente",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">📅 Histórico de Roguing</h3>
      <div className="relative border-l-2 border-muted ml-4 space-y-4">
        {items.map((item, i) => (
          <div key={i} className="relative pl-6">
            <div className={`absolute left-[-9px] top-3 w-4 h-4 rounded-full border-2 border-background ${
              item.type === "evaluation" ? "bg-blue-500" :
              item.type === "request" ? "bg-orange-500" : "bg-green-500"
            }`} />
            <Card
              className={item.type === "evaluation" ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
              onClick={() => item.type === "evaluation" && setSelectedEval(item.data)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{format(parseISO(item.date), "dd/MM/yy")}</span>
                  {item.type === "evaluation" && (
                    <>
                      <Badge variant="outline" className="text-xs">📊 Avaliação</Badge>
                      <Badge variant="outline" className={`text-xs ${conclusionColors[item.data.auto_conclusion] ?? ""}`}>
                        {conclusionLabels[item.data.auto_conclusion] ?? item.data.auto_conclusion}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">Clique para abrir →</span>
                    </>
                  )}
                  {item.type === "request" && (
                    <>
                      <Badge variant="outline" className="text-xs">📋 Solicitação #{item.data.request_number}</Badge>
                      <Badge variant="outline" className={`text-xs ${item.data.priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"}`}>
                        {item.data.priority === "urgent" ? "Urgente" : "Recomendado"}
                      </Badge>
                    </>
                  )}
                  {item.type === "execution" && (
                    <>
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">✅ Roguing Executado</Badge>
                      <span className="text-xs">{item.data.total_plants_removed} plantas | {item.data.team_size} pessoas | {item.data.hours_spent}h</span>
                    </>
                  )}
                </div>
                {item.type === "evaluation" && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.data.evaluator_name && <span>Avaliador: {item.data.evaluator_name} | </span>}
                    {item.data.growth_stage && <span>{item.data.growth_stage} | </span>}
                    {item.data.dap && <span>{item.data.dap} DAP</span>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.data.has_volunteers && <Badge variant="secondary" className="text-xs">🌽 Voluntárias ({getFrequencyLabel(item.data.volunteers_frequency)})</Badge>}
                      {item.data.has_offtype && <Badge variant="secondary" className="text-xs">🔀 Off-type ({getFrequencyLabel(item.data.offtype_frequency)})</Badge>}
                      {item.data.has_diseased && <Badge variant="secondary" className="text-xs">🌱 Doentes ({getFrequencyLabel(item.data.diseased_frequency)})</Badge>}
                      {item.data.has_female_in_male && <Badge variant="secondary" className="text-xs">🌾 Fêmea no macho ({getFrequencyLabel(item.data.female_in_male_frequency)})</Badge>}
                    </div>
                  </div>
                )}
                {item.type === "request" && item.data.occurrence_summary && (
                  <p className="mt-1 text-xs text-muted-foreground">{item.data.occurrence_summary}</p>
                )}
                {item.type === "execution" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resultado: {item.data.efficacy === "complete" ? "✅ Completo" : item.data.efficacy === "partial" ? "🟡 Parcial" : "🔴 Insuficiente"}
                    {item.data.result_notes && ` — ${item.data.result_notes}`}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <EvaluationDetailDrawer
        evaluation={selectedEval}
        open={!!selectedEval}
        onOpenChange={(o) => { if (!o) setSelectedEval(null); }}
      />
    </div>
  );
}
