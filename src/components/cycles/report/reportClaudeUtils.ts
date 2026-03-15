import type { ReportData } from "./reportTypes";

// ── Helpers ──
const fmt = (n: any, d = 1) => (n != null ? Number(n).toFixed(d) : "N/A");
const fmtD = (d: any) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "N/A");
const parent = (t: any) => {
  if (!t) return "N/A";
  if (t.includes("female") || t === "Fêmea") return "Fêmea";
  if (t.includes("male_2")) return "Macho 2";
  if (t.includes("male_1") || t === "male") return "Macho 1";
  if (t.includes("male")) return "Macho";
  return t;
};

export interface ReportPayload {
  hibrido: string;
  safra: string;
  contrato: string;
  cliente: string;
  cooperado: string;
  fazenda: string;
  pivo: string;
  area_total: string;
  area_femea: string;
  area_macho: string;
  split: string;
  proporcao: string;
  esp_ff: any;
  esp_fm: any;
  esp_mm: any;
  ciclo_dias: any;
  desp_dap: any;
  umidade_alvo: any;
  org_nome: string;
  logo_url: string | null;
  data_geracao: string;
  lotes: any[];
  ts: any[];
  plantio: any[];
  stand: any[];
  insumos: any[];
  feno: any[];
  ndvi: any[];
  ndvi_parecer: string | null;
  nicking_marcos: any[];
  inspecoes: any[];
  desp: any[];
  pragas: any[];
  irrig: any[];
  chuva: any[];
  umid: any[];
  est: any | null;
  colh: any[];
  visitas: any[];
}

