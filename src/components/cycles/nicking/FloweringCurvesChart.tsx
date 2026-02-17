import { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceArea, ReferenceLine, Brush,
} from "recharts";
import { PARENT_COLORS, PARENT_LABELS } from "./constants";
import React from "react";

interface Props {
  observations: any[];
  allReadings: any[];
  activeParentTypes: string[];
  femalePlantingDate: string | null;
}

const FloweringCurvesChart = React.forwardRef<HTMLDivElement, Props>(
  ({ observations, allReadings, activeParentTypes, femalePlantingDate }, ref) => {
    const [xAxisMode, setXAxisMode] = useState<"dates" | "dap">("dates");

    const chartData = useMemo(() => {
      if (!observations.length || !allReadings.length) return [];
      const sorted = [...observations].sort((a, b) =>
        a.observation_date.localeCompare(b.observation_date)
      );
      return sorted.map((obs) => {
        const readings = allReadings.filter((r: any) => r.observation_id === obs.id);
        const point: any = {
          date: format(new Date(obs.observation_date + "T12:00:00"), "dd/MM"),
          dap: femalePlantingDate
            ? differenceInDays(
                new Date(obs.observation_date + "T12:00:00"),
                new Date(femalePlantingDate + "T12:00:00")
              )
            : null,
        };
        for (const type of ["female", "male_1", "male_2", "male_3"]) {
          const tr = readings.filter((r: any) => r.parent_type === type);
          if (tr.length > 0) {
            const vals = tr.map((r: any) =>
              type === "female"
                ? r.female_silk_receptive_pct || 0
                : r.male_pollen_release_pct || 0
            );
            point[type] = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
          }
        }
        return point;
      });
    }, [observations, allReadings, femalePlantingDate]);

    const zones = useMemo(() => {
      const result: { type: "overlap" | "gap"; startIdx: number; endIdx: number }[] = [];
      let i = 0;
      while (i < chartData.length) {
        const d = chartData[i];
        const fv = d.female ?? 0;
        const mm = Math.max(d.male_1 ?? 0, d.male_2 ?? 0, d.male_3 ?? 0);
        if (fv > 30 && mm > 30) {
          const start = i;
          while (i < chartData.length) {
            const dd = chartData[i];
            if (
              (dd.female ?? 0) > 30 &&
              Math.max(dd.male_1 ?? 0, dd.male_2 ?? 0, dd.male_3 ?? 0) > 30
            )
              i++;
            else break;
          }
          result.push({ type: "overlap", startIdx: start, endIdx: i - 1 });
        } else if (fv > 30 && mm <= 30) {
          const start = i;
          while (i < chartData.length) {
            const dd = chartData[i];
            if (
              (dd.female ?? 0) > 30 &&
              Math.max(dd.male_1 ?? 0, dd.male_2 ?? 0, dd.male_3 ?? 0) <= 30
            )
              i++;
            else break;
          }
          result.push({ type: "gap", startIdx: start, endIdx: i - 1 });
        } else {
          i++;
        }
      }
      return result;
    }, [chartData]);

    const xKey = xAxisMode === "dap" ? "dap" : "date";

    if (chartData.length < 2) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Registre pelo menos 2 observações para visualizar as curvas de florescimento.
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-4 space-y-3" ref={ref}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              📈 Curvas de Florescimento
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

          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey={xKey}
                className="text-xs"
                label={
                  xAxisMode === "dap"
                    ? { value: "Dias Após Plantio", position: "insideBottom", offset: -5, fontSize: 10 }
                    : undefined
                }
              />
              <YAxis
                domain={[0, 100]}
                className="text-xs"
                tickFormatter={(v) => `${v}%`}
                label={{ value: "% Florescimento", angle: -90, position: "insideLeft", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-xs space-y-1">
                      <p className="font-medium">
                        {d?.date}
                        {d?.dap != null ? ` · DAP ${d.dap}` : ""}
                      </p>
                      {payload.map((p: any) => (
                        <p key={p.dataKey} style={{ color: p.color }}>
                          {PARENT_LABELS[p.dataKey] || p.dataKey}:{" "}
                          {p.value?.toFixed(1)}%
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-xs cursor-pointer">{value}</span>
                )}
              />
              <ReferenceLine
                y={50}
                stroke="#9e9e9e"
                strokeDasharray="8 4"
                label={{
                  value: "50%",
                  position: "right",
                  fontSize: 10,
                  fill: "#9e9e9e",
                }}
              />

              {zones.map((z, i) => (
                <ReferenceArea
                  key={i}
                  x1={chartData[z.startIdx]?.[xKey]}
                  x2={chartData[z.endIdx]?.[xKey]}
                  fill={
                    z.type === "overlap"
                      ? "rgba(76,175,80,0.15)"
                      : "rgba(244,67,54,0.15)"
                  }
                  strokeOpacity={0}
                />
              ))}

              {activeParentTypes.includes("female") && (
                <Line
                  type="monotone"
                  dataKey="female"
                  name={PARENT_LABELS.female}
                  stroke={PARENT_COLORS.female}
                  strokeWidth={3}
                  dot={{ r: 4, fill: PARENT_COLORS.female }}
                  connectNulls
                />
              )}
              {activeParentTypes.includes("male_1") && (
                <Line
                  type="monotone"
                  dataKey="male_1"
                  name={PARENT_LABELS.male_1}
                  stroke={PARENT_COLORS.male_1}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PARENT_COLORS.male_1 }}
                  connectNulls
                />
              )}
              {activeParentTypes.includes("male_2") && (
                <Line
                  type="monotone"
                  dataKey="male_2"
                  name={PARENT_LABELS.male_2}
                  stroke={PARENT_COLORS.male_2}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PARENT_COLORS.male_2 }}
                  connectNulls
                />
              )}
              {activeParentTypes.includes("male_3") && (
                <Line
                  type="monotone"
                  dataKey="male_3"
                  name={PARENT_LABELS.male_3}
                  stroke={PARENT_COLORS.male_3}
                  strokeWidth={2}
                  dot={{ r: 3, fill: PARENT_COLORS.male_3 }}
                  connectNulls
                />
              )}

              <Brush
                dataKey={xKey}
                height={25}
                stroke="hsl(var(--primary))"
              />
            </ComposedChart>
          </ResponsiveContainer>

          <p className="text-[10px] text-center text-muted-foreground">
            🟢 Verde = zona de polinização efetiva (fêmea e macho &gt; 30%) · 🔴
            Vermelho = gap (fêmea receptiva sem pólen)
          </p>
        </CardContent>
      </Card>
    );
  }
);

FloweringCurvesChart.displayName = "FloweringCurvesChart";
export default FloweringCurvesChart;
