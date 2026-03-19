import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDateBr(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

function toLocalIsoKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateBrFull(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default function ReportDespendoamento({ data }: { data: any }) {
  const records = data.despendoamento || [];

  const chartData = records.map((d: any) => ({
    date: d.data || "—",
    "% Remanescente": d.pct_remanescente ?? null,
    "% Removido": d.pct_removido ?? null,
  }));

  const totalArea = records.reduce((s: number, d: any) => s + (Number(d.area) || 0), 0);

  const dap = Number(data.desp_dap) > 0 ? Number(data.desp_dap) : 55;

  // Extract female plantings grouped by date (use ISO dates when available)
  const femalePlantings: { date: Date; area: number }[] = [];
  const plantio = data.plantio || [];
  const seenDates = new Set<string>();

  plantio
    .filter((p: any) => {
      const t = String(p.tipo || "").toLowerCase();
      return t.includes("fême") || t.includes("feme") || t.includes("female");
    })
    .forEach((p: any) => {
      const dt = p.data_iso ? parseIsoDate(p.data_iso) : parseBrDate(p.data);
      if (!dt) return;
      const key = toLocalIsoKey(dt);
      if (seenDates.has(key)) {
        const existing = femalePlantings.find(f => toLocalIsoKey(f.date) === key);
        if (existing) existing.area += Number(p.area) || 0;
      } else {
        seenDates.add(key);
        femalePlantings.push({ date: dt, area: Number(p.area) || 0 });
      }
    });

  femalePlantings.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Compute windows: each planting date + DAP = center date
  const windows = femalePlantings.map((p, i) => {
    const center = addDays(p.date, dap);
    return {
      idx: i,
      label: `P${i + 1}`,
      plantingDate: p.date,
      area: p.area,
      centerDate: center,
      color: ["#1E88E5", "#4CAF50", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4", "#795548"][i % 7],
    };
  });

  // Unified window: DAP after first planting → DAP after last planting
  const windowStart = windows.length > 0 ? windows[0].centerDate : null;
  const windowEnd = windows.length > 0 ? windows[windows.length - 1].centerDate : null;

  // Build forecast chart data
  const forecastData = (() => {
    if (!windowStart || !windowEnd) return [];
    const chartStart = addDays(windowStart, -7);
    const chartEnd = addDays(windowEnd, 7);

    const rows: any[] = [];
    let cursor = new Date(chartStart);
    let accHa = 0;
    const centerReached = new Set<number>();

    while (cursor <= chartEnd) {
      const cursorKey = toLocalIsoKey(cursor);
      const row: any = { dateBr: formatDateBr(cursor), totalHaDia: 0 };

      windows.forEach((w) => {
        const centerKey = toLocalIsoKey(w.centerDate);
        const isCenter = cursorKey === centerKey;
        const key = `p${w.idx}`;
        row[key] = isCenter ? w.area : 0;
        if (isCenter) row.totalHaDia += w.area;
        if (isCenter && !centerReached.has(w.idx)) {
          centerReached.add(w.idx);
          accHa += w.area;
        }
      });

      row.haAcumulados = Math.round(accHa * 10) / 10;
      row.inWindow = cursor >= windowStart && cursor <= windowEnd;
      rows.push(row);
      cursor = addDays(cursor, 1);
    }
    return rows;
  })();

  const todayBr = formatDateBr(new Date());
  const windowStartLabel = windowStart ? formatDateBrFull(windowStart) : "";
  const windowEndLabel = windowEnd ? formatDateBrFull(windowEnd) : "";

  return (
    <div className="report-section">
      <div className="section-title">✂️ Despendoamento</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{records.length}</div>
          <div className="kpi-label">Passadas registradas</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{totalArea.toFixed(1)} ha</div>
          <div className="kpi-label">Área total trabalhada</div>
        </div>
        {records.length > 0 && records[records.length - 1].pct_remanescente != null && (
          <div className="kpi-card orange">
            <div className="kpi-value">{records[records.length - 1].pct_remanescente}%</div>
            <div className="kpi-label">% Remanescente (última)</div>
          </div>
        )}
        {windowStart && windowEnd && (
          <div className="kpi-card purple">
            <div className="kpi-value" style={{ fontSize: 16 }}>{windowStartLabel} → {windowEndLabel}</div>
            <div className="kpi-label">Janela de Despendoamento (DAP {dap})</div>
          </div>
        )}
      </div>

      {forecastData.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Previsão de Despendoamento (DAP {dap})</div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="dateBr" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "ha", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "ha acum.", angle: 90, position: "insideRight", fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />

              {/* Window shading */}
              {(() => {
                const startLbl = windowStart ? formatDateBr(windowStart) : null;
                const endLbl = windowEnd ? formatDateBr(windowEnd) : null;
                if (!startLbl || !endLbl) return null;
                return (
                  <ReferenceArea yAxisId="left" x1={startLbl} x2={endLbl} fill="#4CAF50" fillOpacity={0.08} stroke="#4CAF50" strokeOpacity={0.3} strokeWidth={1} />
                );
              })()}

              {/* ±5 day margin shading per planting */}
              {windows.map((w) => {
                const marginStartDate = addDays(w.centerDate, -5);
                const marginEndDate = addDays(w.centerDate, 5);
                const startLbl = formatDateBr(marginStartDate);
                const endLbl = formatDateBr(marginEndDate);
                return (
                  <ReferenceArea
                    key={`margin-${w.idx}`}
                    yAxisId="left"
                    x1={startLbl}
                    x2={endLbl}
                    fill={w.color}
                    fillOpacity={0.07}
                    stroke={w.color}
                    strokeOpacity={0.2}
                    strokeDasharray="4 2"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Center date lines */}
              {windows.map((w) => (
                <ReferenceLine
                  key={`center-${w.idx}`}
                  yAxisId="left"
                  x={formatDateBr(w.centerDate)}
                  stroke={w.color}
                  strokeWidth={2}
                  label={{ value: `${w.label} ${formatDateBr(w.centerDate)}`, position: "insideTop", fontSize: 9, fontWeight: "bold", fill: w.color, dy: -20 }}
                />
              ))}

              {/* Bars per planting */}
              {windows.map((w) => (
                <Bar
                  key={`bar-${w.idx}`}
                  yAxisId="left"
                  dataKey={`p${w.idx}`}
                  name={`${formatDateBrFull(w.plantingDate)} (${w.area.toFixed(0)}ha)`}
                  fill={w.color}
                  fillOpacity={0.85}
                  stackId="ha"
                  radius={[2, 2, 0, 0]}
                />
              ))}

              <Line yAxisId="right" type="stepAfter" dataKey="haAcumulados" name="ha acumulados" stroke="#263238" strokeWidth={2.5} dot={false} />

              <ReferenceLine yAxisId="left" x={todayBr} stroke="#D32F2F" strokeDasharray="6 4" strokeWidth={2} label={{ value: "HOJE", position: "top", fontSize: 10, fill: "#D32F2F", fontWeight: 700 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução do % Remanescente</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="% Remanescente" stroke="#C62828" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Passada</th><th>Data</th><th>Gleba</th><th>Área (ha)</th><th>Método</th>
            <th>Equipe</th><th>% Removido</th><th>% Reman.</th><th>Notas</th>
          </tr>
        </thead>
        <tbody>
          {records.map((d: any, i: number) => (
            <tr key={i}>
              <td>{d.passada || "—"}</td>
              <td>{d.data || "—"}</td>
              <td>{d.gleba || "—"}</td>
              <td>{d.area != null ? Number(d.area).toFixed(1) : "—"}</td>
              <td>{d.metodo || "—"}</td>
              <td>{d.equipe ?? "—"}</td>
              <td>{d.pct_removido != null ? `${d.pct_removido}%` : "—"}</td>
              <td>{d.pct_remanescente != null ? `${d.pct_remanescente}%` : "—"}</td>
              <td>{d.notas || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
