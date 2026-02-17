import { useState, useMemo, useCallback, useRef } from "react";
import { Plus, Loader2, CalendarIcon, MapPin, Camera, AlertTriangle, Thermometer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

import {
  PARENT_COLORS, PARENT_LABELS, PARENT_BG,
  MALE_TASSEL_STAGES, FEMALE_SILK_STAGES, POLLEN_INTENSITY, POLLINATION_EVIDENCE,
  WATER_STRESS_OPTIONS, SYNC_OPTIONS,
} from "./nicking/constants";
import FloweringCurvesChart from "./nicking/FloweringCurvesChart";
import GanttChart from "./nicking/GanttChart";
import MilestonesSection from "./nicking/MilestonesSection";
import ObservationHistory from "./nicking/ObservationHistory";
import FixedPointsMap from "./nicking/FixedPointsMap";
import NickingExport from "./nicking/NickingExport";
import InspectionImport from "./nicking/InspectionImport";

// ═══════════════════════════════════
// TYPES & HELPERS
// ═══════════════════════════════════

interface NickingProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  cooperatorName?: string;
  farmName?: string;
  season?: string;
}

function SyncSemaphore({ status }: { status: string | null }) {
  const config: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
    perfect: { bg: "bg-green-100 border-green-400 dark:bg-green-900/40 dark:border-green-600", text: "text-green-800 dark:text-green-200", label: "Sincronismo Perfeito", emoji: "🟢" },
    male_early: { bg: "bg-yellow-100 border-yellow-400 dark:bg-yellow-900/40 dark:border-yellow-600", text: "text-yellow-800 dark:text-yellow-200", label: "Macho Adiantado", emoji: "🟡" },
    male_late: { bg: "bg-orange-100 border-orange-400 dark:bg-orange-900/40 dark:border-orange-600", text: "text-orange-800 dark:text-orange-200", label: "Macho Atrasado", emoji: "🟠" },
    critical_gap: { bg: "bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-600", text: "text-red-800 dark:text-red-200", label: "Gap Crítico — Ação Imediata", emoji: "🔴" },
  };
  const c = status ? config[status] : null;
  if (!c) return (
    <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 text-center">
      <p className="text-5xl mb-2">⏳</p>
      <p className="text-lg text-muted-foreground font-medium">Aguardando primeira avaliação</p>
    </div>
  );
  return (
    <div className={cn("rounded-xl border-2 p-6 text-center", c.bg)}>
      <p className="text-5xl">{c.emoji}</p>
      <p className={cn("text-xl font-bold mt-2", c.text, status === "critical_gap" && "animate-pulse")}>{c.label}</p>
    </div>
  );
}

function ParentBadge({ type }: { type: string }) {
  return <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", PARENT_BG[type] || "")}>{PARENT_LABELS[type] || type}</span>;
}

const fixedPointSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(50),
  parent_type: z.string().min(1, "Tipo é obrigatório"),
  plants_monitored: z.coerce.number().int().min(1).max(100),
  reference_description: z.string().max(200).optional(),
});
type FixedPointFormValues = z.infer<typeof fixedPointSchema>;

// ═══════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════

