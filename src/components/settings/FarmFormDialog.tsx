import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Farm } from "./FarmsTab";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const schema = z.object({
  name: z.string().trim().min(1, "Nome da fazenda é obrigatório").max(100),
  cooperator_name: z.string().trim().min(1, "Nome do cooperado é obrigatório").max(100),
  cooperator_document: z.string().max(20).optional().or(z.literal("")),
  cooperator_phone: z.string().max(20).optional().or(z.literal("")),
  cooperator_email: z.string().max(100).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Cidade é obrigatória").max(100),
  state: z.string().min(1, "UF é obrigatória"),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("").transform(() => undefined)),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("").transform(() => undefined)),
  address: z.string().max(200).optional().or(z.literal("")),
  status: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farm: Farm | null;
}

export default function FarmFormDialog({ open, onOpenChange, farm }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!farm;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", cooperator_name: "", cooperator_document: "", cooperator_phone: "", cooperator_email: "",
      city: "", state: "", latitude: undefined, longitude: undefined, address: "", status: true,
    },
  });

  useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name,
        cooperator_name: farm.cooperator_name || "",
        cooperator_document: farm.cooperator_document || "",
        cooperator_phone: farm.cooperator_phone || "",
        cooperator_email: farm.cooperator_email || "",
        city: farm.city || "",
        state: farm.state || "",
        latitude: farm.latitude ?? undefined,
        longitude: farm.longitude ?? undefined,
        address: farm.address || "",
        status: farm.status === "active",
      });
    } else {
      form.reset({
        name: "", cooperator_name: "", cooperator_document: "", cooperator_phone: "", cooperator_email: "",
        city: "", state: "", latitude: undefined, longitude: undefined, address: "", status: true,
      });
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
        cooperator_name: values.cooperator_name,
        cooperator_document: values.cooperator_document || null,
        cooperator_phone: values.cooperator_phone || null,
        cooperator_email: values.cooperator_email || null,
        city: values.city,
        state: values.state,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
        address: values.address || null,
        status: values.status ? "active" : "inactive",
      };

      if (isEditing) {
        const { error } = await supabase.from("farms").update(payload).eq("id", farm.id);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("Organização não encontrada");
        const { error } = await supabase.from("farms").insert({ ...payload, org_id: profile.org_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      toast.success(isEditing ? "Fazenda atualizada" : "Fazenda criada");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Fazenda" : "Nova Fazenda"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da fazenda / propriedade *</FormLabel>
                <FormControl><Input {...field} placeholder="Ex: Fazenda Santa Maria" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Cooperado section */}
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium text-foreground">Cooperado / Produtor</p>
              <FormField control={form.control} name="cooperator_name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nome do cooperado *</FormLabel>
                  <FormControl><Input {...field} placeholder="Nome completo" className="h-8 text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cooperator_document" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">CPF ou CNPJ</FormLabel>
                  <FormControl><Input {...field} placeholder="000.000.000-00" className="h-8 text-sm" /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-2">
                <FormField control={form.control} name="cooperator_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Telefone</FormLabel>
                    <FormControl><Input {...field} placeholder="(00) 00000-0000" className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="cooperator_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Email</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="email@exemplo.com" className="h-8 text-sm" /></FormControl>
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Cidade *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel>UF *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger></FormControl>
                    <SelectContent>{UF_LIST.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Coordenadas (Pivô Central)</FormLabel>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={captureGPS}>
                  <MapPin className="h-3 w-3" /> Capturar GPS
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" step="any" placeholder="Latitude" value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem><FormControl><Input type="number" step="any" placeholder="Longitude" value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço / Referência</FormLabel>
                <FormControl><Input {...field} placeholder="Endereço ou ponto de referência" /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm">Ativo</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
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
