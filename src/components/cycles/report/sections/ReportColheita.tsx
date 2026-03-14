import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportColheita({ data }: { data: any }) {
  const totalTons = data.colheita.reduce((s: number, c: any) => s + (c.tons || 0), 0);
  const totalArea = data.colheita.reduce((s: number, c: any) => s + (c.area || 0), 0);
  const totalLoads = data.colheita.reduce((s: number, c: any) => s + (c.cargas || 0), 0);

  let cum = 0;
  const chartData = data.colheita.map((c: any) => {
    cum += c.tons || 0;
    return { date: c.data || "—", "Acumulado (t)": +cum.toFixed(1) };
  });

  return (
    <div className="report-section">
      <div className="section-title">🚛 Colheita</div>
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
    </div>
  );
}
