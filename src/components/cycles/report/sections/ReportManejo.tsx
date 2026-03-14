import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const TYPE_LABELS: Record<string, string> = {
  insecticide: "Inseticida", herbicide: "Herbicida", fungicide: "Fungicida",
  fertilizer: "Fertilizante", adjuvant: "Adjuvante", seed_treatment: "TS",
  growth_regulator: "Regulador", biological: "Biológico", other: "Outro",
};
const COLORS = ["#2E7D32", "#1565C0", "#EF6C00", "#7B1FA2", "#C62828", "#00838F", "#4E342E", "#546E7A"];

export default function ReportManejo({ data }: { data: any }) {
  // Count by type
  const typeCounts: Record<string, number> = {};
  data.insumos.forEach((i: any) => {
    const t = i.tipo || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const pieData = Object.entries(typeCounts).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));

  // By date
  const dateMap: Record<string, Record<string, number>> = {};
  data.insumos.forEach((i: any) => {
    const d = i.data_exec || i.data_rec || "N/A";
    const t = TYPE_LABELS[i.tipo] || i.tipo || "Outro";
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d][t] = (dateMap[d][t] || 0) + 1;
  });
  const allTypes = [...new Set(data.insumos.map((i: any) => TYPE_LABELS[i.tipo] || i.tipo || "Outro"))];
  const barData = Object.entries(dateMap).map(([date, types]) => ({ date, ...types }));

  const applied = data.insumos.filter((i: any) => i.status === "applied").length;
  const recommended = data.insumos.filter((i: any) => i.status === "recommended").length;

  return (
    <div className="report-section">
      <div className="section-title">🧪 Manejo de Insumos</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.insumos.length}</div>
          <div className="kpi-label">Total de registros</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{applied}</div>
          <div className="kpi-label">Aplicados</div>
        </div>
        {recommended > 0 && (
          <div className="kpi-card orange">
            <div className="kpi-value">{recommended}</div>
            <div className="kpi-label">Recomendados</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {pieData.length > 0 && (
          <div className="chart-container">
            <div className="chart-title">Distribuição por Tipo</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={{ strokeWidth: 1 }} style={{ fontSize: 10 }}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {barData.length > 1 && (
          <div className="chart-container">
            <div className="chart-title">Aplicações por Data</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                {allTypes.map((t, i) => <Bar key={t} dataKey={t} stackId="a" fill={COLORS[i % COLORS.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>Data Exec.</th><th>Produto</th><th>I.A.</th><th>Tipo</th>
            <th>Dose/ha</th><th>Unid.</th><th>Status</th><th>Evento</th>
          </tr>
        </thead>
        <tbody>
          {data.insumos.map((i: any, idx: number) => (
            <tr key={idx}>
              <td>{i.data_exec || "—"}</td>
              <td style={{ fontWeight: 500 }}>{i.produto}</td>
              <td>{i.ia ?? "—"}</td>
              <td>{TYPE_LABELS[i.tipo] || i.tipo || "—"}</td>
              <td>{i.dose_ha ?? "—"}</td>
              <td>{i.unidade || "—"}</td>
              <td>
                <span className={`badge ${i.status === "applied" ? "badge-green" : i.status === "recommended" ? "badge-yellow" : "badge-blue"}`}>
                  {i.status === "applied" ? "Aplicado" : i.status === "recommended" ? "Recomendado" : i.status || "—"}
                </span>
              </td>
              <td>{i.evento || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
