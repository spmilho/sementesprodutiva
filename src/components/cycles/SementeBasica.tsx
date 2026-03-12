import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Package, Beaker } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineSyncContext } from "@/components/Layout";

// ═══════════ TYPES & CONSTANTS ═══════════

interface SementeBasicaProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  clientName?: string;
  femaleLine?: string;
  maleLine?: string;
  totalArea?: number;
}

interface ProductRow {
  tempId: string;
  product_name: string;
  active_ingredient: string;
  product_type: string;
  category: string;
  dose: string;
  dose_unit: string;
  application_order: string;
}

const QUANTITY_UNITS = [
  { value: "sacks_20kg", label: "Sacos de 20kg" },
  { value: "sacks_40kg", label: "Sacos de 40kg" },
  { value: "sacks_60k", label: "Sacos de 60.000 sementes" },
  { value: "sacks_80k", label: "Sacos de 80.000 sementes" },
  { value: "kg", label: "kg" },
  { value: "seed_units", label: "Unidades de sementes" },
];

const PACKAGING_CONDITIONS = [
  { value: "intact", label: "Íntegras" },
  { value: "some_damaged", label: "Algumas danificadas" },
  { value: "many_damaged", label: "Muitas danificadas" },
];

const PEST_OPTIONS = [
  { value: "none", label: "Nenhuma" },
  { value: "weevil", label: "Caruncho" },
  { value: "moth", label: "Traça" },
  { value: "other", label: "Outro" },
];

