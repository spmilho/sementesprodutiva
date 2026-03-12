import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAditivo, parseContratoPdf, uploadContratoPdf, Contrato } from "@/hooks/useContratos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  contrato: Contrato;
  nextNumber: number;
}

export default function AditivoFormDialog({ open, onClose, contrato, nextNumber }: Props) {
  const { user } = useAuth();
  const createAditivo = useCreateAditivo();
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [dataAditivo, setDataAditivo] = useState("");
  const [novoPrecoHa, setNovoPrecoHa] = useState("");
  const [novoPrecoSaco, setNovoPrecoSaco] = useState("");
  const [novoVolume, setNovoVolume] = useState("");
  const [novaArea, setNovaArea] = useState("");
  const [novoValorTotal, setNovoValorTotal] = useState("");
  const [novaDataFim, setNovaDataFim] = useState("");
  const [iaData, setIaData] = useState<any>(null);

  const handleParseAi = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const dados = await parseContratoPdf(file, contrato.tipo);
      setIaData(dados);
      if (dados.preco_por_ha && !novoPrecoHa) setNovoPrecoHa(String(dados.preco_por_ha));
      if (dados.preco_por_saco && !novoPrecoSaco) setNovoPrecoSaco(String(dados.preco_por_saco));
      if (dados.volume_sacos && !novoVolume) setNovoVolume(String(dados.volume_sacos));
      if (dados.area_ha && !novaArea) setNovaArea(String(dados.area_ha));
      if (dados.valor_total && !novoValorTotal) setNovoValorTotal(String(dados.valor_total));
      if (dados.data_fim && !novaDataFim) setNovaDataFim(dados.data_fim);
      toast.success("Dados do aditivo extraídos!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      let arquivoUrl = null;
      if (file) {
        const { data: profile } = await (supabase as any).from("profiles").select("org_id").eq("id", user!.id).single();
        arquivoUrl = await uploadContratoPdf(file, profile.org_id);
      }

      await createAditivo.mutateAsync({
        contrato_id: contrato.id,
        numero_aditivo: nextNumber,
        data_aditivo: dataAditivo || null,
        descricao: descricao || null,
        arquivo_url: arquivoUrl,
        arquivo_nome: file?.name || null,
        dados_ia: iaData || {},
        novo_preco_por_ha: novoPrecoHa ? Number(novoPrecoHa) : null,
        novo_preco_por_saco: novoPrecoSaco ? Number(novoPrecoSaco) : null,
        novo_volume_sacos: novoVolume ? Number(novoVolume) : null,
        nova_area_ha: novaArea ? Number(novaArea) : null,
        novo_valor_total: novoValorTotal ? Number(novoValorTotal) : null,
        nova_data_fim: novaDataFim || null,
      });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const isProducao = contrato.tipo === "producao_campo";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aditivo #{nextNumber} — {contrato.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-3 space-y-2">
            <Label>PDF do Aditivo</Label>
            <Input type="file" accept=".pdf,.txt,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && (
              <Button variant="outline" size="sm" onClick={handleParseAi} disabled={parsing}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {parsing ? "Analisando..." : "Extrair dados"}
              </Button>
            )}
          </div>

          <div>
            <Label>Data do Aditivo</Label>
            <Input type="date" value={dataAditivo} onChange={(e) => setDataAditivo(e.target.value)} />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva as alterações..." />
          </div>

          <p className="text-xs text-muted-foreground">Preencha apenas os campos que o aditivo altera:</p>

          <div className="grid grid-cols-2 gap-3">
            {isProducao ? (
              <>
                <div>
                  <Label>Novo Preço/ha (R$)</Label>
                  <Input type="number" value={novoPrecoHa} onChange={(e) => setNovoPrecoHa(e.target.value)} />
                </div>
                <div>
                  <Label>Nova Área (ha)</Label>
                  <Input type="number" value={novaArea} onChange={(e) => setNovaArea(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Novo Preço/saco (R$)</Label>
                  <Input type="number" value={novoPrecoSaco} onChange={(e) => setNovoPrecoSaco(e.target.value)} />
                </div>
                <div>
                  <Label>Novo Volume (sacos)</Label>
                  <Input type="number" value={novoVolume} onChange={(e) => setNovoVolume(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <Label>Novo Valor Total (R$)</Label>
              <Input type="number" value={novoValorTotal} onChange={(e) => setNovoValorTotal(e.target.value)} />
            </div>
            <div>
              <Label>Nova Data Fim</Label>
              <Input type="date" value={novaDataFim} onChange={(e) => setNovaDataFim(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? "Salvando..." : "Adicionar Aditivo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
