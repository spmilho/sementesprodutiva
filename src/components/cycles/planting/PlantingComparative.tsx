import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isFemaleType, isMaleType } from "./planting-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line,
} from "recharts";

interface Props {
  plans: any[];
  actuals: any[];
  standCounts: any[];
  glebas: any[];
  femaleArea: number;
  maleArea: number;
}

function isMale1(type: string) { return type === "male" || type === "male_1"; }
function isMale2(type: string) { return type === "male_2"; }

export default function PlantingComparative({ plans, actuals, standCounts, glebas, femaleArea, maleArea }: Props) {
  const totals = useMemo(() => {
    const planF = plans.filter(p => isFemaleType(p.type)).reduce((s, p) => s + (p.planned_area || 0), 0);
    const planM1 = plans.filter(p => isMale1(p.type)).reduce((s, p) => s + (p.planned_area || 0), 0);
    const planM2 = plans.filter(p => isMale2(p.type)).reduce((s, p) => s + (p.planned_area || 0), 0);
    const realF = actuals.filter(a => isFemaleType(a.type)).reduce((s, a) => s + (a.actual_area || 0), 0);
    const realM1 = actuals.filter(a => isMale1(a.type)).reduce((s, a) => s + (a.actual_area || 0), 0);
    const realM2 = actuals.filter(a => isMale2(a.type)).reduce((s, a) => s + (a.actual_area || 0), 0);
    return { planF, planM1, planM2, realF, realM1, realM2 };
  }, [plans, actuals]);

  // Accumulated chart data by date
  const accumChartData = useMemo(() => {
    const typeGroups = [
      { key: "female", filterPlan: (t: string) => isFemaleType(t), filterActual: (t: string) => isFemaleType(t) },
      { key: "male_1", filterPlan: (t: string) => isMale1(t), filterActual: (t: string) => isMale1(t) },
      { key: "male_2", filterPlan: (t: string) => isMale2(t), filterActual: (t: string) => isMale2(t) },
    ];
    const dateMap = new Map<string, Record<string, number>>();
    for (const g of typeGroups) {
      for (const p of plans.filter(p => g.filterPlan(p.type))) {
        const d = p.planned_date;
        if (!d) continue;
        const entry = dateMap.get(d) || {};
        entry[`plan_${g.key}`] = (entry[`plan_${g.key}`] || 0) + (p.planned_area || 0);
        dateMap.set(d, entry);
      }
      for (const a of actuals.filter(a => g.filterActual(a.type))) {
        const d = a.planting_date;
        if (!d) continue;
        const entry = dateMap.get(d) || {};
        entry[`real_${g.key}`] = (entry[`real_${g.key}`] || 0) + (a.actual_area || 0);
        dateMap.set(d, entry);
      }
    }
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const acc: Record<string, number> = { plan_female: 0, real_female: 0, plan_male_1: 0, real_male_1: 0, plan_male_2: 0, real_male_2: 0 };
    return sorted.map(([date, v]) => {
      for (const k of Object.keys(acc)) acc[k] += v[k] || 0;
      const d = date.split("-");
      return {
        date: `${d[2]}/${d[1]}`,
        planF: Math.round(acc.plan_female * 10) / 10,
        realF: Math.round(acc.real_female * 10) / 10,
        planM1: Math.round(acc.plan_male_1 * 10) / 10,
        realM1: Math.round(acc.real_male_1 * 10) / 10,
        planM2: Math.round(acc.plan_male_2 * 10) / 10,
        realM2: Math.round(acc.real_male_2 * 10) / 10,
      };
    });
  }, [plans, actuals]);

  const devF = totals.realF - totals.planF;
  const devM1 = totals.realM1 - totals.planM1;
  const devM2 = totals.realM2 - totals.planM2;
  const devTotal = devF + devM1 + devM2;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground border-b pb-2">📊 Comparativo Planejado x Realizado</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Fêmea</p>
          <p className="text-sm">Plan: {totals.planF.toFixed(2)} ha → Real: <strong>{totals.realF.toFixed(2)} ha</strong></p>
          <p className={cn("text-xs font-semibold", devF >= 0 ? "text-green-600" : "text-red-600")}>
            Desvio: {devF >= 0 ? "+" : ""}{devF.toFixed(2)} ha
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Macho 1</p>
          <p className="text-sm">Plan: {totals.planM1.toFixed(2)} ha → Real: <strong>{totals.realM1.toFixed(2)} ha</strong></p>
          <p className={cn("text-xs font-semibold", devM1 >= 0 ? "text-green-600" : "text-red-600")}>
            Desvio: {devM1 >= 0 ? "+" : ""}{devM1.toFixed(2)} ha
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Macho 2</p>
          <p className="text-sm">Plan: {totals.planM2.toFixed(2)} ha → Real: <strong>{totals.realM2.toFixed(2)} ha</strong></p>
          <p className={cn("text-xs font-semibold", devM2 >= 0 ? "text-green-600" : "text-red-600")}>
            Desvio: {devM2 >= 0 ? "+" : ""}{devM2.toFixed(2)} ha
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Desvio Geral</p>
          <p className={cn("text-lg font-bold", devTotal >= 0 ? "text-green-600" : "text-red-600")}>
            {devTotal >= 0 ? "+" : ""}{devTotal.toFixed(2)} ha
          </p>
        </CardContent></Card>
      </div>

      {accumChartData.length > 0 && (
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Plantio Acumulado: Planejado × Realizado</p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={accumChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="planF" name="Plan. Fêmea" stroke="#1E88E5" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="realF" name="Real Fêmea" stroke="#1E88E5" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="planM1" name="Plan. M1" stroke="#4CAF50" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="realM1" name="Real M1" stroke="#4CAF50" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="planM2" name="Plan. M2" stroke="#FF9800" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="realM2" name="Real M2" stroke="#FF9800" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}
    </div>
  );
}
