import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PivotGleba, METHOD_LABELS, POSITION_LABELS, GROWTH_STAGE_LABELS } from "./types";
import { getMoistureStatusLabel } from "./utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  glebas: PivotGleba[];
  target: number;
  nextPointNumber: number;
  onSave: (data: any) => void;
  saving: boolean;
}

export default function MoistureSampleForm({ open, onOpenChange, glebas, target, nextPointNumber, onSave, saving }: Props) {
  const [glebaId, setGlebaId] = useState<string>("");
  const [pointId, setPointId] = useState(`P${nextPointNumber}`);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [moisture, setMoisture] = useState("");
  const [growthStage, setGrowthStage] = useState("");
  const [method, setMethod] = useState("portable_digital");
  const [temperature, setTemperature] = useState("");
  const [position, setPosition] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [gpsManual, setGpsManual] = useState(false);
  const [notes, setNotes] = useState("");
  const [capturing, setCapturing] = useState(false);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      toast.error("GPS não disponível neste dispositivo");
      setGpsManual(true);
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setCapturing(false);
        setGpsManual(false);
      },
      () => {
        toast.error("Não foi possível capturar GPS. Digite manualmente.");
        setGpsManual(true);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const moistureVal = parseFloat(moisture);
  const moistureStatus = !isNaN(moistureVal) ? getMoistureStatusLabel(moistureVal, target) : null;

  const handleSave = () => {
    if (!date) { toast.error("Data obrigatória"); return; }
    if (!time) { toast.error("Hora obrigatória"); return; }
    if (!moisture || isNaN(moistureVal)) { toast.error("Umidade obrigatória"); return; }
    if (!lat || !lng) { toast.error("GPS é obrigatório para amostras de umidade"); return; }
    if (glebas.length > 0 && !glebaId) { toast.error("Selecione a gleba"); return; }
    if (!growthStage) { toast.error("Estádio fenológico é obrigatório"); return; }

    onSave({
      gleba_id: glebaId === "__none__" ? null : glebaId || null,
      point_identifier: pointId || `P${nextPointNumber}`,
      sample_date: format(date, "yyyy-MM-dd"),
      sample_time: time,
      moisture_pct: moistureVal,
      growth_stage: growthStage,
      method,
      grain_temperature_c: temperature ? parseFloat(temperature) : null,
      field_position: position || null,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      notes: notes || null,
    });
  };

  const reset = () => {
    setGlebaId("");
    setPointId(`P${nextPointNumber}`);
    setDate(new Date());
    setTime(format(new Date(), "HH:mm"));
    setMoisture("");
    setGrowthStage("");
    setMethod("portable_digital");
    setTemperature("");
    setPosition("");
    setLat("");
    setLng("");
    setGpsManual(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ponto de Umidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* GPS */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Localização</h4>

            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" onClick={captureGPS} disabled={capturing} className="shrink-0">
                <MapPin className="h-4 w-4 mr-1" />
                {capturing ? "Capturando..." : "📍 Capturar GPS"}
              </Button>
              {lat && lng && <span className="text-xs text-green-600">✓ {lat}, {lng}</span>}
            </div>

            {(gpsManual || (!lat && !lng)) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Latitude *</Label>
                  <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-15.123456" />
                </div>
                <div className="space-y-1">
                  <Label>Longitude *</Label>
                  <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-47.654321" />
                </div>
              </div>
            )}
          </div>

          {/* Gleba + Point ID */}
          {glebas.length > 0 && (
            <div className="space-y-1">
              <Label>Gleba *</Label>
              <Select value={glebaId} onValueChange={setGlebaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a gleba" /></SelectTrigger>
                <SelectContent>
                  {glebas.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} — {g.area_ha ?? "?"} ha — {g.parent_type === "female" ? "Fêmea" : "Macho"}
                    </SelectItem>
                  ))}
                  <SelectItem value="__none__">Área geral (sem gleba específica)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Identificação do ponto</Label>
            <Input value={pointId} onChange={(e) => setPointId(e.target.value)} placeholder="P1" />
          </div>

          {/* Measurement */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Medição</h4>

            <div className="grid grid-cols-2 gap-2">
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
              <div className="space-y-1">
                <Label>Hora *</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Umidade % *</Label>
              <Input type="number" step="0.1" value={moisture} onChange={(e) => setMoisture(e.target.value)} placeholder="18.5" />
              {moistureStatus && (
                <p className="text-xs mt-0.5">
                  {moistureStatus.emoji} {moistureStatus.label}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Estádio Fenológico *</Label>
              <Select value={growthStage} onValueChange={setGrowthStage}>
                <SelectTrigger><SelectValue placeholder="Selecione o estádio" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GROWTH_STAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Método</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(METHOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Temp. grão (°C)</Label>
                <Input type="number" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Posição no campo</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(POSITION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Grãos ainda leitosos na ponta da espiga..." rows={2} />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar Ponto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
