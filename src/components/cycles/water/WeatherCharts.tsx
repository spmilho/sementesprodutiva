import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ReferenceLine,
} from "recharts";
import { Thermometer, Droplets, Wind, Sun, Flame, RefreshCw, Loader2, ClipboardCopy, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useRole } from "@/hooks/useRole";
import { parseSpreadsheetDate } from "./weatherDateUtils";

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
  orgId?: string;
  pivotName?: string;
  hybridName?: string;
}

const T_BASE = 10;

function normalizeDateKey(value: string | null | undefined): string | null {
  return parseSpreadsheetDate(value);
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
  const adjMax = Math.min(tmax, 30);
  const adjMin = Math.max(tmin, T_BASE);
  return Math.max(0, (adjMax + adjMin) / 2 - T_BASE);
}

function normalizeTemperatureTriplet(
  tempMax: number | null,
  tempMin: number | null,
  tempAvg: number | null,
  humidityAvg: number | null,
): { tempMax: number | null; tempMin: number | null; tempAvg: number | null; humidityAvg: number | null } {
  // Detect humidity value stored as temp_avg (e.g. temp_avg=89.9 when temp_max=28)
  if (tempMax != null && tempAvg != null && tempAvg > 40 && tempMax < 45) {
    const realHumAvg = humidityAvg ?? tempAvg; // preserve if humidity already set
    const derivedAvg = tempMin != null ? (tempMax + tempMin) / 2 : null;
    return {
      tempMax,
      tempMin,
      tempAvg: derivedAvg,
      humidityAvg: humidityAvg == null ? tempAvg : humidityAvg,
    };
  }
  // Detect humidity value stored as temp_min (e.g. 79 when temp_max is 25)
  if (tempMax != null && tempMin != null && tempAvg != null && tempMin > 40 && tempMax < 40) {
    return { tempMax, tempMin: 2 * tempAvg - tempMax, tempAvg, humidityAvg };
  }
  // Handles known imported rotation pattern: [avg, max, min]
  if (tempMax != null && tempMin != null && tempAvg != null && tempMax < tempMin) {
    return {
      tempMax: tempMin,
      tempMin: tempAvg,
      tempAvg: tempMax,
      humidityAvg,
    };
  }
  return { tempMax, tempMin, tempAvg, humidityAvg };
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

export default function WeatherCharts({ records, cycleId, orgId, pivotName, hybridName }: Props) {
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { isAdmin } = useRole();
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

  // Generic fetch planting dates by type
  const fetchPlantingDates = async (type: string): Promise<string[]> => {
    if (!cycleId) return [];
    const [actualRes, planRes] = await Promise.all([
      (supabase as any)
        .from("planting_actual")
        .select("planting_date")
        .eq("cycle_id", cycleId)
        .eq("type", type)
        .is("deleted_at", null)
        .order("planting_date"),
      (supabase as any)
        .from("planting_plan")
        .select("planned_date")
        .eq("cycle_id", cycleId)
        .eq("type", type)
        .is("deleted_at", null)
        .order("planned_date"),
    ]);
    if (actualRes.error) throw actualRes.error;
    if (planRes.error) throw planRes.error;
    const actualDates = (actualRes.data || []).map((p: any) => normalizeDateKey(p.planting_date)).filter(Boolean) as string[];
    const planDates = (planRes.data || []).map((p: any) => normalizeDateKey(p.planned_date)).filter(Boolean) as string[];
    const sourceDates = actualDates.length > 0 ? actualDates : planDates;
    return Array.from(new Set(sourceDates)).sort((a, b) => a.localeCompare(b));
  };

  const { data: femalePlantingDates = [] } = useQuery({
    queryKey: ["female_planting_dates_for_gdu", cycleId],
    queryFn: () => fetchPlantingDates("female"),
    enabled: !!cycleId,
  });

  const { data: male1PlantingDates = [] } = useQuery({
    queryKey: ["male1_planting_dates_for_gdu", cycleId],
    queryFn: () => fetchPlantingDates("male_1"),
    enabled: !!cycleId,
  });

  const { data: male2PlantingDates = [] } = useQuery({
    queryKey: ["male2_planting_dates_for_gdu", cycleId],
    queryFn: () => fetchPlantingDates("male_2"),
    enabled: !!cycleId,
  });

  const sortedData = useMemo(() => {
    const mapped = [...records]
      .map((r) => {
        const normalizedDate = normalizeDateKey(r.record_date);
        const safeDate = normalizedDate || r.record_date;
        const normalizedTemps = normalizeTemperatureTriplet(r.temp_max_c, r.temp_min_c, r.temp_avg_c, r.humidity_avg_pct);

        return {
          ...r,
          temp_max_c: normalizedTemps.tempMax,
          temp_min_c: normalizedTemps.tempMin,
          temp_avg_c: normalizedTemps.tempAvg,
          humidity_avg_pct: normalizedTemps.humidityAvg,
          record_date: safeDate,
          dateLabel: normalizedDate ? toDateLabel(normalizedDate) : String(r.record_date),
          _sortTs: normalizedDate ? dateKeyToTimestamp(normalizedDate) : Number.POSITIVE_INFINITY,
        };
      })
      .sort((a, b) => a._sortTs - b._sortTs);

    // Deduplicate by record_date — keep latest created_at per date
    const byDate = new Map<string, typeof mapped[0]>();
    mapped.forEach((r) => {
      const existing = byDate.get(r.record_date);
      if (!existing || ((r as any).created_at || "") > ((existing as any).created_at || "")) {
        byDate.set(r.record_date, r);
      }
    });
    return Array.from(byDate.values()).sort((a, b) => a._sortTs - b._sortTs);
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

  const MALE1_COLORS = [
    "hsl(210 80% 50%)", "hsl(180 70% 40%)", "hsl(240 60% 55%)",
    "hsl(150 70% 45%)", "hsl(270 60% 50%)", "hsl(195 80% 45%)",
  ];

  const MALE2_COLORS = [
    "hsl(25 85% 50%)", "hsl(0 70% 50%)", "hsl(45 80% 45%)",
    "hsl(350 65% 50%)", "hsl(15 75% 55%)", "hsl(40 70% 50%)",
  ];

  const dedup = (dates: string[]) => {
    const seen = new Set<string>();
    return dates.filter(Boolean).filter((d) => { if (seen.has(d)) return false; seen.add(d); return true; });
  };

  const uniqueFemalePlantingDates = useMemo(() => dedup(femalePlantingDates), [femalePlantingDates]);
  const uniqueMale1PlantingDates = useMemo(() => dedup(male1PlantingDates), [male1PlantingDates]);
  const uniqueMale2PlantingDates = useMemo(() => dedup(male2PlantingDates), [male2PlantingDates]);

  // Build daily GDU map once
  const dailyGduMap = useMemo(() => {
    const m = new Map<string, number>();
    sortedData.forEach(r => {
      const key = normalizeDateKey(r.record_date);
      if (key) m.set(key, calcGDU(r.temp_max_c, r.temp_min_c));
    });
    return m;
  }, [sortedData]);

  // Generic builder for GDU by planting data
  const buildGduByPlanting = (plantingDates: string[], prefix: string) => {
    if (plantingDates.length === 0 || sortedData.length === 0) return [];
    const earliestPlanting = plantingDates.reduce((a, b) => a < b ? a : b);
    const lastWeatherDate = sortedData[sortedData.length - 1].record_date;
    const startTs = dateKeyToTimestamp(earliestPlanting);
    const endTs = dateKeyToTimestamp(lastWeatherDate);
    const allDates: string[] = [];
    const cursor = new Date(startTs);
    const endDate = new Date(endTs);
    while (cursor <= endDate) {
      allDates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return allDates.map(dateStr => {
      const currentTs = dateKeyToTimestamp(dateStr);
      const row: Record<string, any> = { dateLabel: toDateLabel(dateStr), record_date: dateStr };
      plantingDates.forEach((plantDate) => {
        const plantStartTs = dateKeyToTimestamp(plantDate) + 86400000;
        if (currentTs < plantStartTs) { row[`${prefix}_${plantDate}`] = null; return; }
        let acc = 0;
        for (const [dateKey, dailyGdu] of dailyGduMap.entries()) {
          const ts = dateKeyToTimestamp(dateKey);
          if (ts >= plantStartTs && ts <= currentTs) acc += dailyGdu;
        }
        row[`${prefix}_${plantDate}`] = Math.round(acc);
      });
      return row;
    });
  };

  const gduByPlantingData = useMemo(() => buildGduByPlanting(uniqueFemalePlantingDates, "gdu"), [sortedData, uniqueFemalePlantingDates, dailyGduMap]);
  const gduByMale1Data = useMemo(() => buildGduByPlanting(uniqueMale1PlantingDates, "gdu_m1"), [sortedData, uniqueMale1PlantingDates, dailyGduMap]);
  const gduByMale2Data = useMemo(() => buildGduByPlanting(uniqueMale2PlantingDates, "gdu_m2"), [sortedData, uniqueMale2PlantingDates, dailyGduMap]);

  const stats = useMemo(() => {
    if (sortedData.length === 0) return null;
    const temps = sortedData.filter(r => r.temp_avg_c != null).map(r => r.temp_avg_c!);
    const humids = sortedData.filter(r => r.humidity_avg_pct != null).map(r => r.humidity_avg_pct!);
    const winds = sortedData.filter(r => r.wind_avg_kmh != null).map(r => r.wind_avg_kmh!);
    const etos = sortedData.filter(r => r.eto_mm != null).map(r => r.eto_mm!);
    const radiations = sortedData.filter(r => r.radiation_mj != null).map(r => r.radiation_mj!);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const totalGdu = gduData.length > 0 ? gduData[gduData.length - 1].accGdu : 0;
    return {
      avgTemp: avg(temps),
      maxTemp: sortedData.filter(r => r.temp_max_c != null).length > 0 ? Math.max(...sortedData.filter(r => r.temp_max_c != null).map(r => r.temp_max_c!)) : 0,
      minTemp: sortedData.filter(r => r.temp_min_c != null).length > 0 ? Math.min(...sortedData.filter(r => r.temp_min_c != null).map(r => r.temp_min_c!)) : 0,
      avgHumidity: avg(humids),
      avgWind: avg(winds),
      avgRadiation: avg(radiations),
      totalEto: etos.reduce((a, b) => a + b, 0),
      totalPrecip: sortedData.filter(r => r.precipitation_mm != null).reduce((a, r) => a + r.precipitation_mm!, 0),
      totalGdu,
      days: sortedData.length,
    };
  }, [sortedData, gduData]);

  // Fetch latest phenology stage
  const latestStage = useMemo(() => {
    if (!phenologyRecords.length) return null;
    const sorted = [...phenologyRecords].sort((a: any, b: any) => b.observation_date.localeCompare(a.observation_date));
    return sorted[0]?.stage || null;
  }, [phenologyRecords]);

  // Fetch planting date for analysis
  const { data: analysisPlantingDate } = useQuery({
    queryKey: ["planting-date-weather-analysis", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data: actuals } = await (supabase as any)
        .from("planting_actual").select("planting_date").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("planting_date", { ascending: true }).limit(1);
      if (actuals?.length) return actuals[0].planting_date as string;
      const { data: plans } = await (supabase as any)
        .from("planting_plan").select("planned_date").eq("cycle_id", cycleId)
        .is("deleted_at", null).order("planned_date", { ascending: true }).limit(1);
      if (plans?.length) return plans[0].planned_date as string;
      return null;
    },
    enabled: !!cycleId,
  });

  // Fetch previous weather analyses
  const { data: weatherAnalyses = [], refetch: refetchAnalyses } = useQuery({
    queryKey: ["weather_analyses", cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await (supabase as any)
        .from("weather_analyses").select("*").eq("cycle_id", cycleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!cycleId,
  });

  const latestWeatherAnalysis = weatherAnalyses[0] || null;

  // Build weather summary for AI
  const weatherSummary = useMemo(() => {
    if (!stats) return null;
    const temps = sortedData.filter(r => r.temp_max_c != null);
    const rads = sortedData.filter(r => r.radiation_mj != null);
    const hums = sortedData.filter(r => r.humidity_max_pct != null);
    return {
      totalDays: stats.days,
      avgTemp: stats.avgTemp,
      maxTemp: stats.maxTemp,
      minTemp: stats.minTemp,
      daysAbove35: temps.filter(r => (r.temp_max_c ?? 0) > 35).length,
      daysBelow10: temps.filter(r => (r.temp_min_c ?? 99) < 10).length,
      avgRadiation: stats.avgRadiation,
      maxRadiation: rads.length > 0 ? Math.max(...rads.map(r => r.radiation_mj!)) : null,
      minRadiation: rads.length > 0 ? Math.min(...rads.map(r => r.radiation_mj!)) : null,
      daysLowRadiation: rads.filter(r => (r.radiation_mj ?? 99) < 14).length,
      avgHumidity: stats.avgHumidity,
      maxHumidity: hums.length > 0 ? Math.max(...hums.map(r => r.humidity_max_pct!)) : null,
      minHumidity: sortedData.filter(r => r.humidity_min_pct != null).length > 0 ? Math.min(...sortedData.filter(r => r.humidity_min_pct != null).map(r => r.humidity_min_pct!)) : null,
      daysHighHumidity: hums.filter(r => (r.humidity_max_pct ?? 0) > 90).length,
      totalGdu: stats.totalGdu,
      totalPrecip: stats.totalPrecip,
      totalEto: stats.totalEto,
    };
  }, [stats, sortedData]);

  // Generate analysis mutation
  const generateWeatherAnalysisMut = useMutation({
    mutationFn: async () => {
      const wd = weatherSummary || {};
      const pDate = analysisPlantingDate || null;
      let dap: number | null = null;
      if (pDate) {
        dap = Math.floor((Date.now() - new Date(pDate).getTime()) / (1000 * 60 * 60 * 24));
      }
      const pName = pivotName || "Campo";

      const systemPrompt = `Você é um ENGENHEIRO AGRÔNOMO experiente em produção de sementes de milho híbrido redigindo um parecer técnico de monitoramento climático do campo.\n\nTom: técnico, direto, objetivo. Sem mencionar que você é uma IA ou modelo de linguagem. Escreva em primeira pessoa do singular como se fosse o agrônomo responsável.\n\nEstruture o parecer EXATAMENTE assim:\n\n1. Primeiro parágrafo: SITUAÇÃO CLIMÁTICA ATUAL (2-3 frases resumindo temperatura, radiação solar e umidade do período e o que significam para o milho no estádio atual)\n\n2. "🌡️ Temperatura:" (lista com hifens, 2-3 itens analisando médias, extremos, amplitude térmica e impacto no desenvolvimento)\n\n3. "☀️ Radiação Solar:" (lista com hifens, 2-3 itens sobre média, variação e impacto na fotossíntese/enchimento de grão)\n\n4. "💧 Umidade Relativa:" (lista com hifens, 2-3 itens sobre médias, extremos e risco de doenças foliares ou estresse)\n\n5. "⚠️ Pontos de atenção:" ou "✅ Situação favorável:" (lista 2-4 itens sobre riscos ou condições positivas)\n\n6. "📈 Impacto na produtividade:" (2-3 frases sobre como as condições climáticas recentes podem afetar a produtividade esperada do milho)\n\nReferências agronômicas para milho:\n- Temperatura ideal: 25-30°C (dia), 15-20°C (noite)\n- Estresse por calor: >35°C\n- Estresse por frio: <10°C\n- Amplitude térmica ideal: 8-12°C\n- Radiação solar ideal: >18 MJ/m²/dia\n- Radiação baixa: <14 MJ/m²\n- Umidade relativa: 50-80% ideal\n- UR >90% prolongada: risco de doenças foliares\n- UR <40%: estresse hídrico atmosférico\n\nSeja específico com números. Não invente dados.`;

      const userPrompt = `Dados climáticos do campo "${pName}"${hybridName ? ` (híbrido: ${hybridName})` : ""}:\n\n- Período analisado: ${(wd as any).totalDays || "?"} dias\n- Estádio fenológico: ${latestStage || "não registrado"}\n- DAP: ${dap != null ? dap : "não calculável"}\n- Data do plantio: ${pDate || "não registrada"}\n\nTEMPERATURA:\n- Média geral: ${(wd as any).avgTemp != null ? (wd as any).avgTemp.toFixed(1) + "°C" : "—"}\n- Máxima registrada: ${(wd as any).maxTemp != null ? (wd as any).maxTemp.toFixed(1) + "°C" : "—"}\n- Mínima registrada: ${(wd as any).minTemp != null ? (wd as any).minTemp.toFixed(1) + "°C" : "—"}\n- Dias com máxima >35°C: ${(wd as any).daysAbove35 ?? "—"}\n- Dias com mínima <10°C: ${(wd as any).daysBelow10 ?? "—"}\n\nRADIAÇÃO SOLAR:\n- Média: ${(wd as any).avgRadiation != null ? (wd as any).avgRadiation.toFixed(1) + " MJ/m²" : "—"}\n- Máxima: ${(wd as any).maxRadiation != null ? (wd as any).maxRadiation.toFixed(1) + " MJ/m²" : "—"}\n- Mínima: ${(wd as any).minRadiation != null ? (wd as any).minRadiation.toFixed(1) + " MJ/m²" : "—"}\n- Dias com radiação <14 MJ/m²: ${(wd as any).daysLowRadiation ?? "—"}\n\nUMIDADE RELATIVA:\n- Média: ${(wd as any).avgHumidity != null ? (wd as any).avgHumidity.toFixed(0) + "%" : "—"}\n- Máxima: ${(wd as any).maxHumidity != null ? (wd as any).maxHumidity.toFixed(0) + "%" : "—"}\n- Mínima: ${(wd as any).minHumidity != null ? (wd as any).minHumidity.toFixed(0) + "%" : "—"}\n- Dias com UR >90%: ${(wd as any).daysHighHumidity ?? "—"}\n\nGDU/HU:\n- GDU acumulado total: ${(wd as any).totalGdu ?? "—"}\n- Precipitação total: ${(wd as any).totalPrecip != null ? (wd as any).totalPrecip.toFixed(1) + " mm" : "—"}\n- ETo total: ${(wd as any).totalEto != null ? (wd as any).totalEto.toFixed(1) + " mm" : "—"}\n\nRedija o parecer técnico de monitoramento climático e impacto na produtividade.`;

      const { callClaude } = await import("@/services/anthropicApi");
      const analysisText = await callClaude(systemPrompt, userPrompt, 2048);

      // Persist
      if (orgId && cycleId) {
        await (supabase as any).from("weather_analyses").insert({
          cycle_id: cycleId,
          org_id: orgId,
          analysis_text: analysisText,
          growth_stage: latestStage,
          dap,
        });
      }

      refetchAnalyses();
      toast.success("Análise climática atualizada!");
      return { analysis: analysisText };
    },
    onError: (e: any) => toast.error(e.message || "Erro ao gerar análise"),
  });

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

      {/* HU Accumulated per Female Planting Block — cards + chart */}
      {hasGdu && uniqueFemalePlantingDates.length > 0 && gduByPlantingData.length > 0 && (() => {
        const lastRow = gduByPlantingData[gduByPlantingData.length - 1];
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uniqueFemalePlantingDates.map((plantDate, i) => (
                <Card key={plantDate}><CardContent className="p-3 flex items-center gap-2">
                  <Flame className="h-6 w-6 shrink-0" style={{ color: PLANTING_COLORS[i % PLANTING_COLORS.length] }} />
                  <div>
                    <p className="text-[10px] text-muted-foreground">HU Fêmea {toDateLabel(plantDate)}</p>
                    <p className="text-sm font-bold">{lastRow?.[`gdu_${plantDate}`] ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">D+1 a partir de {toDateLabel(plantDate)}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4">
              <h4 className="font-medium text-xs mb-2 flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> GDU Acumulado por Data de Plantio — Fêmea (D+1)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={gduByPlantingData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis {...chartXAxisProps} />
                  <YAxis tick={{ fontSize: 9 }} label={{ value: "GDU acumulado", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div className="bg-popover border rounded-md p-2 shadow-md text-xs space-y-1"><p className="font-medium">{label}</p>{payload.filter((p: any) => p.value != null).map((p: any) => (<p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>))}</div>); }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {uniqueFemalePlantingDates.map((plantDate, i) => (<Line key={plantDate} type="monotone" dataKey={`gdu_${plantDate}`} name={`Fêmea ${toDateLabel(plantDate)}`} stroke={PLANTING_COLORS[i % PLANTING_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </>
        );
      })()}

      {/* HU Accumulated per Male 1 Planting Block — cards + chart */}
      {hasGdu && uniqueMale1PlantingDates.length > 0 && gduByMale1Data.length > 0 && (() => {
        const lastRow = gduByMale1Data[gduByMale1Data.length - 1];
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uniqueMale1PlantingDates.map((plantDate, i) => (
                <Card key={plantDate}><CardContent className="p-3 flex items-center gap-2">
                  <Flame className="h-6 w-6 shrink-0" style={{ color: MALE1_COLORS[i % MALE1_COLORS.length] }} />
                  <div>
                    <p className="text-[10px] text-muted-foreground">HU Macho 1 {toDateLabel(plantDate)}</p>
                    <p className="text-sm font-bold">{lastRow?.[`gdu_m1_${plantDate}`] ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">D+1 a partir de {toDateLabel(plantDate)}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4">
              <h4 className="font-medium text-xs mb-2 flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-blue-500" /> GDU Acumulado por Data de Plantio — Macho 1 (D+1)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={gduByMale1Data}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis {...chartXAxisProps} />
                  <YAxis tick={{ fontSize: 9 }} label={{ value: "GDU acumulado", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div className="bg-popover border rounded-md p-2 shadow-md text-xs space-y-1"><p className="font-medium">{label}</p>{payload.filter((p: any) => p.value != null).map((p: any) => (<p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>))}</div>); }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {uniqueMale1PlantingDates.map((plantDate, i) => (<Line key={plantDate} type="monotone" dataKey={`gdu_m1_${plantDate}`} name={`Macho 1 ${toDateLabel(plantDate)}`} stroke={MALE1_COLORS[i % MALE1_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </>
        );
      })()}

      {/* HU Accumulated per Male 2 Planting Block — cards + chart */}
      {hasGdu && uniqueMale2PlantingDates.length > 0 && gduByMale2Data.length > 0 && (() => {
        const lastRow = gduByMale2Data[gduByMale2Data.length - 1];
        return (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uniqueMale2PlantingDates.map((plantDate, i) => (
                <Card key={plantDate}><CardContent className="p-3 flex items-center gap-2">
                  <Flame className="h-6 w-6 shrink-0" style={{ color: MALE2_COLORS[i % MALE2_COLORS.length] }} />
                  <div>
                    <p className="text-[10px] text-muted-foreground">HU Macho 2 {toDateLabel(plantDate)}</p>
                    <p className="text-sm font-bold">{lastRow?.[`gdu_m2_${plantDate}`] ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">D+1 a partir de {toDateLabel(plantDate)}</p>
                  </div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4">
              <h4 className="font-medium text-xs mb-2 flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" /> GDU Acumulado por Data de Plantio — Macho 2 (D+1)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={gduByMale2Data}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis {...chartXAxisProps} />
                  <YAxis tick={{ fontSize: 9 }} label={{ value: "GDU acumulado", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; return (<div className="bg-popover border rounded-md p-2 shadow-md text-xs space-y-1"><p className="font-medium">{label}</p>{payload.filter((p: any) => p.value != null).map((p: any) => (<p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>))}</div>); }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {uniqueMale2PlantingDates.map((plantDate, i) => (<Line key={plantDate} type="monotone" dataKey={`gdu_m2_${plantDate}`} name={`Macho 2 ${toDateLabel(plantDate)}`} stroke={MALE2_COLORS[i % MALE2_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false} />))}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </>
        );
      })()}

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

      {/* ═══ ANÁLISE CLIMÁTICA DO CAMPO ═══ */}
      {stats && cycleId && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              📊 Análise Climática do Campo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestWeatherAnalysis ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {latestWeatherAnalysis.growth_stage && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {latestWeatherAnalysis.growth_stage}
                    </span>
                  )}
                  {latestWeatherAnalysis.dap != null && <span className="text-muted-foreground">{latestWeatherAnalysis.dap} DAP</span>}
                  <span className="text-muted-foreground">
                    {format(new Date(latestWeatherAnalysis.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{latestWeatherAnalysis.analysis_text}</ReactMarkdown>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  🕐 Atualizado em {format(new Date(latestWeatherAnalysis.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma análise climática disponível. Clique em "Gerar análise" para obter o primeiro parecer.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1 border-t">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => generateWeatherAnalysisMut.mutate()}
                disabled={generateWeatherAnalysisMut.isPending || !isAdmin}
                title={!isAdmin ? "Apenas administradores podem gerar análises" : undefined}
              >
                {generateWeatherAnalysisMut.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                {generateWeatherAnalysisMut.isPending ? "Analisando..." : "🔄 Gerar análise"}
              </Button>
              {latestWeatherAnalysis && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(latestWeatherAnalysis.analysis_text);
                    toast.success("Análise copiada!");
                  }}
                >
                  <ClipboardCopy className="h-3 w-3" /> 📋 Copiar
                </Button>
              )}
            </div>

            {weatherAnalyses.length > 1 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 w-full justify-start">
                    <ChevronDown className={cn("h-3 w-3 transition-transform", historyOpen && "rotate-180")} />
                    📊 Pareceres Anteriores ({weatherAnalyses.length - 1})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-2">
                  {weatherAnalyses.slice(1).map((a: any) => (
                    <div key={a.id} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        {a.growth_stage && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border">{a.growth_stage}</span>}
                        {a.dap != null && <span>{a.dap} DAP</span>}
                        <span>{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown>{a.analysis_text}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}