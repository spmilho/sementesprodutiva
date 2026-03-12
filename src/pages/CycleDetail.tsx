import { useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import UnifiedPlantingTab from "@/components/cycles/planting/UnifiedPlantingTab";
import Phenology from "@/components/cycles/Phenology";
import NickingSync from "@/components/cycles/NickingSync";
import SementeBasica from "@/components/cycles/SementeBasica";
import ManejoTab from "@/components/cycles/manejo/ManejoTab";
import Detasseling from "@/components/cycles/Detasseling";
import Roguing from "@/components/cycles/Roguing";
import PestDiseaseRecords from "@/components/cycles/PestDiseaseRecords";
import YieldEstimateTab from "@/components/cycles/yield-estimate/YieldEstimateTab";
import MoistureTab from "@/components/cycles/moisture/MoistureTab";
import HarvestTab from "@/components/cycles/harvest/HarvestTab";
import DocumentsTab from "@/components/cycles/DocumentsTab";
import CycleMapTab from "@/components/cycles/CycleMapTab";
import WaterTab from "@/components/cycles/water/WaterTab";
import ReportTab from "@/components/cycles/report/ReportTab";
import FieldEvaluationSection from "@/components/field-evaluation/FieldEvaluationSection";
const statusLabels: Record<string, string> = {
  planning: "Planejamento", planting: "Plantio", growing: "Crescimento",
  detasseling: "Despendoamento", harvest: "Colheita", completed: "Concluído", cancelled: "Cancelado",
};

const tabItems = [
  { value: "resumo", label: "Resumo" },
  { value: "semente-basica", label: "Semente Básica" },
  { value: "plantio", label: "Plantio" }, { value: "nutricao", label: "Nutrição" }, { value: "fenologia", label: "Fenologia" },
  { value: "nicking", label: "Nicking" },
  { value: "despendoamento", label: "Despendoamento" }, { value: "roguing", label: "Roguing" },
  { value: "manejo", label: "Manejo" }, { value: "pragas", label: "Pragas" },
  { value: "agua", label: "Água" }, { value: "umidade", label: "Umidade" },
  { value: "estimativa", label: "Est. Produtividade" },
  { value: "colheita", label: "Colheita" }, { value: "mapa", label: "Mapa" },
  { value: "avaliacoes", label: "Avaliações" },
  { value: "visitas", label: "Visitas" }, { value: "documentos", label: "Documentos" },
  { value: "relatorio", label: "Relatório" },
];

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold text-foreground mt-1">{value}</p></CardContent></Card>;
}

function TabPlaceholder({ name }: { name: string }) {
  return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Módulo "{name}" será carregado aqui, filtrado pelo cycle_id.</div>;
}

