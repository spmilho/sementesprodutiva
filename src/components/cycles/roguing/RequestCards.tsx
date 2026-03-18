import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { CheckCircle2, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RoguingRequest } from "./types";
import { getParentLabel } from "./types";
import ExecutionFormDialog from "./ExecutionFormDialog";
import ManualRequestDialog from "./ManualRequestDialog";

interface Props {
  requests: RoguingRequest[];
  cycleId: string;
  orgId: string;
  onChanged: () => void;
}

export default function RequestCards({ requests, cycleId, orgId, onChanged }: Props) {
  const [executingReq, setExecutingReq] = useState<RoguingRequest | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered = requests.filter(r => {
    if (filter === "all") return true;
    return r.status === filter;
  }).sort((a, b) => {
    // Pending first
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
  });

  const handleCancel = async (req: RoguingRequest) => {
    if (!confirm("Cancelar esta solicitação?")) return;
    const { error } = await (supabase as any)
      .from("roguing_requests")
      .update({ status: "cancelled" })
      .eq("id", req.id);
    if (error) toast.error(error.message);
    else { toast.success("Solicitação cancelada"); onChanged(); }
  };

  const occurrenceIcons: Record<string, string> = {
    volunteers: "🌽 Voluntárias",
    offtype: "🔀 Off-type",
    diseased: "🌱 Doentes",
    female_in_male: "🌾 Fêmea no macho",
  };

  function getBorderClass(req: RoguingRequest) {
    if (req.status === "executed") return "border-l-4 border-l-green-500";
    if (req.status === "cancelled") return "border-l-4 border-l-muted opacity-60";
    const days = differenceInDays(new Date(), parseISO(req.request_date));
    if (days > 3 || req.priority === "urgent") return "border-l-4 border-l-red-500 animate-pulse";
    return "border-l-4 border-l-orange-500";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">📋 Solicitações de Roguing</h3>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {["all", "pending", "executed", "cancelled"].map(f => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                {{ all: "Todos", pending: "Pendentes", executed: "Executados", cancelled: "Cancelados" }[f]}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setManualOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Manual
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhuma solicitação de roguing.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card key={req.id} className={getBorderClass(req)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      req.priority === "urgent"
                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                    }>
                      {req.priority === "urgent" ? "🔴 Urgente" : "🟠 Recomendado"}
                    </Badge>
                    <span className="font-semibold text-sm">Solicitação #{req.request_number}</span>
                    <span className="text-xs text-muted-foreground">{format(parseISO(req.request_date), "dd/MM/yyyy")}</span>
                  </div>
                  <Badge variant="outline" className={
                    req.status === "executed" ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" :
                    req.status === "cancelled" ? "bg-muted text-muted-foreground" :
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
                  }>
                    {req.status === "executed" ? "✅ Executado" : req.status === "cancelled" ? "❌ Cancelado" : "⏳ Pendente"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span>Onde: {getParentLabel(req.parent_target)}</span>
                  {req.growth_stage && <span>Estádio: {req.growth_stage}</span>}
                  <span>Criada há {differenceInDays(new Date(), parseISO(req.request_date))} dias</span>
                </div>

                {req.occurrence_types && req.occurrence_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {req.occurrence_types.map(t => (
                      <Badge key={t} variant="secondary" className="text-xs">{occurrenceIcons[t] || t}</Badge>
                    ))}
                  </div>
                )}

                {req.notes && <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>}

                {req.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => setExecutingReq(req)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Registrar Execução
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(req)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {executingReq && (
        <ExecutionFormDialog
          open={!!executingReq}
          onOpenChange={(o) => { if (!o) setExecutingReq(null); }}
          request={executingReq}
          cycleId={cycleId}
          orgId={orgId}
          onSaved={() => { setExecutingReq(null); onChanged(); }}
        />
      )}

      <ManualRequestDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        cycleId={cycleId}
        orgId={orgId}
        existingCount={requests.length}
        onSaved={() => { setManualOpen(false); onChanged(); }}
      />
    </div>
  );
}
