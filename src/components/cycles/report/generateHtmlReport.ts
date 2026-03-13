import { fetchReportData } from "./useReportData";
import { supabase } from "@/integrations/supabase/client";
import type { ReportData } from "./reportTypes";

export type ProgressCallback = (message: string, current: number, total: number) => void;

/**
 * Collects all photos from all modules and returns public URLs.
 */
function collectPhotoUrls(data: ReportData): { module: string; url: string; date?: string }[] {
  const photos: { module: string; url: string; date?: string }[] = [];
  const bucket = "cycle-media";

  const getPublicUrl = (path: string) => {
    const { data: urlData } = (supabase as any).storage.from(bucket).getPublicUrl(path);
    return urlData?.publicUrl || path;
  };

  // Detasseling photos
  data.detasseling.forEach((d: any) => {
    (d.photos || []).forEach((p: string) => {
      photos.push({ module: "Despendoamento", url: getPublicUrl(p), date: d.operation_date });
    });
  });

  // Chemical application photos
  data.chemicals.forEach((c: any) => {
    (c.photos || []).forEach((p: string) => {
      photos.push({ module: "Aplicação Química", url: getPublicUrl(p), date: c.application_date });
    });
  });

  // Pest photos
  data.pests.forEach((p: any) => {
    (p.photos || []).forEach((ph: string) => {
      photos.push({ module: "Pragas/Doenças", url: getPublicUrl(ph), date: p.observation_date });
    });
  });

  // Moisture photos
  data.moisture.forEach((m: any) => {
    (m.photos || []).forEach((p: string) => {
      photos.push({ module: "Umidade", url: getPublicUrl(p), date: m.sample_date });
    });
  });

  // Phenology photos
  data.phenology.forEach((ph: any) => {
    (ph.photos || []).forEach((p: string) => {
      photos.push({ module: "Fenologia", url: getPublicUrl(p), date: ph.observation_date });
    });
  });

  return photos;
}

/**
 * Builds the JSON payload to send to the AI for report generation.
 */
function buildAllData(data: ReportData) {
  const photos = collectPhotoUrls(data);

  return {
    cycle: data.cycle,
    org: {
      name: data.orgSettings.org_name,
      slogan: data.orgSettings.org_slogan,
      logo_url: data.orgSettings.report_logo_url,
      footer_text: data.orgSettings.report_footer_text,
    },
    seed_lots: data.seedLots,
    seed_treatments: data.seedLotTreatments.map((t: any) => ({
      ...t,
      products: data.seedLotTreatmentProducts.filter((p: any) => p.seed_lot_treatment_id === t.id),
    })),
    planting_plan: data.plantingPlan,
    planting_actual: data.plantingActual.map((p: any) => ({
      ...p,
      cv_points: data.cvPoints.filter((c: any) => c.planting_actual_id === p.id),
    })),
    stand_counts: data.standCounts.map((s: any) => ({
      ...s,
      points: data.standCountPoints.filter((p: any) => p.stand_count_id === s.id),
    })),
    emergence_counts: data.emergenceCounts,
    crop_inputs: data.cropInputs,
    fertilizations: data.fertilizations,
    phenology: data.phenology,
    ndvi: {
      latest_analyses: data.ndviAnalyses,
    },
    nicking: {
      milestones: data.nickingMilestones,
      observations: data.nickingObservations,
      inspections: data.inspectionData,
    },
    detasseling: data.detasseling,
    roguing: data.roguingRecords,
    chemicals: data.chemicals,
    pests: data.pests,
    water: {
      irrigation: data.irrigationRecords,
      rainfall: data.rainfallRecords,
    },
    moisture: data.moisture,
    yield_estimate: {
      estimates: data.yieldEstimates,
      points: data.yieldSamplePoints,
    },
    harvest: {
      plan: data.harvestPlan,
      records: data.harvestRecords,
    },
    field_visits: data.fieldVisits,
    photos,
  };
}

