import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ratioOptions = ["4F:2M", "6F:2M", "4F:1M", "3F:1M", "custom"];
const materialSplitOptions = [
  "P, ½V2, ½V3", "P, V1, ½V2", "P, Palito, V1", "P, E, ½V1", "P, ¾E, Palito",
  "P, ½E, E", "P, ¼E, ¾E", "P, P, ¾E", "P, P, ½E", "P, P, ¼E", "P, P, P",
  "¼E, P, ¼E", "½E, P, ½E", "½E, P, P", "¾E, P, ¾E", "¾E, P, ¼E",
  "E, P, ½E", "Palito, P, ½E", "½V1, P, ½E", "V1, P, ½E", "½V2, P, ½E",
  "V2, P, ½E", "½V3, P, ½E", "P, ¼E, ¾E", "Palito, P, ¾E",
];
const irrigationLabels: Record<string, string> = {
  pivot: "Pivô Central",
  dryland: "Sequeiro",
  drip: "Gotejamento",
  sprinkler: "Aspersão",
};
const irrigationOptions = ["Pivô Central", "Sequeiro", "Gotejamento", "Aspersão"];
const statusOptions = [
  { value: "planning", label: "Planejamento" },
  { value: "planting", label: "Plantio" },
  { value: "growing", label: "Crescimento" },
  { value: "detasseling", label: "Despendoamento" },
  { value: "harvest", label: "Colheita" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

function computeAreas(totalArea: number, ratio: string) {
  const map: Record<string, [number, number]> = {
    "4F:2M": [4, 2],
    "6F:2M": [6, 2],
    "4F:1M": [4, 1],
    "3F:1M": [3, 1],
  };
  const parts = map[ratio];
  if (!parts || !totalArea) return { female: 0, male: 0 };
  const total = parts[0] + parts[1];
  return {
    female: Math.round((totalArea * parts[0]) / total * 100) / 100,
    male: Math.round((totalArea * parts[1]) / total * 100) / 100,
  };
}

const schema = z.object({
  contract_number: z.string().max(50).optional().or(z.literal("")),
  client_id: z.string().min(1, "Cliente é obrigatório"),
  cooperator_id: z.string().min(1, "Cooperado é obrigatório"),
  farm_id: z.string().min(1, "Fazenda é obrigatória"),
  pivot_id: z.string().min(1, "Pivô é obrigatório"),
  field_name: z.string().trim().min(1, "Pivô é obrigatório").max(100),
  season: z.string().trim().min(1, "Safra é obrigatória").max(20),
  hybrid_name: z.string().trim().min(1, "Híbrido é obrigatório").max(100),
  female_line: z.string().trim().min(1, "Linhagem fêmea é obrigatória").max(100),
  male_line: z.string().trim().min(1, "Linhagem macho é obrigatória").max(100),
  total_area: z.coerce.number().positive("Área deve ser > 0"),
  female_male_ratio: z.string().min(1, "Proporção é obrigatória"),
  irrigation_system: z.string().min(1, "Sistema de irrigação é obrigatório"),
  pivot_area: z.coerce.number().optional(),
  material_cycle_days: z.coerce.number().int().positive().optional(),
  expected_productivity: z.coerce.number().positive().optional(),
  target_moisture: z.coerce.number().min(0).max(100).optional(),
  isolation_distance: z.coerce.number().min(0).optional(),
  temporal_isolation_days: z.coerce.number().int().min(0).optional(),
  material_split: z.string().min(1, "Split do material é obrigatório"),
  status: z.string().default("planning"),
});

type FormValues = z.infer<typeof schema>;

export default function CycleForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contract_number: "",
      status: "planning",
      female_male_ratio: "4F:2M",
      irrigation_system: "Pivô Central",
      target_moisture: 18,
      isolation_distance: 300,
      temporal_isolation_days: 30,
      field_name: "",
      material_split: "",
    },
  });

  const [splitOpen, setSplitOpen] = useState(false);

  const totalArea = watch("total_area");
  const ratio = watch("female_male_ratio");
  const irrigation = watch("irrigation_system");
  const expectedProductivity = watch("expected_productivity");
  const selectedCooperatorId = watch("cooperator_id");
  const selectedFarmId = watch("farm_id");

  const { female: femaleArea, male: maleArea } = useMemo(
    () => computeAreas(totalArea || 0, ratio),
    [totalArea, ratio]
  );

  const expectedProduction = useMemo(() => {
    if (!expectedProductivity || !femaleArea) return 0;
    return Math.round((femaleArea * expectedProductivity) / 1000 * 100) / 100;
  }, [femaleArea, expectedProductivity]);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").eq("status", "active").is("deleted_at", null).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: cooperators = [] } = useQuery({
    queryKey: ["cooperators-active"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("cooperators").select("id, name").eq("active", true).is("deleted_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: farms = [] } = useQuery({
    queryKey: ["farms-by-cooperator", selectedCooperatorId],
    queryFn: async () => {
      if (!selectedCooperatorId) return [];
      const { data, error } = await (supabase as any).from("farms").select("id, name").eq("cooperator_id", selectedCooperatorId).is("deleted_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!selectedCooperatorId,
  });

  const { data: pivots = [] } = useQuery({
    queryKey: ["pivots-by-farm", selectedFarmId],
    queryFn: async () => {
      if (!selectedFarmId) return [];
      const { data, error } = await (supabase as any).from("pivots").select("id, name, area_ha, irrigation_type").eq("farm_id", selectedFarmId).is("deleted_at", null).order("name");
      if (error) throw error;
      return data as { id: string; name: string; area_ha: number | null; irrigation_type: string | null }[];
    },
    enabled: !!selectedFarmId,
  });

  const handlePivotChange = (pivotId: string) => {
    setValue("pivot_id", pivotId);
    const pivot = pivots.find((p) => p.id === pivotId);
    if (pivot) {
      setValue("field_name", pivot.name);
      if (pivot.area_ha) setValue("pivot_area", pivot.area_ha);
      if (pivot.irrigation_type) {
        const label = irrigationLabels[pivot.irrigation_type];
        if (label) setValue("irrigation_system", label);
      }
    }
  };

  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!profile?.org_id) throw new Error("Organização não encontrada");
      const { error } = await (supabase as any).from("production_cycles").insert({
        contract_number: values.contract_number || null,
        client_id: values.client_id,
        cooperator_id: values.cooperator_id,
        farm_id: values.farm_id,
        pivot_id: values.pivot_id,
        field_name: values.field_name,
        season: values.season,
        hybrid_name: values.hybrid_name,
        female_line: values.female_line,
        male_line: values.male_line,
        total_area: values.total_area,
        female_male_ratio: values.female_male_ratio,
        irrigation_system: values.irrigation_system,
        status: values.status,
        org_id: profile.org_id,
        female_area: femaleArea,
        male_area: maleArea,
        expected_production: expectedProduction || null,
        pivot_area: values.pivot_area || null,
        material_cycle_days: values.material_cycle_days || null,
        expected_productivity: values.expected_productivity || null,
        target_moisture: values.target_moisture ?? 18,
        isolation_distance: values.isolation_distance ?? 300,
        temporal_isolation_days: values.temporal_isolation_days ?? 30,
        material_split: values.material_split || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production_cycles"] });
      toast.success("Ciclo criado com sucesso!");
      navigate("/ciclos");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar ciclo"),
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ciclos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Novo Ciclo de Produção</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Número do contrato</Label>
                <Input {...register("contract_number")} placeholder="Preencha quando disponível" />
                <p className="text-xs text-muted-foreground">
                  Se o contrato ainda não foi gerado, o pivô será usado como identificador até a atualização.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Safra *</Label>
                <Input {...register("season")} placeholder="Ex: 2025/26" />
                {errors.season && <p className="text-xs text-destructive">{errors.season.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Controller name="client_id" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.client_id && <p className="text-xs text-destructive">{errors.client_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Cooperado *</Label>
                <Controller name="cooperator_id" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue("farm_id", ""); setValue("pivot_id", ""); setValue("field_name", ""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cooperado" /></SelectTrigger>
                    <SelectContent>
                      {cooperators.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.cooperator_id && <p className="text-xs text-destructive">{errors.cooperator_id.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fazenda *</Label>
                <Controller name="farm_id" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue("pivot_id", ""); setValue("field_name", ""); }} disabled={!selectedCooperatorId}>
                    <SelectTrigger><SelectValue placeholder={selectedCooperatorId ? "Selecione a fazenda" : "Selecione o cooperado primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.farm_id && <p className="text-xs text-destructive">{errors.farm_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Pivô *</Label>
                <Controller name="pivot_id" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={handlePivotChange} disabled={!selectedFarmId}>
                    <SelectTrigger><SelectValue placeholder={selectedFarmId ? "Selecione o pivô" : "Selecione a fazenda primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {pivots.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.area_ha ? ` (${p.area_ha} ha)` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.pivot_id && <p className="text-xs text-destructive">{errors.pivot_id.message}</p>}
                <input type="hidden" {...register("field_name")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Material Genético */}
        <Card>
          <CardHeader><CardTitle className="text-base">Material Genético</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Híbrido *</Label>
              <Input {...register("hybrid_name")} placeholder="Ex: P3456H" />
              {errors.hybrid_name && <p className="text-xs text-destructive">{errors.hybrid_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Linhagem Fêmea *</Label>
              <Input {...register("female_line")} placeholder="Ex: LF-201" />
              {errors.female_line && <p className="text-xs text-destructive">{errors.female_line.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Linhagem Macho *</Label>
              <Input {...register("male_line")} placeholder="Ex: LM-105" />
              {errors.male_line && <p className="text-xs text-destructive">{errors.male_line.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Split do Material *</Label>
              <Controller name="material_split" control={control} render={({ field }) => (
                <Popover open={splitOpen} onOpenChange={setSplitOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={splitOpen} className="w-full justify-between font-normal">
                      {field.value || "Selecione o split"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0">
                    <Command>
                      <CommandInput placeholder="Filtrar split..." />
                      <CommandList>
                        <CommandEmpty>Nenhum split encontrado.</CommandEmpty>
                        <CommandGroup>
                          {materialSplitOptions.map((opt) => (
                            <CommandItem key={opt} value={opt} onSelect={() => { field.onChange(opt); setSplitOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", field.value === opt ? "opacity-100" : "opacity-0")} />
                              {opt}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )} />
              {errors.material_split && <p className="text-xs text-destructive">{errors.material_split.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Área e Configuração */}
        <Card>
          <CardHeader><CardTitle className="text-base">Área e Configuração</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Área total (ha) *</Label>
              <Input type="number" step="0.01" {...register("total_area")} placeholder="0" />
              {errors.total_area && <p className="text-xs text-destructive">{errors.total_area.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Proporção F:M *</Label>
              <Controller name="female_male_ratio" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ratioOptions.map((r) => <SelectItem key={r} value={r}>{r === "custom" ? "Personalizado" : r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Área Fêmea (ha)</Label>
              <Input value={femaleArea || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Área Macho (ha)</Label>
              <Input value={maleArea || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Sistema de Irrigação *</Label>
              <Controller name="irrigation_system" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {irrigationOptions.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            {irrigation === "Pivô Central" && (
              <div className="space-y-1.5">
                <Label>Área do Pivô (ha)</Label>
                <Input type="number" step="0.01" {...register("pivot_area")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Ciclo do Material (dias)</Label>
              <Input type="number" {...register("material_cycle_days")} placeholder="Ex: 130" />
            </div>
          </CardContent>
        </Card>

        {/* Metas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Metas</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Produtividade fêmea (kg/ha)</Label>
              <Input type="number" step="0.01" {...register("expected_productivity")} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Produção total esperada (ton)</Label>
              <Input value={expectedProduction || ""} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Umidade alvo (%)</Label>
              <Input type="number" step="0.1" {...register("target_moisture")} />
            </div>
            <div className="space-y-1.5">
              <Label>Distância de isolamento (m)</Label>
              <Input type="number" {...register("isolation_distance")} />
            </div>
            <div className="space-y-1.5">
              <Label>Isolamento temporal (dias)</Label>
              <Input type="number" {...register("temporal_isolation_days")} />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-w-xs">
              <Label>Status do ciclo</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/ciclos")}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Ciclo
          </Button>
        </div>
      </form>
    </div>
  );
}
