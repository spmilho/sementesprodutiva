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
} from "recharts";

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDateBr(date: Date) {
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

  const dap = Number(data.desp_dap) > 0 ? Number(data.desp_dap) : 60;
  const margin = 5;

  const femalePlantingByDate = (data.plantio || [])
    .filter((p: any) => String(p.tipo || "").toLowerCase().includes("fême") || String(p.tipo || "").toLowerCase().includes("feme"))
    .reduce((acc: Record<string, number>, p: any) => {
      const key = p.data;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + (Number(p.area) || 0);
      return acc;
    }, {});

  const windows = Object.entries(femalePlantingByDate)
    .map(([dateBr, area], idx) => {
      const plantingDate = parseBrDate(dateBr);
      if (!plantingDate || !area) return null;
      const center = addDays(plantingDate, dap);
      const start = addDays(center, -margin);
      const end = addDays(center, margin);
      return {
        idx,
        label: `Plantio ${dateBr} (${Number(area).toFixed(0)}ha)`,
        area: Number(area),
        center,
        start,
        end,
        startBr: formatDateBr(start),
        centerBr: formatDateBr(center),
        endBr: formatDateBr(end),
      };
    })
    .filter(Boolean) as Array<any>;

  const colors = ["#1E88E5", "#4CAF50", "#FF9800", "#E91E63", "#9C27B0", "#00BCD4", "#795548"];

  const forecastData = (() => {
    if (windows.length === 0) return [];

    const minStart = new Date(Math.min(...windows.map((w) => w.start.getTime())));
    const maxEnd = new Date(Math.max(...windows.map((w) => w.end.getTime())));
    const start = addDays(minStart, -2);
    const end = addDays(maxEnd, 2);

    const rows: any[] = [];
    let cursor = new Date(start);
    let accHa = 0;

    while (cursor <= end) {
      const row: any = {
        dateBr: formatDateBr(cursor),
        totalHaDia: 0,
      };

      windows.forEach((w) => {
        const key = `w${w.idx}`;
        const active = cursor >= w.start && cursor <= w.end;
        row[key] = active ? w.area : 0;
        if (active) row.totalHaDia += w.area;
      });

      accHa += row.totalHaDia;
      row.haAcumulados = Number(accHa.toFixed(1));
      rows.push(row);

      cursor = addDays(cursor, 1);
    }

    return rows;
  })();

  const todayBr = formatDateBr(new Date());

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
      </div>

      {forecastData.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Janela de Despendoamento (±{margin} dias)</div>
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="dateBr" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "ha/dia", angle: -90, position: "insideLeft" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "ha acum", angle: 90, position: "insideRight" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />

              {windows.map((w, i) => (
                <Bar
                  key={w.idx}
                  yAxisId="left"
                  dataKey={`w${w.idx}`}
                  name={w.label}
                  fill={colors[i % colors.length]}
                  stackId="window"
                  radius={[2, 2, 0, 0]}
                />
              ))}

              <Line yAxisId="right" type="monotone" dataKey="haAcumulados" name="ha acumulados" stroke="#263238" strokeWidth={2.5} dot={false} />

              <ReferenceLine
                yAxisId="left"
                x={todayBr}
                stroke="#D32F2F"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{ value: "HOJE", position: "top", fontSize: 10, fill: "#D32F2F", fontWeight: 700 }}
              />
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
