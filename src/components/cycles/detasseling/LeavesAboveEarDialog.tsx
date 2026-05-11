import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycleId: string;
  orgId: string;
}

const SCHEMES = [
  { label: "4:2", female: 4 },
  { label: "6:2", female: 6 },
  { label: "8:2", female: 8 },
  { label: "10:2", female: 10 },
  { label: "12:2", female: 12 },
];

const PLANTS_PER_ROW = 100;
const DEFAULT_POINTS = 5;

interface RowEntry {
  leaves: string;
}
interface PointEntry {
  rows: RowEntry[];
  photo: File | null;
}

function makePoints(n: number, femaleRows: number): PointEntry[] {
  return Array.from({ length: n }, () => ({
    rows: Array.from({ length: femaleRows }, () => ({ leaves: "" })),
    photo: null,
  }));
}

export default function LeavesAboveEarDialog({ open, onOpenChange, cycleId, orgId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [scheme, setScheme] = useState("4:2");
  const femaleRows = useMemo(() => SCHEMES.find((s) => s.label === scheme)?.female ?? 4, [scheme]);
  const [points, setPoints] = useState<PointEntry[]>(() => makePoints(DEFAULT_POINTS, 4));

  // When scheme changes, resize each point's rows preserving values where possible
  useEffect(() => {
    setPoints((prev) =>
      prev.map((p) => {
        const rows = Array.from({ length: femaleRows }, (_, i) => p.rows[i] ?? { leaves: "" });
        return { ...p, rows };
      })
    );
  }, [femaleRows]);

  const reset = () => {
    setDate(new Date());
    setNotes("");
    setScheme("4:2");
    setPoints(makePoints(DEFAULT_POINTS, 4));
  };

  const addPoint = () =>
    setPoints((p) => [...p, { rows: Array.from({ length: femaleRows }, () => ({ leaves: "" })), photo: null }]);
  const removePoint = (i: number) => setPoints((p) => p.filter((_, idx) => idx !== i));
  const updateRow = (pi: number, ri: number, value: string) =>
    setPoints((p) =>
      p.map((pt, idx) =>
        idx === pi ? { ...pt, rows: pt.rows.map((r, j) => (j === ri ? { leaves: value } : r)) } : pt
      )
    );
  const updatePhoto = (i: number, file: File | null) =>
    setPoints((p) => p.map((pt, idx) => (idx === i ? { ...pt, photo: file } : pt)));

  // Compute average per point (avg of its rows) and overall average across all valid rows
  const allValidRowValues = points.flatMap((p) =>
    p.rows.map((r) => parseFloat(r.leaves)).filter((n) => !isNaN(n))
  );
  const avg = allValidRowValues.length
    ? allValidRowValues.reduce((s, n) => s + n, 0) / allValidRowValues.length
    : 0;

  const pointAvg = (pt: PointEntry) => {
    const v = pt.rows.map((r) => parseFloat(r.leaves)).filter((n) => !isNaN(n));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  };

  const validPointsCount = points.filter((p) => p.rows.some((r) => !isNaN(parseFloat(r.leaves)))).length;
  const totalPlants = validPointsCount * femaleRows * PLANTS_PER_ROW;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Data é obrigatória");
      if (allValidRowValues.length === 0) throw new Error("Preencha ao menos uma linha");

      const { data: evalData, error: evalErr } = await (supabase as any)
        .from("leaves_above_ear_evaluations")
        .insert({
          cycle_id: cycleId,
          org_id: orgId,
          evaluation_date: format(date, "yyyy-MM-dd"),
          points_sampled: validPointsCount,
          avg_leaves: Number(avg.toFixed(2)),
          notes: notes || null,
          created_by: user?.id || null,
          planting_scheme: scheme,
          female_rows: femaleRows,
          plants_per_female_row: PLANTS_PER_ROW,
          total_plants_sampled: totalPlants,
        })
        .select("id")
        .single();
      if (evalErr) throw evalErr;
      const evalId = evalData.id;

      const rows: any[] = [];
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const hasAny = pt.rows.some((r) => !isNaN(parseFloat(r.leaves)));
        if (!hasAny) continue;
        let photoUrl: string | null = null;
        if (pt.photo) {
          const ext = pt.photo.name.split(".").pop();
          const filePath = `${orgId}/${cycleId}/leaves-${evalId}-${i}-${crypto.randomUUID()}.${ext}`;
          const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, pt.photo);
          if (ue) throw ue;
          photoUrl = filePath;
        }
        for (let r = 0; r < pt.rows.length; r++) {
          const val = parseFloat(pt.rows[r].leaves);
          if (isNaN(val)) continue;
          rows.push({
            evaluation_id: evalId,
            point_number: i + 1,
            row_number: r + 1,
            leaves_count: val,
            photo_url: r === 0 ? photoUrl : null,
          });
        }
      }
      if (rows.length > 0) {
        const { error } = await (supabase as any).from("leaves_above_ear_points").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves_above_ear", cycleId] });
      toast.success("Avaliação registrada!");
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação — Folhas Acima da Espiga</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Esquema de plantio *</Label>
              <Select value={scheme} onValueChange={setScheme}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((s) => (
                    <SelectItem key={s.label} value={s.label}>{s.label} ({s.female} fêmeas)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plantas / linha fêmea</Label>
              <Input value={PLANTS_PER_ROW} disabled className="bg-muted" />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Pontos válidos</div>
              <div className="text-lg font-bold">{validPointsCount}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Linhas fêmea / ponto</div>
              <div className="text-lg font-bold">{femaleRows}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Plantas amostradas</div>
              <div className="text-lg font-bold">{totalPlants}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Média geral</div>
              <div className="text-lg font-bold text-primary">{avg.toFixed(2)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pontos de amostragem ({DEFAULT_POINTS} sugeridos por pivô)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addPoint} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar ponto
              </Button>
            </div>
            {points.map((pt, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Ponto #{i + 1}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Média do ponto: <b className="text-primary">{pointAvg(pt).toFixed(2)}</b></span>
                      {points.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removePoint(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {pt.rows.map((r, ri) => (
                      <div key={ri} className="space-y-1">
                        <Label className="text-xs">Fêmea {ri + 1} (média de 100 plantas)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Ex: 5.2"
                          value={r.leaves}
                          onChange={(e) => updateRow(i, ri, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-xs hover:bg-accent w-fit">
                    <Camera className="h-4 w-4 shrink-0" />
                    <span className="truncate max-w-[240px]">{pt.photo ? pt.photo.name : "Adicionar foto do ponto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => updatePhoto(i, e.target.files?.[0] || null)}
                    />
                  </label>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
