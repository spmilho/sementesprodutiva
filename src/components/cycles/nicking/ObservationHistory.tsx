import { useState, useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, Thermometer, Droplets, MapPin, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PARENT_COLORS, PARENT_LABELS, PARENT_BG,
  WATER_STRESS_OPTIONS, MALE_TASSEL_STAGE_LABELS, FEMALE_SILK_STAGE_LABELS,
  POLLEN_INTENSITY,
} from "./constants";

interface Props {
  observations: any[];
  allReadings: any[];
  fixedPoints: any[];
}

function ParentBadge({ type }: { type: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border", PARENT_BG[type] || "")}>
      {PARENT_LABELS[type] || type}
    </span>
  );
}

function SyncBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, { emoji: string; label: string; cls: string }> = {
    perfect: { emoji: "🟢", label: "Perfeito", cls: "text-green-700 dark:text-green-400" },
    male_early: { emoji: "🟡", label: "Macho adiantado", cls: "text-yellow-700 dark:text-yellow-400" },
    male_late: { emoji: "🟠", label: "Macho atrasado", cls: "text-orange-700 dark:text-orange-400" },
    critical_gap: { emoji: "🔴", label: "Gap crítico", cls: "text-red-700 dark:text-red-400" },
  };
  const c = map[status];
  return c ? <span className={cn("text-xs font-semibold", c.cls)}>{c.emoji} {c.label}</span> : null;
}

export default function ObservationHistory({ observations, allReadings, fixedPoints }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredObs = useMemo(() => {
    let result = [...observations];
    if (dateFrom) result = result.filter((o) => o.observation_date >= dateFrom);
    if (dateTo) result = result.filter((o) => o.observation_date <= dateTo);
    return result;
  }, [observations, dateFrom, dateTo]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildSummary = (obsId: string) => {
    const readings = allReadings.filter((r: any) => r.observation_id === obsId);
    const parts: string[] = [];
    for (const r of readings) {
      const fp = fixedPoints.find((f: any) => f.id === r.fixed_point_id);
      const label = PARENT_LABELS[r.parent_type] || r.parent_type;
      if (r.parent_type.startsWith("male")) {
        const stage = MALE_TASSEL_STAGE_LABELS[r.male_tassel_stage] || "";
        parts.push(`${label}: ${r.male_pollen_release_pct ?? 0}% pólen (${stage})`);
      } else {
        const stage = FEMALE_SILK_STAGE_LABELS[r.female_silk_stage] || "";
        parts.push(`${label}: ${r.female_silk_receptive_pct ?? 0}% receptiva (${stage})`);
      }
    }
    return parts.join(" | ");
  };

  if (observations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma observação registrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">📝 Histórico de Observações</p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-36 text-xs"
            placeholder="De"
          />
          <span className="text-xs text-muted-foreground">a</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-36 text-xs"
            placeholder="Até"
          />
        </div>
      </div>

      {filteredObs.map((obs: any) => {
        const status = obs.overall_synchrony_status || obs.synchrony_status;
        const expanded = expandedIds.has(obs.id);
        const obsReadings = allReadings.filter((r: any) => r.observation_id === obs.id);
        const summary = buildSummary(obs.id);

        return (
          <Card
            key={obs.id}
            className={cn(
              "border transition-colors",
              status === "critical_gap" && "border-[#F44336]/40",
              status === "perfect" && "border-[#4CAF50]/40"
            )}
          >
            <CardContent className="p-4 space-y-2">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(obs.observation_date + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                  {obs.observation_time && (
                    <span className="text-xs text-muted-foreground">{obs.observation_time}</span>
                  )}
                  <SyncBadge status={status} />
                </div>
                <div className="flex items-center gap-2">
                  {obs.observer_name && (
                    <span className="text-xs text-muted-foreground">{obs.observer_name}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => toggleExpand(obs.id)}
                  >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Auto-summary */}
              {summary && (
                <p className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1">
                  {summary}
                </p>
              )}

              {/* Environmental conditions */}
              {(obs.temp_max_c || obs.gdu_accumulated) && (
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {obs.temp_max_c && (
                    <span>
                      <Thermometer className="h-3 w-3 inline mr-0.5" />
                      {obs.temp_min_c}° – {obs.temp_max_c}°C
                    </span>
                  )}
                  {obs.gdu_accumulated && <span>GDU: {obs.gdu_accumulated}</span>}
                  {obs.water_stress && obs.water_stress !== "none" && (
                    <span className="text-amber-600">
                      <Droplets className="h-3 w-3 inline mr-0.5" />
                      {WATER_STRESS_OPTIONS.find((w) => w.value === obs.water_stress)?.label}
                    </span>
                  )}
                </div>
              )}

              {/* Action taken */}
              {obs.action_taken && (
                <p className="text-xs text-foreground">
                  <strong>Ação:</strong> {obs.action_taken}
                </p>
              )}

              {/* Expanded details */}
              {expanded && (
                <div className="space-y-2 pt-2 border-t">
                  {obsReadings.map((r: any) => {
                    const fp = fixedPoints.find((f: any) => f.id === r.fixed_point_id);
                    const isMale = r.parent_type.startsWith("male");
                    return (
                      <div
                        key={r.id}
                        className="rounded-md px-3 py-2 text-xs space-y-1"
                        style={{
                          borderLeft: `3px solid ${PARENT_COLORS[r.parent_type] || "#888"}`,
                          backgroundColor: "hsl(var(--muted) / 0.5)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <ParentBadge type={r.parent_type} />
                          <span className="font-medium">{fp?.name || "—"}</span>
                        </div>
                        {isMale ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                            <span>Anteras: <strong className="text-foreground">{r.male_anthers_exposed_pct ?? 0}%</strong></span>
                            <span>Pólen: <strong className="text-foreground">{r.male_pollen_release_pct ?? 0}%</strong></span>
                            <span>Intensidade: <strong className="text-foreground">
                              {POLLEN_INTENSITY.find(p => p.value === r.male_pollen_intensity)?.label || "—"}
                            </strong></span>
                            <span>Estádio: <strong className="text-foreground">
                              {MALE_TASSEL_STAGE_LABELS[r.male_tassel_stage] || "—"}
                            </strong></span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
                            <span>Visível: <strong className="text-foreground">{r.female_silk_visible_pct ?? 0}%</strong></span>
                            <span>Receptivo: <strong className="text-foreground">{r.female_silk_receptive_pct ?? 0}%</strong></span>
                            <span>Polinização: <strong className="text-foreground">
                              {({ none: "Sem", low: "Pouca", moderate: "Moderada", good: "Boa" } as any)[r.female_pollination_evidence] || "—"}
                            </strong></span>
                            <span>Estádio: <strong className="text-foreground">
                              {FEMALE_SILK_STAGE_LABELS[r.female_silk_stage] || "—"}
                            </strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {obs.technical_notes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Notas:</strong> {obs.technical_notes}
                    </p>
                  )}

                  {obs.photos && obs.photos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <Camera className="h-3 w-3 text-muted-foreground mt-0.5" />
                      <span className="text-xs text-muted-foreground">{obs.photos.length} foto(s)</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
