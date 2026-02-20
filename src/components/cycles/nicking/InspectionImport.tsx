import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Upload, Loader2, Trash2, FileSpreadsheet, Eye, ChevronDown, ChevronRight, MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  ComposedChart, LineChart, BarChart, AreaChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSyncContext } from "@/components/Layout";
import "leaflet/dist/leaflet.css";

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════

interface InspectionImportProps {
  cycleId: string;
  orgId: string;
}

interface ParsedInspection {
  inspection_number: number;
  inspection_date: string | null;
  pct_detasseled: number | null;
  pct_stigma_receptive: number | null;
  pct_female_pollinating: number | null;
  pct_male1_pollinating: number | null;
  pct_male2_pollinating: number | null;
  pct_male3_pollinating: number | null;
  pf_stigma_receptive: number | null;
  pf_male1_pollinating: number | null;
  pf_male2_pollinating: number | null;
  pf_male3_pollinating: number | null;
  pct_normal_pollinating: number | null;
  pct_short_pollinating: number | null;
  pct_pse_pollinating: number | null;
  pct_stump_pollinating: number | null;
  pct_rogue_female: number | null;
  pct_rogue_male: number | null;
  pct_volunteer_female: number | null;
  pct_volunteer_male: number | null;
  total_atypical_pollinating: number | null;
  observations: string | null;
}

interface ParsedHeader {
  field_code: string | null;
  hybrid_name: string | null;
  endosperm: string | null;
  isolation: string | null;
  technician: string | null;
  leader: string | null;
  area_ha: number | null;
}

interface CountingPoint {
  point_number: number;
  detasseled_count: number | null;
  stigma_receptive_count: number | null;
  male1_count: number | null;
  male2_count: number | null;
  male3_count: number | null;
  normal_pol: number | null;
  normal_not_pol: number | null;
  short_pol: number | null;
  short_not_pol: number | null;
  pse_pol: number | null;
  pse_not_pol: number | null;
  stump_pol: number | null;
  stump_not_pol: number | null;
  rogue_male_pol: number | null;
  rogue_male_not_pol: number | null;
  rogue_female_pol: number | null;
  rogue_female_not_pol: number | null;
  volunteer_male_pol: number | null;
  volunteer_male_not_pol: number | null;
  volunteer_female_pol: number | null;
  volunteer_female_not_pol: number | null;
  latitude: number | null;
  longitude: number | null;
}

// ═══════════════════════════════════
// EXCEL PARSER
// ═══════════════════════════════════

function excelDateToJS(serial: number): Date | null {
  if (!serial || serial < 1) return null;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000);
}

