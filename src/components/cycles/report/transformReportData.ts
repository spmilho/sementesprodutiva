import type { ReportData } from "./reportTypes";

const normalizeDateKey = (value: any): string | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const br = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
};

const fmtD = (d: any) => {
  const key = normalizeDateKey(d);
  if (!key) return null;
  const [y, m, day] = key.split("-");
  return `${day}/${m}/${y}`;
};

const fmtIso = (d: any) => normalizeDateKey(d);

const parent = (t: any) => {
  if (!t) return "N/A";
  if (t.includes("female") || t === "Fêmea") return "Fêmea";
  if (t.includes("male_2")) return "Macho 2";
  if (t.includes("male_1") || t === "male") return "Macho 1";
  if (t.includes("male")) return "Macho";
  return t;
};

/**
 * Transforms ReportData (DB format) into the flat shape expected
 * by report section components (ReportCover, ReportPlantio, etc.)
 */
export function transformReportData(data: ReportData, cycle: any): any {
  const c = data.cycle;

  // ── TS consolidado (deduplicated by product name) ──
  const tsSeen = new Set<string>();
  const tratamentos: any[] = [];
  data.seedLotTreatments.forEach((t: any) => {
    const prods = data.seedLotTreatmentProducts.filter((p: any) => p.seed_lot_treatment_id === t.id);
    prods.forEach((p: any) => {
      const key = (p.product_name || "").trim().toLowerCase();
      if (tsSeen.has(key)) return;
      tsSeen.add(key);
      tratamentos.push({
        produto: p.product_name,
        tipo: p.product_type || "",
        ia: p.active_ingredient || "",
        dose: p.dose_per_unit || p.dose || "",
        unidade: p.dose_unit || "",
        origem: t.treatment_location || "",
      });
    });
  });

  // Check which lots have treatments
  const lotsWithTs = new Set(data.seedLotTreatments.map((t: any) => t.seed_lot_id));

  return {
    // ── Cover/Resumo ──
    hibrido: c.hybrid_name || "",
    safra: c.season || "",
    contrato: c.contract_number || "",
    cliente: c.client_name || "",
    cooperado: c.cooperator_name || "",
    fazenda: c.farm_name || "",
    pivo: cycle.pivots?.name || cycle.field_name || "",
    area_total: c.total_area,
    area_femea: c.female_area,
    area_macho: c.male_area,
    split: c.material_split || "N/A",
    proporcao_fm: c.female_male_ratio || "N/A",
    espacamento_ff: c.spacing_female_female_cm,
    espacamento_fm: c.spacing_female_male_cm,
    espacamento_mm: c.spacing_male_male_cm,
    ciclo_dias: c.material_cycle_days,
    desp_dap: c.detasseling_dap,
    umidade_alvo: c.target_moisture,
    produtividade_esperada: c.expected_productivity,
    sistema_irrigacao: c.irrigation_system,
    linhagem_femea: c.female_line,
    linhagem_macho: c.male_line,
    organizacao: data.orgSettings.org_name,
    logo_url: data.orgSettings.report_logo_url,

    // ── Glebas ──
    glebas: data.glebas.map((g: any) => ({
      nome: g.name,
      parental: parent(g.parent_type),
      area_ha: g.area_ha,
      linhas: g.number_of_rows || null,
    })),

    // ── Semente ──
    lotes_semente: data.seedLots.map((l: any) => {
      const rawParent = parent(l.parent_type);
      // Seed lots: any male sub-type should show just "Macho" since it's a single lineage
      const parentLabel = rawParent.startsWith("Macho") ? "Macho" : rawParent;
      return {
        lote: l.lot_number,
        parental: parentLabel,
        origem: l.supplier_origin,
        peneira: l.sieve_classification,
        pms: l.thousand_seed_weight_g,
        germinacao: l.germination_pct,
        vigor: l.vigor_pct,
        pureza: l.purity_pct,
        tem_ts: lotsWithTs.has(l.id) ? "Sim" : "Não",
      };
    }),

    // ── TS consolidado ──
    tratamentos: tratamentos.length > 0
      ? [{ lote: "Todos", parental: "Todos", data: null, local: tratamentos[0]?.origem || "", produtos: tratamentos }]
      : [],

    // ── Plantio Realizado ──
    plantio: data.plantingActual.map((p: any) => ({
      data: fmtD(p.planting_date),
      data_iso: fmtIso(p.planting_date),
      tipo: parent(p.type),
      gleba: p.pivot_glebas?.name || "Geral",
      lote: p.seed_lot_number || "",
      area: p.actual_area,
      espacamento: p.row_spacing,
      sem_metro: p.seeds_per_meter,
      cv_plantio: p.cv_percent,
      solo: p.soil_condition || "",
    })),

    // ── Plantio Planejado ──
    plantio_planejado: data.plantingPlan.map((p: any) => ({
      data: fmtD(p.planned_date),
      data_iso: fmtIso(p.planned_date),
      tipo: parent(p.type),
      area: p.planned_area,
    })),

    // ── Stand ──
    stand: data.standCounts.map((s: any) => ({
      data: fmtD(s.count_date),
      tipo_contagem: s.count_type,
      parental: parent(s.parent_type || s.pivot_glebas?.parent_type),
      gleba: s.pivot_glebas?.name || "Geral",
      dap: s.dap,
      pontos: data.standCountPoints.filter((p: any) => p.stand_count_id === s.id).length,
      pop_plha: s.avg_plants_per_ha,
      cv_stand: s.cv_pct,
      emergencia: s.emergence_pct,
    })),

    // ── Insumos ──
    insumos: data.cropInputs.map((i: any) => ({
      data_exec: fmtD(i.execution_date),
      data_exec_iso: fmtIso(i.execution_date),
      data_rec: fmtD(i.recommendation_date),
      data_rec_iso: fmtIso(i.recommendation_date),
      produto: i.product_name,
      ia: i.active_ingredient || "",
      tipo: i.input_type,
      grupo: i.group_category || "",
      dose_ha: i.dose_per_ha,
      unidade: i.unit,
      evento: i.event_type,
      status: i.status,
      estadio: i.growth_stage_at_application || null,
      dap: i.dap_at_application ?? null,
    })),

    // ── Fenologia ──
    fenologia: data.phenology.map((p: any) => ({
      data: fmtD(p.observation_date),
      parental: parent(p.type),
      estadio: p.stage,
      dap: p.dap,
      obs: p.notes || "",
    })),

    // ── NDVI ──
    ndvi_imagens: data.ndviImages
      .filter((i: any) => (i.cloud_over_field_pct || 0) <= 30)
      .map((i: any) => ({
        data: fmtD(i.capture_date),
        ndvi_medio: i.ndvi_mean,
        ndvi_min: i.ndvi_min,
        ndvi_max: i.ndvi_max,
      })),
    ndvi_parecer: data.ndviAnalyses?.[0]?.analysis_text || null,

    // ── Nicking ──
    nicking_marcos: data.nickingMilestones.map((m: any) => ({
      parental: parent(m.nicking_fixed_points?.parent_type || m.parent_type),
      ponto: m.nicking_fixed_points?.name || "",
      marco: m.milestone_name || m.milestone_type,
      data: fmtD(m.milestone_date),
      dap: m.dap,
    })),
    nicking_observacoes: data.nickingObservations.map((o: any) => ({
      data: fmtD(o.observation_date),
      ponto_fixo: o.point_name || "",
      parental: parent(o.parent_type),
      estadio: o.growth_stage || "",
      pendao_pct: o.tassel_pct,
      estigma_pct: o.silk_pct,
      notas: o.notes || "",
    })),

    // ── Inspeções ──
    inspecoes: data.inspectionData.map((i: any) => ({
      num: i.inspection_number,
      data: fmtD(i.inspection_date),
      desp: i.pct_detasseled,
      obs: i.observations || "",
    })),

    // ── Despendoamento ──
    despendoamento: data.detasseling.map((d: any) => ({
      passada: d.pass_type,
      data: fmtD(d.operation_date),
      gleba: d.pivot_glebas?.name || "Geral",
      area: d.area_worked_ha,
      metodo: d.method,
      equipe: d.team_size,
      pct_removido: d.pct_detasseled_this_pass,
      pct_remanescente: d.pct_remaining_after,
      notas: d.non_conformities || d.notes || "",
    })),

    // ── Pragas ──
    pragas: data.pests.map((p: any) => ({
      data: fmtD(p.observation_date),
      nome: p.pest_name,
      tipo: p.pest_type || "",
      incidencia: p.incidence_pct,
      severidade: p.severity,
      parental: p.affected_parent,
      estadio: p.growth_stage,
      acao: p.action_taken,
    })),

    // ── Irrigação ──
    irrigacao: data.irrigationRecords.map((i: any) => ({
      data: fmtD(i.start_date),
      data_iso: fmtIso(i.start_date),
      created_at: i.created_at,
      lamina_mm: i.depth_mm,
      duracao_h: i.duration_hours,
    })),

    // ── Chuva ──
    chuva: data.rainfallRecords.map((r: any) => ({
      data: fmtD(r.record_date),
      data_iso: fmtIso(r.record_date),
      created_at: r.created_at,
      mm: r.precipitation_mm,
    })),

    // ── Clima (weather_records) ──
    clima: data.weatherRecords.map((w: any) => ({
      data: fmtD(w.record_date),
      data_iso: fmtIso(w.record_date),
      created_at: w.created_at,
      temp_max: w.temp_max_c,
      temp_min: w.temp_min_c,
      temp_media: w.temp_avg_c,
      ur_max: w.humidity_max_pct,
      ur_min: w.humidity_min_pct,
      ur_media: w.humidity_avg_pct,
      radiacao_mj: w.radiation_mj_m2,
      vento_media: w.wind_avg_kmh,
      eto_mm: w.eto_mm,
      chuva_mm: w.precipitation_mm,
      gdu_diario: w.gdu_daily,
      gdu_acumulado: w.gdu_accumulated,
      estadio: w.growth_stage,
    })),

    // ── Umidade ──
    umidade: data.moisture.map((m: any) => ({
      data: fmtD(m.sample_date),
      gleba: m.pivot_glebas?.name || "Geral",
      umidade_pct: m.moisture_pct,
      estadio: m.growth_stage,
      ponto: m.sample_point || "",
    })),

    // ── Estimativa ──
    estimativa: (() => {
      const targetYield = c.expected_productivity ?? null; // ton/ha
      const totalArea = c.total_area ?? 0;
      if (data.yieldEstimates.length > 0) {
        return {
          pontos: data.yieldSamplePoints.map((p: any) => ({
            ponto: p.point_number,
            gleba: p.gleba_name || "",
            espigas_ha: p.ears_count,
            graos_espiga: p.kernels_per_ear,
            umidade: p.moisture_pct,
            prod_bruta: p.gross_yield_kg_ha,
          })),
          prod_liquida_kgha: data.yieldEstimates[0]?.net_yield_kg_ha,
          prod_total_ton: data.yieldEstimates[0]?.total_production_tons,
          sc_ha: data.yieldEstimates[0]?.bags_per_ha,
          target_yield_ton_ha: targetYield,
          target_yield_total_ton: targetYield && totalArea ? targetYield * totalArea : null,
        };
      }
      // Always show section with target yield even without sample points
      return targetYield ? {
        pontos: [],
        prod_liquida_kgha: null,
        prod_total_ton: null,
        sc_ha: null,
        target_yield_ton_ha: targetYield,
        target_yield_total_ton: targetYield * totalArea,
      } : null;
    })(),

    // ── Colheita ──
    colheita: data.harvestRecords.map((h: any) => ({
      data: fmtD(h.harvest_date),
      gleba: h.pivot_glebas?.name || "Geral",
      area: h.area_harvested_ha,
      umidade: h.avg_moisture_pct,
      cargas: h.loads_count,
      peso_carga: h.weight_per_load_tons,
      tons: h.total_weight_tons,
      destino: h.delivery_destination,
    })),

    // ── Visitas ──
    visitas: data.fieldVisits.map((v: any) => ({
      numero: v.visit_number,
      data: fmtD(v.visit_date),
      tecnico: v.technician_name,
      estagio: v.stage,
      nota_final: v.final_score,
      nota_maxima: v.max_possible_score,
      observacoes: v.general_notes,
      scores: (v.field_visit_scores || []).map((s: any) => ({
        estagio: s.stage,
        subitem: s.subitem,
        nota: s.score_value,
        pontos: s.score_points,
        obs: s.notes,
      })),
    })),

    // ── CV% Semeadura (planting_cv_records) ──
    cv_semeadura: data.plantingCvRecords.map((r: any) => ({
      tipo: parent(r.type),
      cv_percent: r.cv_percent,
    })),

    // ── CV% Stand (stand_cv_records) ──
    cv_stand_records: data.standCvRecords.map((r: any) => ({
      tipo: parent(r.type),
      cv_percent: r.cv_percent,
      plants_per_meter: r.plants_per_meter,
    })),

    // ── Roguing ──
    roguing_avaliacoes: data.roguingEvaluations.map((e: any) => ({
      data: fmtD(e.evaluation_date),
      avaliador: e.evaluator_name,
      estagio: e.growth_stage,
      dap: e.dap,
      parental: parent(e.parent_evaluated),
      condicao: e.overall_condition,
      conclusao: e.auto_conclusion,
      mensagem: e.auto_conclusion_message,
      voluntarias: e.has_volunteers,
      voluntarias_freq: e.volunteers_frequency,
      offtype: e.has_offtype,
      offtype_freq: e.offtype_frequency,
      offtype_tipos: e.offtype_types,
      doentes: e.has_diseased,
      doentes_freq: e.diseased_frequency,
      doentes_tipos: e.diseased_types,
      femea_macho: e.has_female_in_male,
      femea_macho_freq: e.female_in_male_frequency,
    })),
    roguing_solicitacoes: data.roguingRequests.map((r: any) => ({
      numero: r.request_number,
      data: fmtD(r.request_date),
      prioridade: r.priority,
      parental: parent(r.parent_target),
      tipos: r.occurrence_types,
      resumo: r.occurrence_summary,
      status: r.status,
    })),
    roguing_execucoes: data.roguingExecutions.map((x: any) => ({
      data: fmtD(x.execution_date),
      equipe: x.team_size,
      horas: x.hours_spent,
      voluntarias: x.volunteers_removed,
      offtype: x.offtype_removed,
      doentes: x.diseased_removed,
      femea_macho: x.female_in_male_removed,
      total: x.total_plants_removed,
      eficacia: x.efficacy,
    })),

    // ── Fotos (collected from all sources) ──
    _fotos: collectAllPhotos(data),
  };
}

