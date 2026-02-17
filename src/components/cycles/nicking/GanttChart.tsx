import { useMemo, useState } from "react";
import { format, differenceInDays, min as dateMin, max as dateMax, addDays, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PARENT_COLORS, PARENT_LABELS } from "./constants";
import React from "react";

interface Props {
  milestones: any[];
  fixedPoints: any[];
  femalePlantingDate: string | null;
  malePlantingDates: Record<string, string>; // male_1 -> earliest planting date
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  return new Date(s + "T12:00:00");
}

interface BarSegment {
  start: Date;
  end: Date;
  color: string;
  opacity: number;
  label: string;
}

interface ParentalRow {
  parentType: string;
  label: string;
  segments: BarSegment[];
  activeDays: number;
}

const GanttChart = React.forwardRef<HTMLDivElement, Props>(
  ({ milestones, fixedPoints, femalePlantingDate, malePlantingDates }, ref) => {
    const [xAxisMode, setXAxisMode] = useState<"dates" | "dap">("dates");

    const { rows, dateRange, overlapBands, gapBands } = useMemo(() => {
      const parentTypes = [...new Set(fixedPoints.map((fp: any) => fp.parent_type))].sort();
      const rows: ParentalRow[] = [];
      const allDates: Date[] = [];

      for (const pt of parentTypes) {
        const ptMilestones = milestones.filter(
          (m: any) =>
            fixedPoints.some(
              (fp: any) => fp.id === m.fixed_point_id && fp.parent_type === pt
            )
        );
        if (ptMilestones.length === 0) continue;

        const isMale = pt.startsWith("male");
        // Get earliest milestone dates across all fixed points of this type
        const starts = ptMilestones.map((m: any) =>
          toDate(isMale ? m.anthesis_start_date : m.silk_start_date)
        ).filter(Boolean) as Date[];
        const ends = ptMilestones.map((m: any) =>
          toDate(isMale ? m.anthesis_end_date : m.silk_end_date)
        ).filter(Boolean) as Date[];
        const fifties = ptMilestones.map((m: any) =>
          toDate(isMale ? m.anthesis_50pct_date : m.silk_50pct_date)
        ).filter(Boolean) as Date[];

        const activeStart = starts.length > 0 ? dateMin(starts) : null;
        const activeEnd = ends.length > 0 ? dateMax(ends) : null;

        // Planting date for vegetative phase
        const plantingStr = isMale ? malePlantingDates[pt] : femalePlantingDate;
        const plantingDate = plantingStr ? new Date(plantingStr + "T12:00:00") : null;

        const color = PARENT_COLORS[pt] || "#888";
        const segments: BarSegment[] = [];

        if (plantingDate && activeStart) {
          segments.push({
            start: plantingDate,
            end: subDays(activeStart, 1),
            color: "#9e9e9e",
            opacity: 0.4,
            label: "Vegetativo",
          });
          allDates.push(plantingDate);
        }

        if (activeStart) {
          const endDate = activeEnd || addDays(activeStart, 10);
          segments.push({
            start: activeStart,
            end: endDate,
            color,
            opacity: 1,
            label: isMale ? "Período pólen ativo" : "Receptividade",
          });
          allDates.push(activeStart, endDate);
        }

        if (activeEnd) {
          segments.push({
            start: addDays(activeEnd, 1),
            end: addDays(activeEnd, 5),
            color,
            opacity: 0.25,
            label: isMale ? "Declínio" : "Estigma seco",
          });
          allDates.push(addDays(activeEnd, 5));
        }

        const activeDays =
          activeStart && activeEnd
            ? differenceInDays(activeEnd, activeStart) + 1
            : 0;

        rows.push({ parentType: pt, label: PARENT_LABELS[pt] || pt, segments, activeDays });
      }

      // Date range
      const rangeStart = allDates.length > 0 ? subDays(dateMin(allDates), 3) : new Date();
      const rangeEnd = allDates.length > 0 ? addDays(dateMax(allDates), 3) : addDays(new Date(), 30);

      // Compute overlap bands
      const femaleRow = rows.find((r) => r.parentType === "female");
      const maleRows = rows.filter((r) => r.parentType.startsWith("male"));
      const overlapBands: { start: Date; end: Date; days: number }[] = [];
      const gapBands: { start: Date; end: Date; days: number }[] = [];

      if (femaleRow && maleRows.length > 0) {
        const fActive = femaleRow.segments.find((s) => s.opacity === 1);
        if (fActive) {
          let hasOverlap = false;
          for (const mr of maleRows) {
            const mActive = mr.segments.find((s) => s.opacity === 1);
            if (mActive) {
              const oStart = dateMax([fActive.start, mActive.start]);
              const oEnd = dateMin([fActive.end, mActive.end]);
              if (oStart <= oEnd) {
                overlapBands.push({
                  start: oStart,
                  end: oEnd,
                  days: differenceInDays(oEnd, oStart) + 1,
                });
                hasOverlap = true;
              }
            }
          }
          if (!hasOverlap) {
            // Check for gap: female active but no male active overlap
            const maleEnds = maleRows
              .map((r) => r.segments.find((s) => s.opacity === 1)?.end)
              .filter(Boolean) as Date[];
            const maleStarts = maleRows
              .map((r) => r.segments.find((s) => s.opacity === 1)?.start)
              .filter(Boolean) as Date[];
            if (maleEnds.length > 0) {
              const latestMaleEnd = dateMax(maleEnds);
              if (latestMaleEnd < fActive.start) {
                gapBands.push({
                  start: latestMaleEnd,
                  end: fActive.start,
                  days: differenceInDays(fActive.start, latestMaleEnd),
                });
              }
            }
            if (maleStarts.length > 0) {
              const earliestMaleStart = dateMin(maleStarts);
              if (earliestMaleStart > fActive.end) {
                gapBands.push({
                  start: fActive.end,
                  end: earliestMaleStart,
                  days: differenceInDays(earliestMaleStart, fActive.end),
                });
              }
            }
          }
        }
      }

      return {
        rows,
        dateRange: { start: rangeStart, end: rangeEnd },
        overlapBands,
        gapBands,
      };
    }, [milestones, fixedPoints, femalePlantingDate, malePlantingDates]);

    const totalDays = differenceInDays(dateRange.end, dateRange.start) || 1;

    const pct = (d: Date) => {
      const days = differenceInDays(d, dateRange.start);
      return Math.max(0, Math.min(100, (days / totalDays) * 100));
    };

    const dap = (d: Date) => {
      if (!femalePlantingDate) return "";
      return `DAP ${differenceInDays(d, new Date(femalePlantingDate + "T12:00:00"))}`;
    };

    // Date ticks for x-axis
    const dateTicks = useMemo(() => {
      const ticks: Date[] = [];
      const step = Math.max(1, Math.floor(totalDays / 8));
      for (let i = 0; i <= totalDays; i += step) {
        ticks.push(addDays(dateRange.start, i));
      }
      return ticks;
    }, [dateRange, totalDays]);

    if (rows.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Registre marcos fenológicos para visualizar a janela de polinização.
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-4 space-y-3" ref={ref}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              📊 Janela de Polinização (Gantt)
            </p>
            <div className="flex gap-1 bg-muted rounded-md p-0.5">
              <Button
                variant={xAxisMode === "dates" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setXAxisMode("dates")}
              >
                Datas
              </Button>
              <Button
                variant={xAxisMode === "dap" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setXAxisMode("dap")}
                disabled={!femalePlantingDate}
              >
                DAP
              </Button>
            </div>
          </div>

          <div className="relative">
            {/* Overlap / gap bands */}
            <TooltipProvider>
              {overlapBands.map((band, i) => (
                <Tooltip key={`o-${i}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-8 z-10 pointer-events-auto"
                      style={{
                        left: `calc(100px + ${pct(band.start)}% * (100% - 100px) / 100)`,
                        width: `calc(${pct(band.end) - pct(band.start)}% * (100% - 100px) / 100)`,
                        backgroundColor: "rgba(76,175,80,0.15)",
                        borderLeft: "2px solid rgba(76,175,80,0.4)",
                        borderRight: "2px solid rgba(76,175,80,0.4)",
                      }}
                    >
                      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap" style={{ color: "#4CAF50" }}>
                        Janela: {band.days}d
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Janela de polinização efetiva: {format(band.start, "dd/MM")} a{" "}
                      {format(band.end, "dd/MM")} ({band.days} dias)
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {gapBands.map((band, i) => (
                <Tooltip key={`g-${i}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-8 z-10 pointer-events-auto"
                      style={{
                        left: `calc(100px + ${pct(band.start)}% * (100% - 100px) / 100)`,
                        width: `calc(${pct(band.end) - pct(band.start)}% * (100% - 100px) / 100)`,
                        backgroundColor: "rgba(244,67,54,0.15)",
                        borderLeft: "2px solid rgba(244,67,54,0.4)",
                        borderRight: "2px solid rgba(244,67,54,0.4)",
                      }}
                    >
                      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold whitespace-nowrap" style={{ color: "#F44336" }}>
                        Gap: {band.days}d ⚠️
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Gap de polinização: {format(band.start, "dd/MM")} a{" "}
                      {format(band.end, "dd/MM")} ({band.days} dias) ⚠️
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {/* Rows */}
            {rows.map((row) => (
              <div key={row.parentType} className="flex items-center h-10 relative">
                <div
                  className="w-[100px] shrink-0 text-xs font-semibold truncate pr-2 text-right"
                  style={{ color: PARENT_COLORS[row.parentType] }}
                >
                  {row.label}
                </div>
                <div className="flex-1 relative h-6 bg-muted/30 rounded">
                  <TooltipProvider>
                    {row.segments.map((seg, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-0 h-full rounded-sm"
                            style={{
                              left: `${pct(seg.start)}%`,
                              width: `${Math.max(1, pct(seg.end) - pct(seg.start))}%`,
                              backgroundColor: seg.color,
                              opacity: seg.opacity,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {row.label} — {seg.label}: {format(seg.start, "dd/MM")} a{" "}
                            {format(seg.end, "dd/MM")} (
                            {differenceInDays(seg.end, seg.start) + 1} dias)
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            ))}

            {/* X-axis ticks */}
            <div className="flex items-center h-6 ml-[100px]">
              <div className="flex-1 relative">
                {dateTicks.map((d, i) => (
                  <span
                    key={i}
                    className="absolute text-[9px] text-muted-foreground -translate-x-1/2"
                    style={{ left: `${pct(d)}%` }}
                  >
                    {xAxisMode === "dap" ? dap(d) : format(d, "dd/MM")}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

GanttChart.displayName = "GanttChart";
export default GanttChart;
