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

function calcGDU(tmax: number | null, tmin: number | null): number {
  if (tmax == null || tmin == null) return 0;
  const adjMax = Math.min(tmax, T_MAX_CAP);
  const adjMin = Math.max(tmin, T_BASE);
  const gdu = (adjMax + adjMin) / 2 - T_BASE;
  return Math.max(0, gdu);
}

// Map phenology date -> stage label
function buildPhenologyMap(records: PhenologyRecord[]): Map<string, string> {
  // Sort by date, then build a map of date -> latest stage
  const sorted = [...records].sort((a, b) => a.observation_date.localeCompare(b.observation_date));
  const dateStageMap = new Map<string, string>();
  sorted.forEach(r => {
    dateStageMap.set(r.observation_date, r.stage);
  });
  return dateStageMap;
}

// Assign a phenology stage to each weather date based on most recent observation
function assignStages(weatherDates: string[], phenologyRecords: PhenologyRecord[]): Map<string, string> {
  const sorted = [...phenologyRecords].sort((a, b) => a.observation_date.localeCompare(b.observation_date));
  const result = new Map<string, string>();
  
  for (const date of weatherDates) {
    let currentStage = "";
    for (const pr of sorted) {
      if (pr.observation_date <= date) {
        currentStage = pr.stage;
      } else {
        break;
      }
    }
    if (currentStage) result.set(date, currentStage);
  }
  return result;
}

// Custom tick that shows stage below date
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

  const sortedData = useMemo(() => {
    return [...records]
      .sort((a, b) => a.record_date.localeCompare(b.record_date))
      .map(r => ({
        ...r,
        dateLabel: new Date(r.record_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      }));
  }, [records]);

  // Build stage map for date labels
  const stageMap = useMemo(() => {
    const weatherDates = sortedData.map(r => r.record_date);
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
      const match = sortedData.find(r => r.record_date === date);
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

  const stats = useMemo(() => {
    if (records.length === 0) return null;
    const temps = records.filter(r => r.temp_avg_c != null).map(r => r.temp_avg_c!);
    const humids = records.filter(r => r.humidity_avg_pct != null).map(r => r.humidity_avg_pct!);
    const winds = records.filter(r => r.wind_avg_kmh != null).map(r => r.wind_avg_kmh!);
    const etos = records.filter(r => r.eto_mm != null).map(r => r.eto_mm!);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const totalGdu = gduData.length > 0 ? gduData[gduData.length - 1].accGdu : 0;
    return {
      avgTemp: avg(temps),
      maxTemp: temps.length > 0 ? Math.max(...records.filter(r => r.temp_max_c != null).map(r => r.temp_max_c!)) : 0,
      minTemp: temps.length > 0 ? Math.min(...records.filter(r => r.temp_min_c != null).map(r => r.temp_min_c!)) : 0,
      avgHumidity: avg(humids),
      avgWind: avg(winds),
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

      {/* Wind + ETo + Precipitation chart */}
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