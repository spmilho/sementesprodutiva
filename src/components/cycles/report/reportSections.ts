import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData } from "./reportTypes";

const PRIMARY: [number, number, number] = [27, 94, 32];
const BLUE: [number, number, number] = [30, 136, 229];
const ALT_ROW: [number, number, number] = [245, 248, 245];
const MARGIN = { left: 15, right: 15, top: 25, bottom: 20 };

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtNum(n: number | null | undefined, dec = 1): string {
  if (n == null) return "—";
  return n.toFixed(dec).replace(".", ",");
}

function drawHeader(doc: jsPDF, data: ReportData) {
  const c = data.cycle;
  const s = data.orgSettings;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  doc.text(s.org_name, MARGIN.left, 10);
  doc.text(`${c.hybrid_name} — ${c.season}`, 105, 10, { align: "center" });
  if (c.contract_number) doc.text(`Contrato: ${c.contract_number}`, 210 - MARGIN.right, 10, { align: "right" });
  doc.setDrawColor(224, 224, 224);
  doc.setLineWidth(0.3);
  doc.line(MARGIN.left, 12, 210 - MARGIN.right, 12);
}

function drawFooter(doc: jsPDF, data: ReportData, pageNum: number, totalPages: number) {
  const c = data.cycle;
  const now = new Date();
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(`Confidencial — ${c.client_name}`, MARGIN.left, 290);
  doc.text(`Página ${pageNum} de ${totalPages}`, 105, 290, { align: "center" });
  doc.text(`${now.toLocaleDateString("pt-BR")}`, 210 - MARGIN.right, 290, { align: "right" });
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), MARGIN.left, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN.left, y + 3, 210 - MARGIN.right, y + 3);
  return y + 10;
}

function subTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN.left, y);
  doc.setFont("helvetica", "normal");
  return y + 5;
}

function getLastY(doc: jsPDF): number {
  return (doc as any).lastAutoTable?.finalY || MARGIN.top;
}

function checkPageBreak(doc: jsPDF, data: ReportData, neededSpace: number): number {
  const currentY = getLastY(doc);
  if (currentY + neededSpace > 275) {
    doc.addPage();
    drawHeader(doc, data);
    return MARGIN.top;
  }
  return currentY;
}

// ═══════════════════════════════════════
// COVER PAGE
// ═══════════════════════════════════════

