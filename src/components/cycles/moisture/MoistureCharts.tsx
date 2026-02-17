import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea, ResponsiveContainer, Bar, BarChart, Cell,
} from "recharts";
import { MoistureSample, PivotGleba, GLEBA_COLORS } from "./types";

interface Props {
  samples: MoistureSample[];
  glebas: PivotGleba[];
  target: number;
  hasGlebas: boolean;
}

export default function MoistureCharts({ samples, glebas, target, hasGlebas }: Props) {
  // Evolution chart data
  const evolutionData = useMemo(() => {
    const dateMap = new Map<string, Map<string, number[]>>();
    samples.forEach((s) => {
      const key = s.gleba_id || "__general__";
      if (!dateMap.has(s.sample_date)) dateMap.set(s.sample_date, new Map());
      const glebaMap = dateMap.get(s.sample_date)!;
      if (!glebaMap.has(key)) glebaMap.set(key, []);
      glebaMap.get(key)!.push(Number(s.moisture_pct));
    });

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, glebaMap]) => {
        const row: any = { date: new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
        glebaMap.forEach((vals, glebaKey) => {
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          row[glebaKey] = parseFloat(avg.toFixed(1));
        });
        return row;
      });
  }, [samples]);

  const glebaKeys = useMemo(() => {
    if (!hasGlebas) return ["__general__"];
    return glebas.map((g) => g.id);
  }, [glebas, hasGlebas]);

  const glebaNameMap = useMemo(() => {
    const m: Record<string, string> = { __general__: "Geral" };
    glebas.forEach((g) => (m[g.id] = g.name));
    return m;
  }, [glebas]);

  // Distribution chart (per gleba: min, avg, max)
  const distData = useMemo(() => {
    const grouped = new Map<string, number[]>();
    samples.forEach((s) => {
      const key = s.gleba_id || "__general__";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(Number(s.moisture_pct));
    });

    return Array.from(grouped.entries()).map(([key, vals]) => ({
      name: glebaNameMap[key] ?? "Geral",
      min: Math.min(...vals),
      avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
      max: Math.max(...vals),
    }));
  }, [samples, glebaNameMap]);

  if (samples.length === 0) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução da Umidade {hasGlebas ? "por Gleba" : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <ReferenceArea y1={target - 2} y2={target} fill="#4CAF50" fillOpacity={0.1} />
              <ReferenceLine y={target} stroke="#EF4444" strokeDasharray="5 5" label={{ value: `Alvo ${target}%`, fontSize: 10 }} />
              {glebaKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={GLEBA_COLORS[i % GLEBA_COLORS.length]}
                  strokeWidth={2}
                  name={glebaNameMap[key] ?? "Geral"}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {distData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Gleba</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={target} stroke="#EF4444" strokeDasharray="5 5" />
                <Bar dataKey="min" fill="#4CAF50" name="Mínimo" opacity={0.6} />
                <Bar dataKey="avg" fill="#1E88E5" name="Média" />
                <Bar dataKey="max" fill="#FF9800" name="Máximo" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
