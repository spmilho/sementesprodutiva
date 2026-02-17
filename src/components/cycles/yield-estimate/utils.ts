import type { EarSample } from "./types";

export function calcEarsPerHa(viableEars: number, lengthM: number, spacingCm: number): number {
  if (lengthM <= 0 || spacingCm <= 0) return 0;
  return (viableEars / lengthM) * (10000 / (spacingCm / 100));
}

export function calcViableEarsPct(viable: number, discarded: number): number {
  const total = viable + discarded;
  return total > 0 ? (viable / total) * 100 : 100;
}

export function calcEarStats(ears: EarSample[]) {
  if (ears.length === 0) return { avg: 0, std: 0, cv: 0, min: 0, max: 0 };
  const totals = ears.map((e) => e.total_kernels);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const variance = totals.reduce((s, v) => s + (v - avg) ** 2, 0) / totals.length;
  const std = Math.sqrt(variance);
  return {
    avg: Math.round(avg * 100) / 100,
    std: Math.round(std * 100) / 100,
    cv: avg > 0 ? Math.round((std / avg) * 10000) / 100 : 0,
    min: Math.min(...totals),
    max: Math.max(...totals),
  };
}

export function calcPointGrossYield(
  earsPerHa: number,
  avgKernelsPerEar: number,
  tgwG: number,
  moisturePct: number,
  refMoisturePct: number
): number {
  const rawKgHa = (earsPerHa * avgKernelsPerEar * tgwG) / 1_000_000;
  return rawKgHa * ((100 - moisturePct) / (100 - refMoisturePct));
}

export function calcNetYield(
  grossKgHa: number,
  dehuskingPct: number,
  classificationPct: number,
  otherPct: number
): number {
  return grossKgHa * (1 - dehuskingPct / 100) * (1 - classificationPct / 100) * (1 - otherPct / 100);
}

export function getCvLabel(cv: number): { label: string; color: string } {
  if (cv <= 15) return { label: "Uniforme", color: "text-green-600" };
  if (cv <= 25) return { label: "Moderado", color: "text-yellow-600" };
  return { label: "Alta variação", color: "text-red-600" };
}

export function getLossLabel(pct: number, thresholds: [number, number]): { label: string; color: string } {
  if (pct <= thresholds[0]) return { label: "Normal", color: "text-green-600" };
  if (pct <= thresholds[1]) return { label: "Moderada", color: "text-yellow-600" };
  return { label: "Alta", color: "text-red-600" };
}

export function getReliability(points: number, area: number): { label: string; color: string; ratio: number } {
  const ratio = area > 0 ? area / Math.max(points, 1) : 0;
  if (points > 0 && ratio <= 15) return { label: "Alta", color: "text-green-600", ratio };
  if (points > 0 && ratio <= 25) return { label: "Média", color: "text-yellow-600", ratio };
  return { label: "Baixa — poucos pontos", color: "text-red-600", ratio };
}

export function getPointColor(value: number, avg: number): string {
  if (avg <= 0) return "#3b82f6";
  const ratio = value / avg;
  if (ratio >= 1.1) return "#22c55e";
  if (ratio >= 0.9) return "#eab308";
  return "#ef4444";
}
