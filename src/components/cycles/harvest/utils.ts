import { addDays, format, differenceInDays, parseISO, isAfter, isBefore, isEqual, startOfDay } from "date-fns";
import { GlebaHarvestRow, HarvestParams, ScheduleRow } from "./types";

export function calcHarvestDate(plantingDate: string | null, cycleDays: number): string | null {
  if (!plantingDate) return null;
  return format(addDays(parseISO(plantingDate), cycleDays), "yyyy-MM-dd");
}

export function buildGlebaRows(
  glebas: any[],
  plantingPlans: any[],
  plantingActuals: any[],
  moistureSamples: any[],
  params: HarvestParams,
  femaleArea: number
): GlebaHarvestRow[] {
  const today = startOfDay(new Date());

  // If no glebas, create a single "Campo inteiro" row
  const glebaList = glebas.length > 0
    ? glebas.map((g: any) => ({ id: g.id, name: g.name, area: g.area_ha || 0 }))
    : [{ id: null, name: "Campo inteiro", area: femaleArea }];

  return glebaList.map((gleba) => {
    // Find planned planting date for this gleba (female type)
    const plans = plantingPlans
      .filter((p: any) => p.type === "female" && (gleba.id ? p.gleba_id === gleba.id : true))
      .sort((a: any, b: any) => b.planned_date.localeCompare(a.planned_date));
    const plannedPlantingDate = plans[0]?.planned_date || null;

    // Find actual planting date - planting_actual links via planting_plan_id
    const planIds = plans.map((p: any) => p.id);
    const actuals = plantingActuals
      .filter((a: any) => a.type === "female" && (
        (a.planting_plan_id && planIds.includes(a.planting_plan_id)) ||
        (!a.planting_plan_id && !gleba.id)
      ))
      .sort((a: any, b: any) => b.planting_date.localeCompare(a.planting_date));
    const actualPlantingDate = actuals[0]?.planting_date || null;

    const plannedHarvestDate = calcHarvestDate(plannedPlantingDate, params.cycleDays);
    const updatedHarvestDate = calcHarvestDate(actualPlantingDate || plannedPlantingDate, params.cycleDays);
    const isConfirmed = !!actualPlantingDate;

    // Deviation
    let deviationDays: number | null = null;
    if (plannedHarvestDate && updatedHarvestDate && isConfirmed) {
      deviationDays = differenceInDays(parseISO(updatedHarvestDate), parseISO(plannedHarvestDate));
    }

    // Moisture status
    const glebaMoisture = moistureSamples.filter((m: any) =>
      gleba.id ? m.gleba_id === gleba.id : true
    );
    let moistureStatus: GlebaHarvestRow["moistureStatus"] = "no_data";
    let moistureAvg: number | null = null;
    if (glebaMoisture.length > 0) {
      const vals = glebaMoisture.map((m: any) => m.moisture_pct);
      moistureAvg = vals.reduce((s: number, v: number) => s + v, 0) / vals.length;
      const belowTarget = vals.filter((v: number) => v <= params.targetMoisture).length;
      const pct = belowTarget / vals.length;
      if (pct >= 0.8) moistureStatus = "ready";
      else if (pct >= 0.5) moistureStatus = "almost";
      else moistureStatus = "not_ready";
    }

    // Overall status
    let overallStatus: GlebaHarvestRow["overallStatus"] = "awaiting_planting";
    if (!isConfirmed && !plannedPlantingDate) {
      overallStatus = "awaiting_planting";
    } else if (updatedHarvestDate) {
      const harvestDate = startOfDay(parseISO(updatedHarvestDate));
      const dateReached = !isAfter(harvestDate, today);
      if (dateReached && moistureStatus === "ready") {
        overallStatus = "ready_to_harvest";
      } else if (dateReached && moistureStatus !== "ready") {
        overallStatus = "date_reached_moisture_high";
      } else {
        overallStatus = "scheduled";
      }
    }

    return {
      glebaId: gleba.id,
      glebaName: gleba.name,
      areaHa: gleba.area,
      plannedPlantingDate,
      plannedHarvestDate,
      actualPlantingDate,
      updatedHarvestDate,
      isConfirmed,
      deviationDays,
      moistureStatus,
      moistureAvg,
      overallStatus,
    };
  }).sort((a, b) => {
    if (!a.updatedHarvestDate && !b.updatedHarvestDate) return 0;
    if (!a.updatedHarvestDate) return 1;
    if (!b.updatedHarvestDate) return -1;
    return a.updatedHarvestDate.localeCompare(b.updatedHarvestDate);
  });
}

export function buildSchedule(rows: GlebaHarvestRow[], targetHaPerDay: number): ScheduleRow[] {
  if (targetHaPerDay <= 0) return [];
  const schedule: ScheduleRow[] = [];
  let accumulated = 0;
  const totalArea = rows.reduce((s, r) => s + r.areaHa, 0);
  if (totalArea === 0) return [];

  // Sort by updatedHarvestDate asc
  const sorted = [...rows].filter(r => r.updatedHarvestDate).sort((a, b) =>
    (a.updatedHarvestDate || "").localeCompare(b.updatedHarvestDate || "")
  );

  let dayNum = 1;
  let currentDate: Date | null = null;

  for (const gleba of sorted) {
    const startDate = parseISO(gleba.updatedHarvestDate!);
    if (!currentDate || isAfter(startDate, currentDate)) {
      currentDate = startDate;
    }
    let remaining = gleba.areaHa;
    while (remaining > 0) {
      const todayArea = Math.min(remaining, targetHaPerDay);
      accumulated += todayArea;
      remaining -= todayArea;
      schedule.push({
        day: dayNum,
        date: format(currentDate, "yyyy-MM-dd"),
        glebaName: gleba.glebaName,
        glebaId: gleba.glebaId,
        areaPlanned: Math.round(todayArea * 100) / 100,
        accumulated: Math.round(accumulated * 100) / 100,
        pctTotal: Math.round((accumulated / totalArea) * 1000) / 10,
      });
      dayNum++;
      currentDate = addDays(currentDate, 1);
    }
  }

  return schedule;
}

export function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = parseISO(dateStr);
  return format(d, "dd/MM/yyyy");
}

export const GLEBA_COLORS = [
  "#1E88E5", "#4CAF50", "#FF9800", "#9C27B0", "#F44336",
  "#00BCD4", "#795548", "#607D8B", "#E91E63", "#3F51B5",
];
