export default function ReportFenologia({ data }: { data: any }) {
  return (
    <div className="report-section">
      <div className="section-title">🌾 Fenologia</div>
      <table className="report-table">
        <thead>
          <tr><th>Data</th><th>Parental</th><th>Estádio</th><th>DAP</th><th>Observação</th></tr>
        </thead>
        <tbody>
          {data.fenologia.map((f: any, i: number) => (
            <tr key={i}>
              <td>{f.data || "—"}</td>
              <td><span className={`badge ${f.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{f.parental}</span></td>
              <td style={{ fontWeight: 600 }}>{f.estadio || "—"}</td>
              <td>{f.dap ?? "—"}</td>
              <td>{f.observacao || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
