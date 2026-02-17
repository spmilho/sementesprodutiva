import { useState, useMemo, useCallback } from "react";
import { Plus, Loader2, CalendarIcon, MapPin, Camera, AlertTriangle, Clock, Thermometer, Droplets, Eye } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea,
} from "recharts";

// ═══════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════

const PARENT_COLORS: Record<string, string> = {
  female: "#1E88E5",
  male_1: "#4CAF50",
  male_2: "#FF9800",
  male_3: "#7B1FA2",
};

const PARENT_LABELS: Record<string, string> = {
  female: "Fêmea",
  male_1: "Macho 1",
  male_2: "Macho 2",
  male_3: "Macho 3",
};

const PARENT_BG: Record<string, string> = {
  female: "bg-[#1E88E5]/10 text-[#1E88E5] border-[#1E88E5]/30",
  male_1: "bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30",
  male_2: "bg-[#FF9800]/10 text-[#FF9800] border-[#FF9800]/30",
  male_3: "bg-[#7B1FA2]/10 text-[#7B1FA2] border-[#7B1FA2]/30",
};

const MALE_TASSEL_STAGES = [
  { value: "vegetative", label: "Vegetativo (pré-VT)" },
  { value: "vt_visible", label: "VT — pendão visível" },
  { value: "anthesis_start", label: "Início antese" },
  { value: "anthesis_50pct", label: "50% antese" },
  { value: "anthesis_peak", label: "Pico antese" },
  { value: "anthesis_decline", label: "Declínio" },
  { value: "anthesis_end", label: "Fim emissão pólen" },
  { value: "tassel_dry", label: "Pendão seco" },
] as const;

const FEMALE_SILK_STAGES = [
  { value: "pre_silking", label: "Pré-espigamento" },
  { value: "silk_start", label: "Início emissão estigma" },
  { value: "silk_50pct", label: "50% emissão" },
  { value: "silk_full", label: "Emissão plena" },
  { value: "silk_receptive", label: "Estigma receptivo — fresco" },
  { value: "silk_browning", label: "Estigma escurecendo" },
  { value: "silk_dry", label: "Estigma seco — não receptivo" },
] as const;

