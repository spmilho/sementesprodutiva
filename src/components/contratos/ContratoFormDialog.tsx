import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateContrato, parseContratoPdf, uploadContratoPdf } from "@/hooks/useContratos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ContratoFormDialog({ open, onClose }: Props) {
  const { user } = useAuth();
  const createContrato = useCreateContrato();
  const [tipo, setTipo] = useState("producao_campo");
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [iaData, setIaData] = useState<any>(null);

  // Manual fields
  const [numero, setNumero] = useState("");
  const [contratante, setContratante] = useState("");
  const [contratado, setContratado] = useState("");
  const [hibrido, setHibrido] = useState("");
  const [safra, setSafra] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [areaHa, setAreaHa] = useState("");
  const [volumeSacos, setVolumeSacos] = useState("");
  const [precoPorHa, setPrecoPorHa] = useState("");
  const [precoPorSaco, setPrecoPorSaco] = useState("");
  const [valorTotal, setValorTotal] = useState("");

  const handleParseWithAi = async () => {
    if (!file) return;
    setParsing(true);
    try {
      const dados = await parseContratoPdf(file, tipo);
      setIaData(dados);
      // Auto-fill fields
      if (dados.titulo && !titulo) setTitulo(dados.titulo);
      if (dados.numero_contrato && !numero) setNumero(dados.numero_contrato);
      if (dados.contratante && !contratante) setContratante(dados.contratante);
      if (dados.contratado && !contratado) setContratado(dados.contratado);
      if (dados.hibrido && !hibrido) setHibrido(dados.hibrido);
      if (dados.safra && !safra) setSafra(dados.safra);
      if (dados.data_inicio && !dataInicio) setDataInicio(dados.data_inicio);
      if (dados.data_fim && !dataFim) setDataFim(dados.data_fim);
      if (dados.area_ha && !areaHa) setAreaHa(String(dados.area_ha));
      if (dados.volume_sacos && !volumeSacos) setVolumeSacos(String(dados.volume_sacos));
      if (dados.preco_por_ha && !precoPorHa) setPrecoPorHa(String(dados.preco_por_ha));
      if (dados.preco_por_saco && !precoPorSaco) setPrecoPorSaco(String(dados.preco_por_saco));
      if (dados.valor_total && !valorTotal) setValorTotal(String(dados.valor_total));
      if (dados.tipo) setTipo(dados.tipo);
      toast.success("Dados extraídos pela IA com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao analisar: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) { toast.error("Título é obrigatório"); return; }
    setUploading(true);
    try {
      let arquivoUrl = "";
      if (file) {
        const { data: profile } = await (supabase as any).from("profiles").select("org_id").eq("id", user!.id).single();
        arquivoUrl = await uploadContratoPdf(file, profile.org_id);
      }
      await createContrato.mutateAsync({
        tipo,
        titulo,
        numero_contrato: numero || null,
        contratante: contratante || null,
        contratado: contratado || null,
        hibrido: hibrido || null,
        safra: safra || null,
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        area_ha: areaHa ? Number(areaHa) : null,
        volume_sacos: volumeSacos ? Number(volumeSacos) : null,
        preco_por_ha: precoPorHa ? Number(precoPorHa) : null,
        preco_por_saco: precoPorSaco ? Number(precoPorSaco) : null,
        valor_total: valorTotal ? Number(valorTotal) : null,
        arquivo_url: arquivoUrl || null,
        arquivo_nome: file?.name || null,
        dados_ia: iaData || {},
      });
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const isProducao = tipo === "producao_campo";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload + AI */}
          <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
            <Label>PDF do Contrato</Label>
            <Input type="file" accept=".pdf,.txt,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && (
              <Button variant="outline" size="sm" onClick={handleParseWithAi} disabled={parsing}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {parsing ? "Analisando com IA..." : "Analisar com IA"}
              </Button>
            )}
          </div>

          {/* Type */}
          <div>
            <Label>Tipo de Contrato</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="producao_campo">Produção de Campo</SelectItem>
                <SelectItem value="beneficiamento">Beneficiamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Contrato Safra 25/26" />
            </div>
            <div>
              <Label>Nº Contrato</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div>
              <Label>Contratante</Label>
              <Input value={contratante} onChange={(e) => setContratante(e.target.value)} />
            </div>
            <div>
              <Label>Contratado</Label>
              <Input value={contratado} onChange={(e) => setContratado(e.target.value)} />
            </div>
            <div>
              <Label>Híbrido</Label>
              <Input value={hibrido} onChange={(e) => setHibrido(e.target.value)} />
            </div>
            <div>
              <Label>Safra</Label>
              <Input value={safra} onChange={(e) => setSafra(e.target.value)} placeholder="2025/2026" />
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>

          {/* Conditional fields */}
          <div className="grid grid-cols-2 gap-3">
            {isProducao ? (
              <>
                <div>
                  <Label>Área (ha)</Label>
                  <Input type="number" value={areaHa} onChange={(e) => setAreaHa(e.target.value)} />
                </div>
                <div>
                  <Label>Preço por Hectare (R$)</Label>
                  <Input type="number" value={precoPorHa} onChange={(e) => setPrecoPorHa(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Volume (sacos)</Label>
                  <Input type="number" value={volumeSacos} onChange={(e) => setVolumeSacos(e.target.value)} />
                </div>
                <div>
                  <Label>Preço por Saco (R$)</Label>
                  <Input type="number" value={precoPorSaco} onChange={(e) => setPrecoPorSaco(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <Label>Valor Total (R$)</Label>
              <Input type="number" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={uploading || !titulo.trim()} className="w-full">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Salvando..." : "Criar Contrato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
