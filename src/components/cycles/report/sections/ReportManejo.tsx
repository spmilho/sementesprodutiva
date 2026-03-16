import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const TYPE_LABELS: Record<string, string> = {
  insecticide: "Inseticida",
  herbicide: "Herbicida",
  fungicide: "Fungicida",
  fertilizer: "Fertilizante",
  adjuvant: "Adjuvante",
  seed_treatment: "TS",
  growth_regulator: "Regulador",
  biological: "Biológico",
  other: "Outro",
};

const COLORS = ["#2E7D32", "#1565C0", "#EF6C00", "#7B1FA2", "#C62828", "#00838F", "#4E342E", "#546E7A"];

function fmt2(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(2).replace(".", ",");
}

export default function ReportManejo({ data }: { data: any }) {
  // Filter out products with 0 dose
  const insumos = (data.insumos || []).filter((i: any) => {
    const dose = Number(i.dose_ha);
    return !(dose === 0);
  });

  const typeCounts: Record<string, number> = {};
  insumos.forEach((i: any) => {
    const t = i.tipo || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const pieData = Object.entries(typeCounts).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));

  const dateMap: Record<string, Record<string, number>> = {};
  insumos.forEach((i: any) => {
    const d = i.data_exec || i.data_rec || "N/A";
    const t = TYPE_LABELS[i.tipo] || i.tipo || "Outro";
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d][t] = (dateMap[d][t] || 0) + 1;
  });

  const allTypes = [...new Set(insumos.map((i: any) => TYPE_LABELS[i.tipo] || i.tipo || "Outro"))];
  const barData = Object.entries(dateMap).map(([date, types]) => ({ date, ...types }));

  const applied = insumos.filter((i: any) => i.status === "applied").length;
  const recommended = insumos.filter((i: any) => i.status === "recommended").length;

  return (
    <div className="report-section">
      <div className="section-title">🧪 Manejo de Insumos</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{insumos.length}</div>
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

      {pieData.length > 0 && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <div className="chart-title">Distribuição por Tipo</div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 300 }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={false}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: "1 1 140px", minWidth: 140, paddingTop: 8 }}>
              {pieData.map((entry: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12 }}>
                  <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, backgroundColor: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: "#333" }}>{entry.name}: <strong>{entry.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {barData.length > 1 && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <div className="chart-title">Aplicações por Data</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={70} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              {allTypes.map((t: any, i: number) => (
                <Bar key={String(t)} dataKey={String(t)} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data Exec.</th>
            <th>Produto</th>
            <th>I.A.</th>
            <th>Tipo</th>
            <th>Dose/ha</th>
            <th>Unid.</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((i: any, idx: number) => (
            <tr key={idx}>
              <td>{i.data_exec || "—"}</td>
              <td style={{ fontWeight: 500 }}>{i.produto}</td>
              <td>{i.ia ?? "—"}</td>
              <td>{TYPE_LABELS[i.tipo] || i.tipo || "—"}</td>
              <td>{fmt2(i.dose_ha)}</td>
              <td>{i.unidade || "—"}</td>
              <td>
                <span
                  className={`badge ${
                    i.status === "applied"
                      ? "badge-green"
                      : i.status === "recommended"
                        ? "badge-yellow"
                        : "badge-blue"
                  }`}
                >
                  {i.status === "applied" ? "Aplicado" : i.status === "recommended" ? "Recomendado" : i.status || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
