export interface EarSample {
  id?: string;
  ear_number: number;
  kernel_rows: number;
  kernels_per_row: number;
  total_kernels: number;
  ear_length_cm?: number;
}

export interface SamplePoint {
  id: string;
  yield_estimate_id: string;
  point_number: string;
  sample_date: string;
  sample_time?: string;
  latitude: number;
  longitude: number;
  pivot_position?: string;
  sample_length_m: number;
  row_spacing_cm: number;
  viable_ears_counted: number;
  discarded_ears_counted: number;
  ears_per_ha: number;
  viable_ears_pct: number;
  avg_kernels_per_ear: number;
  kernels_cv_pct: number;
  sample_moisture_pct: number;
  sample_tgw_g?: number;
  point_gross_yield_kg_ha: number;
  plant_condition?: string;
  photos?: string[];
  notes?: string;
  created_at: string;
  ear_samples?: EarSample[];
}

export interface YieldEstimate {
  id: string;
  cycle_id: string;
  org_id: string;
  estimate_number: number;
  estimate_date: string;
  moisture_reference_pct: number;
  default_tgw_g: number;
  dehusking_loss_pct: number;
  classification_loss_pct: number;
  other_loss_pct: number;
  bag_weight_kg: number;
  final_pms_g?: number;
  avg_ears_per_ha?: number;
  avg_kernels_per_ear?: number;
  gross_yield_kg_ha?: number;
  net_yield_kg_ha?: number;
  total_production_tons?: number;
  total_production_bags?: number;
  total_sample_points: number;
  notes?: string;
  created_at: string;
  deleted_at?: string;
}

export interface YieldEstimateProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName: string;
  hybridName: string;
  cooperatorName?: string;
  femaleArea: number;
  pivotId?: string;
  expectedProductivity?: number;
  defaultRowSpacing?: number;
}
