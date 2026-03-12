import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Loader2, Upload, FileText, Camera } from "lucide-react";
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
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// ═══════════ TYPES & CONSTANTS ═══════════

interface SeedTreatmentProps {
  cycleId: string;
  orgId: string;
  contractNumber?: string;
  pivotName?: string;
  hybridName?: string;
  clientName?: string;
  femaleLine?: string;
  maleLine?: string;
}

type TreatmentOrigin = "client_treated" | "in_house" | "no_treatment";

interface ProductRow {
  id?: string;
  tempId: string;
  product_name: string;
  active_ingredient: string;
  product_type: string;
  category: string;
  dose: string;
  dose_unit: string;
  application_order: string;
}

const PARENT_COLORS: Record<string, string> = {
  female: "#EC407A",
  male_1: "#4CAF50",
  male_2: "#FF9800",
  male_3: "#7B1FA2",
};

const PARENT_LABELS: Record<string, string> = {
  female: "Fêmea",
  male_1: "Macho 1",
  male_2: "Macho 2",
  male_3: "Macho 3",
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
  { value: "excellent", label: "Excelente — cobertura uniforme" },
  { value: "good", label: "Boa" },
  { value: "regular", label: "Regular — desuniforme" },
  { value: "poor", label: "Ruim — excesso de calda/semente úmida" },
];

const ORIGIN_LABELS: Record<string, string> = {
  client_treated: "Cliente",
  in_house: "In-house",
  no_treatment: "Sem TS",
};

const QUALITY_LABELS: Record<string, string> = {
  excellent: "Excelente",
  good: "Boa",
  regular: "Regular",
  poor: "Ruim",
};

// ═══════════ HELPERS ═══════════

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

// ═══════════ SUB-COMPONENTS ═══════════

function ProductTable({
  products, setProducts, showCategory, showOrder,
}: {
  products: ProductRow[];
  setProducts: (p: ProductRow[]) => void;
  showCategory?: boolean;
  showOrder?: boolean;
}) {
  const updateProduct = (idx: number, field: keyof ProductRow, value: string) => {
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
                <TableCell>
                  <Input value={p.product_name} onChange={e => updateProduct(i, "product_name", e.target.value)} placeholder="Nome comercial" className="h-8 text-sm min-w-[140px]" />
                </TableCell>
                <TableCell>
                  <Input value={p.active_ingredient} onChange={e => updateProduct(i, "active_ingredient", e.target.value)} placeholder="Ingrediente ativo" className="h-8 text-sm min-w-[120px]" />
                </TableCell>
                <TableCell>
                  <Select value={p.product_type} onValueChange={v => updateProduct(i, "product_type", v)}>
                    <SelectTrigger className="h-8 text-sm min-w-[120px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                {showCategory && (
                  <TableCell>
                    <Select value={p.category} onValueChange={v => updateProduct(i, "category", v)}>
                      <SelectTrigger className="h-8 text-sm min-w-[110px]"><SelectValue placeholder="Cat." /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                )}
                <TableCell>
                  <Input type="number" step="0.01" value={p.dose} onChange={e => updateProduct(i, "dose", e.target.value)} placeholder="0" className="h-8 text-sm w-20" />
                </TableCell>
                <TableCell>
                  <Select value={p.dose_unit} onValueChange={v => updateProduct(i, "dose_unit", v)}>
                    <SelectTrigger className="h-8 text-sm min-w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{DOSE_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                {showOrder && (
                  <TableCell>
                    <Input type="number" value={p.application_order} onChange={e => updateProduct(i, "application_order", e.target.value)} className="h-8 text-sm w-16" placeholder="#" />
                  </TableCell>
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

// ═══════════ PARENTAL BLOCK ═══════════

