import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from "lucide-react";
import CornPlantSvg from "./CornPlantSvg";

const ALL_STAGES = ["VE", "V1", "V2", "V4", "V6", "V10", "V12", "V14/Vn", "VT", "R1", "R2", "R3", "R4", "R5", "R6"] as const;

const STAGE_DESCRIPTIONS: Record<string, string> = {
  VE: "Emergência — coleóptilo visível",
  V1: "Primeira folha com colar visível",
  V2: "Segunda folha com colar visível",
  V4: "Quarta folha — definição de produção",
  V6: "Sexta folha — ponto de crescimento acima do solo",
  V10: "Crescimento rápido do colmo",
  V12: "Determinação do número de fileiras de grãos",
  "V14/Vn": "Última folha antes do pendoamento",
  VT: "Pendoamento — liberação de pólen",
  R1: "Espigamento — emissão dos estigmas",
  R2: "Bolha d'água — grão com líquido claro",
  R3: "Leitoso — grão com líquido leitoso",
  R4: "Pastoso — grão com consistência pastosa",
  R5: "Dentado — formação da camada preta",
  R6: "Maturidade fisiológica — camada preta formada",
};

const VT_INDEX = ALL_STAGES.indexOf("VT");

type ParentalFilter = string; // "female" | "male" | "male_1" | "male_2" | "male_3" | "both"

interface PhenologyTimelineProps {
  records: any[];
  onClickFuture?: (stage: string) => void;
  onClickPast?: (record: any) => void;
  plantingDate?: string | null;
  maleTypes?: string[];
}

interface StageInfo {
  stage: string;
  date: string | null;
  isPast: boolean;
  isCurrent: boolean;
  record?: any;
  dap?: number | null;
}

