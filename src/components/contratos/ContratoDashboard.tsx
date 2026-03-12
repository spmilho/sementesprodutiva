import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Contrato, ContratoAditivo } from "@/hooks/useContratos";
import { differenceInDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, MapPin, Package, DollarSign, Calendar, AlertTriangle, FileText } from "lucide-react";

interface Props {
  contrato: Contrato;
  aditivos: ContratoAditivo[];
}

function getEffectiveValues(contrato: Contrato, aditivos: ContratoAditivo[]) {
  let preco_por_ha = contrato.preco_por_ha;
  let preco_por_saco = contrato.preco_por_saco;
  let volume_sacos = contrato.volume_sacos;
  let area_ha = contrato.area_ha;
  let valor_total = contrato.valor_total;
  let data_fim = contrato.data_fim;

  // Apply addendums in order
  for (const a of aditivos) {
    if (a.novo_preco_por_ha != null) preco_por_ha = a.novo_preco_por_ha;
    if (a.novo_preco_por_saco != null) preco_por_saco = a.novo_preco_por_saco;
    if (a.novo_volume_sacos != null) volume_sacos = a.novo_volume_sacos;
    if (a.nova_area_ha != null) area_ha = a.nova_area_ha;
    if (a.novo_valor_total != null) valor_total = a.novo_valor_total;
    if (a.nova_data_fim != null) data_fim = a.nova_data_fim;
  }

  return { preco_por_ha, preco_por_saco, volume_sacos, area_ha, valor_total, data_fim };
}

function formatCurrency(val: number | null) {
  if (val == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

export default function ContratoDashboard({ contrato, aditivos }: Props) {
  const eff = getEffectiveValues(contrato, aditivos);
  const now = new Date();
  const dataFim = eff.data_fim ? parseISO(eff.data_fim) : null;
  const diasRestantes = dataFim ? differenceInDays(dataFim, now) : null;
  const isProducao = contrato.tipo === "producao_campo";

  const urgencyColor =
    diasRestantes == null ? "bg-muted text-muted-foreground" :
    diasRestantes < 0 ? "bg-destructive text-destructive-foreground" :
    diasRestantes <= 30 ? "bg-orange-500 text-white" :
    diasRestantes <= 90 ? "bg-accent text-accent-foreground" :
    "bg-primary text-primary-foreground";

  return (
    <div className="space-y-4">
      {/* Countdown */}
      <Card className={`${urgencyColor} border-0`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8" />
            <div>
              <p className="text-sm font-medium opacity-80">Prazo do contrato</p>
              <p className="text-3xl font-bold">
                {diasRestantes == null ? "Sem data" :
                 diasRestantes < 0 ? `Vencido há ${Math.abs(diasRestantes)} dias` :
                 `${diasRestantes} dias restantes`}
              </p>
            </div>
          </div>
          {dataFim && (
            <div className="text-right">
              <p className="text-sm opacity-80">Vencimento</p>
              <p className="text-lg font-semibold">{format(dataFim, "dd/MM/yyyy")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isProducao ? (
          <>
            <KpiCard icon={<MapPin className="h-4 w-4" />} label="Área" value={eff.area_ha ? `${eff.area_ha.toLocaleString("pt-BR")} ha` : "—"} />
            <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Preço/ha" value={formatCurrency(eff.preco_por_ha)} />
          </>
        ) : (
          <>
            <KpiCard icon={<Package className="h-4 w-4" />} label="Volume" value={eff.volume_sacos ? `${eff.volume_sacos.toLocaleString("pt-BR")} sc` : "—"} />
            <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Preço/saco" value={formatCurrency(eff.preco_por_saco)} />
          </>
        )}
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Valor Total" value={formatCurrency(eff.valor_total)} />
        <KpiCard icon={<Calendar className="h-4 w-4" />} label="Safra" value={contrato.safra || "—"} />
      </div>

      {/* Info */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhes do Contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Tipo" value={isProducao ? "Produção de Campo" : "Beneficiamento"} />
            <Info label="Nº Contrato" value={contrato.numero_contrato} />
            <Info label="Contratante" value={contrato.contratante} />
            <Info label="Contratado" value={contrato.contratado} />
            <Info label="Híbrido" value={contrato.hibrido} />
            {contrato.data_inicio && <Info label="Início" value={format(parseISO(contrato.data_inicio), "dd/MM/yyyy")} />}
          </CardContent>
        </Card>

        {/* IA extracted data */}
        {contrato.dados_ia && Object.keys(contrato.dados_ia).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Dados Extraídos pela IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {contrato.dados_ia.condicoes_pagamento && <Info label="Pagamento" value={contrato.dados_ia.condicoes_pagamento} />}
              {contrato.dados_ia.penalidades && <Info label="Penalidades" value={contrato.dados_ia.penalidades} />}
              {contrato.dados_ia.clausulas_importantes?.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Cláusulas Importantes</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    {contrato.dados_ia.clausulas_importantes.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Aditivos */}
      {aditivos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" /> Aditivos Contratuais ({aditivos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aditivos.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Aditivo #{a.numero_aditivo}</Badge>
                    {a.data_aditivo && <span className="text-xs text-muted-foreground">{format(parseISO(a.data_aditivo), "dd/MM/yyyy")}</span>}
                  </div>
                  {a.descricao && <p className="text-xs">{a.descricao}</p>}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {a.novo_preco_por_ha != null && <Badge variant="secondary">Preço/ha: {formatCurrency(a.novo_preco_por_ha)}</Badge>}
                    {a.novo_preco_por_saco != null && <Badge variant="secondary">Preço/sc: {formatCurrency(a.novo_preco_por_saco)}</Badge>}
                    {a.nova_area_ha != null && <Badge variant="secondary">Área: {a.nova_area_ha} ha</Badge>}
                    {a.novo_volume_sacos != null && <Badge variant="secondary">Volume: {a.novo_volume_sacos} sc</Badge>}
                    {a.novo_valor_total != null && <Badge variant="secondary">Total: {formatCurrency(a.novo_valor_total)}</Badge>}
                    {a.nova_data_fim != null && <Badge variant="secondary">Nova validade: {format(parseISO(a.nova_data_fim), "dd/MM/yyyy")}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