export default function NickingSync({ cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, farmName, season }: NickingProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [obsDialogOpen, setObsDialogOpen] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [fpGps, setFpGps] = useState<{ lat: number; lng: number } | null>(null);
  const [fpPhotoFile, setFpPhotoFile] = useState<File | null>(null);

  const floweringChartRef = useRef<HTMLDivElement>(null);
  const ganttChartRef = useRef<HTMLDivElement>(null);

  // ── Fetch ALL planting plans ──
  const { data: allPlans = [] } = useQuery({
    queryKey: ["planting_plan_all", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan").select("*").eq("cycle_id", cycleId).is("deleted_at", null)
        .order("planting_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const malePlans = allPlans.filter((p: any) => p.type === "male");
  const femalePlans = allPlans.filter((p: any) => p.type === "female");
  const maleCount = Math.max(1, Math.min(3, malePlans.length));
  const femalePlantingDate = femalePlans.length > 0 ? femalePlans[0].planned_date : null;
  const malePlantingDates = useMemo(() => {
    const map: Record<string, string> = {};
    malePlans.forEach((p: any, i: number) => { map[`male_${i + 1}`] = p.planned_date; });
    return map;
  }, [malePlans]);

  const parentTypeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 1; i <= maleCount; i++) opts.push({ value: `male_${i}`, label: `Macho ${i}` });
    opts.push({ value: "female", label: "Fêmea" });
    return opts;
  }, [maleCount]);

  // ── Fetch fixed points ──
  const { data: fixedPoints = [], isLoading: fpLoading } = useQuery({
    queryKey: ["nicking_fixed_points", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_fixed_points").select("*").eq("cycle_id", cycleId).is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Fetch observations ──
  const { data: observations = [] } = useQuery({
    queryKey: ["nicking_observations_v2", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_observations").select("*").eq("cycle_id", cycleId).is("deleted_at", null)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Fetch point readings ──
  const observationIds = observations.map((o: any) => o.id);
  const { data: allReadings = [] } = useQuery({
    queryKey: ["nicking_point_readings", cycleId, observationIds],
    queryFn: async () => {
      if (observationIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("nicking_point_readings").select("*").in("observation_id", observationIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: observationIds.length > 0,
  });

  // ── Fetch milestones ──
  const { data: milestones = [] } = useQuery({
    queryKey: ["nicking_milestones", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("nicking_milestones").select("*").eq("cycle_id", cycleId);
      if (error) throw error;
      return data as any[];
    },
  });

  const latest = observations[0] || null;
  const latestStatus = latest?.overall_synchrony_status || latest?.synchrony_status || null;
  const daysSinceObs = latest ? differenceInDays(new Date(), new Date(latest.observation_date + "T12:00:00")) : null;

  const activeParentTypes = useMemo(() => {
    const types = new Set<string>();
    fixedPoints.forEach((fp: any) => types.add(fp.parent_type));
    return Array.from(types);
  }, [fixedPoints]);

  // ═══════════════════════════════════
  // FIXED POINT CRUD
  // ═══════════════════════════════════

  const fpForm = useForm<FixedPointFormValues>({
    resolver: zodResolver(fixedPointSchema),
    defaultValues: { name: "", parent_type: "", plants_monitored: 10, reference_description: "" },
  });

  const captureGps = useCallback((setter: (v: { lat: number; lng: number }) => void) => {
    if (!navigator.geolocation) { toast.error("GPS não suportado"); return; }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setter({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCapturingGps(false); toast.success("GPS capturado!"); },
      (err) => { setCapturingGps(false); toast.error("Erro GPS: " + err.message); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const saveFpMutation = useMutation({
    mutationFn: async (values: FixedPointFormValues) => {
      if (!fpGps) throw new Error("GPS é obrigatório.");
      let photoPath: string | null = null;
      if (fpPhotoFile) {
        const ext = fpPhotoFile.name.split(".").pop();
        const filePath = `${orgId}/${cycleId}/fp-${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, fpPhotoFile);
        if (ue) throw ue;
        photoPath = filePath;
      }
      const row: any = {
        cycle_id: cycleId, org_id: orgId, name: values.name, parent_type: values.parent_type,
        plants_monitored: values.plants_monitored, latitude: fpGps.lat, longitude: fpGps.lng,
        reference_description: values.reference_description || null, created_by: user?.id || null,
      };
      if (photoPath) row.photo_url = photoPath;
      const { error } = await (supabase as any).from("nicking_fixed_points").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_fixed_points", cycleId] });
      toast.success("Ponto fixo cadastrado!");
      setFpDialogOpen(false); fpForm.reset(); setFpGps(null); setFpPhotoFile(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "nicking_fixed_points", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["nicking_fixed_points", cycleId] }); toast.success("Ponto removido!"); },
    onError: (err: any) => toast.error(err.message),
  });

  // ═══════════════════════════════════
  // OBSERVATION FORM STATE
  // ═══════════════════════════════════

  const [obsDate, setObsDate] = useState<Date | undefined>(undefined);
  const [obsTime, setObsTime] = useState("08:00");
  const [tempMax, setTempMax] = useState("");
  const [tempMin, setTempMin] = useState("");
  const [gduAcc, setGduAcc] = useState("");
  const [waterStress, setWaterStress] = useState("none");
  const [overallSync, setOverallSync] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [techNotes, setTechNotes] = useState("");
  const [obsPhotos, setObsPhotos] = useState<File[]>([]);
  const [pointReadings, setPointReadings] = useState<Record<string, any>>({});

  const updatePointReading = (fpId: string, field: string, value: any) => {
    setPointReadings((prev) => ({ ...prev, [fpId]: { ...prev[fpId], [field]: value } }));
  };

  const resetObsForm = () => {
    setObsDate(undefined); setObsTime("08:00"); setTempMax(""); setTempMin("");
    setGduAcc(""); setWaterStress("none"); setOverallSync(""); setActionTaken("");
    setTechNotes(""); setObsPhotos([]); setPointReadings({});
  };

  const saveObsMutation = useMutation({
    mutationFn: async () => {
      if (!obsDate) throw new Error("Data é obrigatória");
      if (!overallSync) throw new Error("Status de sincronismo é obrigatório");

      const photoPaths: string[] = [];
      for (const file of obsPhotos) {
        const ext = file.name.split(".").pop();
        const filePath = `${orgId}/${cycleId}/nicking-${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, file);
        if (ue) throw ue;
        photoPaths.push(filePath);
      }

      const obsRow: any = {
        cycle_id: cycleId, org_id: orgId,
        observation_date: format(obsDate, "yyyy-MM-dd"),
        observation_time: obsTime || null,
        observer_name: user?.user_metadata?.full_name || user?.email || null,
        temp_max_c: tempMax ? parseFloat(tempMax) : null,
        temp_min_c: tempMin ? parseFloat(tempMin) : null,
        gdu_accumulated: gduAcc ? parseFloat(gduAcc) : null,
        water_stress: waterStress,
        overall_synchrony_status: overallSync,
        action_taken: actionTaken || null,
        technical_notes: techNotes || null,
        photos: photoPaths.length > 0 ? photoPaths : null,
        male_stage: null, female_stage: null, pollen_availability: null,
        synchrony_status: overallSync, silk_reception_pct: null,
      };

      const { data: inserted, error: obsErr } = await (supabase as any)
        .from("nicking_observations").insert(obsRow).select("id").single();
      if (obsErr) throw obsErr;
      const obsId = inserted.id;

      const readingRows: any[] = [];
      for (const fp of fixedPoints) {
        const r = pointReadings[fp.id];
        if (!r) continue;
        readingRows.push({
          observation_id: obsId, fixed_point_id: fp.id, parent_type: fp.parent_type,
          male_anthers_exposed_pct: r.male_anthers_exposed_pct ?? null,
          male_pollen_release_pct: r.male_pollen_release_pct ?? null,
          male_pollen_intensity: r.male_pollen_intensity ?? null,
          male_tassel_stage: r.male_tassel_stage ?? null,
          female_silk_visible_pct: r.female_silk_visible_pct ?? null,
          female_silk_receptive_pct: r.female_silk_receptive_pct ?? null,
          female_pollination_evidence: r.female_pollination_evidence ?? null,
          female_silk_stage: r.female_silk_stage ?? null,
        });
      }
      if (readingRows.length > 0) {
        const { error: rErr } = await (supabase as any).from("nicking_point_readings").insert(readingRows);
        if (rErr) throw rErr;
      }

      // Update milestones
      for (const fp of fixedPoints) {
        const r = pointReadings[fp.id];
        if (!r) continue;
        const dateStr = format(obsDate, "yyyy-MM-dd");
        const { data: existing } = await (supabase as any)
          .from("nicking_milestones").select("*").eq("cycle_id", cycleId).eq("fixed_point_id", fp.id).single();

        const updates: any = {};
        if (fp.parent_type.startsWith("male")) {
          if (r.male_tassel_stage === "anthesis_start" && !existing?.anthesis_start_date) updates.anthesis_start_date = dateStr;
          if (r.male_tassel_stage === "anthesis_50pct" && !existing?.anthesis_50pct_date) updates.anthesis_50pct_date = dateStr;
          if (r.male_tassel_stage === "anthesis_end" && !existing?.anthesis_end_date) updates.anthesis_end_date = dateStr;
        } else {
          if (r.female_silk_stage === "silk_start" && !existing?.silk_start_date) updates.silk_start_date = dateStr;
          if (r.female_silk_stage === "silk_50pct" && !existing?.silk_50pct_date) updates.silk_50pct_date = dateStr;
          if (r.female_silk_stage === "silk_browning" && !existing?.silk_end_date) updates.silk_end_date = dateStr;
        }

        if (Object.keys(updates).length > 0) {
          updates.updated_at = new Date().toISOString();
          if (existing) {
            await (supabase as any).from("nicking_milestones").update(updates).eq("id", existing.id);
          } else {
            await (supabase as any).from("nicking_milestones").insert({
              cycle_id: cycleId, fixed_point_id: fp.id, parent_type: fp.parent_type, ...updates,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_observations_v2", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["nicking_point_readings", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["nicking_milestones", cycleId] });
      toast.success("Observação registrada!");
      setObsDialogOpen(false); resetObsForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const cycleInfo = { contractNumber, pivotName: pivotName || "", hybridName: hybridName || "", cooperatorName, farmName, season };

  // ═══════════════════════════════════
  // RENDER — LINEAR LAYOUT
  // ═══════════════════════════════════

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          {contractNumber && <span className="font-semibold text-foreground mr-2">Contrato {contractNumber}</span>}
          {pivotName && <span className="mr-2">{pivotName}</span>}
          {hybridName && <span className="mr-2">· {hybridName}</span>}
          {cooperatorName && <span>· {cooperatorName}</span>}
        </div>
        <NickingExport
          observations={observations} allReadings={allReadings} fixedPoints={fixedPoints}
          milestones={milestones} cycleInfo={cycleInfo}
          floweringChartRef={floweringChartRef} ganttChartRef={ganttChartRef}
        />
      </div>

      {/* 1.5. IMPORTAÇÃO DE RELATÓRIO DE INSPEÇÃO */}
      <InspectionImport cycleId={cycleId} orgId={orgId} />

      {/* 2. SEMÁFORO + KPI CARDS */}
      <SyncSemaphore status={latestStatus} />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Pontos Fixos</p><p className="text-xl font-bold">{fixedPoints.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Observações</p><p className="text-xl font-bold">{observations.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">GDU Acumulado</p><p className="text-xl font-bold">{latest?.gdu_accumulated ?? "—"}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Macho(s)</p><p className="text-xl font-bold">{fixedPoints.filter((fp: any) => fp.parent_type.startsWith("male")).length} pts</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-muted-foreground">Fêmea</p><p className="text-xl font-bold">{fixedPoints.filter((fp: any) => fp.parent_type === "female").length} pts</p></CardContent></Card>
        <Card className={cn(daysSinceObs != null && daysSinceObs > 3 ? "border-[#F44336]/50" : "")}>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Última Obs.</p>
            {latest ? (
              <>
                <p className="text-sm font-medium">{format(new Date(latest.observation_date + "T12:00:00"), "dd/MM")}</p>
                {daysSinceObs != null && daysSinceObs > 3 && (
                  <p className="text-[10px] font-medium" style={{ color: "#F44336" }}><AlertTriangle className="h-3 w-3 inline" /> {daysSinceObs}d sem avaliação</p>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      {/* 3. ALERTAS */}
      {latestStatus === "critical_gap" && (
        <div className="rounded-lg border-2 border-[#F44336]/50 bg-red-50 dark:bg-red-950/30 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "#F44336" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "#F44336" }}>Gap Crítico Detectado</p>
            <p className="text-xs text-muted-foreground">Verifique a sobreposição entre pólen e receptividade. Ação imediata pode ser necessária.</p>
          </div>
        </div>
      )}
      {daysSinceObs != null && daysSinceObs > 5 && (
        <div className="rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{daysSinceObs} dias sem avaliação de nicking. Durante o florescimento, avalie a cada 1-2 dias.</p>
        </div>
      )}

      {/* 4. GRÁFICO CURVAS DE FLORESCIMENTO */}
      <FloweringCurvesChart
        ref={floweringChartRef}
        observations={observations} allReadings={allReadings}
        activeParentTypes={activeParentTypes} femalePlantingDate={femalePlantingDate}
      />

      {/* 5. GRÁFICO GANTT */}
      <GanttChart
        ref={ganttChartRef}
        milestones={milestones} fixedPoints={fixedPoints}
        femalePlantingDate={femalePlantingDate} malePlantingDates={malePlantingDates}
      />

      {/* 6. MARCOS + TIMELINE */}
      <MilestonesSection milestones={milestones} fixedPoints={fixedPoints} />

      {/* 7. MAPA */}
      <FixedPointsMap fixedPoints={fixedPoints} allReadings={allReadings} observations={observations} />

      {/* 8. BOTÕES DE AÇÃO */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2" onClick={() => { fpForm.reset(); setFpGps(null); setFpPhotoFile(null); setFpDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Cadastrar Ponto Fixo
        </Button>
        <Button className="gap-2" onClick={() => { resetObsForm(); setObsDialogOpen(true); }} disabled={fixedPoints.length === 0}>
          <Plus className="h-4 w-4" /> Registrar Observação
        </Button>
        {fixedPoints.length === 0 && <p className="text-xs text-muted-foreground self-center">Cadastre pontos fixos primeiro</p>}
      </div>

      {/* PONTOS FIXOS TABLE */}
      {fixedPoints.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">📍 Pontos Fixos Cadastrados</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left">
                  <th className="p-2 font-medium text-muted-foreground text-xs">Nome</th>
                  <th className="p-2 font-medium text-muted-foreground text-xs">Tipo</th>
                  <th className="p-2 font-medium text-muted-foreground text-xs">Plantas</th>
                  <th className="p-2 font-medium text-muted-foreground text-xs">GPS</th>
                  <th className="p-2 font-medium text-muted-foreground text-xs">Referência</th>
                  <th className="p-2 font-medium text-muted-foreground text-xs">Ações</th>
                </tr></thead>
                <tbody>
                  {fixedPoints.map((fp: any) => (
                    <tr key={fp.id} className="border-b">
                      <td className="p-2 font-medium text-xs">{fp.name}</td>
                      <td className="p-2"><ParentBadge type={fp.parent_type} /></td>
                      <td className="p-2 text-xs">{fp.plants_monitored}</td>
                      <td className="p-2">
                        <a href={`https://www.google.com/maps?q=${fp.latitude},${fp.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> ✓
                        </a>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs max-w-[200px] truncate">{fp.reference_description || "—"}</td>
                      <td className="p-2"><Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteFpMutation.mutate(fp.id)}>Remover</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 9. HISTÓRICO */}
      <ObservationHistory observations={observations} allReadings={allReadings} fixedPoints={fixedPoints} />

      {/* ═══════════════════════════════════ */}
      {/* FIXED POINT DIALOG */}
      {/* ═══════════════════════════════════ */}
      <Dialog open={fpDialogOpen} onOpenChange={setFpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Ponto Fixo</DialogTitle></DialogHeader>
          <form onSubmit={fpForm.handleSubmit((v) => saveFpMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome/Identificação *</Label>
              <Input placeholder="Ex: PF-01, Ponto Norte" {...fpForm.register("name")} />
              {fpForm.formState.errors.name && <p className="text-xs text-destructive">{fpForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Parental *</Label>
              <Controller name="parent_type" control={fpForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{parentTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Plantas monitoradas</Label>
              <Input type="number" {...fpForm.register("plants_monitored")} />
            </div>
            <div className="space-y-1.5">
              <Label>GPS * <span className="text-xs text-muted-foreground">(obrigatório)</span></Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => captureGps(setFpGps)} disabled={capturingGps}>
                  <MapPin className="h-4 w-4 mr-1.5" />{capturingGps ? "Capturando..." : "Capturar GPS"}
                </Button>
                {fpGps ? <span className="text-xs text-muted-foreground">{fpGps.lat.toFixed(5)}, {fpGps.lng.toFixed(5)}</span> : <span className="text-xs text-destructive">GPS não capturado</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Referência visual</Label>
              <Input placeholder="Ex: Linha 45, torre 3 do pivô" {...fpForm.register("reference_description")} />
            </div>
            <div className="space-y-1.5">
              <Label>Foto do ponto</Label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                <Camera className="h-4 w-4" />{fpPhotoFile ? fpPhotoFile.name : "Selecionar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFpPhotoFile(e.target.files[0]); }} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setFpDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveFpMutation.isPending}>
                {saveFpMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════ */}
      {/* OBSERVATION DIALOG */}
      {/* ═══════════════════════════════════ */}
      <Dialog open={obsDialogOpen} onOpenChange={setObsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Observação de Nicking</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !obsDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{obsDate ? format(obsDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={obsDate} onSelect={setObsDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Hora *</Label>
                <Input type="time" value={obsTime} onChange={(e) => setObsTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Observador</Label>
                <Input value={user?.user_metadata?.full_name || user?.email || ""} disabled className="bg-muted" />
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="h-4 w-4" /> Condições Ambientais</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label className="text-xs">Temp. Máx (°C)</Label><Input type="number" step="0.1" value={tempMax} onChange={(e) => setTempMax(e.target.value)} placeholder="35" /></div>
                <div className="space-y-1"><Label className="text-xs">Temp. Mín (°C)</Label><Input type="number" step="0.1" value={tempMin} onChange={(e) => setTempMin(e.target.value)} placeholder="18" /></div>
                <div className="space-y-1"><Label className="text-xs">GDU Acumulado</Label><Input type="number" step="0.1" value={gduAcc} onChange={(e) => setGduAcc(e.target.value)} placeholder="850" /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Estresse Hídrico</Label>
                  <Select value={waterStress} onValueChange={setWaterStress}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{WATER_STRESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Avaliação por Ponto Fixo</p>
              {fixedPoints.map((fp: any) => {
                const isMale = fp.parent_type.startsWith("male");
                const r = pointReadings[fp.id] || {};
                const milestone = milestones.find((m: any) => m.fixed_point_id === fp.id);
                return (
                  <Card key={fp.id} style={{ borderLeftColor: PARENT_COLORS[fp.parent_type], borderLeftWidth: 4 }}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{fp.name}</span>
                        <ParentBadge type={fp.parent_type} />
                      </div>
                      {isMale ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Estádio do Pendão</Label>
                            <Select value={r.male_tassel_stage || ""} onValueChange={(v) => updatePointReading(fp.id, "male_tassel_stage", v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>{MALE_TASSEL_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">% Anteras expostas: <strong>{r.male_anthers_exposed_pct ?? 0}%</strong></Label>
                              <Slider min={0} max={100} step={5} value={[r.male_anthers_exposed_pct ?? 0]} onValueChange={([v]) => updatePointReading(fp.id, "male_anthers_exposed_pct", v)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">% Liberando pólen: <strong>{r.male_pollen_release_pct ?? 0}%</strong></Label>
                              <Slider min={0} max={100} step={5} value={[r.male_pollen_release_pct ?? 0]} onValueChange={([v]) => updatePointReading(fp.id, "male_pollen_release_pct", v)} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Intensidade de Pólen</Label>
                            <Select value={r.male_pollen_intensity || ""} onValueChange={(v) => updatePointReading(fp.id, "male_pollen_intensity", v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>{POLLEN_INTENSITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          {milestone && (
                            <p className="text-[10px] text-muted-foreground">
                              Início antese: <strong>{milestone.anthesis_start_date ? format(new Date(milestone.anthesis_start_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}50%: <strong>{milestone.anthesis_50pct_date ? format(new Date(milestone.anthesis_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}Fim: <strong>{milestone.anthesis_end_date ? format(new Date(milestone.anthesis_end_date + "T12:00:00"), "dd/MM") : "ainda não"}</strong>
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Estádio do Estigma</Label>
                            <Select value={r.female_silk_stage || ""} onValueChange={(v) => updatePointReading(fp.id, "female_silk_stage", v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>{FEMALE_SILK_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">% Estigma visível: <strong>{r.female_silk_visible_pct ?? 0}%</strong></Label>
                              <Slider min={0} max={100} step={5} value={[r.female_silk_visible_pct ?? 0]} onValueChange={([v]) => updatePointReading(fp.id, "female_silk_visible_pct", v)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">% Estigma receptivo: <strong>{r.female_silk_receptive_pct ?? 0}%</strong></Label>
                              <Slider min={0} max={100} step={5} value={[r.female_silk_receptive_pct ?? 0]} onValueChange={([v]) => updatePointReading(fp.id, "female_silk_receptive_pct", v)} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Evidência de Polinização</Label>
                            <Select value={r.female_pollination_evidence || ""} onValueChange={(v) => updatePointReading(fp.id, "female_pollination_evidence", v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                              <SelectContent>{POLLINATION_EVIDENCE.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          {milestone && (
                            <p className="text-[10px] text-muted-foreground">
                              Início emissão: <strong>{milestone.silk_start_date ? format(new Date(milestone.silk_start_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}50%: <strong>{milestone.silk_50pct_date ? format(new Date(milestone.silk_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}Fim recep.: <strong>{milestone.silk_end_date ? format(new Date(milestone.silk_end_date + "T12:00:00"), "dd/MM") : "ainda não"}</strong>
                            </p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avaliação Geral</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Status geral de sincronismo *</Label>
                  <Select value={overallSync} onValueChange={setOverallSync}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{SYNC_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Ação tomada ou recomendada</Label><Textarea rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Ex: Irrigação forçada para acelerar fêmea" /></div>
                <div className="space-y-1.5"><Label>Observações técnicas gerais</Label><Textarea rows={3} value={techNotes} onChange={(e) => setTechNotes(e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Fotos</Label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                    <Camera className="h-4 w-4" />{obsPhotos.length > 0 ? `${obsPhotos.length} foto(s)` : "Selecionar fotos"}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) setObsPhotos(Array.from(e.target.files)); }} />
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setObsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveObsMutation.mutate()} disabled={saveObsMutation.isPending}>
                {saveObsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar Observação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