function safeNum(val: any): number | null {
  if (val == null || val === "" || val === "00:00:00") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function safeStr(val: any): string | null {
  if (val == null || val === "") return null;
  return String(val).trim();
}

function parseExcel(workbook: XLSX.WorkBook): { header: ParsedHeader; inspections: ParsedInspection[]; countingPoints: Map<number, CountingPoint[]> } {
  const header: ParsedHeader = { field_code: null, hybrid_name: null, endosperm: null, isolation: null, technician: null, leader: null, area_ha: null };
  const inspections: ParsedInspection[] = [];
  const countingPoints = new Map<number, CountingPoint[]>();

  // Parse "Gráficos" sheet (main data source for charts)
  const grafSheet = workbook.Sheets["Gráficos"] || workbook.Sheets["Graficos"];
  if (grafSheet) {
    const data = XLSX.utils.sheet_to_json(grafSheet, { header: 1, defval: null }) as any[][];
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const inspNum = safeNum(row[6]); // G
      if (!inspNum || inspNum <= 0) continue;
      
      let dateVal = row[7]; // H
      let dateStr: string | null = null;
      if (dateVal === "00:00:00" || dateVal === 0) continue;
      if (typeof dateVal === "number") {
        const d = excelDateToJS(dateVal);
        if (d) dateStr = format(d, "yyyy-MM-dd");
      } else if (dateVal instanceof Date) {
        dateStr = format(dateVal, "yyyy-MM-dd");
      } else if (typeof dateVal === "string" && dateVal.length >= 8) {
        // Try parsing dd/mm/yyyy or yyyy-mm-dd
        const parts = dateVal.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) dateStr = dateVal;
          else dateStr = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }

      // Check if this inspection number already exists (update with more data)
      let existing = inspections.find(ins => ins.inspection_number === inspNum);
      if (!existing) {
        existing = {
          inspection_number: inspNum,
          inspection_date: dateStr,
          pct_detasseled: null,
          pct_stigma_receptive: null,
          pct_female_pollinating: null,
          pct_male1_pollinating: null,
          pct_male2_pollinating: null,
          pct_male3_pollinating: null,
          pf_stigma_receptive: null,
          pf_male1_pollinating: null,
          pf_male2_pollinating: null,
          pf_male3_pollinating: null,
          pct_normal_pollinating: null,
          pct_short_pollinating: null,
          pct_pse_pollinating: null,
          pct_stump_pollinating: null,
          pct_rogue_female: null,
          pct_rogue_male: null,
          pct_volunteer_female: null,
          pct_volunteer_male: null,
          total_atypical_pollinating: null,
          observations: null,
        };
        inspections.push(existing);
      }

      // Columns: I=FP, J=ER, K=MP1, L=MP2, M=MP3, N=PT, O=ER-PF, P=MP1-PF, Q=MP2-PF, R=MP3-PF
      existing.pct_female_pollinating = safeNum(row[8]) ?? existing.pct_female_pollinating;
      existing.pct_stigma_receptive = safeNum(row[9]) ?? existing.pct_stigma_receptive;
      existing.pct_male1_pollinating = safeNum(row[10]) ?? existing.pct_male1_pollinating;
      existing.pct_male2_pollinating = safeNum(row[11]) ?? existing.pct_male2_pollinating;
      existing.pct_male3_pollinating = safeNum(row[12]) ?? existing.pct_male3_pollinating;
      existing.pct_detasseled = safeNum(row[13]) ?? existing.pct_detasseled;
      existing.pf_stigma_receptive = safeNum(row[14]) ?? existing.pf_stigma_receptive;
      existing.pf_male1_pollinating = safeNum(row[15]) ?? existing.pf_male1_pollinating;
      existing.pf_male2_pollinating = safeNum(row[16]) ?? existing.pf_male2_pollinating;
      existing.pf_male3_pollinating = safeNum(row[17]) ?? existing.pf_male3_pollinating;
    }
  }

  // Parse "ROI" sheet for header info and observations
  const roiSheet = workbook.Sheets["ROI"];
  if (roiSheet) {
    const data = XLSX.utils.sheet_to_json(roiSheet, { header: 1, defval: null }) as any[][];
    // Header from first block
    if (data.length > 16) {
      header.field_code = safeStr(data[7]?.[2]);  // C8
      header.hybrid_name = safeStr(data[8]?.[2]); // C9
      header.endosperm = safeStr(data[9]?.[2]);    // C10
      header.isolation = safeStr(data[10]?.[2]);   // C11
      header.technician = safeStr(data[14]?.[2]);  // C15
      header.leader = safeStr(data[15]?.[2]);      // C16
    }
  }

  // Parse "RID" sheet for header area and counting points
  const ridSheet = workbook.Sheets["RID"];
  if (ridSheet) {
    const data = XLSX.utils.sheet_to_json(ridSheet, { header: 1, defval: null }) as any[][];
    if (data.length > 2) {
      header.field_code = header.field_code || safeStr(data[1]?.[20]); // U2
      header.hybrid_name = header.hybrid_name || safeStr(data[1]?.[24]); // Y2
      const areaVal = safeNum(data[1]?.[28]); // AC2
      if (areaVal) header.area_ha = areaVal;
    }
  }

  // Parse "Dados de Florescimento" for atypical data
  const florSheet = workbook.Sheets["Dados de Florescimento"];
  if (florSheet) {
    const data = XLSX.utils.sheet_to_json(florSheet, { header: 1, defval: null }) as any[][];
    for (let i = 5; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const inspNum = safeNum(row[2]); // C
      if (!inspNum || inspNum <= 0) continue;
      const existing = inspections.find(ins => ins.inspection_number === inspNum);
      if (!existing) continue;
      // E=PT, F=ER, G-N=types, O=total female pol, T=MP1, U=MP2
      existing.pct_detasseled = safeNum(row[4]) ?? existing.pct_detasseled;
      existing.pct_stigma_receptive = safeNum(row[5]) ?? existing.pct_stigma_receptive;
      existing.pct_normal_pollinating = safeNum(row[6]) ?? existing.pct_normal_pollinating;
      existing.pct_short_pollinating = safeNum(row[8]) ?? existing.pct_short_pollinating;
      existing.pct_pse_pollinating = safeNum(row[10]) ?? existing.pct_pse_pollinating;
      existing.pct_stump_pollinating = safeNum(row[12]) ?? existing.pct_stump_pollinating;
      const totalFP = safeNum(row[14]); // O
      if (totalFP != null) existing.pct_female_pollinating = totalFP;
      existing.pct_rogue_female = safeNum(row[15]) ?? existing.pct_rogue_female;
      existing.pct_rogue_male = safeNum(row[16]) ?? existing.pct_rogue_male;
      existing.pct_volunteer_female = safeNum(row[17]) ?? existing.pct_volunteer_female;
      existing.pct_volunteer_male = safeNum(row[18]) ?? existing.pct_volunteer_male;
      existing.pct_male1_pollinating = safeNum(row[19]) ?? existing.pct_male1_pollinating;
      existing.pct_male2_pollinating = safeNum(row[20]) ?? existing.pct_male2_pollinating;
    }
  }

  // Parse "Situações Atípicas do Campo"
  const atipSheet = workbook.Sheets["Situações Atípicas do Campo"] || workbook.Sheets["Situacoes Atipicas do Campo"];
  if (atipSheet) {
    const data = XLSX.utils.sheet_to_json(atipSheet, { header: 1, defval: null }) as any[][];
    // Row 7=normal pol, 8=short pol, 9=pse pol, 10=stump pol, 11=total FP
    // Columns from D onwards = inspections
    if (data.length > 11) {
      for (let col = 3; col < (data[6]?.length || 0); col++) {
        const inspIdx = col - 3;
        if (inspIdx >= inspections.length) break;
        const insp = inspections[inspIdx];
        if (!insp) continue;
        insp.pct_normal_pollinating = safeNum(data[6]?.[col]) ?? insp.pct_normal_pollinating;
        insp.pct_short_pollinating = safeNum(data[7]?.[col]) ?? insp.pct_short_pollinating;
        insp.pct_pse_pollinating = safeNum(data[8]?.[col]) ?? insp.pct_pse_pollinating;
        insp.pct_stump_pollinating = safeNum(data[9]?.[col]) ?? insp.pct_stump_pollinating;
        const totalAtip = safeNum(data[10]?.[col]);
        if (totalAtip != null) insp.total_atypical_pollinating = totalAtip;
      }
    }
  }

  // Calculate total_atypical_pollinating if not set
  for (const insp of inspections) {
    if (insp.total_atypical_pollinating == null) {
      const vals = [insp.pct_normal_pollinating, insp.pct_short_pollinating, insp.pct_pse_pollinating, insp.pct_stump_pollinating].filter(v => v != null) as number[];
      if (vals.length > 0) insp.total_atypical_pollinating = vals.reduce((a, b) => a + b, 0);
    }
  }

  // Parse "Coordenadas Gerais"
  const coordSheet = workbook.Sheets["Coordenadas Gerais"];
  if (coordSheet) {
    const data = XLSX.utils.sheet_to_json(coordSheet, { header: 1, defval: null }) as any[][];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const pointNum = safeNum(row[0]); // A
      const lat = safeNum(row[1]); // B
      const lng = safeNum(row[2]); // C
      const inspNum = safeNum(row[3]); // D
      if (!pointNum || !inspNum || lat == null || lng == null) continue;
      if (!countingPoints.has(inspNum)) countingPoints.set(inspNum, []);
      countingPoints.get(inspNum)!.push({
        point_number: pointNum,
        detasseled_count: null, stigma_receptive_count: null,
        male1_count: null, male2_count: null, male3_count: null,
        normal_pol: null, normal_not_pol: null,
        short_pol: null, short_not_pol: null,
        pse_pol: null, pse_not_pol: null,
        stump_pol: null, stump_not_pol: null,
        rogue_male_pol: null, rogue_male_not_pol: null,
        rogue_female_pol: null, rogue_female_not_pol: null,
        volunteer_male_pol: null, volunteer_male_not_pol: null,
        volunteer_female_pol: null, volunteer_female_not_pol: null,
        latitude: lat, longitude: lng,
      });
    }
  }

  // Sort by inspection number
  inspections.sort((a, b) => a.inspection_number - b.inspection_number);

  return { header, inspections, countingPoints };
}

