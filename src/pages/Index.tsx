import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Sprout, Scissors, Wheat, Target, AlertTriangle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, ReferenceLine,
} from "recharts";
import KPICard from "@/components/KPICard";
import DashboardExtraCharts from "@/components/DashboardExtraCharts";
import { useDashboardData, type DashboardCycle } from "@/hooks/useDashboardData";
import { differenceInDays, parseISO, format } from "date-fns";

const CHART_COLORS = {
  primary: "hsl(130, 55%, 24%)",
  accent: "hsl(42, 85%, 52%)",
  blue: "hsl(200, 65%, 48%)",
  orange: "hsl(25, 85%, 55%)",
  muted: "hsl(130, 10%, 72%)",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "hsl(215, 70%, 55%)",
  planting: "hsl(42, 85%, 52%)",
  growing: "hsl(130, 55%, 40%)",
  detasseling: "hsl(25, 85%, 55%)",
  harvest: "hsl(70, 60%, 45%)",
  completed: "hsl(130, 55%, 24%)",
  cancelled: "hsl(0, 60%, 50%)",
};

const statusLabels: Record<string, string> = {
  planning: "Planejamento", planting: "Plantio", growing: "Crescimento",
  detasseling: "Despendoamento", harvest: "Colheita", completed: "Concluído", cancelled: "Cancelado",
};

