import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  planning: "Planejamento",
  planting: "Plantio",
  growing: "Crescimento",
  detasseling: "Despendoamento",
  harvest: "Colheita",
  completed: "Concluído",
  cancelled: "Cancelado",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}

const tabItems = [
  { value: "resumo", label: "Resumo" },
  { value: "planejamento", label: "Planejamento" },
  { value: "plantio", label: "Plantio" },
  { value: "fenologia", label: "Fenologia" },
  { value: "emergencia", label: "Emergência" },
  { value: "nicking", label: "Nicking" },
  { value: "despendoamento", label: "Despendoamento" },
  { value: "roguing", label: "Roguing" },
  { value: "manejo", label: "Manejo" },
  { value: "pragas", label: "Pragas" },
  { value: "agua", label: "Água" },
  { value: "umidade", label: "Umidade" },
  { value: "colheita", label: "Colheita" },
  { value: "mapa", label: "Mapa" },
  { value: "visitas", label: "Visitas" },
  { value: "documentos", label: "Documentos" },
  { value: "relatorio", label: "Relatório" },
];

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function TabPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      Módulo "{name}" será carregado aqui, filtrado pelo cycle_id.
    </div>
  );
}

export default function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cycle, isLoading } = useQuery({
    queryKey: ["cycle-detail", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await (supabase as any)
        .from("production_cycles")
        .update({ status: newStatus })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const expectedProduction = useMemo(() => {
    if (!cycle?.expected_productivity || !cycle?.female_area) return "—";
    return `${((cycle.female_area * cycle.expected_productivity) / 1000).toFixed(2)} ton`;
  }, [cycle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Ciclo não encontrado.</p>
        <Button variant="link" onClick={() => navigate("/ciclos")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ciclos")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground font-mono">{cycle.hybrid_name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            <span>{(cycle as any).clients?.name}</span>
            <span>•</span>
            <span>{(cycle as any).farms?.name}</span>
            <span>•</span>
            <span>{cycle.field_name}</span>
            <span>•</span>
            <span>Safra {cycle.season}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={cycle.status} onValueChange={(v) => statusMutation.mutate(v)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Área Total" value={`${cycle.total_area} ha`} />
        <SummaryCard label="Área Fêmea" value={`${cycle.female_area} ha`} />
        <SummaryCard label="Área Macho" value={`${cycle.male_area} ha`} />
        <SummaryCard label="Produção Esperada" value={expectedProduction} />
        <SummaryCard label="Umidade Alvo" value={`${cycle.target_moisture ?? 18}%`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max">
            {tabItems.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs whitespace-nowrap">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="resumo">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Proporção F:M</p>
                  <p className="font-medium">{cycle.female_male_ratio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Irrigação</p>
                  <p className="font-medium">{cycle.irrigation_system}</p>
                </div>
                {cycle.pivot_area && (
                  <div>
                    <p className="text-muted-foreground text-xs">Área do Pivô</p>
                    <p className="font-medium">{cycle.pivot_area} ha</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Linhagem Fêmea</p>
                  <p className="font-medium font-mono">{cycle.female_line}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Linhagem Macho</p>
                  <p className="font-medium font-mono">{cycle.male_line}</p>
                </div>
                {cycle.material_cycle_days && (
                  <div>
                    <p className="text-muted-foreground text-xs">Ciclo do Material</p>
                    <p className="font-medium">{cycle.material_cycle_days} dias</p>
                  </div>
                )}
                {cycle.expected_productivity && (
                  <div>
                    <p className="text-muted-foreground text-xs">Produtividade Esperada</p>
                    <p className="font-medium">{cycle.expected_productivity} kg/ha</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Distância de Isolamento</p>
                  <p className="font-medium">{cycle.isolation_distance ?? 300} m</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Isolamento Temporal</p>
                  <p className="font-medium">{cycle.temporal_isolation_days ?? 30} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {tabItems.filter((t) => t.value !== "resumo").map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <TabPlaceholder name={t.label} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
