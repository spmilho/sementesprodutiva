import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface CycleData {
  client: string;
  farm: string;
  field: string;
  hybrid: string;
  female: string;
  male: string;
  season: string;
  status: string;
  area: number;
  ratio: string;
  irrigation: string;
}

const STATUS_PT: Record<string, string> = {
  planning: "Planejamento",
  planting: "Plantio",
  growing: "Crescimento",
  detasseling: "Despendoamento",
  harvest: "Colheita",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const PRIMARY: [number, number, number] = [27, 94, 32];

async function renderHtmlCover(doc: jsPDF): Promise<boolean> {
  const coverEl = document.getElementById("pdf-cover");
  if (!coverEl) return false;

  try {
    const canvas = await html2canvas(coverEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#0d1f0d",
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    doc.addImage(imgData, "JPEG", 0, 0, 210, 297);
    return true;
  } catch {
    return false;
  }
}

function drawFallbackCover(doc: jsPDF, cycle: CycleData, generatedAt: string) {
  // Background band
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 100, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("🌱 Sementes Produtiva", 105, 40, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Caderno de Campo — Relatório do Ciclo", 105, 55, { align: "center" });

  const boxY = 120;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 248);
  doc.roundedRect(30, boxY, 150, 95, 4, 4, "FD");

  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);

  const lines = [
    ["Cliente", cycle.client],
    ["Fazenda", cycle.farm],
    ["Talhão", cycle.field],
    ["Híbrido", cycle.hybrid],
    ["Safra", cycle.season],
    ["Área Total", `${cycle.area} ha`],
  ];

  lines.forEach(([label, value], i) => {
    const y = boxY + 15 + i * 13;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 40, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 90, y);
  });

  doc.setFontSize(10);
  doc.setTextColor(130, 130, 130);
  doc.text(`Gerado em: ${generatedAt}`, 105, 270, { align: "center" });
}

function drawExecutiveSummary(doc: jsPDF, cycle: CycleData) {
  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Executivo", 14, 25);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  autoTable(doc, {
    startY: 35,
    head: [["Indicador", "Valor"]],
    body: [
      ["Status", STATUS_PT[cycle.status] || cycle.status],
      ["Cliente", cycle.client],
      ["Fazenda / Talhão", `${cycle.farm} — ${cycle.field}`],
      ["Híbrido", cycle.hybrid],
      ["Linhagem Fêmea", cycle.female],
      ["Linhagem Macho", cycle.male],
      ["Proporção", cycle.ratio],
      ["Área Total", `${cycle.area} ha`],
      ["Sistema de Irrigação", cycle.irrigation],
      ["Safra", cycle.season],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });
}

