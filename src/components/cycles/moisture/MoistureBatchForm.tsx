import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PivotGleba, METHOD_LABELS, POSITION_LABELS, GROWTH_STAGE_LABELS } from "./types";
import { toast } from "sonner";

interface BatchRow {
  time: string;
  glebaId: string;
  growthStage: string;
  moisture: string;
  method: string;
  lat: string;
  lng: string;
  position: string;
  notes: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  glebas: PivotGleba[];
  nextPointNumber: number;
  onSaveBatch: (data: any[]) => void;
  saving: boolean;
}

const emptyRow = (defaultGleba: string): BatchRow => ({
  time: format(new Date(), "HH:mm"),
  glebaId: defaultGleba,
  growthStage: "",
  moisture: "",
  method: "portable_digital",
  lat: "",
  lng: "",
  position: "",
  notes: "",
});

export default function MoistureBatchForm({ open, onOpenChange, glebas, nextPointNumber, onSaveBatch, saving }: Props) {
  const [defaultGleba, setDefaultGleba] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [rows, setRows] = useState<BatchRow[]>([emptyRow(""), emptyRow(""), emptyRow("")]);

  const updateRow = (idx: number, field: keyof BatchRow, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  };

  const handleDefaultGlebaChange = (val: string) => {
    setDefaultGleba(val);
    setRows((prev) => prev.map((r) => ({ ...r, glebaId: r.glebaId || val })));
  };

  const captureGPS = (idx: number) => {
    if (!navigator.geolocation) {
      toast.error("GPS indisponível");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRows((prev) =>
          prev.map((r, i) =>
            i === idx ? { ...r, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) } : r
          )
        );
      },
      () => toast.error("Falha no GPS. Digite manualmente."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    if (!date) { toast.error("Data obrigatória"); return; }

    const valid = rows.filter((r) => r.moisture && r.lat && r.lng);
    if (valid.length === 0) { toast.error("Preencha ao menos 1 ponto com umidade e GPS"); return; }

    const missingGleba = glebas.length > 0 && valid.some((r) => !r.glebaId);
    if (missingGleba) { toast.error("Selecione a gleba para todos os pontos"); return; }

    const missingStage = valid.some((r) => !r.growthStage);
    if (missingStage) { toast.error("Selecione o estádio para todos os pontos"); return; }

    const data = valid.map((r, i) => ({
      gleba_id: r.glebaId === "__none__" ? null : r.glebaId || null,
      point_identifier: `P${nextPointNumber + i}`,
      sample_date: format(date, "yyyy-MM-dd"),
      sample_time: r.time || "00:00",
      moisture_pct: parseFloat(r.moisture),
      growth_stage: r.growthStage,
      method: r.method,
      field_position: r.position || null,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lng),
      notes: r.notes || null,
    }));

    onSaveBatch(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Vários Pontos (Lote)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {glebas.length > 0 && (
              <div className="space-y-1">
                <Label>Gleba padrão (pré-preenche linhas)</Label>
                <Select value={defaultGleba} onValueChange={handleDefaultGlebaChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {glebas.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name} — {g.area_ha ?? "?"} ha</SelectItem>
                    ))}
                    <SelectItem value="__none__">Área geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="p-1 text-left">#</th>
                  <th className="p-1 text-left">Hora</th>
                  {glebas.length > 0 && <th className="p-1 text-left">Gleba</th>}
                  <th className="p-1 text-left">Estádio</th>
                  <th className="p-1 text-left">Umidade %</th>
                  <th className="p-1 text-left">Método</th>
                  <th className="p-1 text-left">GPS</th>
                  <th className="p-1 text-left">Posição</th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-1 text-muted-foreground">{i + 1}</td>
                    <td className="p-1"><Input type="time" value={r.time} onChange={(e) => updateRow(i, "time", e.target.value)} className="h-8 w-24" /></td>
                    {glebas.length > 0 && (
                      <td className="p-1">
                        <Select value={r.glebaId} onValueChange={(v) => updateRow(i, "glebaId", v)}>
                          <SelectTrigger className="h-8 w-32"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {glebas.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            <SelectItem value="__none__">Geral</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="p-1">
                      <Select value={r.growthStage} onValueChange={(v) => updateRow(i, "growthStage", v)}>
                        <SelectTrigger className="h-8 w-28"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(GROWTH_STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1"><Input type="number" step="0.1" value={r.moisture} onChange={(e) => updateRow(i, "moisture", e.target.value)} className="h-8 w-20" placeholder="18.5" /></td>
                    <td className="p-1">
                      <Select value={r.method} onValueChange={(v) => updateRow(i, "method", v)}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => captureGPS(i)}>
                          <MapPin className="h-3 w-3" />
                        </Button>
                        {r.lat ? <span className="text-xs text-green-600">✓</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-1">
                      <Select value={r.position} onValueChange={(v) => updateRow(i, "position", v)}>
                        <SelectTrigger className="h-8 w-28"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(POSITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      {rows.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow(defaultGleba)])}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar ponto
          </Button>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : `Salvar ${rows.filter((r) => r.moisture && r.lat).length} pontos`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
