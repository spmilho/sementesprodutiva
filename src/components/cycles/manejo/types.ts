export interface CropInput {
  id: string;
  cycle_id: string;
  org_id: string;
  source: "imported" | "manual";
  import_file_id: string | null;
  group_category: string | null;
  input_type: string;
  product_name: string;
  active_ingredient: string | null;
  recommendation_date: string | null;
  execution_date: string | null;
  event_type: string | null;
  event_code: string | null;
  qty_recommended: number | null;
  qty_applied: number | null;
  unit: string | null;
  dose_per_ha: number | null;
  status: "applied" | "recommended" | "in_progress";
  growth_stage_at_application: string | null;
  dap_at_application: number | null;
  notes: string | null;
  photos: string[] | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface CropInputImport {
  id: string;
  cycle_id: string;
  org_id: string;
  file_name: string;
  file_url: string | null;
  records_total: number;
  records_new: number;
  records_updated: number;
  imported_at: string;
  imported_by: string | null;
}

export const GROUP_CATEGORY_MAP: Record<string, { input_type: string; label: string }> = {
  "ADU - ADUBOS GRANULADOS": { input_type: "fertilizer_macro", label: "Adubo Macro" },
  "ADU - MICRONUTRIENTES": { input_type: "fertilizer_micro", label: "Micro/Foliar" },
  "ADU - ADUBOS LÍQUIDOS": { input_type: "fertilizer_macro", label: "Adubo Líquido" },
  "DEF - INSETICIDAS": { input_type: "insecticide", label: "Inseticida" },
  "DEF - HERBICIDAS": { input_type: "herbicide", label: "Herbicida" },
  "DEF - FUNGICIDAS": { input_type: "fungicide", label: "Fungicida" },
  "DEF - ADJUVANTE": { input_type: "adjuvant", label: "Adjuvante" },
  "SMT - SEMENTES PARA PLANTIO": { input_type: "seed", label: "Semente" },
};

export const INPUT_TYPE_CONFIG: Record<string, { icon: string; label: string; colorClass: string; bgClass: string }> = {
  fertilizer_macro: { icon: "🌾", label: "Adubo Macro", colorClass: "text-green-800 dark:text-green-300", bgClass: "bg-green-100 dark:bg-green-900" },
  fertilizer_micro: { icon: "🍃", label: "Micro/Foliar", colorClass: "text-emerald-700 dark:text-emerald-300", bgClass: "bg-emerald-100 dark:bg-emerald-900" },
  insecticide: { icon: "💊", label: "Inseticida", colorClass: "text-red-700 dark:text-red-300", bgClass: "bg-red-100 dark:bg-red-900" },
  herbicide: { icon: "🧪", label: "Herbicida", colorClass: "text-orange-700 dark:text-orange-300", bgClass: "bg-orange-100 dark:bg-orange-900" },
  fungicide: { icon: "🍄", label: "Fungicida", colorClass: "text-purple-700 dark:text-purple-300", bgClass: "bg-purple-100 dark:bg-purple-900" },
  adjuvant: { icon: "💧", label: "Adjuvante", colorClass: "text-gray-700 dark:text-gray-300", bgClass: "bg-gray-100 dark:bg-gray-800" },
  other: { icon: "📦", label: "Outro", colorClass: "text-gray-600 dark:text-gray-400", bgClass: "bg-gray-100 dark:bg-gray-800" },
};

export const STATUS_CONFIG: Record<string, { icon: string; label: string; colorClass: string; bgClass: string }> = {
  applied: { icon: "🟢", label: "Realizado", colorClass: "text-green-700 dark:text-green-300", bgClass: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" },
  recommended: { icon: "🟡", label: "Recomendado", colorClass: "text-yellow-700 dark:text-yellow-300", bgClass: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 border-dashed" },
  in_progress: { icon: "🔵", label: "Em execução", colorClass: "text-blue-700 dark:text-blue-300", bgClass: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
};

export const COLUMN_MAPPING_OPTIONS = [
  { value: "group_category", label: "Grupo de itens" },
  { value: "product_name", label: "Insumo" },
  { value: "active_ingredient", label: "Ativo" },
  { value: "recommendation_date", label: "Data" },
  { value: "execution_date", label: "Data Início Apontamento" },
  { value: "event_type", label: "Evento" },
  { value: "event_code", label: "Cod. Evento" },
  { value: "qty_recommended", label: "Qtde. Recomendada" },
  { value: "qty_applied", label: "Qtde. Apontada" },
  { value: "unit", label: "Unidade de Medida" },
  { value: "dose_per_ha", label: "Dose/há" },
  { value: "status", label: "Situação" },
  { value: "ignore", label: "(Ignorar)" },
];

export const KNOWN_HEADERS: Record<string, string> = {
  "grupo de itens": "group_category",
  "insumo": "product_name",
  "ativo": "active_ingredient",
  "data": "recommendation_date",
  "data início do apontamento": "execution_date",
  "data inicio do apontamento": "execution_date",
  "evento": "event_type",
  "cod. evento": "event_code",
  "cod evento": "event_code",
  "qtde. recomendada": "qty_recommended",
  "qtde recomendada": "qty_recommended",
  "qtde. apontada": "qty_applied",
  "qtde apontada": "qty_applied",
  "unidade de medida": "unit",
  "dose/há": "dose_per_ha",
  "dose/ha": "dose_per_ha",
  "situação": "status",
  "situacao": "status",
};

export function parseStatusFromSheet(val: string): "applied" | "recommended" | "in_progress" {
  const upper = (val || "").toUpperCase().trim();
  if (upper === "REALIZADO") return "applied";
  if (upper === "EM_EXECUCAO" || upper === "EM EXECUÇÃO" || upper === "EM EXECUCAO") return "in_progress";
  return "recommended";
}

export function classifyGroupCategory(group: string): string {
  const entry = GROUP_CATEGORY_MAP[group?.trim()];
  return entry?.input_type || "other";
}

export function getDapRange(dap: number): string {
  if (dap <= 7) return "VE";
  if (dap <= 14) return "V1-V2";
  if (dap <= 21) return "V3-V4";
  if (dap <= 35) return "V6-V8";
  if (dap <= 45) return "V10-V12";
  if (dap <= 55) return "V14-VT";
  if (dap <= 65) return "VT-R1";
  if (dap <= 80) return "R2-R3";
  if (dap <= 100) return "R4-R5";
  return "R6";
}

export interface ManejoTabProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  cooperatorName?: string;
  totalArea?: number;
  femaleArea?: number;
}
