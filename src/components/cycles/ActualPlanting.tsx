import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ActualPlantingProps {
  cycleId: string;
  femaleArea: number;
  maleArea: number;
  orgId: string;
  pivotName?: string;
  contractNumber?: string | null;
  cooperatorName?: string;
  farmName?: string;
}

const schema = z.object({
  planting_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.enum(["male", "female"], { required_error: "Tipo é obrigatório" }),
  actual_area: z.coerce.number().positive("Área deve ser > 0"),
  seeds_per_meter: z.coerce.number().positive().optional().or(z.literal("")),
  row_spacing: z.coerce.number().int().positive().optional().or(z.literal("")),
  planter_speed: z.coerce.number().positive().optional().or(z.literal("")),
  cv_percent: z.coerce.number().min(0).optional().or(z.literal("")),
  planting_plan_id: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ActualPlanting({
  cycleId, femaleArea, maleArea, orgId,
  pivotName, contractNumber, cooperatorName, farmName,
}: ActualPlantingProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch actual planting records
  const { data: actuals = [], isLoading } = useQuery({
    queryKey: ["planting_actual", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_actual")
        .select("*, planting_plan(planned_area, planned_date)")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("planting_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch planting plans for linking
  const { data: plans = [] } = useQuery({
    queryKey: ["planting_plan", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("planned_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Totals
  const totalFemaleActual = useMemo(() => actuals.filter((a: any) => a.type === "female").reduce((s: number, a: any) => s + a.actual_area, 0), [actuals]);
  const totalMaleActual = useMemo(() => actuals.filter((a: any) => a.type === "male").reduce((s: number, a: any) => s + a.actual_area, 0), [actuals]);
  const totalFemalePlanned = useMemo(() => plans.filter((p: any) => p.type === "female").reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);
  const totalMalePlanned = useMemo(() => plans.filter((p: any) => p.type === "male").reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);

  const femaleDeviation = totalFemaleActual - totalFemalePlanned;
  const maleDeviation = totalMaleActual - totalMalePlanned;
  const femalePct = femaleArea ? Math.min((totalFemaleActual / femaleArea) * 100, 100) : 0;
  const malePct = maleArea ? Math.min((totalMaleActual / maleArea) * 100, 100) : 0;

  // Chart data
  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    plans.forEach((p: any) => allDates.add(p.planned_date));
    actuals.forEach((a: any) => allDates.add(a.planting_date));
    const sorted = Array.from(allDates).sort();

    let accPlanned = 0;
    let accActual = 0;
    return sorted.map((date) => {
      const dayPlanned = plans.filter((p: any) => p.planned_date === date).reduce((s: number, p: any) => s + p.planned_area, 0);
      const dayActual = actuals.filter((a: any) => a.planting_date === date).reduce((s: number, a: any) => s + a.actual_area, 0);
      accPlanned += dayPlanned;
      accActual += dayActual;
      return {
        date: format(new Date(date + "T12:00:00"), "dd/MM"),
        planejado: dayPlanned || undefined,
        realizado: dayActual || undefined,
        acumPlanejado: accPlanned,
        acumRealizado: accActual,
      };
    });
  }, [plans, actuals]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { observations: "" },
  });

  const watchType = form.watch("type");
  const filteredPlans = useMemo(() => plans.filter((p: any) => p.type === watchType), [plans, watchType]);

  const openNew = () => {
    setEditingId(null);
    form.reset({ planting_date: undefined, type: undefined, actual_area: undefined, seeds_per_meter: "", row_spacing: "", planter_speed: "", cv_percent: "", planting_plan_id: undefined, observations: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    form.reset({
      planting_date: new Date(a.planting_date + "T12:00:00"),
      type: a.type,
      actual_area: a.actual_area,
      seeds_per_meter: a.seeds_per_meter ?? "",
      row_spacing: a.row_spacing ?? "",
      planter_speed: a.planter_speed ?? "",
      cv_percent: a.cv_percent ?? "",
      planting_plan_id: a.planting_plan_id ?? undefined,
      observations: a.observations || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const row: any = {
        cycle_id: cycleId,
        org_id: orgId,
        planting_date: format(values.planting_date, "yyyy-MM-dd"),
        type: values.type,
        actual_area: values.actual_area,
        seeds_per_meter: values.seeds_per_meter || null,
        row_spacing: values.row_spacing || null,
        planter_speed: values.planter_speed || null,
        cv_percent: values.cv_percent || null,
        planting_plan_id: values.planting_plan_id || null,
        observations: values.observations || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("planting_actual").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("planting_actual").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
      toast.success(editingId ? "Registro atualizado!" : "Plantio registrado!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "planting_actual", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
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
        <span>Cooperado: <strong className="text-foreground">{cooperatorName || "—"}</strong></span>
        <span>•</span>
        <span>Fazenda: <strong className="text-foreground">{farmName || "—"}</strong></span>
        <span>•</span>
        <span>Pivô: <strong className="text-foreground">{pivotName || "—"}</strong></span>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Female Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Fêmea</p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Planejado: {totalFemalePlanned.toFixed(2)} ha</span>
              <span>Realizado: <strong className="text-foreground">{totalFemaleActual.toFixed(2)} ha</strong></span>
              <span className={cn("font-semibold", femaleDeviation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                Desvio: {femaleDeviation >= 0 ? "+" : ""}{femaleDeviation.toFixed(2)} ha
              </span>
            </div>
            <Progress value={femalePct} className="h-2 [&>div]:bg-pink-500" />
            <p className="text-xs text-muted-foreground">{femalePct.toFixed(0)}% da área total ({femaleArea} ha)</p>
          </CardContent>
        </Card>

        {/* Male Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Macho</p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Planejado: {totalMalePlanned.toFixed(2)} ha</span>
              <span>Realizado: <strong className="text-foreground">{totalMaleActual.toFixed(2)} ha</strong></span>
              <span className={cn("font-semibold", maleDeviation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                Desvio: {maleDeviation >= 0 ? "+" : ""}{maleDeviation.toFixed(2)} ha
              </span>
            </div>
            <Progress value={malePct} className="h-2 [&>div]:bg-blue-500" />
            <p className="text-xs text-muted-foreground">{malePct.toFixed(0)}% da área total ({maleArea} ha)</p>
          </CardContent>
        </Card>
      </div>

      {/* Add button */}
      <Button className="gap-2" onClick={openNew}>
        <Plus className="h-4 w-4" /> Registrar Plantio do Dia
      </Button>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : actuals.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhum plantio realizado registrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-right">Área Real (ha)</TableHead>
                    <TableHead className="text-xs text-right">Área Plan. (ha)</TableHead>
                    <TableHead className="text-xs text-right">Desvio (ha)</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">Sem/m</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">CV%</TableHead>
                    <TableHead className="text-xs text-right hidden lg:table-cell">Vel. (km/h)</TableHead>
                    <TableHead className="text-xs hidden xl:table-cell">Obs</TableHead>
                    <TableHead className="text-xs text-center w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actuals.map((a: any) => {
                    const plannedArea = a.planting_plan?.planned_area;
                    const deviation = plannedArea != null ? a.actual_area - plannedArea : null;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{format(new Date(a.planting_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            a.type === "female"
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {a.type === "female" ? "Fêmea" : "Macho"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{a.actual_area}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{plannedArea ?? "—"}</TableCell>
                        <TableCell className={cn("text-right text-sm font-medium", deviation != null ? (deviation >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "")}>
                          {deviation != null ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{a.seeds_per_meter ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{a.cv_percent != null ? `${a.cv_percent}%` : "—"}</TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell">{a.planter_speed ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px] hidden xl:table-cell">{a.observations || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex flex-wrap gap-6 px-4 py-3 border-t text-xs text-muted-foreground">
                <span>Total Fêmea Real: <strong className="text-foreground">{totalFemaleActual.toFixed(2)} ha</strong> de {femaleArea} ha ({femaleArea ? ((totalFemaleActual / femaleArea) * 100).toFixed(0) : 0}%)</span>
                <span>Total Macho Real: <strong className="text-foreground">{totalMaleActual.toFixed(2)} ha</strong> de {maleArea} ha ({maleArea ? ((totalMaleActual / maleArea) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-4">Planejado vs Realizado</p>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" label={{ value: "ha", angle: -90, position: "insideLeft", className: "text-xs fill-muted-foreground" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planejado" name="Planejado" fill="hsl(var(--muted-foreground) / 0.3)" barSize={20} />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(142 76% 36%)" barSize={20} />
                <Line type="monotone" dataKey="acumPlanejado" name="Acum. Planejado" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="acumRealizado" name="Acum. Realizado" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Plantio Realizado" : "Registrar Plantio do Dia"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label>Data do plantio *</Label>
                <Controller name="planting_date" control={form.control} render={({ field }) => (
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
                {form.formState.errors.planting_date && <p className="text-xs text-destructive">{form.formState.errors.planting_date.message}</p>}
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
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Área plantada (ha) *</Label>
                <Input type="number" step="0.01" {...form.register("actual_area")} />
                {form.formState.errors.actual_area && <p className="text-xs text-destructive">{form.formState.errors.actual_area.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sementes por metro</Label>
                <Input type="number" step="0.01" {...form.register("seeds_per_meter")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Espaçamento (cm)</Label>
                <Input type="number" {...form.register("row_spacing")} />
              </div>
              <div className="space-y-1.5">
                <Label>Velocidade (km/h)</Label>
                <Input type="number" step="0.1" {...form.register("planter_speed")} />
              </div>
              <div className="space-y-1.5">
                <Label>CV%</Label>
                <Input type="number" step="0.1" {...form.register("cv_percent")} />
              </div>
            </div>

            {/* Link to plan */}
            {watchType && filteredPlans.length > 0 && (
              <div className="space-y-1.5">
                <Label>Vincular ao planejamento</Label>
                <Controller name="planting_plan_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {filteredPlans.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {format(new Date(p.planned_date + "T12:00:00"), "dd/MM/yyyy")} — {p.planned_area} ha
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            )}

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
