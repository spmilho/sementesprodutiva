import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, MapPin, Camera, AlertTriangle } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea,
} from "recharts";

const MALE_STAGES = ["Pré-VT", "VT", "Início liberação pólen", "Pico liberação", "Final liberação"] as const;
const FEMALE_STAGES = ["Pré-R1", "Início emissão estigma", "Plena emissão", "Final emissão"] as const;
const POLLEN_OPTIONS = ["Nenhuma", "Baixa", "Adequada", "Alta"] as const;
const SYNC_OPTIONS = [
  { value: "perfect", label: "Perfeito" },
  { value: "male_early", label: "Macho adiantado" },
  { value: "male_late", label: "Macho atrasado" },
  { value: "critical_gap", label: "Gap crítico" },
] as const;

const maleStageNum: Record<string, number> = { "Pré-VT": 1, "VT": 2, "Início liberação pólen": 3, "Pico liberação": 4, "Final liberação": 5 };
const femaleStageNum: Record<string, number> = { "Pré-R1": 1, "Início emissão estigma": 2, "Plena emissão": 3, "Final emissão": 4 };

interface NickingProps {
  cycleId: string;
  orgId: string;
}

const schema = z.object({
  observation_date: z.date({ required_error: "Data é obrigatória" }),
  male_stage: z.string().min(1, "Obrigatório"),
  female_stage: z.string().min(1, "Obrigatório"),
  silk_reception_pct: z.coerce.number().min(0).max(100),
  pollen_availability: z.string().min(1, "Obrigatório"),
  synchrony_status: z.string().min(1, "Obrigatório"),
  action_taken: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function SyncSemaphore({ status, size = "lg" }: { status: string | null; size?: "lg" | "sm" }) {
  const config: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
    perfect: { bg: "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700", text: "text-green-800 dark:text-green-300", label: "Sincronismo Perfeito", emoji: "🟢" },
    male_early: { bg: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700", text: "text-yellow-800 dark:text-yellow-300", label: "Macho Adiantado", emoji: "🟡" },
    male_late: { bg: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700", text: "text-orange-800 dark:text-orange-300", label: "Macho Atrasado", emoji: "🟠" },
    critical_gap: { bg: "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700", text: "text-red-800 dark:text-red-300", label: "Gap Crítico — Ação Imediata Necessária", emoji: "🔴" },
  };
  const c = status ? config[status] : null;
  if (!c) {
    if (size === "sm") return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 text-center">
        <p className="text-lg text-muted-foreground">Aguardando primeira avaliação</p>
      </div>
    );
  }
  if (size === "sm") return <span className={cn("text-sm font-semibold", c.text)}>{c.emoji} {c.label}</span>;
  return (
    <div className={cn("rounded-xl border-2 p-6 text-center", c.bg)}>
      <p className={cn("text-4xl font-bold", c.text)}>{c.emoji}</p>
      <p className={cn("text-xl font-bold mt-2", c.text, status === "critical_gap" && "animate-pulse")}>{c.label}</p>
    </div>
  );
}

function PollenBadge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    Nenhuma: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Baixa: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Adequada: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    Alta: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  };
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colors[value] || "")}>{value}</span>;
}

