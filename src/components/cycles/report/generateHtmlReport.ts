import { fetchReportData } from "./useReportData";
import { supabase } from "@/integrations/supabase/client";
import type { ReportData } from "./reportTypes";

export type ProgressCallback = (message: string, current: number, total: number) => void;

type ReportPhoto = { module: string; url: string; date?: string; context?: string };

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getParentLabel(value: string | null | undefined): string {
  if (!value) return "N/A";
  if (value === "female") return "Fêmea";
  if (value === "male") return "Macho";
  return value;
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "_").trim();
}

function collectPhotoUrls(data: ReportData): ReportPhoto[] {
  const photos: ReportPhoto[] = [];

  const pushPhotos = (
    records: any[],
    module: string,
    dateField: string,
    contextField?: string,
  ) => {
    records.forEach((record) => {
      const recordPhotos = Array.isArray(record?.photos) ? record.photos : [];
      recordPhotos.forEach((photoPath: string) => {
        if (!photoPath) return;
        photos.push({
          module,
          date: record?.[dateField] || undefined,
          context: contextField ? record?.[contextField] || undefined : undefined,
          url: isHttpUrl(photoPath) ? photoPath : photoPath,
        });
      });
    });
  };

  pushPhotos(data.detasseling, "despendoamento", "operation_date", "notes");
  pushPhotos(data.chemicals, "manejo_quimico", "application_date", "product_name");
  pushPhotos(data.pests, "pragas_doencas", "observation_date", "pest_name");
  pushPhotos(data.moisture, "umidade", "sample_date", "point_identifier");
  pushPhotos(data.phenology, "fenologia", "observation_date", "growth_stage");

  return photos;
}

