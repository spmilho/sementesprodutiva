import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, Database, Loader2, AlertTriangle, Clock, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx-republish";

const BACKUP_TABLES_GLOBAL = [
  "organizations", "profiles", "clients", "cooperators", "farms", "pivots", "pivot_glebas",
];

const BACKUP_TABLES_CYCLE = [
  "production_cycles", "seed_lots", "seed_lot_treatments", "seed_lot_treatment_products",
  "planting_plan", "planting_actual", "planting_cv_points",
  "stand_counts", "stand_count_points",
  "crop_inputs", "crop_input_imports",
  "phenology_records",
  "ndvi_polygons", "ndvi_images", "ndvi_ai_analyses",
  "nicking_milestones", "nicking_observations",
  "inspection_imports", "inspection_data", "inspection_counting_points",
  "detasseling_records", "male_evaluation_records", "roguing_records",
  "pest_disease_records",
  "irrigation_records", "rainfall_records", "water_files", "weather_records",
  "moisture_samples",
  "yield_estimates", "yield_sample_points", "yield_ear_samples",
  "harvest_plan", "harvest_records",
  "field_visits", "field_visit_scores", "field_visit_photos",
  "attachments",
];

const ALL_TABLES = [...BACKUP_TABLES_GLOBAL, ...BACKUP_TABLES_CYCLE];

const LS_KEY = "lastBackupInfo";