export function drawCover(doc: jsPDF, data: ReportData, coverImageDataUrl?: string) {
  const c = data.cycle;
  const s = data.orgSettings;
  const now = new Date();

  if (coverImageDataUrl) {
    // Use html2canvas captured cover
    doc.addImage(coverImageDataUrl, "JPEG", 0, 0, 210, 297);
    return;
  }

  // Fallback: gradient background
  doc.setFillColor(27, 94, 32);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(46, 125, 50);
  doc.rect(0, 100, 210, 100, "F");
  doc.setFillColor(56, 142, 60);
  doc.rect(0, 200, 210, 97, "F");

  // Logo placeholder top-left
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(s.org_name, 20, 30);
  doc.setDrawColor(255, 255, 255, 0.3);
  doc.setLineWidth(0.3);
  doc.line(20, 35, 190, 35);

  // Title block at bottom
  const baseY = 190;

  doc.setFillColor(76, 175, 80);
  doc.rect(20, baseY, 40, 2, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255, 0.8);
  doc.text("RELATÓRIO DE PRODUÇÃO", 20, baseY + 12);

  doc.setFontSize(34);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(c.hybrid_name, 20, baseY + 28);

  doc.setFontSize(18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255, 0.9);
  doc.text(`Safra ${c.season}`, 20, baseY + 38);

  doc.setFillColor(76, 175, 80);
  doc.rect(20, baseY + 44, 60, 2, "F");

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.85);
  const infoLines: [string, string][] = [
    ...(c.contract_number ? [["Contrato", c.contract_number] as [string, string]] : []),
    ["Cliente", c.client_name],
    ...(c.cooperator_name ? [["Cooperado", c.cooperator_name] as [string, string]] : []),
    ["Fazenda", c.farm_name],
    ["Pivô", c.field_name],
    ["Área total", `${fmtNum(c.total_area)} ha`],
    ["Área fêmea", `${fmtNum(c.female_area)} ha`],
    ["Área macho", `${fmtNum(c.male_area)} ha`],
  ];

  let infoY = baseY + 52;
  infoLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, infoY);
    doc.setFont("helvetica", "normal");
    doc.text(value, 70, infoY);
    infoY += 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.6);
  const footerText = s.report_footer_text || `${s.org_name} — Excelência em Produção de Sementes`;
  doc.text(footerText, 20, 285);
  doc.text(`Gerado em ${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, 210 - MARGIN.right, 285, { align: "right" });
}

// ═══════════════════════════════════════
// EXECUTIVE SUMMARY
// ═══════════════════════════════════════

export function drawExecutiveSummary(doc: jsPDF, data: ReportData) {
  doc.addPage();
  drawHeader(doc, data);
  const c = data.cycle;

  let y = sectionTitle(doc, "Resumo Executivo", MARGIN.top);

  const statusPT: Record<string, string> = {
    planning: "Planejamento", planting: "Plantio", growing: "Crescimento",
    detasseling: "Despendoamento", harvest: "Colheita", completed: "Concluído", cancelled: "Cancelado",
  };

  const rows: string[][] = [
    ["Status", statusPT[c.status] || c.status],
    ["Híbrido", c.hybrid_name],
    ["Linhagem Fêmea", c.female_line],
    ["Linhagem Macho", c.male_line],
    ["Proporção F:M", c.female_male_ratio],
    ...(c.material_split ? [["Split do Material", c.material_split]] : []),
    ...(c.spacing_female_female_cm ? [["Espaçam. F×F", `${c.spacing_female_female_cm} cm`]] : []),
    ...(c.spacing_female_male_cm ? [["Espaçam. F×M", `${c.spacing_female_male_cm} cm`]] : []),
    ...(c.spacing_male_male_cm ? [["Espaçam. M×M", `${c.spacing_male_male_cm} cm`]] : []),
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

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: rows,
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
    tableWidth: "auto",
  });

  // KPI summary boxes
  y = getLastY(doc) + 10;

  const kpis: string[][] = [];

  // Planting KPIs
  const femPlanting = data.plantingActual.filter((p: any) => p.type === "female");
  const malePlanting = data.plantingActual.filter((p: any) => p.type !== "female");
  if (femPlanting.length > 0) {
    const area = femPlanting.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    kpis.push(["🌱 Plantio Fêmea", `${fmtNum(area)} ha em ${fmtDate(femPlanting[0].planting_date)}`]);
  }
  if (malePlanting.length > 0) {
    const area = malePlanting.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    kpis.push(["🌱 Plantio Macho", `${fmtNum(area)} ha`]);
  }
  if (data.detasseling.length > 0) {
    const last = data.detasseling[data.detasseling.length - 1];
    kpis.push(["🌿 Despendoamento", `${data.detasseling.length} registros — Rem: ${fmtNum(last.pct_remaining_after)}%`]);
  }
  if (data.moisture.length > 0) {
    const avg = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;
    kpis.push(["💧 Umidade", `Média: ${fmtNum(avg)}%`]);
  }
  if (data.harvestRecords.length > 0) {
    const tons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    kpis.push(["🌾 Colheita", `${fmtNum(tons)} ton`]);
  }

  if (kpis.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Resumo"]],
      body: kpis,
      headStyles: { fillColor: BLUE, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: ALT_ROW },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });
  }
}

// ═══════════════════════════════════════
// SEED LOTS
// ═══════════════════════════════════════

export function drawSeedLots(doc: jsPDF, data: ReportData) {
  if (data.seedLots.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Semente Básica e Tratamento de Sementes", MARGIN.top);

  const parentLabel = (t: string) => t === "female" ? "Fêmea" : "Macho";

  const body = data.seedLots.map((l: any) => {
    const treat = data.seedLotTreatments.find((t: any) => t.seed_lot_id === l.id);
    let tsLabel = "⚪ Sem TS";
    if (treat) {
      tsLabel = treat.treatment_origin === "in_house" ? "🟢 In-house" : "🔵 Cliente";
    }
    return [
      parentLabel(l.parent_type), l.lot_number, l.origin_season, fmtDate(l.received_date),
      `${fmtNum(l.quantity_kg || l.quantity)} ${l.quantity_unit || "kg"}`,
      fmtNum(l.thousand_seed_weight_g), l.sieve_classification || "—",
      fmtNum(l.germination_pct), fmtNum(l.tetrazolium_vigor_pct),
      fmtNum(l.tetrazolium_viability_pct), fmtNum(l.physical_purity_pct),
      fmtNum(l.seed_moisture_pct), tsLabel,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Parental", "Lote", "Safra", "Recebido", "Qtd", "PMS(g)", "Peneira", "Germ%", "Vigor%", "Tétraz%", "Purez%", "Umid%", "TS"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 7, cellPadding: 1.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  // Treatment details
  data.seedLotTreatments.forEach((treat: any) => {
    const lot = data.seedLots.find((l: any) => l.id === treat.seed_lot_id);
    if (!lot) return;
    y = checkPageBreak(doc, data, 50);
    y = getLastY(doc) + 10;
    y = subTitle(doc, `Tratamento do Lote ${lot.lot_number} — ${parentLabel(lot.parent_type)}`, y);

    const infoRows = [
      ["Data TS", fmtDate(treat.treatment_date)],
      ["Local", treat.treatment_location || "—"],
      ["Responsável", treat.responsible_person || "—"],
      ["Equipamento", treat.equipment_used || "—"],
      ["Vol. calda", treat.total_slurry_volume || "—"],
      ...(treat.germination_after_ts != null ? [["Germ. pós-TS", `${fmtNum(treat.germination_after_ts)}%`]] : []),
    ];

    autoTable(doc, {
      startY: y,
      body: infoRows,
      headStyles: { fillColor: PRIMARY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: ALT_ROW },
      margin: { left: MARGIN.left, right: MARGIN.right },
      theme: "plain",
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    });

    const products = data.seedLotTreatmentProducts.filter((p: any) => p.seed_lot_treatment_id === treat.id);
    if (products.length > 0) {
      const prodY = getLastY(doc) + 5;
      autoTable(doc, {
        startY: prodY,
        head: [["Ordem", "Produto Comercial", "Ingrediente Ativo", "Tipo", "Categoria", "Dose", "Unidade"]],
        body: products.map((p: any) => [
          p.application_order || "—", p.product_name, p.active_ingredient || "—",
          p.product_type || "—", p.category || "—", fmtNum(p.dose), p.dose_unit,
        ]),
        headStyles: { fillColor: PRIMARY, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: ALT_ROW },
        margin: { left: MARGIN.left, right: MARGIN.right },
      });
    }
  });
}

// ═══════════════════════════════════════
// PLANTING
// ═══════════════════════════════════════

export function drawPlanting(doc: jsPDF, data: ReportData) {
  if (data.plantingActual.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Plantio Realizado", MARGIN.top);

  const typeLabel = (t: string) => {
    if (t === "female") return "Fêmea";
    if (t === "male_1" || t === "male") return "Macho 1";
    if (t === "male_2") return "Macho 2";
    if (t === "male_3") return "Macho 3";
    return t;
  };

  const body = data.plantingActual.map((p: any) => {
    const glebaName = p.pivot_glebas?.name || "—";
    const cv = p.cv_percent;
    return [
      fmtDate(p.planting_date), typeLabel(p.type), glebaName, "—",
      fmtNum(p.actual_area), p.row_spacing || "—",
      fmtNum(p.seeds_per_meter_actual || p.seeds_per_meter),
      cv != null ? fmtNum(cv) + "%" : "—",
      p.soil_condition || "—",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Data", "Tipo", "Gleba", "Lote", "Área(ha)", "Espaç.(cm)", "Sem/m", "CV%", "Solo"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
    didParseCell: (hookData: any) => {
      if (hookData.column.index === 7 && hookData.section === "body") {
        const val = parseFloat(String(hookData.cell.raw).replace(",", ".").replace("%", ""));
        if (!isNaN(val)) {
          if (val > 25) hookData.cell.styles.fillColor = [255, 205, 210];
          else if (val > 20) hookData.cell.styles.fillColor = [255, 224, 178];
          else if (val > 15) hookData.cell.styles.fillColor = [255, 249, 196];
          else hookData.cell.styles.fillColor = [200, 230, 201];
        }
      }
    },
  });

  // Subtotals
  y = getLastY(doc) + 5;
  const fem = data.plantingActual.filter((p: any) => p.type === "female");
  const mal = data.plantingActual.filter((p: any) => p.type !== "female");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "bold");
  if (fem.length > 0) {
    const area = fem.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    const avgSm = fem.reduce((s: number, p: any) => s + (p.seeds_per_meter_actual || p.seeds_per_meter || 0), 0) / fem.length;
    doc.text(`FÊMEA: ${fmtNum(area)} ha | Média ${fmtNum(avgSm)} sem/metro`, MARGIN.left, y);
    y += 5;
  }
  if (mal.length > 0) {
    const area = mal.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    doc.text(`MACHO: ${fmtNum(area)} ha`, MARGIN.left, y);
    y += 5;
  }

  // Stand counts
  if (data.standCounts.length > 0) {
    y += 5;
    y = subTitle(doc, "Stand de Plantas", y);

    const scBody = data.standCounts.map((sc: any) => [
      sc.parent_type === "female" ? "Fêmea" : "Macho",
      sc.pivot_glebas?.name || "—",
      sc.count_type || "—",
      fmtDate(sc.count_date),
      sc.days_after_planting != null ? `${sc.days_after_planting}` : "—",
      "—",
      fmtNum(sc.avg_plants_per_ha, 0),
      sc.cv_stand_pct != null ? fmtNum(sc.cv_stand_pct) + "%" : "—",
      sc.emergence_pct != null ? fmtNum(sc.emergence_pct) + "%" : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Parental", "Gleba", "Tipo", "Data", "DAP", "Pontos", "Pop.(pl/ha)", "CV%", "Emerg.%"]],
      body: scBody,
      headStyles: { fillColor: PRIMARY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: ALT_ROW },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });
  }
}

// ═══════════════════════════════════════
// NUTRITION
// ═══════════════════════════════════════

export function drawNutrition(doc: jsPDF, data: ReportData) {
  if (data.fertilizations.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Nutrição e Adubação", MARGIN.top);

  const typeLabel = (t: string) => {
    if (t === "planting") return "Plantio";
    if (t === "topdressing") return "Cobertura";
    if (t === "foliar") return "Foliar";
    return t;
  };

  const body = data.fertilizations.map((f: any) => [
    fmtDate(f.application_date), typeLabel(f.fertilization_type), f.growth_stage || "—",
    f.product_name, fmtNum(f.dose_per_ha), fmtNum(f.area_applied_ha),
    fmtNum(f.n_supplied_kg_ha), fmtNum(f.p2o5_supplied_kg_ha), fmtNum(f.k2o_supplied_kg_ha),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Data", "Tipo", "Estádio", "Produto", "Dose(kg/ha)", "Área(ha)", "N", "P₂O₅", "K₂O"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = getLastY(doc) + 5;
  const totalN = data.fertilizations.reduce((s: number, f: any) => s + (f.n_supplied_kg_ha || 0), 0);
  const totalP = data.fertilizations.reduce((s: number, f: any) => s + (f.p2o5_supplied_kg_ha || 0), 0);
  const totalK = data.fertilizations.reduce((s: number, f: any) => s + (f.k2o_supplied_kg_ha || 0), 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(`TOTAL: N: ${fmtNum(totalN)} kg/ha | P₂O₅: ${fmtNum(totalP)} kg/ha | K₂O: ${fmtNum(totalK)} kg/ha`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// PHENOLOGY
// ═══════════════════════════════════════

export function drawPhenology(doc: jsPDF, data: ReportData) {
  if (data.phenology.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Desenvolvimento Fenológico", MARGIN.top);

  const body = data.phenology.map((p: any) => [
    p.type === "female" ? "Fêmea" : "Macho",
    p.stage, fmtDate(p.observation_date), "—", p.description || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Parental", "Estádio", "Data", "DAP", "Observações"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });
}

// ═══════════════════════════════════════
// NICKING
// ═══════════════════════════════════════

export function drawNicking(doc: jsPDF, data: ReportData) {
  if (data.nickingMilestones.length === 0 && data.nickingObservations.length === 0 && data.inspectionData.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Sincronismo Floral (Nicking)", MARGIN.top);

  if (data.nickingMilestones.length > 0) {
    const body = data.nickingMilestones.map((m: any) => {
      const fp = m.nicking_fixed_points;
      const parentLabel = fp?.parent_type === "female" ? "Fêmea" : "Macho";
      const rows: string[][] = [];
      if (m.anthesis_start_date) rows.push([parentLabel, "Início Antese", fmtDate(m.anthesis_start_date), "—", fp?.name || "—"]);
      if (m.anthesis_50pct_date) rows.push([parentLabel, "50% Antese", fmtDate(m.anthesis_50pct_date), "—", fp?.name || "—"]);
      if (m.anthesis_end_date) rows.push([parentLabel, "Fim Antese", fmtDate(m.anthesis_end_date), "—", fp?.name || "—"]);
      if (m.silk_start_date) rows.push([parentLabel, "Início Silk", fmtDate(m.silk_start_date), "—", fp?.name || "—"]);
      if (m.silk_50pct_date) rows.push([parentLabel, "50% Silk", fmtDate(m.silk_50pct_date), "—", fp?.name || "—"]);
      if (m.silk_end_date) rows.push([parentLabel, "Fim Silk", fmtDate(m.silk_end_date), "—", fp?.name || "—"]);
      return rows;
    }).flat();

    if (body.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Parental", "Marco", "Data", "DAP", "Ponto"]],
        body,
        headStyles: { fillColor: PRIMARY, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: ALT_ROW },
        margin: { left: MARGIN.left, right: MARGIN.right },
      });
      y = getLastY(doc) + 10;
    }
  }

  // Inspection data summary
  if (data.inspectionData.length > 0) {
    y = checkPageBreak(doc, data, 60);
    y = Math.max(y, getLastY(doc) + 5);
    y = subTitle(doc, "Inspeções de Campo", y);

    const body = data.inspectionData.map((d: any) => [
      `${d.inspection_number}`, fmtDate(d.inspection_date),
      d.pct_detasseled != null ? fmtNum(d.pct_detasseled) + "%" : "—",
      d.pct_stigma_receptive != null ? fmtNum(d.pct_stigma_receptive) + "%" : "—",
      d.pct_male1_pollinating != null ? fmtNum(d.pct_male1_pollinating) + "%" : "—",
      d.pct_male2_pollinating != null ? fmtNum(d.pct_male2_pollinating) + "%" : "—",
      d.pct_female_pollinating != null ? fmtNum(d.pct_female_pollinating) + "%" : "—",
      d.total_atypical_pollinating != null ? fmtNum(d.total_atypical_pollinating) + "%" : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Insp.", "Data", "% Desp.", "% ER", "% MP1", "% MP2", "% FP", "Atípicas"]],
      body,
      headStyles: { fillColor: BLUE, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: ALT_ROW },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });

    // Last inspection observations
    const lastInsp = data.inspectionData[data.inspectionData.length - 1];
    if (lastInsp?.observations) {
      y = getLastY(doc) + 8;
      doc.setFillColor(227, 242, 253);
      doc.setDrawColor(30, 136, 229);
      const obsLines = doc.splitTextToSize(lastInsp.observations, 170);
      const boxH = obsLines.length * 5 + 10;
      doc.roundedRect(MARGIN.left, y, 180, boxH, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 136, 229);
      doc.text("Observações da última inspeção:", MARGIN.left + 5, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.text(obsLines, MARGIN.left + 5, y + 12);
    }
  }
}

// ═══════════════════════════════════════
// DETASSELING
// ═══════════════════════════════════════

export function drawDetasseling(doc: jsPDF, data: ReportData) {
  if (data.detasseling.length === 0 && !data.cycle.detasseling_dap) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Despendoamento", MARGIN.top);

  // Forecast table if DAP configured
  if (data.cycle.detasseling_dap && data.glebas.length > 0) {
    const dap = data.cycle.detasseling_dap;
    const femaleGlebas = data.glebas.filter((g: any) => g.parent_type === "female");
    if (femaleGlebas.length > 0) {
      y = subTitle(doc, "Previsão de Despendoamento por Gleba", y);
      const forecastBody = femaleGlebas.map((g: any) => {
        const actual = data.plantingActual.find((p: any) => p.pivot_glebas?.name === g.name && p.type === "female");
        const plantDate = actual?.planting_date || null;
        const estDate = plantDate ? (() => {
          const d = new Date(plantDate);
          d.setDate(d.getDate() + dap);
          return d.toISOString().slice(0, 10);
        })() : null;
        const hasRec = data.detasseling.some((d: any) => d.pivot_glebas?.name === g.name);
        return [
          g.name, fmtNum(g.area_ha),
          plantDate ? fmtDate(plantDate) : "—",
          estDate ? fmtDate(estDate) : "—",
          hasRec ? "✅ Iniciado" : "⏳ Aguardando",
        ];
      });
      autoTable(doc, {
        startY: y,
        head: [["Gleba", "Área(ha)", "Plantio Real", "Desp. Estimado", "Status"]],
        body: forecastBody,
        headStyles: { fillColor: BLUE, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: ALT_ROW },
        margin: { left: MARGIN.left, right: MARGIN.right },
      });
      y = getLastY(doc) + 10;
    }
  }

  if (data.detasseling.length === 0) return;

  y = subTitle(doc, "Registros Operacionais", y);

  const methodLabel = (m: string) => {
    if (m === "manual") return "Manual";
    if (m === "mechanical") return "Mecânico";
    if (m === "combined") return "Combinado";
    return m;
  };

  const body = data.detasseling.map((d: any) => [
    d.pass_type || "—",
    fmtDate(d.operation_date), "—",
    fmtNum(d.area_worked_ha),
    methodLabel(d.method), d.team_size || "—",
    fmtNum(d.pct_detasseled_this_pass) + "%",
    fmtNum(d.pct_remaining_after) + "%",
    d.yield_per_person_ha != null ? fmtNum(d.yield_per_person_ha) : "—",
    d.non_conformities ? "⚠" : "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Passada", "Data", "Dias", "Área(ha)", "Método", "Equipe", "% Tirado", "% Reman.", "Rend.", "NC"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
    didParseCell: (hookData: any) => {
      if (hookData.column.index === 7 && hookData.section === "body") {
        const val = parseFloat(String(hookData.cell.raw).replace(",", ".").replace("%", ""));
        if (!isNaN(val)) {
          if (val > 1) hookData.cell.styles.fillColor = [255, 205, 210];
          else if (val > 0.5) hookData.cell.styles.fillColor = [255, 224, 178];
          else if (val > 0.3) hookData.cell.styles.fillColor = [255, 249, 196];
          else hookData.cell.styles.fillColor = [200, 230, 201];
        }
      }
    },
  });

  // Non-conformities
  const ncs = data.detasseling.filter((d: any) => d.non_conformities);
  if (ncs.length > 0) {
    y = getLastY(doc) + 8;
    doc.setFillColor(255, 235, 238);
    doc.setDrawColor(229, 57, 53);
    const ncTexts = ncs.map((d: any) => `${fmtDate(d.operation_date)}: ${d.non_conformities}`).join("\n");
    const ncLines = doc.splitTextToSize(ncTexts, 170);
    const boxH = ncLines.length * 5 + 10;
    doc.roundedRect(MARGIN.left, y, 180, boxH, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(229, 57, 53);
    doc.text("NÃO CONFORMIDADES:", MARGIN.left + 5, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(ncLines, MARGIN.left + 5, y + 12);
  }

  // Summary
  y = getLastY(doc) + 8;
  const lastD = data.detasseling[data.detasseling.length - 1];
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  const remFinal = lastD.pct_remaining_after;
  const remStatus = remFinal <= 0.5 ? "Adequado ✅" : "Acima do limite de 0.5% ⚠️";
  doc.text(`Remanescente final: ${fmtNum(remFinal)}%. ${remStatus}`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// CHEMICAL APPLICATIONS
// ═══════════════════════════════════════

export function drawChemicals(doc: jsPDF, data: ReportData) {
  if (data.chemicals.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Manejo Fitossanitário", MARGIN.top);

  const body = data.chemicals.map((c: any) => [
    fmtDate(c.application_date), c.product_name, c.active_ingredient || "—",
    fmtNum(c.dose_per_ha), c.dose_unit, c.spray_volume != null ? fmtNum(c.spray_volume) : "—",
    c.application_method === "terrestre" ? "Terrestre" : c.application_method === "aereo" ? "Aéreo" : c.application_method,
    fmtNum(c.area_applied_ha), c.application_type, c.target_pest || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Data", "Produto", "I.A.", "Dose", "Unid.", "Vol.Calda", "Método", "Área(ha)", "Tipo", "Alvo"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 7, cellPadding: 1.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = getLastY(doc) + 5;
  const herbs = data.chemicals.filter((c: any) => c.application_type === "herbicida").length;
  const insecs = data.chemicals.filter((c: any) => c.application_type === "inseticida").length;
  const fungs = data.chemicals.filter((c: any) => c.application_type === "fungicida").length;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(`${data.chemicals.length} aplicações | ${herbs} herbicidas, ${insecs} inseticidas, ${fungs} fungicidas`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// PEST & DISEASE
// ═══════════════════════════════════════

export function drawPests(doc: jsPDF, data: ReportData) {
  if (data.pests.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Pragas e Doenças", MARGIN.top);

  const sevLabel = (s: string) => {
    const m: Record<string, string> = { low: "🟢 Baixa", moderate: "🟡 Moderada", high: "🟠 Alta", critical: "🔴 Crítica" };
    return m[s] || s;
  };

  const body = data.pests.map((p: any) => [
    fmtDate(p.observation_date), p.pest_name, p.pest_type,
    p.incidence_pct != null ? fmtNum(p.incidence_pct) + "%" : "—",
    sevLabel(p.severity), p.notes || "—",
    p.growth_stage || "—", p.affected_parent === "female" ? "Fêmea" : "Macho",
    p.action_taken || "—", p.economic_damage_reached ? "Sim" : "Não",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Data", "Nome", "Tipo", "Incid.%", "Severidade", "Nota", "Estádio", "Parental", "Ação", "NDE"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 7, cellPadding: 1.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = getLastY(doc) + 5;
  const nde = data.pests.filter((p: any) => p.economic_damage_reached).length;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(`${data.pests.length} ocorrências registradas. ${nde} atingiram nível de dano econômico.`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// MOISTURE
// ═══════════════════════════════════════

export function drawMoisture(doc: jsPDF, data: ReportData) {
  if (data.moisture.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  const c = data.cycle;
  let y = sectionTitle(doc, "Monitoramento de Umidade", MARGIN.top);

  // Group by gleba
  const byGleba = new Map<string, any[]>();
  data.moisture.forEach((m: any) => {
    const gName = m.pivot_glebas?.name || "Geral";
    if (!byGleba.has(gName)) byGleba.set(gName, []);
    byGleba.get(gName)!.push(m);
  });

  const target = c.target_moisture ?? 18;
  const body: string[][] = [];
  byGleba.forEach((samples, gName) => {
    const avg = samples.reduce((s: number, m: any) => s + m.moisture_pct, 0) / samples.length;
    const min = Math.min(...samples.map((m: any) => m.moisture_pct));
    const max = Math.max(...samples.map((m: any) => m.moisture_pct));
    const belowTarget = samples.filter((m: any) => m.moisture_pct <= target).length;
    const pctBelow = ((belowTarget / samples.length) * 100).toFixed(0);
    const status = avg <= target ? "🟢 Pronta" : avg <= target + 3 ? "🟡 Quase" : "🔴 Não pronta";
    body.push([gName, "—", `${samples.length}`, "—", fmtNum(avg) + "%", fmtNum(min) + "%", fmtNum(max) + "%", pctBelow + "%", status]);
  });

  autoTable(doc, {
    startY: y,
    head: [["Gleba", "Área(ha)", "Amostras", "Estádio", "Média%", "Min%", "Max%", "% ≤ Alvo", "Status"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = getLastY(doc) + 5;
  const avgAll = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;
  const readyGlebas = Array.from(byGleba.entries()).filter(([, samples]) => {
    const avg = samples.reduce((s: number, m: any) => s + m.moisture_pct, 0) / samples.length;
    return avg <= target;
  }).length;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(`${data.moisture.length} amostras em ${byGleba.size} glebas. Média: ${fmtNum(avgAll)}%. ${readyGlebas} glebas prontas.`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// YIELD ESTIMATE
// ═══════════════════════════════════════

export function drawYieldEstimate(doc: jsPDF, data: ReportData) {
  if (data.yieldEstimates.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  const c = data.cycle;
  const est = data.yieldEstimates[0];
  let y = sectionTitle(doc, "Estimativa de Produtividade", MARGIN.top);

  if (data.yieldSamplePoints.length > 0) {
    const body = data.yieldSamplePoints.map((sp: any) => [
      sp.point_number, fmtDate(sp.sample_date), "—", sp.pivot_position || "—",
      sp.ears_per_ha != null ? fmtNum(sp.ears_per_ha, 0) : "—",
      sp.avg_kernels_per_ear != null ? fmtNum(sp.avg_kernels_per_ear, 0) : "—",
      fmtNum(sp.sample_moisture_pct) + "%",
      sp.point_gross_yield_kg_ha != null ? fmtNum(sp.point_gross_yield_kg_ha, 0) : "—",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Ponto", "Data", "Gleba", "Posição", "Espigas/ha", "Grãos/esp.", "Umid.%", "Prod.bruta(kg/ha)"]],
      body,
      headStyles: { fillColor: PRIMARY, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: ALT_ROW },
      margin: { left: MARGIN.left, right: MARGIN.right },
    });
  }

  y = getLastY(doc) + 8;
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");
  doc.text(`PMG: ${fmtNum(est.final_pms_g || est.default_tgw_g)}g | Umid.ref: ${fmtNum(est.moisture_reference_pct)}% | Perda despalha: ${fmtNum(est.dehusking_loss_pct)}% | Perda classif: ${fmtNum(est.classification_loss_pct)}% | Outras: ${fmtNum(est.other_loss_pct)}%`, MARGIN.left, y);

  y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  if (est.net_yield_kg_ha != null) {
    const scHa = est.bag_weight_kg > 0 ? (est.net_yield_kg_ha / est.bag_weight_kg) : 0;
    doc.text(`Produtividade líquida: ${fmtNum(est.net_yield_kg_ha, 0)} kg/ha (${fmtNum(scHa, 1)} sc/ha)`, MARGIN.left, y);
    y += 7;
    if (est.total_production_tons != null) {
      doc.setFontSize(12);
      doc.text(`Produção total estimada: ${fmtNum(est.total_production_tons, 1)} toneladas`, MARGIN.left, y);
    }
  }

  if (c.expected_production && est.total_production_tons) {
    y += 10;
    const pct = (est.total_production_tons / c.expected_production) * 100;
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Meta: ${fmtNum(c.expected_production, 1)} ton | Estimado: ${fmtNum(est.total_production_tons, 1)} ton (${fmtNum(pct, 0)}%)`, MARGIN.left, y);
  }
}

