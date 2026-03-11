import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { isFemaleType, isMaleType, getOverallStatus, calcMaleTotalArea, calcMaleAreaForGleba } from "./planting-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface Props {
  plans: any[];
  actuals: any[];
  standCounts: any[];
  glebas: any[];
  femaleArea: number;
  maleArea: number;
}

export default function PlantingComparative({ plans, actuals, standCounts, glebas, femaleArea, maleArea }: Props) {
  const totalFemalePlan = useMemo(() => plans.filter((p: any) => isFemaleType(p.type)).reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);
  const totalMalePlan = useMemo(() => plans.filter((p: any) => isMaleType(p.type)).reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);
  const totalFemaleActual = useMemo(() => actuals.filter((a: any) => isFemaleType(a.type)).reduce((s: number, a: any) => s + a.actual_area, 0), [actuals]);
  const totalMaleActual = useMemo(() => actuals.filter((a: any) => isMaleType(a.type)).reduce((s: number, a: any) => s + a.actual_area, 0), [actuals]);

  const chartData = useMemo(() => {
    const glebaIds = new Set<string>();
    plans.forEach((p: any) => glebaIds.add(p.gleba_id || "none"));
    actuals.forEach((a: any) => glebaIds.add(a.gleba_id || "none"));

    return Array.from(glebaIds).map(gid => {
      const name = gid === "none" ? "Geral" : glebas.find((g: any) => g.id === gid)?.name || "Geral";
      const planF = plans.filter((p: any) => (p.gleba_id || "none") === gid && isFemaleType(p.type)).reduce((s: number, p: any) => s + p.planned_area, 0);
      const planM = plans.filter((p: any) => (p.gleba_id || "none") === gid && isMaleType(p.type)).reduce((s: number, p: any) => s + p.planned_area, 0);
      const realF = actuals.filter((a: any) => (a.gleba_id || "none") === gid && isFemaleType(a.type)).reduce((s: number, a: any) => s + a.actual_area, 0);
      const realM = actuals.filter((a: any) => (a.gleba_id || "none") === gid && isMaleType(a.type)).reduce((s: number, a: any) => s + a.actual_area, 0);
      return { name, planF, planM, realF, realM };
    });
  }, [plans, actuals, glebas]);

  const femaleDeviation = totalFemaleActual - totalFemalePlan;
  const maleDeviation = totalMaleActual - totalMalePlan;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground border-b pb-2">📊 Comparativo Planejado x Realizado</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Fêmea</p>
          <p className="text-sm">Plan: {totalFemalePlan.toFixed(2)} ha → Real: <strong>{totalFemaleActual.toFixed(2)} ha</strong></p>
          <p className={cn("text-xs font-semibold", femaleDeviation >= 0 ? "text-green-600" : "text-red-600")}>
            Desvio: {femaleDeviation >= 0 ? "+" : ""}{femaleDeviation.toFixed(2)} ha
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Macho</p>
          <p className="text-sm">Plan: {totalMalePlan.toFixed(2)} ha → Real: <strong>{totalMaleActual.toFixed(2)} ha</strong></p>
          <p className={cn("text-xs font-semibold", maleDeviation >= 0 ? "text-green-600" : "text-red-600")}>
            Desvio: {maleDeviation >= 0 ? "+" : ""}{maleDeviation.toFixed(2)} ha
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Desvio Geral</p>
          <p className={cn("text-lg font-bold", (femaleDeviation + maleDeviation) >= 0 ? "text-green-600" : "text-red-600")}>
            {(femaleDeviation + maleDeviation) >= 0 ? "+" : ""}{(femaleDeviation + maleDeviation).toFixed(2)} ha
          </p>
        </CardContent></Card>
      </div>

      {chartData.length > 0 && (
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Área Planejada x Realizada por Gleba</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="planF" name="Plan. Fêmea" fill="hsl(var(--muted-foreground) / 0.3)" barSize={16} />
              <Bar dataKey="realF" name="Real Fêmea" fill="#1E88E5" barSize={16} />
              <Bar dataKey="planM" name="Plan. Macho" fill="hsl(var(--muted-foreground) / 0.2)" barSize={16} />
              <Bar dataKey="realM" name="Real Macho" fill="#4CAF50" barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}
    </div>
  );
}