const LOT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: "Disponível", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  in_use: { label: "Em uso", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  discarded: { label: "Descartado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  held: { label: "Retido", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
};

const TS_BADGES: Record<string, { label: string; emoji: string; color: string }> = {
  in_house: { label: "Tratado in-house", emoji: "🟢", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  client_treated: { label: "Tratado pelo cliente", emoji: "🔵", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  no_treatment: { label: "Sem TS", emoji: "⚪", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  pending: { label: "TS pendente", emoji: "⏳", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
};

const PRODUCT_TYPES = [
  { value: "fungicide", label: "Fungicida" },
  { value: "insecticide", label: "Inseticida" },
  { value: "nematicide", label: "Nematicida" },
  { value: "inoculant", label: "Inoculante" },
  { value: "biostimulant", label: "Bioestimulante" },
  { value: "polymer", label: "Polímero" },
  { value: "graphite", label: "Grafite" },
  { value: "micronutrient", label: "Micronutriente" },
  { value: "other", label: "Outro" },
];

const CATEGORIES = [
  { value: "chemical", label: "🧪 Químico" },
  { value: "biological", label: "🦠 Biológico" },
  { value: "mixed", label: "🔬 Misto" },
];

const DOSE_UNITS = [
  { value: "mL/60k_seeds", label: "mL/60.000 sem" },
  { value: "g/60k_seeds", label: "g/60.000 sem" },
  { value: "mL/100kg", label: "mL/100 kg de sementes" },
  { value: "mL/sack_20kg", label: "mL/saco 20kg" },
  { value: "L/ton", label: "L/ton" },
];

const VISUAL_QUALITY = [
  { value: "excellent", label: "Excelente — uniforme" },
  { value: "good", label: "Boa" },
  { value: "regular", label: "Regular — desuniforme" },
  { value: "poor", label: "Ruim" },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = Object.fromEntries(PRODUCT_TYPES.map(p => [p.value, p.label]));

function newProduct(): ProductRow {
  return {
    tempId: crypto.randomUUID(),
    product_name: "",
    active_ingredient: "",
    product_type: "",
    category: "",
    dose: "",
    dose_unit: "mL/60k_seeds",
    application_order: "",
  };
}

// ═══════════ PRODUCT TABLE ═══════════

function ProductTable({ products, setProducts, showCategory, showOrder }: {
  products: ProductRow[];
  setProducts: (p: ProductRow[]) => void;
  showCategory?: boolean;
  showOrder?: boolean;
}) {
  const update = (idx: number, field: keyof ProductRow, value: string) => {
    const updated = [...products];
    updated[idx] = { ...updated[idx], [field]: value };
    setProducts(updated);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>I.A.</TableHead>
              <TableHead>Tipo</TableHead>
              {showCategory && <TableHead>Categoria</TableHead>}
              <TableHead>Dose</TableHead>
              <TableHead>Unidade</TableHead>
              {showOrder && <TableHead className="w-16">Ordem</TableHead>}
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p, i) => (
              <TableRow key={p.tempId}>
                <TableCell className="font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
                <TableCell><Input value={p.product_name} onChange={e => update(i, "product_name", e.target.value)} placeholder="Nome" className="h-8 text-sm min-w-[130px]" /></TableCell>
                <TableCell><Input value={p.active_ingredient} onChange={e => update(i, "active_ingredient", e.target.value)} placeholder="I.A." className="h-8 text-sm min-w-[110px]" /></TableCell>
                <TableCell>
                  <Select value={p.product_type} onValueChange={v => update(i, "product_type", v)}>
                    <SelectTrigger className="h-8 text-sm min-w-[110px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                {showCategory && (
                  <TableCell>
                    <Select value={p.category} onValueChange={v => update(i, "category", v)}>
                      <SelectTrigger className="h-8 text-sm min-w-[100px]"><SelectValue placeholder="Cat." /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                )}
                <TableCell><Input type="number" step="0.01" value={p.dose} onChange={e => update(i, "dose", e.target.value)} className="h-8 text-sm w-20" /></TableCell>
                <TableCell>
                  <Select value={p.dose_unit} onValueChange={v => update(i, "dose_unit", v)}>
                    <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOSE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                {showOrder && (
                  <TableCell><Input type="number" value={p.application_order} onChange={e => update(i, "application_order", e.target.value)} className="h-8 text-sm w-16" /></TableCell>
                )}
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setProducts(products.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" onClick={() => setProducts([...products, newProduct()])} className="text-xs">
        <Plus className="h-3 w-3 mr-1" /> Adicionar produto
      </Button>
    </div>
  );
}

// ═══════════ MAIN COMPONENT ═══════════

export default function SementeBasica({
  cycleId, orgId, contractNumber, pivotName, hybridName, clientName, femaleLine, maleLine, totalArea,
}: SementeBasicaProps) {
  const { user } = useAuth();
  const { addRecordGroup } = useOfflineSyncContext();
  const queryClient = useQueryClient();
  const [lotDialogOpen, setLotDialogOpen] = useState(false);
  const [tsDialogOpen, setTsDialogOpen] = useState(false);
  const [selectedLotForTS, setSelectedLotForTS] = useState<any>(null);
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set());

  // ─── LOT FORM STATE ───
  const [lotForm, setLotForm] = useState({
    parent_type: "" as string,
    designated_male_planting: "",
    lot_number: "",
    origin_season: "",
    received_date: undefined as Date | undefined,
    quantity: "",
    quantity_unit: "sacks_20kg",
    quantity_kg: "",
    thousand_seed_weight_g: "",
    sieve_classification: "",
    supplier_origin: "",
    germination_pct: "",
    vigor_aa_pct: "",
    vigor_cold_pct: "",
    tetrazolium_viability_pct: "",
    tetrazolium_vigor_pct: "",
    physical_purity_pct: "",
    genetic_purity_pct: "",
    seed_moisture_pct: "",
    quality_analysis_date: undefined as Date | undefined,
    analysis_report_number: "",
    packaging_condition: "",
    pest_presence: "",
    reception_notes: "",
  });

  // ─── TS FORM STATE ───
  const [tsForm, setTsForm] = useState({
    treatment_origin: "" as string,
    treatment_date: undefined as Date | undefined,
    treatment_location: "",
    responsible_person: "",
    equipment_used: "",
    total_slurry_volume: "",
    visual_quality: "",
    germination_after_ts: "",
    no_treatment_reason: "",
    notes: "",
    products: [newProduct()] as ProductRow[],
  });

  const resetLotForm = () => setLotForm({
    parent_type: "", designated_male_planting: "", lot_number: "", origin_season: "",
    received_date: undefined, quantity: "", quantity_unit: "sacks_20kg", quantity_kg: "",
    thousand_seed_weight_g: "", sieve_classification: "", supplier_origin: "",
    germination_pct: "", vigor_aa_pct: "", vigor_cold_pct: "",
    tetrazolium_viability_pct: "", tetrazolium_vigor_pct: "",
    physical_purity_pct: "", genetic_purity_pct: "", seed_moisture_pct: "",
    quality_analysis_date: undefined, analysis_report_number: "",
    packaging_condition: "", pest_presence: "", reception_notes: "",
  });

  const resetTsForm = () => setTsForm({
    treatment_origin: "", treatment_date: undefined, treatment_location: "",
    responsible_person: "", equipment_used: "", total_slurry_volume: "",
    visual_quality: "", germination_after_ts: "", no_treatment_reason: "",
    notes: "", products: [newProduct()],
  });

  // ─── QUERIES ───
  const { data: lots = [], isLoading: lotsLoading } = useQuery({
    queryKey: ["seed_lots", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_lots")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("parent_type")
        .order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ["seed_lot_treatments", cycleId],
    queryFn: async () => {
      const lotIds = lots.map((l: any) => l.id);
      if (lotIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("seed_lot_treatments")
        .select("*, seed_lot_treatment_products(*)")
        .in("seed_lot_id", lotIds)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
    enabled: lots.length > 0,
  });

  // ─── MUTATIONS ───
  const saveLotMutation = useMutation({
    mutationFn: async () => {
      const lotData = {
        cycle_id: cycleId, org_id: orgId,
        parent_type: lotForm.parent_type,
        designated_male_planting: lotForm.parent_type === "male" && lotForm.designated_male_planting ? lotForm.designated_male_planting : null,
        lot_number: lotForm.lot_number, origin_season: lotForm.origin_season,
        received_date: lotForm.received_date ? format(lotForm.received_date, "yyyy-MM-dd") : null,
        quantity: parseFloat(lotForm.quantity), quantity_unit: lotForm.quantity_unit,
        quantity_kg: lotForm.quantity_kg ? parseFloat(lotForm.quantity_kg) : null,
        thousand_seed_weight_g: lotForm.thousand_seed_weight_g ? parseFloat(lotForm.thousand_seed_weight_g) : null,
        sieve_classification: lotForm.sieve_classification || null,
        supplier_origin: lotForm.supplier_origin || null,
        germination_pct: parseFloat(lotForm.germination_pct),
        vigor_aa_pct: lotForm.vigor_aa_pct ? parseFloat(lotForm.vigor_aa_pct) : null,
        vigor_cold_pct: lotForm.vigor_cold_pct ? parseFloat(lotForm.vigor_cold_pct) : null,
        tetrazolium_viability_pct: lotForm.tetrazolium_viability_pct ? parseFloat(lotForm.tetrazolium_viability_pct) : null,
        tetrazolium_vigor_pct: lotForm.tetrazolium_vigor_pct ? parseFloat(lotForm.tetrazolium_vigor_pct) : null,
        physical_purity_pct: lotForm.physical_purity_pct ? parseFloat(lotForm.physical_purity_pct) : null,
        genetic_purity_pct: lotForm.genetic_purity_pct ? parseFloat(lotForm.genetic_purity_pct) : null,
        seed_moisture_pct: lotForm.seed_moisture_pct ? parseFloat(lotForm.seed_moisture_pct) : null,
        quality_analysis_date: lotForm.quality_analysis_date ? format(lotForm.quality_analysis_date, "yyyy-MM-dd") : null,
        analysis_report_number: lotForm.analysis_report_number || null,
        packaging_condition: lotForm.packaging_condition || null,
        pest_presence: lotForm.pest_presence || null,
        reception_notes: lotForm.reception_notes || null,
        created_by: user?.id,
      };
      const { error } = await addRecordGroup([
        { table: "seed_lots", data: lotData },
      ], cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seed_lots", cycleId] });
      setLotDialogOpen(false);
      resetLotForm();
      toast.success("Lote cadastrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveTsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLotForTS) return;
      const localTsId = crypto.randomUUID();
      const tsData = {
        id: localTsId,
        seed_lot_id: selectedLotForTS.id,
        treatment_origin: tsForm.treatment_origin,
        treatment_date: tsForm.treatment_date ? format(tsForm.treatment_date, "yyyy-MM-dd") : null,
        treatment_location: tsForm.treatment_location || null,
        responsible_person: tsForm.responsible_person || null,
        equipment_used: tsForm.equipment_used || null,
        total_slurry_volume: tsForm.total_slurry_volume || null,
        visual_quality: tsForm.visual_quality || null,
        germination_after_ts: tsForm.germination_after_ts ? parseFloat(tsForm.germination_after_ts) : null,
        no_treatment_reason: tsForm.no_treatment_reason || null,
        notes: tsForm.notes || null,
        created_by: user?.id,
      };

      const groupRecords: any[] = [
        { table: "seed_lot_treatments", data: tsData, localId: localTsId },
      ];

      const validProducts = tsForm.products.filter(p => p.product_name && p.dose);
      for (const p of validProducts) {
        groupRecords.push({
          table: "seed_lot_treatment_products",
          data: {
            seed_lot_treatment_id: localTsId,
            product_name: p.product_name,
            active_ingredient: p.active_ingredient || null,
            product_type: p.product_type || null,
            category: p.category || null,
            dose: parseFloat(p.dose),
            dose_unit: p.dose_unit,
            application_order: p.application_order ? parseInt(p.application_order) : null,
          },
          parentLocalId: localTsId,
          fkField: "seed_lot_treatment_id",
        });
      }

      const { error } = await addRecordGroup(groupRecords, cycleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seed_lot_treatments", cycleId] });
      setTsDialogOpen(false);
      resetTsForm();
      setSelectedLotForTS(null);
      toast.success("Tratamento de sementes registrado!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── COMPUTED ───
  const femaleLots = useMemo(() => lots.filter((l: any) => l.parent_type === "female"), [lots]);
  const maleLots = useMemo(() => lots.filter((l: any) => l.parent_type === "male"), [lots]);

  const treatmentByLotId = useMemo(() => {
    const map: Record<string, any> = {};
    treatments.forEach((t: any) => { map[t.seed_lot_id] = t; });
    return map;
  }, [treatments]);

  const femaleQtyTotal = useMemo(() => femaleLots.reduce((s: number, l: any) => s + Number(l.quantity || 0), 0), [femaleLots]);
  const maleQtyTotal = useMemo(() => maleLots.reduce((s: number, l: any) => s + Number(l.quantity || 0), 0), [maleLots]);

  const weightedGerm = (lotArr: any[]) => {
    const total = lotArr.reduce((s, l) => s + Number(l.quantity || 0), 0);
    if (total === 0) return 0;
    return lotArr.reduce((s, l) => s + Number(l.germination_pct || 0) * Number(l.quantity || 0), 0) / total;
  };

  const allProducts = useMemo(() => {
    const result: any[] = [];
    treatments.forEach((t: any) => {
      const lot = lots.find((l: any) => l.id === t.seed_lot_id);
      if (!lot || !t.seed_lot_treatment_products) return;
      t.seed_lot_treatment_products.forEach((p: any) => {
        result.push({ ...p, parentType: lot.parent_type, lotNumber: lot.lot_number, originSeason: lot.origin_season, treatmentOrigin: t.treatment_origin });
      });
    });
    return result;
  }, [treatments, lots]);

  const lotsWithTs = useMemo(() => lots.filter((l: any) => treatmentByLotId[l.id]), [lots, treatmentByLotId]);
  const lotsPendingTs = useMemo(() => lots.filter((l: any) => !treatmentByLotId[l.id]), [lots, treatmentByLotId]);
  const tsProgress = lots.length > 0 ? (lotsWithTs.length / lots.length) * 100 : 0;

  const toggleExpand = (id: string) => {
    setExpandedLots(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openTsDialog = (lot: any) => {
    setSelectedLotForTS(lot);
    resetTsForm();
    setTsDialogOpen(true);
  };

  const getTsBadge = (lotId: string) => {
    const t = treatmentByLotId[lotId];
    if (!t) return TS_BADGES.pending;
    return TS_BADGES[t.treatment_origin] || TS_BADGES.pending;
  };

  const unitLabel = (u: string) => QUANTITY_UNITS.find(q => q.value === u)?.label || u;

  if (lotsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>Contrato: <strong className="text-foreground">{contractNumber || pivotName}</strong></span>
        <span>•</span>
        <span>Híbrido: <strong className="text-foreground">{hybridName}</strong></span>
        <span>•</span>
        <span>Cliente: <strong className="text-foreground">{clientName}</strong></span>
        <span>•</span>
        <span>Fêmea: <strong className="text-foreground font-mono">{femaleLine}</strong></span>
        <span>•</span>
        <span>Macho: <strong className="text-foreground font-mono">{maleLine}</strong></span>
      </div>

      {/* SEÇÃO 1 — LINHAGENS EXPANDÍVEIS */}
      {[
        { label: "LINHAGEM FÊMEA", color: "#EC407A", line: femaleLine, lotsArr: femaleLots, qtyTotal: femaleQtyTotal, parentType: "female" as const },
        { label: "LINHAGEM MACHO", color: "#4CAF50", line: maleLine, lotsArr: maleLots, qtyTotal: maleQtyTotal, parentType: "male" as const },
      ].map(group => {
        const isExpanded = expandedLots.has(group.parentType);
        return (
          <Collapsible key={group.parentType} open={isExpanded} onOpenChange={() => toggleExpand(group.parentType)}>
            <Card style={{ borderColor: group.color, borderWidth: 2 }}>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      {group.label}
                      <Badge variant="outline" className="text-[10px] ml-2">{group.lotsArr.length} lotes</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-normal text-muted-foreground">
                      <span>Linhagem: <strong className="font-mono text-foreground">{group.line}</strong></span>
                      <span>Qtd: <strong className="text-foreground">{group.qtyTotal}</strong></span>
                      <span>Germ. média: <strong className="text-foreground">{group.lotsArr.length > 0 ? weightedGerm(group.lotsArr).toFixed(1) : "—"}%</strong></span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {group.lotsArr.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lote cadastrado para esta linhagem.</p>
                  ) : (
                    group.lotsArr.map((lot: any) => {
                      const tsBadge = getTsBadge(lot.id);
                      const statusInfo = LOT_STATUS_LABELS[lot.status] || LOT_STATUS_LABELS.available;
                      const treatment = treatmentByLotId[lot.id];
                      return (
                        <Card key={lot.id} className="border">
                          <CardContent className="p-4 space-y-3">
                            {/* Lot Header */}
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold">{lot.lot_number}</span>
                                <Badge variant="outline" className={cn("text-[10px]", statusInfo.color)}>{statusInfo.label}</Badge>
                                <Badge variant="outline" className={cn("text-[10px]", tsBadge.color)}>{tsBadge.emoji} {tsBadge.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {!treatment ? (
                                  <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => openTsDialog(lot)}>
                                    <Beaker className="h-3 w-3 mr-1" /> Registrar TS
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openTsDialog(lot)}>
                                    <Beaker className="h-3 w-3 mr-1" /> Ver TS
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Quality Data Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-xs">
                              <div><span className="text-muted-foreground">Safra origem:</span> <strong>{lot.origin_season || "—"}</strong></div>
                              <div><span className="text-muted-foreground">Recebimento:</span> <strong>{lot.received_date ? format(new Date(lot.received_date), "dd/MM/yy") : "—"}</strong></div>
                              <div><span className="text-muted-foreground">Quantidade:</span> <strong>{lot.quantity} {unitLabel(lot.quantity_unit).split(" ")[0]}</strong></div>
                              {lot.quantity_kg && <div><span className="text-muted-foreground">Peso (kg):</span> <strong>{lot.quantity_kg}</strong></div>}
                              <div><span className="text-muted-foreground">Germinação:</span> <strong className="text-foreground">{lot.germination_pct}%</strong></div>
                              {lot.vigor_aa_pct != null && <div><span className="text-muted-foreground">Vigor EA:</span> <strong>{lot.vigor_aa_pct}%</strong></div>}
                              {lot.vigor_cold_pct != null && <div><span className="text-muted-foreground">Vigor Frio:</span> <strong>{lot.vigor_cold_pct}%</strong></div>}
                              {lot.tetrazolium_viability_pct != null && <div><span className="text-muted-foreground">TZ Viab.:</span> <strong>{lot.tetrazolium_viability_pct}%</strong></div>}
                              {lot.tetrazolium_vigor_pct != null && <div><span className="text-muted-foreground">TZ Vigor:</span> <strong>{lot.tetrazolium_vigor_pct}%</strong></div>}
                              {lot.physical_purity_pct != null && <div><span className="text-muted-foreground">Pureza Fís.:</span> <strong>{lot.physical_purity_pct}%</strong></div>}
                              {lot.genetic_purity_pct != null && <div><span className="text-muted-foreground">Pureza Gen.:</span> <strong>{lot.genetic_purity_pct}%</strong></div>}
                              {lot.seed_moisture_pct != null && <div><span className="text-muted-foreground">Umidade:</span> <strong>{lot.seed_moisture_pct}%</strong></div>}
                              {lot.thousand_seed_weight_g != null && <div><span className="text-muted-foreground">PMS:</span> <strong>{lot.thousand_seed_weight_g}g</strong></div>}
                              {lot.sieve_classification && <div><span className="text-muted-foreground">Peneira:</span> <strong>{lot.sieve_classification}</strong></div>}
                              {lot.supplier_origin && <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{lot.supplier_origin}</strong></div>}
                              {lot.analysis_report_number && <div><span className="text-muted-foreground">Nº Laudo:</span> <strong>{lot.analysis_report_number}</strong></div>}
                              {lot.packaging_condition && <div><span className="text-muted-foreground">Embalagens:</span> <strong>{PACKAGING_CONDITIONS.find(c => c.value === lot.packaging_condition)?.label || lot.packaging_condition}</strong></div>}
                              {lot.pest_presence && lot.pest_presence !== "none" && <div><span className="text-muted-foreground">Pragas:</span> <strong>{PEST_OPTIONS.find(p => p.value === lot.pest_presence)?.label || lot.pest_presence}</strong></div>}
                            </div>
                            {lot.reception_notes && (
                              <p className="text-xs text-muted-foreground italic">Obs: {lot.reception_notes}</p>
                            )}

                            {/* TS Details inline */}
                            {treatment && (
                              <div className="border-t pt-3 mt-2 space-y-2">
                                <p className="text-xs font-semibold flex items-center gap-1"><Beaker className="h-3 w-3" /> Tratamento de Sementes</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                                  <div><span className="text-muted-foreground">Origem:</span> <strong>{TS_BADGES[treatment.treatment_origin]?.label || treatment.treatment_origin}</strong></div>
                                  {treatment.treatment_date && <div><span className="text-muted-foreground">Data:</span> <strong>{format(new Date(treatment.treatment_date), "dd/MM/yy")}</strong></div>}
                                  {treatment.responsible_person && <div><span className="text-muted-foreground">Responsável:</span> <strong>{treatment.responsible_person}</strong></div>}
                                  {treatment.equipment_used && <div><span className="text-muted-foreground">Equipamento:</span> <strong>{treatment.equipment_used}</strong></div>}
                                  {treatment.visual_quality && <div><span className="text-muted-foreground">Qualidade visual:</span> <strong>{VISUAL_QUALITY.find(v => v.value === treatment.visual_quality)?.label || treatment.visual_quality}</strong></div>}
                                  {treatment.germination_after_ts != null && <div><span className="text-muted-foreground">Germ. pós-TS:</span> <strong>{treatment.germination_after_ts}%</strong></div>}
                                </div>
                                {treatment.seed_lot_treatment_products?.length > 0 && (
                                  <div className="overflow-x-auto mt-1">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="text-[10px]">Produto</TableHead>
                                          <TableHead className="text-[10px]">I.A.</TableHead>
                                          <TableHead className="text-[10px]">Tipo</TableHead>
                                          <TableHead className="text-[10px]">Dose</TableHead>
                                          <TableHead className="text-[10px]">Unidade</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {treatment.seed_lot_treatment_products.map((p: any, i: number) => (
                                          <TableRow key={i}>
                                            <TableCell className="text-xs font-medium">{p.product_name}</TableCell>
                                            <TableCell className="text-xs">{p.active_ingredient || "—"}</TableCell>
                                            <TableCell className="text-xs">{PRODUCT_TYPE_LABELS[p.product_type] || p.product_type || "—"}</TableCell>
                                            <TableCell className="text-xs">{p.dose}</TableCell>
                                            <TableCell className="text-xs">{DOSE_UNITS.find(u => u.value === p.dose_unit)?.label || p.dose_unit}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                                {treatment.notes && <p className="text-xs text-muted-foreground italic">Obs: {treatment.notes}</p>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* SEÇÃO 2 — BOTÃO CADASTRAR LOTE */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-foreground">Lotes de Semente Básica</h3>
        <Button onClick={() => { resetLotForm(); setLotDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Cadastrar Novo Lote
        </Button>
      </div>

      {lots.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Nenhum lote cadastrado. Clique em "Cadastrar Novo Lote" para começar.
        </CardContent></Card>
      )}

      {/* SEÇÃO 5 — RESUMO CONSOLIDADO */}
      {allProducts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Resumo Consolidado de TS</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parental</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Safra</TableHead>
                  <TableHead>Origem TS</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>I.A.</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Unidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProducts.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", p.parentType === "female" ? "border-pink-400 text-pink-700" : "border-green-400 text-green-700")}>
                        {p.parentType === "female" ? "Fêmea" : "Macho"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.lotNumber}</TableCell>
                    <TableCell className="text-xs">{p.originSeason}</TableCell>
                    <TableCell className="text-xs">{TS_BADGES[p.treatmentOrigin]?.label || p.treatmentOrigin}</TableCell>
                    <TableCell className="text-xs font-medium">{p.product_name}</TableCell>
                    <TableCell className="text-xs">{p.active_ingredient || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{PRODUCT_TYPE_LABELS[p.product_type] || p.product_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.dose}</TableCell>
                    <TableCell className="text-xs">{DOSE_UNITS.find(u => u.value === p.dose_unit)?.label || p.dose_unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}


      {/* ═══════ DIALOG: CADASTRAR LOTE ═══════ */}
      <Dialog open={lotDialogOpen} onOpenChange={setLotDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Cadastrar Novo Lote de Semente</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Identificação */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">Identificação do Lote</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Parental *</Label>
                  <Select value={lotForm.parent_type} onValueChange={v => setLotForm(f => ({ ...f, parent_type: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Fêmea ({femaleLine})</SelectItem>
                      <SelectItem value="male">Macho ({maleLine})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {lotForm.parent_type === "male" && (
                  <div>
                    <Label className="text-xs">Designado para</Label>
                    <Select value={lotForm.designated_male_planting} onValueChange={v => setLotForm(f => ({ ...f, designated_male_planting: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Qualquer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Qualquer plantio</SelectItem>
                        <SelectItem value="male_1">Macho 1</SelectItem>
                        <SelectItem value="male_2">Macho 2</SelectItem>
                        <SelectItem value="male_3">Macho 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Número do lote *</Label>
                  <Input value={lotForm.lot_number} onChange={e => setLotForm(f => ({ ...f, lot_number: e.target.value }))} placeholder="Ex: L-2024-0847" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Safra de origem *</Label>
                  <Input value={lotForm.origin_season} onChange={e => setLotForm(f => ({ ...f, origin_season: e.target.value }))} placeholder="Ex: 2024/25" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Data de recebimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !lotForm.received_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {lotForm.received_date ? format(lotForm.received_date, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={lotForm.received_date} onSelect={d => setLotForm(f => ({ ...f, received_date: d }))} locale={ptBR} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Quantidade *</Label>
                  <Input type="number" value={lotForm.quantity} onChange={e => setLotForm(f => ({ ...f, quantity: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Unidade</Label>
                  <Select value={lotForm.quantity_unit} onValueChange={v => setLotForm(f => ({ ...f, quantity_unit: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{QUANTITY_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Quantidade em kg</Label>
                  <Input type="number" value={lotForm.quantity_kg} onChange={e => setLotForm(f => ({ ...f, quantity_kg: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">PMS (g)</Label>
                  <Input type="number" step="0.1" value={lotForm.thousand_seed_weight_g} onChange={e => setLotForm(f => ({ ...f, thousand_seed_weight_g: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Peneira / classificação</Label>
                  <Input value={lotForm.sieve_classification} onChange={e => setLotForm(f => ({ ...f, sieve_classification: e.target.value }))} placeholder="Ex: C2M, R1G" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Fornecedor / origem</Label>
                  <Input value={lotForm.supplier_origin} onChange={e => setLotForm(f => ({ ...f, supplier_origin: e.target.value }))} placeholder="Ex: UBS Uberlândia" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Qualidade */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">Qualidade do Lote</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Germinação (%) *</Label>
                  <Input type="number" step="0.1" value={lotForm.germination_pct} onChange={e => setLotForm(f => ({ ...f, germination_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Vigor EA (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.vigor_aa_pct} onChange={e => setLotForm(f => ({ ...f, vigor_aa_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Vigor Frio (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.vigor_cold_pct} onChange={e => setLotForm(f => ({ ...f, vigor_cold_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">TZ Viabilidade (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.tetrazolium_viability_pct} onChange={e => setLotForm(f => ({ ...f, tetrazolium_viability_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">TZ Vigor (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.tetrazolium_vigor_pct} onChange={e => setLotForm(f => ({ ...f, tetrazolium_vigor_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Pureza física (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.physical_purity_pct} onChange={e => setLotForm(f => ({ ...f, physical_purity_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Pureza genética (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.genetic_purity_pct} onChange={e => setLotForm(f => ({ ...f, genetic_purity_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Umidade (%)</Label>
                  <Input type="number" step="0.1" value={lotForm.seed_moisture_pct} onChange={e => setLotForm(f => ({ ...f, seed_moisture_pct: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Data da análise</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !lotForm.quality_analysis_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {lotForm.quality_analysis_date ? format(lotForm.quality_analysis_date, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={lotForm.quality_analysis_date} onSelect={d => setLotForm(f => ({ ...f, quality_analysis_date: d }))} locale={ptBR} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs">Nº boletim análise</Label>
                  <Input value={lotForm.analysis_report_number} onChange={e => setLotForm(f => ({ ...f, analysis_report_number: e.target.value }))} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Condição visual */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold border-b pb-1">Condição Visual no Recebimento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Estado das embalagens</Label>
                  <Select value={lotForm.packaging_condition} onValueChange={v => setLotForm(f => ({ ...f, packaging_condition: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{PACKAGING_CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Presença de pragas</Label>
                  <Select value={lotForm.pest_presence} onValueChange={v => setLotForm(f => ({ ...f, pest_presence: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>{PEST_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações visuais</Label>
                <Textarea value={lotForm.reception_notes} onChange={e => setLotForm(f => ({ ...f, reception_notes: e.target.value }))} placeholder="Ex: Sacos em bom estado" rows={2} className="text-sm" />
              </div>
            </div>

            <Button onClick={() => saveLotMutation.mutate()} disabled={saveLotMutation.isPending || !lotForm.parent_type || !lotForm.lot_number || !lotForm.origin_season || !lotForm.quantity || !lotForm.germination_pct} className="w-full">
              {saveLotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Lote
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════ DIALOG: TS DO LOTE ═══════ */}
      <Dialog open={tsDialogOpen} onOpenChange={setTsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" /> Tratamento de Sementes — Lote {selectedLotForTS?.lot_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Origem */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Origem do tratamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {([
                  { v: "client_treated", l: "Semente já tratada pelo cliente", desc: "A semente chegou tratada, apenas registrar os produtos" },
                  { v: "in_house", l: "Semente branca (tratamos aqui)", desc: "Semente sem tratamento — inserir pacote de produtos e doses aplicados" },
                  { v: "no_treatment", l: "Sem tratamento", desc: "Semente será plantada sem TS" },
                ] as const).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setTsForm(f => ({ ...f, treatment_origin: opt.v }))}
                    className={cn("border rounded-lg p-3 text-left text-sm transition-all",
                      tsForm.treatment_origin === opt.v ? "border-primary bg-primary/5 ring-2 ring-primary/20 font-medium" : "border-border hover:border-primary/40"
                    )}>
                    <span className={cn("inline-block w-3 h-3 rounded-full border-2 mr-2 align-middle",
                      tsForm.treatment_origin === opt.v ? "border-primary bg-primary" : "border-muted-foreground"
                    )} />
                    <span className="block">{opt.l}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5 font-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Client treated */}
            {tsForm.treatment_origin === "client_treated" && (
              <div className="space-y-4 border-t pt-4">
                <Label className="text-xs font-medium">Produtos informados pelo cliente</Label>
                <ProductTable products={tsForm.products} setProducts={p => setTsForm(f => ({ ...f, products: p }))} />
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={tsForm.notes} onChange={e => setTsForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
                </div>
              </div>
            )}

            {/* In-house */}
            {tsForm.treatment_origin === "in_house" && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Data do tratamento *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !tsForm.treatment_date && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {tsForm.treatment_date ? format(tsForm.treatment_date, "dd/MM/yyyy") : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={tsForm.treatment_date} onSelect={d => setTsForm(f => ({ ...f, treatment_date: d }))} locale={ptBR} className="pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-xs">Local</Label>
                    <Input value={tsForm.treatment_location} onChange={e => setTsForm(f => ({ ...f, treatment_location: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Input value={tsForm.responsible_person} onChange={e => setTsForm(f => ({ ...f, responsible_person: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Equipamento</Label>
                    <Input value={tsForm.equipment_used} onChange={e => setTsForm(f => ({ ...f, equipment_used: e.target.value }))} placeholder="Ex: Momesso" className="h-9 text-sm" />
                  </div>
                </div>
                <Label className="text-xs font-medium">Produtos aplicados</Label>
                <ProductTable products={tsForm.products} setProducts={p => setTsForm(f => ({ ...f, products: p }))} showCategory showOrder />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Volume de calda (mL/kg)</Label>
                    <Input value={tsForm.total_slurry_volume} onChange={e => setTsForm(f => ({ ...f, total_slurry_volume: e.target.value }))} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Qualidade visual do TS</Label>
                    <Select value={tsForm.visual_quality} onValueChange={v => setTsForm(f => ({ ...f, visual_quality: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{VISUAL_QUALITY.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Germinação pós-TS (%)</Label>
                    <Input type="number" value={tsForm.germination_after_ts} onChange={e => setTsForm(f => ({ ...f, germination_after_ts: e.target.value }))} className="h-9 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={tsForm.notes} onChange={e => setTsForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-sm" />
                </div>
              </div>
            )}

            {/* No treatment */}
            {tsForm.treatment_origin === "no_treatment" && (
              <div className="space-y-3 border-t pt-4">
                <Label className="text-xs">Motivo</Label>
                <Textarea value={tsForm.no_treatment_reason} onChange={e => setTsForm(f => ({ ...f, no_treatment_reason: e.target.value }))} placeholder="Descreva o motivo" rows={3} className="text-sm" />
              </div>
            )}

            {tsForm.treatment_origin && (
              <Button onClick={() => saveTsMutation.mutate()} disabled={saveTsMutation.isPending || !tsForm.treatment_origin} className="w-full">
                {saveTsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Tratamento
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
