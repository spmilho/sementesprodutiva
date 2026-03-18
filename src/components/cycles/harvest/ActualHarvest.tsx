import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO, addDays, differenceInDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, TrendingUp, Truck, Package, BarChart3, Droplets, Clock, Wheat } from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RTooltip } from "recharts";
import { formatDateBR, GLEBA_COLORS } from "./utils";
import type { ScheduleRow } from "./types";

interface ActualHarvestProps {
  cycleId: string;
  orgId: string;
  femaleArea: number;
  glebas: any[];
  schedule: ScheduleRow[];
  expectedProductivity?: number | null;
  yieldEstimates?: any[];
}

interface HarvestRecord {
  id: string;
  harvest_date: string;
  gleba_id: string | null;
  area_harvested_ha: number;
  avg_moisture_pct: number;
  loads_count: number;
  total_weight_tons: number;
  weight_per_load_tons: number | null;
  harvester_id: string | null;
  transport_vehicle: string | null;
  delivery_destination: string | null;
  ticket_number: string | null;
  notes: string | null;
}

export default function ActualHarvest({ cycleId, orgId, femaleArea, glebas, schedule, bagWeightKg }: ActualHarvestProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [groupByGleba, setGroupByGleba] = useState(false);
  const [chartViewGleba, setChartViewGleba] = useState(false);
  const [filterGleba, setFilterGleba] = useState<string>("all");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formGleba, setFormGleba] = useState<string>("");
  const [formArea, setFormArea] = useState("");
  const [formMoisture, setFormMoisture] = useState("");
  const [formLoads, setFormLoads] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formHarvester, setFormHarvester] = useState("");
  const [formVehicle, setFormVehicle] = useState("");
  const [formDestination, setFormDestination] = useState("");
  const [formTicket, setFormTicket] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["harvest-records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("harvest_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("harvest_date", { ascending: false });
      if (error) throw error;
      return (data || []) as HarvestRecord[];
    },
  });

  const insertMut = useMutation({
    mutationFn: async () => {
      const loads = Number(formLoads);
      const weight = Number(formWeight);
      const { error } = await (supabase as any).from("harvest_records").insert({
        cycle_id: cycleId,
        org_id: orgId,
        harvest_date: formDate,
        gleba_id: formGleba || null,
        area_harvested_ha: Number(formArea),
        avg_moisture_pct: Number(formMoisture),
        loads_count: loads,
        total_weight_tons: weight,
        weight_per_load_tons: loads > 0 ? Math.round((weight / loads) * 1000) / 1000 : null,
        harvester_id: formHarvester || null,
        transport_vehicle: formVehicle || null,
        delivery_destination: formDestination || null,
        ticket_number: formTicket || null,
        notes: formNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest-records", cycleId] });
      toast.success("Colheita registrada!");
      resetForm();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "harvest_records", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest-records", cycleId] });
      toast.success("Registro removido!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormGleba("");
    setFormArea("");
    setFormMoisture("");
    setFormLoads("");
    setFormWeight("");
    setFormHarvester("");
    setFormVehicle("");
    setFormDestination("");
    setFormTicket("");
    setFormNotes("");
  }

  const weightPerLoad = useMemo(() => {
    const l = Number(formLoads);
    const w = Number(formWeight);
    if (l > 0 && w > 0) return (w / l).toFixed(3);
    return "—";
  }, [formLoads, formWeight]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterGleba !== "all" && (r.gleba_id || "") !== filterGleba) return false;
      if (filterStart && r.harvest_date < filterStart) return false;
      if (filterEnd && r.harvest_date > filterEnd) return false;
      return true;
    });
  }, [records, filterGleba, filterStart, filterEnd]);

  // Dashboard stats
  const stats = useMemo(() => {
    const totalArea = records.reduce((s, r) => s + Number(r.area_harvested_ha), 0);
    const totalTons = records.reduce((s, r) => s + Number(r.total_weight_tons), 0);
    const totalLoads = records.reduce((s, r) => s + r.loads_count, 0);
    const totalBags = bagWeightKg > 0 ? (totalTons * 1000) / bagWeightKg : 0;
    const avgTonPerLoad = totalLoads > 0 ? totalTons / totalLoads : 0;
    const progressPct = femaleArea > 0 ? (totalArea / femaleArea) * 100 : 0;

    // Weighted moisture avg
    let moistureAvg = 0;
    if (totalArea > 0) {
      moistureAvg = records.reduce((s, r) => s + Number(r.avg_moisture_pct) * Number(r.area_harvested_ha), 0) / totalArea;
    }

    // Projection: avg ha/day from last 3 distinct days
    let projectionLabel = "Sem dados";
    if (records.length > 0) {
      const sortedDates = [...new Set(records.map(r => r.harvest_date))].sort().reverse();
      const last3 = sortedDates.slice(0, 3);
      const areaLast3 = records.filter(r => last3.includes(r.harvest_date)).reduce((s, r) => s + Number(r.area_harvested_ha), 0);
      const avgHaPerDay = areaLast3 / last3.length;
      const remaining = femaleArea - totalArea;
      if (remaining <= 0) {
        projectionLabel = "✅ Concluída";
      } else if (avgHaPerDay > 0) {
        const daysLeft = Math.ceil(remaining / avgHaPerDay);
        const endDate = addDays(new Date(), daysLeft);
        projectionLabel = `Término ~${format(endDate, "dd/MM/yyyy")}`;
      }
    }

    return { totalArea, totalTons, totalBags, totalLoads, avgTonPerLoad, progressPct, moistureAvg, projectionLabel };
  }, [records, femaleArea, bagWeightKg]);

  // Chart data: merge planned schedule with actual records by date
  const chartData = useMemo(() => {
    if (schedule.length === 0 && records.length === 0) return [];
    
    const dateMap: Record<string, { planejado: number; realizado: number; acumPlan: number; acumReal: number }> = {};
    
    // Fill planned from schedule
    for (const s of schedule) {
      if (!dateMap[s.date]) dateMap[s.date] = { planejado: 0, realizado: 0, acumPlan: 0, acumReal: 0 };
      dateMap[s.date].planejado += s.areaPlanned;
      dateMap[s.date].acumPlan = s.accumulated;
    }

    // Fill actual
    const sortedRecords = [...records].sort((a, b) => a.harvest_date.localeCompare(b.harvest_date));
    let acumReal = 0;
    const dateActual: Record<string, number> = {};
    for (const r of sortedRecords) {
      dateActual[r.harvest_date] = (dateActual[r.harvest_date] || 0) + Number(r.area_harvested_ha);
    }
    for (const [d, area] of Object.entries(dateActual).sort(([a], [b]) => a.localeCompare(b))) {
      if (!dateMap[d]) dateMap[d] = { planejado: 0, realizado: 0, acumPlan: 0, acumReal: 0 };
      dateMap[d].realizado = area;
      acumReal += area;
      dateMap[d].acumReal = acumReal;
    }

    // Forward fill acumReal
    const allDates = Object.keys(dateMap).sort();
    let lastAcumReal = 0;
    let lastAcumPlan = 0;
    for (const d of allDates) {
      if (dateMap[d].acumReal > 0) lastAcumReal = dateMap[d].acumReal;
      else dateMap[d].acumReal = lastAcumReal;
      if (dateMap[d].acumPlan > 0) lastAcumPlan = dateMap[d].acumPlan;
      else dateMap[d].acumPlan = lastAcumPlan;
    }

    return allDates.map(d => ({
      date: formatDateBR(d),
      planejado: Math.round(dateMap[d].planejado * 100) / 100,
      realizado: Math.round(dateMap[d].realizado * 100) / 100,
      acumPlan: Math.round(dateMap[d].acumPlan * 100) / 100,
      acumReal: Math.round(dateMap[d].acumReal * 100) / 100,
    }));
  }, [schedule, records]);

  // Gleba progress
  const glebaProgress = useMemo(() => {
    if (glebas.length === 0) return [];
    return glebas.map((g: any) => {
      const glebaRecords = records.filter(r => r.gleba_id === g.id);
      const harvested = glebaRecords.reduce((s, r) => s + Number(r.area_harvested_ha), 0);
      const tons = glebaRecords.reduce((s, r) => s + Number(r.total_weight_tons), 0);
      const loads = glebaRecords.reduce((s, r) => s + r.loads_count, 0);
      const area = g.area_ha || 0;
      let moistAvg = 0;
      if (harvested > 0) {
        moistAvg = glebaRecords.reduce((s, r) => s + Number(r.avg_moisture_pct) * Number(r.area_harvested_ha), 0) / harvested;
      }
      const pct = area > 0 ? (harvested / area) * 100 : 0;
      const status = pct >= 100 ? "done" : pct > 0 ? "progress" : "pending";
      return { id: g.id, name: g.name, area, harvested, pct, tons, loads, moistAvg, status };
    });
  }, [glebas, records]);

  const glebaMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const g of glebas) m[g.id] = g.name;
    return m;
  }, [glebas]);

  const canSubmit = formDate && formArea && formMoisture && formLoads && formWeight && (glebas.length === 0 || formGleba);

  return (
    <div className="space-y-6">
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <DashCard icon={<TrendingUp className="h-4 w-4" />} title="Progresso" value={`${stats.totalArea.toFixed(1)} / ${femaleArea} ha`} subtitle={`${stats.progressPct.toFixed(1)}%`} progress={stats.progressPct} />
        <DashCard icon={<Wheat className="h-4 w-4" />} title="Toneladas" value={`${stats.totalTons.toFixed(1)} ton`} />
        <DashCard icon={<Package className="h-4 w-4" />} title="Sacos" value={`${Math.round(stats.totalBags)} sc`} subtitle={`${bagWeightKg} kg/sc`} />
        <DashCard icon={<BarChart3 className="h-4 w-4" />} title="Média ton/carga" value={stats.avgTonPerLoad > 0 ? `${stats.avgTonPerLoad.toFixed(2)} ton` : "—"} />
        <DashCard icon={<Truck className="h-4 w-4" />} title="Total cargas" value={`${stats.totalLoads}`} />
        <DashCard icon={<Droplets className="h-4 w-4" />} title="Umidade média" value={stats.moistureAvg > 0 ? `${stats.moistureAvg.toFixed(1)}%` : "—"} />
        <DashCard icon={<Clock className="h-4 w-4" />} title="Projeção" value={stats.projectionLabel} />
      </div>

      {/* CHART */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Planejado × Realizado</CardTitle>
              {glebas.length > 0 && (
                <Button size="sm" variant={chartViewGleba ? "default" : "outline"} className="text-xs h-7" onClick={() => setChartViewGleba(!chartViewGleba)}>
                  Visão por gleba
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} label={{ value: "ha/dia", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} label={{ value: "ha acum.", angle: 90, position: "insideRight", style: { fontSize: 10 } }} />
                <RTooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="planejado" fill="hsl(var(--muted-foreground) / 0.3)" name="Planejado/dia" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="realizado" fill="hsl(142, 71%, 35%)" name="Realizado/dia" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="acumPlan" stroke="#9E9E9E" strokeDasharray="5 5" name="Acum. planejado" dot={false} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="acumReal"
                  stroke={stats.totalArea < (schedule[schedule.length - 1]?.accumulated || 0) * 0.9 ? "#EF4444" : "#16A34A"}
                  strokeWidth={2}
                  name="Acum. realizado"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* FORM BUTTON + DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2"><Plus className="h-4 w-4" /> Registrar Colheita do Dia</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Colheita</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="h-8 text-sm" />
              </div>
              {glebas.length > 0 && (
                <div>
                  <Label className="text-xs">Gleba *</Label>
                  <Select value={formGleba} onValueChange={setFormGleba}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{glebas.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Área colhida (ha) *</Label>
                <Input type="number" step="0.01" value={formArea} onChange={e => setFormArea(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Umidade média (%) *</Label>
                <Input type="number" step="0.1" value={formMoisture} onChange={e => setFormMoisture(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Nº cargas *</Label>
                <Input type="number" value={formLoads} onChange={e => setFormLoads(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Peso total (ton) *</Label>
                <Input type="number" step="0.001" value={formWeight} onChange={e => setFormWeight(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Ton/carga</Label>
                <Input value={weightPerLoad} readOnly className="h-8 text-sm bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Colhedora / máquina</Label>
                <Input value={formHarvester} onChange={e => setFormHarvester(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Veículo transporte</Label>
                <Input value={formVehicle} onChange={e => setFormVehicle(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Destino / UBS</Label>
                <Input value={formDestination} onChange={e => setFormDestination(e.target.value)} className="h-8 text-sm" placeholder="UBS Uberlândia" />
              </div>
              <div>
                <Label className="text-xs">Ticket / romaneio nº</Label>
                <Input value={formTicket} onChange={e => setFormTicket(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="text-sm" rows={2} />
            </div>
            <Button className="w-full" onClick={() => insertMut.mutate()} disabled={!canSubmit || insertMut.isPending}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TABLE */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Registros de Colheita</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {glebas.length > 0 && (
                <>
                  <Select value={filterGleba} onValueChange={setFilterGleba}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas glebas</SelectItem>
                      {glebas.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant={groupByGleba ? "default" : "outline"} className="text-xs h-7" onClick={() => setGroupByGleba(!groupByGleba)}>
                    Agrupar por gleba
                  </Button>
                </>
              )}
              <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="h-7 text-xs w-28" placeholder="De" />
              <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="h-7 text-xs w-28" placeholder="Até" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {groupByGleba && glebas.length > 0 ? (
              <div className="space-y-0">
                {glebas.map((g: any, gi: number) => {
                  const glebaRecs = filtered.filter(r => r.gleba_id === g.id);
                  const glebaHarvested = glebaRecs.reduce((s, r) => s + Number(r.area_harvested_ha), 0);
                  const glebaTons = glebaRecs.reduce((s, r) => s + Number(r.total_weight_tons), 0);
                  const glebaArea = g.area_ha || 0;
                  const pct = glebaArea > 0 ? (glebaHarvested / glebaArea) * 100 : 0;
                  return (
                    <div key={g.id}>
                      <div className="px-4 py-2 bg-muted/60 border-y flex items-center gap-3 text-sm font-medium" style={{ borderLeftColor: GLEBA_COLORS[gi % GLEBA_COLORS.length], borderLeftWidth: 4 }}>
                        <span>{g.name} ({glebaArea} ha)</span>
                        <span className="text-muted-foreground">Colhido: {glebaHarvested.toFixed(1)} ha ({pct.toFixed(0)}%)</span>
                        <span className="text-muted-foreground">Ton: {glebaTons.toFixed(1)}</span>
                      </div>
                      <RecordTable records={glebaRecs} glebaMap={glebaMap} onDelete={(id) => deleteMut.mutate(id)} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <RecordTable records={filtered} glebaMap={glebaMap} onDelete={(id) => deleteMut.mutate(id)} />
            )}
          </div>
          {/* Footer totals */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t bg-muted/30 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
              <span><strong>Registros:</strong> {filtered.length}</span>
              <span><strong>Área:</strong> {filtered.reduce((s, r) => s + Number(r.area_harvested_ha), 0).toFixed(1)} ha</span>
              <span><strong>Ton:</strong> {filtered.reduce((s, r) => s + Number(r.total_weight_tons), 0).toFixed(1)}</span>
              <span><strong>Cargas:</strong> {filtered.reduce((s, r) => s + r.loads_count, 0)}</span>
              <span><strong>Umidade média:</strong> {(() => {
                const ta = filtered.reduce((s, r) => s + Number(r.area_harvested_ha), 0);
                return ta > 0 ? (filtered.reduce((s, r) => s + Number(r.avg_moisture_pct) * Number(r.area_harvested_ha), 0) / ta).toFixed(1) : "—";
              })()}%</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GLEBA PROGRESS CARDS */}
      {glebas.length > 0 && glebaProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso por Gleba</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {glebaProgress.map((g, i) => (
                <Card key={g.id} className="border" style={{ borderLeftColor: GLEBA_COLORS[i % GLEBA_COLORS.length], borderLeftWidth: 4 }}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{g.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        g.status === "done" ? "border-green-500 text-green-700" :
                        g.status === "progress" ? "border-blue-500 text-blue-700" :
                        "border-muted-foreground text-muted-foreground"
                      }`}>
                        {g.status === "done" ? "✅ Concluída" : g.status === "progress" ? "🔄 Em andamento" : "⏳ Não iniciada"}
                      </Badge>
                    </div>
                    <Progress value={Math.min(g.pct, 100)} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Área: {g.area} ha</span>
                      <span>Colhido: {g.harvested.toFixed(1)} ha ({g.pct.toFixed(0)}%)</span>
                      <span>Ton: {g.tons.toFixed(1)}</span>
                      <span>Cargas: {g.loads}</span>
                      <span>Umid. média: {g.moistAvg > 0 ? `${g.moistAvg.toFixed(1)}%` : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sub-components

function DashCard({ icon, title, value, subtitle, progress: pVal }: {
  icon: React.ReactNode; title: string; value: string; subtitle?: string; progress?: number;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">{icon}<span className="text-[10px] uppercase tracking-wide">{title}</span></div>
        <p className="text-base font-bold truncate">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        {pVal !== undefined && <Progress value={Math.min(pVal, 100)} className="h-1.5 mt-1" />}
      </CardContent>
    </Card>
  );
}

function RecordTable({ records, glebaMap, onDelete }: { records: HarvestRecord[]; glebaMap: Record<string, string>; onDelete: (id: string) => void }) {
  if (records.length === 0) {
    return <div className="text-center text-muted-foreground text-sm py-8">Nenhum registro de colheita.</div>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Data</TableHead>
          <TableHead className="text-xs">Gleba</TableHead>
          <TableHead className="text-xs text-right">Área (ha)</TableHead>
          <TableHead className="text-xs text-right">Umidade%</TableHead>
          <TableHead className="text-xs text-right">Cargas</TableHead>
          <TableHead className="text-xs text-right">Ton</TableHead>
          <TableHead className="text-xs text-right">Ton/Carga</TableHead>
          <TableHead className="text-xs">Colhedora</TableHead>
          <TableHead className="text-xs">Destino</TableHead>
          <TableHead className="text-xs">Ticket</TableHead>
          <TableHead className="text-xs w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map(r => (
          <TableRow key={r.id}>
            <TableCell className="text-sm">{formatDateBR(r.harvest_date)}</TableCell>
            <TableCell className="text-sm">
              {r.gleba_id && glebaMap[r.gleba_id] ? <Badge variant="outline" className="text-[10px]">{glebaMap[r.gleba_id]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
            </TableCell>
            <TableCell className="text-sm text-right">{Number(r.area_harvested_ha).toFixed(1)}</TableCell>
            <TableCell className="text-sm text-right">{Number(r.avg_moisture_pct).toFixed(1)}</TableCell>
            <TableCell className="text-sm text-right">{r.loads_count}</TableCell>
            <TableCell className="text-sm text-right font-medium">{Number(r.total_weight_tons).toFixed(2)}</TableCell>
            <TableCell className="text-sm text-right">{r.weight_per_load_tons ? Number(r.weight_per_load_tons).toFixed(3) : "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">{r.harvester_id || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{r.delivery_destination || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.ticket_number || "—"}</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => onDelete(r.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
