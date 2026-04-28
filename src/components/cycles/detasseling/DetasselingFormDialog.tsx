import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineSyncContext } from "@/components/Layout";
import {
  PASS_TYPES, SHIFTS, METHODS, TASSEL_HEIGHTS, DIFFICULTIES_OPTIONS,
  isManualMethod, isMechanicalMethod,
} from "./constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  orgId: string;
}

function pctColor(val: number, thresholds: [number, number, number]) {
  if (val >= thresholds[0]) return "text-green-600";
  if (val >= thresholds[1]) return "text-yellow-600";
  if (val >= thresholds[2]) return "text-orange-600";
  return "text-red-600";
}

function remainColor(val: number) {
  if (val <= 0.3) return "text-green-600";
  if (val <= 0.5) return "text-yellow-600";
  if (val <= 1) return "text-orange-600";
  return "text-red-600";
}

export default function DetasselingFormDialog({ open, onOpenChange, cycleId, orgId }: Props) {
  const qc = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [passType, setPassType] = useState("first_pass");
  const [shift, setShift] = useState("");
  const [areaWorked, setAreaWorked] = useState("");
  const [method, setMethod] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [machineId, setMachineId] = useState("");
  const [machineHours, setMachineHours] = useState("");
  const [machineSpeed, setMachineSpeed] = useState("");
  const [pctDetasseled, setPctDetasseled] = useState("");
  const [pctRemaining, setPctRemaining] = useState("");
  const [tasselHeight, setTasselHeight] = useState("");
  const [difficulties, setDifficulties] = useState<string[]>([]);
  const [nc, setNc] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const yieldPerPerson = useMemo(() => {
    const a = parseFloat(areaWorked);
    const t = parseInt(teamSize);
    if (!a || !t || t <= 0) return null;
    return (a / t).toFixed(2);
  }, [areaWorked, teamSize]);

  const machineYield = useMemo(() => {
    const a = parseFloat(areaWorked);
    const h = parseFloat(machineHours);
    if (!a || !h || h <= 0) return null;
    return (a / h).toFixed(2);
  }, [areaWorked, machineHours]);

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS não suportado");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); toast.success("GPS capturado!"); },
      () => toast.error("Erro ao capturar GPS")
    );
  };

  const handleSave = async () => {
    if (!date || !passType || !areaWorked || !method || !pctDetasseled || !pctRemaining) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    if (nc && (!false)) {
      // Photos validation skipped for now - would need file upload integration
    }
    setSaving(true);
    try {
      // Resolve org_id from the user's profile (RLS expects org_id = user_org_id())
      let effectiveOrgId = orgId;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return toast.error("Sessão expirada. Faça login novamente.");
      }
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();
      if (profile?.org_id) effectiveOrgId = profile.org_id;

      const area = parseFloat(areaWorked);
      const { error } = await addRecord("detasseling_records", {
        cycle_id: cycleId,
        org_id: effectiveOrgId,
        created_by: user.id,
        operation_date: date,
        pass_type: passType,
        shift: shift || null,
        area_worked_ha: area,
        method,
        team_size: isManualMethod(method) ? parseInt(teamSize) || null : null,
        yield_per_person_ha: isManualMethod(method) && yieldPerPerson ? parseFloat(yieldPerPerson) : null,
        machine_id: isMechanicalMethod(method) ? machineId || null : null,
        machine_hours: isMechanicalMethod(method) ? parseFloat(machineHours) || null : null,
        machine_yield_ha_h: isMechanicalMethod(method) && machineYield ? parseFloat(machineYield) : null,
        machine_speed_kmh: isMechanicalMethod(method) ? parseFloat(machineSpeed) || null : null,
        pct_detasseled_this_pass: parseFloat(pctDetasseled),
        pct_remaining_after: parseFloat(pctRemaining),
        tassel_height: tasselHeight || null,
        difficulties: difficulties.length > 0 ? difficulties : null,
        non_conformities: nc || null,
        notes: notes || null,
        gps_latitude: lat,
        gps_longitude: lng,
      }, cycleId);
      if (error) throw error;
      toast.success("Operação registrada!");
      qc.invalidateQueries({ queryKey: ["detasseling", cycleId] });
      onOpenChange(false);
      // Reset form
      setAreaWorked(""); setMethod(""); setTeamSize(""); setMachineId(""); setMachineHours("");
      setMachineSpeed(""); setPctDetasseled(""); setPctRemaining(""); setTasselHeight("");
      setDifficulties([]); setNc(""); setNotes(""); setLat(null); setLng(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Operação de Despendoamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identification */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Passada *</Label>
                <Select value={passType} onValueChange={setPassType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PASS_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turno</Label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SHIFTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Area and Method */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Área e Método</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Área trabalhada (ha) *</Label>
                <Input type="number" step="0.01" value={areaWorked} onChange={(e) => setAreaWorked(e.target.value)} />
              </div>
              <div>
                <Label>Método *</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {isManualMethod(method) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Tamanho da equipe (pessoas) *</Label>
                  <Input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
                </div>
                <div>
                  <Label>Rendimento</Label>
                  <div className="h-10 flex items-center text-sm font-medium">
                    {yieldPerPerson ? `${yieldPerPerson} ha/pessoa/dia` : "—"}
                  </div>
                </div>
              </div>
            )}

            {isMechanicalMethod(method) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label>Máquina</Label>
                  <Input value={machineId} onChange={(e) => setMachineId(e.target.value)} placeholder="Ex: Despendoadeira #02" />
                </div>
                <div>
                  <Label>Horas máquina</Label>
                  <Input type="number" step="0.1" value={machineHours} onChange={(e) => setMachineHours(e.target.value)} />
                </div>
                <div>
                  <Label>Rendimento máquina</Label>
                  <div className="h-10 flex items-center text-sm font-medium">
                    {machineYield ? `${machineYield} ha/hora` : "—"}
                  </div>
                </div>
                <div>
                  <Label>Velocidade média (km/h)</Label>
                  <Input type="number" step="0.1" value={machineSpeed} onChange={(e) => setMachineSpeed(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Efficiency */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Eficiência da Passada</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>% Pendão tirado NESTA passada *</Label>
                <Input type="number" step="0.1" min="0" max="100" value={pctDetasseled} onChange={(e) => setPctDetasseled(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">1ª passada: tipicamente 85-95%</p>
                {pctDetasseled && (
                  <span className={`text-xs font-medium ${pctColor(parseFloat(pctDetasseled), [95, 85, 70])}`}>
                    {parseFloat(pctDetasseled) >= 95 ? "🟢 Excelente" : parseFloat(pctDetasseled) >= 85 ? "🟡 Bom" : parseFloat(pctDetasseled) >= 70 ? "🟠 Regular" : "🔴 Baixo"}
                  </span>
                )}
              </div>
              <div>
                <Label>% Remanescente após passada *</Label>
                <Input type="number" step="0.01" min="0" max="100" value={pctRemaining} onChange={(e) => setPctRemaining(e.target.value)} />
                {pctRemaining && (
                  <span className={`text-xs font-medium ${remainColor(parseFloat(pctRemaining))}`}>
                    {parseFloat(pctRemaining) <= 0.3 ? "🟢 Ótimo" : parseFloat(pctRemaining) <= 0.5 ? "🟡 Aceitável" : parseFloat(pctRemaining) <= 1 ? "🟠 Atenção" : "🔴 Crítico"}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3">
              <Label>Altura do pendão ao remover</Label>
              <Select value={tasselHeight} onValueChange={setTasselHeight}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TASSEL_HEIGHTS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="mt-3">
              <Label>Dificuldades</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {DIFFICULTIES_OPTIONS.map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-xs">
                    <Checkbox
                      checked={difficulties.includes(d)}
                      onCheckedChange={(checked) => {
                        setDifficulties((prev) => checked ? [...prev, d] : prev.filter((x) => x !== d));
                      }}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Occurrences */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Ocorrências</h4>
            <div>
              <Label>Não conformidades</Label>
              <Textarea
                value={nc}
                onChange={(e) => setNc(e.target.value)}
                className={nc ? "border-red-500" : ""}
                placeholder="Descreva não conformidades encontradas..."
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS}>
                <MapPin className="h-3.5 w-3.5 mr-1" /> Capturar GPS
              </Button>
              {lat && lng && <span className="text-xs text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</span>}
            </div>
            <div className="mt-3">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
