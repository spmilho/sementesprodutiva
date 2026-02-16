import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const schema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("").transform(() => undefined)),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("").transform(() => undefined)),
  total_area_ha: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  address: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  pivot_name: z.string().max(100).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export interface FarmRecord {
  id: string;
  org_id: string;
  cooperator_id: string | null;
  name: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  total_area_ha: number | null;
  address: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm: FarmRecord | null;
  cooperatorId: string;
}

export default function NewFarmFormDialog({ open, onOpenChange, farm, cooperatorId }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!farm;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", city: "", state: "", latitude: undefined, longitude: undefined, total_area_ha: undefined, address: "", notes: "", pivot_name: "" },
  });

  useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name,
        city: farm.city || "",
        state: farm.state || "",
        latitude: farm.latitude ?? undefined,
        longitude: farm.longitude ?? undefined,
        total_area_ha: farm.total_area_ha ?? undefined,
        address: farm.address || "",
        notes: farm.notes || "",
      });
    } else {
      form.reset({ name: "", city: "", state: "", latitude: undefined, longitude: undefined, total_area_ha: undefined, address: "", notes: "", pivot_name: "" });
    }
  }, [farm, open]);

  const captureGPS = () => {
    if (!navigator.geolocation) { toast.error("Geolocalização não suportada"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { form.setValue("latitude", pos.coords.latitude); form.setValue("longitude", pos.coords.longitude); toast.success("Coordenadas capturadas"); },
      () => toast.error("Não foi possível obter a localização")
    );
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        name: values.name,
        city: values.city || null,
        state: values.state || null,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        total_area_ha: values.total_area_ha ?? null,
        address: values.address || null,
        notes: values.notes || null,
        cooperator_id: cooperatorId,
      };
      if (isEditing) {
        const { error } = await (supabase as any).from("farms").update(payload).eq("id", farm.id);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("Organização não encontrada");
        const { data: newFarm, error } = await (supabase as any).from("farms").insert({ ...payload, org_id: profile.org_id }).select("id").single();
        if (error) throw error;
        // Create pivot if name provided
        if (values.pivot_name?.trim()) {
          const { error: pivotError } = await (supabase as any).from("pivots").insert({
            org_id: profile.org_id,
            farm_id: newFarm.id,
            name: values.pivot_name.trim(),
          });
          if (pivotError) throw pivotError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperators-tree"] });
      toast.success(isEditing ? "Fazenda atualizada" : "Fazenda criada");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? "Editar Fazenda" : "Nova Fazenda"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome da fazenda *</FormLabel><FormControl><Input {...field} placeholder="Ex: Fazenda São José" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>UF</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                    <SelectContent>{UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="total_area_ha" render={({ field }) => (
              <FormItem><FormLabel>Área total (ha)</FormLabel><FormControl><Input type="number" step="0.01" value={field.value ?? ""} onChange={field.onChange} placeholder="0" /></FormControl></FormItem>
            )} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Coordenadas</FormLabel>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={captureGPS}>
                  <MapPin className="h-3 w-3" /> Capturar GPS
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" step="any" placeholder="Latitude" value={field.value ?? ""} onChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" step="any" placeholder="Longitude" value={field.value ?? ""} onChange={field.onChange} /></FormControl></FormItem>
                )} />
              </div>
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Endereço / Referência</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
            )} />
            {!isEditing && (
              <div className="border-t pt-4 mt-2">
                <FormField control={form.control} name="pivot_name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Pivô (opcional)</FormLabel><FormControl><Input {...field} placeholder="Ex: Pivô 1" /></FormControl><FormMessage /></FormItem>
                )} />
                <p className="text-xs text-muted-foreground mt-1">Se informado, um pivô será criado automaticamente dentro desta fazenda.</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
