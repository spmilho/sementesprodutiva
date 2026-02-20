import { useCallback, useRef } from "react";
import { format } from "date-fns";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx-republish";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  PARENT_LABELS,
  MALE_TASSEL_STAGE_LABELS,
  FEMALE_SILK_STAGE_LABELS,
  WATER_STRESS_OPTIONS,
  POLLEN_INTENSITY,
} from "./constants";

interface CycleInfo {
  contractNumber?: string;
  pivotName: string;
  hybridName: string;
  cooperatorName?: string;
  farmName?: string;
  season?: string;
}

interface Props {
  observations: any[];
  allReadings: any[];
  fixedPoints: any[];
  milestones: any[];
  cycleInfo: CycleInfo;
  floweringChartRef: React.RefObject<HTMLDivElement>;
  ganttChartRef: React.RefObject<HTMLDivElement>;
}

export default function NickingExport({
  observations,
  allReadings,
  fixedPoints,
  milestones,
  cycleInfo,
  floweringChartRef,
  ganttChartRef,
}: Props) {
  const exportExcel = useCallback(() => {
    try {
      const wb = XLSX.utils.book_new();

      // Tab 1: Observações
      const obsRows = observations.map((obs: any) => {
        const readings = allReadings.filter((r: any) => r.observation_id === obs.id);
        const readingSummaries = readings.map((r: any) => {
          const fp = fixedPoints.find((f: any) => f.id === r.fixed_point_id);
          const label = PARENT_LABELS[r.parent_type] || r.parent_type;
          if (r.parent_type.startsWith("male")) {
            return `${label} (${fp?.name || "—"}): ${r.male_pollen_release_pct ?? 0}% pólen, ${
              MALE_TASSEL_STAGE_LABELS[r.male_tassel_stage] || "—"
            }`;
          }
          return `${label} (${fp?.name || "—"}): ${r.female_silk_receptive_pct ?? 0}% receptivo, ${
            FEMALE_SILK_STAGE_LABELS[r.female_silk_stage] || "—"
          }`;
        });

        return {
          Data: obs.observation_date,
          Hora: obs.observation_time || "",
          Observador: obs.observer_name || "",
          "Temp Máx °C": obs.temp_max_c ?? "",
          "Temp Mín °C": obs.temp_min_c ?? "",
          "GDU Acumulado": obs.gdu_accumulated ?? "",
          "Estresse Hídrico":
            WATER_STRESS_OPTIONS.find((w) => w.value === obs.water_stress)?.label || "",
          "Status Sincronismo": obs.overall_synchrony_status || "",
          Leituras: readingSummaries.join(" | "),
          "Ação Tomada": obs.action_taken || "",
          "Notas Técnicas": obs.technical_notes || "",
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(obsRows);
      XLSX.utils.book_append_sheet(wb, ws1, "Observações");

      // Tab 2: Marcos
      const marcosRows = fixedPoints.map((fp: any) => {
        const m = milestones.find((ms: any) => ms.fixed_point_id === fp.id);
        const isMale = fp.parent_type.startsWith("male");
        return {
          Ponto: fp.name,
          Tipo: PARENT_LABELS[fp.parent_type] || fp.parent_type,
          "Início Antese/Silk": isMale
            ? m?.anthesis_start_date || ""
            : m?.silk_start_date || "",
          "50%": isMale
            ? m?.anthesis_50pct_date || ""
            : m?.silk_50pct_date || "",
          "Fim": isMale
            ? m?.anthesis_end_date || ""
            : m?.silk_end_date || "",
        };
      });
      const ws2 = XLSX.utils.json_to_sheet(marcosRows);
      XLSX.utils.book_append_sheet(wb, ws2, "Marcos");

      // Tab 3: Métricas
      const metricsRows = [
        { Métrica: "Total Observações", Valor: observations.length },
        { Métrica: "Pontos Fixos", Valor: fixedPoints.length },
        {
          Métrica: "Último GDU",
          Valor: observations[0]?.gdu_accumulated ?? "—",
        },
      ];
      const ws3 = XLSX.utils.json_to_sheet(metricsRows);
      XLSX.utils.book_append_sheet(wb, ws3, "Métricas");

      XLSX.writeFile(
        wb,
        `nicking_${cycleInfo.contractNumber || cycleInfo.pivotName}_${format(new Date(), "yyyyMMdd")}.xlsx`
      );
      toast.success("Excel exportado!");
    } catch (err: any) {
      toast.error("Erro ao exportar: " + err.message);
    }
  }, [observations, allReadings, fixedPoints, milestones, cycleInfo]);

  const exportPdf = useCallback(async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Relatório de Nicking — Sincronismo Floral", pageWidth / 2, y, {
        align: "center",
      });
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const headerLines = [
        `Ciclo: ${cycleInfo.contractNumber || cycleInfo.pivotName}`,
        `Híbrido: ${cycleInfo.hybridName}`,
        cycleInfo.cooperatorName ? `Cooperado: ${cycleInfo.cooperatorName}` : "",
        cycleInfo.farmName ? `Fazenda: ${cycleInfo.farmName}` : "",
        `Data: ${format(new Date(), "dd/MM/yyyy")}`,
      ].filter(Boolean);
      for (const line of headerLines) {
        pdf.text(line, 14, y);
        y += 5;
      }
      y += 5;

      // Marcos table
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Marcos Fenológicos", 14, y);
      y += 3;

      const marcosTableData = fixedPoints.map((fp: any) => {
        const m = milestones.find((ms: any) => ms.fixed_point_id === fp.id);
        const isMale = fp.parent_type.startsWith("male");
        return [
          fp.name,
          PARENT_LABELS[fp.parent_type] || fp.parent_type,
          isMale ? m?.anthesis_start_date || "—" : m?.silk_start_date || "—",
          isMale ? m?.anthesis_50pct_date || "—" : m?.silk_50pct_date || "—",
          isMale ? m?.anthesis_end_date || "—" : m?.silk_end_date || "—",
        ];
      });

      autoTable(pdf, {
        startY: y,
        head: [["Ponto", "Tipo", "Início", "50%", "Fim"]],
        body: marcosTableData,
        theme: "striped",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 136, 229] },
      });
      y = (pdf as any).lastAutoTable.finalY + 10;

      // Capture charts
      for (const [ref, title] of [
        [floweringChartRef, "Curvas de Florescimento"],
        [ganttChartRef, "Janela de Polinização"],
      ] as const) {
        if (ref.current) {
          try {
            const canvas = await html2canvas(ref.current, {
              scale: 2,
              useCORS: true,
              backgroundColor: "#ffffff",
            });
            const imgData = canvas.toDataURL("image/png");
            const imgWidth = pageWidth - 28;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;

            if (y + imgHeight > pdf.internal.pageSize.getHeight() - 20) {
              pdf.addPage();
              y = 20;
            }

            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.text(title, 14, y);
            y += 5;
            pdf.addImage(imgData, "PNG", 14, y, imgWidth, imgHeight);
            y += imgHeight + 10;
          } catch {
            // Chart capture failed, skip
          }
        }
      }

      // Latest observations
      if (y + 30 > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Últimas Observações", 14, y);
      y += 3;

      const obsTableData = observations.slice(0, 10).map((obs: any) => [
        obs.observation_date,
        obs.observation_time || "",
        obs.overall_synchrony_status || "",
        obs.temp_max_c ? `${obs.temp_min_c}–${obs.temp_max_c}°C` : "",
        obs.gdu_accumulated ?? "",
        obs.action_taken || "",
      ]);

      autoTable(pdf, {
        startY: y,
        head: [["Data", "Hora", "Status", "Temp", "GDU", "Ação"]],
        body: obsTableData,
        theme: "striped",
        styles: { fontSize: 7 },
        headStyles: { fillColor: [30, 136, 229] },
      });

      pdf.save(
        `nicking_${cycleInfo.contractNumber || cycleInfo.pivotName}_${format(new Date(), "yyyyMMdd")}.pdf`
      );
      toast.success("PDF gerado!");
    } catch (err: any) {
      toast.error("Erro ao gerar PDF: " + err.message);
    }
  }, [
    observations,
    fixedPoints,
    milestones,
    cycleInfo,
    floweringChartRef,
    ganttChartRef,
  ]);

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportExcel}>
        <FileSpreadsheet className="h-4 w-4" />
        Exportar Excel
      </Button>
      <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={exportPdf}>
        <FileText className="h-4 w-4" />
        Gerar PDF Nicking
      </Button>
    </div>
  );
}
