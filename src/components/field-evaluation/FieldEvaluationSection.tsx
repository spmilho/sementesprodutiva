import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getClassification } from "./constants";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";

interface Props {
  cycleId: string;
  orgId: string;
}

export default function FieldEvaluationSection({ cycleId, orgId }: Props) {
  const navigate = useNavigate();

  const { data: visits = [] } = useQuery({
    queryKey: ["field-visits", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("field_visits")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("org_id", orgId)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const finalized = visits.filter((v: any) => v.status === "finalizada");
  const avgScore = finalized.length > 0
    ? (finalized.reduce((sum: number, v: any) => sum + Number(v.final_score), 0) / finalized.length).toFixed(1)
    : "—";

  const lastVisit = visits[0];
  const chartData = [...finalized]
    .sort((a: any, b: any) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
    .map((v: any) => ({
      date: format(new Date(v.visit_date), "dd/MM"),
      score: Number(v.final_score),
    }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Avaliações de Campo
          </CardTitle>
          <Button size="sm" className="gap-1" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/nova`)}>
            <Plus className="h-3.5 w-3.5" /> Nova Avaliação
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{visits.length}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground">Nota Média</p>
            <p className="text-xl font-bold">{avgScore}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground">Última Nota</p>
            <p className="text-xl font-bold">{lastVisit ? Number(lastVisit.final_score).toFixed(1) : "—"}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <p className="text-xs text-muted-foreground">Última Visita</p>
            <p className="text-sm font-medium">{lastVisit ? format(new Date(lastVisit.visit_date), "dd/MM/yyyy") : "—"}</p>
          </div>
        </div>

        {/* Evolution chart */}
        {chartData.length > 1 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RTooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Visit list */}
        {visits.length > 0 ? (
          <div className="space-y-2">
            {visits.map((v: any) => {
              const cls = getClassification(Number(v.final_score));
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/${v.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{format(new Date(v.visit_date), "dd/MM/yyyy")}</span>
                    <Badge variant="outline" className="text-xs">{v.stage || "—"}</Badge>
                    {v.technician_name && <span className="text-xs text-muted-foreground">{v.technician_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {v.status === "finalizada" && (
                      <Badge className={`text-xs ${cls.color}`}>{cls.emoji} {Number(v.final_score).toFixed(1)}</Badge>
                    )}
                    <Badge variant={v.status === "finalizada" ? "default" : "secondary"} className="text-xs">
                      {v.status === "finalizada" ? "Finalizada" : "Em andamento"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação registrada ainda.</p>
        )}

        {visits.length > 3 && (
          <Button variant="link" className="w-full" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes`)}>
            Ver todas as avaliações →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
