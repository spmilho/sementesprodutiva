export const PASS_TYPES = [
  { value: "first_pass", label: "1ª Passada" },
  { value: "second_pass", label: "2ª Passada" },
  { value: "third_pass", label: "3ª Passada" },
  { value: "repass_1", label: "Repasse 1" },
  { value: "repass_2", label: "Repasse 2" },
  { value: "repass_3", label: "Repasse 3" },
  { value: "repass_4", label: "Repasse 4" },
  { value: "repass_5", label: "Repasse 5" },
] as const;

export const SHIFTS = [
  { value: "morning", label: "Manhã" },
  { value: "afternoon", label: "Tarde" },
  { value: "full_day", label: "Dia inteiro" },
  { value: "night", label: "Noturno" },
] as const;

export const METHODS = [
  { value: "manual", label: "Manual" },
  { value: "mechanical_detasseler", label: "Mecânico — Despendoadeira" },
  { value: "mechanical_roller", label: "Mecânico — Rolo despendoador" },
  { value: "combined", label: "Combinado (mecânico + repasse manual)" },
] as const;

export const TASSEL_HEIGHTS = [
  { value: "above_flag", label: "Acima da folha bandeira" },
  { value: "at_flag", label: "Na folha bandeira" },
  { value: "below_trapped", label: "Abaixo — engaiolado" },
  { value: "variable", label: "Variável" },
] as const;

export const DIFFICULTIES_OPTIONS = [
  "Pendão engaiolado",
  "Planta muito alta",
  "Planta baixa/pendão rente",
  "Chuva/solo úmido",
  "Pendão rebrotando",
  "Área difícil acesso",
  "Equipe insuficiente",
] as const;

export function getPassLabel(passType: string): string {
  return PASS_TYPES.find((p) => p.value === passType)?.label ?? passType;
}

export function getMethodLabel(method: string): string {
  return METHODS.find((m) => m.value === method)?.label ?? method;
}

export function getShiftLabel(shift: string): string {
  return SHIFTS.find((s) => s.value === shift)?.label ?? shift;
}

export function getPassBadgeColor(passType: string): string {
  if (passType === "first_pass") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  if (passType === "second_pass") return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  if (passType === "third_pass") return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
}

export function getMethodBadgeColor(method: string): string {
  if (method === "manual") return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  if (method.startsWith("mechanical")) return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
}

export function isManualMethod(method: string): boolean {
  return method === "manual" || method === "combined";
}

export function isMechanicalMethod(method: string): boolean {
  return method === "mechanical_detasseler" || method === "mechanical_roller" || method === "combined";
}
