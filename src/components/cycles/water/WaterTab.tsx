import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Plus, Loader2, CloudSun, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import WaterDashboard from "./WaterDashboard";
import FileClassifyDialog from "./FileClassifyDialog";
import ExcelPreview from "./ExcelPreview";
import WaterFileCard from "./WaterFileCard";
import ManualRecordDialog from "./ManualRecordDialog";
import WeatherImportDialog from "./WeatherImportDialog";
import WeatherCharts from "./WeatherCharts";
import { useWaterFiles, useIrrigationRecords, useRainfallRecords, useWeatherRecords, useWaterMutations } from "./useWaterData";
import type { ParsedExcelData } from "./types";
import { format } from "date-fns";

interface Props {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  cooperatorName?: string;
  totalArea?: number;
}

export default function WaterTab({ cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, totalArea }: Props) {
  const { data: files = [], isLoading: loadingFiles } = useWaterFiles(cycleId);
  const { data: irrigationRecords = [] } = useIrrigationRecords(cycleId);
  const { data: rainfallRecords = [] } = useRainfallRecords(cycleId);
  const { data: weatherRecords = [] } = useWeatherRecords(cycleId);
  const { saveFile, deleteFile, saveIrrigation, saveRainfall, saveWeatherRecords, deleteWeatherBatch } = useWaterMutations(cycleId, orgId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const weatherFileRef = useRef<HTMLInputElement>(null);
  const [classifyFile, setClassifyFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [excelPreview, setExcelPreview] = useState<{ data: ParsedExcelData; file: File; contentType: string; description: string; referenceDate: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // Weather import state
  const [weatherImportOpen, setWeatherImportOpen] = useState(false);
  const [weatherHeaders, setWeatherHeaders] = useState<string[]>([]);
  const [weatherRawData, setWeatherRawData] = useState<any[][]>([]);
  const [weatherImporting, setWeatherImporting] = useState(false);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10MB)"); return; }
    setClassifyFile(file);
    e.target.value = "";
  }, []);

  const handleWeatherFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (json.length < 2) { toast.error("Planilha vazia"); return; }
      const hdrs = (json[0] || []).map((h: any) => String(h || "").trim());
      const rows = json.slice(1).filter(r => r.some(c => c !== null && c !== undefined && c !== ""));
      setWeatherHeaders(hdrs);
      setWeatherRawData(rows);
      setWeatherImportOpen(true);
    } catch {
      toast.error("Erro ao ler planilha meteorológica");
    }
  }, []);

  const handleWeatherImport = useCallback(async (records: Record<string, any>[]) => {
    setWeatherImporting(true);
    try {
      // Always delete old weather records before importing new ones
      if (weatherRecords.length > 0) {
        await deleteWeatherBatch.mutateAsync();
      }
      await saveWeatherRecords.mutateAsync(records);
      toast.success(`✅ ${records.length} registros meteorológicos importados (dados anteriores substituídos)`);
      setWeatherImportOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    } finally {
      setWeatherImporting(false);
    }
  }, [saveWeatherRecords, deleteWeatherBatch, weatherRecords.length]);

  const getFileExtension = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "xls") return "xls";
    if (ext === "xlsx") return "xlsx";
    if (ext === "csv") return "csv";
    if (ext === "docx") return "docx";
    if (ext === "pdf") return "pdf";
    return ext;
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const timestamp = Date.now();
    const path = `${orgId}/${cycleId}/water/${timestamp}_${file.name}`;
    const { error } = await supabase.storage.from("cycle-documents").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("cycle-documents").getPublicUrl(path);
    return data.publicUrl;
  };

  const processExcel = async (file: File): Promise<ParsedExcelData> => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    if (json.length === 0) throw new Error("Arquivo sem dados");
    const headers = Object.keys(json[0]);
    const rows = json.map(row => {
      const clean: Record<string, string | number | null> = {};
      headers.forEach(h => {
        const val = row[h];
        if (val instanceof Date) clean[h] = val.toISOString().split("T")[0];
        else clean[h] = val;
      });
      return clean;
    });
    return { headers, rows };
  };

  const processWord = async (file: File): Promise<{ html: string; images: string[] }> => {
    const mammoth = await import("mammoth");
    const buffer = await file.arrayBuffer();
    const images: string[] = [];
    const result = await mammoth.convertToHtml(
      { arrayBuffer: buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const buf = await image.read();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const src = `data:${image.contentType};base64,${base64}`;
          images.push(src);
          return { src };
        }),
      }
    );
    return { html: result.value, images };
  };

  const handleClassifyConfirm = async (contentType: string, description: string, referenceDate: string) => {
    if (!classifyFile) return;
    setProcessing(true);
    try {
      const ext = getFileExtension(classifyFile.name);
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const parsed = await processExcel(classifyFile);
        setExcelPreview({ data: parsed, file: classifyFile, contentType, description, referenceDate });
        setClassifyFile(null);
        setProcessing(false);
        return;
      }
      const fileUrl = await uploadFileToStorage(classifyFile);
      if (ext === "docx") {
        const { html, images } = await processWord(classifyFile);
        await saveFile.mutateAsync({
          file_name: classifyFile.name, file_type: ext, content_type: contentType,
          description: description || undefined, reference_date: referenceDate || undefined,
          file_url: fileUrl, file_size_bytes: classifyFile.size,
          extracted_html: html, extracted_images: images,
        });
      } else {
        await saveFile.mutateAsync({
          file_name: classifyFile.name, file_type: ext, content_type: contentType,
          description: description || undefined, reference_date: referenceDate || undefined,
          file_url: fileUrl, file_size_bytes: classifyFile.size,
        });
      }
      setClassifyFile(null);
    } catch (err: any) {
      toast.error(`Erro ao processar: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleExcelMappingConfirm = async (mappings: Record<string, string>) => {
    if (!excelPreview) return;
    setProcessing(true);
    try {
      const { file, data, contentType, description, referenceDate } = excelPreview;
      const fileUrl = await uploadFileToStorage(file);
      const ext = getFileExtension(file.name);
      const savedFile = await saveFile.mutateAsync({
        file_name: file.name, file_type: ext, content_type: contentType,
        description: description || undefined, reference_date: referenceDate || undefined,
        file_url: fileUrl, file_size_bytes: file.size,
        parsed_data: { ...data, columnMappings: mappings } as any,
      });
      const dateCol = Object.keys(mappings).find(k => mappings[k] === "date");
      const irrCol = Object.keys(mappings).find(k => mappings[k] === "irrigation_mm");
      const rainCol = Object.keys(mappings).find(k => mappings[k] === "precipitation_mm");
      const durCol = Object.keys(mappings).find(k => mappings[k] === "duration_h");
      if (dateCol && irrCol) {
        for (const row of data.rows) {
          const date = String(row[dateCol] ?? "");
          const val = Number(row[irrCol]);
          if (date && !isNaN(val) && val > 0) {
            await saveIrrigation.mutateAsync({
              start_date: date, depth_mm: val,
              duration_hours: durCol ? Number(row[durCol]) || undefined : undefined,
              source: "imported", source_file_id: savedFile.id,
            });
          }
        }
      }
      if (dateCol && rainCol) {
        for (const row of data.rows) {
          const date = String(row[dateCol] ?? "");
          const val = Number(row[rainCol]);
          if (date && !isNaN(val) && val > 0) {
            await saveRainfall.mutateAsync({
              record_date: date, precipitation_mm: val,
              source: "imported", source_file_id: savedFile.id,
            });
          }
        }
      }
      setExcelPreview(null);
      toast.success("Dados importados com sucesso!");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 10MB)"); return; }
      setClassifyFile(file);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {contractNumber && <Badge variant="outline">Contrato: {contractNumber}</Badge>}
        {hybridName && <span>Híbrido: {hybridName}</span>}
        {cooperatorName && <><span>•</span><span>Cooperado: {cooperatorName}</span></>}
        {pivotName && <><span>•</span><span>Pivô: {pivotName}</span></>}
        {totalArea && <><span>•</span><span>Área: {totalArea} ha</span></>}
      </div>

      {/* Dashboard */}
      <WaterDashboard irrigationRecords={irrigationRecords} rainfallRecords={rainfallRecords} fileCount={files.length} />

      {/* Upload zone */}
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="font-medium">+ Adicionar Arquivo de Irrigação/Chuva</p>
        <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls, .csv), Word (.docx) ou PDF (.pdf)</p>
        <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,.docx,.pdf" onChange={handleFileSelect} />
      </div>

      {/* Excel preview step */}
      {excelPreview && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preview — {excelPreview.file.name}</h3>
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <ExcelPreview data={excelPreview.data} onMappingConfirm={handleExcelMappingConfirm} showMappingStep />
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registro Manual
        </Button>
        <input ref={weatherFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleWeatherFileSelect} />
        <Button variant="outline" size="sm" onClick={() => weatherFileRef.current?.click()} className="gap-1">
          <CloudSun className="h-4 w-4" /> Importar Dados Meteorológicos
        </Button>
      </div>

      {/* Weather charts */}
      <WeatherCharts records={weatherRecords} cycleId={cycleId} orgId={orgId} pivotName={pivotName} hybridName={hybridName} />

      {/* Weather delete option */}
      {weatherRecords.length > 0 && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>{weatherRecords.length} registros meteorológicos</span>
          <Button
            variant="ghost" size="sm"
            className="h-6 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Excluir todos os ${weatherRecords.length} registros meteorológicos?`)) {
                deleteWeatherBatch.mutate(undefined, {
                  onSuccess: () => toast.success("Registros meteorológicos excluídos"),
                });
              }
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Limpar
          </Button>
        </div>
      )}

      {/* Files list */}
      {loadingFiles ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : files.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Arquivos Importados ({files.length})</h3>
          {files.map((f: any) => (
            <WaterFileCard key={f.id} file={f} onDelete={(id) => deleteFile.mutate(id)} />
          ))}
        </div>
      ) : null}

      {/* Dialogs */}
      <FileClassifyDialog
        open={!!classifyFile}
        fileName={classifyFile?.name || ""}
        onConfirm={handleClassifyConfirm}
        onCancel={() => setClassifyFile(null)}
        processing={processing}
      />
      <ManualRecordDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaveIrrigation={(data) => { saveIrrigation.mutate(data); setManualOpen(false); }}
        onSaveRainfall={(data) => { saveRainfall.mutate(data); setManualOpen(false); }}
        saving={saveIrrigation.isPending || saveRainfall.isPending}
      />
      {weatherImportOpen && (
        <WeatherImportDialog
          open={weatherImportOpen}
          onClose={() => setWeatherImportOpen(false)}
          headers={weatherHeaders}
          rawData={weatherRawData}
          onImport={handleWeatherImport}
          importing={weatherImporting}
        />
      )}
    </div>
  );
}
