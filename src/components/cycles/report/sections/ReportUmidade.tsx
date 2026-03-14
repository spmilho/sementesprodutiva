import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const COLORS = ["#2E7D32", "#1565C0", "#EF6C00", "#7B1FA2", "#C62828", "#00838F"];

export default function ReportUmidade({ data }: { data: any }) {
  // Group by date, lines per gleba
  const glebas = [...new Set(data.umidade.map((u: any) => u.gleba))];
  const dateMap: Record<string, Record<string, number>> = {};
  data.umidade.forEach((u: any) => {
    const d = u.data || "N/A";
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d][u.gleba] = u.umidade_pct;
  });
  const chartData = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({ date, ...vals }));

  const avgMoisture = data.umidade.filter((u: any) => u.umidade_pct != null)
    .reduce((s: number, u: any) => s + u.umidade_pct, 0) / (data.umidade.filter((u: any) => u.umidade_pct != null).length || 1);

  return (
    <div className="report-section">
      <div className="section-title">🌡️ Umidade de Grão</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.umidade.length}</div>
          <div className="kpi-label">Amostras coletadas</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{avgMoisture.toFixed(1)}%</div>
          <div className="kpi-label">Umidade média</div>
        </div>
        {data.umidade_alvo && (
          <div className="kpi-card orange">
            <div className="kpi-value">{data.umidade_alvo}%</div>
            <div className="kpi-label">Umidade alvo</div>
          </div>
        )}
      </div>

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução da Umidade por Gleba</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {glebas.map((g, i) => (
                <Line key={g} type="monotone" dataKey={g} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
              {data.umidade_alvo && <ReferenceLine y={data.umidade_alvo} stroke="#C62828" strokeDasharray="5 5" label={{ value: `Alvo ${data.umidade_alvo}%`, fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead><tr><th>Data</th><th>Gleba</th><th>Umidade %</th><th>Estádio</th><th>Ponto</th></tr></thead>
        <tbody>
          {data.umidade.map((u: any, i: number) => (
            <tr key={i}>
              <td>{u.data || "—"}</td>
              <td>{u.gleba}</td>
              <td style={{ fontWeight: 600, color: u.umidade_pct > 25 ? "#C62828" : u.umidade_pct > 20 ? "#EF6C00" : "#2E7D32" }}>
                {u.umidade_pct?.toFixed(1) ?? "—"}%
              </td>
              <td>{u.estadio || "—"}</td>
              <td>{u.ponto || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
