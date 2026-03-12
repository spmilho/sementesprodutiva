import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CropInput, INPUT_TYPE_CONFIG, STATUS_CONFIG } from "./types";
import { format, parseISO } from "date-fns";

interface Props {
  inputs: CropInput[];
  plantingDate: string | null;
}

export default function ManejoOperationsView({ inputs, plantingDate }: Props) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const operations = useMemo(() => {
    // Group by event_code
    const groups: Record<string, CropInput[]> = {};
    inputs.forEach(inp => {
      const key = inp.event_code || `manual_${inp.id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inp);
    });

    return Object.entries(groups)
      .map(([code, items]) => {
        const dates = items
          .map(i => i.execution_date || i.recommendation_date)
          .filter(Boolean)
          .sort();
        const dateRange = dates.length > 0
          ? dates.length === 1
            ? format(parseISO(dates[0]!), "dd/MM/yyyy")
            : `${format(parseISO(dates[0]!), "dd/MM")}–${format(parseISO(dates[dates.length - 1]!), "dd/MM/yyyy")}`
          : "—";

        const allApplied = items.every(i => i.status === "applied");
        const eventType = items[0]?.event_type || "Operação";

        let dap: number | null = null;
        let stage = "";
        if (plantingDate && dates[0]) {
          const diff = Math.floor((new Date(dates[0]).getTime() - new Date(plantingDate).getTime()) / 86400000);
          if (diff >= 0) {
            dap = diff;
            stage = items[0]?.growth_stage_at_application || "";
          }
        }

        return { code, items, dateRange, allApplied, eventType, dap, stage };
      })
      .sort((a, b) => {
        const da = a.items[0]?.execution_date || a.items[0]?.recommendation_date || "";
        const db = b.items[0]?.execution_date || b.items[0]?.recommendation_date || "";
        return db.localeCompare(da);
      });
  }, [inputs, plantingDate]);

  const filtered = operations.filter(op => {
    if (typeFilter !== "all" && !op.items.some(i => i.input_type === typeFilter)) return false;
    if (statusFilter !== "all" && !op.items.some(i => i.status === statusFilter)) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">Operações</h3>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(INPUT_TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhuma operação encontrada.</p>}

      {filtered.map(op => (
        <Card key={op.code} className="border">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">📋 {op.eventType}</span>
              {op.code && !op.code.startsWith("manual_") && (
                <Badge variant="outline" className="text-[10px]">#{op.code}</Badge>
              )}
              <span className="text-xs text-muted-foreground">{op.dateRange}</span>
              {op.dap !== null && <span className="text-xs text-muted-foreground">({op.dap} DAP)</span>}
              {op.stage && <Badge variant="secondary" className="text-[10px]">{op.stage}</Badge>}
              {op.items[0]?.source === "manual" && <Badge variant="outline" className="text-[10px]">Manual</Badge>}
            </div>

            {op.items.map(item => {
              const typeCfg = INPUT_TYPE_CONFIG[item.input_type] || INPUT_TYPE_CONFIG.other;
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.recommended;
              return (
                <div key={item.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded border ${statusCfg.bgClass}`}>
                  <span>{typeCfg.icon}</span>
                  <span className="font-medium">{item.product_name}</span>
                  {item.active_ingredient && <span className="text-muted-foreground">({item.active_ingredient})</span>}
                  <span>— {item.dose_per_ha ?? "—"} {item.unit || ""}/ha</span>
                  <span className="text-muted-foreground">— {typeCfg.label}</span>
                  <Badge variant="outline" className={`ml-auto text-[10px] ${statusCfg.colorClass}`}>
                    {statusCfg.icon}
                  </Badge>
                </div>
              );
            })}

            <p className="text-xs text-muted-foreground">
              Total produtos: {op.items.length} | {op.allApplied ? "Todos realizados ✅" : `${op.items.filter(i => i.status === "applied").length}/${op.items.length} realizados`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
