import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Target } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { format, parseISO, differenceInDays, addDays } from "date-fns";

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
  const [dap, setDap] = useState(defaultDap || 55);

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

  const dataSource = plantingActuals.length > 0 ? "actual" : (plantingPlans.length > 0 ? "plan" : "none");

  // Group plantings by date
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

  // Compute per-planting center dates AND unified window
  const { windows, windowStart, windowEnd } = useMemo(() => {
    if (!plantings.length) return { windows: [], windowStart: "", windowEnd: "" };

    const wins = plantings.map((p, i) => {
      const center = addDays(parseISO(p.planting_date), dap);
      return {
        ...p,
        index: i,
        label: `P${i + 1}`,
        centerDate: format(center, "yyyy-MM-dd"),
        color: COLORS[i % COLORS.length],
      };
    });

    // Window: DAP days after first planting → DAP days after last planting
    const start = format(addDays(parseISO(plantings[0].planting_date), dap), "yyyy-MM-dd");
    const end = format(addDays(parseISO(plantings[plantings.length - 1].planting_date), dap), "yyyy-MM-dd");

    return { windows: wins, windowStart: start, windowEnd: end };
  }, [plantings, dap]);

  // Build chart data
  const chartData = useMemo(() => {
    if (!windows.length || !windowStart || !windowEnd) return [];

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    // Expand chart range to include ±5 day margins
    const chartStartDate = addDays(parseISO(windowStart), -7);
    const chartEndDate = addDays(parseISO(windowEnd), 7);

    // Track which plantings have had their center date reached (for accumulation)
    const windowCenterReached = new Set<number>();

    const data: any[] = [];
    let current = chartStartDate;
    let accHa = 0;

    while (current <= chartEndDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      const dateLabel = format(current, "dd/MM");
      const inWindow = dateStr >= windowStart && dateStr <= windowEnd;
      const entry: any = { date: dateStr, dateLabel, isToday: dateStr === todayStr };

      let totalHaDay = 0;
      windows.forEach((w) => {
        const isCenter = dateStr === w.centerDate;
        const key = `p${w.index}`;
        // Show bar only on the center date
        entry[key] = isCenter ? w.area_ha : 0;
        if (isCenter) totalHaDay += w.area_ha;

        // Accumulate area only at center date
        if (isCenter && !windowCenterReached.has(w.index)) {
          windowCenterReached.add(w.index);
          accHa += w.area_ha;
        }
      });

      entry.totalHa = totalHaDay;
      entry.accHa = Math.round(accHa * 10) / 10;
      entry.inWindow = inWindow;

      data.push(entry);
      current = addDays(current, 1);
    }

    return data;
  }, [windows, windowStart, windowEnd]);

  // KPI stats
  const kpis = useMemo(() => {
    if (!windows.length || !windowStart || !windowEnd) return null;

    const today = new Date();
    const daysToStart = differenceInDays(parseISO(windowStart), today);
    const windowTotalDays = differenceInDays(parseISO(windowEnd), parseISO(windowStart)) + 1;
    const totalFemaleArea = plantings.reduce((s, p) => s + p.area_ha, 0);

    return { daysToStart, windowTotalDays, totalFemaleArea };
  }, [windows, windowStart, windowEnd, plantings]);

  const hasDetStarted = detRecords.length > 0;

  // Table data with status
  const tableData = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    return windows.map(w => {
      const daysToCenter = differenceInDays(parseISO(w.centerDate), today);
      const inWindow = todayStr >= windowStart && todayStr <= windowEnd;

      let status: string;
      if (hasDetStarted) status = "em_andamento";
      else if (todayStr > windowEnd) status = "atrasado";
      else if (inWindow) status = "na_janela";
      else if (daysToCenter <= 10) status = "aproximando";
      else status = "aguardando";

      return { ...w, daysToCenter, inWindow, status };
    });
  }, [windows, hasDetStarted, windowStart, windowEnd]);

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
          <Label className="text-xs">DAP despendoamento</Label>
          <Input
            type="number" min={30} max={120} value={dap}
            onChange={e => setDap(Number(e.target.value) || 55)}
            className="w-24 h-8 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards — 2 cards only */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">Início da Janela</p>
              <p className="text-sm font-bold">{format(parseISO(windowStart), "dd/MM/yyyy")}</p>
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
              <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">Fim da Janela</p>
              <p className="text-sm font-bold">{format(parseISO(windowEnd), "dd/MM/yyyy")}</p>
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
          <h4 className="font-medium text-xs mb-3">Janela de Despendoamento (DAP {dap})</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} height={30} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} label={{ value: "ha", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} label={{ value: "ha acum.", angle: 90, position: "insideRight", fontSize: 10 }} />
              <Tooltip content={<ForecastTooltip windows={windows} windowStart={windowStart} windowEnd={windowEnd} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Unified window shading */}
              {(() => {
                const startLabel = chartData.find(d => d.date === windowStart)?.dateLabel;
                const endLabel = chartData.find(d => d.date === windowEnd)?.dateLabel;
                if (!startLabel || !endLabel) return null;
                return (
                  <ReferenceArea
                    yAxisId="left"
                    x1={startLabel}
                    x2={endLabel}
                    fill="#4CAF50"
                    fillOpacity={0.08}
                    stroke="#4CAF50"
                    strokeOpacity={0.3}
                    strokeWidth={1}
                  />
                );
              })()}

              {/* Center date lines for each planting */}
              {windows.map((w) => {
                const centerLabel = chartData.find(d => d.date === w.centerDate)?.dateLabel;
                if (!centerLabel) return null;
                return (
                  <ReferenceLine
                    key={`center-${w.index}`}
                    yAxisId="left"
                    x={centerLabel}
                    stroke={w.color}
                    strokeWidth={2}
                  />
                );
              })}

              {/* Bars per planting at center date */}
              {windows.map((w) => (
                <Bar
                  key={`bar-${w.index}`}
                  yAxisId="left"
                  dataKey={`p${w.index}`}
                  name={`${format(parseISO(w.planting_date), "dd/MM")} (${w.area_ha.toFixed(0)}ha)`}
                  fill={w.color}
                  fillOpacity={0.85}
                  stackId="ha"
                  radius={[2, 2, 0, 0]}
                />
              ))}

              {/* Accumulated line */}
              <Line
                yAxisId="right"
                type="stepAfter"
                dataKey="accHa"
                name="ha acumulados"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                strokeOpacity={0.6}
                dot={false}
              />

              {/* TODAY reference line */}
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

              {/* Center date labels */}
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
                      value: `${w.label} ${format(parseISO(w.centerDate), "dd/MM")}`,
                      position: "insideTop",
                      fontSize: 9,
                      fontWeight: "bold",
                      fill: w.color,
                      dy: -20,
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
                  <TableHead className="text-xs">Data Central</TableHead>
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
                    <TableCell className="text-xs font-semibold">{format(parseISO(w.centerDate), "dd/MM/yyyy")}</TableCell>
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
          <div className="p-3 border-t text-xs text-muted-foreground">
            Janela unificada: {format(parseISO(windowStart), "dd/MM/yyyy")} → {format(parseISO(windowEnd), "dd/MM/yyyy")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom tooltip
function ForecastTooltip({ active, payload, windows, windowStart, windowEnd }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const today = new Date();
  const recordDate = parseISO(data.date);
  const daysDiff = differenceInDays(recordDate, today);
  const inWindow = data.date >= windowStart && data.date <= windowEnd;

  return (
    <div className="bg-popover border rounded-lg p-4 shadow-lg text-xs space-y-2 max-w-[320px]">
      <div className="flex items-center justify-between pb-2 border-b">
        <p className="font-bold text-base">{format(recordDate, "dd/MM/yyyy")}</p>
        <span className={daysDiff === 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
          {daysDiff > 0 ? `Em ${daysDiff} dias` : daysDiff === 0 ? "HOJE" : `Há ${Math.abs(daysDiff)} dias`}
        </span>
      </div>

      {inWindow && <p className="text-green-600 text-xs font-medium">✅ Dentro da janela de despendoamento</p>}

      {data.totalHa > 0 && (
        <p className="font-semibold text-sm">
          Hectares no centro: <span className="text-primary">{data.totalHa.toFixed(1)} ha</span>
        </p>
      )}

      <div className="space-y-1.5 pt-1">
        {windows.map((w: any) => {
          const isCenter = data.date === w.centerDate;
          return (
            <div key={w.index} className={`flex items-center gap-2 p-1.5 rounded ${isCenter ? "bg-primary/10 border border-primary/20" : ""}`}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
              <span className="flex-1">
                <span className="font-medium">{w.label}</span> ({w.area_ha.toFixed(0)}ha)
              </span>
              <span className={isCenter ? "font-bold text-primary" : "text-muted-foreground"}>
                {isCenter ? "CENTRO (DAP)" : "—"}
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
