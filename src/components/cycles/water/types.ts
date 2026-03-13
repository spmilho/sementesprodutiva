export interface WaterFile {
  id: string;
  cycle_id: string;
  org_id: string;
  file_name: string;
  file_type: string;
  content_type: string;
  description: string | null;
  reference_date: string | null;
  file_url: string;
  file_size_bytes: number;
  parsed_data: ParsedExcelData | null;
  extracted_html: string | null;
  extracted_images: string[] | null;
  created_by: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface ParsedExcelData {
  headers: string[];
  rows: Record<string, string | number | null>[];
  columnMappings?: Record<string, string>;
}

export interface IrrigationRecord {
  id: string;
  cycle_id: string;
  org_id: string;
  source: string;
  source_file_id: string | null;
  start_date: string;
  end_date: string | null;
  depth_mm: number;
  duration_hours: number | null;
  system_type: string | null;
  sector: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RainfallRecord {
  id: string;
  cycle_id: string;
  org_id: string;
  source: string;
  source_file_id: string | null;
  record_date: string;
  precipitation_mm: number;
  method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const CONTENT_TYPE_OPTIONS = [
  { value: "irrigation", label: "Relatório de Irrigação" },
  { value: "rainfall", label: "Dados de Chuva / Pluviometria" },
  { value: "climate", label: "Relatório Climático" },
  { value: "management", label: "Manejo de Irrigação" },
  { value: "water_balance", label: "Balanço Hídrico" },
  { value: "pivot_report", label: "Relatório de Pivô" },
  { value: "other", label: "Outro" },
] as const;

export const COLUMN_MAPPING_OPTIONS = [
  { value: "ignore", label: "— Ignorar —" },
  { value: "date", label: "Data" },
  { value: "irrigation_mm", label: "Lâmina (mm)" },
  { value: "duration_h", label: "Tempo (h)" },
  { value: "precipitation_mm", label: "Precipitação (mm)" },
  { value: "eto_mm", label: "ETo (mm)" },
  { value: "temperature_c", label: "Temperatura (°C)" },
  { value: "humidity_pct", label: "Umidade (%)" },
  { value: "wind_kmh", label: "Vento (km/h)" },
] as const;
