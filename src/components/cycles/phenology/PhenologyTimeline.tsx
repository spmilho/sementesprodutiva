import { useMemo } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2 } from "lucide-react";
import CornPlantSvg from "./CornPlantSvg";

const ALL_STAGES = ["VE", "V1", "V2", "V4", "V6", "V8", "V10", "V12", "V14/Vn", "VT", "R1", "R2", "R3", "R4", "R5", "R6"] as const;

const STAGE_DESCRIPTIONS: Record<string, string> = {
  VE: "Emergência — coleóptilo visível",
  V1: "Primeira folha com colar visível",
  V2: "Segunda folha com colar visível",
  V4: "Quarta folha — definição de produção",
  V6: "Sexta folha — ponto de crescimento acima do solo",
  V8: "Oitava folha — crescimento acelerado",
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
  const filtered = records.filter(r => r.type === filter);

  const stageMap = new Map<string, any>();
  for (const r of filtered) {
    const existing = stageMap.get(r.stage);
    if (!existing || r.observation_date > existing.observation_date) {
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
    const isPast = i <= lastIdx;
    const isCurrent = i === lastIdx;
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

const PARENTAL_CONFIG: Record<string, { label: string; badgeClass: string; accent: string }> = {
  female: {
    label: "🟣 Fêmea",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800",
    accent: "pink",
  },
  male_1: {
    label: "🔵 Macho 1",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    accent: "blue",
  },
  male_2: {
    label: "🔵 Macho 2",
    badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
    accent: "cyan",
  },
};

function SingleTimeline({
  infos,
  label,
  badgeClass,
  onClickFuture,
  onClickPast,
}: {
  infos: StageInfo[];
  label: string;
  badgeClass: string;
  onClickFuture?: (stage: string) => void;
  onClickPast?: (record: any) => void;
}) {
  const lastRegistered = infos.reduce((acc, s, i) => (s.isPast ? i : acc), -1);

  return (
    <div className="space-y-1">
      <Badge variant="outline" className={cn("text-[11px] font-semibold mb-1", badgeClass)}>
        {label}
      </Badge>
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
          {/* VT_INDEX items vegetative + connectors, then separator, then reproductive */}
          <div className="text-center" style={{ flex: VT_INDEX }}>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider">
              Estádios Vegetativos
            </span>
          </div>
          <div className="text-center" style={{ flex: ALL_STAGES.length - VT_INDEX }}>
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">
              Estádios Reprodutivos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PhenologyTimeline({ records, onClickFuture, onClickPast, plantingDate }: PhenologyTimelineProps) {
  const femaleInfos = useMemo(() => buildStageInfos(records, "female", plantingDate), [records, plantingDate]);
  const male1Infos = useMemo(() => buildStageInfos(records, "male_1", plantingDate), [records, plantingDate]);
  const male2Infos = useMemo(() => buildStageInfos(records, "male_2", plantingDate), [records, plantingDate]);

  return (
    <div className="space-y-5">
      <SingleTimeline
        infos={femaleInfos}
        label={PARENTAL_CONFIG.female.label}
        badgeClass={PARENTAL_CONFIG.female.badgeClass}
        onClickFuture={onClickFuture}
        onClickPast={onClickPast}
      />
      <SingleTimeline
        infos={male1Infos}
        label={PARENTAL_CONFIG.male_1.label}
        badgeClass={PARENTAL_CONFIG.male_1.badgeClass}
        onClickFuture={onClickFuture}
        onClickPast={onClickPast}
      />
      <SingleTimeline
        infos={male2Infos}
        label={PARENTAL_CONFIG.male_2.label}
        badgeClass={PARENTAL_CONFIG.male_2.badgeClass}
        onClickFuture={onClickFuture}
        onClickPast={onClickPast}
      />
    </div>
  );
}
