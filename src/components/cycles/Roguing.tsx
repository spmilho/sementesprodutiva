import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineSyncContext } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, MapPin, Camera, Scissors, Leaf, Calendar, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

const OFF_TYPES = [
  { value: "tall_plant", label: "Planta alta" },
  { value: "short_plant", label: "Planta baixa" },
  { value: "diff_tassel", label: "Pendão diferente" },
  { value: "diff_ear", label: "Espiga diferente" },
  { value: "diseased", label: "Doente" },
  { value: "volunteer", label: "Voluntária" },
  { value: "other_hybrid", label: "Outro híbrido" },
  { value: "other", label: "Outro" },
];

const PARENTS = [
  { value: "female", label: "Fêmea" },
  { value: "male", label: "Macho" },
  { value: "both", label: "Ambos" },
];

const STAGES = [
  "VE","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","VT",
  "R1","R2","R3","R4","R5","R6",
];

function getTypeLabel(v: string) { return OFF_TYPES.find((t) => t.value === v)?.label ?? v; }
function getParentLabel(v: string) { return PARENTS.find((p) => p.value === v)?.label ?? v; }

function getTypeBadge(type: string) {
  if (type === "other_hybrid") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  if (type === "diseased") return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  if (type === "volunteer") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
}

interface Props {
  cycleId: string;
  orgId: string;
}

export default function Roguing({ cycleId, orgId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { addRecord } = useOfflineSyncContext();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [offType, setOffType] = useState("");
  const [parent, setParent] = useState("");
  const [description, setDescription] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [plantsRemoved, setPlantsRemoved] = useState("");
  const [corrective, setCorrective] = useState("");
  const [stage, setStage] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["roguing", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roguing_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalPlants = records.reduce((s: number, r: any) => s + Number(r.plants_removed), 0);
    const totalArea = records.reduce((s: number, r: any) => s + (Number(r.affected_area_m2) || 0), 0);
    const lastDate = records.length > 0 ? records[0].observation_date : null;
    return { totalPlants, totalArea, count: records.length, lastDate };
  }, [records]);

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error("GPS não suportado");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); toast.success("GPS capturado!"); },
      () => toast.error("Erro ao capturar GPS")
    );
  };

  const resetForm = () => {
    setOffType(""); setParent(""); setDescription(""); setAreaM2("");
    setPlantsRemoved(""); setCorrective(""); setStage(""); setLat(null); setLng(null);
  };

  const handleSave = async () => {
    if (!date || !offType || !parent || !description.trim() || !plantsRemoved) {
      return toast.error("Preencha todos os campos obrigatórios.");
    }
    setSaving(true);
    try {
      const { error } = await addRecord("roguing_records", {
        cycle_id: cycleId, org_id: orgId, observation_date: date, off_type: offType,
        affected_parent: parent, description: description.trim(),
        affected_area_m2: areaM2 ? parseFloat(areaM2) : null,
        plants_removed: parseInt(plantsRemoved), corrective_action: corrective || null,
        growth_stage: stage || null, gps_latitude: lat, gps_longitude: lng,
      }, cycleId);
      if (error) throw error;
      toast.success("Registro salvo!"); qc.invalidateQueries({ queryKey: ["roguing", cycleId] });
      setFormOpen(false); resetForm();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "roguing_records", _record_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído!"); qc.invalidateQueries({ queryKey: ["roguing", cycleId] });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Scissors className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Plantas Removidas</p>
          <p className="text-2xl font-bold">{stats.totalPlants}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Leaf className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Área Afetada</p>
          <p className="text-2xl font-bold">{stats.totalArea.toFixed(1)} <span className="text-sm font-normal">m²</span></p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <ClipboardList className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Registros</p>
          <p className="text-2xl font-bold">{stats.count}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Calendar className="h-4 w-4 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Última Inspeção</p>
          <p className="text-lg font-semibold">{stats.lastDate ? format(parseISO(stats.lastDate), "dd/MM/yy") : "—"}</p>
        </CardContent></Card>
      </div>

      {/* Action */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Registros de Roguing</h3>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" /> Registrar Roguing</Button>
      </div>

      {/* Table */}
      {records.length > 0 ? (
        <Card><CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Parental</TableHead>
              <TableHead className="text-xs text-right">Plantas</TableHead>
              <TableHead className="text-xs text-right">Área m²</TableHead>
              <TableHead className="text-xs">Estádio</TableHead>
              <TableHead className="text-xs">Ação</TableHead>
              <TableHead className="text-xs">Fotos</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id} className={r.off_type === "other_hybrid" ? "bg-red-50 dark:bg-red-950/30" : ""}>
                  <TableCell className="text-xs">{format(parseISO(r.observation_date), "dd/MM/yy")}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${getTypeBadge(r.off_type)}`}>{getTypeLabel(r.off_type)}</Badge></TableCell>
                  <TableCell className="text-xs">{getParentLabel(r.affected_parent)}</TableCell>
                  <TableCell className="text-xs text-right font-mono font-semibold">{r.plants_removed}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{r.affected_area_m2 ? Number(r.affected_area_m2).toFixed(1) : "—"}</TableCell>
                  <TableCell className="text-xs font-mono">{r.growth_stage || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{r.corrective_action || "—"}</TableCell>
                  <TableCell className="text-xs">{r.photos?.length ? <Camera className="h-3.5 w-3.5 text-muted-foreground" /> : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></CardContent></Card>
      ) : (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          Nenhum registro de roguing. Clique em "Registrar Roguing" para começar.
        </CardContent></Card>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Roguing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div>
                <Label>Tipo off-type *</Label>
                <Select value={offType} onValueChange={setOffType}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{OFF_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Parental *</Label>
                <Select value={parent} onValueChange={setParent}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PARENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estádio</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger><SelectValue placeholder="VE-R6" /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição *</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o off-type encontrado..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Plantas removidas *</Label><Input type="number" min="0" value={plantsRemoved} onChange={(e) => setPlantsRemoved(e.target.value)} /></div>
              <div><Label>Área afetada (m²)</Label><Input type="number" step="0.1" value={areaM2} onChange={(e) => setAreaM2(e.target.value)} /></div>
            </div>
            <div><Label>Ação corretiva</Label><Textarea value={corrective} onChange={(e) => setCorrective(e.target.value)} placeholder="Ação tomada..." /></div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={captureGPS}><MapPin className="h-3.5 w-3.5 mr-1" /> Capturar GPS</Button>
              {lat && lng && <span className="text-xs text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</span>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
