import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from "recharts";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import type { DashboardCycle } from "@/hooks/useDashboardData";

interface Props {
  cycles: DashboardCycle[];
  phenologyRecords: any[];
  plantingActuals: any[];
  cropInputs: any[];
}

const PARENT_LABELS: Record<string, string> = {
  female: "Fêmea",
  male_1: "Macho 1",
  male_2: "Macho 2",
  male_3: "Macho 3",
};

const INPUT_TYPE_COLORS: Record<string, string> = {
  fertilizer_macro: "#2E7D32",
  fertilizer_micro: "#66BB6A",
  insecticide: "#E53935",
  herbicide: "#FB8C00",
  fungicide: "#8E24AA",
  adjuvant: "#9E9E9E",
  seed: "#00897B",
  other: "#78909C",
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  fertilizer_macro: "Adubo Macro",
  fertilizer_micro: "Adubo Micro/Foliar",
  insecticide: "Inseticida",
  herbicide: "Herbicida",
  fungicide: "Fungicida",
  adjuvant: "Adjuvante",
  seed: "Semente",
  other: "Outro",
};

const STAGES_ORDER = ["DESSEC.", "TS", "VE", "V1-V2", "V3-V4", "V6-V8", "V10-V12", "V14-VT", "VT-R1", "R2-R3", "R4-R5", "R6"];

function getDapRange(dap: number): string {
  if (dap <= 5) return "VE";
  if (dap <= 12) return "V1-V2";
  if (dap <= 20) return "V3-V4";
  if (dap <= 35) return "V6-V8";
  if (dap <= 48) return "V10-V12";
  if (dap <= 58) return "V14-VT";
  if (dap <= 65) return "VT-R1";
  if (dap <= 80) return "R2-R3";
  if (dap <= 100) return "R4-R5";
  return "R6";
}

