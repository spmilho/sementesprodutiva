import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer, ArrowLeft, FileText, Loader2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchReportData } from "@/components/cycles/report/useReportData";
import { transformReportData } from "@/components/cycles/report/transformReportData";
import { exportStandaloneHtmlFile, uploadHtmlAndGetShareLink } from "@/components/cycles/report/exportStandaloneHtml";

import ReportCover from "@/components/cycles/report/sections/ReportCover";
import ReportResumo from "@/components/cycles/report/sections/ReportResumo";
import ReportSemente from "@/components/cycles/report/sections/ReportSemente";
import ReportPlantio from "@/components/cycles/report/sections/ReportPlantio";
import ReportStand from "@/components/cycles/report/sections/ReportStand";
import ReportManejo from "@/components/cycles/report/sections/ReportManejo";
import ReportFenologia from "@/components/cycles/report/sections/ReportFenologia";
import ReportNDVI from "@/components/cycles/report/sections/ReportNDVI";
import ReportNicking from "@/components/cycles/report/sections/ReportNicking";
import ReportDespendoamento from "@/components/cycles/report/sections/ReportDespendoamento";
import ReportPragas from "@/components/cycles/report/sections/ReportPragas";
import ReportAgua from "@/components/cycles/report/sections/ReportAgua";
import ReportUmidade from "@/components/cycles/report/sections/ReportUmidade";
import ReportEstimativa from "@/components/cycles/report/sections/ReportEstimativa";
import ReportColheita from "@/components/cycles/report/sections/ReportColheita";
import ReportFotos from "@/components/cycles/report/sections/ReportFotos";

const sb = supabase as any;

export default function CycleReportPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingHtml, setExportingHtml] = useState(false);

  useEffect(() => {
    if (!cycleId) return;
    loadData(cycleId);
  }, [cycleId]);

  const loadData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch cycle with joins
      const { data: cycle, error: cycleErr } = await sb
        .from("production_cycles")
        .select("*, clients(name), cooperators(name), farms(name), pivots(name)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();

      if (cycleErr) throw cycleErr;
      if (!cycle) { setError("Ciclo não encontrado."); return; }

      const reportData = await fetchReportData(id, cycle);
      const transformed = transformReportData(reportData, cycle);
      transformed._raw = reportData;
      setData(transformed);
    } catch (e: any) {
      console.error("Erro ao carregar relatório:", e);
      setError(e.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#666", gap: 16,
      }}>
        <Loader2 size={48} style={{ animation: "spin 1s linear infinite" }} />
        <h2 style={{ margin: 0, color: "#333" }}>Carregando relatório...</h2>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#666", gap: 16,
      }}>
        <FileText size={48} color="#999" />
        <h2 style={{ margin: 0, color: "#333" }}>{error || "Nenhum relatório para exibir"}</h2>
        <p>Verifique o link ou gere o relatório a partir do ciclo de produção.</p>
      </div>
    );
  }

  const handleDownloadHtml = async () => {
    const reportContainer = document.querySelector(".report-container") as HTMLElement | null;
    if (!reportContainer || exportingHtml) return;

    const clientName = data.cliente || "Cliente";
    const fileName = `Relatorio de Campo - ${clientName}.html`;

    setExportingHtml(true);
    const loadingToastId = toast.loading("Gerando HTML compartilhável...");

    try {
      const exportResult = await exportStandaloneHtmlFile({
        sourceElement: reportContainer,
        fileName,
        title: `Relatório de Campo - ${clientName}`,
        styles: `${reportStyles}
    body { background: #f5f5f5; }
    .report-container { max-width: 210mm; margin: 20px auto; background: white; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 8px; overflow: hidden; }`,
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

  return (
    <>
      <style>{reportStyles}</style>

      <div className="report-toolbar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => window.close()} className="toolbar-btn">
            <ArrowLeft size={16} /> Fechar
          </button>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            📄 {data.hibrido} — Safra {data.safra}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleDownloadHtml} className="toolbar-btn" disabled={exportingHtml}>
            {exportingHtml ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />} {exportingHtml ? "Gerando..." : "Baixar HTML"}
          </button>
          <button onClick={() => window.print()} className="toolbar-btn toolbar-btn-primary">
            <Printer size={16} /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <div className="report-container">
        <ReportCover data={data} />
        <ReportResumo data={data} />

        {data.lotes_semente?.length > 0 && <ReportSemente data={data} />}
        {data.plantio?.length > 0 && <ReportPlantio data={data} />}
        {data.stand?.length > 0 && <ReportStand data={data} />}
        {data.insumos?.length > 0 && <ReportManejo data={data} />}
        {data.fenologia?.length > 0 && <ReportFenologia data={data} />}
        {data.ndvi_imagens?.length > 0 && <ReportNDVI data={data} />}
        {(data.nicking_marcos?.length > 0 || data.nicking_observacoes?.length > 0) && <ReportNicking data={data} />}
        {(data.despendoamento?.length > 0 || data.plantio?.length > 0) && <ReportDespendoamento data={data} />}
        {data.pragas?.length > 0 && <ReportPragas data={data} />}
        {(data.irrigacao?.length > 0 || data.chuva?.length > 0 || data.clima?.length > 0) && <ReportAgua data={data} />}
        {data.umidade?.length > 0 && <ReportUmidade data={data} />}
        {data.estimativa && <ReportEstimativa data={data} />}
        {data.colheita?.length > 0 && <ReportColheita data={data} />}
        {data._fotos?.length > 0 && <ReportFotos data={data} />}
      </div>
    </>
  );
}

const reportStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a1a; background: #f5f5f5; }

  .report-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: linear-gradient(135deg, #1B5E20, #2E7D32);
    color: white; display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }
  .toolbar-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25);
    padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;
    transition: background 0.2s;
  }
  .toolbar-btn:hover { background: rgba(255,255,255,0.25); }
  .toolbar-btn-primary { background: rgba(255,255,255,0.25); font-weight: 600; }

  .report-container {
    max-width: 210mm; margin: 70px auto 40px; background: white;
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
  .signature-block { margin-top: 60px; text-align: center; font-size: 13px; }
  .signature-block .sig-line { width: 300px; border-top: 1px solid #333; margin: 0 auto; padding-top: 8px; }
  .signature-block .sig-date { font-size: 11px; color: #888; margin-top: 8px; }

  @media print {
    body { background: white; margin: 0; }
    .no-print { display: none !important; }
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
