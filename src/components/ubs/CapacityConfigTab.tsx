import { UbsCard } from "./UbsCard";
import { PHASES, type UbsState } from "./types";
import { AlertTriangle } from "lucide-react";

interface Props {
  state: UbsState;
  update: <K extends keyof UbsState>(key: K, val: UbsState[K]) => void;
}

function NumInput({ value, onChange, min = 0, className = "" }: { value: number; onChange: (v: number) => void; min?: number; className?: string }) {
  return (
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-sm text-[#e8f5e9] font-['DM_Mono',monospace] w-full focus:outline-none focus:border-[#5CDB6E] transition-colors ${className}`}
    />
  );
}

function SelectInput({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: { label: string; value: number }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-sm text-[#e8f5e9] font-['DM_Mono',monospace] w-full focus:outline-none focus:border-[#5CDB6E]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CapacityConfigTab({ state, update }: Props) {
  const weeklyCap = (capPerShift: number) => capPerShift * state.shifts * state.operatingDays;

  const updateStaff = (phase: string, shiftIdx: number, val: number) => {
    const newStaff = { ...state.staff };
    const arr = [...(newStaff[phase] || Array(state.shifts).fill(0))];
    arr[shiftIdx] = val;
    newStaff[phase] = arr;
    update("staff", newStaff);
  };

  // Ensure staff arrays match shifts count
  const shiftLabels = Array.from({ length: state.shifts }, (_, i) => `Turno ${i + 1}`);

  const totalPerShift = shiftLabels.map((_, si) =>
    PHASES.reduce((sum, p) => sum + ((state.staff[p] || [])[si] || 0), 0)
  );
  const totalPerPhase = PHASES.map((p) =>
    (state.staff[p] || []).reduce((sum, v) => sum + (v || 0), 0)
  );
  const grandTotal = totalPerShift.reduce((a, b) => a + b, 0);
  const monthlyCost = grandTotal * state.avgSalary;

  const minPerPhase: Record<string, number> = { "Recebimento e Despalha": 3, Secador: 1, Debulha: 2, Classificação: 2, "Tratamento e Ensaque": 2, Expedição: 1 };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Shifts & Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UbsCard title="Turnos & Operação">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Turnos/dia</label>
              <SelectInput value={state.shifts} onChange={(v) => update("shifts", v)} options={[{ label: "1 turno", value: 1 }, { label: "2 turnos", value: 2 }, { label: "3 turnos", value: 3 }]} />
            </div>
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Horas/turno</label>
              <NumInput value={state.hoursPerShift} onChange={(v) => update("hoursPerShift", v)} min={1} />
            </div>
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Dias/semana</label>
              <SelectInput value={state.operatingDays} onChange={(v) => update("operatingDays", v)} options={[{ label: "5 dias", value: 5 }, { label: "6 dias", value: 6 }, { label: "7 dias", value: 7 }]} />
            </div>
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Salário médio (R$)</label>
              <NumInput value={state.avgSalary} onChange={(v) => update("avgSalary", v)} />
            </div>
          </div>
        </UbsCard>

        <UbsCard title="Capacidade por Fase (t/turno)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Recebimento & Despalha</label>
              <NumInput value={state.receivingCapPerShift} onChange={(v) => update("receivingCapPerShift", v)} />
              <p className="text-[10px] text-[#5CDB6E] mt-1 font-['DM_Mono',monospace]">
                Semanal: {weeklyCap(state.receivingCapPerShift).toLocaleString("pt-BR")} t
              </p>
            </div>
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Secagem</label>
              <NumInput value={state.dryingCapPerShift} onChange={(v) => update("dryingCapPerShift", v)} />
              <p className="text-[10px] text-[#4ECDC4] mt-1 font-['DM_Mono',monospace]">
                Semanal: {weeklyCap(state.dryingCapPerShift).toLocaleString("pt-BR")} t
              </p>
            </div>
          </div>
        </UbsCard>
      </div>

      {/* Staff Table */}
      <UbsCard title="Quadro de Pessoal por Turno">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a4a32]">
                <th className="text-left text-[10px] text-[#8aac8f] uppercase py-2 pr-3 font-['DM_Mono',monospace]">Fase</th>
                {shiftLabels.map((s, i) => (
                  <th key={i} className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace]">{s}</th>
                ))}
                <th className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace]">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase) => {
                const arr = state.staff[phase] || [];
                const hasAlert = arr.some((v, si) => si < state.shifts && (v || 0) < (minPerPhase[phase] || 0));
                return (
                  <tr key={phase} className="border-b border-[#1e3a25]">
                    <td className="py-2 pr-3 text-[#c8e6c9] text-xs">{phase}</td>
                    {shiftLabels.map((_, si) => (
                      <td key={si} className="py-2 px-1">
                        <input
                          type="number"
                          min={0}
                          value={(arr[si] || 0)}
                          onChange={(e) => updateStaff(phase, si, Number(e.target.value))}
                          className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1 text-center text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-16 focus:outline-none focus:border-[#5CDB6E]"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center text-xs font-semibold text-[#5CDB6E] font-['DM_Mono',monospace]">
                      {totalPerPhase[PHASES.indexOf(phase)]}
                    </td>
                    <td className="py-2">
                      {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[#5CDB6E]/30">
                <td className="py-2 pr-3 text-xs font-semibold text-[#5CDB6E]">Total/turno</td>
                {totalPerShift.map((t, i) => (
                  <td key={i} className="py-2 text-center text-xs font-semibold text-[#5CDB6E] font-['DM_Mono',monospace]">{t}</td>
                ))}
                <td className="py-2 text-center text-xs font-bold text-[#5CDB6E] font-['DM_Mono',monospace]">{grandTotal}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        {state.avgSalary > 0 && (
          <p className="text-[10px] text-[#8aac8f] mt-3 font-['DM_Mono',monospace]">
            Custo mensal estimado: R$ {monthlyCost.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </p>
        )}
      </UbsCard>
    </div>
  );
}
