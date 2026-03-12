// CV% thresholds and color helpers for the unified Planting tab

export function getCvLabel(cv: number): { label: string; emoji: string; color: string; bg: string } {
  if (cv < 15) return { label: "EXCELENTE — Stand uniforme", emoji: "🟢", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  if (cv < 20) return { label: "BOM — Variação aceitável", emoji: "🟡", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" };
  if (cv < 25) return { label: "REGULAR — Verificar falhas", emoji: "🟠", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  return { label: "RUIM — Perdas significativas de stand", emoji: "🔴", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
}

export function getEmergenceColor(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-400";
  if (pct >= 80) return "text-yellow-600 dark:text-yellow-400";
  if (pct >= 70) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function getEmergenceBarFill(pct: number): string {
  if (pct >= 90) return "#22c55e";
  if (pct >= 80) return "#eab308";
  if (pct >= 70) return "#f97316";
  return "#ef4444";
}

export function getOverallStatus(cvPlanting: number | null, cvStand: number | null, emergPct: number | null): { icon: string; color: string } {
  const worst = Math.max(cvPlanting ?? 0, cvStand ?? 0);
  const emerg = emergPct ?? 100;
  if (worst > 25 || emerg < 70) return { icon: "🔴", color: "text-red-600" };
  if (worst > 20 || emerg < 80) return { icon: "🟠", color: "text-orange-600" };
  if (worst > 15 || emerg < 90) return { icon: "🟡", color: "text-yellow-600" };
  return { icon: "✅", color: "text-green-600" };
}

export function calcSeedsPerMeter(population: number, spacingCm: number, germinationPct: number): number {
  if (!population || !spacingCm || !germinationPct) return 0;
  return Math.round(((population * (spacingCm / 100)) / (germinationPct / 100) / 10000) * 100) / 100;
}

export function calcStats(values: number[]): { mean: number; std: number; cv: number; n: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, cv: 0, n: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  if (n < 2) return { mean, std: 0, cv: 0, n };
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const cv = mean > 0 ? (std / mean) * 100 : 0;
  return { mean, std, cv, n };
}

export const PLANTING_TYPES = [
  { value: "female", label: "Fêmea", badge: "F", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "male_1", label: "Macho 1", badge: "M1", badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "male_2", label: "Macho 2", badge: "M2", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
] as const;

export function getPlantingTypeInfo(type: string) {
  // Handle legacy "male"/"female" values
  if (type === "male") return PLANTING_TYPES[1]; // map to male_1
  return PLANTING_TYPES.find(t => t.value === type) || PLANTING_TYPES[0];
}

export function isFemaleType(type: string) {
  return type === "female";
}

export function isMaleType(type: string) {
  return type === "male" || type === "male_1" || type === "male_2" || type === "male_3";
}

/**
 * Calculates total male area correctly: male sub-types (male_1, male_2, male_3)
 * occupy the SAME physical rows, so their areas should NOT be summed.
 * Instead, we group by sub-type, sum within each (for multiple glebas), 
 * and take the MAX across sub-types.
 */
export function calcMaleTotalArea(records: any[], areaField: string = "actual_area"): number {
  const maleRecords = records.filter((r: any) => isMaleType(r.type));
  if (maleRecords.length === 0) return 0;

  // Group by normalized sub-type
  const bySubType: Record<string, number> = {};
  maleRecords.forEach((r: any) => {
    const subType = r.type === "male" ? "male_1" : r.type;
    bySubType[subType] = (bySubType[subType] || 0) + (r[areaField] || 0);
  });

  // Male sub-types share the same rows, so total male area = max of any sub-type
  return Math.max(...Object.values(bySubType));
}

/**
 * Same logic for per-gleba male area calculation.
 */
export function calcMaleAreaForGleba(records: any[], glebaId: string, areaField: string = "actual_area"): number {
  const filtered = records.filter((r: any) => (r.gleba_id || "none") === glebaId && isMaleType(r.type));
  if (filtered.length === 0) return 0;

  const bySubType: Record<string, number> = {};
  filtered.forEach((r: any) => {
    const subType = r.type === "male" ? "male_1" : r.type;
    bySubType[subType] = (bySubType[subType] || 0) + (r[areaField] || 0);
  });

  return Math.max(...Object.values(bySubType));
}
