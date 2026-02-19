export interface HarvestParams {
  cycleDays: number;
  targetMoisture: number;
  targetHaPerDay: number;
  bagWeightKg: number;
}

export interface GlebaHarvestRow {
  glebaId: string | null;
  glebaName: string;
  areaHa: number;
  plannedPlantingDate: string | null;
  plannedHarvestDate: string | null;
  actualPlantingDate: string | null;
  updatedHarvestDate: string | null;
  isConfirmed: boolean;
  deviationDays: number | null;
  moistureStatus: "ready" | "almost" | "not_ready" | "no_data";
  moistureAvg: number | null;
  overallStatus: "ready_to_harvest" | "scheduled" | "date_reached_moisture_high" | "awaiting_planting";
}

export interface ScheduleRow {
  day: number;
  date: string;
  glebaName: string;
  glebaId: string | null;
  areaPlanned: number;
  accumulated: number;
  pctTotal: number;
}
