export type ScoreValue = "bom" | "regular" | "ruim";

export interface SubitemDef {
  key: string;
  label: string;
  bom: number;
  regular: number;
  ruim: number;
  /** Which reference images to show */
  refImages?: ("ESCALA_PERCEVEJO" | "ESCALA_LAGARTA" | "ESCALA_DOENCAS" | "PLANTAS_DANINHAS")[];
  /** Badge label for reference images */
  refBadge?: string;
}

export interface PhaseDef {
  key: string;
  label: string;
  icon: string;
  maxPoints: number;
  subitems: SubitemDef[];
}

export const PHASES: PhaseDef[] = [
  {
    key: "plantio",
    label: "Plantio",
    icon: "🌱",
    maxPoints: 20,
    subitems: [
      { key: "populacao_plantio", label: "População", bom: 10, regular: 5, ruim: 0 },
      { key: "desenvolvimento_inicial", label: "Desenvolvimento Inicial", bom: 7, regular: 3.5, ruim: 0 },
      { key: "sentido_plantio", label: "Sentido de Plantio", bom: 3, regular: 0, ruim: 0 },
    ],
  },
  {
    key: "desenvolvimento_vegetativo",
    label: "Desenvolvimento Vegetativo",
    icon: "🌿",
    maxPoints: 22,
    subitems: [
      { key: "pragas_veg", label: "Controle de Pragas", bom: 10, regular: 5, ruim: 0, refImages: ["ESCALA_PERCEVEJO", "ESCALA_LAGARTA"], refBadge: "📎 Ver Escalas de Referência" },
      { key: "doencas_veg", label: "Controle de Doenças", bom: 7, regular: 3.5, ruim: 0, refImages: ["ESCALA_DOENCAS"], refBadge: "📎 Ver Escala Diagramática" },
      { key: "daninhas_veg", label: "Controle de Plantas Daninhas", bom: 5, regular: 2.5, ruim: 0, refImages: ["PLANTAS_DANINHAS"], refBadge: "📎 Ver Referências Visuais" },
    ],
  },
  {
    key: "florescimento",
    label: "Florescimento",
    icon: "🌸",
    maxPoints: 22,
    subitems: [
      { key: "folhas_espiga", label: "Folhas acima da Espiga", bom: 7, regular: 3.5, ruim: 0 },
      { key: "pragas_flor", label: "Controle de Pragas", bom: 5, regular: 2.5, ruim: 0, refImages: ["ESCALA_PERCEVEJO", "ESCALA_LAGARTA"], refBadge: "📎 Ver Escalas de Referência" },
      { key: "doencas_flor", label: "Controle de Doenças", bom: 10, regular: 5, ruim: 0, refImages: ["ESCALA_DOENCAS"], refBadge: "📎 Ver Escala Diagramática" },
    ],
  },
  {
    key: "enchimento_graos",
    label: "Enchimento de Grãos",
    icon: "🌽",
    maxPoints: 20,
    subitems: [
      { key: "estimativa_campo", label: "Estimativa de Campo", bom: 10, regular: 5, ruim: 0 },
      { key: "doencas_ench", label: "Controle de Doenças", bom: 10, regular: 5, ruim: 0, refImages: ["ESCALA_DOENCAS"], refBadge: "📎 Ver Escala Diagramática" },
    ],
  },
  {
    key: "pre_colheita",
    label: "Pré-Colheita",
    icon: "🚜",
    maxPoints: 16,
    subitems: [
      { key: "pragas_pre", label: "Controle de Pragas", bom: 1, regular: 0.5, ruim: 0, refImages: ["ESCALA_PERCEVEJO", "ESCALA_LAGARTA"], refBadge: "📎 Ver Escalas de Referência" },
      { key: "daninhas_pre", label: "Controle de Plantas Daninhas", bom: 5, regular: 2.5, ruim: 0, refImages: ["PLANTAS_DANINHAS"], refBadge: "📎 Ver Referências Visuais" },
      { key: "populacao_final", label: "População Final", bom: 10, regular: 5, ruim: 0 },
    ],
  },
];

export const STAGE_OPTIONS = [
  { value: "Plantio", label: "Plantio" },
  { value: "Desenvolvimento Vegetativo", label: "Desenvolvimento Vegetativo" },
  { value: "Florescimento", label: "Florescimento" },
  { value: "Enchimento de Grãos", label: "Enchimento de Grãos" },
  { value: "Pré-Colheita", label: "Pré-Colheita" },
  { value: "Completa", label: "Completa (todas as fases)" },
];

export function getPhasesByStage(stage: string): PhaseDef[] {
  if (stage === "Completa") return PHASES;
  return PHASES.filter((p) => p.label === stage);
}

export function getClassification(score: number): { label: string; color: string; emoji: string } {
  if (score >= 80) return { label: "EXCELENTE", color: "text-green-700 bg-green-100", emoji: "🟢" };
  if (score >= 60) return { label: "SATISFATÓRIO", color: "text-yellow-700 bg-yellow-100", emoji: "🟡" };
  if (score >= 40) return { label: "ATENÇÃO", color: "text-orange-700 bg-orange-100", emoji: "🟠" };
  return { label: "CRÍTICO", color: "text-red-700 bg-red-100", emoji: "🔴" };
}

export function getScorePoints(subitem: SubitemDef, value: ScoreValue): number {
  return subitem[value];
}
