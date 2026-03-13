import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const WEATHER_COLUMN_OPTIONS = [
  { value: "", label: "— Ignorar —" },
  { value: "date", label: "Data" },
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

const KNOWN_WEATHER_HEADERS: Record<string, string> = {
  "data": "date",
  "date": "date",
  "temp max": "temp_max_c",
  "temp. max": "temp_max_c",
  "temp máx": "temp_max_c",
  "temp. máx": "temp_max_c",
  "temperatura máxima": "temp_max_c",
  "tmax": "temp_max_c",
  "temp min": "temp_min_c",
  "temp. min": "temp_min_c",
  "temp mín": "temp_min_c",
  "temp. mín": "temp_min_c",
  "temperatura mínima": "temp_min_c",
  "tmin": "temp_min_c",
  "temp med": "temp_avg_c",
  "temp. med": "temp_avg_c",
  "temp média": "temp_avg_c",
  "temp. média": "temp_avg_c",
  "temperatura média": "temp_avg_c",
  "tmed": "temp_avg_c",
  "umidade max": "humidity_max_pct",
  "umidade máx": "humidity_max_pct",
  "ur max": "humidity_max_pct",
  "ur máx": "humidity_max_pct",
  "umidade min": "humidity_min_pct",
  "umidade mín": "humidity_min_pct",
  "ur min": "humidity_min_pct",
  "ur mín": "humidity_min_pct",
  "umidade med": "humidity_avg_pct",
  "umidade média": "humidity_avg_pct",
  "ur med": "humidity_avg_pct",
  "ur média": "humidity_avg_pct",
  "vento max": "wind_max_kmh",
  "vento máx": "wind_max_kmh",
  "vel. vento máx": "wind_max_kmh",
  "vento med": "wind_avg_kmh",
  "vento médio": "wind_avg_kmh",
  "vel. vento": "wind_avg_kmh",
  "radiação": "radiation_mj",
  "radiacao": "radiation_mj",
  "rad solar": "radiation_mj",
  "eto": "eto_mm",
  "et0": "eto_mm",
  "evapotranspiração": "eto_mm",
  "precipitação": "precipitation_mm",
  "precipitacao": "precipitation_mm",
  "chuva": "precipitation_mm",
  "precip": "precipitation_mm",
};

interface Props {
  open: boolean;
  onClose: () => void;
  headers: string[];
  rawData: any[][];
  onImport: (records: Record<string, any>[]) => Promise<void>;
  importing: boolean;
}

export default function WeatherImportDialog({ open, onClose, headers, rawData, onImport, importing }: Props) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const auto: Record<string, string> = {};
    headers.forEach((h) => {
      const normalized = h.toLowerCase().trim();
      if (KNOWN_WEATHER_HEADERS[normalized]) {
        auto[h] = KNOWN_WEATHER_HEADERS[normalized];
      }
    });
    return auto;
  });

  const hasDate = Object.values(mappings).includes("date");
  const hasSomeData = Object.values(mappings).some(v => v && v !== "date");

  const previewRows = useMemo(() => rawData.slice(0, 5), [rawData]);

  const parseDate = (val: any): string | null => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split("T")[0];
    const str = String(val).trim();
    // Try dd/mm/yyyy or dd-mm-yyyy
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3 && parts[0].length <= 2) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    // Try yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return null;
  };

  const handleImport = async () => {
    const records: Record<string, any>[] = [];
    for (const row of rawData) {
      const rec: Record<string, any> = {};
      headers.forEach((h, i) => {
        const field = mappings[h];
        if (!field) return;
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
    await onImport(records);
  };

  return (
    <Dialog open={open} onOpenChange={() => !importing && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Importar Dados Meteorológicos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Mapeie as colunas da planilha para os campos meteorológicos:</p>

          <ScrollArea className="max-h-[200px]">
            <div className="grid grid-cols-2 gap-2">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate w-32" title={h}>{h}</span>
                  <Select value={mappings[h] || ""} onValueChange={(v) => setMappings(prev => ({ ...prev, [h]: v }))}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder="Ignorar" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEATHER_COLUMN_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Preview table */}
          <ScrollArea className="max-h-[200px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="border p-1 bg-muted text-left truncate max-w-[100px]" title={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((h, ci) => (
                      <td key={ci} className="border p-1 truncate max-w-[100px]">{row[ci] != null ? String(row[ci]) : ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>

          <p className="text-xs text-muted-foreground">{rawData.length} linhas encontradas</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!hasDate || !hasSomeData || importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Importar {rawData.length} registros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
