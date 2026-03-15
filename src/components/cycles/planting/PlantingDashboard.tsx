import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calcStats, getCvLabel, getOverallStatus, isFemaleType, isMaleType } from "./planting-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";

interface Props {
  plans: any[];
  actuals: any[];
  cvPoints: any[];
  cvRecords: any[];
  standCounts: any[];
  standPoints: any[];
  glebas: any[];
  femaleArea?: number;
  maleArea?: number;
}

type ParentGroup = "female" | "male" | "male_1" | "male_2";

const DEFAULT_GERMINATION = 90;

const toPositiveNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const getTypeMatcher = (type: ParentGroup) => {
  if (type === "female") return (value: string) => isFemaleType(value);
  if (type === "male_1") return (value: string) => value === "male" || value === "male_1";
  if (type === "male_2") return (value: string) => value === "male_2";
  return (value: string) => isMaleType(value);
};

const getWeightedAverage = (items: { value: number; weight: number }[]): number => {
  const valid = items.filter((item) => item.value > 0);
  if (valid.length === 0) return 0;

  const weighted = valid.filter((item) => item.weight > 0);
  if (weighted.length > 0) {
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight > 0) {
      const weightedSum = weighted.reduce((sum, item) => sum + item.value * item.weight, 0);
      return weightedSum / totalWeight;
    }
  }

  return valid.reduce((sum, item) => sum + item.value, 0) / valid.length;
};

const getWeightedActualAverage = (records: any[], valueSelector: (record: any) => number): number => {
  return getWeightedAverage(records.map((record) => ({
    value: toPositiveNumber(valueSelector(record)),
    weight: toPositiveNumber(record.actual_area),
  })));
};

const getWeightedPlanAverage = (records: any[], valueSelector: (record: any) => number): number => {
  return getWeightedAverage(records.map((record) => ({
    value: toPositiveNumber(valueSelector(record)),
    weight: toPositiveNumber(record.planned_area),
  })));
};

function getGermination(plans: any[], _actuals: any[], type: ParentGroup): number {
  const matchType = getTypeMatcher(type);
  const planFiltered = plans.filter((p: any) => matchType(String(p.type || "")));
  const weightedGermination = getWeightedPlanAverage(planFiltered, (p) => p.germination_considered_pct);

  if (weightedGermination > 0) return weightedGermination;

  // 2nd: germination_pct from seed_lot (if linked via actuals — fallback)
  // For now, we use default
  return DEFAULT_GERMINATION;
}

function getSeedsPerMeterActual(actuals: any[], type: ParentGroup): number {
  const matchType = getTypeMatcher(type);
  const filtered = actuals.filter((a: any) => matchType(String(a.type || "")));

  return getWeightedActualAverage(filtered, (a) => toPositiveNumber(a.seeds_per_meter_actual) || toPositiveNumber(a.seeds_per_meter));
}

function getAvgSpacing(actuals: any[], type: ParentGroup): number {
  const matchType = getTypeMatcher(type);
  const filtered = actuals.filter((a: any) => matchType(String(a.type || "")));

  return getWeightedActualAverage(filtered, (a) => a.row_spacing);
}