// ═══════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════

function KPIGauge({ value, label, thresholds }: { value: number | null; label: string; thresholds?: { green: number; yellow: number } }) {
  const t = thresholds || { green: 99, yellow: 95 };
  const v = value ?? 0;
  const color = v >= t.green ? "#4CAF50" : v >= t.yellow ? "#FF9800" : "#F44336";
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4 text-center">
        <p className="text-3xl font-bold" style={{ color }}>{v != null ? `${(v * 100).toFixed(1)}%` : "—"}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function TrendKPI({ value, prevValue, label, color }: { value: number | null; prevValue: number | null; label: string; color: string }) {
  const v = value ?? 0;
  const pv = prevValue ?? 0;
  const trend = v > pv ? "up" : v < pv ? "down" : "flat";
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="p-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-2xl font-bold" style={{ color }}>{v != null ? `${(v * 100).toFixed(1)}%` : "—"}</p>
          {trend === "up" && <TrendingUp className="h-4 w-4" style={{ color: "#4CAF50" }} />}
          {trend === "down" && <TrendingDown className="h-4 w-4" style={{ color: "#F44336" }} />}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════

export default function InspectionImport({ cycleId, orgId }: InspectionImportProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addRecordGroup } = useOfflineSyncContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [expandedInsp, setExpandedInsp] = useState<number | null>(null);
  const [autoExpanded, setAutoExpanded] = useState(false);

  // Fetch existing imports
  const { data: imports = [], isLoading: importsLoading } = useQuery({
    queryKey: ["inspection_imports", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("inspection_imports").select("*").eq("cycle_id", cycleId).is("deleted_at", null)
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const latestImport = imports[0] || null;

  // Fetch inspection data for latest import
  const { data: inspectionData = [] } = useQuery({
    queryKey: ["inspection_data", latestImport?.id],
    queryFn: async () => {
      if (!latestImport) return [];
      const { data, error } = await (supabase as any)
        .from("inspection_data").select("*").eq("import_id", latestImport.id)
        .order("inspection_number", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!latestImport,
  });

  // Fetch counting points for latest import
  const inspDataIds = inspectionData.map((d: any) => d.id);
  const { data: countingPts = [] } = useQuery({
    queryKey: ["inspection_counting_points", inspDataIds],
    queryFn: async () => {
      if (inspDataIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("inspection_counting_points").select("*").in("inspection_data_id", inspDataIds)
        .order("point_number", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: inspDataIds.length > 0,
  });

  // ── Import handler ──
  const handleFileUpload = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const { header, inspections, countingPoints } = parseExcel(wb);

      if (inspections.length === 0) {
        toast.error("Nenhuma inspeção encontrada na planilha.");
        setParsing(false);
        return;
      }

      // Upload file to storage (requires online)
      const filePath = `${orgId}/${cycleId}/inspection-${crypto.randomUUID()}.xlsx`;
      await supabase.storage.from("cycle-media").upload(filePath, file);

      // Build group records for offline-capable insert
      const localImportId = crypto.randomUUID();
      const groupRecords: any[] = [
        {
          table: "inspection_imports",
          data: {
            id: localImportId,
            cycle_id: cycleId, org_id: orgId,
            file_name: file.name, file_url: filePath,
            field_code: header.field_code, hybrid_name: header.hybrid_name,
            endosperm: header.endosperm, isolation: header.isolation,
            technician: header.technician, leader: header.leader,
            area_ha: header.area_ha,
            total_inspections: inspections.length,
            imported_by: user?.id || null,
          },
          localId: localImportId,
        },
      ];

      for (const insp of inspections) {
        const localInspId = crypto.randomUUID();
        groupRecords.push({
          table: "inspection_data",
          data: {
            id: localInspId,
            import_id: localImportId,
            inspection_number: insp.inspection_number,
            inspection_date: insp.inspection_date,
            pct_detasseled: insp.pct_detasseled,
            pct_stigma_receptive: insp.pct_stigma_receptive,
            pct_female_pollinating: insp.pct_female_pollinating,
            pct_male1_pollinating: insp.pct_male1_pollinating,
            pct_male2_pollinating: insp.pct_male2_pollinating,
            pct_male3_pollinating: insp.pct_male3_pollinating,
            pf_stigma_receptive: insp.pf_stigma_receptive,
            pf_male1_pollinating: insp.pf_male1_pollinating,
            pf_male2_pollinating: insp.pf_male2_pollinating,
            pf_male3_pollinating: insp.pf_male3_pollinating,
            pct_normal_pollinating: insp.pct_normal_pollinating,
            pct_short_pollinating: insp.pct_short_pollinating,
            pct_pse_pollinating: insp.pct_pse_pollinating,
            pct_stump_pollinating: insp.pct_stump_pollinating,
            pct_rogue_female: insp.pct_rogue_female,
            pct_rogue_male: insp.pct_rogue_male,
            pct_volunteer_female: insp.pct_volunteer_female,
            pct_volunteer_male: insp.pct_volunteer_male,
            total_atypical_pollinating: insp.total_atypical_pollinating,
            observations: insp.observations,
          },
          localId: localInspId,
          parentLocalId: localImportId,
          fkField: "import_id",
        });

        // Insert counting points for this inspection
        const pts = countingPoints.get(insp.inspection_number);
        if (pts && pts.length > 0) {
          for (const pt of pts) {
            groupRecords.push({
              table: "inspection_counting_points",
              data: { ...pt, inspection_data_id: localInspId },
              parentLocalId: localInspId,
              fkField: "inspection_data_id",
            });
          }
        }
      }

      const { error } = await addRecordGroup(groupRecords, cycleId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["inspection_imports", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["inspection_data"] });
      toast.success(`✅ Planilha importada: ${file.name} | ${inspections.length} inspeções`);
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setParsing(false);
    }
  }, [cycleId, orgId, user, queryClient]);

  // ── Delete import ──
  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "inspection_imports",
        _record_id: importId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspection_imports", cycleId] });
      toast.success("Importação removida.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Chart data ──
  const chartData = useMemo(() => {
    return inspectionData.map((d: any) => ({
      date: d.inspection_date ? format(new Date(d.inspection_date + "T12:00:00"), "dd/MM") : `#${d.inspection_number}`,
      fullDate: d.inspection_date,
      insp: d.inspection_number,
      er: d.pct_stigma_receptive != null ? d.pct_stigma_receptive * 100 : null,
      mp1: d.pct_male1_pollinating != null ? d.pct_male1_pollinating * 100 : null,
      mp2: d.pct_male2_pollinating != null ? d.pct_male2_pollinating * 100 : null,
      mp3: d.pct_male3_pollinating != null ? d.pct_male3_pollinating * 100 : null,
      fp: d.pct_female_pollinating != null ? d.pct_female_pollinating * 100 : null,
      pt: d.pct_detasseled != null ? d.pct_detasseled * 100 : null,
      erPf: d.pf_stigma_receptive != null ? d.pf_stigma_receptive * 100 : null,
      mp1Pf: d.pf_male1_pollinating != null ? d.pf_male1_pollinating * 100 : null,
      mp2Pf: d.pf_male2_pollinating != null ? d.pf_male2_pollinating * 100 : null,
      mp3Pf: d.pf_male3_pollinating != null ? d.pf_male3_pollinating * 100 : null,
      normalPol: d.pct_normal_pollinating != null ? d.pct_normal_pollinating * 100 : 0,
      shortPol: d.pct_short_pollinating != null ? d.pct_short_pollinating * 100 : 0,
      psePol: d.pct_pse_pollinating != null ? d.pct_pse_pollinating * 100 : 0,
      stumpPol: d.pct_stump_pollinating != null ? d.pct_stump_pollinating * 100 : 0,
      totalAtypical: d.total_atypical_pollinating != null ? d.total_atypical_pollinating * 100 : 0,
      rogFem: d.pct_rogue_female != null ? d.pct_rogue_female * 100 : 0,
      rogMale: d.pct_rogue_male != null ? d.pct_rogue_male * 100 : 0,
      volFem: d.pct_volunteer_female != null ? d.pct_volunteer_female * 100 : 0,
      volMale: d.pct_volunteer_male != null ? d.pct_volunteer_male * 100 : 0,
    }));
  }, [inspectionData]);

  const hasMale3 = chartData.some(d => d.mp3 != null && d.mp3 > 0);
  const hasPfData = chartData.some(d => d.erPf != null || d.mp1Pf != null);
  const hasAtypicalData = chartData.some(d => d.normalPol > 0 || d.shortPol > 0 || d.psePol > 0 || d.stumpPol > 0);
  const hasRogueData = chartData.some(d => d.rogFem > 0 || d.rogMale > 0 || d.volFem > 0 || d.volMale > 0);

  const latest = inspectionData.length > 0 ? inspectionData[inspectionData.length - 1] : null;
  const prev = inspectionData.length > 1 ? inspectionData[inspectionData.length - 2] : null;

  // Auto-expand the last inspection
  useEffect(() => {
    if (latest && !autoExpanded) {
      setExpandedInsp(latest.inspection_number);
      setAutoExpanded(true);
    }
  }, [latest, autoExpanded]);

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  return (
    <div className="space-y-6">
      {/* UPLOAD CARD */}
      <Card className="border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              📊 Importar Relatório de Inspeção (Excel)
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Faça upload da planilha ROI/RID (.xlsx) para gerar dashboard automático
            </p>
            {parsing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Processando planilha...
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Selecionar arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* IMPORT HISTORY */}
      {imports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Histórico de Importações</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium text-muted-foreground text-xs">Data Upload</th>
                    <th className="p-2 font-medium text-muted-foreground text-xs">Arquivo</th>
                    <th className="p-2 font-medium text-muted-foreground text-xs">Inspeções</th>
                    <th className="p-2 font-medium text-muted-foreground text-xs">Campo</th>
                    <th className="p-2 font-medium text-muted-foreground text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((imp: any) => (
                    <tr key={imp.id} className="border-b">
                      <td className="p-2 text-xs">{format(new Date(imp.imported_at), "dd/MM/yy HH:mm")}</td>
                      <td className="p-2 text-xs font-medium">{imp.file_name}</td>
                      <td className="p-2 text-xs">{imp.total_inspections}</td>
                      <td className="p-2 text-xs">{imp.field_code || "—"}</td>
                      <td className="p-2 flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate(imp.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DASHBOARD - only if we have imported data */}
      {latestImport && inspectionData.length > 0 && (
        <>
          {/* FIELD INFO */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/10 text-primary border-primary/30">📊 Importado</Badge>
                <span className="text-xs text-muted-foreground">{latestImport.file_name}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {latestImport.field_code && <div><p className="text-xs text-muted-foreground">Campo</p><p className="font-semibold">{latestImport.field_code}</p></div>}
                {latestImport.hybrid_name && <div><p className="text-xs text-muted-foreground">Híbrido</p><p className="font-semibold">{latestImport.hybrid_name}</p></div>}
                {latestImport.area_ha && <div><p className="text-xs text-muted-foreground">Área</p><p className="font-semibold">{latestImport.area_ha} ha</p></div>}
                {latestImport.endosperm && <div><p className="text-xs text-muted-foreground">Endosperma</p><p className="font-semibold">{latestImport.endosperm}</p></div>}
                {latestImport.technician && <div><p className="text-xs text-muted-foreground">Técnico</p><p className="font-semibold">{latestImport.technician}</p></div>}
                {latestImport.leader && <div><p className="text-xs text-muted-foreground">Líder</p><p className="font-semibold">{latestImport.leader}</p></div>}
                <div><p className="text-xs text-muted-foreground">Total Inspeções</p><p className="font-semibold">{latestImport.total_inspections}</p></div>
                {latest?.inspection_date && <div><p className="text-xs text-muted-foreground">Última Inspeção</p><p className="font-semibold">{format(new Date(latest.inspection_date + "T12:00:00"), "dd/MM/yyyy")}</p></div>}
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPIGauge value={latest?.pct_detasseled} label="% Despendoada" thresholds={{ green: 0.99, yellow: 0.95 }} />
            <TrendKPI value={latest?.pct_stigma_receptive} prevValue={prev?.pct_stigma_receptive} label="% Estigma Receptivo" color="#1E88E5" />
            <TrendKPI value={latest?.pct_male1_pollinating} prevValue={prev?.pct_male1_pollinating} label="% Macho 1 Pol." color="#4CAF50" />
            <TrendKPI value={latest?.pct_male2_pollinating} prevValue={prev?.pct_male2_pollinating} label="% Macho 2 Pol." color="#FF9800" />
            <Card className="border-l-4" style={{ borderLeftColor: (latest?.total_atypical_pollinating ?? 0) > 0.005 ? "#F44336" : (latest?.total_atypical_pollinating ?? 0) > 0.001 ? "#FF9800" : "#4CAF50" }}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{latest?.total_atypical_pollinating != null ? `${(latest.total_atypical_pollinating * 100).toFixed(2)}%` : "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Atípicas Pol.</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 text-center">
                <Badge className={cn("text-sm", 
                  latest?.pct_stigma_receptive > 0.2 && (latest?.pct_male1_pollinating > 0.2 || latest?.pct_male2_pollinating > 0.2) 
                    ? "bg-green-100 text-green-800 border-green-300" 
                    : "bg-yellow-100 text-yellow-800 border-yellow-300"
                )}>
                  {latest?.pct_stigma_receptive > 0.2 && (latest?.pct_male1_pollinating > 0.2 || latest?.pct_male2_pollinating > 0.2)
                    ? "🟢 Boa Sincronia" : "🟡 Verificar"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Sincronia</p>
              </CardContent>
            </Card>
          </div>

          {/* CHART 1 — Florescimento e Despendoamento */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Florescimento e Despendoamento — Contagens</CardTitle>
                <Badge variant="outline" className="text-xs">📊 Importado</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "%", position: "insideTopLeft", fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="right" dataKey="pt" name="% Despendoada" fill="#9E9E9E" opacity={0.3} />
                  <Line yAxisId="left" type="monotone" dataKey="er" name="% Estigma Receptivo" stroke="#1E88E5" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="left" type="monotone" dataKey="mp1" name="% Macho 1 Pol." stroke="#4CAF50" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="left" type="monotone" dataKey="mp2" name="% Macho 2 Pol." stroke="#FF9800" strokeWidth={2} dot={{ r: 3 }} />
                  {hasMale3 && <Line yAxisId="left" type="monotone" dataKey="mp3" name="% Macho 3 Pol." stroke="#7B1FA2" strokeWidth={2} dot={{ r: 3 }} />}
                  <Line yAxisId="left" type="monotone" dataKey="fp" name="% Fêmea Pol." stroke="#F44336" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CHART 2 — Ponto Fixo */}
          {hasPfData && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Florescimento — Ponto Fixo</CardTitle>
                  <Badge variant="outline" className="text-xs">📊 Importado</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Dados de Ponto Fixo — Amostragem dirigida (não probabilística)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="erPf" name="ER Ponto Fixo" stroke="#1E88E5" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="mp1Pf" name="MP1 Ponto Fixo" stroke="#4CAF50" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="mp2Pf" name="MP2 Ponto Fixo" stroke="#FF9800" strokeWidth={2} dot={{ r: 3 }} />
                    {hasMale3 && <Line type="monotone" dataKey="mp3Pf" name="MP3 Ponto Fixo" stroke="#7B1FA2" strokeWidth={2} dot={{ r: 3 }} />}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* CHART 3 — Situações Atípicas */}
          {hasAtypicalData && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Situações Atípicas Polinizando</CardTitle>
                  <Badge variant="outline" className="text-xs">📊 Importado</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="normalPol" name="Normal Pol." stackId="a" fill="#616161" />
                    <Bar dataKey="shortPol" name="Baixa Pol." stackId="a" fill="#FDD835" />
                    <Bar dataKey="psePol" name="PSE Pol." stackId="a" fill="#FF9800" />
                    <Bar dataKey="stumpPol" name="Toco Pol." stackId="a" fill="#F44336" />
                    <Line type="monotone" dataKey="totalAtypical" name="Total Atípicas" stroke="#F44336" strokeWidth={2} strokeDasharray="5 5" />
                    <ReferenceLine y={0.5} stroke="#F44336" strokeDasharray="3 3" label={{ value: "Limite 0.5%", position: "insideTopRight", fontSize: 10 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* CHART 4 — Rogues e Tigueras */}
          {hasRogueData && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Rogues e Tigueras</CardTitle>
                  <Badge variant="outline" className="text-xs">📊 Importado</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="rogFem" name="Rogue Fêmea" fill="#EC407A" />
                    <Bar dataKey="rogMale" name="Rogue Macho" fill="#1E88E5" />
                    <Bar dataKey="volFem" name="Tiguera Fêmea" fill="#F48FB1" />
                    <Bar dataKey="volMale" name="Tiguera Macho" fill="#90CAF9" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* CHART 5 — Evolução Despendoamento */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Evolução do Despendoamento</CardTitle>
                <Badge variant="outline" className="text-xs">📊 Importado</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceArea y1={99} y2={100} fill="#4CAF50" fillOpacity={0.1} />
                  <ReferenceArea y1={95} y2={99} fill="#FF9800" fillOpacity={0.1} />
                  <ReferenceArea y1={0} y2={95} fill="#F44336" fillOpacity={0.05} />
                  <Area type="monotone" dataKey="pt" name="% Despendoada" fill="#4CAF50" fillOpacity={0.3} stroke="#4CAF50" strokeWidth={2} />
                  <Line type="monotone" dataKey="fp" name="% Fêmea Pol." stroke="#F44336" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* DETAIL TABLE */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Detalhes por Inspeção</CardTitle>
                <Badge variant="outline" className="text-xs">📊 Importado</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 font-medium text-muted-foreground">Insp.</th>
                      <th className="p-2 font-medium text-muted-foreground">Data</th>
                      <th className="p-2 font-medium text-muted-foreground">% Desp.</th>
                      <th className="p-2 font-medium text-muted-foreground">% ER</th>
                      <th className="p-2 font-medium text-muted-foreground">% MP1</th>
                      <th className="p-2 font-medium text-muted-foreground">% MP2</th>
                      {hasMale3 && <th className="p-2 font-medium text-muted-foreground">% MP3</th>}
                      <th className="p-2 font-medium text-muted-foreground">% FP</th>
                      <th className="p-2 font-medium text-muted-foreground">Atíp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionData.map((d: any) => {
                      const isExpanded = expandedInsp === d.inspection_number;
                      return (
                        <tr
                          key={d.id}
                          className={cn("border-b cursor-pointer hover:bg-muted/50", isExpanded && "bg-muted/30")}
                          onClick={() => setExpandedInsp(isExpanded ? null : d.inspection_number)}
                        >
                          <td className="p-2 font-medium">
                            <span className="flex items-center gap-1">
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              {d.inspection_number}
                            </span>
                          </td>
                          <td className="p-2">{d.inspection_date ? format(new Date(d.inspection_date + "T12:00:00"), "dd/MM") : "—"}</td>
                          <td className="p-2">
                            <span className={cn("font-semibold", d.pct_detasseled >= 0.99 ? "text-green-600" : d.pct_detasseled >= 0.95 ? "text-amber-600" : "text-red-600")}>
                              {d.pct_detasseled != null ? `${(d.pct_detasseled * 100).toFixed(1)}` : "—"}
                            </span>
                          </td>
                          <td className="p-2" style={{ color: "#1E88E5" }}>{d.pct_stigma_receptive != null ? `${(d.pct_stigma_receptive * 100).toFixed(1)}` : "—"}</td>
                          <td className="p-2" style={{ color: "#4CAF50" }}>{d.pct_male1_pollinating != null ? `${(d.pct_male1_pollinating * 100).toFixed(1)}` : "—"}</td>
                          <td className="p-2" style={{ color: "#FF9800" }}>{d.pct_male2_pollinating != null ? `${(d.pct_male2_pollinating * 100).toFixed(1)}` : "—"}</td>
                          {hasMale3 && <td className="p-2" style={{ color: "#7B1FA2" }}>{d.pct_male3_pollinating != null ? `${(d.pct_male3_pollinating * 100).toFixed(1)}` : "—"}</td>}
                          <td className="p-2" style={{ color: "#F44336" }}>{d.pct_female_pollinating != null ? `${(d.pct_female_pollinating * 100).toFixed(1)}` : "—"}</td>
                          <td className="p-2">{d.total_atypical_pollinating != null ? `${(d.total_atypical_pollinating * 100).toFixed(2)}` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* EXPANDED INSPECTION DETAIL (rendered outside table to avoid Leaflet context issues) */}
          {(() => {
            const expandedData = inspectionData.find((d: any) => d.inspection_number === expandedInsp);
            if (!expandedData) return null;
            const pts = countingPts.filter((p: any) => p.inspection_data_id === expandedData.id);
            const geoPoints = pts.filter((p: any) => p.latitude != null && p.longitude != null);
            const d = expandedData;
            return (
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    📋 Inspeção #{d.inspection_number} — {d.inspection_date ? format(new Date(d.inspection_date + "T12:00:00"), "dd/MM/yyyy") : "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* KPI summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: (d.pct_detasseled ?? 0) >= 0.99 ? "#4CAF50" : (d.pct_detasseled ?? 0) >= 0.95 ? "#FF9800" : "#F44336" }}>
                        {d.pct_detasseled != null ? `${(d.pct_detasseled * 100).toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Despendoada</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: "#1E88E5" }}>{d.pct_stigma_receptive != null ? `${(d.pct_stigma_receptive * 100).toFixed(1)}%` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Estigma Receptivo</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: "#4CAF50" }}>{d.pct_male1_pollinating != null ? `${(d.pct_male1_pollinating * 100).toFixed(1)}%` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Macho 1 Pol.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: "#FF9800" }}>{d.pct_male2_pollinating != null ? `${(d.pct_male2_pollinating * 100).toFixed(1)}%` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Macho 2 Pol.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: "#F44336" }}>{d.pct_female_pollinating != null ? `${(d.pct_female_pollinating * 100).toFixed(1)}%` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Fêmea Pol.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-3 text-center">
                      <p className="text-lg font-bold">{d.total_atypical_pollinating != null ? `${(d.total_atypical_pollinating * 100).toFixed(2)}%` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Atípicas</p>
                    </div>
                  </div>

                  {/* Atypical breakdown */}
                  {(d.pct_normal_pollinating != null || d.pct_short_pollinating != null || d.pct_pse_pollinating != null || d.pct_stump_pollinating != null) && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs font-semibold mb-2">Detalhamento Atípicas (Pol.)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#616161" }}></span> Normal: {d.pct_normal_pollinating != null ? `${(d.pct_normal_pollinating * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#FDD835" }}></span> Baixa: {d.pct_short_pollinating != null ? `${(d.pct_short_pollinating * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#FF9800" }}></span> PSE: {d.pct_pse_pollinating != null ? `${(d.pct_pse_pollinating * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#F44336" }}></span> Toco: {d.pct_stump_pollinating != null ? `${(d.pct_stump_pollinating * 100).toFixed(2)}%` : "—"}</div>
                      </div>
                    </div>
                  )}

                  {/* Rogues & Volunteers */}
                  {(d.pct_rogue_female != null || d.pct_rogue_male != null || d.pct_volunteer_female != null || d.pct_volunteer_male != null) && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs font-semibold mb-2">Rogues e Tigueras</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#EC407A" }}></span> Rogue ♀: {d.pct_rogue_female != null ? `${(d.pct_rogue_female * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#1E88E5" }}></span> Rogue ♂: {d.pct_rogue_male != null ? `${(d.pct_rogue_male * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#F48FB1" }}></span> Tiguera ♀: {d.pct_volunteer_female != null ? `${(d.pct_volunteer_female * 100).toFixed(2)}%` : "—"}</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "#90CAF9" }}></span> Tiguera ♂: {d.pct_volunteer_male != null ? `${(d.pct_volunteer_male * 100).toFixed(2)}%` : "—"}</div>
                      </div>
                    </div>
                  )}

                  {d.observations && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs font-semibold mb-1">📝 Observações:</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{d.observations}</p>
                    </div>
                  )}

                  {/* Counting points table */}
                  {pts.length > 0 && (
                    <div className="rounded-lg border bg-card p-3">
                      <p className="text-xs font-semibold mb-2">Pontos de Contagem ({pts.length})</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b">
                              <th className="p-1">Ponto</th>
                              <th className="p-1">PT</th>
                              <th className="p-1">ER</th>
                              <th className="p-1">MP1</th>
                              <th className="p-1">MP2</th>
                              <th className="p-1">Normal P/NP</th>
                              <th className="p-1">Baixa P/NP</th>
                              <th className="p-1">PSE P/NP</th>
                              <th className="p-1">Toco P/NP</th>
                              <th className="p-1">Lat</th>
                              <th className="p-1">Lng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pts.map((pt: any) => (
                              <tr key={pt.id} className="border-b">
                                <td className="p-1 font-medium">{pt.point_number}</td>
                                <td className="p-1">{pt.detasseled_count ?? "—"}</td>
                                <td className="p-1">{pt.stigma_receptive_count ?? "—"}</td>
                                <td className="p-1">{pt.male1_count ?? "—"}</td>
                                <td className="p-1">{pt.male2_count ?? "—"}</td>
                                <td className="p-1">{pt.normal_pol ?? 0}/{pt.normal_not_pol ?? 0}</td>
                                <td className="p-1">{pt.short_pol ?? 0}/{pt.short_not_pol ?? 0}</td>
                                <td className="p-1">{pt.pse_pol ?? 0}/{pt.pse_not_pol ?? 0}</td>
                                <td className="p-1">{pt.stump_pol ?? 0}/{pt.stump_not_pol ?? 0}</td>
                                <td className="p-1">{pt.latitude != null ? Number(pt.latitude).toFixed(5) : "—"}</td>
                                <td className="p-1">{pt.longitude != null ? Number(pt.longitude).toFixed(5) : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* MAP of counting points */}
                  {geoPoints.length > 0 && (
                    <div className="rounded-lg border bg-card overflow-hidden">
                      <div className="px-3 py-2 border-b flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-primary" />
                        <p className="text-xs font-semibold">🗺️ Mapa dos Pontos — Inspeção #{d.inspection_number}</p>
                        <Badge variant="outline" className="text-[10px] ml-auto">{geoPoints.length} pontos</Badge>
                      </div>
                      <MapContainer
                        key={`map-insp-${d.inspection_number}`}
                        center={[
                          geoPoints.reduce((s: number, p: any) => s + Number(p.latitude), 0) / geoPoints.length,
                          geoPoints.reduce((s: number, p: any) => s + Number(p.longitude), 0) / geoPoints.length,
                        ] as [number, number]}
                        zoom={15}
                        style={{ height: 350, width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {geoPoints.map((pt: any) => {
                          const ptIcon = L.divIcon({
                            className: "",
                            html: `<div style="width:20px;height:20px;border-radius:50%;background:#1E88E5;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:bold;">${pt.point_number}</div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                          });
                          return (
                            <Marker
                              key={pt.id}
                              position={[Number(pt.latitude), Number(pt.longitude)]}
                              icon={ptIcon}
                            >
                              <Popup>
                                <div className="text-xs space-y-1 min-w-[140px]">
                                  <p className="font-bold">Ponto {pt.point_number}</p>
                                  <p>PT: {pt.detasseled_count ?? "—"} | ER: {pt.stigma_receptive_count ?? "—"}</p>
                                  <p>MP1: {pt.male1_count ?? "—"} | MP2: {pt.male2_count ?? "—"}</p>
                                  <p>Normal: {pt.normal_pol ?? 0}P / {pt.normal_not_pol ?? 0}NP</p>
                                  <p>Baixa: {pt.short_pol ?? 0}P / {pt.short_not_pol ?? 0}NP</p>
                                  <p>PSE: {pt.pse_pol ?? 0}P / {pt.pse_not_pol ?? 0}NP</p>
                                  <p>Toco: {pt.stump_pol ?? 0}P / {pt.stump_not_pol ?? 0}NP</p>
                                  <p className="text-muted-foreground">{Number(pt.latitude).toFixed(5)}, {Number(pt.longitude).toFixed(5)}</p>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </MapContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* LAST INSPECTION OBSERVATIONS */}
          {latest?.observations && (
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">📝 Observações da Última Inspeção (#{latest.inspection_number})</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{latest.observations}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
