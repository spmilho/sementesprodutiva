import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, AreaChart, Area, LineChart } from "recharts";
import { COLUMN_MAPPING_OPTIONS, type ParsedExcelData } from "./types";

interface Props {
  data: ParsedExcelData;
  onMappingConfirm: (mappings: Record<string, string>) => void;
  showMappingStep?: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ExcelPreview({ data, onMappingConfirm, showMappingStep = true }: Props) {
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const auto: Record<string, string> = {};
    data.headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes("data") || lower.includes("date")) auto[h] = "date";
      else if (lower.includes("lâmina") || lower.includes("lamina") || lower.includes("irrigaç") || lower.includes("irrigac")) auto[h] = "irrigation_mm";
      else if (lower.includes("precipit") || lower.includes("chuva") || lower.includes("rain")) auto[h] = "precipitation_mm";
      else if (lower.includes("eto") || lower.includes("evapotrans")) auto[h] = "eto_mm";
      else if (lower.includes("temp")) auto[h] = "temperature_c";
      else if (lower.includes("umid") || lower.includes("humid")) auto[h] = "humidity_pct";
      else if (lower.includes("vento") || lower.includes("wind")) auto[h] = "wind_kmh";
      else if (lower.includes("tempo") || lower.includes("duração") || lower.includes("duracao") || lower.includes("hora")) auto[h] = "duration_h";
    });
    return data.columnMappings || auto;
  });
  const [confirmed, setConfirmed] = useState(!showMappingStep);
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  const dateCol = Object.keys(mappings).find(k => mappings[k] === "date");
  const numericCols = useMemo(() => {
    return data.headers.filter(h => {
      const m = mappings[h];
      return m && m !== "date" && m !== "";
    });
  }, [mappings, data.headers]);

  const allNumericCols = useMemo(() =>
    data.headers.filter(h => data.rows.some(r => typeof r[h] === "number" || (!isNaN(Number(r[h])) && r[h] !== null && r[h] !== ""))),
    [data]);

  const charts = useMemo(() => {
    if (!dateCol) return null;
    const hasIrrigation = numericCols.some(c => mappings[c] === "irrigation_mm");
    const hasRainfall = numericCols.some(c => mappings[c] === "precipitation_mm");
    const hasEto = numericCols.some(c => mappings[c] === "eto_mm");
    const hasTemp = numericCols.some(c => mappings[c] === "temperature_c");

    const chartData = data.rows.map(r => {
      const entry: any = { date: String(r[dateCol] ?? "") };
      numericCols.forEach(c => { entry[mappings[c]] = Number(r[c]) || 0; });
      return entry;
    }).filter(r => r.date);

    // Format dates
    chartData.forEach(r => {
      try {
        const d = new Date(r.date);
        if (!isNaN(d.getTime())) r.dateLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        else r.dateLabel = r.date;
      } catch { r.dateLabel = r.date; }
    });

    const result: JSX.Element[] = [];

    if (hasIrrigation && hasRainfall) {
      let acc = 0;
      const combined = chartData.map(r => { acc += (r.irrigation_mm || 0) + (r.precipitation_mm || 0); return { ...r, acc: Math.round(acc * 10) / 10 }; });
      result.push(
        <Card key="combined"><CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Irrigação + Chuva</h4>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 9 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="l" dataKey="precipitation_mm" name="Chuva (mm)" fill="#1e40af" stackId="a" />
              <Bar yAxisId="l" dataKey="irrigation_mm" name="Irrigação (mm)" fill="#60a5fa" stackId="a" />
              <Line yAxisId="r" dataKey="acc" name="Acumulado" stroke="#dc2626" strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent></Card>
      );
    } else {
      if (hasIrrigation) {
        result.push(
          <Card key="irr"><CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2">Irrigação por dia</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip /><Bar dataKey="irrigation_mm" name="Irrigação (mm)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        );
      }
      if (hasRainfall) {
        result.push(
          <Card key="rain"><CardContent className="p-4">
            <h4 className="font-semibold text-sm mb-2">Precipitação por dia</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip /><Bar dataKey="precipitation_mm" name="Chuva (mm)" fill="#1e40af" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        );
      }
    }

    if (hasEto) {
      result.push(
        <Card key="eto"><CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Evapotranspiração</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip />
              <Line dataKey="eto_mm" name="ETo (mm)" stroke="#dc2626" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      );
    }

    if (hasTemp) {
      result.push(
        <Card key="temp"><CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Temperatura</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip />
              <Area dataKey="temperature_c" name="Temp (°C)" fill="#f59e0b" stroke="#d97706" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent></Card>
      );
    }

    // Generic chart if no specific mappings
    if (result.length === 0 && allNumericCols.length > 0) {
      const genericData = data.rows.map(r => {
        const entry: any = { date: String(r[dateCol] ?? "") };
        try { const d = new Date(entry.date); if (!isNaN(d.getTime())) entry.dateLabel = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); else entry.dateLabel = entry.date; } catch { entry.dateLabel = entry.date; }
        allNumericCols.forEach(c => { entry[c] = Number(r[c]) || 0; });
        return entry;
      });
      result.push(
        <Card key="generic"><CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-2">Dados do Arquivo</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={genericData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 9 }} /><Tooltip /><Legend />
              {allNumericCols.map((c, i) => <Line key={c} dataKey={c} stroke={COLORS[i % COLORS.length]} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      );
    }

    return result;
  }, [dateCol, numericCols, data, mappings, allNumericCols]);

  // Stats
  const stats = useMemo(() => {
    const result: Record<string, { sum: number; avg: number; min: number; max: number; count: number }> = {};
    allNumericCols.forEach(col => {
      const vals = data.rows.map(r => Number(r[col])).filter(v => !isNaN(v));
      if (vals.length > 0) {
        result[col] = {
          sum: vals.reduce((a, b) => a + b, 0),
          avg: vals.reduce((a, b) => a + b, 0) / vals.length,
          min: Math.min(...vals),
          max: Math.max(...vals),
          count: vals.length,
        };
      }
    });
    return result;
  }, [data, allNumericCols]);

  const totalPages = Math.ceil(data.rows.length / rowsPerPage);
  const pageRows = data.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <div className="space-y-4">
      {showMappingStep && !confirmed && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Mapear Colunas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Identifique o conteúdo de cada coluna para gerar gráficos automaticamente.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.headers.map(h => (
                <div key={h} className="space-y-1">
                  <label className="text-xs font-medium truncate block">{h}</label>
                  <Select value={mappings[h] || "ignore"} onValueChange={v => setMappings(prev => ({ ...prev, [h]: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ignorar" /></SelectTrigger>
                    <SelectContent>{COLUMN_MAPPING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Button size="sm" onClick={() => { setConfirmed(true); onMappingConfirm(mappings); }}>Confirmar Mapeamento</Button>
          </CardContent>
        </Card>
      )}

      {(confirmed || !showMappingStep) && charts && charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{charts}</div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Dados ({data.rows.length} linhas)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {data.headers.map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, i) => (
                  <TableRow key={i}>
                    {data.headers.map(h => <TableCell key={h} className="text-xs py-1">{row[h] != null ? String(row[h]) : ""}</TableCell>)}
                  </TableRow>
                ))}
                {Object.keys(stats).length > 0 && (
                  <>
                    <TableRow className="bg-muted/50 font-medium">
                      {data.headers.map(h => <TableCell key={h} className="text-xs py-1">{stats[h] ? `Σ ${stats[h].sum.toFixed(1)}` : ""}</TableCell>)}
                    </TableRow>
                    <TableRow className="bg-muted/30">
                      {data.headers.map(h => <TableCell key={h} className="text-xs py-1">{stats[h] ? `μ ${stats[h].avg.toFixed(1)}` : ""}</TableCell>)}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <span className="text-xs text-muted-foreground">{page + 1}/{totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