export default function PlantingDashboard({ plans, actuals, cvPoints, cvRecords, standCounts, standPoints, glebas, femaleArea, maleArea }: Props) {
  // CV% planting per type — prefer manual cvRecords, fallback to cvPoints
  const cvPlantingStats = useMemo(() => {
    const result: Record<string, { cv: number; mean: number; n: number }> = {};
    for (const type of ["female", "male"] as const) {
      const manualRecords = cvRecords.filter((r: any) =>
        type === "female" ? r.type === "female" : (r.type === "male_1" || r.type === "male_2" || r.type === "male")
      );
      if (manualRecords.length > 0) {
        const avgCv = manualRecords.reduce((s: number, r: any) => s + Number(r.cv_percent), 0) / manualRecords.length;
        // Get seeds_per_meter_actual from planting_actual (NOT seeds_per_meter_set)
        const meanSpm = getSeedsPerMeterActual(actuals, type);
        result[type] = { cv: avgCv, mean: meanSpm, n: manualRecords.length };
      } else {
        const filteredActuals = actuals.filter((a: any) => type === "female" ? isFemaleType(a.type) : isMaleType(a.type));
        const allPoints = filteredActuals.flatMap((a: any) =>
          cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter))
        ).filter(v => v > 0);
        const stats = calcStats(allPoints);
        result[type] = stats;
      }
    }
    return result;
  }, [actuals, cvPoints, cvRecords]);

  // Population per type with priority: 1) stand count, 2) estimated, 3) none
  const popStats = useMemo(() => {
    const result: Record<string, {
      popPerHa: number;
      source: "stand" | "estimated" | "none";
      seedsPerMeter: number;
      spacingCm: number;
      germPct: number;
      standDate?: string;
      standN?: number;
      standCv?: number;
    }> = {};
    for (const type of ["female", "male"] as const) {
      // PRIORITY 1: Stand counts
      const sc = standCounts.filter((s: any) => s.parent_type === type);
      if (sc.length > 0) {
        const latest = sc[0]; // ordered desc
        const pts = standPoints.filter((p: any) => p.stand_count_id === latest.id);
        result[type] = {
          popPerHa: latest.avg_plants_per_ha ?? 0,
          source: "stand",
          seedsPerMeter: 0,
          spacingCm: 0,
          germPct: 0,
          standDate: latest.count_date,
          standN: pts.length,
          standCv: latest.cv_stand_pct ?? 0,
        };
        continue;
      }

      // PRIORITY 2: Estimated from seeds_per_meter_actual + spacing + germination
      const spm = getSeedsPerMeterActual(actuals, type);
      const spacingCm = getAvgSpacing(actuals, type);
      const germPct = getGermination(plans, actuals, type);

      if (spm > 0 && spacingCm > 0) {
        const popPerHa = Math.round((spm / (spacingCm / 100)) * 10000 * (germPct / 100));
        result[type] = { popPerHa, source: "estimated", seedsPerMeter: spm, spacingCm, germPct };
      } else {
        result[type] = { popPerHa: 0, source: "none", seedsPerMeter: 0, spacingCm: 0, germPct: 0 };
      }
    }
    return result;
  }, [actuals, plans, standCounts, standPoints]);

  // Stand stats per type
  const standStats = useMemo(() => {
    const result: Record<string, { avgPlantsHa: number; avgPlantsPerMeter: number; cv: number; emergPct: number; n: number }> = {};
    for (const type of ["female", "male"] as const) {
      const counts = standCounts.filter((s: any) => s.parent_type === type);
      if (counts.length === 0) {
        result[type] = { avgPlantsHa: 0, avgPlantsPerMeter: 0, cv: 0, emergPct: 0, n: 0 };
        continue;
      }
      const latest = counts[0];
      const pts = standPoints.filter((p: any) => p.stand_count_id === latest.id);
      result[type] = {
        avgPlantsHa: latest.avg_plants_per_ha ?? 0,
        avgPlantsPerMeter: latest.avg_plants_per_meter ?? 0,
        cv: latest.cv_stand_pct ?? 0,
        emergPct: latest.emergence_pct ?? 0,
        n: pts.length,
      };
    }
    return result;
  }, [standCounts, standPoints]);

  // Chart data by gleba
  const glebaChartData = useMemo(() => {
    const glebaMap = new Map<string, any>();
    const getGlebaName = (glebaId: string | null) => {
      if (!glebaId) return "Geral";
      return glebas.find((g: any) => g.id === glebaId)?.name || "Geral";
    };
    const glebaIds = new Set<string>();
    actuals.forEach((a: any) => glebaIds.add(a.gleba_id || "none"));
    standCounts.forEach((s: any) => glebaIds.add(s.gleba_id || "none"));
    if (glebaIds.size === 0 && cvRecords.length > 0) glebaIds.add("none");

    glebaIds.forEach(gid => {
      const name = getGlebaName(gid === "none" ? null : gid);
      const entry: any = { name, cvPlantingF: 0, cvPlantingM: 0, cvStandF: 0, cvStandM: 0, popF: 0, popM: 0, popPlanF: 0, popPlanM: 0, emergF: 0, emergM: 0, ppmF: 0, ppmM: 0, ppmPlanF: 0, ppmPlanM: 0, popHaF: 0, popHaM: 0 };

      for (const type of ["female", "male"] as const) {
        const manualRecords = cvRecords.filter((r: any) =>
          type === "female" ? r.type === "female" : (r.type === "male_1" || r.type === "male_2" || r.type === "male")
        );
        if (manualRecords.length > 0) {
          const avgCv = manualRecords.reduce((s: number, r: any) => s + Number(r.cv_percent), 0) / manualRecords.length;
          if (type === "female") entry.cvPlantingF = avgCv;
          else entry.cvPlantingM = avgCv;
        } else {
          const filtered = actuals.filter((a: any) => (a.gleba_id || "none") === gid && (type === "female" ? isFemaleType(a.type) : isMaleType(a.type)));
          const pts = filtered.flatMap((a: any) => cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter))).filter(v => v > 0);
          const stats = calcStats(pts);
          if (type === "female") entry.cvPlantingF = stats.cv;
          else entry.cvPlantingM = stats.cv;
        }
      }

      for (const type of ["female", "male"] as const) {
        const filtered = actuals.filter((a: any) => (a.gleba_id || "none") === gid && (type === "female" ? isFemaleType(a.type) : isMaleType(a.type)));
        if (filtered.length > 0) {
          const weightedSeeds = getWeightedActualAverage(filtered, (a) => toPositiveNumber(a.seeds_per_meter_actual) || toPositiveNumber(a.seeds_per_meter));
          if (type === "female") entry.ppmF = weightedSeeds;
          else entry.ppmM = weightedSeeds;
        }
      }

      for (const type of ["female", "male"] as const) {
        const counts = standCounts.filter((s: any) => (s.gleba_id || "none") === gid && s.parent_type === type);
        if (counts.length > 0) {
          const latest = counts[0];
          if (type === "female") {
            entry.cvStandF = latest.cv_stand_pct ?? 0;
            entry.popF = latest.avg_plants_per_ha ?? 0;
            entry.emergF = latest.emergence_pct ?? 0;
          } else {
            entry.cvStandM = latest.cv_stand_pct ?? 0;
            entry.popM = latest.avg_plants_per_ha ?? 0;
            entry.emergM = latest.emergence_pct ?? 0;
          }
        }
      }

      for (const type of ["female", "male"] as const) {
        const filtered = plans.filter((p: any) => (p.gleba_id || "none") === gid && (type === "female" ? isFemaleType(p.type) : isMaleType(p.type)));
        if (filtered.length) {
          const weightedPop = getWeightedPlanAverage(filtered, (p) => p.target_population);
          const weightedSeeds = getWeightedPlanAverage(filtered, (p) => p.seeds_per_meter);
          if (type === "female") {
            entry.popPlanF = weightedPop;
            entry.ppmPlanF = weightedSeeds;
          } else {
            entry.popPlanM = weightedPop;
            entry.ppmPlanM = weightedSeeds;
          }
        }
      }

      glebaMap.set(gid, entry);
    });
    return Array.from(glebaMap.values());
  }, [actuals, cvPoints, cvRecords, standCounts, plans, glebas]);

  // Summary table
  const summaryRows = useMemo(() => {
    const rows: any[] = [];
    const hasMale2Data = actuals.some((a: any) => a.type === "male_2") || plans.some((p: any) => p.type === "male_2") || cvRecords.some((r: any) => r.type === "male_2");

    const parentalConfigs: Array<{
      key: ParentGroup;
      label: string;
      standType: "female" | "male";
      matches: (type: string) => boolean;
      areaFallback: number;
    }> = [
      {
        key: "female",
        label: "Fêmea",
        standType: "female",
        matches: (type: string) => isFemaleType(type),
        areaFallback: toPositiveNumber(femaleArea),
      },
      {
        key: "male_1",
        label: "Macho 1",
        standType: "male",
        matches: (type: string) => type === "male" || type === "male_1",
        areaFallback: toPositiveNumber(maleArea),
      },
      ...(hasMale2Data
        ? [{
            key: "male_2" as ParentGroup,
            label: "Macho 2",
            standType: "male" as const,
            matches: (type: string) => type === "male_2",
            areaFallback: toPositiveNumber(maleArea),
          }]
        : []),
    ];

    const glebaIds = new Set<string>();
    actuals.forEach((a: any) => glebaIds.add(a.gleba_id || "none"));
    standCounts.forEach((s: any) => glebaIds.add(s.gleba_id || "none"));
    plans.forEach((p: any) => glebaIds.add(p.gleba_id || "none"));

    if (glebaIds.size === 0 && (cvRecords.length > 0 || actuals.length > 0 || plans.length > 0)) {
      glebaIds.add("none");
    }

    glebaIds.forEach((gid) => {
      const glebaName = gid === "none" ? "Geral" : glebas.find((g: any) => g.id === gid)?.name || "Geral";

      parentalConfigs.forEach((config) => {
        const filteredActuals = actuals.filter((a: any) => (a.gleba_id || "none") === gid && config.matches(String(a.type || "")));
        const filteredPlans = plans.filter((p: any) => (p.gleba_id || "none") === gid && config.matches(String(p.type || "")));

        const areaFromActual = filteredActuals.reduce((sum: number, a: any) => sum + toPositiveNumber(a.actual_area), 0);
        const areaFromPlan = filteredPlans.reduce((sum: number, p: any) => sum + toPositiveNumber(p.planned_area), 0);
        const area = areaFromActual > 0 ? areaFromActual : (areaFromPlan > 0 ? areaFromPlan : config.areaFallback);

        const manualCvRecords = cvRecords.filter((r: any) => {
          if (config.key === "female") return r.type === "female";
          if (config.key === "male_1") return r.type === "male" || r.type === "male_1";
          return r.type === "male_2";
        });

        let cvPlanting = 0;
        const seedsPerMeter = getWeightedActualAverage(
          filteredActuals,
          (a) => toPositiveNumber(a.seeds_per_meter_actual) || toPositiveNumber(a.seeds_per_meter),
        );
        const seedsPerMeterPlan = getWeightedPlanAverage(filteredPlans, (p) => p.seeds_per_meter);

        if (manualCvRecords.length > 0) {
          cvPlanting = manualCvRecords.reduce((sum: number, r: any) => sum + Number(r.cv_percent), 0) / manualCvRecords.length;
        } else {
          const pts = filteredActuals
            .flatMap((a: any) => cvPoints.filter((p: any) => p.planting_actual_id === a.id).map((p: any) => Number(p.seeds_per_meter)))
            .filter((v: number) => v > 0);
          cvPlanting = calcStats(pts).cv;
        }

        const avgSpacing = getWeightedActualAverage(filteredActuals, (a) => a.row_spacing);
        const germPct = getGermination(plans, actuals, config.key);
        const popEstimated = (seedsPerMeter > 0 && avgSpacing > 0)
          ? Math.round((seedsPerMeter / (avgSpacing / 100)) * 10000 * (germPct / 100))
          : 0;

        const sc = standCounts.filter((s: any) => (s.gleba_id || "none") === gid && s.parent_type === config.standType);
        const latest = sc[0];

        const avgPlanPop = getWeightedPlanAverage(filteredPlans, (p) => p.target_population);

        const popReal = latest?.avg_plants_per_ha
          ? Math.round(latest.avg_plants_per_ha).toLocaleString("pt-BR")
          : (popEstimated > 0 ? `${popEstimated.toLocaleString("pt-BR")}*` : "—");

        const spmDeviation = (seedsPerMeter > 0 && seedsPerMeterPlan > 0)
          ? ((seedsPerMeter - seedsPerMeterPlan) / seedsPerMeterPlan) * 100
          : null;

        if (area > 0 || latest || cvPlanting > 0 || seedsPerMeter > 0 || avgPlanPop > 0) {
          rows.push({
            gleba: glebaName,
            parental: config.label,
            area: area.toFixed(2),
            seedsPerMeter: seedsPerMeter > 0 ? seedsPerMeter.toFixed(2) : "—",
            seedsPerMeterPlan: seedsPerMeterPlan > 0 ? seedsPerMeterPlan.toFixed(2) : "—",
            spmDeviation,
            cvPlanting: cvPlanting > 0 ? cvPlanting.toFixed(1) : "—",
            popPlan: avgPlanPop > 0 ? Math.round(avgPlanPop).toLocaleString("pt-BR") : "—",
            popReal,
            cvStand: latest?.cv_stand_pct != null ? latest.cv_stand_pct.toFixed(1) : "—",
            emergPct: latest?.emergence_pct != null ? `${latest.emergence_pct.toFixed(1)}%` : "—",
            status: getOverallStatus(cvPlanting || null, latest?.cv_stand_pct ?? null, latest?.emergence_pct ?? null),
          });
        }
      });
    });

    return rows;
  }, [actuals, cvPoints, cvRecords, standCounts, plans, glebas, femaleArea, maleArea]);

  const PopTooltipContent = () => (
    <div className="max-w-xs space-y-1.5 text-xs">
      <p className="font-semibold">Como é calculado:</p>
      <p><strong>Sem contagem de stand:</strong><br/>(sem/metro ÷ espaçamento) × 10.000 × germinação%</p>
      <p><strong>Com contagem:</strong><br/>Média real de plantas/ha dos pontos amostrados</p>
      <p className="text-muted-foreground italic">A contagem de stand é mais precisa que a estimativa.</p>
    </div>
  );

  const renderPopCard = (type: string, label: string) => {
    const pop = popStats[type];
    if (!pop || pop.source === "none") {
      return (
        <Card><CardContent className="p-3 space-y-1">
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pop. {label}</p>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><PopTooltipContent /></TooltipContent></Tooltip></TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">—</p>
          <p className="text-[10px] text-muted-foreground">Registre plantio ou contagem</p>
        </CardContent></Card>
      );
    }

    const isStand = pop.source === "stand";
    return (
      <Card><CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pop. {label} {isStand ? "(Stand)" : "(Estimada)"}</p>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><PopTooltipContent /></TooltipContent></Tooltip></TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold">{pop.popPerHa.toLocaleString("pt-BR")} <span className="text-xs font-normal">pl/ha</span></p>
          {isStand ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">🟢 Contagem real</span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">⏳ Estimativa</span>
          )}
        </div>
        {isStand ? (
          <p className="text-[10px] text-muted-foreground">Contagem: {pop.standDate} | {pop.standN} pontos | CV: {pop.standCv?.toFixed(1)}%</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">{pop.seedsPerMeter.toFixed(1)} sem/m | Esp: {pop.spacingCm}cm | Germ: {pop.germPct}%</p>
        )}
      </CardContent></Card>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-foreground border-b pb-2">📊 Dashboard Consolidado de Plantio</h3>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CV% Plantio Fêmea */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Plantio Fêmea</p>
          {cvPlantingStats.female.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{cvPlantingStats.female.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(cvPlantingStats.female.cv).bg}`}>{getCvLabel(cvPlantingStats.female.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Média: {cvPlantingStats.female.mean.toFixed(2)} sem/m | {cvPlantingStats.female.n} {cvRecords.length > 0 ? "reg" : "pts"}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* CV% Plantio Macho */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Plantio Macho</p>
          {cvPlantingStats.male.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{cvPlantingStats.male.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(cvPlantingStats.male.cv).bg}`}>{getCvLabel(cvPlantingStats.male.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Média: {cvPlantingStats.male.mean.toFixed(2)} sem/m | {cvPlantingStats.male.n} {cvRecords.length > 0 ? "reg" : "pts"}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Sem dados</p>}
        </CardContent></Card>

        {/* Pop Fêmea */}
        {renderPopCard("female", "Fêmea")}

        {/* Pop Macho */}
        {renderPopCard("male", "Macho")}

        {/* CV% Stand Fêmea */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Stand Fêmea</p>
          {standStats.female.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{standStats.female.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(standStats.female.cv).bg}`}>{getCvLabel(standStats.female.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{standStats.female.n} pontos</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Registre contagem de stand</p>}
        </CardContent></Card>

        {/* CV% Stand Macho */}
        <Card><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CV% Stand Macho</p>
          {standStats.male.n > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">{standStats.male.cv.toFixed(1)}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getCvLabel(standStats.male.cv).bg}`}>{getCvLabel(standStats.male.cv).emoji}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{standStats.male.n} pontos</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Registre contagem de stand</p>}
        </CardContent></Card>
      </div>

      {/* Charts Row 1: CV% by gleba */}
      {glebaChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">CV% de Plantio por Gleba</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Legend />
                <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="5 5" label="15%" />
                <ReferenceLine y={20} stroke="#eab308" strokeDasharray="5 5" label="20%" />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="5 5" label="25%" />
                <Bar dataKey="cvPlantingF" name="CV% Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="cvPlantingM" name="CV% Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">CV% de Stand por Gleba</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Legend />
                <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="5 5" label="15%" />
                <ReferenceLine y={20} stroke="#eab308" strokeDasharray="5 5" label="20%" />
                <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="5 5" label="25%" />
                <Bar dataKey="cvStandF" name="CV% Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="cvStandM" name="CV% Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {/* Charts Row 2: Population & Emergence */}
      {glebaChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">População Final — Plantas/Metro Linear</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="ppmF" name="Pl/m Fêmea Real" fill="#1E88E5" barSize={16} />
                <Bar dataKey="ppmPlanF" name="Pl/m Fêmea Plan." fill="#90CAF9" barSize={16} />
                <Bar dataKey="ppmM" name="Pl/m Macho Real" fill="#4CAF50" barSize={16} />
                <Bar dataKey="ppmPlanM" name="Pl/m Macho Plan." fill="#A5D6A7" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-sm font-medium mb-3">% Emergência por Gleba</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={glebaChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 110]} />
                <RechartsTooltip />
                <Legend />
                <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" label="90%" />
                <Bar dataKey="emergF" name="% Emerg. Fêmea" fill="#1E88E5" barSize={20} />
                <Bar dataKey="emergM" name="% Emerg. Macho" fill="#4CAF50" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent></Card>
        </div>
      )}

      {/* Summary Table */}
      {summaryRows.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs">Parental</TableHead>
                  <TableHead className="text-xs text-right">Área(ha)</TableHead>
                  <TableHead className="text-xs text-right">Sem/m Plan.</TableHead>
                  <TableHead className="text-xs text-right">Sem/m Real</TableHead>
                  <TableHead className="text-xs text-center">Δ Sem/m</TableHead>
                  <TableHead className="text-xs text-right">CV% Plantio</TableHead>
                  <TableHead className="text-xs text-right">Pop.Plan.</TableHead>
                  <TableHead className="text-xs text-right">Pop.Real</TableHead>
                  <TableHead className="text-xs text-right">CV% Stand</TableHead>
                  <TableHead className="text-xs text-right">%Emerg.</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.map((r: any, i: number) => {
                  const dev = r.spmDeviation;
                  const devColor = dev == null ? "" : Math.abs(dev) <= 5 ? "text-green-600 dark:text-green-400" : Math.abs(dev) <= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
                  const devIcon = dev == null ? "" : Math.abs(dev) <= 5 ? "✅" : Math.abs(dev) <= 10 ? "⚠️" : "🔴";
                  const devText = dev != null ? `${dev >= 0 ? "+" : ""}${dev.toFixed(1)}%` : "—";

                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{r.gleba}</TableCell>
                      <TableCell className="text-sm">{r.parental}</TableCell>
                      <TableCell className="text-sm text-right">{r.area}</TableCell>
                      <TableCell className="text-sm text-right font-mono text-muted-foreground">{r.seedsPerMeterPlan}</TableCell>
                      <TableCell className="text-sm text-right font-mono font-semibold">{r.seedsPerMeter}</TableCell>
                      <TableCell className="text-sm text-center">
                        {dev != null ? (
                          <span className={`text-xs font-semibold ${devColor}`}>{devIcon} {devText}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-right">{r.cvPlanting !== "—" ? <span className={getCvLabel(parseFloat(r.cvPlanting)).color}>{r.cvPlanting}%</span> : "—"}</TableCell>
                      <TableCell className="text-sm text-right">{r.popPlan}</TableCell>
                      <TableCell className="text-sm text-right font-semibold">{r.popReal}</TableCell>
                      <TableCell className="text-sm text-right">{r.cvStand !== "—" ? <span className={getCvLabel(parseFloat(r.cvStand)).color}>{r.cvStand}%</span> : "—"}</TableCell>
                      <TableCell className="text-sm text-right">{r.emergPct}</TableCell>
                      <TableCell className="text-center">{r.status.icon}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