function buildStageInfos(records: any[], filter: string, plantingDate?: string | null): StageInfo[] {
  const filtered = records.filter(r => {
    if (filter === "both") return true;
    // "male" filter matches "male", "male_1", "male_2", "male_3"
    if (filter === "male") return r.type === "male" || r.type?.startsWith("male_");
    return r.type === filter;
  });

  const stageMap = new Map<string, any>();
  for (const r of filtered) {
    const existing = stageMap.get(r.stage);
    if (!existing || r.observation_date < existing.observation_date) {
      stageMap.set(r.stage, r);
    }
  }

  let lastIdx = -1;
  for (let i = 0; i < ALL_STAGES.length; i++) {
    if (stageMap.has(ALL_STAGES[i])) lastIdx = i;
  }

  const plantDate = plantingDate ? new Date(plantingDate + "T12:00:00") : null;

  return ALL_STAGES.map((stage, i) => {
    const rec = stageMap.get(stage);
    const isPast = rec != null && i < lastIdx;
    const isCurrent = i === lastIdx && rec != null;
    let dap: number | null = null;
    if (rec && plantDate) {
      const obsDate = new Date(rec.observation_date + "T12:00:00");
      dap = Math.round((obsDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    return {
      stage,
      date: rec?.observation_date || null,
      isPast: isPast || isCurrent,
      isCurrent,
      record: rec || undefined,
      dap,
    };
  });
}

const TYPE_LABELS: Record<string, string> = {
  female: "🟣 Fêmea",
  male_1: "🔵 Macho 1",
  male_2: "🔵 Macho 2",
  male_3: "🔵 Macho 3",
  both: "Todos",
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  female: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
  male_1: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  male_2: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
  male_3: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
};

export default function PhenologyTimeline({ records, onClickFuture, onClickPast, plantingDate, maleTypes = [] }: PhenologyTimelineProps) {
  // Determine available filters — always use male_1/male_2, never generic "male"
  const availableMales = maleTypes.length > 0 ? maleTypes : ["male_1", "male_2"];
  const filterOptions: string[] = ["female", ...availableMales, "both"];

  const [filter, setFilter] = useState<string>("female");

  const femaleInfos = useMemo(() => buildStageInfos(records, "female", plantingDate), [records, plantingDate]);
  const male1Infos = useMemo(() => buildStageInfos(records, "male_1", plantingDate), [records, plantingDate]);
  const male2Infos = useMemo(() => buildStageInfos(records, "male_2", plantingDate), [records, plantingDate]);
  const male3Infos = useMemo(() => buildStageInfos(records, "male_3", plantingDate), [records, plantingDate]);

  const renderTimeline = (infos: StageInfo[], label?: string, labelColor?: string) => {
    const lastRegistered = infos.reduce((acc, s, i) => s.isPast ? i : acc, -1);

    return (
      <div className="space-y-1">
        {label && (
          <Badge variant="outline" className={cn("text-[10px] mb-1", labelColor)}>
            {label}
          </Badge>
        )}
        <div className="relative overflow-x-auto pb-2">
          <div className="flex items-end gap-0 min-w-max px-2">
            {infos.map((info, i) => {
              const isFuture = !info.isPast && !info.isCurrent;
              const isVegetative = i < VT_INDEX;
              const isReproductive = i >= VT_INDEX;
              const isFirstReproductive = i === VT_INDEX;

              return (
                <div key={info.stage} className="flex items-end">
                  {isFirstReproductive && (
                    <div className="flex flex-col items-center mx-1">
                      <div className="w-px h-24 bg-border" />
                    </div>
                  )}
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex flex-col items-center cursor-pointer transition-all duration-200 px-1 min-w-[52px] md:min-w-[60px]",
                            "rounded-lg py-1",
                            isVegetative && !isFuture && "bg-emerald-50/50 dark:bg-emerald-950/20",
                            isReproductive && !isFuture && "bg-amber-50/50 dark:bg-amber-950/20",
                            isFuture && "hover:bg-muted/50",
                            info.isCurrent && "bg-amber-100/60 dark:bg-amber-900/30 ring-1 ring-amber-300 dark:ring-amber-700"
                          )}
                          onClick={() => {
                            if (isFuture && onClickFuture) onClickFuture(info.stage);
                            else if (info.record && onClickPast) onClickPast(info.record);
                          }}
                        >
                          <div className="flex items-end justify-center" style={{ height: 130 }}>
                            <CornPlantSvg stage={info.stage} isFuture={isFuture} isCurrent={info.isCurrent} />
                          </div>
                          <span className={cn(
                            "text-[10px] mt-1 leading-none",
                            info.isCurrent && "font-bold text-foreground",
                            info.isPast && !info.isCurrent && "font-semibold text-foreground",
                            isFuture && "text-muted-foreground/40"
                          )}>
                            {info.stage}
                          </span>
                          {info.isCurrent && (
                            <span className="text-[8px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">📍 Atual</span>
                          )}
                          {info.isPast && !info.isCurrent && (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5" />
                          )}
                          {info.date && (
                            <span className="text-[8px] text-muted-foreground mt-0.5 leading-none">
                              {format(new Date(info.date + "T12:00:00"), "dd/MM")}
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs space-y-1">
                        <p className="font-semibold">{info.stage} — {STAGE_DESCRIPTIONS[info.stage]}</p>
                        {info.date ? (
                          <>
                            <p>Registrado em {format(new Date(info.date + "T12:00:00"), "dd/MM/yyyy")}</p>
                            {info.dap != null && <p>{info.dap} DAP</p>}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Ainda não atingido</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {i < infos.length - 1 && !(i + 1 === VT_INDEX) && (
                    <div className="flex items-center self-center mb-8">
                      <div
                        className={cn(
                          "h-[3px] w-3 md:w-4 rounded-full transition-colors",
                          i < lastRegistered
                            ? "bg-emerald-500"
                            : i === lastRegistered
                              ? "bg-gradient-to-r from-emerald-500 to-muted"
                              : "bg-muted border border-dashed border-muted-foreground/20 h-px"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex min-w-max px-2 mt-1">
            <div className="flex-1 text-center" style={{ maxWidth: `${VT_INDEX * 64}px` }}>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">
                Estádios Vegetativos
              </span>
            </div>
            <div className="flex-1 text-center">
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">
                Estádios Reprodutivos
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getInfosForType = (type: string) => {
    if (type === "female") return femaleInfos;
    if (type === "male_1") return male1Infos;
    if (type === "male_2") return male2Infos;
    if (type === "male_3") return male3Infos;
    return male1Infos;
  };

  const showBoth = filter === "both";

  return (
    <div className="space-y-3">
      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Parental:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {filterOptions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {TYPE_LABELS[f] || f}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline(s) */}
      {showBoth ? (
        <div className="space-y-4">
          {renderTimeline(femaleInfos, "Fêmea", TYPE_BADGE_STYLES.female)}
          {availableMales.includes("male_1") && renderTimeline(male1Infos, "Macho 1", TYPE_BADGE_STYLES.male_1)}
          {availableMales.includes("male_2") && renderTimeline(male2Infos, "Macho 2", TYPE_BADGE_STYLES.male_2)}
          {availableMales.includes("male_3") && renderTimeline(male3Infos, "Macho 3", TYPE_BADGE_STYLES.male_3)}
        </div>
      ) : (
        renderTimeline(getInfosForType(filter))
      )}
    </div>
  );
}