// ═══════════════════════════════════════
// HARVEST
// ═══════════════════════════════════════

export function drawHarvest(doc: jsPDF, data: ReportData) {
  if (data.harvestRecords.length === 0) return;
  doc.addPage();
  drawHeader(doc, data);
  let y = sectionTitle(doc, "Colheita", MARGIN.top);

  const body = data.harvestRecords.map((h: any) => [
    fmtDate(h.harvest_date), h.pivot_glebas?.name || "—",
    fmtNum(h.area_harvested_ha), fmtNum(h.avg_moisture_pct) + "%",
    `${h.loads_count}`, fmtNum(h.total_weight_tons),
    h.weight_per_load_tons ? fmtNum(h.weight_per_load_tons) : "—",
    h.delivery_destination || "—", h.ticket_number || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Data", "Gleba", "Área(ha)", "Umidade%", "Cargas", "Ton", "Ton/Carga", "Destino", "Ticket"]],
    body,
    headStyles: { fillColor: PRIMARY, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: ALT_ROW },
    margin: { left: MARGIN.left, right: MARGIN.right },
  });

  y = getLastY(doc) + 5;
  const totalArea = data.harvestRecords.reduce((s: number, h: any) => s + (h.area_harvested_ha || 0), 0);
  const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
  const totalLoads = data.harvestRecords.reduce((s: number, h: any) => s + (h.loads_count || 0), 0);
  const avgMoist = data.harvestRecords.reduce((s: number, h: any) => s + (h.avg_moisture_pct || 0), 0) / data.harvestRecords.length;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(`TOTAL: ${fmtNum(totalArea)} ha | ${fmtNum(totalTons)} ton | ${totalLoads} cargas | Umidade média: ${fmtNum(avgMoist)}%`, MARGIN.left, y);
}