const ALL_STATUSES = ["planning", "planting", "growing", "detasseling", "harvest", "completed", "cancelled"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-${status}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function NickingSemaphore({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const colors: Record<string, string> = {
    synchronized: "bg-green-500", adequate: "bg-green-500",
    slight_delay: "bg-yellow-500", warning: "bg-yellow-500",
    critical: "bg-red-500", desynchronized: "bg-red-500",
  };
  const labels: Record<string, string> = {
    synchronized: "Sincronizado", adequate: "Adequado",
    slight_delay: "Alerta", warning: "Alerta",
    critical: "Crítico", desynchronized: "Dessincronizado",
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || "bg-gray-400"}`} />
      <span className="text-xs">{labels[status] || status}</span>
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [season, setSeason] = useState("all");
  const [clientId, setClientId] = useState("all");
  const [cooperatorId, setCooperatorId] = useState("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const {
    cycles, plantingPlans, plantingActuals, detasseling, harvestRecords, harvestPlans,
    moisture, nicking, phenologyRecords, cropInputs, clients, cooperators, seasons, isLoading,
  } = useDashboardData({ season, clientId, cooperatorId, statuses: selectedStatuses });

  // Apply client-side filters
  const filtered = useMemo(() => {
    let result = cycles;
    if (clientId !== "all") result = result.filter(c => c.client_id === clientId);
    if (cooperatorId !== "all") result = result.filter(c => c.cooperator_id === cooperatorId);
    if (selectedStatuses.length > 0) result = result.filter(c => selectedStatuses.includes(c.status));
    return result;
  }, [cycles, clientId, cooperatorId, selectedStatuses]);

  const cycleIds = useMemo(() => new Set(filtered.map(c => c.id)), [filtered]);

  // ═══ KPIs ═══
  const activeCycles = filtered.filter(c => !["completed", "cancelled"].includes(c.status));

  // % Plantio Fêmea (weighted by area)
  const femalePlantingPct = useMemo(() => {
    let totalArea = 0, plantedArea = 0;
    for (const c of filtered) {
      if (["completed", "cancelled"].includes(c.status)) continue;
      totalArea += c.total_area;
      const actuals = plantingActuals.filter((a: any) => a.cycle_id === c.id && (a.type === "female"));
      plantedArea += actuals.reduce((s: number, a: any) => s + (a.actual_area || 0), 0);
    }
    return totalArea > 0 ? Math.min(100, Math.round((plantedArea / totalArea) * 100)) : 0;
  }, [filtered, plantingActuals]);

  // % Plantio Macho
  const malePlantingPct = useMemo(() => {
    let totalArea = 0, plantedArea = 0;
    for (const c of filtered) {
      if (["completed", "cancelled"].includes(c.status)) continue;
      totalArea += c.total_area;
      const actuals = plantingActuals.filter((a: any) => a.cycle_id === c.id && (a.type === "male" || a.type === "male_1" || a.type === "male_2" || a.type === "male_3"));
      plantedArea += actuals.reduce((s: number, a: any) => s + (a.actual_area || 0), 0);
    }
    return totalArea > 0 ? Math.min(100, Math.round((plantedArea / totalArea) * 100)) : 0;
  }, [filtered, plantingActuals]);

  // % Despendoamento (first pass coverage)
  const detasselingPct = useMemo(() => {
    const relevantCycles = filtered.filter(c => !["completed", "cancelled", "planning"].includes(c.status));
    if (relevantCycles.length === 0) return 0;
    let totalArea = 0, workedArea = 0;
    for (const c of relevantCycles) {
      totalArea += c.total_area;
      const records = detasseling.filter((d: any) => d.cycle_id === c.id);
      workedArea += records.reduce((s: number, d: any) => s + (d.area_worked_ha || 0), 0);
    }
    return totalArea > 0 ? Math.min(100, Math.round((workedArea / totalArea) * 100)) : 0;
  }, [filtered, detasseling]);

  // Área colhida
  const { harvestedArea, totalHarvestArea } = useMemo(() => {
    let harvested = 0, total = 0;
    for (const c of filtered) {
      if (["cancelled"].includes(c.status)) continue;
      total += c.total_area;
      const records = harvestRecords.filter((h: any) => h.cycle_id === c.id);
      harvested += records.reduce((s: number, h: any) => s + (h.area_harvested_ha || 0), 0);
    }
    return { harvestedArea: Math.round(harvested * 10) / 10, totalHarvestArea: Math.round(total * 10) / 10 };
  }, [filtered, harvestRecords]);

  const harvestPct = totalHarvestArea > 0 ? Math.round((harvestedArea / totalHarvestArea) * 100) : 0;

  // Produção total
  const totalProduction = useMemo(() => {
    let tons = 0;
    for (const c of filtered) {
      const records = harvestRecords.filter((h: any) => h.cycle_id === c.id);
      tons += records.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    }
    return Math.round(tons * 10) / 10;
  }, [filtered, harvestRecords]);

  // ═══ CHARTS ═══

  // Plantio: accumulated planned vs actual by date, split by F/M1/M2
  const plantingChartData = useMemo(() => {
    const typeGroups = [
      { key: "female", filter: (t: string) => t === "female" },
      { key: "male_1", filter: (t: string) => t === "male" || t === "male_1" },
      { key: "male_2", filter: (t: string) => t === "male_2" },
    ];
    const dateMap = new Map<string, Record<string, number>>();
    for (const g of typeGroups) {
      const plans = plantingPlans.filter((p: any) => cycleIds.has(p.cycle_id) && g.filter(p.type));
      const actuals = plantingActuals.filter((a: any) => cycleIds.has(a.cycle_id) && g.filter(a.type));
      for (const p of plans) {
        if (!p.planned_date) continue;
        const entry = dateMap.get(p.planned_date) || {};
        entry[`plan_${g.key}`] = (entry[`plan_${g.key}`] || 0) + (p.planned_area || 0);
        dateMap.set(p.planned_date, entry);
      }
      for (const a of actuals) {
        if (!a.planting_date) continue;
        const entry = dateMap.get(a.planting_date) || {};
        entry[`real_${g.key}`] = (entry[`real_${g.key}`] || 0) + (a.actual_area || 0);
        dateMap.set(a.planting_date, entry);
      }
    }
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const acc: Record<string, number> = { plan_female: 0, real_female: 0, plan_male_1: 0, real_male_1: 0, plan_male_2: 0, real_male_2: 0 };
    return sorted.map(([date, v]) => {
      for (const k of Object.keys(acc)) acc[k] += v[k] || 0;
      return {
        date: format(parseISO(date), "dd/MM"),
        planF: Math.round(acc.plan_female * 10) / 10,
        realF: Math.round(acc.real_female * 10) / 10,
        planM1: Math.round(acc.plan_male_1 * 10) / 10,
        realM1: Math.round(acc.real_male_1 * 10) / 10,
        planM2: Math.round(acc.plan_male_2 * 10) / 10,
        realM2: Math.round(acc.real_male_2 * 10) / 10,
      };
    });
  }, [plantingPlans, plantingActuals, cycleIds]);

  // Colheita: accumulated planned vs actual
  const harvestChartData = useMemo(() => {
    const records = harvestRecords.filter((h: any) => cycleIds.has(h.cycle_id));
    const dateMap = new Map<string, { actual: number }>();
    for (const h of records) {
      const d = h.harvest_date;
      const entry = dateMap.get(d) || { actual: 0 };
      entry.actual += h.area_harvested_ha || 0;
      dateMap.set(d, entry);
    }
    const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let accReal = 0;
    return sorted.map(([date, v]) => {
      accReal += v.actual;
      return { date: format(parseISO(date), "dd/MM"), acumReal: Math.round(accReal * 10) / 10 };
    });
  }, [harvestRecords, cycleIds]);

  // Status donut
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of filtered) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({
      name: statusLabels[name] || name,
      value,
      color: STATUS_COLORS[name] || "hsl(0,0%,60%)",
    }));
  }, [filtered]);

  // Moisture by cycle (horizontal bar)
  const moistureChartData = useMemo(() => {
    const byCycle = new Map<string, number[]>();
    for (const m of moisture) {
      if (!cycleIds.has(m.cycle_id)) continue;
      const arr = byCycle.get(m.cycle_id) || [];
      arr.push(m.moisture_pct);
      byCycle.set(m.cycle_id, arr);
    }
    return filtered
      .filter(c => byCycle.has(c.id))
      .map(c => {
        const vals = byCycle.get(c.id)!;
        const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        return { name: c.contract_number || c.field_name, avg, fill: avg <= 18 ? "hsl(130,55%,40%)" : avg <= 22 ? "hsl(42,85%,52%)" : "hsl(0,60%,50%)" };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [moisture, filtered, cycleIds]);

  // ═══ ALERTS ═══
  const alerts = useMemo(() => {
    const list: { type: "warning" | "error" | "info"; message: string }[] = [];
    const now = new Date();

    for (const c of filtered) {
      if (["completed", "cancelled"].includes(c.status)) continue;

      // >5 days without update
      const daysSince = differenceInDays(now, parseISO(c.updated_at));
      if (daysSince > 5) {
        list.push({ type: "warning", message: `${c.contract_number || c.field_name}: sem atualização há ${daysSince} dias` });
      }

      // No contract
      if (!c.contract_number) {
        list.push({ type: "info", message: `${c.field_name} (${c.client_name}): ciclo sem contrato definido` });
      }

      // Detasseling remaining >1%
      const detRecs = detasseling.filter((d: any) => d.cycle_id === c.id);
      if (detRecs.length > 0) {
        const lastRec = detRecs[detRecs.length - 1];
        if (lastRec.pct_remaining_after > 1) {
          list.push({ type: "error", message: `${c.contract_number || c.field_name}: remanescente despend. ${lastRec.pct_remaining_after}% (>1%)` });
        }
      }

      // Nicking critical
      const nickRecs = nicking.filter((n: any) => n.cycle_id === c.id);
      if (nickRecs.length > 0) {
        const latest = nickRecs[0];
        if (latest.overall_synchrony_status === "critical" || latest.overall_synchrony_status === "desynchronized") {
          list.push({ type: "error", message: `${c.contract_number || c.field_name}: nicking em estado CRÍTICO` });
        }
      }

      // Ready for harvest but no harvest records
      if (c.status === "harvest") {
        const hasHarvest = harvestRecords.some((h: any) => h.cycle_id === c.id);
        if (!hasHarvest) {
          list.push({ type: "warning", message: `${c.contract_number || c.field_name}: em fase de colheita mas sem registros` });
        }
      }

      // Detasseling DAP overdue
      if (c.detasseling_dap) {
        const cycleActuals = plantingActuals.filter((a: any) => a.cycle_id === c.id && a.type === "female");
        if (cycleActuals.length > 0) {
          const earliestPlanting = cycleActuals.map((a: any) => a.planting_date).sort()[0];
          if (earliestPlanting) {
            const expectedDetDate = new Date(parseISO(earliestPlanting).getTime() + c.detasseling_dap * 86400000);
            const detRecs2 = detasseling.filter((d: any) => d.cycle_id === c.id);
            if (detRecs2.length === 0 && differenceInDays(now, expectedDetDate) > 0) {
              const overdueDays = differenceInDays(now, expectedDetDate);
              list.push({ type: "error", message: `${c.contract_number || c.field_name}: despendoamento atrasado ${overdueDays} dias!` });
            }
          }
        }
      }
    }
    return list;
  }, [filtered, detasseling, nicking, harvestRecords, plantingActuals]);

  // ═══ TABLE enrichments ═══
  const tableData = useMemo(() => {
    return filtered.map(c => {
      // Latest nicking
      const nickRec = nicking.find((n: any) => n.cycle_id === c.id);
      // Detasseling %
      const detRecs = detasseling.filter((d: any) => d.cycle_id === c.id);
      const detArea = detRecs.reduce((s: number, d: any) => s + (d.area_worked_ha || 0), 0);
      const detPct = c.female_area > 0 ? Math.min(100, Math.round((detArea / c.female_area) * 100)) : 0;
      // Yield estimate
      const yieldTons = c.expected_production ? Math.round(c.expected_production * 10) / 10 : null;
      return {
        ...c,
        nickingStatus: nickRec?.overall_synchrony_status || null,
        detPct,
        yieldTons,
      };
    });
  }, [filtered, nicking, detasseling]);

  const clearFilters = () => {
    setSeason("all");
    setClientId("all");
    setCooperatorId("all");
    setSelectedStatuses([]);
  };

  const hasActiveFilters = season !== "all" || clientId !== "all" || cooperatorId !== "all" || selectedStatuses.length > 0;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground">Visão geral da produção de sementes</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Safra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Safras</SelectItem>
              {(seasons || []).map((s: string) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cooperatorId} onValueChange={setCooperatorId}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Cooperado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {cooperators.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatuses.length === 0 ? "all" : selectedStatuses[0]} onValueChange={(v) => {
            if (v === "all") setSelectedStatuses([]);
            else setSelectedStatuses(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v]);
          }}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status">{selectedStatuses.length > 0 ? `${selectedStatuses.length} status` : "Todos Status"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              {ALL_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPICard title="Ciclos Ativos" value={String(activeCycles.length)} icon={Layers} description={`${filtered.length} total`} />
        <KPICard title="Plantio ♀" value={`${femalePlantingPct}%`} icon={Sprout} progress={femalePlantingPct} description="ponderado por área" />
        <KPICard title="Plantio ♂" value={`${malePlantingPct}%`} icon={Sprout} progress={malePlantingPct} description="ponderado por área" />
        <KPICard title="Despendoamento" value={`${detasselingPct}%`} icon={Scissors} progress={detasselingPct} description="1ª passada" />
        <KPICard title="Colheita" value={`${harvestedArea} / ${totalHarvestArea} ha`} icon={Wheat} progress={harvestPct} description={`${harvestPct}%`} />
        <KPICard title="Produção" value={`${totalProduction} t`} icon={Target} description="acumulada" />
      </div>

      {/* Extra Charts: Phenology, Forecasts, Manejo */}
      <DashboardExtraCharts
        cycles={filtered}
        phenologyRecords={phenologyRecords}
        plantingActuals={plantingActuals}
        cropInputs={cropInputs}
      />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Plantio Acumulado: Plan. × Real (ha)</CardTitle>
          </CardHeader>
          <CardContent>
            {plantingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={plantingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {/* Fêmea */}
                  <Line type="monotone" dataKey="planF" name="Plan. Fêmea" stroke={CHART_COLORS.blue} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="realF" name="Real Fêmea" stroke={CHART_COLORS.blue} strokeWidth={2.5} dot={{ r: 3 }} />
                  {/* Macho 1 */}
                  <Line type="monotone" dataKey="planM1" name="Plan. M1" stroke={CHART_COLORS.primary} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="realM1" name="Real M1" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
                  {/* Macho 2 */}
                  <Line type="monotone" dataKey="planM2" name="Plan. M2" stroke={CHART_COLORS.orange} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="realM2" name="Real M2" stroke={CHART_COLORS.orange} strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16">Sem dados de plantio</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Colheita: Acumulado Realizado (ha)</CardTitle>
          </CardHeader>
          <CardContent>
            {harvestChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={harvestChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="acumReal" name="Realizado" stroke={CHART_COLORS.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                  <ReferenceLine y={totalHarvestArea} stroke={CHART_COLORS.muted} strokeDasharray="5 5" label={{ value: `Meta: ${totalHarvestArea} ha`, fontSize: 10 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16">Sem dados de colheita</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Status dos Ciclos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 11 }}>
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-16">Sem ciclos</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Umidade Média por Ciclo (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {moistureChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={moistureChartData} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(110,12%,87%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, "auto"]} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <ReferenceLine x={18} stroke="hsl(130,55%,24%)" strokeDasharray="3 3" label={{ value: "18%", fontSize: 10 }} />
                  <Bar dataKey="avg" name="Umidade %" radius={[0, 4, 4, 0]}>
                    {moistureChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16">Sem dados de umidade</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 8).map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 px-4 py-2.5 rounded-lg text-sm border ${
              alert.type === "error" ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
              : alert.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300"
              : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300"
            }`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
          {alerts.length > 8 && (
            <p className="text-xs text-muted-foreground pl-4">+ {alerts.length - 8} alertas adicionais</p>
          )}
        </div>
      )}

      {/* Cycles Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Resumo dos Ciclos ({tableData.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Contrato / Pivô</TableHead>
                  <TableHead className="text-xs">Safra</TableHead>
                  <TableHead className="text-xs">Cliente</TableHead>
                  <TableHead className="text-xs">Cooperado</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Fazenda</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Híbrido</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Área (ha)</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Nicking</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell text-right">Desp. %</TableHead>
                  <TableHead className="text-xs hidden xl:table-cell text-right">Est. (ton)</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-12">
                      Nenhum ciclo encontrado
                    </TableCell>
                  </TableRow>
                ) : tableData.map(c => (
                  <TableRow
                    key={c.id}
                    className={`cursor-pointer hover:bg-muted/50 ${!c.contract_number ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                    onClick={() => navigate(`/ciclos/${c.id}`)}
                  >
                    <TableCell className="text-sm">
                      {c.contract_number ? (
                        <span className="font-medium">{c.contract_number}</span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{c.field_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            sem contrato
                          </Badge>
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.season}</TableCell>
                    <TableCell className="font-medium text-sm">{c.client_name}</TableCell>
                    <TableCell className="text-sm">{c.cooperator_name}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell">{c.farm_name}</TableCell>
                    <TableCell className="text-sm hidden md:table-cell font-mono">{c.hybrid_name}</TableCell>
                    <TableCell className="text-right text-sm hidden sm:table-cell">{c.female_area}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="hidden lg:table-cell"><NickingSemaphore status={c.nickingStatus} /></TableCell>
                    <TableCell className="text-right text-sm hidden lg:table-cell">
                      {c.detPct > 0 ? (
                        <div className="flex items-center gap-1 justify-end">
                          <Progress value={c.detPct} className="h-1.5 w-12" />
                          <span className="text-xs">{c.detPct}%</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm hidden xl:table-cell">
                      {c.yieldTons ? `${c.yieldTons}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
                      {format(parseISO(c.updated_at), "dd/MM/yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