const POLLEN_INTENSITY = [
  { value: "none", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const;

const POLLINATION_EVIDENCE = [
  { value: "none", label: "Sem evidência" },
  { value: "low", label: "Pouca" },
  { value: "moderate", label: "Moderada" },
  { value: "good", label: "Boa — estigmas escurecendo" },
] as const;

const WATER_STRESS_OPTIONS = [
  { value: "none", label: "Sem estresse" },
  { value: "mild", label: "Estresse leve" },
  { value: "moderate", label: "Estresse moderado" },
  { value: "severe", label: "Estresse severo" },
] as const;

const SYNC_OPTIONS = [
  { value: "perfect", label: "Perfeito ✅" },
  { value: "male_early", label: "Macho adiantado ⚠️" },
  { value: "male_late", label: "Macho atrasado ⚠️" },
  { value: "critical_gap", label: "Gap crítico 🚨" },
] as const;

// Stage numeric mapping for chart
const MALE_STAGE_NUM: Record<string, number> = {
  vegetative: 1, vt_visible: 2, anthesis_start: 3, anthesis_50pct: 4,
  anthesis_peak: 5, anthesis_decline: 6, anthesis_end: 7, tassel_dry: 8,
};
const FEMALE_STAGE_NUM: Record<string, number> = {
  pre_silking: 1, silk_start: 2, silk_50pct: 3, silk_full: 4,
  silk_receptive: 5, silk_browning: 6, silk_dry: 7,
};

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════

interface NickingProps {
  cycleId: string;
  orgId: string;
}

// ═══════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════

function SyncSemaphore({ status }: { status: string | null }) {
  const config: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
    perfect: { bg: "bg-green-100 border-green-400 dark:bg-green-900/40 dark:border-green-600", text: "text-green-800 dark:text-green-200", label: "Sincronismo Perfeito", emoji: "🟢" },
    male_early: { bg: "bg-yellow-100 border-yellow-400 dark:bg-yellow-900/40 dark:border-yellow-600", text: "text-yellow-800 dark:text-yellow-200", label: "Macho Adiantado", emoji: "🟡" },
    male_late: { bg: "bg-orange-100 border-orange-400 dark:bg-orange-900/40 dark:border-orange-600", text: "text-orange-800 dark:text-orange-200", label: "Macho Atrasado", emoji: "🟠" },
    critical_gap: { bg: "bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-600", text: "text-red-800 dark:text-red-200", label: "Gap Crítico — Ação Imediata Necessária", emoji: "🔴" },
  };
  const c = status ? config[status] : null;
  if (!c) {
    return (
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-10 text-center">
        <p className="text-5xl mb-2">⏳</p>
        <p className="text-lg text-muted-foreground font-medium">Aguardando primeira avaliação</p>
        <p className="text-xs text-muted-foreground mt-1">Cadastre pontos fixos e registre a primeira observação</p>
      </div>
    );
  }
  return (
    <div className={cn("rounded-xl border-2 p-8 text-center", c.bg)}>
      <p className="text-6xl">{c.emoji}</p>
      <p className={cn("text-2xl font-bold mt-3", c.text, status === "critical_gap" && "animate-pulse")}>{c.label}</p>
    </div>
  );
}

function ParentBadge({ type }: { type: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", PARENT_BG[type] || "")}>
      {PARENT_LABELS[type] || type}
    </span>
  );
}

function SyncBadgeSmall({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, { emoji: string; label: string; cls: string }> = {
    perfect: { emoji: "🟢", label: "Perfeito", cls: "text-green-700 dark:text-green-400" },
    male_early: { emoji: "🟡", label: "Macho adiantado", cls: "text-yellow-700 dark:text-yellow-400" },
    male_late: { emoji: "🟠", label: "Macho atrasado", cls: "text-orange-700 dark:text-orange-400" },
    critical_gap: { emoji: "🔴", label: "Gap crítico", cls: "text-red-700 dark:text-red-400" },
  };
  const c = map[status];
  if (!c) return null;
  return <span className={cn("text-sm font-semibold", c.cls)}>{c.emoji} {c.label}</span>;
}

// ═══════════════════════════════════
// FIXED POINT FORM SCHEMA
// ═══════════════════════════════════

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

export default function NickingSync({ cycleId, orgId }: NickingProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [fpDialogOpen, setFpDialogOpen] = useState(false);
  const [obsDialogOpen, setObsDialogOpen] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [fpGps, setFpGps] = useState<{ lat: number; lng: number } | null>(null);
  const [fpPhotoFile, setFpPhotoFile] = useState<File | null>(null);

  // ── Fetch planting plan to determine male count ──
  const { data: plantingPlans = [] } = useQuery({
    queryKey: ["planting_plan_males", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .eq("type", "male")
        .is("deleted_at", null)
        .order("planting_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const maleCount = Math.max(1, Math.min(3, plantingPlans.length));
  const parentTypeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 1; i <= maleCount; i++) {
      opts.push({ value: `male_${i}`, label: `Macho ${i}` });
    }
    opts.push({ value: "female", label: "Fêmea" });
    return opts;
  }, [maleCount]);

  // ── Fetch fixed points ──
  const { data: fixedPoints = [], isLoading: fpLoading } = useQuery({
    queryKey: ["nicking_fixed_points", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_fixed_points")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // ── Fetch observations ──
  const { data: observations = [], isLoading: obsLoading } = useQuery({
    queryKey: ["nicking_observations_v2", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_observations")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
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
        .from("nicking_point_readings")
        .select("*")
        .in("observation_id", observationIds);
      if (error) throw error;
      return data as any[];
    },
    enabled: observationIds.length > 0,
  });

  // ── Fetch milestones ──
  const { data: milestones = [] } = useQuery({
    queryKey: ["nicking_milestones", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_milestones")
        .select("*")
        .eq("cycle_id", cycleId);
      if (error) throw error;
      return data as any[];
    },
  });

  const latest = observations[0] || null;
  const latestStatus = latest?.overall_synchrony_status || latest?.synchrony_status || null;
  const daysSinceObs = latest ? differenceInDays(new Date(), new Date(latest.observation_date + "T12:00:00")) : null;

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
      if (!fpGps) throw new Error("GPS é obrigatório para pontos fixos.");
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
        reference_description: values.reference_description || null,
        created_by: user?.id || null,
      };
      if (photoPath) row.photo_url = photoPath;
      const { error } = await (supabase as any).from("nicking_fixed_points").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_fixed_points", cycleId] });
      toast.success("Ponto fixo cadastrado!");
      setFpDialogOpen(false);
      fpForm.reset();
      setFpGps(null);
      setFpPhotoFile(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFpMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("nicking_fixed_points").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_fixed_points", cycleId] });
      toast.success("Ponto removido!");
    },
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

  // Per-point readings state: { [fixedPointId]: { ...fields } }
  const [pointReadings, setPointReadings] = useState<Record<string, any>>({});

  const updatePointReading = (fpId: string, field: string, value: any) => {
    setPointReadings((prev) => ({ ...prev, [fpId]: { ...prev[fpId], [field]: value } }));
  };

  const resetObsForm = () => {
    setObsDate(undefined);
    setObsTime("08:00");
    setTempMax("");
    setTempMin("");
    setGduAcc("");
    setWaterStress("none");
    setOverallSync("");
    setActionTaken("");
    setTechNotes("");
    setObsPhotos([]);
    setPointReadings({});
  };

  const saveObsMutation = useMutation({
    mutationFn: async () => {
      if (!obsDate) throw new Error("Data é obrigatória");
      if (!overallSync) throw new Error("Status de sincronismo é obrigatório");

      // Upload photos
      const photoPaths: string[] = [];
      for (const file of obsPhotos) {
        const ext = file.name.split(".").pop();
        const filePath = `${orgId}/${cycleId}/nicking-${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, file);
        if (ue) throw ue;
        photoPaths.push(filePath);
      }

      // Insert observation
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
        // Keep old columns null for new-format records
        male_stage: null, female_stage: null, pollen_availability: null,
        synchrony_status: overallSync, silk_reception_pct: null,
      };

      const { data: inserted, error: obsErr } = await (supabase as any)
        .from("nicking_observations").insert(obsRow).select("id").single();
      if (obsErr) throw obsErr;
      const obsId = inserted.id;

      // Insert per-point readings
      const readingRows: any[] = [];
      for (const fp of fixedPoints) {
        const r = pointReadings[fp.id];
        if (!r) continue;
        readingRows.push({
          observation_id: obsId,
          fixed_point_id: fp.id,
          parent_type: fp.parent_type,
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

        // Check if milestone record exists
        const { data: existing } = await (supabase as any)
          .from("nicking_milestones")
          .select("*")
          .eq("cycle_id", cycleId)
          .eq("fixed_point_id", fp.id)
          .single();

        const updates: any = {};
        if (fp.parent_type.startsWith("male")) {
          if (r.male_tassel_stage === "anthesis_start" && !existing?.anthesis_start_date)
            updates.anthesis_start_date = dateStr;
          if (r.male_tassel_stage === "anthesis_50pct" && !existing?.anthesis_50pct_date)
            updates.anthesis_50pct_date = dateStr;
          if (r.male_tassel_stage === "anthesis_end" && !existing?.anthesis_end_date)
            updates.anthesis_end_date = dateStr;
        } else {
          if (r.female_silk_stage === "silk_start" && !existing?.silk_start_date)
            updates.silk_start_date = dateStr;
          if (r.female_silk_stage === "silk_50pct" && !existing?.silk_50pct_date)
            updates.silk_50pct_date = dateStr;
          if (r.female_silk_stage === "silk_browning" && !existing?.silk_end_date)
            updates.silk_end_date = dateStr;
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
      setObsDialogOpen(false);
      resetObsForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ═══════════════════════════════════
  // CHART DATA
  // ═══════════════════════════════════

  const chartData = useMemo(() => {
    if (observations.length === 0 || allReadings.length === 0) return [];
    const sorted = [...observations].reverse();
    return sorted.map((obs: any) => {
      const readings = allReadings.filter((r: any) => r.observation_id === obs.id);
      const point: any = { date: format(new Date(obs.observation_date + "T12:00:00"), "dd/MM"), status: obs.overall_synchrony_status || obs.synchrony_status };
      
      for (const r of readings) {
        const key = r.parent_type;
        if (key.startsWith("male") && r.male_tassel_stage) {
          point[key] = MALE_STAGE_NUM[r.male_tassel_stage] || 0;
        } else if (key === "female" && r.female_silk_stage) {
          point[key] = FEMALE_STAGE_NUM[r.female_silk_stage] || 0;
        }
      }
      return point;
    });
  }, [observations, allReadings]);

  const activeParentTypes = useMemo(() => {
    const types = new Set<string>();
    fixedPoints.forEach((fp: any) => types.add(fp.parent_type));
    return Array.from(types);
  }, [fixedPoints]);

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  return (
    <div className="space-y-6">
      {/* SEMÁFORO */}
      <SyncSemaphore status={latestStatus} />

      {/* DETAIL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Pontos Fixos</p>
            <p className="text-2xl font-bold text-foreground">{fixedPoints.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {fixedPoints.filter((fp: any) => fp.parent_type.startsWith("male")).length} macho · {fixedPoints.filter((fp: any) => fp.parent_type === "female").length} fêmea
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-2xl font-bold text-foreground">{observations.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">GDU Acumulado</p>
            <p className="text-2xl font-bold text-foreground">{latest?.gdu_accumulated ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className={cn(daysSinceObs != null && daysSinceObs > 3 ? "border-[#F44336]/50" : "")}>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Última Observação</p>
            {latest ? (
              <>
                <p className="text-sm font-medium text-foreground">{format(new Date(latest.observation_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                {daysSinceObs != null && daysSinceObs > 3 && (
                  <p className="text-xs font-medium flex items-center gap-1" style={{ color: "#F44336" }}>
                    <AlertTriangle className="h-3 w-3" /> {daysSinceObs} dias sem avaliação
                  </p>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pontos">Pontos Fixos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ── */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => { resetObsForm(); setObsDialogOpen(true); }} disabled={fixedPoints.length === 0}>
              <Plus className="h-4 w-4" /> Registrar Observação
            </Button>
            {fixedPoints.length === 0 && (
              <p className="text-xs text-muted-foreground self-center">Cadastre pontos fixos primeiro</p>
            )}
          </div>

          {/* TIMELINE CHART */}
          {chartData.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground mb-4">Timeline de Sincronismo</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 8]} className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {/* Ideal overlap zone: male peak (5) + female receptive (4-5) */}
                    <ReferenceArea y1={3} y2={6} fill="rgba(76, 175, 80, 0.1)" />
                    {activeParentTypes.map((t) => (
                      <Line
                        key={t}
                        type="monotone"
                        dataKey={t}
                        name={PARENT_LABELS[t]}
                        stroke={PARENT_COLORS[t]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: PARENT_COLORS[t] }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground text-center mt-1">Zona verde: faixa ideal de sobreposição</p>
              </CardContent>
            </Card>
          )}

          {/* MILESTONES SUMMARY */}
          {milestones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Marcos Fenológicos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid gap-3">
                  {fixedPoints.map((fp: any) => {
                    const m = milestones.find((ms: any) => ms.fixed_point_id === fp.id);
                    if (!m) return null;
                    const isMale = fp.parent_type.startsWith("male");
                    return (
                      <div key={fp.id} className="flex items-center gap-3 text-xs">
                        <ParentBadge type={fp.parent_type} />
                        <span className="font-medium">{fp.name}</span>
                        <span className="text-muted-foreground">—</span>
                        {isMale ? (
                          <>
                            <span>Início antese: <strong>{m.anthesis_start_date ? format(new Date(m.anthesis_start_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                            <span>50%: <strong>{m.anthesis_50pct_date ? format(new Date(m.anthesis_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                            <span>Fim: <strong>{m.anthesis_end_date ? format(new Date(m.anthesis_end_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                          </>
                        ) : (
                          <>
                            <span>Início emissão: <strong>{m.silk_start_date ? format(new Date(m.silk_start_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                            <span>50%: <strong>{m.silk_50pct_date ? format(new Date(m.silk_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                            <span>Fim recep.: <strong>{m.silk_end_date ? format(new Date(m.silk_end_date + "T12:00:00"), "dd/MM") : "—"}</strong></span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── PONTOS FIXOS TAB ── */}
        <TabsContent value="pontos" className="space-y-4">
          <Button className="gap-2" onClick={() => { fpForm.reset(); setFpGps(null); setFpPhotoFile(null); setFpDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Cadastrar Ponto Fixo
          </Button>

          {fpLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : fixedPoints.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhum ponto fixo cadastrado. Cadastre pontos para iniciar o monitoramento.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium text-muted-foreground">Nome</th>
                    <th className="p-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="p-2 font-medium text-muted-foreground">Plantas</th>
                    <th className="p-2 font-medium text-muted-foreground">GPS</th>
                    <th className="p-2 font-medium text-muted-foreground">Referência</th>
                    <th className="p-2 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedPoints.map((fp: any) => (
                    <tr key={fp.id} className="border-b">
                      <td className="p-2 font-medium">{fp.name}</td>
                      <td className="p-2"><ParentBadge type={fp.parent_type} /></td>
                      <td className="p-2">{fp.plants_monitored}</td>
                      <td className="p-2">
                        <a href={`https://www.google.com/maps?q=${fp.latitude},${fp.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <MapPin className="h-3 w-3" /> ✓
                        </a>
                      </td>
                      <td className="p-2 text-muted-foreground text-xs max-w-[200px] truncate">{fp.reference_description || "—"}</td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteFpMutation.mutate(fp.id)}>
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── HISTÓRICO TAB ── */}
        <TabsContent value="historico" className="space-y-4">
          {obsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : observations.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhuma observação registrada.</div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs: any) => {
                const obsReadings = allReadings.filter((r: any) => r.observation_id === obs.id);
                const status = obs.overall_synchrony_status || obs.synchrony_status;
                return (
                  <Card key={obs.id} className={cn(
                    "border",
                    status === "critical_gap" && "border-[#F44336]/40",
                    status === "perfect" && "border-[#4CAF50]/40"
                  )}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {format(new Date(obs.observation_date + "T12:00:00"), "dd/MM/yyyy")}
                          </span>
                          {obs.observation_time && <span className="text-xs text-muted-foreground">{obs.observation_time}</span>}
                          <SyncBadgeSmall status={status} />
                        </div>
                        {obs.observer_name && <span className="text-xs text-muted-foreground">{obs.observer_name}</span>}
                      </div>

                      {/* Environmental */}
                      {(obs.temp_max_c || obs.gdu_accumulated) && (
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {obs.temp_max_c && <span><Thermometer className="h-3 w-3 inline mr-0.5" />{obs.temp_min_c}° – {obs.temp_max_c}°C</span>}
                          {obs.gdu_accumulated && <span>GDU: {obs.gdu_accumulated}</span>}
                          {obs.water_stress && obs.water_stress !== "none" && (
                            <span className="text-amber-600"><Droplets className="h-3 w-3 inline mr-0.5" />
                              {WATER_STRESS_OPTIONS.find(w => w.value === obs.water_stress)?.label}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Per-point readings */}
                      {obsReadings.length > 0 && (
                        <div className="grid gap-2">
                          {obsReadings.map((r: any) => {
                            const fp = fixedPoints.find((f: any) => f.id === r.fixed_point_id);
                            const isMale = r.parent_type.startsWith("male");
                            return (
                              <div key={r.id} className="flex flex-wrap items-center gap-2 text-xs bg-muted/50 rounded-md px-3 py-1.5">
                                <ParentBadge type={r.parent_type} />
                                <span className="font-medium">{fp?.name || "—"}</span>
                                {isMale ? (
                                  <>
                                    {r.male_tassel_stage && <span>Estádio: {MALE_TASSEL_STAGES.find(s => s.value === r.male_tassel_stage)?.label}</span>}
                                    {r.male_anthers_exposed_pct != null && <span>Anteras: {r.male_anthers_exposed_pct}%</span>}
                                    {r.male_pollen_release_pct != null && <span>Pólen: {r.male_pollen_release_pct}%</span>}
                                    {r.male_pollen_intensity && <span>Int.: {POLLEN_INTENSITY.find(p => p.value === r.male_pollen_intensity)?.label}</span>}
                                  </>
                                ) : (
                                  <>
                                    {r.female_silk_stage && <span>Estádio: {FEMALE_SILK_STAGES.find(s => s.value === r.female_silk_stage)?.label}</span>}
                                    {r.female_silk_visible_pct != null && <span>Estigma visível: {r.female_silk_visible_pct}%</span>}
                                    {r.female_silk_receptive_pct != null && <span>Receptivo: {r.female_silk_receptive_pct}%</span>}
                                    {r.female_pollination_evidence && <span>Poliniz.: {POLLINATION_EVIDENCE.find(p => p.value === r.female_pollination_evidence)?.label}</span>}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {obs.action_taken && <p className="text-xs text-muted-foreground">Ação: <span className="text-foreground">{obs.action_taken}</span></p>}
                      {obs.technical_notes && <p className="text-xs text-muted-foreground">{obs.technical_notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
                  <SelectContent>
                    {parentTypeOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
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
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {capturingGps ? "Capturando..." : "Capturar GPS"}
                </Button>
                {fpGps ? (
                  <span className="text-xs text-muted-foreground">{fpGps.lat.toFixed(5)}, {fpGps.lng.toFixed(5)}</span>
                ) : (
                  <span className="text-xs text-destructive">GPS não capturado</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Referência visual</Label>
              <Input placeholder="Ex: Linha 45, torre 3 do pivô" {...fpForm.register("reference_description")} />
            </div>

            <div className="space-y-1.5">
              <Label>Foto do ponto</Label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                <Camera className="h-4 w-4" />
                {fpPhotoFile ? fpPhotoFile.name : "Selecionar foto"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFpPhotoFile(e.target.files[0]); }} />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setFpDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveFpMutation.isPending}>
                {saveFpMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
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
            {/* Date + Time + Observer */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !obsDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {obsDate ? format(obsDate, "dd/MM/yyyy") : "Selecionar"}
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

            {/* Environmental Conditions */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="h-4 w-4" /> Condições Ambientais</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Temp. Máx (°C)</Label>
                  <Input type="number" step="0.1" value={tempMax} onChange={(e) => setTempMax(e.target.value)} placeholder="35" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Temp. Mín (°C)</Label>
                  <Input type="number" step="0.1" value={tempMin} onChange={(e) => setTempMin(e.target.value)} placeholder="18" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">GDU Acumulado</Label>
                  <Input type="number" step="0.1" value={gduAcc} onChange={(e) => setGduAcc(e.target.value)} placeholder="850" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estresse Hídrico</Label>
                  <Select value={waterStress} onValueChange={setWaterStress}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WATER_STRESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Per-point readings */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Avaliação por Ponto Fixo</p>
              {fixedPoints.map((fp: any) => {
                const isMale = fp.parent_type.startsWith("male");
                const r = pointReadings[fp.id] || {};
                const milestone = milestones.find((m: any) => m.fixed_point_id === fp.id);
                return (
                  <Card key={fp.id} className="border" style={{ borderLeftColor: PARENT_COLORS[fp.parent_type], borderLeftWidth: 4 }}>
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
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar estádio" /></SelectTrigger>
                              <SelectContent>
                                {MALE_TASSEL_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
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
                              <SelectContent>
                                {POLLEN_INTENSITY.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Milestones */}
                          {milestone && (
                            <p className="text-[10px] text-muted-foreground">
                              Início antese: <strong>{milestone.anthesis_start_date ? format(new Date(milestone.anthesis_start_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}50%: <strong>{milestone.anthesis_50pct_date ? format(new Date(milestone.anthesis_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}Fim: <strong>{milestone.anthesis_end_date ? format(new Date(milestone.anthesis_end_date + "T12:00:00"), "dd/MM") : "ainda não registrado"}</strong>
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Estádio do Estigma</Label>
                            <Select value={r.female_silk_stage || ""} onValueChange={(v) => updatePointReading(fp.id, "female_silk_stage", v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar estádio" /></SelectTrigger>
                              <SelectContent>
                                {FEMALE_SILK_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
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
                              <SelectContent>
                                {POLLINATION_EVIDENCE.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Milestones */}
                          {milestone && (
                            <p className="text-[10px] text-muted-foreground">
                              Início emissão: <strong>{milestone.silk_start_date ? format(new Date(milestone.silk_start_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}50%: <strong>{milestone.silk_50pct_date ? format(new Date(milestone.silk_50pct_date + "T12:00:00"), "dd/MM") : "—"}</strong>
                              {" | "}Fim recep.: <strong>{milestone.silk_end_date ? format(new Date(milestone.silk_end_date + "T12:00:00"), "dd/MM") : "ainda não registrado"}</strong>
                            </p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Overall assessment */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Avaliação Geral</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Status geral de sincronismo *</Label>
                  <Select value={overallSync} onValueChange={setOverallSync}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {SYNC_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Ação tomada ou recomendada</Label>
                  <Textarea rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Ex: Irrigação forçada para acelerar fêmea" />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações técnicas gerais</Label>
                  <Textarea rows={3} value={techNotes} onChange={(e) => setTechNotes(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fotos</Label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                    <Camera className="h-4 w-4" />
                    {obsPhotos.length > 0 ? `${obsPhotos.length} foto(s)` : "Selecionar fotos"}
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) setObsPhotos(Array.from(e.target.files)); }} />
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setObsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveObsMutation.mutate()} disabled={saveObsMutation.isPending}>
                {saveObsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Observação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
