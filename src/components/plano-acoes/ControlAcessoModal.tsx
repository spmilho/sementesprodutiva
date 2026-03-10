import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ProfileAccess {
  id: string;
  full_name: string | null;
  habilitado: boolean;
}

export function ControlAcessoModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [users, setUsers] = useState<ProfileAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data: profiles } = await (supabase as any).from("profiles").select("id, full_name");
    const { data: acessos } = await (supabase as any).from("plano_acoes_acesso").select("user_id, habilitado");

    const acessoMap = new Map((acessos || []).map((a: any) => [a.user_id, a.habilitado]));
    const list = (profiles || [])
      .filter((p: any) => p.id !== user?.id)
      .map((p: any) => ({ id: p.id, full_name: p.full_name, habilitado: acessoMap.get(p.id) ?? false }));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { if (open) fetch(); }, [open]);

  const toggle = async (userId: string, enabled: boolean) => {
    if (enabled) {
      await (supabase as any).from("plano_acoes_acesso").upsert({
        user_id: userId, habilitado: true, habilitado_por: user?.id, habilitado_em: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } else {
      await (supabase as any).from("plano_acoes_acesso").update({ habilitado: false }).eq("user_id", userId);
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, habilitado: enabled } : u));
  };

  const count = users.filter(u => u.habilitado).length;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Controle de Acesso — Plano de Ação</DialogTitle>
          <p className="text-xs text-muted-foreground">{count} de {users.length} usuários com acesso</p>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Carregando...</p>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {(u.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{u.full_name || "Sem nome"}</span>
                  </div>
                  <Switch checked={u.habilitado} onCheckedChange={v => toggle(u.id, v)} />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
