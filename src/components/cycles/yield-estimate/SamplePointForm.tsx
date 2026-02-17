import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { EarSample } from "./types";
import { calcEarsPerHa, calcViableEarsPct, calcEarStats, getCvLabel } from "./utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: any) => Promise<void>;
  nextPointNumber: number;
  defaultRowSpacing: number;
  defaultTgw: number;
}

const POSITIONS = [
  { value: "near_center", label: "Próximo à torre central" },
  { value: "mid_radius", label: "Meio do raio" },
  { value: "edge", label: "Ponta/borda" },
  { value: "other", label: "Outro" },
];

const CONDITIONS = [
  { value: "excellent", label: "Excelente" },
  { value: "good", label: "Boa" },
  { value: "regular", label: "Regular" },
  { value: "poor", label: "Ruim" },
];

export default function SamplePointForm({ open, onOpenChange, onSave, nextPointNumber, defaultRowSpacing, defaultTgw }: Props) {
  const [saving, setSaving] = useState(false);
  const [capturingGps, setCapturingGps] = useState(false);
  const [pointNumber, setPointNumber] = useState(String(nextPointNumber));
  const [sampleDate, setSampleDate] = useState(new Date().toISOString().split("T")[0]);
  const [sampleTime, setSampleTime] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [gpsManual, setGpsManual] = useState(false);
  const [pivotPosition, setPivotPosition] = useState("");
  const [locationNotes, setLocationNotes] = useState("");
  const [sampleLengthM, setSampleLengthM] = useState("5.0");
  const [rowSpacingCm, setRowSpacingCm] = useState(String(defaultRowSpacing || 70));
  const [viableEars, setViableEars] = useState("");
  const [discardedEars, setDiscardedEars] = useState("0");
  const [ears, setEars] = useState<EarSample[]>([{ ear_number: 1, kernel_rows: 0, kernels_per_row: 0, total_kernels: 0 }]);
  const [moisturePct, setMoisturePct] = useState("");
  const [tgwG, setTgwG] = useState("");
  const [plantCondition, setPlantCondition] = useState("");
  const [notes, setNotes] = useState("");

  const earsPerHa = useMemo(() => {
    const v = parseInt(viableEars) || 0;
    const l = parseFloat(sampleLengthM) || 0;
    const s = parseFloat(rowSpacingCm) || 0;
    return calcEarsPerHa(v, l, s);
  }, [viableEars, sampleLengthM, rowSpacingCm]);

  const viablePct = useMemo(() => calcViableEarsPct(parseInt(viableEars) || 0, parseInt(discardedEars) || 0), [viableEars, discardedEars]);

  const earStats = useMemo(() => calcEarStats(ears.filter((e) => e.total_kernels > 0)), [ears]);
  const cvInfo = useMemo(() => getCvLabel(earStats.cv), [earStats.cv]);

  const captureGPS = () => {
    if (!navigator.geolocation) { setGpsManual(true); toast.error("GPS não disponível"); return; }
    setCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setCapturingGps(false); setGpsManual(false); },
      () => { setCapturingGps(false); setGpsManual(true); toast.error("Falha ao capturar GPS. Digite manualmente."); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const updateEar = (idx: number, field: keyof EarSample, value: number) => {
    setEars((prev) => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      if (field === "kernel_rows" || field === "kernels_per_row") {
        updated.total_kernels = (updated.kernel_rows || 0) * (updated.kernels_per_row || 0);
      }
      return updated;
    }));
  };

  const addEar = () => setEars((p) => [...p, { ear_number: p.length + 1, kernel_rows: 0, kernels_per_row: 0, total_kernels: 0 }]);
  const removeEar = (idx: number) => setEars((p) => p.filter((_, i) => i !== idx).map((e, i) => ({ ...e, ear_number: i + 1 })));

  const handleSave = async () => {
    if (!sampleDate || !lat || !lng || !viableEars || !moisturePct) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    const validEars = ears.filter((e) => e.total_kernels > 0);
    if (validEars.length === 0) { toast.error("Adicione ao menos uma espiga com dados"); return; }

    setSaving(true);
    try {
      const usedTgw = parseFloat(tgwG) || defaultTgw;
      await onSave({
        point_number: pointNumber,
        sample_date: sampleDate,
        sample_time: sampleTime || null,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        pivot_position: pivotPosition || null,
        sample_length_m: parseFloat(sampleLengthM),
        row_spacing_cm: parseFloat(rowSpacingCm),
        viable_ears_counted: parseInt(viableEars),
        discarded_ears_counted: parseInt(discardedEars) || 0,
        ears_per_ha: Math.round(earsPerHa),
        viable_ears_pct: Math.round(viablePct * 100) / 100,
        avg_kernels_per_ear: earStats.avg,
        kernels_cv_pct: earStats.cv,
        sample_moisture_pct: parseFloat(moisturePct),
        sample_tgw_g: parseFloat(tgwG) || null,
        plant_condition: plantCondition || null,
        notes: [locationNotes, notes].filter(Boolean).join(" | ") || null,
        ears: validEars,
        _tgw_used: usedTgw,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo Ponto de Amostragem</DialogTitle></DialogHeader>
        <div className="space-y-6">
          {/* Location */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">📍 Localização</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nº do ponto</Label><Input value={pointNumber} onChange={(e) => setPointNumber(e.target.value)} /></div>
              <div><Label>Data *</Label><Input type="date" value={sampleDate} onChange={(e) => setSampleDate(e.target.value)} /></div>
              <div><Label>Hora</Label><Input type="time" value={sampleTime} onChange={(e) => setSampleTime(e.target.value)} /></div>
              <div><Label>Posição no pivô</Label>
                <Select value={pivotPosition} onValueChange={setPivotPosition}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Button type="button" variant="outline" onClick={captureGPS} disabled={capturingGps} className="w-full">
                {capturingGps ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Capturando...</> : <><MapPin className="h-4 w-4 mr-2" />📍 Capturar localização</>}
              </Button>
              {gpsManual && <p className="text-xs text-amber-600">⚠️ GPS indisponível. Digite as coordenadas manualmente.</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude *</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} readOnly={!gpsManual && !!lat} placeholder="-15.789" /></div>
                <div><Label>Longitude *</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} readOnly={!gpsManual && !!lng} placeholder="-47.123" /></div>
              </div>
            </div>
            <div><Label>Observações do local</Label><Textarea value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} placeholder="Área mais baixa, solo argiloso..." rows={2} /></div>
          </div>

          {/* Ear count */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">🌽 Contagem de Espigas</h4>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Comprimento (m) *</Label><Input type="number" step="0.1" value={sampleLengthM} onChange={(e) => setSampleLengthM(e.target.value)} /><p className="text-xs text-muted-foreground mt-1">Metros lineares percorridos</p></div>
              <div><Label>Espaçamento (cm)</Label><Input type="number" value={rowSpacingCm} onChange={(e) => setRowSpacingCm(e.target.value)} /></div>
              <div><Label>Espigas viáveis *</Label><Input type="number" value={viableEars} onChange={(e) => setViableEars(e.target.value)} /></div>
            </div>
            <div className="w-1/3"><Label>Espigas descartadas</Label><Input type="number" value={discardedEars} onChange={(e) => setDiscardedEars(e.target.value)} /></div>
            {parseInt(viableEars) > 0 && (
              <div className="flex gap-4 text-sm font-medium">
                <Badge variant="secondary">{Math.round(earsPerHa).toLocaleString()} espigas viáveis/ha</Badge>
                <Badge variant="outline">{viablePct.toFixed(1)}% viáveis</Badge>
              </div>
            )}
          </div>

          {/* Kernels per ear */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">🔬 Contagem de Grãos por Espiga</h4>
            <p className="text-xs text-muted-foreground">Selecione espigas representativas. Recomendação: 3 a 5 espigas por ponto.</p>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="p-2 text-left">Espiga</th><th className="p-2">Fileiras</th><th className="p-2">Grãos/fil.</th><th className="p-2">Total</th><th className="p-2">Comp.(cm)</th><th className="p-2 w-10"></th></tr></thead>
                <tbody>
                  {ears.map((ear, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{ear.ear_number}</td>
                      <td className="p-1"><Input type="number" className="h-8 w-20 text-center" value={ear.kernel_rows || ""} onChange={(e) => updateEar(i, "kernel_rows", parseInt(e.target.value) || 0)} /></td>
                      <td className="p-1"><Input type="number" className="h-8 w-20 text-center" value={ear.kernels_per_row || ""} onChange={(e) => updateEar(i, "kernels_per_row", parseInt(e.target.value) || 0)} /></td>
                      <td className="p-2 text-center font-mono font-medium">{ear.total_kernels || "—"}</td>
                      <td className="p-1"><Input type="number" step="0.1" className="h-8 w-20 text-center" value={ear.ear_length_cm || ""} onChange={(e) => updateEar(i, "ear_length_cm", parseFloat(e.target.value) || 0)} /></td>
                      <td className="p-1">{ears.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEar(i)}><Trash2 className="h-3 w-3" /></Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button variant="ghost" size="sm" onClick={addEar} className="w-full border-t rounded-none"><Plus className="h-3 w-3 mr-1" />Adicionar espiga</Button>
            </div>
            {earStats.avg > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Média grãos/espiga</p><p className="text-lg font-bold">{earStats.avg.toFixed(0)}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">CV%</p><p className={`text-lg font-bold ${cvInfo.color}`}>{earStats.cv.toFixed(1)}%</p><p className={`text-xs ${cvInfo.color}`}>{cvInfo.label}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Mínimo</p><p className="text-lg font-bold">{earStats.min}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Máximo</p><p className="text-lg font-bold">{earStats.max}</p></CardContent></Card>
              </div>
            )}
          </div>

          {/* Moisture and weight */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">💧 Umidade e Peso</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Umidade da amostra (%) *</Label><Input type="number" step="0.1" value={moisturePct} onChange={(e) => setMoisturePct(e.target.value)} placeholder="25.0" /><p className="text-xs text-muted-foreground mt-1">Umidade dos grãos no momento</p></div>
              <div><Label>PMG estimado (g)</Label><Input type="number" step="1" value={tgwG} onChange={(e) => setTgwG(e.target.value)} placeholder={String(defaultTgw)} /><p className="text-xs text-muted-foreground mt-1">Se não informar, usa {defaultTgw}g</p></div>
            </div>
          </div>

          {/* Condition and notes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground">📝 Observações do Ponto</h4>
            <div><Label>Condição das plantas</Label>
              <Select value={plantCondition} onValueChange={setPlantCondition}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Espigas bem granadas, sem falha de polinização..." rows={2} /></div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar Ponto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
