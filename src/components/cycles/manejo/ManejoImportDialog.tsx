import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  KNOWN_HEADERS, COLUMN_MAPPING_OPTIONS, GROUP_CATEGORY_MAP,
  INPUT_TYPE_CONFIG, STATUS_CONFIG, classifyGroupCategory, parseStatusFromSheet,
} from "./types";
import type { CropInput } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  rawData: any[][];
  headers: string[];
  onImport: (records: Partial<CropInput>[], skipSeeds: boolean) => void;
  importing: boolean;
}

export default function ManejoImportDialog({ open, onClose, rawData, headers, onImport, importing }: Props) {
  const [skipSeeds, setSkipSeeds] = useState(true);

  // Auto-detect column mapping
  const [columnMap, setColumnMap] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    headers.forEach((h, i) => {
      const key = h.toLowerCase().trim();
      if (KNOWN_HEADERS[key]) {
        map[i] = KNOWN_HEADERS[key];
      }
    });
    return map;
  });

  const parsedRecords = useMemo(() => {
    const records: Partial<CropInput>[] = [];
    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r];
      const rec: any = { source: "imported" };
      for (const [colIdx, field] of Object.entries(columnMap)) {
        if (field === "ignore") continue;
        const val = row[Number(colIdx)];
        if (val === undefined || val === null || val === "") continue;

        if (field === "status") {
          rec.status = parseStatusFromSheet(String(val));
        } else if (field === "group_category") {
          rec.group_category = String(val).trim();
          rec.input_type = classifyGroupCategory(String(val));
        } else if (field === "qty_recommended" || field === "qty_applied" || field === "dose_per_ha") {
          rec[field] = typeof val === "number" ? val : parseFloat(String(val).replace(",", ".")) || null;
        } else if (field === "recommendation_date" || field === "execution_date") {
          // Handle Excel serial dates or string dates
          if (typeof val === "number") {
            const d = new Date((val - 25569) * 86400 * 1000);
            rec[field] = d.toISOString().split("T")[0];
          } else {
            const str = String(val).trim();
            // Try dd/mm/yyyy or dd-mm-yyyy
            const parts = str.split(/[\/\-]/);
            if (parts.length === 3 && parts[0].length <= 2) {
              rec[field] = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
            } else {
              rec[field] = str;
            }
          }
        } else {
          rec[field] = String(val).trim();
        }
      }
      if (rec.product_name) {
        if (!rec.input_type) rec.input_type = "other";
        if (!rec.status) rec.status = "recommended";
        records.push(rec);
      }
    }
    return records;
  }, [rawData, columnMap]);

  const filteredRecords = useMemo(() => {
    if (skipSeeds) return parsedRecords.filter(r => r.input_type !== "seed");
    return parsedRecords;
  }, [parsedRecords, skipSeeds]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const t = r.input_type || "other";
      byType[t] = (byType[t] || 0) + 1;
    });
    return byType;
  }, [filteredRecords]);

  const unmappedCols = headers.filter((_, i) => !columnMap[i]);
  const allMapped = Object.keys(columnMap).length > 0;

  return (
    <Dialog open={open} onOpenChange={() => !importing && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Planilha de Insumos</DialogTitle>
        </DialogHeader>

        {/* Column mapping */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Mapeamento de colunas</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-auto">
            {headers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs truncate max-w-[120px]" title={h}>{h}</span>
                <Select value={columnMap[i] || ""} onValueChange={v => setColumnMap(prev => ({ ...prev, [i]: v }))}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {COLUMN_MAPPING_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={skipSeeds} onCheckedChange={(v) => setSkipSeeds(!!v)} id="skip-seeds" />
            <label htmlFor="skip-seeds" className="text-sm">Descartar sementes (SMT)</label>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredRecords.length} registros: {Object.entries(counts).map(([t, n]) => {
              const cfg = INPUT_TYPE_CONFIG[t];
              return `${n} ${cfg?.label || t}`;
            }).join(", ")}
          </p>
        </div>

        <ScrollArea className="flex-1 max-h-[40vh] border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Produto</TableHead>
                <TableHead className="text-xs">IA</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Dose/ha</TableHead>
                <TableHead className="text-xs">Unid</TableHead>
                <TableHead className="text-xs">Data Exec.</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.slice(0, 30).map((r, i) => {
                const typeCfg = INPUT_TYPE_CONFIG[r.input_type || "other"];
                const statusCfg = STATUS_CONFIG[r.status || "recommended"];
                return (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{r.product_name}</TableCell>
                    <TableCell className="text-xs">{r.active_ingredient || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${typeCfg?.bgClass} ${typeCfg?.colorClass}`}>
                        {typeCfg?.icon} {typeCfg?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.dose_per_ha ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.unit || "—"}</TableCell>
                    <TableCell className="text-xs">{r.execution_date || r.recommendation_date || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusCfg?.bgClass} ${statusCfg?.colorClass}`}>
                        {statusCfg?.icon} {statusCfg?.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filteredRecords.length > 30 && (
            <p className="text-xs text-muted-foreground p-2">Mostrando 30 de {filteredRecords.length} registros...</p>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancelar</Button>
          <Button onClick={() => onImport(filteredRecords, skipSeeds)} disabled={importing || filteredRecords.length === 0}>
            {importing ? "Importando..." : `Importar ${filteredRecords.length} registros`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