export function buildReportPayload(data: ReportData, cycle: any): ReportPayload {
  const c = data.cycle;

  return {
    hibrido: c.hybrid_name || "",
    safra: c.season || "",
    contrato: c.contract_number || "",
    cliente: c.client_name || "",
    cooperado: c.cooperator_name || "",
    fazenda: c.farm_name || "",
    pivo: cycle.pivots?.name || cycle.field_name || "",
    area_total: fmt(c.total_area),
    area_femea: fmt(c.female_area),
    area_macho: fmt(c.male_area),
    split: c.material_split || "N/A",
    proporcao: c.female_male_ratio || "N/A",
    esp_ff: c.spacing_female_female_cm || "N/A",
    esp_fm: c.spacing_female_male_cm || "N/A",
    esp_mm: c.spacing_male_male_cm || "N/A",
    ciclo_dias: c.material_cycle_days || "N/A",
    desp_dap: c.detasseling_dap || "N/A",
    umidade_alvo: c.target_moisture || "N/A",
    org_nome: data.orgSettings.org_name || "",
    logo_url: data.orgSettings.report_logo_url || null,
    data_geracao:
      new Date().toLocaleDateString("pt-BR") +
      " às " +
      new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),

    lotes: data.seedLots.map((l: any) => ({
      lote: l.lot_number,
      parental: parent(l.parent_type),
      origem: l.supplier_origin,
      peneira: l.sieve_classification,
      pms: fmt(l.thousand_seed_weight_g),
      germ: fmt(l.germination_pct, 0),
      vigor: fmt(l.vigor_pct, 0),
      umid: fmt(l.moisture_pct, 0),
    })),

    ts: (() => {
      const seen = new Set<string>();
      return data.seedLotTreatments.flatMap((t: any) => {
        const prods = data.seedLotTreatmentProducts.filter((p: any) => p.seed_lot_treatment_id === t.id);
        return prods
          .filter((p: any) => {
            const key = [
              (t.treatment_location || "").toString().trim().toLowerCase(),
              (p.product_name || "").toString().trim().toLowerCase(),
              (p.active_ingredient || "").toString().trim().toLowerCase(),
              (p.product_type || "").toString().trim().toLowerCase(),
              (p.dose_per_unit || p.dose || "").toString().trim().toLowerCase(),
              (p.dose_unit || "").toString().trim().toLowerCase(),
            ].join("|");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((p: any) => ({
            origem: t.treatment_location || "",
            produto: p.product_name,
            ia: p.active_ingredient || "",
            tipo: p.product_type || "",
            dose: p.dose_per_unit || p.dose || "",
            unidade: p.dose_unit || "",
          }));
      });
    })(),

    plantio: data.plantingActual.map((p: any) => ({
      data: fmtD(p.planting_date),
      tipo: parent(p.type),
      gleba: p.pivot_glebas?.name || "Geral",
      lote: p.seed_lot_number || "",
      area: fmt(p.area_ha),
      esp: p.row_spacing_cm,
      sem_m: fmt(p.seeds_per_meter),
      cv: fmt(p.cv_percent),
      solo: p.soil_condition || "",
    })),

    stand: data.standCounts.map((s: any) => ({
      data: fmtD(s.count_date),
      tipo: s.count_type,
      parental: parent(s.parent_type || s.pivot_glebas?.parent_type),
      gleba: s.pivot_glebas?.name || "Geral",
      dap: s.dap,
      pontos: data.standCountPoints.filter((p: any) => p.stand_count_id === s.id).length,
      pop: fmt(s.avg_plants_per_ha, 0),
      cv: fmt(s.cv_pct),
      emerg: fmt(s.emergence_pct, 0),
    })),

    insumos: data.cropInputs.map((i: any) => ({
      data: fmtD(i.execution_date || i.recommendation_date),
      produto: i.product_name,
      ia: i.active_ingredient || "",
      tipo: i.input_type,
      grupo: i.group_category || "",
      dose: fmt(i.dose_per_ha, 2),
      un: i.unit,
      rec: fmt(i.qty_recommended, 0),
      apl: fmt(i.qty_applied, 0),
      evento: i.event_type,
      status:
        i.status === "applied"
          ? "Realizado"
          : i.status === "recommended"
            ? "Recomendado"
            : "Em execução",
    })),

    feno: data.phenology.map((p: any) => ({
      data: fmtD(p.observation_date),
      parental: parent(p.type),
      estadio: p.stage,
      dap: p.dap,
      obs: p.notes || "",
    })),

    ndvi: data.ndviImages
      .filter((i: any) => (i.cloud_over_field_pct || 0) <= 30)
      .map((i: any) => ({
        data: fmtD(i.capture_date),
        med: fmt(i.ndvi_mean, 3),
        min: fmt(i.ndvi_min, 3),
        max: fmt(i.ndvi_max, 3),
      })),
    ndvi_parecer: data.ndviAnalyses?.[0]?.analysis_text || null,

    nicking_marcos: data.nickingMilestones.map((m: any) => ({
      parental: parent(m.nicking_fixed_points?.parent_type || m.parent_type),
      marco: m.milestone_name || m.milestone_type,
      data: fmtD(m.milestone_date),
      dap: m.dap,
    })),

    inspecoes: data.inspectionData.map((i: any) => ({
      num: i.inspection_number,
      data: fmtD(i.inspection_date),
      desp: fmt(i.detasseling_pct, 0),
      er: fmt(i.er_pct, 0),
      mp1: fmt(i.mp1_pct, 0),
      mp2: fmt(i.mp2_pct, 0),
      fp: fmt(i.fp_pct, 0),
      obs: i.observations || "",
    })),

    desp: data.detasseling.map((d: any) => ({
      passada: d.pass_type,
      data: fmtD(d.operation_date),
      area: fmt(d.area_worked_ha),
      metodo: d.method,
      equipe: d.team_size,
      removido: fmt(d.pct_detasseled_this_pass, 0),
      reman: fmt(d.pct_remaining_after, 1),
      rend: fmt(d.yield_per_person_ha, 1),
      nc: d.non_conformities || "",
    })),

    pragas: data.pests.map((p: any) => ({
      data: fmtD(p.observation_date),
      nome: p.pest_name,
      incid: fmt(p.incidence_pct, 0),
      sever: p.severity,
      parental: p.affected_parent,
      estadio: p.growth_stage,
      acao: p.action_taken,
      notas: p.notes,
    })),

    irrig: data.irrigationRecords.map((i: any) => ({
      data: fmtD(i.start_date),
      mm: fmt(i.depth_mm),
      h: fmt(i.duration_hours),
    })),

    chuva: data.rainfallRecords.map((r: any) => ({
      data: fmtD(r.record_date),
      mm: fmt(r.precipitation_mm),
    })),

    umid: data.moisture.map((m: any) => ({
      data: fmtD(m.sample_date),
      gleba: m.pivot_glebas?.name || "Geral",
      pct: fmt(m.moisture_pct),
      estadio: m.growth_stage,
    })),

    est:
      data.yieldEstimates.length > 0
        ? {
            pontos: data.yieldSamplePoints.map((p: any) => ({
              num: p.point_number,
              espigas: fmt(p.ears_count, 0),
              graos: fmt(p.kernels_per_ear, 0),
              umid: fmt(p.moisture_pct),
              bruta: fmt(p.gross_yield_kg_ha, 0),
            })),
            liq: fmt(data.yieldEstimates[0]?.net_yield_kg_ha, 0),
            ton: fmt(data.yieldEstimates[0]?.total_production_tons, 1),
            sc: fmt(data.yieldEstimates[0]?.bags_per_ha, 1),
          }
        : null,

    colh: data.harvestRecords.map((h: any) => ({
      data: fmtD(h.harvest_date),
      gleba: h.pivot_glebas?.name || "Geral",
      area: fmt(h.area_harvested_ha),
      umid: fmt(h.avg_moisture_pct),
      cargas: h.loads_count,
      tons: fmt(h.total_weight_tons),
      destino: h.delivery_destination,
    })),

    visitas: data.fieldVisits.map((v: any) => ({
      data: fmtD(v.visit_date),
      num: v.visit_number,
      tecnico: v.technician_name,
      nota: v.final_score,
      nota_max: v.max_possible_score,
      obs: v.general_notes,
    })),
  };
}

// ── System prompt ──
export const SYSTEM_PROMPT = `Você é o melhor designer de relatórios agrícolas do mundo.
Gere HTML puro nível McKinsey. RETORNE SOMENTE HTML. Sem markdown. Sem crases.

DESIGN OBRIGATÓRIO:
- Fonte: 'Segoe UI', system-ui, sans-serif
- Verde escuro: #1B5E20 (títulos, header tabelas, capa)
- Verde: #2E7D32 | Verde claro: #4CAF50
- Azul: #1565C0 (KPIs, badge fêmea)
- Laranja: #FF9800 | Vermelho: #D32F2F

KPI CARDS: grid 3 colunas, bg #F8F9FA, border-radius 12px, border-left 5px solid [cor],
  padding 24px, box-shadow 0 2px 8px rgba(0,0,0,0.06).
  Valor: 34px weight 800. Label: 10px uppercase tracking 2px color #999.

TABELAS: width 100%, border-collapse collapse.
  Header: bg #1B5E20, color white, padding 12px 16px, font 10px uppercase.
  Body: padding 10px 16px, border-bottom 1px solid #EEE.
  Alternadas: nth-child(even) bg #FAFAFA.
  Rodapé: bg #E8F5E9, weight 700, border-top 2px solid #1B5E20.

BADGES: inline-block, padding 4px 14px, border-radius 20px, font 10px weight 600.
  Verde: bg #E8F5E9 color #2E7D32 | Amarelo: bg #FFF8E1 color #F57F17
  Laranja: bg #FFF3E0 color #E65100 | Vermelho: bg #FFEBEE color #C62828
  Azul: bg #E3F2FD color #1565C0

SEÇÕES: page-break-before:always. Título: 24px weight 700 color #1B5E20,
  border-bottom 3px solid #1B5E20, padding-bottom 10px, margin-bottom 28px.

BOXES DESTAQUE: bg #F8F9FA, border-left 5px solid #1565C0, padding 20px,
  border-radius 0 12px 12px 0. Alerta: border #FF9800 bg #FFF8E1.
  Crítico: border #D32F2F bg #FFEBEE.

REGRAS:
- APENAS HTML. Sem <!DOCTYPE>, <html>, <head>, <body>. Começa com <style> ou <div>.
- Dados já estão formatados — use direto, NÃO reformate.
- Se array vazio → NÃO gere a seção.
- Português BR. NÃO mencione IA/Claude/Anthropic. NUNCA.
- Tom: engenheiro agrônomo sênior, parecer técnico executivo.
- CSS de impressão: @media print { .page-break{page-break-before:always} @page{size:A4;margin:12mm} }`;

// ── Prompt builders ──
export function buildPrompt1(rd: ReportPayload, charts: Record<string, string | null>): string {
  return `PARTE 1 DE 3. Gere: CAPA + RESUMO EXECUTIVO + SEMENTE/TS + PLANTIO + STAND.
Comece com <style> contendo TODO o CSS. Depois a capa com page-break-after:always.

CAPA: height 100vh, background linear-gradient(135deg, #1B5E20 0%, #2E7D32 40%, #388E3C 100%).
"RELATÓRIO DE PRODUÇÃO" 13px uppercase tracking 8px branco. Híbrido: 48px weight 800 branco.
Grid 2x4 com dados do ciclo. Data de geração no rodapé.

DADOS CICLO: ${JSON.stringify({
    hibrido: rd.hibrido, safra: rd.safra, contrato: rd.contrato,
    cliente: rd.cliente, cooperado: rd.cooperado, fazenda: rd.fazenda,
    pivo: rd.pivo, area_total: rd.area_total, area_femea: rd.area_femea,
    area_macho: rd.area_macho, split: rd.split, proporcao: rd.proporcao,
    esp_ff: rd.esp_ff, esp_fm: rd.esp_fm, esp_mm: rd.esp_mm,
    ciclo_dias: rd.ciclo_dias, desp_dap: rd.desp_dap, umidade_alvo: rd.umidade_alvo,
    org_nome: rd.org_nome, data_geracao: rd.data_geracao,
  })}

LOTES (${rd.lotes.length}): ${rd.lotes.length > 0 ? JSON.stringify(rd.lotes) : "VAZIO-PULAR"}
TS CONSOLIDADO DO CICLO (${rd.ts.length}): ${rd.ts.length > 0 ? JSON.stringify(rd.ts) : "VAZIO-PULAR"}
IMPORTANTE TS: não separar por lote, parental ou safra. Mostrar apenas origem, produto, ia, tipo, dose e unidade.
PLANTIO (${rd.plantio.length}): ${rd.plantio.length > 0 ? JSON.stringify(rd.plantio) : "VAZIO-PULAR"}
${charts.plantio ? 'GRÁFICO PLANTIO: <img src="' + charts.plantio + '">' : "Sem gráfico disponível — gere SVG simples de barras se houver dados."}
STAND (${rd.stand.length}): ${rd.stand.length > 0 ? JSON.stringify(rd.stand) : "VAZIO-PULAR"}`;
}

export function buildPrompt2(rd: ReportPayload, charts: Record<string, string | null>): string {
  return `PARTE 2 DE 3. NÃO inclua <style>. Continue o HTML.
Gere: MANEJO + FENOLOGIA + NDVI + NICKING + DESPENDOAMENTO + PRAGAS.

INSUMOS (${rd.insumos.length}): ${rd.insumos.length > 0 ? JSON.stringify(rd.insumos) : "VAZIO-PULAR"}
Separar em 2 tabelas: Adubação (tipo contém 'fertilizer') e Defensivos (demais).

FENOLOGIA (${rd.feno.length}): ${rd.feno.length > 0 ? JSON.stringify(rd.feno) : "VAZIO-PULAR"}

NDVI (${rd.ndvi.length} imagens limpas): ${rd.ndvi.length > 0 ? JSON.stringify(rd.ndvi) : "VAZIO-PULAR"}
${rd.ndvi_parecer ? "PARECER DO CAMPO (destacar em box azul):\n" + rd.ndvi_parecer : ""}
${charts.ndvi ? 'GRÁFICO NDVI: <img src="' + charts.ndvi + '">' : ""}

NICKING MARCOS (${rd.nicking_marcos.length}): ${rd.nicking_marcos.length > 0 ? JSON.stringify(rd.nicking_marcos) : "VAZIO-PULAR"}
INSPEÇÕES (${rd.inspecoes.length}): ${rd.inspecoes.length > 0 ? JSON.stringify(rd.inspecoes) : "VAZIO-PULAR"}
⚠️ ÚLTIMA OBSERVAÇÃO DO INSPETOR é MUITO importante — destacar em box azul grande.

DESPENDOAMENTO (${rd.desp.length}): ${rd.desp.length > 0 ? JSON.stringify(rd.desp) : "VAZIO-PULAR"}
PRAGAS (${rd.pragas.length}): ${rd.pragas.length > 0 ? JSON.stringify(rd.pragas) : "VAZIO-PULAR"}`;
}

export function buildPrompt3(rd: ReportPayload): string {
  return `PARTE 3 DE 3. NÃO inclua <style>. Continue o HTML.
Gere: ÁGUA + UMIDADE + ESTIMATIVA + COLHEITA + VISITAS + CONCLUSÃO.

IRRIGAÇÃO (${rd.irrig.length}): ${rd.irrig.length > 0 ? JSON.stringify(rd.irrig) : "VAZIO-PULAR"}
CHUVA (${rd.chuva.length}): ${rd.chuva.length > 0 ? JSON.stringify(rd.chuva) : "VAZIO-PULAR"}
UMIDADE (${rd.umid.length}): ${rd.umid.length > 0 ? JSON.stringify(rd.umid) : "VAZIO-PULAR"}
ESTIMATIVA: ${rd.est ? JSON.stringify(rd.est) : "VAZIO-PULAR"}
COLHEITA (${rd.colh.length}): ${rd.colh.length > 0 ? JSON.stringify(rd.colh) : "VAZIO-PULAR"}
VISITAS (${rd.visitas.length}): ${rd.visitas.length > 0 ? JSON.stringify(rd.visitas) : "VAZIO-PULAR"}

CONCLUSÃO TÉCNICA — OBRIGATÓRIA:
Escreva como engenheiro agrônomo sênior. Texto corrido, parágrafos justificados.
Um parágrafo por módulo com dados. Baseie-se nos dados REAIS.
Assinatura: linha + "${rd.org_nome}" + data por extenso.

RESUMO PARA CONCLUSÃO:
Híbrido: ${rd.hibrido} | Safra: ${rd.safra}
Área: ${rd.area_total} ha (F:${rd.area_femea} M:${rd.area_macho})
Lotes: ${rd.lotes.length} | Plantios: ${rd.plantio.length}
Stand: ${rd.stand.length} | Insumos: ${rd.insumos.length}
Pragas: ${rd.pragas.length} | Visitas: ${rd.visitas.length}`;
}

// ── HTML cleanup ──
export function cleanHtml(html: string): string {
  return html
    .replace(/```html\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/<!-- FIM PARTE \d -->/g, "")
    .trim();
}

// ── Open report in new tab ──
export function openReportWindow(fullHtml: string, hibrido: string, safra: string): void {
  const win = window.open("", "_blank");
  if (!win) {
    throw new Error("Popup bloqueado pelo navegador");
  }
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório ${hibrido} — Safra ${safra}</title>
</head>
<body style="margin:0;padding:0">
<div id="toolbar" style="position:fixed;top:0;left:0;right:0;z-index:9999;
  background:linear-gradient(90deg,#1B5E20,#2E7D32);color:white;padding:12px 24px;
  display:flex;justify-content:space-between;align-items:center;
  box-shadow:0 2px 12px rgba(0,0,0,0.3);font-family:Segoe UI,sans-serif">
  <span style="font-size:14px;font-weight:600">
    📄 ${hibrido} — ${safra}
  </span>
  <div>
    <button onclick="document.getElementById('toolbar').style.display='none';window.print();setTimeout(()=>document.getElementById('toolbar').style.display='flex',1000)"
      style="background:white;color:#1B5E20;border:none;padding:10px 24px;
      border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">
      🖨️ Imprimir / Salvar PDF
    </button>
  </div>
</div>
<div style="margin-top:56px">
${fullHtml}
</div>
<style>
@media print {
  #toolbar { display:none !important; }
  body > div:last-child { margin-top:0 !important; }
}
</style>
</body></html>`);
  win.document.close();
}
