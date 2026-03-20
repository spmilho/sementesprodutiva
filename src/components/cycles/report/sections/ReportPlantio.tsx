import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

function getCvBadge(cv: number | null) {
  if (cv == null) return "badge-gray";
  if (cv < 15) return "badge-green";
  if (cv < 20) return "badge-yellow";
  if (cv < 25) return "badge-orange";
  return "badge-red";
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeType(tipo: string | null | undefined): "Fêmea" | "Macho 1" | "Macho 2" | "N/A" {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("fêmea") || t.includes("femea") || t === "female") return "Fêmea";
  if (t.includes("macho 2") || t === "male_2") return "Macho 2";
  if (t.includes("macho") || t === "male" || t === "male_1") return "Macho 1";
  return "N/A";
}

function parseIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Accept both ISO (2026-02-27) and BR (27/02/2026) formats, return ISO
  if (value.includes("-")) return value;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtShort(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export default function ReportPlantio({ data }: { data: any }) {
  const plantio = (data.plantio || [])
    .map((p: any) => ({
      ...p,
      tipo: normalizeType(p.tipo),
      area: toNumber(p.area),
      cv_plantio: toNumber(p.cv_plantio),
      sem_metro: toNumber(p.sem_metro),
      espacamento: toNumber(p.espacamento),
      iso: parseIsoDate(p.data_iso || p.data),
    }))
    .sort((a: any, b: any) => (a.iso || "").localeCompare(b.iso || ""));

  const planejado = (data.plantio_planejado || [])
    .map((p: any) => ({
      ...p,
      tipo: normalizeType(p.tipo),
      area: toNumber(p.area),
      iso: parseIsoDate(p.data_iso || p.data),
    }))
    .sort((a: any, b: any) => (a.iso || "").localeCompare(b.iso || ""));

  const hasMale2 = plantio.some((p: any) => p.tipo === "Macho 2") || planejado.some((p: any) => p.tipo === "Macho 2");

  const sumByType = (arr: any[], type: string) =>
    arr.filter((p: any) => p.tipo === type).reduce((sum: number, p: any) => sum + (p.area || 0), 0);

  const avgCvByType = (type: string) => {
    const values = plantio
      .filter((p: any) => p.tipo === type && p.cv_plantio != null)
      .map((p: any) => p.cv_plantio as number);
    return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
  };

  // Use cycle-level areas (female area and male area are distinct; male_1 and male_2 share the same physical area)
  const totalF = toNumber(data.area_femea) ?? sumByType(plantio, "Fêmea");
  const totalMacho = toNumber(data.area_macho) ?? Math.max(sumByType(plantio, "Macho 1"), sumByType(plantio, "Macho 2"));
  const totalGeral = toNumber(data.area_total) ?? (totalF + totalMacho);

  const avgCvF = avgCvByType("Fêmea");
  const avgCvM1 = avgCvByType("Macho 1");
  const avgCvM2 = hasMale2 ? avgCvByType("Macho 2") : null;

  // Build accumulated chart: Planned x Realized per parental
  const dateMap = new Map<string, Record<string, number>>();

  const addToMap = (iso: string, key: string, area: number) => {
    const entry = dateMap.get(iso) || {};
    entry[key] = (entry[key] || 0) + area;
    dateMap.set(iso, entry);
  };

  planejado.forEach((p: any) => {
    if (!p.iso || !p.area) return;
    if (p.tipo === "Fêmea") addToMap(p.iso, "planF", p.area);
    else if (p.tipo === "Macho 1") addToMap(p.iso, "planM1", p.area);
    else if (p.tipo === "Macho 2") addToMap(p.iso, "planM2", p.area);
  });

  plantio.forEach((p: any) => {
    if (!p.iso || !p.area) return;
    if (p.tipo === "Fêmea") addToMap(p.iso, "realF", p.area);
    else if (p.tipo === "Macho 1") addToMap(p.iso, "realM1", p.area);
    else if (p.tipo === "Macho 2") addToMap(p.iso, "realM2", p.area);
  });

  const sorted = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const acc = { planF: 0, realF: 0, planM1: 0, realM1: 0, planM2: 0, realM2: 0 };

  const chartData = sorted.map(([iso, v]) => {
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] += v[k] || 0;
    return {
      date: fmtShort(iso),
      "Plan. Fêmea": Math.round(acc.planF * 10) / 10,
      "Real Fêmea": Math.round(acc.realF * 10) / 10,
      "Plan. M1": Math.round(acc.planM1 * 10) / 10,
      "Real M1": Math.round(acc.realM1 * 10) / 10,
      ...(hasMale2
        ? {
            "Plan. M2": Math.round(acc.planM2 * 10) / 10,
            "Real M2": Math.round(acc.realM2 * 10) / 10,
          }
        : {}),
    };
  });

  // CV% semeadura from dedicated records
  const cvSem = data.cv_semeadura || [];
  const cvSemF = cvSem.find((c: any) => c.tipo === "Fêmea")?.cv_percent;
  const cvSemM1 = cvSem.find((c: any) => c.tipo === "Macho 1" || c.tipo === "Macho")?.cv_percent;
  const cvSemM2 = hasMale2 ? cvSem.find((c: any) => c.tipo === "Macho 2")?.cv_percent : null;

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
          <div className="kpi-value">{totalMacho.toFixed(1)} ha</div>
          <div className="kpi-label">{hasMale2 ? "Macho 1 e 2 (mesma área)" : "Macho plantado"}</div>
          {avgCvM1 != null && <div className="kpi-sub">CV% médio M1: {avgCvM1.toFixed(1)}%</div>}
          {avgCvM2 != null && <div className="kpi-sub">CV% médio M2: {avgCvM2.toFixed(1)}%</div>}
        </div>

        <div className="kpi-card orange">
          <div className="kpi-value">{totalGeral.toFixed(1)} ha</div>
          <div className="kpi-label">Área total do ciclo</div>
        </div>
      </div>

      {/* CV% Semeadura section */}
      {cvSem.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <div className="chart-title">CV% de Semeadura (registrado)</div>
          <div className="kpi-grid">
            {cvSemF != null && (
              <div className="kpi-card" style={{ borderLeft: `4px solid ${cvSemF <= 20 ? "#4CAF50" : cvSemF <= 25 ? "#FF9800" : "#F44336"}` }}>
                <div className="kpi-value">{cvSemF.toFixed(1)}%</div>
                <div className="kpi-label">CV% Semeadura Fêmea</div>
                <div className="kpi-sub">{cvSemF <= 20 ? "Excelente" : cvSemF <= 25 ? "Bom" : cvSemF <= 30 ? "Aceitável" : "Insatisfatório"}</div>
              </div>
            )}
            {cvSemM1 != null && (
              <div className="kpi-card" style={{ borderLeft: `4px solid ${cvSemM1 <= 20 ? "#4CAF50" : cvSemM1 <= 25 ? "#FF9800" : "#F44336"}` }}>
                <div className="kpi-value">{cvSemM1.toFixed(1)}%</div>
                <div className="kpi-label">CV% Semeadura Macho 1</div>
                <div className="kpi-sub">{cvSemM1 <= 20 ? "Excelente" : cvSemM1 <= 25 ? "Bom" : cvSemM1 <= 30 ? "Aceitável" : "Insatisfatório"}</div>
              </div>
            )}
            {cvSemM2 != null && (
              <div className="kpi-card" style={{ borderLeft: `4px solid ${cvSemM2 <= 20 ? "#4CAF50" : cvSemM2 <= 25 ? "#FF9800" : "#F44336"}` }}>
                <div className="kpi-value">{cvSemM2.toFixed(1)}%</div>
                <div className="kpi-label">CV% Semeadura Macho 2</div>
                <div className="kpi-sub">{cvSemM2 <= 20 ? "Excelente" : cvSemM2 <= 25 ? "Bom" : cvSemM2 <= 30 ? "Aceitável" : "Insatisfatório"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Plantio Acumulado: Planejado × Realizado</div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Plan. Fêmea" stroke="#1E88E5" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="Real Fêmea" stroke="#1E88E5" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Plan. M1" stroke="#4CAF50" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="Real M1" stroke="#4CAF50" strokeWidth={2.5} dot={{ r: 3 }} />
              {hasMale2 && <Line type="monotone" dataKey="Plan. M2" stroke="#FF9800" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />}
              {hasMale2 && <Line type="monotone" dataKey="Real M2" stroke="#FF9800" strokeWidth={2.5} dot={{ r: 3 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data</th><th>Tipo</th><th>Gleba</th><th>Lote</th>
            <th>Área (ha)</th><th>Esp. (cm)</th><th>Sem/m</th><th>Solo</th>
          </tr>
        </thead>
        <tbody>
          {plantio.map((p: any, i: number) => (
            <tr key={i}>
              <td>{p.data || "—"}</td>
              <td>
                <span
                  className={`badge ${
                    p.tipo === "Fêmea"
                      ? "badge-green"
                      : p.tipo === "Macho 2"
                        ? "badge-orange"
                        : "badge-blue"
                  }`}
                >
                  {p.tipo}
                </span>
              </td>
              <td>{p.gleba || "—"}</td>
              <td>{p.lote || "—"}</td>
              <td>{p.area != null ? p.area.toFixed(1) : "—"}</td>
              <td>{p.espacamento ?? "—"}</td>
              <td>{p.sem_metro != null ? p.sem_metro.toFixed(1) : "—"}</td>
              <td>{p.solo || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>TOTAL (área do ciclo)</td>
            <td>{totalGeral.toFixed(1)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
