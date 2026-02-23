import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Calendar, Layers, Timer } from "lucide-react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  cycleId: string;
  detasselingDap: number;
}

interface GlebaForecast {
  glebaId: string;
  glebaName: string;
  areaHa: number;
  plantingPlanned: string | null;
  detasselingPlanned: string | null;
  plantingReal: string | null;
  detasselingEstimated: string | null;
  isConfirmed: boolean;
  daysRemaining: number | null;
  hasDetasselingRecords: boolean;
  firstDetasselingDate: string | null;
}

export default function DetasselingForecast({ cycleId, detasselingDap }: Props) {
  const sb = supabase as any;

  const { data: glebas = [] } = useQuery({
    queryKey: ["forecast-glebas", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("pivot_glebas").select("id, name, area_ha, parent_type")
        .eq("cycle_id", cycleId).eq("parent_type", "female").is("deleted_at", null).order("name");
      return data || [];
    },
  });

  const { data: plantingPlans = [] } = useQuery({
    queryKey: ["forecast-planting-plan", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_plan").select("gleba_id, planned_date, parent_type")
        .eq("cycle_id", cycleId).eq("parent_type", "female").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: plantingActuals = [] } = useQuery({
    queryKey: ["forecast-planting-actual", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("planting_actual").select("gleba_id, planting_date, type")
        .eq("cycle_id", cycleId).eq("type", "female").is("deleted_at", null);
      return data || [];
    },
  });

  const { data: detRecords = [] } = useQuery({
    queryKey: ["forecast-detasseling-records", cycleId],
    queryFn: async () => {
      const { data } = await sb.from("detasseling_records").select("gleba_id, operation_date")
        .eq("cycle_id", cycleId).is("deleted_at", null).order("operation_date", { ascending: true });
      return data || [];
    },
  });

  const forecasts = useMemo<GlebaForecast[]>(() => {
    if (!glebas.length) return [];
    const today = new Date();

    return glebas.map((g: any) => {
      const plan = plantingPlans.find((p: any) => p.gleba_id === g.id);
      const actual = plantingActuals.find((a: any) => a.gleba_id === g.id);
      const glebaDetRecords = detRecords.filter((d: any) => d.gleba_id === g.id);

      const plantingPlanned = plan?.planned_date || null;
      const plantingReal = actual?.planting_date || null;

      const detasselingPlanned = plantingPlanned
        ? format(addDays(parseISO(plantingPlanned), detasselingDap), "yyyy-MM-dd")
        : null;

      const baseDate = plantingReal || plantingPlanned;
      const detasselingEstimated = baseDate
        ? format(addDays(parseISO(baseDate), detasselingDap), "yyyy-MM-dd")
        : null;

      const daysRemaining = detasselingEstimated
        ? differenceInDays(parseISO(detasselingEstimated), today)
        : null;

      return {
        glebaId: g.id,
        glebaName: g.name,
        areaHa: g.area_ha || 0,
        plantingPlanned,
        detasselingPlanned,
        plantingReal,
        detasselingEstimated,
        isConfirmed: !!plantingReal,
        daysRemaining,
        hasDetasselingRecords: glebaDetRecords.length > 0,
        firstDetasselingDate: glebaDetRecords[0]?.operation_date || null,
      };
    });
  }, [glebas, plantingPlans, plantingActuals, detRecords, detasselingDap]);

  if (!forecasts.length) return null;

  const fmtD = (d: string | null) => d ? format(parseISO(d), "dd/MM/yy") : "—";

  // Cards data
  const pendingGlebas = forecasts.filter(f => !f.hasDetasselingRecords && f.detasselingEstimated);
  const nextGleba = pendingGlebas
    .filter(f => f.daysRemaining != null)
    .sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999))[0];

  const glebasWithDates = forecasts.filter(f => f.detasselingEstimated);
  const sortedDates = glebasWithDates
    .map(f => f.detasselingEstimated!)
    .sort();
  const windowStart = sortedDates[0];
  const windowEnd = sortedDates[sortedDates.length - 1];

  const totalGlebas = forecasts.length;
  const glebasStarted = forecasts.filter(f => f.hasDetasselingRecords).length;

  // Alerts
  const overdueGlebas = forecasts.filter(f =>
    !f.hasDetasselingRecords && f.daysRemaining != null && f.daysRemaining < 0
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        📅 Previsão de Despendoamento por Gleba
      </h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Próximo despendoamento</p>
            {nextGleba ? (
              <>
                <p className="text-sm font-semibold mt-1">{nextGleba.glebaName}</p>
                <p className="text-xs">{fmtD(nextGleba.detasselingEstimated)} ({nextGleba.daysRemaining} dias)</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">—</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Glebas para despendoar</p>
            <p className="text-2xl font-bold mt-1">{glebasStarted} <span className="text-sm font-normal text-muted-foreground">de {totalGlebas}</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Janela total</p>
            {windowStart && windowEnd ? (
              <p className="text-sm font-semibold mt-1">{fmtD(windowStart)} a {fmtD(windowEnd)}</p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueGlebas.map(g => (
        <div key={g.glebaId} className="flex items-center gap-2 text-sm p-3 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">
            Gleba {g.glebaName} deveria ter iniciado despendoamento há {Math.abs(g.daysRemaining!)} dias!
          </span>
        </div>
      ))}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Gleba</TableHead>
                  <TableHead className="text-xs text-right">Área (ha)</TableHead>
                  <TableHead className="text-xs">Plantio Plan.</TableHead>
                  <TableHead className="text-xs">Desp. Plan.</TableHead>
                  <TableHead className="text-xs">Plantio Real</TableHead>
                  <TableHead className="text-xs">Desp. Estimado</TableHead>
                  <TableHead className="text-xs">Dias restantes</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecasts.map(f => (
                  <TableRow key={f.glebaId}>
                    <TableCell className="text-xs font-medium">{f.glebaName}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{f.areaHa.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtD(f.plantingPlanned)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtD(f.detasselingPlanned)}</TableCell>
                    <TableCell className="text-xs">
                      {f.plantingReal ? (
                        <span className="font-semibold">{fmtD(f.plantingReal)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.detasselingEstimated ? (
                        <span className={f.isConfirmed ? "font-semibold" : "text-muted-foreground"}>
                          {fmtD(f.detasselingEstimated)}
                          {" "}
                          {f.isConfirmed ? (
                            <Badge variant="outline" className="text-xs ml-1 border-green-500 text-green-700">🟢 Confirmado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs ml-1">⏳ Estimado</Badge>
                          )}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <DaysRemainingCell
                        daysRemaining={f.daysRemaining}
                        hasRecords={f.hasDetasselingRecords}
                        firstDate={f.firstDetasselingDate}
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      <StatusCell
                        daysRemaining={f.daysRemaining}
                        hasRecords={f.hasDetasselingRecords}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DaysRemainingCell({ daysRemaining, hasRecords, firstDate }: {
  daysRemaining: number | null;
  hasRecords: boolean;
  firstDate: string | null;
}) {
  if (hasRecords && firstDate) {
    return <span className="text-green-600 font-medium">✅ Iniciado em {format(parseISO(firstDate), "dd/MM")}</span>;
  }
  if (daysRemaining == null) return <span className="text-muted-foreground">—</span>;
  if (daysRemaining === 0) return <span className="text-destructive font-bold animate-pulse">HOJE</span>;
  if (daysRemaining > 0) return <span className="text-blue-600 font-medium">{daysRemaining} dias</span>;
  return <span className="text-destructive font-medium">Há {Math.abs(daysRemaining)} dias</span>;
}

function StatusCell({ daysRemaining, hasRecords }: {
  daysRemaining: number | null;
  hasRecords: boolean;
}) {
  if (hasRecords) {
    return <Badge variant="outline" className="text-xs border-green-500 text-green-700">✅ Em andamento</Badge>;
  }
  if (daysRemaining == null) return <Badge variant="outline" className="text-xs">⏳ Aguardando</Badge>;
  if (daysRemaining < 0) {
    return <Badge variant="destructive" className="text-xs">🔴 ATRASADO {Math.abs(daysRemaining)}d</Badge>;
  }
  if (daysRemaining <= 10) {
    return <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">📅 Em {daysRemaining} dias</Badge>;
  }
  return <Badge variant="outline" className="text-xs">⏳ Aguardando</Badge>;
}
