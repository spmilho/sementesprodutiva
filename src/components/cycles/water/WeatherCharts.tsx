import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import { Thermometer, Droplets, Wind, Sun, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WeatherRecord {
  id: string;
  record_date: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  temp_avg_c: number | null;
  humidity_max_pct: number | null;
  humidity_min_pct: number | null;
  humidity_avg_pct: number | null;
  wind_max_kmh: number | null;
  wind_avg_kmh: number | null;
  radiation_mj: number | null;
  eto_mm: number | null;
  precipitation_mm: number | null;
}

interface PhenologyRecord {
  id: string;
  observation_date: string;
  stage: string;
  type: string;
}

interface Props {
  records: WeatherRecord[];
  cycleId?: string;
}

const T_BASE = 10;
const T_MAX_CAP = 30;

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const br = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateString(parsed);
  }

  return null;
}

function dateKeyToTimestamp(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).getTime();
}

function toDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function calcGDU(tmax: number | null, tmin: number | null): number {
  if (tmax == null || tmin == null) return 0;
  const adjMax = Math.min(tmax, T_MAX_CAP);
  const adjMin = Math.max(tmin, T_BASE);
  const gdu = (adjMax + adjMin) / 2 - T_BASE;
  return Math.max(0, gdu);
}

function buildPhenologyMap(records: PhenologyRecord[]): Map<string, string> {
  const sorted = [...records]
    .map((r) => ({ ...r, normalizedDate: normalizeDateKey(r.observation_date) }))
    .filter((r) => !!r.normalizedDate)
    .sort((a, b) => dateKeyToTimestamp(a.normalizedDate!) - dateKeyToTimestamp(b.normalizedDate!));

  const dateStageMap = new Map<string, string>();
  sorted.forEach((r) => {
    dateStageMap.set(r.normalizedDate!, r.stage);
  });
  return dateStageMap;
}

function assignStages(weatherDates: string[], phenologyRecords: PhenologyRecord[]): Map<string, string> {
  const sortedPhenology = [...phenologyRecords]
    .map((r) => ({ ...r, normalizedDate: normalizeDateKey(r.observation_date) }))
    .filter((r) => !!r.normalizedDate)
    .sort((a, b) => dateKeyToTimestamp(a.normalizedDate!) - dateKeyToTimestamp(b.normalizedDate!));

  const result = new Map<string, string>();

  for (const date of weatherDates) {
    const dateTs = dateKeyToTimestamp(date);
    let currentStage = "";

    for (const pr of sortedPhenology) {
      if (dateKeyToTimestamp(pr.normalizedDate!) <= dateTs) {
        currentStage = pr.stage;
      } else {
        break;
      }
    }

    if (currentStage) result.set(date, currentStage);
  }

  return result;
}

function StageTick({ x, y, payload, stageMap }: any) {
  const stage = stageMap?.get(payload?.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={9} fill="hsl(var(--muted-foreground))">
        {payload?.value}
      </text>
      {stage && (
        <text x={0} y={0} dy={24} textAnchor="middle" fontSize={8} fontWeight="bold" fill="hsl(var(--primary))">
          {stage}
        </text>
      )}
    </g>
  );
}

