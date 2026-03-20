import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const FREQ_MAP: Record<string, number> = { rare: 1, low: 2, moderate: 3, high: 4 };
const FREQ_LABEL: Record<string, string> = { rare: "Rara", low: "Baixa", moderate: "Moderada", high: "Alta" };
const COND_LABEL: Record<string, string> = { clean: "🟢 Limpo", attention: "🟡 Atenção", recommended: "🟠 Necessário", urgent: "🔴 Urgente" };
const PRIO_LABEL: Record<string, string> = { observe: "Observar", recommended: "🟠 Recomendado", urgent: "🔴 Urgente" };
const STATUS_LABEL: Record<string, string> = { pending: "⏳ Pendente", executed: "✅ Executado", cancelled: "❌ Cancelado" };
const EFF_LABEL: Record<string, string> = { complete: "✅ Completo", partial: "🟡 Parcial", insufficient: "🔴 Insuficiente" };

export default function ReportRoguing({ data }: { data: any }) {
  const evals = data.roguing_avaliacoes || [];
  const reqs = data.roguing_solicitacoes || [];
  const execs = data.roguing_execucoes || [];

  if (evals.length === 0 && reqs.length === 0 && execs.length === 0) return null;

  const totalRemoved = execs.reduce((s: number, x: any) => s + (x.total || 0), 0);
  const pendingReqs = reqs.filter((r: any) => r.status === "pending").length;

  // Chart: plants removed per execution
  const execChartData = execs.map((x: any, i: number) => ({
    name: x.data || `Exec ${i + 1}`,
    Voluntárias: x.voluntarias || 0,
    "Off-type": x.offtype || 0,
    Doentes: x.doentes || 0,
    "Fêmea no macho": x.femea_macho || 0,
  }));

  return (
    <div className="report-section">
      <div className="section-title">🔍 Roguing</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{evals.length}</div>
          <div className="kpi-label">Avaliações realizadas</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{reqs.length}</div>
          <div className="kpi-label">Solicitações geradas</div>
          {pendingReqs > 0 && <div className="kpi-sub" style={{ color: "#D32F2F" }}>{pendingReqs} pendente(s)</div>}
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{execs.length}</div>
          <div className="kpi-label">Execuções realizadas</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: "4px solid #7B1FA2" }}>
          <div className="kpi-value">{totalRemoved.toLocaleString("pt-BR")}</div>
          <div className="kpi-label">Plantas removidas (total)</div>
        </div>
      </div>

      {/* Evaluation table */}
      {evals.length > 0 && (
        <>
          <div className="chart-title" style={{ marginTop: 16 }}>Avaliações de Campo</div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th><th>Avaliador</th><th>Estádio</th><th>DAP</th>
                <th>Parental</th><th>Condição</th>
                <th>🌽 Vol.</th><th>🔀 Off</th><th>🌱 Doença</th><th>🌾 F/M</th>
              </tr>
            </thead>
            <tbody>
              {evals.map((e: any, i: number) => (
                <tr key={i}>
                  <td>{e.data || "—"}</td>
                  <td>{e.avaliador || "—"}</td>
                  <td>{e.estagio || "—"}</td>
                  <td>{e.dap ?? "—"}</td>
                  <td><span className={`badge ${e.parental === "Fêmea" ? "badge-green" : "badge-blue"}`}>{e.parental}</span></td>
                  <td>{COND_LABEL[e.condicao] || e.condicao || "—"}</td>
                  <td>{e.voluntarias ? FREQ_LABEL[e.voluntarias_freq] || "Sim" : "—"}</td>
                  <td>{e.offtype ? FREQ_LABEL[e.offtype_freq] || "Sim" : "—"}</td>
                  <td>{e.doentes ? FREQ_LABEL[e.doentes_freq] || "Sim" : "—"}</td>
                  <td>{e.femea_macho ? FREQ_LABEL[e.femea_macho_freq] || "Sim" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Requests table */}
      {reqs.length > 0 && (
        <>
          <div className="chart-title" style={{ marginTop: 16 }}>Solicitações de Roguing</div>
          <table className="report-table">
            <thead>
              <tr><th>#</th><th>Data</th><th>Prioridade</th><th>Parental</th><th>Ocorrências</th><th>Status</th></tr>
            </thead>
            <tbody>
              {reqs.map((r: any, i: number) => (
                <tr key={i}>
                  <td>#{r.numero}</td>
                  <td>{r.data || "—"}</td>
                  <td>{PRIO_LABEL[r.prioridade] || r.prioridade}</td>
                  <td>{r.parental}</td>
                  <td>{(r.tipos || []).join(", ") || r.resumo || "—"}</td>
                  <td>{STATUS_LABEL[r.status] || r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Executions table */}
      {execs.length > 0 && (
        <>
          <div className="chart-title" style={{ marginTop: 16 }}>Execuções de Roguing</div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Data</th><th>Equipe</th><th>Horas</th>
                <th>🌽 Vol.</th><th>🔀 Off</th><th>🌱 Doença</th><th>🌾 F/M</th>
                <th>Total</th><th>Eficácia</th>
              </tr>
            </thead>
            <tbody>
              {execs.map((x: any, i: number) => (
                <tr key={i}>
                  <td>{x.data || "—"}</td>
                  <td>{x.equipe ?? "—"} pessoas</td>
                  <td>{x.horas ?? "—"}h</td>
                  <td>{x.voluntarias || 0}</td>
                  <td>{x.offtype || 0}</td>
                  <td>{x.doentes || 0}</td>
                  <td>{x.femea_macho || 0}</td>
                  <td style={{ fontWeight: 600 }}>{x.total || 0}</td>
                  <td>{EFF_LABEL[x.eficacia] || x.eficacia || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Chart: plants removed */}
      {execChartData.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Plantas Removidas por Execução</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={execChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Voluntárias" stackId="a" fill="#4CAF50" />
              <Bar dataKey="Off-type" stackId="a" fill="#FF9800" />
              <Bar dataKey="Doentes" stackId="a" fill="#F44336" />
              <Bar dataKey="Fêmea no macho" stackId="a" fill="#9C27B0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
