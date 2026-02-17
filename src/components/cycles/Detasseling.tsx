import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Trash2, AlertTriangle, Info, Camera } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import DetasselingFormDialog from "./detasseling/DetasselingFormDialog";
import DetasselingCharts from "./detasseling/DetasselingCharts";
import {
  PASS_TYPES, getPassLabel, getMethodLabel, getShiftLabel,
  getPassBadgeColor, getMethodBadgeColor,
} from "./detasseling/constants";

interface Props {
  cycleId: string;
  orgId: string;
  contractNumber?: string | null;
  pivotName: string;
  hybridName: string;
  cooperatorName?: string;
  femaleArea: number;
}

export default function Detasseling({ cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, femaleArea }: Props) {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [filterPass, setFilterPass] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["detasseling", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("detasseling_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("operation_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "detasseling_records", _record_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Registro excluído!");
    qc.invalidateQueries({ queryKey: ["detasseling", cycleId] });
  };

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r: any) => {
      if (filterPass !== "all" && r.pass_type !== filterPass) return false;
      if (filterMethod !== "all" && r.method !== filterMethod) return false;
      return true;
    });
  }, [records, filterPass, filterMethod]);

  // Dashboard calculations
  const stats = useMemo(() => {
    if (!records.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    const firstPassArea = records.filter((r: any) => r.pass_type === "first_pass").reduce((s: number, r: any) => s + Number(r.area_worked_ha), 0);
    const progressPct = femaleArea > 0 ? Math.min((firstPassArea / femaleArea) * 100, 100) : 0;

    // Current pass
    const passOrder = ["first_pass", "second_pass", "third_pass", "repass_1", "repass_2", "repass_3", "repass_4", "repass_5"];
    const latestPass = records.reduce((latest: string, r: any) => {
      const ri = passOrder.indexOf(r.pass_type);
      const li = passOrder.indexOf(latest);
      return ri > li ? r.pass_type : latest;
    }, records[0].pass_type);
    const currentPassArea = records.filter((r: any) => r.pass_type === latestPass).reduce((s: number, r: any) => s + Number(r.area_worked_ha), 0);

    // Today's ha
    const todayHa = records.filter((r: any) => r.operation_date === today).reduce((s: number, r: any) => s + Number(r.area_worked_ha), 0);

    // Distinct days
    const distinctDays = new Set(records.map((r: any) => r.operation_date)).size;
    const firstDate = records[0].operation_date;
    const lastDate = records[records.length - 1].operation_date;

    // Efficiency
    const manualRecords = records.filter((r: any) => r.yield_per_person_ha != null);
    const avgYieldPerson = manualRecords.length > 0
      ? manualRecords.reduce((s: number, r: any) => s + Number(r.yield_per_person_ha), 0) / manualRecords.length : null;
    const mechRecords = records.filter((r: any) => r.machine_yield_ha_h != null);
    const avgYieldMachine = mechRecords.length > 0
      ? mechRecords.reduce((s: number, r: any) => s + Number(r.machine_yield_ha_h), 0) / mechRecords.length : null;

    // Alerts
    const daysSinceLast = differenceInDays(new Date(), parseISO(lastDate));
    const lastPassRecords = records.filter((r: any) => r.pass_type === latestPass);
    const avgPctTirado = lastPassRecords.reduce((s: number, r: any) => s + Number(r.pct_detasseled_this_pass), 0) / lastPassRecords.length;
    const firstPassComplete = firstPassArea >= femaleArea * 0.95;

    return {
      progressPct, firstPassArea, latestPass, currentPassArea, todayHa,
      distinctDays, firstDate, avgYieldPerson, avgYieldMachine,
      daysSinceLast, avgPctTirado, firstPassComplete,
    };
  }, [records, femaleArea]);

  // Pass summary cards
  const passSummaries = useMemo(() => {
    const map = new Map<string, any[]>();
    records.forEach((r: any) => {
      if (!map.has(r.pass_type)) map.set(r.pass_type, []);
      map.get(r.pass_type)!.push(r);
    });
    return Array.from(map.entries()).map(([pass, recs]) => {
      const dates = recs.map((r: any) => r.operation_date).sort();
      const totalArea = recs.reduce((s: number, r: any) => s + Number(r.area_worked_ha), 0);
      const avgPct = recs.reduce((s: number, r: any) => s + Number(r.pct_detasseled_this_pass), 0) / recs.length;
      const avgRemain = recs.reduce((s: number, r: any) => s + Number(r.pct_remaining_after), 0) / recs.length;
      const methods = new Set(recs.map((r: any) => r.method));
      const mainMethod = Array.from(methods)[0];
      const teams = recs.filter((r: any) => r.team_size).map((r: any) => Number(r.team_size));
      const avgTeam = teams.length > 0 ? teams.reduce((s, t) => s + t, 0) / teams.length : null;
      const yields = recs.filter((r: any) => r.yield_per_person_ha).map((r: any) => Number(r.yield_per_person_ha));
      const avgYield = yields.length > 0 ? yields.reduce((s, y) => s + y, 0) / yields.length : null;
      const ncCount = recs.filter((r: any) => r.non_conformities).length;
      return {
        pass, label: getPassLabel(pass),
        period: `${format(parseISO(dates[0]), "dd/MM")} - ${format(parseISO(dates[dates.length - 1]), "dd/MM")}`,
        days: new Set(dates).size, totalArea, avgPct, avgRemain, mainMethod: getMethodLabel(mainMethod),
        avgTeam, avgYield, ncCount,
      };
    });
  }, [records]);

  // Totals for footer
  const totals = useMemo(() => {
    if (!filtered.length) return null;
    const totalArea = filtered.reduce((s: number, r: any) => s + Number(r.area_worked_ha), 0);
    const avgPct = filtered.reduce((s: number, r: any) => s + Number(r.pct_detasseled_this_pass), 0) / filtered.length;
    const avgRemain = filtered.reduce((s: number, r: any) => s + Number(r.pct_remaining_after), 0) / filtered.length;
    return { totalArea, avgPct, avgRemain };
  }, [filtered]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Contrato: <strong>{contractNumber || pivotName}</strong></span>
        <span>•</span>
        <span>Híbrido: <strong>{hybridName}</strong></span>
        {cooperatorName && <><span>•</span><span>Cooperado: <strong>{cooperatorName}</strong></span></>}
        <span>•</span>
        <span>Pivô: <strong>{pivotName}</strong></span>
        <span>•</span>
        <span>Área fêmea: <strong>{femaleArea} ha</strong></span>
      </div>

      {/* Dashboard Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Progress */}
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Progresso Geral</p>
                <div className="relative w-16 h-16 mx-auto my-2">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={stats.progressPct >= 90 ? "#22c55e" : stats.progressPct >= 50 ? "#eab308" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${stats.progressPct}, 100`}
                    />
                    <text x="18" y="20.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">
                      {stats.progressPct.toFixed(0)}%
                    </text>
                  </svg>
                </div>
                <p className="text-xs">{stats.firstPassArea.toFixed(1)} / {femaleArea} ha</p>
              </CardContent>
            </Card>

            {/* Current Pass */}
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Passada Atual</p>
                <Badge className={`mt-2 text-sm ${getPassBadgeColor(stats.latestPass)}`}>{getPassLabel(stats.latestPass)}</Badge>
                <p className="text-xs mt-2">{stats.currentPassArea.toFixed(1)} ha realizados</p>
              </CardContent>
            </Card>

            {/* Today */}
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Hectares Hoje</p>
                <p className="text-2xl font-bold mt-1">{stats.todayHa.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">ha</p>
              </CardContent>
            </Card>

            {/* Days */}
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Dias de Operação</p>
                <p className="text-2xl font-bold mt-1">{stats.distinctDays}</p>
                <p className="text-xs text-muted-foreground">Início: {format(parseISO(stats.firstDate), "dd/MM/yy")}</p>
              </CardContent>
            </Card>

            {/* Efficiency */}
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Eficiência</p>
                {stats.avgYieldPerson && <p className="text-sm font-semibold mt-1">{stats.avgYieldPerson.toFixed(2)} ha/pessoa/dia</p>}
                {stats.avgYieldMachine && <p className="text-sm font-semibold">{stats.avgYieldMachine.toFixed(2)} ha/hora máq.</p>}
                {!stats.avgYieldPerson && !stats.avgYieldMachine && <p className="text-sm text-muted-foreground mt-1">—</p>}
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div className="space-y-2">
            {stats.daysSinceLast > 2 && (
              <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800 dark:text-amber-300">{stats.daysSinceLast} dias sem despendoamento!</span>
              </div>
            )}
            {stats.avgPctTirado < 90 && (
              <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800 dark:text-amber-300">Eficiência baixa ({stats.avgPctTirado.toFixed(1)}%). Considerar repasse.</span>
              </div>
            )}
            {stats.firstPassComplete && stats.latestPass === "first_pass" && (
              <div className="flex items-center gap-2 text-sm p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 dark:text-blue-300">1ª passada concluída. Planejar 2ª passada.</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Register Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Operações</h3>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registrar Operação
        </Button>
      </div>

      {/* Filters */}
      {records.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Select value={filterPass} onValueChange={setFilterPass}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Passada" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas passadas</SelectItem>
              {PASS_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMethod} onValueChange={setFilterMethod}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Método" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos métodos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="mechanical_detasseler">Mecânico — Despendoadeira</SelectItem>
              <SelectItem value="mechanical_roller">Mecânico — Rolo</SelectItem>
              <SelectItem value="combined">Combinado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Passada</TableHead>
                    <TableHead className="text-xs">Turno</TableHead>
                    <TableHead className="text-xs text-right">Área (ha)</TableHead>
                    <TableHead className="text-xs">Método</TableHead>
                    <TableHead className="text-xs text-right">Equipe</TableHead>
                    <TableHead className="text-xs text-right">Rend.</TableHead>
                    <TableHead className="text-xs text-right">% Tirado</TableHead>
                    <TableHead className="text-xs text-right">% Reman.</TableHead>
                    <TableHead className="text-xs">NC</TableHead>
                    <TableHead className="text-xs">Fotos</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => {
                    const remain = Number(r.pct_remaining_after);
                    const rowBg = r.non_conformities ? "bg-red-50 dark:bg-red-950/30" : remain > 1 ? "bg-red-50/50 dark:bg-red-950/20" : remain > 0.5 ? "bg-yellow-50 dark:bg-yellow-950/20" : "";
                    return (
                      <TableRow key={r.id} className={rowBg}>
                        <TableCell className="text-xs">{format(parseISO(r.operation_date), "dd/MM/yy")}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${getPassBadgeColor(r.pass_type)}`}>{getPassLabel(r.pass_type)}</Badge></TableCell>
                        <TableCell className="text-xs">{r.shift ? getShiftLabel(r.shift) : "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{Number(r.area_worked_ha).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${getMethodBadgeColor(r.method)}`}>{getMethodLabel(r.method).split(" — ")[0]}</Badge></TableCell>
                        <TableCell className="text-xs text-right">{r.team_size || "—"}</TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {r.yield_per_person_ha ? `${Number(r.yield_per_person_ha).toFixed(1)}` : r.machine_yield_ha_h ? `${Number(r.machine_yield_ha_h).toFixed(1)}` : "—"}
                        </TableCell>
                        <TableCell className={`text-xs text-right font-mono font-semibold ${Number(r.pct_detasseled_this_pass) >= 95 ? "text-green-600" : Number(r.pct_detasseled_this_pass) >= 85 ? "text-yellow-600" : "text-red-600"}`}>
                          {Number(r.pct_detasseled_this_pass).toFixed(1)}%
                        </TableCell>
                        <TableCell className={`text-xs text-right font-mono font-semibold ${remain <= 0.3 ? "text-green-600" : remain <= 0.5 ? "text-yellow-600" : remain <= 1 ? "text-orange-600" : "text-red-600"}`}>
                          {remain.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-xs">{r.non_conformities ? <Badge variant="destructive" className="text-xs">NC</Badge> : "—"}</TableCell>
                        <TableCell className="text-xs">{r.photos?.length ? <Camera className="h-3.5 w-3.5 text-muted-foreground" /> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {totals && (
                  <tfoot>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell className="text-xs" colSpan={3}>Totais / Médias</TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold">{totals.totalArea.toFixed(2)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                      <TableCell className="text-xs text-right font-mono">{totals.avgPct.toFixed(1)}%</TableCell>
                      <TableCell className="text-xs text-right font-mono">{totals.avgRemain.toFixed(2)}%</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhuma operação de despendoamento registrada. Clique em "Registrar Operação" para começar.
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {records.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Gráficos Operacionais</h3>
          <DetasselingCharts records={records} femaleArea={femaleArea} />
        </div>
      )}

      {/* Pass Summary */}
      {passSummaries.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Resumo por Passada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passSummaries.map((ps) => (
              <Card key={ps.pass}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className={getPassBadgeColor(ps.pass)}>{ps.label}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Período</span><span>{ps.period}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Dias</span><span>{ps.days}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Área coberta</span><span>{ps.totalArea.toFixed(2)} ha</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Método principal</span><span>{ps.mainMethod}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">% Tirado médio</span><span className={ps.avgPct >= 95 ? "text-green-600" : ps.avgPct >= 85 ? "text-yellow-600" : "text-red-600"}>{ps.avgPct.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">% Reman. médio</span><span className={ps.avgRemain <= 0.5 ? "text-green-600" : ps.avgRemain <= 1 ? "text-orange-600" : "text-red-600"}>{ps.avgRemain.toFixed(2)}%</span></div>
                  {ps.avgTeam && <div className="flex justify-between"><span className="text-muted-foreground">Equipe média</span><span>{ps.avgTeam.toFixed(0)} pessoas</span></div>}
                  {ps.avgYield && <div className="flex justify-between"><span className="text-muted-foreground">Rendimento</span><span>{ps.avgYield.toFixed(2)} ha/pessoa/dia</span></div>}
                  {ps.ncCount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">NC</span><Badge variant="destructive" className="text-xs">{ps.ncCount}</Badge></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <DetasselingFormDialog open={formOpen} onOpenChange={setFormOpen} cycleId={cycleId} orgId={orgId} />
    </div>
  );
}
