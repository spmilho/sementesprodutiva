export default function ReportSemente({ data }: { data: any }) {
  return (
    <div className="report-section">
      <div className="section-title">🌱 Semente Básica</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.lotes_semente.length}</div>
          <div className="kpi-label">Lotes recebidos</div>
        </div>
        {data.tratamentos?.length > 0 && (
          <div className="kpi-card blue">
            <div className="kpi-value">{data.tratamentos.length}</div>
            <div className="kpi-label">Tratamentos realizados</div>
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

      {data.tratamentos?.length > 0 && (
        <>
          <div className="chart-title">Tratamento de Sementes</div>
          {data.tratamentos.map((t: any, i: number) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Lote {t.lote} ({t.parental}) — {t.data || "—"} — {t.local || "—"}
              </p>
              {t.produtos?.length > 0 && (
                <table className="report-table">
                  <thead><tr><th>Produto</th><th>Tipo</th><th>I.A.</th><th>Dose</th><th>Unid.</th></tr></thead>
                  <tbody>
                    {t.produtos.map((p: any, j: number) => (
                      <tr key={j}>
                        <td>{p.produto}</td><td>{p.tipo ?? "—"}</td><td>{p.ia ?? "—"}</td>
                        <td>{p.dose ?? "—"}</td><td>{p.unidade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
