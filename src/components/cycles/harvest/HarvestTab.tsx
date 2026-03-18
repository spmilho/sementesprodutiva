import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOfflineSyncContext } from "@/components/Layout";
import { format, parseISO, differenceInDays, startOfDay, addDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings2, Pencil, Calendar, Wheat, BarChart3, Clock, Target, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ActualHarvest from "./ActualHarvest";
import HarvestForecast from "./HarvestForecast";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RTooltip, ReferenceLine } from "recharts";
import { buildGlebaRows, buildSchedule, formatDateBR, GLEBA_COLORS } from "./utils";
import type { GlebaHarvestRow, HarvestParams, ScheduleRow } from "./types";

interface HarvestTabProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName: string;
  hybridName: string;
  cooperatorName?: string;
  femaleArea: number;
  totalArea: number;
  materialCycleDays?: number;
  targetMoisture?: number;
  expectedProductivity?: number;
}

export default function HarvestTab({
  cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName,
  femaleArea, totalArea, materialCycleDays, targetMoisture = 18, expectedProductivity,
}: HarvestTabProps) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [editingParams, setEditingParams] = useState(false);
  const [editCycleDays, setEditCycleDays] = useState(false);
  const [localCycleDays, setLocalCycleDays] = useState(materialCycleDays || 130);
  const [localMoisture, setLocalMoisture] = useState(targetMoisture);
  const [localHaPerDay, setLocalHaPerDay] = useState<number>(15);
  const [chartView, setChartView] = useState<"general" | "gleba">("general");

  // Fetch saved harvest_plan params
  const { data: savedParams } = useQuery({
    queryKey: ["harvest-plan-params", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("harvest_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("gleba_id", null)
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
  });

  // Initialize from saved params
  useMemo(() => {
    if (savedParams) {
      setLocalCycleDays(savedParams.cycle_days_used);
      setLocalMoisture(savedParams.target_moisture_pct || targetMoisture);
      setLocalHaPerDay(savedParams.target_ha_per_day || 15);
    }
  }, [savedParams]);

  // Fetch glebas
  const { data: glebas = [] } = useQuery({
    queryKey: ["harvest-glebas", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("pivot_glebas")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("parent_type", "female")
        .is("deleted_at", null);
      return data || [];
    },
  });

  // Fetch planting plans
  const { data: plantingPlans = [] } = useQuery({
    queryKey: ["harvest-planting-plans", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("planting_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      return data || [];
    },
  });

  // Fetch actual plantings
  const { data: plantingActuals = [] } = useQuery({
    queryKey: ["harvest-planting-actuals", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("planting_actual")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      return data || [];
    },
  });

  // Fetch moisture samples
  const { data: moistureSamples = [] } = useQuery({
    queryKey: ["harvest-moisture", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("moisture_samples")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      return data || [];
    },
  });

  // Fetch yield estimates
  const { data: yieldEstimates = [] } = useQuery({
    queryKey: ["harvest-yield-estimates", cycleId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("yield_estimates")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("estimate_date", { ascending: false });
      return data || [];
    },
  });

  const params: HarvestParams = useMemo(() => ({
    cycleDays: localCycleDays,
    targetMoisture: localMoisture,
    targetHaPerDay: localHaPerDay,
    bagWeightKg: 20,
  }), [localCycleDays, localMoisture, localHaPerDay]);

  const glebaRows = useMemo(
    () => buildGlebaRows(glebas, plantingPlans, plantingActuals, moistureSamples, params, femaleArea),
    [glebas, plantingPlans, plantingActuals, moistureSamples, params, femaleArea]
  );

  const schedule = useMemo(() => buildSchedule(glebaRows, params.targetHaPerDay), [glebaRows, params.targetHaPerDay]);

  // Save params mutation
  const saveParamsMut = useMutation({
    mutationFn: async () => {
      if (savedParams) {
        const { error } = await (supabase as any)
          .from("harvest_plan")
          .update({
            cycle_days_used: localCycleDays,
            target_moisture_pct: localMoisture,
            target_ha_per_day: localHaPerDay,
          })
          .eq("id", savedParams.id);
        if (error) throw error;
      } else {
        const { error } = await addRecord("harvest_plan", {
            cycle_id: cycleId,
            org_id: orgId,
            cycle_days_used: localCycleDays,
            target_moisture_pct: localMoisture,
            target_ha_per_day: localHaPerDay,
            planting_source: "planned",
          }, cycleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest-plan-params", cycleId] });
      setEditingParams(false);
      toast.success("Parâmetros salvos!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Summary card data
  const firstGleba = glebaRows.find(r => r.updatedHarvestDate);
  const lastScheduleRow = schedule[schedule.length - 1];
  const glebaAreaSum = glebaRows.reduce((s, r) => s + r.areaHa, 0);
  const readyCount = glebaRows.filter(r => r.overallStatus === "ready_to_harvest").length;

  const latestEstimate = yieldEstimates[0];
  const productionTons = latestEstimate?.total_production_tons;

  // Use yield estimate if available, otherwise Target Yield MPB (expectedProductivity kg/ha)
  const effectiveYieldTonPerHa = latestEstimate?.productivity_kg_ha
    ? Number(latestEstimate.productivity_kg_ha) / 1000
    : expectedProductivity
      ? expectedProductivity / 1000
      : null;
  const tonPerDay = effectiveYieldTonPerHa ? (localHaPerDay * effectiveYieldTonPerHa) : null;

  const today = startOfDay(new Date());

  // Chart data
  const chartData = useMemo(() => {
    if (schedule.length === 0) return [];
    return schedule.map(s => ({
      date: formatDateBR(s.date),
      rawDate: s.date,
      planejado: s.areaPlanned,
      acumuladoPlanejado: s.accumulated,
      glebaName: s.glebaName,
      glebaId: s.glebaId,
    }));
  }, [schedule]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span><strong>Contrato:</strong> {contractNumber || pivotName}</span>
              <span><strong>Híbrido:</strong> {hybridName}</span>
              {cooperatorName && <span><strong>Cooperado:</strong> {cooperatorName}</span>}
              <span><strong>Pivô:</strong> {pivotName}</span>
              <span><strong>Área fêmea:</strong> {femaleArea} ha</span>
              <span><strong>Ciclo:</strong> {localCycleDays} dias</span>
              <span><strong>Umidade alvo:</strong> {localMoisture}%</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 1 — Parameters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Parâmetros Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Ciclo do material (dias)</label>
                <div className="flex items-center gap-1 mt-1">
                  {editCycleDays ? (
                    <Input type="number" value={localCycleDays} onChange={(e) => setLocalCycleDays(Number(e.target.value))} className="h-8 w-24 text-sm" />
                  ) : (
                    <span className="text-sm font-medium">{localCycleDays} dias</span>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setEditCycleDays(!editCycleDays)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Umidade alvo (%)</label>
                <Input type="number" step="0.1" value={localMoisture} onChange={(e) => setLocalMoisture(Number(e.target.value))} className="h-8 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Meta ha/dia *</label>
                <Input type="number" step="0.1" value={localHaPerDay} onChange={(e) => setLocalHaPerDay(Number(e.target.value))} className="h-8 mt-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Peso médio saco (kg)</label>
                <Input type="number" value={localBagWeight} onChange={(e) => setLocalBagWeight(Number(e.target.value))} className="h-8 mt-1 text-sm" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic max-w-lg">
                A previsão de colheita é calculada somando o ciclo de {localCycleDays} dias à data de plantio de cada gleba.
                A umidade alvo de {localMoisture}% é a referência para início da colheita.
              </p>
              <Button size="sm" onClick={() => saveParamsMut.mutate()} disabled={saveParamsMut.isPending}>
                Salvar Parâmetros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* HARVEST FORECAST CHART */}
        <HarvestForecast cycleId={cycleId} cycleDays={localCycleDays} />

        {/* SECTION 3 — Summary Cards (placed before table for visibility) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard
            icon={<Calendar className="h-4 w-4" />}
            title="Início da Colheita"
            value={firstGleba ? formatDateBR(firstGleba.updatedHarvestDate) : "—"}
            badge={firstGleba?.isConfirmed ? "Confirmado" : "Estimado"}
            badgeColor={firstGleba?.isConfirmed ? "green" : "amber"}
            subtitle={firstGleba?.updatedHarvestDate ? getRelativeLabel(firstGleba.updatedHarvestDate) : undefined}
          />
          <SummaryCard
            icon={<Clock className="h-4 w-4" />}
            title="Término Previsto"
            value={lastScheduleRow ? formatDateBR(lastScheduleRow.date) : "—"}
            subtitle={lastScheduleRow ? `Dia ${lastScheduleRow.day} do cronograma` : undefined}
          />
          <SummaryCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="Janela de Colheita"
            value={firstGleba?.updatedHarvestDate && lastScheduleRow
              ? `${differenceInDays(parseISO(lastScheduleRow.date), parseISO(firstGleba.updatedHarvestDate)) + 1} dias`
              : "—"}
            subtitle={`${glebaRows.length} glebas | ${totalArea} ha`}
          />
          <SummaryCard
            icon={<Target className="h-4 w-4" />}
            title="Meta Diária"
            value={`${localHaPerDay} ha/dia`}
            subtitle={expectedProductivity ? `~${((localHaPerDay * expectedProductivity) / 1000).toFixed(1)} ton/dia` : undefined}
          />
          <SummaryCard
            icon={<Wheat className="h-4 w-4" />}
            title="Glebas Prontas"
            value={`${readyCount} de ${glebaRows.length}`}
            progress={(readyCount / Math.max(glebaRows.length, 1)) * 100}
          />
          <SummaryCard
            icon={<Package className="h-4 w-4" />}
            title="Estimativa Produção"
            value={productionTons ? `${Number(productionTons).toFixed(1)} ton` : "Sem estimativa"}
            subtitle={productionBags ? `${Number(productionBags).toFixed(0)} sc` : undefined}
          />
        </div>

        {/* SECTION 2 — Forecast Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Previsão de Colheita por Gleba</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Gleba</TableHead>
                    <TableHead className="text-xs">Área (ha)</TableHead>
                    <TableHead className="text-xs">Plantio Plan.</TableHead>
                    <TableHead className="text-xs">Colheita Plan.</TableHead>
                    <TableHead className="text-xs">Plantio Real</TableHead>
                    <TableHead className="text-xs">Colheita Atualizada</TableHead>
                    <TableHead className="text-xs">Desvio</TableHead>
                    <TableHead className="text-xs">Status Umid.</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {glebaRows.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground text-sm py-8">Nenhuma gleba cadastrada. Registre o planejamento de plantio primeiro.</TableCell></TableRow>
                  ) : glebaRows.map((row, i) => (
                    <TableRow key={row.glebaId || i}>
                      <TableCell className="font-medium text-sm">{row.glebaName}</TableCell>
                      <TableCell className="text-sm">{row.areaHa}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateBR(row.plannedPlantingDate)}</TableCell>
                      <TableCell className="text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground text-xs">{formatDateBR(row.plannedHarvestDate)}</span>
                          </TooltipTrigger>
                          {row.plannedPlantingDate && row.plannedHarvestDate && (
                            <TooltipContent>
                              {formatDateBR(row.plannedPlantingDate)} + {localCycleDays} dias = {formatDateBR(row.plannedHarvestDate)}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.actualPlantingDate
                          ? <span className="font-semibold">{formatDateBR(row.actualPlantingDate)}</span>
                          : <span className="italic text-muted-foreground text-xs">Aguardando plantio</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={row.isConfirmed ? "font-semibold" : "text-muted-foreground"}>
                              {formatDateBR(row.updatedHarvestDate)}
                            </span>
                          </TooltipTrigger>
                          {row.updatedHarvestDate && (
                            <TooltipContent>
                              {formatDateBR(row.actualPlantingDate || row.plannedPlantingDate)} + {localCycleDays} dias
                            </TooltipContent>
                          )}
                        </Tooltip>
                        {row.updatedHarvestDate && (
                          <Badge variant="outline" className={`ml-1 text-[10px] ${row.isConfirmed ? "border-green-500 text-green-700" : "border-amber-400 text-amber-600"}`}>
                            {row.isConfirmed ? "🟢 Confirmado" : "⏳ Estimado"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <DeviationBadge days={row.deviationDays} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <MoistureStatusBadge status={row.moistureStatus} avg={row.moistureAvg} />
                      </TableCell>
                      <TableCell className="text-sm">
                        <OverallStatusBadge status={row.overallStatus} harvestDate={row.updatedHarvestDate} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4 — Schedule */}
        {schedule.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cronograma Automático</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">Dia</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Gleba</TableHead>
                      <TableHead className="text-xs text-right">Área plan. (ha)</TableHead>
                      <TableHead className="text-xs text-right">Acumulado (ha)</TableHead>
                      <TableHead className="text-xs text-right">% Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedule.map((s, i) => {
                      const glebaIdx = glebaRows.findIndex(g => g.glebaId === s.glebaId || (g.glebaId === null && s.glebaId === null));
                      const bgColor = GLEBA_COLORS[glebaIdx % GLEBA_COLORS.length];
                      const isCurrentDay = isToday(parseISO(s.date));
                      return (
                        <TableRow
                          key={i}
                          className={isCurrentDay ? "ring-2 ring-red-500 ring-inset" : ""}
                          style={{ backgroundColor: `${bgColor}08` }}
                        >
                          <TableCell className="text-sm font-mono">{s.day}</TableCell>
                          <TableCell className="text-sm">{formatDateBR(s.date)}</TableCell>
                          <TableCell className="text-sm">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: bgColor }} />
                            {s.glebaName}
                          </TableCell>
                          <TableCell className="text-sm text-right">{s.areaPlanned}</TableCell>
                          <TableCell className="text-sm text-right">{s.accumulated}</TableCell>
                          <TableCell className="text-sm text-right">{s.pctTotal}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5 — Chart: Moved to ActualHarvest */}

        {/* SECTION 6 — Gantt Timeline */}
        {glebaRows.filter(r => r.updatedHarvestDate).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Timeline de Colheita</CardTitle>
            </CardHeader>
            <CardContent>
              <GanttTimeline rows={glebaRows} schedule={schedule} targetHaPerDay={localHaPerDay} totalArea={totalArea} />
            </CardContent>
          </Card>
        )}

        {/* ═══ SEPARADOR ═══ */}
        <div className="relative py-4">
          <Separator />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
            <span className="bg-background px-4 text-sm font-semibold text-foreground">🌾 Colheita Realizada</span>
          </div>
        </div>

        {/* SECTION — Actual Harvest */}
        <ActualHarvest
          cycleId={cycleId}
          orgId={orgId}
          femaleArea={femaleArea}
          glebas={glebas}
          schedule={schedule}
          bagWeightKg={localBagWeight}
        />
      </div>
    </TooltipProvider>
  );
}

// ── Sub-components ──

function SummaryCard({ icon, title, value, badge, badgeColor, subtitle, progress: progressVal }: {
  icon: React.ReactNode; title: string; value: string;
  badge?: string; badgeColor?: string; subtitle?: string; progress?: number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wide">{title}</span></div>
        <p className="text-lg font-bold">{value}</p>
        {badge && (
          <Badge variant="outline" className={`text-[10px] mt-1 ${badgeColor === "green" ? "border-green-500 text-green-700" : "border-amber-400 text-amber-600"}`}>
            {badgeColor === "green" ? "🟢" : "⏳"} {badge}
          </Badge>
        )}
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        {progressVal !== undefined && <Progress value={progressVal} className="h-1.5 mt-2" />}
      </CardContent>
    </Card>
  );
}

function DeviationBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days === 0) return <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-600">0</Badge>;
  if (days > 0) return <Badge variant="outline" className="text-[10px] border-red-400 text-red-600">+{days} dias</Badge>;
  return <Badge variant="outline" className="text-[10px] border-green-400 text-green-600">{days} dias</Badge>;
}

function MoistureStatusBadge({ status, avg }: { status: string; avg: number | null }) {
  const map: Record<string, { emoji: string; label: string; color: string }> = {
    ready: { emoji: "🟢", label: "Pronta", color: "text-green-700" },
    almost: { emoji: "🟡", label: "Quase", color: "text-amber-600" },
    not_ready: { emoji: "🔴", label: "Não pronta", color: "text-red-600" },
    no_data: { emoji: "⚪", label: "Sem dados", color: "text-muted-foreground" },
  };
  const s = map[status] || map.no_data;
  return (
    <div>
      <span className={`text-xs ${s.color}`}>{s.emoji} {s.label}</span>
      {avg !== null && <p className="text-[10px] text-muted-foreground">Média: {avg.toFixed(1)}%</p>}
    </div>
  );
}

function OverallStatusBadge({ status, harvestDate }: { status: string; harvestDate: string | null }) {
  const map: Record<string, { emoji: string; label: string }> = {
    ready_to_harvest: { emoji: "✅", label: "Pronta p/ colher" },
    scheduled: { emoji: "📅", label: harvestDate ? `Prevista ${formatDateBR(harvestDate)}` : "Prevista" },
    date_reached_moisture_high: { emoji: "⚠️", label: "Data atingida, umidade alta" },
    awaiting_planting: { emoji: "🌱", label: "Aguardando plantio" },
  };
  const s = map[status] || map.awaiting_planting;
  return <span className="text-xs whitespace-nowrap">{s.emoji} {s.label}</span>;
}

function getRelativeLabel(dateStr: string): string {
  const d = startOfDay(parseISO(dateStr));
  const today = startOfDay(new Date());
  const diff = differenceInDays(d, today);
  if (diff < 0) return `Iniciou há ${Math.abs(diff)} dias`;
  if (diff === 0) return "Hoje!";
  return `Começa em ${diff} dias`;
}

function GanttTimeline({ rows, schedule, targetHaPerDay, totalArea }: {
  rows: GlebaHarvestRow[]; schedule: ScheduleRow[]; targetHaPerDay: number; totalArea: number;
}) {
  const withDates = rows.filter(r => r.updatedHarvestDate);
  if (withDates.length === 0) return null;

  const allDates = schedule.map(s => parseISO(s.date));
  if (allDates.length === 0) return null;
  const minDate = allDates[0];
  const maxDate = allDates[allDates.length - 1];
  const totalDays = differenceInDays(maxDate, minDate) + 1;
  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, minDate);

  return (
    <div className="space-y-2 relative">
      {/* Today line */}
      {todayOffset >= 0 && todayOffset <= totalDays && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${(todayOffset / totalDays) * 100}%` }}
        >
          <span className="absolute -top-4 -translate-x-1/2 text-[9px] text-red-600 font-medium">Hoje</span>
        </div>
      )}
      {withDates.map((row, i) => {
        const glebaSchedule = schedule.filter(s =>
          (s.glebaId === row.glebaId) || (s.glebaId === null && row.glebaId === null)
        );
        if (glebaSchedule.length === 0) return null;
        const start = parseISO(glebaSchedule[0].date);
        const end = parseISO(glebaSchedule[glebaSchedule.length - 1].date);
        const leftPct = (differenceInDays(start, minDate) / totalDays) * 100;
        const widthPct = ((differenceInDays(end, start) + 1) / totalDays) * 100;
        const color = GLEBA_COLORS[i % GLEBA_COLORS.length];

        return (
          <TooltipProvider key={row.glebaId || i}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 h-8">
                  <span className="text-xs w-24 truncate text-right">{row.glebaName}</span>
                  <div className="flex-1 relative h-5 bg-muted rounded">
                    <div
                      className="absolute h-full rounded"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs w-16">
                    <OverallStatusBadge status={row.overallStatus} harvestDate={null} />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{row.glebaName} | {formatDateBR(glebaSchedule[0].date)} — {formatDateBR(glebaSchedule[glebaSchedule.length - 1].date)} | {row.areaHa} ha</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-[calc(6rem+0.5rem)]">
        <span>{formatDateBR(format(minDate, "yyyy-MM-dd"))}</span>
        <span>{formatDateBR(format(maxDate, "yyyy-MM-dd"))}</span>
      </div>
    </div>
  );
}