export default function NickingSync({ cycleId, orgId }: NickingProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["nicking_observations", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nicking_observations")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      const withUrls = await Promise.all(
        (data as any[]).map(async (r) => {
          if (r.photo_url) {
            const { data: sd } = await supabase.storage.from("cycle-media").createSignedUrl(r.photo_url, 3600);
            return { ...r, photo_signed_url: sd?.signedUrl };
          }
          return r;
        })
      );
      return withUrls;
    },
  });

  const latest = records[0] || null;
  const daysSinceObs = latest ? differenceInDays(new Date(), new Date(latest.observation_date + "T12:00:00")) : null;

  // Chart data (chronological)
  const chartData = useMemo(() => {
    return [...records].reverse().map((r: any) => ({
      date: format(new Date(r.observation_date + "T12:00:00"), "dd/MM"),
      macho: maleStageNum[r.male_stage] ?? 0,
      femea: femaleStageNum[r.female_stage] ?? 0,
      status: r.synchrony_status,
    }));
  }, [records]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { silk_reception_pct: 0, action_taken: "", observations: "" },
  });

  const openNew = () => {
    setEditingId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setGps(null);
    form.reset({ observation_date: undefined, male_stage: "", female_stage: "", silk_reception_pct: 0, pollen_availability: "", synchrony_status: "", action_taken: "", observations: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setPhotoFile(null);
    setPhotoPreview(r.photo_signed_url || null);
    setGps({ lat: r.latitude, lng: r.longitude });
    form.reset({
      observation_date: new Date(r.observation_date + "T12:00:00"),
      male_stage: r.male_stage,
      female_stage: r.female_stage,
      silk_reception_pct: r.silk_reception_pct,
      pollen_availability: r.pollen_availability,
      synchrony_status: r.synchrony_status,
      action_taken: r.action_taken || "",
      observations: r.observations || "",
    });
    setDialogOpen(true);
  };

  const captureGps = () => {
    if (!navigator.geolocation) { toast.error("GPS não suportado"); return; }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCapturingGps(false); toast.success("GPS capturado!"); },
      (err) => { setCapturingGps(false); toast.error("Erro GPS: " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!gps) throw new Error("GPS é obrigatório para observações de Nicking. Capture o GPS antes de salvar.");

      let photoPath: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const filePath = `${orgId}/${cycleId}/nicking-${crypto.randomUUID()}.${ext}`;
        const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, photoFile);
        if (ue) throw ue;
        photoPath = filePath;
      }

      const row: any = {
        cycle_id: cycleId,
        org_id: orgId,
        observation_date: format(values.observation_date, "yyyy-MM-dd"),
        male_stage: values.male_stage,
        female_stage: values.female_stage,
        silk_reception_pct: values.silk_reception_pct,
        pollen_availability: values.pollen_availability,
        synchrony_status: values.synchrony_status,
        action_taken: values.action_taken || null,
        latitude: gps.lat,
        longitude: gps.lng,
        observations: values.observations || null,
      };
      if (photoPath) row.photo_url = photoPath;

      if (editingId) {
        const update = { ...row };
        if (!photoPath) delete update.photo_url;
        const { error } = await (supabase as any).from("nicking_observations").update(update).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("nicking_observations").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_observations", cycleId] });
      toast.success(editingId ? "Observação atualizada!" : "Observação registrada!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("nicking_observations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nicking_observations", cycleId] });
      toast.success("Observação removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Main Semaphore */}
      <SyncSemaphore status={latest?.synchrony_status} />

      {/* Detail Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Estádio Macho</p>
            {latest ? (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">{latest.male_stage}</Badge>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Estádio Fêmea</p>
            {latest ? (
              <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 text-xs">{latest.female_stage}</Badge>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Recepção Estigma</p>
            {latest ? (
              <p className="text-lg font-bold text-foreground">{latest.silk_reception_pct}%</p>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Disponibilidade Pólen</p>
            {latest ? <PollenBadge value={latest.pollen_availability} /> : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>

        <Card className={cn(daysSinceObs != null && daysSinceObs > 3 ? "border-amber-400 dark:border-amber-600" : "")}>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Última Observação</p>
            {latest ? (
              <>
                <p className="text-sm font-medium text-foreground">{format(new Date(latest.observation_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                {daysSinceObs != null && daysSinceObs > 3 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {daysSinceObs} dias sem avaliação
                  </p>
                )}
              </>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      <Button className="gap-2" onClick={openNew}>
        <Plus className="h-4 w-4" /> Nova Observação de Nicking
      </Button>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-4">Timeline de Sincronismo</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 5]} className="text-xs" ticks={[1, 2, 3, 4, 5]} />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Macho") {
                      const labels = ["", "Pré-VT", "VT", "Início lib.", "Pico lib.", "Final lib."];
                      return [labels[value] || value, name];
                    }
                    const labels = ["", "Pré-R1", "Início estigma", "Plena emissão", "Final emissão"];
                    return [labels[value] || value, name];
                  }}
                />
                <Legend />
                {/* Ideal overlap zone */}
                <ReferenceArea y1={3} y2={4} fill="hsl(142 76% 36% / 0.1)" />
                <Line type="monotone" dataKey="macho" name="Macho" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="femea" name="Fêmea" stroke="#ec4899" strokeWidth={2} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Zona verde: faixa ideal de sobreposição (pico pólen + plena emissão estigma)</p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Nenhuma observação de nicking registrada.</div>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => (
            <Card key={r.id} className={cn(
              "border",
              r.synchrony_status === "critical_gap" && "border-red-300 dark:border-red-700",
              r.synchrony_status === "perfect" && "border-green-200 dark:border-green-800"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {r.photo_signed_url && (
                    <a href={r.photo_signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={r.photo_signed_url} alt="Nicking" className="w-16 h-16 rounded-md object-cover border" />
                    </a>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(r.observation_date + "T12:00:00"), "dd/MM/yyyy")}
                      </span>
                      <SyncSemaphore status={r.synchrony_status} size="sm" />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="text-muted-foreground">Macho: <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] ml-1">{r.male_stage}</Badge></span>
                      <span className="text-muted-foreground">Fêmea: <Badge variant="outline" className="bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 text-[10px] ml-1">{r.female_stage}</Badge></span>
                      <span className="text-muted-foreground">Pólen: <PollenBadge value={r.pollen_availability} /></span>
                      <span className="text-muted-foreground">Recepção: <strong className="text-foreground">{r.silk_reception_pct}%</strong></span>
                    </div>
                    {r.action_taken && <p className="text-xs text-muted-foreground">Ação: <span className="text-foreground">{r.action_taken}</span></p>}
                    {r.observations && <p className="text-xs text-muted-foreground">{r.observations}</p>}
                    {r.latitude && r.longitude && (
                      <a href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <MapPin className="h-3 w-3" /> {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Observação" : "Nova Observação de Nicking"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Controller name="observation_date" control={form.control} render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              )} />
              {form.formState.errors.observation_date && <p className="text-xs text-destructive">{form.formState.errors.observation_date.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Estádio Macho *</Label>
                <Controller name="male_stage" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {MALE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Estádio Fêmea *</Label>
                <Controller name="female_stage" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {FEMALE_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            {/* Silk reception slider */}
            <div className="space-y-1.5">
              <Label>% Espigas com estigma receptivo: <strong>{form.watch("silk_reception_pct")}%</strong></Label>
              <Controller name="silk_reception_pct" control={form.control} render={({ field }) => (
                <Slider min={0} max={100} step={1} value={[field.value]} onValueChange={([v]) => field.onChange(v)} className="py-2" />
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Disponibilidade de pólen *</Label>
                <Controller name="pollen_availability" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {POLLEN_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Status de sincronismo *</Label>
                <Controller name="synchrony_status" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {SYNC_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ação tomada</Label>
              <Textarea rows={2} placeholder="Ex: Irrigação forçada para acelerar fêmea" {...form.register("action_taken")} />
            </div>

            {/* Photo */}
            <div className="space-y-1.5">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                  <Camera className="h-4 w-4" />
                  {photoFile ? photoFile.name : "Selecionar foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                {photoPreview && <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded object-cover border" />}
              </div>
            </div>

            {/* GPS (required) */}
            <div className="space-y-1.5">
              <Label>GPS * <span className="text-xs text-muted-foreground">(obrigatório para nicking)</span></Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={captureGps} disabled={capturingGps}>
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {capturingGps ? "Capturando..." : "Capturar GPS"}
                </Button>
                {gps ? (
                  <span className="text-xs text-muted-foreground">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>
                ) : (
                  <span className="text-xs text-destructive">GPS não capturado</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações gerais</Label>
              <Textarea rows={2} {...form.register("observations")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
