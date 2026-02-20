import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const CYCLE_ROLES = [
  { value: "coordenador", label: "Coordenador" },
  { value: "tecnico", label: "Técnico" },
  { value: "observador", label: "Observador" },
];

export default function CycleTeamTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCycle, setSelectedCycle] = useState("");
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("observador");

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("org_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.org_id;

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles-for-team"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("production_cycles")
        .select("id, field_name, hybrid_name, season, contract_number, clients(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: team = [], isLoading: teamLoading } = useQuery({
    queryKey: ["cycle-team", selectedCycle],
    enabled: !!selectedCycle,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cycle_team")
        .select("id, user_id, role_in_cycle, profiles(full_name)")
        .eq("cycle_id", selectedCycle);
      if (error) throw error;

      // Get emails
      const { data: authData } = await (supabase as any).rpc("get_user_emails_for_admin");
      const emailMap: Record<string, string> = {};
      if (authData) for (const u of authData) emailMap[u.id] = u.email;

      return (data || []).map((t: any) => ({
        ...t,
        email: emailMap[t.user_id] || t.user_id,
        full_name: t.profiles?.full_name || null,
      }));
    },
  });

  const { data: orgUsers = [] } = useQuery({
    queryKey: ["org-users-for-team", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("org_id", orgId!);
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["manager", "field_user"]);
      const roleSet = new Set((roles || []).map((r: any) => r.user_id));
      return (data || []).filter((p: any) => roleSet.has(p.id));
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!selectedCycle || !addUserId || !orgId) throw new Error("Campos obrigatórios");
      const { error } = await (supabase as any).from("cycle_team").insert({
        cycle_id: selectedCycle,
        user_id: addUserId,
        org_id: orgId,
        role_in_cycle: addRole,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-team", selectedCycle] });
      setAddUserId("");
      toast.success("Membro adicionado!");
    },
    onError: (e: any) => toast.error(e.message?.includes("duplicate") ? "Usuário já está na equipe" : e.message),
  });

  const updateMemberRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await (supabase as any).from("cycle_team").update({ role_in_cycle: role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-team", selectedCycle] });
      toast.success("Função atualizada");
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("cycle_team").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-team", selectedCycle] });
      toast.success("Membro removido");
    },
  });

  const cycleLabel = (c: any) => {
    const parts = [c.contract_number || c.field_name, c.hybrid_name, c.season];
    if (c.clients?.name) parts.push(c.clients.name);
    return parts.filter(Boolean).join(" — ");
  };

  const availableUsers = orgUsers.filter((u: any) => !team.some((t: any) => t.user_id === u.id));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Selecionar Ciclo</Label>
        <Select value={selectedCycle} onValueChange={setSelectedCycle}>
          <SelectTrigger className="max-w-xl"><SelectValue placeholder="Selecione um ciclo..." /></SelectTrigger>
          <SelectContent>
            {cycles.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{cycleLabel(c)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCycle && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Equipe do Ciclo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
              ) : team.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro atribuído.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
                      <TableHead className="text-xs">Função</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm font-medium">{m.full_name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                        <TableCell>
                          <Select
                            value={m.role_in_cycle}
                            onValueChange={(v) => updateMemberRole.mutate({ id: m.id, role: v })}
                          >
                            <SelectTrigger className="h-8 w-[140px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CYCLE_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => removeMember.mutate(m.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Adicionar Membro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Usuário</Label>
                  <Select value={addUserId} onValueChange={setAddUserId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name || u.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Função</Label>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CYCLE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => addMember.mutate()} disabled={!addUserId || addMember.isPending}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
