export default function ReportNicking({ data }: { data: any }) {
  return (
    <div className="report-section">
      <div className="section-title">🌺 Nicking / Sincronia Floral</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.nicking_marcos.length}</div>
          <div className="kpi-label">Marcos registrados</div>
        </div>
      </div>

      <table className="report-table">
        <thead>
          <tr><th>Parental</th><th>Ponto</th><th>Marco</th><th>Data</th><th>DAP</th></tr>
        </thead>
        <tbody>
          {data.nicking_marcos.map((m: any, i: number) => (
            <tr key={i}>
              <td><span className={`badge ${m.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{m.parental}</span></td>
              <td>{m.ponto || "—"}</td>
              <td style={{ fontWeight: 500 }}>{m.marco}</td>
              <td>{m.data || "—"}</td>
              <td>{m.dap ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.nicking_observacoes?.length > 0 && (
        <>
          <div className="chart-title" style={{ marginTop: 24 }}>Observações de Florescimento</div>
          <table className="report-table">
            <thead>
              <tr><th>Data</th><th>Ponto</th><th>Parental</th><th>Estádio</th><th>Pendão %</th><th>Estigma %</th><th>Notas</th></tr>
            </thead>
            <tbody>
              {data.nicking_observacoes.map((o: any, i: number) => (
                <tr key={i}>
                  <td>{o.data || "—"}</td>
                  <td>{o.ponto_fixo || "—"}</td>
                  <td><span className={`badge ${o.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{o.parental}</span></td>
                  <td>{o.estadio || "—"}</td>
                  <td>{o.pendao_pct != null ? `${o.pendao_pct}%` : "—"}</td>
                  <td>{o.estigma_pct != null ? `${o.estigma_pct}%` : "—"}</td>
                  <td>{o.notas || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
