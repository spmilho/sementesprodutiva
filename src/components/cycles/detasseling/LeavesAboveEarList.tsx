import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from "recharts";

const ROW_COLORS = [
  "hsl(217 91% 60%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 55%)",
  "hsl(199 89% 48%)",
  "hsl(346 77% 50%)",
  "hsl(173 58% 39%)",
  "hsl(43 74% 49%)",
  "hsl(262 52% 47%)",
  "hsl(12 76% 61%)",
  "hsl(197 37% 24%)",
  "hsl(120 40% 40%)",
];

function LeavesChart({ evaluation }: { evaluation: any }) {
  const { perPointData, perRowData, overallAvg, femaleRows } = useMemo(() => {
    const pts: any[] = (evaluation.leaves_above_ear_points || [])
      .slice()
      .sort(
        (a: any, b: any) =>
          a.point_number - b.point_number || (a.row_number ?? 1) - (b.row_number ?? 1)
      );

    const grouped = new Map<number, any[]>();
    pts.forEach((p) => {
      const arr = grouped.get(p.point_number) ?? [];
      arr.push(p);
      grouped.set(p.point_number, arr);
    });

    const fr =
      evaluation.female_rows ??
      Math.max(1, ...pts.map((p: any) => p.row_number ?? 1));

    const perPointData = Array.from(grouped.entries()).map(([pn, rows]) => {
      const row: any = { name: `P${pn}` };
      let sum = 0,
        n = 0;
      rows.forEach((r: any) => {
        const v = Number(r.leaves_count);
        if (!isNaN(v)) {
          row[`F${r.row_number ?? 1}`] = v;
          sum += v;
          n += 1;
        }
      });
      row.media = n ? +(sum / n).toFixed(2) : 0;
      return row;
    });

    const perRowAgg = new Map<number, number[]>();
    pts.forEach((p) => {
      const v = Number(p.leaves_count);
      if (isNaN(v)) return;
      const r = p.row_number ?? 1;
      if (!perRowAgg.has(r)) perRowAgg.set(r, []);
      perRowAgg.get(r)!.push(v);
    });
    const perRowData = Array.from({ length: fr }, (_, i) => {
      const r = i + 1;
      const arr = perRowAgg.get(r) ?? [];
      const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return { name: `Fêmea ${r}`, media: +avg.toFixed(2) };
    });

    const allVals = pts.map((p: any) => Number(p.leaves_count)).filter((n: number) => !isNaN(n));
    const overallAvg = allVals.length
      ? +(allVals.reduce((a: number, b: number) => a + b, 0) / allVals.length).toFixed(2)
      : 0;

    return { perPointData, perRowData, overallAvg, femaleRows: fr };
  }, [evaluation]);

  if (perPointData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2">
      <div className="border rounded-md p-2">
        <div className="text-xs font-medium mb-1 text-muted-foreground">
          Folhas por ponto e linha (média geral:{" "}
          <b className="text-primary">{overallAvg}</b>)
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={perPointData} margin={{ top: 8, right: 40, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {Array.from({ length: femaleRows }, (_, i) => (
              <Bar
                key={i}
                dataKey={`F${i + 1}`}
                fill={ROW_COLORS[i % ROW_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
            <Line
              type="monotone"
              dataKey="media"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Média do ponto"
            />
            <ReferenceLine
              y={overallAvg}
              stroke="hsl(var(--destructive))"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `Média ${overallAvg}`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--destructive))",
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="border rounded-md p-2">
        <div className="text-xs font-medium mb-1 text-muted-foreground">
          Média por linha de fêmea
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={perRowData} margin={{ top: 8, right: 40, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="media" radius={[4, 4, 0, 0]} name="Média de folhas">
              {perRowData.map((_, i) => (
                <Cell key={i} fill={ROW_COLORS[i % ROW_COLORS.length]} />
              ))}
            </Bar>
            <ReferenceLine
              y={overallAvg}
              stroke="hsl(var(--destructive))"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `Média ${overallAvg}`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--destructive))",
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface Props {
  cycleId: string;
}

function PhotoThumb({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (url) return;
    const { data } = await supabase.storage.from("cycle-media").createSignedUrl(path, 3600);
    if (data?.signedUrl) setUrl(data.signedUrl);
  };

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={async () => { await load(); setOpen(true); }}
      >
        Ver foto
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Foto do ponto</DialogTitle></DialogHeader>
          {url ? <img src={url} alt="Ponto" className="w-full rounded" /> : <p className="text-sm">Carregando...</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LeavesAboveEarList({ cycleId }: Props) {
  const queryClient = useQueryClient();

  const { data: evaluations = [] } = useQuery({
    queryKey: ["leaves_above_ear", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leaves_above_ear_evaluations")
        .select("*, leaves_above_ear_points(*)")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", {
        _table_name: "leaves_above_ear_evaluations",
        _record_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves_above_ear", cycleId] });
      toast.success("Avaliação removida");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (evaluations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🌿 Folhas Acima da Espiga</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {evaluations.map((e: any) => (
          <div key={e.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="font-medium">{format(new Date(e.evaluation_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                {e.planting_scheme && (
                  <span className="text-muted-foreground">Esquema {e.planting_scheme} ({e.female_rows} fêmeas)</span>
                )}
                <span className="text-muted-foreground">{e.points_sampled} pontos</span>
                {e.total_plants_sampled != null && (
                  <span className="text-muted-foreground">{e.total_plants_sampled} plantas</span>
                )}
                <span className="font-bold text-primary">Média: {e.avg_leaves}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => deleteMutation.mutate(e.id)}>
                Remover
              </Button>
            </div>
            {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
            <div className="overflow-x-auto">
              {(() => {
                const pts: any[] = (e.leaves_above_ear_points || []).slice().sort(
                  (a: any, b: any) => (a.point_number - b.point_number) || ((a.row_number ?? 1) - (b.row_number ?? 1))
                );
                const grouped = new Map<number, any[]>();
                pts.forEach((p) => {
                  const arr = grouped.get(p.point_number) ?? [];
                  arr.push(p);
                  grouped.set(p.point_number, arr);
                });
                return (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-1.5">Ponto</th>
                        <th className="p-1.5">Linhas fêmea (folhas)</th>
                        <th className="p-1.5">Média</th>
                        <th className="p-1.5">Foto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(grouped.entries()).map(([pn, rows]) => {
                        const vals = rows.map((r) => Number(r.leaves_count)).filter((n) => !isNaN(n));
                        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                        const photo = rows.find((r) => r.photo_url)?.photo_url || null;
                        return (
                          <tr key={pn} className="border-b align-top">
                            <td className="p-1.5 font-medium">#{pn}</td>
                            <td className="p-1.5">
                              <div className="flex flex-wrap gap-1">
                                {rows.map((r) => (
                                  <span key={r.id} className="px-1.5 py-0.5 rounded bg-muted text-[11px]">
                                    F{r.row_number ?? 1}: <b>{r.leaves_count}</b>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-1.5 font-semibold text-primary">{avg.toFixed(2)}</td>
                            <td className="p-1.5">{photo ? <PhotoThumb path={photo} /> : <span className="text-muted-foreground">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
