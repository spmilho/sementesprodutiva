import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CropInput, INPUT_TYPE_CONFIG, getDapRange } from "./types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  inputs: CropInput[];
  plantingDate: string | null;
  cycleId: string;
}

const STAGES_ORDER = ["DESSEC.", "TS", "VE", "V1-V2", "V3-V4", "V6-V8", "V10-V12", "V14-VT", "VT-R1", "R2-R3", "R4-R5", "R6"];

const TYPE_BG: Record<string, string> = {
  fertilizer_macro: "bg-green-600 text-white",
  fertilizer_micro: "bg-emerald-500 text-white",
  insecticide: "bg-amber-500 text-white",
  herbicide: "bg-blue-700 text-white",
  fungicide: "bg-green-500 text-white",
  adjuvant: "bg-gray-400 text-white",
  seed: "bg-teal-700 text-white",
  other: "bg-gray-500 text-white",
};

export default function ManejoTimeline({ inputs, plantingDate, cycleId }: Props) {
  // Fetch TS (seed treatment) products
  const { data: tsProducts = [] } = useQuery({
    queryKey: ["seed_treatment_products_for_timeline", cycleId],
    queryFn: async () => {
      // Get seed lots for this cycle
      const { data: lots } = await (supabase as any)
        .from("seed_lots")
        .select("id")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      if (!lots || lots.length === 0) return [];
      const lotIds = lots.map((l: any) => l.id);
      // Get treatments
      const { data: treatments } = await (supabase as any)
        .from("seed_lot_treatments")
        .select("id")
        .in("seed_lot_id", lotIds)
        .is("deleted_at", null);
      if (!treatments || treatments.length === 0) return [];
      const treatmentIds = treatments.map((t: any) => t.id);
      // Get treatment products
      const { data: products } = await (supabase as any)
        .from("seed_lot_treatment_products")
        .select("product_name, dose, dose_unit, product_type, category")
        .in("seed_lot_treatment_id", treatmentIds);
      return products || [];
    },
    enabled: !!cycleId,
  });

  const stageProducts = useMemo(() => {
    const map: Record<string, { type: string; name: string; dose: string }[]> = {};
    STAGES_ORDER.forEach(s => { map[s] = []; });

    // Add TS products
    const seen = new Set<string>();
    tsProducts.forEach((p: any) => {
      const key = `TS_${p.product_name}`;
      if (seen.has(key)) return;
      seen.add(key);
      map["TS"].push({
        type: "seed",
        name: p.product_name,
        dose: p.dose != null ? `${Number(p.dose).toFixed(2)} ${p.dose_unit || ""}/ha` : "",
      });
    });

    // Calculate stage for each input based on DAP
    inputs.forEach(inp => {
      const date = inp.execution_date || inp.recommendation_date;
      if (!date) return;

      let stage = inp.growth_stage_at_application;
      if (!stage && plantingDate) {
        const dap = Math.floor((new Date(date).getTime() - new Date(plantingDate).getTime()) / 86400000);
        if (dap < 0) {
          stage = "DESSEC.";
        } else {
          stage = getDapRange(dap);
        }
      }
      if (!stage) return;

      const stageIdx = STAGES_ORDER.indexOf(stage);
      if (stageIdx < 0) return;

      const prodKey = `${stage}_${inp.product_name}_${inp.input_type}`;
      if (seen.has(prodKey)) return;
      seen.add(prodKey);

      map[stage].push({
        type: inp.input_type,
        name: inp.product_name,
        dose: inp.dose_per_ha != null ? `${Number(inp.dose_per_ha).toFixed(2)} ${inp.unit || ""}/ha` : "",
      });
    });

    return map;
  }, [inputs, plantingDate, tsProducts]);

  const hasData = Object.values(stageProducts).some(arr => arr.length > 0);
  if (!hasData) return null;

  const maxProducts = Math.max(...Object.values(stageProducts).map(a => a.length), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🌱 Timeline de Manejo por Fenologia
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        <ScrollArea className="w-full">
          <div className="px-4 min-w-[900px]">
            {/* Products stacked above timeline */}
            <div className="flex items-end gap-0" style={{ minHeight: maxProducts * 36 + 20 }}>
              {STAGES_ORDER.map(stage => {
                const products = stageProducts[stage];
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center justify-end gap-1 px-0.5">
                    {products.map((p, i) => {
                      const bgClass = TYPE_BG[p.type] || TYPE_BG.other;
                      return (
                        <div
                          key={i}
                          className={`${bgClass} rounded px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-center w-full truncate shadow-sm`}
                          title={`${p.name}${p.dose ? ` — ${p.dose}` : ""}`}
                        >
                          {p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name}
                          {p.dose && (
                            <div className="text-[8px] font-normal opacity-80">{p.dose}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Vertical dashes */}
            <div className="flex gap-0 mt-1">
              {STAGES_ORDER.map(stage => (
                <div key={stage} className="flex-1 flex justify-center">
                  {stageProducts[stage].length > 0 && (
                    <div className="w-px h-4 border-l border-dashed border-muted-foreground/40" />
                  )}
                </div>
              ))}
            </div>

            {/* Growth stage bar */}
            <div className="flex gap-0 relative">
              {STAGES_ORDER.map((stage, i) => {
                const isVegetative = !stage.startsWith("R") && stage !== "VT-R1";
                const hasProducts = stageProducts[stage].length > 0;
                return (
                  <div
                    key={stage}
                    className={`flex-1 text-center py-1.5 text-[10px] font-bold border-t-2 transition-colors
                      ${isVegetative
                        ? "bg-green-100 dark:bg-green-950 border-green-500 text-green-800 dark:text-green-300"
                        : "bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-800 dark:text-amber-300"
                      }
                      ${i === 0 ? "rounded-l" : ""} ${i === STAGES_ORDER.length - 1 ? "rounded-r" : ""}
                      ${hasProducts ? "ring-1 ring-inset ring-foreground/10" : ""}
                    `}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>

            {/* Corn growth icons */}
            <div className="flex gap-0 mt-1">
              {STAGES_ORDER.map((stage, i) => {
                const heights = [8, 10, 14, 18, 24, 32, 38, 44, 44, 40, 36, 30];
                const h = heights[i] || 20;
                return (
                  <div key={stage} className="flex-1 flex justify-center">
                    <div
                      className="bg-gradient-to-t from-green-700 to-green-400 dark:from-green-800 dark:to-green-500 rounded-t-sm opacity-60"
                      style={{ width: 6, height: h }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 mt-4 px-1">
              <span className="text-[10px] font-semibold text-muted-foreground">LEGENDA:</span>
              {Object.entries(INPUT_TYPE_CONFIG)
                .filter(([k]) => k !== "other" && k !== "seed")
                .map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-sm ${TYPE_BG[key]?.split(" ")[0] || "bg-gray-400"}`} />
                    <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                  </div>
                ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
