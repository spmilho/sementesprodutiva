import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "./ClientsTab";

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  contact_name: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  contact_email: z.string().email("Email inválido").max(255).optional().or(z.literal("")),
  status: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface ContactRow {
  id?: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  _deleted?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export default function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!client;
  const [contacts, setContacts] = useState<ContactRow[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contact_name: "", phone: "", contact_email: "", status: true },
  });

  const { data: existingContacts = [] } = useQuery({
    queryKey: ["client_contacts", client?.id],
    queryFn: async () => {
      if (!client) return [];
      const { data, error } = await (supabase as any)
        .from("client_contacts")
        .select("*")
        .eq("client_id", client.id)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!client && open,
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        contact_name: client.contact_name || "",
        phone: client.phone || "",
        contact_email: (client as any).contact_email || "",
        status: client.status === "active",
      });
      setContacts(
        existingContacts.map((c: any) => ({
          id: c.id, name: c.name, phone: c.phone || "", email: c.email || "", role: c.role || "",
        }))
      );
    } else {
      form.reset({ name: "", contact_name: "", phone: "", contact_email: "", status: true });
      setContacts([]);
    }
  }, [client, open, existingContacts]);

  const addContact = () => setContacts((prev) => [...prev, { name: "", phone: "", email: "", role: "" }]);
  const updateContact = (index: number, field: keyof ContactRow, value: string) =>
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  const removeContact = (index: number) => {
    setContacts((prev) => {
      const c = prev[index];
      if (c.id) return prev.map((item, i) => (i === index ? { ...item, _deleted: true } : item));
      return prev.filter((_, i) => i !== index);
    });
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = {
        name: values.name,
        contact_name: values.contact_name || null,
        phone: values.phone || null,
        contact_email: values.contact_email || null,
        status: values.status ? "active" : "inactive",
      };

      let clientId = client?.id;

      if (isEditing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
      } else {
        const { data: profile } = await supabase.from("profiles").select("org_id").single();
        if (!profile?.org_id) throw new Error("Organização não encontrada");
        const { data, error } = await supabase.from("clients").insert({ ...payload, org_id: profile.org_id }).select("id").single();
        if (error) throw error;
        clientId = data.id;
      }

      const { data: profile } = await supabase.from("profiles").select("org_id").single();
      if (!profile?.org_id) throw new Error("Organização não encontrada");

      for (const c of contacts) {
        if (c._deleted && c.id) {
          await (supabase as any).rpc("soft_delete_record", { _table_name: "client_contacts", _record_id: c.id });
        } else if (c.id) {
          await (supabase as any).from("client_contacts").update({ name: c.name, phone: c.phone || null, email: c.email || null, role: c.role || null }).eq("id", c.id);
        } else if (c.name.trim()) {
          await (supabase as any).from("client_contacts").insert({
            client_id: clientId, org_id: profile.org_id, name: c.name, phone: c.phone || null, email: c.email || null, role: c.role || null,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client_contacts"] });
      toast.success(isEditing ? "Cliente atualizado" : "Cliente criado");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao salvar"),
  });

  const visibleContacts = contacts.filter((c) => !c._deleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nome da empresa *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_name" render={({ field }) => (
              <FormItem><FormLabel>Contato principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Telefone principal</FormLabel><FormControl><Input {...field} placeholder="(00) 00000-0000" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_email" render={({ field }) => (
              <FormItem><FormLabel>Email do contato</FormLabel><FormControl><Input {...field} type="email" placeholder="email@empresa.com" /></FormControl><FormMessage /></FormItem>
            )} />

            {/* Additional contacts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Contatos adicionais</p>
                <Button type="button" variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={addContact}>
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {visibleContacts.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum contato adicional cadastrado.</p>
              )}
              {contacts.map((c, i) => {
                if (c._deleted) return null;
                return (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Contato {visibleContacts.indexOf(c) + 1}</p>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeContact(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nome *" value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)} className="h-8 text-sm" />
                      <Input placeholder="Cargo" value={c.role} onChange={(e) => updateContact(i, "role", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Telefone" value={c.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} className="h-8 text-sm" />
                      <Input placeholder="Email" type="email" value={c.email} onChange={(e) => updateContact(i, "email", e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                );
              })}
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
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
