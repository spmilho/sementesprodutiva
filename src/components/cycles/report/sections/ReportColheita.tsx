import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, ReferenceLine, ReferenceArea,
} from "recharts";
import { format, parseISO, differenceInDays, addDays } from "date-fns";

const COLORS = ["#1E88E5", "#4CAF50", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4", "#795548", "#607D8B"];
const MARGIN_DAYS = 7;

export default function ReportColheita({ data }: { data: any }) {
  const totalTons = data.colheita.reduce((s: number, c: any) => s + (c.tons || 0), 0);
  const totalArea = data.colheita.reduce((s: number, c: any) => s + (c.area || 0), 0);
  const totalLoads = data.colheita.reduce((s: number, c: any) => s + (c.cargas || 0), 0);

  let cum = 0;
  const chartData = data.colheita.map((c: any) => {
    cum += c.tons || 0;
    return { date: c.data || "—", "Acumulado (t)": +cum.toFixed(1) };
  });

  // ═══ Harvest Forecast ═══
  const cycleDays = data.ciclo_dias || 130;
  const rawPlantingActual = data._raw?.plantingActual || [];
  const rawPlantingPlan = data._raw?.plantingPlan || [];

  const femalePlantings = useMemo(() => {
    const actuals = rawPlantingActual.filter((p: any) => p.type === "female");
    const plans = rawPlantingPlan.filter((p: any) => p.type === "female");
    const source = actuals.length > 0 ? actuals : plans;

    const map = new Map<string, number>();
    for (const p of source) {
      const d = p.planting_date || p.planned_date;
      const area = Number(p.actual_area || p.planned_area) || 0;
      if (d) map.set(d, (map.get(d) || 0) + area);
    }
    return Array.from(map.entries())
      .map(([planting_date, area_ha]) => ({ planting_date, area_ha }))
      .sort((a, b) => a.planting_date.localeCompare(b.planting_date));
  }, [rawPlantingActual, rawPlantingPlan]);

  const forecast = useMemo(() => {
    if (!femalePlantings.length) return null;

    const windows = femalePlantings.map((p, i) => {
      const center = addDays(parseISO(p.planting_date), cycleDays);
      return {
        ...p,
        index: i,
        label: `P${i + 1}`,
        centerDate: format(center, "yyyy-MM-dd"),
        color: COLORS[i % COLORS.length],
      };
    });

    const windowStart = format(addDays(parseISO(femalePlantings[0].planting_date), cycleDays), "yyyy-MM-dd");
    const windowEnd = format(addDays(parseISO(femalePlantings[femalePlantings.length - 1].planting_date), cycleDays), "yyyy-MM-dd");
    const marginStart = format(addDays(parseISO(femalePlantings[0].planting_date), cycleDays - MARGIN_DAYS), "yyyy-MM-dd");
    const marginEnd = format(addDays(parseISO(femalePlantings[femalePlantings.length - 1].planting_date), cycleDays + MARGIN_DAYS), "yyyy-MM-dd");

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const daysToStart = differenceInDays(parseISO(windowStart), today);

    // Build chart data
    const chartStartDate = addDays(parseISO(marginStart), -5);
    const chartEndDate = addDays(parseISO(marginEnd), 5);
    const windowCenterReached = new Set<number>();
    const fData: any[] = [];
    let current = chartStartDate;
    let accHa = 0;

    while (current <= chartEndDate) {
      const dateStr = format(current, "yyyy-MM-dd");
      const dateLabel = format(current, "dd/MM");
      const entry: any = { date: dateStr, dateLabel, isToday: dateStr === todayStr };

      windows.forEach((w) => {
        const isCenter = dateStr === w.centerDate;
        entry[`p${w.index}`] = isCenter ? w.area_ha : 0;
        if (isCenter && !windowCenterReached.has(w.index)) {
          windowCenterReached.add(w.index);
          accHa += w.area_ha;
        }
      });

      entry.accHa = Math.round(accHa * 10) / 10;
      fData.push(entry);
      current = addDays(current, 1);
    }

    const totalFemaleArea = femalePlantings.reduce((s, p) => s + p.area_ha, 0);

    return {
      windows,
      windowStart,
      windowEnd,
      marginStart,
      marginEnd,
      daysToStart,
      totalFemaleArea,
      chartData: fData,
      todayLabel: fData.find(d => d.date === todayStr)?.dateLabel,
    };
  }, [femalePlantings, cycleDays]);

  return (
    <div className="report-section">
      <div className="section-title">🚛 Colheita</div>

      {/* ═══ Forecast Section ═══ */}
      {forecast && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card blue">
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {format(parseISO(forecast.windowStart), "dd/MM")} → {format(parseISO(forecast.windowEnd), "dd/MM")}
              </div>
              <div className="kpi-label">Janela Ideal (Ciclo {cycleDays}d)</div>
              <div className="kpi-sub">
                {forecast.daysToStart > 0
                  ? `Começa em ${forecast.daysToStart} dias`
                  : forecast.daysToStart === 0
                    ? "Começa HOJE"
                    : `Iniciou há ${Math.abs(forecast.daysToStart)} dias`}
              </div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {format(parseISO(forecast.marginStart), "dd/MM")} → {format(parseISO(forecast.marginEnd), "dd/MM")}
              </div>
              <div className="kpi-label">Margem ±{MARGIN_DAYS} dias</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ fontSize: 18 }}>{forecast.totalFemaleArea.toFixed(1)} ha</div>
              <div className="kpi-label">Área Fêmea</div>
              <div className="kpi-sub">{femalePlantings.length} lote(s)</div>
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-title">🌾 Previsão de Colheita (Ciclo {cycleDays} dias ± {MARGIN_DAYS})</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={forecast.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} height={30} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                <Tooltip />

                {/* Margin shading */}
                {(() => {
                  const mS = forecast.chartData.find((d: any) => d.date === forecast.marginStart)?.dateLabel;
                  const mE = forecast.chartData.find((d: any) => d.date === forecast.marginEnd)?.dateLabel;
                  if (!mS || !mE) return null;
                  return <ReferenceArea yAxisId="left" x1={mS} x2={mE} fill="#FF9800" fillOpacity={0.05} stroke="#FF9800" strokeOpacity={0.2} strokeDasharray="4 4" />;
                })()}

                {/* Ideal window shading */}
                {(() => {
                  const wS = forecast.chartData.find((d: any) => d.date === forecast.windowStart)?.dateLabel;
                  const wE = forecast.chartData.find((d: any) => d.date === forecast.windowEnd)?.dateLabel;
                  if (!wS || !wE) return null;
                  return <ReferenceArea yAxisId="left" x1={wS} x2={wE} fill="#4CAF50" fillOpacity={0.1} stroke="#4CAF50" strokeOpacity={0.4} />;
                })()}

                {/* Bars per planting */}
                {forecast.windows.map((w: any) => (
                  <Bar key={`bar-${w.index}`} yAxisId="left" dataKey={`p${w.index}`}
                    name={`${format(parseISO(w.planting_date), "dd/MM")} (${w.area_ha.toFixed(0)}ha)`}
                    fill={w.color} fillOpacity={0.85} stackId="ha" radius={[2, 2, 0, 0]} />
                ))}

                {/* Accumulated line */}
                <Line yAxisId="right" type="stepAfter" dataKey="accHa" name="ha acumulados"
                  stroke="#333" strokeWidth={2} strokeOpacity={0.6} dot={false} />

                {/* TODAY line */}
                {forecast.todayLabel && (
                  <ReferenceLine yAxisId="left" x={forecast.todayLabel} stroke="#E53935"
                    strokeDasharray="6 3" strokeWidth={3}
                    label={{ value: "HOJE", position: "top", fontSize: 11, fontWeight: "bold", fill: "#E53935", dy: -5 }} />
                )}

                {/* Center date labels */}
                {forecast.windows.map((w: any) => {
                  const cl = forecast.chartData.find((d: any) => d.date === w.centerDate)?.dateLabel;
                  if (!cl) return null;
                  return (
                    <ReferenceLine key={`cl-${w.index}`} yAxisId="left" x={cl} stroke={w.color} strokeWidth={2}
                      label={{ value: `${w.label} ${format(parseISO(w.centerDate), "dd/MM")}`, position: "insideTop", fontSize: 9, fontWeight: "bold", fill: w.color, dy: -20 }} />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", fontSize: 10, color: "#888", marginTop: 8 }}>
              <span>🟩 Janela ideal ({cycleDays}d)</span>
              <span>🟧 Margem ±{MARGIN_DAYS}d</span>
            </div>
          </div>
        </>
      )}

      {/* ═══ Actual Harvest Data ═══ */}
      {data.colheita.length > 0 && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{totalTons.toFixed(1)} t</div>
              <div className="kpi-label">Total colhido</div>
            </div>
            <div className="kpi-card blue">
              <div className="kpi-value">{totalArea.toFixed(1)} ha</div>
              <div className="kpi-label">Área colhida</div>
            </div>
            <div className="kpi-card orange">
              <div className="kpi-value">{totalLoads}</div>
              <div className="kpi-label">Cargas</div>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="chart-container">
              <div className="chart-title">Colheita Acumulada (t)</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Acumulado (t)" stroke="#EF6C00" fill="#FFE0B2" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th><th>Gleba</th><th>Área (ha)</th><th>Umidade %</th>
                <th>Cargas</th><th>Peso/carga (t)</th><th>Total (t)</th><th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {data.colheita.map((c: any, i: number) => (
                <tr key={i}>
                  <td>{c.data || "—"}</td>
                  <td>{c.gleba}</td>
                  <td>{c.area?.toFixed(1) ?? "—"}</td>
                  <td>{c.umidade ?? "—"}</td>
                  <td>{c.cargas ?? "—"}</td>
                  <td>{c.peso_carga?.toFixed(1) ?? "—"}</td>
                  <td style={{ fontWeight: 600 }}>{c.tons?.toFixed(1) ?? "—"}</td>
                  <td>{c.destino || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOTAL</td>
                <td>{totalArea.toFixed(1)}</td>
                <td></td>
                <td>{totalLoads}</td>
                <td></td>
                <td>{totalTons.toFixed(1)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </>
      )}
    </div>
  );
}