function collectAllPhotos(data: ReportData): any[] {
  const photos: any[] = [];
  const urlMap = data.photoSignedUrls || {};

  const resolveUrl = (p: string) => {
    if (!p) return null;
    if (p.startsWith("http")) return p;
    return urlMap[p] || null;
  };

  const extract = (records: any[], category: string, dateField: string, captionField?: string) => {
    for (const r of records) {
      const arr = Array.isArray(r?.photos) ? r.photos : [];
      for (const p of arr) {
        const url = resolveUrl(p);
        if (url) {
          photos.push({
            url,
            caption: captionField ? (r[captionField] || "") : (r.notes || r.observations || r.non_conformities || r.description || ""),
            category,
            date: r[dateField] || null,
          });
        }
      }
      // Single photo_url field (phenology)
      if (r?.photo_url) {
        const url = resolveUrl(r.photo_url);
        if (url) {
          photos.push({
            url,
            caption: r.description || r.notes || r.observations || "",
            category,
            date: r[dateField] || null,
          });
        }
      }
    }
  };

  extract(data.plantingActual, "Plantio", "planting_date");
  extract(data.detasseling, "Despendoamento", "operation_date");
  extract(data.chemicals, "Aplicação Química", "application_date");
  extract(data.pests, "Pragas/Doenças", "observation_date");
  extract(data.moisture, "Umidade", "sample_date");
  extract(data.phenology, "Fenologia", "observation_date");
  extract(data.roguingRecords, "Roguing", "operation_date");

  // Field visit photos
  for (const v of data.fieldVisits) {
    if (v.field_visit_photos) {
      for (const fp of v.field_visit_photos) {
        const url = resolveUrl(fp.photo_url);
        if (url) {
          photos.push({
            url,
            caption: fp.caption || `Visita ${v.visit_number || ""}`,
            category: "Avaliação de Campo",
            date: v.visit_date || null,
          });
        }
      }
    }
  }

  // Sort by date
  photos.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return photos;
}