function drawOperationalData(doc: jsPDF) {
  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Dados Operacionais", 14, 25);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Plantio — Planejado × Realizado", 14, 40);

  autoTable(doc, {
    startY: 45,
    head: [["Data", "Tipo", "Plan. (ha)", "Real. (ha)", "Desvio (ha)"]],
    body: [
      ["01/01", "Fêmea", "8,0", "7,0", "-1,0"],
      ["03/01", "Fêmea", "12,0", "11,0", "-1,0"],
      ["05/01", "Macho", "10,0", "12,0", "+2,0"],
      ["08/01", "Fêmea", "15,0", "14,0", "-1,0"],
      ["10/01", "Macho", "10,0", "10,0", "0,0"],
      ["12/01", "Fêmea", "8,0", "9,0", "+1,0"],
      ["15/01", "Fêmea", "5,0", "4,0", "-1,0"],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });

  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Aplicações Químicas", 14, currentY);

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Data", "Produto", "Tipo", "Dose", "Área (ha)"]],
    body: [
      ["08/02", "Engeo Pleno S", "Inseticida", "0,25 L/ha", "45"],
      ["10/02", "Nativo", "Fungicida", "0,75 L/ha", "38"],
      ["12/02", "Roundup Original DI", "Herbicida", "2,0 L/ha", "52"],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });

  const detY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Despendoamento", 14, detY);

  autoTable(doc, {
    startY: detY + 5,
    head: [["Data", "Área (ha)", "% Despendoado", "% Remanescente", "Método"]],
    body: [
      ["20/01", "12", "25%", "2,1%", "Manual"],
      ["22/01", "18", "55%", "1,2%", "Combinado"],
      ["25/01", "15", "82%", "0,6%", "Mecânico"],
      ["28/01", "10", "95%", "0,3%", "Manual"],
      ["01/02", "8", "100%", "0,1%", "Manual"],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });

  const moistY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Evolução da Umidade", 14, moistY);

  autoTable(doc, {
    startY: moistY + 5,
    head: [["Data", "Umidade (%)", "Método", "Status"]],
    body: [
      ["25/01", "35,2%", "Medidor portátil", "Não pronta"],
      ["01/02", "28,4%", "NIR", "Não pronta"],
      ["08/02", "23,1%", "Medidor portátil", "Quase"],
      ["12/02", "19,8%", "NIR", "Quase"],
      ["16/02", "17,5%", "Medidor portátil", "Pronta"],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });

  const harvY = (doc as any).lastAutoTable.finalY + 15;
  if (harvY > 240) doc.addPage();
  const startHarv = harvY > 240 ? 25 : harvY;

  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("Colheita", 14, startHarv);

  autoTable(doc, {
    startY: startHarv + 5,
    head: [["Data", "Área (ha)", "Umidade Média (%)", "Nº Cargas", "Peso Total (t)"]],
    body: [
      ["05/02", "15", "19,2%", "5", "82,5"],
      ["07/02", "18", "18,5%", "6", "99,0"],
      ["09/02", "20", "17,8%", "7", "115,5"],
      ["11/02", "20", "17,2%", "7", "112,0"],
      ["13/02", "15", "16,8%", "5", "78,3"],
    ],
    headStyles: { fillColor: PRIMARY, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    margin: { left: 14 },
  });
}

function drawConclusion(doc: jsPDF, _cycle: CycleData) {
  doc.addPage();

  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Conclusão Técnica", 14, 25);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, 28, 196, 28);

  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");

  const totalPlanned = 68;
  const totalActual = 67;
  const plantingPct = ((totalActual / totalPlanned) * 100).toFixed(1);
  const totalHarvest = 487.3;
  const expectedProduction = 530;
  const productionPct = ((totalHarvest / expectedProduction) * 100).toFixed(1);
  const avgMoisture = 17.5;

  const conclusions: string[] = [
    `1. PLANTIO: O plantio atingiu ${plantingPct}% da meta planejada (${totalActual} ha de ${totalPlanned} ha previstos). ` +
      (totalActual >= totalPlanned * 0.95
        ? "Resultado dentro do esperado. ✅"
        : "Houve desvio significativo que pode impactar a produção final. ⚠️"),
    `2. SINCRONISMO FLORAL (NICKING): O sincronismo entre macho e fêmea foi classificado como adequado na maioria das avaliações. Não foram registradas falhas críticas de polinização. ✅`,
    `3. DESPENDOAMENTO: O despendoamento atingiu 100% com pendão remanescente final de 0,1%, dentro do padrão exigido (< 0,5%). ✅`,
    `4. UMIDADE: A umidade final média foi de ${avgMoisture.toFixed(1).replace(".", ",")}%. ` +
      (avgMoisture <= 18
        ? "Dentro da faixa ideal para colheita. ✅"
        : "Acima do alvo recomendado. Recomenda-se secagem adicional na UBS. ⚠️"),
    `5. PRODUÇÃO: A produção total acumulada foi de ${totalHarvest.toFixed(1).replace(".", ",")} toneladas, representando ${productionPct}% da meta de ${expectedProduction} toneladas. ` +
      (totalHarvest >= expectedProduction * 0.9
        ? "Resultado satisfatório. ✅"
        : "Abaixo da expectativa. Recomenda-se análise de causas. ⚠️"),
  ];

  let y = 38;
  conclusions.forEach((text) => {
    const lines = doc.splitTextToSize(text, 175);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 6;
  });

  y += 6;
  doc.setFontSize(13);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("Recomendações", 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont("helvetica", "normal");

  const recommendations = [
    "• Manter o monitoramento de umidade até a conclusão total da colheita.",
    "• Registrar o peso final de entrega na UBS para cálculo de rendimento líquido.",
    "• Realizar visita de encerramento com o cliente para validação dos resultados.",
    "• Arquivar fotos georreferenciadas e laudos de despendoamento para auditoria.",
    "• Preparar análise comparativa com safras anteriores para melhoria contínua.",
  ];

  recommendations.forEach((rec) => {
    doc.text(rec, 14, y);
    y += 7;
  });

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Este relatório foi gerado automaticamente pelo sistema Caderno de Campo — Sementes Produtiva.",
    105,
    285,
    { align: "center" }
  );
}

export async function generateCycleReport(cycle: CycleData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const generatedAt = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  // Try html2canvas cover first, fallback to jsPDF-drawn cover
  const htmlCoverRendered = await renderHtmlCover(doc);
  if (!htmlCoverRendered) {
    drawFallbackCover(doc, cycle, generatedAt);
  }

  drawExecutiveSummary(doc, cycle);
  drawOperationalData(doc);
  drawConclusion(doc, cycle);

  // Page numbers (skip cover)
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: "right" });
  }

  doc.save(`Relatorio_${cycle.hybrid}_${cycle.field}_${cycle.season.replace("/", "-")}.pdf`);
}
