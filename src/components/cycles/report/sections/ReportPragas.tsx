import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function getSeverityBadge(sev: string | null) {
  if (!sev) return "badge-gray";
  const s = sev.toLowerCase();
  if (s.includes("baixa")) return "badge-green";
  if (s.includes("moderada")) return "badge-yellow";
  if (s.includes("alta")) return "badge-orange";
  if (s.includes("crítica") || s.includes("critica")) return "badge-red";
  return "badge-gray";
}

function getSeverityValue(sev: string | null) {
  if (!sev) return 0;
  const s = sev.toLowerCase();
  if (s.includes("baixa")) return 1;
  if (s.includes("moderada")) return 2;
  if (s.includes("alta")) return 3;
  if (s.includes("crítica") || s.includes("critica")) return 4;
  return 0;
}

function severityLabel(v: number) {
  if (v <= 1) return "Baixa";
  if (v <= 2) return "Moderada";
  if (v <= 3) return "Alta";
  return "Crítica";
}

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function ReportPragas({ data }: { data: any }) {
  const records = data.pragas || [];
  const uniquePests = [...new Set(records.map((p: any) => p.nome))];

  const chartsByPest = uniquePests
    .map((pestName: string) => {
      const pestRecords = records
        .filter((r: any) => r.nome === pestName)
        .sort((a: any, b: any) => {
          const da = parseBrDate(a.data)?.getTime() || 0;
          const db = parseBrDate(b.data)?.getTime() || 0;
          return da - db;
        })
        .map((r: any) => ({
          data: r.data || "—",
          incidencia: r.incidencia != null ? Number(r.incidencia) : null,
          severidade_num: getSeverityValue(r.severidade),
          severidade_label: r.severidade || "—",
          estadio: r.estadio || "—",
        }));

      return {
        nome: pestName,
        data: pestRecords,
      };
    })
    .filter((g: any) => g.data.length > 0);

  return (
    <div className="report-section">
      <div className="section-title">🐛 Pragas e Doenças</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{records.length}</div>
          <div className="kpi-label">Registros</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{uniquePests.length}</div>
          <div className="kpi-label">Pragas/doenças distintas</div>
        </div>
      </div>

      {chartsByPest.map((group: any, idx: number) => (
        <div key={`${group.nome}-${idx}`} className="chart-container" style={{ marginBottom: 20 }}>
          <div className="chart-title" style={{ fontStyle: "italic", fontSize: 16 }}>{group.nome}</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={group.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[1, 4]}
                ticks={[1, 2, 3, 4]}
                tickFormatter={severityLabel}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                formatter={(value: any, name: string, item: any) => {
                  if (name === "Incidência") return [`${value}%`, name];
                  return [item?.payload?.severidade_label || "—", "Severidade"];
                }}
                labelFormatter={(label: string, payload: any) => {
                  const stage = payload?.[0]?.payload?.estadio;
                  return stage ? `${label} • ${stage}` : label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="incidencia" name="Incidência" stroke="#2E7D32" strokeWidth={3} dot={{ r: 4 }} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="severidade_num" name="Severidade" stroke="#D32F2F" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data</th><th>Praga/Doença</th><th>Tipo</th><th>Incidência</th>
            <th>Severidade</th><th>Parental</th><th>Estádio</th><th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {records.map((p: any, i: number) => (
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
