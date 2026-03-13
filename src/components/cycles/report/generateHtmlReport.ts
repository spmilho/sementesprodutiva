import type { ReportData } from "./reportTypes";
import { fetchReportData } from "./useReportData";
import { supabase } from "@/integrations/supabase/client";
import coverBgFallback from "@/assets/report-cover-bg.jpg";
import logoWhiteFallback from "@/assets/report-logo-white.png";

export type ProgressCallback = (message: string, current: number, total: number) => void;

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtNum(n: number | null | undefined, dec = 1): string {
  if (n == null) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function escHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ═══════════════════════════════════════
// CSS
// ═══════════════════════════════════════
function getStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary: #1B5E20;
      --primary-light: #2E7D32;
      --primary-lighter: #4CAF50;
      --primary-bg: #E8F5E9;
      --blue: #1565C0;
      --blue-light: #1E88E5;
      --blue-bg: #E3F2FD;
      --orange: #E65100;
      --orange-bg: #FFF3E0;
      --red: #C62828;
      --red-bg: #FFEBEE;
      --gray-50: #FAFAFA;
      --gray-100: #F5F5F5;
      --gray-200: #EEEEEE;
      --gray-300: #E0E0E0;
      --gray-500: #9E9E9E;
      --gray-600: #757575;
      --gray-700: #616161;
      --gray-800: #424242;
      --gray-900: #212121;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05);
      --radius: 12px;
    }

    @page { size: A4; margin: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--gray-800);
      background: white;
      line-height: 1.6;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* COVER PAGE */
    .cover-page {
      width: 100%;
      height: 100vh;
      min-height: 1123px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
    }
    .cover-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.78) 100%);
    }
    .cover-content {
      position: relative;
      z-index: 10;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 48px;
    }
    .cover-logo { max-width: 200px; height: auto; }
    .cover-divider { width: 100%; height: 1px; background: rgba(255,255,255,0.25); margin-top: 20px; }
    .cover-title-block { margin-bottom: 60px; }
    .cover-accent { width: 48px; height: 3px; background: var(--primary-lighter); margin-bottom: 16px; border-radius: 2px; }
    .cover-label { font-size: 12px; text-transform: uppercase; letter-spacing: 4px; color: rgba(255,255,255,0.75); font-weight: 500; }
    .cover-hybrid { font-size: 42px; font-weight: 800; color: #fff; line-height: 1.15; margin-top: 8px; letter-spacing: -0.5px; }
    .cover-season { font-size: 22px; font-weight: 300; color: rgba(255,255,255,0.9); margin-top: 4px; }
    .cover-separator { width: 72px; height: 3px; background: var(--primary-lighter); margin: 20px 0; border-radius: 2px; }
    .cover-info { font-size: 14px; color: rgba(255,255,255,0.85); margin: 5px 0; line-height: 1.7; }
    .cover-info strong { font-weight: 600; }
    .cover-footer { display: flex; justify-content: space-between; align-items: center; }
    .cover-footer span { font-size: 11px; color: rgba(255,255,255,0.55); }

    /* CONTENT PAGES */
    .page {
      padding: 32px 40px;
      page-break-after: always;
      min-height: 100vh;
    }
    .page:last-child { page-break-after: auto; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--gray-200);
      margin-bottom: 28px;
    }
    .page-header-org { font-size: 10px; color: var(--gray-500); font-weight: 500; }
    .page-header-cycle { font-size: 10px; color: var(--gray-600); font-weight: 600; }

    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 6px;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 24px;
      background: var(--primary-lighter);
      border-radius: 2px;
    }
    .section-underline {
      height: 2px;
      background: linear-gradient(90deg, var(--primary-lighter), transparent);
      margin-bottom: 24px;
    }
    .section-subtitle {
      font-size: 14px;
      font-weight: 700;
      color: var(--gray-800);
      margin: 20px 0 10px;
      padding-left: 14px;
      border-left: 3px solid var(--primary-lighter);
    }

    /* KPI CARDS */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi-card {
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s;
    }
    .kpi-card:hover { box-shadow: var(--shadow-md); }
    .kpi-card.primary { border-left: 4px solid var(--primary-lighter); background: var(--primary-bg); }
    .kpi-card.blue { border-left: 4px solid var(--blue-light); background: var(--blue-bg); }
    .kpi-card.orange { border-left: 4px solid var(--orange); background: var(--orange-bg); }
    .kpi-label { font-size: 10px; color: var(--gray-600); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 22px; font-weight: 800; color: var(--gray-900); margin-top: 4px; }
    .kpi-sub { font-size: 10px; color: var(--gray-500); margin-top: 2px; }

    /* TABLES */
    .data-table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 10px; }
    .data-table thead th {
      background: var(--primary);
      color: white;
      font-weight: 600;
      padding: 10px 8px;
      text-align: left;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table thead th:first-child { border-radius: 8px 0 0 0; }
    .data-table thead th:last-child { border-radius: 0 8px 0 0; }
    .data-table tbody td {
      padding: 8px;
      border-bottom: 1px solid var(--gray-200);
      vertical-align: top;
    }
    .data-table tbody tr:nth-child(even) { background: var(--gray-50); }
    .data-table tbody tr:hover { background: var(--primary-bg); }
    .data-table.blue thead th { background: var(--blue); }

    .summary-total {
      font-weight: 700;
      font-size: 11px;
      color: var(--gray-800);
      margin: 8px 0 20px;
      padding: 10px 14px;
      background: var(--gray-100);
      border-radius: 8px;
      border-left: 4px solid var(--primary-lighter);
    }

    /* INFO BOX */
    .info-box {
      background: var(--blue-bg);
      border: 1px solid rgba(30,136,229,0.2);
      border-left: 4px solid var(--blue-light);
      border-radius: 8px;
      padding: 14px 16px;
      margin: 12px 0;
      font-size: 10px;
    }
    .info-box.warning {
      background: var(--red-bg);
      border-color: rgba(198,40,40,0.2);
      border-left-color: var(--red);
    }
    .info-box strong { display: block; margin-bottom: 4px; color: var(--blue); }
    .info-box.warning strong { color: var(--red); }

    /* STATUS BADGES */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 600;
    }
    .badge-green { background: #C8E6C9; color: #2E7D32; }
    .badge-yellow { background: #FFF9C4; color: #F57F17; }
    .badge-red { background: #FFCDD2; color: #C62828; }
    .badge-blue { background: #BBDEFB; color: #1565C0; }

    /* CONCLUSION */
    .conclusion-text { font-size: 11px; line-height: 1.8; color: var(--gray-700); margin-bottom: 10px; text-align: justify; }
    .signature-block { margin-top: 40px; }
    .signature-line { width: 240px; border-top: 1px solid var(--gray-600); padding-top: 8px; }
    .signature-name { font-weight: 700; font-size: 11px; color: var(--gray-800); }
    .signature-org { font-size: 10px; color: var(--gray-500); }

    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 40px;
      font-size: 8px;
      color: var(--gray-500);
      text-align: center;
      border-top: 1px solid var(--gray-200);
    }

    @media print {
      .no-print { display: none !important; }
      .page { page-break-inside: avoid; }
    }
  `;
}

// ═══════════════════════════════════════
// SECTION BUILDERS
// ═══════════════════════════════════════

function pageHeader(data: ReportData): string {
  const c = data.cycle;
  const s = data.orgSettings;
  return `<div class="page-header">
    <span class="page-header-org">${escHtml(s.org_name)}</span>
    <span class="page-header-cycle">${escHtml(c.hybrid_name)} — ${escHtml(c.season)}${c.contract_number ? ` | Contrato: ${escHtml(c.contract_number)}` : ''}</span>
  </div>`;
}

function sectionHeader(title: string): string {
  return `<div class="section-title">${escHtml(title)}</div><div class="section-underline"></div>`;
}

function buildCover(data: ReportData): string {
  const c = data.cycle;
  const s = data.orgSettings;
  const now = new Date();
  const dateStr = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;
  const coverBg = s.report_cover_url || coverBgFallback;
  const logoUrl = s.report_logo_url || logoWhiteFallback;
  const footerText = s.report_footer_text || `${s.org_name} — Excelência em Produção de Sementes`;

  const infoLines = [
    `<strong>Cliente:</strong> ${escHtml(c.client_name)}`,
    ...(c.cooperator_name ? [`<strong>Cooperado:</strong> ${escHtml(c.cooperator_name)}`] : []),
    `<strong>Fazenda:</strong> ${escHtml(c.farm_name)}`,
    `<strong>Pivô:</strong> ${escHtml(c.field_name)}`,
    ...(c.contract_number ? [`<strong>Contrato:</strong> ${escHtml(c.contract_number)}`] : []),
    `<strong>Área:</strong> ${fmtNum(c.total_area)} ha`,
  ];

  return `<div class="cover-page">
    <img src="${coverBg}" class="cover-bg" crossorigin="anonymous" />
    <div class="cover-overlay"></div>
    <div class="cover-content">
      <div>
        <img src="${logoUrl}" class="cover-logo" crossorigin="anonymous" />
        <div class="cover-divider"></div>
      </div>
      <div class="cover-title-block">
        <div class="cover-accent"></div>
        <div class="cover-label">RELATÓRIO DE PRODUÇÃO</div>
        <div class="cover-hybrid">${escHtml(c.hybrid_name)}</div>
        <div class="cover-season">Safra ${escHtml(c.season)}</div>
        <div class="cover-separator"></div>
        ${infoLines.map(l => `<div class="cover-info">${l}</div>`).join('')}
      </div>
      <div class="cover-footer">
        <span>${escHtml(footerText)}</span>
        <span>${dateStr}</span>
      </div>
    </div>
  </div>`;
}

function buildExecutiveSummary(data: ReportData): string {
  const c = data.cycle;
  const statusPT: Record<string, string> = {
    planning: "Planejamento", planting: "Plantio", growing: "Crescimento",
    detasseling: "Despendoamento", harvest: "Colheita", completed: "Concluído", cancelled: "Cancelado",
  };

  // KPI cards
  const kpis: string[] = [];
  const femPlanting = data.plantingActual.filter((p: any) => p.type === "female");
  const malePlanting = data.plantingActual.filter((p: any) => p.type !== "female");

  if (femPlanting.length > 0) {
    const area = femPlanting.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    kpis.push(`<div class="kpi-card primary"><div class="kpi-label">Plantio Fêmea</div><div class="kpi-value">${fmtNum(area)} ha</div><div class="kpi-sub">${femPlanting.length} gleba(s)</div></div>`);
  }
  if (malePlanting.length > 0) {
    const area = malePlanting.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    kpis.push(`<div class="kpi-card primary"><div class="kpi-label">Plantio Macho</div><div class="kpi-value">${fmtNum(area)} ha</div><div class="kpi-sub">${malePlanting.length} registro(s)</div></div>`);
  }
  if (data.detasseling.length > 0) {
    const last = data.detasseling[data.detasseling.length - 1];
    kpis.push(`<div class="kpi-card blue"><div class="kpi-label">Despendoamento</div><div class="kpi-value">${data.detasseling.length} reg.</div><div class="kpi-sub">Rem: ${fmtNum(last.pct_remaining_after)}%</div></div>`);
  }
  if (data.moisture.length > 0) {
    const avg = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;
    kpis.push(`<div class="kpi-card blue"><div class="kpi-label">Umidade Média</div><div class="kpi-value">${fmtNum(avg)}%</div><div class="kpi-sub">${data.moisture.length} amostras</div></div>`);
  }
  if (data.harvestRecords.length > 0) {
    const tons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    kpis.push(`<div class="kpi-card orange"><div class="kpi-label">Colheita</div><div class="kpi-value">${fmtNum(tons)} ton</div><div class="kpi-sub">${data.harvestRecords.length} registro(s)</div></div>`);
  }

  const rows = [
    ["Status", `<span class="badge badge-green">${statusPT[c.status] || c.status}</span>`],
    ["Híbrido", c.hybrid_name],
    ["Linhagem Fêmea", c.female_line],
    ["Linhagem Macho", c.male_line],
    ["Proporção F:M", c.female_male_ratio],
    ...(c.material_split ? [["Split do Material", c.material_split]] : []),
    ...(c.spacing_female_female_cm ? [["Espaçamento F×F", `${c.spacing_female_female_cm} cm`]] : []),
    ...(c.spacing_female_male_cm ? [["Espaçamento F×M", `${c.spacing_female_male_cm} cm`]] : []),
    ...(c.material_cycle_days ? [["Ciclo material", `${c.material_cycle_days} dias`]] : []),
    ...(c.detasseling_dap ? [["DAP Despendoamento", `${c.detasseling_dap} dias`]] : []),
    ["Sistema irrigação", c.irrigation_system],
    ...(c.target_moisture ? [["Umidade alvo", `${fmtNum(c.target_moisture)}%`]] : []),
    ...(c.cooperator_name ? [["Cooperado", c.cooperator_name]] : []),
    ["Fazenda / Pivô", `${c.farm_name} — ${c.field_name}`],
    ...(c.contract_number ? [["Nº Contrato", c.contract_number]] : []),
    ["Área fêmea", `${fmtNum(c.female_area)} ha`],
    ["Área macho", `${fmtNum(c.male_area)} ha`],
    ["Área total", `${fmtNum(c.total_area)} ha`],
    ...(c.expected_productivity ? [["Produtividade esperada", `${fmtNum(c.expected_productivity)} kg/ha`]] : []),
  ];

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Resumo Executivo")}
    ${kpis.length > 0 ? `<div class="kpi-grid">${kpis.join('')}</div>` : ''}
    <table class="data-table">
      <thead><tr><th style="width:40%">Indicador</th><th>Valor</th></tr></thead>
      <tbody>${rows.map(([k, v]) => `<tr><td><strong>${escHtml(k as string)}</strong></td><td>${v}</td></tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function buildSeedLots(data: ReportData): string {
  if (data.seedLots.length === 0) return '';
  const parentLabel = (t: string) => t === "female" ? "Fêmea" : "Macho";
  const rows = data.seedLots.map((l: any) => `<tr>
    <td><span class="badge ${l.parent_type === 'female' ? 'badge-green' : 'badge-blue'}">${parentLabel(l.parent_type)}</span></td>
    <td>${escHtml(l.lot_number)}</td><td>${escHtml(l.origin_season || '—')}</td><td>${fmtDate(l.received_date)}</td>
    <td>${fmtNum(l.quantity_kg || l.quantity)} kg</td><td>${fmtNum(l.thousand_seed_weight_g)}</td>
    <td>${escHtml(l.sieve_classification || '—')}</td><td>${fmtNum(l.germination_pct)}%</td>
    <td>${fmtNum(l.tetrazolium_vigor_pct)}%</td><td>${fmtNum(l.physical_purity_pct)}%</td>
    <td>${fmtNum(l.seed_moisture_pct)}%</td>
  </tr>`).join('');

  let treatmentHtml = '';
  if (data.seedLotTreatments.length > 0) {
    const treat = data.seedLotTreatments[0];
    treatmentHtml = `<div class="section-subtitle">Tratamento da Semente Básica</div>
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Data TS</div><div class="kpi-value" style="font-size:14px">${fmtDate(treat.treatment_date)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Local</div><div class="kpi-value" style="font-size:14px">${escHtml(treat.treatment_location || '—')}</div></div>
      <div class="kpi-card"><div class="kpi-label">Responsável</div><div class="kpi-value" style="font-size:14px">${escHtml(treat.responsible_person || '—')}</div></div>
      ${treat.germination_after_ts != null ? `<div class="kpi-card primary"><div class="kpi-label">Germ. pós-TS</div><div class="kpi-value">${fmtNum(treat.germination_after_ts)}%</div></div>` : ''}
    </div>`;
    
    const seen = new Set<string>();
    const prods = data.seedLotTreatmentProducts.filter((p: any) => {
      if (seen.has(p.product_name)) return false;
      seen.add(p.product_name);
      return true;
    });
    if (prods.length > 0) {
      treatmentHtml += `<table class="data-table blue">
        <thead><tr><th>Ordem</th><th>Produto</th><th>I.A.</th><th>Tipo</th><th>Dose</th><th>Unidade</th></tr></thead>
        <tbody>${prods.map((p: any) => `<tr><td>${p.application_order || '—'}</td><td>${escHtml(p.product_name)}</td><td>${escHtml(p.active_ingredient || '—')}</td><td>${escHtml(p.product_type || '—')}</td><td>${fmtNum(p.dose)}</td><td>${escHtml(p.dose_unit)}</td></tr>`).join('')}</tbody>
      </table>`;
    }
  }

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Semente Básica e Tratamento")}
    <table class="data-table">
      <thead><tr><th>Parental</th><th>Lote</th><th>Safra</th><th>Recebido</th><th>Qtd(kg)</th><th>PMS(g)</th><th>Peneira</th><th>Germ%</th><th>Vigor%</th><th>Purez%</th><th>Umid%</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${treatmentHtml}
  </div>`;
}

function buildPlanting(data: ReportData): string {
  if (data.plantingActual.length === 0) return '';
  const typeLabel = (t: string) => t === "female" ? "Fêmea" : t === "male_1" || t === "male" ? "Macho 1" : t === "male_2" ? "Macho 2" : t === "male_3" ? "Macho 3" : t;

  const cvClass = (cv: number | null) => {
    if (cv == null) return '';
    if (cv > 25) return 'style="background:#FFCDD2"';
    if (cv > 20) return 'style="background:#FFE0B2"';
    if (cv > 15) return 'style="background:#FFF9C4"';
    return 'style="background:#C8E6C9"';
  };

  const rows = data.plantingActual.map((p: any) => {
    const cv = p.cv_percent;
    return `<tr>
      <td>${fmtDate(p.planting_date)}</td>
      <td><span class="badge ${p.type === 'female' ? 'badge-green' : 'badge-blue'}">${typeLabel(p.type)}</span></td>
      <td>${escHtml(p.pivot_glebas?.name || '—')}</td>
      <td>${fmtNum(p.actual_area)}</td><td>${p.row_spacing || '—'}</td>
      <td>${fmtNum(p.seeds_per_meter_actual || p.seeds_per_meter)}</td>
      <td ${cvClass(cv)}>${cv != null ? fmtNum(cv) + '%' : '—'}</td>
      <td>${escHtml(p.soil_condition || '—')}</td>
    </tr>`;
  }).join('');

  const fem = data.plantingActual.filter((p: any) => p.type === "female");
  const mal = data.plantingActual.filter((p: any) => p.type !== "female");
  const femArea = fem.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
  const malArea = mal.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
  const femAvgSm = fem.length > 0 ? fem.reduce((s: number, p: any) => s + (p.seeds_per_meter_actual || p.seeds_per_meter || 0), 0) / fem.length : 0;

  let standHtml = '';
  if (data.standCounts.length > 0) {
    standHtml = `<div class="section-subtitle">Stand de Plantas</div>
    <table class="data-table blue">
      <thead><tr><th>Parental</th><th>Gleba</th><th>Tipo</th><th>Data</th><th>DAP</th><th>Pop.(pl/ha)</th><th>CV%</th><th>Emerg.%</th></tr></thead>
      <tbody>${data.standCounts.map((sc: any) => `<tr>
        <td>${sc.parent_type === 'female' ? 'Fêmea' : 'Macho'}</td>
        <td>${escHtml(sc.pivot_glebas?.name || '—')}</td>
        <td>${escHtml(sc.count_type || '—')}</td><td>${fmtDate(sc.count_date)}</td>
        <td>${sc.days_after_planting ?? '—'}</td>
        <td>${fmtNum(sc.avg_plants_per_ha, 0)}</td>
        <td>${sc.cv_stand_pct != null ? fmtNum(sc.cv_stand_pct) + '%' : '—'}</td>
        <td>${sc.emergence_pct != null ? fmtNum(sc.emergence_pct) + '%' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Plantio Realizado")}
    <table class="data-table">
      <thead><tr><th>Data</th><th>Tipo</th><th>Gleba</th><th>Área(ha)</th><th>Espaç.(cm)</th><th>Sem/m</th><th>CV%</th><th>Solo</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary-total">FÊMEA: ${fmtNum(femArea)} ha | Média ${fmtNum(femAvgSm)} sem/m &nbsp;|&nbsp; MACHO: ${fmtNum(malArea)} ha</div>
    ${standHtml}
  </div>`;
}

function buildNutrition(data: ReportData): string {
  if (data.fertilizations.length === 0) return '';
  const typeLabel = (t: string) => t === "planting" ? "Plantio" : t === "topdressing" ? "Cobertura" : t === "foliar" ? "Foliar" : t;

  const rows = data.fertilizations.map((f: any) => `<tr>
    <td>${fmtDate(f.application_date)}</td><td><span class="badge badge-green">${typeLabel(f.fertilization_type)}</span></td>
    <td>${escHtml(f.growth_stage || '—')}</td><td>${escHtml(f.product_name)}</td>
    <td>${fmtNum(f.dose_per_ha)}</td><td>${fmtNum(f.area_applied_ha)}</td>
    <td>${fmtNum(f.n_supplied_kg_ha)}</td><td>${fmtNum(f.p2o5_supplied_kg_ha)}</td><td>${fmtNum(f.k2o_supplied_kg_ha)}</td>
  </tr>`).join('');

  const totalN = data.fertilizations.reduce((s: number, f: any) => s + (f.n_supplied_kg_ha || 0), 0);
  const totalP = data.fertilizations.reduce((s: number, f: any) => s + (f.p2o5_supplied_kg_ha || 0), 0);
  const totalK = data.fertilizations.reduce((s: number, f: any) => s + (f.k2o_supplied_kg_ha || 0), 0);

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Nutrição e Adubação")}
    <table class="data-table">
      <thead><tr><th>Data</th><th>Tipo</th><th>Estádio</th><th>Produto</th><th>Dose(kg/ha)</th><th>Área(ha)</th><th>N</th><th>P₂O₅</th><th>K₂O</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary-total">TOTAL: N: ${fmtNum(totalN)} kg/ha | P₂O₅: ${fmtNum(totalP)} kg/ha | K₂O: ${fmtNum(totalK)} kg/ha</div>
  </div>`;
}

function buildPhenology(data: ReportData): string {
  if (data.phenology.length === 0) return '';
  const rows = data.phenology.map((p: any) => `<tr>
    <td><span class="badge ${p.type === 'female' ? 'badge-green' : 'badge-blue'}">${p.type === 'female' ? 'Fêmea' : 'Macho'}</span></td>
    <td><strong>${escHtml(p.stage)}</strong></td><td>${fmtDate(p.observation_date)}</td><td>${escHtml(p.description || '—')}</td>
  </tr>`).join('');

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Desenvolvimento Fenológico")}
    <table class="data-table">
      <thead><tr><th>Parental</th><th>Estádio</th><th>Data</th><th>Observações</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function buildNicking(data: ReportData): string {
  if (data.nickingMilestones.length === 0 && data.inspectionData.length === 0) return '';
  let content = '';

  if (data.nickingMilestones.length > 0) {
    const milestoneRows = data.nickingMilestones.flatMap((m: any) => {
      const fp = m.nicking_fixed_points;
      const parentLabel = fp?.parent_type === "female" ? "Fêmea" : "Macho";
      const rows: string[] = [];
      if (m.anthesis_start_date) rows.push(`<tr><td>${parentLabel}</td><td>Início Antese</td><td>${fmtDate(m.anthesis_start_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      if (m.anthesis_50pct_date) rows.push(`<tr><td>${parentLabel}</td><td>50% Antese</td><td>${fmtDate(m.anthesis_50pct_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      if (m.anthesis_end_date) rows.push(`<tr><td>${parentLabel}</td><td>Fim Antese</td><td>${fmtDate(m.anthesis_end_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      if (m.silk_start_date) rows.push(`<tr><td>${parentLabel}</td><td>Início Silk</td><td>${fmtDate(m.silk_start_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      if (m.silk_50pct_date) rows.push(`<tr><td>${parentLabel}</td><td>50% Silk</td><td>${fmtDate(m.silk_50pct_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      if (m.silk_end_date) rows.push(`<tr><td>${parentLabel}</td><td>Fim Silk</td><td>${fmtDate(m.silk_end_date)}</td><td>${escHtml(fp?.name || '—')}</td></tr>`);
      return rows;
    }).join('');

    if (milestoneRows) {
      content += `<table class="data-table">
        <thead><tr><th>Parental</th><th>Marco</th><th>Data</th><th>Ponto</th></tr></thead>
        <tbody>${milestoneRows}</tbody>
      </table>`;
    }
  }

  if (data.inspectionData.length > 0) {
    content += `<div class="section-subtitle">Inspeções de Campo</div>
    <table class="data-table blue">
      <thead><tr><th>Insp.</th><th>Data</th><th>% Desp.</th><th>% ER</th><th>% MP1</th><th>% MP2</th><th>% FP</th><th>Atípicas</th></tr></thead>
      <tbody>${data.inspectionData.map((d: any) => `<tr>
        <td>${d.inspection_number}</td><td>${fmtDate(d.inspection_date)}</td>
        <td>${d.pct_detasseled != null ? fmtNum(d.pct_detasseled) + '%' : '—'}</td>
        <td>${d.pct_stigma_receptive != null ? fmtNum(d.pct_stigma_receptive) + '%' : '—'}</td>
        <td>${d.pct_male1_pollinating != null ? fmtNum(d.pct_male1_pollinating) + '%' : '—'}</td>
        <td>${d.pct_male2_pollinating != null ? fmtNum(d.pct_male2_pollinating) + '%' : '—'}</td>
        <td>${d.pct_female_pollinating != null ? fmtNum(d.pct_female_pollinating) + '%' : '—'}</td>
        <td>${d.total_atypical_pollinating != null ? fmtNum(d.total_atypical_pollinating) + '%' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;

    const lastInsp = data.inspectionData[data.inspectionData.length - 1];
    if (lastInsp?.observations) {
      content += `<div class="info-box"><strong>Observações da última inspeção:</strong>${escHtml(lastInsp.observations)}</div>`;
    }
  }

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Sincronismo Floral (Nicking)")}
    ${content}
  </div>`;
}

function buildDetasseling(data: ReportData): string {
  if (data.detasseling.length === 0 && !data.cycle.detasseling_dap) return '';
  const methodLabel = (m: string) => m === "manual" ? "Manual" : m === "mechanical" ? "Mecânico" : m === "combined" ? "Combinado" : m;

  let forecastHtml = '';
  if (data.cycle.detasseling_dap && data.glebas.length > 0) {
    const dap = data.cycle.detasseling_dap;
    const femaleGlebas = data.glebas.filter((g: any) => g.parent_type === "female");
    if (femaleGlebas.length > 0) {
      forecastHtml = `<div class="section-subtitle">Previsão por Gleba</div>
      <table class="data-table blue">
        <thead><tr><th>Gleba</th><th>Área(ha)</th><th>Plantio Real</th><th>Desp. Estimado</th><th>Status</th></tr></thead>
        <tbody>${femaleGlebas.map((g: any) => {
          const actual = data.plantingActual.find((p: any) => p.pivot_glebas?.name === g.name && p.type === "female");
          const plantDate = actual?.planting_date || null;
          let estDate = null;
          if (plantDate) { const d = new Date(plantDate); d.setDate(d.getDate() + dap); estDate = d.toISOString().slice(0, 10); }
          const hasRec = data.detasseling.some((d: any) => d.pivot_glebas?.name === g.name);
          return `<tr><td>${escHtml(g.name)}</td><td>${fmtNum(g.area_ha)}</td><td>${plantDate ? fmtDate(plantDate) : '—'}</td><td>${estDate ? fmtDate(estDate) : '—'}</td><td>${hasRec ? '<span class="badge badge-green">✅ Iniciado</span>' : '<span class="badge badge-yellow">⏳ Aguardando</span>'}</td></tr>`;
        }).join('')}</tbody>
      </table>`;
    }
  }

  let recordsHtml = '';
  if (data.detasseling.length > 0) {
    const remClass = (v: number) => v > 1 ? 'badge-red' : v > 0.5 ? 'badge-yellow' : 'badge-green';
    recordsHtml = `<div class="section-subtitle">Registros Operacionais</div>
    <table class="data-table">
      <thead><tr><th>Passada</th><th>Data</th><th>Área(ha)</th><th>Método</th><th>Equipe</th><th>% Tirado</th><th>% Reman.</th><th>Rend.</th><th>NC</th></tr></thead>
      <tbody>${data.detasseling.map((d: any) => `<tr>
        <td>${escHtml(d.pass_type || '—')}</td><td>${fmtDate(d.operation_date)}</td>
        <td>${fmtNum(d.area_worked_ha)}</td><td>${methodLabel(d.method)}</td>
        <td>${d.team_size || '—'}</td><td>${fmtNum(d.pct_detasseled_this_pass)}%</td>
        <td><span class="badge ${remClass(d.pct_remaining_after)}">${fmtNum(d.pct_remaining_after)}%</span></td>
        <td>${d.yield_per_person_ha != null ? fmtNum(d.yield_per_person_ha) : '—'}</td>
        <td>${d.non_conformities ? '⚠️' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;

    const last = data.detasseling[data.detasseling.length - 1];
    const remStatus = last.pct_remaining_after <= 0.5 ? "Adequado ✅" : "Acima do limite de 0,5% ⚠️";
    recordsHtml += `<div class="summary-total">Remanescente final: ${fmtNum(last.pct_remaining_after)}% — ${remStatus}</div>`;

    const ncs = data.detasseling.filter((d: any) => d.non_conformities);
    if (ncs.length > 0) {
      recordsHtml += `<div class="info-box warning"><strong>NÃO CONFORMIDADES:</strong>${ncs.map((d: any) => `${fmtDate(d.operation_date)}: ${escHtml(d.non_conformities)}`).join('<br/>')}</div>`;
    }
  }

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Despendoamento")}
    ${forecastHtml}
    ${recordsHtml}
  </div>`;
}

function buildChemicals(data: ReportData): string {
  if (data.chemicals.length === 0) return '';
  const herbs = data.chemicals.filter((c: any) => c.application_type === "herbicida").length;
  const insecs = data.chemicals.filter((c: any) => c.application_type === "inseticida").length;
  const fungs = data.chemicals.filter((c: any) => c.application_type === "fungicida").length;

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Manejo Fitossanitário")}
    <div class="kpi-grid">
      <div class="kpi-card primary"><div class="kpi-label">Total Aplicações</div><div class="kpi-value">${data.chemicals.length}</div></div>
      <div class="kpi-card"><div class="kpi-label">Herbicidas</div><div class="kpi-value">${herbs}</div></div>
      <div class="kpi-card"><div class="kpi-label">Inseticidas</div><div class="kpi-value">${insecs}</div></div>
      <div class="kpi-card"><div class="kpi-label">Fungicidas</div><div class="kpi-value">${fungs}</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Data</th><th>Produto</th><th>I.A.</th><th>Dose</th><th>Unid.</th><th>Vol.Calda</th><th>Método</th><th>Área(ha)</th><th>Tipo</th><th>Alvo</th></tr></thead>
      <tbody>${data.chemicals.map((c: any) => `<tr>
        <td>${fmtDate(c.application_date)}</td><td>${escHtml(c.product_name)}</td><td>${escHtml(c.active_ingredient || '—')}</td>
        <td>${fmtNum(c.dose_per_ha)}</td><td>${escHtml(c.dose_unit)}</td><td>${c.spray_volume != null ? fmtNum(c.spray_volume) : '—'}</td>
        <td>${c.application_method === 'terrestre' ? 'Terrestre' : c.application_method === 'aereo' ? 'Aéreo' : escHtml(c.application_method)}</td>
        <td>${fmtNum(c.area_applied_ha)}</td><td>${escHtml(c.application_type)}</td><td>${escHtml(c.target_pest || '—')}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function buildPests(data: ReportData): string {
  if (data.pests.length === 0) return '';
  const sevLabel = (s: string) => ({ low: "🟢 Baixa", moderate: "🟡 Moderada", high: "🟠 Alta", critical: "🔴 Crítica" }[s] || s);
  const nde = data.pests.filter((p: any) => p.economic_damage_reached).length;

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Pragas e Doenças")}
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Ocorrências</div><div class="kpi-value">${data.pests.length}</div></div>
      <div class="kpi-card ${nde > 0 ? 'orange' : ''}"><div class="kpi-label">Nível Dano Econômico</div><div class="kpi-value">${nde}</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>Incid.%</th><th>Severidade</th><th>Estádio</th><th>Parental</th><th>Ação</th><th>NDE</th></tr></thead>
      <tbody>${data.pests.map((p: any) => `<tr>
        <td>${fmtDate(p.observation_date)}</td><td>${escHtml(p.pest_name)}</td><td>${escHtml(p.pest_type)}</td>
        <td>${p.incidence_pct != null ? fmtNum(p.incidence_pct) + '%' : '—'}</td><td>${sevLabel(p.severity)}</td>
        <td>${escHtml(p.growth_stage || '—')}</td><td>${p.affected_parent === 'female' ? 'Fêmea' : 'Macho'}</td>
        <td>${escHtml(p.action_taken || '—')}</td><td>${p.economic_damage_reached ? '<span class="badge badge-red">Sim</span>' : 'Não'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function buildMoisture(data: ReportData): string {
  if (data.moisture.length === 0) return '';
  const c = data.cycle;
  const target = c.target_moisture ?? 18;
  const byGleba = new Map<string, any[]>();
  data.moisture.forEach((m: any) => {
    const gName = m.pivot_glebas?.name || "Geral";
    if (!byGleba.has(gName)) byGleba.set(gName, []);
    byGleba.get(gName)!.push(m);
  });

  const rows: string[] = [];
  byGleba.forEach((samples, gName) => {
    const avg = samples.reduce((s: number, m: any) => s + m.moisture_pct, 0) / samples.length;
    const min = Math.min(...samples.map((m: any) => m.moisture_pct));
    const max = Math.max(...samples.map((m: any) => m.moisture_pct));
    const belowTarget = samples.filter((m: any) => m.moisture_pct <= target).length;
    const pctBelow = ((belowTarget / samples.length) * 100).toFixed(0);
    const statusClass = avg <= target ? 'badge-green' : avg <= target + 3 ? 'badge-yellow' : 'badge-red';
    const statusText = avg <= target ? '🟢 Pronta' : avg <= target + 3 ? '🟡 Quase' : '🔴 Não pronta';
    rows.push(`<tr><td>${escHtml(gName)}</td><td>${samples.length}</td><td>${fmtNum(avg)}%</td><td>${fmtNum(min)}%</td><td>${fmtNum(max)}%</td><td>${pctBelow}%</td><td><span class="badge ${statusClass}">${statusText}</span></td></tr>`);
  });

  const avgAll = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Monitoramento de Umidade")}
    <div class="kpi-grid">
      <div class="kpi-card blue"><div class="kpi-label">Amostras</div><div class="kpi-value">${data.moisture.length}</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Média Geral</div><div class="kpi-value">${fmtNum(avgAll)}%</div></div>
      <div class="kpi-card"><div class="kpi-label">Alvo</div><div class="kpi-value">${fmtNum(target)}%</div></div>
      <div class="kpi-card"><div class="kpi-label">Glebas</div><div class="kpi-value">${byGleba.size}</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Gleba</th><th>Amostras</th><th>Média%</th><th>Min%</th><th>Max%</th><th>% ≤ Alvo</th><th>Status</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  </div>`;
}

function buildYieldEstimate(data: ReportData): string {
  if (data.yieldEstimates.length === 0) return '';
  const est = data.yieldEstimates[0];
  const c = data.cycle;

  let pointsHtml = '';
  if (data.yieldSamplePoints.length > 0) {
    pointsHtml = `<table class="data-table">
      <thead><tr><th>Ponto</th><th>Data</th><th>Posição</th><th>Espigas/ha</th><th>Grãos/esp.</th><th>Umid.%</th><th>Prod.bruta(kg/ha)</th></tr></thead>
      <tbody>${data.yieldSamplePoints.map((sp: any) => `<tr>
        <td>${sp.point_number}</td><td>${fmtDate(sp.sample_date)}</td><td>${escHtml(sp.pivot_position || '—')}</td>
        <td>${sp.ears_per_ha != null ? fmtNum(sp.ears_per_ha, 0) : '—'}</td>
        <td>${sp.avg_kernels_per_ear != null ? fmtNum(sp.avg_kernels_per_ear, 0) : '—'}</td>
        <td>${fmtNum(sp.sample_moisture_pct)}%</td>
        <td>${sp.point_gross_yield_kg_ha != null ? fmtNum(sp.point_gross_yield_kg_ha, 0) : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  }

  const scHa = est.bag_weight_kg > 0 ? (est.net_yield_kg_ha / est.bag_weight_kg) : 0;

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Estimativa de Produtividade")}
    <div class="kpi-grid">
      ${est.net_yield_kg_ha ? `<div class="kpi-card primary"><div class="kpi-label">Produtividade Líquida</div><div class="kpi-value">${fmtNum(est.net_yield_kg_ha, 0)} kg/ha</div><div class="kpi-sub">${fmtNum(scHa, 1)} sc/ha</div></div>` : ''}
      ${est.total_production_tons ? `<div class="kpi-card primary"><div class="kpi-label">Produção Total Estimada</div><div class="kpi-value">${fmtNum(est.total_production_tons, 1)} ton</div></div>` : ''}
      <div class="kpi-card"><div class="kpi-label">PMS</div><div class="kpi-value">${fmtNum(est.final_pms_g || est.default_tgw_g)}g</div></div>
      <div class="kpi-card"><div class="kpi-label">Umid. Referência</div><div class="kpi-value">${fmtNum(est.moisture_reference_pct)}%</div></div>
    </div>
    ${pointsHtml}
    <div class="summary-total">Perdas: Despalha ${fmtNum(est.dehusking_loss_pct)}% | Classificação ${fmtNum(est.classification_loss_pct)}% | Outras ${fmtNum(est.other_loss_pct)}%${c.expected_production && est.total_production_tons ? ` | Meta: ${fmtNum(c.expected_production, 1)} ton (${fmtNum((est.total_production_tons / c.expected_production) * 100, 0)}%)` : ''}</div>
  </div>`;
}

function buildHarvest(data: ReportData): string {
  if (data.harvestRecords.length === 0) return '';
  const totalArea = data.harvestRecords.reduce((s: number, h: any) => s + (h.area_harvested_ha || 0), 0);
  const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
  const totalLoads = data.harvestRecords.reduce((s: number, h: any) => s + (h.loads_count || 0), 0);
  const avgMoist = data.harvestRecords.reduce((s: number, h: any) => s + (h.avg_moisture_pct || 0), 0) / data.harvestRecords.length;

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Colheita")}
    <div class="kpi-grid">
      <div class="kpi-card primary"><div class="kpi-label">Área Colhida</div><div class="kpi-value">${fmtNum(totalArea)} ha</div></div>
      <div class="kpi-card primary"><div class="kpi-label">Total Colhido</div><div class="kpi-value">${fmtNum(totalTons)} ton</div></div>
      <div class="kpi-card"><div class="kpi-label">Cargas</div><div class="kpi-value">${totalLoads}</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Umidade Média</div><div class="kpi-value">${fmtNum(avgMoist)}%</div></div>
    </div>
    <table class="data-table">
      <thead><tr><th>Data</th><th>Gleba</th><th>Área(ha)</th><th>Umidade%</th><th>Cargas</th><th>Ton</th><th>Ton/Carga</th><th>Destino</th><th>Ticket</th></tr></thead>
      <tbody>${data.harvestRecords.map((h: any) => `<tr>
        <td>${fmtDate(h.harvest_date)}</td><td>${escHtml(h.pivot_glebas?.name || '—')}</td>
        <td>${fmtNum(h.area_harvested_ha)}</td><td>${fmtNum(h.avg_moisture_pct)}%</td>
        <td>${h.loads_count}</td><td>${fmtNum(h.total_weight_tons)}</td>
        <td>${h.weight_per_load_tons ? fmtNum(h.weight_per_load_tons) : '—'}</td>
        <td>${escHtml(h.delivery_destination || '—')}</td><td>${escHtml(h.ticket_number || '—')}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function buildConclusion(data: ReportData): string {
  const c = data.cycle;
  const s = data.orgSettings;
  const paragraphs: string[] = [];

  // Identification
  paragraphs.push(
    `O presente relatório refere-se ao híbrido <strong>${escHtml(c.hybrid_name)}</strong>, produzido no pivô ${escHtml(c.field_name)}` +
    (c.cooperator_name ? ` do cooperado ${escHtml(c.cooperator_name)}` : '') +
    `, fazenda ${escHtml(c.farm_name)}` +
    (c.contract_number ? `, contrato ${escHtml(c.contract_number)}` : '') +
    `, safra ${escHtml(c.season)}, com área de ${fmtNum(c.female_area)} ha de fêmea e ${fmtNum(c.male_area)} ha de macho, totalizando ${fmtNum(c.total_area)} ha.`
  );

  if (data.seedLots.length > 0) {
    const femLots = data.seedLots.filter((l: any) => l.parent_type === "female");
    const femAvgGerm = femLots.length > 0 ? femLots.reduce((s: number, l: any) => s + l.germination_pct, 0) / femLots.length : 0;
    const hasTreatment = data.seedLotTreatments.length > 0;
    const treatText = hasTreatment
      ? (data.seedLotTreatments[0].treatment_origin === "in_house" ? `foi realizado in-house com ${data.seedLotTreatmentProducts.length} produtos` : "veio tratado pelo cliente")
      : "não foi realizado";
    paragraphs.push(`A semente básica de fêmea foi recebida em ${femLots.length} lote(s), com germinação média de ${fmtNum(femAvgGerm)}%. O tratamento de sementes ${treatText}.`);
  }

  if (data.plantingActual.length > 0) {
    const fem = data.plantingActual.filter((p: any) => p.type === "female");
    const femArea = fem.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    const femAvgSm = fem.length > 0 ? fem.reduce((s: number, p: any) => s + (p.seeds_per_meter_actual || p.seeds_per_meter || 0), 0) / fem.length : 0;
    paragraphs.push(`O plantio de fêmea totalizou ${fmtNum(femArea)} ha em ${fem.length} gleba(s), com densidade média de ${fmtNum(femAvgSm)} sementes/metro.`);
  }

  if (data.fertilizations.length > 0) {
    const totalN = data.fertilizations.reduce((s: number, f: any) => s + (f.n_supplied_kg_ha || 0), 0);
    paragraphs.push(`A nutrição totalizou ${fmtNum(totalN)} kg/ha de N em ${data.fertilizations.length} aplicações.`);
  }

  if (data.detasseling.length > 0) {
    const lastD = data.detasseling[data.detasseling.length - 1];
    paragraphs.push(`O despendoamento foi realizado em ${data.detasseling.length} registros, com remanescente final de ${fmtNum(lastD.pct_remaining_after)}%.`);
  }

  if (data.chemicals.length > 0) {
    paragraphs.push(`Foram realizadas ${data.chemicals.length} aplicações fitossanitárias.`);
  }

  if (data.moisture.length > 0) {
    const avg = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;
    paragraphs.push(`A umidade foi monitorada com ${data.moisture.length} amostras. Média: ${fmtNum(avg)}%.`);
  }

  if (data.yieldEstimates.length > 0 && data.yieldEstimates[0].net_yield_kg_ha) {
    const est = data.yieldEstimates[0];
    paragraphs.push(`A estimativa de produtividade indicou ${fmtNum(est.net_yield_kg_ha, 0)} kg/ha líquidos, totalizando ${fmtNum(est.total_production_tons, 1)} toneladas estimadas.`);
  }

  if (data.harvestRecords.length > 0) {
    const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    paragraphs.push(`A colheita totalizou ${fmtNum(totalTons)} toneladas.`);
  }

  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const now = new Date();

  return `<div class="page">
    ${pageHeader(data)}
    ${sectionHeader("Conclusão Técnica")}
    ${paragraphs.map(p => `<p class="conclusion-text">${p}</p>`).join('')}
    <div class="signature-block">
      <p style="font-size:11px;color:var(--gray-600);margin-bottom:28px">${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}</p>
      <div class="signature-line">
        <div class="signature-name">Responsável Técnico</div>
        <div class="signature-org">${escHtml(s.org_name)}</div>
      </div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════

function buildFullHtml(data: ReportData): string {
  const sections = [
    buildCover(data),
    buildExecutiveSummary(data),
    buildSeedLots(data),
    buildPlanting(data),
    buildNutrition(data),
    buildPhenology(data),
    buildNicking(data),
    buildDetasseling(data),
    buildChemicals(data),
    buildPests(data),
    buildMoisture(data),
    buildYieldEstimate(data),
    buildHarvest(data),
    buildConclusion(data),
  ].filter(Boolean).join('\n');

  const now = new Date();
  const s = data.orgSettings;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório — ${escHtml(data.cycle.hybrid_name)} — Safra ${escHtml(data.cycle.season)}</title>
  <style>${getStyles()}</style>
</head>
<body>
  ${sections}
  <div class="no-print" style="position:fixed;bottom:20px;right:20px;z-index:999;display:flex;gap:10px">
    <button onclick="window.print()" style="background:#1B5E20;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2)">🖨️ Imprimir / Salvar PDF</button>
  </div>
</body>
</html>`;
}

export async function generateHtmlReport(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; blob: Blob }> {
  const totalSteps = 4;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  progress("Carregando dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  progress("Gerando relatório HTML...", 2);
  const html = buildFullHtml(data);

  progress("Abrindo relatório...", 3);
  // Open in new window
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }

  // Create blob for storage
  const blob = new Blob([html], { type: 'text/html' });
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Relatorio_${data.cycle.hybrid_name}_${data.cycle.season.replace('/', '-')}_${dateStr}.html`;

  // Upload to storage
  progress("Salvando cópia...", 4);
  try {
    const storagePath = `reports/${data.cycle.org_id}/${cycleId}/${fileName}`;
    await (supabase as any).storage.from("cycle-media").upload(storagePath, blob, {
      contentType: "text/html",
      upsert: true,
    });

    const { data: urlData } = (supabase as any).storage.from("cycle-media").getPublicUrl(storagePath);
    const fileUrl = urlData?.publicUrl || storagePath;

    await (supabase as any).from("attachments").insert({
      entity_id: cycleId,
      entity_type: "cycle",
      org_id: data.cycle.org_id,
      file_name: fileName,
      file_url: fileUrl,
      file_type: "text/html",
      file_size: blob.size,
      document_category: "relatorio",
      description: `Relatório gerado em ${now.toLocaleDateString("pt-BR")}`,
    });
  } catch (e) {
    console.warn("Falha ao salvar cópia do relatório:", e);
  }

  return { fileName, blob };
}
