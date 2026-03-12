import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface UserAccess {
  id: string;
  full_name: string | null;
  pode_visualizar: boolean;
  pode_inserir: boolean;
  pode_deletar: boolean;
}

export default function ContratoAcessoModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await (supabase as any).rpc("get_all_profiles");
    const { data: acessos } = await (supabase as any).from("contrato_acesso").select("*");

    const acessoMap = new Map((acessos || []).map((a: any) => [a.user_id, a]));
    const list = (profiles || [])
      .filter((p: any) => p.id !== user?.id)
      .map((p: any) => {
        const acc: any = acessoMap.get(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          pode_visualizar: acc?.pode_visualizar ?? false,
          pode_inserir: acc?.pode_inserir ?? false,
          pode_deletar: acc?.pode_deletar ?? false,
        };
      });
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { if (open) fetchUsers(); }, [open]);

  const update = async (userId: string, field: string, value: boolean) => {
    const current = users.find(u => u.id === userId)!;
    const updated = { ...current, [field]: value };

    // If disabling view, disable all
    if (field === "pode_visualizar" && !value) {
      updated.pode_inserir = false;
      updated.pode_deletar = false;
    }

    await (supabase as any).from("contrato_acesso").upsert({
      user_id: userId,
      pode_visualizar: updated.pode_visualizar,
      pode_inserir: updated.pode_inserir,
      pode_deletar: updated.pode_deletar,
      habilitado_por: user?.id,
      habilitado_em: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setUsers(prev => prev.map(u => u.id === userId ? updated : u));
  };

  const countView = users.filter(u => u.pode_visualizar).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Controle de Acesso — Contratos</DialogTitle>
          <p className="text-xs text-muted-foreground">{countView} de {users.length} usuários com acesso</p>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Carregando...</p>
          ) : (
            <div className="space-y-4">
              {users.map(u => (
                <div key={u.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {(u.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{u.full_name || "Sem nome"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={u.pode_visualizar} onCheckedChange={v => update(u.id, "pode_visualizar", v)} />
                      <Label className="text-xs">Visualizar</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={u.pode_inserir} disabled={!u.pode_visualizar} onCheckedChange={v => update(u.id, "pode_inserir", v)} />
                      <Label className="text-xs">Inserir</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={u.pode_deletar} disabled={!u.pode_visualizar} onCheckedChange={v => update(u.id, "pode_deletar", v)} />
                      <Label className="text-xs">Deletar</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
