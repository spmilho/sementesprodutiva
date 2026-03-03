import { useMemo, useRef, useCallback } from "react";
import { UbsKPI } from "./UbsCard";
import { getWeekLabels, getWeeklyDemand, getClientVolumes, getWeeklyChangeovers, getWeeklyEffectiveClassificacao, getChangeoverLossPerHybridPhase2, getClassificacaoRateTH, getPhaseWeeklyCap, type UbsState } from "./types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  Line, Area, AreaChart, PieChart, Pie, Cell, ComposedChart,
} from "recharts";
import { Download } from "lucide-react";

interface Props {
  state: UbsState;
  weeklyClassificacao: number;
  weeklyTratamento: number;
}

function ExportBtn({ chartRef, name }: { chartRef: React.RefObject<HTMLDivElement>; name: string }) {
  const exportPng = useCallback(async () => {
    if (!chartRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#0f1f14" });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${name}.png`;
    a.click();
  }, [chartRef, name]);
  return (
    <button onClick={exportPng} className="absolute top-2 right-2 p-1.5 rounded bg-[#0f1f14]/60 hover:bg-[#0f1f14] transition-colors z-10" title="Exportar PNG">
      <Download className="w-3.5 h-3.5 text-[#8aac8f]" />
    </button>
  );
}

function ChartWrapper({ title, children, name }: { title: string; children: (ref: React.RefObject<HTMLDivElement>) => React.ReactNode; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="bg-[#162b1c] border border-[#2a4a32] rounded-lg p-4 relative">
      <ExportBtn chartRef={ref} name={name} />
      <h4 className="text-xs font-semibold text-[#c8e6c9] mb-3 font-['Syne',sans-serif]">{title}</h4>
      <div ref={ref}>{children(ref)}</div>
    </div>
  );
}

const DemandTooltipPhase2 = ({ active, payload, label, weeklyClassificacao, weeklyTratamento }: any) => {
  if (!active || !payload?.length) return null;
  const clientEntries = payload.filter((p: any) => p.stackId === "demand");
  const total = clientEntries.reduce((s: number, p: any) => s + (p.value || 0), 0);
  const capEffective = payload.find((p: any) => p.dataKey === "capEffective")?.value ?? weeklyClassificacao;
  const changeoverLoss = weeklyClassificacao - capEffective;
  const balEfetivo = capEffective - total;
  const balTrat = weeklyTratamento - total;
  const pctEfetivo = capEffective > 0 ? ((total / capEffective) * 100).toFixed(0) : "0";
  return (
    <div className="bg-[#0f1f14] border border-[#2a4a32] rounded-lg p-3 text-xs shadow-xl min-w-[200px]">
      <p className="font-semibold text-[#e8f5e9] mb-2 font-['Syne',sans-serif]">{label}</p>
      {clientEntries.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill || p.color }}>● {p.name}</span>
          <span className="text-[#e8f5e9] font-['DM_Mono',monospace]">{p.value?.toLocaleString("pt-BR")} t</span>
        </div>
      ))}
      <hr className="my-1.5 border-[#2a4a32]" />
      <div className="flex justify-between font-semibold">
        <span className="text-[#e8f5e9]">Demanda</span>
        <span className="text-[#e8f5e9] font-['DM_Mono',monospace]">{total.toLocaleString("pt-BR")} t</span>
      </div>
      <div className="mt-1.5 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-[#38BDF8]">Cap. Bruta Classif.</span>
          <span className="text-[#38BDF8] font-['DM_Mono',monospace]">{weeklyClassificacao.toLocaleString("pt-BR")} t</span>
        </div>
        {changeoverLoss > 0 && (
          <div className="flex justify-between">
            <span className="text-[#F97316]">Perda Changeover</span>
            <span className="text-[#F97316] font-['DM_Mono',monospace]">−{changeoverLoss.toFixed(0)} t</span>
          </div>
        )}
        <div className="flex justify-between font-semibold">
          <span className="text-[#F97316]">Cap. Efetiva</span>
          <span className="text-[#F97316] font-['DM_Mono',monospace]">{capEffective.toFixed(0)} t</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8aac8f]">Balanço Efetivo</span>
          <span className="font-['DM_Mono',monospace]" style={{ color: balEfetivo >= 0 ? "#38BDF8" : "#FF6B6B" }}>
            {balEfetivo >= 0 ? "+" : ""}{balEfetivo.toFixed(0)} t ({pctEfetivo}%)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#C084FC]">Trat. & Ensaque</span>
          <span className="font-['DM_Mono',monospace]" style={{ color: balTrat >= 0 ? "#C084FC" : "#FF6B6B" }}>
            {balTrat >= 0 ? "+" : ""}{balTrat.toLocaleString("pt-BR")} t
          </span>
        </div>
      </div>
    </div>
  );
};

