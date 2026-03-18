import { fetchReportData } from "./useReportData";
import type { ReportData } from "./reportTypes";

export type ProgressCallback = (message: string, current: number, total: number) => void;

function getParentLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  if (value === "female") return "Fêmea";
  if (value === "male" || value === "male_1") return "Macho 1";
  if (value === "male_2") return "Macho 2";
  if (value === "male_3") return "Macho 3";
  return value;
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolvePhotoUrl(path: string, urlMap: Record<string, string>): string {
  if (isHttpUrl(path)) return path;
  return urlMap[path] || path;
}

function collectPhotoUrls(data: ReportData): any[] {
  const photos: any[] = [];
  const urlMap = data.photoSignedUrls || {};

  const pushPhotos = (records: any[], module: string, dateField: string, contextField?: string) => {
    records.forEach((record) => {
      const recordPhotos = Array.isArray(record?.photos) ? record.photos : [];
      recordPhotos.forEach((photoPath: string) => {
        if (!photoPath) return;
        photos.push({
          module,
          date: fmtDate(record?.[dateField]) || null,
          context: contextField ? record?.[contextField] || null : null,
          url: resolvePhotoUrl(photoPath, urlMap),
        });
      });
    });
  };

  pushPhotos(data.detasseling, "Despendoamento", "operation_date", "notes");
  pushPhotos(data.chemicals, "Manejo Químico", "application_date", "product_name");
  pushPhotos(data.pests, "Pragas e Doenças", "observation_date", "pest_name");
  pushPhotos(data.moisture, "Umidade", "sample_date", "point_identifier");
  pushPhotos(data.phenology, "Fenologia", "observation_date", "growth_stage");

  (data.attachments || []).forEach((att: any) => {
    if (att.file_type?.startsWith("image/") && att.document_category !== "relatorio") {
      const url = att.file_url ? resolvePhotoUrl(att.file_url, urlMap) : null;
      if (url) {
        photos.push({
          module: att.document_category || "Documento",
          date: fmtDate(att.created_at?.substring(0, 10)) || null,
          context: att.description || att.file_name || null,
          url,
        });
      }
    }
  });

  return photos;
}

const T_BASE = 10;

function calcGDU(tmax: number | null, tmin: number | null): number {
  if (tmax == null || tmin == null) return 0;
  return Math.max(0, (Math.min(tmax, 30) + Math.max(tmin, T_BASE)) / 2 - T_BASE);
}

