export interface MoistureSample {
  id: string;
  cycle_id: string;
  org_id: string;
  gleba_id: string | null;
  point_identifier: string | null;
  sample_date: string;
  sample_time: string;
  moisture_pct: number;
  method: string;
  growth_stage: string | null;
  grain_temperature_c: number | null;
  field_position: string | null;
  latitude: number;
  longitude: number;
  photos: string[] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
  // joined
  gleba_name?: string;
}

export interface PivotGleba {
  id: string;
  cycle_id: string;
  org_id: string;
  name: string;
  area_ha: number | null;
  parent_type: string;
  planting_date: string | null;
  notes: string | null;
}

export interface MoistureTabProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName: string;
  hybridName: string;
  cooperatorName?: string;
  femaleArea: number;
  targetMoisture: number;
  pivotId?: string;
}

export interface GlebaStatus {
  gleba: PivotGleba | null;
  samples: MoistureSample[];
  avg: number;
  min: number;
  max: number;
  count: number;
  lastDate: string | null;
  pctBelowTarget: number;
  status: "ready" | "almost" | "not_ready" | "no_data";
  dryingRate: number | null;
  daysEstimated: number | null;
  predominantStage: string | null;
}

export const METHOD_LABELS: Record<string, string> = {
  portable_digital: "Medidor portátil digital",
  oven_105: "Estufa 105°C",
  nir: "NIR/Infravermelho",
  visual_estimate: "Estimativa visual/tátil",
};

export const POSITION_LABELS: Record<string, string> = {
  gleba_center: "Centro da gleba",
  gleba_edge: "Borda da gleba",
  near_tower: "Próximo à torre",
  pivot_tip: "Ponta do pivô",
  other: "Outro",
};

export const GROWTH_STAGE_LABELS: Record<string, string> = {
  R3: "R3 — Grão leitoso",
  R4: "R4 — Grão pastoso",
  R5: "R5 — Formação de dente",
  "R5.5": "R5.5 — Dente completo (½ linha do leite)",
  R6: "R6 — Maturidade fisiológica (camada negra)",
  post_maturity: "Pós-maturidade (secagem em campo)",
};

export const GLEBA_COLORS = [
  "#1E88E5", "#4CAF50", "#FF9800", "#7B1FA2", "#EC407A",
  "#00ACC1", "#8D6E63", "#546E7A",
];
