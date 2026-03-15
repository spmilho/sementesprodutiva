import { format } from "date-fns";
import { MoreVertical, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BadgePrioridade, BadgeStatus } from "./badges";
import type { Acao, StatusAcao } from "@/hooks/usePlanoAcoes";
import { useState } from "react";

interface Props {
  acoes: Acao[];
  onSelecionar: (a: Acao) => void;
  onEditar: (a: Acao) => void;
  onRefetch: () => void;
}

export function TabelaAcoes({ acoes, onSelecionar, onEditar, onRefetch }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...acoes].sort((a, b) => {
    const now = new Date();
    const aVencida = ["aberta", "em_andamento"].includes(a.status) && new Date(a.when_prazo) < now;
    const bVencida = ["aberta", "em_andamento"].includes(b.status) && new Date(b.when_prazo) < now;
    if (aVencida && !bVencida) return -1;
    if (!aVencida && bVencida) return 1;
    return new Date(a.when_prazo).getTime() - new Date(b.when_prazo).getTime();
  });

  const changeStatus = async (id: string, status: StatusAcao) => {
    const update: any = { status };
    if (status === "concluida") update.concluida_em = new Date().toISOString();
    else update.concluida_em = null;
    await (supabase as any).from("plano_acoes").update(update).eq("id", id);
    onRefetch();
    toast({ title: "Status atualizado" });
  };

  const toggleOcultar = async (a: Acao) => {
    await (supabase as any).from("plano_acoes").update({ ocultar_concluida: !a.ocultar_concluida }).eq("id", a.id);
    onRefetch();
  };

  const excluir = async (id: string) => {
    setDeletingId(null);
    await (supabase as any).from("plano_acoes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    onRefetch();
    toast({ title: "Ação excluída" });
  };

  const isVencida = (a: Acao) => ["aberta", "em_andamento"].includes(a.status) && new Date(a.when_prazo) < new Date();
  const canDelete = (a: Acao) => (isAdmin || a.criado_por === user?.id) && ["aberta", "cancelada"].includes(a.status);

  if (!acoes.length) return <p className="text-center text-muted-foreground py-8">Nenhuma ação encontrada.</p>;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Prioridade</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead className="w-[140px]">Responsável</TableHead>
            <TableHead className="w-[110px]">Prazo</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(a => (
            <TableRow
              key={a.id}
              className={`cursor-pointer ${a.status === "concluida" ? "opacity-60" : ""}`}
              onClick={() => onSelecionar(a)}
            >
              <TableCell><BadgePrioridade p={a.prioridade} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={a.status === "concluida" ? "line-through" : ""}>{a.what}</span>
                  {a.categoria && <span className="text-xs text-muted-foreground">· {a.categoria}</span>}
                  {(a as any).impacto && (a as any).impacto !== "medio" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(a as any).impacto === "alto" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {(a as any).impacto === "alto" ? "↑ Impacto" : "↓ Impacto"}
                    </span>
                  )}
                  {(a as any).esforco && (a as any).esforco !== "medio" && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${(a as any).esforco === "baixo" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                      {(a as any).esforco === "baixo" ? "◆ Fácil" : "◆ Difícil"}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{a.responsavel?.full_name || "—"}</TableCell>
              <TableCell className={`text-sm ${isVencida(a) ? "text-red-600 font-semibold" : ""}`}>
                {format(new Date(a.when_prazo + "T12:00:00"), "dd/MM/yyyy")}
              </TableCell>
              <TableCell><BadgeStatus s={a.status} /></TableCell>
              <TableCell onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelecionar(a)}>
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Ver detalhes e comentários
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditar(a)}>Editar</DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>Mudar status</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {(["aberta", "em_andamento", "concluida", "cancelada"] as StatusAcao[]).map(s => (
                          <DropdownMenuItem key={s} onClick={() => changeStatus(a.id, s)}>
                            {s === "aberta" ? "📋 Aberta" : s === "em_andamento" ? "⚙️ Em andamento" : s === "concluida" ? "✅ Concluída" : "❌ Cancelada"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {a.status === "concluida" && (
                      <DropdownMenuItem onClick={() => toggleOcultar(a)}>
                        {a.ocultar_concluida ? "Mostrar concluída" : "Ocultar concluída"}
                      </DropdownMenuItem>
                    )}
                    {canDelete(a) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => setDeletingId(a.id)}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialog open={deletingId === a.id} onOpenChange={o => !o && setDeletingId(null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
                      <AlertDialogDescription>"{a.what}" será excluída permanentemente.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => excluir(a.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
