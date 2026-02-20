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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, UserPlus, Pencil, KeyRound, Trash2, RefreshCw, Eye, EyeOff, Copy, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ROLE_BADGE: Record<AppRole, { label: string; description: string; className: string }> = {
  admin: { label: "Admin", description: "Acesso total", className: "bg-red-100 text-red-700 border-red-200" },
  manager: { label: "Manager", description: "Gestão de ciclos e equipes", className: "bg-blue-100 text-blue-700 border-blue-200" },
  field_user: { label: "Campo", description: "Técnico de campo (registra dados)", className: "bg-green-100 text-green-700 border-green-200" },
  client: { label: "Cliente", description: "Visualização dos seus ciclos", className: "bg-purple-100 text-purple-700 border-purple-200" },
};

interface UserRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  client_id: string | null;
  created_at: string | null;
}

function generatePassword(length = 8): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const all = upper + lower + digits;
  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  for (let i = pw.length; i < length; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  return pw.sort(() => Math.random() - 0.5).join("");
}

export default function UsersTab() {
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Create user state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>("field_user");
  const [newClientId, setNewClientId] = useState("");

  // Success modal state
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ name: string; email: string; password: string; role: AppRole } | null>(null);

  // Edit user state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("field_user");
  const [editClientId, setEditClientId] = useState("");

  // Reset password state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const appUrl = window.location.origin;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["settings-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [profilesRes, rolesRes, authRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, org_id, created_at"),
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
          created_at: p.created_at,
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
      setCreatedUser({ name: newName, email: newEmail, password: newPassword, role: newRole });
      setCreateOpen(false);
      setSuccessOpen(true);
      toast.success(`Usuário ${newName} criado com sucesso!`);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("field_user");
      setNewClientId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, clientId, name }: { userId: string; role: AppRole; clientId?: string | null; name?: string }) => {
      const { error } = await (supabase as any).rpc("admin_upsert_role", {
        _user_id: userId,
        _role: role,
        _client_id: role === "client" && clientId ? clientId : null,
      });
      if (error) throw error;
      if (name) {
        await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success("Perfil atualizado");
      setEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("admin-create-user", {
        body: { action: "reset_password", user_id: userId, password },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      toast.success("Senha resetada com sucesso");
      setResetOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("admin-create-user", {
        body: { action: "delete_user", user_id: userId },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success("Usuário removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q) ?? false);
  });

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditName(u.full_name || "");
    setEditRole(u.role || "field_user");
    setEditClientId(u.client_id || "");
    setEditOpen(true);
  };

  const openResetPassword = (u: UserRow) => {
    setResetUser(u);
    setResetPassword(generatePassword());
    setShowResetPassword(true);
    setResetOpen(true);
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const roleLabel = ROLE_BADGE[createdUser.role]?.label || createdUser.role;
    const text = `Acesso ao sistema Produtiva:\n\nNome: ${createdUser.name}\nEmail: ${createdUser.email}\nSenha: ${createdUser.password}\nPerfil: ${roleLabel}\n\nURL de acesso: ${appUrl}`;
    navigator.clipboard.writeText(text);
    toast.success("Dados copiados para a área de transferência");
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
          <UserPlus className="h-4 w-4" /> Cadastrar Novo Usuário
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
                  <TableHead className="text-xs hidden md:table-cell">Criado em</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
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
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2" title="Editar" onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" title="Resetar senha" onClick={() => openResetPassword(u)}>
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              title="Remover"
                              onClick={() => {
                                if (confirm(`Remover o usuário ${u.full_name || u.email}?`)) {
                                  deleteUserMutation.mutate(u.user_id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
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

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha temporária *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setNewPassword(generatePassword())}>
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show-pw" checked={showPassword} onCheckedChange={(v) => setShowPassword(!!v)} />
                <label htmlFor="show-pw" className="text-xs text-muted-foreground cursor-pointer">Mostrar senha</label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_BADGE) as [AppRole, typeof ROLE_BADGE["admin"]][]).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-muted-foreground ml-1">— {meta.description}</span>
                    </SelectItem>
                  ))}
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
              disabled={createUser.isPending || !newName || !newEmail || newPassword.length < 6}
            >
              {createUser.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Usuário criado com sucesso!
            </DialogTitle>
          </DialogHeader>
          {createdUser && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div><span className="font-medium">Nome:</span> {createdUser.name}</div>
                <div><span className="font-medium">Email:</span> {createdUser.email}</div>
                <div><span className="font-medium">Senha:</span> {createdUser.password}</div>
                <div><span className="font-medium">Perfil:</span> {ROLE_BADGE[createdUser.role]?.label} ({ROLE_BADGE[createdUser.role]?.description})</div>
                <div className="pt-2 border-t border-border">
                  <span className="font-medium">URL de acesso:</span>
                  <div className="text-xs text-muted-foreground break-all mt-0.5">{appUrl}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Envie estes dados ao funcionário para que ele acesse o sistema.</p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-1.5" onClick={copyCredentials}>
              <Copy className="h-3.5 w-3.5" /> Copiar dados
            </Button>
            <Button variant="default" onClick={() => setSuccessOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário — {editUser?.full_name || editUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
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
              onClick={() => editUser && updateRole.mutate({ userId: editUser.user_id, role: editRole, clientId: editClientId, name: editName })}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar Senha — {resetUser?.full_name || resetUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nova senha temporária</Label>
              <div className="flex gap-2">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setResetPassword(generatePassword())}>
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="show-reset-pw" checked={showResetPassword} onCheckedChange={(v) => setShowResetPassword(!!v)} />
                <label htmlFor="show-reset-pw" className="text-xs text-muted-foreground cursor-pointer">Mostrar senha</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => resetUser && resetPasswordMutation.mutate({ userId: resetUser.user_id, password: resetPassword })}
              disabled={resetPasswordMutation.isPending || resetPassword.length < 6}
            >
              {resetPasswordMutation.isPending ? "Resetando..." : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
