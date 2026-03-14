import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ReportAgua({ data }: { data: any }) {
  // Combine irrigation + rainfall by date
  const dateMap: Record<string, { date: string; irrigacao: number; chuva: number }> = {};
  (data.irrigacao || []).forEach((r: any) => {
    const d = r.data || "N/A";
    if (!dateMap[d]) dateMap[d] = { date: d, irrigacao: 0, chuva: 0 };
    dateMap[d].irrigacao += r.lamina_mm || 0;
  });
  (data.chuva || []).forEach((r: any) => {
    const d = r.data || "N/A";
    if (!dateMap[d]) dateMap[d] = { date: d, irrigacao: 0, chuva: 0 };
    dateMap[d].chuva += r.mm || 0;
  });
  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  // Accumulate
  let accIrr = 0, accChuva = 0;
  const chartWithAcc = chartData.map(d => {
    accIrr += d.irrigacao;
    accChuva += d.chuva;
    return { ...d, "Acum. Irrigação": +accIrr.toFixed(1), "Acum. Chuva": +accChuva.toFixed(1) };
  });

  const totalIrr = (data.irrigacao || []).reduce((s: number, r: any) => s + (r.lamina_mm || 0), 0);
  const totalChuva = (data.chuva || []).reduce((s: number, r: any) => s + (r.mm || 0), 0);

  return (
    <div className="report-section">
      <div className="section-title">💧 Água e Clima</div>
      <div className="kpi-grid">
        {totalIrr > 0 && (
          <div className="kpi-card blue">
            <div className="kpi-value">{totalIrr.toFixed(1)} mm</div>
            <div className="kpi-label">Irrigação total</div>
          </div>
        )}
        {totalChuva > 0 && (
          <div className="kpi-card">
            <div className="kpi-value">{totalChuva.toFixed(1)} mm</div>
            <div className="kpi-label">Chuva total</div>
          </div>
        )}
        {data.clima_resumo && (
          <>
            <div className="kpi-card orange">
              <div className="kpi-value">{data.clima_resumo.temp_media ?? "—"}°C</div>
              <div className="kpi-label">Temp. média</div>
            </div>
            {data.clima_resumo.gdu_total && (
              <div className="kpi-card purple">
                <div className="kpi-value">{data.clima_resumo.gdu_total}</div>
                <div className="kpi-label">GDU acumulado</div>
              </div>
            )}
          </>
        )}
      </div>

      {chartWithAcc.length > 1 && (
        <div className="chart-container">
          <div className="chart-title">Irrigação e Chuva (mm)</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartWithAcc}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="irrigacao" name="Irrigação (mm)" fill="#1565C0" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="chuva" name="Chuva (mm)" fill="#2E7D32" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="Acum. Irrigação" stroke="#1565C0" strokeDasharray="4 4" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="Acum. Chuva" stroke="#2E7D32" strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
