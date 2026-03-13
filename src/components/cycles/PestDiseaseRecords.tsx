import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineSyncContext } from "@/components/Layout";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, ImageIcon, Loader2, MapPin, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PEST_TYPES = ["Praga", "Doença", "Daninha", "Nematóide", "Outro"] as const;
const SEVERITIES = ["Baixa", "Moderada", "Alta", "Crítica"] as const;
const PARENTS = ["Fêmea", "Macho", "Ambos"] as const;
const STAGES = ["VE","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","VT","R1","R2","R3","R4","R5","R6"] as const;

const PESTS_BY_TYPE: Record<string, string[]> = {
  Praga: [
    "Spodoptera frugiperda (Lagarta-do-cartucho)",
    "Helicoverpa zea (Lagarta-da-espiga)",
    "Helicoverpa armigera",
    "Dalbulus maidis (Cigarrinha-do-milho)",
    "Diabrotica speciosa (Vaquinha-verde-amarela)",
    "Rhopalosiphum maidis (Pulgão-do-milho)",
    "Elasmopalpus lignosellus (Lagarta-elasmo)",
    "Dichelops melacanthus (Percevejo-barriga-verde)",
    "Agrotis ipsilon (Lagarta-rosca)",
    "Sitophilus zeamais (Gorgulho-do-milho)",
    "Deois flavopicta (Cigarrinha-das-pastagens)",
    "Frankliniella williamsi (Tripes-do-milho)",
    "Mahanarva fimbriolata (Cigarrinha-da-raiz)",
    "Conoderus scalaris (Larva-arame)",
    "Mocis latipes (Curuquerê-dos-capinzais)",
    "Spodoptera cosmioides",
    "Spodoptera eridania",
  ],
  Doença: [
    "Cercospora zeae-maydis (Cercosporiose)",
    "Exserohilum turcicum (Helmintosporiose)",
    "Puccinia polysora (Ferrugem-polissora)",
    "Puccinia sorghi (Ferrugem-comum)",
    "Physopella zeae (Ferrugem-tropical)",
    "Phaeosphaeria maydis (Mancha-de-phaeosphaeria)",
    "Fusarium verticillioides (Podridão-de-fusarium)",
    "Fusarium graminearum (Giberela)",
    "Colletotrichum graminicola (Antracnose)",
    "Stenocarpella maydis (Diplodia / Podridão-branca)",
    "Stenocarpella macrospora (Mancha-de-diplodia)",
    "Pantoea ananatis (Mancha-branca)",
    "Kabatiella zeae (Mancha-ocular)",
    "Bipolaris maydis (Mancha-de-bipolaris)",
    "Peronosclerospora sorghi (Míldio-do-milho)",
    "Ustilago maydis (Carvão-do-milho)",
    "Molicutes (Enfezamento-pálido)",
    "Fitoplasma (Enfezamento-vermelho)",
    "Maize Rayado Fino Virus (MRFV)",
    "Sugarcane Mosaic Virus (SCMV)",
  ],
  Daninha: [
    "Cyperus rotundus (Tiririca)",
    "Digitaria horizontalis (Capim-colchão)",
    "Brachiaria plantaginea (Capim-marmelada)",
    "Brachiaria decumbens (Braquiária)",
    "Ipomoea grandifolia (Corda-de-viola)",
    "Ipomoea triloba (Corda-de-viola)",
    "Amaranthus hybridus (Caruru)",
    "Amaranthus palmeri (Caruru-palmeri)",
    "Bidens pilosa (Picão-preto)",
    "Commelina benghalensis (Trapoeraba)",
    "Euphorbia heterophylla (Leiteiro)",
    "Eleusine indica (Capim-pé-de-galinha)",
    "Raphanus raphanistrum (Nabiça)",
    "Richardia brasiliensis (Poaia-branca)",
    "Sida rhombifolia (Guanxuma)",
    "Sorghum halepense (Capim-massambará)",
    "Cenchrus echinatus (Capim-carrapicho)",
  ],
  Nematóide: [
    "Pratylenchus brachyurus (Nematóide-das-lesões)",
    "Pratylenchus zeae",
    "Meloidogyne incognita (Nematóide-das-galhas)",
    "Meloidogyne javanica (Nematóide-das-galhas)",
    "Heterodera zeae (Nematóide-do-cisto-do-milho)",
    "Rotylenchulus reniformis (Nematóide-reniforme)",
  ],
  Outro: [],
};

