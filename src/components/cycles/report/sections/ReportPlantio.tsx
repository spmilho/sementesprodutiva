import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function getCvBadge(cv: number | null) {
  if (cv == null) return "badge-gray";
  if (cv < 15) return "badge-green";
  if (cv < 20) return "badge-yellow";
  if (cv < 25) return "badge-orange";
  return "badge-red";
}

export default function ReportPlantio({ data }: { data: any }) {
  const femea = data.plantio.filter((p: any) => p.tipo === "Fêmea");
  const macho = data.plantio.filter((p: any) => p.tipo !== "Fêmea");
  const totalF = femea.reduce((s: number, p: any) => s + (p.area || 0), 0);
  const totalM = macho.reduce((s: number, p: any) => s + (p.area || 0), 0);
  const avgCvF = femea.filter((p: any) => p.cv_plantio).length > 0
    ? femea.filter((p: any) => p.cv_plantio).reduce((s: number, p: any) => s + p.cv_plantio, 0) / femea.filter((p: any) => p.cv_plantio).length
    : null;
  const avgCvM = macho.filter((p: any) => p.cv_plantio).length > 0
    ? macho.filter((p: any) => p.cv_plantio).reduce((s: number, p: any) => s + p.cv_plantio, 0) / macho.filter((p: any) => p.cv_plantio).length
    : null;

  // Chart data - cumulative by date
  const dailyMap: Record<string, { date: string; femea: number; macho: number }> = {};
  data.plantio.forEach((p: any) => {
    const key = p.data || "N/A";
    if (!dailyMap[key]) dailyMap[key] = { date: key, femea: 0, macho: 0 };
    if (p.tipo === "Fêmea") dailyMap[key].femea += p.area || 0;
    else dailyMap[key].macho += p.area || 0;
  });
  let cumF = 0, cumM = 0;
  const chartData = Object.values(dailyMap).map(d => {
    cumF += d.femea;
    cumM += d.macho;
    return { date: d.date, "Fêmea (ha)": +cumF.toFixed(1), "Macho (ha)": +cumM.toFixed(1), "Total (ha)": +(cumF + cumM).toFixed(1) };
  });

  return (
    <div className="report-section">
      <div className="section-title">🚜 Plantio Realizado</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{totalF.toFixed(1)} ha</div>
          <div className="kpi-label">Fêmea plantada</div>
          {avgCvF != null && <div className="kpi-sub">CV% médio: {avgCvF.toFixed(1)}%</div>}
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{totalM.toFixed(1)} ha</div>
          <div className="kpi-label">Macho plantado</div>
          {avgCvM != null && <div className="kpi-sub">CV% médio: {avgCvM.toFixed(1)}%</div>}
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{(totalF + totalM).toFixed(1)} ha</div>
          <div className="kpi-label">Total plantado</div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução Acumulada do Plantio</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Fêmea (ha)" stackId="1" stroke="#2E7D32" fill="#A5D6A7" />
              <Area type="monotone" dataKey="Macho (ha)" stackId="1" stroke="#1565C0" fill="#90CAF9" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data</th><th>Tipo</th><th>Gleba</th><th>Lote</th>
            <th>Área (ha)</th><th>Esp. (cm)</th><th>Sem/m</th><th>CV%</th><th>Solo</th>
          </tr>
        </thead>
        <tbody>
          {data.plantio.map((p: any, i: number) => (
            <tr key={i}>
              <td>{p.data || "—"}</td>
              <td><span className={`badge ${p.tipo === "Fêmea" ? "badge-green" : "badge-blue"}`}>{p.tipo}</span></td>
              <td>{p.gleba}</td>
              <td>{p.lote}</td>
              <td>{p.area?.toFixed(1) ?? "—"}</td>
              <td>{p.espacamento ?? "—"}</td>
              <td>{p.sem_metro?.toFixed(1) ?? "—"}</td>
              <td>{p.cv_plantio != null ? <span className={`badge ${getCvBadge(p.cv_plantio)}`}>{p.cv_plantio.toFixed(1)}%</span> : "—"}</td>
              <td>{p.solo || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>TOTAL</td>
            <td>{(totalF + totalM).toFixed(1)}</td>
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
