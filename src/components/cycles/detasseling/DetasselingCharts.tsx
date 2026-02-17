import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, LineChart, Area, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { getPassLabel } from "./constants";

interface DetasselingRecord {
  id: string;
  operation_date: string;
  pass_type: string;
  area_worked_ha: number;
  pct_detasseled_this_pass: number;
  pct_remaining_after: number;
  yield_per_person_ha: number | null;
  team_size: number | null;
}

interface Props {
  records: DetasselingRecord[];
  femaleArea: number;
}

const PASS_COLORS: { [key: string]: string } = {
  first_pass: "#3b82f6",
  second_pass: "#22c55e",
  third_pass: "#f97316",
  repass_1: "#eab308", repass_2: "#eab308", repass_3: "#eab308", repass_4: "#eab308", repass_5: "#eab308",
};

export default function DetasselingCharts({ records, femaleArea }: Props) {
  // Chart 1 - Hectares per day
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; total: number; byPass: Record<string, number> }>();
    records.forEach((r) => {
      const key = r.operation_date;
      if (!map.has(key)) map.set(key, { date: key, total: 0, byPass: {} });
      const entry = map.get(key)!;
      entry.total += Number(r.area_worked_ha);
      entry.byPass[r.pass_type] = (entry.byPass[r.pass_type] || 0) + Number(r.area_worked_ha);
    });
    const sorted = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    let acc = 0;
    return sorted.map((d) => {
      acc += d.total;
      return { ...d, accumulated: acc, first_pass: d.byPass.first_pass || 0, second_pass: d.byPass.second_pass || 0, third_pass: d.byPass.third_pass || 0, repass: (d.byPass.repass_1 || 0) + (d.byPass.repass_2 || 0) + (d.byPass.repass_3 || 0) + (d.byPass.repass_4 || 0) + (d.byPass.repass_5 || 0), label: format(parseISO(d.date), "dd/MM") };
    });
  }, [records]);

  // Chart 2 - % tirado por passada
  const passSummary = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    records.forEach((r) => {
      if (!map.has(r.pass_type)) map.set(r.pass_type, { sum: 0, count: 0 });
      const e = map.get(r.pass_type)!;
      e.sum += Number(r.pct_detasseled_this_pass);
      e.count++;
    });
    return Array.from(map.entries()).map(([pass, { sum, count }]) => ({
      pass, label: getPassLabel(pass), avg: sum / count,
      fill: Number(sum / count) >= 95 ? "#22c55e" : Number(sum / count) >= 85 ? "#eab308" : "#ef4444",
    }));
  }, [records]);

  // Chart 3 - Remaining evolution
  const remainingData = useMemo(() => {
    return records
      .slice()
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date))
      .map((r) => ({
        date: format(parseISO(r.operation_date), "dd/MM"),
        remaining: Number(r.pct_remaining_after),
        pass: getPassLabel(r.pass_type),
      }));
  }, [records]);

  // Chart 4 - Yield per person
  const yieldData = useMemo(() => {
    return records
      .filter((r) => r.yield_per_person_ha != null)
      .sort((a, b) => a.operation_date.localeCompare(b.operation_date))
      .map((r) => ({
        date: format(parseISO(r.operation_date), "dd/MM"),
        yield: Number(r.yield_per_person_ha),
      }));
  }, [records]);

  const avgYield = useMemo(() => {
    if (!yieldData.length) return 0;
    return yieldData.reduce((s, d) => s + d.yield, 0) / yieldData.length;
  }, [yieldData]);

  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Hectares por Dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="first_pass" stackId="a" fill="#3b82f6" name="1ª Passada" />
              <Bar yAxisId="left" dataKey="second_pass" stackId="a" fill="#22c55e" name="2ª Passada" />
              <Bar yAxisId="left" dataKey="third_pass" stackId="a" fill="#f97316" name="3ª Passada" />
              <Bar yAxisId="left" dataKey="repass" stackId="a" fill="#eab308" name="Repasses" />
              <Line yAxisId="right" dataKey="accumulated" stroke="#9ca3af" strokeDasharray="5 5" name="Acumulado" dot={false} />
              <ReferenceLine yAxisId="right" y={femaleArea} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Área total: ${femaleArea}ha`, fontSize: 10 }} />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 2 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">% Tirado por Passada</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={passSummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="avg" name="% Tirado Médio" label={{ position: "inside", fontSize: 11, fill: "#fff" }}>
                {passSummary.map((entry, i) => (
                  <rect key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 3 */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução % Remanescente</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={remainingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
              <ReferenceLine y={0.5} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Aceitável: 0.5%", fontSize: 9, fill: "#22c55e" }} />
              <ReferenceLine y={1} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Crítico: 1%", fontSize: 9, fill: "#ef4444" }} />
              <Line dataKey="remaining" stroke="#ef4444" name="% Remanescente" dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart 4 */}
      {yieldData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rendimento da Equipe</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={yieldData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)} ha/pessoa/dia`} />
                <ReferenceLine y={avgYield} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: `Média: ${avgYield.toFixed(2)}`, fontSize: 10 }} />
                <Bar dataKey="yield" fill="#8b5cf6" name="ha/pessoa/dia" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
