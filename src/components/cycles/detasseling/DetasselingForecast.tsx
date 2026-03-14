import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Flame, Target } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { format, parseISO, differenceInDays, addDays, min as minDate, max as maxDate } from "date-fns";

interface Props {
  cycleId: string;
  detasselingDap: number;
}

interface PlantingEntry {
  planting_date: string;
  area_ha: number;
}

const COLORS = ["#1E88E5", "#4CAF50", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4", "#795548", "#607D8B"];

export default function DetasselingForecast({ cycleId, detasselingDap: defaultDap }: Props) {
  const sb = supabase as any;
  const [dap, setDap] = useState(defaultDap || 60);
  const [margin, setMargin] = useState(5);

  // Fetch female planting actuals
  const { data: plantingActuals = [] } = useQuery({
    queryKey: ["forecast-planting-actual-v2", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_actual")
        .select("planting_date, actual_area, type")
        .eq("cycle_id", cycleId).eq("type", "female").is("deleted_at", null)
        .order("planting_date");
      return data || [];
    },
  });

  // Fetch female planting plan (fallback when no actuals)
  const { data: plantingPlans = [] } = useQuery({
    queryKey: ["forecast-planting-plan", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_plan")
        .select("planned_date, planned_area, type")
        .eq("cycle_id", cycleId).eq("type", "female").is("deleted_at", null)
        .order("planned_date");
      return data || [];
    },
  });

  // Fetch detasseling records to check status
  const { data: detRecords = [] } = useQuery({
    queryKey: ["forecast-det-records-v2", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("detasseling_records")
        .select("operation_date, area_worked_ha")
        .eq("cycle_id", cycleId).is("deleted_at", null)
        .order("operation_date");
      return data || [];
    },
  });

  // Use actual planting dates as the authoritative source
  const dataSource = plantingActuals.length > 0 ? "actual" : (plantingPlans.length > 0 ? "plan" : "none");

  // Group plantings by date — prefer actuals, fallback to plan
  const plantings = useMemo<PlantingEntry[]>(() => {
    const map = new Map<string, number>();
    if (plantingActuals.length > 0) {
      plantingActuals.forEach((p: any) => {
        const d = p.planting_date;
        const area = Number(p.actual_area) || 0;
        map.set(d, (map.get(d) || 0) + area);
      });
    } else {
      plantingPlans.forEach((p: any) => {
        const d = p.planned_date;
        const area = Number(p.planned_area) || 0;
        if (d) map.set(d, (map.get(d) || 0) + area);
      });
    }
    return Array.from(map.entries())
      .map(([planting_date, area_ha]) => ({ planting_date, area_ha }))
      .sort((a, b) => a.planting_date.localeCompare(b.planting_date));
  }, [plantingActuals, plantingPlans]);

  // Compute windows for each planting date
  const windows = useMemo(() => {
    return plantings.map((p, i) => {
      const center = addDays(parseISO(p.planting_date), dap);
      const start = addDays(center, -margin);
      const end = addDays(center, margin);
      return {
        ...p,
        index: i,
        label: `P${i + 1}`,
        centerDate: format(center, "yyyy-MM-dd"),
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
        color: COLORS[i % COLORS.length],
      };
    });
  }, [plantings, dap, margin]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!windows.length) return [];

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const allStarts = windows.map(w => parseISO(w.startDate));
    const allEnds = windows.map(w => parseISO(w.endDate));
    const chartStart = addDays(minDate(allStarts), -3);
    const chartEnd = addDays(maxDate(allEnds), 3);

    const actualStart = chartStart < today ? chartStart : addDays(today, -2);

    // Track which planting windows have already started (for cumulative unique area)
    const windowStarted = new Set<number>();

    const data: any[] = [];
    let current = actualStart;
    let accHa = 0;

    while (current <= chartEnd) {
      const dateStr = format(current, "yyyy-MM-dd");
      const dateLabel = format(current, "dd/MM");
      const entry: any = { date: dateStr, dateLabel, isToday: dateStr === todayStr };

      let totalHaDay = 0;
      windows.forEach((w) => {
        const inWindow = dateStr >= w.startDate && dateStr <= w.endDate;
        const key = `p${w.index}`;
        entry[key] = inWindow ? w.area_ha : 0;
        if (inWindow) totalHaDay += w.area_ha;

        // Accumulate area only on the first day the window opens
        if (inWindow && !windowStarted.has(w.index)) {
          windowStarted.add(w.index);
          accHa += w.area_ha;
        }
      });

      entry.totalHa = totalHaDay;
      entry.accHa = Math.round(accHa * 10) / 10;

      data.push(entry);
      current = addDays(current, 1);
    }

    return data;
  }, [windows]);

  // KPI stats
  const kpis = useMemo(() => {
    if (!windows.length) return null;

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const earliestStart = windows.reduce((min, w) => w.startDate < min ? w.startDate : min, windows[0].startDate);
    const latestEnd = windows.reduce((max, w) => w.endDate > max ? w.endDate : max, windows[0].endDate);

    const daysToStart = differenceInDays(parseISO(earliestStart), today);
    const windowTotalDays = differenceInDays(parseISO(latestEnd), parseISO(earliestStart)) + 1;

    // Peak day
    let peakHa = 0;
    let peakDate = "";
    chartData.forEach(d => {
      if (d.totalHa > peakHa) {
        peakHa = d.totalHa;
        peakDate = d.date;
      }
    });

    const totalFemaleArea = plantings.reduce((s, p) => s + p.area_ha, 0);

    return { earliestStart, latestEnd, daysToStart, windowTotalDays, peakHa, peakDate, totalFemaleArea };
  }, [windows, chartData, plantings]);

  // Has detasseling started?
  const hasDetStarted = detRecords.length > 0;

  // Table data with status
  const tableData = useMemo(() => {
    const today = new Date();
    return windows.map(w => {
      const daysToCenter = differenceInDays(parseISO(w.centerDate), today);
      const inWindow = format(today, "yyyy-MM-dd") >= w.startDate && format(today, "yyyy-MM-dd") <= w.endDate;

      let status: string;
      if (hasDetStarted) status = "em_andamento";
      else if (daysToCenter < -margin) status = "atrasado";
      else if (inWindow) status = "na_janela";
      else if (daysToCenter <= 10) status = "aproximando";
      else status = "aguardando";

      return { ...w, daysToCenter, inWindow, status };
    });
  }, [windows, hasDetStarted, margin]);

  if (!plantings.length) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-md border-dashed text-center">
        📅 Registre o planejamento ou plantio real da fêmea para gerar a previsão de despendoamento.
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayLabel = chartData.find(d => d.date === todayStr)?.dateLabel;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          📅 Previsão de Despendoamento
        </h3>
        <Badge variant={dataSource === "actual" ? "default" : "secondary"} className="text-xs">
          {dataSource === "actual" ? "Plantio Realizado" : "Planejamento"}
        </Badge>
      </div>

      {/* Editable params */}
      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Ciclo despendoamento (DAP)</Label>
          <Input
            type="number" min={30} max={120} value={dap}
            onChange={e => setDap(Number(e.target.value) || 55)}
            className="w-24 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Margem (±dias)</Label>
          <Input
            type="number" min={3} max={10} value={margin}
            onChange={e => setMargin(Math.min(10, Math.max(3, Number(e.target.value) || 5)))}
            className="w-20 h-8 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">Início da Janela</p>
              <p className="text-sm font-bold">{format(parseISO(kpis.earliestStart), "dd/MM/yyyy")}</p>
              <p className="text-xs text-muted-foreground">
                {kpis.daysToStart > 0
                  ? `Começa em ${kpis.daysToStart} dias`
                  : kpis.daysToStart === 0
                    ? "Começa HOJE"
                    : `Iniciou há ${Math.abs(kpis.daysToStart)} dias`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-5 w-5 mx-auto text-orange-500 mb-1" />
              <p className="text-xs text-muted-foreground">Pico do Despendoamento</p>
              <p className="text-sm font-bold">{kpis.peakHa.toFixed(0)} ha simultâneos</p>
              <p className="text-xs text-muted-foreground">
                {kpis.peakDate && format(parseISO(kpis.peakDate), "dd/MM/yyyy")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">Fim da Janela</p>
              <p className="text-sm font-bold">{format(parseISO(kpis.latestEnd), "dd/MM/yyyy")}</p>
              <p className="text-xs text-muted-foreground">
                Janela total: {kpis.windowTotalDays} dias • {kpis.totalFemaleArea.toFixed(0)} ha
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-xs mb-3">Janela de Despendoamento (±{margin} dias)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} height={30} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} label={{ value: "ha/dia", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} label={{ value: "ha acum.", angle: 90, position: "insideRight", fontSize: 10 }} />
              <Tooltip content={<ForecastTooltip windows={windows} margin={margin} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Window shading areas - mais visíveis */}
              {windows.map((w) => {
                const startLabel = chartData.find(d => d.date === w.startDate)?.dateLabel;
                const centerLabel = chartData.find(d => d.date === w.centerDate)?.dateLabel;
                const endLabel = chartData.find(d => d.date === w.endDate)?.dateLabel;
                if (!startLabel || !endLabel) return null;
                return (
                  <g key={`window-${w.index}`}>
                    {/* Faixa da janela com borda */}
                    <ReferenceArea
                      yAxisId="left"
                      x1={startLabel}
                      x2={endLabel}
                      fill={w.color}
                      fillOpacity={0.12}
                      stroke={w.color}
                      strokeOpacity={0.4}
                      strokeWidth={1}
                    />
                    {/* Destaque para centro */}
                    <ReferenceLine
                      yAxisId="left"
                      x={centerLabel}
                      stroke={w.color}
                      strokeWidth={3}
                      strokeDasharray="0"
                    />
                  </g>
                );
              })}

              {/* Stacked bars per planting date */}
              {windows.map((w) => (
                <Bar
                  key={`bar-${w.index}`}
                  yAxisId="left"
                  dataKey={`p${w.index}`}
                  name={`Plantio ${format(parseISO(w.planting_date), "dd/MM")} (${w.area_ha.toFixed(0)}ha)`}
                  fill={w.color}
                  fillOpacity={0.85}
                  stackId="ha"
                  radius={[2, 2, 0, 0]}
                />
              ))}

              {/* Accumulated line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="accHa"
                name="ha acumulados"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={false}
              />

              {/* TODAY reference line - mais destacado */}
              {todayLabel && (
                <ReferenceLine
                  yAxisId="left"
                  x={todayLabel}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="6 3"
                  strokeWidth={3}
                  label={{
                    value: "HOJE",
                    position: "top",
                    fontSize: 11,
                    fontWeight: "bold",
                    fill: "hsl(var(--destructive))",
                    dy: -5,
                  }}
                />
              )}

              {/* Center date labels - posicionados acima do gráfico */}
              {windows.map((w) => {
                const centerLabel = chartData.find(d => d.date === w.centerDate)?.dateLabel;
                if (!centerLabel) return null;
                return (
                  <ReferenceLine
                    key={`center-label-${w.index}`}
                    yAxisId="left"
                    x={centerLabel}
                    stroke="transparent"
                    label={{
                      value: `${w.label}\n${format(parseISO(w.centerDate), "dd/MM")}`,
                      position: "insideTop",
                      fontSize: 10,
                      fontWeight: "bold",
                      fill: w.color,
                      dy: -25,
                    }}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">📋 Janela de Despendoamento por Data de Plantio</h4>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Plantio Fêmea</TableHead>
                  <TableHead className="text-xs">Lote</TableHead>
                  <TableHead className="text-xs text-right">Área (ha)</TableHead>
                  <TableHead className="text-xs text-right">DAP</TableHead>
                  <TableHead className="text-xs">Início (-{margin}d)</TableHead>
                  <TableHead className="text-xs">Data Central</TableHead>
                  <TableHead className="text-xs">Fim (+{margin}d)</TableHead>
                  <TableHead className="text-xs">Dias restantes</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map(w => (
                  <TableRow key={w.index}>
                    <TableCell className="text-xs font-medium">{format(parseISO(w.planting_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" style={{ borderColor: w.color, color: w.color }} className="text-xs">
                        {w.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{w.area_ha.toFixed(1)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{dap}</TableCell>
                    <TableCell className="text-xs">{format(parseISO(w.startDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs font-semibold">{format(parseISO(w.centerDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">{format(parseISO(w.endDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs">
                      <DaysCell days={w.daysToCenter} hasRecords={hasDetStarted} />
                    </TableCell>
                    <TableCell className="text-xs">
                      <StatusBadge status={w.status} />
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

// Custom tooltip - destaca a data central e dias ±
function ForecastTooltip({ active, payload, label, windows, margin }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const today = new Date();
  const recordDate = parseISO(data.date);
  const daysDiff = differenceInDays(recordDate, today);
  const totalWindowDays = margin * 2 + 1;

  return (
    <div className="bg-popover border rounded-lg p-4 shadow-lg text-xs space-y-2 max-w-[320px]">
      <div className="flex items-center justify-between pb-2 border-b">
        <p className="font-bold text-base">{format(recordDate, "dd/MM/yyyy")}</p>
        <span className={daysDiff === 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
          {daysDiff > 0 ? `Em ${daysDiff} dias` : daysDiff === 0 ? "HOJE" : `Há ${Math.abs(daysDiff)} dias`}
        </span>
      </div>

      {data.totalHa > 0 && (
        <p className="font-semibold text-sm">
          Hectares na janela: <span className="text-primary">{data.totalHa.toFixed(1)} ha</span>
        </p>
      )}

      <div className="space-y-1.5 pt-1">
        <p className="text-xs font-medium text-muted-foreground">Detalhamento por plantio:</p>
        {windows.map((w: any) => {
          const inWindow = data.date >= w.startDate && data.date <= w.endDate;
          const windowDay = differenceInDays(parseISO(data.date), parseISO(w.startDate)) + 1;
          const isCenter = data.date === w.centerDate;
          const daysFromCenter = differenceInDays(parseISO(data.date), parseISO(w.centerDate));

          return (
            <div key={w.index} className={`flex items-center gap-2 p-1.5 rounded ${isCenter ? "bg-primary/10 border border-primary/20" : ""}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
              <span className="flex-1">
                <span className="font-medium">{w.label}</span> ({w.area_ha.toFixed(0)}ha)
              </span>
              <span className={isCenter ? "font-bold text-primary" : "text-muted-foreground"}>
                {isCenter ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    CENTRO
                  </span>
                ) : inWindow ? (
                  `${daysFromCenter > 0 ? "+" : ""}${daysFromCenter}d (${windowDay}/${totalWindowDays})`
                ) : (
                  "fora da janela"
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground border-t pt-2 text-xs">
        Acumulado: <span className="font-medium">{data.accHa} ha</span>
      </p>
    </div>
  );
}

function DaysCell({ days, hasRecords }: { days: number; hasRecords: boolean }) {
  if (hasRecords) return <span className="text-green-600 font-medium">✅ Iniciado</span>;
  if (days === 0) return <span className="text-destructive font-bold animate-pulse">HOJE</span>;
  if (days > 0) return <span className="text-blue-600 font-medium">{days} dias</span>;
  return <span className="text-destructive font-medium">ATRASADO {Math.abs(days)}d</span>;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "em_andamento":
      return <Badge variant="outline" className="text-xs border-green-500 text-green-700">✅ Em andamento</Badge>;
    case "atrasado":
      return <Badge variant="destructive" className="text-xs">🔴 ATRASADO</Badge>;
    case "na_janela":
      return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">🟡 Na janela</Badge>;
    case "aproximando":
      return <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">📅 Aproximando</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">⏳ Aguardando</Badge>;
  }
}