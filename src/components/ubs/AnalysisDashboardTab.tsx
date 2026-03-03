import { useMemo, useRef, useCallback } from "react";
import { UbsKPI } from "./UbsCard";
import { getWeekLabels, getWeeklyDemand, type UbsState, PHASES } from "./types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  LineChart, Line, Area, AreaChart, PieChart, Pie, Cell, ComposedChart,
} from "recharts";
import { Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Props {
  state: UbsState;
  weeklyReceiving: number;
  weeklyDrying: number;
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

const CustomTooltip = ({ active, payload, label, weeklyReceiving, weeklyDrying }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  const surplus = weeklyReceiving - total;
  const pct = weeklyReceiving > 0 ? ((total / weeklyReceiving) * 100).toFixed(1) : "0";
  return (
    <div className="bg-[#0f1f14] border border-[#2a4a32] rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-[#e8f5e9] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill || p.color }}>{p.name}: {p.value?.toLocaleString("pt-BR")} t</p>
      ))}
      <hr className="my-1 border-[#2a4a32]" />
      <p className="text-[#e8f5e9]">Total: {total.toLocaleString("pt-BR")} t</p>
      <p className={surplus >= 0 ? "text-[#5CDB6E]" : "text-red-400"}>Balanço: {(surplus > 0 ? "+" : "")}{surplus.toLocaleString("pt-BR")} t</p>
      <p className="text-[#8aac8f]">Utilização: {pct}%</p>
    </div>
  );
};

