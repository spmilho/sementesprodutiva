import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, List } from "lucide-react";
import { MoistureTabProps, MoistureSample, PivotGleba } from "./types";
import { calcGlebaStatus } from "./utils";
import MoistureDashboard from "./MoistureDashboard";
import MoistureSampleForm from "./MoistureSampleForm";
import MoistureBatchForm from "./MoistureBatchForm";
import MoistureCharts from "./MoistureCharts";
import MoistureMap from "./MoistureMap";
import MoistureSampleTable from "./MoistureSampleTable";
import HarvestDecision from "./HarvestDecision";

export default function MoistureTab({
  cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, femaleArea, targetMoisture, pivotId,
}: MoistureTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  // Fetch glebas
  const { data: glebas = [] } = useQuery({
    queryKey: ["pivot_glebas", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pivot_glebas")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as PivotGleba[];
    },
  });

  // Fetch samples
  const { data: samples = [] } = useQuery({
    queryKey: ["moisture_samples", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("moisture_samples")
        .select("*, pivot_glebas(name)")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("sample_date", { ascending: false });
      if (error) throw error;
      return (data as any[]).map((s: any) => ({
        ...s,
        gleba_name: s.pivot_glebas?.name ?? null,
      })) as MoistureSample[];
    },
  });

  // Fetch pivot coords
  const { data: pivot } = useQuery({
    queryKey: ["pivot_coords", pivotId],
    queryFn: async () => {
      if (!pivotId) return null;
      const { data, error } = await (supabase as any)
        .from("pivots")
        .select("latitude, longitude")
        .eq("id", pivotId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!pivotId,
  });

  // Insert mutation
  const insertMutation = useMutation({
    mutationFn: async (records: any[]) => {
      const toInsert = records.map((r) => ({
        ...r,
        cycle_id: cycleId,
        org_id: orgId,
      }));
      const { error } = await (supabase as any).from("moisture_samples").insert(toInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moisture_samples", cycleId] });
      setShowForm(false);
      setShowBatch(false);
      toast.success("Amostra(s) registrada(s)!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "moisture_samples",
        _record_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moisture_samples", cycleId] });
      toast.success("Amostra removida");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const hasGlebas = glebas.length > 0;

  // Compute gleba statuses
  const glebaStatuses = useMemo(() => {
    if (hasGlebas) {
      return glebas.map((g) => {
        const gSamples = samples.filter((s) => s.gleba_id === g.id);
        return calcGlebaStatus(g, gSamples, targetMoisture);
      });
    }
    // No glebas: single "general" status
    return [calcGlebaStatus(null, samples, targetMoisture)];
  }, [glebas, samples, targetMoisture, hasGlebas]);

  const nextPointNumber = samples.length + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Contrato: <strong className="text-foreground">{contractNumber || pivotName}</strong></span>
        <span>|</span>
        <span>Híbrido: <strong className="text-foreground">{hybridName}</strong></span>
        {cooperatorName && <><span>|</span><span>Cooperado: <strong className="text-foreground">{cooperatorName}</strong></span></>}
        <span>|</span>
        <span>Pivô: <strong className="text-foreground">{pivotName}</strong></span>
        <span>|</span>
        <span>Área fêmea: <strong className="text-foreground">{femaleArea} ha</strong></span>
        <span>|</span>
        <span>Alvo: <strong className="text-foreground">{targetMoisture}%</strong></span>
      </div>

      {/* Dashboard */}
      <MoistureDashboard
        allSamples={samples}
        glebaStatuses={glebaStatuses}
        target={targetMoisture}
        hasGlebas={hasGlebas}
      />

      {/* Add buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Registrar 1 Ponto
        </Button>
        <Button variant="outline" onClick={() => setShowBatch(true)} className="gap-2">
          <List className="h-4 w-4" /> Registrar Vários Pontos (lote)
        </Button>
        <Badge variant="secondary" className="self-center">
          {samples.length} pontos registrados
        </Badge>
      </div>

      <MoistureSampleForm
        open={showForm}
        onOpenChange={setShowForm}
        glebas={glebas}
        target={targetMoisture}
        nextPointNumber={nextPointNumber}
        onSave={(data) => insertMutation.mutate([data])}
        saving={insertMutation.isPending}
      />

      <MoistureBatchForm
        open={showBatch}
        onOpenChange={setShowBatch}
        glebas={glebas}
        nextPointNumber={nextPointNumber}
        onSaveBatch={(data) => insertMutation.mutate(data)}
        saving={insertMutation.isPending}
      />

      {/* Charts */}
      <MoistureCharts samples={samples} glebas={glebas} target={targetMoisture} hasGlebas={hasGlebas} />

      {/* Map */}
      <MoistureMap
        samples={samples}
        glebas={glebas}
        target={targetMoisture}
        pivotLat={pivot?.latitude}
        pivotLng={pivot?.longitude}
        pivotName={pivotName}
      />

      {/* Table */}
      <MoistureSampleTable
        samples={samples}
        glebas={glebas}
        target={targetMoisture}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      {/* Harvest Decision */}
      <HarvestDecision
        glebaStatuses={glebaStatuses}
        target={targetMoisture}
        femaleArea={femaleArea}
      />
    </div>
  );
}
