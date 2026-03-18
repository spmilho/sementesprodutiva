import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus } from "lucide-react";
import { useRoguingData } from "./roguing/useRoguingData";
import RoguingDashboard from "./roguing/RoguingDashboard";
import EvaluationFormDialog from "./roguing/EvaluationFormDialog";
import RequestCards from "./roguing/RequestCards";
import RoguingTimeline from "./roguing/RoguingTimeline";
import RoguingCharts from "./roguing/RoguingCharts";
import type { RoguingProps } from "./roguing/types";

export default function Roguing({
  cycleId, orgId, contractNumber, hybridName, cooperatorName, pivotName, femaleArea, maleArea,
}: RoguingProps) {
  const { evaluations, requests, executions, isLoading, invalidateAll } = useRoguingData(cycleId);
  const [evalOpen, setEvalOpen] = useState(false);

  const lastStage = evaluations.length > 0 ? evaluations[0].growth_stage ?? undefined : undefined;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {contractNumber && <span><strong>Contrato:</strong> {contractNumber}</span>}
          {hybridName && <span><strong>Híbrido:</strong> {hybridName}</span>}
          {cooperatorName && <span><strong>Cooperado:</strong> {cooperatorName}</span>}
          {pivotName && <span><strong>Pivô:</strong> {pivotName}</span>}
          {femaleArea && <span><strong>Área fêmea:</strong> {femaleArea} ha</span>}
          {maleArea && <span><strong>Área macho:</strong> {maleArea} ha</span>}
        </div>
      </div>

      {/* Dashboard */}
      <RoguingDashboard evaluations={evaluations} requests={requests} executions={executions} />

      <Separator />

      {/* Avaliação */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Avaliações de Campo</h3>
        <Button onClick={() => setEvalOpen(true)} size="lg">
          <Plus className="h-4 w-4 mr-1" /> Nova Avaliação de Roguing
        </Button>
      </div>

      <EvaluationFormDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        cycleId={cycleId}
        orgId={orgId}
        onSaved={invalidateAll}
        lastStage={lastStage}
      />

      <Separator />

      {/* Solicitações */}
      <RequestCards requests={requests} cycleId={cycleId} orgId={orgId} onChanged={invalidateAll} />

      <Separator />

      {/* Timeline */}
      <RoguingTimeline evaluations={evaluations} requests={requests} executions={executions} />

      <Separator />

      {/* Gráficos */}
      <RoguingCharts evaluations={evaluations} executions={executions} />
    </div>
  );
}
