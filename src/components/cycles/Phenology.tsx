import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, MapPin, Camera, Image as ImageIcon, Satellite } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOfflineSyncContext } from "@/components/Layout";
import NdviSection from "@/components/cycles/ndvi/NdviSection";
import { Separator } from "@/components/ui/separator";

const STAGES = ["VE", "V2", "V4", "V6", "V8", "V10", "V12", "VT", "R1", "R2", "R3", "R4", "R5", "R6"] as const;

interface PhenologyProps {
  cycleId: string;
  orgId: string;
  pivotName?: string;
  contractNumber?: string | null;
  cooperatorName?: string;
  farmName?: string;
  hybridName?: string;
  pivotId?: string;
}

const schema = z.object({
  observation_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.enum(["male", "female", "both"], { required_error: "Tipo é obrigatório" }),
  stage: z.string().min(1, "Estádio é obrigatório"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function StageTimeline({ records, stages }: { records: any[]; stages: readonly string[] }) {
  const lastMaleIdx = useMemo(() => {
    const maleRecords = records.filter((r) => r.type === "male");
    if (!maleRecords.length) return -1;
    return Math.max(...maleRecords.map((r) => stages.indexOf(r.stage)));
  }, [records, stages]);

  const lastFemaleIdx = useMemo(() => {
    const femaleRecords = records.filter((r) => r.type === "female");
    if (!femaleRecords.length) return -1;
    return Math.max(...femaleRecords.map((r) => stages.indexOf(r.stage)));
  }, [records, stages]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Progresso Fenológico</p>

        {/* Male line */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 text-[10px]">Macho</Badge>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {stages.map((s, i) => {
              const isCurrent = i === lastMaleIdx;
              const isPast = i <= lastMaleIdx && lastMaleIdx >= 0;
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[40px]">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      isPast ? "bg-blue-500 border-blue-500" : "bg-muted border-muted-foreground/30",
                      isCurrent && "ring-2 ring-blue-300 ring-offset-1 w-5 h-5 dark:ring-blue-700"
                    )} />
                    <span className={cn("text-[9px] mt-1", isPast ? "text-foreground font-semibold" : "text-muted-foreground")}>{s}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className={cn("h-0.5 w-3 -mt-3", isPast && i < lastMaleIdx ? "bg-blue-500" : "bg-muted-foreground/20")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Female line */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800 text-[10px]">Fêmea</Badge>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {stages.map((s, i) => {
              const isCurrent = i === lastFemaleIdx;
              const isPast = i <= lastFemaleIdx && lastFemaleIdx >= 0;
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[40px]">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      isPast ? "bg-pink-500 border-pink-500" : "bg-muted border-muted-foreground/30",
                      isCurrent && "ring-2 ring-pink-300 ring-offset-1 w-5 h-5 dark:ring-pink-700"
                    )} />
                    <span className={cn("text-[9px] mt-1", isPast ? "text-foreground font-semibold" : "text-muted-foreground")}>{s}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className={cn("h-0.5 w-3 -mt-3", isPast && i < lastFemaleIdx ? "bg-pink-500" : "bg-muted-foreground/20")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Phenology({
  cycleId, orgId, pivotName, contractNumber, cooperatorName, farmName, hybridName, pivotId,
}: PhenologyProps) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["phenology_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("phenology_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      // Generate signed URLs for photos
      const withUrls = await Promise.all(
        (data as any[]).map(async (r) => {
          if (r.photo_url) {
            const { data: signedData } = await supabase.storage
              .from("cycle-media")
              .createSignedUrl(r.photo_url, 3600);
            return { ...r, photo_signed_url: signedData?.signedUrl };
          }
          return r;
        })
      );
      return withUrls;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: "" },
  });

  const openNew = () => {
    setEditingId(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setGps(null);
    form.reset({ observation_date: undefined, type: undefined, stage: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setPhotoFile(null);
    setPhotoPreview(r.photo_signed_url || null);
    setGps(r.latitude && r.longitude ? { lat: r.latitude, lng: r.longitude } : null);
    form.reset({
      observation_date: new Date(r.observation_date + "T12:00:00"),
      type: r.type,
      stage: r.stage,
      description: r.description || "",
    });
    setDialogOpen(true);
  };

  const captureGps = () => {
    if (!navigator.geolocation) { toast.error("GPS não suportado neste navegador"); return; }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCapturingGps(false); toast.success("GPS capturado!"); },
      (err) => { setCapturingGps(false); toast.error("Erro ao capturar GPS: " + err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      let photoPath: string | null = null;

      // Upload photo if new file selected
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const filePath = `${orgId}/${cycleId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("cycle-media")
          .upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        photoPath = filePath;
      }

      const types = values.type === "both" ? ["male", "female"] : [values.type];

      for (const t of types) {
        const row: any = {
          cycle_id: cycleId,
          org_id: orgId,
          observation_date: format(values.observation_date, "yyyy-MM-dd"),
          type: t,
          stage: values.stage,
          description: values.description || null,
          latitude: gps?.lat ?? null,
          longitude: gps?.lng ?? null,
        };
        if (photoPath) row.photo_url = photoPath;

        if (editingId && types.length === 1) {
          const update = { ...row };
          if (!photoPath) delete update.photo_url; // keep existing photo if no new one
          const { error } = await (supabase as any).from("phenology_records").update(update).eq("id", editingId);
          if (error) throw error;
        } else {
          const { error } = await addRecord("phenology_records", row, cycleId);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phenology_records", cycleId] });
      toast.success(editingId ? "Registro atualizado!" : "Estádio registrado!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "phenology_records", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phenology_records", cycleId] });
      toast.success("Registro removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Contrato: <strong className="text-foreground">{contractNumber || pivotName || "—"}</strong></span>
        <span>•</span>
        <span>Híbrido: <strong className="text-foreground">{hybridName || "—"}</strong></span>
        <span>•</span>
        <span>Cooperado: <strong className="text-foreground">{cooperatorName || "—"}</strong></span>
        <span>•</span>
        <span>Pivô: <strong className="text-foreground">{pivotName || "—"}</strong></span>
      </div>

      {/* Timeline */}
      <StageTimeline records={records} stages={STAGES} />

      {/* Add button */}
      <Button className="gap-2" onClick={openNew}>
        <Plus className="h-4 w-4" /> Registrar Estádio
      </Button>

      {/* Records list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Nenhum estádio fenológico registrado.</div>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Photo thumbnail */}
                  {r.photo_signed_url && (
                    <a href={r.photo_signed_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={r.photo_signed_url} alt="Fenologia" className="w-16 h-16 rounded-md object-cover border" />
                    </a>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {format(new Date(r.observation_date + "T12:00:00"), "dd/MM/yyyy")}
                      </span>
                      <Badge className={cn(
                        "text-xs",
                        r.stage.startsWith("R")
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      )}>
                        {r.stage}
                      </Badge>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                        r.type === "female"
                          ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      )}>
                        {r.type === "female" ? "Fêmea" : "Macho"}
                      </span>
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                    {r.latitude && r.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <MapPin className="h-3 w-3" />
                        {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Estádio" : "Registrar Estádio"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label>Data de observação *</Label>
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

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller name="type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">🟣 Fêmea</SelectItem>
                      <SelectItem value="male">🔵 Macho</SelectItem>
                      <SelectItem value="both">🔵🟣 Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
            </div>

            {/* Stage */}
            <div className="space-y-1.5">
              <Label>Estádio fenológico *</Label>
              <Controller name="stage" control={form.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecionar estádio" /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {form.formState.errors.stage && <p className="text-xs text-destructive">{form.formState.errors.stage.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} {...form.register("description")} />
            </div>

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label>Foto</Label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm hover:bg-accent">
                  <Camera className="h-4 w-4" />
                  {photoFile ? photoFile.name : "Selecionar foto"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded object-cover border" />
                )}
              </div>
            </div>

            {/* GPS */}
            <div className="space-y-1.5">
              <Label>GPS</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={captureGps} disabled={capturingGps}>
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {capturingGps ? "Capturando..." : "Capturar GPS"}
                </Button>
                {gps && (
                  <span className="text-xs text-muted-foreground">
                    {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  </span>
                )}
              </div>
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

      {/* ── NDVI Section ── */}
      <Separator className="my-8" />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Satellite className="h-5 w-5" /> 🛰️ NDVI — Monitoramento por Satélite
        </h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o desenvolvimento vegetativo do campo por imagens de satélite. O NDVI é correlacionado com os estádios fenológicos registrados acima.
        </p>
        <NdviSection
          cycleId={cycleId}
          orgId={orgId}
          pivotId={pivotId}
          pivotName={pivotName || "Campo"}
          hybridName={hybridName}
          phenologyRecords={records}
        />
      </div>
    </div>
  );
}
