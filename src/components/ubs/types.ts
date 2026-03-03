export interface Hybrid {
  id: string;
  name: string;
  volumes: number[];
}

export interface Client {
  id: string;
  name: string;
  color: string;
  hybrids: Hybrid[];
}

export function getClientVolumes(client: Client, numWeeks: number): number[] {
  const totals: number[] = Array(numWeeks).fill(0);
  const hybrids = client.hybrids || [];
  // Backward compat: old localStorage may have `volumes` directly on client
  if (hybrids.length === 0 && (client as any).volumes) {
    const vols = (client as any).volumes as number[];
    for (let i = 0; i < numWeeks; i++) {
      totals[i] += vols[i] || 0;
    }
    return totals;
  }
  hybrids.forEach((h) => {
    for (let i = 0; i < numWeeks; i++) {
      totals[i] += h.volumes?.[i] || 0;
    }
  });
  return totals;
}

export interface PhaseConfig {
  shifts: number;
  hoursPerShift: number;
  operatingDays: number;
}

export const DEFAULT_PHASE_CONFIG: PhaseConfig = { shifts: 3, hoursPerShift: 8, operatingDays: 6 };

export function getPhaseConfig(state: UbsState, phase: string): PhaseConfig {
  return state.phaseConfig?.[phase] || { shifts: state.shifts ?? 3, hoursPerShift: state.hoursPerShift ?? 8, operatingDays: state.operatingDays ?? 6 };
}

export function getPhaseWeeklyCap(state: UbsState, phase: string, capPerShift?: number): number {
  // Secador: value is already weekly capacity
  if (phase === "Secador") {
    return capPerShift ?? state.phaseCapPerShift?.[phase] ?? 0;
  }
  const cfg = getPhaseConfig(state, phase);
  const cap = capPerShift ?? state.phaseCapPerShift?.[phase] ?? 0;
  return cap * cfg.shifts * cfg.operatingDays;
}

export interface UbsState {
  ubsName: string;
  /** @deprecated use phaseConfig instead */
  shifts?: number;
  /** @deprecated use phaseConfig instead */
  hoursPerShift?: number;
  /** @deprecated use phaseConfig instead */
  operatingDays?: number;
  phaseConfig: Record<string, PhaseConfig>;
  phaseCapPerShift: Record<string, number>;
  /** @deprecated use phaseCapPerShift["Recebimento e Despalha"] */
  receivingCapPerShift?: number;
  /** @deprecated use phaseCapPerShift["Secador"] */
  dryingCapPerShift?: number;
  clients: Client[];
  startDate: string;
  numWeeks: number;
  staff: Record<string, number[]>;
  compareMode: boolean;
  altShifts: number;
  altReceivingCapPerShift: number;
  altDryingCapPerShift: number;
  changeoverTimeH: number;
  changeoverTimeHPhase2: number;
}

/** Count active hybrids per week across all clients (only clients with demand > 0) */
export function getWeeklyChangeovers(clients: Client[], numWeeks: number): number[] {
  const result: number[] = Array(numWeeks).fill(0);
  clients.forEach((c) => {
    const hybrids = Array.isArray(c.hybrids) ? c.hybrids : [];
    for (let w = 0; w < numWeeks; w++) {
      const clientDemand = hybrids.reduce((s, h) => s + (h.volumes?.[w] || 0), 0);
      if (clientDemand <= 0) continue;
      const activeHybrids = hybrids.filter((h) => (h.volumes?.[w] || 0) > 0).length;
      result[w] += activeHybrids;
    }
  });
  return result;
}

/** Get receiving rate in t/h */
export function getReceivingRateTH(state: UbsState): number {
  const cfg = getPhaseConfig(state, "Recebimento e Despalha");
  const totalHoursPerWeek = cfg.shifts * cfg.hoursPerShift * cfg.operatingDays;
  if (totalHoursPerWeek === 0) return 0;
  return getPhaseWeeklyCap(state, "Recebimento e Despalha") / totalHoursPerWeek;
}

/** Get changeover loss per hybrid in tons */
export function getChangeoverLossPerHybrid(state: UbsState): number {
  return state.changeoverTimeH * getReceivingRateTH(state);
}

/** Get weekly effective receiving capacity (after changeover losses) */
export function getWeeklyEffectiveReceiving(state: UbsState): number[] {
  const grossCap = getPhaseWeeklyCap(state, "Recebimento e Despalha");
  const changeovers = getWeeklyChangeovers(state.clients, state.numWeeks);
  const lossPerHybrid = getChangeoverLossPerHybrid(state);
  return changeovers.map((co) => Math.max(0, grossCap - co * lossPerHybrid));
}

/** Get classificação rate in t/h */
export function getClassificacaoRateTH(state: UbsState): number {
  const cfg = getPhaseConfig(state, "Classificação");
  const totalHoursPerWeek = cfg.shifts * cfg.hoursPerShift * cfg.operatingDays;
  if (totalHoursPerWeek === 0) return 0;
  return getPhaseWeeklyCap(state, "Classificação") / totalHoursPerWeek;
}

/** Get changeover loss per hybrid in tons for Phase 2 (Classificação) */
export function getChangeoverLossPerHybridPhase2(state: UbsState): number {
  return (state.changeoverTimeHPhase2 ?? state.changeoverTimeH) * getClassificacaoRateTH(state);
}

/** Get weekly effective classificação capacity (after changeover losses) */
export function getWeeklyEffectiveClassificacao(state: UbsState): number[] {
  const grossCap = getPhaseWeeklyCap(state, "Classificação");
  const changeovers = getWeeklyChangeovers(state.clients, state.numWeeks);
  const lossPerHybrid = getChangeoverLossPerHybridPhase2(state);
  return changeovers.map((co) => Math.max(0, grossCap - co * lossPerHybrid));
}

export const PHASES = ["Recebimento e Despalha", "Secador", "Debulha", "Classificação", "Tratamento e Ensaque", "Expedição"] as const;
export type Phase = (typeof PHASES)[number];

export function getWeekLabels(startDate: string, numWeeks: number): string[] {
  const labels: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    labels.push(`S${i + 1} (${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })})`);
  }
  return labels;
}

export function getWeeklyDemand(clients: Client[], numWeeks: number): number[] {
  const totals: number[] = Array(numWeeks).fill(0);
  clients.forEach((c) => {
    const cv = getClientVolumes(c, numWeeks);
    for (let i = 0; i < numWeeks; i++) {
      totals[i] += cv[i];
    }
  });
  return totals;
}
