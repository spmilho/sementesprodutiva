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
