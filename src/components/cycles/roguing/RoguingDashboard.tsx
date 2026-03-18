import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, AlertTriangle, Scissors, Shield, CalendarClock } from "lucide-react";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import type { RoguingEvaluation, RoguingRequest, RoguingExecution } from "./types";

interface Props {
  evaluations: RoguingEvaluation[];
  requests: RoguingRequest[];
  executions: RoguingExecution[];
}

export default function RoguingDashboard({ evaluations, requests, executions }: Props) {
  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending");
    const urgentPending = pending.filter(r => {
      const days = differenceInDays(new Date(), parseISO(r.request_date));
      return r.priority === "urgent" || days > 3;
    });
    const totalRemoved = executions.reduce((s, e) => s + (e.total_plants_removed ?? 0), 0);
    const lastEval = evaluations.length > 0 ? evaluations[0] : null;
    const nextSuggested = lastEval ? addDays(parseISO(lastEval.evaluation_date), 7) : null;
    const overdueDays = nextSuggested ? differenceInDays(new Date(), nextSuggested) : 0;

    let statusLabel = "🟢 Campo limpo";
    let statusColor = "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    if (urgentPending.length > 0) {
      statusLabel = "🔴 Crítico";
      statusColor = "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
    } else if (pending.length > 0) {
      statusLabel = "🟡 Atenção";
      statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
    }

    return { evalCount: evaluations.length, pendingCount: pending.length, execCount: executions.length, totalRemoved, lastEval, nextSuggested, overdueDays, statusLabel, statusColor };
  }, [evaluations, requests, executions]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <ClipboardList className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Avaliações</p>
          <p className="text-2xl font-bold">{stats.evalCount}</p>
          <p className="text-xs text-muted-foreground">{stats.lastEval ? `Última: ${format(parseISO(stats.lastEval.evaluation_date), "dd/MM/yy")}` : "Nenhuma"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <AlertTriangle className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Solicitações Pendentes</p>
          <p className="text-2xl font-bold">{stats.pendingCount}</p>
          <Badge variant="outline" className={`text-xs mt-1 ${stats.pendingCount > 0 ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"}`}>
            {stats.pendingCount > 0 ? "🔴 Pendentes" : "🟢 Nenhuma"}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Scissors className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Roguing Executados</p>
          <p className="text-2xl font-bold">{stats.execCount}</p>
          <p className="text-xs text-muted-foreground">{stats.totalRemoved} plantas removidas</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <Shield className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Status Geral</p>
          <Badge variant="outline" className={`text-sm mt-2 ${stats.statusColor}`}>{stats.statusLabel}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <CalendarClock className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Próx. Avaliação</p>
          {stats.nextSuggested ? (
            <>
              <p className="text-lg font-semibold">{format(stats.nextSuggested, "dd/MM/yy")}</p>
              {stats.overdueDays > 0 && (
                <p className="text-xs text-destructive font-medium">⚠️ Atrasada {stats.overdueDays} dias</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