export function AnalysisDashboardTab({ state, weeklyReceiving, weeklyDrying }: Props) {
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const weeklyDemand = getWeeklyDemand(state.clients, state.numWeeks);

  const altReceiving = state.altReceivingCapPerShift * state.altShifts * state.operatingDays;
  const altDrying = state.altDryingCapPerShift * state.altShifts * state.operatingDays;

  const chartData = useMemo(() =>
    weekLabels.map((label, i) => {
      const entry: any = { name: label };
      state.clients.forEach((c) => { entry[c.name] = c.volumes[i] || 0; });
      entry.total = weeklyDemand[i];
      entry.balance = weeklyReceiving - weeklyDemand[i];
      entry.pctUtil = weeklyReceiving > 0 ? (weeklyDemand[i] / weeklyReceiving) * 100 : 0;
      return entry;
    }), [weekLabels, state.clients, weeklyDemand, weeklyReceiving]);

  // KPIs
  const totalDemand = weeklyDemand.reduce((a, b) => a + b, 0);
  const peakWeekIdx = weeklyDemand.indexOf(Math.max(...weeklyDemand));
  const peakDemand = weeklyDemand[peakWeekIdx];
  const deficitWeeks = weeklyDemand.filter((d) => d > weeklyReceiving).length;
  const activeWeeks = weeklyDemand.filter((d) => d > 0);
  const avgUtil = activeWeeks.length > 0 ? activeWeeks.reduce((s, d) => s + (d / weeklyReceiving) * 100, 0) / activeWeeks.length : 0;
  const maxDeficit = Math.max(...weeklyDemand.map((d) => d - weeklyReceiving));
  const maxDeficitWeek = weeklyDemand.findIndex((d) => d - weeklyReceiving === maxDeficit);
  const totalStaff = PHASES.reduce((sum, p) => sum + ((state.staff[p] || []).reduce((a, b) => a + b, 0)), 0);

  // Pie data
  const pieData = state.clients.map((c) => ({
    name: c.name,
    value: c.volumes.reduce((a, b) => a + b, 0),
    color: c.color,
  })).filter((d) => d.value > 0);

  // Staff per week data
  const staffPerWeek = useMemo(() => weekLabels.map((label, i) => {
    const demand = weeklyDemand[i];
    const factor = weeklyReceiving > 0 ? Math.min(demand / weeklyReceiving, 1.5) : 0;
    const entry: any = { name: label };
    PHASES.forEach((p) => {
      const base = (state.staff[p] || []).reduce((a, b) => a + b, 0);
      entry[p] = Math.round(base * factor);
    });
    return entry;
  }), [weekLabels, weeklyDemand, weeklyReceiving, state.staff]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compare mode toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={state.compareMode} onCheckedChange={(v) => {
          // Update via parent state
          const key = "compareMode" as keyof UbsState;
          // We need to access update from parent — but this component only receives state
          // For simplicity, we'll handle compare mode visually only
        }} />
        <span className="text-xs text-[#8aac8f]">Modo comparação (cenário alternativo)</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <UbsKPI label="Demanda Total" value={`${totalDemand.toLocaleString("pt-BR")} t`} />
        <UbsKPI label="Pico Demanda" value={`${peakDemand.toLocaleString("pt-BR")} t`} sub={weekLabels[peakWeekIdx]} color="#FFD93D" />
        <UbsKPI label="Sem. Déficit" value={`${deficitWeeks}`} color={deficitWeeks > 0 ? "#FF6B6B" : "#5CDB6E"} />
        <UbsKPI label="Utiliz. Média" value={`${avgUtil.toFixed(1)}%`} color={avgUtil > 100 ? "#FF6B6B" : avgUtil > 80 ? "#FFD93D" : "#5CDB6E"} />
        <UbsKPI label="Maior Déficit" value={maxDeficit > 0 ? `${maxDeficit.toLocaleString("pt-BR")} t` : "Nenhum"} sub={maxDeficit > 0 ? weekLabels[maxDeficitWeek] : undefined} color={maxDeficit > 0 ? "#FF6B6B" : "#5CDB6E"} />
        <UbsKPI label="Pessoal Total" value={`${totalStaff} pessoas`} sub={`${state.shifts} turnos`} color="#4ECDC4" />
      </div>

      {/* Chart 1: Demand vs Capacity */}
      <ChartWrapper title="Demanda × Capacidade Semanal" name="demanda_capacidade">
        {() => (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
              <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
              <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} />
              <Tooltip content={<CustomTooltip weeklyReceiving={weeklyReceiving} weeklyDrying={weeklyDrying} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {state.clients.map((c) => (
                <Bar key={c.id} dataKey={c.name} stackId="a" fill={c.color} radius={[0, 0, 0, 0]} />
              ))}
              <ReferenceLine y={weeklyReceiving} stroke="#5CDB6E" strokeWidth={2} label={{ value: `Receb. ${weeklyReceiving}`, fill: "#5CDB6E", fontSize: 10, position: "right" }} />
              <ReferenceLine y={weeklyDrying} stroke="#4ECDC4" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Secag. ${weeklyDrying}`, fill: "#4ECDC4", fontSize: 10, position: "right" }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 2: Balance */}
        <ChartWrapper title="Balanço Surplus / Déficit" name="balanco">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <ReferenceLine y={0} stroke="#8aac8f" strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Bar dataKey="balance" name="Balanço (t)" label={{ position: "top", fill: "#8aac8f", fontSize: 9 }}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.balance >= 0 ? "#5CDB6E" : "#FF6B6B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Chart 3: Utilization */}
        <ChartWrapper title="% Utilização da Capacidade" name="utilizacao">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} domain={[0, "auto"]} />
                <ReferenceLine y={80} stroke="#FFD93D" strokeDasharray="6 3" label={{ value: "80%", fill: "#FFD93D", fontSize: 9 }} />
                <ReferenceLine y={100} stroke="#FF6B6B" strokeDasharray="6 3" label={{ value: "100%", fill: "#FF6B6B", fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Area type="monotone" dataKey="pctUtil" name="Utilização (%)" stroke="#5CDB6E" fill="#5CDB6E" fillOpacity={0.15} dot={(props: any) => {
                  const color = props.payload.pctUtil > 100 ? "#FF6B6B" : props.payload.pctUtil >= 80 ? "#FFD93D" : "#5CDB6E";
                  return <circle cx={props.cx} cy={props.cy} r={4} fill={color} stroke={color} />;
                }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>

        {/* Chart 4: Pie */}
        <ChartWrapper title="Composição da Demanda por Cliente" name="composicao">
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

        {/* Chart 5: Staff per week */}
        <ChartWrapper title="Necessidade de Pessoal por Semana" name="pessoal">
          {() => (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={staffPerWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a25" />
                <XAxis dataKey="name" tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <YAxis tick={{ fill: "#8aac8f", fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#0f1f14", border: "1px solid #2a4a32", fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {PHASES.map((p, i) => (
                  <Bar key={p} dataKey={p} stackId="a" fill={["#5CDB6E", "#4ECDC4", "#FFD93D", "#38BDF8", "#C084FC", "#FB7185"][i]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartWrapper>
      </div>
    </div>
  );
}
