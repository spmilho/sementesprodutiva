export default function ReportVisitas({ data }: { data: any }) {
  return (
    <div className="report-section">
      <div className="section-title">📋 Visitas de Campo</div>
      {data.visitas.map((v: any, i: number) => (
        <div key={i} style={{ marginBottom: 24, padding: 16, background: "#F9F9F9", borderRadius: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              Visita #{v.numero ?? i + 1} — {v.data || "—"}
            </span>
            <span>
              {v.nota_final != null && (
                <span className="badge badge-green" style={{ fontSize: 12 }}>
                  {v.nota_final}/{v.nota_maxima ?? "—"}
                </span>
              )}
            </span>
          </div>
          {v.tecnico && <p style={{ fontSize: 11, color: "#666", margin: "4px 0" }}>Técnico: {v.tecnico}</p>}
          {v.estagio && <p style={{ fontSize: 11, color: "#666", margin: "4px 0" }}>Estágio: {v.estagio}</p>}
          {v.observacoes && <p style={{ fontSize: 12, margin: "8px 0", lineHeight: 1.5 }}>{v.observacoes}</p>}

          {v.scores?.length > 0 && (
            <table className="report-table" style={{ marginTop: 8 }}>
              <thead><tr><th>Etapa</th><th>Subitem</th><th>Nota</th><th>Pontos</th><th>Obs.</th></tr></thead>
              <tbody>
                {v.scores.map((s: any, j: number) => (
                  <tr key={j}>
                    <td>{s.estagio || "—"}</td>
                    <td>{s.subitem || "—"}</td>
                    <td>{s.nota || "—"}</td>
                    <td>{s.pontos ?? "—"}</td>
                    <td>{s.obs || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
