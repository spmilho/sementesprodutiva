export default function ReportSemente({ data }: { data: any }) {
  const tratamentos = data.tratamentos || [];
  const hasTratamentos = tratamentos.length > 0 && tratamentos[0]?.produtos?.length > 0;

  return (
    <div className="report-section">
      <div className="section-title">🌱 Semente Básica</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.lotes_semente.length}</div>
          <div className="kpi-label">Lotes recebidos</div>
        </div>
        {hasTratamentos && (
          <div className="kpi-card blue">
            <div className="kpi-value">{tratamentos[0].produtos.length}</div>
            <div className="kpi-label">Produtos no TS</div>
          </div>
        )}
      </div>

      <table className="report-table">
        <thead>
          <tr>
            <th>Lote</th><th>Parental</th><th>Origem</th><th>Peneira</th>
            <th>PMS (g)</th><th>Germ. %</th><th>Vigor %</th><th>Pureza %</th><th>TS</th>
          </tr>
        </thead>
        <tbody>
          {data.lotes_semente.map((l: any, i: number) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{l.lote}</td>
              <td><span className={`badge ${l.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{l.parental}</span></td>
              <td>{l.origem ?? "—"}</td>
              <td>{l.peneira ?? "—"}</td>
              <td>{l.pms ?? "—"}</td>
              <td>{l.germinacao ?? "—"}</td>
              <td>{l.vigor ?? "—"}</td>
              <td>{l.pureza ?? "—"}</td>
              <td>{l.tem_ts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasTratamentos && (
        <>
          <div className="chart-title">Tratamento de Sementes (Consolidado)</div>
          <p style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>
            Origem: {tratamentos[0].local || "—"} — Aplicado em todos os lotes (fêmea e macho)
          </p>
          <table className="report-table">
            <thead>
              <tr><th>Produto</th><th>Tipo</th><th>I.A.</th><th>Dose</th><th>Unid.</th></tr>
            </thead>
            <tbody>
              {tratamentos[0].produtos.map((p: any, j: number) => (
                <tr key={j}>
                  <td style={{ fontWeight: 500 }}>{p.produto}</td>
                  <td>{p.tipo ?? "—"}</td>
                  <td>{p.ia ?? "—"}</td>
                  <td>{p.dose ?? "—"}</td>
                  <td>{p.unidade ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
