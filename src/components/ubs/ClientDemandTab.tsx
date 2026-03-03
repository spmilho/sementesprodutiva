import { useState } from "react";
import { UbsCard } from "./UbsCard";
import { getWeekLabels, getWeeklyDemand, type UbsState, type Client } from "./types";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  state: UbsState;
  update: <K extends keyof UbsState>(key: K, val: UbsState[K]) => void;
  weeklyReceiving: number;
  weeklyDrying: number;
}

const COLORS = ["#5CDB6E", "#4ECDC4", "#FFD93D", "#FF6B6B", "#C084FC", "#F97316", "#38BDF8", "#FB7185"];

function ClientFormModal({ client, onSave, onClose, numWeeks }: { client?: Client; onSave: (c: Client) => void; onClose: () => void; numWeeks: number }) {
  const [name, setName] = useState(client?.name || "");
  const [color, setColor] = useState(client?.color || COLORS[Math.floor(Math.random() * COLORS.length)]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: client?.id || crypto.randomUUID(),
      name: name.trim(),
      color,
      volumes: client?.volumes || Array(numWeeks).fill(0),
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[#8aac8f] block mb-1">Nome do Cliente</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-3 py-2 text-sm text-[#e8f5e9] w-full focus:outline-none focus:border-[#5CDB6E]" />
      </div>
      <div>
        <label className="text-xs text-[#8aac8f] block mb-1">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer" />
        </div>
      </div>
      <Button onClick={handleSave} className="w-full bg-[#5CDB6E] text-[#0f1f14] hover:bg-[#4cc05e] font-semibold">
        {client ? "Salvar" : "Adicionar"}
      </Button>
    </div>
  );
}

export function ClientDemandTab({ state, update, weeklyReceiving, weeklyDrying }: Props) {
  const [editClient, setEditClient] = useState<Client | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const weeklyDemand = getWeeklyDemand(state.clients, state.numWeeks);

  const updateVolume = (clientId: string, weekIdx: number, val: number) => {
    const newClients = state.clients.map((c) => {
      if (c.id !== clientId) return c;
      const vols = [...c.volumes];
      while (vols.length < state.numWeeks) vols.push(0);
      vols[weekIdx] = val;
      return { ...c, volumes: vols };
    });
    update("clients", newClients);
  };

  const addOrUpdateClient = (c: Client) => {
    const exists = state.clients.find((x) => x.id === c.id);
    if (exists) {
      update("clients", state.clients.map((x) => (x.id === c.id ? c : x)));
    } else {
      update("clients", [...state.clients, c]);
    }
  };

  const removeClient = (id: string) => {
    update("clients", state.clients.filter((c) => c.id !== id));
  };

  const exportCsv = () => {
    const header = ["Cliente", ...weekLabels].join(",");
    const rows = state.clients.map((c) => [c.name, ...c.volumes.slice(0, state.numWeeks)].join(","));
    const totalRow = ["TOTAL", ...weeklyDemand].join(",");
    const csv = [header, ...rows, totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demanda_ubs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Period config + actions */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Data Início</label>
          <input type="date" value={state.startDate} onChange={(e) => update("startDate", e.target.value)} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-xs text-[#e8f5e9] font-['DM_Mono',monospace] focus:outline-none focus:border-[#5CDB6E]" />
        </div>
        <div>
          <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Semanas</label>
          <input type="number" min={1} max={52} value={state.numWeeks} onChange={(e) => update("numWeeks", Number(e.target.value))} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-20 focus:outline-none focus:border-[#5CDB6E]" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#5CDB6E] text-[#0f1f14] hover:bg-[#4cc05e] text-xs" onClick={() => { setEditClient(undefined); setDialogOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#162b1c] border-[#2a4a32]">
            <DialogHeader><DialogTitle className="text-[#e8f5e9]">{editClient ? "Editar" : "Novo"} Cliente</DialogTitle></DialogHeader>
            <ClientFormModal client={editClient} numWeeks={state.numWeeks} onSave={addOrUpdateClient} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
        <Button size="sm" variant="outline" className="border-[#2a4a32] text-[#8aac8f] hover:bg-[#1e3a25] text-xs" onClick={exportCsv}>
          <Download className="w-3.5 h-3.5 mr-1" /> CSV
        </Button>
      </div>

      {/* Demand Table */}
      <UbsCard>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a4a32]">
                <th className="text-left py-2 pr-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace] sticky left-0 bg-[#162b1c] min-w-[120px]">Cliente</th>
                {weekLabels.map((w, i) => (
                  <th key={i} className="text-center py-2 px-1 text-[10px] text-[#8aac8f] font-['DM_Mono',monospace] min-w-[80px]">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.clients.map((client) => (
                <tr key={client.id} className="border-b border-[#1e3a25] group">
                  <td className="py-2 pr-2 sticky left-0 bg-[#162b1c]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: client.color }} />
                      <span className="text-[#c8e6c9] truncate">{client.name}</span>
                      <button onClick={() => { setEditClient(client); setDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3 text-[#8aac8f]" /></button>
                      <button onClick={() => removeClient(client.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                  </td>
                  {weekLabels.map((_, wi) => {
                    const v = client.volumes[wi] || 0;
                    return (
                      <td key={wi} className="py-1 px-1">
                        <input
                          type="number"
                          min={0}
                          value={v || ""}
                          placeholder="—"
                          onChange={(e) => updateVolume(client.id, wi, Number(e.target.value) || 0)}
                          className="bg-[#0f1f14] border border-[#2a4a32] rounded px-1.5 py-1 text-center text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-full focus:outline-none focus:border-[#5CDB6E] placeholder:text-[#3a5a42]"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Total row */}
              <tr className="border-t border-[#5CDB6E]/30 font-semibold">
                <td className="py-2 pr-2 text-[#5CDB6E] sticky left-0 bg-[#162b1c]">TOTAL</td>
                {weeklyDemand.map((d, i) => (
                  <td key={i} className="py-2 text-center text-[#5CDB6E] font-['DM_Mono',monospace]">{d > 0 ? d.toLocaleString("pt-BR") : "—"}</td>
                ))}
              </tr>
              {/* Balance rows */}
              <tr className="border-t border-[#2a4a32]">
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Balanço Receb.</td>
                {weeklyDemand.map((d, i) => {
                  const bal = weeklyReceiving - d;
                  return (
                    <td key={i} className={`py-2 text-center font-['DM_Mono',monospace] ${bal >= 0 ? "text-[#5CDB6E]" : "text-red-400"}`}>
                      {d > 0 ? (bal > 0 ? "+" : "") + bal.toLocaleString("pt-BR") : "—"}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Balanço Secag.</td>
                {weeklyDemand.map((d, i) => {
                  const bal = weeklyDrying - d;
                  return (
                    <td key={i} className={`py-2 text-center font-['DM_Mono',monospace] ${bal >= 0 ? "text-[#4ECDC4]" : "text-red-400"}`}>
                      {d > 0 ? (bal > 0 ? "+" : "") + bal.toLocaleString("pt-BR") : "—"}
                    </td>
                  );
                })}
              </tr>
              {/* Utilization row */}
              <tr className="border-t border-[#2a4a32]">
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">% Utiliz. Receb.</td>
                {weeklyDemand.map((d, i) => {
                  const pct = weeklyReceiving > 0 ? (d / weeklyReceiving) * 100 : 0;
                  const barColor = pct > 100 ? "#FF6B6B" : pct >= 80 ? "#FFD93D" : "#5CDB6E";
                  return (
                    <td key={i} className="py-2 px-1">
                      {d > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-['DM_Mono',monospace]" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                          <div className="w-full h-1.5 bg-[#0f1f14] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      ) : <span className="text-[#3a5a42] text-center block">—</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </UbsCard>
    </div>
  );
}
