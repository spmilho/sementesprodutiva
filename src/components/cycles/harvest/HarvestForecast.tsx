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
  cycleDays: number;
}

interface PlantingEntry {
  planting_date: string;
  area_ha: number;
}

const COLORS = ["#1E88E5", "#4CAF50", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4", "#795548", "#607D8B"];
const MARGIN_DAYS = 7;

export default function HarvestForecast({ cycleId, cycleDays: defaultCycleDays }: Props) {
  const sb = supabase as any;
  const [cycleDays, setCycleDays] = useState(defaultCycleDays || 130);

  const { data: plantingActuals = [] } = useQuery({
    queryKey: ["harvest-forecast-actual", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_actual")
        .select("planting_date, actual_area, type")
        .eq("cycle_id", cycleId).eq("type", "female").is("deleted_at", null)
        .order("planting_date");
      return data || [];
    },
  });

  const { data: plantingPlans = [] } = useQuery({
    queryKey: ["harvest-forecast-plan", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_plan")
        .select("planned_date, planned_area, type")
        .eq("cycle_id", cycleId).eq("type", "female").is("deleted_at", null)
        .order("planned_date");
      return data || [];
    },
  });

  const { data: harvestRecords = [] } = useQuery({
    queryKey: ["harvest-forecast-records", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("harvest_records")
        .select("harvest_date, area_harvested_ha")
        .eq("cycle_id", cycleId).is("deleted_at", null)
        .order("harvest_date");
      return data || [];
    },
  });

  const dataSource = plantingActuals.length > 0 ? "actual" : (plantingPlans.length > 0 ? "plan" : "none");

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

  const { windows, windowStart, windowEnd, marginStart, marginEnd } = useMemo(() => {
    if (!plantings.length) return { windows: [], windowStart: "", windowEnd: "", marginStart: "", marginEnd: "" };

    const wins = plantings.map((p, i) => {
      const center = addDays(parseISO(p.planting_date), cycleDays);
      return {
        ...p,
        index: i,
        label: `P${i + 1}`,
        centerDate: format(center, "yyyy-MM-dd"),
        color: COLORS[i % COLORS.length],
      };
    });

    const start = format(addDays(parseISO(plantings[0].planting_date), cycleDays), "yyyy-MM-dd");
    const end = format(addDays(parseISO(plantings[plantings.length - 1].planting_date), cycleDays), "yyyy-MM-dd");
    const mStart = format(addDays(parseISO(plantings[0].planting_date), cycleDays - MARGIN_DAYS), "yyyy-MM-dd");
    const mEnd = format(addDays(parseISO(plantings[plantings.length - 1].planting_date), cycleDays + MARGIN_DAYS), "yyyy-MM-dd");

    return { windows: wins, windowStart: start, windowEnd: end, marginStart: mStart, marginEnd: mEnd };
  }, [plantings, cycleDays]);

  const chartData = useMemo(() => {
    if (!windows.length || !marginStart || !marginEnd) return [];

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const chartStartDate = addDays(parseISO(marginStart), -5);
    const chartEndDate = addDays(parseISO(marginEnd), 5);

    const windowCenterReached = new Set<number>();
    const data: any[] = [];
    let current = chartStartDate;
    let accHa = 0;

    while (current <= chartEndDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      const dateLabel = format(current, "dd/MM");
      const inWindow = dateStr >= windowStart && dateStr <= windowEnd;
      const inMargin = (dateStr >= marginStart && dateStr < windowStart) || (dateStr > windowEnd && dateStr <= marginEnd);
      const entry: any = { date: dateStr, dateLabel, isToday: dateStr === todayStr };

      let totalHaDay = 0;
      windows.forEach((w) => {
        const isCenter = dateStr === w.centerDate;
        const key = `p${w.index}`;
        entry[key] = isCenter ? w.area_ha : 0;
        if (isCenter) totalHaDay += w.area_ha;

        if (isCenter && !windowCenterReached.has(w.index)) {
          windowCenterReached.add(w.index);
          accHa += w.area_ha;
        }
      });

      entry.totalHa = totalHaDay;
      entry.accHa = Math.round(accHa * 10) / 10;
      entry.inWindow = inWindow;
      entry.inMargin = inMargin;

      data.push(entry);
      current = addDays(current, 1);
    }

    return data;
  }, [windows, windowStart, windowEnd, marginStart, marginEnd]);

  const kpis = useMemo(() => {
    if (!windows.length || !windowStart || !windowEnd) return null;

    const today = new Date();
    const daysToStart = differenceInDays(parseISO(windowStart), today);
    const windowTotalDays = differenceInDays(parseISO(windowEnd), parseISO(windowStart)) + 1;
    const marginTotalDays = differenceInDays(parseISO(marginEnd), parseISO(marginStart)) + 1;
    const totalFemaleArea = plantings.reduce((s, p) => s + p.area_ha, 0);

    return { daysToStart, windowTotalDays, marginTotalDays, totalFemaleArea };
  }, [windows, windowStart, windowEnd, marginStart, marginEnd, plantings]);

  const hasHarvestStarted = harvestRecords.length > 0;

  const tableData = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    return windows.map(w => {
      const daysToCenter = differenceInDays(parseISO(w.centerDate), today);
      const earlyDate = format(addDays(parseISO(w.planting_date), cycleDays - MARGIN_DAYS), "yyyy-MM-dd");
      const lateDate = format(addDays(parseISO(w.planting_date), cycleDays + MARGIN_DAYS), "yyyy-MM-dd");

      let status: string;
      if (hasHarvestStarted) status = "em_andamento";
      else if (todayStr > lateDate) status = "atrasado";
      else if (todayStr >= earlyDate && todayStr <= lateDate) status = "na_janela";
      else if (daysToCenter <= 15) status = "aproximando";
      else status = "aguardando";

      return { ...w, daysToCenter, earlyDate, lateDate, status };
    });
  }, [windows, hasHarvestStarted, cycleDays]);

  if (!plantings.length) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-md border-dashed text-center">
        🌾 Registre o planejamento ou plantio real da fêmea para gerar a previsão de colheita.
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayLabel = chartData.find(d => d.date === todayStr)?.dateLabel;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🌾 Previsão de Colheita
        </h3>
        <Badge variant={dataSource === "actual" ? "default" : "secondary"} className="text-xs">
          {dataSource === "actual" ? "Plantio Realizado" : "Planejamento"}
        </Badge>
      </div>

      {/* Editable params */}
      <div className="flex gap-4 items-end flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Ciclo do material (dias)</Label>
          <Input
            type="number" min={80} max={200} value={cycleDays}
            onChange={e => setCycleDays(Number(e.target.value) || 130)}
            className="w-24 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Margem (± dias)</Label>
          <Input
            type="number" value={MARGIN_DAYS} disabled
            className="w-20 h-8 text-sm bg-muted"
          />
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs text-muted-foreground">Janela Ideal</p>
              <p className="text-sm font-bold">{format(parseISO(windowStart), "dd/MM/yyyy")} → {format(parseISO(windowEnd), "dd/MM/yyyy")}</p>
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
              <Target className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xs text-muted-foreground">Janela c/ Margem (±{MARGIN_DAYS} dias)</p>
              <p className="text-sm font-bold">{format(parseISO(marginStart), "dd/MM/yyyy")} → {format(parseISO(marginEnd), "dd/MM/yyyy")}</p>
              <p className="text-xs text-muted-foreground">
                {kpis.marginTotalDays} dias • {kpis.totalFemaleArea.toFixed(0)} ha
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs text-muted-foreground">Área Total Fêmea</p>
              <p className="text-sm font-bold">{kpis.totalFemaleArea.toFixed(1)} ha</p>
              <p className="text-xs text-muted-foreground">
                {plantings.length} lote(s) de plantio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-xs mb-3">Janela de Colheita (Ciclo {cycleDays} dias ± {MARGIN_DAYS})</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} height={30} />
              <YAxis yAxisId="left" tick={{ fontSize: 9 }} label={{ value: "ha", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} label={{ value: "ha acum.", angle: 90, position: "insideRight", fontSize: 10 }} />
              <Tooltip content={<ForecastTooltip windows={windows} windowStart={windowStart} windowEnd={windowEnd} marginStart={marginStart} marginEnd={marginEnd} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Margin shading (±7 days) */}
              {(() => {
                const mStartLabel = chartData.find(d => d.date === marginStart)?.dateLabel;
                const mEndLabel = chartData.find(d => d.date === marginEnd)?.dateLabel;
                if (!mStartLabel || !mEndLabel) return null;
                return (
                  <ReferenceArea
                    yAxisId="left"
                    x1={mStartLabel}
                    x2={mEndLabel}
                    fill="#FF9800"
                    fillOpacity={0.05}
                    stroke="#FF9800"
                    strokeOpacity={0.2}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })()}

              {/* Ideal window shading */}
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
                    fillOpacity={0.1}
                    stroke="#4CAF50"
                    strokeOpacity={0.4}
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
          <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-green-500/20 border border-green-500/40 rounded-sm" /> Janela ideal ({cycleDays} dias)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 bg-amber-500/10 border border-amber-500/30 border-dashed rounded-sm" /> Margem ±{MARGIN_DAYS} dias</span>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <h4 className="font-semibold text-sm">📋 Previsão de Colheita por Data de Plantio</h4>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Plantio Fêmea</TableHead>
                  <TableHead className="text-xs">Lote</TableHead>
                  <TableHead className="text-xs text-right">Área (ha)</TableHead>
                  <TableHead className="text-xs text-right">Ciclo</TableHead>
                  <TableHead className="text-xs">Data Ideal</TableHead>
                  <TableHead className="text-xs">Janela (±{MARGIN_DAYS}d)</TableHead>
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
                    <TableCell className="text-xs text-right font-mono">{cycleDays}d</TableCell>
                    <TableCell className="text-xs font-semibold">{format(parseISO(w.centerDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(parseISO(w.earlyDate), "dd/MM")} — {format(parseISO(w.lateDate), "dd/MM")}
                    </TableCell>
                    <TableCell className="text-xs">
                      <DaysCell days={w.daysToCenter} hasRecords={hasHarvestStarted} />
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
            Janela ideal: {format(parseISO(windowStart), "dd/MM/yyyy")} → {format(parseISO(windowEnd), "dd/MM/yyyy")}
            {" | "}Com margem: {format(parseISO(marginStart), "dd/MM/yyyy")} → {format(parseISO(marginEnd), "dd/MM/yyyy")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Custom tooltip
function ForecastTooltip({ active, payload, windows, windowStart, windowEnd, marginStart, marginEnd }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const today = new Date();
  const recordDate = parseISO(data.date);
  const daysDiff = differenceInDays(recordDate, today);
  const inWindow = data.date >= windowStart && data.date <= windowEnd;
  const inMargin = (data.date >= marginStart && data.date <= marginEnd) && !inWindow;

  return (
    <div className="bg-popover border rounded-lg p-4 shadow-lg text-xs space-y-2 max-w-[320px]">
      <div className="flex items-center justify-between pb-2 border-b">
        <p className="font-bold text-base">{format(recordDate, "dd/MM/yyyy")}</p>
        <span className={daysDiff === 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
          {daysDiff > 0 ? `Em ${daysDiff} dias` : daysDiff === 0 ? "HOJE" : `Há ${Math.abs(daysDiff)} dias`}
        </span>
      </div>

      {inWindow && <p className="text-green-600 text-xs font-medium">✅ Dentro da janela ideal de colheita</p>}
      {inMargin && <p className="text-amber-600 text-xs font-medium">⚠️ Na margem (±7 dias)</p>}

      {data.totalHa > 0 && (
        <p className="font-semibold text-sm">
          📊 {data.totalHa.toFixed(1)} ha entram na janela
        </p>
      )}

      {windows.map((w: any) => {
        const val = data[`p${w.index}`];
        if (!val || val <= 0) return null;
        return (
          <div key={w.index} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }} />
            <span>{w.label}: {val.toFixed(1)} ha (plantio {format(parseISO(w.planting_date), "dd/MM")})</span>
          </div>
        );
      })}

      <div className="pt-1 border-t text-muted-foreground">
        Acumulado: <strong>{data.accHa} ha</strong>
      </div>
    </div>
  );
}

function DaysCell({ days, hasRecords }: { days: number; hasRecords: boolean }) {
  if (hasRecords) return <span className="text-green-600 font-medium text-xs">🌾 Em colheita</span>;
  if (days === 0) return <span className="text-destructive font-bold text-xs">HOJE</span>;
  if (days < 0) return <span className="text-destructive font-medium text-xs">Há {Math.abs(days)}d</span>;
  if (days <= 10) return <span className="text-amber-600 font-medium text-xs">{days}d</span>;
  return <span className="text-muted-foreground text-xs">{days}d</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    em_andamento: { label: "🌾 Colhendo", class: "border-green-500 text-green-700" },
    atrasado: { label: "🔴 Atrasado", class: "border-red-500 text-red-700" },
    na_janela: { label: "🟢 Na janela", class: "border-green-500 text-green-700" },
    aproximando: { label: "🟡 Aproximando", class: "border-amber-400 text-amber-600" },
    aguardando: { label: "⏳ Aguardando", class: "border-muted text-muted-foreground" },
  };
  const s = map[status] || map.aguardando;
  return <Badge variant="outline" className={`text-[10px] ${s.class}`}>{s.label}</Badge>;
}