function buildReportData(data: ReportData) {
  const seedLotsById = new Map(data.seedLots.map((lot: any) => [lot.id, lot]));
  const estimate = data.yieldEstimates[0] || null;

  return {
    hibrido: data.cycle.hybrid_name || "N/A",
    safra: data.cycle.season || "N/A",
    contrato: data.cycle.contract_number || "N/A",
    cliente: data.cycle.client_name || "N/A",
    cooperado: data.cycle.cooperator_name || "N/A",
    fazenda: data.cycle.farm_name || "N/A",
    pivo: data.cycle.field_name || "N/A",
    area_total: data.cycle.total_area ?? null,
    area_femea: data.cycle.female_area ?? null,
    area_macho: data.cycle.male_area ?? null,
    split: data.cycle.material_split || "N/A",
    espacamento_ff: data.cycle.spacing_female_female_cm ?? null,
    espacamento_fm: data.cycle.spacing_female_male_cm ?? null,
    espacamento_mm: data.cycle.spacing_male_male_cm ?? null,
    ciclo_dias: data.cycle.material_cycle_days ?? null,
    desp_dap: data.cycle.detasseling_dap ?? null,
    umidade_alvo: data.cycle.target_moisture ?? null,
    organizacao: data.orgSettings.org_name || "",
    logo_url: data.orgSettings.report_logo_url || null,

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

    tratamentos: data.seedLotTreatments.map((treatment: any) => {
      const lot = seedLotsById.get(treatment.seed_lot_id);
      const products = data.seedLotTreatmentProducts.filter(
        (product: any) => product.seed_lot_treatment_id === treatment.id,
      );

      return {
        lote: lot?.lot_number || "N/A",
        parental: getParentLabel(lot?.parent_type),
        data: treatment.treatment_date || null,
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

    plantio: data.plantingActual.map((planting: any) => ({
      data: planting.planting_date || null,
      tipo: getParentLabel(planting.planting_type || planting.pivot_glebas?.parent_type),
      gleba: planting.pivot_glebas?.name || planting.gleba_name || "Geral",
      lote: planting.seed_lot_number || "N/A",
      area: planting.area_planted_ha ?? planting.actual_area ?? null,
      espacamento: planting.row_spacing_cm ?? null,
      sem_metro: planting.seeds_per_meter_actual ?? planting.seeds_per_meter_set ?? null,
      cv_plantio: planting.cv_planting ?? planting.cv_percent ?? null,
      solo: planting.soil_condition || null,
    })),

    stand: data.standCounts.map((stand: any) => ({
      data: stand.count_date || null,
      tipo_contagem: stand.count_type || stand.type || null,
      parental: getParentLabel(stand.parent_type || stand.pivot_glebas?.parent_type),
      gleba: stand.pivot_glebas?.name || stand.gleba_name || "Geral",
      dap: stand.days_after_planting ?? null,
      pontos: data.standCountPoints.filter((point: any) => point.stand_count_id === stand.id).length,
      pop_plha: stand.avg_plants_per_ha ?? stand.plants_per_ha ?? null,
      cv_stand: stand.cv_stand_pct ?? stand.cv_percent ?? null,
      emergencia: stand.emergence_pct ?? null,
    })),

    insumos: data.cropInputs.map((input: any) => ({
      data_exec: input.execution_date || null,
      data_rec: input.recommendation_date || null,
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
    })),

    fenologia: data.phenology.map((record: any) => ({
      data: record.observation_date || record.record_date || null,
      parental: getParentLabel(record.parent_type),
      estadio: record.growth_stage || record.stage || null,
      dap: record.days_after_planting ?? null,
      observacao: record.description || record.notes || null,
    })),

    ndvi_imagens: data.ndviAnalyses
      .filter((analysis: any) => (analysis.cloud_over_field_pct ?? analysis.cloud_cover_pct ?? 0) <= 30)
      .map((analysis: any) => ({
        data: analysis.capture_date || analysis.analysis_date || null,
        ndvi_medio: analysis.ndvi_mean ?? null,
        ndvi_min: analysis.ndvi_min ?? null,
        ndvi_max: analysis.ndvi_max ?? null,
      })),
    ndvi_parecer:
      data.ndviAnalyses?.[0]?.analysis_text ||
      data.ndviAnalyses?.[0]?.technical_analysis ||
      data.ndviAnalyses?.[0]?.summary ||
      null,

    nicking_marcos: data.nickingMilestones.map((milestone: any) => ({
      parental: getParentLabel(milestone.parent_type),
      marco: milestone.milestone_name || "N/A",
      data: milestone.milestone_date || null,
      dap: milestone.dap ?? null,
    })),

    inspecoes: data.inspectionData.map((inspection: any) => ({
      numero: inspection.inspection_number ?? null,
      data: inspection.inspection_date || null,
      desp_pct: inspection.detasseling_pct ?? null,
      er_pct: inspection.er_pct ?? null,
      mp1_pct: inspection.mp1_pct ?? null,
      mp2_pct: inspection.mp2_pct ?? null,
      fp_pct: inspection.fp_pct ?? null,
      observacoes: inspection.observations || null,
    })),

    despendoamento: data.detasseling.map((record: any) => ({
      passada: record.pass_number ?? record.pass_type ?? null,
      data_inicio: record.start_date || record.operation_date || null,
      data_fim: record.end_date || record.operation_date || null,
      area: record.area_ha ?? record.area_worked_ha ?? null,
      metodo: record.method || null,
      equipe: record.team_size ?? null,
      pct_removido: record.pct_removed ?? record.pct_detasseled_this_pass ?? null,
      pct_remanescente: record.pct_remaining ?? record.pct_remaining_after ?? null,
      rendimento: record.yield_ha_per_person_day ?? record.yield_per_person_ha ?? null,
      nc: record.non_conformities || null,
    })),

    pragas: data.pests.map((pest: any) => ({
      data: pest.observation_date || null,
      nome: pest.pest_name || "N/A",
      tipo: pest.pest_type || null,
      incidencia: pest.incidence_pct ?? null,
      severidade: pest.severity ?? null,
      parental: getParentLabel(pest.affected_parent),
      estadio: pest.growth_stage || null,
      acao: pest.action_taken || null,
      notas: pest.notes || null,
    })),

    irrigacao: data.irrigationRecords.map((record: any) => ({
      data: record.start_date || null,
      lamina_mm: record.depth_mm ?? null,
      tempo_h: record.duration_hours ?? null,
      sistema: record.system_type || null,
    })),

    chuva: data.rainfallRecords.map((record: any) => ({
      data: record.record_date || null,
      mm: record.precipitation_mm ?? null,
    })),

    umidade: data.moisture.map((sample: any) => ({
      data: sample.sample_date || null,
      gleba: sample.pivot_glebas?.name || sample.gleba_name || "Geral",
      umidade_pct: sample.moisture_pct ?? null,
      estadio: sample.growth_stage || null,
      ponto: sample.point_identifier || null,
    })),

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

    colheita: data.harvestRecords.map((record: any) => ({
      data: record.harvest_date || null,
      gleba: record.pivot_glebas?.name || record.gleba_name || "Geral",
      area: record.area_harvested_ha ?? null,
      umidade: record.avg_moisture_pct ?? null,
      cargas: record.loads_count ?? null,
      tons: record.total_weight_tons ?? null,
      destino: record.delivery_destination || null,
      ticket: record.ticket_number || null,
    })),

    visitas: data.fieldVisits.map((visit: any) => ({
      data: visit.visit_date || null,
      tipo: visit.visit_type || visit.stage || null,
      visitante: visit.visitor_name || visit.technician_name || null,
      cargo: visit.visitor_role || null,
      condicao: visit.crop_condition || visit.status || null,
      observacoes: visit.general_observations || visit.general_notes || null,
      pendencias: visit.pending_actions || null,
    })),

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
    <span style="font-size:14px;font-weight:600">📄 ${title}</span>
    <div style="display:flex;gap:8px">
      <button onclick="window.print()" style="background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
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

export async function generateHtmlReport(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; blob: Blob; html: string }> {
  const totalSteps = 6;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  progress("Coletando dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  progress("Resolvendo dados para geração do relatório...", 2);
  const reportData = buildReportData(data);

  progress("Gerando HTML técnico com análise avançada...", 3);
  const { data: fnData, error: fnError } = await (supabase as any).functions.invoke("generate-report", {
    body: { reportData },
  });

  if (fnError) throw fnError;

  const responseHtml =
    typeof fnData === "string"
      ? (() => {
          try {
            return JSON.parse(fnData)?.html;
          } catch {
            return fnData;
          }
        })()
      : fnData?.html;

  if (!responseHtml) {
    throw new Error("Resposta vazia da geração de relatório");
  }

  const cleanHtml = normalizeReturnedHtml(responseHtml);
  if (!cleanHtml || hasUnresolvedTokens(cleanHtml)) {
    throw new Error("O HTML retornado ainda contém placeholders não resolvidos.");
  }

  progress("Abrindo relatório...", 4);
  const title = `Relatório — ${data.cycle.hybrid_name} — Safra ${data.cycle.season}`;
  const fullHtml = wrapInDocument(cleanHtml, title);
  openHtmlInNewTab(fullHtml);

  progress("Salvando cópia...", 5);
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

  progress("✅ Relatório gerado!", 6);
  return { fileName, blob, html: fullHtml };
}