export default function CycleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isClient } = useRole();
  const [editingContract, setEditingContract] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const { data: cycle, isLoading } = useQuery({
    queryKey: ["cycle-detail", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), farms(name), cooperators(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await (supabase as any).from("production_cycles").update({ status: newStatus }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const contractMutation = useMutation({
    mutationFn: async (contractNumber: string) => {
      const { error } = await (supabase as any).from("production_cycles").update({ contract_number: contractNumber || null }).eq("id", id!);
      if (error) throw error;
      return contractNumber;
    },
    onSuccess: (contractNumber) => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      setEditingContract(false);
      if (contractNumber && !cycle?.contract_number) {
        toast.success(`✅ Contrato atualizado! O ciclo agora é identificado pelo contrato ${contractNumber}.`);
      } else {
        toast.success("Contrato atualizado!");
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const finishMutation = useMutation({
    mutationFn: async ({ type, finished }: { type: string; finished: boolean }) => {
      const fieldMap: Record<string, string> = {
        female: "female_planting_finished",
        male: "male_planting_finished",
        male_1: "male_1_planting_finished",
        male_2: "male_2_planting_finished",
        male_3: "male_3_planting_finished",
      };
      const field = fieldMap[type] || "male_planting_finished";
      const { error } = await (supabase as any).from("production_cycles").update({ [field]: finished }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cycle-detail", id] }); toast.success("Atualizado!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCycleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "production_cycles",
        _record_id: id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Ciclo excluído com sucesso!");
      navigate("/ciclos");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const expectedProduction = useMemo(() => {
    const area = cycle?.pivot_area ?? cycle?.total_area;
    if (!cycle?.expected_productivity || !area) return "—";
    return `${((area * cycle.expected_productivity) / 1000).toFixed(2)} ton`;
  }, [cycle]);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!cycle) return <div className="p-8 text-center text-muted-foreground"><p>Ciclo não encontrado.</p><Button variant="link" onClick={() => navigate("/ciclos")}>Voltar</Button></div>;

  const handleContractSave = () => { contractMutation.mutate((contractInputRef.current?.value ?? "").trim()); };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ciclos")} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {cycle.contract_number ? (
              <h1 className="text-2xl font-bold text-foreground">Contrato {cycle.contract_number}</h1>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{cycle.field_name}</h1>
                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">sem contrato</Badge>
              </div>
            )}
            {!editingContract && !isClient && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setEditingContract(true)}>
                {cycle.contract_number ? "editar" : "adicionar contrato"}
              </Button>
            )}
          </div>
          {editingContract && (
            <div className="flex items-center gap-2 mt-1">
              <Input ref={contractInputRef} defaultValue={cycle.contract_number || ""} placeholder="Nº do contrato" className="h-8 w-48 text-sm" onKeyDown={(e) => e.key === "Enter" && handleContractSave()} />
              <Button size="sm" className="h-8 text-xs" onClick={handleContractSave} disabled={contractMutation.isPending}>Salvar</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditingContract(false)}>Cancelar</Button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{cycle.hybrid_name}</span>
            {cycle.material_split && <><span>•</span><span>{cycle.material_split}</span></>}
            {(cycle.spacing_female_female_cm || cycle.spacing_female_male_cm || cycle.spacing_male_male_cm) && (
              <><span>•</span><span>F×F: {cycle.spacing_female_female_cm ?? "—"}cm | F×M: {cycle.spacing_female_male_cm ?? "—"}cm | M×M: {cycle.spacing_male_male_cm ?? "—"}cm</span></>
            )}
            {cycle.detasseling_dap && (
              <><span>•</span><span>DAP Desp.: {cycle.detasseling_dap}d</span></>
            )}
            <span>•</span>
            <span>{(cycle as any).clients?.name}</span>
            {(cycle as any).cooperators?.name && <><span>•</span><span>{(cycle as any).cooperators.name}</span></>}
            <span>•</span>
            <span>{(cycle as any).farms?.name}</span>
            {cycle.contract_number && <><span>•</span><span>{cycle.field_name}</span></>}
            <span>•</span>
            <span>Safra {cycle.season}</span>
          </div>
        </div>
        {!isClient && (
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4 mr-1" /> Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o ciclo <strong>{cycle.contract_number || cycle.field_name}</strong> ({cycle.hybrid_name})?
                      Todos os dados associados ficarão inacessíveis. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteCycleMutation.mutate()}
                      disabled={deleteCycleMutation.isPending}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Select value={cycle.status} onValueChange={(v) => statusMutation.mutate(v)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard label="Área Total" value={`${cycle.pivot_area ?? cycle.total_area} ha`} />
        <SummaryCard label="Área Fêmea" value={`${cycle.female_area} ha`} />
        <SummaryCard label="Área Macho" value={`${cycle.male_area} ha`} />
        <SummaryCard label="Produção Esperada" value={expectedProduction} />
        <SummaryCard label="Umidade Alvo" value={`${cycle.target_moisture ?? 18}%`} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max">
            {tabItems.map((t) => <TabsTrigger key={t.value} value={t.value} className="text-xs whitespace-nowrap">{t.label}</TabsTrigger>)}
          </TabsList>
        </div>

        <TabsContent value="resumo">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {cycle.contract_number && <div><p className="text-muted-foreground text-xs">Nº Contrato</p><p className="font-medium">{cycle.contract_number}</p></div>}
                <div><p className="text-muted-foreground text-xs">Pivô</p><p className="font-medium">{cycle.field_name}</p></div>
                {(cycle as any).cooperators?.name && <div><p className="text-muted-foreground text-xs">Cooperado</p><p className="font-medium">{(cycle as any).cooperators.name}</p></div>}
                <div><p className="text-muted-foreground text-xs">Proporção F:M</p><p className="font-medium">{cycle.female_male_ratio}</p></div>
                {cycle.material_split && <div><p className="text-muted-foreground text-xs">Split do Material</p><p className="font-medium">{cycle.material_split}</p></div>}
                {cycle.spacing_female_female_cm && <div><p className="text-muted-foreground text-xs">Espaçam. F×F</p><p className="font-medium">{cycle.spacing_female_female_cm} cm</p></div>}
                {cycle.spacing_female_male_cm && <div><p className="text-muted-foreground text-xs">Espaçam. F×M</p><p className="font-medium">{cycle.spacing_female_male_cm} cm</p></div>}
                {cycle.spacing_male_male_cm && <div><p className="text-muted-foreground text-xs">Espaçam. M×M</p><p className="font-medium">{cycle.spacing_male_male_cm} cm</p></div>}
                <div><p className="text-muted-foreground text-xs">Irrigação</p><p className="font-medium">{cycle.irrigation_system}</p></div>
                {cycle.pivot_area && <div><p className="text-muted-foreground text-xs">Área do Pivô</p><p className="font-medium">{cycle.pivot_area} ha</p></div>}
                <div><p className="text-muted-foreground text-xs">Linhagem Fêmea</p><p className="font-medium font-mono">{cycle.female_line}</p></div>
                <div><p className="text-muted-foreground text-xs">Linhagem Macho</p><p className="font-medium font-mono">{cycle.male_line}</p></div>
                {cycle.material_cycle_days && <div><p className="text-muted-foreground text-xs">Ciclo do Material</p><p className="font-medium">{cycle.material_cycle_days} dias</p></div>}
                {cycle.detasseling_dap && <div><p className="text-muted-foreground text-xs">DAP Despendoamento</p><p className="font-medium">{cycle.detasseling_dap} dias</p></div>}
                {cycle.expected_productivity && <div><p className="text-muted-foreground text-xs">Produtividade Esperada</p><p className="font-medium">{cycle.expected_productivity} kg/ha</p></div>}
                <div><p className="text-muted-foreground text-xs">Distância de Isolamento</p><p className="font-medium">{cycle.isolation_distance ?? 300} m</p></div>
                <div><p className="text-muted-foreground text-xs">Isolamento Temporal</p><p className="font-medium">{cycle.temporal_isolation_days ?? 30} dias</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="semente-basica">
          <SementeBasica
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            clientName={(cycle as any).clients?.name}
            femaleLine={cycle.female_line}
            maleLine={cycle.male_line}
            totalArea={cycle.total_area}
          />
        </TabsContent>




        <TabsContent value="plantio">
          <UnifiedPlantingTab
            cycleId={id!}
            orgId={cycle.org_id}
            femaleArea={cycle.female_area}
            maleArea={cycle.male_area}
            pivotName={cycle.field_name}
            contractNumber={cycle.contract_number}
            cooperatorName={(cycle as any).cooperators?.name}
            hybridName={cycle.hybrid_name}
            malePlantingFinished={cycle.male_planting_finished ?? false}
            femalePlantingFinished={cycle.female_planting_finished ?? false}
            male1PlantingFinished={cycle.male_1_planting_finished ?? false}
            male2PlantingFinished={cycle.male_2_planting_finished ?? false}
            male3PlantingFinished={cycle.male_3_planting_finished ?? false}
            onFinishToggle={(type, finished) => finishMutation.mutate({ type, finished })}
            spacingFemaleFemaleCm={cycle.spacing_female_female_cm}
            spacingFemaleMaleCm={cycle.spacing_female_male_cm}
            spacingMaleMaleCm={cycle.spacing_male_male_cm}
            femaleMaleRatio={cycle.female_male_ratio || "4F:2M"}
          />
        </TabsContent>

        <TabsContent value="nutricao">
          <Nutrition
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            totalArea={cycle.total_area}
          />
        </TabsContent>

        <TabsContent value="fenologia">
          <Phenology
            cycleId={id!}
            orgId={cycle.org_id}
            pivotName={cycle.field_name}
            contractNumber={cycle.contract_number}
            cooperatorName={(cycle as any).cooperators?.name}
            farmName={(cycle as any).farms?.name}
            hybridName={cycle.hybrid_name}
            pivotId={cycle.pivot_id}
          />
        </TabsContent>


        <TabsContent value="nicking">
          <NickingSync
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            farmName={(cycle as any).farms?.name}
            season={cycle.season}
          />
        </TabsContent>

        <TabsContent value="despendoamento">
          <Detasseling
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            femaleArea={cycle.female_area}
            detasselingDap={cycle.detasseling_dap}
          />
        </TabsContent>

        <TabsContent value="roguing">
          <Roguing cycleId={id!} orgId={cycle.org_id} />
        </TabsContent>

        <TabsContent value="manejo">
          <ChemicalApplications cycleId={id!} orgId={cycle.org_id} />
        </TabsContent>

        <TabsContent value="pragas">
          <PestDiseaseRecords cycleId={id!} orgId={cycle.org_id} />
        </TabsContent>

        <TabsContent value="agua">
          <WaterTab
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            totalArea={cycle.pivot_area ?? cycle.total_area}
          />
        </TabsContent>

        <TabsContent value="estimativa">
          <YieldEstimateTab
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            femaleArea={cycle.female_area}
            pivotId={cycle.pivot_id}
            expectedProductivity={cycle.expected_productivity}
            defaultRowSpacing={70}
          />
        </TabsContent>

        <TabsContent value="umidade">
          <MoistureTab
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            femaleArea={cycle.female_area}
            targetMoisture={cycle.target_moisture ?? 18}
            pivotId={cycle.pivot_id}
          />
        </TabsContent>

        <TabsContent value="colheita">
          <HarvestTab
            cycleId={id!}
            orgId={cycle.org_id}
            contractNumber={cycle.contract_number}
            pivotName={cycle.field_name}
            hybridName={cycle.hybrid_name}
            cooperatorName={(cycle as any).cooperators?.name}
            femaleArea={cycle.female_area}
            materialCycleDays={cycle.material_cycle_days}
            targetMoisture={cycle.target_moisture ?? 18}
            expectedProductivity={cycle.expected_productivity}
          />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentsTab cycleId={id!} orgId={cycle.org_id} />
        </TabsContent>

        <TabsContent value="mapa">
          <CycleMapTab cycleId={id!} orgId={cycle.org_id} pivotId={cycle.pivot_id} />
        </TabsContent>

        <TabsContent value="avaliacoes">
          <FieldEvaluationSection cycleId={id!} orgId={cycle.org_id} />
        </TabsContent>

        <TabsContent value="relatorio">
          <ReportTab cycleId={id!} orgId={cycle.org_id} cycle={cycle} />
        </TabsContent>

        {tabItems.filter((t) => !["resumo", "semente-basica", "planejamento", "plantio", "nutricao", "fenologia", "emergencia", "nicking", "despendoamento", "roguing", "manejo", "pragas", "agua", "estimativa", "umidade", "colheita", "documentos", "mapa", "avaliacoes", "relatorio"].includes(t.value)).map((t) => (
          <TabsContent key={t.value} value={t.value}><TabPlaceholder name={t.label} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
