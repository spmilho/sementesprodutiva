import { useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PARENT_COLORS, PARENT_LABELS, PARENT_BG } from "./constants";

interface Props {
  milestones: any[];
  fixedPoints: any[];
}

function toDate(s: string | null): Date | null {
  return s ? new Date(s + "T12:00:00") : null;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return format(new Date(s + "T12:00:00"), "dd/MM");
}

function ParentBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
        PARENT_BG[type] || ""
      )}
    >
      {PARENT_LABELS[type] || type}
    </span>
  );
}

export default function MilestonesSection({ milestones, fixedPoints }: Props) {
  const tableData = useMemo(() => {
    const parentTypes = [...new Set(fixedPoints.map((fp: any) => fp.parent_type))].sort();
    return parentTypes.map((pt) => {
      const ptMilestones = milestones.filter((m: any) =>
        fixedPoints.some(
          (fp: any) => fp.id === m.fixed_point_id && fp.parent_type === pt
        )
      );
      const isMale = pt.startsWith("male");

      // Get the earliest/latest across fixed points of this type
      let startDate: string | null = null;
      let fiftyDate: string | null = null;
      let endDate: string | null = null;

      for (const m of ptMilestones) {
        const s = isMale ? m.anthesis_start_date : m.silk_start_date;
        const f = isMale ? m.anthesis_50pct_date : m.silk_50pct_date;
        const e = isMale ? m.anthesis_end_date : m.silk_end_date;
        if (s && (!startDate || s < startDate)) startDate = s;
        if (f && (!fiftyDate || f < fiftyDate)) fiftyDate = f;
        if (e && (!endDate || e > endDate)) endDate = e;
      }

      const duration =
        startDate && endDate
          ? differenceInDays(toDate(endDate)!, toDate(startDate)!) + 1
          : null;

      return {
        parentType: pt,
        label: PARENT_LABELS[pt] || pt,
        startDate,
        fiftyDate,
        endDate,
        duration,
        isMale,
      };
    });
  }, [milestones, fixedPoints]);

  // Gap calculations
  const gapCalcs = useMemo(() => {
    const female = tableData.find((r) => r.parentType === "female");
    if (!female?.fiftyDate) return [];

    return tableData
      .filter((r) => r.parentType.startsWith("male") && r.fiftyDate)
      .map((male) => {
        const femaleFifty = toDate(female.fiftyDate)!;
        const maleFifty = toDate(male.fiftyDate)!;
        const gapDays = differenceInDays(maleFifty, femaleFifty);
        let desc = "";
        if (gapDays === 0) desc = `${male.label} e Fêmea atingiram 50% no MESMO dia ✅`;
        else if (gapDays > 0)
          desc = `${male.label} atingiu 50% antese ${gapDays} dia(s) APÓS fêmea atingir 50% emissão`;
        else
          desc = `${male.label} atingiu 50% antese ${Math.abs(gapDays)} dia(s) ANTES da fêmea atingir 50% emissão`;

        return { male: male.label, gapDays, desc };
      });
  }, [tableData]);

  // Overlap calculation
  const overlapDays = useMemo(() => {
    const female = tableData.find((r) => r.parentType === "female");
    if (!female?.startDate || !female?.endDate) return null;

    const fStart = toDate(female.startDate)!;
    const fEnd = toDate(female.endDate)!;

    let maxOverlap = 0;
    for (const male of tableData.filter((r) => r.parentType.startsWith("male"))) {
      if (!male.startDate || !male.endDate) continue;
      const mStart = toDate(male.startDate)!;
      const mEnd = toDate(male.endDate)!;
      const oStart = fStart > mStart ? fStart : mStart;
      const oEnd = fEnd < mEnd ? fEnd : mEnd;
      const overlap = differenceInDays(oEnd, oStart) + 1;
      if (overlap > maxOverlap) maxOverlap = overlap;
    }
    return maxOverlap > 0 ? maxOverlap : 0;
  }, [tableData]);

  if (tableData.length === 0 || milestones.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Milestones Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">📋 Marcos Fenológicos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left text-muted-foreground font-medium text-xs">
                    Parental
                  </th>
                  <th className="p-2 text-center text-muted-foreground font-medium text-xs">
                    Início
                  </th>
                  <th className="p-2 text-center text-muted-foreground font-medium text-xs">
                    50%
                  </th>
                  <th className="p-2 text-center text-muted-foreground font-medium text-xs">
                    Fim
                  </th>
                  <th className="p-2 text-center text-muted-foreground font-medium text-xs">
                    Duração
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row) => (
                  <tr key={row.parentType} className="border-b last:border-0">
                    <td className="p-2">
                      <ParentBadge type={row.parentType} />
                    </td>
                    <td className="p-2 text-center font-medium text-xs">
                      {fmtDate(row.startDate)}
                    </td>
                    <td className="p-2 text-center font-medium text-xs">
                      {fmtDate(row.fiftyDate)}
                    </td>
                    <td className="p-2 text-center font-medium text-xs">
                      {fmtDate(row.endDate)}
                    </td>
                    <td className="p-2 text-center font-medium text-xs">
                      {row.duration ? `${row.duration} dias` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gap calculations */}
          {(gapCalcs.length > 0 || overlapDays != null) && (
            <div className="mt-4 space-y-2 border-t pt-3">
              {gapCalcs.map((g, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-xs",
                    Math.abs(g.gapDays) <= 2
                      ? "text-green-700 dark:text-green-400"
                      : Math.abs(g.gapDays) <= 5
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400"
                  )}
                >
                  📐 {g.desc}
                </p>
              ))}
              {overlapDays != null && (
                <p
                  className={cn(
                    "text-xs font-semibold",
                    overlapDays >= 5
                      ? "text-green-700 dark:text-green-400"
                      : overlapDays > 0
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400"
                  )}
                >
                  🔗 Nicking efetivo: {overlapDays} dias de sobreposição real
                  entre pólen e receptividade
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Stepper */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">🔄 Timeline de Marcos</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {tableData.map((row) => {
            const milestoneItems = row.isMale
              ? [
                  { label: "Início antese", date: row.startDate, key: "start" },
                  { label: "50% antese", date: row.fiftyDate, key: "fifty" },
                  { label: "Fim emissão", date: row.endDate, key: "end" },
                ]
              : [
                  { label: "Início emissão", date: row.startDate, key: "start" },
                  { label: "50% emissão", date: row.fiftyDate, key: "fifty" },
                  { label: "Fim recep.", date: row.endDate, key: "end" },
                ];

            const color = PARENT_COLORS[row.parentType] || "#888";

            return (
              <div key={row.parentType} className="flex items-center gap-3">
                <div
                  className="w-[70px] shrink-0 text-xs font-semibold"
                  style={{ color }}
                >
                  {row.label}
                </div>
                <div className="flex-1 flex items-center">
                  {milestoneItems.map((item, i) => (
                    <div key={item.key} className="flex items-center flex-1">
                      {/* Connector line */}
                      {i > 0 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            backgroundColor: item.date ? color : "#d1d5db",
                            opacity: item.date ? 0.6 : 0.3,
                          }}
                        />
                      )}
                      {/* Circle */}
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            item.date ? "scale-110" : ""
                          )}
                          style={{
                            borderColor: color,
                            backgroundColor: item.date ? color : "transparent",
                          }}
                        >
                          {item.date && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                          {item.label}
                        </span>
                        <span
                          className="text-[9px] font-semibold whitespace-nowrap"
                          style={{ color: item.date ? color : "#9e9e9e" }}
                        >
                          {item.date ? fmtDate(item.date) : "—"}
                        </span>
                      </div>
                      {/* Trailing connector */}
                      {i < milestoneItems.length - 1 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            backgroundColor: milestoneItems[i + 1]?.date
                              ? color
                              : "#d1d5db",
                            opacity: milestoneItems[i + 1]?.date ? 0.6 : 0.3,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
