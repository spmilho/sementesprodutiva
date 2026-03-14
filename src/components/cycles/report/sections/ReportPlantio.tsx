import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

function normalizeType(tipo: string | null | undefined): "Fêmea" | "Macho 1" | "Macho 2" | "Macho 3" | "N/A" {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("fêmea") || t.includes("femea") || t === "female") return "Fêmea";
  if (t.includes("macho 2") || t === "male_2") return "Macho 2";
  if (t.includes("macho 3") || t === "male_3") return "Macho 3";
  if (t.includes("macho") || t === "male" || t === "male_1") return "Macho 1";
  return "N/A";
}

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
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
    }))
    .sort((a: any, b: any) => {
      const da = parseBrDate(a.data)?.getTime() || 0;
      const db = parseBrDate(b.data)?.getTime() || 0;
      return da - db;
    });

  const hasMale2 = plantio.some((p: any) => p.tipo === "Macho 2");

  const sumByType = (type: string) =>
    plantio.filter((p: any) => p.tipo === type).reduce((sum: number, p: any) => sum + (p.area || 0), 0);

  const avgCvByType = (type: string) => {
    const values = plantio
      .filter((p: any) => p.tipo === type && p.cv_plantio != null)
      .map((p: any) => p.cv_plantio as number);
    return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
  };

  const cfgTotal = toNumber(data.area_total);
  const cfgFemale = toNumber(data.area_femea);
  const cfgMale = toNumber(data.area_macho);

  const totalF = cfgFemale ?? sumByType("Fêmea");
  const totalM1 = cfgMale ?? sumByType("Macho 1");
  const totalM2 = hasMale2 ? (cfgMale ?? sumByType("Macho 2")) : null;
  const totalGeral = cfgTotal ?? (totalF + totalM1 + (totalM2 || 0));

  const avgCvF = avgCvByType("Fêmea");
  const avgCvM1 = avgCvByType("Macho 1");
  const avgCvM2 = hasMale2 ? avgCvByType("Macho 2") : null;

  const dailyMap: Record<string, { date: string; f: number; m1: number; m2: number }> = {};
  plantio.forEach((p: any) => {
    const key = p.data || "N/A";
    if (!dailyMap[key]) dailyMap[key] = { date: key, f: 0, m1: 0, m2: 0 };
    if (p.tipo === "Fêmea") dailyMap[key].f += p.area || 0;
    else if (p.tipo === "Macho 2") dailyMap[key].m2 += p.area || 0;
    else if (p.tipo === "Macho 1") dailyMap[key].m1 += p.area || 0;
  });

  const sortedDates = Object.values(dailyMap).sort((a, b) => {
    const da = parseBrDate(a.date)?.getTime() || 0;
    const db = parseBrDate(b.date)?.getTime() || 0;
    return da - db;
  });

  let cumF = 0;
  let cumM1 = 0;
  let cumM2 = 0;

  const capF = totalF || Infinity;
  const capM1 = totalM1 || Infinity;
  const capM2 = (totalM2 || 0) > 0 ? (totalM2 as number) : Infinity;

  const chartData = sortedDates.map((d) => {
    cumF = Math.min(capF, cumF + d.f);
    cumM1 = Math.min(capM1, cumM1 + d.m1);
    cumM2 = Math.min(capM2, cumM2 + d.m2);

    return {
      date: d.date,
      "Fêmea (ha)": +cumF.toFixed(1),
      "Macho 1 (ha)": +cumM1.toFixed(1),
      ...(hasMale2 ? { "Macho 2 (ha)": +cumM2.toFixed(1) } : {}),
      "Total (ha)": +(cumF + cumM1 + (hasMale2 ? cumM2 : 0)).toFixed(1),
    };
  });

  return (
    <div className="report-section">
      <div className="section-title">🚜 Plantio Realizado</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{totalF.toFixed(1)} ha</div>
          <div className="kpi-label">Fêmea (área de referência)</div>
          {avgCvF != null && <div className="kpi-sub">CV% médio: {avgCvF.toFixed(1)}%</div>}
        </div>

        <div className="kpi-card blue">
          <div className="kpi-value">{totalM1.toFixed(1)} ha</div>
          <div className="kpi-label">Macho 1 (área de referência)</div>
          {avgCvM1 != null && <div className="kpi-sub">CV% médio: {avgCvM1.toFixed(1)}%</div>}
        </div>

        {hasMale2 && totalM2 != null && (
          <div className="kpi-card blue">
            <div className="kpi-value">{totalM2.toFixed(1)} ha</div>
            <div className="kpi-label">Macho 2 (área de referência)</div>
            {avgCvM2 != null && <div className="kpi-sub">CV% médio: {avgCvM2.toFixed(1)}%</div>}
          </div>
        )}

        <div className="kpi-card orange">
          <div className="kpi-value">{totalGeral.toFixed(1)} ha</div>
          <div className="kpi-label">Área total do ciclo</div>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Evolução Acumulada do Plantio</div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Fêmea (ha)" stackId="1" stroke="#2E7D32" fill="#A5D6A7" />
              <Area type="monotone" dataKey="Macho 1 (ha)" stackId="1" stroke="#1565C0" fill="#90CAF9" />
              {hasMale2 && <Area type="monotone" dataKey="Macho 2 (ha)" stackId="1" stroke="#EF6C00" fill="#FFCC80" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data</th><th>Tipo</th><th>Gleba</th><th>Lote</th>
            <th>Área (ha)</th><th>Esp. (cm)</th><th>Sem/m</th><th>CV%</th><th>Solo</th>
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
              <td>
                {p.cv_plantio != null ? (
                  <span className={`badge ${getCvBadge(p.cv_plantio)}`}>{p.cv_plantio.toFixed(1)}%</span>
                ) : (
                  "—"
                )}
              </td>
              <td>{p.solo || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>TOTAL (área do ciclo)</td>
            <td>{totalGeral.toFixed(1)}</td>
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
