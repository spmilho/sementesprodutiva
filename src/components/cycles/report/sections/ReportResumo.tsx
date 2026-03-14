export default function ReportResumo({ data }: { data: any }) {
  return (
    <div className="report-section">
      <div className="section-title">📊 Resumo Executivo</div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{data.area_total ?? "—"}</div>
          <div className="kpi-label">Área Total (ha)</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{data.proporcao_fm || "—"}</div>
          <div className="kpi-label">Proporção F:M</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{data.ciclo_dias ?? "—"}</div>
          <div className="kpi-label">Ciclo (dias)</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-value">{data.produtividade_esperada ? `${(data.produtividade_esperada / 1000).toFixed(1)}` : "—"}</div>
          <div className="kpi-label">Produtividade Esperada (t/ha)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{data.split || "—"}</div>
          <div className="kpi-label">Split</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{data.sistema_irrigacao || "—"}</div>
          <div className="kpi-label">Irrigação</div>
        </div>
      </div>

      {data.glebas?.length > 0 && (
        <>
          <div className="chart-title">Glebas do Campo</div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Gleba</th><th>Parental</th><th>Área (ha)</th><th>Linhas</th>
              </tr>
            </thead>
            <tbody>
              {data.glebas.map((g: any, i: number) => (
                <tr key={i}>
                  <td>{g.nome}</td>
                  <td><span className={`badge ${g.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{g.parental}</span></td>
                  <td>{g.area_ha?.toFixed(1) ?? "—"}</td>
                  <td>{g.linhas ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
        <p><strong>Espaçamentos:</strong> F×F {data.espacamento_ff ?? "—"}cm | F×M {data.espacamento_fm ?? "—"}cm | M×M {data.espacamento_mm ?? "—"}cm</p>
        <p><strong>Linhagens:</strong> ♀ {data.linhagem_femea || "—"} | ♂ {data.linhagem_macho || "—"}</p>
        <p><strong>Umidade alvo:</strong> {data.umidade_alvo ?? "—"}% | <strong>DAP Despendoamento:</strong> {data.desp_dap ?? "—"}</p>
      </div>
    </div>
  );
}