export default function DashboardExtraCharts({ cycles, phenologyRecords, plantingActuals, cropInputs }: Props) {
  const activeCycles = cycles.filter(c => !["completed", "cancelled"].includes(c.status));
  const cycleIds = new Set(activeCycles.map(c => c.id));

  // ═══ 1. Phenology Stages per Cycle ═══
  const phenologyByCycle = useMemo(() => {
    const result: { cycleName: string; parents: { parent: string; stage: string; dap: number | null }[] }[] = [];
    
    for (const c of activeCycles) {
      const records = phenologyRecords.filter((r: any) => r.cycle_id === c.id);
      if (records.length === 0) continue;
      
      const parentMap = new Map<string, any>();
      for (const r of records) {
        const key = r.parent_type || "female";
        const existing = parentMap.get(key);
        if (!existing || r.observation_date > existing.observation_date) {
          parentMap.set(key, r);
        }
      }
      
      const parents = Array.from(parentMap.entries()).map(([parent, r]) => ({
        parent,
        stage: r.current_stage || r.growth_stage || "—",
        dap: r.dap ?? null,
      }));
      
      if (parents.length > 0) {
        result.push({
          cycleName: c.contract_number || c.field_name,
          parents,
        });
      }
    }
    return result;
  }, [activeCycles, phenologyRecords]);

  // ═══ 2. Detasseling Forecast ═══
  const detasselingForecast = useMemo(() => {
    const today = new Date();
    const results: { cycleName: string; daysToStart: number; startDate: string }[] = [];
    
    for (const c of activeCycles) {
      if (!c.detasseling_dap) continue;
      const femalePlantings = plantingActuals.filter((a: any) => a.cycle_id === c.id && a.type === "female");
      if (femalePlantings.length === 0) continue;
      
      const earliestDate = femalePlantings.map((a: any) => a.planting_date).sort()[0];
      if (!earliestDate) continue;
      
      const centerDate = addDays(parseISO(earliestDate), c.detasseling_dap);
      const daysToStart = differenceInDays(centerDate, today);
      
      results.push({
        cycleName: c.contract_number || c.field_name,
        daysToStart,
        startDate: format(centerDate, "dd/MM"),
      });
    }
    return results.sort((a, b) => a.daysToStart - b.daysToStart);
  }, [activeCycles, plantingActuals]);

  // ═══ 3. Harvest Forecast ═══
  const harvestForecast = useMemo(() => {
    const today = new Date();
    const results: { cycleName: string; daysToStart: number; startDate: string }[] = [];
    
    for (const c of activeCycles) {
      const cycleDays = 130; // default
      const femalePlantings = plantingActuals.filter((a: any) => a.cycle_id === c.id && a.type === "female");
      if (femalePlantings.length === 0) continue;
      
      const earliestDate = femalePlantings.map((a: any) => a.planting_date).sort()[0];
      if (!earliestDate) continue;
      
      const centerDate = addDays(parseISO(earliestDate), cycleDays);
      const daysToStart = differenceInDays(centerDate, today);
      
      results.push({
        cycleName: c.contract_number || c.field_name,
        daysToStart,
        startDate: format(centerDate, "dd/MM"),
      });
    }
    return results.sort((a, b) => a.daysToStart - b.daysToStart);
  }, [activeCycles, plantingActuals]);

  // ═══ 4. Applications by Phenological Stage ═══
  const applicationsByStage = useMemo(() => {
    const stageMap: Record<string, Record<string, number>> = {};
    STAGES_ORDER.forEach(s => { stageMap[s] = {}; });

    for (const inp of cropInputs) {
      if (!cycleIds.has(inp.cycle_id)) continue;
      const date = inp.execution_date || inp.recommendation_date;
      if (!date) continue;

      let stage = inp.growth_stage_at_application;
      if (!stage) {
        // Try to compute from DAP
        const cycleActuals = plantingActuals.filter((a: any) => a.cycle_id === inp.cycle_id && a.type === "female");
        if (cycleActuals.length > 0) {
          const plantDate = cycleActuals.map((a: any) => a.planting_date).sort()[0];
          if (plantDate) {
            const dap = Math.floor((new Date(date).getTime() - new Date(plantDate).getTime()) / 86400000);
            if (dap < 0) stage = "DESSEC.";
            else stage = getDapRange(dap);
          }
        }
      }
      if (!stage || !STAGES_ORDER.includes(stage)) return;

      const type = inp.input_type || "other";
      stageMap[stage][type] = (stageMap[stage][type] || 0) + 1;
    }

    return STAGES_ORDER.map(stage => ({
      stage,
      ...stageMap[stage],
    })).filter(d => Object.keys(d).length > 1);
  }, [cropInputs, cycleIds, plantingActuals]);

  const allInputTypes = useMemo(() => {
    const types = new Set<string>();
    applicationsByStage.forEach(d => {
      Object.keys(d).forEach(k => { if (k !== "stage") types.add(k); });
    });
    return Array.from(types);
  }, [applicationsByStage]);

  const hasData = phenologyByCycle.length > 0 || detasselingForecast.length > 0 || harvestForecast.length > 0 || applicationsByStage.length > 0;
  if (!hasData) return null;

  return (
    <>
      {/* Phenology + Forecasts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Phenology Stages */}
        {phenologyByCycle.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">🌿 Estádio Fenológico Atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {phenologyByCycle.map((c, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium text-foreground">{c.cycleName}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.parents.map((p, j) => (
                      <Badge key={j} variant="outline" className="text-[10px]">
                        {PARENT_LABELS[p.parent] || p.parent}: {p.stage}
                        {p.dap !== null && <span className="ml-1 opacity-60">({p.dap} DAP)</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Detasseling Forecast */}
        {detasselingForecast.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">✂️ Dias p/ Despendoamento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={detasselingForecast} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="cycleName" type="category" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v} dias`, "Dias restantes"]} />
                  <ReferenceLine x={0} stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <Bar dataKey="daysToStart" name="Dias restantes" radius={[0, 4, 4, 0]}>
                    {detasselingForecast.map((entry, i) => (
                      <rect key={i} fill={entry.daysToStart <= 0 ? "hsl(0, 60%, 50%)" : entry.daysToStart <= 10 ? "hsl(42, 85%, 52%)" : "hsl(130, 55%, 40%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {detasselingForecast.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[140px]">{f.cycleName}</span>
                    <span className={f.daysToStart <= 0 ? "text-destructive font-bold" : f.daysToStart <= 10 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {f.daysToStart <= 0 ? `Iniciou há ${Math.abs(f.daysToStart)}d` : `Em ${f.daysToStart}d (${f.startDate})`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Harvest Forecast */}
        {harvestForecast.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">🌾 Dias p/ Colheita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={harvestForecast} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="cycleName" type="category" tick={{ fontSize: 9 }} width={100} />
                  <Tooltip formatter={(v: number) => [`${v} dias`, "Dias restantes"]} />
                  <ReferenceLine x={0} stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <Bar dataKey="daysToStart" name="Dias restantes" radius={[0, 4, 4, 0]}>
                    {harvestForecast.map((entry, i) => (
                      <rect key={i} fill={entry.daysToStart <= 0 ? "hsl(0, 60%, 50%)" : entry.daysToStart <= 15 ? "hsl(42, 85%, 52%)" : "hsl(130, 55%, 40%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {harvestForecast.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[140px]">{f.cycleName}</span>
                    <span className={f.daysToStart <= 0 ? "text-destructive font-bold" : f.daysToStart <= 15 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {f.daysToStart <= 0 ? `Iniciou há ${Math.abs(f.daysToStart)}d` : `Em ${f.daysToStart}d (${f.startDate})`}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Applications by Phenological Stage */}
      {applicationsByStage.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🧪 Aplicações por Estádio Fenológico (todos os ciclos)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={applicationsByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {allInputTypes.map(t => (
                  <Bar
                    key={t}
                    dataKey={t}
                    stackId="a"
                    fill={INPUT_TYPE_COLORS[t] || "#78909C"}
                    name={INPUT_TYPE_LABELS[t] || t}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
