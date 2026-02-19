import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Loader2, Trash2, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import type { YieldEstimateProps, YieldEstimate, SamplePoint, EarSample } from "./types";
import { calcPointGrossYield, calcNetYield, getPointColor, getReliability } from "./utils";
import SamplePointForm from "./SamplePointForm";
import YieldEstimateMap from "./YieldEstimateMap";
import YieldCalculation from "./YieldCalculation";
import YieldDashboard from "./YieldDashboard";
import YieldCharts from "./YieldCharts";
import YieldWaterfallChart from "./YieldWaterfallChart";

export default function YieldEstimateTab({
  cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName,
  femaleArea, pivotId, expectedProductivity, defaultRowSpacing,
}: YieldEstimateProps) {
  const queryClient = useQueryClient();
  const [expandedEstimateId, setExpandedEstimateId] = useState<string | null>(null);

  // Fetch pivot coordinates
  const { data: pivot } = useQuery({
    queryKey: ["pivot-coords", pivotId],
    queryFn: async () => {
      if (!pivotId) return null;
      const { data } = await (supabase as any).from("pivots").select("latitude, longitude, area_ha").eq("id", pivotId).single();
      return data;
    },
    enabled: !!pivotId,
  });

  // Fetch all estimates for this cycle
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["yield-estimates", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("yield_estimates")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("estimate_number", { ascending: true });
      if (error) throw error;
      return data as YieldEstimate[];
    },
  });

  // Create new estimate
  const createEstimateMutation = useMutation({
    mutationFn: async () => {
      const nextNum = estimates.length + 1;
      const { data, error } = await (supabase as any).from("yield_estimates").insert({
        cycle_id: cycleId,
        org_id: orgId,
        estimate_number: nextNum,
        estimate_date: new Date().toISOString().split("T")[0],
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["yield-estimates", cycleId] });
      setExpandedEstimateId(data.id);
      toast.success(`${estimates.length + 1}ª estimativa criada!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Export Excel
  const exportExcel = (estimate: YieldEstimate, points: SamplePoint[], aggregates: any) => {
    if (!aggregates || points.length === 0) return;
    const wb = XLSX.utils.book_new();
    const summary = [
      ["Estimativa de Produtividade"],
      ["Contrato", contractNumber || pivotName],
      ["Híbrido", hybridName],
      ["Cooperado", cooperatorName || ""],
      ["Área fêmea (ha)", femaleArea],
      [""],
      ["Produtividade líquida (kg/ha)", Math.round(aggregates.netYield)],
      ["Produtividade bruta (kg/ha)", Math.round(aggregates.grossYield)],
      ["Produção total (ton)", aggregates.totalTons.toFixed(2)],
      ["Produção total (sacos)", Math.round(aggregates.totalBags)],
      ["Pontos amostrados", points.length],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Resumo");
    const pointsData = points.map((p) => ({
      Ponto: p.point_number, Data: p.sample_date, Latitude: p.latitude, Longitude: p.longitude,
      Posição: p.pivot_position || "", "Espigas/ha": Math.round(p.ears_per_ha || 0),
      "Grãos/espiga": (p.avg_kernels_per_ear || 0).toFixed(0), "Umidade %": p.sample_moisture_pct,
      "Prod. bruta (kg/ha)": Math.round(p.point_gross_yield_kg_ha || 0),
      Condição: p.plant_condition || "", Obs: p.notes || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pointsData), "Pontos");
    const earsData: any[] = [];
    points.forEach((p) => {
      (p.ear_samples || []).forEach((e) => {
        earsData.push({ Ponto: p.point_number, Espiga: e.ear_number, Fileiras: e.kernel_rows, "Grãos/fileira": e.kernels_per_row, "Total grãos": e.total_kernels, "Comp. (cm)": e.ear_length_cm || "" });
      });
    });
    if (earsData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(earsData), "Espigas");
    XLSX.writeFile(wb, `estimativa_${contractNumber || pivotName}_${estimate.estimate_number}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel exportado!");
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span><strong>Contrato:</strong> {contractNumber || pivotName}</span>
            <span>•</span>
            <span><strong>Híbrido:</strong> {hybridName}</span>
            {cooperatorName && <><span>•</span><span><strong>Cooperado:</strong> {cooperatorName}</span></>}
            <span>•</span>
            <span><strong>Pivô:</strong> {pivotName}</span>
            <span>•</span>
            <span><strong>Área fêmea:</strong> {femaleArea} ha</span>
            <span>•</span>
            <span><strong>Espaçamento:</strong> {defaultRowSpacing || 70} cm</span>
          </div>
        </CardContent>
      </Card>

      {/* Add new estimate button */}
      <div className="flex items-center gap-3">
        <Button onClick={() => createEstimateMutation.mutate()} disabled={createEstimateMutation.isPending}>
          <Plus className="h-4 w-4 mr-1" />Nova Estimativa
        </Button>
        {estimates.length > 0 && (
          <span className="text-sm text-muted-foreground">{estimates.length} estimativa(s) registrada(s)</span>
        )}
      </div>

      {/* Estimates list - each is expandable */}
      {estimates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Nenhuma estimativa criada ainda.</p>
            <p className="text-xs mt-1">Clique em "Nova Estimativa" para iniciar a amostragem de produtividade.</p>
          </CardContent>
        </Card>
      )}

      {estimates.map((estimate) => (
        <EstimateCard
          key={estimate.id}
          estimate={estimate}
          cycleId={cycleId}
          orgId={orgId}
          expanded={expandedEstimateId === estimate.id}
          onToggle={() => setExpandedEstimateId(expandedEstimateId === estimate.id ? null : estimate.id)}
          pivot={pivot}
          pivotName={pivotName}
          femaleArea={femaleArea}
          expectedProductivity={expectedProductivity}
          defaultRowSpacing={defaultRowSpacing || 70}
          defaultTgw={estimate.default_tgw_g ?? 300}
          onExport={exportExcel}
        />
      ))}

      {/* History table when multiple estimates */}
      {estimates.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Comparativo de Estimativas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimativa</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Espigas/ha</TableHead>
                  <TableHead className="text-right">Grãos/esp.</TableHead>
                  <TableHead className="text-right">Prod. líquida</TableHead>
                  <TableHead className="text-right">Prod. total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedEstimateId(e.id)}>
                    <TableCell className="font-medium">{e.estimate_number}ª</TableCell>
                    <TableCell>{e.estimate_date}</TableCell>
                    <TableCell className="text-right">{e.total_sample_points}</TableCell>
                    <TableCell className="text-right font-mono">{Math.round(e.avg_ears_per_ha || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{(e.avg_kernels_per_ear || 0).toFixed(0)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{Math.round(e.net_yield_kg_ha || 0).toLocaleString()} kg/ha</TableCell>
                    <TableCell className="text-right">{(e.total_production_tons || 0).toFixed(1)} ton</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Individual Estimate Card ─── */

interface EstimateCardProps {
  estimate: YieldEstimate;
  cycleId: string;
  orgId: string;
  expanded: boolean;
  onToggle: () => void;
  pivot: any;
  pivotName: string;
  femaleArea: number;
  expectedProductivity?: number;
  defaultRowSpacing: number;
  defaultTgw: number;
  onExport: (estimate: YieldEstimate, points: SamplePoint[], aggregates: any) => void;
}

function EstimateCard({
  estimate, cycleId, orgId, expanded, onToggle, pivot, pivotName,
  femaleArea, expectedProductivity, defaultRowSpacing, defaultTgw, onExport,
}: EstimateCardProps) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const moistureRef = estimate.moisture_reference_pct ?? 13;
  const tgw = estimate.default_tgw_g ?? 300;
  const dehuskingLoss = estimate.dehusking_loss_pct ?? 3;
  const classificationLoss = estimate.classification_loss_pct ?? 10;
  const otherLoss = estimate.other_loss_pct ?? 2;
  const bagWeight = estimate.bag_weight_kg ?? 20;

  const [localMoistureRef, setLocalMoistureRef] = useState(moistureRef);
  const [localDehusking, setLocalDehusking] = useState(dehuskingLoss);
  const [localClassification, setLocalClassification] = useState(classificationLoss);
  const [localOther, setLocalOther] = useState(otherLoss);
  const [localBagWeight, setLocalBagWeight] = useState(bagWeight);
  const [localFinalPms, setLocalFinalPms] = useState(estimate.final_pms_g ? String(estimate.final_pms_g) : "");

  // Fetch sample points
  const { data: points = [] } = useQuery({
    queryKey: ["yield-sample-points", estimate.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("yield_sample_points")
        .select("*")
        .eq("yield_estimate_id", estimate.id)
        .order("point_number");
      if (error) throw error;
      const pointIds = data.map((p: any) => p.id);
      if (pointIds.length === 0) return data;
      const { data: earData } = await (supabase as any)
        .from("yield_ear_samples")
        .select("*")
        .in("sample_point_id", pointIds)
        .order("ear_number");
      return data.map((p: any) => ({
        ...p,
        ear_samples: (earData || []).filter((e: any) => e.sample_point_id === p.id),
      })) as SamplePoint[];
    },
    enabled: expanded,
  });

  const aggregates = useMemo(() => {
    if (points.length === 0) return null;
    const avgEarsPerHa = points.reduce((s, p) => s + (p.ears_per_ha || 0), 0) / points.length;
    const avgKernelsPerEar = points.reduce((s, p) => s + (p.avg_kernels_per_ear || 0), 0) / points.length;
    const avgMoisture = points.reduce((s, p) => s + (p.sample_moisture_pct || 0), 0) / points.length;
    const viableEarsPctAvg = points.reduce((s, p) => s + (p.viable_ears_pct || 0), 0) / points.length;
    const usedTgw = parseFloat(localFinalPms) || tgw;
    const grossYield = calcPointGrossYield(avgEarsPerHa, avgKernelsPerEar, usedTgw, avgMoisture, localMoistureRef);
    const netYield = calcNetYield(grossYield, localDehusking, localClassification, localOther);
    const totalLossPct = 100 - (100 * (1 - localDehusking / 100) * (1 - localClassification / 100) * (1 - localOther / 100));
    return {
      avgEarsPerHa, avgKernelsPerEar, avgMoisture, viableEarsPctAvg,
      grossYield, netYield, totalLossPct,
      lostKgHa: grossYield - netYield,
      totalTons: (netYield * femaleArea) / 1000,
      totalBags: (netYield * femaleArea) / localBagWeight,
      usedTgw,
    };
  }, [points, localMoistureRef, localDehusking, localClassification, localOther, localBagWeight, localFinalPms, tgw, femaleArea]);

  const updateEstimateAggregates = async (estimateId: string) => {
    const { data: pts } = await (supabase as any).from("yield_sample_points").select("*").eq("yield_estimate_id", estimateId);
    if (!pts || pts.length === 0) return;
    const avgEars = pts.reduce((s: number, p: any) => s + (p.ears_per_ha || 0), 0) / pts.length;
    const avgKernels = pts.reduce((s: number, p: any) => s + (p.avg_kernels_per_ear || 0), 0) / pts.length;
    const avgMoist = pts.reduce((s: number, p: any) => s + (p.sample_moisture_pct || 0), 0) / pts.length;
    const usedTgw = parseFloat(localFinalPms) || tgw;
    const gross = calcPointGrossYield(avgEars, avgKernels, usedTgw, avgMoist, localMoistureRef);
    const net = calcNetYield(gross, localDehusking, localClassification, localOther);
    await (supabase as any).from("yield_estimates").update({
      avg_ears_per_ha: Math.round(avgEars),
      avg_kernels_per_ear: Math.round(avgKernels * 100) / 100,
      gross_yield_kg_ha: Math.round(gross * 100) / 100,
      net_yield_kg_ha: Math.round(net * 100) / 100,
      total_production_tons: Math.round((net * femaleArea / 1000) * 100) / 100,
      total_production_bags: Math.round((net * femaleArea / localBagWeight) * 100) / 100,
      total_sample_points: pts.length,
    }).eq("id", estimateId);
  };

  const handleSavePoint = useCallback(async (pointData: any) => {
    const usedTgw = pointData._tgw_used || tgw;
    const grossYield = calcPointGrossYield(
      pointData.ears_per_ha, pointData.avg_kernels_per_ear, usedTgw, pointData.sample_moisture_pct, localMoistureRef
    );
    const { ears, _tgw_used, ...pointInsert } = pointData;
    const { data: point, error: pErr } = await (supabase as any).from("yield_sample_points").insert({
      ...pointInsert,
      yield_estimate_id: estimate.id,
      point_gross_yield_kg_ha: Math.round(grossYield * 100) / 100,
    }).select().single();
    if (pErr) throw pErr;
    if (ears && ears.length > 0) {
      const earInserts = ears.map((e: EarSample) => ({
        sample_point_id: point.id, ear_number: e.ear_number, kernel_rows: e.kernel_rows,
        kernels_per_row: e.kernels_per_row, total_kernels: e.total_kernels, ear_length_cm: e.ear_length_cm || null,
      }));
      const { error: eErr } = await (supabase as any).from("yield_ear_samples").insert(earInserts);
      if (eErr) throw eErr;
    }
    await updateEstimateAggregates(estimate.id);
    queryClient.invalidateQueries({ queryKey: ["yield-estimates", cycleId] });
    queryClient.invalidateQueries({ queryKey: ["yield-sample-points", estimate.id] });
    toast.success(`Ponto ${pointData.point_number} salvo!`);
  }, [estimate.id, cycleId, tgw, localMoistureRef, queryClient]);

  const deletePointMutation = useMutation({
    mutationFn: async (pointId: string) => {
      const { error } = await (supabase as any).from("yield_sample_points").delete().eq("id", pointId);
      if (error) throw error;
      await updateEstimateAggregates(estimate.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-sample-points", estimate.id] });
      queryClient.invalidateQueries({ queryKey: ["yield-estimates", cycleId] });
      toast.success("Ponto removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async () => {
      // Delete ear samples for all points
      const { data: pts } = await (supabase as any).from("yield_sample_points").select("id").eq("yield_estimate_id", estimate.id);
      if (pts && pts.length > 0) {
        const ids = pts.map((p: any) => p.id);
        await (supabase as any).from("yield_ear_samples").delete().in("sample_point_id", ids);
        await (supabase as any).from("yield_sample_points").delete().eq("yield_estimate_id", estimate.id);
      }
      const { error } = await (supabase as any).from("yield_estimates").delete().eq("id", estimate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-estimates", cycleId] });
      toast.success("Estimativa excluída!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Card>
      {/* Collapsed header */}
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{estimate.estimate_number}ª Estimativa</CardTitle>
            <Badge variant="outline" className="text-xs">{estimate.estimate_date}</Badge>
            <Badge variant="secondary" className="text-xs">{estimate.total_sample_points || 0} pontos</Badge>
            {(estimate.net_yield_kg_ha ?? 0) > 0 && (
              <Badge className="bg-green-100 text-green-700 text-xs">{Math.round(estimate.net_yield_kg_ha || 0).toLocaleString()} kg/ha</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Excluir esta estimativa e todos os seus pontos?")) {
                  deleteEstimateMutation.mutate();
                }
              }}
              disabled={deleteEstimateMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Map */}
          <YieldEstimateMap
            points={points}
            avgNetYield={aggregates?.netYield || 0}
            pivotLat={pivot?.latitude}
            pivotLng={pivot?.longitude}
            pivotName={pivotName}
            pivotArea={pivot?.area_ha}
          />

          {/* Add point */}
          <div className="text-center space-y-2">
            <Button size="lg" onClick={() => setFormOpen(true)} className="px-8">
              <Plus className="h-5 w-5 mr-2" />Novo Ponto de Amostragem
            </Button>
            <p className="text-xs text-muted-foreground">Recomendação: mínimo 1 ponto a cada 10-15 ha.</p>
            {points.length > 0 && (
              <Badge variant="secondary">{points.length} pontos | ~{(femaleArea / Math.max(points.length, 1)).toFixed(0)} ha/ponto</Badge>
            )}
          </div>

          <SamplePointForm
            open={formOpen}
            onOpenChange={setFormOpen}
            onSave={handleSavePoint}
            nextPointNumber={points.length + 1}
            defaultRowSpacing={defaultRowSpacing}
            defaultTgw={defaultTgw}
          />

          {/* Points table */}
          {points.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Pontos Amostrados</CardTitle>
                {aggregates && (
                  <Button variant="outline" size="sm" onClick={() => onExport(estimate, points, aggregates)}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ponto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead className="text-right">Espigas/ha</TableHead>
                        <TableHead className="text-right">Grãos/esp.</TableHead>
                        <TableHead className="text-right">Umid.%</TableHead>
                        <TableHead className="text-right">Prod. bruta</TableHead>
                        <TableHead>GPS</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {points.map((p) => {
                        const color = getPointColor(p.point_gross_yield_kg_ha || 0, aggregates?.grossYield || 0);
                        return (
                          <TableRow key={p.id} style={{ borderLeft: `4px solid ${color}` }}>
                            <TableCell className="font-medium">{p.point_number}</TableCell>
                            <TableCell>{p.sample_date ? format(new Date(p.sample_date + "T12:00:00"), "dd/MM") : "—"}</TableCell>
                            <TableCell className="text-xs">{
                              p.pivot_position === "near_center" ? "Torre central" :
                              p.pivot_position === "mid_radius" ? "Meio raio" :
                              p.pivot_position === "edge" ? "Borda" : p.pivot_position || "—"
                            }</TableCell>
                            <TableCell className="text-right font-mono">{Math.round(p.ears_per_ha || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{(p.avg_kernels_per_ear || 0).toFixed(0)}</TableCell>
                            <TableCell className="text-right">{p.sample_moisture_pct}%</TableCell>
                            <TableCell className="text-right font-mono font-medium">{Math.round(p.point_gross_yield_kg_ha || 0).toLocaleString()}</TableCell>
                            <TableCell>{p.latitude ? "✓" : "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePointMutation.mutate(p.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {aggregates && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={3}>MÉDIAS</TableCell>
                          <TableCell className="text-right font-mono">{Math.round(aggregates.avgEarsPerHa).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{aggregates.avgKernelsPerEar.toFixed(0)}</TableCell>
                          <TableCell className="text-right">{aggregates.avgMoisture.toFixed(1)}%</TableCell>
                          <TableCell className="text-right font-mono">{Math.round(aggregates.grossYield).toLocaleString()}</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calculation */}
          {aggregates && (
            <YieldCalculation
              avgEarsPerHa={aggregates.avgEarsPerHa}
              avgKernelsPerEar={aggregates.avgKernelsPerEar}
              avgMoisture={aggregates.avgMoisture}
              tgw={aggregates.usedTgw}
              pointCount={points.length}
              moistureRef={localMoistureRef}
              dehuskingLoss={localDehusking}
              classificationLoss={localClassification}
              otherLoss={localOther}
              bagWeight={localBagWeight}
              finalPms={localFinalPms}
              femaleArea={femaleArea}
              onMoistureRefChange={setLocalMoistureRef}
              onDehuskingChange={setLocalDehusking}
              onClassificationChange={setLocalClassification}
              onOtherChange={setLocalOther}
              onBagWeightChange={setLocalBagWeight}
              onFinalPmsChange={setLocalFinalPms}
            />
          )}

          {/* Dashboard */}
          {aggregates && (
            <YieldDashboard
              netYieldKgHa={aggregates.netYield}
              grossYieldKgHa={aggregates.grossYield}
              totalTons={aggregates.totalTons}
              totalBags={aggregates.totalBags}
              bagWeight={localBagWeight}
              femaleArea={femaleArea}
              avgEarsPerHa={aggregates.avgEarsPerHa}
              viableEarsPctAvg={aggregates.viableEarsPctAvg}
              totalLossPct={aggregates.totalLossPct}
              lostKgHa={aggregates.lostKgHa}
              pointCount={points.length}
              expectedProductivity={expectedProductivity}
            />
          )}

          {/* Charts */}
          {aggregates && (
            <YieldCharts
              points={points}
              avgNetYield={aggregates.netYield}
              tgw={aggregates.usedTgw}
              moistureRef={localMoistureRef}
              dehuskingLoss={localDehusking}
              classificationLoss={localClassification}
              otherLoss={localOther}
            />
          )}

          {/* Waterfall Chart */}
          {aggregates && (
            <YieldWaterfallChart
              avgEarsPerHa={aggregates.avgEarsPerHa}
              avgKernelsPerEar={aggregates.avgKernelsPerEar}
              tgw={aggregates.usedTgw}
              avgMoisture={aggregates.avgMoisture}
              moistureRef={localMoistureRef}
              dehuskingLoss={localDehusking}
              classificationLoss={localClassification}
              otherLoss={localOther}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
