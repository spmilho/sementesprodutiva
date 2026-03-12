import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaveIrrigation: (data: { start_date: string; end_date?: string; depth_mm: number; duration_hours?: number; system_type?: string; sector?: string; notes?: string }) => void;
  onSaveRainfall: (data: { record_date: string; precipitation_mm: number; method?: string; notes?: string }) => void;
  saving?: boolean;
}

export default function ManualRecordDialog({ open, onClose, onSaveIrrigation, onSaveRainfall, saving }: Props) {
  const [tab, setTab] = useState("irrigation");
  // Irrigation
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [depth, setDepth] = useState("");
  const [duration, setDuration] = useState("");
  const [system, setSystem] = useState("");
  const [sector, setSector] = useState("");
  const [irrNotes, setIrrNotes] = useState("");
  // Rainfall
  const [rainDate, setRainDate] = useState("");
  const [precip, setPrecip] = useState("");
  const [method, setMethod] = useState("");
  const [rainNotes, setRainNotes] = useState("");

  const handleSaveIrr = () => {
    if (!startDate || !depth) return;
    onSaveIrrigation({
      start_date: startDate,
      end_date: endDate || undefined,
      depth_mm: Number(depth),
      duration_hours: duration ? Number(duration) : undefined,
      system_type: system || undefined,
      sector: sector || undefined,
      notes: irrNotes || undefined,
    });
  };

  const handleSaveRain = () => {
    if (!rainDate || !precip) return;
    onSaveRainfall({
      record_date: rainDate,
      precipitation_mm: Number(precip),
      method: method || undefined,
      notes: rainNotes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registro Manual</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="irrigation" className="flex-1">💧 Irrigação</TabsTrigger>
            <TabsTrigger value="rainfall" className="flex-1">🌧️ Chuva</TabsTrigger>
          </TabsList>

          <TabsContent value="irrigation" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Data início *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><Label className="text-xs">Data fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Lâmina (mm) *</Label><Input type="number" step="0.1" value={depth} onChange={e => setDepth(e.target.value)} /></div>
              <div><Label className="text-xs">Tempo (horas)</Label><Input type="number" step="0.1" value={duration} onChange={e => setDuration(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Sistema</Label>
              <Select value={system} onValueChange={setSystem}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pivo_central">Pivô Central</SelectItem>
                  <SelectItem value="aspersao">Aspersão</SelectItem>
                  <SelectItem value="gotejo">Gotejo</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Setor/Gleba</Label><Input value={sector} onChange={e => setSector(e.target.value)} /></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={irrNotes} onChange={e => setIrrNotes(e.target.value)} rows={2} /></div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSaveIrr} disabled={!startDate || !depth || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="rainfall" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Data *</Label><Input type="date" value={rainDate} onChange={e => setRainDate(e.target.value)} /></div>
              <div><Label className="text-xs">Precipitação (mm) *</Label><Input type="number" step="0.1" value={precip} onChange={e => setPrecip(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pluviometro">Pluviômetro</SelectItem>
                  <SelectItem value="estacao">Estação meteorológica</SelectItem>
                  <SelectItem value="estimativa">Estimativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea value={rainNotes} onChange={e => setRainNotes(e.target.value)} rows={2} /></div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSaveRain} disabled={!rainDate || !precip || saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
