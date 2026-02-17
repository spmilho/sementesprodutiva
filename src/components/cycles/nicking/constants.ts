export const PARENT_COLORS: Record<string, string> = {
  female: "#1E88E5",
  male_1: "#4CAF50",
  male_2: "#FF9800",
  male_3: "#7B1FA2",
};

export const PARENT_LABELS: Record<string, string> = {
  female: "Fêmea",
  male_1: "Macho 1",
  male_2: "Macho 2",
  male_3: "Macho 3",
};

export const PARENT_BG: Record<string, string> = {
  female: "bg-[#1E88E5]/10 text-[#1E88E5] border-[#1E88E5]/30",
  male_1: "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30",
  male_2: "bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/30",
  male_3: "bg-[#7B1FA2]/10 text-[#7B1FA2] border-[#7B1FA2]/30",
};

export const MALE_TASSEL_STAGES = [
  { value: "vegetative", label: "Vegetativo (pré-VT)" },
  { value: "vt_visible", label: "VT — pendão visível" },
  { value: "anthesis_start", label: "Início antese" },
  { value: "anthesis_50pct", label: "50% antese" },
  { value: "anthesis_peak", label: "Pico antese" },
  { value: "anthesis_decline", label: "Declínio" },
  { value: "anthesis_end", label: "Fim emissão pólen" },
  { value: "tassel_dry", label: "Pendão seco" },
] as const;

export const FEMALE_SILK_STAGES = [
  { value: "pre_silking", label: "Pré-espigamento" },
  { value: "silk_start", label: "Início emissão estigma" },
  { value: "silk_50pct", label: "50% emissão" },
  { value: "silk_full", label: "Emissão plena" },
  { value: "silk_receptive", label: "Estigma receptivo — fresco" },
  { value: "silk_browning", label: "Estigma escurecendo" },
  { value: "silk_dry", label: "Estigma seco — não receptivo" },
] as const;

export const POLLEN_INTENSITY = [
  { value: "none", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const;

export const POLLINATION_EVIDENCE = [
  { value: "none", label: "Sem evidência" },
  { value: "low", label: "Pouca" },
  { value: "moderate", label: "Moderada" },
  { value: "good", label: "Boa — estigmas escurecendo" },
] as const;

export const WATER_STRESS_OPTIONS = [
  { value: "none", label: "Sem estresse" },
  { value: "mild", label: "Estresse leve" },
  { value: "moderate", label: "Estresse moderado" },
  { value: "severe", label: "Estresse severo" },
] as const;

export const SYNC_OPTIONS = [
  { value: "perfect", label: "Perfeito ✅" },
  { value: "male_early", label: "Macho adiantado ⚠️" },
  { value: "male_late", label: "Macho atrasado ⚠️" },
  { value: "critical_gap", label: "Gap crítico 🚨" },
] as const;

export const MALE_TASSEL_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  MALE_TASSEL_STAGES.map((s) => [s.value, s.label])
);

export const FEMALE_SILK_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  FEMALE_SILK_STAGES.map((s) => [s.value, s.label])
);
