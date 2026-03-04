import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { getClassification } from "@/components/field-evaluation/constants";

export default function FieldEvaluationList() {
  const { id: cycleId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cycle } = useQuery({
    queryKey: ["cycle-detail", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name)")
        .eq("id", cycleId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["field-visits", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("field_visits")
        .select("*")
        .eq("cycle_id", cycleId!)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ciclos/${cycleId}`)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold">Avaliações de Campo</h1>
          {cycle && <p className="text-sm text-muted-foreground">{cycle.contract_number || cycle.field_name} — {cycle.hybrid_name}</p>}
        </div>
        <Button className="ml-auto gap-1" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/nova`)}>
          <Plus className="h-4 w-4" /> Nova Avaliação
        </Button>
      </div>

      {visits.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma avaliação registrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {visits.map((v: any) => {
            const cls = getClassification(Number(v.final_score));
            return (
              <Card key={v.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/${v.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">{format(new Date(v.visit_date), "dd/MM/yyyy")}</span>
                    <Badge variant="outline">{v.stage || "—"}</Badge>
                    {v.technician_name && <span className="text-sm text-muted-foreground">{v.technician_name}</span>}
                    {v.visit_number && <span className="text-xs text-muted-foreground">Visita #{v.visit_number}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {v.status === "finalizada" && (
                      <Badge className={`${cls.color}`}>{cls.emoji} {Number(v.final_score).toFixed(1)} pts</Badge>
                    )}
                    <Badge variant={v.status === "finalizada" ? "default" : "secondary"}>
                      {v.status === "finalizada" ? "Finalizada" : "Em andamento"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
