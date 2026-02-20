import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole, AppRole } from "@/hooks/useRole";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";

const ROLE_BADGE: Record<AppRole, { label: string; className: string }> = {
  admin: { label: "Admin", className: "bg-red-100 text-red-700 border-red-200" },
  manager: { label: "Manager", className: "bg-blue-100 text-blue-700 border-blue-200" },
  field_user: { label: "Campo", className: "bg-green-100 text-green-700 border-green-200" },
  client: { label: "Cliente", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  client_id: string | null;
}

export default function UsersTab() {
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("field_user");
  const [editClientId, setEditClientId] = useState("");

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("field_user");
  const [newClientId, setNewClientId] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["settings-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [profilesRes, rolesRes, authRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, org_id"),
        (supabase as any).from("user_roles").select("user_id, role, client_id"),
        (supabase as any).rpc("get_user_emails_for_admin"),
      ]);
      const emailMap: Record<string, string> = {};
      if (authRes.data) for (const u of authRes.data) emailMap[u.id] = u.email;
      const roleMap = new Map<string, any>();
      if (rolesRes.data) for (const r of rolesRes.data) roleMap.set(r.user_id, r);

      return (profilesRes.data || []).map((p: any) => {
        const r = roleMap.get(p.id);
        return {
          user_id: p.id,
          email: emailMap[p.id] || p.id,
          full_name: p.full_name,
          role: r?.role ?? null,
          client_id: r?.client_id ?? null,
        } as UserRow;
      });
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-roles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").is("deleted_at", null).order("name");
      return data || [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, clientId }: { userId: string; role: AppRole; clientId?: string | null }) => {
      const { error } = await (supabase as any).rpc("admin_upsert_role", {
        _user_id: userId,
        _role: role,
        _client_id: role === "client" && clientId ? clientId : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success("Perfil atualizado");
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newName,
          role: newRole,
          client_id: newRole === "client" && newClientId ? newClientId : null,
        },
      });
      if (res.error) throw new Error(res.error.message || "Erro ao criar usuário");
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success("Usuário criado com sucesso");
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("field_user");
      setNewClientId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q) ?? false);
  });

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditRole(u.role || "field_user");
    setEditClientId(u.client_id || "");
    setEditOpen(true);
  };

  if (!isAdmin) return <div className="text-center py-8 text-sm text-muted-foreground">Acesso restrito a administradores.</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" /> Criar Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Perfil</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                ) : (
                  filtered.map((u) => {
                    const badge = u.role ? ROLE_BADGE[u.role] : null;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium text-sm">{u.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {badge ? (
                            <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem perfil</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Edit role dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil — {editUser?.full_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="field_user">Campo</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editRole === "client" && (
              <div className="space-y-2">
                <Label>Vincular ao cliente</Label>
                <Select value={editClientId} onValueChange={setEditClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => editUser && updateRole.mutate({ userId: editUser.user_id, role: editRole, clientId: editClientId })}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha temporária</Label>
              <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="field_user">Campo</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === "client" && (
              <div className="space-y-2">
                <Label>Vincular ao cliente</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !newName || !newEmail || !newPassword}
            >
              {createUser.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