export function AnalysisDashboardPhase2Tab({ state, weeklyClassificacao, weeklyTratamento }: Props) {
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const weeklyDemand = getWeeklyDemand(state.clients, state.numWeeks);
  const weeklyEffective = getWeeklyEffectiveClassificacao(state);

  const chartData = useMemo(() =>
    weekLabels.map((label, i) => {
      const entry: any = { name: label };
      state.clients.forEach((c) => { entry[c.name] = getClientVolumes(c, state.numWeeks)[i] || 0; });
      entry.total = weeklyDemand[i];
      entry.balanceClassif = weeklyClassificacao - weeklyDemand[i];
      entry.balanceTrat = weeklyTratamento - weeklyDemand[i];
      entry.pctUtilClassif = weeklyClassificacao > 0 ? (weeklyDemand[i] / weeklyClassificacao) * 100 : 0;
      entry.pctUtilTrat = weeklyTratamento > 0 ? (weeklyDemand[i] / weeklyTratamento) * 100 : 0;
      entry.capClassificacao = weeklyClassificacao;
      entry.capTratamento = weeklyTratamento;
      entry.capEffective = weeklyEffective[i];
      entry.changeoverLoss = weeklyClassificacao - weeklyEffective[i];
      return entry;
    }), [weekLabels, state.clients, weeklyDemand, weeklyClassificacao, weeklyTratamento, weeklyEffective]);

  // KPIs
  const totalDemand = weeklyDemand.reduce((a, b) => a + b, 0);
  const peakWeekIdx = weeklyDemand.indexOf(Math.max(...weeklyDemand));
  const peakDemand = weeklyDemand[peakWeekIdx];
  const deficitWeeksClassif = weeklyDemand.filter((d) => d > weeklyClassificacao).length;
  const deficitWeeksTrat = weeklyDemand.filter((d) => d > weeklyTratamento).length;
  const activeWeeks = weeklyDemand.filter((d) => d > 0);
  const avgUtilClassif = activeWeeks.length > 0 ? activeWeeks.reduce((s, d) => s + (d / weeklyClassificacao) * 100, 0) / activeWeeks.length : 0;
  const avgUtilTrat = activeWeeks.length > 0 ? activeWeeks.reduce((s, d) => s + (d / weeklyTratamento) * 100, 0) / activeWeeks.length : 0;

  // Changeover KPIs
  const activeEffectiveWeeks = weeklyDemand.map((d, i) => ({ d, eff: weeklyEffective[i] })).filter(({ d }) => d > 0);
  const avgEffectiveCap = activeEffectiveWeeks.length > 0 ? activeEffectiveWeeks.reduce((s, { eff }) => s + eff, 0) / activeEffectiveWeeks.length : weeklyClassificacao;
  const totalChangeoverLoss = weeklyDemand.reduce((s, d, i) => s + (d > 0 ? weeklyClassificacao - weeklyEffective[i] : 0), 0);
  const effectiveDeficitWeeks = weeklyDemand.filter((d, i) => d > 0 && d > weeklyEffective[i]).length;
  const weeklyLosses = weeklyDemand.map((d, i) => d > 0 ? weeklyClassificacao - weeklyEffective[i] : 0);
  const peakLoss = Math.max(...weeklyLosses, 0);
  const peakLossWeekIdx = weeklyLosses.indexOf(peakLoss);

  // Pie data
  const pieData = state.clients.map((c) => ({
    name: c.name,
    value: getClientVolumes(c, state.numWeeks).reduce((a, b) => a + b, 0),
    color: c.color,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <UbsKPI label="Demanda Total" value={`${totalDemand.toLocaleString("pt-BR")} t`} />
        <UbsKPI label="Pico Demanda" value={`${peakDemand.toLocaleString("pt-BR")} t`} sub={weekLabels[peakWeekIdx]} color="#FFD93D" />
        <UbsKPI label="Déficit Classif." value={`${deficitWeeksClassif}`} color={deficitWeeksClassif > 0 ? "#FF6B6B" : "#38BDF8"} />
        <UbsKPI label="Utiliz. Média Classif." value={`${avgUtilClassif.toFixed(1)}%`} color={avgUtilClassif > 100 ? "#FF6B6B" : avgUtilClassif > 80 ? "#FFD93D" : "#38BDF8"} />
        <UbsKPI label="Déficit Trat." value={`${deficitWeeksTrat}`} color={deficitWeeksTrat > 0 ? "#FF6B6B" : "#C084FC"} />
        <UbsKPI label="Utiliz. Média Trat." value={`${avgUtilTrat.toFixed(1)}%`} color={avgUtilTrat > 100 ? "#FF6B6B" : avgUtilTrat > 80 ? "#FFD93D" : "#C084FC"} />
      </div>

      {/* Changeover KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <UbsKPI label="Cap. Efetiva Média" value={`${avgEffectiveCap.toFixed(0)} t`} color="#F97316" />
        <UbsKPI label="Total Perdido Changeover" value={`${totalChangeoverLoss.toFixed(0)} t`} color="#F97316" />
        <UbsKPI label="Sem. Déficit Efetivo" value={`${effectiveDeficitWeeks}`} color={effectiveDeficitWeeks > 0 ? "#FF6B6B" : "#38BDF8"} />
        <UbsKPI label="Pico de Perda" value={peakLoss > 0 ? `${peakLoss.toFixed(0)} t` : "Nenhum"} sub={peakLoss > 0 ? weekLabels[peakLossWeekIdx] : undefined} color={peakLoss > 0 ? "#F97316" : "#38BDF8"} />
      </div>

      {/* Chart 1: Demand vs Capacity with Effective */}
      <ChartWrapper title="Demanda × Capacidade Semanal — Fase 2" name="demanda_capacidade_fase2">
        {() => (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData} barCategoryGap="20%">
              <defs>
                <linearGradient id="changeoverLossGradientP2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F97316" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F97316" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10, fontFamily: "DM Mono" }} axisLine={{ stroke: "#2a4a32" }} tickLine={false} />
              <YAxis tick={{ fill: "#8aac8f", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`} />
              <Tooltip content={<DemandTooltipPhase2 weeklyClassificacao={weeklyClassificacao} weeklyTratamento={weeklyTratamento} />} cursor={{ fill: "#38BDF8", fillOpacity: 0.05 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "DM Mono", paddingTop: 8 }} iconType="circle" iconSize={8} />
              {state.clients.map((c) => (
                <Bar key={c.id} dataKey={c.name} stackId="demand" fill={c.color} radius={[0, 0, 0, 0]} />
              ))}
              <Area type="monotone" dataKey="changeoverLoss" name="Perda Changeover" fill="url(#changeoverLossGradientP2)" stroke="none" baseValue={0} legendType="none" />
              <ReferenceLine y={weeklyClassificacao} stroke="#38BDF8" strokeWidth={2.5} label={{ value: `Classif. ${weeklyClassificacao.toLocaleString("pt-BR")} t`, fill: "#38BDF8", fontSize: 10, fontFamily: "DM Mono", position: "insideTopRight" }} />
              <Line type="monotone" dataKey="capEffective" name="Cap. Efetiva Classif." stroke="#F97316" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: "#F97316" }} />
              <ReferenceLine y={weeklyTratamento} stroke="#C084FC" strokeWidth={2} strokeDasharray="8 4" label={{ value: `Trat. ${weeklyTratamento.toLocaleString("pt-BR")} t`, fill: "#C084FC", fontSize: 10, fontFamily: "DM Mono", position: "insideTopRight" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      {/* Visual capacity status per week */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {["Classificação", "Trat. & Ensaque"].map((tipo) => {
          const cap = tipo === "Classificação" ? weeklyClassificacao : weeklyTratamento;
          const color = tipo === "Classificação" ? "#38BDF8" : "#C084FC";
          return (
            <div key={tipo} className="bg-[#162b1c] border border-[#2a4a32] rounded-lg p-4">
              <h4 className="text-xs font-semibold mb-3 font-['Syne',sans-serif]" style={{ color }}>
                Balanço {tipo} — {cap.toLocaleString("pt-BR")} t/sem
              </h4>
              <div className="space-y-1.5">
                {weeklyDemand.map((d, i) => {
                  if (d === 0) return null;
                  const pct = cap > 0 ? (d / cap) * 100 : 0;
                  const bal = cap - d;
                  const barColor = pct > 100 ? "#FF6B6B" : pct >= 80 ? "#FFD93D" : color;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8aac8f] font-['DM_Mono',monospace] w-24 shrink-0 truncate">{weekLabels[i]}</span>
                      <div className="flex-1 h-4 bg-[#0f1f14] rounded-full overflow-hidden relative">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, opacity: 0.85 }} />
                        {pct > 100 && (
                          <div className="absolute inset-0 rounded-full border-2 border-[#FF6B6B]/50" />
                        )}
                      </div>
                      <span className="text-[10px] font-['DM_Mono',monospace] w-14 text-right shrink-0" style={{ color: barColor }}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-['DM_Mono',monospace] w-16 text-right shrink-0" style={{ color: bal >= 0 ? color : "#FF6B6B" }}>
                        {bal >= 0 ? "+" : ""}{bal.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Balance charts */}
        <ChartWrapper title="Balanço Surplus / Déficit — Classificação" name="balanco_classif">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#8aac8f" strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Bar dataKey="balanceClassif" name="Balanço Classif. (t)" label={{ position: "top", fill: "#8aac8f", fontSize: 9 }}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.balanceClassif >= 0 ? "#38BDF8" : "#FF6B6B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        <ChartWrapper title="Balanço Surplus / Déficit — Trat. & Ensaque" name="balanco_trat">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#8aac8f" strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Bar dataKey="balanceTrat" name="Balanço Trat. (t)" label={{ position: "top", fill: "#8aac8f", fontSize: 9 }}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.balanceTrat >= 0 ? "#C084FC" : "#FF6B6B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Utilization chart */}
        <ChartWrapper title="% Utilização da Capacidade — Fase 2" name="utilizacao_fase2">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} domain={[0, "auto"]} />
                <ReferenceLine y={80} stroke="#FFD93D" strokeDasharray="6 3" label={{ value: "80%", fill: "#FFD93D", fontSize: 9 }} />
                <ReferenceLine y={100} stroke="#FF6B6B" strokeDasharray="6 3" label={{ value: "100%", fill: "#FF6B6B", fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="pctUtilClassif" name="Classificação (%)" stroke="#38BDF8" fill="#38BDF8" fillOpacity={0.15} dot={(props: any) => {
                  const color = props.payload.pctUtilClassif > 100 ? "#FF6B6B" : props.payload.pctUtilClassif >= 80 ? "#FFD93D" : "#38BDF8";
                  return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke={color} />;
                }} />
                <Area type="monotone" dataKey="pctUtilTrat" name="Trat. & Ensaque (%)" stroke="#C084FC" fill="#C084FC" fillOpacity={0.1} dot={(props: any) => {
                  const color = props.payload.pctUtilTrat > 100 ? "#FF6B6B" : props.payload.pctUtilTrat >= 80 ? "#FFD93D" : "#C084FC";
                  return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke={color} />;
                }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Pie */}
        <ChartWrapper title="Composição da Demanda por Cliente" name="composicao_fase2">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#8aac8f" }}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} formatter={(v: number) => `${v.toLocaleString("pt-BR")} t`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>
    </div>
  );
}
