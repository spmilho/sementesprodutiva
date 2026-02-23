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
import { calcSeedsPerMeter, PLANTING_TYPES, getPlantingTypeInfo, isFemaleType } from "./planting-utils";

interface Props {
  cycleId: string;
  orgId: string;
  plans: any[];
  glebas: any[];
  seedLots: any[];
  femaleArea: number;
  maleArea: number;
  spacingFemaleFemaleCm?: number | null;
  spacingMaleMaleCm?: number | null;
}

const schema = z.object({
  planned_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.string().min(1, "Tipo é obrigatório"),
  seed_lot_id: z.string().optional(),
  gleba_id: z.string().optional(),
  planned_area: z.coerce.number().positive("Área deve ser > 0"),
  target_population: z.coerce.number().int().positive().default(62000),
  germination_rate: z.coerce.number().min(1).max(100).default(92),
  row_spacing: z.coerce.number().int().positive().default(70),
  planting_order: z.coerce.number().int().positive().default(1),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PlantingPlanSection({ cycleId, orgId, plans, glebas, seedLots, femaleArea, maleArea, spacingFemaleFemaleCm, spacingMaleMaleCm }: Props) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { target_population: 62000, germination_rate: 92, row_spacing: spacingFemaleFemaleCm || 70, planting_order: 1 },
  });

  const watchType = form.watch("type");
  const watchPop = form.watch("target_population");
  const watchGerm = form.watch("germination_rate");
  const watchSpacing = form.watch("row_spacing");
  const watchLotId = form.watch("seed_lot_id");
  const seedsPerMeter = calcSeedsPerMeter(watchPop, watchSpacing, watchGerm);

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

  // When lot changes, pre-fill germination
  const handleLotChange = (lotId: string) => {
    form.setValue("seed_lot_id", lotId || undefined);
    if (lotId) {
      const lot = seedLots.find((l: any) => l.id === lotId);
      if (lot?.germination_pct) form.setValue("germination_rate", lot.germination_pct);
    }
  };

  // When gleba changes, pre-fill area
  const handleGlebaChange = (glebaId: string) => {
    form.setValue("gleba_id", glebaId || undefined);
    if (glebaId) {
      const gleba = glebas.find((g: any) => g.id === glebaId);
      if (gleba?.area_ha) form.setValue("planned_area", gleba.area_ha);
    }
  };

  const openNew = () => {
    setEditingId(null);
    form.reset({ target_population: 62000, germination_rate: 92, row_spacing: 70, planting_order: (plans.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    form.reset({
      planned_date: new Date(p.planned_date + "T12:00:00"),
      type: p.type,
      seed_lot_id: p.seed_lot_id || undefined,
      gleba_id: p.gleba_id || undefined,
      planned_area: p.planned_area,
      target_population: p.target_population,
      germination_rate: p.germination_rate,
      row_spacing: p.row_spacing,
      planting_order: p.planting_order,
      observations: p.observations || "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const spm = calcSeedsPerMeter(values.target_population, values.row_spacing, values.germination_rate);
      const row: any = {
        cycle_id: cycleId, org_id: orgId,
        planned_date: format(values.planned_date, "yyyy-MM-dd"),
        type: values.type,
        seed_lot_id: values.seed_lot_id || null,
        gleba_id: values.gleba_id || null,
        planned_area: values.planned_area,
        target_population: values.target_population,
        germination_rate: values.germination_rate,
        row_spacing: values.row_spacing,
        seeds_per_meter: spm,
        planting_order: values.planting_order,
        observations: values.observations || null,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("planting_plan").update(row).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await addRecord("planting_plan", row, cycleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_plan", cycleId] });
      toast.success(editingId ? "Planejamento atualizado!" : "Planejamento adicionado!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "planting_plan", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_plan", cycleId] });
      toast.success("Removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground border-b pb-2 flex-1">📋 Planejamento de Plantio</h3>
        <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Cadastrar Planejamento</Button>
      </div>

      <Card><CardContent className="p-0">
        {plans.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhum planejamento cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data Plan.</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs">Lote</TableHead>
                  <TableHead className="text-xs text-right">Área(ha)</TableHead>
                  <TableHead className="text-xs text-right">Pop.Alvo</TableHead>
                  <TableHead className="text-xs text-right">Germ%</TableHead>
                  <TableHead className="text-xs text-right">Sem/metro</TableHead>
                  <TableHead className="text-xs text-center">Ordem</TableHead>
                  <TableHead className="text-xs text-center w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p: any) => {
                  const ti = getPlantingTypeInfo(p.type);
                  const lot = seedLots.find((l: any) => l.id === p.seed_lot_id);
                  const gleba = glebas.find((g: any) => g.id === p.gleba_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{format(new Date(p.planned_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell><span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", ti.badgeClass)}>{ti.badge}</span></TableCell>
                      <TableCell className="text-sm">{gleba?.name || "Geral"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lot?.lot_number || "—"}</TableCell>
                      <TableCell className="text-sm text-right">{p.planned_area}</TableCell>
                      <TableCell className="text-sm text-right">{p.target_population?.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-sm text-right">{p.germination_rate}%</TableCell>
                      <TableCell className="text-sm text-right font-mono">{p.seeds_per_meter}</TableCell>
                      <TableCell className="text-sm text-center">{p.planting_order}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? "Editar Planejamento" : "Cadastrar Planejamento de Plantio"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data planejada *</Label>
                <Controller name="planned_date" control={form.control} render={({ field }) => (
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent></Popover>
                )} />
                {form.formState.errors.planned_date && <p className="text-xs text-destructive">{form.formState.errors.planned_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller name="type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v);
                    const isFem = isFemaleType(v);
                    const defaultSpacing = isFem ? (spacingFemaleFemaleCm || 70) : (spacingMaleMaleCm || 70);
                    form.setValue("row_spacing", defaultSpacing);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {PLANTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lote de semente</Label>
                <Controller name="seed_lot_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => handleLotChange(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {filteredLots.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.seed_lot_treatments?.length > 0 ? "🟢" : "⚠️"} {l.lot_number} — {l.origin_season} — Germ {l.germination_pct}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Gleba</Label>
                <Controller name="gleba_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? "__none__"} onValueChange={(v) => handleGlebaChange(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Geral" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Geral</SelectItem>
                      {filteredGlebas.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name} — {g.area_ha ?? "?"} ha</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Área planejada (ha) *</Label>
                <Input type="number" step="0.01" {...form.register("planned_area")} />
              </div>
              <div className="space-y-1.5">
                <Label>Pop. alvo (pl/ha) *</Label>
                <Input type="number" {...form.register("target_population")} />
              </div>
              <div className="space-y-1.5">
                <Label>Germinação (%)</Label>
                <Input type="number" step="0.1" {...form.register("germination_rate")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Espaçamento (cm) *</Label>
                <Input type="number" {...form.register("row_spacing")} />
              </div>
              <div className="space-y-1.5">
                <Label>Sem/metro (calc.)</Label>
                <div className="h-9 flex items-center px-3 border rounded-md bg-muted text-sm font-mono">{seedsPerMeter > 0 ? seedsPerMeter.toFixed(2) : "—"}</div>
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input type="number" {...form.register("planting_order")} />
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
