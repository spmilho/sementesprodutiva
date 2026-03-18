import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TYPE_LABELS: Record<string, string> = {
  insecticide: "Inseticida",
  herbicide: "Herbicida",
  fungicide: "Fungicida",
  fertilizer: "Fertilizante",
  fertilizer_macro: "Adubo Macro",
  fertilizer_micro: "Micro/Foliar",
  adjuvant: "Adjuvante",
  seed_treatment: "TS",
  seed: "TS",
  growth_regulator: "Regulador",
  biological: "Biológico",
  other: "Outro",
};

const COLORS = ["#2E7D32", "#1565C0", "#EF6C00", "#7B1FA2", "#C62828", "#00838F", "#4E342E", "#546E7A"];

const STAGES_ORDER = ["DESSEC.", "TS", "VE", "V1-V2", "V3-V4", "V6-V8", "V10-V12", "V14-VT", "VT-R1", "R2-R3", "R4-R5", "R6"];

const TYPE_COLORS: Record<string, string> = {
  fertilizer_macro: "#2E7D32",
  fertilizer_micro: "#10B981",
  insecticide: "#F59E0B",
  herbicide: "#1D4ED8",
  fungicide: "#22C55E",
  adjuvant: "#9CA3AF",
  seed: "#0D9488",
  other: "#6B7280",
};

function getDapRange(dap: number): string {
  if (dap <= 7) return "VE";
  if (dap <= 14) return "V1-V2";
  if (dap <= 21) return "V3-V4";
  if (dap <= 35) return "V6-V8";
  if (dap <= 45) return "V10-V12";
  if (dap <= 55) return "V14-VT";
  if (dap <= 65) return "VT-R1";
  if (dap <= 80) return "R2-R3";
  if (dap <= 100) return "R4-R5";
  return "R6";
}

function fmt2(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toFixed(2).replace(".", ",");
}

function buildStageProducts(insumos: any[], plantingDateIso: string | null, tratamentos: any[]) {
  const map: Record<string, { type: string; name: string; dose: string }[]> = {};
  STAGES_ORDER.forEach(s => { map[s] = []; });

  const seen = new Set<string>();

  // Add TS products from tratamentos
  if (tratamentos?.length > 0) {
    const prods = tratamentos[0]?.produtos || [];
    prods.forEach((p: any) => {
      const key = `TS_${p.produto}`;
      if (seen.has(key)) return;
      seen.add(key);
      map["TS"].push({
        type: "seed",
        name: p.produto,
        dose: p.dose != null ? `${Number(p.dose).toFixed(2)} ${p.dose_unidade || ""}/ha` : "",
      });
    });
  }

  insumos.forEach((inp: any) => {
    const dateIso = inp.data_exec_iso || inp.data_rec_iso;
    if (!dateIso) return;

    let stage = inp.estadio;
    if (!stage && plantingDateIso) {
      const dap = Math.floor((new Date(dateIso).getTime() - new Date(plantingDateIso).getTime()) / 86400000);
      stage = dap < 0 ? "DESSEC." : getDapRange(dap);
    }
    if (!stage) return;

    const stageIdx = STAGES_ORDER.indexOf(stage);
    if (stageIdx < 0) return;

    const prodKey = `${stage}_${inp.produto}_${inp.tipo}`;
    if (seen.has(prodKey)) return;
    seen.add(prodKey);

    map[stage].push({
      type: inp.tipo || "other",
      name: inp.produto,
      dose: inp.dose_ha != null ? `${fmt2(inp.dose_ha)} ${inp.unidade || ""}/ha` : "",
    });
  });

  return map;
}

