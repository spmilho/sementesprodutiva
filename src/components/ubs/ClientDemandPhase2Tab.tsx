import React, { useState } from "react";
import { UbsCard } from "./UbsCard";
import { getWeekLabels, getWeeklyDemand, getClientVolumes, getWeeklyChangeovers, getClassificacaoRateTH, getPhaseWeeklyCap, getWeeklyEffectiveClassificacao, type UbsState, type Client } from "./types";
import { Plus, Pencil, Trash2, Download, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  state: UbsState;
  update: <K extends keyof UbsState>(key: K, val: UbsState[K]) => void;
  weeklyClassificacao: number;
  weeklyTratamento: number;
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
      hybrids: client?.hybrids || [{ id: crypto.randomUUID(), name: "Híbrido 1", volumes: Array(numWeeks).fill(0) }],
    });
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[#8aac8f] block mb-1">Nome do Cliente</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-3 py-2 text-sm text-[#e8f5e9] w-full focus:outline-none focus:border-[#38BDF8]" />
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
      <Button onClick={handleSave} className="w-full bg-[#38BDF8] text-[#0f1f14] hover:bg-[#2da8e0] font-semibold">
        {client ? "Salvar" : "Adicionar"}
      </Button>
    </div>
  );
}

export function ClientDemandPhase2Tab({ state, update, weeklyClassificacao, weeklyTratamento }: Props) {
  const [editClient, setEditClient] = useState<Client | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const weekLabels = getWeekLabels(state.startDate, state.numWeeks);
  const clients2 = state.clientsPhase2 || [];
  const weeklyDemand = getWeeklyDemand(clients2, state.numWeeks);

  const toggleExpand = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  };

  const updateHybridVolume = (clientId: string, hybridId: string, weekIdx: number, val: number) => {
    const newClients = clients2.map((c) => {
      if (c.id !== clientId) return c;
      return {
        ...c,
        hybrids: c.hybrids.map((h) => {
          if (h.id !== hybridId) return h;
          const vols = [...h.volumes];
          while (vols.length < state.numWeeks) vols.push(0);
          vols[weekIdx] = val;
          return { ...h, volumes: vols };
        }),
      };
    });
    update("clientsPhase2", newClients);
  };

  const addHybrid = (clientId: string) => {
    const newClients = clients2.map((c) => {
      if (c.id !== clientId) return c;
      const currentHybrids = Array.isArray(c.hybrids) ? c.hybrids : [];
      return {
        ...c,
        hybrids: [...currentHybrids, { id: crypto.randomUUID(), name: `Híbrido ${currentHybrids.length + 1}`, volumes: Array(state.numWeeks).fill(0) }],
      };
    });
    update("clientsPhase2", newClients);
    setExpandedClients((prev) => new Set(prev).add(clientId));
  };

  const removeHybrid = (clientId: string, hybridId: string) => {
    const newClients = clients2.map((c) => {
      if (c.id !== clientId) return c;
      if ((c.hybrids || []).length <= 1) return c;
      return { ...c, hybrids: c.hybrids.filter((h) => h.id !== hybridId) };
    });
    update("clientsPhase2", newClients);
  };

  const renameHybrid = (clientId: string, hybridId: string, name: string) => {
    const newClients = clients2.map((c) => {
      if (c.id !== clientId) return c;
      return { ...c, hybrids: c.hybrids.map((h) => h.id === hybridId ? { ...h, name } : h) };
    });
    update("clientsPhase2", newClients);
  };

  const addOrUpdateClient = (c: Client) => {
    const exists = clients2.find((x) => x.id === c.id);
    if (exists) {
      update("clientsPhase2", clients2.map((x) => (x.id === c.id ? { ...c, hybrids: x.hybrids } : x)));
    } else {
      update("clientsPhase2", [...clients2, c]);
    }
  };

  const removeClient = (id: string) => {
    update("clientsPhase2", clients2.filter((c) => c.id !== id));
  };

  const exportCsv = () => {
    const header = ["Cliente", "Híbrido", ...weekLabels].join(",");
    const rows: string[] = [];
    clients2.forEach((c) => {
      c.hybrids.forEach((h) => {
        rows.push([c.name, h.name, ...h.volumes.slice(0, state.numWeeks)].join(","));
      });
    });
    const totalRow = ["TOTAL", "", ...weeklyDemand].join(",");
    const csv = [header, ...rows, totalRow].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demanda_ubs_fase2.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Changeover calculations for Phase 2
  const changeovers = getWeeklyChangeovers(clients2, state.numWeeks);
  const rateTH = getClassificacaoRateTH(state);
  const grossCap = weeklyClassificacao;
  const effectiveCaps = getWeeklyEffectiveClassificacao(state);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Period config + actions */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Data Início</label>
          <input type="date" value={state.startDate} onChange={(e) => update("startDate", e.target.value)} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-xs text-[#e8f5e9] font-['DM_Mono',monospace] focus:outline-none focus:border-[#38BDF8]" />
        </div>
        <div>
          <label className="text-[10px] text-[#8aac8f] uppercase tracking-wider block mb-1">Semanas</label>
          <input type="number" min={1} max={52} value={state.numWeeks} onChange={(e) => update("numWeeks", Number(e.target.value))} className="bg-[#0f1f14] border border-[#2a4a32] rounded px-2 py-1.5 text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-20 focus:outline-none focus:border-[#38BDF8]" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#38BDF8] text-[#0f1f14] hover:bg-[#2da8e0] text-xs" onClick={() => { setEditClient(undefined); setDialogOpen(true); }}>
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
                <th className="text-left py-2 pr-2 text-[10px] text-[#8aac8f] uppercase font-['DM_Mono',monospace] sticky left-0 bg-[#162b1c] min-w-[180px]">Cliente / Híbrido</th>
                {weekLabels.map((w, i) => (
                  <th key={i} className="text-center py-2 px-1 text-[10px] text-[#8aac8f] font-['DM_Mono',monospace] min-w-[80px]">{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients2.map((client) => {
                const isExpanded = expandedClients.has(client.id);
                const clientVolumes = getClientVolumes(client, state.numWeeks);

                return (
                  <React.Fragment key={client.id}>
                    {/* Client row (totals) */}
                    <tr className="border-b border-[#1e3a25] group">
                      <td className="py-2 pr-2 sticky left-0 bg-[#162b1c]">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleExpand(client.id)} className="p-0.5 hover:bg-[#0f1f14] rounded transition-colors">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#8aac8f]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#8aac8f]" />}
                          </button>
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: client.color }} />
                          <span className="text-[#c8e6c9] font-semibold truncate">{client.name}</span>
                          <span className="text-[10px] text-[#8aac8f] ml-1">({(client.hybrids || []).length})</span>
                          <button onClick={() => { setEditClient(client); setDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3 h-3 text-[#8aac8f]" /></button>
                          <button onClick={() => removeClient(client.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-red-400" /></button>
                        </div>
                      </td>
                      {weekLabels.map((_, wi) => {
                        const v = clientVolumes[wi];
                        return (
                          <td key={wi} className="py-2 px-1 text-center text-[#e8f5e9] font-['DM_Mono',monospace] font-semibold" style={{ color: client.color }}>
                            {v > 0 ? v.toLocaleString("pt-BR") : "—"}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Hybrid rows */}
                    {isExpanded && (client.hybrids || []).map((hybrid) => (
                      <tr key={hybrid.id} className="border-b border-[#1e3a25]/50 bg-[#0f1f14]/30">
                        <td className="py-1.5 pr-2 sticky left-0 bg-[#14251a]">
                          <div className="flex items-center gap-1.5 pl-7">
                            <input
                              value={hybrid.name}
                              onChange={(e) => renameHybrid(client.id, hybrid.id, e.target.value)}
                              className="bg-transparent border-b border-[#2a4a32] text-[#a5d6a7] text-xs px-1 py-0.5 w-28 focus:outline-none focus:border-[#38BDF8] font-['DM_Mono',monospace]"
                            />
                            {(client.hybrids || []).length > 1 && (
                              <button onClick={() => removeHybrid(client.id, hybrid.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                        {weekLabels.map((_, wi) => {
                          const v = hybrid.volumes[wi] || 0;
                          return (
                            <td key={wi} className="py-1 px-1">
                              <input
                                type="number"
                                min={0}
                                value={v || ""}
                                placeholder="—"
                                onChange={(e) => updateHybridVolume(client.id, hybrid.id, wi, Number(e.target.value) || 0)}
                                className="bg-[#0f1f14] border border-[#2a4a32] rounded px-1.5 py-1 text-center text-xs text-[#e8f5e9] font-['DM_Mono',monospace] w-full focus:outline-none focus:border-[#38BDF8] placeholder:text-[#3a5a42]"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Add hybrid button */}
                    {isExpanded && (
                      <tr key={`${client.id}-add`} className="border-b border-[#1e3a25]">
                        <td className="py-1.5 sticky left-0 bg-[#162b1c]" colSpan={1 + state.numWeeks}>
                          <button onClick={() => addHybrid(client.id)} className="flex items-center gap-1 pl-7 text-[10px] text-[#38BDF8] hover:text-[#2da8e0] transition-colors">
                            <Plus className="w-3 h-3" /> Adicionar Híbrido
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Total row */}
              <tr className="border-t border-[#38BDF8]/30 font-semibold">
                <td className="py-2 pr-2 text-[#38BDF8] sticky left-0 bg-[#162b1c]">TOTAL</td>
                {weeklyDemand.map((d, i) => (
                  <td key={i} className="py-2 text-center text-[#38BDF8] font-['DM_Mono',monospace]">{d > 0 ? d.toLocaleString("pt-BR") : "—"}</td>
                ))}
              </tr>
              {/* Balance rows */}
              <tr className="border-t border-[#2a4a32]">
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Balanço Classif.</td>
                {weeklyDemand.map((d, i) => {
                  const bal = weeklyClassificacao - d;
                  return (
                    <td key={i} className={`py-2 text-center font-['DM_Mono',monospace] ${bal >= 0 ? "text-[#38BDF8]" : "text-red-400"}`}>
                      {d > 0 ? (bal > 0 ? "+" : "") + bal.toLocaleString("pt-BR") : "—"}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Balanço Trat. & Ens.</td>
                {weeklyDemand.map((d, i) => {
                  const bal = weeklyTratamento - d;
                  return (
                    <td key={i} className={`py-2 text-center font-['DM_Mono',monospace] ${bal >= 0 ? "text-[#C084FC]" : "text-red-400"}`}>
                      {d > 0 ? (bal > 0 ? "+" : "") + bal.toLocaleString("pt-BR") : "—"}
                    </td>
                  );
                })}
              </tr>
              {/* Utilization rows */}
              <tr className="border-t border-[#2a4a32]">
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">% Utiliz. Classif.</td>
                {weeklyDemand.map((d, i) => {
                  const pct = weeklyClassificacao > 0 ? (d / weeklyClassificacao) * 100 : 0;
                  const barColor = pct > 100 ? "#FF6B6B" : pct >= 80 ? "#FFD93D" : "#38BDF8";
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
              <tr>
                <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">% Utiliz. Trat. & Ens.</td>
                {weeklyDemand.map((d, i) => {
                  const pct = weeklyTratamento > 0 ? (d / weeklyTratamento) * 100 : 0;
                  const barColor = pct > 100 ? "#FF6B6B" : pct >= 80 ? "#FFD93D" : "#C084FC";
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
              {/* Changeover rows for Classificação */}
              {(() => {
                return (
                  <>
                    <tr className="border-t-2 border-[#F97316]/30">
                      <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Changeovers (nº)</td>
                      {changeovers.map((co, i) => (
                        <td key={i} className="py-2 text-center font-['DM_Mono',monospace] text-[#c8e6c9]">
                          {weeklyDemand[i] > 0 ? co : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Horas perdidas (h)</td>
                      {changeovers.map((co, i) => {
                        const hours = co * (state.changeoverTimeHPhase2 ?? state.changeoverTimeH);
                        return (
                          <td key={i} className="py-2 text-center font-['DM_Mono',monospace]" style={{ color: hours > 0 ? "#F97316" : "#3a5a42" }}>
                            {weeklyDemand[i] > 0 && hours > 0 ? hours.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Perda capacidade (t)</td>
                      {changeovers.map((co, i) => {
                        const loss = co * (state.changeoverTimeHPhase2 ?? state.changeoverTimeH) * rateTH;
                        return (
                          <td key={i} className="py-2 text-center font-['DM_Mono',monospace]" style={{ color: loss > 0 ? "#F97316" : "#3a5a42" }}>
                            {weeklyDemand[i] > 0 && loss > 0 ? loss.toFixed(0) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-t border-[#F97316]/30">
                      <td className="py-2 pr-2 sticky left-0 bg-[#162b1c]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#e8f5e9] font-bold text-xs">Cap. Efetiva Classif.</span>
                          <span className="bg-[#F97316] text-[#0f1f14] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Efetiva</span>
                        </div>
                      </td>
                      {effectiveCaps.map((ec, i) => (
                        <td key={i} className="py-2 text-center font-['DM_Mono',monospace] font-bold text-sm" style={{ color: ec < grossCap ? "#F97316" : "#38BDF8" }}>
                          {weeklyDemand[i] > 0 ? ec.toFixed(0) : grossCap.toLocaleString("pt-BR")}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">Balanço Efetivo (t)</td>
                      {effectiveCaps.map((ec, i) => {
                        const bal = ec - weeklyDemand[i];
                        return (
                          <td key={i} className={`py-2 text-center font-['DM_Mono',monospace] font-semibold ${bal >= 0 ? "text-[#38BDF8]" : "text-[#FF6B6B]"}`}>
                            {weeklyDemand[i] > 0 ? (bal > 0 ? "+" : "") + bal.toFixed(0) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 pr-2 text-[#8aac8f] sticky left-0 bg-[#162b1c]">% Utiliz. Efetiva</td>
                      {effectiveCaps.map((ec, i) => {
                        const pct = ec > 0 ? (weeklyDemand[i] / ec) * 100 : 0;
                        const barColor = pct > 100 ? "#FF6B6B" : pct >= 80 ? "#FFD93D" : "#38BDF8";
                        return (
                          <td key={i} className="py-2 px-1">
                            {weeklyDemand[i] > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] font-['DM_Mono',monospace] font-bold" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                                <div className="w-full h-1.5 bg-[#0f1f14] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                                </div>
                              </div>
                            ) : <span className="text-[#3a5a42] text-center block">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </UbsCard>
    </div>
  );
}
