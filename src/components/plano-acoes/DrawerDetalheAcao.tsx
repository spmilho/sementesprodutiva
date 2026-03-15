import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Pencil, Send, ImagePlus, X, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useComentarios, useProfiles } from "@/hooks/usePlanoAcoes";
import type { Acao, StatusAcao } from "@/hooks/usePlanoAcoes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BadgePrioridade } from "./badges";
import { toast } from "@/hooks/use-toast";

interface Props {
  acao: Acao;
  onClose: () => void;
  onEditar: () => void;
  onRefetch: () => void;
  abaInicial?: "detalhes" | "comentarios";
}

interface UsuarioMencao {
  id: string;
  full_name: string | null;
}

function renderTextoComMencoes(texto: string) {
  const partes = texto.split(/(@[\w]+)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("@")) {
      return (
        <span key={i} className="text-primary font-semibold">
          {parte.replace(/_/g, " ")}
        </span>
      );
    }
    return <span key={i}>{parte}</span>;
  });
}

export function DrawerDetalheAcao({ acao, onClose, onEditar, onRefetch, abaInicial = "comentarios" }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const profiles = useProfiles();
  const { comentarios, refetch: refetchComentarios } = useComentarios(acao.id);

  // Comment form state
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [queryMencao, setQueryMencao] = useState("");
  const [posicaoCursor, setPosicaoCursor] = useState(0);
  const [mencoesSelecionadas, setMencoesSelecionadas] = useState<UsuarioMencao[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const usuariosFiltrados = profiles
    .filter(u => (u.full_name || "").toLowerCase().includes(queryMencao.toLowerCase()))
    .slice(0, 6);

  const changeStatus = async (s: StatusAcao) => {
    const update: any = { status: s };
    if (s === "concluida") update.concluida_em = new Date().toISOString();
    else update.concluida_em = null;
    await (supabase as any).from("plano_acoes").update(update).eq("id", acao.id);
    onRefetch();
    toast({ title: "Status atualizado" });
  };

  // Mention: detect @ while typing
  const handleTextoChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setTexto(val);
    setPosicaoCursor(cursor);

    const antes = val.substring(0, cursor);
    const match = antes.match(/@(\w*)$/);
    if (match) {
      setQueryMencao(match[1]);
      setDropdownAberto(true);
      setDropdownIndex(0);
    } else {
      setDropdownAberto(false);
      setQueryMencao("");
    }
  }, []);

  const inserirMencao = (usuario: UsuarioMencao) => {
    const nome = (usuario.full_name || "").replace(/\s+/g, "_");
    const antes = texto.substring(0, posicaoCursor).replace(/@\w*$/, `@${nome} `);
    const depois = texto.substring(posicaoCursor);
    setTexto(antes + depois);
    setDropdownAberto(false);
    setQueryMencao("");

    if (!mencoesSelecionadas.find(m => m.id === usuario.id)) {
      setMencoesSelecionadas(prev => [...prev, usuario]);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(antes.length, antes.length);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (dropdownAberto && usuariosFiltrados.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setDropdownIndex(i => Math.min(i + 1, usuariosFiltrados.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setDropdownIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); inserirMencao(usuariosFiltrados[dropdownIndex]); return; }
      if (e.key === "Escape") { setDropdownAberto(false); return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); enviarComentario(); }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const enviarComentario = async () => {
    if (!texto.trim() && !arquivo) return;
    setEnviando(true);

    try {
      const { data: comentario } = await (supabase as any)
        .from("plano_acoes_comentarios")
        .insert({ acao_id: acao.id, autor_id: user?.id, texto: texto.trim() || "(anexo)" })
        .select().single();

      // Save mentions
      if (mencoesSelecionadas.length > 0 && comentario) {
        await (supabase as any).from("plano_acoes_mencoes").insert(
          mencoesSelecionadas.map(u => ({ comentario_id: comentario.id, acao_id: acao.id, usuario_id: u.id }))
        );
      }

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

      // Notify mentions
      if (mencoesSelecionadas.length > 0) {
        supabase.functions.invoke("notificar-plano-acoes", {
          body: {
            tipo: "mencao",
            acao_id: acao.id,
            acao_what: acao.what,
            comentario_texto: texto.trim(),
            autor_nome: profiles.find(p => p.id === user?.id)?.full_name || "Usuário",
            mencionados: mencoesSelecionadas.map(u => ({ id: u.id, full_name: u.full_name })),
          },
        }).catch(() => {});
      }

      setTexto(""); setArquivo(null); setMencoesSelecionadas([]);
      refetchComentarios();
    } finally {
      setEnviando(false);
    }
  };

  const editarComentario = async (id: string) => {
    await (supabase as any).from("plano_acoes_comentarios").update({ texto: editTexto, editado_em: new Date().toISOString() }).eq("id", id);
    setEditandoId(null);
    refetchComentarios();
  };

  const excluirComentario = async (id: string) => {
    await (supabase as any).from("plano_acoes_comentarios").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    refetchComentarios();
  };

  return (
    <Sheet open onOpenChange={o => !o && onClose()}>
      <SheetContent className="sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base line-clamp-2 pr-2">{acao.what}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onEditar}><Pencil className="h-4 w-4" /></Button>
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

        <Tabs defaultValue={abaInicial} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 grid w-auto grid-cols-2">
            <TabsTrigger value="detalhes">📋 Detalhes</TabsTrigger>
            <TabsTrigger value="comentarios" className="flex items-center gap-1.5">
              💬 Comentários
              {comentarios.length > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[10px]">
                  {comentarios.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* DETALHES TAB */}
          <TabsContent value="detalhes" className="flex-1 overflow-auto mt-0">
            <ScrollArea className="h-full px-4">
              <div className="space-y-3 py-4">
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
                <div className="grid grid-cols-2 gap-3">
                  <Field label="IMPACTO" value={(acao as any).impacto === "alto" ? "↑ Alto" : (acao as any).impacto === "baixo" ? "↓ Baixo" : "~ Médio"} />
                  <Field label="ESFORÇO" value={(acao as any).esforco === "alto" ? "◆ Alto" : (acao as any).esforco === "baixo" ? "◆ Baixo" : "◆ Médio"} />
                </div>
                <Field label="COMO" value={acao.how} />
                {acao.how_much && <Field label="QUANTO CUSTA" value={acao.how_much} />}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* COMENTÁRIOS TAB */}
          <TabsContent value="comentarios" className="flex-1 flex flex-col overflow-hidden mt-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-4">
                {comentarios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum comentário ainda</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Seja o primeiro a comentar nesta ação</p>
                  </div>
                ) : (
                  comentarios.map(c => (
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
                          <p className="text-sm whitespace-pre-wrap">{renderTextoComMencoes(c.texto)}</p>
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
                              <button className="text-[10px] text-destructive hover:text-destructive/80" onClick={() => excluirComentario(c.id)}>Excluir</button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Comment input with @mention */}
            <div className="border-t p-3 space-y-2">
              {arquivo && (
                <div className="flex items-center gap-2 bg-muted rounded p-1.5 text-xs">
                  <span className="truncate flex-1">{arquivo.name}</span>
                  <button onClick={() => setArquivo(null)}><X className="h-3 w-3" /></button>
                </div>
              )}

              <div className="relative">
                {/* Mention dropdown */}
                {dropdownAberto && usuariosFiltrados.length > 0 && (
                  <div ref={dropdownRef} className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
                    <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1">Mencionar usuário</p>
                    {usuariosFiltrados.map((u, i) => (
                      <button
                        key={u.id}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-accent transition-colors ${i === dropdownIndex ? "bg-accent" : ""}`}
                        onMouseDown={e => { e.preventDefault(); inserirMencao(u); }}
                      >
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {(u.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{u.full_name || "Sem nome"}</span>
                      </button>
                    ))}
                    <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t">↑↓ navegar · Enter selecionar · Esc fechar</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Escrever comentário... (@para mencionar)"
                    value={texto}
                    onChange={handleTextoChange}
                    onKeyDown={handleKeyDown}
                    className="min-h-[40px] flex-1"
                  />
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" className="h-8 w-8" onClick={enviarComentario} disabled={enviando || (!texto.trim() && !arquivo)}>
                      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mention chips */}
              {mencoesSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {mencoesSelecionadas.map(u => (
                    <span key={u.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">
                      @{u.full_name}
                      <button onClick={() => setMencoesSelecionadas(prev => prev.filter(m => m.id !== u.id))} className="hover:text-destructive ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">Ctrl+Enter para enviar · @ para mencionar</p>
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => e.target.files?.[0] && setArquivo(e.target.files[0])} />
            </div>
          </TabsContent>
        </Tabs>
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
