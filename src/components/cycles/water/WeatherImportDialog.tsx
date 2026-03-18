import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RotateCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { parseSpreadsheetDate } from "./weatherDateUtils";

const WEATHER_FIELD_OPTIONS = [
  { value: "ignore", label: "— Ignorar —" },
  { value: "temp_max_c", label: "Temp. Máx (°C)" },
  { value: "temp_min_c", label: "Temp. Mín (°C)" },
  { value: "temp_avg_c", label: "Temp. Média (°C)" },
  { value: "humidity_max_pct", label: "Umidade Máx (%)" },
  { value: "humidity_min_pct", label: "Umidade Mín (%)" },
  { value: "humidity_avg_pct", label: "Umidade Média (%)" },
  { value: "wind_max_kmh", label: "Vento Máx (km/h)" },
  { value: "wind_avg_kmh", label: "Vento Médio (km/h)" },
  { value: "radiation_mj", label: "Radiação (MJ)" },
  { value: "eto_mm", label: "ETo (mm)" },
  { value: "precipitation_mm", label: "Precipitação (mm)" },
];

const COLUMN_FIELD_OPTIONS = [
  { value: "ignore", label: "— Ignorar —" },
  { value: "date", label: "Data" },
  ...WEATHER_FIELD_OPTIONS.slice(1),
];

const ROW_LABEL_MAP: Record<string, string> = {
  "temp max": "temp_max_c", "temp. max": "temp_max_c", "temp máx": "temp_max_c",
  "temp. máx": "temp_max_c", "temperatura máxima": "temp_max_c", "tmax": "temp_max_c",
  "temp min": "temp_min_c", "temp. min": "temp_min_c", "temp mín": "temp_min_c",
  "temp. mín": "temp_min_c", "temperatura mínima": "temp_min_c", "tmin": "temp_min_c",
  "temp med": "temp_avg_c", "temp. med": "temp_avg_c", "temp média": "temp_avg_c",
  "temp. média": "temp_avg_c", "temperatura média": "temp_avg_c", "tmed": "temp_avg_c",
  "umidade max": "humidity_max_pct", "umidade máx": "humidity_max_pct",
  "ur max": "humidity_max_pct", "ur máx": "humidity_max_pct",
  "umidade min": "humidity_min_pct", "umidade mín": "humidity_min_pct",
  "ur min": "humidity_min_pct", "ur mín": "humidity_min_pct",
  "umidade med": "humidity_avg_pct", "umidade média": "humidity_avg_pct",
  "ur med": "humidity_avg_pct", "ur média": "humidity_avg_pct",
  "umidade": "humidity_avg_pct", "ur": "humidity_avg_pct",
  "vento max": "wind_max_kmh", "vento máx": "wind_max_kmh",
  "vento med": "wind_avg_kmh", "vento médio": "wind_avg_kmh", "vel. vento": "wind_avg_kmh",
  "radiação": "radiation_mj", "radiacao": "radiation_mj", "rad solar": "radiation_mj",
  "eto": "eto_mm", "et0": "eto_mm", "evapotranspiração": "eto_mm",
  "precipitação": "precipitation_mm", "precipitacao": "precipitation_mm",
  "chuva": "precipitation_mm", "precip": "precipitation_mm",
};

const COLUMN_HEADER_MAP: Record<string, string> = {
  data: "date",
  date: "date",
  ...ROW_LABEL_MAP,
};

interface Props {
  open: boolean;
  onClose: () => void;
  headers: string[];
  rawData: any[][];
  onImport: (records: Record<string, any>[]) => Promise<void>;
  importing: boolean;
}

function isDateLike(val: unknown): boolean {
  return parseSpreadsheetDate(val) !== null;
}

function detectTransposed(headers: string[], _rawData: any[][]): boolean {
  const dateCount = headers.filter((header) => isDateLike(header)).length;
  return dateCount >= Math.max(2, headers.length * 0.5);
}

