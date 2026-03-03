import { UbsCard } from "./UbsCard";
import { PHASES, type UbsState, type PhaseConfig, getPhaseConfig, getPhaseWeeklyCap } from "./types";
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

function SmallSelect({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: { label: string; value: number }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-[#0f1f14] border border-[#2a4a32] rounded px-1 py-1 text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-full focus:outline-none focus:border-[#5CDB6E]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function CapacityConfigTab({ state, update }: Props) {
  const updatePhaseConfig = (phase: string, field: keyof PhaseConfig, val: number) => {
    const current = getPhaseConfig(state, phase);
    const newConfig = { ...state.phaseConfig, [phase]: { ...current, [field]: val } };
    update("phaseConfig", newConfig);
  };

  const updateStaff = (phase: string, shiftIdx: number, val: number) => {
    const newStaff = { ...state.staff };
    const cfg = getPhaseConfig(state, phase);
    const arr = [...(newStaff[phase] || Array(cfg.shifts).fill(0))];
    arr[shiftIdx] = val;
    newStaff[phase] = arr;
    update("staff", newStaff);
  };

  const minPerPhase: Record<string, number> = { "Recebimento e Despalha": 3, Secador: 1, Debulha: 2, Classificação: 2, "Tratamento e Ensaque": 2, Expedição: 1 };

  const shiftsOptions = [{ label: "1", value: 1 }, { label: "2", value: 2 }, { label: "3", value: 3 }];
  const hoursOptions = [{ label: "6h", value: 6 }, { label: "8h", value: 8 }, { label: "10h", value: 10 }, { label: "12h", value: 12 }];
  const daysOptions = [{ label: "5d", value: 5 }, { label: "6d", value: 6 }, { label: "7d", value: 7 }];

  const maxShifts = Math.max(...PHASES.map((p) => getPhaseConfig(state, p).shifts));

  const totalPerPhase = PHASES.map((p) => {
    const cfg = getPhaseConfig(state, p);
    return (state.staff[p] || []).slice(0, cfg.shifts).reduce((sum, v) => sum + (v || 0), 0);
  });
  const grandTotal = totalPerPhase.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Capacity per phase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UbsCard title="Capacidade por Fase (t/turno)">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Recebimento & Despalha</label>
              <NumInput value={state.receivingCapPerShift} onChange={(v) => update("receivingCapPerShift", v)} />
              <p className="text-[10px] text-[#5CDB6E] mt-1 font-['DM_Mono',monospace]">
                Semanal: {getPhaseWeeklyCap(state, "Recebimento e Despalha", state.receivingCapPerShift).toLocaleString("pt-BR")} t
              </p>
            </div>
            <div>
              <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Secagem</label>
              <NumInput value={state.dryingCapPerShift} onChange={(v) => update("dryingCapPerShift", v)} />
              <p className="text-[10px] text-[#4ECDC4] mt-1 font-['DM_Mono',monospace]">
                Semanal: {getPhaseWeeklyCap(state, "Secador", state.dryingCapPerShift).toLocaleString("pt-BR")} t
              </p>
            </div>
          </div>
        </UbsCard>
      </div>

      {/* Per-phase operations config */}
      <UbsCard title="Turnos & Operação por Fase">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a4a32]">
                <th className="text-left text-[10px] text-[#8aac8f] uppercase py-2 pr-3 font-['DM_Mono',monospace]">Fase</th>
                <th className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace] w-20">Turnos</th>
                <th className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace] w-20">Horas</th>
                <th className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace] w-20">Dias/sem</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase) => {
                const cfg = getPhaseConfig(state, phase);
                return (
                  <tr key={phase} className="border-b border-[#1e3a25]">
                    <td className="py-2 pr-3 text-[#c8e6c9] text-xs">{phase}</td>
                    <td className="py-2 px-1">
                      <SmallSelect value={cfg.shifts} onChange={(v) => updatePhaseConfig(phase, "shifts", v)} options={shiftsOptions} />
                    </td>
                    <td className="py-2 px-1">
                      <SmallSelect value={cfg.hoursPerShift} onChange={(v) => updatePhaseConfig(phase, "hoursPerShift", v)} options={hoursOptions} />
                    </td>
                    <td className="py-2 px-1">
                      <SmallSelect value={cfg.operatingDays} onChange={(v) => updatePhaseConfig(phase, "operatingDays", v)} options={daysOptions} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </UbsCard>

      {/* Staff Table */}
      <UbsCard title="Quadro de Pessoal por Turno">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a4a32]">
                <th className="text-left text-[10px] text-[#8aac8f] uppercase py-2 pr-3 font-['DM_Mono',monospace]">Fase</th>
                {Array.from({ length: maxShifts }, (_, i) => (
                  <th key={i} className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace]">T{i + 1}</th>
                ))}
                <th className="text-center text-[10px] text-[#8aac8f] uppercase py-2 px-2 font-['DM_Mono',monospace]">Total</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase, pi) => {
                const cfg = getPhaseConfig(state, phase);
                const arr = state.staff[phase] || [];
                const hasAlert = arr.some((v, si) => si < cfg.shifts && (v || 0) < (minPerPhase[phase] || 0));
                return (
                  <tr key={phase} className="border-b border-[#1e3a25]">
                    <td className="py-2 pr-3 text-[#c8e6c9] text-xs">
                      {phase}
                      <span className="text-[10px] text-[#8aac8f] ml-1">({cfg.shifts}T)</span>
                    </td>
                    {Array.from({ length: maxShifts }, (_, si) => (
                      <td key={si} className="py-2 px-1">
                        {si < cfg.shifts ? (
                          <input
                            type="number"
                            min={0}
                            value={(arr[si] || 0)}
                            onChange={(e) => updateStaff(phase, si, Number(e.target.value))}
                            className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1 text-center text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-16 focus:outline-none focus:border-[#5CDB6E]"
                          />
                        ) : (
                          <span className="block text-center text-[#3a5a42]">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center text-xs font-semibold text-[#5CDB6E] font-['DM_Mono',monospace]">
                      {totalPerPhase[pi]}
                    </td>
                    <td className="py-2">
                      {hasAlert && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[#5CDB6E]/30">
                <td className="py-2 pr-3 text-xs font-semibold text-[#5CDB6E]">Total geral</td>
                <td colSpan={maxShifts}></td>
                <td className="py-2 text-center text-xs font-bold text-[#5CDB6E] font-['DM_Mono',monospace]">{grandTotal}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </UbsCard>
    </div>
  );
}
