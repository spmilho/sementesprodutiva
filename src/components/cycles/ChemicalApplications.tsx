import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineSyncContext } from "@/components/Layout";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, ImageIcon, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const APP_TYPES = [
  "Herbicida", "Inseticida", "Fungicida", "Acaricida",
  "Adjuvante", "Foliar", "Regulador", "Outro",
] as const;

const DOSE_UNITS = ["L/ha", "kg/ha", "mL/ha", "g/ha"] as const;
const METHODS = ["terrestre", "aérea", "quimigação"] as const;

const TYPE_COLORS: { [key: string]: string } = {
  Herbicida: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Inseticida: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  Fungicida: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Acaricida: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  Adjuvante: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  Foliar: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  Regulador: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Outro: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
};

interface Props {
  cycleId: string;
  orgId: string;
}

export default function ChemicalApplications({ cycleId, orgId }: Props) {
  const queryClient = useQueryClient();
  const { addRecord } = useOfflineSyncContext();
  const [open, setOpen] = useState(false);

  // Form state
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [productName, setProductName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [dosePerHa, setDosePerHa] = useState("");
  const [doseUnit, setDoseUnit] = useState<string>("L/ha");
  const [sprayVolume, setSprayVolume] = useState("");
  const [method, setMethod] = useState<string>("terrestre");
  const [areaApplied, setAreaApplied] = useState("");
  const [appType, setAppType] = useState<string>("Herbicida");
  const [targetPest, setTargetPest] = useState("");
  const [prescriptionNumber, setPrescriptionNumber] = useState("");
  const [responsibleTechnician, setResponsibleTechnician] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [appTime, setAppTime] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const qk = ["chemical_applications", cycleId];

  const { data: records = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("chemical_applications")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("application_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await addRecord("chemical_applications", {
        cycle_id: cycleId,
        org_id: orgId,
        application_date: date,
        product_name: productName,
        active_ingredient: activeIngredient || null,
        dose_per_ha: parseFloat(dosePerHa),
        dose_unit: doseUnit,
        spray_volume: sprayVolume ? parseFloat(sprayVolume) : null,
        application_method: method,
        area_applied_ha: parseFloat(areaApplied),
        application_type: appType,
        target_pest: targetPest || null,
        prescription_number: prescriptionNumber || null,
        responsible_technician: responsibleTechnician || null,
        wind_speed_kmh: windSpeed ? parseFloat(windSpeed) : null,
        temperature_c: temperature ? parseFloat(temperature) : null,
        humidity_pct: humidity ? parseFloat(humidity) : null,
        application_time: appTime || null,
        notes: notes || null,
        gps_latitude: lat ? parseFloat(lat) : null,
        gps_longitude: lng ? parseFloat(lng) : null,
      }, cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk });
      toast.success("Aplicação registrada!");
      resetForm();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "chemical_applications", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); toast.success("Removido!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setDate(format(new Date(), "yyyy-MM-dd"));
    setProductName(""); setActiveIngredient(""); setDosePerHa(""); setDoseUnit("L/ha");
    setSprayVolume(""); setMethod("terrestre"); setAreaApplied(""); setAppType("Herbicida");
    setTargetPest(""); setPrescriptionNumber(""); setResponsibleTechnician("");
    setWindSpeed(""); setTemperature(""); setHumidity(""); setAppTime("");
    setNotes(""); setLat(""); setLng("");
  };

  const captureGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); toast.success("GPS capturado!"); },
      () => toast.error("Não foi possível capturar GPS")
    );
  };

  const canSave = productName && dosePerHa && areaApplied && date;

  // KPIs
  const totalApps = records.length;
  const lastDate = records.length ? format(new Date(records[0].application_date + "T12:00:00"), "dd/MM/yyyy") : "—";
  const totalArea = records.reduce((s: number, r: any) => s + Number(r.area_applied_ha || 0), 0);
  const typeCounts = useMemo(() => {
    const m: { [k: string]: number } = {};
    records.forEach((r: any) => { m[r.application_type] = (m[r.application_type] || 0) + 1; });
    return m;
  }, [records]);

  // Chart data
  const chartData = useMemo(() => {
    if (records.length < 5) return null;
    const sorted = [...records].sort((a: any, b: any) => a.application_date.localeCompare(b.application_date));
    return sorted.map((r: any) => ({
      date: format(new Date(r.application_date + "T12:00:00"), "dd/MM"),
      dose: Number(r.dose_per_ha),
      area: Number(r.area_applied_ha),
      tipo: r.application_type,
    }));
  }, [records]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Aplicações</p><p className="text-2xl font-bold text-foreground">{totalApps}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Última Aplicação</p><p className="text-lg font-semibold text-foreground mt-1">{lastDate}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Por Tipo</p><div className="flex flex-wrap gap-1 mt-1">{Object.entries(typeCounts).map(([t, c]) => <Badge key={t} variant="outline" className={TYPE_COLORS[t] || ""}>{t}: {c}</Badge>)}{totalApps === 0 && <span className="text-sm text-muted-foreground">—</span>}</div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Área Acumulada</p><p className="text-2xl font-bold text-foreground">{totalArea.toFixed(1)} ha</p></CardContent></Card>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Aplicação</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova Aplicação Química</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Produto */}
              <p className="text-sm font-medium text-muted-foreground">Produto</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div><Label>Produto *</Label><Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Nome comercial" /></div>
                <div><Label>Ingrediente Ativo</Label><Input value={activeIngredient} onChange={e => setActiveIngredient(e.target.value)} /></div>
                <div><Label>Dose/ha *</Label><Input type="number" step="0.01" value={dosePerHa} onChange={e => setDosePerHa(e.target.value)} /></div>
                <div><Label>Unidade</Label>
                  <Select value={doseUnit} onValueChange={setDoseUnit}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOSE_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Volume Calda (L/ha)</Label><Input type="number" step="0.1" value={sprayVolume} onChange={e => setSprayVolume(e.target.value)} /></div>
              </div>

              {/* Aplicação */}
              <p className="text-sm font-medium text-muted-foreground">Aplicação</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Método</Label>
                  <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Área (ha) *</Label><Input type="number" step="0.01" value={areaApplied} onChange={e => setAreaApplied(e.target.value)} /></div>
                <div><Label>Tipo</Label>
                  <Select value={appType} onValueChange={setAppType}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{APP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label>Praga Alvo</Label><Input value={targetPest} onChange={e => setTargetPest(e.target.value)} /></div>
                <div><Label>Nº Receituário</Label><Input value={prescriptionNumber} onChange={e => setPrescriptionNumber(e.target.value)} /></div>
                <div><Label>Responsável Técnico</Label><Input value={responsibleTechnician} onChange={e => setResponsibleTechnician(e.target.value)} /></div>
              </div>

              {/* Condições */}
              <p className="text-sm font-medium text-muted-foreground">Condições</p>
              <div className="grid grid-cols-4 gap-3">
                <div><Label>Vento (km/h)</Label><Input type="number" step="0.1" value={windSpeed} onChange={e => setWindSpeed(e.target.value)} /></div>
                <div><Label>Temp (°C)</Label><Input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)} /></div>
                <div><Label>UR (%)</Label><Input type="number" step="1" value={humidity} onChange={e => setHumidity(e.target.value)} /></div>
                <div><Label>Horário</Label><Input type="time" value={appTime} onChange={e => setAppTime(e.target.value)} /></div>
              </div>

              {/* GPS */}
              <div className="flex items-end gap-3">
                <div className="flex-1"><Label>Latitude</Label><Input value={lat} onChange={e => setLat(e.target.value)} /></div>
                <div className="flex-1"><Label>Longitude</Label><Input value={lng} onChange={e => setLng(e.target.value)} /></div>
                <Button type="button" variant="outline" size="sm" onClick={captureGPS}><MapPin className="h-4 w-4 mr-1" />GPS</Button>
              </div>

              <div><Label>Observações</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

              <Button className="w-full" disabled={!canSave || insertMutation.isPending} onClick={() => insertMutation.mutate()}>
                {insertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chart */}
      {chartData && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Timeline de Aplicações</p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="dose" name="Dose/ha" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="area" name="Área (ha)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {records.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhuma aplicação registrada.</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Praga</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Resp.</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.application_date + "T12:00:00"), "dd/MM/yy")}</TableCell>
                    <TableCell className="text-xs font-medium">{r.product_name}</TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_COLORS[r.application_type] || ""}>{r.application_type}</Badge></TableCell>
                    <TableCell className="text-xs">{r.dose_per_ha} {r.dose_unit}</TableCell>
                    <TableCell className="text-xs">{r.area_applied_ha} ha</TableCell>
                    <TableCell className="text-xs">{r.application_method}</TableCell>
                    <TableCell className="text-xs">{r.target_pest || "—"}</TableCell>
                    <TableCell className="text-xs">{r.prescription_number || "—"}</TableCell>
                    <TableCell className="text-xs">{r.responsible_technician || "—"}</TableCell>
                    <TableCell>{r.photos?.length ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Remover?")) deleteMutation.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