export default function WeatherImportDialog({ open, onClose, headers, rawData, onImport, importing }: Props) {
  const isTransposed = useMemo(() => detectTransposed(headers, rawData), [headers, rawData]);

  // For transposed: each row = a weather variable, each column header = a date
  // For normal: each column = a field, each row = a date record

  // TRANSPOSED MODE: map rows to weather fields
  const [rowMappings, setRowMappings] = useState<Record<number, string>>(() => {
    if (!isTransposed) return {};
    const auto: Record<number, string> = {};
    // Try to auto-detect from first cell of each row (if it's a label)
    rawData.forEach((row, ri) => {
      const firstCell = String(row[0] ?? "").toLowerCase().trim();
      if (ROW_LABEL_MAP[firstCell]) {
        auto[ri] = ROW_LABEL_MAP[firstCell];
      }
    });
    return auto;
  });

  // NORMAL MODE: map columns to fields
  const [colMappings, setColMappings] = useState<Record<string, string>>(() => {
    if (isTransposed) return {};
    const auto: Record<string, string> = {};
    headers.forEach(h => {
      const norm = h.toLowerCase().trim();
      if (COLUMN_HEADER_MAP[norm]) auto[h] = COLUMN_HEADER_MAP[norm];
    });
    return auto;
  });

  // Get row preview labels (first few values)
  const rowLabels = useMemo(() => {
    return rawData.map((row, i) => {
      const vals = row.slice(0, 3).map((v: any) => v != null ? String(v) : "").filter(Boolean);
      return `Linha ${i + 1}: ${vals.join(", ")}`;
    });
  }, [rawData]);

  // Parse dates from headers for transposed mode
  const columnDates = useMemo(() => {
    if (!isTransposed) return [];
    return headers.map(h => parseDate(h)).filter(Boolean) as string[];
  }, [headers, isTransposed]);

  const canImport = isTransposed
    ? columnDates.length > 0 && Object.values(rowMappings).some(v => v && v !== "ignore")
    : Object.values(colMappings).includes("date") && Object.values(colMappings).some(v => v && v !== "date" && v !== "ignore");

  const handleImport = async () => {
    const records: Record<string, any>[] = [];

    if (isTransposed) {
      // Each column = a date, each row = a variable
      for (let ci = 0; ci < headers.length; ci++) {
        const date = parseDate(headers[ci]);
        if (!date) continue;
        const rec: Record<string, any> = { record_date: date };
        let hasData = false;
        rawData.forEach((row, ri) => {
          const field = rowMappings[ri];
          if (!field || field === "ignore") return;
          const val = Number(row[ci]);
          if (!isNaN(val)) {
            rec[field] = val;
            hasData = true;
          }
        });
        if (hasData) records.push(rec);
      }
    } else {
      // Normal: each row = a record
      for (const row of rawData) {
        const rec: Record<string, any> = {};
        headers.forEach((h, i) => {
          const field = colMappings[h];
          if (!field || field === "ignore") return;
          const val = row[i];
          if (field === "date") {
            rec.record_date = parseDate(val);
          } else {
            const num = Number(val);
            if (!isNaN(num)) rec[field] = num;
          }
        });
        if (rec.record_date) records.push(rec);
      }
    }

    if (records.length === 0) {
      return;
    }
    await onImport(records);
  };

  const recordCount = isTransposed ? columnDates.length : rawData.length;

  return (
    <Dialog open={open} onOpenChange={() => !importing && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Importar Dados Meteorológicos
            {isTransposed && (
              <Badge variant="secondary" className="text-[10px]">
                <RotateCw className="h-3 w-3 mr-1" /> Formato transposto detectado
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {isTransposed ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Detectamos que as <strong>datas estão nas colunas</strong> ({columnDates.length} datas encontradas).
                  Mapeie cada linha ao campo correspondente:
                </p>

                <div className="space-y-2">
                  {rawData.map((row, ri) => {
                    const preview = row.slice(0, 4).map((v: any) =>
                      v != null ? (typeof v === "number" ? Number(v).toFixed(2) : String(v)) : ""
                    ).filter(Boolean).join(" | ");
                    return (
                      <div key={ri} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-8 shrink-0">L{ri + 1}</span>
                        <span className="text-xs font-mono truncate w-48 bg-muted px-2 py-1 rounded" title={preview}>
                          {preview}
                        </span>
                        <Select
                          value={rowMappings[ri] || "ignore"}
                          onValueChange={(v) => setRowMappings(prev => ({ ...prev, [ri]: v }))}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEATHER_FIELD_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

                {/* Preview dates */}
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Datas detectadas:</p>
                  <p className="font-mono">{columnDates.slice(0, 10).join(", ")}{columnDates.length > 10 ? ` ... (+${columnDates.length - 10})` : ""}</p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Mapeie as colunas da planilha para os campos meteorológicos:</p>

                <div className="grid grid-cols-2 gap-2">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate w-32" title={h}>{h}</span>
                      <Select
                        value={colMappings[h] || "ignore"}
                        onValueChange={(v) => setColMappings(prev => ({ ...prev, [h]: v }))}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLUMN_FIELD_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {/* Preview table */}
                <ScrollArea className="max-h-[150px]">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="border p-1 bg-muted text-left truncate max-w-[100px]" title={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawData.slice(0, 5).map((row, ri) => (
                        <tr key={ri}>
                          {headers.map((_, ci) => (
                            <td key={ci} className="border p-1 truncate max-w-[100px]">{row[ci] != null ? String(row[ci]) : ""}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </>
            )}

            <p className="text-xs text-muted-foreground">{recordCount} registros serão importados</p>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!canImport || importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Importar {recordCount} registros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
