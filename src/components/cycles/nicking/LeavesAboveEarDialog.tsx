import { useState } from "react";
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

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cycleId: string;
  orgId: string;
}

interface PointEntry {
  leaves: string;
  photo: File | null;
}

export default function LeavesAboveEarDialog({ open, onOpenChange, cycleId, orgId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState<PointEntry[]>([{ leaves: "", photo: null }]);

  const reset = () => {
    setDate(new Date());
    setNotes("");
    setPoints([{ leaves: "", photo: null }]);
  };

  const addPoint = () => setPoints((p) => [...p, { leaves: "", photo: null }]);
  const removePoint = (i: number) => setPoints((p) => p.filter((_, idx) => idx !== i));
  const updatePoint = (i: number, field: keyof PointEntry, value: any) =>
    setPoints((p) => p.map((pt, idx) => (idx === i ? { ...pt, [field]: value } : pt)));

  const validPoints = points.filter((p) => p.leaves !== "" && !isNaN(parseFloat(p.leaves)));
  const avg = validPoints.length
    ? validPoints.reduce((s, p) => s + parseFloat(p.leaves), 0) / validPoints.length
    : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("Data é obrigatória");
      if (validPoints.length === 0) throw new Error("Adicione ao menos um ponto válido");

      const { data: evalData, error: evalErr } = await (supabase as any)
        .from("leaves_above_ear_evaluations")
        .insert({
          cycle_id: cycleId,
          org_id: orgId,
          evaluation_date: format(date, "yyyy-MM-dd"),
          points_sampled: validPoints.length,
          avg_leaves: Number(avg.toFixed(2)),
          notes: notes || null,
          created_by: user?.id || null,
        })
        .select("id")
        .single();
      if (evalErr) throw evalErr;
      const evalId = evalData.id;

      const rows: any[] = [];
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (pt.leaves === "" || isNaN(parseFloat(pt.leaves))) continue;
        let photoUrl: string | null = null;
        if (pt.photo) {
          const ext = pt.photo.name.split(".").pop();
          const filePath = `${orgId}/${cycleId}/leaves-${evalId}-${i}-${crypto.randomUUID()}.${ext}`;
          const { error: ue } = await supabase.storage.from("cycle-media").upload(filePath, pt.photo);
          if (ue) throw ue;
          photoUrl = filePath;
        }
        rows.push({
          evaluation_id: evalId,
          point_number: i + 1,
          leaves_count: parseFloat(pt.leaves),
          photo_url: photoUrl,
        });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação — Folhas Acima da Espiga</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Pontos amostrados</Label>
              <Input value={validPoints.length} disabled className="bg-muted" />
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-sm font-medium">Média de folhas acima da espiga</span>
            <span className="text-2xl font-bold text-primary">{avg.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pontos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addPoint} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar ponto
              </Button>
            </div>
            {points.map((pt, i) => (
              <Card key={i}>
                <CardContent className="p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2 text-sm font-medium pt-2">#{i + 1}</div>
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Folhas acima da espiga</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 5"
                      value={pt.leaves}
                      onChange={(e) => updatePoint(i, "leaves", e.target.value)}
                    />
                  </div>
                  <div className="col-span-5">
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-xs hover:bg-accent truncate">
                      <Camera className="h-4 w-4 shrink-0" />
                      <span className="truncate">{pt.photo ? pt.photo.name : "Foto do ponto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => updatePoint(i, "photo", e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <div className="col-span-1">
                    {points.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removePoint(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