export default function WeatherCharts({ records, cycleId }: Props) {
  // Fetch phenology records for this cycle
  const { data: phenologyRecords = [] } = useQuery({
    queryKey: ["phenology_records_for_weather", cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await (supabase as any)
        .from("phenology_records")
        .select("id, observation_date, stage, type")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("observation_date");
      if (error) throw error;
      return data as PhenologyRecord[];
    },
    enabled: !!cycleId,
  });

  // Fetch female planting dates (prioriza realizado; fallback para planejamento)
  const { data: femalePlantingDates = [] } = useQuery({
    queryKey: ["female_planting_dates_for_gdu", cycleId],
    queryFn: async () => {
      if (!cycleId) return [] as string[];

      const [actualRes, planRes] = await Promise.all([
        (supabase as any)
          .from("planting_actual")
          .select("planting_date")
          .eq("cycle_id", cycleId)
          .eq("type", "female")
          .is("deleted_at", null)
          .order("planting_date"),
        (supabase as any)
          .from("planting_plan")
          .select("planned_date")
          .eq("cycle_id", cycleId)
          .eq("type", "female")
          .is("deleted_at", null)
          .order("planned_date"),
      ]);

      if (actualRes.error) throw actualRes.error;
      if (planRes.error) throw planRes.error;

      const actualDates = (actualRes.data || [])
        .map((p: any) => normalizeDateKey(p.planting_date))
        .filter(Boolean) as string[];

      const planDates = (planRes.data || [])
        .map((p: any) => normalizeDateKey(p.planned_date))
        .filter(Boolean) as string[];

      const sourceDates = actualDates.length > 0 ? actualDates : planDates;
      return Array.from(new Set(sourceDates)).sort((a, b) => a.localeCompare(b));
    },
    enabled: !!cycleId,
  });

  const sortedData = useMemo(() => {
    return [...records]
      .map((r) => {
        const normalizedDate = normalizeDateKey(r.record_date);
        const safeDate = normalizedDate || r.record_date;
        return {
          ...r,
          record_date: safeDate,
          dateLabel: normalizedDate ? toDateLabel(normalizedDate) : String(r.record_date),
          _sortTs: normalizedDate ? dateKeyToTimestamp(normalizedDate) : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a._sortTs - b._sortTs);
  }, [records]);

  // Build stage map for date labels
  const stageMap = useMemo(() => {
    const weatherDates = sortedData
      .map((r) => normalizeDateKey(r.record_date))
      .filter(Boolean) as string[];
    return assignStages(weatherDates, phenologyRecords);
  }, [sortedData, phenologyRecords]);

  // Map dateLabel -> stage for charts
  const dateLabelStageMap = useMemo(() => {
    const map = new Map<string, string>();
    sortedData.forEach(r => {
      const stage = stageMap.get(r.record_date);
      if (stage) map.set(r.dateLabel, stage);
    });
    return map;
  }, [sortedData, stageMap]);

  // Phenology transition dates for reference lines
  const stageTransitions = useMemo(() => {
    const dateMap = buildPhenologyMap(phenologyRecords);
    const transitions: { dateLabel: string; stage: string }[] = [];
    dateMap.forEach((stage, date) => {
      const match = sortedData.find((r) => normalizeDateKey(r.record_date) === date);
      if (match) {
        transitions.push({ dateLabel: match.dateLabel, stage });
      }
    });
    return transitions;
  }, [phenologyRecords, sortedData]);

  // GDU data
  const gduData = useMemo(() => {
    let accGdu = 0;
    return sortedData.map(r => {
      const dailyGdu = calcGDU(r.temp_max_c, r.temp_min_c);
      accGdu += dailyGdu;
      const stage = stageMap.get(r.record_date);
      return {
        dateLabel: r.dateLabel,
        record_date: r.record_date,
        dailyGdu: Math.round(dailyGdu * 10) / 10,
        accGdu: Math.round(accGdu),
        stage: stage || "",
      };
    });
  }, [sortedData, stageMap]);

  // GDU per female planting date — each planting date gets its own accumulated GDU line
  const PLANTING_COLORS = [
    "hsl(280 70% 50%)", "hsl(200 80% 45%)", "hsl(340 70% 50%)",
    "hsl(160 70% 40%)", "hsl(30 80% 50%)", "hsl(220 70% 55%)",
  ];

  const uniqueFemalePlantingDates = useMemo(() => {
    const seen = new Set<string>();
    return femalePlantingDates
      .filter(Boolean)
      .filter((d) => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });
  }, [femalePlantingDates]);

  const gduByPlantingData = useMemo(() => {
    if (uniqueFemalePlantingDates.length === 0 || sortedData.length === 0) return [];

    // Build a map of date -> daily GDU from weather records
    const dailyGduMap = new Map<string, number>();
    sortedData.forEach(r => {
      const key = normalizeDateKey(r.record_date);
      if (key) {
        dailyGduMap.set(key, calcGDU(r.temp_max_c, r.temp_min_c));
      }
    });

    // Determine full date range: from earliest planting date to last weather date
    const earliestPlanting = uniqueFemalePlantingDates.reduce((a, b) => a < b ? a : b);
    const lastWeatherDate = sortedData[sortedData.length - 1].record_date;
    const startTs = dateKeyToTimestamp(earliestPlanting);
    const endTs = dateKeyToTimestamp(lastWeatherDate);

    // Generate all dates from earliest planting to last weather record
    const allDates: string[] = [];
    for (let ts = startTs; ts <= endTs; ts += 86400000) {
      const d = new Date(ts);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      allDates.push(`${yyyy}-${mm}-${dd}`);
    }

    // For each date in full range, compute accumulated GDU per planting date
    // HU starts D+1 after planting (e.g. planted 03 -> count from 04)
    return allDates.map(dateStr => {
      const currentTs = dateKeyToTimestamp(dateStr);
      const label = toDateLabel(dateStr);
      const row: Record<string, any> = { dateLabel: label, record_date: dateStr };

      uniqueFemalePlantingDates.forEach((plantDate) => {
        const plantTs = dateKeyToTimestamp(plantDate);
        // D+1: skip the planting day itself, start counting from the next day
        const startTs = plantTs + 86400000;
        if (currentTs < startTs) {
          row[`gdu_${plantDate}`] = null;
          return;
        }
        let acc = 0;
        for (const [dateKey, dailyGdu] of dailyGduMap.entries()) {
          const ts = dateKeyToTimestamp(dateKey);
          if (ts >= startTs && ts <= currentTs) {
            acc += dailyGdu;
          }
        }
        row[`gdu_${plantDate}`] = Math.round(acc);
      });

      return row;
    });
  }, [sortedData, uniqueFemalePlantingDates]);

  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const temps = records.filter(r => r.temp_avg_c != null).map(r => r.temp_avg_c!);
    const humids = records.filter(r => r.humidity_avg_pct != null).map(r => r.humidity_avg_pct!);
    const winds = records.filter(r => r.wind_avg_kmh != null).map(r => r.wind_avg_kmh!);
    const etos = records.filter(r => r.eto_mm != null).map(r => r.eto_mm!);
    const radiations = records.filter(r => r.radiation_mj != null).map(r => r.radiation_mj!);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const totalGdu = gduData.length > 0 ? gduData[gduData.length - 1].accGdu : 0;
    return {
      avgTemp: avg(temps),
      maxTemp: temps.length > 0 ? Math.max(...records.filter(r => r.temp_max_c != null).map(r => r.temp_max_c!)) : 0,
      minTemp: temps.length > 0 ? Math.min(...records.filter(r => r.temp_min_c != null).map(r => r.temp_min_c!)) : 0,
      avgHumidity: avg(humids),
      avgWind: avg(winds),
      avgRadiation: avg(radiations),
      totalEto: etos.reduce((a, b) => a + b, 0),
      totalPrecip: records.filter(r => r.precipitation_mm != null).reduce((a, r) => a + r.precipitation_mm!, 0),
      totalGdu,
      days: records.length,
    };
  }, [records, gduData]);

  if (records.length === 0) return null;

  const hasTemp = sortedData.some(r => r.temp_max_c != null || r.temp_min_c != null);
  const hasHumidity = sortedData.some(r => r.humidity_avg_pct != null);
  const hasWind = sortedData.some(r => r.wind_avg_kmh != null);
  const hasEto = sortedData.some(r => r.eto_mm != null);
  const hasGdu = gduData.some(r => r.dailyGdu > 0);
  const hasRadiation = sortedData.some(r => r.radiation_mj != null);

  const renderStageReferenceLines = (yAxisId?: string) =>
    stageTransitions.map((t, i) => (
      <ReferenceLine
        key={`stage-${i}`}
        x={t.dateLabel}
        {...(yAxisId ? { yAxisId } : {})}
        stroke="hsl(var(--primary))"
        strokeDasharray="4 4"
        strokeOpacity={0.6}
        label={{
          value: t.stage,
          position: "top",
          fontSize: 9,
          fontWeight: "bold",
          fill: "hsl(var(--primary))",
        }}
      />
    ));

  const chartXAxisProps = {
    dataKey: "dateLabel" as const,
    tick: (props: any) => <StageTick {...props} stageMap={dateLabelStageMap} />,
    height: 40,
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Sun className="h-4 w-4" />
        Dados Meteorológicos ({stats?.days} dias)
      </h3>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Thermometer className="h-6 w-6 text-red-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Temp. Média</p><p className="text-sm font-bold">{stats.avgTemp.toFixed(1)}°C</p><p className="text-[10px] text-muted-foreground">{stats.minTemp.toFixed(1)} — {stats.maxTemp.toFixed(1)}</p></div>
          </CardContent></Card>
          {hasRadiation && stats.avgRadiation > 0 && (
            <Card><CardContent className="p-3 flex items-center gap-2">
              <Sun className="h-6 w-6 text-amber-500 shrink-0" />
              <div><p className="text-[10px] text-muted-foreground">Rad. Solar Média</p><p className="text-sm font-bold">{stats.avgRadiation.toFixed(1)} MJ/m²</p></div>
            </CardContent></Card>
          )}
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">UR Média</p><p className="text-sm font-bold">{stats.avgHumidity.toFixed(0)}%</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Wind className="h-6 w-6 text-gray-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Vento Médio</p><p className="text-sm font-bold">{stats.avgWind.toFixed(1)} km/h</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Sun className="h-6 w-6 text-yellow-500 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">ETo Total</p><p className="text-sm font-bold">{stats.totalEto.toFixed(1)} mm</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-3 flex items-center gap-2">
            <Droplets className="h-6 w-6 text-blue-800 shrink-0" />
            <div><p className="text-[10px] text-muted-foreground">Precip. Total</p><p className="text-sm font-bold">{stats.totalPrecip.toFixed(1)} mm</p></div>
          </CardContent></Card>
          {hasGdu && (
            <Card><CardContent className="p-3 flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500 shrink-0" />
              <div><p className="text-[10px] text-muted-foreground">GDU Acum.</p><p className="text-sm font-bold">{stats.totalGdu}</p></div>
            </CardContent></Card>
          )}
        </div>
      )}

      {/* GDU chart */}
      {hasGdu && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              Unidades de Calor — GDU/HU diário (Tbase={T_BASE}°C)
            </h4>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={gduData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} label={{ value: "GDU/dia", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} label={{ value: "GDU acum.", angle: 90, position: "insideRight", fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded-md p-2 shadow-md text-xs space-y-1">
                        <p className="font-medium">{label} {data?.stage && <span className="text-primary font-bold ml-1">[{data.stage}]</span>}</p>
                        {payload.map((p: any) => (
                          <p key={p.dataKey} style={{ color: p.color }}>
                            {p.name}: {p.value}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {renderStageReferenceLines("left")}
                <Bar yAxisId="left" dataKey="dailyGdu" name="GDU diário" fill="hsl(25 85% 55%)" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="accGdu" name="GDU acumulado" stroke="hsl(0 70% 45%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* HU Accumulated per Female Planting Block — mini dashboard */}
      {hasGdu && uniqueFemalePlantingDates.length > 0 && gduByPlantingData.length > 0 && (() => {
        const lastRow = gduByPlantingData[gduByPlantingData.length - 1];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {uniqueFemalePlantingDates.map((plantDate, i) => {
              const accValue = lastRow?.[`gdu_${plantDate}`];
              return (
                <Card key={plantDate}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <Flame className="h-6 w-6 shrink-0" style={{ color: PLANTING_COLORS[i % PLANTING_COLORS.length] }} />
                    <div>
                      <p className="text-[10px] text-muted-foreground">HU Fêmea {toDateLabel(plantDate)}</p>
                      <p className="text-sm font-bold">{accValue ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">D+1 a partir de {toDateLabel(plantDate)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })()}

      {/* GDU by Female Planting Date */}
      {hasGdu && uniqueFemalePlantingDates.length > 0 && gduByPlantingData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              GDU Acumulado por Data de Plantio — Fêmea (D+1)
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={gduByPlantingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis tick={{ fontSize: 9 }} label={{ value: "GDU acumulado", angle: -90, position: "insideLeft", fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border rounded-md p-2 shadow-md text-xs space-y-1">
                        <p className="font-medium">{label}</p>
                        {payload.filter((p: any) => p.value != null).map((p: any) => (
                          <p key={p.dataKey} style={{ color: p.color }}>
                            {p.name}: {p.value}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {uniqueFemalePlantingDates.map((plantDate, i) => (
                  <Line
                    key={plantDate}
                    type="monotone"
                    dataKey={`gdu_${plantDate}`}
                    name={`Fêmea ${toDateLabel(plantDate)}`}
                    stroke={PLANTING_COLORS[i % PLANTING_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Temperature chart */}
      {hasTemp && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Temperatura (°C)</h4>
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {renderStageReferenceLines()}
                <Area type="monotone" dataKey="temp_max_c" name="Máx" fill="hsl(0 70% 90%)" stroke="hsl(0 70% 50%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="temp_min_c" name="Mín" fill="hsl(210 70% 90%)" stroke="hsl(210 70% 50%)" fillOpacity={0.3} />
                <Line type="monotone" dataKey="temp_avg_c" name="Média" stroke="hsl(30 80% 50%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Humidity chart */}
      {hasHumidity && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Umidade Relativa (%)</h4>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {renderStageReferenceLines()}
                <Area type="monotone" dataKey="humidity_max_pct" name="UR Máx" fill="hsl(200 60% 85%)" stroke="hsl(200 60% 45%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="humidity_min_pct" name="UR Mín" fill="hsl(40 60% 85%)" stroke="hsl(40 60% 45%)" fillOpacity={0.3} />
                <Line type="monotone" dataKey="humidity_avg_pct" name="UR Média" stroke="hsl(200 80% 40%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radiação Solar chart */}
      {hasRadiation && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2 flex items-center gap-1">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              Radiação Solar (MJ/m²)
            </h4>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {renderStageReferenceLines()}
                <Area type="monotone" dataKey="radiation_mj" name="Rad. Solar" fill="hsl(45 90% 80%)" stroke="hsl(35 90% 50%)" fillOpacity={0.4} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {(hasWind || hasEto) && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-xs mb-2">Vento, ETo e Precipitação</h4>
            <ResponsiveContainer width="100%" height={270}>
              <ComposedChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis {...chartXAxisProps} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {renderStageReferenceLines("left")}
                {hasEto && <Bar yAxisId="left" dataKey="eto_mm" name="ETo (mm)" fill="hsl(45 80% 55%)" radius={[2, 2, 0, 0]} />}
                <Bar yAxisId="left" dataKey="precipitation_mm" name="Chuva (mm)" fill="hsl(210 70% 55%)" radius={[2, 2, 0, 0]} />
                {hasWind && <Line yAxisId="right" type="monotone" dataKey="wind_avg_kmh" name="Vento (km/h)" stroke="hsl(0 0% 50%)" strokeWidth={1.5} dot={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}