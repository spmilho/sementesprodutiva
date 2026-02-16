import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Pencil, Power, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import ClientFormDialog from "./ClientFormDialog";

export interface Client {
  id: string;
  org_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

export default function ClientsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ["client_contacts_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_contacts")
        .select("*")
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (client: Client) => {
      const newStatus = client.status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("clients").update({ status: newStatus }).eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const getContacts = (clientId: string) => allContacts.filter((c: any) => c.client_id === clientId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="gap-2" onClick={() => { setEditingClient(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8"></TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Contato Principal</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Contatos</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente encontrado</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const contacts = getContacts(c.id);
                    const isExpanded = expandedId === c.id;
                    return (
                      <>
                        <TableRow key={c.id}>
                          <TableCell className="w-8 pr-0">
                            {contacts.length > 0 && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              {c.logo_url && <img src={c.logo_url} alt="" className="h-6 w-6 rounded object-cover" />}
                              {c.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{c.contact_name || "—"}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{c.phone || "—"}</TableCell>
                          <TableCell className="text-sm hidden md:table-cell">
                            {contacts.length > 0 && (
                              <Badge variant="secondary" className="text-xs">{contacts.length}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.status === "active" ? "default" : "secondary"}>
                              {c.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setEditingClient(c); setDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => toggleStatus.mutate(c)}>
                                <Power className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && contacts.map((contact: any) => (
                          <TableRow key={contact.id} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell className="text-xs text-muted-foreground pl-6" colSpan={2}>
                              <span className="font-medium text-foreground">{contact.name}</span>
                              {contact.role && <span className="ml-2 text-muted-foreground">({contact.role})</span>}
                            </TableCell>
                            <TableCell className="text-xs hidden sm:table-cell">{contact.phone || "—"}</TableCell>
                            <TableCell className="text-xs hidden md:table-cell">{contact.email || "—"}</TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editingClient} />
    </div>
  );
}
