import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole, AppRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Shield, ShieldCheck, Wrench, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const ROLE_META: Record<AppRole, { label: string; icon: typeof Shield; color: string }> = {
  admin: { label: "Admin", icon: ShieldCheck, color: "destructive" as any },
  manager: { label: "Manager", icon: Shield, color: "default" as any },
  field_user: { label: "Campo", icon: Wrench, color: "secondary" as any },
  client: { label: "Cliente", icon: Eye, color: "outline" as any },
};

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  role: AppRole | null;
  client_id: string | null;
}

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AppRole>("field_user");
  const [addClientId, setAddClientId] = useState("");

  // Fetch all profiles + their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, org_id");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await (supabase as any)
        .from("user_roles")
        .select("id, user_id, role, client_id");
      if (rErr) throw rErr;

      // Get emails from auth - we'll use profiles id to match
      const { data: authData } = await (supabase as any).rpc("get_user_emails_for_admin");
      const emailMap: Record<string, string> = {};
      if (authData) {
        for (const u of authData) emailMap[u.id] = u.email;
      }

      const roleMap = new Map<string, any>();
      for (const r of roles || []) roleMap.set(r.user_id, r);

      return (profiles || []).map((p: any) => {
        const r = roleMap.get(p.id);
        return {
          user_id: p.id,
          email: emailMap[p.id] || p.id,
          full_name: p.full_name,
          role_id: r?.id ?? null,
          role: r?.role ?? null,
          client_id: r?.client_id ?? null,
        } as UserWithRole;
      });
    },
  });

  // Fetch clients for client role assignment
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole, clientId }: { userId: string; newRole: AppRole; clientId?: string | null }) => {
      // Delete existing role
      await (supabase as any).from("user_roles").delete().eq("user_id", userId);
      // Insert new role
      const payload: any = { user_id: userId, role: newRole };
      if (newRole === "client" && clientId) payload.client_id = clientId;
      const { error } = await (supabase as any).from("user_roles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar role"),
  });

  const deleteRole = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (roleLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.full_name?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Usuários</h1>
        <p className="text-sm text-muted-foreground">Atribua roles e permissões aos usuários da organização</p>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(ROLE_META) as [AppRole, typeof ROLE_META["admin"]][]).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="font-medium">{meta.label}</span>
              <span>—</span>
              <span>
                {key === "admin" && "Acesso total"}
                {key === "manager" && "CRUD na organização"}
                {key === "field_user" && "Inserir e visualizar"}
                {key === "client" && "Somente leitura (client-scoped)"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Usuário</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Cliente vinculado</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((u) => {
                    const meta = u.role ? ROLE_META[u.role] : null;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium text-sm">{u.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Select
                            value={u.role || ""}
                            onValueChange={(val) => {
                              if (val === "client") {
                                // Need to pick a client - show a toast prompting
                                toast.info("Selecione o cliente vinculado na coluna ao lado");
                              }
                              updateRole.mutate({ userId: u.user_id, newRole: val as AppRole, clientId: val === "client" ? u.client_id : null });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue placeholder="Sem role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="field_user">Campo</SelectItem>
                              <SelectItem value="client">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {u.role === "client" ? (
                            <Select
                              value={u.client_id || ""}
                              onValueChange={(cid) => updateRole.mutate({ userId: u.user_id, newRole: "client", clientId: cid })}
                            >
                              <SelectTrigger className="h-8 w-[160px] text-xs">
                                <SelectValue placeholder="Selecionar cliente" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.role_id && (
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteRole.mutate(u.user_id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
