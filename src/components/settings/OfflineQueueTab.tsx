import { useState } from "react";
import { useOfflineSyncContext } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TABLE_LABELS: Record<string, string> = {
  moisture_samples: "Umidade",
  nicking_observations: "Nicking",
  detasseling_records: "Despendoamento",
  emergence_counts: "Stand Count",
  chemical_applications: "Manejo Químico",
  fertilization_records: "Nutrição",
  harvest_records: "Colheita",
  pest_disease_records: "Pragas/Doenças",
  yield_estimates: "Est. Produtividade",
};

export default function OfflineQueueTab() {
  const { queue, pendingCount, forceSync, clearQueue, syncStatus } = useOfflineSyncContext();

  const handleClear = () => {
    clearQueue();
    toast.success("Fila offline limpa.");
  };

  const handleForceSync = () => {
    forceSync();
    toast.info("Sincronização iniciada...");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Fila Offline</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleForceSync}
            disabled={pendingCount === 0 || syncStatus === "syncing"}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
            Forçar Sincronização
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={queue.length === 0}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar Fila
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Limpar fila offline?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza? <strong>{pendingCount}</strong> registro(s) pendente(s) serão perdidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, limpar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum registro na fila offline. Todos os dados estão sincronizados.
          </p>
        ) : (
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Dados (resumo)</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Data registro</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((record) => {
                  const summary = Object.entries(record.data)
                    .filter(([k]) => !["org_id", "created_by", "id"].includes(k))
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`)
                    .join(", ");

                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {TABLE_LABELS[record.table] || record.table}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {summary}
                      </TableCell>
                      <TableCell className="text-xs">
                        {record.cycle_id ? record.cycle_id.slice(0, 8) + "…" : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(record.created_at), "dd/MM HH:mm")}
                      </TableCell>
                      <TableCell>
                        {record.synced ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Sincronizado</Badge>
                        ) : record.error ? (
                          <Badge variant="destructive" title={record.error}>Erro</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Pendente</Badge>
                        )}
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
  );
}
