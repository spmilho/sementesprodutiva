import { useState, useCallback, useRef } from "react";
import { Paperclip, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { ManejoTabProps, CropInput, getDapRange } from "./types";
import { useCropInputs, useCropInputImports, usePlantingDate, useManejoMutations } from "./useManejoData";
import ManejoDashboard from "./ManejoDashboard";
import ManejoImportDialog from "./ManejoImportDialog";
import ManejoTimeline from "./ManejoTimeline";
import ManejoManualDialog from "./ManejoManualDialog";
import ManejoOperationsView from "./ManejoOperationsView";
import ManejoTable from "./ManejoTable";
import ManejoCharts from "./ManejoCharts";
import { useAuth } from "@/hooks/useAuth";

export default function ManejoTab({
  cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, totalArea,
}: ManejoTabProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: inputs = [], isLoading } = useCropInputs(cycleId);
  const { data: imports = [] } = useCropInputImports(cycleId);
  const { data: plantingDate } = usePlantingDate(cycleId);
  const { upsertInputs, insertManual, saveImportRecord, deleteImportRecord, deleteAllInputs } = useManejoMutations(cycleId, orgId);

  const [importOpen, setImportOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (json.length < 2) {
        toast.error("Planilha vazia ou sem dados.");
        return;
      }

      const hdrs = (json[0] || []).map((h: any) => String(h || "").trim());
      const rows = json.slice(1).filter(r => r.some(c => c !== null && c !== undefined && c !== ""));

      setHeaders(hdrs);
      setRawData(rows);
      setFileName(file.name);
      setImportOpen(true);
    } catch (err) {
      toast.error("Erro ao ler planilha.");
    }
  }, []);

  const handleImport = useCallback(async (records: Partial<CropInput>[], skipSeeds: boolean) => {
    // Enrich with DAP, stage, and auto-calculate dose_per_ha
    const enriched = records.map(r => {
      const date = r.execution_date || r.recommendation_date;
      let dap: number | null = null;
      let stage: string | null = null;
      if (plantingDate && date) {
        dap = Math.floor((new Date(date).getTime() - new Date(plantingDate).getTime()) / 86400000);
        if (dap >= 0) stage = getDapRange(dap);
      }
      // Auto-calculate dose_per_ha from qty_applied / totalArea
      let dose = r.dose_per_ha;
      if ((dose === null || dose === undefined) && r.qty_applied && totalArea && totalArea > 0) {
        dose = r.qty_applied / totalArea;
      }
      return { ...r, dap_at_application: dap, growth_stage_at_application: stage, dose_per_ha: dose, created_by: user?.id };
    });

    try {
      // 1) Create import record first to get its ID
      const importId = await saveImportRecord.mutateAsync({
        file_name: fileName,
        records_total: enriched.length,
        records_new: enriched.length,
        records_updated: 0,
        imported_by: user?.id,
      });

      // 2) Upsert inputs linked to import record
      const result = await upsertInputs.mutateAsync({ inputs: enriched, importFileId: importId });

      toast.success(`✅ Importados ${result.total} registros (${result.newCount} novos, ${result.updatedCount} atualizados)`);
      setImportOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    }
  }, [plantingDate, user, fileName, totalArea, upsertInputs, saveImportRecord]);

  const handleManualSave = useCallback(async (input: Partial<CropInput>) => {
    // Enrich with DAP
    const date = input.execution_date || input.recommendation_date;
    if (plantingDate && date) {
      const dap = Math.floor((new Date(date).getTime() - new Date(plantingDate).getTime()) / 86400000);
      if (dap >= 0) {
        input.dap_at_application = dap;
        input.growth_stage_at_application = getDapRange(dap);
      }
    }
    input.created_by = user?.id;

    try {
      await insertManual.mutateAsync(input);
      toast.success("Registro salvo!");
      setManualOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [plantingDate, user, insertManual]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {contractNumber && <span>Contrato: <strong className="text-foreground">{contractNumber}</strong></span>}
        {hybridName && <><span>•</span><span>Híbrido: <strong className="text-foreground">{hybridName}</strong></span></>}
        {cooperatorName && <><span>•</span><span>Cooperado: <strong className="text-foreground">{cooperatorName}</strong></span></>}
        {pivotName && <><span>•</span><span>Pivô: <strong className="text-foreground">{pivotName}</strong></span></>}
        {totalArea && <><span>•</span><span>Área: <strong className="text-foreground">{totalArea} ha</strong></span></>}
      </div>

      {/* Import + Manual buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />
        <Button onClick={() => fileRef.current?.click()} className="gap-2">
          <Paperclip className="h-4 w-4" />
          Importar Planilha de Insumos
        </Button>
        <Button variant="outline" onClick={() => setManualOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Registro Manual
        </Button>
        {inputs.length > 0 && (
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={deleteAllInputs.isPending}
            onClick={() => {
              if (confirm(`Excluir todos os ${inputs.length} insumos registrados neste ciclo?`)) {
                deleteAllInputs.mutate(undefined, {
                  onSuccess: () => toast.success("Todos os insumos foram excluídos"),
                  onError: (err: any) => toast.error(err.message || "Erro ao excluir"),
                });
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Limpar Todos
          </Button>
        )}
      </div>


      {/* Dashboard */}
      <ManejoDashboard inputs={inputs} imports={imports} />

      {/* Content tabs */}
      {inputs.length > 0 && (
        <Tabs defaultValue="operacoes">
          <TabsList>
            <TabsTrigger value="operacoes" className="text-xs">Operações</TabsTrigger>
            <TabsTrigger value="tabela" className="text-xs">Tabela</TabsTrigger>
            <TabsTrigger value="graficos" className="text-xs">Gráficos</TabsTrigger>
          </TabsList>
          <TabsContent value="operacoes">
            <ManejoOperationsView inputs={inputs} plantingDate={plantingDate} />
          </TabsContent>
          <TabsContent value="tabela">
            <ManejoTable inputs={inputs} />
          </TabsContent>
          <TabsContent value="graficos">
            <div className="space-y-4">
              <ManejoTimeline inputs={inputs} plantingDate={plantingDate} />
              <ManejoCharts inputs={inputs} />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {inputs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Paperclip className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum insumo registrado</p>
            <p className="text-xs mt-1">Importe uma planilha Excel ou adicione manualmente.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {importOpen && (
        <ManejoImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          rawData={rawData}
          headers={headers}
          onImport={handleImport}
          importing={upsertInputs.isPending}
        />
      )}
      {manualOpen && (
        <ManejoManualDialog
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          onSave={handleManualSave}
          saving={insertManual.isPending}
        />
      )}
    </div>
  );
}