export default function ReportManejo({ data }: { data: any }) {
  const insumos = (data.insumos || []).filter((i: any) => {
    const dose = Number(i.dose_ha);
    return !(dose === 0);
  });

  const typeCounts: Record<string, number> = {};
  insumos.forEach((i: any) => {
    const t = i.tipo || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const pieData = Object.entries(typeCounts).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v }));

  const dateMap: Record<string, Record<string, number>> = {};
  insumos.forEach((i: any) => {
    const d = i.data_exec || i.data_rec || "N/A";
    const t = TYPE_LABELS[i.tipo] || i.tipo || "Outro";
    if (!dateMap[d]) dateMap[d] = {};
    dateMap[d][t] = (dateMap[d][t] || 0) + 1;
  });

  const allTypes = [...new Set(insumos.map((i: any) => TYPE_LABELS[i.tipo] || i.tipo || "Outro"))];
  const barData = Object.entries(dateMap).map(([date, types]) => ({ date, ...types }));

  const applied = insumos.filter((i: any) => i.status === "applied").length;
  const recommended = insumos.filter((i: any) => i.status === "recommended").length;

  // Find earliest female planting date for DAP calculation
  const plantingDateIso = (data.plantio || [])
    .filter((p: any) => p.tipo === "Fêmea" && p.data_iso)
    .sort((a: any, b: any) => (a.data_iso || "").localeCompare(b.data_iso || ""))
    [0]?.data_iso || null;

  const stageProducts = buildStageProducts(insumos, plantingDateIso, data.tratamentos);
  const hasTimeline = Object.values(stageProducts).some(arr => arr.length > 0);
  const maxProducts = Math.max(...Object.values(stageProducts).map(a => a.length), 1);

  return (
    <div className="report-section">
      <div className="section-title">🧪 Manejo de Insumos</div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-value">{insumos.length}</div>
          <div className="kpi-label">Total de registros</div>
        </div>
        <div className="kpi-card blue">
          <div className="kpi-value">{applied}</div>
          <div className="kpi-label">Aplicados</div>
        </div>
        {recommended > 0 && (
          <div className="kpi-card orange">
            <div className="kpi-value">{recommended}</div>
            <div className="kpi-label">Recomendados</div>
          </div>
        )}
      </div>

      {pieData.length > 0 && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <div className="chart-title">Distribuição por Tipo</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pieData.map((entry: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, background: "#f5f5f5", borderRadius: 6, padding: "6px 12px" }}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, backgroundColor: COLORS[i % COLORS.length], flexShrink: 0 }} />
                <span style={{ color: "#333" }}>{entry.name}: <strong>{entry.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline de Manejo por Fenologia */}
      {hasTimeline && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <div className="chart-title">🌱 Timeline de Manejo por Fenologia</div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 800 }}>
              {/* Products stacked above */}
              <div style={{ display: "flex", alignItems: "flex-end", minHeight: maxProducts * 32 + 10 }}>
                {STAGES_ORDER.map(stage => {
                  const products = stageProducts[stage];
                  return (
                    <div key={stage} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 3, padding: "0 2px" }}>
                      {products.map((p, i) => {
                        const bgColor = TYPE_COLORS[p.type] || TYPE_COLORS.other;
                        return (
                          <div
                            key={i}
                            style={{
                              backgroundColor: bgColor,
                              color: "#fff",
                              borderRadius: 4,
                              padding: "2px 6px",
                              fontSize: 9,
                              fontWeight: 600,
                              lineHeight: 1.3,
                              textAlign: "center",
                              width: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`${p.name}${p.dose ? ` — ${p.dose}` : ""}`}
                          >
                            {p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name}
                            {p.dose && (
                              <div style={{ fontSize: 8, fontWeight: 400, opacity: 0.85 }}>{p.dose}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Connector dashes */}
              <div style={{ display: "flex", marginTop: 4 }}>
                {STAGES_ORDER.map(stage => (
                  <div key={stage} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                    {stageProducts[stage].length > 0 && (
                      <div style={{ width: 1, height: 12, borderLeft: "1px dashed #aaa" }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Growth stage bar */}
              <div style={{ display: "flex" }}>
                {STAGES_ORDER.map((stage, i) => {
                  const isVegetative = !stage.startsWith("R") && stage !== "VT-R1";
                  return (
                    <div
                      key={stage}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "5px 2px",
                        fontSize: 10,
                        fontWeight: 700,
                        borderTop: `3px solid ${isVegetative ? "#22C55E" : "#F59E0B"}`,
                        backgroundColor: isVegetative ? "#DCFCE7" : "#FEF3C7",
                        color: isVegetative ? "#166534" : "#92400E",
                        borderRadius: i === 0 ? "4px 0 0 4px" : i === STAGES_ORDER.length - 1 ? "0 4px 4px 0" : 0,
                      }}
                    >
                      {stage}
                    </div>
                  );
                })}
              </div>

              {/* Corn growth icons */}
              <div style={{ display: "flex", marginTop: 4 }}>
                {STAGES_ORDER.map((_, i) => {
                  const heights = [8, 10, 14, 18, 24, 32, 38, 44, 44, 40, 36, 30];
                  const h = heights[i] || 20;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                      <div
                        style={{
                          width: 6,
                          height: h,
                          borderRadius: "2px 2px 0 0",
                          background: "linear-gradient(to top, #15803D, #4ADE80)",
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, paddingLeft: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#666" }}>LEGENDA:</span>
                {Object.entries(TYPE_COLORS).filter(([k]) => k !== "other").map(([key, color]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: color }} />
                    <span style={{ fontSize: 10, color: "#666" }}>{TYPE_LABELS[key] || key}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {barData.length > 1 && (
        <div className="chart-container" style={{ marginBottom: 16 }}>
          <div className="chart-title">Aplicações por Data</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={70} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              {allTypes.map((t: any, i: number) => (
                <Bar key={String(t)} dataKey={String(t)} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <table className="report-table">
        <thead>
          <tr>
            <th>Data Exec.</th>
            <th>Produto</th>
            <th>I.A.</th>
            <th>Tipo</th>
            <th>Dose/ha</th>
            <th>Unid.</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map((i: any, idx: number) => (
            <tr key={idx}>
              <td>{i.data_exec || "—"}</td>
              <td style={{ fontWeight: 500 }}>{i.produto}</td>
              <td>{i.ia ?? "—"}</td>
              <td>{TYPE_LABELS[i.tipo] || i.tipo || "—"}</td>
              <td>{fmt2(i.dose_ha)}</td>
              <td>{i.unidade || "—"}</td>
              <td>
                <span
                  className={`badge ${
                    i.status === "applied"
                      ? "badge-green"
                      : i.status === "recommended"
                        ? "badge-yellow"
                        : "badge-blue"
                  }`}
                >
                  {i.status === "applied" ? "Aplicado" : i.status === "recommended" ? "Recomendado" : i.status || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
