import { useState, useMemo } from "react";
import { Plus, Loader2, CalendarIcon, Settings, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOfflineSyncContext } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

// ═══════════ CONSTANTS ═══════════

interface NutritionProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  cooperatorName?: string;
  totalArea?: number;
}

const FERT_TYPES = [
  { value: "base_broadcast", label: "Adubação de base (pré-plantio — a lanço)" },
  { value: "base_incorporated", label: "Adubação de base (pré-plantio — incorporada)" },
  { value: "furrow", label: "Adubação no sulco de plantio" },
  { value: "topdress_1", label: "Cobertura — 1ª aplicação" },
  { value: "topdress_2", label: "Cobertura — 2ª aplicação" },
  { value: "topdress_3", label: "Cobertura — 3ª aplicação" },
  { value: "fertigation", label: "Fertirrigação (via pivô)" },
  { value: "foliar", label: "Nutrição foliar" },
  { value: "other", label: "Outro" },
];

const GROWTH_STAGES = [
  "Pré-plantio", "Plantio", "VE", "V2", "V4", "V6", "V8", "V10", "V12", "VT", "R1", "R2", "R3",
];

const TARGET_PARENTS = [
  { value: "all", label: "Área total (macho + fêmea)" },
  { value: "female_only", label: "Somente fêmea" },
  { value: "male_only", label: "Somente macho" },
];

const APP_METHODS = [
  { value: "broadcast", label: "A lanço" },
  { value: "furrow", label: "No sulco" },
  { value: "band", label: "Em linha/filete" },
  { value: "fertigation", label: "Fertirrigação via pivô" },
  { value: "foliar_spray", label: "Pulverização foliar" },
  { value: "other", label: "Outro" },
];

const DOSE_UNITS = [
  { value: "kg/ha", label: "kg/ha" },
  { value: "L/ha", label: "L/ha" },
  { value: "ton/ha", label: "ton/ha" },
];

const TYPE_COLORS: Record<string, string> = {
  base_broadcast: "#795548",
  base_incorporated: "#795548",
  furrow: "#795548",
  topdress_1: "#388E3C",
  topdress_2: "#388E3C",
  topdress_3: "#388E3C",
  fertigation: "#1976D2",
  foliar: "#8BC34A",
  other: "#9E9E9E",
};

const TYPE_CATEGORY: Record<string, string> = {
  base_broadcast: "Base",
  base_incorporated: "Base",
  furrow: "Base",
  topdress_1: "Cobertura",
  topdress_2: "Cobertura",
  topdress_3: "Cobertura",
  fertigation: "Fertirrigação",
  foliar: "Foliar",
  other: "Outro",
};

const MICRO_FIELDS = [
  { key: "s_kg_ha", label: "S" }, { key: "ca_kg_ha", label: "Ca" }, { key: "mg_kg_ha", label: "Mg" },
  { key: "zn_kg_ha", label: "Zn" }, { key: "b_kg_ha", label: "B" }, { key: "mn_kg_ha", label: "Mn" },
  { key: "cu_kg_ha", label: "Cu" }, { key: "fe_kg_ha", label: "Fe" }, { key: "mo_kg_ha", label: "Mo" },
  { key: "co_kg_ha", label: "Co" }, { key: "si_kg_ha", label: "Si" },
];

// ═══════════ FORM STATE ═══════════

interface FormState {
  applicationDate: Date | undefined;
  fertilizationType: string;
  growthStage: string;
  targetParent: string;
  areaApplied: string;
  applicationMethod: string;
  productName: string;
  formulationN: string;
  formulationP: string;
  formulationK: string;
  dosePerHa: string;
  doseUnit: string;
  microUnit: string;
  micros: Record<string, string>;
  foliarSprayVolume: string;
  foliarProductDetail: string;
  foliarMixedWithPesticide: boolean;
  foliarPesticideName: string;
  foliarApplicationTime: string;
  responsiblePerson: string;
  equipmentUsed: string;
  conditions: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  applicationDate: undefined,
  fertilizationType: "",
  growthStage: "",
  targetParent: "all",
  areaApplied: "",
  applicationMethod: "",
  productName: "",
  formulationN: "0",
  formulationP: "0",
  formulationK: "0",
  dosePerHa: "",
  doseUnit: "kg/ha",
  microUnit: "kg/ha",
  micros: {},
  foliarSprayVolume: "",
  foliarProductDetail: "",
  foliarMixedWithPesticide: false,
  foliarPesticideName: "",
  foliarApplicationTime: "",
  responsiblePerson: "",
  equipmentUsed: "",
  conditions: "",
  notes: "",
});

