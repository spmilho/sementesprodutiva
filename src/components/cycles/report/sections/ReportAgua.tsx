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

function parseBrDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export default function ReportAgua({ data }: { data: any }) {
  const irrigacao = data.irrigacao || [];
  const chuva = data.chuva || [];
  const clima = (data.clima || []).slice().sort((a: any, b: any) => {
    const da = (a.data_iso ? new Date(a.data_iso + "T12:00:00") : parseBrDate(a.data))?.getTime() || 0;
    const db = (b.data_iso ? new Date(b.data_iso + "T12:00:00") : parseBrDate(b.data))?.getTime() || 0;
    return da - db;
  });

  const totalIrr = irrigacao.reduce((s: number, r: any) => s + (Number(r.lamina_mm) || 0), 0);
  const totalChuva = chuva.reduce((s: number, r: any) => s + (Number(r.mm) || 0), 0);

  const waterByDateMap: Record<string, { data: string; irrigacao: number; chuva: number; data_iso?: string }> = {};

  irrigacao.forEach((r: any) => {
    const key = r.data_iso || r.data || "N/A";
    if (!waterByDateMap[key]) waterByDateMap[key] = { data: r.data || "N/A", irrigacao: 0, chuva: 0, data_iso: r.data_iso };
    waterByDateMap[key].irrigacao += Number(r.lamina_mm) || 0;
  });

  chuva.forEach((r: any) => {
    const key = r.data_iso || r.data || "N/A";
    if (!waterByDateMap[key]) waterByDateMap[key] = { data: r.data || "N/A", irrigacao: 0, chuva: 0, data_iso: r.data_iso };
    waterByDateMap[key].chuva += Number(r.mm) || 0;
  });

  const waterData = Object.values(waterByDateMap)
    .sort((a, b) => {
      const da = (a.data_iso ? new Date(a.data_iso + "T12:00:00") : parseBrDate(a.data))?.getTime() || 0;
      const db = (b.data_iso ? new Date(b.data_iso + "T12:00:00") : parseBrDate(b.data))?.getTime() || 0;
      return da - db;
    })
    .map((d) => ({
      ...d,
      total: d.irrigacao + d.chuva,
    }));

  let accWater = 0;
  const waterDataWithAcc = waterData.map((d) => {
    accWater += d.total;
    return {
      ...d,
      acumulado: Number(accWater.toFixed(1)),
    };
  });

  const stageTransitions = clima
    .filter((r: any) => !!r.estadio)
    .filter((r: any, idx: number, arr: any[]) => idx === 0 || arr[idx - 1].estadio !== r.estadio)
    .map((r: any) => ({ data: r.data, estadio: r.estadio }));

  const hasTemp = clima.some((r: any) => r.temp_max != null || r.temp_min != null || r.temp_media != null);
  const hasHumidity = clima.some((r: any) => r.ur_max != null || r.ur_min != null || r.ur_media != null);
  const hasGdu = clima.some((r: any) => r.gdu_diario != null || r.gdu_acumulado != null);
  const hasWindEto = clima.some((r: any) => r.vento_media != null || r.eto_mm != null || r.chuva_mm != null);

  const avgTemp = clima.length > 0
    ? clima.filter((r: any) => r.temp_media != null).reduce((s: number, r: any) => s + Number(r.temp_media), 0) /
      Math.max(1, clima.filter((r: any) => r.temp_media != null).length)
    : null;

  const avgUr = clima.length > 0
    ? clima.filter((r: any) => r.ur_media != null).reduce((s: number, r: any) => s + Number(r.ur_media), 0) /
      Math.max(1, clima.filter((r: any) => r.ur_media != null).length)
    : null;

  const totalGdu = clima.length > 0 ? clima[clima.length - 1]?.gdu_acumulado || null : null;

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
            <ComposedChart data={clima}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`temp-stage-${i}`} x={t.data} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "bottom", fontSize: 9, fill: "#2E7D32" }} />
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
            <ComposedChart data={clima}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`hum-stage-${i}`} x={t.data} stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "bottom", fontSize: 9, fill: "#2E7D32" }} />
              ))}
              <Area type="monotone" dataKey="ur_max" name="UR Máx" fill="#B3E5FC" stroke="#0288D1" fillOpacity={0.35} />
              <Area type="monotone" dataKey="ur_min" name="UR Mín" fill="#FFE082" stroke="#F9A825" fillOpacity={0.35} />
              <Line type="monotone" dataKey="ur_media" name="UR Média" stroke="#1976D2" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasWindEto && (
        <div className="chart-container">
          <div className="chart-title">Vento, ETo e Chuva</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={clima}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`vento-stage-${i}`} x={t.data} yAxisId="left" stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "bottom", fontSize: 9, fill: "#2E7D32" }} />
              ))}
              <Bar yAxisId="left" dataKey="eto_mm" name="ETo (mm)" fill="#FBC02D" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="chuva_mm" name="Chuva (mm)" fill="#1E88E5" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="vento_media" name="Vento (km/h)" stroke="#757575" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasGdu && (
        <div className="chart-container">
          <div className="chart-title">GDU Diário e Acumulado</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={clima}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="data" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {stageTransitions.map((t: any, i: number) => (
                <ReferenceLine key={`gdu-stage-${i}`} x={t.data} yAxisId="left" stroke="#2E7D32" strokeDasharray="4 4" label={{ value: t.estadio, position: "bottom", fontSize: 9, fill: "#2E7D32" }} />
              ))}
              <Bar yAxisId="left" dataKey="gdu_diario" name="GDU diário" fill="#FB8C00" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="gdu_acumulado" name="GDU acumulado" stroke="#C62828" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
