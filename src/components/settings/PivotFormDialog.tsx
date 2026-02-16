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

const irrigationOptions = [
  { value: "pivot", label: "Pivô Central" },
  { value: "dryland", label: "Sequeiro" },
  { value: "drip", label: "Gotejamento" },
  { value: "sprinkler", label: "Aspersão" },
];

const statusOptions = [
  { value: "available", label: "Disponível" },
  { value: "in_use", label: "Em produção" },
  { value: "maintenance", label: "Manutenção" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  area_ha: z.coerce.number().positive("Área deve ser > 0"),
  irrigation_type: z.string().optional().or(z.literal("")),
  status: z.string().default("available"),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("").transform(() => undefined)),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export interface PivotRecord {
  id: string;
  org_id: string;
  farm_id: string;
  name: string;
  area_ha: number | null;
  latitude: number | null;
  longitude: number | null;
  irrigation_type: string | null;
  status: string;
  notes: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pivot: PivotRecord | null;
  farmId: string;
}

export default function PivotFormDialog({ open, onOpenChange, pivot, farmId }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!pivot;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", area_ha: undefined as any, irrigation_type: "pivot", status: "available", latitude: undefined, longitude: undefined, notes: "" },
  });

  useEffect(() => {
    if (pivot) {
      form.reset({
        name: pivot.name,
        area_ha: pivot.area_ha ?? (undefined as any),
        irrigation_type: pivot.irrigation_type || "pivot",
        status: pivot.status,
        latitude: pivot.latitude ?? undefined,
        longitude: pivot.longitude ?? undefined,
        notes: pivot.notes || "",
      });
    } else {
      form.reset({ name: "", area_ha: undefined as any, irrigation_type: "pivot", status: "available", latitude: undefined, longitude: undefined, notes: "" });
    }
  }, [pivot, open]);

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
        area_ha: values.area_ha,
        irrigation_type: values.irrigation_type || null,
        status: values.status,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        notes: values.notes || null,
        farm_id: farmId,
      };
      if (isEditing) {
        const { error } = await (supabase as any).from("pivots").update(payload).eq("id", pivot.id);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("Organização não encontrada");
        const { error } = await (supabase as any).from("pivots").insert({ ...payload, org_id: profile.org_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperators-tree"] });
      toast.success(isEditing ? "Pivô atualizado" : "Pivô criado");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEditing ? "Editar Pivô" : "Novo Pivô"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome / Identificação *</FormLabel><FormControl><Input {...field} placeholder="Ex: Pivô 1, Pivô Norte" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="area_ha" render={({ field }) => (
              <FormItem><FormLabel>Área (ha) *</FormLabel><FormControl><Input type="number" step="0.01" value={field.value ?? ""} onChange={field.onChange} placeholder="0" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="irrigation_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de irrigação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{irrigationOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{statusOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
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
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl></FormItem>
            )} />
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
