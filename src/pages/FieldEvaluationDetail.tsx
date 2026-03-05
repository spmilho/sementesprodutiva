import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PHASES, getPhasesByStage, getClassification, getScorePoints } from "@/components/field-evaluation/constants";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";

export default function FieldEvaluationDetail() {
  const { id: cycleId, visitId } = useParams<{ id: string; visitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useRole();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: visit, isLoading } = useQuery({
    queryKey: ["field-visit", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("field_visits").select("*").eq("id", visitId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  const { data: cycle } = useQuery({
    queryKey: ["cycle-detail", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("production_cycles").select("*, clients(name), farms(name)").eq("id", cycleId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!cycleId,
  });

  const { data: scores = [] } = useQuery({
    queryKey: ["field-visit-scores", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("field_visit_scores").select("*").eq("visit_id", visitId!);
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["field-visit-photos", visitId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("field_visit_photos").select("*").eq("visit_id", visitId!);
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("field_visit_photos").delete().eq("visit_id", visitId!);
      await (supabase as any).from("field_visit_scores").delete().eq("visit_id", visitId!);
      const { error } = await (supabase as any).from("field_visits").delete().eq("id", visitId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-visits", cycleId] });
      toast.success("Avaliação excluída com sucesso.");
      navigate(`/ciclos/${cycleId}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!visit) return <div className="p-8 text-center text-muted-foreground">Avaliação não encontrada.</div>;

  const finalScore = Number(visit.final_score);
  const maxScore = Number(visit.max_possible_score) || 100;
  const cls = getClassification(finalScore);
  const phases = getPhasesByStage(visit.stage || "Completa");
  const scoreMap: Record<string, any> = {};
  scores.forEach((s: any) => { scoreMap[s.subitem] = s; });

  const canEdit = visit.status === "em_andamento" || isAdmin;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ciclos/${cycleId}`)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Avaliação de Campo</h1>
          <p className="text-sm text-muted-foreground">
            {cycle?.contract_number || cycle?.field_name} • {cycle?.hybrid_name} • {format(new Date(visit.visit_date), "dd/MM/yyyy")}
            {visit.technician_name && ` • ${visit.technician_name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/${visitId}/editar`)}>
              <Edit className="h-3.5 w-3.5" /> Editar
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>

      {/* Score hero */}
      <Card className={`${cls.color} border-2`}>
        <CardContent className="p-6 text-center">
          <p className="text-5xl font-bold">{finalScore.toFixed(1)}</p>
          <p className="text-lg font-semibold mt-1">{cls.emoji} {cls.label}</p>
          <p className="text-sm opacity-70">de {maxScore} pontos possíveis</p>
        </CardContent>
      </Card>

      {/* Phase breakdown */}
      <div className="space-y-3">
        {phases.map((phase) => {
          const phaseScore = phase.subitems.reduce((sum, s) => {
            const sc = scoreMap[s.key];
            if (!sc?.score_value) return sum;
            return sum + getScorePoints(s, sc.score_value);
          }, 0);
          const pct = (phaseScore / phase.maxPoints) * 100;

          return (
            <Card key={phase.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{phase.icon}</span> {phase.label}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono text-xs">{phaseScore.toFixed(1)}/{phase.maxPoints}</Badge>
                </div>
                <Progress value={pct} className="h-2 mt-1" />
              </CardHeader>
              <CardContent className="space-y-2">
                {phase.subitems.map((subitem) => {
                  const sc = scoreMap[subitem.key];
                  const scoreVal = sc?.score_value;
                  const points = sc?.score_points ?? 0;
                  const scorePhotos = photos.filter((p: any) => p.score_id === sc?.id);

                  return (
                    <div key={subitem.key} className="flex items-start justify-between p-2 rounded border-l-4" style={{
                      borderLeftColor: scoreVal === "bom" ? "#16a34a" : scoreVal === "regular" ? "#eab308" : scoreVal === "ruim" ? "#dc2626" : "#d1d5db"
                    }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{subitem.label}</p>
                        {sc?.notes && <p className="text-xs text-muted-foreground mt-0.5">{sc.notes}</p>}
                        {scorePhotos.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {scorePhotos.map((p: any) => (
                              <img key={p.id} src={p.photo_url} alt="" className="h-12 w-12 rounded object-cover border" />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {scoreVal && (
                          <Badge className={scoreVal === "bom" ? "bg-green-600" : scoreVal === "regular" ? "bg-yellow-500" : "bg-red-600"}>
                            {scoreVal.toUpperCase()}
                          </Badge>
                        )}
                        <span className="text-xs font-mono">{Number(points).toFixed(1)} pts</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* General notes */}
      {visit.general_notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Observações Gerais</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{visit.general_notes}</p></CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={() => navigate(`/ciclos/${cycleId}`)}>
        Voltar ao Ciclo
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os scores e fotos desta avaliação serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
