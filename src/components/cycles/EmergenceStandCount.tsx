import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";

interface EmergenceProps {
  cycleId: string;
  orgId: string;
}

const schema = z.object({
  count_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.enum(["male", "female"], { required_error: "Tipo é obrigatório" }),
  sample_point: z.string().min(1, "Identificação do ponto é obrigatória"),
  line_length: z.coerce.number().positive("Deve ser > 0").default(10),
  plant_count: z.coerce.number().int().nonnegative("Deve ser >= 0"),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function getColor(pct: number) {
  if (pct >= 90) return "text-green-600 dark:text-green-400";
  if (pct >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getBgColor(pct: number) {
  if (pct >= 90) return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
  if (pct >= 80) return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
  return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
}

function getEvaluation(pct: number) {
  if (pct >= 95) return { label: "Excelente", emoji: "🟢" };
  if (pct >= 90) return { label: "Bom", emoji: "🟢" };
  if (pct >= 80) return { label: "Regular", emoji: "🟡" };
  return { label: "Ruim", emoji: "🔴" };
}

function getBarFill(pct: number, type: string) {
  if (type === "female") {
    if (pct >= 90) return "#ec4899";
    if (pct >= 80) return "#f59e0b";
    return "#ef4444";
  }
  if (pct >= 90) return "#3b82f6";
  if (pct >= 80) return "#f59e0b";
  return "#ef4444";
}

export default function EmergenceStandCount({ cycleId, orgId }: EmergenceProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [capturingGps, setCapturingGps] = useState(false);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch planting plans for target population & spacing
  const { data: plans = [] } = useQuery({
    queryKey: ["planting_plan", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      if (error) throw error;
      return data as any[];
    },
  });

  const femaleTarget = useMemo(() => {
    const fp = plans.filter((p: any) => p.type === "female");
    return fp.length ? Math.round(fp.reduce((s: number, p: any) => s + p.target_population, 0) / fp.length) : 62000;
  }, [plans]);

  const maleTarget = useMemo(() => {
    const mp = plans.filter((p: any) => p.type === "male");
    return mp.length ? Math.round(mp.reduce((s: number, p: any) => s + p.target_population, 0) / mp.length) : 55000;
  }, [plans]);

  const femaleSpacing = useMemo(() => {
    const fp = plans.filter((p: any) => p.type === "female");
    return fp.length ? Math.round(fp.reduce((s: number, p: any) => s + p.row_spacing, 0) / fp.length) : 70;
  }, [plans]);

  const maleSpacing = useMemo(() => {
    const mp = plans.filter((p: any) => p.type === "male");
    return mp.length ? Math.round(mp.reduce((s: number, p: any) => s + p.row_spacing, 0) / mp.length) : 70;
  }, [plans]);

  // Fetch emergence counts
  const { data: counts = [], isLoading } = useQuery({
    queryKey: ["emergence_counts", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("emergence_counts")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("count_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Summary calculations
  const femaleCounts = useMemo(() => counts.filter((c: any) => c.type === "female"), [counts]);
  const maleCounts = useMemo(() => counts.filter((c: any) => c.type === "male"), [counts]);
  const avgFemaleStand = useMemo(() => femaleCounts.length ? femaleCounts.reduce((s: number, c: any) => s + c.plants_per_ha, 0) / femaleCounts.length : 0, [femaleCounts]);
  const avgMaleStand = useMemo(() => maleCounts.length ? maleCounts.reduce((s: number, c: any) => s + c.plants_per_ha, 0) / maleCounts.length : 0, [maleCounts]);
  const femalePctMeta = femaleTarget ? (avgFemaleStand / femaleTarget) * 100 : 0;
  const malePctMeta = maleTarget ? (avgMaleStand / maleTarget) * 100 : 0;
  const overallPct = counts.length ? counts.reduce((s: number, c: any) => s + c.emergence_pct, 0) / counts.length : 0;
  const evaluation = getEvaluation(overallPct);

  // Chart data
  const chartData = useMemo(() => {
    return [...counts].reverse().map((c: any) => ({
      name: `${c.sample_point} (${c.type === "female" ? "F" : "M"})`,
      pct: Math.round(c.emergence_pct * 10) / 10,
      type: c.type,
    }));
  }, [counts]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { line_length: 10, observations: "" },
  });

  const watchType = form.watch("type");
  const watchPlantCount = form.watch("plant_count");
  const watchLineLength = form.watch("line_length");

  const currentSpacing = watchType === "male" ? maleSpacing : femaleSpacing;
  const currentTarget = watchType === "male" ? maleTarget : femaleTarget;
  const plantsPerMeter = watchLineLength > 0 && watchPlantCount >= 0 ? Math.round((watchPlantCount / watchLineLength) * 100) / 100 : 0;
  const plantsPerHa = plantsPerMeter > 0 && currentSpacing > 0 ? Math.round(plantsPerMeter * (10000 / (currentSpacing / 100))) : 0;
  const emergencePct = currentTarget > 0 && plantsPerHa > 0 ? Math.round((plantsPerHa / currentTarget) * 10000) / 100 : 0;

  const openNew = () => {
    setEditingId(null);
    setGps(null);
    form.reset({ count_date: undefined, type: undefined, sample_point: "", line_length: 10, plant_count: undefined as any, observations: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setGps(c.latitude && c.longitude ? { lat: c.latitude, lng: c.longitude } : null);
    form.reset({
      count_date: new Date(c.count_date + "T12:00:00"),
      type: c.type,
      sample_point: c.sample_point,
      line_length: c.line_length,
      plant_count: c.plant_count,
      observations: c.observations || "",
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

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const spacing = values.type === "male" ? maleSpacing : femaleSpacing;
      const target = values.type === "male" ? maleTarget : femaleTarget;
      const ppm = Math.round((values.plant_count / values.line_length) * 100) / 100;
      const ppha = Math.round(ppm * (10000 / (spacing / 100)));
      const epct = target > 0 ? Math.round((ppha / target) * 10000) / 100 : 0;

      const row: any = {
        cycle_id: cycleId,
        org_id: orgId,
        count_date: format(values.count_date, "yyyy-MM-dd"),
        type: values.type,
        sample_point: values.sample_point,
        line_length: values.line_length,
        plant_count: values.plant_count,
        plants_per_meter: ppm,
        plants_per_ha: ppha,
        emergence_pct: epct,
        row_spacing: spacing,
        target_population: target,
        latitude: gps?.lat ?? null,
        longitude: gps?.lng ?? null,
        observations: values.observations || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("emergence_counts").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("emergence_counts").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergence_counts", cycleId] });
      toast.success(editingId ? "Contagem atualizada!" : "Contagem registrada!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("emergence_counts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergence_counts", cycleId] });
      toast.success("Contagem removida!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={cn("border", femaleCounts.length > 0 ? getBgColor(femalePctMeta) : "")}>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Stand Médio Fêmea</p>
            <p className="text-lg font-bold text-foreground">{avgFemaleStand > 0 ? avgFemaleStand.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"} <span className="text-xs font-normal">pl/ha</span></p>
            <p className="text-xs text-muted-foreground">Meta: {femaleTarget.toLocaleString("pt-BR")} pl/ha</p>
            {femaleCounts.length > 0 && <p className={cn("text-sm font-semibold", getColor(femalePctMeta))}>{femalePctMeta.toFixed(1)}% da meta</p>}
          </CardContent>
        </Card>

        <Card className={cn("border", maleCounts.length > 0 ? getBgColor(malePctMeta) : "")}>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Stand Médio Macho</p>
            <p className="text-lg font-bold text-foreground">{avgMaleStand > 0 ? avgMaleStand.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : "—"} <span className="text-xs font-normal">pl/ha</span></p>
            <p className="text-xs text-muted-foreground">Meta: {maleTarget.toLocaleString("pt-BR")} pl/ha</p>
            {maleCounts.length > 0 && <p className={cn("text-sm font-semibold", getColor(malePctMeta))}>{malePctMeta.toFixed(1)}% da meta</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Total de Amostras</p>
            <p className="text-2xl font-bold text-foreground">{counts.length}</p>
            <p className="text-xs text-muted-foreground">{femaleCounts.length} fêmea • {maleCounts.length} macho</p>
          </CardContent>
        </Card>

        <Card className={cn("border", counts.length > 0 ? getBgColor(overallPct) : "")}>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Avaliação Geral</p>
            {counts.length > 0 ? (
              <>
                <p className="text-lg font-bold text-foreground">{evaluation.emoji} {evaluation.label}</p>
                <p className={cn("text-sm font-semibold", getColor(overallPct))}>{overallPct.toFixed(1)}% emergência média</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      <Button className="gap-2" onClick={openNew}>
        <Plus className="h-4 w-4" /> Nova Contagem
      </Button>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : counts.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhuma contagem registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Ponto</TableHead>
                    <TableHead className="text-xs text-right">Comp. (m)</TableHead>
                    <TableHead className="text-xs text-right">Plantas</TableHead>
                    <TableHead className="text-xs text-right">Pl/metro</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">Pl/ha</TableHead>
                    <TableHead className="text-xs text-right">% Emerg.</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">GPS</TableHead>
                    <TableHead className="text-xs text-center w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {counts.map((c: any) => (
                    <TableRow key={c.id} className={cn(c.emergence_pct < 80 && "bg-red-50/50 dark:bg-red-900/10")}>
                      <TableCell className="text-sm">{format(new Date(c.count_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                          c.type === "female"
                            ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          {c.type === "female" ? "Fêmea" : "Macho"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{c.sample_point}</TableCell>
                      <TableCell className="text-right text-sm">{c.line_length}</TableCell>
                      <TableCell className="text-right text-sm">{c.plant_count}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{c.plants_per_meter}</TableCell>
                      <TableCell className="text-right text-sm hidden md:table-cell">{c.plants_per_ha.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className={cn("text-right text-sm font-semibold", getColor(c.emergence_pct))}>{c.emergence_pct.toFixed(1)}%</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {c.latitude && c.longitude ? (
                          <a href={`https://www.google.com/maps?q=${c.latitude},${c.longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-4">% Emergência por Ponto de Amostragem</p>
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 120]} className="text-xs" tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={160} className="text-xs" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <ReferenceLine x={90} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label={{ value: "90%", position: "top", className: "text-xs fill-muted-foreground" }} />
                <Bar dataKey="pct" name="% Emergência" barSize={18}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={getBarFill(entry.pct, entry.type)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Contagem" : "Nova Contagem"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data da contagem *</Label>
                <Controller name="count_date" control={form.control} render={({ field }) => (
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
                {form.formState.errors.count_date && <p className="text-xs text-destructive">{form.formState.errors.count_date.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller name="type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">🟣 Fêmea</SelectItem>
                      <SelectItem value="male">🔵 Macho</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Ponto de amostragem *</Label>
              <Input placeholder="Ex: Ponto 1 - Entrada Norte" {...form.register("sample_point")} />
              {form.formState.errors.sample_point && <p className="text-xs text-destructive">{form.formState.errors.sample_point.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Comprimento da linha (m) *</Label>
                <Input type="number" step="0.1" {...form.register("line_length")} />
                {form.formState.errors.line_length && <p className="text-xs text-destructive">{form.formState.errors.line_length.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Plantas contadas *</Label>
                <Input type="number" {...form.register("plant_count")} />
                {form.formState.errors.plant_count && <p className="text-xs text-destructive">{form.formState.errors.plant_count.message}</p>}
              </div>
            </div>

            {/* Calculated fields */}
            {watchType && watchPlantCount > 0 && watchLineLength > 0 && (
              <div className="rounded-md border p-3 space-y-1 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plantas/metro:</span>
                  <span className="font-mono font-medium">{plantsPerMeter}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plantas/ha:</span>
                  <span className="font-mono font-medium">{plantsPerHa.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">% Emergência:</span>
                  <span className={cn("font-semibold", getColor(emergencePct))}>{emergencePct.toFixed(1)}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Espaçamento: {currentSpacing}cm | Meta: {currentTarget.toLocaleString("pt-BR")} pl/ha</p>
              </div>
            )}

            {/* GPS */}
            <div className="space-y-1.5">
              <Label>GPS</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={captureGps} disabled={capturingGps}>
                  <MapPin className="h-4 w-4 mr-1.5" />
                  {capturingGps ? "Capturando..." : "Capturar GPS"}
                </Button>
                {gps && <span className="text-xs text-muted-foreground">{gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
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
