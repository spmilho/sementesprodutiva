import { useMemo } from "react";
import { UbsCard, UbsKPI } from "./UbsCard";
import { getWeekLabels, getWeeklyDemand, type UbsState, PHASES } from "./types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface Props {
  state: UbsState;
  weeklyReceiving: number;
  weeklyDrying: number;
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stddev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export function StatisticalAnalysisTab({ state, weeklyReceiving, weeklyDrying }: Props) {
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const weeklyDemand = getWeeklyDemand(state.clients, state.numWeeks);
  const active = weeklyDemand.filter((d) => d > 0);

  const stats = useMemo(() => {
    if (active.length === 0) return null;
    const mean = active.reduce((a, b) => a + b, 0) / active.length;
    const med = median(active);
    const sd = stddev(active, mean);
    const min = Math.min(...active);
    const max = Math.max(...active);
    return { mean, median: med, stddev: sd, min, max };
  }, [active]);

  // Threshold analysis
  const thresholds = [50, 70, 80, 90, 100];
  const thresholdData = thresholds.map((t) => ({
    threshold: `${t}%`,
    count: weeklyDemand.filter((d) => (d / weeklyReceiving) * 100 > t).length,
  }));

  // Critical weeks
  const criticalWeeks = weeklyDemand
    .map((d, i) => ({ week: weekLabels[i], demand: d, deficit: d - weeklyReceiving, pct: weeklyReceiving > 0 ? (d / weeklyReceiving) * 100 : 0 }))
    .filter((w) => w.deficit > 0);

  // Surplus vs deficit totals
  const totalSurplus = weeklyDemand.reduce((s, d) => s + Math.max(weeklyReceiving - d, 0), 0);
  const totalDeficit = weeklyDemand.reduce((s, d) => s + Math.max(d - weeklyReceiving, 0), 0);

  // Histogram
  const histBins = useMemo(() => {
    if (active.length === 0) return [];
    const binSize = 200;
    const maxVal = Math.max(...active);
    const bins: { range: string; count: number }[] = [];
    for (let lo = 0; lo <= maxVal; lo += binSize) {
      const hi = lo + binSize;
      bins.push({
        range: `${lo}–${hi}`,
        count: active.filter((d) => d >= lo && d < hi).length,
      });
    }
    return bins;
  }, [active]);

  // Staff totals
  const totalStaff = PHASES.reduce((sum, p) => sum + ((state.staff[p] || []).reduce((a, b) => a + b, 0)), 0);
  const totalHH = active.length * totalStaff * state.hoursPerShift * state.operatingDays;

  // Bottleneck projection
  const bottleneckWeek = useMemo(() => {
    if (active.length < 2) return null;
    const activeIdxs = weeklyDemand.map((d, i) => ({ i, d })).filter((x) => x.d > 0);
    if (activeIdxs.length < 2) return null;
    const last = activeIdxs[activeIdxs.length - 1];
    const first = activeIdxs[0];
    const trend = (last.d - first.d) / (last.i - first.i);
    if (trend <= 0) return null;
    const weeksUntil100 = (weeklyReceiving - last.d) / trend;
    if (weeksUntil100 < 0 || weeksUntil100 > 52) return null;
    return Math.ceil(last.i + weeksUntil100);
  }, [weeklyDemand, weeklyReceiving]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <UbsKPI label="Média" value={`${stats.mean.toFixed(0)} t`} />
          <UbsKPI label="Mediana" value={`${stats.median.toFixed(0)} t`} />
          <UbsKPI label="Desvio Padrão" value={`${stats.stddev.toFixed(0)} t`} color="#FFD93D" />
          <UbsKPI label="Mínimo" value={`${stats.min.toFixed(0)} t`} color="#4ECDC4" />
          <UbsKPI label="Máximo" value={`${stats.max.toFixed(0)} t`} color="#FF6B6B" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Histogram */}
        <UbsCard title="Distribuição da Demanda Semanal">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histBins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
              <XAxis dataKey="range" tick={{ fill: "#8aac8f", fontSize: 9 }} />
              <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
              <Bar dataKey="count" name="Semanas" fill="#5CDB6E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </UbsCard>

        {/* Threshold */}
        <UbsCard title="Capacidade Crítica por Threshold">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={thresholdData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
              <XAxis type="number" tick={{ fill: "#8aac8f", fontSize: 10 }} allowDecimals={false} />
              <YAxis dataKey="threshold" type="category" tick={{ fill: "#8aac8f", fontSize: 10 }} width={50} />
              <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
              <Bar dataKey="count" name="Semanas acima" label={{ position: "right", fill: "#e8f5e9", fontSize: 10 }}>
                {thresholdData.map((d, i) => (
                  <Cell key={i} fill={d.count > 0 && i >= 3 ? "#FF6B6B" : d.count > 0 ? "#FFD93D" : "#5CDB6E"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </UbsCard>
      </div>

      {/* Critical weeks table */}
      {criticalWeeks.length > 0 && (
        <UbsCard title="Semanas Críticas (Déficit)">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a4a32]">
                <th className="text-left py-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace]">Semana</th>
                <th className="text-right py-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace]">Demanda (t)</th>
                <th className="text-right py-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace]">Déficit (t)</th>
                <th className="text-right py-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace]">Sobrecarga</th>
              </tr>
            </thead>
            <tbody>
              {criticalWeeks.map((w) => (
                <tr key={w.week} className="border-b border-[#1e3a25]">
                  <td className="py-2 text-[#c8e6c9]">{w.week}</td>
                  <td className="py-2 text-right text-[#e8f5e9] font-['DM_Mono',monospace]">{w.demand.toLocaleString("pt-BR")}</td>
                  <td className="py-2 text-right text-red-400 font-['DM_Mono',monospace]">{w.deficit.toLocaleString("pt-BR")}</td>
                  <td className="py-2 text-right text-red-400 font-['DM_Mono',monospace]">{w.pct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </UbsCard>
      )}

      {/* Operational slack & bottleneck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <UbsKPI label="Surplus Total" value={`${totalSurplus.toLocaleString("pt-BR")} t`} color="#5CDB6E" />
        <UbsKPI label="Déficit Total" value={`${totalDeficit.toLocaleString("pt-BR")} t`} color={totalDeficit > 0 ? "#FF6B6B" : "#5CDB6E"} />
        <UbsKPI label="Folga Líquida" value={`${(totalSurplus - totalDeficit).toLocaleString("pt-BR")} t`} color={totalSurplus >= totalDeficit ? "#5CDB6E" : "#FF6B6B"} />
      </div>

      {/* Staff summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <UbsKPI label="HH Total no Período" value={totalHH.toLocaleString("pt-BR")} sub="homens-hora" color="#4ECDC4" />
        <UbsKPI label="Pico de Pessoal" value={`${totalStaff} pessoas`} sub={`por turno × ${state.shifts} turnos`} />
        {bottleneckWeek !== null && (
          <UbsKPI label="Projeção Gargalo" value={`Semana ${bottleneckWeek + 1}`} sub="100% utilização projetada" color="#FF6B6B" />
        )}
      </div>
    </div>
  );
}
