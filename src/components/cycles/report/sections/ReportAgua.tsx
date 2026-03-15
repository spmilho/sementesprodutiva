import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
} from "recharts";

const T_BASE = 10;
const T_MAX_CAP = 30;

function calcGDU(tmax: number | null, tmin: number | null): number {
  if (tmax == null || tmin == null) return 0;
  const adjMax = Math.min(tmax, T_MAX_CAP);
  const adjMin = Math.max(tmin, T_BASE);
  const gdu = (adjMax + adjMin) / 2 - T_BASE;
  return Math.max(0, gdu);
}

function normalizeDateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const br = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function dateKeyToTs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0).getTime();
}

function parseDateForSort(dataStr: string | null | undefined, isoStr: string | null | undefined): number {
  const key = normalizeDateKey(isoStr) || normalizeDateKey(dataStr);
  return key ? dateKeyToTs(key) : 0;
}

function fmtDateFromIso(iso: string | null | undefined): string {
  const key = normalizeDateKey(iso);
  if (!key) return "N/A";
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

function normalizeParent(tipo: string): "Fêmea" | "Macho 1" | "Macho 2" | "other" {
  const t = tipo.toLowerCase();
  if (t.includes("fêmea") || t.includes("femea")) return "Fêmea";
  if (t.includes("macho 2")) return "Macho 2";
  if (t.includes("macho")) return "Macho 1";
  return "other";
}

export default function ReportAgua({ data }: { data: any }) {
  const irrigacao = data.irrigacao || [];
  const chuva = data.chuva || [];

  const clima = (data.clima || []).slice().sort((a: any, b: any) => {
    return parseDateForSort(a.data, a.data_iso) - parseDateForSort(b.data, b.data_iso);
  });

  const climaFixed = clima.map((r: any) => ({
    ...r,
    data: r.data_iso ? fmtDateFromIso(r.data_iso) : r.data,
  }));

  const totalIrr = irrigacao.reduce((s: number, r: any) => s + (Number(r.lamina_mm) || 0), 0);
  const totalChuva = chuva.reduce((s: number, r: any) => s + (Number(r.mm) || 0), 0);

  const waterByDateMap: Record<string, { data: string; irrigacao: number; chuva: number; _sortTs: number }> = {};

  irrigacao.forEach((r: any) => {
    const key = normalizeDateKey(r.data_iso) || normalizeDateKey(r.data) || "N/A";
    const display = key !== "N/A" ? fmtDateFromIso(key) : (r.data || "N/A");
    if (!waterByDateMap[key]) {
      waterByDateMap[key] = {
        data: display,
        irrigacao: 0,
        chuva: 0,
        _sortTs: key !== "N/A" ? dateKeyToTs(key) : 0,
      };
    }
    waterByDateMap[key].irrigacao += Number(r.lamina_mm) || 0;
  });

  chuva.forEach((r: any) => {
    const key = normalizeDateKey(r.data_iso) || normalizeDateKey(r.data) || "N/A";
    const display = key !== "N/A" ? fmtDateFromIso(key) : (r.data || "N/A");
    if (!waterByDateMap[key]) {
      waterByDateMap[key] = {
        data: display,
        irrigacao: 0,
        chuva: 0,
        _sortTs: key !== "N/A" ? dateKeyToTs(key) : 0,
      };
    }
    waterByDateMap[key].chuva += Number(r.mm) || 0;
  });

  const waterData = Object.values(waterByDateMap)
    .sort((a, b) => a._sortTs - b._sortTs)
    .map((d) => ({ ...d, total: d.irrigacao + d.chuva }));

  let accWater = 0;
  const waterDataWithAcc = waterData.map((d) => {
    accWater += d.total;
    return { ...d, acumulado: Number(accWater.toFixed(1)) };
  });

  const stageTransitions = climaFixed
    .filter((r: any) => !!r.estadio)
    .filter((r: any, idx: number, arr: any[]) => idx === 0 || arr[idx - 1].estadio !== r.estadio)
    .map((r: any) => ({ data: r.data, estadio: r.estadio }));

  const hasTemp = climaFixed.some((r: any) => r.temp_max != null || r.temp_min != null || r.temp_media != null);
  const hasHumidity = climaFixed.some((r: any) => r.ur_max != null || r.ur_min != null || r.ur_media != null);
  const hasGdu = climaFixed.some((r: any) => r.gdu_diario != null || r.gdu_acumulado != null);
  const hasRadiation = climaFixed.some((r: any) => r.radiacao_mj != null);

  const avgTemp = climaFixed.length > 0
    ? climaFixed.filter((r: any) => r.temp_media != null).reduce((s: number, r: any) => s + Number(r.temp_media), 0) /
      Math.max(1, climaFixed.filter((r: any) => r.temp_media != null).length)
    : null;

  const avgUr = climaFixed.length > 0
    ? climaFixed.filter((r: any) => r.ur_media != null).reduce((s: number, r: any) => s + Number(r.ur_media), 0) /
      Math.max(1, climaFixed.filter((r: any) => r.ur_media != null).length)
    : null;

  const totalGdu = climaFixed.length > 0 ? climaFixed[climaFixed.length - 1]?.gdu_acumulado || null : null;

  // ── GDU per parental ──
  // Build daily GDU map from weather data
  const dailyGduMap = new Map<string, number>();
  climaFixed.forEach((r: any) => {
    const key = r.data_iso;
    if (key) dailyGduMap.set(key, calcGDU(Number(r.temp_max), Number(r.temp_min)));
  });

  // Extract unique planting dates per parental from plantio data
  const plantio = data.plantio || [];
  const getPlantingDates = (parentType: string): string[] => {
    const dates = new Set<string>();
    plantio.forEach((p: any) => {
      if (normalizeParent(p.tipo) === parentType && p.data_iso) dates.add(p.data_iso);
    });
    return Array.from(dates).sort();
  };

  const femaleDates = getPlantingDates("Fêmea");
  const male1Dates = getPlantingDates("Macho 1");
  const male2Dates = getPlantingDates("Macho 2");

  const buildGduByPlanting = (plantingDates: string[], prefix: string) => {
    if (plantingDates.length === 0 || climaFixed.length === 0) return [];
    const earliestPlanting = plantingDates[0];
    const lastWeatherDate = climaFixed[climaFixed.length - 1]?.data_iso;
    if (!earliestPlanting || !lastWeatherDate) return [];

    const startTs = parseDateForSort(null, earliestPlanting);
    const endTs = parseDateForSort(null, lastWeatherDate);
    const allDates: string[] = [];
    const cursor = new Date(new Date(startTs));
    const endDate = new Date(endTs);
    while (cursor <= endDate) {
      allDates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return allDates.map(dateStr => {
      const currentTs = parseDateForSort(null, dateStr);
      const row: Record<string, any> = { dateLabel: fmtDateFromIso(dateStr) };
      plantingDates.forEach((plantDate) => {
        const plantStartTs = parseDateForSort(null, plantDate) + 86400000; // D+1 rule
        if (currentTs < plantStartTs) { row[`${prefix}_${plantDate}`] = null; return; }
        let acc = 0;
        for (const [dKey, dailyGdu] of dailyGduMap.entries()) {
          const ts = parseDateForSort(null, dKey);
          if (ts >= plantStartTs && ts <= currentTs) acc += dailyGdu;
        }
        row[`${prefix}_${plantDate}`] = Math.round(acc);
      });
      return row;
    });
  };

  const gduFemaleData = buildGduByPlanting(femaleDates, "gdu_f");
  const gduMale1Data = buildGduByPlanting(male1Dates, "gdu_m1");
  const gduMale2Data = buildGduByPlanting(male2Dates, "gdu_m2");

  const FEMALE_COLORS = ["#7B1FA2", "#AB47BC", "#CE93D8", "#4A148C", "#9C27B0", "#E1BEE7"];
  const MALE1_COLORS = ["#1565C0", "#42A5F5", "#90CAF9", "#0D47A1", "#1976D2", "#BBDEFB"];
  const MALE2_COLORS = ["#E65100", "#FB8C00", "#FFCC80", "#BF360C", "#EF6C00", "#FFE0B2"];

  const renderGduChart = (title: string, chartData: any[], plantingDates: string[], prefix: string, colors: string[]) => {
    if (chartData.length === 0) return null;
    return (
      <div className="chart-container">
        <div className="chart-title">{title}</div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {plantingDates.map((d, i) => (
              <Line
                key={d}
                type="monotone"
                dataKey={`${prefix}_${d}`}
                name={`Plantio ${fmtDateFromIso(d)}`}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="report-section">
      <div className="section-title">💧 Irrigação e Clima</div>

      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-value">{totalIrr.toFixed(1)} mm</div>
          <div className="kpi-label">Irrigação total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-value">{totalChuva.toFixed(1)} mm</div>
          <div className="kpi-label">Chuva total</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{avgTemp != null ? avgTemp.toFixed(1) : "—"}°C</div>
          <div className="kpi-label">Temperatura média</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-value">{avgUr != null ? avgUr.toFixed(0) : "—"}%</div>
          <div className="kpi-label">UR média</div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-value">{totalGdu ?? "—"}</div>
          <div className="kpi-label">GDU acumulado</div>
        </div>
      </div>

      {waterDataWithAcc.length > 0 && (
        <div className="chart-container">
          <div className="chart-title">Irrigação + Chuva (Consolidado)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={waterDataWithAcc}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="chuva" name="Chuva (mm)" fill="#2E7D32" stackId="a" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="irrigacao" name="Irrigação (mm)" fill="#1565C0" stackId="a" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado (mm)" stroke="#C62828" strokeDasharray="5 5" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasTemp && (
        <div className="chart-container">
          <div className="chart-title">Temperatura (°C)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={climaFixed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`temp-stage-${i}`} x={t.data} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "top", fontSize: 8, fill: "#2E7D32" }} />
              ))}
              <Area type="monotone" dataKey="temp_max" name="Máx" fill="#FFCDD2" stroke="#D32F2F" fillOpacity={0.35} />
              <Area type="monotone" dataKey="temp_min" name="Mín" fill="#BBDEFB" stroke="#1976D2" fillOpacity={0.35} />
              <Line type="monotone" dataKey="temp_media" name="Média" stroke="#EF6C00" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasHumidity && (
        <div className="chart-container">
          <div className="chart-title">Umidade Relativa (%)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={climaFixed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`hum-stage-${i}`} x={t.data} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "top", fontSize: 8, fill: "#2E7D32" }} />
              ))}
              <Area type="monotone" dataKey="ur_max" name="UR Máx" fill="#B3E5FC" stroke="#0288D1" fillOpacity={0.35} />
              <Area type="monotone" dataKey="ur_min" name="UR Mín" fill="#FFE082" stroke="#F9A825" fillOpacity={0.35} />
              <Line type="monotone" dataKey="ur_media" name="UR Média" stroke="#1976D2" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasGdu && (
        <div className="chart-container">
          <div className="chart-title">GDU Diário e Acumulado</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={climaFixed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`gdu-stage-${i}`} x={t.data} yAxisId="left" stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "top", fontSize: 8, fill: "#2E7D32" }} />
              ))}
              <Bar yAxisId="left" dataKey="gdu_diario" name="GDU diário" fill="#FB8C00" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="gdu_acumulado" name="GDU acumulado" stroke="#C62828" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* GDU per parental */}
      {renderGduChart("GDU Acumulado — Fêmea", gduFemaleData, femaleDates, "gdu_f", FEMALE_COLORS)}
      {renderGduChart("GDU Acumulado — Macho 1", gduMale1Data, male1Dates, "gdu_m1", MALE1_COLORS)}
      {renderGduChart("GDU Acumulado — Macho 2", gduMale2Data, male2Dates, "gdu_m2", MALE2_COLORS)}

      {hasRadiation && (
        <div className="chart-container">
          <div className="chart-title">Radiação Solar (MJ/m²)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={climaFixed}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`rad-stage-${i}`} x={t.data} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "top", fontSize: 8, fill: "#2E7D32" }} />
              ))}
              <Area type="monotone" dataKey="radiacao_mj" name="Radiação (MJ/m²)" fill="#FFF9C4" stroke="#F9A825" fillOpacity={0.5} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
