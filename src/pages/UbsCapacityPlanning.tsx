import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Factory, Maximize2, Minimize2, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportUbsHtml } from "@/components/ubs/exportHtml";
import { CapacityConfigTab } from "@/components/ubs/CapacityConfigTab";
import { ClientDemandTab } from "@/components/ubs/ClientDemandTab";
import { ClientDemandPhase2Tab } from "@/components/ubs/ClientDemandPhase2Tab";
import { AnalysisDashboardTab } from "@/components/ubs/AnalysisDashboardTab";
import { AnalysisDashboardPhase2Tab } from "@/components/ubs/AnalysisDashboardPhase2Tab";
import { StatisticalAnalysisTab } from "@/components/ubs/StatisticalAnalysisTab";
import { getPhaseWeeklyCap } from "@/components/ubs/types";
import { useUbsState } from "@/hooks/useUbsState";

export default function UbsCapacityPlanning() {
  const { state, update, loading } = useUbsState();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const weeklyReceiving = getPhaseWeeklyCap(state, "Recebimento e Despalha");
  const weeklyDrying = getPhaseWeeklyCap(state, "Secador");
  const weeklyClassificacao = getPhaseWeeklyCap(state, "Classificação");
  const weeklyTratamento = getPhaseWeeklyCap(state, "Tratamento e Ensaque");

  if (loading) {
    return (
      <div className="ubs-theme min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#5CDB6E] animate-spin" />
          <span className="text-sm text-[#8aac8f]">Carregando dados da UBS...</span>
        </div>
      </div>
    );
  }

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
          <div className="flex gap-2 flex-wrap items-center">
            <Badge className="bg-[#162b1c] text-[#5CDB6E] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Receb. {weeklyReceiving.toLocaleString("pt-BR")} t/sem
            </Badge>
            <Badge className="bg-[#162b1c] text-[#4ECDC4] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Secag. {weeklyDrying.toLocaleString("pt-BR")} t/sem
            </Badge>
            <Badge className="bg-[#162b1c] text-[#38BDF8] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Classif. {weeklyClassificacao.toLocaleString("pt-BR")} t/sem
            </Badge>
            <Badge className="bg-[#162b1c] text-[#C084FC] border border-[#2a4a32] px-3 py-1 font-['DM_Mono',monospace] text-xs">
              Trat. {weeklyTratamento.toLocaleString("pt-BR")} t/sem
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => exportUbsHtml(state, weeklyReceiving, weeklyDrying)}
              className="h-8 w-8 text-[#8aac8f] hover:text-[#5CDB6E] hover:bg-[#162b1c]"
              title="Exportar HTML"
            >
              <FileDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8 text-[#8aac8f] hover:text-[#5CDB6E] hover:bg-[#162b1c]"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="config" className="px-4 sm:px-6 py-4">
        <TabsList className="bg-[#162b1c] border border-[#2a4a32] mb-4">
          <TabsTrigger value="config" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Configuração</TabsTrigger>
          <TabsTrigger value="demand" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Demanda Fase 1</TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#5CDB6E]/20 data-[state=active]:text-[#5CDB6E] text-[#8aac8f] text-xs">Dashboard Fase 1</TabsTrigger>
          <TabsTrigger value="demand2" className="data-[state=active]:bg-[#38BDF8]/20 data-[state=active]:text-[#38BDF8] text-[#8aac8f] text-xs">Demanda Fase 2</TabsTrigger>
          <TabsTrigger value="dashboard2" className="data-[state=active]:bg-[#38BDF8]/20 data-[state=active]:text-[#38BDF8] text-[#8aac8f] text-xs">Dashboard Fase 2</TabsTrigger>
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
        <TabsContent value="demand2">
          <ClientDemandPhase2Tab state={state} update={update} weeklyClassificacao={weeklyClassificacao} weeklyTratamento={weeklyTratamento} />
        </TabsContent>
        <TabsContent value="dashboard2">
          <AnalysisDashboardPhase2Tab state={state} weeklyClassificacao={weeklyClassificacao} weeklyTratamento={weeklyTratamento} />
        </TabsContent>
        <TabsContent value="stats">
          <StatisticalAnalysisTab state={state} weeklyReceiving={weeklyReceiving} weeklyDrying={weeklyDrying} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