/**
 * Wraps AI-generated HTML in a full document shell with print toolbar.
 */
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
}

/**
 * Main function: fetches data, calls AI edge function, opens result.
 */
export async function generateHtmlReport(
  cycleId: string,
  cycle: any,
  onProgress?: ProgressCallback,
): Promise<{ fileName: string; blob: Blob; html: string }> {
  const totalSteps = 6;
  const progress = (msg: string, step: number) => onProgress?.(msg, step, totalSteps);

  // Step 1: Collect data
  progress("Coletando dados do ciclo...", 1);
  const data = await fetchReportData(cycleId, cycle);

  // Step 2: Build payload
  progress("Montando dados para o relatório...", 2);
  const allData = buildAllData(data);

  // Step 3: Call AI
  progress("Gerando relatório com análise avançada...", 3);
  let html: string;

  try {
    const { data: fnData, error: fnError } = await (supabase as any).functions.invoke("generate-report", {
      body: { allData },
    });

    if (fnError) throw fnError;
    
    // Handle both parsed JSON and raw string responses
    let responseHtml: string | undefined;
    if (typeof fnData === "string") {
      try {
        const parsed = JSON.parse(fnData);
        responseHtml = parsed.html;
      } catch {
        responseHtml = fnData;
      }
    } else {
      responseHtml = fnData?.html;
    }
    
    if (!responseHtml) throw new Error("Resposta vazia da análise avançada");

    // Clean markdown fences and any preamble text
    html = responseHtml
      .replace(/^[\s\S]*?```html\n?/g, "")
      .replace(/```[\s\S]*$/g, "")
      .replace(/^[\s\S]*?(<style)/i, "$1")
      .replace(/^[\s\S]*?(<\!DOCTYPE)/i, "$1")
      .trim();
      
    // If it starts with <!DOCTYPE or <html, extract inner body content
    if (html.toLowerCase().startsWith("<!doctype") || html.toLowerCase().startsWith("<html")) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        const styleMatch = html.match(/(<style[\s\S]*?<\/style>)/gi);
        html = (styleMatch ? styleMatch.join("\n") : "") + bodyMatch[1];
      }
    }
  } catch (err: any) {
    console.warn("Falha na análise avançada, usando fallback:", err.message);
    progress("⚠️ Usando template simplificado...", 3);
    const { buildFallbackReport } = await import("./reportFallback");
    html = buildFallbackReport(data);
  }

  // Step 4: Wrap and open
  progress("Abrindo relatório...", 4);
  const title = `Relatório — ${data.cycle.hybrid_name} — Safra ${data.cycle.season}`;
  const fullHtml = wrapInDocument(html, title);

  // Open in new tab using document.write for proper rendering
  openHtmlInNewTab(fullHtml);

  // Step 5: Upload
  progress("Salvando cópia...", 5);
  const blob = new Blob([fullHtml], { type: "text/html" });
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const fileName = `Relatorio_${data.cycle.hybrid_name}_${data.cycle.season.replace("/", "-")}_${dateStr}_${timeStr}.html`;

  try {
    const storagePath = `reports/${data.cycle.org_id}/${cycleId}/${fileName}`;
    const { error: uploadError } = await (supabase as any).storage.from("cycle-documents").upload(storagePath, blob, {
      contentType: "text/html",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = await (supabase as any).storage.from("cycle-documents").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
    const fileUrl = urlData?.signedUrl || storagePath;

    await (supabase as any).from("attachments").insert({
      entity_id: cycleId,
      entity_type: "cycle",
      org_id: data.cycle.org_id,
      file_name: fileName,
      file_url: fileUrl,
      file_type: "text/html",
      file_size: blob.size,
      document_category: "relatorio",
      description: `Relatório gerado em ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    });
  } catch (e) {
    console.warn("Falha ao salvar cópia do relatório:", e);
  }

  progress("✅ Relatório gerado!", 6);
  return { fileName, blob, html: fullHtml };
}
