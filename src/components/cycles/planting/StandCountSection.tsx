import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Loader2, CalendarIcon, ChevronDown, ChevronRight, Zap } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calcStats, getCvLabel, getEmergenceColor, isFemaleType } from "./planting-utils";

interface Props {
  cycleId: string;
  orgId: string;
  standCounts: any[];
  standPoints: any[];
  plans: any[];
  actuals: any[];
  glebas: any[];
}

const schema = z.object({
  count_date: z.date({ required_error: "Data é obrigatória" }),
  count_type: z.string().min(1),
  parent_type: z.enum(["female", "male"], { required_error: "Obrigatório" }),
  gleba_id: z.string().optional(),
  row_spacing_cm: z.coerce.number().int().positive().default(70),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function StandCountSection({ cycleId, orgId, standCounts, standPoints, plans, actuals, glebas }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterParent, setFilterParent] = useState("all");

  // Inline points state for the form
  const [formPoints, setFormPoints] = useState<{ seeds: string; length: string }[]>([]);
  const [quickEntry, setQuickEntry] = useState(false);
  const [quickText, setQuickText] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { count_type: "emergence", row_spacing_cm: 70 },
  });

  // Stand population cards
  const femaleStands = useMemo(() => standCounts.filter((s: any) => s.parent_type === "female"), [standCounts]);
  const maleStands = useMemo(() => standCounts.filter((s: any) => s.parent_type === "male"), [standCounts]);

  const femaleLatest = femaleStands[0];
  const maleLatest = maleStands[0];

  const totalPoints = standPoints.length;
  const lastDate = standCounts[0]?.count_date;

  const femalePopPlan = useMemo(() => {
    const fp = plans.filter((p: any) => isFemaleType(p.type));
    return fp.length ? fp.reduce((s: number, p: any) => s + (p.target_population || 0), 0) / fp.length : 0;
  }, [plans]);

  const malePopPlan = useMemo(() => {
    const mp = plans.filter((p: any) => !isFemaleType(p.type));
    return mp.length ? mp.reduce((s: number, p: any) => s + (p.target_population || 0), 0) / mp.length : 0;
  }, [plans]);

  const displayedCounts = useMemo(() => {
    if (filterParent === "all") return standCounts;
    return standCounts.filter((s: any) => s.parent_type === filterParent);
  }, [standCounts, filterParent]);

  const openNew = () => {
    setEditingId(null);
    setFormPoints([]);
    form.reset({ count_type: "emergence", row_spacing_cm: 70 });
    setDialogOpen(true);
  };

  const addFormPoint = () => {
    setFormPoints([...formPoints, { seeds: "", length: "5.0" }]);
  };

  const handleQuickGenerate = () => {
    const values = quickText.split(/[,;\s]+/).map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) { toast.error("Nenhum valor válido"); return; }
    setFormPoints(values.map(v => ({ seeds: String(v), length: "5.0" })));
    setQuickEntry(false);
    setQuickText("");
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (formPoints.length === 0) throw new Error("Adicione pelo menos 1 ponto de contagem");

      const validPoints = formPoints.filter(p => p.seeds && parseFloat(p.seeds) > 0);
      if (validPoints.length === 0) throw new Error("Nenhum ponto válido");

      // Calculate DAP
      let dap: number | null = null;
      const matchingActual = actuals.find((a: any) =>
        (values.parent_type === "female" ? isFemaleType(a.type) : !isFemaleType(a.type)) &&
        (!values.gleba_id || a.gleba_id === values.gleba_id)
      );
      if (matchingActual) {
        const plantDate = new Date(matchingActual.planting_date + "T12:00:00");
        const countDate = values.count_date;
        dap = Math.round((countDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Get planned population
      const matchingPlan = plans.find((p: any) =>
        (values.parent_type === "female" ? isFemaleType(p.type) : !isFemaleType(p.type)) &&
        (!values.gleba_id || p.gleba_id === values.gleba_id)
      );
      const plannedPop = matchingPlan?.target_population || null;

      // Calculate stats from points
      const pointsData = validPoints.map(p => {
        const count = parseFloat(p.seeds);
        const length = parseFloat(p.length);
        const ppm = count / length;
        const ppha = ppm * (10000 / (values.row_spacing_cm / 100));
        return { count, length, ppm, ppha };
      });

      const pphaValues = pointsData.map(p => p.ppha);
      const s = calcStats(pphaValues);
      const ppmValues = pointsData.map(p => p.ppm);
      const ppmStats = calcStats(ppmValues);
      const emergPct = plannedPop && s.mean > 0 ? (s.mean / plannedPop) * 100 : null;

      // Save header
      const headerRow: any = {
        cycle_id: cycleId, org_id: orgId,
        count_date: format(values.count_date, "yyyy-MM-dd"),
        count_type: values.count_type,
        parent_type: values.parent_type,
        gleba_id: values.gleba_id || null,
        row_spacing_cm: values.row_spacing_cm,
        days_after_planting: dap,
        avg_plants_per_meter: Math.round(ppmStats.mean * 100) / 100,
        avg_plants_per_ha: Math.round(s.mean),
        std_plants_per_ha: Math.round(s.std),
        cv_stand_pct: Math.round(s.cv * 10) / 10,
        planned_population_ha: plannedPop,
        emergence_pct: emergPct ? Math.round(emergPct * 10) / 10 : null,
        notes: values.notes || null,
      };

      let headerId: string;
      if (editingId) {
        const { error } = await (supabase as any).from("stand_counts").update(headerRow).eq("id", editingId);
        if (error) throw error;
        headerId = editingId;
        // Delete existing points
        await (supabase as any).from("stand_count_points").delete().eq("stand_count_id", editingId);
      } else {
        const { data, error } = await (supabase as any).from("stand_counts").insert(headerRow).select("id").single();
        if (error) throw error;
        headerId = data.id;
      }

      // Insert points
      const pointRows = validPoints.map((p, i) => ({
        stand_count_id: headerId,
        point_number: i + 1,
        plants_counted: parseInt(p.seeds),
        sample_length_m: parseFloat(p.length),
        row_spacing_cm: values.row_spacing_cm,
      }));

      const { error: ptErr } = await (supabase as any).from("stand_count_points").insert(pointRows);
      if (ptErr) throw ptErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stand_counts", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["stand_count_points", cycleId] });
      toast.success(editingId ? "Contagem atualizada!" : "Contagem registrada!");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "stand_counts", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stand_counts", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["stand_count_points", cycleId] });
      toast.success("Removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const countTypeLabels: Record<string, string> = { emergence: "Emergência", final_stand: "Stand Final", recount: "Recontagem" };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground border-b pb-2">🌱 Emergência e Stand de Plantas</h3>
      <p className="text-xs text-muted-foreground">Contagem de população de plantas para avaliar emergência e uniformidade do stand.</p>

      {/* Population Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Female Pop */}
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Pop. Fêmea</p>
          <p className="text-xl font-bold">{femaleLatest?.avg_plants_per_ha ? Math.round(femaleLatest.avg_plants_per_ha).toLocaleString("pt-BR") : "—"} <span className="text-xs font-normal">pl/ha</span></p>
          {femaleLatest?.cv_stand_pct != null && (
            <span className={`text-xs px-1 py-0.5 rounded ${getCvLabel(femaleLatest.cv_stand_pct).bg}`}>CV: {femaleLatest.cv_stand_pct.toFixed(1)}%</span>
          )}
        </CardContent></Card>

        {/* Female Emergence */}
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">% Emerg. Fêmea</p>
          {femaleLatest?.emergence_pct != null ? (
            <>
              <p className={cn("text-xl font-bold", getEmergenceColor(femaleLatest.emergence_pct))}>{femaleLatest.emergence_pct.toFixed(1)}%</p>
              <Progress value={Math.min(femaleLatest.emergence_pct, 100)} className="h-1.5" />
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </CardContent></Card>

        {/* Male Pop */}
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Pop. Macho</p>
          <p className="text-xl font-bold">{maleLatest?.avg_plants_per_ha ? Math.round(maleLatest.avg_plants_per_ha).toLocaleString("pt-BR") : "—"} <span className="text-xs font-normal">pl/ha</span></p>
          {maleLatest?.cv_stand_pct != null && (
            <span className={`text-xs px-1 py-0.5 rounded ${getCvLabel(maleLatest.cv_stand_pct).bg}`}>CV: {maleLatest.cv_stand_pct.toFixed(1)}%</span>
          )}
        </CardContent></Card>

        {/* Male Emergence */}
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">% Emerg. Macho</p>
          {maleLatest?.emergence_pct != null ? (
            <>
              <p className={cn("text-xl font-bold", getEmergenceColor(maleLatest.emergence_pct))}>{maleLatest.emergence_pct.toFixed(1)}%</p>
              <Progress value={Math.min(maleLatest.emergence_pct, 100)} className="h-1.5" />
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Nova Contagem de Stand</Button>
        <Select value={filterParent} onValueChange={setFilterParent}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="female">Fêmea</SelectItem>
            <SelectItem value="male">Macho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Counts Table */}
      <Card><CardContent className="p-0">
        {standCounts.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Nenhuma contagem registrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Parental</TableHead>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs text-right">DAP</TableHead>
                  <TableHead className="text-xs text-right">Pontos</TableHead>
                  <TableHead className="text-xs text-right">Média pl/ha</TableHead>
                  <TableHead className="text-xs text-right">CV%</TableHead>
                  <TableHead className="text-xs text-right">%Emerg.</TableHead>
                  <TableHead className="text-xs text-center w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCounts.map((sc: any) => {
                  const gleba = glebas.find((g: any) => g.id === sc.gleba_id);
                  const pts = standPoints.filter((p: any) => p.stand_count_id === sc.id);
                  const isExpanded = expandedId === sc.id;
                  const cvLabel = sc.cv_stand_pct != null ? getCvLabel(sc.cv_stand_pct) : null;

                  return (
                    <>
                      <TableRow key={sc.id} className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : sc.id)}>
                        <TableCell className="p-1">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="text-sm">{format(new Date(sc.count_date + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">{countTypeLabels[sc.count_type] || sc.count_type}</span></TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            sc.parent_type === "female" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}>{sc.parent_type === "female" ? "Fêmea" : "Macho"}</span>
                        </TableCell>
                        <TableCell className="text-sm">{gleba?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-right">{sc.days_after_planting ?? "—"}</TableCell>
                        <TableCell className="text-sm text-right">{pts.length}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">{sc.avg_plants_per_ha ? Math.round(sc.avg_plants_per_ha).toLocaleString("pt-BR") : "—"}</TableCell>
                        <TableCell className="text-sm text-right">
                          {cvLabel ? <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", cvLabel.bg)}>{sc.cv_stand_pct.toFixed(1)}%</span> : "—"}
                        </TableCell>
                        <TableCell className={cn("text-sm text-right font-semibold", sc.emergence_pct != null ? getEmergenceColor(sc.emergence_pct) : "")}>
                          {sc.emergence_pct != null ? `${sc.emergence_pct.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate(sc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && pts.length > 0 && (
                        <TableRow key={sc.id + "-pts"}>
                          <TableCell colSpan={11} className="bg-muted/30 p-4">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader><TableRow>
                                  <TableHead className="text-xs">Ponto</TableHead>
                                  <TableHead className="text-xs text-right">Plantas</TableHead>
                                  <TableHead className="text-xs text-right">Comp.(m)</TableHead>
                                  <TableHead className="text-xs text-right">Pl/metro</TableHead>
                                  <TableHead className="text-xs text-right">Pl/ha</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                  {pts.map((p: any) => (
                                    <TableRow key={p.id}>
                                      <TableCell className="text-sm">{p.point_number}</TableCell>
                                      <TableCell className="text-sm text-right">{p.plants_counted}</TableCell>
                                      <TableCell className="text-sm text-right">{p.sample_length_m}</TableCell>
                                      <TableCell className="text-sm text-right font-mono">{Number(p.plants_per_meter).toFixed(2)}</TableCell>
                                      <TableCell className="text-sm text-right font-mono">{Math.round(Number(p.plants_per_ha)).toLocaleString("pt-BR")}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Contagem" : "Nova Contagem de Stand"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Identificação</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Controller name="count_date" control={form.control} render={({ field }) => (
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
                <Label>Tipo de contagem</Label>
                <Controller name="count_type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emergence">Emergência</SelectItem>
                      <SelectItem value="final_stand">Stand Final</SelectItem>
                      <SelectItem value="recount">Recontagem</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Parental *</Label>
                <Controller name="parent_type" control={form.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Fêmea</SelectItem>
                      <SelectItem value="male">Macho</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Gleba</Label>
                <Controller name="gleba_id" control={form.control} render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={(v) => field.onChange(v || undefined)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {glebas.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>Espaçamento (cm) *</Label>
                <Input type="number" {...form.register("row_spacing_cm")} />
              </div>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Pontos de Contagem</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setQuickEntry(!quickEntry)}>
                    <Zap className="h-3 w-3" /> Entrada rápida
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addFormPoint}>
                    <Plus className="h-3 w-3" /> Ponto
                  </Button>
                </div>
              </div>

              {quickEntry && (
                <Card><CardContent className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Contagens separadas por vírgula (ex: 32, 28, 35, 30)</p>
                  <Textarea rows={2} value={quickText} onChange={(e) => setQuickText(e.target.value)} placeholder="32, 28, 35, 30, 31" />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="h-7 text-xs" onClick={handleQuickGenerate}>Gerar Pontos</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setQuickEntry(false)}>Cancelar</Button>
                  </div>
                </CardContent></Card>
              )}

              {formPoints.length > 0 && (
                <div className="space-y-1">
                  {formPoints.map((pt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8">#{i + 1}</span>
                      <Input className="h-8 w-24 text-sm" type="number" placeholder="Plantas" value={pt.seeds}
                        onChange={(e) => { const nf = [...formPoints]; nf[i].seeds = e.target.value; setFormPoints(nf); }} />
                      <Input className="h-8 w-20 text-sm" type="number" step="0.1" value={pt.length}
                        onChange={(e) => { const nf = [...formPoints]; nf[i].length = e.target.value; setFormPoints(nf); }} />
                      <span className="text-xs text-muted-foreground">m</span>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                        onClick={() => setFormPoints(formPoints.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {formPoints.length === 0 && !quickEntry && (
                <p className="text-xs text-muted-foreground text-center py-4">Clique em "+ Ponto" ou "⚡ Entrada rápida" para adicionar pontos de contagem.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} {...form.register("notes")} />
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
