import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Factory } from "lucide-react";
import { CapacityConfigTab } from "@/components/ubs/CapacityConfigTab";
import { ClientDemandTab } from "@/components/ubs/ClientDemandTab";
import { AnalysisDashboardTab } from "@/components/ubs/AnalysisDashboardTab";
import { StatisticalAnalysisTab } from "@/components/ubs/StatisticalAnalysisTab";
import type { UbsState, Client } from "@/components/ubs/types";

const DEFAULT_CLIENTS: Client[] = [
  { id: "1", name: "Limagrain", color: "#5CDB6E", volumes: [0, 0, 0, 1200, 1200, 1200, 1200, 0, 0, 0, 0] },
  { id: "2", name: "Advanta", color: "#4ECDC4", volumes: [0, 0, 563, 836, 1084, 328, 0, 0, 0, 0, 0] },
  { id: "3", name: "Milhão", color: "#FFD93D", volumes: [0, 0, 0, 0, 550, 0, 0, 0, 0, 0, 0] },
];

const DEFAULT_STAFF: Record<string, number[]> = {
  Recebimento: [3, 3, 3],
  Despalha: [4, 4, 4],
  Secador: [2, 2, 2],
  Classificação: [3, 3, 3],
  Tratamento: [2, 2, 2],
  Expedição: [2, 2, 2],
};

const DEFAULT_STATE: UbsState = {
  ubsName: "UBS Produtiva Sementes",
  shifts: 3,
  hoursPerShift: 8,
  operatingDays: 6,
  receivingCapPerShift: 283,
  dryingCapPerShift: 324,
  clients: DEFAULT_CLIENTS,
  startDate: "2026-06-08",
  numWeeks: 11,
  staff: DEFAULT_STAFF,
  avgSalary: 2800,
  compareMode: false,
  altShifts: 3,
  altReceivingCapPerShift: 350,
  altDryingCapPerShift: 400,
};

function loadState(): UbsState {
  try {
    const raw = localStorage.getItem("ubs-capacity-state");
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_STATE;
}

export default function UbsCapacityPlanning() {
  const [state, setState] = useState<UbsState>(loadState);

  useEffect(() => {
    localStorage.setItem("ubs-capacity-state", JSON.stringify(state));
  }, [state]);

  const update = useCallback(<K extends keyof UbsState>(key: K, value: UbsState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const weeklyReceiving = state.receivingCapPerShift * state.shifts * state.operatingDays;
  const weeklyDrying = state.dryingCapPerShift * state.shifts * state.operatingDays;

  return (
    <div className="ubs-theme min-h-screen">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1e3a25]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5CDB6E]/15 flex items-center justify-center">
              <Factory className="w-5 h-5 text-[#5CDB6E]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#e8f5e9] font-['Syne',sans-serif]">{state.ubsName}</h1>
              <p className="text-xs text-[#8aac8f] font-['DM_Mono',monospace]">Planejamento de Capacidade — Safra 2026</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-[#162b1c] text-[#5CDB6E] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Receb. {weeklyReceiving.toLocaleString("pt-BR")} t/sem
            </Badge>
            <Badge className="bg-[#162b1c] text-[#4ECDC4] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Secagem {weeklyDrying.toLocaleString("pt-BR")} t/sem
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="px-4 sm:px-6 py-4">
        <TabsList className="bg-[#162b1c] border border-[#2a4a32] mb-4">
          <TabsTrigger value="config" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Configuração</TabsTrigger>
          <TabsTrigger value="demand" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Demanda</TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Estatística</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <CapacityConfigTab state={state} update={update} />
        </TabsContent>
        <TabsContent value="demand">
          <ClientDemandTab state={state} update={update} weeklyReceiving={weeklyReceiving} weeklyDrying={weeklyDrying} />
        </TabsContent>
        <TabsContent value="dashboard">
          <AnalysisDashboardTab state={state} weeklyReceiving={weeklyReceiving} weeklyDrying={weeklyDrying} />
        </TabsContent>
        <TabsContent value="stats">
          <StatisticalAnalysisTab state={state} weeklyReceiving={weeklyReceiving} weeklyDrying={weeklyDrying} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
