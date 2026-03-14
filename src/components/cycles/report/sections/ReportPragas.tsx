function getSeverityBadge(sev: string | null) {
  if (!sev) return "badge-gray";
  const s = sev.toLowerCase();
  if (s.includes("baixa")) return "badge-green";
  if (s.includes("moderada")) return "badge-yellow";
  if (s.includes("alta")) return "badge-orange";
  if (s.includes("crítica") || s.includes("critica")) return "badge-red";
  return "badge-gray";
}

export default function ReportPragas({ data }: { data: any }) {
  const uniquePests = [...new Set(data.pragas.map((p: any) => p.nome))];

  return (
    <div className="report-section">
      <div className="section-title">🐛 Pragas e Doenças</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.pragas.length}</div>
          <div className="kpi-label">Registros</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{uniquePests.length}</div>
          <div className="kpi-label">Pragas/doenças distintas</div>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>Data</th><th>Praga/Doença</th><th>Tipo</th><th>Incidência</th>
            <th>Severidade</th><th>Parental</th><th>Estádio</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {data.pragas.map((p: any, i: number) => (
            <tr key={i}>
              <td>{p.data || "—"}</td>
              <td style={{ fontWeight: 500 }}>{p.nome}</td>
              <td>{p.tipo || "—"}</td>
              <td>{p.incidencia != null ? `${p.incidencia}%` : "—"}</td>
              <td><span className={`badge ${getSeverityBadge(p.severidade)}`}>{p.severidade || "—"}</span></td>
              <td>{p.parental || "—"}</td>
              <td>{p.estadio || "—"}</td>
              <td style={{ maxWidth: 200, fontSize: 10 }}>{p.acao || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
