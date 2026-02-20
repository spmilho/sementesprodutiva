import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ExportTable {
  key: string;
  label: string;
  table: string;
  fk?: string; // foreign key field pointing to cycle
}

const EXPORT_TABLES: ExportTable[] = [
  { key: "planting_plan", label: "Planejamento de Plantio", table: "planting_plan", fk: "cycle_id" },
  { key: "planting_actual", label: "Plantio Realizado", table: "planting_actual", fk: "cycle_id" },
  { key: "planting_cv_points", label: "Pontos CV% do Plantio", table: "planting_cv_points", fk: "cycle_id" },
  { key: "pivot_glebas", label: "Glebas", table: "pivot_glebas", fk: "cycle_id" },
  { key: "seed_lots", label: "Semente Básica (Lotes)", table: "seed_lots", fk: "cycle_id" },
  { key: "seed_lot_treatments", label: "Tratamento de Sementes por Lote", table: "seed_lot_treatments", fk: "cycle_id" },
  { key: "fertilization_records", label: "Nutrição / Adubação", table: "fertilization_records", fk: "cycle_id" },
  { key: "phenology_records", label: "Fenologia", table: "phenology_records", fk: "cycle_id" },
  { key: "emergence_counts", label: "Emergência", table: "emergence_counts", fk: "cycle_id" },
  { key: "nicking", label: "Nicking (Pontos + Observações)", table: "nicking_fixed_points", fk: "cycle_id" },
  { key: "inspection_imports", label: "Inspeções Importadas", table: "inspection_imports", fk: "cycle_id" },
  { key: "detasseling_records", label: "Despendoamento", table: "detasseling_records", fk: "cycle_id" },
  { key: "roguing_records", label: "Roguing", table: "roguing_records", fk: "cycle_id" },
  { key: "chemical_applications", label: "Manejo Químico", table: "chemical_applications", fk: "cycle_id" },
  { key: "pest_disease_records", label: "Pragas e Doenças", table: "pest_disease_records", fk: "cycle_id" },
  { key: "moisture_samples", label: "Umidade de Grãos", table: "moisture_samples", fk: "cycle_id" },
  { key: "yield_estimates", label: "Estimativa de Produtividade", table: "yield_estimates", fk: "cycle_id" },
  { key: "harvest_plan", label: "Planejamento de Colheita", table: "harvest_plan", fk: "cycle_id" },
  { key: "harvest_records", label: "Colheita Realizada", table: "harvest_records", fk: "cycle_id" },
  { key: "stand_counts", label: "Stand Count", table: "stand_counts", fk: "cycle_id" },
];

export default function ExportDataTab() {
  const [selectedCycle, setSelectedCycle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles-for-export"],
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

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(EXPORT_TABLES.map((t) => t.key)));
  const deselectAll = () => setSelected(new Set());

  const fetchData = useCallback(async () => {
    const results: Record<string, any[]> = {};
    for (const t of EXPORT_TABLES.filter((t) => selected.has(t.key))) {
      const { data, error } = await (supabase as any)
        .from(t.table)
        .select("*")
        .eq(t.fk || "cycle_id", selectedCycle)
        .is("deleted_at", null);
      if (!error && data) results[t.label] = data;
    }

    // Also fetch nicking observations if nicking is selected
    if (selected.has("nicking")) {
      const { data } = await (supabase as any)
        .from("nicking_observations")
        .select("*")
        .eq("cycle_id", selectedCycle)
        .is("deleted_at", null);
      if (data) results["Nicking — Observações"] = data;
    }

    return results;
  }, [selected, selectedCycle]);

  const exportExcel = async () => {
    if (!selectedCycle || selected.size === 0) return;
    setExporting(true);
    try {
      const data = await fetchData();
      const wb = XLSX.utils.book_new();
      for (const [sheetName, rows] of Object.entries(data)) {
        if (rows.length === 0) continue;
        const ws = XLSX.utils.json_to_sheet(rows);
        // Truncate sheet name to 31 chars (Excel limit)
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      }
      XLSX.writeFile(wb, `export_ciclo.xlsx`);
      toast.success("Excel exportado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    if (!selectedCycle || selected.size === 0) return;
    setExporting(true);
    try {
      const data = await fetchData();
      // Generate individual CSVs and download them
      for (const [name, rows] of Object.entries(data)) {
        if (rows.length === 0) continue;
        const ws = XLSX.utils.json_to_sheet(rows);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("CSVs exportados!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Selecionar Ciclo</Label>
        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
          <SelectTrigger className="max-w-xl"><SelectValue placeholder="Selecione um ciclo..." /></SelectTrigger>
          <SelectContent>
            {cycles.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{cycleLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCycle && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Tabelas para exportar</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-3.5 w-3.5 mr-1" /> Selecionar Todos
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                <Square className="h-3.5 w-3.5 mr-1" /> Desmarcar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
              {EXPORT_TABLES.map((t) => (
                <label key={t.key} className="flex items-center gap-2 cursor-pointer text-sm py-1 px-2 rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selected.has(t.key)}
                    onCheckedChange={() => toggle(t.key)}
                  />
                  {t.label}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={exportCSV} disabled={exporting || selected.size === 0} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "Exportar CSV"}
              </Button>
              <Button onClick={exportExcel} disabled={exporting || selected.size === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {exporting ? "Exportando..." : "Exportar Excel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
