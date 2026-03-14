import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportNDVI({ data }: { data: any }) {
  const chartData = [...data.ndvi_imagens].reverse().map((n: any) => ({
    date: n.data,
    "NDVI Médio": n.ndvi_medio,
    "NDVI Min": n.ndvi_min,
    "NDVI Max": n.ndvi_max,
  }));

  return (
    <div className="report-section">
      <div className="section-title">🛰️ NDVI</div>

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução do NDVI</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="NDVI Médio" stroke="#2E7D32" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="NDVI Min" stroke="#EF6C00" strokeDasharray="4 4" strokeWidth={1} dot={false} />
              <Line type="monotone" dataKey="NDVI Max" stroke="#1565C0" strokeDasharray="4 4" strokeWidth={1} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.ndvi_parecer && (
        <div className="highlight-box">
          <strong>Parecer Técnico NDVI:</strong><br />{data.ndvi_parecer}
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
