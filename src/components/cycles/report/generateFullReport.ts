import jsPDF from "jspdf";
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

  // Cover
  drawCover(doc, data);

  // Executive Summary
  drawExecutiveSummary(doc, data);

  // Step 3: Data sections
  progress("Gerando seções de dados...", 3);

  // Dynamically include only sections with data
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

  // Conclusion (always)
  drawConclusion(doc, data);

  // Apply headers and footers to all pages except cover
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

    // Get public URL
    const { data: urlData } = (supabase as any).storage.from("cycle-media").getPublicUrl(storagePath);
    const fileUrl = urlData?.publicUrl || storagePath;

    // Save attachment record
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
