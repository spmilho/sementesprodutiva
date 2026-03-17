import { useState, useRef } from "react";
import { useContratos, useContratoAditivos, useDeleteContrato, useContratoAccess, useUpdateContrato, parseContratoPdf } from "@/hooks/useContratos";
import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, FileText, ChevronRight, FilePlus, RefreshCw, Loader2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import ContratoDashboard from "@/components/contratos/ContratoDashboard";
import ContratoFormDialog from "@/components/contratos/ContratoFormDialog";
import AditivoFormDialog from "@/components/contratos/AditivoFormDialog";

export default function Contratos() {
  const { loading: roleLoading } = useRole();
  const { canView, canInsert, canDelete } = useContratoAccess();
  const { data: contratos = [], isLoading } = useContratos();
  const deleteContrato = useDeleteContrato();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAditivo, setShowAditivo] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = contratos.find(c => c.id === selectedId);

  if (roleLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!canView) return <Navigate to="/" replace />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-sm text-muted-foreground">Repositório de contratos de produção e beneficiamento</p>
        </div>
        {canInsert && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Contrato
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando contratos...</p>
      ) : contratos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contrato cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Contract list */}
          <div className="lg:col-span-1 space-y-2">
            {contratos.map(c => {
              const dataFim = c.data_fim ? parseISO(c.data_fim) : null;
              const dias = dataFim ? differenceInDays(dataFim, new Date()) : null;
              const isSelected = selectedId === c.id;

              return (
                <Card
                  key={c.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${isSelected ? "border-primary ring-1 ring-primary/20" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {c.tipo === "producao_campo" ? "Campo" : "Benefic."}
                          </Badge>
                          {c.safra && <span className="text-[10px] text-muted-foreground">{c.safra}</span>}
                        </div>
                        {dias != null && (
                          <p className={`text-[10px] mt-1 ${dias < 0 ? "text-destructive" : dias <= 30 ? "text-orange-500" : "text-muted-foreground"}`}>
                            {dias < 0 ? `Vencido há ${Math.abs(dias)}d` : `${dias}d restantes`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canDelete && (
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Dashboard */}
          <div className="lg:col-span-2">
            {selected ? (
              <SelectedContratoDashboard
                contrato={selected}
                canInsert={canInsert}
                onAddAditivo={() => setShowAditivo(true)}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um contrato para ver o dashboard
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {showForm && <ContratoFormDialog open onClose={() => setShowForm(false)} />}
      {showAditivo && selected && (
        <AditivoFormDialogWrapper contrato={selected} onClose={() => setShowAditivo(false)} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteContrato.mutate(deleteId!); setDeleteId(null); if (selectedId === deleteId) setSelectedId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SelectedContratoDashboard({ contrato, canInsert, onAddAditivo }: { contrato: any; canInsert: boolean; onAddAditivo: () => void }) {
  const { data: aditivos = [] } = useContratoAditivos(contrato.id);
  const updateContrato = useUpdateContrato();
  const [reanalyzing, setReanalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReanalyze = async (file: File) => {
    setReanalyzing(true);
    try {
      const dados = await parseContratoPdf(file, contrato.tipo);
      await updateContrato.mutateAsync({
        id: contrato.id,
        dados_ia: dados,
        ...(dados.titulo && { titulo: dados.titulo }),
        ...(dados.numero_contrato && { numero_contrato: dados.numero_contrato }),
        ...(dados.contratante && { contratante: dados.contratante }),
        ...(dados.contratado && { contratado: dados.contratado }),
        ...(dados.hibrido && { hibrido: dados.hibrido }),
        ...(dados.safra && { safra: dados.safra }),
        ...(dados.data_inicio && { data_inicio: dados.data_inicio }),
        ...(dados.data_fim && { data_fim: dados.data_fim }),
        ...(dados.area_ha && { area_ha: dados.area_ha }),
        ...(dados.volume_sacos && { volume_sacos: dados.volume_sacos }),
        ...(dados.preco_por_ha && { preco_por_ha: dados.preco_por_ha }),
        ...(dados.preco_por_saco && { preco_por_saco: dados.preco_por_saco }),
        ...(dados.valor_total && { valor_total: dados.valor_total }),
      });
      toast.success("Contrato re-analisado com sucesso!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{contrato.titulo}</h2>
        <div className="flex items-center gap-2">
          {canInsert && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleReanalyze(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={reanalyzing}
              >
                {reanalyzing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                {reanalyzing ? "Analisando..." : "Re-analisar PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={onAddAditivo}>
                <FilePlus className="h-4 w-4 mr-1" /> Aditivo
              </Button>
            </>
          )}
        </div>
      </div>
      <ContratoDashboard contrato={contrato} aditivos={aditivos} />
    </div>
  );
}

function AditivoFormDialogWrapper({ contrato, onClose }: { contrato: any; onClose: () => void }) {
  const { data: aditivos = [] } = useContratoAditivos(contrato.id);
  const nextNumber = aditivos.length + 1;

  return (
    <AditivoFormDialog
      open
      onClose={onClose}
      contrato={contrato}
      nextNumber={nextNumber}
    />
  );
}
