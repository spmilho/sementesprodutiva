import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useOfflineSyncContext } from "@/components/Layout";
import { PLANTING_TYPES, getPlantingTypeInfo, isFemaleType, getCvLabel } from "./planting-utils";

interface Props {
  cycleId: string;
  orgId: string;
  actuals: any[];
  plans: any[];
  glebas: any[];
  seedLots: any[];
  spacingFemaleFemaleCm?: number | null;
  spacingMaleMaleCm?: number | null;
}

const schema = z.object({
  planting_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.string().min(1, "Tipo é obrigatório"),
  seed_lot_id: z.string().optional(),
  gleba_id: z.string().optional(),
  planting_plan_id: z.string().optional(),
  actual_area: z.coerce.number().positive("Área deve ser > 0"),
  row_spacing: z.coerce.number().int().positive().default(70),
  seeds_per_meter: z.coerce.number().positive().optional().or(z.literal("")),
  cv_percent: z.coerce.number().min(0).optional().or(z.literal("")),
  planter_speed: z.coerce.number().positive().optional().or(z.literal("")),
  sowing_depth_cm: z.coerce.number().positive().optional().or(z.literal("")),
  soil_condition: z.string().optional(),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ActualPlantingSection({ cycleId, orgId, actuals, plans, glebas, seedLots, spacingFemaleFemaleCm, spacingMaleMaleCm }: Props) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { row_spacing: spacingFemaleFemaleCm || 70, observations: "" },
  });

  const watchType = form.watch("type");

  // Update row_spacing default when type changes
  const handleTypeChange = (type: string, onChange: (v: string) => void) => {
    onChange(type);
    const isFem = isFemaleType(type);
    const defaultSpacing = isFem ? (spacingFemaleFemaleCm || 70) : (spacingMaleMaleCm || 70);
    form.setValue("row_spacing", defaultSpacing);
  };

  const filteredLots = useMemo(() => {
    if (!watchType) return [];
    const isFem = isFemaleType(watchType);
    return seedLots.filter((l: any) => isFem ? l.parent_type === "female" : l.parent_type === "male");
  }, [watchType, seedLots]);

  const filteredGlebas = useMemo(() => {
    if (!watchType) return glebas;
    const isFem = isFemaleType(watchType);
    return glebas.filter((g: any) => isFem ? g.parent_type === "female" || !g.parent_type : g.parent_type === "male" || !g.parent_type);
  }, [watchType, glebas]);

  const filteredPlans = useMemo(() => {
    if (!watchType) return [];
    return plans.filter((p: any) => p.type === watchType);
  }, [watchType, plans]);

  const displayedActuals = useMemo(() => {
    if (filterType === "all") return actuals;
    return actuals.filter((a: any) => a.type === filterType);
  }, [actuals, filterType]);

  const openNew = () => {
    setEditingId(null);
    form.reset({ row_spacing: 70, observations: "" });
    setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingId(a.id);
    form.reset({
      planting_date: new Date(a.planting_date + "T12:00:00"),
      type: a.type,
      seed_lot_id: a.seed_lot_id || undefined,
      gleba_id: a.gleba_id || undefined,
      planting_plan_id: a.planting_plan_id || undefined,
      actual_area: a.actual_area,
      row_spacing: a.row_spacing || 70,
      seeds_per_meter: a.seeds_per_meter ?? "",
      cv_percent: a.cv_percent ?? "",
      planter_speed: a.planter_speed ?? "",
      sowing_depth_cm: a.sowing_depth_cm ?? "",
      soil_condition: a.soil_condition || undefined,
      observations: a.observations || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const row: any = {
        cycle_id: cycleId, org_id: orgId,
        planting_date: format(values.planting_date, "yyyy-MM-dd"),
        type: values.type,
        seed_lot_id: values.seed_lot_id || null,
        gleba_id: values.gleba_id || null,
        planting_plan_id: values.planting_plan_id || null,
        actual_area: values.actual_area,
        row_spacing: values.row_spacing,
        seeds_per_meter: values.seeds_per_meter || null,
        cv_percent: values.cv_percent || null,
        planter_speed: values.planter_speed || null,
        sowing_depth_cm: values.sowing_depth_cm || null,
        soil_condition: values.soil_condition || null,
        observations: values.observations || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("planting_actual").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await addRecord("planting_actual", row, cycleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
      toast.success(editingId ? "Plantio atualizado!" : "Plantio registrado!");
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
      toast.success("Removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold text-foreground border-b pb-2 flex-1">🌱 Plantio Realizado</h3>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PLANTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Registrar Plantio</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        {actuals.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum plantio realizado registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs">Lote</TableHead>
                  <TableHead className="text-xs text-right">Área(ha)</TableHead>
                  <TableHead className="text-xs text-right">Espaç.(cm)</TableHead>
                  <TableHead className="text-xs text-right">Sem/metro</TableHead>
                  <TableHead className="text-xs text-right">CV%</TableHead>
                  <TableHead className="text-xs text-right hidden md:table-cell">Vel.(km/h)</TableHead>
                  <TableHead className="text-xs text-center w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedActuals.map((a: any) => {
                  const ti = getPlantingTypeInfo(a.type);
                  const lot = seedLots.find((l: any) => l.id === a.seed_lot_id);
                  const gleba = glebas.find((g: any) => g.id === a.gleba_id);
                  const cvVal = a.cv_percent;
                  const cvLabel = cvVal != null ? getCvLabel(cvVal) : null;

                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{format(new Date(a.planting_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", ti.badgeClass)}>{ti.badge}</span></TableCell>
                      <TableCell className="text-sm">{gleba?.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lot?.lot_number || "—"}</TableCell>
                      <TableCell className="text-sm text-right">{a.actual_area}</TableCell>
                      <TableCell className="text-sm text-right">{a.row_spacing || "—"}</TableCell>
                      <TableCell className="text-sm text-right font-mono">{a.seeds_per_meter || "—"}</TableCell>
                      <TableCell className="text-sm text-right">
                        {cvLabel ? <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", cvLabel.bg)}>{cvVal.toFixed(1)}%</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-right hidden md:table-cell">{a.planter_speed || "—"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Plantio Realizado" : "Registrar Plantio Realizado"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Identificação</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Controller name="planting_date" control={form.control} render={({ field }) => (
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent></Popover>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller name="type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => handleTypeChange(v, field.onChange)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{PLANTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lote de semente</Label>
                <Controller name="seed_lot_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {filteredLots.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.lot_number} — {l.origin_season}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Gleba</Label>
                <Controller name="gleba_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {filteredGlebas.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} — {g.area_ha ?? "?"} ha</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            {filteredPlans.length > 0 && (
              <div className="space-y-1.5">
                <Label>Vincular ao planejamento</Label>
                <Controller name="planting_plan_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {filteredPlans.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{format(new Date(p.planned_date + "T12:00:00"), "dd/MM/yyyy")} — {p.planned_area} ha</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            )}

            <p className="text-xs font-semibold text-muted-foreground uppercase pt-2">Dados do Plantio</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Área plantada (ha) *</Label>
                <Input type="number" step="0.01" {...form.register("actual_area")} />
              </div>
              <div className="space-y-1.5">
                <Label>Espaçamento (cm) *</Label>
                <Input type="number" {...form.register("row_spacing")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Sem/metro (config.)</Label>
                <Input type="number" step="0.01" {...form.register("seeds_per_meter")} />
              </div>
              <div className="space-y-1.5">
                <Label>CV% (semeadura)</Label>
                <Input type="number" step="0.1" placeholder="Ex: 12.5" {...form.register("cv_percent")} />
              </div>
              <div className="space-y-1.5">
                <Label>Velocidade (km/h)</Label>
                <Input type="number" step="0.1" {...form.register("planter_speed")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Velocidade (km/h)</Label>
                <Input type="number" step="0.1" {...form.register("planter_speed")} />
              </div>
              <div className="space-y-1.5">
                <Label>Prof. semeadura (cm)</Label>
                <Input type="number" step="0.1" {...form.register("sowing_depth_cm")} />
              </div>
              <div className="space-y-1.5">
                <Label>Condição do solo</Label>
                <Controller name="soil_condition" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value="excellent">Ótima</SelectItem>
                      <SelectItem value="good">Boa</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="poor">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} {...form.register("observations")} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
