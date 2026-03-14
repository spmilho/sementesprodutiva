import { fetchReportData } from "./useReportData";
import { supabase } from "@/integrations/supabase/client";
import type { ReportData } from "./reportTypes";

export type ProgressCallback = (message: string, current: number, total: number) => void;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getParentLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  if (value === "female") return "Fêmea";
  if (value === "male" || value === "male_1") return "Macho";
  if (value === "male_2") return "Macho 2";
  return value;
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").trim();
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

  // Attachments (photos from field visits, documents, etc.)
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
const T_MAX_CAP = 30;

function calcGDU(tmax: number | null, tmin: number | null): number {
  if (tmax == null || tmin == null) return 0;
  const adjMax = Math.min(tmax, T_MAX_CAP);
  const adjMin = Math.max(tmin, T_BASE);
  const gdu = (adjMax + adjMin) / 2 - T_BASE;
  return Math.max(0, gdu);
}

function buildReportData(data: ReportData) {
  const seedLotsById = new Map(data.seedLots.map((lot: any) => [lot.id, lot]));
  const estimate = data.yieldEstimates[0] || null;
  const urlMap = data.photoSignedUrls || {};

  // Weather summary with GDU
  const weatherSorted = [...(data.weatherRecords || [])].sort((a: any, b: any) => (a.record_date || "").localeCompare(b.record_date || ""));
  let accGdu = 0;
  const weatherData = weatherSorted.map((r: any) => {
    const dailyGdu = calcGDU(r.temp_max_c, r.temp_min_c);
    accGdu += dailyGdu;
    return {
      data: fmtDate(r.record_date),
      temp_max: r.temp_max_c,
      temp_min: r.temp_min_c,
      temp_media: r.temp_avg_c,
      ur_max: r.humidity_max_pct,
      ur_min: r.humidity_min_pct,
      ur_media: r.humidity_avg_pct,
      vento_max: r.wind_max_kmh,
      vento_medio: r.wind_avg_kmh,
      radiacao: r.radiation_mj,
      eto: r.eto_mm,
      chuva_mm: r.precipitation_mm,
      gdu_diario: Math.round(dailyGdu * 10) / 10,
      gdu_acumulado: Math.round(accGdu),
    };
  });

  // Weather KPIs
  const temps = weatherSorted.filter((r: any) => r.temp_avg_c != null).map((r: any) => r.temp_avg_c);
  const tempMaxes = weatherSorted.filter((r: any) => r.temp_max_c != null).map((r: any) => r.temp_max_c);
  const tempMins = weatherSorted.filter((r: any) => r.temp_min_c != null).map((r: any) => r.temp_min_c);
  const humids = weatherSorted.filter((r: any) => r.humidity_avg_pct != null).map((r: any) => r.humidity_avg_pct);
  const winds = weatherSorted.filter((r: any) => r.wind_avg_kmh != null).map((r: any) => r.wind_avg_kmh);
  const etos = weatherSorted.filter((r: any) => r.eto_mm != null).map((r: any) => r.eto_mm);
  const precips = weatherSorted.filter((r: any) => r.precipitation_mm != null).map((r: any) => r.precipitation_mm);
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const clima_resumo = weatherSorted.length > 0 ? {
    dias: weatherSorted.length,
    temp_media: avg(temps) != null ? Number(avg(temps)!.toFixed(1)) : null,
    temp_max_absoluta: tempMaxes.length > 0 ? Math.max(...tempMaxes) : null,
    temp_min_absoluta: tempMins.length > 0 ? Math.min(...tempMins) : null,
    ur_media: avg(humids) != null ? Number(avg(humids)!.toFixed(0)) : null,
    vento_medio: avg(winds) != null ? Number(avg(winds)!.toFixed(1)) : null,
    eto_total: etos.reduce((a: number, b: number) => a + b, 0),
    chuva_total: precips.reduce((a: number, b: number) => a + b, 0),
    gdu_total: accGdu > 0 ? Math.round(accGdu) : null,
  } : null;

  return {
    // === CICLO ===
    hibrido: data.cycle.hybrid_name || "N/A",
    linhagem_femea: data.cycle.female_line || null,
    linhagem_macho: data.cycle.male_line || null,
    safra: data.cycle.season || "N/A",
    contrato: data.cycle.contract_number || "N/A",
    cliente: data.cycle.client_name || "N/A",
    cooperado: data.cycle.cooperator_name || "N/A",
    fazenda: data.cycle.farm_name || "N/A",
    pivo: data.cycle.field_name || "N/A",
    status: data.cycle.status || "N/A",
    area_total: data.cycle.total_area ?? null,
    area_femea: data.cycle.female_area ?? null,
    area_macho: data.cycle.male_area ?? null,
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
    slogan_org: data.orgSettings.org_slogan || null,
    logo_url: data.orgSettings.report_logo_url || null,
    rodape: data.orgSettings.report_footer_text || null,

    // === GLEBAS ===
    glebas: (data.glebas || []).map((g: any) => ({
      nome: g.name || "N/A",
      parental: getParentLabel(g.parent_type),
      area_ha: g.area_ha ?? null,
      linhas: g.rows_count ?? null,
    })),

    // === LOTES DE SEMENTE ===
    lotes_semente: data.seedLots.map((lot: any) => ({
      lote: lot.lot_number || "N/A",
      parental: getParentLabel(lot.parent_type),
      origem: lot.supplier_origin || null,
      safra_origem: lot.origin_season || null,
      peneira: lot.sieve_classification || null,
      pms: lot.thousand_seed_weight_g ?? null,
      germinacao: lot.germination_pct ?? null,
      vigor: lot.vigor_pct ?? null,
      pureza: lot.purity_pct ?? null,
      umidade: lot.moisture_pct ?? null,
      tem_ts: lot.has_treatment ? "Sim" : "Não",
    })),

    // === TRATAMENTO DE SEMENTES ===
    tratamentos: data.seedLotTreatments.map((treatment: any) => {
      const lot = seedLotsById.get(treatment.seed_lot_id);
      const products = data.seedLotTreatmentProducts.filter(
        (product: any) => product.seed_lot_treatment_id === treatment.id,
      );
      return {
        lote: lot?.lot_number || "N/A",
        parental: getParentLabel(lot?.parent_type),
        data: fmtDate(treatment.treatment_date),
        local: treatment.treatment_location || null,
        volume_calda: treatment.total_slurry_volume ?? null,
        germ_pos_ts: treatment.germination_after_pct ?? null,
        produtos: products.map((product: any) => ({
          produto: product.product_name || "N/A",
          ia: product.active_ingredient || null,
          tipo: product.product_type || null,
          dose: product.dose ?? null,
          unidade: product.dose_unit || null,
        })),
      };
    }),

    // === PLANEJAMENTO DE PLANTIO ===
    plano_plantio: (data.plantingPlan || []).map((p: any) => ({
      gleba: p.pivot_glebas?.name || "Geral",
      parental: getParentLabel(p.pivot_glebas?.parent_type || p.parent_type),
      data_prevista: fmtDate(p.planned_date),
      area: p.area_ha ?? p.pivot_glebas?.area_ha ?? null,
      sementes_metro: p.seeds_per_meter ?? null,
      populacao_alvo: p.target_population ?? null,
      espacamento: p.row_spacing_cm ?? null,
    })),

    // === PLANTIO REALIZADO ===
    plantio: data.plantingActual.map((planting: any) => ({
      data: fmtDate(planting.planting_date),
      tipo: getParentLabel(planting.planting_type || planting.pivot_glebas?.parent_type),
      gleba: planting.pivot_glebas?.name || planting.gleba_name || "Geral",
      lote: planting.seed_lot_number || "N/A",
      area: planting.area_planted_ha ?? planting.actual_area ?? null,
      espacamento: planting.row_spacing_cm ?? null,
      sem_metro: planting.seeds_per_meter_actual ?? planting.seeds_per_meter_set ?? null,
      pop_alvo: planting.target_population ?? null,
      cv_plantio: planting.cv_planting ?? planting.cv_percent ?? null,
      solo: planting.soil_condition || null,
      profundidade: planting.planting_depth_cm ?? null,
      velocidade: planting.planter_speed_kmh ?? null,
      notas: planting.notes || null,
    })),

    // === CV PLANTIO (pontos individuais) ===
    cv_pontos: (data.cvPoints || []).map((p: any) => ({
      plantio_id: p.planting_actual_id,
      ponto: p.point_number ?? null,
      plantas_contadas: p.plant_count ?? null,
      espacamento_medio: p.avg_spacing_cm ?? null,
      cv: p.cv_percent ?? null,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    })),

    // === EMERGÊNCIA ===
    emergencia: (data.emergenceCounts || []).map((e: any) => ({
      data: fmtDate(e.count_date),
      tipo: e.type || null,
      ponto: e.sample_point || null,
      contagem: e.plant_count ?? null,
      comprimento_linha: e.line_length ?? null,
      plantas_metro: e.plants_per_meter ?? null,
      plantas_ha: e.plants_per_ha ?? null,
      emergencia_pct: e.emergence_pct ?? null,
      pop_alvo: e.target_population ?? null,
      espacamento: e.row_spacing ?? null,
      observacoes: e.observations || null,
    })),

    // === STAND ===
    stand: data.standCounts.map((stand: any) => ({
      data: fmtDate(stand.count_date),
      tipo_contagem: stand.count_type || stand.type || null,
      parental: getParentLabel(stand.parent_type || stand.pivot_glebas?.parent_type),
      gleba: stand.pivot_glebas?.name || stand.gleba_name || "Geral",
      dap: stand.days_after_planting ?? null,
      pontos: data.standCountPoints.filter((point: any) => point.stand_count_id === stand.id).length,
      pop_plha: stand.avg_plants_per_ha ?? stand.plants_per_ha ?? null,
      cv_stand: stand.cv_stand_pct ?? stand.cv_percent ?? null,
      emergencia: stand.emergence_pct ?? null,
    })),

    // === MANEJO (CROP INPUTS) ===
    insumos: data.cropInputs.map((input: any) => ({
      data_exec: fmtDate(input.execution_date),
      data_rec: fmtDate(input.recommendation_date),
      produto: input.product_name || "N/A",
      ia: input.active_ingredient || null,
      tipo: input.input_type || null,
      grupo: input.group_category || null,
      dose_ha: input.dose_per_ha ?? null,
      unidade: input.unit || null,
      qtd_recomendada: input.qty_recommended ?? null,
      qtd_aplicada: input.qty_applied ?? null,
      evento: input.event_type || null,
      cod_evento: input.event_code || null,
      status: input.status || null,
      dap: input.dap_at_application ?? null,
      estadio: input.growth_stage_at_application || null,
      notas: input.notes || null,
    })),

    // === NUTRIÇÃO (FERTILIZATION) ===
    nutricao: (data.fertilizations || []).map((f: any) => ({
      data: fmtDate(f.application_date),
      tipo: f.fertilization_type || null,
      produto: f.product_name || "N/A",
      dose_ha: f.dose_per_ha ?? null,
      unidade: f.dose_unit || null,
      area: f.area_applied_ha ?? null,
      metodo: f.application_method || null,
      estadio: f.growth_stage || null,
      n_pct: f.formulation_n_pct ?? null,
      p_pct: f.formulation_p_pct ?? null,
      k_pct: f.formulation_k_pct ?? null,
      n_fornecido: f.n_supplied_kg_ha ?? null,
      p2o5_fornecido: f.p2o5_supplied_kg_ha ?? null,
      k2o_fornecido: f.k2o_supplied_kg_ha ?? null,
      alvo: f.target_parent || null,
      notas: f.notes || null,
    })),

    // === APLICAÇÕES QUÍMICAS ===
    quimicos: (data.chemicals || []).map((c: any) => ({
      data: fmtDate(c.application_date),
      tipo: c.application_type || null,
      produto: c.product_name || "N/A",
      ia: c.active_ingredient || null,
      dose_ha: c.dose_per_ha ?? null,
      unidade: c.dose_unit || null,
      area: c.area_applied_ha ?? null,
      metodo: c.application_method || null,
      alvo: c.target_pest || null,
      volume_calda: c.spray_volume ?? null,
      prescricao: c.prescription_number || null,
      responsavel: c.responsible_technician || null,
      temperatura: c.temperature_c ?? null,
      umidade: c.humidity_pct ?? null,
      vento: c.wind_speed_kmh ?? null,
      notas: c.notes || null,
    })),

    // === FENOLOGIA ===
    fenologia: data.phenology.map((record: any) => ({
      data: fmtDate(record.observation_date || record.record_date),
      parental: getParentLabel(record.parent_type),
      estadio: record.growth_stage || record.stage || null,
      dap: record.days_after_planting ?? null,
      observacao: record.description || record.notes || null,
    })),

    // === NDVI ===
    ndvi_imagens: (data.ndviImages || [])
      .filter((i: any) => (i.cloud_over_field_pct ?? 0) <= 30)
      .map((i: any) => ({
        data: fmtDate(i.capture_date),
        ndvi_medio: i.ndvi_mean ?? null,
        ndvi_min: i.ndvi_min ?? null,
        ndvi_max: i.ndvi_max ?? null,
      })),
    ndvi_parecer:
      data.ndviAnalyses?.[0]?.analysis_text ||
      data.ndviAnalyses?.[0]?.technical_analysis ||
      data.ndviAnalyses?.[0]?.summary ||
      null,

    // === NICKING ===
    nicking_marcos: data.nickingMilestones.map((milestone: any) => ({
      parental: getParentLabel(milestone.parent_type),
      ponto: milestone.nicking_fixed_points?.name || null,
      marco: milestone.milestone_name || "N/A",
      data: fmtDate(milestone.milestone_date),
      dap: milestone.dap ?? null,
    })),

    nicking_observacoes: (data.nickingObservations || []).map((obs: any) => ({
      data: fmtDate(obs.observation_date),
      ponto_fixo: obs.fixed_point_name || null,
      parental: getParentLabel(obs.parent_type),
      estadio: obs.growth_stage || null,
      pendao_pct: obs.tassel_pct ?? null,
      estigma_pct: obs.silk_pct ?? null,
      notas: obs.notes || null,
    })),

    // === INSPEÇÕES ===
    inspecoes: data.inspectionData.map((inspection: any) => ({
      numero: inspection.inspection_number ?? null,
      data: fmtDate(inspection.inspection_date),
      desp_pct: inspection.detasseling_pct ?? null,
      er_pct: inspection.er_pct ?? null,
      mp1_pct: inspection.mp1_pct ?? null,
      mp2_pct: inspection.mp2_pct ?? null,
      fp_pct: inspection.fp_pct ?? null,
      observacoes: inspection.observations || null,
    })),

    // === DESPENDOAMENTO ===
    despendoamento: data.detasseling.map((record: any) => ({
      passada: record.pass_number ?? record.pass_type ?? null,
      data: fmtDate(record.operation_date),
      gleba: record.pivot_glebas?.name || null,
      area: record.area_ha ?? record.area_worked_ha ?? null,
      metodo: record.method || null,
      turno: record.shift || null,
      equipe: record.team_size ?? null,
      pct_removido: record.pct_removed ?? record.pct_detasseled_this_pass ?? null,
      pct_remanescente: record.pct_remaining ?? record.pct_remaining_after ?? null,
      rendimento: record.yield_ha_per_person_day ?? record.yield_per_person_ha ?? null,
      altura_pendao: record.tassel_height || null,
      maquina: record.machine_id || null,
      horas_maquina: record.machine_hours ?? null,
      velocidade_maquina: record.machine_speed_kmh ?? null,
      dificuldades: Array.isArray(record.difficulties) ? record.difficulties.join(", ") : null,
      nc: record.non_conformities || null,
      notas: record.notes || null,
    })),

    // === ROGUING ===
    roguing: (data.roguingRecords || []).map((r: any) => ({
      data: fmtDate(r.operation_date),
      gleba: r.pivot_glebas?.name || null,
      tipo: r.roguing_type || null,
      area: r.area_worked_ha ?? null,
      plantas_removidas: r.plants_removed ?? null,
      pct_off_type: r.off_type_pct ?? null,
      equipe: r.team_size ?? null,
      notas: r.notes || null,
    })),

    // === PRAGAS E DOENÇAS ===
    pragas: data.pests.map((pest: any) => ({
      data: fmtDate(pest.observation_date),
      nome: pest.pest_name || "N/A",
      tipo: pest.pest_type || null,
      incidencia: pest.incidence_pct ?? null,
      severidade: pest.severity ?? null,
      parental: getParentLabel(pest.affected_parent),
      estadio: pest.growth_stage || null,
      acao: pest.action_taken || null,
      notas: pest.notes || null,
    })),

    // === IRRIGAÇÃO ===
    irrigacao: data.irrigationRecords.map((record: any) => ({
      data: fmtDate(record.start_date),
      lamina_mm: record.depth_mm ?? null,
      tempo_h: record.duration_hours ?? null,
      sistema: record.system_type || null,
    })),

    // === CHUVA ===
    chuva: data.rainfallRecords.map((record: any) => ({
      data: fmtDate(record.record_date),
      mm: record.precipitation_mm ?? null,
    })),

    // === CLIMA ===
    clima_resumo,
    clima_diario: weatherData,

    // === UMIDADE ===
    umidade: data.moisture.map((sample: any) => ({
      data: fmtDate(sample.sample_date),
      gleba: sample.pivot_glebas?.name || sample.gleba_name || "Geral",
      umidade_pct: sample.moisture_pct ?? null,
      estadio: sample.growth_stage || null,
      ponto: sample.point_identifier || null,
    })),

    // === ESTIMATIVA DE PRODUTIVIDADE ===
    estimativa: estimate
      ? {
          pontos: data.yieldSamplePoints.map((point: any) => ({
            ponto: point.point_number ?? null,
            gleba: point.gleba_name || null,
            espigas_ha: point.ears_per_ha ?? null,
            graos_espiga: point.avg_kernels_per_ear ?? null,
            umidade: point.moisture_pct ?? null,
            prod_bruta: point.gross_yield_kg_ha ?? null,
          })),
          prod_liquida_kgha: estimate.net_yield_kg_ha ?? null,
          prod_total_ton: estimate.total_production_tons ?? null,
          sc_ha: estimate.bags_per_ha ?? null,
        }
      : null,

    // === PLANO DE COLHEITA ===
    plano_colheita: (data.harvestPlan || []).map((h: any) => ({
      gleba: h.pivot_glebas?.name || "Geral",
      data_inicio: fmtDate(h.planned_harvest_start),
      data_fim: fmtDate(h.planned_harvest_end),
      ciclo_dias: h.cycle_days_used ?? null,
      fonte_plantio: h.planting_source || null,
      data_plantio: fmtDate(h.planting_date_used),
      umidade_alvo: h.target_moisture_pct ?? null,
      meta_ha_dia: h.target_ha_per_day ?? null,
      peso_saco: h.bag_weight_kg ?? null,
      notas: h.notes || null,
    })),

    // === COLHEITA REALIZADA ===
    colheita: data.harvestRecords.map((record: any) => ({
      data: fmtDate(record.harvest_date),
      gleba: record.pivot_glebas?.name || record.gleba_name || "Geral",
      area: record.area_harvested_ha ?? null,
      umidade: record.avg_moisture_pct ?? null,
      cargas: record.loads_count ?? null,
      peso_carga: record.weight_per_load_tons ?? null,
      tons: record.total_weight_tons ?? null,
      destino: record.delivery_destination || null,
      ticket: record.ticket_number || null,
      colhedora: record.harvester_id || null,
      transporte: record.transport_vehicle || null,
      notas: record.notes || null,
    })),

    // === VISITAS DE CAMPO ===
    visitas: data.fieldVisits.map((visit: any) => {
      const scores = (visit.field_visit_scores || []).map((s: any) => ({
        estagio: s.stage || null,
        subitem: s.subitem || null,
        nota: s.score_value || null,
        pontos: s.score_points ?? null,
        obs: s.notes || null,
      }));
      return {
        data: fmtDate(visit.visit_date),
        numero: visit.visit_number ?? null,
        estagio: visit.stage || null,
        tecnico: visit.technician_name || null,
        status: visit.status || null,
        nota_final: visit.final_score ?? null,
        nota_maxima: visit.max_possible_score ?? null,
        observacoes: visit.general_notes || null,
        scores,
      };
    }),

    // === FOTOS ===
    fotos: collectPhotoUrls(data),
  };
}

