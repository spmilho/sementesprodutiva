import { useMemo } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PlantingDashboard from "./PlantingDashboard";
import PlantingPlanSection from "./PlantingPlanSection";
import ActualPlantingSection from "./ActualPlantingSection";
import StandCountSection from "./StandCountSection";
import PlantingComparative from "./PlantingComparative";
import PlantingCvSection from "./PlantingCvSection";
import { PLANTING_TYPES } from "./planting-utils";

export interface UnifiedPlantingTabProps {
  cycleId: string;
  orgId: string;
  femaleArea: number;
  maleArea: number;
  pivotName?: string;
  contractNumber?: string | null;
  cooperatorName?: string;
  hybridName?: string;
  malePlantingFinished?: boolean;
  femalePlantingFinished?: boolean;
  male1PlantingFinished?: boolean;
  male2PlantingFinished?: boolean;
  male3PlantingFinished?: boolean;
  onFinishToggle?: (type: string, finished: boolean) => void;
  spacingFemaleFemaleCm?: number | null;
  spacingFemaleMaleCm?: number | null;
  spacingMaleMaleCm?: number | null;
  femaleMaleRatio?: string;
}

export default function UnifiedPlantingTab(props: UnifiedPlantingTabProps) {
  const { cycleId, orgId } = props;

  const { data: glebas = [] } = useQuery({
    queryKey: ["pivot_glebas", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pivot_glebas").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("name");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: seedLots = [] } = useQuery({
    queryKey: ["seed_lots", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_lots").select("*, seed_lot_treatments(id)").eq("cycle_id", cycleId).is("deleted_at", null).order("parent_type, lot_number");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["planting_plan", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("planting_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: actuals = [], isLoading: actualsLoading } = useQuery({
    queryKey: ["planting_actual", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_actual").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("planting_date");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: cvPoints = [] } = useQuery({
    queryKey: ["planting_cv_points", cycleId],
    queryFn: async () => {
      const actualIds = actuals.map((a: any) => a.id);
      if (!actualIds.length) return [];
      const { data, error } = await (supabase as any)
        .from("planting_cv_points").select("*").in("planting_actual_id", actualIds).order("point_number");
      if (error) throw error;
      return data as any[];
    },
    enabled: actuals.length > 0,
  });

  const { data: standCounts = [], isLoading: standLoading } = useQuery({
    queryKey: ["stand_counts", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stand_counts").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("count_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: standPoints = [] } = useQuery({
    queryKey: ["stand_count_points", cycleId],
    queryFn: async () => {
      const scIds = standCounts.map((s: any) => s.id);
      if (!scIds.length) return [];
      const { data, error } = await (supabase as any)
        .from("stand_count_points").select("*").in("stand_count_id", scIds).order("point_number");
      if (error) throw error;
      return data as any[];
    },
    enabled: standCounts.length > 0,
  });

  const { data: cvRecords = [] } = useQuery({
    queryKey: ["planting_cv_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_cv_records").select("*").eq("cycle_id", cycleId).is("deleted_at", null).order("type");
      if (error) throw error;
      return data as any[];
    },
  });

  const isLoading = plansLoading || actualsLoading || standLoading;

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = actuals.length > 0 || standCounts.length > 0;

  const finishStatus: Record<string, boolean> = {
    female: props.femalePlantingFinished ?? false,
    male_1: props.male1PlantingFinished ?? props.malePlantingFinished ?? false,
    male_2: props.male2PlantingFinished ?? false,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Contrato: <strong className="text-foreground">{props.contractNumber || props.pivotName || "—"}</strong></span>
        <span>•</span>
        <span>Híbrido: <strong className="text-foreground">{props.hybridName || "—"}</strong></span>
        <span>•</span>
        <span>Cooperado: <strong className="text-foreground">{props.cooperatorName || "—"}</strong></span>
        <span>•</span>
        <span>Pivô: <strong className="text-foreground">{props.pivotName || "—"}</strong></span>
        <span>•</span>
        <span>Área fêmea: <strong className="text-foreground">{props.femaleArea} ha</strong></span>
        <span>•</span>
        <span>Área macho: <strong className="text-foreground">{props.maleArea} ha</strong></span>
      </div>

      {/* Planting completion toggles */}
      <div className="flex flex-wrap gap-2">
        {PLANTING_TYPES.map(t => {
          const finished = finishStatus[t.value] ?? false;
          return (
            <Button
              key={t.value}
              variant={finished ? "default" : "outline"}
              size="sm"
              className={`gap-1.5 text-xs ${finished ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={() => props.onFinishToggle?.(t.value, !finished)}
            >
              {finished && <CheckCircle2 className="h-3.5 w-3.5" />}
              {t.label} {finished ? "✓ Finalizado" : "— Em andamento"}
            </Button>
          );
        })}
      </div>

      {/* Section 1 - Dashboard */}
      {hasData ? (
        <PlantingDashboard
          plans={plans}
          actuals={actuals}
          cvPoints={cvPoints}
          standCounts={standCounts}
          standPoints={standPoints}
          glebas={glebas}
          femaleArea={props.femaleArea}
          maleArea={props.maleArea}
        />
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
          Registre o plantio para visualizar o dashboard.
        </div>
      )}

      {/* Section 2 - Planting Plan */}
      <PlantingPlanSection
        cycleId={cycleId}
        orgId={orgId}
        plans={plans}
        glebas={glebas}
        seedLots={seedLots}
        femaleArea={props.femaleArea}
        maleArea={props.maleArea}
        spacingFemaleFemaleCm={props.spacingFemaleFemaleCm}
        spacingFemaleMaleCm={props.spacingFemaleMaleCm}
        spacingMaleMaleCm={props.spacingMaleMaleCm}
      />

      {/* Section 3 - Actual Planting + CV Points */}
      <ActualPlantingSection
        cycleId={cycleId}
        orgId={orgId}
        actuals={actuals}
        plans={plans}
        glebas={glebas}
        seedLots={seedLots}
        spacingFemaleFemaleCm={props.spacingFemaleFemaleCm}
        spacingMaleMaleCm={props.spacingMaleMaleCm}
      />

      {/* Section 3.5 - CV% de Semeadura */}
      <PlantingCvSection
        cycleId={cycleId}
        orgId={orgId}
        femaleMaleRatio={props.femaleMaleRatio || "4F:2M"}
      />

      {/* Section 4 - Stand Counts */}
      <StandCountSection
        cycleId={cycleId}
        orgId={orgId}
        standCounts={standCounts}
        standPoints={standPoints}
        plans={plans}
        actuals={actuals}
        glebas={glebas}
      />

      {/* Section 5 - Comparative */}
      {hasData && (
        <PlantingComparative
          plans={plans}
          actuals={actuals}
          standCounts={standCounts}
          glebas={glebas}
          femaleArea={props.femaleArea}
          maleArea={props.maleArea}
        />
      )}
    </div>
  );
}