interface ParentalBlockData {
  origin: TreatmentOrigin | "";
  treatmentDate: Date | undefined;
  treatmentLocation: string;
  responsiblePerson: string;
  equipmentUsed: string;
  seedLot: string;
  germinationBefore: string;
  vigorBefore: string;
  germinationAfter: string;
  totalSlurryVolume: string;
  visualQuality: string;
  seedConditionNotes: string;
  noTreatmentReason: string;
  products: ProductRow[];
}

const emptyBlock = (): ParentalBlockData => ({
  origin: "",
  treatmentDate: undefined,
  treatmentLocation: "",
  responsiblePerson: "",
  equipmentUsed: "",
  seedLot: "",
  germinationBefore: "",
  vigorBefore: "",
  germinationAfter: "",
  totalSlurryVolume: "",
  visualQuality: "",
  seedConditionNotes: "",
  noTreatmentReason: "",
  products: [newProduct()],
});

function ParentalBlock({
  parentType, lineName, data, setData, saving,
}: {
  parentType: string;
  lineName: string;
  data: ParentalBlockData;
  setData: (d: ParentalBlockData) => void;
  saving: boolean;
}) {
  const color = PARENT_COLORS[parentType] || "#888";
  const label = PARENT_LABELS[parentType] || parentType;

  const update = <K extends keyof ParentalBlockData>(field: K, value: ParentalBlockData[K]) => {
    setData({ ...data, [field]: value });
  };

  return (
    <Card className="overflow-hidden" style={{ borderColor: color, borderWidth: 2 }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
          TS — {label} ({lineName})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Origin radio */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Origem do tratamento</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { v: "client_treated", l: "Semente veio TRATADA pelo cliente" },
              { v: "in_house", l: "Tratamento feito por NÓS (in-house)" },
              { v: "no_treatment", l: "Sem tratamento (semente nua)" },
            ] as const).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => update("origin", opt.v)}
                className={cn(
                  "border rounded-lg p-3 text-left text-sm transition-all",
                  data.origin === opt.v
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 font-medium"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className={cn("inline-block w-3 h-3 rounded-full border-2 mr-2 align-middle",
                  data.origin === opt.v ? "border-primary bg-primary" : "border-muted-foreground"
                )} />
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* Client treated */}
        {data.origin === "client_treated" && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Data do recebimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !data.treatmentDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {data.treatmentDate ? format(data.treatmentDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={data.treatmentDate} onSelect={d => update("treatmentDate", d)} className="p-3 pointer-events-auto" locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Lote da semente</Label>
                <Input value={data.seedLot} onChange={e => update("seedLot", e.target.value)} placeholder="Nº do lote" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Germinação informada (%)</Label>
                <Input type="number" value={data.germinationBefore} onChange={e => update("germinationBefore", e.target.value)} placeholder="%" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Vigor informado (%)</Label>
                <Input type="number" value={data.vigorBefore} onChange={e => update("vigorBefore", e.target.value)} placeholder="%" className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Condição visual da semente recebida</Label>
              <Textarea value={data.seedConditionNotes} onChange={e => update("seedConditionNotes", e.target.value)} placeholder="Ex: Boa cobertura, sem pó, cor uniforme" rows={2} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs font-medium">Produtos informados pelo cliente</Label>
              <ProductTable products={data.products} setProducts={p => update("products", p)} />
            </div>
          </div>
        )}

        {/* In-house */}
        {data.origin === "in_house" && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Data do tratamento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left h-9 text-sm", !data.treatmentDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {data.treatmentDate ? format(data.treatmentDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={data.treatmentDate} onSelect={d => update("treatmentDate", d)} className="p-3 pointer-events-auto" locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Local</Label>
                <Input value={data.treatmentLocation} onChange={e => update("treatmentLocation", e.target.value)} placeholder="Ex: Galpão sede" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Responsável</Label>
                <Input value={data.responsiblePerson} onChange={e => update("responsiblePerson", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Equipamento</Label>
                <Input value={data.equipmentUsed} onChange={e => update("equipmentUsed", e.target.value)} placeholder="Ex: Máquina TS Momesso" className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Lote semente básica</Label>
                <Input value={data.seedLot} onChange={e => update("seedLot", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Germinação antes TS (%)</Label>
                <Input type="number" value={data.germinationBefore} onChange={e => update("germinationBefore", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Vigor antes TS (%)</Label>
                <Input type="number" value={data.vigorBefore} onChange={e => update("vigorBefore", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Volume de calda (mL/kg)</Label>
                <Input value={data.totalSlurryVolume} onChange={e => update("totalSlurryVolume", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Produtos aplicados</Label>
              <ProductTable products={data.products} setProducts={p => update("products", p)} showCategory showOrder />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Qualidade visual do TS</Label>
                <Select value={data.visualQuality} onValueChange={v => update("visualQuality", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{VISUAL_QUALITY.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Germinação pós-TS (%)</Label>
                <Input type="number" value={data.germinationAfter} onChange={e => update("germinationAfter", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* No treatment */}
        {data.origin === "no_treatment" && (
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label className="text-xs">Motivo</Label>
              <Textarea value={data.noTreatmentReason} onChange={e => update("noTreatmentReason", e.target.value)} placeholder="Ex: Cliente solicitou plantio sem TS" rows={2} className="text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Lote</Label>
                <Input value={data.seedLot} onChange={e => update("seedLot", e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Germinação (%)</Label>
                <Input type="number" value={data.germinationBefore} onChange={e => update("germinationBefore", e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════ SUMMARY CARD ═══════════

function SummaryCard({ parentType, lineName, data }: { parentType: string; lineName: string; data: ParentalBlockData }) {
  const color = PARENT_COLORS[parentType] || "#888";
  if (!data.origin) return null;

  const productNames = data.products.filter(p => p.product_name).map(p => p.product_name).join(" + ");
  const categories = [...new Set(data.products.filter(p => p.category).map(p => p.category))];

  return (
    <Card style={{ borderColor: color, borderWidth: 2 }} className="overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-semibold text-sm">{PARENT_LABELS[parentType]} ({lineName})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={data.origin === "in_house" ? "default" : "secondary"} className="text-xs">
            {ORIGIN_LABELS[data.origin]}
          </Badge>
          {data.visualQuality && (
            <Badge variant="outline" className="text-xs">{QUALITY_LABELS[data.visualQuality]}</Badge>
          )}
          {categories.map(c => (
            <Badge key={c} variant="outline" className="text-xs">
              {c === "chemical" ? "🧪 Químico" : c === "biological" ? "🦠 Biológico" : "🔬 Misto"}
            </Badge>
          ))}
        </div>
        {productNames && <p className="text-xs text-muted-foreground">{productNames}</p>}
        <div className="flex gap-4 text-xs">
          {data.germinationBefore && <span>Germinação: {data.germinationBefore}%</span>}
          {data.vigorBefore && <span>Vigor: {data.vigorBefore}%</span>}
          {data.germinationAfter && <span>Pós-TS: {data.germinationAfter}%</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════ MAIN COMPONENT ═══════════

export default function SeedTreatment({
  cycleId, orgId, contractNumber, pivotName, hybridName, clientName, femaleLine, maleLine,
}: SeedTreatmentProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Determine how many male plantings exist
  const { data: malePlantings } = useQuery({
    queryKey: ["planting-plan-males", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("planting_plan")
        .select("planting_order")
        .eq("cycle_id", cycleId)
        .eq("type", "male")
        .is("deleted_at", null)
        .order("planting_order");
      if (error) throw error;
      return data as { planting_order: number }[];
    },
  });

  const maleCount = useMemo(() => {
    if (!malePlantings?.length) return 1;
    return Math.max(...malePlantings.map((m: any) => m.planting_order), 1);
  }, [malePlantings]);

  const parentTypes = useMemo(() => {
    const types = ["female"];
    for (let i = 1; i <= maleCount; i++) types.push(`male_${i}`);
    return types;
  }, [maleCount]);

  // Fetch existing data
  const { data: existingTreatments, isLoading } = useQuery({
    queryKey: ["seed-treatments", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_treatment")
        .select("*, seed_treatment_products(*)")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null);
      if (error) throw error;
      return data as any[];
    },
  });

  // State per parental
  const [blocks, setBlocks] = useState<Record<string, ParentalBlockData>>({});

  // Initialize blocks from DB
  useMemo(() => {
    if (!existingTreatments || Object.keys(blocks).length > 0) return;
    const initial: Record<string, ParentalBlockData> = {};
    for (const pt of parentTypes) {
      const existing = existingTreatments.find((t: any) => t.parent_type === pt);
      if (existing) {
        initial[pt] = {
          origin: existing.treatment_origin,
          treatmentDate: existing.treatment_date ? new Date(existing.treatment_date + "T00:00:00") : undefined,
          treatmentLocation: existing.treatment_location || "",
          responsiblePerson: existing.responsible_person || "",
          equipmentUsed: existing.equipment_used || "",
          seedLot: existing.seed_lot || "",
          germinationBefore: existing.germination_before?.toString() || "",
          vigorBefore: existing.vigor_before?.toString() || "",
          germinationAfter: existing.germination_after?.toString() || "",
          totalSlurryVolume: existing.total_slurry_volume || "",
          visualQuality: existing.visual_quality || "",
          seedConditionNotes: existing.seed_condition_notes || "",
          noTreatmentReason: existing.no_treatment_reason || "",
          products: existing.seed_treatment_products?.length
            ? existing.seed_treatment_products.map((p: any) => ({
                id: p.id,
                tempId: p.id,
                product_name: p.product_name,
                active_ingredient: p.active_ingredient || "",
                product_type: p.product_type || "",
                category: p.category || "",
                dose: p.dose?.toString() || "",
                dose_unit: p.dose_unit || "mL/60k_seeds",
                application_order: p.application_order?.toString() || "",
              }))
            : [newProduct()],
        };
      } else {
        initial[pt] = emptyBlock();
      }
    }
    setBlocks(initial);
  }, [existingTreatments, parentTypes]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (pt: string) => {
      const data = blocks[pt];
      if (!data?.origin) throw new Error("Selecione a origem do tratamento");

      const payload: any = {
        cycle_id: cycleId,
        org_id: orgId,
        parent_type: pt,
        treatment_origin: data.origin,
        treatment_date: data.treatmentDate ? format(data.treatmentDate, "yyyy-MM-dd") : null,
        treatment_location: data.treatmentLocation || null,
        responsible_person: data.responsiblePerson || null,
        equipment_used: data.equipmentUsed || null,
        seed_lot: data.seedLot || null,
        germination_before: data.germinationBefore ? parseFloat(data.germinationBefore) : null,
        vigor_before: data.vigorBefore ? parseFloat(data.vigorBefore) : null,
        germination_after: data.germinationAfter ? parseFloat(data.germinationAfter) : null,
        total_slurry_volume: data.totalSlurryVolume || null,
        visual_quality: data.visualQuality || null,
        seed_condition_notes: data.seedConditionNotes || null,
        no_treatment_reason: data.noTreatmentReason || null,
        created_by: user?.id || null,
      };

      // Check if record exists
      const existing = existingTreatments?.find((t: any) => t.parent_type === pt);

      let treatmentId: string;
      if (existing) {
        const { error } = await (supabase as any)
          .from("seed_treatment")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        treatmentId = existing.id;

        // Delete old products
        await (supabase as any)
          .from("seed_treatment_products")
          .delete()
          .eq("seed_treatment_id", treatmentId);
      } else {
        const { data: inserted, error } = await (supabase as any)
          .from("seed_treatment")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        treatmentId = inserted.id;
      }

      // Insert products
      const validProducts = data.products.filter(p => p.product_name.trim() && p.dose);
      if (validProducts.length > 0) {
        const productsPayload = validProducts.map(p => ({
          seed_treatment_id: treatmentId,
          product_name: p.product_name.trim(),
          active_ingredient: p.active_ingredient || null,
          product_type: p.product_type || null,
          category: p.category || null,
          dose: parseFloat(p.dose),
          dose_unit: p.dose_unit,
          application_order: p.application_order ? parseInt(p.application_order) : null,
        }));
        const { error: pErr } = await (supabase as any)
          .from("seed_treatment_products")
          .insert(productsPayload);
        if (pErr) throw pErr;
      }
    },
    onSuccess: (_, pt) => {
      queryClient.invalidateQueries({ queryKey: ["seed-treatments", cycleId] });
      toast.success(`TS ${PARENT_LABELS[pt]} salvo com sucesso!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Consolidated products table
  const allProducts = useMemo(() => {
    if (!existingTreatments) return [];
    return existingTreatments.flatMap((t: any) =>
      (t.seed_treatment_products || []).map((p: any) => ({
        ...p,
        parent_type: t.parent_type,
        treatment_origin: t.treatment_origin,
      }))
    );
  }, [existingTreatments]);

  const hasAnySaved = existingTreatments && existingTreatments.length > 0;
  const hasAnyFilled = Object.values(blocks).some(b => b.origin);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Contrato: {contractNumber || pivotName}</span>
        <span>•</span>
        <span>Híbrido: {hybridName}</span>
        <span>•</span>
        <span>Cliente: {clientName}</span>
        <span>•</span>
        <span>Fêmea: <span className="font-mono">{femaleLine}</span></span>
        <span>•</span>
        <span>Macho: <span className="font-mono">{maleLine}</span></span>
      </div>

      {/* SEÇÃO 1 — Blocos por parental */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">Origem e Detalhes do Tratamento</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {parentTypes.map(pt => {
            const lineName = pt === "female" ? (femaleLine || "—") : (maleLine || "—");
            const blockData = blocks[pt] || emptyBlock();
            return (
              <div key={pt} className="space-y-2">
                <ParentalBlock
                  parentType={pt}
                  lineName={lineName}
                  data={blockData}
                  setData={d => setBlocks(prev => ({ ...prev, [pt]: d }))}
                  saving={saveMutation.isPending}
                />
                {blockData.origin && (
                  <Button
                    onClick={() => saveMutation.mutate(pt)}
                    disabled={saveMutation.isPending}
                    size="sm"
                    className="w-full"
                  >
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Salvar TS — {PARENT_LABELS[pt]}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2 — Resumo Visual */}
      {hasAnySaved && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Resumo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {parentTypes.map(pt => {
              const blockData = blocks[pt];
              if (!blockData?.origin) return null;
              const lineName = pt === "female" ? (femaleLine || "—") : (maleLine || "—");
              return <SummaryCard key={pt} parentType={pt} lineName={lineName} data={blockData} />;
            })}
          </div>
        </div>
      )}

      {/* SEÇÃO 3 — Tabela Consolidada */}
      {allProducts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Produtos Consolidados</h3>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parental</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>I.A.</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Ordem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProducts.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Badge style={{ backgroundColor: PARENT_COLORS[p.parent_type] || "#888", color: "#fff" }} className="text-xs">
                            {PARENT_LABELS[p.parent_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{ORIGIN_LABELS[p.treatment_origin] || "—"}</TableCell>
                        <TableCell className="text-sm font-medium">{p.product_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.active_ingredient || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {PRODUCT_TYPES.find(t => t.value === p.product_type)?.label || p.product_type || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.category ? CATEGORIES.find(c => c.value === p.category)?.label || p.category : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{p.dose}</TableCell>
                        <TableCell className="text-xs">{DOSE_UNITS.find(u => u.value === p.dose_unit)?.label || p.dose_unit}</TableCell>
                        <TableCell className="text-center text-xs">{p.application_order || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