function getLastBackup(): { date: string; records: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLastBackup(records: number) {
  localStorage.setItem(LS_KEY, JSON.stringify({ date: new Date().toISOString(), records }));
}

async function fetchTable(table: string, filter?: { key: string; value: string }): Promise<any[]> {
  try {
    let query = (supabase as any).from(table).select("*");
    if (filter) query = query.eq(filter.key, filter.value);
    // Try soft-delete filter
    query = query.is("deleted_at", null);
    const { data, error } = await query;
    if (error) {
      // If deleted_at column doesn't exist, retry without filter
      if (error.message?.includes("deleted_at")) {
        let q2 = (supabase as any).from(table).select("*");
        if (filter) q2 = q2.eq(filter.key, filter.value);
        const res = await q2;
        return res.data || [];
      }
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export default function BackupTab() {
  const [exporting, setExporting] = useState(false);
  const [exportingCycle, setExportingCycle] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [lastBackup, setLastBackup] = useState(getLastBackup);

  const { data: profile } = useQuery({
    queryKey: ["my-profile-backup"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await (supabase as any).from("profiles").select("org_id, organizations(name)").eq("id", user.id).single();
      return data;
    },
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles-for-backup"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("production_cycles")
        .select("id, field_name, hybrid_name, season, contract_number, clients(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const cycleLabel = (c: any) => {
    const parts = [c.contract_number || c.field_name, c.hybrid_name, c.season];
    if (c.clients?.name) parts.push(c.clients.name);
    return parts.filter(Boolean).join(" — ");
  };

  const orgName = profile?.organizations?.name || "Organizacao";

  const handleFullBackup = useCallback(async () => {
    setExporting(true);
    setProgressPct(0);
    setProgressMsg("Iniciando backup completo...");
    let totalRecords = 0;
    let tablesWithData = 0;

    try {
      const wb = XLSX.utils.book_new();
      const total = ALL_TABLES.length;

      for (let i = 0; i < total; i++) {
        const table = ALL_TABLES[i];
        setProgressMsg(`Exportando ${table}...`);
        setProgressPct(Math.round(((i + 1) / total) * 100));

        const rows = await fetchTable(table);
        if (rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
          totalRecords += rows.length;
          tablesWithData++;
        }
      }

      if (tablesWithData === 0) {
        toast.warning("Nenhum dado encontrado para exportar.");
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const safeName = orgName.replace(/[^a-zA-Z0-9_]/g, "_");
      XLSX.writeFile(wb, `Backup_CadernoDeCampo_${safeName}_${dateStr}.xlsx`);

      saveLastBackup(totalRecords);
      setLastBackup(getLastBackup());
      toast.success(`✅ Backup exportado com ${tablesWithData} tabelas e ${totalRecords} registros`);
    } catch (e: any) {
      toast.error(`Erro no backup: ${e.message}`);
    } finally {
      setExporting(false);
      setProgressPct(0);
      setProgressMsg("");
    }
  }, [orgName]);

  const handleCycleBackup = useCallback(async () => {
    if (!selectedCycle) return;
    setExportingCycle(true);
    setProgressPct(0);
    setProgressMsg("Exportando ciclo...");
    let totalRecords = 0;
    let tablesWithData = 0;

    try {
      const wb = XLSX.utils.book_new();
      const tables = BACKUP_TABLES_CYCLE;
      const total = tables.length;

      // First add the cycle itself
      const cycleRows = await fetchTable("production_cycles", { key: "id", value: selectedCycle });
      if (cycleRows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cycleRows), "production_cycles");
        totalRecords += cycleRows.length;
        tablesWithData++;
      }

      for (let i = 0; i < total; i++) {
        const table = tables[i];
        if (table === "production_cycles") continue;
        setProgressMsg(`Exportando ${table}...`);
        setProgressPct(Math.round(((i + 1) / total) * 100));

        const rows = await fetchTable(table, { key: "cycle_id", value: selectedCycle });
        if (rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31));
          totalRecords += rows.length;
          tablesWithData++;
        }
      }

      if (tablesWithData === 0) {
        toast.warning("Nenhum dado encontrado para este ciclo.");
        return;
      }

      const cycle = cycles.find((c: any) => c.id === selectedCycle);
      const label = cycle ? (cycle.contract_number || cycle.field_name || "ciclo").replace(/[^a-zA-Z0-9_]/g, "_") : "ciclo";
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      XLSX.writeFile(wb, `Export_Ciclo_${label}_${dateStr}.xlsx`);

      toast.success(`✅ Exportação concluída: ${tablesWithData} tabelas e ${totalRecords} registros`);
    } catch (e: any) {
      toast.error(`Erro na exportação: ${e.message}`);
    } finally {
      setExportingCycle(false);
      setProgressPct(0);
      setProgressMsg("");
    }
  }, [selectedCycle, cycles]);

  const fmtBackupDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="space-y-6">
      {/* Last backup status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {lastBackup ? (
              <div>
                <p className="text-sm font-medium">
                  Último backup: {fmtBackupDate(lastBackup.date)} — {lastBackup.records.toLocaleString("pt-BR")} registros
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-destructive">
                ⚠️ Nenhum backup realizado. Exporte agora!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full backup */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-5 w-5" /> 💾 Exportar Backup Completo
          </CardTitle>
          <CardDescription>
            Baixa todos os dados do sistema em um arquivo Excel — uma aba por tabela ({ALL_TABLES.length} tabelas).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(exporting || exportingCycle) && progressMsg && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{progressMsg}</p>
              <Progress value={progressPct} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
            </div>
          )}
          <Button size="lg" onClick={handleFullBackup} disabled={exporting || exportingCycle}>
            {exporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> 💾 Exportar Backup Completo</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Per-cycle export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> 📊 Exportar Ciclo Específico
          </CardTitle>
          <CardDescription>
            Exporta apenas os dados de um ciclo selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Ciclo</Label>
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="max-w-xl">
                <SelectValue placeholder="Selecione um ciclo..." />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{cycleLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleCycleBackup} disabled={!selectedCycle || exporting || exportingCycle}>
            {exportingCycle ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> 📊 Exportar Ciclo Específico</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Backup warning */}
      <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-700">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="space-y-2">
          <p className="font-semibold">⚠️ Backup automático não disponível</p>
          <p className="text-sm">
            Recomendamos exportar semanalmente para garantir a segurança dos seus dados.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
