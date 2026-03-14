import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function ReportNDVI({ data }: { data: any }) {
  const chartData = [...data.ndvi_imagens].reverse().map((n: any) => ({
    date: n.data,
    "NDVI Médio": n.ndvi_medio,
    "NDVI Min": n.ndvi_min,
    "NDVI Max": n.ndvi_max,
  }));

  // Determine ideal NDVI range reference lines
  const hasData = chartData.length > 0;

  return (
    <div className="report-section">
      <div className="section-title">🛰️ NDVI — Monitoramento por Satélite</div>

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução do NDVI</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={0.7} stroke="#4CAF50" strokeDasharray="4 4" label={{ value: "Bom (0.70)", position: "right", fontSize: 9, fill: "#4CAF50" }} />
              <ReferenceLine y={0.4} stroke="#FF9800" strokeDasharray="4 4" label={{ value: "Atenção (0.40)", position: "right", fontSize: 9, fill: "#FF9800" }} />
              <Line type="monotone" dataKey="NDVI Max" stroke="#1565C0" strokeDasharray="4 4" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="NDVI Médio" stroke="#2E7D32" strokeWidth={2.5} dot={{ r: 4, fill: "#2E7D32" }} />
              <Line type="monotone" dataKey="NDVI Min" stroke="#EF6C00" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* KPIs */}
      {hasData && (() => {
        const lastNdvi = data.ndvi_imagens[0];
        const allMeans = data.ndvi_imagens.filter((n: any) => n.ndvi_medio != null).map((n: any) => n.ndvi_medio);
        const avgNdvi = allMeans.length > 0 ? allMeans.reduce((a: number, b: number) => a + b, 0) / allMeans.length : null;
        const maxNdvi = allMeans.length > 0 ? Math.max(...allMeans) : null;

        return (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{lastNdvi?.ndvi_medio?.toFixed(3) ?? "—"}</div>
              <div className="kpi-label">NDVI Atual</div>
              <div className="kpi-sub">{lastNdvi?.data || "—"}</div>
            </div>
            <div className="kpi-card blue">
              <div className="kpi-value">{avgNdvi?.toFixed(3) ?? "—"}</div>
              <div className="kpi-label">NDVI Médio</div>
              <div className="kpi-sub">{allMeans.length} imagens</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{maxNdvi?.toFixed(3) ?? "—"}</div>
              <div className="kpi-label">NDVI Máximo</div>
            </div>
          </div>
        );
      })()}

      {/* Parecer Técnico */}
      {data.ndvi_parecer && (
        <div className="highlight-box" style={{ whiteSpace: "pre-wrap" }}>
          <strong>📋 Parecer Técnico — Análise de Campo:</strong>
          <br /><br />
          {data.ndvi_parecer}
        </div>
      )}

      <table className="report-table">
        <thead><tr><th>Data</th><th>NDVI Médio</th><th>NDVI Min</th><th>NDVI Max</th></tr></thead>
        <tbody>
          {data.ndvi_imagens.map((n: any, i: number) => (
            <tr key={i}>
              <td>{n.data || "—"}</td>
              <td style={{ fontWeight: 600 }}>{n.ndvi_medio?.toFixed(3) ?? "—"}</td>
              <td>{n.ndvi_min?.toFixed(3) ?? "—"}</td>
              <td>{n.ndvi_max?.toFixed(3) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
