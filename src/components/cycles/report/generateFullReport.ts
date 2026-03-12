import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ReportData, ProgressCallback } from "./reportTypes";
import { fetchReportData } from "./useReportData";
import {
  drawCover,
  drawExecutiveSummary,
  drawSeedLots,
  drawPlanting,
  drawNutrition,
  drawPhenology,
  drawNicking,
  drawDetasseling,
  drawChemicals,
  drawPests,
  drawMoisture,
  drawYieldEstimate,
  drawHarvest,
  drawConclusion,
  applyHeadersFooters,
} from "./reportSections";
import { supabase } from "@/integrations/supabase/client";
import coverBgSrc from "@/assets/report-cover-bg.jpg";
import logoWhiteSrc from "@/assets/report-logo-white.png";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

async function captureCoverImage(data: ReportData): Promise<string | undefined> {
  try {
    const c = data.cycle;
    const s = data.orgSettings;
    const now = new Date();
    const dateStr = `${MONTHS_PT[now.getMonth()]} ${now.getFullYear()}`;

    // Create off-screen container
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;pointer-events:none;";
    document.body.appendChild(container);

    const coverDiv = document.createElement("div");
    coverDiv.style.cssText = `width:794px;height:1123px;position:relative;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#0d1f0d;`;

    // Background image
    const bgImg = document.createElement("img");
    bgImg.crossOrigin = "anonymous";
    bgImg.src = coverBgSrc;
    bgImg.style.cssText = "width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;";
    coverDiv.appendChild(bgImg);

    // Gradient overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.3) 0%,rgba(0,0,0,0.15) 40%,rgba(0,0,0,0.75) 100%);";
    coverDiv.appendChild(overlay);

    // Content
    const content = document.createElement("div");
    content.style.cssText = "position:relative;z-index:10;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:40px;box-sizing:border-box;";

    // Logo section
    const logoSection = document.createElement("div");
    const logoImg = document.createElement("img");
    logoImg.crossOrigin = "anonymous";
    logoImg.src = s.report_logo_url || logoWhiteSrc;
    logoImg.style.cssText = "max-width:180px;height:auto;mix-blend-mode:screen;";
    logoSection.appendChild(logoImg);
    const line1 = document.createElement("div");
    line1.style.cssText = "width:100%;height:1px;background-color:rgba(255,255,255,0.3);margin-top:16px;";
    logoSection.appendChild(line1);
    content.appendChild(logoSection);

    // Title block
    const titleBlock = document.createElement("div");
    titleBlock.style.cssText = "margin-bottom:60px;";
    titleBlock.innerHTML = `
      <div style="width:40px;height:2px;background-color:#4CAF50;margin-bottom:12px;"></div>
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,0.8);margin:0;">RELATÓRIO DE PRODUÇÃO</p>
      <h1 style="font-size:36px;font-weight:700;color:#fff;margin:8px 0 0 0;line-height:1.2;">${c.hybrid_name}</h1>
      <p style="font-size:20px;font-weight:300;color:rgba(255,255,255,0.9);margin:4px 0 0 0;">Safra ${c.season}</p>
      <div style="width:60px;height:2px;background-color:#4CAF50;margin:16px 0;"></div>
      ${[
        `Cliente: ${c.client_name}`,
        ...(c.cooperator_name ? [`Cooperado: ${c.cooperator_name}`] : []),
        `Fazenda: ${c.farm_name}`,
        `Pivô: ${c.field_name}`,
        ...(c.contract_number ? [`Contrato: ${c.contract_number}`] : []),
        `Área: ${c.total_area} ha`,
      ].map(line => `<p style="font-size:13px;color:rgba(255,255,255,0.85);margin:4px 0;line-height:1.5;">${line}</p>`).join("")}
    `;
    content.appendChild(titleBlock);

    // Footer
    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
    footer.innerHTML = `
      <span style="font-size:10px;color:rgba(255,255,255,0.6);">${s.report_footer_text || s.org_name + " — Excelência em Produção de Sementes"}</span>
      <span style="font-size:10px;color:rgba(255,255,255,0.6);">${dateStr}</span>
    `;
    content.appendChild(footer);

    coverDiv.appendChild(content);
    container.appendChild(coverDiv);

    // Wait for images to load
    await Promise.all([
      new Promise<void>((resolve) => { bgImg.onload = () => resolve(); bgImg.onerror = () => resolve(); if (bgImg.complete) resolve(); }),
      new Promise<void>((resolve) => { logoImg.onload = () => resolve(); logoImg.onerror = () => resolve(); if (logoImg.complete) resolve(); }),
    ]);
    
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(coverDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      width: 794,
      height: 1123,
    });

    document.body.removeChild(container);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (e) {
    console.warn("Falha ao capturar capa HTML, usando fallback:", e);
    return undefined;
  }
}

export async function generateFullReport(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; blob: Blob }> {
  const totalSteps = 6;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  // Step 1: Fetch data
  progress("Carregando dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  // Step 2: Create PDF
  progress("Gerando capa e resumo...", 2);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Capture HTML cover
  const coverImage = await captureCoverImage(data);
  drawCover(doc, data, coverImage);

  // Executive Summary
  drawExecutiveSummary(doc, data);

  // Step 3: Data sections
  progress("Gerando seções de dados...", 3);

  drawSeedLots(doc, data);
  drawPlanting(doc, data);
  drawNutrition(doc, data);

  progress("Gerando seções operacionais...", 4);
  drawPhenology(doc, data);
  drawNicking(doc, data);
  drawDetasseling(doc, data);
  drawChemicals(doc, data);
  drawPests(doc, data);

  progress("Gerando seções finais...", 5);
  drawMoisture(doc, data);
  drawYieldEstimate(doc, data);
  drawHarvest(doc, data);

  drawConclusion(doc, data);

  applyHeadersFooters(doc, data);

  // Step 6: Save
  progress("Finalizando PDF...", 6);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const fileName = `Relatorio_${data.cycle.hybrid_name}_${data.cycle.season.replace("/", "-")}_${dateStr}.pdf`;

  const blob = doc.output("blob");

  // Download
  doc.save(fileName);

  // Upload to storage
  try {
    const storagePath = `reports/${data.cycle.org_id}/${cycleId}/${fileName}`;
    await (supabase as any).storage.from("cycle-media").upload(storagePath, blob, {
      contentType: "application/pdf",
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
      file_type: "application/pdf",
      file_size: blob.size,
      document_category: "relatorio",
      description: `Relatório gerado em ${now.toLocaleDateString("pt-BR")}`,
    });
  } catch (e) {
    console.warn("Falha ao salvar cópia do relatório no Storage:", e);
  }

  return { fileName, blob };
}
