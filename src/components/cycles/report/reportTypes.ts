export interface ReportCycleData {
  id: string;
  org_id: string;
  client_id: string;
  client_name: string;
  cooperator_name: string | null;
  farm_name: string;
  field_name: string;
  hybrid_name: string;
  female_line: string;
  male_line: string;
  season: string;
  status: string;
  total_area: number;
  female_area: number;
  male_area: number;
  female_male_ratio: string;
  irrigation_system: string;
  material_split: string | null;
  spacing_female_female_cm: number | null;
  spacing_female_male_cm: number | null;
  spacing_male_male_cm: number | null;
  contract_number: string | null;
  material_cycle_days: number | null;
  detasseling_dap: number | null;
  target_moisture: number | null;
  expected_productivity: number | null;
  expected_production: number | null;
  pivot_id: string | null;
}

export interface OrgSettings {
  report_cover_url: string | null;
  report_logo_url: string | null;
  report_footer_text: string | null;
  org_name: string;
  org_slogan: string | null;
}

export interface ReportData {
  cycle: ReportCycleData;
  orgSettings: OrgSettings;
  seedLots: any[];
  seedLotTreatments: any[];
  seedLotTreatmentProducts: any[];
  plantingPlan: any[];
  plantingActual: any[];
  cvPoints: any[];
  glebas: any[];
  standCounts: any[];
  standCountPoints: any[];
  fertilizations: any[];
  phenology: any[];
  nickingMilestones: any[];
  nickingObservations: any[];
  inspectionImports: any[];
  inspectionData: any[];
  detasseling: any[];
  chemicals: any[];
  pests: any[];
  moisture: any[];
  yieldEstimates: any[];
  yieldSamplePoints: any[];
  harvestPlan: any[];
  harvestRecords: any[];
  attachments: any[];
  cropInputs: any[];
  irrigationRecords: any[];
  rainfallRecords: any[];
  waterFiles: any[];
  roguingRecords: any[];
  ndviAnalyses: any[];
  ndviImages: any[];
  fieldVisits: any[];
  emergenceCounts: any[];
  weatherRecords: any[];
  photoSignedUrls: Record<string, string>;
}

export type ProgressCallback = (message: string, current: number, total: number) => void;
