import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, Lock, CheckCircle2, Clock } from "lucide-react";
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

interface PlantingPlanProps {
  cycleId: string;
  femaleArea: number;
  maleArea: number;
  orgId: string;
  malePlantingFinished: boolean;
  femalePlantingFinished: boolean;
  pivotName?: string;
  contractNumber?: string | null;
  onFinishToggle: (type: "male" | "female", finished: boolean) => void;
}

function calcSeedsPerMeter(population: number, spacing: number, germination: number) {
  if (!population || !spacing || !germination) return 0;
  return Math.round(((population * spacing) / (10000 * 100 * (germination / 100))) * 100) / 100;
}

const schema = z.object({
  planned_date: z.date({ required_error: "Data é obrigatória" }),
  type: z.enum(["male", "female"], { required_error: "Tipo é obrigatório" }),
  planned_area: z.coerce.number().positive("Área deve ser > 0"),
  target_population: z.coerce.number().int().positive().default(62000),
  germination_rate: z.coerce.number().min(1).max(100).default(92),
  row_spacing: z.coerce.number().int().positive().default(70),
  planting_order: z.coerce.number().int().positive().default(1),
  observations: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PlantingPlan({
  cycleId, femaleArea, maleArea, orgId,
  malePlantingFinished, femalePlantingFinished,
  pivotName, contractNumber, onFinishToggle,
}: PlantingPlanProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["planting_plan", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("planting_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const totalFemale = useMemo(() => plans.filter((p: any) => p.type === "female").reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);
  const totalMale = useMemo(() => plans.filter((p: any) => p.type === "male").reduce((s: number, p: any) => s + p.planned_area, 0), [plans]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      target_population: 62000,
      germination_rate: 92,
      row_spacing: 70,
      planting_order: 1,
    },
  });

  const watchType = form.watch("type");
  const watchPop = form.watch("target_population");
  const watchGerm = form.watch("germination_rate");
  const watchSpacing = form.watch("row_spacing");
  const seedsPerMeter = calcSeedsPerMeter(watchPop, watchSpacing, watchGerm);

  // Set default population when type changes
  const handleTypeChange = (val: string) => {
    form.setValue("type", val as "male" | "female");
    form.setValue("target_population", val === "female" ? 62000 : 55000);
  };

  const openNew = () => {
    setEditingId(null);
    form.reset({
      target_population: 62000,
      germination_rate: 92,
      row_spacing: 70,
      planting_order: (plans.length || 0) + 1,
      type: undefined,
      planned_date: undefined,
      planned_area: undefined,
      observations: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    form.reset({
      planned_date: new Date(p.planned_date + "T12:00:00"),
      type: p.type,
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

      // Validate area limits
      const currentTypeTotal = plans
        .filter((p: any) => p.type === values.type && p.id !== editingId)
        .reduce((s: number, p: any) => s + p.planned_area, 0);
      const limit = values.type === "female" ? femaleArea : maleArea;
      if (currentTypeTotal + values.planned_area > limit + 0.01) {
        throw new Error(`Área ${values.type === "female" ? "fêmea" : "macho"} excede o limite de ${limit} ha (atual: ${currentTypeTotal} ha + ${values.planned_area} ha = ${currentTypeTotal + values.planned_area} ha)`);
      }

      const row = {
        cycle_id: cycleId,
        org_id: orgId,
        planned_date: format(values.planned_date, "yyyy-MM-dd"),
        type: values.type,
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
        const { error } = await (supabase as any).from("planting_plan").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_plan", cycleId] });
      toast.success(editingId ? "Plantio atualizado!" : "Plantio adicionado!");
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
      toast.success("Plantio removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const femalePct = femaleArea ? Math.min((totalFemale / femaleArea) * 100, 100) : 0;
  const malePct = maleArea ? Math.min((totalMale / maleArea) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* 4 Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Pivô / Contrato */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Pivô</p>
            <p className="text-base font-semibold text-foreground">{pivotName || "—"}</p>
            <p className="text-xs text-muted-foreground mt-2">Contrato</p>
            <p className="text-sm font-medium text-foreground">{contractNumber || "Sem contrato"}</p>
          </CardContent>
        </Card>

        {/* Card 2 — Área Fêmea */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Área Fêmea</p>
              {femalePlantingFinished && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span>Total: {femaleArea} ha</span>
              <span>•</span>
              <span>Planejada: {totalFemale.toFixed(2)} ha</span>
              <span>•</span>
              <span>Restante: {Math.max(femaleArea - totalFemale, 0).toFixed(2)} ha</span>
            </div>
            <Progress value={femalePct} className="h-2 [&>div]:bg-pink-500" />
          </CardContent>
        </Card>

        {/* Card 3 — Área Macho */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Área Macho</p>
              {malePlantingFinished && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span>Total: {maleArea} ha</span>
              <span>•</span>
              <span>Planejada: {totalMale.toFixed(2)} ha</span>
              <span>•</span>
              <span>Restante: {Math.max(maleArea - totalMale, 0).toFixed(2)} ha</span>
            </div>
            <Progress value={malePct} className="h-2 [&>div]:bg-blue-500" />
          </CardContent>
        </Card>

        {/* Card 4 — Status */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Status do Plantio</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                {femalePlantingFinished
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <Clock className="h-4 w-4 text-amber-500" />}
                <span className="text-muted-foreground">Fêmea:</span>
                <span className={cn("font-medium", femalePlantingFinished ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                  {femalePlantingFinished ? "Finalizado" : "Pendente"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {malePlantingFinished
                  ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                  : <Clock className="h-4 w-4 text-amber-500" />}
                <span className="text-muted-foreground">Macho:</span>
                <span className={cn("font-medium", malePlantingFinished ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                  {malePlantingFinished ? "Finalizado" : "Pendente"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Adicionar Plantio
        </Button>
        <Button
          variant={malePlantingFinished ? "secondary" : "outline"}
          size="sm"
          onClick={() => onFinishToggle("male", !malePlantingFinished)}
        >
          <Lock className="h-3.5 w-3.5 mr-1.5" />
          {malePlantingFinished ? "Macho Finalizado ✓" : "Marcar Plantio Macho como Finalizado"}
        </Button>
        <Button
          variant={femalePlantingFinished ? "secondary" : "outline"}
          size="sm"
          onClick={() => onFinishToggle("female", !femalePlantingFinished)}
        >
          <Lock className="h-3.5 w-3.5 mr-1.5" />
          {femalePlantingFinished ? "Fêmea Finalizado ✓" : "Marcar Plantio Fêmea como Finalizado"}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Nenhum plantio planejado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-16">Ordem</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs text-right">Área (ha)</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">População</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">Germ. (%)</TableHead>
                    <TableHead className="text-xs text-right hidden lg:table-cell">Sem/m</TableHead>
                    <TableHead className="text-xs text-right hidden lg:table-cell">Espaç. (cm)</TableHead>
                    <TableHead className="text-xs hidden xl:table-cell">Obs</TableHead>
                    <TableHead className="text-xs text-center w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p: any) => {
                    const isFinished = (p.type === "male" && malePlantingFinished) || (p.type === "female" && femalePlantingFinished);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">{p.planting_order}</TableCell>
                        <TableCell className="text-sm">{format(new Date(p.planned_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            p.type === "female"
                              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          )}>
                            {p.type === "female" ? "Fêmea" : "Macho"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">{p.planned_area}</TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{p.target_population?.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right text-sm hidden md:table-cell">{p.germination_rate}%</TableCell>
                        <TableCell className="text-right text-sm font-mono hidden lg:table-cell">{p.seeds_per_meter}</TableCell>
                        <TableCell className="text-right text-sm hidden lg:table-cell">{p.row_spacing}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[150px] hidden xl:table-cell">{p.observations || "—"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)} disabled={isFinished}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(p.id)} disabled={isFinished}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Footer totals */}
              <div className="flex flex-wrap gap-6 px-4 py-3 border-t text-xs text-muted-foreground">
                <span>Total Macho: <strong className="text-foreground">{totalMale.toFixed(2)} ha</strong> de {maleArea} ha</span>
                <span>Total Fêmea: <strong className="text-foreground">{totalFemale.toFixed(2)} ha</strong> de {femaleArea} ha</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Plantio" : "Adicionar Plantio"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label>Data planejada *</Label>
                <Controller name="planned_date" control={form.control} render={({ field }) => (
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
                {form.formState.errors.planned_date && <p className="text-xs text-destructive">{form.formState.errors.planned_date.message}</p>}
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller name="type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female" disabled={femalePlantingFinished}>Fêmea</SelectItem>
                      <SelectItem value="male" disabled={malePlantingFinished}>Macho</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                {form.formState.errors.type && <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Área planejada (ha) *</Label>
                <Input type="number" step="0.01" {...form.register("planned_area")} />
                {form.formState.errors.planned_area && <p className="text-xs text-destructive">{form.formState.errors.planned_area.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Ordem de plantio</Label>
                <Input type="number" {...form.register("planting_order")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>População (pl/ha)</Label>
                <Input type="number" {...form.register("target_population")} />
              </div>
              <div className="space-y-1.5">
                <Label>Germinação (%)</Label>
                <Input type="number" step="0.1" {...form.register("germination_rate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Espaçamento (cm)</Label>
                <Input type="number" {...form.register("row_spacing")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sementes por metro (calculado)</Label>
              <Input value={seedsPerMeter || "—"} readOnly className="bg-muted font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea {...form.register("observations")} rows={2} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