function buildReportPayload(data: ReportData) {
  const seedLotsById = new Map(data.seedLots.map((lot: any) => [lot.id, lot]));
  const seedLotNumberById = new Map(data.seedLots.map((lot: any) => [lot.id, lot.lot_number || "N/A"]));
  const estimate = data.yieldEstimates[0] || null;

  const weatherSorted = [...(data.weatherRecords || [])].sort((a: any, b: any) => (a.record_date || "").localeCompare(b.record_date || ""));

  const phenologySorted = [...(data.phenology || [])]
    .sort((a: any, b: any) => (a.observation_date || "").localeCompare(b.observation_date || ""));

  const phenologyByDate = new Map<string, string>();
  phenologySorted.forEach((r: any) => {
    const date = r.observation_date;
    const stage = r.growth_stage || r.stage;
    if (date && stage) phenologyByDate.set(date, stage);
  });

  let accGdu = 0;
  let currentStage: string | null = null;

  const clima = weatherSorted.map((r: any) => {
    const dailyGdu = calcGDU(r.temp_max_c, r.temp_min_c);
    accGdu += dailyGdu;

    const stageOnDate = phenologyByDate.get(r.record_date);
    if (stageOnDate) currentStage = stageOnDate;

    return {
      data: fmtDate(r.record_date),
      data_iso: r.record_date,
      temp_max: r.temp_max_c,
      temp_min: r.temp_min_c,
      temp_media: r.temp_avg_c,
      ur_max: r.humidity_max_pct,
      ur_min: r.humidity_min_pct,
      ur_media: r.humidity_avg_pct,
      vento_media: r.wind_avg_kmh,
      vento_max: r.wind_max_kmh,
      eto_mm: r.eto_mm,
      chuva_mm: r.precipitation_mm,
      radiacao_mj: r.radiation_mj ?? null,
      gdu_diario: Math.round(dailyGdu * 10) / 10,
      gdu_acumulado: Math.round(accGdu),
      estadio: currentStage,
    };
  });

  const temps = weatherSorted.filter((r: any) => r.temp_avg_c != null).map((r: any) => r.temp_avg_c);
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const clima_resumo = weatherSorted.length > 0
    ? {
        dias: weatherSorted.length,
        temp_media: avg(temps) != null ? Number(avg(temps)!.toFixed(1)) : null,
        gdu_total: accGdu > 0 ? Math.round(accGdu) : null,
      }
    : null;

  return {
    hibrido: data.cycle.hybrid_name || "N/A",
    linhagem_femea: data.cycle.female_line || null,
    linhagem_macho: data.cycle.male_line || null,
    safra: data.cycle.season || "N/A",
    contrato: data.cycle.contract_number || "N/A",
    cliente: data.cycle.client_name || "N/A",
    cooperado: data.cycle.cooperator_name || "N/A",
    fazenda: data.cycle.farm_name || "N/A",
    pivo: data.cycle.field_name || "N/A",
    area_total: data.cycle.total_area ?? null,
    area_femea: data.cycle.female_area ?? null,
    area_macho: data.cycle.male_area ?? null,
    area_macho_1: data.cycle.male_area ?? null,
    area_macho_2: data.cycle.male_area ?? null,
    proporcao_fm: data.cycle.female_male_ratio || null,
    sistema_irrigacao: data.cycle.irrigation_system || null,
    split: data.cycle.material_split || "N/A",
    espacamento_ff: data.cycle.spacing_female_female_cm ?? null,
    espacamento_fm: data.cycle.spacing_female_male_cm ?? null,
    espacamento_mm: data.cycle.spacing_male_male_cm ?? null,
    ciclo_dias: data.cycle.material_cycle_days ?? null,
    desp_dap: data.cycle.detasseling_dap ?? null,
    umidade_alvo: data.cycle.target_moisture ?? null,
    produtividade_esperada: data.cycle.expected_productivity ?? null,
    producao_esperada: data.cycle.expected_production ?? null,
    organizacao: data.orgSettings.org_name || "",
    logo_url: data.orgSettings.report_logo_url || null,

    glebas: (data.glebas || []).map((g: any) => ({
      nome: g.name || "N/A",
      parental: getParentLabel(g.parent_type),
      area_ha: g.area_ha ?? null,
      linhas: g.rows_count ?? null,
    })),

    lotes_semente: data.seedLots.map((lot: any) => ({
      lote: lot.lot_number || "N/A",
      parental: getParentLabel(lot.parent_type),
      origem: lot.supplier_origin || null,
      peneira: lot.sieve_classification || null,
      pms: lot.thousand_seed_weight_g ?? null,
      germinacao: lot.germination_pct ?? null,
      vigor: lot.vigor_pct ?? null,
      pureza: lot.purity_pct ?? null,
      tem_ts: lot.has_treatment ? "Sim" : "Não",
    })),

    tratamentos: data.seedLotTreatments.map((t: any) => {
      const lot = seedLotsById.get(t.seed_lot_id);
      const products = data.seedLotTreatmentProducts.filter((p: any) => p.seed_lot_treatment_id === t.id);
      return {
        lote: lot?.lot_number || "N/A",
        parental: getParentLabel(lot?.parent_type),
        data: fmtDate(t.treatment_date),
        local: t.treatment_location || null,
        produtos: products.map((p: any) => ({
          produto: p.product_name || "N/A",
          tipo: p.product_type || null,
          ia: p.active_ingredient || null,
          dose: p.dose ?? null,
          unidade: p.dose_unit || null,
        })),
      };
    }),

    plantio: data.plantingActual.map((p: any) => ({
      data: fmtDate(p.planting_date),
      tipo: getParentLabel(p.type || p.planting_type || p.pivot_glebas?.parent_type),
      gleba: p.pivot_glebas?.name || p.gleba_name || "Geral",
      lote: seedLotNumberById.get(p.seed_lot_id) || p.seed_lot_number || "N/A",
      area: p.actual_area ?? p.area_planted_ha ?? null,
      espacamento: p.row_spacing ?? p.row_spacing_cm ?? null,
      sem_metro: p.seeds_per_meter_actual ?? p.seeds_per_meter ?? p.seeds_per_meter_set ?? null,
      cv_plantio: p.cv_percent ?? p.cv_planting ?? null,
      solo: p.soil_condition || null,
    })),

    stand: data.standCounts.map((s: any) => ({
      data: fmtDate(s.count_date),
      tipo_contagem: s.count_type || s.type || null,
      parental: getParentLabel(s.parent_type || s.pivot_glebas?.parent_type),
      gleba: s.pivot_glebas?.name || s.gleba_name || "Geral",
      dap: s.days_after_planting ?? null,
      pontos: data.standCountPoints.filter((p: any) => p.stand_count_id === s.id).length,
      pop_plha: s.avg_plants_per_ha ?? s.plants_per_ha ?? null,
      cv_stand: s.cv_stand_pct ?? s.cv_percent ?? null,
      emergencia: s.emergence_pct ?? null,
    })),

    insumos: data.cropInputs.map((i: any) => ({
      data_exec: fmtDate(i.execution_date),
      data_rec: fmtDate(i.recommendation_date),
      produto: i.product_name || "N/A",
      ia: i.active_ingredient || null,
      tipo: i.input_type || null,
      dose_ha: i.dose_per_ha ?? null,
      unidade: i.unit || null,
      evento: i.event_type || null,
      status: i.status || null,
    })),

    fenologia: data.phenology.map((r: any) => ({
      data: fmtDate(r.observation_date || r.record_date),
      parental: getParentLabel(r.parent_type),
      estadio: r.growth_stage || r.stage || null,
      dap: r.days_after_planting ?? null,
      observacao: r.description || r.notes || null,
    })),

    ndvi_imagens: (data.ndviImages || [])
      .filter((i: any) => (i.cloud_over_field_pct ?? 0) <= 30)
      .map((i: any) => ({
        data: fmtDate(i.capture_date),
        ndvi_medio: i.ndvi_mean ?? null,
        ndvi_min: i.ndvi_min ?? null,
        ndvi_max: i.ndvi_max ?? null,
      })),

    ndvi_parecer: data.ndviAnalyses?.[0]?.analysis_text || data.ndviAnalyses?.[0]?.technical_analysis || null,

    nicking_marcos: data.nickingMilestones.map((m: any) => ({
      parental: getParentLabel(m.parent_type),
      ponto: m.nicking_fixed_points?.name || null,
      marco: m.milestone_name || "N/A",
      data: fmtDate(m.milestone_date),
      dap: m.dap ?? null,
    })),

    nicking_observacoes: (data.nickingObservations || []).map((o: any) => ({
      data: fmtDate(o.observation_date),
      ponto_fixo: o.fixed_point_name || null,
      parental: getParentLabel(o.parent_type),
      estadio: o.growth_stage || null,
      pendao_pct: o.tassel_pct ?? null,
      estigma_pct: o.silk_pct ?? null,
      notas: o.notes || null,
    })),

    despendoamento: data.detasseling.map((r: any) => ({
      passada: r.pass_number ?? r.pass_type ?? null,
      data: fmtDate(r.operation_date),
      gleba: r.pivot_glebas?.name || null,
      area: r.area_ha ?? r.area_worked_ha ?? null,
      metodo: r.method || null,
      equipe: r.team_size ?? null,
      pct_removido: r.pct_removed ?? r.pct_detasseled_this_pass ?? null,
      pct_remanescente: r.pct_remaining ?? r.pct_remaining_after ?? null,
      notas: r.notes || null,
    })),

    pragas: data.pests.map((p: any) => ({
      data: fmtDate(p.observation_date),
      nome: p.pest_name || "N/A",
      tipo: p.pest_type || null,
      incidencia: p.incidence_pct ?? null,
      severidade: p.severity ?? null,
      parental: getParentLabel(p.affected_parent),
      estadio: p.growth_stage || null,
      acao: p.action_taken || null,
    })),

    irrigacao: data.irrigationRecords.map((r: any) => ({
      data: fmtDate(r.start_date),
      data_iso: r.start_date,
      lamina_mm: r.depth_mm ?? null,
    })),

    chuva: data.rainfallRecords.map((r: any) => ({
      data: fmtDate(r.record_date),
      data_iso: r.record_date,
      mm: r.precipitation_mm ?? null,
    })),

    clima,
    clima_resumo,

    umidade: data.moisture.map((s: any) => ({
      data: fmtDate(s.sample_date),
      gleba: s.pivot_glebas?.name || s.gleba_name || "Geral",
      umidade_pct: s.moisture_pct ?? null,
      estadio: s.growth_stage || null,
      ponto: s.point_identifier || null,
    })),

    estimativa: estimate
      ? {
          pontos: data.yieldSamplePoints.map((p: any) => ({
            ponto: p.point_number ?? null,
            gleba: p.gleba_name || null,
            espigas_ha: p.ears_per_ha ?? null,
            graos_espiga: p.avg_kernels_per_ear ?? null,
            umidade: p.moisture_pct ?? null,
            prod_bruta: p.gross_yield_kg_ha ?? null,
          })),
          prod_liquida_kgha: estimate.net_yield_kg_ha ?? null,
          prod_total_ton: estimate.total_production_tons ?? null,
          sc_ha: estimate.bags_per_ha ?? null,
        }
      : null,

    colheita: data.harvestRecords.map((r: any) => ({
      data: fmtDate(r.harvest_date),
      gleba: r.pivot_glebas?.name || "Geral",
      area: r.area_harvested_ha ?? null,
      umidade: r.avg_moisture_pct ?? null,
      cargas: r.loads_count ?? null,
      peso_carga: r.weight_per_load_tons ?? null,
      tons: r.total_weight_tons ?? null,
      destino: r.delivery_destination || null,
    })),

    visitas: data.fieldVisits.map((v: any) => ({
      data: fmtDate(v.visit_date),
      numero: v.visit_number ?? null,
      estagio: v.stage || null,
      tecnico: v.technician_name || null,
      nota_final: v.final_score ?? null,
      nota_maxima: v.max_possible_score ?? null,
      observacoes: v.general_notes || null,
      scores: (v.field_visit_scores || []).map((s: any) => ({
        estagio: s.stage || null,
        subitem: s.subitem || null,
        nota: s.score_value || null,
        pontos: s.score_points ?? null,
        obs: s.notes || null,
      })),
    })),

    fotos: collectPhotoUrls(data),
  };
}

export async function generateReportData(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<any> {
  const totalSteps = 3;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  progress("📊 Coletando dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  progress("🔄 Processando dados...", 2);
  const payload = buildReportPayload(data);

  progress("✅ Dados prontos!", 3);
  return payload;
}
