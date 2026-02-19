import { useState, useMemo } from "react";
import { Plus, Trash2, Zap, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calcStats, getCvLabel } from "./planting-utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, ResponsiveContainer, Tooltip,
} from "recharts";

interface Props {
  plantingActualId: string;
  cycleId: string;
  existingPoints: any[];
}

export default function PlantingCvPoints({ plantingActualId, cycleId, existingPoints }: Props) {
  const queryClient = useQueryClient();
  const [quickEntry, setQuickEntry] = useState(false);
  const [quickText, setQuickText] = useState("");

  const stats = useMemo(() => {
    const values = existingPoints.map((p: any) => Number(p.seeds_per_meter)).filter(v => v > 0);
    return calcStats(values);
  }, [existingPoints]);

  const cvLabel = stats.n > 0 ? getCvLabel(stats.cv) : null;

  const chartData = useMemo(() => {
    return existingPoints.map((p: any) => ({
      name: `P${p.point_number}`,
      value: Number(p.seeds_per_meter),
      withinRange: Math.abs(Number(p.seeds_per_meter) - stats.mean) <= stats.std,
    }));
  }, [existingPoints, stats]);

  const addPointMutation = useMutation({
    mutationFn: async (data: { seeds_counted: number; sample_length_m: number }) => {
      const nextNum = existingPoints.length > 0 ? Math.max(...existingPoints.map((p: any) => p.point_number)) + 1 : 1;
      const { error } = await (supabase as any).from("planting_cv_points").insert({
        planting_actual_id: plantingActualId,
        point_number: nextNum,
        seeds_counted: data.seeds_counted,
        sample_length_m: data.sample_length_m,
      });
      if (error) throw error;

      // Recalculate and update parent
      await recalcParent();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_cv_points", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deletePointMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("planting_cv_points").delete().eq("id", id);
      if (error) throw error;
      await recalcParent();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_cv_points", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const quickEntryMutation = useMutation({
    mutationFn: async (text: string) => {
      const values = text.split(/[,;\s]+/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v) && v > 0);
      if (values.length === 0) throw new Error("Nenhum valor válido encontrado");
      const startNum = existingPoints.length > 0 ? Math.max(...existingPoints.map((p: any) => p.point_number)) + 1 : 1;
      const rows = values.map((v, i) => ({
        planting_actual_id: plantingActualId,
        point_number: startNum + i,
        seeds_counted: v,
        sample_length_m: 1.0,
      }));
      const { error } = await (supabase as any).from("planting_cv_points").insert(rows);
      if (error) throw error;
      await recalcParent();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planting_cv_points", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["planting_actual", cycleId] });
      setQuickEntry(false);
      setQuickText("");
      toast.success("Pontos gerados!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  async function recalcParent() {
    const { data: allPts } = await (supabase as any).from("planting_cv_points").select("seeds_per_meter").eq("planting_actual_id", plantingActualId);
    if (allPts && allPts.length > 0) {
      const vals = allPts.map((p: any) => Number(p.seeds_per_meter)).filter((v: number) => v > 0);
      const s = calcStats(vals);
      await (supabase as any).from("planting_actual").update({
        seeds_per_meter_actual: Math.round(s.mean * 100) / 100,
        cv_percent: Math.round(s.cv * 10) / 10,
      }).eq("id", plantingActualId);
    } else {
      await (supabase as any).from("planting_actual").update({
        seeds_per_meter_actual: null,
        cv_percent: null,
      }).eq("id", plantingActualId);
    }
  }

  const [newSeeds, setNewSeeds] = useState("");
  const [newLength, setNewLength] = useState("1.0");

  const handleAddPoint = () => {
    const sc = parseFloat(newSeeds);
    const sl = parseFloat(newLength);
    if (isNaN(sc) || sc <= 0) { toast.error("Informe as sementes contadas"); return; }
    if (isNaN(sl) || sl <= 0) { toast.error("Comprimento inválido"); return; }
    addPointMutation.mutate({ seeds_counted: sc, sample_length_m: sl });
    setNewSeeds("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">📏 Medições de Distribuição de Sementes</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setQuickEntry(!quickEntry)}>
            <Zap className="h-3 w-3" /> Entrada rápida
          </Button>
        </div>
      </div>

      {quickEntry && (
        <Card><CardContent className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground">Valores separados por vírgula (ex: 5.2, 4.8, 5.5, 4.6)</p>
          <Textarea rows={2} value={quickText} onChange={(e) => setQuickText(e.target.value)} placeholder="5.2, 4.8, 5.5, 4.6, 5.1" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => quickEntryMutation.mutate(quickText)} disabled={quickEntryMutation.isPending}>
              {quickEntryMutation.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Gerar Pontos
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setQuickEntry(false)}>Cancelar</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Add point inline */}
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Sementes contadas</label>
          <Input className="h-8 w-28 text-sm" type="number" step="0.1" value={newSeeds} onChange={(e) => setNewSeeds(e.target.value)} placeholder="5.2"
            onKeyDown={(e) => e.key === "Enter" && handleAddPoint()} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Comprimento (m)</label>
          <Input className="h-8 w-20 text-sm" type="number" step="0.1" value={newLength} onChange={(e) => setNewLength(e.target.value)} />
        </div>
        <Button size="sm" className="h-8 px-3" onClick={handleAddPoint} disabled={addPointMutation.isPending}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Points table */}
      {existingPoints.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-16">Ponto</TableHead>
                <TableHead className="text-xs text-right">Sementes</TableHead>
                <TableHead className="text-xs text-right">Comp.(m)</TableHead>
                <TableHead className="text-xs text-right">Sem/metro</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {existingPoints.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{p.point_number}</TableCell>
                  <TableCell className="text-sm text-right">{p.seeds_counted}</TableCell>
                  <TableCell className="text-sm text-right">{p.sample_length_m}</TableCell>
                  <TableCell className="text-sm text-right font-mono">{Number(p.seeds_per_meter).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => deletePointMutation.mutate(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Stats cards */}
      {stats.n > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Pontos</p>
            <p className="text-sm font-bold">{stats.n}</p>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Média</p>
            <p className="text-sm font-bold font-mono">{stats.mean.toFixed(2)} sem/m</p>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Desvio padrão</p>
            <p className="text-sm font-bold font-mono">{stats.std.toFixed(2)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-2 text-center">
            <p className="text-[10px] text-muted-foreground">CV% Plantio</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-sm font-bold">{stats.cv.toFixed(1)}%</p>
              {cvLabel && <span className={`text-[10px] px-1 py-0.5 rounded ${cvLabel.bg}`}>{cvLabel.emoji}</span>}
            </div>
          </CardContent></Card>
        </div>
      )}

      {stats.n > 0 && stats.n < 10 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ {stats.n} pontos. Mínimo 10 recomendado para CV% confiável.</p>
      )}

      {/* Mini chart */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <ReferenceArea y1={stats.mean - stats.std} y2={stats.mean + stats.std} fill="hsl(var(--muted))" fillOpacity={0.4} />
            <ReferenceLine y={stats.mean} stroke="#1E88E5" strokeDasharray="5 5" label={{ value: `Média: ${stats.mean.toFixed(2)}`, position: "right", className: "text-[10px]" }} />
            <Bar dataKey="value" name="Sem/metro">
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.withinRange ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
