import { useState, useEffect, useMemo, useRef } from "react";
import { Printer, FileText, Loader2, ChevronDown, ImageIcon, Brain, BarChart3, Maximize2, Download, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { fetchReportData } from "./useReportData";
import { transformReportData } from "./transformReportData";
import { exportStandaloneHtmlFile, uploadHtmlAndGetShareLink } from "./exportStandaloneHtml";
import { useAuth } from "@/hooks/useAuth";

import ReportCover from "./sections/ReportCover";
import ReportResumo from "./sections/ReportResumo";
import ReportSemente from "./sections/ReportSemente";
import ReportPlantio from "./sections/ReportPlantio";
import ReportStand from "./sections/ReportStand";
import ReportManejo from "./sections/ReportManejo";
import ReportFenologia from "./sections/ReportFenologia";
import ReportNDVI from "./sections/ReportNDVI";
import ReportNicking from "./sections/ReportNicking";
import ReportDespendoamento from "./sections/ReportDespendoamento";
import ReportPragas from "./sections/ReportPragas";
import ReportAgua from "./sections/ReportAgua";
import ReportUmidade from "./sections/ReportUmidade";
import ReportEstimativa from "./sections/ReportEstimativa";
import ReportColheita from "./sections/ReportColheita";
import ReportRoguing from "./sections/ReportRoguing";
import ReportFotos from "./sections/ReportFotos";

import { supabase } from "@/integrations/supabase/client";

interface ReportTabProps {
  cycleId: string;
  orgId: string;
  cycle: any;
}

export default function ReportTab({ cycleId, orgId, cycle }: ReportTabProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [sharingLink, setSharingLink] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [cycleId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: fullCycle, error: cycleErr } = await (supabase as any)
        .from("production_cycles")
        .select("*, clients(name), cooperators(name), farms(name), pivots(name)")
        .eq("id", cycleId)
        .is("deleted_at", null)
        .maybeSingle();
      if (cycleErr) throw cycleErr;
      if (!fullCycle) { setError("Ciclo não encontrado."); return; }

      const reportData = await fetchReportData(cycleId, fullCycle);
      const transformed = transformReportData(reportData, fullCycle);

      // Attach raw data for photos + AI analyses
      transformed._raw = reportData;
      setData(transformed);
    } catch (e: any) {
      console.error("Erro ao carregar relatório:", e);
      setError(e.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  // Collect all photos from raw data
  const allPhotos = useMemo(() => {
    if (!data?._raw) return [];
    const raw = data._raw;
    const photos: { url: string; caption: string; category: string; date?: string }[] = [];
    const urlMap = raw.photoSignedUrls || {};

    const resolveUrl = (p: string) => {
      if (p.startsWith("http")) return p;
      return urlMap[p] || null;
    };

    const extractPhotos = (records: any[], category: string, dateField?: string) => {
      for (const r of records) {
        const arr = Array.isArray(r?.photos) ? r.photos : [];
        for (const p of arr) {
          const url = resolveUrl(p);
          if (url) {
            photos.push({
              url,
              caption: r.notes || r.observations || r.non_conformities || "",
              category,
              date: dateField ? r[dateField] : undefined,
            });
          }
        }
      }
    };

    extractPhotos(raw.plantingActual, "Plantio", "planting_date");
    extractPhotos(raw.detasseling, "Despendoamento", "operation_date");
    extractPhotos(raw.chemicals, "Aplicação Química", "application_date");
    extractPhotos(raw.pests, "Pragas", "observation_date");
    extractPhotos(raw.moisture, "Umidade", "sample_date");
    extractPhotos(raw.phenology, "Fenologia", "observation_date");
    extractPhotos(raw.roguingRecords, "Roguing", "operation_date");

    // Field visit photos
    if (raw.fieldVisits) {
      for (const v of raw.fieldVisits) {
        if (v.field_visit_photos) {
          for (const fp of v.field_visit_photos) {
            const url = resolveUrl(fp.photo_url);
            if (url) {
              photos.push({ url, caption: fp.caption || `Visita ${v.visit_number || ""}`, category: "Avaliação de Campo", date: v.visit_date });
            }
          }
        }
      }
    }

    return photos;
  }, [data]);

  // Build executive summary KPIs
  const summaryKpis = useMemo(() => {
    if (!data) return [];
    const kpis: { label: string; value: string; color: string; detail?: string }[] = [];

    // Stand
    if (data.stand?.length > 0) {
      const lastStand = data.stand[data.stand.length - 1];
      kpis.push({
        label: "Stand Atual",
        value: lastStand.pop_plha ? `${Number(lastStand.pop_plha).toLocaleString("pt-BR")} pl/ha` : "—",
        color: "green",
        detail: `CV: ${lastStand.cv_stand ?? "—"}% | Emergência: ${lastStand.emergencia ?? "—"}%`,
      });
    }

    // NDVI
    if (data.ndvi_imagens?.length > 0) {
      const lastNdvi = data.ndvi_imagens[0];
      const val = lastNdvi.ndvi_medio;
      const color = val >= 0.7 ? "green" : val >= 0.4 ? "orange" : "red";
      kpis.push({
        label: "NDVI Atual",
        value: val?.toFixed(3) ?? "—",
        color,
        detail: `Min: ${lastNdvi.ndvi_min?.toFixed(3) ?? "—"} | Max: ${lastNdvi.ndvi_max?.toFixed(3) ?? "—"}`,
      });
    }

    // Climate GDU
    if (data.clima?.length > 0) {
      const lastClima = data.clima[data.clima.length - 1];
      if (lastClima.gdu_acumulado != null) {
        kpis.push({
          label: "GDU Acumulado",
          value: `${Number(lastClima.gdu_acumulado).toFixed(0)}`,
          color: "blue",
          detail: `Último registro: ${lastClima.data || "—"}`,
        });
      }
    }

    // Moisture
    if (data.umidade?.length > 0) {
      const lastMoist = data.umidade[data.umidade.length - 1];
      kpis.push({
        label: "Umidade Grão",
        value: `${Number(lastMoist.umidade_pct).toFixed(1)}%`,
        color: Number(lastMoist.umidade_pct) <= (data.umidade_alvo || 18) ? "green" : "orange",
        detail: `${lastMoist.data || "—"} | ${lastMoist.gleba}`,
      });
    }


    // Harvest
    if (data.colheita?.length > 0) {
      const totalTons = data.colheita.reduce((s: number, c: any) => s + (c.tons || 0), 0);
      kpis.push({
        label: "Colhido",
        value: `${totalTons.toFixed(1)} ton`,
        color: "green",
        detail: `${data.colheita.length} registro(s)`,
      });
    }

    // Plantio progress
    if (data.plantio?.length > 0) {
      // Female area + max(male sub-type areas) since males share the same physical rows
      const femaleTotal = data.plantio
        .filter((p: any) => p.tipo === "Fêmea")
        .reduce((s: number, p: any) => s + (p.area || 0), 0);
      const pct = data.area_femea ? ((femaleTotal / data.area_femea) * 100).toFixed(0) : (data.area_total ? ((femaleTotal / data.area_total) * 100).toFixed(0) : "—");
      kpis.push({
        label: "Plantio Realizado",
        value: `${femaleTotal.toFixed(1)} ha`,
        color: "blue",
        detail: `${pct}% da área de fêmea`,
      });
    }

    // Pests
    if (data.pragas?.length > 0) {
      const maxInc = Math.max(...data.pragas.map((p: any) => p.incidencia || 0));
      kpis.push({
        label: "Pragas/Doenças",
        value: `${data.pragas.length} registro(s)`,
        color: maxInc > 30 ? "red" : maxInc > 10 ? "orange" : "green",
        detail: `Incidência máx: ${maxInc.toFixed(0)}%`,
      });
    }

    // Photos
    if (allPhotos.length > 0) {
      kpis.push({
        label: "Fotos",
        value: `${allPhotos.length}`,
        color: "blue",
        detail: "registros fotográficos",
      });
    }

    return kpis;
  }, [data, allPhotos]);

  // Collect all AI analyses
  const aiAnalyses = useMemo(() => {
    if (!data?._raw) return [];
    const analyses: { title: string; text: string; date: string; type: string }[] = [];

    // NDVI analyses
    if (data._raw.ndviAnalyses?.length > 0) {
      for (const a of data._raw.ndviAnalyses) {
        analyses.push({
          title: "Análise NDVI",
          text: a.analysis_text,
          date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          type: "ndvi",
        });
      }
    }

    return analyses;
  }, [data]);

  const handlePrint = () => {
    window.open(`/report/${cycleId}`, "_blank");
  };

  const handleDownloadHtml = async () => {
    const reportEl = reportRef.current;
    if (!reportEl || !data || exportingHtml) return;

    const clientName = data.cliente || "Cliente";
    const fileName = `Relatorio de Campo - ${clientName}.html`;

    setExportingHtml(true);
    const loadingToastId = toast.loading("Gerando HTML compartilhável...");

    try {
      const exportResult = await exportStandaloneHtmlFile({
        sourceElement: reportEl,
        fileName,
        title: `Relatório de Campo - ${clientName}`,
        styles: standaloneReportStyles,
        wrapperClassName: "report-container",
      });

      toast.success("Download iniciado com sucesso.", {
        id: loadingToastId,
        action: {
          label: "Abrir HTML",
          onClick: () => window.open(exportResult.objectUrl, "_blank", "noopener,noreferrer"),
        },
      });
    } catch (err) {
      console.error("Falha ao gerar HTML compartilhável:", err);
      toast.error("Não foi possível gerar o HTML compartilhável.", { id: loadingToastId });
    } finally {
      setExportingHtml(false);
    }
  };

  const handleShareLink = async () => {
    const reportEl = reportRef.current;
    if (!reportEl || !data || sharingLink || !user) return;

    const clientName = data.cliente || "Cliente";

    setSharingLink(true);
    const loadingToastId = toast.loading("Gerando link compartilhável...");

    try {
      const publicUrl = await uploadHtmlAndGetShareLink({
        sourceElement: reportEl,
        fileName: `Relatorio de Campo - ${clientName}.html`,
        title: `Relatório de Campo - ${clientName}`,
        styles: standaloneReportStyles,
        wrapperClassName: "report-container",
        userId: user.id,
        cycleId,
      });

      try { await navigator.clipboard.writeText(publicUrl); } catch { /* fallback below */ }

      toast.success(
        <div className="space-y-2">
          <p className="font-medium">Link gerado com sucesso!</p>
          <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
            <code className="text-xs truncate flex-1">{publicUrl.length > 60 ? publicUrl.slice(0, 60) + "..." : publicUrl}</code>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium hover:opacity-90"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Link copiado!", { duration: 2000 });
              }}
            >
              📋 Copiar link
            </button>
            <button
              className="text-xs px-3 py-1.5 rounded bg-[#25D366] text-white font-medium hover:opacity-90"
              onClick={() => {
                const text = encodeURIComponent(`📄 Relatório de Campo - ${clientName}\n\n${publicUrl}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
            >
              WhatsApp
            </button>
          </div>
        </div>,
        { id: loadingToastId, duration: 30000 },
      );
    } catch (err) {
      console.error("Falha ao gerar link:", err);
      toast.error("Não foi possível gerar o link compartilhável.", { id: loadingToastId });
    } finally {
      setSharingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando relatório completo...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error || "Nenhum dado disponível"}</p>
        <Button variant="outline" onClick={loadData}>Tentar novamente</Button>
      </div>
    );
  }

  const kpiColorMap: Record<string, string> = {
    green: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
    blue: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
    orange: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
    red: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
    purple: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
  };
  const kpiValueColor: Record<string, string> = {
    green: "text-emerald-700 dark:text-emerald-400",
    blue: "text-blue-700 dark:text-blue-400",
    orange: "text-orange-700 dark:text-orange-400",
    red: "text-red-700 dark:text-red-400",
    purple: "text-purple-700 dark:text-purple-400",
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">📄 Relatório Completo</h2>
          <p className="text-xs text-muted-foreground">
            {data.hibrido} — Safra {data.safra} — {data.fazenda}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <Loader2 className={cn("h-3 w-3 mr-1", loading && "animate-spin")} /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadHtml} disabled={exportingHtml}>
            {exportingHtml ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
            {exportingHtml ? "Gerando..." : "Baixar HTML"}
          </Button>
          <Button variant="default" size="sm" onClick={handleShareLink} disabled={sharingLink}>
            {sharingLink ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Share2 className="h-3 w-3 mr-1" />}
            {sharingLink ? "Gerando link..." : "Compartilhar"}
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-1" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* ═══ EXECUTIVE SUMMARY ═══ */}
      <Card className="border-primary/30 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Contrato:</span> <strong>{data.contrato || "—"}</strong></div>
            <div><span className="text-muted-foreground">Cliente:</span> <strong>{data.cliente || "—"}</strong></div>
            <div><span className="text-muted-foreground">Cooperado:</span> <strong>{data.cooperado || "—"}</strong></div>
            <div><span className="text-muted-foreground">Fazenda:</span> <strong>{data.fazenda || "—"}</strong></div>
            <div><span className="text-muted-foreground">Híbrido:</span> <strong>{data.hibrido || "—"}</strong></div>
            <div><span className="text-muted-foreground">Área:</span> <strong>{data.area_total} ha</strong> (F:{data.area_femea} M:{data.area_macho})</div>
            <div><span className="text-muted-foreground">Ciclo:</span> <strong>{data.ciclo_dias ?? "—"} dias</strong></div>
            <div><span className="text-muted-foreground">Proporção:</span> <strong>{data.proporcao_fm || "—"}</strong></div>
          </div>

          {/* KPI Cards */}
          {summaryKpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {summaryKpis.map((k, i) => (
                <div key={i} className={cn("rounded-lg border-l-4 p-3", kpiColorMap[k.color] || kpiColorMap.green)}>
                  <p className={cn("text-xl font-bold", kpiValueColor[k.color] || kpiValueColor.green)}>{k.value}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mt-0.5">{k.label}</p>
                  {k.detail && <p className="text-[10px] text-muted-foreground mt-1">{k.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ AI ANALYSIS SECTION ═══ */}
      {aiAnalyses.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Diagnóstico Técnico — Análise Inteligente
            </CardTitle>
            <p className="text-xs text-muted-foreground">Pareceres técnicos gerados pelo sistema de inteligência artificial</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiAnalyses.map((a, i) => (
              <div key={i} className="border rounded-lg p-4 bg-blue-50/30 dark:bg-blue-950/10">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 dark:text-blue-400">
                    {a.title}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{a.date}</span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown>{a.text}</ReactMarkdown>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ═══ REPORT SECTIONS (reusing existing components) ═══ */}
      <div ref={reportRef} className="report-inline-container">
        <style>{inlineReportStyles}</style>

        {/* Cover is shown as a condensed header card */}
        <ReportCover data={data} />
        <ReportResumo data={data} />

        {data.lotes_semente?.length > 0 && <ReportSemente data={data} />}
        {data.plantio?.length > 0 && <ReportPlantio data={data} />}
        {(data.stand?.length > 0 || data.cv_stand_records?.length > 0) && <ReportStand data={data} />}
        {data.insumos?.length > 0 && <ReportManejo data={data} />}
        {data.fenologia?.length > 0 && <ReportFenologia data={data} />}
        {data.ndvi_imagens?.length > 0 && <ReportNDVI data={data} />}
        {(data.nicking_marcos?.length > 0 || data.nicking_observacoes?.length > 0) && <ReportNicking data={data} />}
        {(data.despendoamento?.length > 0 || data.plantio?.length > 0) && <ReportDespendoamento data={data} />}
        {data.pragas?.length > 0 && <ReportPragas data={data} />}
        {(data.roguing_avaliacoes?.length > 0 || data.roguing_solicitacoes?.length > 0 || data.roguing_execucoes?.length > 0) && <ReportRoguing data={data} />}
        {(data.irrigacao?.length > 0 || data.chuva?.length > 0 || data.clima?.length > 0) && <ReportAgua data={data} />}
        {data.umidade?.length > 0 && <ReportUmidade data={data} />}
        {data.estimativa && <ReportEstimativa data={data} />}
        {(data.colheita?.length > 0 || data._raw?.plantingActual?.some((p: any) => p.type === "female") || data._raw?.plantingPlan?.some((p: any) => p.type === "female")) && <ReportColheita data={data} />}
        {data._fotos?.length > 0 && <ReportFotos data={data} />}
      </div>

      {/* ═══ PHOTOS GALLERY ═══ */}
      {allPhotos.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Galeria de Fotos ({allPhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allPhotos.map((photo, i) => (
                <div
                  key={i}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border bg-muted/30 aspect-square"
                  onClick={() => setLightboxImg(photo.url)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || photo.category}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge variant="secondary" className="text-[9px] mb-1">{photo.category}</Badge>
                    {photo.date && (
                      <p className="text-[9px] text-white">{new Date(photo.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                    {photo.caption && (
                      <p className="text-[9px] text-white/80 line-clamp-2">{photo.caption}</p>
                    )}
                  </div>
                  <Maximize2 className="absolute top-2 right-2 h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxImg && (
            <img src={lightboxImg} alt="Foto" className="w-full h-auto rounded-lg max-h-[80vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] text-muted-foreground">
        Relatório gerado em {new Date().toLocaleDateString("pt-BR")} às{" "}
        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        {data.organizacao && ` — ${data.organizacao}`}
      </div>
    </div>
  );
}

const standaloneReportStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #f5f5f5; }

  .report-container {
    max-width: 210mm; margin: 20px auto; background: white;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 8px; overflow: hidden;
  }

  .report-cover {
    min-height: 280mm; padding: 80px 50px 40px;
    background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 40%, #388E3C 100%);
    color: white; display: flex; flex-direction: column; justify-content: center;
    page-break-after: always;
  }
  .report-cover .cover-label { font-size: 13px; letter-spacing: 6px; text-transform: uppercase; opacity: 0.85; margin-bottom: 16px; }
  .report-cover .cover-hybrid { font-size: 42px; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
  .report-cover .cover-season { font-size: 22px; opacity: 0.9; margin-bottom: 40px; }
  .report-cover .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 40px; font-size: 14px; opacity: 0.92; }
  .report-cover .cover-grid span { display: block; }
  .report-cover .cover-grid strong { font-weight: 600; }
  .report-cover .cover-footer { margin-top: auto; padding-top: 40px; font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); }

  .report-section { padding: 40px 50px; page-break-before: always; }
  .section-title {
    font-size: 20px; font-weight: 700; color: #1B5E20;
    border-bottom: 2px solid #1B5E20; padding-bottom: 8px; margin-bottom: 24px;
    display: flex; align-items: center; gap: 10px;
  }

  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .kpi-card { padding: 16px; border-radius: 8px; background: #F5F5F5; border-left: 4px solid #1B5E20; }
  .kpi-card.blue { border-left-color: #1565C0; }
  .kpi-card.orange { border-left-color: #EF6C00; }
  .kpi-card.purple { border-left-color: #7B1FA2; }
  .kpi-card .kpi-value { font-size: 28px; font-weight: 700; color: #1B5E20; }
  .kpi-card.blue .kpi-value { color: #1565C0; }
  .kpi-card.orange .kpi-value { color: #EF6C00; }
  .kpi-card.purple .kpi-value { color: #7B1FA2; }
  .kpi-card .kpi-label { font-size: 11px; text-transform: uppercase; color: #888; margin-top: 2px; }
  .kpi-card .kpi-sub { font-size: 11px; color: #666; margin-top: 4px; }

  .chart-container { background: #FAFAFA; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 24px; }
  .chart-title { font-size: 14px; font-weight: 600; color: #333; margin-bottom: 16px; }

  .report-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px; }
  .report-table thead th {
    background: #1B5E20; color: white; padding: 8px 12px; text-align: left;
    font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
  }
  .report-table tbody td { padding: 7px 12px; border-bottom: 1px solid #E0E0E0; }
  .report-table tbody tr:nth-child(even) { background: #F9F9F9; }
  .report-table tfoot td { padding: 8px 12px; font-weight: 700; background: #E8F5E9; border-top: 2px solid #1B5E20; }

  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; }
  .badge-green { background: #E8F5E9; color: #2E7D32; }
  .badge-yellow { background: #FFF8E1; color: #F57F17; }
  .badge-orange { background: #FFF3E0; color: #E65100; }
  .badge-red { background: #FFEBEE; color: #C62828; }
  .badge-blue { background: #E3F2FD; color: #1565C0; }
  .badge-gray { background: #F5F5F5; color: #666; }

  .highlight-box { background: #E8F5E9; border-left: 4px solid #1B5E20; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 13px; line-height: 1.6; color: #1B5E20; }

  .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .photo-grid img { width: 100%; border-radius: 8px; object-fit: cover; max-height: 250px; }
  .photo-grid .photo-caption { font-size: 10px; color: #666; margin-top: 4px; }

  .conclusion-section { padding: 40px 50px; page-break-before: always; }
  .conclusion-section p { font-size: 13px; line-height: 1.7; margin-bottom: 12px; text-align: justify; }

  svg { max-width: 100%; }

  @media print {
    body { background: white; margin: 0; }
    .report-container { max-width: 100%; margin: 0; box-shadow: none; border-radius: 0; }
    .report-section { padding: 24px 16px; }
    .report-cover { padding: 60px 40px; }
    .chart-container { box-shadow: none; border: 1px solid #E0E0E0; break-inside: avoid; }
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .kpi-card { break-inside: avoid; }
    @page { size: A4; margin: 12mm 10mm; }
  }
`;

/* ── Scoped styles for inline report sections ── */
const inlineReportStyles = `
  .report-inline-container {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
  }
  .report-inline-container .report-cover {
    min-height: auto; padding: 30px 24px;
    background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 40%, #388E3C 100%);
    color: white; border-radius: 12px; margin-bottom: 16px;
    page-break-after: unset;
  }
  .report-inline-container .report-cover .cover-hybrid { font-size: 28px; }
  .report-inline-container .report-cover .cover-season { font-size: 16px; }
  .report-inline-container .report-cover .cover-grid { font-size: 12px; }
  .report-inline-container .report-cover .cover-label { font-size: 11px; letter-spacing: 4px; }
  .report-inline-container .report-cover .cover-footer { font-size: 10px; }

  .report-inline-container .report-section {
    padding: 24px; page-break-before: unset;
    background: white; border-radius: 12px;
    border: 1px solid hsl(var(--border));
    margin-bottom: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .report-inline-container .section-title {
    font-size: 16px; font-weight: 700; color: #1B5E20;
    border-bottom: 2px solid #1B5E20; padding-bottom: 6px; margin-bottom: 20px;
    display: flex; align-items: center; gap: 8px;
  }

  .report-inline-container .kpi-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px; margin-bottom: 20px;
  }
  .report-inline-container .kpi-card { padding: 12px; border-radius: 8px; background: #F5F5F5; border-left: 4px solid #1B5E20; }
  .report-inline-container .kpi-card.blue { border-left-color: #1565C0; }
  .report-inline-container .kpi-card.orange { border-left-color: #EF6C00; }
  .report-inline-container .kpi-card.purple { border-left-color: #7B1FA2; }
  .report-inline-container .kpi-card .kpi-value { font-size: 22px; font-weight: 700; color: #1B5E20; }
  .report-inline-container .kpi-card.blue .kpi-value { color: #1565C0; }
  .report-inline-container .kpi-card.orange .kpi-value { color: #EF6C00; }
  .report-inline-container .kpi-card.purple .kpi-value { color: #7B1FA2; }
  .report-inline-container .kpi-card .kpi-label { font-size: 9px; text-transform: uppercase; color: #888; margin-top: 2px; }
  .report-inline-container .kpi-card .kpi-sub { font-size: 10px; color: #666; margin-top: 2px; }

  .report-inline-container .chart-container {
    background: #FAFAFA; border-radius: 8px; padding: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04); margin-bottom: 20px;
  }
  .report-inline-container .chart-title { font-size: 13px; font-weight: 600; color: #333; margin-bottom: 12px; }

  .report-inline-container .report-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
  .report-inline-container .report-table thead th {
    background: #1B5E20; color: white; padding: 6px 10px; text-align: left;
    font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
  }
  .report-inline-container .report-table tbody td { padding: 5px 10px; border-bottom: 1px solid #E0E0E0; }
  .report-inline-container .report-table tbody tr:nth-child(even) { background: #F9F9F9; }
  .report-inline-container .report-table tfoot td { padding: 6px 10px; font-weight: 700; background: #E8F5E9; border-top: 2px solid #1B5E20; }

  .report-inline-container .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; }
  .report-inline-container .badge-green { background: #E8F5E9; color: #2E7D32; }
  .report-inline-container .badge-yellow { background: #FFF8E1; color: #F57F17; }
  .report-inline-container .badge-orange { background: #FFF3E0; color: #E65100; }
  .report-inline-container .badge-red { background: #FFEBEE; color: #C62828; }
  .report-inline-container .badge-blue { background: #E3F2FD; color: #1565C0; }
  .report-inline-container .badge-gray { background: #F5F5F5; color: #666; }

  .report-inline-container .highlight-box {
    background: #E8F5E9; border-left: 4px solid #1B5E20;
    padding: 12px 16px; border-radius: 0 8px 8px 0;
    margin: 12px 0; font-size: 12px; line-height: 1.6; color: #1B5E20;
  }

  .report-inline-container .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .report-inline-container .photo-grid img { width: 100%; border-radius: 8px; object-fit: cover; max-height: 200px; }

  .report-inline-container .conclusion-section { padding: 24px; page-break-before: unset; }
  .report-inline-container .conclusion-section p { font-size: 12px; line-height: 1.7; margin-bottom: 10px; text-align: justify; }

  @media (max-width: 640px) {
    .report-inline-container .kpi-grid { grid-template-columns: 1fr 1fr; }
    .report-inline-container .report-section { padding: 16px; }
    .report-inline-container .report-cover { padding: 20px 16px; }
    .report-inline-container .report-cover .cover-hybrid { font-size: 22px; }
  }
`;