// ═══════════ MAIN COMPONENT ═══════════

export default function Nutrition({
  cycleId, orgId, contractNumber, pivotName, hybridName, cooperatorName, totalArea,
}: NutritionProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addRecord } = useOfflineSyncContext();
  const [showForm, setShowForm] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStage, setFilterStage] = useState("all");

  // Queries
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["fertilization-records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("fertilization_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("application_date", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: targets } = useQuery({
    queryKey: ["nutrition-targets", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nutrition_targets")
        .select("*")
        .eq("cycle_id", cycleId)
        .maybeSingle();
      if (error) throw error;
      return data || { n_target: 150, p2o5_target: 80, k2o_target: 60 };
    },
  });

  const nTarget = targets?.n_target ?? 150;
  const pTarget = targets?.p2o5_target ?? 80;
  const kTarget = targets?.k2o_target ?? 60;

  // Computed
  const totals = useMemo(() => {
    const n = records.reduce((s: number, r: any) => s + (r.n_supplied_kg_ha || 0), 0);
    const p = records.reduce((s: number, r: any) => s + (r.p2o5_supplied_kg_ha || 0), 0);
    const k = records.reduce((s: number, r: any) => s + (r.k2o_supplied_kg_ha || 0), 0);
    const foliarCount = records.filter((r: any) => r.fertilization_type === "foliar").length;
    const last = records.length ? records[records.length - 1] : null;
    return { n, p, k, count: records.length, foliarCount, last };
  }, [records]);

  const nSupplied = parseFloat(form.dosePerHa || "0") * parseFloat(form.formulationN || "0") / 100;
  const pSupplied = parseFloat(form.dosePerHa || "0") * parseFloat(form.formulationP || "0") / 100;
  const kSupplied = parseFloat(form.dosePerHa || "0") * parseFloat(form.formulationK || "0") / 100;

  const statusBadge = (supplied: number, target: number) => {
    const pct = target > 0 ? (supplied / target) * 100 : 0;
    if (pct > 130) return <Badge className="bg-[hsl(210,80%,50%)] text-white text-xs">Excesso</Badge>;
    if (pct >= 90) return <Badge className="bg-[hsl(120,40%,45%)] text-white text-xs">OK</Badge>;
    if (pct >= 70) return <Badge className="bg-[hsl(45,90%,50%)] text-white text-xs">Quase</Badge>;
    return <Badge className="bg-[hsl(0,70%,50%)] text-white text-xs">Déficit</Badge>;
  };

  const statusColor = (supplied: number, target: number) => {
    const pct = target > 0 ? (supplied / target) * 100 : 0;
    if (pct >= 90) return "text-[hsl(120,40%,45%)]";
    if (pct >= 70) return "text-[hsl(45,90%,40%)]";
    return "text-[hsl(0,70%,50%)]";
  };

  // Chart data
  const chartData = useMemo(() => {
    let accN = 0, accP = 0, accK = 0;
    return records.map((r: any) => {
      accN += r.n_supplied_kg_ha || 0;
      accP += r.p2o5_supplied_kg_ha || 0;
      accK += r.k2o_supplied_kg_ha || 0;
      return {
        date: format(new Date(r.application_date + "T00:00:00"), "dd/MM"),
        N: r.n_supplied_kg_ha || 0,
        P2O5: r.p2o5_supplied_kg_ha || 0,
        K2O: r.k2o_supplied_kg_ha || 0,
        accN, accP, accK,
      };
    });
  }, [records]);

  // Distribution chart
  const distData = useMemo(() => {
    const categories = ["Base", "Cobertura", "Fertirrigação", "Foliar", "Outro"];
    const nutrients = ["N", "P₂O₅", "K₂O"];
    return nutrients.map(nut => {
      const row: any = { nutrient: nut };
      categories.forEach(cat => {
        const filtered = records.filter((r: any) => (TYPE_CATEGORY[r.fertilization_type] || "Outro") === cat);
        if (nut === "N") row[cat] = filtered.reduce((s: number, r: any) => s + (r.n_supplied_kg_ha || 0), 0);
        else if (nut === "P₂O₅") row[cat] = filtered.reduce((s: number, r: any) => s + (r.p2o5_supplied_kg_ha || 0), 0);
        else row[cat] = filtered.reduce((s: number, r: any) => s + (r.k2o_supplied_kg_ha || 0), 0);
      });
      row.meta = nut === "N" ? nTarget : nut === "P₂O₅" ? pTarget : kTarget;
      return row;
    });
  }, [records, nTarget, pTarget, kTarget]);

  // Micros totals
  const microTotals = useMemo(() => {
    return MICRO_FIELDS.map(mf => ({
      ...mf,
      total: records.reduce((s: number, r: any) => s + (r[mf.key] || 0), 0),
    })).filter(m => m.total > 0);
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter((r: any) => {
      if (filterType !== "all" && r.fertilization_type !== filterType) return false;
      if (filterStage !== "all" && r.growth_stage !== filterStage) return false;
      return true;
    });
  }, [records, filterType, filterStage]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.applicationDate || !form.fertilizationType || !form.productName || !form.dosePerHa || !form.areaApplied) {
        throw new Error("Preencha os campos obrigatórios");
      }
      const payload: any = {
        cycle_id: cycleId,
        org_id: orgId,
        application_date: format(form.applicationDate, "yyyy-MM-dd"),
        fertilization_type: form.fertilizationType,
        growth_stage: form.growthStage || null,
        target_parent: form.targetParent || null,
        area_applied_ha: parseFloat(form.areaApplied),
        application_method: form.applicationMethod || null,
        product_name: form.productName,
        formulation_n_pct: parseFloat(form.formulationN || "0"),
        formulation_p_pct: parseFloat(form.formulationP || "0"),
        formulation_k_pct: parseFloat(form.formulationK || "0"),
        dose_per_ha: parseFloat(form.dosePerHa),
        dose_unit: form.doseUnit,
        n_supplied_kg_ha: nSupplied,
        p2o5_supplied_kg_ha: pSupplied,
        k2o_supplied_kg_ha: kSupplied,
        micro_unit: form.microUnit,
        responsible_person: form.responsiblePerson || null,
        equipment_used: form.equipmentUsed || null,
        conditions: form.conditions || null,
        notes: form.notes || null,
        created_by: user?.id || null,
      };
      // Micros
      MICRO_FIELDS.forEach(mf => {
        payload[mf.key] = form.micros[mf.key] ? parseFloat(form.micros[mf.key]) : null;
      });
      // Foliar
      if (form.fertilizationType === "foliar") {
        payload.foliar_spray_volume = form.foliarSprayVolume ? parseFloat(form.foliarSprayVolume) : null;
        payload.foliar_product_detail = form.foliarProductDetail || null;
        payload.foliar_mixed_with_pesticide = form.foliarMixedWithPesticide;
        payload.foliar_pesticide_name = form.foliarPesticideName || null;
        payload.foliar_application_time = form.foliarApplicationTime || null;
      }

      if (editingId) {
        const { error } = await (supabase as any).from("fertilization_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await addRecord("fertilization_records", payload, cycleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilization-records", cycleId] });
      toast.success(editingId ? "Adubação atualizada!" : "Adubação registrada!");
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("soft_delete_record", { _table_name: "fertilization_records", _record_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fertilization-records", cycleId] });
      toast.success("Registro removido!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Targets
  const [targetsForm, setTargetsForm] = useState({ n: "150", p: "80", k: "60" });

  const saveTargets = useMutation({
    mutationFn: async () => {
      const payload = {
        cycle_id: cycleId,
        n_target: parseFloat(targetsForm.n),
        p2o5_target: parseFloat(targetsForm.p),
        k2o_target: parseFloat(targetsForm.k),
      };
      if (targets?.id) {
        const { error } = await (supabase as any).from("nutrition_targets").update(payload).eq("id", targets.id);
        if (error) throw error;
      } else {
        const { error } = await addRecord("nutrition_targets", payload, cycleId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nutrition-targets", cycleId] });
      toast.success("Metas atualizadas!");
      setShowTargets(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (r: any) => {
    setForm({
      applicationDate: new Date(r.application_date + "T00:00:00"),
      fertilizationType: r.fertilization_type,
      growthStage: r.growth_stage || "",
      targetParent: r.target_parent || "all",
      areaApplied: r.area_applied_ha?.toString() || "",
      applicationMethod: r.application_method || "",
      productName: r.product_name,
      formulationN: r.formulation_n_pct?.toString() || "0",
      formulationP: r.formulation_p_pct?.toString() || "0",
      formulationK: r.formulation_k_pct?.toString() || "0",
      dosePerHa: r.dose_per_ha?.toString() || "",
      doseUnit: r.dose_unit || "kg/ha",
      microUnit: r.micro_unit || "kg/ha",
      micros: MICRO_FIELDS.reduce((acc, mf) => ({ ...acc, [mf.key]: r[mf.key]?.toString() || "" }), {}),
      foliarSprayVolume: r.foliar_spray_volume?.toString() || "",
      foliarProductDetail: r.foliar_product_detail || "",
      foliarMixedWithPesticide: r.foliar_mixed_with_pesticide || false,
      foliarPesticideName: r.foliar_pesticide_name || "",
      foliarApplicationTime: r.foliar_application_time || "",
      responsiblePerson: r.responsible_person || "",
      equipmentUsed: r.equipment_used || "",
      conditions: r.conditions || "",
      notes: r.notes || "",
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Contrato: {contractNumber || pivotName}</span>
          <span>•</span><span>Híbrido: {hybridName}</span>
          <span>•</span><span>Cooperado: {cooperatorName}</span>
          <span>•</span><span>Pivô: {pivotName}</span>
          <span>•</span><span>Área: {totalArea} ha</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTargetsForm({ n: nTarget.toString(), p: pTarget.toString(), k: kTarget.toString() }); setShowTargets(true); }}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Metas
          </Button>
          <Button size="sm" onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Registrar Adubação
          </Button>
        </div>
      </div>

      {/* SEÇÃO 1 — Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aplicações</p><p className="text-xl font-bold mt-1">{totals.count}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">N total</p><p className={cn("text-xl font-bold mt-1", statusColor(totals.n, nTarget))}>{totals.n.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">P₂O₅ total</p><p className={cn("text-xl font-bold mt-1", statusColor(totals.p, pTarget))}>{totals.p.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">K₂O total</p><p className={cn("text-xl font-bold mt-1", statusColor(totals.k, kTarget))}>{totals.k.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Última aplicação</p><p className="text-sm font-medium mt-1">{totals.last ? `${TYPE_CATEGORY[totals.last.fertilization_type] || "—"} em ${format(new Date(totals.last.application_date + "T00:00:00"), "dd/MM")}` : "—"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Foliares</p><p className="text-xl font-bold mt-1">{totals.foliarCount}</p></CardContent></Card>
      </div>

      {/* Chart: Acúmulo NPK */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Acúmulo NPK</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="N" stackId="a" fill="#4CAF50" opacity={0.6} name="N (kg/ha)" />
                <Bar dataKey="P2O5" stackId="a" fill="#FF9800" opacity={0.6} name="P₂O₅ (kg/ha)" />
                <Bar dataKey="K2O" stackId="a" fill="#7B1FA2" opacity={0.6} name="K₂O (kg/ha)" />
                <Line type="monotone" dataKey="accN" stroke="#4CAF50" strokeWidth={2} dot={false} name="N acum." />
                <Line type="monotone" dataKey="accP" stroke="#FF9800" strokeWidth={2} dot={false} name="P₂O₅ acum." />
                <Line type="monotone" dataKey="accK" stroke="#7B1FA2" strokeWidth={2} dot={false} name="K₂O acum." />
                <ReferenceLine y={nTarget} stroke="#4CAF50" strokeDasharray="5 5" label={{ value: `N meta: ${nTarget}`, fontSize: 10 }} />
                <ReferenceLine y={pTarget} stroke="#FF9800" strokeDasharray="5 5" label={{ value: `P meta: ${pTarget}`, fontSize: 10 }} />
                <ReferenceLine y={kTarget} stroke="#7B1FA2" strokeDasharray="5 5" label={{ value: `K meta: ${kTarget}`, fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO 3 — Tabela */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">Adubações</h3>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {FERT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Estádio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {GROWTH_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estádio</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead className="text-right">N</TableHead>
                    <TableHead className="text-right">P₂O₅</TableHead>
                    <TableHead className="text-right">K₂O</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma adubação registrada</TableCell></TableRow>
                  )}
                  {filtered.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{format(new Date(r.application_date + "T00:00:00"), "dd/MM/yy")}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: TYPE_COLORS[r.fertilization_type] || "#9E9E9E", color: "#fff" }} className="text-xs">
                          {TYPE_CATEGORY[r.fertilization_type] || r.fertilization_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.growth_stage || "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{r.product_name}</TableCell>
                      <TableCell className="text-sm font-mono">{r.dose_per_ha} {r.dose_unit}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{(r.n_supplied_kg_ha || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{(r.p2o5_supplied_kg_ha || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{(r.k2o_supplied_kg_ha || 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{r.area_applied_ha} ha</TableCell>
                      <TableCell className="text-xs">{APP_METHODS.find(m => m.value === r.application_method)?.label || r.application_method || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(r)}>Editar</Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => deleteMutation.mutate(r.id)}>Excluir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {filtered.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={5} className="font-semibold text-sm">TOTAL</TableCell>
                      <TableCell className="text-right font-bold text-sm font-mono">{filtered.reduce((s: number, r: any) => s + (r.n_supplied_kg_ha || 0), 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-bold text-sm font-mono">{filtered.reduce((s: number, r: any) => s + (r.p2o5_supplied_kg_ha || 0), 0).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-bold text-sm font-mono">{filtered.reduce((s: number, r: any) => s + (r.k2o_supplied_kg_ha || 0), 0).toFixed(1)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 4 — Balanço Nutricional */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Balanço NPK</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nutriente</TableHead>
                  <TableHead className="text-right">Aplicado (kg/ha)</TableHead>
                  <TableHead className="text-right">Meta (kg/ha)</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { label: "N", supplied: totals.n, target: nTarget },
                  { label: "P₂O₅", supplied: totals.p, target: pTarget },
                  { label: "K₂O", supplied: totals.k, target: kTarget },
                ].map(row => (
                  <TableRow key={row.label}>
                    <TableCell className="font-semibold">{row.label}</TableCell>
                    <TableCell className="text-right font-mono">{row.supplied.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-mono">{row.target}</TableCell>
                    <TableCell className="text-right font-mono">{(row.supplied - row.target) >= 0 ? "+" : ""}{(row.supplied - row.target).toFixed(1)}</TableCell>
                    <TableCell>{statusBadge(row.supplied, row.target)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {microTotals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Micronutrientes</p>
              <div className="flex flex-wrap gap-3">
                {microTotals.map(m => (
                  <div key={m.key} className="text-xs">
                    <span className="font-medium">{m.label}:</span> {m.total.toFixed(2)} kg/ha
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 5 — Distribuição por tipo */}
      {records.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Tipo de Adubação</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nutrient" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Base" stackId="a" fill="#795548" />
                <Bar dataKey="Cobertura" stackId="a" fill="#388E3C" />
                <Bar dataKey="Fertirrigação" stackId="a" fill="#1976D2" />
                <Bar dataKey="Foliar" stackId="a" fill="#8BC34A" />
                <Bar dataKey="Outro" stackId="a" fill="#9E9E9E" />
                <ReferenceLine y={nTarget} stroke="#666" strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ═══════ MODAL: Registrar Adubação ═══════ */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Adubação" : "Registrar Adubação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Identificação */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Identificação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !form.applicationDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {form.applicationDate ? format(form.applicationDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.applicationDate} onSelect={d => updateForm("applicationDate", d)} className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Tipo de adubação *</Label>
                  <Select value={form.fertilizationType} onValueChange={v => updateForm("fertilizationType", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{FERT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estádio fenológico *</Label>
                  <Select value={form.growthStage} onValueChange={v => updateForm("growthStage", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{GROWTH_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Parental alvo</Label>
                  <Select value={form.targetParent} onValueChange={v => updateForm("targetParent", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{TARGET_PARENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Área aplicada (ha) *</Label>
                  <Input type="number" step="0.01" value={form.areaApplied} onChange={e => updateForm("areaApplied", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Método</Label>
                  <Select value={form.applicationMethod} onValueChange={v => updateForm("applicationMethod", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{APP_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Produto e Formulação */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Produto e Formulação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Produto / formulado *</Label>
                  <Input value={form.productName} onChange={e => updateForm("productName", e.target.value)} placeholder="Ex: MAP 11-52-00, Ureia 45-00-00" className="h-9 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <div>
                  <Label className="text-xs">N (%)</Label>
                  <Input type="number" step="0.1" value={form.formulationN} onChange={e => updateForm("formulationN", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">P₂O₅ (%)</Label>
                  <Input type="number" step="0.1" value={form.formulationP} onChange={e => updateForm("formulationP", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">K₂O (%)</Label>
                  <Input type="number" step="0.1" value={form.formulationK} onChange={e => updateForm("formulationK", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Dose *</Label>
                  <Input type="number" step="0.1" value={form.dosePerHa} onChange={e => updateForm("dosePerHa", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={form.doseUnit} onValueChange={v => updateForm("doseUnit", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOSE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-calculated */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs text-muted-foreground">N fornecido</p>
                  <p className="text-lg font-bold" style={{ color: "#4CAF50" }}>{nSupplied.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs text-muted-foreground">P₂O₅ fornecido</p>
                  <p className="text-lg font-bold" style={{ color: "#FF9800" }}>{pSupplied.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <p className="text-xs text-muted-foreground">K₂O fornecido</p>
                  <p className="text-lg font-bold" style={{ color: "#7B1FA2" }}>{kSupplied.toFixed(1)} <span className="text-xs font-normal">kg/ha</span></p>
                </div>
              </div>
            </div>

            {/* Micronutrientes */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <ChevronDown className="h-3 w-3" /> Adicionar micronutrientes
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {MICRO_FIELDS.map(mf => (
                    <div key={mf.key}>
                      <Label className="text-xs">{mf.label}</Label>
                      <Input
                        type="number" step="0.01"
                        value={form.micros[mf.key] || ""}
                        onChange={e => updateForm("micros", { ...form.micros, [mf.key]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs">Unidade</Label>
                    <Select value={form.microUnit} onValueChange={v => updateForm("microUnit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg/ha">kg/ha</SelectItem>
                        <SelectItem value="g/ha">g/ha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Foliar section */}
            {form.fertilizationType === "foliar" && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-semibold text-foreground">Nutrição Foliar</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Produto foliar</Label>
                    <Input value={form.foliarProductDetail} onChange={e => updateForm("foliarProductDetail", e.target.value)} placeholder="Ex: 12% Zn + 6% Mn" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Volume de calda (L/ha)</Label>
                    <Input type="number" value={form.foliarSprayVolume} onChange={e => updateForm("foliarSprayVolume", e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={form.foliarMixedWithPesticide} onCheckedChange={v => updateForm("foliarMixedWithPesticide", v)} />
                    <Label className="text-xs">Aplicado junto com defensivo?</Label>
                  </div>
                  {form.foliarMixedWithPesticide && (
                    <div>
                      <Label className="text-xs">Qual defensivo?</Label>
                      <Input value={form.foliarPesticideName} onChange={e => updateForm("foliarPesticideName", e.target.value)} className="h-9 text-sm" />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Horário da aplicação</Label>
                    <Input type="time" value={form.foliarApplicationTime} onChange={e => updateForm("foliarApplicationTime", e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Info adicional */}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-semibold text-foreground">Informações adicionais</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Input value={form.responsiblePerson} onChange={e => updateForm("responsiblePerson", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Equipamento</Label>
                  <Input value={form.equipmentUsed} onChange={e => updateForm("equipmentUsed", e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Condições</Label>
                  <Input value={form.conditions} onChange={e => updateForm("conditions", e.target.value)} placeholder="Solo úmido, sem vento" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.notes} onChange={e => updateForm("notes", e.target.value)} rows={2} className="text-sm" />
              </div>
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ MODAL: Metas ═══════ */}
      <Dialog open={showTargets} onOpenChange={setShowTargets}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Configurar Metas NPK</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">N meta (kg/ha)</Label>
              <Input type="number" value={targetsForm.n} onChange={e => setTargetsForm(p => ({ ...p, n: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">P₂O₅ meta (kg/ha)</Label>
              <Input type="number" value={targetsForm.p} onChange={e => setTargetsForm(p => ({ ...p, p: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">K₂O meta (kg/ha)</Label>
              <Input type="number" value={targetsForm.k} onChange={e => setTargetsForm(p => ({ ...p, k: e.target.value }))} className="h-9 text-sm" />
            </div>
            <Button onClick={() => saveTargets.mutate()} disabled={saveTargets.isPending} className="w-full">
              {saveTargets.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Metas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
