import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { CropInput, INPUT_TYPE_CONFIG } from "./types";
import { format, parseISO } from "date-fns";

interface Props {
  inputs: CropInput[];
}

const TYPE_COLORS: Record<string, string> = {
  fertilizer_macro: "#2E7D32",
  fertilizer_micro: "#66BB6A",
  insecticide: "#E53935",
  herbicide: "#FB8C00",
  fungicide: "#8E24AA",
  adjuvant: "#9E9E9E",
  other: "#78909C",
};

export default function ManejoCharts({ inputs }: Props) {
  // Chart 1: Applications by date
  const byDateData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    inputs.forEach(i => {
      const d = i.execution_date || i.recommendation_date;
      if (!d) return;
      const key = d;
      if (!map[key]) map[key] = {};
      const t = i.input_type || "other";
      map[key][t] = (map[key][t] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, types]) => ({
        date: format(parseISO(date), "dd/MM"),
        ...types,
      }));
  }, [inputs]);

  // Chart 2: Distribution by type
  const byTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    inputs.forEach(i => {
      const t = i.input_type || "other";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({
      name: INPUT_TYPE_CONFIG[type]?.label || type,
      value: count,
      color: TYPE_COLORS[type] || "#78909C",
    }));
  }, [inputs]);

  // Chart 3: Recommended vs Applied
  const recVsAppData = useMemo(() => {
    return inputs
      .filter(i => i.qty_recommended && i.qty_applied)
      .slice(0, 20)
      .map(i => ({
        name: i.product_name.slice(0, 15),
        recommended: i.qty_recommended,
        applied: i.qty_applied,
      }));
  }, [inputs]);

  if (inputs.length === 0) return null;

  const allTypes = Object.keys(TYPE_COLORS);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1 */}
      {byDateData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aplicações por Data</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {allTypes.map(t => {
                  if (!byDateData.some(d => (d as any)[t])) return null;
                  return (
                    <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]}
                      name={INPUT_TYPE_CONFIG[t]?.label || t} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Chart 2 */}
      {byTypeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={100} innerRadius={50} label={({ name, value }) => `${name}: ${value}`}>
                  {byTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Chart 3 */}
      {recVsAppData.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recomendado vs Aplicado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recVsAppData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="recommended" fill="#BDBDBD" name="Recomendado" />
                <Bar dataKey="applied" fill="#4CAF50" name="Aplicado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
