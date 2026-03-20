import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

export default function ReportStand({ data }: { data: any }) {
  const cvStandRecs = data.cv_stand_records || [];
  
  const chartData = data.stand.map((s: any) => ({
    name: `${s.gleba} (${s.parental})`,
    "Pop. pl/ha": s.pop_plha ?? 0,
    "CV%": s.cv_stand ?? 0,
  }));

  const avgPop = data.stand.filter((s: any) => s.pop_plha).reduce((sum: number, s: any) => sum + s.pop_plha, 0) /
    (data.stand.filter((s: any) => s.pop_plha).length || 1);

  const hasStandCounts = data.stand?.length > 0;

  return (
    <div className="report-section">
      <div className="section-title">🌿 Stand / Estande</div>

      {hasStandCounts && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{data.stand.length}</div>
              <div className="kpi-label">Contagens realizadas</div>
            </div>
            <div className="kpi-card blue">
              <div className="kpi-value">{avgPop > 0 ? Math.round(avgPop).toLocaleString("pt-BR") : "—"}</div>
              <div className="kpi-label">Pop. média (pl/ha)</div>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="chart-container">
              <div className="chart-title">População por Gleba (pl/ha)</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="Pop. pl/ha" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                  {avgPop > 0 && <ReferenceLine y={avgPop} stroke="#EF6C00" strokeDasharray="5 5" label={{ value: "Média", fontSize: 10 }} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th><th>Tipo</th><th>Parental</th><th>Gleba</th>
                <th>DAP</th><th>Pontos</th><th>Pop (pl/ha)</th><th>CV%</th><th>Emerg. %</th>
              </tr>
            </thead>
            <tbody>
              {data.stand.map((s: any, i: number) => (
                <tr key={i}>
                  <td>{s.data || "—"}</td>
                  <td>{s.tipo_contagem || "—"}</td>
                  <td><span className={`badge ${s.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{s.parental}</span></td>
                  <td>{s.gleba}</td>
                  <td>{s.dap ?? "—"}</td>
                  <td>{s.pontos ?? "—"}</td>
                  <td>{s.pop_plha ? Math.round(s.pop_plha).toLocaleString("pt-BR") : "—"}</td>
                  <td>{s.cv_stand != null ? `${s.cv_stand.toFixed(1)}%` : "—"}</td>
                  <td>{s.emergencia != null ? `${s.emergencia.toFixed(0)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* CV% Stand Final from dedicated records */}
      {cvStandRecs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="chart-title">CV% Stand Final (registrado)</div>
          <div className="kpi-grid">
            {cvStandRecs.map((r: any, i: number) => {
              const cv = r.cv_percent;
              const color = cv <= 20 ? "#4CAF50" : cv <= 25 ? "#FF9800" : "#F44336";
              const label = cv <= 20 ? "Excelente" : cv <= 25 ? "Bom" : cv <= 30 ? "Aceitável" : "Insatisfatório";
              return (
                <div key={i} className="kpi-card" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="kpi-value">{cv?.toFixed(1)}%</div>
                  <div className="kpi-label">CV% Stand {r.tipo}</div>
                  <div className="kpi-sub">{label}</div>
                  {r.plants_per_meter != null && (
                    <div className="kpi-sub">{r.plants_per_meter.toFixed(1)} pl/m</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
