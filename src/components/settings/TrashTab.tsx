import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Undo2, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export default function TrashTab() {
  const queryClient = useQueryClient();
  const [permanentDeleteCycle, setPermanentDeleteCycle] = useState<any>(null);
  const [permanentStep, setPermanentStep] = useState<0 | 1 | 2 | 3>(0);
  const [confirmText, setConfirmText] = useState("");

  const { data: deletedCycles = [], isLoading } = useQuery({
    queryKey: ["deleted_cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name), cooperators(name)")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (cycleId: string) => {
      const { error } = await (supabase as any).rpc("restore_cycle", { _cycle_id: cycleId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted_cycles"] });
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Ciclo restaurado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetPermanent = () => {
    setPermanentStep(0);
    setPermanentDeleteCycle(null);
    setConfirmText("");
  };

  const daysUntilAutoDelete = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const autoDeleteDate = new Date(deletedDate);
    autoDeleteDate.setDate(autoDeleteDate.getDate() + 90);
    return Math.max(0, differenceInDays(autoDeleteDate, new Date()));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trash2 className="h-5 w-5" /> Lixeira — Ciclos Excluídos
          </CardTitle>
          <CardDescription>
            Ciclos excluídos ficam na lixeira por 90 dias antes de serem removidos permanentemente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : deletedCycles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum ciclo na lixeira.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Contrato / Pivô</TableHead>
                    <TableHead className="text-xs">Híbrido</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Safra</TableHead>
                    <TableHead className="text-xs">Excluído em</TableHead>
                    <TableHead className="text-xs">Expira em</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedCycles.map((c: any) => {
                    const remaining = daysUntilAutoDelete(c.deleted_at);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium">
                          {c.contract_number || c.field_name}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{c.hybrid_name}</TableCell>
                        <TableCell className="text-sm">{c.clients?.name || "—"}</TableCell>
                        <TableCell className="text-sm">{c.season}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.deleted_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={remaining <= 7 ? "destructive" : remaining <= 30 ? "secondary" : "outline"}>
                            {remaining} dias
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 h-7 text-xs"
                              onClick={() => restoreMutation.mutate(c.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <Undo2 className="h-3.5 w-3.5" /> Restaurar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="gap-1 h-7 text-xs"
                              onClick={() => {
                                setPermanentDeleteCycle(c);
                                setPermanentStep(1);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permanent delete — Step 1 */}
      <Dialog open={permanentStep === 1} onOpenChange={(o) => !o && resetPermanent()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Exclusão Permanente
            </DialogTitle>
            <DialogDescription>
              Deseja excluir <strong>permanentemente</strong> o ciclo <strong>{permanentDeleteCycle?.contract_number || permanentDeleteCycle?.field_name}</strong>?
              <br />Esta ação <strong>NÃO pode ser desfeita</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={resetPermanent}>Cancelar</Button>
            <Button variant="destructive" onClick={() => setPermanentStep(2)}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete — Step 2 */}
      <Dialog open={permanentStep === 2} onOpenChange={(o) => !o && resetPermanent()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ Segunda confirmação</DialogTitle>
            <DialogDescription>
              Todos os dados do ciclo serão <strong>apagados para sempre</strong> do banco de dados.
              Não haverá possibilidade de recuperação.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={resetPermanent}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { setPermanentStep(3); setConfirmText(""); }}>
              Sim, tenho certeza
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent delete — Step 3: type EXCLUIR to confirm */}
      <Dialog open={permanentStep === 3} onOpenChange={(o) => !o && resetPermanent()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">🔴 Última confirmação</DialogTitle>
            <DialogDescription>
              Digite <strong>EXCLUIR</strong> para confirmar a exclusão permanente de todos os dados do ciclo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXCLUIR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={resetPermanent}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "EXCLUIR"}
              onClick={() => {
                toast.info("Exclusão permanente não está habilitada neste momento. Ciclos são removidos automaticamente após 90 dias.");
                resetPermanent();
              }}
            >
              Excluir para sempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
