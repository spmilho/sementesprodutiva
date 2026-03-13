import type { ReportData } from "./reportTypes";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtNum(n: number | null | undefined, dec = 1): string {
  if (n == null) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--g:#1B5E20;--gl:#2E7D32;--b:#1565C0;--o:#E65100}
@page{size:A4;margin:15mm 12mm}
body{font-family:'Inter',system-ui,sans-serif;color:#424242;background:#fff;font-size:11px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cover{width:100%;min-height:100vh;background:linear-gradient(135deg,#1B5E20,#2E7D32,#1B5E20);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px 40px;page-break-after:always}
.cover h1{font-size:14px;text-transform:uppercase;letter-spacing:6px;opacity:.7;margin-bottom:16px}
.cover h2{font-size:38px;font-weight:800;margin-bottom:8px}
.cover h3{font-size:20px;font-weight:300;opacity:.9}
.cover .info{margin-top:32px;font-size:13px;opacity:.85;line-height:2}
.page{padding:32px 40px;page-break-after:always;min-height:100vh}
.page:last-child{page-break-after:auto}
.sec-title{font-size:18px;font-weight:800;color:var(--g);margin-bottom:4px;display:flex;align-items:center;gap:8px}
.sec-title::before{content:'';display:inline-block;width:4px;height:22px;background:#4CAF50;border-radius:2px}
.sec-line{height:2px;background:linear-gradient(90deg,#4CAF50,transparent);margin-bottom:20px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px}
.kpi{background:#fff;border:1px solid #E0E0E0;border-left:4px solid #4CAF50;border-radius:10px;padding:14px}
.kpi.blue{border-left-color:var(--b)}
.kpi.orange{border-left-color:var(--o)}
.kpi-label{font-size:9px;color:#757575;text-transform:uppercase;letter-spacing:.5px}
.kpi-val{font-size:20px;font-weight:800;color:#212121;margin-top:2px}
.kpi-sub{font-size:9px;color:#9E9E9E;margin-top:2px}
table.dt{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:10px}
table.dt thead th{background:var(--g);color:#fff;font-weight:600;padding:8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px}
table.dt thead th:first-child{border-radius:6px 0 0 0}
table.dt thead th:last-child{border-radius:0 6px 0 0}
table.dt tbody td{padding:7px 8px;border-bottom:1px solid #EEE}
table.dt tbody tr:nth-child(even){background:#FAFAFA}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:9px;font-weight:600}
.bg-green{background:#C8E6C9;color:#2E7D32}
.bg-blue{background:#BBDEFB;color:#1565C0}
.bg-orange{background:#FFE0B2;color:#E65100}
.bg-red{background:#FFCDD2;color:#C62828}
.summary{font-weight:700;padding:10px 14px;background:#F5F5F5;border-left:4px solid #4CAF50;border-radius:6px;margin:8px 0 18px}
.conclusion{font-size:11px;line-height:1.8;color:#616161;text-align:justify;margin-bottom:10px}
.sig{margin-top:40px;width:240px;border-top:1px solid #616161;padding-top:8px}
.sig-name{font-weight:700;font-size:11px}
.sig-org{font-size:10px;color:#9E9E9E}
@media print{.no-print{display:none!important}}
`;

export function buildFallbackReport(data: ReportData): string {
  const c = data.cycle;
  const s = data.orgSettings;
  const now = new Date();
  const sections: string[] = [];

  // Cover
  const logoHtml = s.report_logo_url ? `<img src="${s.report_logo_url}" style="max-width:180px;margin-bottom:24px" crossorigin="anonymous"/>` : '';
  sections.push(`<div class="cover">
    ${logoHtml}
    <h1>Relatório de Produção</h1>
    <h2>${esc(c.hybrid_name)}</h2>
    <h3>Safra ${esc(c.season)}</h3>
    <div class="info">
      <div>Cliente: ${esc(c.client_name)}</div>
      ${c.cooperator_name ? `<div>Cooperado: ${esc(c.cooperator_name)}</div>` : ''}
      <div>Fazenda: ${esc(c.farm_name)} — Pivô: ${esc(c.field_name)}</div>
      ${c.contract_number ? `<div>Contrato: ${esc(c.contract_number)}</div>` : ''}
      <div>Área Total: ${fmtNum(c.total_area)} ha (F: ${fmtNum(c.female_area)} | M: ${fmtNum(c.male_area)})</div>
      <div style="margin-top:16px;opacity:.6">${now.toLocaleDateString("pt-BR")}</div>
    </div>
  </div>`);

  // Executive Summary
  const kpis: string[] = [];
  const femP = data.plantingActual.filter((p: any) => p.type === "female" || p.pivot_glebas?.parent_type === "female");
  if (femP.length) {
    const area = femP.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    kpis.push(`<div class="kpi"><div class="kpi-label">Plantio Fêmea</div><div class="kpi-val">${fmtNum(area)} ha</div><div class="kpi-sub">${femP.length} gleba(s)</div></div>`);
  }
  if (data.detasseling.length) kpis.push(`<div class="kpi blue"><div class="kpi-label">Despendoamento</div><div class="kpi-val">${data.detasseling.length}</div><div class="kpi-sub">registros</div></div>`);
  if (data.harvestRecords.length) {
    const tons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    kpis.push(`<div class="kpi orange"><div class="kpi-label">Colheita</div><div class="kpi-val">${fmtNum(tons)} t</div><div class="kpi-sub">${data.harvestRecords.length} cargas</div></div>`);
  }

  const infoRows = [
    ["Híbrido", c.hybrid_name], ["Linhagem F", c.female_line], ["Linhagem M", c.male_line],
    ["Proporção F:M", c.female_male_ratio], ["Sistema Irrigação", c.irrigation_system],
    ...(c.material_cycle_days ? [["Ciclo", `${c.material_cycle_days} dias`]] : []),
    ...(c.target_moisture ? [["Umidade Alvo", `${fmtNum(c.target_moisture)}%`]] : []),
  ];

  sections.push(`<div class="page">
    <div class="sec-title">Resumo Executivo</div><div class="sec-line"></div>
    ${kpis.length ? `<div class="kpi-grid">${kpis.join('')}</div>` : ''}
    <table class="dt"><thead><tr><th>Indicador</th><th>Valor</th></tr></thead>
    <tbody>${infoRows.map(([k, v]) => `<tr><td><strong>${esc(k as string)}</strong></td><td>${esc(String(v || '—'))}</td></tr>`).join('')}</tbody></table>
  </div>`);

  // Seed Lots
  if (data.seedLots.length) {
    const rows = data.seedLots.map((l: any) => `<tr>
      <td><span class="badge ${l.parent_type === 'female' ? 'bg-green' : 'bg-blue'}">${l.parent_type === 'female' ? 'F' : 'M'}</span></td>
      <td>${esc(l.lot_number)}</td><td>${fmtNum(l.quantity_kg || l.quantity)} kg</td>
      <td>${fmtNum(l.germination_pct)}%</td><td>${fmtNum(l.thousand_seed_weight_g)} g</td>
    </tr>`).join('');
    sections.push(`<div class="page"><div class="sec-title">🌱 Semente Básica</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Tipo</th><th>Lote</th><th>Qtd</th><th>Germ.</th><th>PMG</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  // Planting
  if (data.plantingActual.length) {
    const rows = data.plantingActual.map((p: any) => `<tr>
      <td>${esc(p.pivot_glebas?.name || '—')}</td><td>${fmtDate(p.planting_date)}</td>
      <td>${fmtNum(p.actual_area)} ha</td><td>${fmtNum(p.actual_density)}</td>
      <td>${fmtNum(p.cv_percent)}%</td>
    </tr>`).join('');
    sections.push(`<div class="page"><div class="sec-title">🚜 Plantio Realizado</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Gleba</th><th>Data</th><th>Área</th><th>Densidade</th><th>CV%</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  // Fertilization
  if (data.fertilizations.length) {
    const rows = data.fertilizations.map((f: any) => `<tr>
      <td>${fmtDate(f.application_date)}</td><td>${esc(f.product_name)}</td>
      <td>${esc(f.fertilization_type)}</td><td>${fmtNum(f.dose_per_ha)} ${esc(f.dose_unit || 'kg/ha')}</td>
      <td>${fmtNum(f.area_applied_ha)} ha</td>
    </tr>`).join('');
    sections.push(`<div class="page"><div class="sec-title">🧪 Nutrição / Adubação</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th>Dose</th><th>Área</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  // Detasseling
  if (data.detasseling.length) {
    const rows = data.detasseling.map((d: any) => `<tr>
      <td>${fmtDate(d.operation_date)}</td><td>${esc(d.pass_type)}</td><td>${esc(d.method)}</td>
      <td>${fmtNum(d.area_worked_ha)} ha</td><td>${fmtNum(d.pct_detasseled_this_pass)}%</td>
      <td>${fmtNum(d.pct_remaining_after)}%</td>
    </tr>`).join('');
    sections.push(`<div class="page"><div class="sec-title">✂️ Despendoamento</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Data</th><th>Passada</th><th>Método</th><th>Área</th><th>Desp.</th><th>Rem.</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  // Moisture
  if (data.moisture.length) {
    const rows = data.moisture.map((m: any) => `<tr>
      <td>${fmtDate(m.sample_date)}</td><td>${esc(m.pivot_glebas?.name || m.point_identifier || '—')}</td>
      <td>${fmtNum(m.moisture_pct)}%</td><td>${esc(m.method)}</td>
    </tr>`).join('');
    sections.push(`<div class="page"><div class="sec-title">💦 Umidade de Grãos</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Data</th><th>Ponto</th><th>Umidade</th><th>Método</th></tr></thead><tbody>${rows}</tbody></table></div>`);
  }

  // Harvest
  if (data.harvestRecords.length) {
    const rows = data.harvestRecords.map((h: any) => `<tr>
      <td>${fmtDate(h.harvest_date)}</td><td>${esc(h.pivot_glebas?.name || '—')}</td>
      <td>${fmtNum(h.area_harvested_ha)} ha</td><td>${fmtNum(h.total_weight_tons)} t</td>
      <td>${fmtNum(h.avg_moisture_pct)}%</td><td>${h.loads_count}</td>
    </tr>`).join('');
    const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    sections.push(`<div class="page"><div class="sec-title">🚛 Colheita</div><div class="sec-line"></div>
      <table class="dt"><thead><tr><th>Data</th><th>Gleba</th><th>Área</th><th>Peso</th><th>Umidade</th><th>Cargas</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary">Total colhido: ${fmtNum(totalTons)} toneladas</div></div>`);
  }

  // Conclusion
  const conclusionParts: string[] = [];
  conclusionParts.push(`Relatório referente ao ciclo de produção do híbrido ${c.hybrid_name}, safra ${c.season}, conduzido na fazenda ${c.farm_name}, pivô ${c.field_name}.`);
  if (data.plantingActual.length) conclusionParts.push(`O plantio foi realizado em ${data.plantingActual.length} gleba(s).`);
  if (data.detasseling.length) conclusionParts.push(`Foram realizados ${data.detasseling.length} registros de despendoamento.`);
  if (data.harvestRecords.length) {
    const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    conclusionParts.push(`A colheita totalizou ${fmtNum(totalTons)} toneladas.`);
  }

  sections.push(`<div class="page">
    <div class="sec-title">📝 Conclusão Técnica</div><div class="sec-line"></div>
    <p class="conclusion">${conclusionParts.join(' ')}</p>
    <div class="sig"><div class="sig-name">Responsável Técnico</div><div class="sig-org">${esc(s.org_name)}</div></div>
    <div style="margin-top:20px;font-size:9px;color:#9E9E9E">
      ${s.report_footer_text ? esc(s.report_footer_text) : esc(s.org_name) + ' — Relatório gerado automaticamente'}
    </div>
  </div>`);

  return `<style>${CSS}</style>\n${sections.join('\n')}`;
}
