import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Loader2, Trash2, Edit, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getClassification } from "@/components/field-evaluation/constants";
import { toast } from "sonner";

export default function FieldEvaluationList() {
  const { id: cycleId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const deleteMut = useMutation({
    mutationFn: async (visitId: string) => {
      // Delete photos, scores, then visit (cascade should handle but be explicit)
      await (supabase as any).from("field_visit_photos").delete().eq("visit_id", visitId);
      await (supabase as any).from("field_visit_scores").delete().eq("visit_id", visitId);
      const { error } = await (supabase as any).from("field_visits").delete().eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-visits", cycleId] });
      toast.success("Avaliação excluída com sucesso.");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
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
              <Card key={v.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-wrap cursor-pointer flex-1" onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/${v.id}`)}>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/ciclos/${cycleId}/avaliacoes/${v.id}/editar`)}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(v.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
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
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
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
