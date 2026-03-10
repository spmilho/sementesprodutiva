import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/usePlanoAcoes";
import type { Acao, StatusAcao, PrioridadeAcao } from "@/hooks/usePlanoAcoes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  acao?: Acao | null;
}

const categorias = ["Qualidade", "Segurança", "Processo", "Manutenção", "RH", "Outro"];

export function ModalCriarEditar({ open, onClose, acao }: Props) {
  const { user } = useAuth();
  const profiles = useProfiles();
  const isEdit = !!acao;

  const [saving, setSaving] = useState(false);
  const [what, setWhat] = useState("");
  const [why, setWhy] = useState("");
  const [whereLocal, setWhereLocal] = useState("");
  const [whoResp, setWhoResp] = useState("");
  const [whenPrazo, setWhenPrazo] = useState<Date | undefined>();
  const [how, setHow] = useState("");
  const [howMuch, setHowMuch] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeAcao>("media");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState<StatusAcao>("aberta");
  const [impacto, setImpacto] = useState("medio");
  const [esforco, setEsforco] = useState("medio");

  useEffect(() => {
    if (acao) {
      setWhat(acao.what); setWhy(acao.why); setWhereLocal(acao.where_local);
      setWhoResp(acao.who_resp || ""); setWhenPrazo(new Date(acao.when_prazo + "T12:00:00"));
      setHow(acao.how); setHowMuch(acao.how_much || ""); setPrioridade(acao.prioridade);
      setCategoria(acao.categoria || ""); setStatus(acao.status);
      setImpacto((acao as any).impacto || "medio"); setEsforco((acao as any).esforco || "medio");
    } else {
      setWhat(""); setWhy(""); setWhereLocal(""); setWhoResp(""); setWhenPrazo(undefined);
      setHow(""); setHowMuch(""); setPrioridade("media"); setCategoria(""); setStatus("aberta");
      setImpacto("medio"); setEsforco("medio");
    }
  }, [acao, open]);

  const handleSave = async () => {
    if (!what.trim() || !why.trim() || !whereLocal.trim() || !how.trim() || !whenPrazo || !whoResp) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload: any = {
      what, why, where_local: whereLocal, who_resp: whoResp,
      when_prazo: format(whenPrazo, "yyyy-MM-dd"), how,
      how_much: howMuch || null, prioridade, categoria: categoria || null, status,
      impacto, esforco,
    };

    if (isEdit) {
      if (status === "concluida" && acao?.status !== "concluida") payload.concluida_em = new Date().toISOString();
      if (status !== "concluida") payload.concluida_em = null;
      await (supabase as any).from("plano_acoes").update(payload).eq("id", acao!.id);
      toast({ title: "Ação atualizada" });
    } else {
      payload.criado_por = user?.id;
      const { data: novaAcao, error } = await (supabase as any)
        .from("plano_acoes")
        .insert(payload)
        .select("*, responsavel:who_resp(full_name)")
        .single();

      if (error) {
        toast({ title: "Erro ao salvar ação", variant: "destructive" });
        setSaving(false);
        return;
      }

      toast({ title: "Ação criada" });

      // Get creator profile name for the notification
      const creatorProfile = profiles.find(p => p.id === user?.id);

      // Fire email notification for new action (non-blocking)
      supabase.functions.invoke("notificar-plano-acoes", {
        body: {
          tipo: "nova_acao",
          acao_what: payload.what,
          acao_why: payload.why,
          acao_where: payload.where_local,
          when_prazo: payload.when_prazo,
          prioridade: payload.prioridade,
          responsavel_nome: novaAcao?.responsavel?.full_name || null,
          criador_nome: creatorProfile?.full_name || "Usuário",
        },
      }).catch(() => {/* silent */});
    }
    setSaving(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Ação" : "Nova Ação (5W2H)"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>O QUÊ (What) *</Label>
            <Textarea placeholder="Descreva a ação a ser executada" value={what} onChange={e => setWhat(e.target.value)} />
          </div>
          <div>
            <Label>POR QUÊ (Why) *</Label>
            <Textarea placeholder="Causa raiz ou justificativa" value={why} onChange={e => setWhy(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ONDE (Where) *</Label>
              <Input placeholder="Setor, área, equipamento" value={whereLocal} onChange={e => setWhereLocal(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>QUEM (Who) *</Label>
            <Select value={whoResp} onValueChange={setWhoResp}>
              <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name || "Sem nome"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>QUANDO (When) *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !whenPrazo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {whenPrazo ? format(whenPrazo, "dd/MM/yyyy") : "Prazo"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={whenPrazo} onSelect={setWhenPrazo} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Prioridade *</Label>
              <Select value={prioridade} onValueChange={v => setPrioridade(v as PrioridadeAcao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="critica">🔴 Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>COMO (How) *</Label>
            <Textarea placeholder="Passos, método, plano de execução" value={how} onChange={e => setHow(e.target.value)} />
          </div>
          <div>
            <Label>QUANTO CUSTA (How Much)</Label>
            <Input placeholder="Custo estimado ou impacto financeiro" value={howMuch} onChange={e => setHowMuch(e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as StatusAcao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">📋 Aberta</SelectItem>
                  <SelectItem value="em_andamento">⚙️ Em andamento</SelectItem>
                  <SelectItem value="concluida">✅ Concluída</SelectItem>
                  <SelectItem value="cancelada">❌ Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Atualizar" : "Salvar Ação"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
