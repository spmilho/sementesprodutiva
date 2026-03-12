import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, CloudRain, Waves, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import type { IrrigationRecord, RainfallRecord } from "./types";

interface Props {
  irrigationRecords: IrrigationRecord[];
  rainfallRecords: RainfallRecord[];
  fileCount: number;
}

export default function WaterDashboard({ irrigationRecords, rainfallRecords, fileCount }: Props) {
  const totalIrrigation = useMemo(() =>
    irrigationRecords.reduce((s, r) => s + Number(r.depth_mm), 0), [irrigationRecords]);
  const totalRainfall = useMemo(() =>
    rainfallRecords.reduce((s, r) => s + Number(r.precipitation_mm), 0), [rainfallRecords]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; irrigation: number; rainfall: number }>();
    irrigationRecords.forEach(r => {
      const d = r.start_date;
      const existing = map.get(d) || { date: d, irrigation: 0, rainfall: 0 };
      existing.irrigation += Number(r.depth_mm);
      map.set(d, existing);
    });
    rainfallRecords.forEach(r => {
      const d = r.record_date;
      const existing = map.get(d) || { date: d, irrigation: 0, rainfall: 0 };
      existing.rainfall += Number(r.precipitation_mm);
      map.set(d, existing);
    });
    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    let acc = 0;
    return sorted.map(item => {
      acc += item.irrigation + item.rainfall;
      return { ...item, accumulated: Math.round(acc * 10) / 10, dateLabel: new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
    });
  }, [irrigationRecords, rainfallRecords]);

  const hasData = totalIrrigation > 0 || totalRainfall > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Droplets className="h-8 w-8 text-blue-500" />
          <div><p className="text-xs text-muted-foreground">Total Irrigação</p><p className="text-lg font-bold">{totalIrrigation.toFixed(1)} mm</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CloudRain className="h-8 w-8 text-blue-800" />
          <div><p className="text-xs text-muted-foreground">Total Chuva</p><p className="text-lg font-bold">{totalRainfall.toFixed(1)} mm</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Waves className="h-8 w-8 text-cyan-600" />
          <div><p className="text-xs text-muted-foreground">Total Água</p><p className="text-lg font-bold">{(totalIrrigation + totalRainfall).toFixed(1)} mm</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <div><p className="text-xs text-muted-foreground">Arquivos</p><p className="text-lg font-bold">{fileCount}</p></div>
        </CardContent></Card>
      </div>

      {hasData && chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm">Irrigação + Chuva — Consolidado</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "mm", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "Acumulado", angle: 90, position: "insideRight", style: { fontSize: 10 } }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="rainfall" name="Chuva" fill="hsl(var(--primary))" stackId="a" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="irrigation" name="Irrigação" fill="hsl(var(--accent))" stackId="a" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="accumulated" name="Acumulado" stroke="hsl(var(--destructive))" strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
