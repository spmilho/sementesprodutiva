import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function ReportEstimativa({ data }: { data: any }) {
  const est = data.estimativa;
  if (!est) return null;

  const chartData = (est.pontos || []).map((p: any) => ({
    name: `P${p.ponto}`,
    "Prod. bruta (kg/ha)": p.prod_bruta ?? 0,
  }));

  const avgProd = chartData.reduce((s: number, p: any) => s + p["Prod. bruta (kg/ha)"], 0) / (chartData.length || 1);

  return (
    <div className="report-section">
      <div className="section-title">🌾 Estimativa de Produtividade</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{est.prod_liquida_kgha ? `${(est.prod_liquida_kgha / 1000).toFixed(2)} t/ha` : "—"}</div>
          <div className="kpi-label">Produtividade líquida</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{est.prod_total_ton?.toFixed(1) ?? "—"} t</div>
          <div className="kpi-label">Produção total estimada</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{est.sc_ha?.toFixed(1) ?? "—"}</div>
          <div className="kpi-label">Sacas/ha</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Produtividade por Ponto Amostral (kg/ha)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="Prod. bruta (kg/ha)" fill="#7B1FA2" radius={[4, 4, 0, 0]} />
              {avgProd > 0 && <ReferenceLine y={avgProd} stroke="#EF6C00" strokeDasharray="5 5" label={{ value: "Média", fontSize: 10 }} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(est.pontos || []).length > 0 && (
        <table className="report-table">
          <thead>
            <tr><th>Ponto</th><th>Gleba</th><th>Espigas/ha</th><th>Grãos/espiga</th><th>Umidade %</th><th>Prod. bruta (kg/ha)</th></tr>
          </thead>
          <tbody>
            {est.pontos.map((p: any, i: number) => (
              <tr key={i}>
                <td>P{p.ponto}</td>
                <td>{p.gleba || "—"}</td>
                <td>{p.espigas_ha?.toLocaleString("pt-BR") ?? "—"}</td>
                <td>{p.graos_espiga ?? "—"}</td>
                <td>{p.umidade ?? "—"}%</td>
                <td style={{ fontWeight: 600 }}>{p.prod_bruta?.toLocaleString("pt-BR") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
