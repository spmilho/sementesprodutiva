import { supabase } from "@/integrations/supabase/client";
import type { ReportData, ReportCycleData, OrgSettings } from "./reportTypes";

const sb = supabase as any;

export async function fetchReportData(cycleId: string, cycle: any): Promise<ReportData> {
  const orgId = cycle.org_id;

  const [
    orgSettingsRes,
    orgRes,
    seedLotsRes,
    plantingPlanRes,
    plantingRes,
    glebasRes,
    standCountsRes,
    fertRes,
    phenoRes,
    nickMilestonesRes,
    nickObsRes,
    inspImportsRes,
    detasselingRes,
    chemicalsRes,
    pestsRes,
    moistureRes,
    yieldEstRes,
    harvestPlanRes,
    harvestRes,
    attachRes,
    cropInputsRes,
    irrigationRes,
    rainfallRes,
    waterFilesRes,
    roguingRes,
    roguingEvalRes,
    roguingReqRes,
    roguingExecRes,
    plantingCvRes,
    standCvRes,
    ndviAnalysesRes,
    fieldVisitsRes,
    emergenceRes,
    weatherRes,
  ] = await Promise.all([
    sb.from("organization_settings").select("*").eq("org_id", orgId).maybeSingle(),
    sb.from("organizations").select("name, slogan").eq("id", orgId).single(),
    sb.from("seed_lots").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("parent_type").order("lot_number"),
    sb.from("planting_plan").select("*, pivot_glebas(name, parent_type, area_ha)").eq("cycle_id", cycleId).is("deleted_at", null),
    sb.from("planting_actual").select("*, pivot_glebas(name, parent_type, area_ha)").eq("cycle_id", cycleId).is("deleted_at", null).order("planting_date"),
    sb.from("pivot_glebas").select("*").eq("cycle_id", cycleId).is("deleted_at", null),
    sb.from("stand_counts").select("*, pivot_glebas(name, parent_type)").eq("cycle_id", cycleId).is("deleted_at", null).order("count_date"),
    sb.from("fertilization_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("application_date"),
    sb.from("phenology_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("observation_date"),
    sb.from("nicking_milestones").select("*, nicking_fixed_points(name, parent_type)").eq("cycle_id", cycleId),
    sb.from("nicking_observations").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("observation_date"),
    sb.from("inspection_imports").select("*").eq("cycle_id", cycleId).is("deleted_at", null),
    sb.from("detasseling_records").select("*, pivot_glebas(name)").eq("cycle_id", cycleId).is("deleted_at", null).order("operation_date"),
    sb.from("chemical_applications").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("application_date"),
    sb.from("pest_disease_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("observation_date"),
    sb.from("moisture_samples").select("*, pivot_glebas(name)").eq("cycle_id", cycleId).is("deleted_at", null).order("sample_date"),
    sb.from("yield_estimates").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("estimate_number", { ascending: false }).limit(1),
    sb.from("harvest_plan").select("*, pivot_glebas(name)").eq("cycle_id", cycleId).is("deleted_at", null),
    sb.from("harvest_records").select("*, pivot_glebas(name)").eq("cycle_id", cycleId).is("deleted_at", null).order("harvest_date"),
    sb.from("attachments").select("*").eq("entity_id", cycleId).is("deleted_at", null),
    sb.from("crop_inputs").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("execution_date"),
    sb.from("irrigation_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("start_date"),
    sb.from("rainfall_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("record_date"),
    sb.from("water_files").select("*").eq("cycle_id", cycleId).is("deleted_at", null),
    sb.from("roguing_records").select("*, pivot_glebas(name)").eq("cycle_id", cycleId).is("deleted_at", null).order("operation_date"),
    sb.from("ndvi_analyses").select("*").eq("cycle_id", cycleId).order("analysis_date", { ascending: false }).limit(3),
    sb.from("field_visits").select("*, field_visit_scores(*), field_visit_photos(*)").eq("cycle_id", cycleId).order("visit_date", { ascending: false }),
    sb.from("emergence_counts").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("count_date"),
    sb.from("weather_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("record_date"),
  ]);

  // Fetch seed lot treatments if we have seed lots
  let seedLotTreatments: any[] = [];
  let seedLotTreatmentProducts: any[] = [];
  if (seedLotsRes.data?.length > 0) {
    const lotIds = seedLotsRes.data.map((l: any) => l.id);
    const [treatRes] = await Promise.all([
      sb.from("seed_lot_treatments").select("*").in("seed_lot_id", lotIds).is("deleted_at", null),
    ]);
    seedLotTreatments = treatRes.data || [];
    if (seedLotTreatments.length > 0) {
      const treatIds = seedLotTreatments.map((t: any) => t.id);
      const prodRes = await sb.from("seed_lot_treatment_products").select("*").in("seed_lot_treatment_id", treatIds).order("application_order");
      seedLotTreatmentProducts = prodRes.data || [];
    }
  }

  // Fetch inspection data if we have imports
  let inspectionData: any[] = [];
  if (inspImportsRes.data?.length > 0) {
    const importIds = inspImportsRes.data.map((i: any) => i.id);
    const inspDataRes = await sb.from("inspection_data").select("*").in("import_id", importIds).order("inspection_number");
    inspectionData = inspDataRes.data || [];
  }

  // Fetch yield sample points if we have estimates
  let yieldSamplePoints: any[] = [];
  if (yieldEstRes.data?.length > 0) {
    const estId = yieldEstRes.data[0].id;
    const spRes = await sb.from("yield_sample_points").select("*").eq("yield_estimate_id", estId).order("point_number");
    yieldSamplePoints = spRes.data || [];
  }

  // Fetch stand count points
  let standCountPoints: any[] = [];
  if (standCountsRes.data?.length > 0) {
    const scIds = standCountsRes.data.map((s: any) => s.id);
    const scpRes = await sb.from("stand_count_points").select("*").in("stand_count_id", scIds);
    standCountPoints = scpRes.data || [];
  }

  // Fetch CV points for planting actual
  let cvPoints: any[] = [];
  if (plantingRes.data?.length > 0) {
    const paIds = plantingRes.data.map((p: any) => p.id);
    const cvRes = await sb.from("planting_cv_points").select("*").in("planting_actual_id", paIds);
    cvPoints = cvRes.data || [];
  }

  // Fetch NDVI images
  let ndviImages: any[] = [];
  const ndviPolRes = await sb.from("ndvi_polygons").select("agro_polygon_id").eq("cycle_id", cycleId).is("deleted_at", null).maybeSingle();
  if (ndviPolRes.data?.agro_polygon_id) {
    const imgRes = await sb.from("ndvi_images").select("*").eq("agro_polygon_id", ndviPolRes.data.agro_polygon_id).order("capture_date", { ascending: false });
    ndviImages = imgRes.data || [];
  }

  // Generate signed URLs for photos stored in private buckets
  const photoSignedUrls = await resolvePhotoUrls(
    seedLotsRes.data || [],
    plantingRes.data || [],
    detasselingRes.data || [],
    chemicalsRes.data || [],
    pestsRes.data || [],
    moistureRes.data || [],
    phenoRes.data || [],
    roguingRes.data || [],
    attachRes.data || [],
    fieldVisitsRes.data || [],
  );

  const reportCycle: ReportCycleData = {
    id: cycle.id,
    org_id: orgId,
    client_id: cycle.client_id,
    client_name: cycle.clients?.name || "—",
    cooperator_name: cycle.cooperators?.name || null,
    farm_name: cycle.farms?.name || "—",
    field_name: cycle.field_name,
    hybrid_name: cycle.hybrid_name,
    female_line: cycle.female_line,
    male_line: cycle.male_line,
    season: cycle.season,
    status: cycle.status,
    total_area: cycle.total_area,
    female_area: cycle.female_area,
    male_area: cycle.male_area,
    female_male_ratio: cycle.female_male_ratio,
    irrigation_system: cycle.irrigation_system,
    material_split: cycle.material_split || null,
    spacing_female_female_cm: cycle.spacing_female_female_cm ?? null,
    spacing_female_male_cm: cycle.spacing_female_male_cm ?? null,
    spacing_male_male_cm: cycle.spacing_male_male_cm ?? null,
    contract_number: cycle.contract_number,
    material_cycle_days: cycle.material_cycle_days,
    detasseling_dap: cycle.detasseling_dap ?? null,
    target_moisture: cycle.target_moisture,
    expected_productivity: cycle.expected_productivity,
    expected_production: cycle.expected_production,
    pivot_id: cycle.pivot_id,
  };

  const orgSettings: OrgSettings = {
    report_cover_url: orgSettingsRes.data?.report_cover_url || null,
    report_logo_url: orgSettingsRes.data?.report_logo_url || null,
    report_footer_text: orgSettingsRes.data?.report_footer_text || null,
    org_name: orgRes.data?.name || "Sementes Produtiva",
    org_slogan: orgRes.data?.slogan || null,
  };

  return {
    cycle: reportCycle,
    orgSettings,
    seedLots: seedLotsRes.data || [],
    seedLotTreatments,
    seedLotTreatmentProducts,
    plantingPlan: plantingPlanRes.data || [],
    plantingActual: plantingRes.data || [],
    cvPoints,
    glebas: glebasRes.data || [],
    standCounts: standCountsRes.data || [],
    standCountPoints,
    fertilizations: fertRes.data || [],
    phenology: phenoRes.data || [],
    nickingMilestones: nickMilestonesRes.data || [],
    nickingObservations: nickObsRes.data || [],
    inspectionImports: inspImportsRes.data || [],
    inspectionData,
    detasseling: detasselingRes.data || [],
    chemicals: chemicalsRes.data || [],
    pests: pestsRes.data || [],
    moisture: moistureRes.data || [],
    yieldEstimates: yieldEstRes.data || [],
    yieldSamplePoints,
    harvestPlan: harvestPlanRes.data || [],
    harvestRecords: harvestRes.data || [],
    attachments: attachRes.data || [],
    cropInputs: cropInputsRes.data || [],
    irrigationRecords: irrigationRes.data || [],
    rainfallRecords: rainfallRes.data || [],
    waterFiles: waterFilesRes.data || [],
    roguingRecords: roguingRes.data || [],
    ndviAnalyses: ndviAnalysesRes.data || [],
    ndviImages,
    fieldVisits: fieldVisitsRes.data || [],
    emergenceCounts: emergenceRes.data || [],
    weatherRecords: weatherRes.data || [],
    photoSignedUrls,
  };
}

/** Resolve storage paths to signed URLs for photos in private buckets */
async function resolvePhotoUrls(...recordArrays: any[][]): Promise<Record<string, string>> {
  const storagePaths = new Set<string>();

  for (const records of recordArrays) {
    for (const record of records) {
      const photos = Array.isArray(record?.photos) ? record.photos : [];
      for (const p of photos) {
        if (p && typeof p === "string" && !p.startsWith("http")) {
          storagePaths.add(p);
        }
      }
      // Single photo_url field (phenology, field_visit_photos)
      if (record?.photo_url && typeof record.photo_url === "string" && !record.photo_url.startsWith("http")) {
        storagePaths.add(record.photo_url);
      }
      // Also check file_url for attachments
      if (record?.file_url && typeof record.file_url === "string" && !record.file_url.startsWith("http")) {
        storagePaths.add(record.file_url);
      }
      // Nested field_visit_photos
      if (Array.isArray(record?.field_visit_photos)) {
        for (const fp of record.field_visit_photos) {
          if (fp?.photo_url && typeof fp.photo_url === "string" && !fp.photo_url.startsWith("http")) {
            storagePaths.add(fp.photo_url);
          }
        }
      }
    }
  }

  if (storagePaths.size === 0) return {};

  const pathsArray = Array.from(storagePaths);
  const urlMap: Record<string, string> = {};

  // Try to create signed URLs in batches
  const buckets = ["cycle-media", "field-visit-photos", "cycle-documents"];
  for (const bucket of buckets) {
    const bucketPaths = pathsArray.filter(p => !urlMap[p]);
    if (bucketPaths.length === 0) break;

    try {
      const { data } = await sb.storage.from(bucket).createSignedUrls(bucketPaths, 60 * 60 * 24);
      if (data) {
        for (const item of data) {
          if (item.signedUrl && !item.error) {
            urlMap[item.path] = item.signedUrl;
          }
        }
      }
    } catch {
      // Ignore - paths may not be in this bucket
    }
  }

  return urlMap;
}
