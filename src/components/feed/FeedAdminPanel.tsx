import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Trash2, Shield, Ban } from "lucide-react";
import { toast } from "sonner";

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "poster", label: "Poster" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Admin" },
];

export default function FeedAdminPanel() {
  const qc = useQueryClient();
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState("viewer");

  // Get all feed permissions
  const { data: perms, isLoading } = useQuery({
    queryKey: ["feed-admin-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feed_user_permissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Get user emails for mapping
  const { data: userEmails } = useQuery({
    queryKey: ["admin-user-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_emails_for_admin");
      if (error) throw error;
      return data as { id: string; email: string }[];
    },
  });

  const emailMap = new Map((userEmails ?? []).map((u) => [u.id, u.email]));

  const addUser = useMutation({
    mutationFn: async () => {
      // Find user by email
      const target = (userEmails ?? []).find((u) => u.email === newUserId.trim().toLowerCase());
      if (!target) throw new Error("Usuário não encontrado com este email");

      const { error } = await (supabase as any).from("feed_user_permissions").insert({
        user_id: target.id,
        role_feed: newRole,
        can_access_feed: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário adicionado ao feed");
      setNewUserId("");
      qc.invalidateQueries({ queryKey: ["feed-admin-permissions"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await (supabase as any).from("feed_user_permissions").update({ role_feed: role }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["feed-admin-permissions"] });
    },
  });

  const toggleBan = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      await (supabase as any).from("feed_user_permissions").update({ is_banned: banned }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["feed-admin-permissions"] });
    },
  });

  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("feed_user_permissions").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Acesso removido");
      qc.invalidateQueries({ queryKey: ["feed-admin-permissions"] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Add user */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Adicionar Usuário ao Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Input
              className="flex-1 min-w-[200px]"
              placeholder="Email do usuário"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
            />
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => addUser.mutate()} disabled={!newUserId.trim() || addUser.isPending}>
              {addUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Usuários do Feed ({perms?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(perms ?? []).map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{emailMap.get(p.user_id) ?? p.user_id}</TableCell>
                    <TableCell>
                      <Select
                        value={p.role_feed}
                        onValueChange={(v) => updateRole.mutate({ id: p.id, role: v })}
                      >
                        <SelectTrigger className="h-8 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {p.is_banned ? (
                        <Badge variant="destructive" className="text-[10px]">Banido</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={p.is_banned ? "Desbanir" : "Banir"}
                          onClick={() => toggleBan.mutate({ id: p.id, banned: !p.is_banned })}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeUser.mutate(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