function normalizeReturnedHtml(rawHtml: string): string {
  let html = rawHtml
    .replace(/```html\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  const doctypeIndex = html.toLowerCase().indexOf("<!doctype");
  if (doctypeIndex >= 0) {
    html = html.slice(doctypeIndex);
  }

  if (html.toLowerCase().startsWith("<!doctype") || html.toLowerCase().startsWith("<html")) {
    const styleBlocks = html.match(/<style[\s\S]*?<\/style>/gi) || [];
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
      html = `${styleBlocks.join("\n")}\n${bodyMatch[1]}`.trim();
    }
  }

  return html;
}

function hasUnresolvedTokens(html: string): boolean {
  return /\$\{[^}]+\}/.test(html) || /\b(formatDate|formatNumber|getParentTypeLabel)\s*\(/.test(html);
}

function wrapInDocument(innerHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media print { .report-toolbar { display: none !important; } }
  </style>
</head>
<body>
  <div class="report-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:999;background:#1B5E20;color:white;display:flex;align-items:center;justify-content:space-between;padding:8px 20px;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:system-ui,sans-serif">
    <span style="font-size:14px;font-weight:600">${title}</span>
    <div style="display:flex;gap:8px">
      <button onclick="window.print()" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">Imprimir / Salvar PDF</button>
    </div>
  </div>
  <div style="padding-top:50px">
    ${innerHtml}
  </div>
</body>
</html>`;
}

export function openHtmlInNewTab(html: string) {
  const newWindow = window.open("", "_blank");
  if (!newWindow) return;
  newWindow.document.write(html);
  newWindow.document.close();
}

/**
 * Selects relevant data keys for each report part to reduce payload size.
 */
function pickDataForPart(reportData: any, part: number): any {
  const base = {
    hibrido: reportData.hibrido,
    linhagem_femea: reportData.linhagem_femea,
    linhagem_macho: reportData.linhagem_macho,
    safra: reportData.safra,
    contrato: reportData.contrato,
    cliente: reportData.cliente,
    cooperado: reportData.cooperado,
    fazenda: reportData.fazenda,
    pivo: reportData.pivo,
    status: reportData.status,
    area_total: reportData.area_total,
    area_femea: reportData.area_femea,
    area_macho: reportData.area_macho,
    proporcao_fm: reportData.proporcao_fm,
    sistema_irrigacao: reportData.sistema_irrigacao,
    split: reportData.split,
    espacamento_ff: reportData.espacamento_ff,
    espacamento_fm: reportData.espacamento_fm,
    espacamento_mm: reportData.espacamento_mm,
    ciclo_dias: reportData.ciclo_dias,
    desp_dap: reportData.desp_dap,
    umidade_alvo: reportData.umidade_alvo,
    produtividade_esperada: reportData.produtividade_esperada,
    producao_esperada: reportData.producao_esperada,
    organizacao: reportData.organizacao,
    slogan_org: reportData.slogan_org,
    logo_url: reportData.logo_url,
    rodape: reportData.rodape,
  };

  if (part === 1) {
    return {
      ...base,
      glebas: reportData.glebas,
      lotes_semente: reportData.lotes_semente,
      tratamentos: reportData.tratamentos,
      plano_plantio: reportData.plano_plantio,
      plantio: reportData.plantio,
      cv_pontos: reportData.cv_pontos,
      emergencia: reportData.emergencia,
      stand: reportData.stand,
    };
  }

  if (part === 2) {
    return {
      ...base,
      insumos: reportData.insumos,
      nutricao: reportData.nutricao,
      quimicos: reportData.quimicos,
      fenologia: reportData.fenologia,
      ndvi_imagens: reportData.ndvi_imagens,
      ndvi_parecer: reportData.ndvi_parecer,
      nicking_marcos: reportData.nicking_marcos,
      nicking_observacoes: reportData.nicking_observacoes,
      inspecoes: reportData.inspecoes,
      despendoamento: reportData.despendoamento,
      roguing: reportData.roguing,
      pragas: reportData.pragas,
    };
  }

  // Part 3
  return {
    ...base,
    clima_resumo: reportData.clima_resumo,
    clima_diario: reportData.clima_diario,
    irrigacao: reportData.irrigacao,
    chuva: reportData.chuva,
    umidade: reportData.umidade,
    estimativa: reportData.estimativa,
    plano_colheita: reportData.plano_colheita,
    colheita: reportData.colheita,
    visitas: reportData.visitas,
    fotos: reportData.fotos,
    // Summary for conclusion
    resumo_geral: {
      lotes: reportData.lotes_semente?.length || 0,
      plantio_registros: reportData.plantio?.length || 0,
      stand_registros: reportData.stand?.length || 0,
      insumos_total: reportData.insumos?.length || 0,
      nutricao_total: reportData.nutricao?.length || 0,
      quimicos_total: reportData.quimicos?.length || 0,
      fenologia_total: reportData.fenologia?.length || 0,
      despendoamento_total: reportData.despendoamento?.length || 0,
      pragas_total: reportData.pragas?.length || 0,
      irrigacao_total: reportData.irrigacao?.length || 0,
      colheita_total: reportData.colheita?.length || 0,
      visitas_total: reportData.visitas?.length || 0,
      fotos_total: reportData.fotos?.length || 0,
    },
  };
}

async function callPartGeneration(
  partNumber: number,
  partData: any,
): Promise<string> {
  const { data: fnData, error: fnError } = await (supabase as any).functions.invoke("generate-report", {
    body: { reportData: partData, part: partNumber },
  });

  if (fnError) throw fnError;

  const html =
    typeof fnData === "string"
      ? (() => {
          try {
            return JSON.parse(fnData)?.html;
          } catch {
            return fnData;
          }
        })()
      : fnData?.html;

  if (!html) {
    throw new Error(`Parte ${partNumber} retornou vazia`);
  }

  return html;
}

async function callPartWithRetry(partNumber: number, partData: any): Promise<string> {
  try {
    return await callPartGeneration(partNumber, partData);
  } catch (err: any) {
    console.warn(`Part ${partNumber} failed, retrying once...`, err.message);
    // Wait a bit before retry
    await new Promise((r) => setTimeout(r, 2000));
    return await callPartGeneration(partNumber, partData);
  }
}

export async function generateHtmlReport(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; blob: Blob; html: string }> {
  const totalSteps = 8;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  progress("📊 Coletando todos os dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  progress("🔄 Resolvendo dados para o relatório...", 2);
  const reportData = buildReportData(data);

  // Part 1: Cover + Seed + Planting + Stand
  progress("📄 Gerando capa, plantio e stand... (1/3)", 3);
  const part1Data = pickDataForPart(reportData, 1);
  const part1Html = await callPartWithRetry(1, part1Data);

  // Part 2: Management + Phenology + Detasseling + Pests
  progress("📄 Gerando manejo, fenologia e pragas... (2/3)", 4);
  const part2Data = pickDataForPart(reportData, 2);
  const part2Html = await callPartWithRetry(2, part2Data);

  // Part 3: Water + Moisture + Yield + Harvest + Conclusion
  progress("📄 Gerando clima, colheita e conclusão... (3/3)", 5);
  const part3Data = pickDataForPart(reportData, 3);
  const part3Html = await callPartWithRetry(3, part3Data);

  // Combine
  progress("🔗 Montando relatório final...", 6);
  const combinedHtml = [part1Html, part2Html, part3Html].join("\n\n");
  const cleanCombined = normalizeReturnedHtml(combinedHtml);

  const title = `Relatório — ${data.cycle.hybrid_name} — Safra ${data.cycle.season}`;
  const fullHtml = wrapInDocument(cleanCombined, title);

  progress("👁️ Abrindo relatório...", 7);
  openHtmlInNewTab(fullHtml);

  // Save
  progress("💾 Salvando cópia...", 8);
  const blob = new Blob([fullHtml], { type: "text/html" });
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const fileName = `Relatorio_${sanitizeFileSegment(data.cycle.hybrid_name)}_${sanitizeFileSegment(data.cycle.season)}_${dateStr}_${timeStr}.html`;

  try {
    const storagePath = `reports/${data.cycle.org_id}/${cycleId}/${fileName}`;
    const { error: uploadError } = await (supabase as any).storage.from("cycle-documents").upload(storagePath, blob, {
      contentType: "text/html",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = await (supabase as any).storage
      .from("cycle-documents")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

    await (supabase as any).from("attachments").insert({
      entity_id: cycleId,
      entity_type: "cycle",
      org_id: data.cycle.org_id,
      file_name: fileName,
      file_url: urlData?.signedUrl || storagePath,
      file_type: "text/html",
      file_size: blob.size,
      document_category: "relatorio",
      description: `Relatório gerado em ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    });
  } catch (e) {
    console.warn("Falha ao salvar cópia do relatório:", e);
  }

  progress("✅ Relatório gerado com sucesso!", 8);
  return { fileName, blob, html: fullHtml };
}
