export interface RoguingEvaluation {
  id: string;
  cycle_id: string;
  org_id: string;
  evaluation_date: string;
  evaluator_name: string | null;
  growth_stage: string | null;
  dap: number | null;
  parent_evaluated: string;
  gleba_id: string | null;
  area_covered_ha: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  has_volunteers: boolean;
  volunteers_frequency: string | null;
  volunteers_location: string | null;
  volunteers_parent: string | null;
  volunteers_identification: string | null;
  volunteers_notes: string | null;
  volunteers_photos: string[] | null;
  has_offtype: boolean;
  offtype_types: string[] | null;
  offtype_frequency: string | null;
  offtype_location: string | null;
  offtype_parent: string | null;
  offtype_notes: string | null;
  offtype_photos: string[] | null;
  has_diseased: boolean;
  diseased_types: string[] | null;
  diseased_frequency: string | null;
  diseased_parent: string | null;
  diseased_notes: string | null;
  diseased_photos: string[] | null;
  has_female_in_male: boolean;
  female_in_male_type: string | null;
  female_in_male_frequency: string | null;
  female_in_male_location: string | null;
  female_in_male_notes: string | null;
  female_in_male_photos: string[] | null;
  overall_condition: string;
  auto_conclusion: string;
  auto_conclusion_message: string | null;
  general_notes: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface RoguingRequest {
  id: string;
  cycle_id: string;
  org_id: string;
  evaluation_id: string | null;
  request_number: number;
  request_date: string;
  priority: string;
  parent_target: string;
  gleba_id: string | null;
  growth_stage: string | null;
  occurrence_types: string[] | null;
  occurrence_summary: string | null;
  status: string;
  execution_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface RoguingExecution {
  id: string;
  cycle_id: string;
  org_id: string;
  request_id: string;
  execution_date: string;
  team_size: number | null;
  hours_spent: number | null;
  area_covered_ha: number | null;
  volunteers_removed: number;
  offtype_removed: number;
  diseased_removed: number;
  female_in_male_removed: number;
  total_plants_removed: number;
  efficacy: string;
  needs_followup: string;
  followup_days: number | null;
  result_notes: string | null;
  photos_post: string[] | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface RoguingProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  hybridName?: string;
  cooperatorName?: string;
  pivotName?: string;
  femaleArea?: number;
  maleArea?: number;
}

export const FREQUENCIES = [
  { value: "rare", label: "Rara (<1%)" },
  { value: "low", label: "Baixa (1-3%)" },
  { value: "moderate", label: "Moderada (3-5%)" },
  { value: "high", label: "Alta (>5%)" },
] as const;

export const LOCATIONS = [
  { value: "punctual", label: "Pontual" },
  { value: "strip", label: "Faixa" },
  { value: "dispersed", label: "Dispersa" },
  { value: "border", label: "Borda do pivô" },
] as const;

export const PARENTS = [
  { value: "female", label: "Fêmea" },
  { value: "male", label: "Macho" },
  { value: "both", label: "Ambos" },
] as const;

export const STAGES = [
  "VE","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","VT",
  "R1","R2","R3","R4","R5","R6",
] as const;

export const OFFTYPE_OPTIONS = [
  { value: "height", label: "Altura diferente" },
  { value: "color", label: "Cor diferente (folha/colmo)" },
  { value: "cycle", label: "Ciclo diferente (precoce/tardio)" },
  { value: "ear", label: "Espiga atípica" },
  { value: "tassel", label: "Pendão atípico" },
  { value: "plant_shape", label: "Formato de planta diferente" },
  { value: "other", label: "Outro" },
] as const;

export const DISEASED_OPTIONS = [
  { value: "red_stunt", label: "Enfezamento vermelho" },
  { value: "pale_stunt", label: "Enfezamento pálido" },
  { value: "virus", label: "Virose (mosaico/estrias)" },
  { value: "stalk_rot", label: "Podridão do colmo" },
  { value: "helminthosporium", label: "Helmintospório" },
  { value: "other", label: "Outro" },
] as const;

export const OVERALL_CONDITIONS = [
  { value: "clean", label: "🟢 Limpo — sem necessidade de roguing", color: "green" },
  { value: "attention", label: "🟡 Atenção — monitorar próxima avaliação", color: "yellow" },
  { value: "recommended", label: "🟠 Necessário — roguing recomendado", color: "orange" },
  { value: "urgent", label: "🔴 Urgente — roguing imediato necessário", color: "red" },
] as const;

export function getFrequencyLabel(v: string | null) {
  return FREQUENCIES.find(f => f.value === v)?.label ?? v ?? "—";
}

export function getFrequencyLevel(v: string | null): number {
  const map: Record<string, number> = { rare: 1, low: 2, moderate: 3, high: 4 };
  return map[v ?? ""] ?? 0;
}

export function getParentLabel(v: string | null) {
  return PARENTS.find(p => p.value === v)?.label ?? v ?? "—";
}

export function computeConclusion(eval_: {
  has_volunteers: boolean;
  volunteers_frequency: string | null;
  has_offtype: boolean;
  offtype_frequency: string | null;
  has_diseased: boolean;
  diseased_frequency: string | null;
  has_female_in_male: boolean;
  female_in_male_frequency: string | null;
  overall_condition: string;
}): { conclusion: string; action: string; color: string; message: string } {
  const freqs: string[] = [];
  if (eval_.has_volunteers && eval_.volunteers_frequency) freqs.push(eval_.volunteers_frequency);
  if (eval_.has_offtype && eval_.offtype_frequency) freqs.push(eval_.offtype_frequency);
  if (eval_.has_diseased && eval_.diseased_frequency) freqs.push(eval_.diseased_frequency);
  if (eval_.has_female_in_male && eval_.female_in_male_frequency) freqs.push(eval_.female_in_male_frequency);

  const hasAny = eval_.has_volunteers || eval_.has_offtype || eval_.has_diseased || eval_.has_female_in_male;

  // Fêmea no macho with moderate/high is always urgent
  if (eval_.has_female_in_male && (eval_.female_in_male_frequency === "moderate" || eval_.female_in_male_frequency === "high")) {
    return {
      conclusion: "ROGUING URGENTE",
      action: "solicitar_roguing_urgente",
      color: "red",
      message: "Ocorrências significativas. Roguing urgente para manter pureza.\n⚠️ Fêmea no macho compromete diretamente a pureza genética do pólen. Remoção prioritária.",
    };
  }

  if (!hasAny) {
    return { conclusion: "CAMPO LIMPO", action: "sem_acao", color: "green", message: "Campo sem ocorrências. Próxima avaliação em 7 dias." };
  }

  if (freqs.some(f => f === "high") || eval_.overall_condition === "urgent") {
    return { conclusion: "ROGUING URGENTE", action: "solicitar_roguing_urgente", color: "red", message: "Ocorrências significativas. Roguing urgente para manter pureza." };
  }

  if (freqs.some(f => f === "low" || f === "moderate")) {
    return { conclusion: "ROGUING RECOMENDADO", action: "solicitar_roguing", color: "orange", message: "Ocorrências justificam roguing. Solicitação gerada automaticamente." };
  }

  if (freqs.every(f => f === "rare")) {
    return { conclusion: "OBSERVAR DESENVOLVIMENTO", action: "observar", color: "yellow", message: "Ocorrências raras. Manter monitoramento. Reavaliar em 5 dias." };
  }

  return { conclusion: "CAMPO LIMPO", action: "sem_acao", color: "green", message: "Campo sem ocorrências. Próxima avaliação em 7 dias." };
}
