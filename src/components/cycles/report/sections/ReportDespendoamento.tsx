import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportDespendoamento({ data }: { data: any }) {
  const chartData = data.despendoamento.map((d: any) => ({
    date: d.data || "—",
    "% Remanescente": d.pct_remanescente ?? null,
    "% Removido": d.pct_removido ?? null,
  }));

  const totalArea = data.despendoamento.reduce((s: number, d: any) => s + (d.area || 0), 0);

  return (
    <div className="report-section">
      <div className="section-title">✂️ Despendoamento</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.despendoamento.length}</div>
          <div className="kpi-label">Passadas registradas</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{totalArea.toFixed(1)} ha</div>
          <div className="kpi-label">Área total trabalhada</div>
        </div>
        {data.despendoamento.length > 0 && data.despendoamento[data.despendoamento.length - 1].pct_remanescente != null && (
          <div className="kpi-card orange">
            <div className="kpi-value">{data.despendoamento[data.despendoamento.length - 1].pct_remanescente}%</div>
            <div className="kpi-label">% Remanescente (última)</div>
          </div>
        )}
      </div>

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
          {data.despendoamento.map((d: any, i: number) => (
            <tr key={i}>
              <td>{d.passada || "—"}</td>
              <td>{d.data || "—"}</td>
              <td>{d.gleba || "—"}</td>
              <td>{d.area?.toFixed(1) ?? "—"}</td>
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
