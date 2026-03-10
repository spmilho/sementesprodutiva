import { useState, useRef } from "react";
import { format } from "date-fns";
import { Pencil, Send, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useComentarios } from "@/hooks/usePlanoAcoes";
import type { Acao, StatusAcao } from "@/hooks/usePlanoAcoes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BadgePrioridade, BadgeStatus } from "./badges";
import { toast } from "@/hooks/use-toast";

interface Props {
  acao: Acao;
  onClose: () => void;
  onEditar: () => void;
  onRefetch: () => void;
}

export function DrawerDetalheAcao({ acao, onClose, onEditar, onRefetch }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { comentarios, refetch: refetchComentarios } = useComentarios(acao.id);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const changeStatus = async (s: StatusAcao) => {
    const update: any = { status: s };
    if (s === "concluida") update.concluida_em = new Date().toISOString();
    else update.concluida_em = null;
    await (supabase as any).from("plano_acoes").update(update).eq("id", acao.id);
    onRefetch();
    toast({ title: "Status atualizado" });
  };

  const enviarComentario = async () => {
    if (!texto.trim() && !arquivo) return;
    setEnviando(true);

    const { data: comentario } = await (supabase as any)
      .from("plano_acoes_comentarios")
      .insert({ acao_id: acao.id, autor_id: user?.id, texto: texto.trim() || "(anexo)" })
      .select().single();

    if (arquivo && comentario) {
      const path = `${acao.id}/${Date.now()}_${arquivo.name}`;
      const { data: upload } = await supabase.storage.from("plano-acoes-anexos").upload(path, arquivo);
      if (upload) {
        const { data: urlData } = supabase.storage.from("plano-acoes-anexos").getPublicUrl(upload.path);
        await (supabase as any).from("plano_acoes_anexos").insert({
          acao_id: acao.id, comentario_id: comentario.id, enviado_por: user?.id,
          nome_arquivo: arquivo.name, url: urlData.publicUrl,
          tipo_mime: arquivo.type, tamanho_bytes: arquivo.size,
        });
      }
    }

    setTexto(""); setArquivo(null); setEnviando(false);
    refetchComentarios();
  };

  const editarComentario = async (id: string) => {
    await (supabase as any).from("plano_acoes_comentarios").update({ texto: editTexto, editado_em: new Date().toISOString() }).eq("id", id);
    setEditandoId(null);
    refetchComentarios();
  };

  const excluirComentario = async (id: string) => {
    await (supabase as any).from("plano_acoes_comentarios").delete().eq("id", id);
    refetchComentarios();
  };

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Detalhe da Ação</SheetTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onEditar}><Pencil className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <BadgePrioridade p={acao.prioridade} />
            <Select value={acao.status} onValueChange={v => changeStatus(v as StatusAcao)}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aberta">📋 Aberta</SelectItem>
                <SelectItem value="em_andamento">⚙️ Em andamento</SelectItem>
                <SelectItem value="concluida">✅ Concluída</SelectItem>
                <SelectItem value="cancelada">❌ Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 pb-4">
            <Field label="O QUÊ" value={acao.what} />
            <Field label="POR QUÊ" value={acao.why} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ONDE" value={acao.where_local} />
              <Field label="QUEM" value={acao.responsavel?.full_name || "—"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="QUANDO" value={format(new Date(acao.when_prazo + "T12:00:00"), "dd/MM/yyyy")} />
              <Field label="CATEGORIA" value={acao.categoria || "—"} />
            </div>
            <Field label="COMO" value={acao.how} />
            {acao.how_much && <Field label="QUANTO CUSTA" value={acao.how_much} />}

            <Separator className="my-3" />

            <p className="text-sm font-semibold">Comentários ({comentarios.length})</p>

            {comentarios.map(c => (
              <div key={c.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{c.autor?.full_name || "Usuário"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(c.criado_em), "dd/MM HH:mm")}
                    {c.editado_em && " (editado)"}
                  </span>
                </div>
                {editandoId === c.id ? (
                  <div className="space-y-1">
                    <Textarea value={editTexto} onChange={e => setEditTexto(e.target.value)} className="min-h-[60px]" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => editarComentario(c.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
                    {c.anexos?.map(a => (
                      <div key={a.id}>
                        {a.tipo_mime?.startsWith("image/") ? (
                          <img src={a.url} alt={a.nome_arquivo} className="rounded-md max-h-48 mt-1" />
                        ) : (
                          <a href={a.url} target="_blank" rel="noopener" className="text-xs text-primary underline">{a.nome_arquivo}</a>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      {c.autor_id === user?.id && (
                        <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => { setEditandoId(c.id); setEditTexto(c.texto); }}>Editar</button>
                      )}
                      {(isAdmin || c.autor_id === user?.id) && (
                        <button className="text-[10px] text-red-500 hover:text-red-700" onClick={() => excluirComentario(c.id)}>Excluir</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3 space-y-2">
          {arquivo && (
            <div className="flex items-center gap-2 bg-muted rounded p-1.5 text-xs">
              <span className="truncate flex-1">{arquivo.name}</span>
              <button onClick={() => setArquivo(null)}><X className="h-3 w-3" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea placeholder="Escrever comentário..." value={texto} onChange={e => setTexto(e.target.value)} className="min-h-[40px] flex-1" />
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button size="icon" className="h-8 w-8" onClick={enviarComentario} disabled={enviando || (!texto.trim() && !arquivo)}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && setArquivo(e.target.files[0])} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}