// ═══════════════════════════════════════
// CONCLUSION
// ═══════════════════════════════════════

export function drawConclusion(doc: jsPDF, data: ReportData) {
  doc.addPage();
  drawHeader(doc, data);
  const c = data.cycle;
  let y = sectionTitle(doc, "Conclusão Técnica", MARGIN.top);

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");

  const addParagraph = (text: string) => {
    const lines = doc.splitTextToSize(text, 175);
    if (y + lines.length * 5 > 270) {
      doc.addPage();
      drawHeader(doc, data);
      y = MARGIN.top;
    }
    doc.text(lines, MARGIN.left, y);
    y += lines.length * 5 + 4;
  };

  // 1. Identification (always)
  addParagraph(
    `O presente relatório refere-se ao híbrido ${c.hybrid_name}, produzido no pivô ${c.field_name}` +
    (c.cooperator_name ? ` do cooperado ${c.cooperator_name}` : "") +
    `, fazenda ${c.farm_name}` +
    (c.contract_number ? `, contrato ${c.contract_number}` : "") +
    `, safra ${c.season}, com área de ${fmtNum(c.female_area)} ha de fêmea e ${fmtNum(c.male_area)} ha de macho, totalizando ${fmtNum(c.total_area)} ha.`
  );

  // 2. Seed lots
  if (data.seedLots.length > 0) {
    const femLots = data.seedLots.filter((l: any) => l.parent_type === "female");
    const malLots = data.seedLots.filter((l: any) => l.parent_type !== "female");
    const femAvgGerm = femLots.length > 0 ? femLots.reduce((s: number, l: any) => s + l.germination_pct, 0) / femLots.length : 0;
    const hasTreatment = data.seedLotTreatments.length > 0;
    const treatOrigin = hasTreatment ? data.seedLotTreatments[0].treatment_origin : null;
    const treatText = hasTreatment
      ? (treatOrigin === "in_house" ? `foi realizado in-house com ${data.seedLotTreatmentProducts.length} produtos` : "veio tratado pelo cliente")
      : "não foi realizado";
    addParagraph(
      `A semente básica de fêmea foi recebida em ${femLots.length} lote(s), com germinação média de ${fmtNum(femAvgGerm)}%. ` +
      (malLots.length > 0 ? `A semente de macho em ${malLots.length} lote(s). ` : "") +
      `O tratamento de sementes ${treatText}.`
    );
  }

  // 3. Planting
  if (data.plantingActual.length > 0) {
    const fem = data.plantingActual.filter((p: any) => p.type === "female");
    const mal = data.plantingActual.filter((p: any) => p.type !== "female");
    const femArea = fem.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    const malArea = mal.reduce((s: number, p: any) => s + (p.actual_area || 0), 0);
    const femAvgSm = fem.length > 0 ? fem.reduce((s: number, p: any) => s + (p.seeds_per_meter_actual || p.seeds_per_meter || 0), 0) / fem.length : 0;
    addParagraph(
      `O plantio de fêmea totalizou ${fmtNum(femArea)} ha em ${fem.length} gleba(s), com densidade média de ${fmtNum(femAvgSm)} sementes/metro. ` +
      `O plantio de macho totalizou ${fmtNum(malArea)} ha.`
    );
  }

  // 4. Nutrition
  if (data.fertilizations.length > 0) {
    const totalN = data.fertilizations.reduce((s: number, f: any) => s + (f.n_supplied_kg_ha || 0), 0);
    const totalP = data.fertilizations.reduce((s: number, f: any) => s + (f.p2o5_supplied_kg_ha || 0), 0);
    const totalK = data.fertilizations.reduce((s: number, f: any) => s + (f.k2o_supplied_kg_ha || 0), 0);
    addParagraph(
      `A nutrição totalizou ${fmtNum(totalN)} kg/ha de N, ${fmtNum(totalP)} de P₂O₅ e ${fmtNum(totalK)} de K₂O em ${data.fertilizations.length} aplicações.`
    );
  }

  // 5. Nicking
  if (data.nickingMilestones.length > 0 || data.nickingObservations.length > 0) {
    const lastObs = data.nickingObservations[data.nickingObservations.length - 1];
    const syncStatus = lastObs?.overall_synchrony_status || lastObs?.synchrony_status || "não avaliado";
    addParagraph(`O sincronismo floral foi classificado como ${syncStatus}.`);
  }

  // 6. Inspections
  if (data.inspectionData.length > 0) {
    const lastInsp = data.inspectionData[data.inspectionData.length - 1];
    addParagraph(
      `Foram realizadas ${data.inspectionData.length} inspeções de campo. Na última inspeção (${fmtDate(lastInsp.inspection_date)}), ` +
      `estigma receptivo ${fmtNum(lastInsp.pct_stigma_receptive)}%, macho 1 polinizando ${fmtNum(lastInsp.pct_male1_pollinating)}%, despendoamento ${fmtNum(lastInsp.pct_detasseled)}%.` +
      (lastInsp.observations ? ` ${lastInsp.observations}` : "")
    );
  }

  // 7. Detasseling
  if (data.detasseling.length > 0) {
    const lastD = data.detasseling[data.detasseling.length - 1];
    const ncs = data.detasseling.filter((d: any) => d.non_conformities).length;
    addParagraph(
      `O despendoamento foi realizado em ${data.detasseling.length} registros. O remanescente final ficou em ${fmtNum(lastD.pct_remaining_after)}%.` +
      (lastD.pct_remaining_after > 0.5 ? " O remanescente ficou acima do limite aceitável de 0,5%." : " Dentro do padrão aceitável.") +
      (ncs > 0 ? ` Foram registradas ${ncs} não conformidades.` : "")
    );
  }

  // 8. Pests
  if (data.pests.length > 0) {
    const main = data.pests.sort((a: any, b: any) => (b.severity_score || 0) - (a.severity_score || 0))[0];
    const nde = data.pests.filter((p: any) => p.economic_damage_reached).length;
    addParagraph(
      `Foram registradas ${data.pests.length} ocorrências de pragas/doenças. A principal foi ${main.pest_name} com severidade ${main.severity}. ${nde} ocorrências atingiram nível de dano econômico.`
    );
  }

  // 9. Chemical
  if (data.chemicals.length > 0) {
    const herbs = data.chemicals.filter((c: any) => c.application_type === "herbicida").length;
    const insecs = data.chemicals.filter((c: any) => c.application_type === "inseticida").length;
    const fungs = data.chemicals.filter((c: any) => c.application_type === "fungicida").length;
    addParagraph(`Foram realizadas ${data.chemicals.length} aplicações fitossanitárias: ${herbs} herbicidas, ${insecs} inseticidas e ${fungs} fungicidas.`);
  }

  // 10. Moisture
  if (data.moisture.length > 0) {
    const avg = data.moisture.reduce((s: number, m: any) => s + m.moisture_pct, 0) / data.moisture.length;
    const target = c.target_moisture ?? 18;
    const byGleba = new Set(data.moisture.map((m: any) => m.pivot_glebas?.name || "Geral"));
    addParagraph(
      `A umidade foi monitorada com ${data.moisture.length} amostras em ${byGleba.size} glebas. Média final: ${fmtNum(avg)}%.`
    );
  }

  // 11. Yield
  if (data.yieldEstimates.length > 0) {
    const est = data.yieldEstimates[0];
    if (est.net_yield_kg_ha) {
      const scHa = est.bag_weight_kg > 0 ? (est.net_yield_kg_ha / est.bag_weight_kg) : 0;
      addParagraph(
        `A estimativa de produtividade com ${est.total_sample_points || data.yieldSamplePoints.length} pontos indicou ${fmtNum(est.net_yield_kg_ha, 0)} kg/ha líquidos (${fmtNum(scHa, 1)} sc/ha), totalizando ${fmtNum(est.total_production_tons, 1)} toneladas estimadas.`
      );
    }
  }

  // 12. Harvest
  if (data.harvestRecords.length > 0) {
    const totalArea = data.harvestRecords.reduce((s: number, h: any) => s + (h.area_harvested_ha || 0), 0);
    const totalTons = data.harvestRecords.reduce((s: number, h: any) => s + (h.total_weight_tons || 0), 0);
    const totalLoads = data.harvestRecords.reduce((s: number, h: any) => s + (h.loads_count || 0), 0);
    const avgMoist = data.harvestRecords.reduce((s: number, h: any) => s + (h.avg_moisture_pct || 0), 0) / data.harvestRecords.length;
    addParagraph(
      `A colheita totalizou ${fmtNum(totalArea)} ha com ${fmtNum(totalTons)} toneladas colhidas em ${totalLoads} cargas. Umidade média: ${fmtNum(avgMoist)}%.`
    );
  }

  // Signature
  y += 10;
  if (y > 240) {
    doc.addPage();
    drawHeader(doc, data);
    y = MARGIN.top + 20;
  }
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const now = new Date();
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`, MARGIN.left, y);

  y += 20;
  doc.setDrawColor(100, 100, 100);
  doc.line(MARGIN.left, y, MARGIN.left + 80, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Responsável Técnico", MARGIN.left, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(data.orgSettings.org_name, MARGIN.left, y);

  // Watermark footer
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text("Este relatório foi gerado automaticamente pelo sistema Caderno de Campo.", 105, 285, { align: "center" });
}

// ═══════════════════════════════════════
// APPLY HEADERS & FOOTERS TO ALL PAGES
// ═══════════════════════════════════════

export function applyHeadersFooters(doc: jsPDF, data: ReportData) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, data, i, pageCount);
  }
}