const TYPE_COLORS: { [k: string]: string } = {
  Praga: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Doença: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  Daninha: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Nematóide: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Outro: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const SEV_COLORS: { [k: string]: string } = {
  Baixa: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Moderada: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Alta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Crítica: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

interface Props { cycleId: string; orgId: string; }

export default function PestDiseaseRecords({ cycleId, orgId }: Props) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCustomName, setShowCustomName] = useState(false);

  // Form
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pestName, setPestName] = useState("");
  const [pestType, setPestType] = useState<string>("Praga");
  const [incidence, setIncidence] = useState("");
  const [severity, setSeverity] = useState<string>("Baixa");
  // score removed - using severity only
  const [stage, setStage] = useState("");
  const [parent, setParent] = useState<string>("Ambos");
  const [area, setArea] = useState("");
  const [action, setAction] = useState("");
  const [nde, setNde] = useState(false);
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const qk = ["pest_disease_records", cycleId];

  const { data: records = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pest_disease_records").select("*").eq("cycle_id", cycleId)
        .order("observation_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd")); setPestName(""); setPestType("Praga");
    setIncidence(""); setSeverity("Baixa"); setStage(""); setParent("Ambos");
    setArea(""); setAction(""); setNde(false); setNotes(""); setLat(""); setLng("");
    setEditingId(null);
  };

  const openForEdit = (r: any) => {
    setEditingId(r.id);
    setDate(r.observation_date || format(new Date(), "yyyy-MM-dd"));
    setPestName(r.pest_name || "");
    setPestType(r.pest_type || "Praga");
    setIncidence(r.incidence_pct != null ? String(r.incidence_pct) : "");
    setSeverity(r.severity || "Baixa");
    // score removed
    setStage(r.growth_stage || "");
    setParent(r.affected_parent || "Ambos");
    setArea(r.affected_area_ha != null ? String(r.affected_area_ha) : "");
    setAction(r.action_taken || "");
    setNde(r.economic_damage_reached || false);
    setNotes(r.notes || "");
    setLat(r.gps_latitude != null ? String(r.gps_latitude) : "");
    setLng(r.gps_longitude != null ? String(r.gps_longitude) : "");
    setOpen(true);
  };

  const buildPayload = () => ({
    observation_date: date,
    pest_name: pestName, pest_type: pestType,
    incidence_pct: incidence ? parseFloat(incidence) : null,
    severity, severity_score: null,
    growth_stage: stage || null, affected_parent: parent,
    affected_area_ha: area ? parseFloat(area) : null,
    action_taken: action || null, economic_damage_reached: nde,
    notes: notes || null,
    gps_latitude: lat ? parseFloat(lat) : null,
    gps_longitude: lng ? parseFloat(lng) : null,
  });

  const insertMut = useMutation({
    mutationFn: async () => {
      const { error } = await addRecord("pest_disease_records", {
        cycle_id: cycleId, org_id: orgId, ...buildPayload(),
      }, cycleId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); toast.success("Ocorrência registrada!"); resetForm(); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await (supabase as any)
        .from("pest_disease_records")
        .update(buildPayload())
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); toast.success("Ocorrência atualizada!"); resetForm(); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "pest_disease_records", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const captureGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); toast.success("GPS capturado!"); },
      () => toast.error("Não foi possível capturar GPS")
    );
  };

  const nameOptions = PESTS_BY_TYPE[pestType] || [];

  // KPIs
  const total = records.length;
  const maxSev = useMemo(() => {
    if (!records.length) return "—";
    const order = ["Crítica", "Alta", "Moderada", "Baixa"];
    for (const s of order) { if (records.some((r: any) => r.severity === s)) return s; }
    return "—";
  }, [records]);

  const topPest = useMemo(() => {
    if (!records.length) return "—";
    const counts: { [k: string]: number } = {};
    records.forEach((r: any) => { counts[r.pest_name] = (counts[r.pest_name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [records]);

  const lastInspection = useMemo(() => {
    if (!records.length) return { text: "—", alert: false };
    const d = new Date(records[0].observation_date + "T12:00:00");
    const days = differenceInDays(new Date(), d);
    return { text: format(d, "dd/MM/yyyy"), alert: days > 7 };
  }, [records]);

  // Chart
  const SEV_NUM: Record<string, number> = { Baixa: 1, Moderada: 2, Alta: 3, Crítica: 4 };

  const chartsByPest = useMemo(() => {
    if (records.length < 2) return null;
    const grouped: Record<string, any[]> = {};
    const sorted = [...records]
      .filter((r: any) => r.incidence_pct != null)
      .sort((a: any, b: any) => a.observation_date.localeCompare(b.observation_date));
    if (sorted.length < 2) return null;
    sorted.forEach((r: any) => {
      const name = r.pest_name;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({
        date: format(new Date(r.observation_date + "T12:00:00"), "dd/MM"),
        incidência: Number(r.incidence_pct),
        severidade: SEV_NUM[r.severity] || 0,
        estádio: r.growth_stage || "",
        severidadeLabel: r.severity,
      });
    });
    // Only return pests with 2+ data points
    return Object.entries(grouped).filter(([, v]) => v.length >= 2);
  }, [records]);

  const canSave = pestName && date;
  const isSaving = insertMut.isPending || updateMut.isPending;

  const handleSave = () => {
    if (editingId) {
      updateMut.mutate();
    } else {
      insertMut.mutate();
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ocorrências</p><p className="text-2xl font-bold text-foreground">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Maior Severidade</p><Badge variant="outline" className={`mt-1 ${SEV_COLORS[maxSev] || ""}`}>{maxSev}</Badge></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Principal Praga</p><p className="text-sm font-semibold text-foreground mt-1 italic truncate">{topPest}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Última Inspeção</p><div className="flex items-center gap-1 mt-1"><p className={`text-sm font-semibold ${lastInspection.alert ? "text-destructive" : "text-foreground"}`}>{lastInspection.text}</p>{lastInspection.alert && <AlertTriangle className="h-4 w-4 text-destructive" />}</div></CardContent></Card>
      </div>

      {/* Add / Edit Dialog */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Ocorrência</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Ocorrência" : "Nova Ocorrência Fitossanitária"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo *</Label>
                  <Select value={pestType} onValueChange={(v) => { setPestType(v); setPestName(""); setShowCustomName(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  {!showCustomName && nameOptions.length > 0 ? (
                    <div className="space-y-1.5">
                      <Select value={pestName} onValueChange={(v) => { if (v === "__custom__") { setShowCustomName(true); setPestName(""); } else { setPestName(v); } }}>
                        <SelectTrigger><SelectValue placeholder="Selecione a ocorrência" /></SelectTrigger>
                        <SelectContent className="max-h-60">
                          {nameOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                          <SelectItem value="__custom__">✏️ Digitar outro nome...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input value={pestName} onChange={e => setPestName(e.target.value)} placeholder="Digite o nome da praga/doença" className="flex-1" />
                      {nameOptions.length > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => { setShowCustomName(false); setPestName(""); }}>Lista</Button>
                      )}
                    </div>
                  )}
                </div>
                <div><Label>Incidência (%)</Label><Input type="number" step="0.1" min="0" max="100" value={incidence} onChange={e => setIncidence(e.target.value)} /></div>
                <div><Label>Severidade</Label>
                  <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Nota (1-9) *</Label><Input type="number" min="1" max="9" value={score} onChange={e => setScore(e.target.value)} /></div>
                <div><Label>Estádio</Label>
                  <Select value={stage} onValueChange={setStage}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Parental</Label>
                  <Select value={parent} onValueChange={setParent}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PARENTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Área (ha)</Label><Input type="number" step="0.01" value={area} onChange={e => setArea(e.target.value)} /></div>
                <div><Label>Ação Tomada</Label><Input value={action} onChange={e => setAction(e.target.value)} placeholder="Aplicação de..." /></div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={nde} onCheckedChange={setNde} id="nde" />
                <Label htmlFor="nde" className="text-sm">NDE atingido (Nível de Dano Econômico)</Label>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1"><Label>Latitude</Label><Input value={lat} onChange={e => setLat(e.target.value)} /></div>
                <div className="flex-1"><Label>Longitude</Label><Input value={lng} onChange={e => setLng(e.target.value)} /></div>
                <Button type="button" variant="outline" size="sm" onClick={captureGPS}><MapPin className="h-4 w-4 mr-1" />GPS</Button>
              </div>

              <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

              <Button className="w-full" disabled={!canSave || isSaving} onClick={handleSave}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingId ? "Atualizar" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chart */}
      {chartData && (
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Incidência ao Longo do Tempo</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[1, 9]} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="incidência" name="Incidência %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="nota" name="Nota" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      {/* Table */}
      {records.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhuma ocorrência registrada.</CardContent></Card>
      ) : (
        <Card><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Sev.</TableHead><TableHead>Nota</TableHead><TableHead>Inc. %</TableHead>
              <TableHead>Parental</TableHead><TableHead>Estádio</TableHead><TableHead>NDE</TableHead>
              <TableHead>Ação</TableHead><TableHead>Fotos</TableHead><TableHead className="w-20"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id} className={r.economic_damage_reached ? "bg-destructive/5" : ""}>
                  <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.observation_date + "T12:00:00"), "dd/MM/yy")}</TableCell>
                  <TableCell className="text-xs font-medium italic">{r.pest_name}</TableCell>
                  <TableCell><Badge variant="outline" className={TYPE_COLORS[r.pest_type] || ""}>{r.pest_type}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={SEV_COLORS[r.severity] || ""}>{r.severity}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{r.severity_score}</TableCell>
                  <TableCell className="text-xs">{r.incidence_pct != null ? `${r.incidence_pct}%` : "—"}</TableCell>
                  <TableCell className="text-xs">{r.affected_parent}</TableCell>
                  <TableCell className="text-xs">{r.growth_stage || "—"}</TableCell>
                  <TableCell>{r.economic_damage_reached ? <Badge variant="destructive" className="text-[10px]">NDE</Badge> : "—"}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate">{r.action_taken || "—"}</TableCell>
                  <TableCell>{r.photos?.length ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForEdit(r)}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Remover?")) deleteMut.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div></Card>
      )}
    </div>
  );
}
