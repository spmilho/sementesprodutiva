import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CooperatorFormDialog, { type Cooperator } from "./CooperatorFormDialog";
import NewFarmFormDialog, { type FarmRecord } from "./NewFarmFormDialog";
import PivotFormDialog, { type PivotRecord } from "./PivotFormDialog";

const irrigationLabels: Record<string, string> = {
  pivot: "Pivô Central",
  dryland: "Sequeiro",
  drip: "Gotejamento",
  sprinkler: "Aspersão",
};

const statusBadge: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "outline" }> = {
  available: { label: "Disponível", emoji: "🟢", variant: "outline" },
  in_use: { label: "Em produção", emoji: "🔵", variant: "default" },
  maintenance: { label: "Manutenção", emoji: "🟡", variant: "secondary" },
};

interface TreeData {
  cooperators: (Cooperator & { farms: (FarmRecord & { pivots: PivotRecord[] })[] })[];
}

export default function CooperadosTab() {
  const [search, setSearch] = useState("");
  const [cooperatorDialog, setCooperatorDialog] = useState(false);
  const [editingCooperator, setEditingCooperator] = useState<Cooperator | null>(null);
  const [farmDialog, setFarmDialog] = useState(false);
  const [editingFarm, setEditingFarm] = useState<FarmRecord | null>(null);
  const [farmCooperatorId, setFarmCooperatorId] = useState("");
  const [pivotDialog, setPivotDialog] = useState(false);
  const [editingPivot, setEditingPivot] = useState<PivotRecord | null>(null);
  const [pivotFarmId, setPivotFarmId] = useState("");
  const [openCooperators, setOpenCooperators] = useState<Set<string>>(new Set());
  const [openFarms, setOpenFarms] = useState<Set<string>>(new Set());

  const { data: tree, isLoading } = useQuery<TreeData>({
    queryKey: ["cooperators-tree"],
    queryFn: async () => {
      const [coopRes, farmsRes, pivotsRes] = await Promise.all([
        (supabase as any).from("cooperators").select("*").is("deleted_at", null).order("name"),
        (supabase as any).from("farms").select("*").is("deleted_at", null).order("name"),
        (supabase as any).from("pivots").select("*").is("deleted_at", null).order("name"),
      ]);
      if (coopRes.error) throw coopRes.error;
      if (farmsRes.error) throw farmsRes.error;
      if (pivotsRes.error) throw pivotsRes.error;

      const pivotsByFarm = new Map<string, PivotRecord[]>();
      (pivotsRes.data as PivotRecord[]).forEach((p) => {
        const arr = pivotsByFarm.get(p.farm_id) || [];
        arr.push(p);
        pivotsByFarm.set(p.farm_id, arr);
      });

      const farmsByCoop = new Map<string, (FarmRecord & { pivots: PivotRecord[] })[]>();
      (farmsRes.data as FarmRecord[]).forEach((f) => {
        if (!f.cooperator_id) return;
        const arr = farmsByCoop.get(f.cooperator_id) || [];
        arr.push({ ...f, pivots: pivotsByFarm.get(f.id) || [] });
        farmsByCoop.set(f.cooperator_id, arr);
      });

      return {
        cooperators: (coopRes.data as Cooperator[]).map((c) => ({
          ...c,
          farms: farmsByCoop.get(c.id) || [],
        })),
      };
    },
  });

  const filtered = useMemo(() => {
    if (!tree) return [];
    if (!search) return tree.cooperators;
    const q = search.toLowerCase();

    return tree.cooperators.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      return c.farms.some((f) => {
        if (f.name.toLowerCase().includes(q)) return true;
        return f.pivots.some((p) => p.name.toLowerCase().includes(q));
      });
    }).map((c) => {
      // Auto-expand matching items
      const matchingFarms = c.farms.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.pivots.some((p) => p.name.toLowerCase().includes(q))
      );
      if (matchingFarms.length > 0 || c.name.toLowerCase().includes(q)) {
        setOpenCooperators((prev) => new Set(prev).add(c.id));
        matchingFarms.forEach((f) => {
          if (f.pivots.some((p) => p.name.toLowerCase().includes(q))) {
            setOpenFarms((prev) => new Set(prev).add(f.id));
          }
        });
      }
      return c;
    });
  }, [tree, search]);

  const toggleCooperator = (id: string) => {
    setOpenCooperators((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFarm = (id: string) => {
    setOpenFarms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cooperado, fazenda ou pivô..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-2" onClick={() => { setEditingCooperator(null); setCooperatorDialog(true); }}>
          <Plus className="h-4 w-4" /> Novo Cooperado
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Nenhum cooperado encontrado</div>
      ) : (
        <div className="space-y-1">
          {filtered.map((coop) => {
            const totalPivots = coop.farms.reduce((sum, f) => sum + f.pivots.length, 0);
            const isOpen = openCooperators.has(coop.id);

            return (
              <Collapsible key={coop.id} open={isOpen} onOpenChange={() => toggleCooperator(coop.id)}>
                <div className="rounded-lg border bg-card">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{coop.name}</span>
                          {coop.document && <span className="text-xs text-muted-foreground">{coop.document}</span>}
                          {coop.city && coop.state && <span className="text-xs text-muted-foreground">— {coop.city}/{coop.state}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {coop.farms.length} fazenda{coop.farms.length !== 1 ? "s" : ""}, {totalPivots} pivô{totalPivots !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setEditingCooperator(coop); setCooperatorDialog(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setFarmCooperatorId(coop.id); setEditingFarm(null); setFarmDialog(true); }}>
                          <Plus className="h-3 w-3" /> Fazenda
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="pl-6 pr-4 pb-2 space-y-1">
                      {coop.farms.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2 pl-4">Nenhuma fazenda cadastrada</div>
                      ) : (
                        coop.farms.map((farm) => {
                          const isFarmOpen = openFarms.has(farm.id);
                          return (
                            <Collapsible key={farm.id} open={isFarmOpen} onOpenChange={() => toggleFarm(farm.id)}>
                              <div className="rounded-md border bg-muted/30">
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                                    {isFarmOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{farm.name}</span>
                                        {farm.city && farm.state && <span className="text-xs text-muted-foreground">— {farm.city}/{farm.state}</span>}
                                        {farm.total_area_ha && <span className="text-xs text-muted-foreground">— {farm.total_area_ha} ha</span>}
                                      </div>
                                      <div className="text-xs text-muted-foreground">{farm.pivots.length} pivô{farm.pivots.length !== 1 ? "s" : ""}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setFarmCooperatorId(coop.id); setEditingFarm(farm); setFarmDialog(true); }}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setPivotFarmId(farm.id); setEditingPivot(null); setPivotDialog(true); }}>
                                        <Plus className="h-3 w-3" /> Pivô
                                      </Button>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="pl-6 pr-3 pb-2 space-y-1">
                                    {farm.pivots.length === 0 ? (
                                      <div className="text-xs text-muted-foreground py-1">Nenhum pivô cadastrado</div>
                                    ) : (
                                      farm.pivots.map((pivot) => {
                                        const sb = statusBadge[pivot.status] || statusBadge.available;
                                        return (
                                          <div key={pivot.id} className="flex items-center gap-2 px-3 py-1.5 rounded border bg-background text-sm">
                                            <span className="font-medium">{pivot.name}</span>
                                            {pivot.area_ha && <span className="text-xs text-muted-foreground">— {pivot.area_ha} ha</span>}
                                            {pivot.irrigation_type && <span className="text-xs text-muted-foreground">— {irrigationLabels[pivot.irrigation_type] || pivot.irrigation_type}</span>}
                                            <Badge variant={sb.variant} className="text-[10px] px-1.5 py-0 ml-auto">
                                              {sb.emoji} {sb.label}
                                            </Badge>
                                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => { setPivotFarmId(farm.id); setEditingPivot(pivot); setPivotDialog(true); }}>
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      <CooperatorFormDialog open={cooperatorDialog} onOpenChange={setCooperatorDialog} cooperator={editingCooperator} />
      <NewFarmFormDialog open={farmDialog} onOpenChange={setFarmDialog} farm={editingFarm} cooperatorId={farmCooperatorId} />
      <PivotFormDialog open={pivotDialog} onOpenChange={setPivotDialog} pivot={editingPivot} farmId={pivotFarmId} />
    </div>
  );
}
