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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const schema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  document: z.string().max(20).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface Cooperator {
  id: string;
  org_id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cooperator: Cooperator | null;
}

export default function CooperatorFormDialog({ open, onOpenChange, cooperator }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!cooperator;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", document: "", phone: "", email: "", city: "", state: "", address: "", notes: "", active: true },
  });

  useEffect(() => {
    if (cooperator) {
      form.reset({
        name: cooperator.name,
        document: cooperator.document || "",
        phone: cooperator.phone || "",
        email: cooperator.email || "",
        city: cooperator.city || "",
        state: cooperator.state || "",
        address: cooperator.address || "",
        notes: cooperator.notes || "",
        active: cooperator.active,
      });
    } else {
      form.reset({ name: "", document: "", phone: "", email: "", city: "", state: "", address: "", notes: "", active: true });
    }
  }, [cooperator, open]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        name: values.name,
        document: values.document || null,
        phone: values.phone || null,
        email: values.email || null,
        city: values.city || null,
        state: values.state || null,
        address: values.address || null,
        notes: values.notes || null,
        active: values.active,
      };
      if (isEditing) {
        const { error } = await (supabase as any).from("cooperators").update(payload).eq("id", cooperator.id);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("Organização não encontrada");
        const { error } = await (supabase as any).from("cooperators").insert({ ...payload, org_id: profile.org_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperators"] });
      toast.success(isEditing ? "Cooperado atualizado" : "Cooperado criado");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cooperado" : "Novo Cooperado"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome completo *</FormLabel><FormControl><Input {...field} placeholder="Nome do cooperado" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="document" render={({ field }) => (
              <FormItem><FormLabel>CPF ou CNPJ</FormLabel><FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} placeholder="(00) 00000-0000" /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="email@exemplo.com" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
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
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>Endereço / Referência</FormLabel><FormControl><Input {...field} placeholder="Endereço ou ponto de referência" /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} rows={2} placeholder="Observações sobre o cooperado" /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="active" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm">Ativo</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
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
