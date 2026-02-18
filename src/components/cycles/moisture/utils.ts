import { MoistureSample, GlebaStatus, PivotGleba, GROWTH_STAGE_LABELS } from "./types";

export function getPredominantStage(samples: MoistureSample[]): string | null {
  const counts = new Map<string, number>();
  samples.forEach((s) => {
    if (s.growth_stage) counts.set(s.growth_stage, (counts.get(s.growth_stage) || 0) + 1);
  });
  if (counts.size === 0) return null;
  let max = 0, best = "";
  counts.forEach((c, k) => { if (c > max) { max = c; best = k; } });
  return best;
}

export function getMoistureColor(pct: number, target: number): string {
  if (pct <= target) return "green";
  if (pct <= target + 3) return "yellow";
  if (pct <= target + 7) return "orange";
  return "red";
}

export function getMoistureBgClass(pct: number, target: number): string {
  if (pct <= target) return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
  if (pct <= target + 3) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
  if (pct <= target + 7) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300";
  return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300";
}

export function getMoistureStatusLabel(pct: number, target: number): { label: string; emoji: string } {
  if (pct <= target) return { label: "Abaixo do alvo ✓", emoji: "🟢" };
  if (pct <= target + 3) return { label: "Acima do alvo", emoji: "🟡" };
  return { label: "Muito acima do alvo", emoji: "🔴" };
}

export function calcGlebaStatus(
  gleba: PivotGleba | null,
  samples: MoistureSample[],
  target: number
): GlebaStatus {
  if (samples.length === 0) {
    return {
      gleba,
      samples,
      avg: 0,
      min: 0,
      max: 0,
      count: 0,
      lastDate: null,
      pctBelowTarget: 0,
      status: "no_data",
      dryingRate: null,
      daysEstimated: null,
      predominantStage: null,
    };
  }

  const vals = samples.map((s) => Number(s.moisture_pct));
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const belowTarget = vals.filter((v) => v <= target).length;
  const pctBelow = (belowTarget / vals.length) * 100;

  const sorted = [...samples].sort(
    (a, b) => new Date(b.sample_date).getTime() - new Date(a.sample_date).getTime()
  );
  const lastDate = sorted[0]?.sample_date ?? null;

  // Drying rate: compare last 2 distinct dates' averages
  let dryingRate: number | null = null;
  let daysEstimated: number | null = null;
  const dateGroups = new Map<string, number[]>();
  samples.forEach((s) => {
    const arr = dateGroups.get(s.sample_date) ?? [];
    arr.push(Number(s.moisture_pct));
    dateGroups.set(s.sample_date, arr);
  });
  const dateKeys = Array.from(dateGroups.keys()).sort();
  if (dateKeys.length >= 2) {
    const prev = dateKeys[dateKeys.length - 2];
    const curr = dateKeys[dateKeys.length - 1];
    const prevAvg = dateGroups.get(prev)!.reduce((a, b) => a + b, 0) / dateGroups.get(prev)!.length;
    const currAvg = dateGroups.get(curr)!.reduce((a, b) => a + b, 0) / dateGroups.get(curr)!.length;
    const daysDiff =
      (new Date(curr).getTime() - new Date(prev).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 0 && prevAvg > currAvg) {
      dryingRate = (prevAvg - currAvg) / daysDiff;
      if (avg > target && dryingRate > 0) {
        daysEstimated = Math.ceil((avg - target) / dryingRate);
      }
    }
  }

  let status: GlebaStatus["status"];
  if (pctBelow >= 80) status = "ready";
  else if (pctBelow >= 50) status = "almost";
  else status = "not_ready";

  return { gleba, samples, avg, min, max, count: samples.length, lastDate, pctBelowTarget: pctBelow, status, dryingRate, daysEstimated, predominantStage: getPredominantStage(samples) };
}

export function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

export function getStatusBorderClass(status: GlebaStatus["status"]): string {
  switch (status) {
    case "ready": return "border-green-500";
    case "almost": return "border-yellow-500";
    case "not_ready": return "border-red-500";
    default: return "border-muted";
  }
}

export function getStatusBadge(status: GlebaStatus["status"]): { label: string; emoji: string; className: string } {
  switch (status) {
    case "ready": return { label: "PRONTA PARA COLHEITA", emoji: "🟢", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
    case "almost": return { label: "QUASE PRONTA", emoji: "🟡", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" };
    case "not_ready": return { label: "NÃO PRONTA", emoji: "🔴", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
    default: return { label: "SEM DADOS", emoji: "⚪", className: "bg-muted text-muted-foreground" };
  }
}

export function getRecommendation(gs: GlebaStatus, target: number): { label: string; emoji: string; className: string } {
  const days = daysSince(gs.lastDate);
  if (gs.status === "no_data" || (days !== null && days > 3)) {
    return { label: "AMOSTRAR", emoji: "⚪", className: "text-muted-foreground" };
  }
  if (gs.pctBelowTarget >= 80) {
    return { label: "COLHER", emoji: "🟢", className: "text-green-700 dark:text-green-400" };
  }
  if (gs.pctBelowTarget >= 50) {
    const daysText = gs.daysEstimated ? `AGUARDAR ~${gs.daysEstimated} dias` : "AGUARDAR";
    return { label: daysText, emoji: "🟡", className: "text-yellow-700 dark:text-yellow-400" };
  }
  return { label: "NÃO COLHER", emoji: "🔴", className: "text-red-700 dark:text-red-400" };
}
