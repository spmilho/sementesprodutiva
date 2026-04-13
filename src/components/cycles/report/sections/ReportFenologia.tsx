import CornPlantSvg from "@/components/cycles/phenology/CornPlantSvg";

const STAGES = ["VE", "V1", "V2", "V4", "V6", "V8", "V10", "V12", "V14/Vn", "VT", "R1", "R2", "R3", "R4", "R5", "R6"];

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function normalizeStage(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  return STAGES.includes(v) ? v : null;
}

function buildStageMap(records: any[]) {
  const map = new Map<string, any>();
  records.forEach((r) => {
    const stage = normalizeStage(r.estadio);
    if (!stage) return;
    const current = map.get(stage);
    if (!current) {
      map.set(stage, r);
      return;
    }
    const currentDate = parseBrDate(current.data)?.getTime() || 0;
    const nextDate = parseBrDate(r.data)?.getTime() || 0;
    if (nextDate > currentDate) map.set(stage, r);
  });
  return map;
}

function getLatestStageIndex(stageMap: Map<string, any>) {
  let idx = -1;
  STAGES.forEach((s, i) => {
    if (stageMap.has(s)) idx = i;
  });
  return idx;
}

function TimelineBlock({ title, records, accent }: { title: string; records: any[]; accent: string }) {
  const stageMap = buildStageMap(records);
  const currentIdx = getLatestStageIndex(stageMap);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#263238", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
        {STAGES.map((stage, i) => {
          const rec = stageMap.get(stage);
          const isReached = i <= currentIdx; // includes skipped stages
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div
              key={stage}
              style={{
                minWidth: 84,
                borderRadius: 12,
                padding: "8px 6px",
                textAlign: "center",
                border: isCurrent ? `2px solid ${accent}` : "1px solid #E0E0E0",
                background: isCurrent ? "#E8F5E9" : isReached ? "#F1F8E9" : "#FAFAFA",
                boxShadow: isCurrent ? `0 0 8px ${accent}40` : "none",
              }}
            >
              <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CornPlantSvg stage={stage} isFuture={isFuture} isCurrent={isCurrent} size={0.7} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? "#2E7D32" : isFuture ? "#9E9E9E" : "#263238", marginTop: 2 }}>{stage}</div>
              {isCurrent && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "#2E7D32", display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  🌿 Atual
                </div>
              )}
              {isReached && !isCurrent && rec && (
                <div style={{ fontSize: 10, color: "#4CAF50" }}>✓</div>
              )}
              <div style={{ fontSize: 10, color: isFuture ? "#BDBDBD" : "#607D8B", marginTop: 2 }}>{rec?.data || "—"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportFenologia({ data }: { data: any }) {
  const femaleRecords = (data.fenologia || []).filter((f: any) => String(f.parental || "").toLowerCase().includes("fême") || String(f.parental || "").toLowerCase().includes("feme"));
  const male1Records = (data.fenologia || []).filter((f: any) => {
    const p = String(f.parental || "").toLowerCase();
    return p.includes("macho 1") || p === "male_1";
  });
  const male2Records = (data.fenologia || []).filter((f: any) => {
    const p = String(f.parental || "").toLowerCase();
    return p.includes("macho 2") || p === "male_2";
  });

  return (
    <div className="report-section">
      <div className="section-title">🌾 Fenologia</div>
      <TimelineBlock title="Parental Fêmea" records={femaleRecords} accent="#7E57C2" />
      <TimelineBlock title="Parental Macho 1" records={male1Records} accent="#1565C0" />
      <TimelineBlock title="Parental Macho 2" records={male2Records} accent="#00838F" />
    </div>
  );
}
