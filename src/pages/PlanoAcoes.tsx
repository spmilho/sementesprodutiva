import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Settings, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardAcoes } from "@/components/plano-acoes/DashboardAcoes";
import { FiltrosAcoes, type FiltrosState } from "@/components/plano-acoes/FiltrosAcoes";
import { TabelaAcoes } from "@/components/plano-acoes/TabelaAcoes";
import { ModalCriarEditar } from "@/components/plano-acoes/ModalCriarEditar";
import { ControlAcessoModal } from "@/components/plano-acoes/ControlAcessoModal";
import { DrawerDetalheAcao } from "@/components/plano-acoes/DrawerDetalheAcao";
import { usePlanoAcoes, usePlanoAcoesAccess, useProfiles, type Acao } from "@/hooks/usePlanoAcoes";
import { useRole } from "@/hooks/useRole";

export default function PlanoAcoes() {
  const { isAdmin } = useRole();
  const { hasAccess, loading: accessLoading } = usePlanoAcoesAccess();
  const profiles = useProfiles();

  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [controlAcessoAberto, setControlAcessoAberto] = useState(false);
  const [acaoEditando, setAcaoEditando] = useState<Acao | null>(null);
  const [acaoSelecionada, setAcaoSelecionada] = useState<Acao | null>(null);
  const [filtros, setFiltros] = useState<FiltrosState>({
    status: "todos", prioridade: "todos", responsavel: "todos", categoria: "todos", busca: "",
  });

  const { acoes, loading, refetch } = usePlanoAcoes(mostrarConcluidas);

  const acoesFiltradas = acoes.filter(a => {
    if (filtros.status !== "todos" && a.status !== filtros.status) return false;
    if (filtros.prioridade !== "todos" && a.prioridade !== filtros.prioridade) return false;
    if (filtros.responsavel !== "todos" && a.who_resp !== filtros.responsavel) return false;
    if (filtros.categoria !== "todos" && a.categoria !== filtros.categoria) return false;
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      return [a.what, a.why, a.where_local, a.how].some(f => f.toLowerCase().includes(q));
    }
    return true;
  });

  const handleEditar = (acao: Acao) => { setAcaoEditando(acao); setModalAberto(true); };
  const handleFecharModal = () => { setModalAberto(false); setAcaoEditando(null); refetch(); };

  if (accessLoading) return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Carregando...</div>;

  if (!hasAccess) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
      <ShieldAlert className="h-12 w-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Sem permissão</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Você não tem acesso ao módulo Plano de Ação. Solicite ao administrador para habilitar seu acesso.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Plano de Ação</h1>
          <p className="text-xs text-muted-foreground">Metodologia 5W2H</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {mostrarConcluidas ? <Eye className="h-3.5 w-3.5 text-muted-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Switch checked={mostrarConcluidas} onCheckedChange={setMostrarConcluidas} />
            <Label className="text-xs cursor-pointer" onClick={() => setMostrarConcluidas(!mostrarConcluidas)}>Concluídas</Label>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setControlAcessoAberto(true)}>
              <Settings className="h-3.5 w-3.5 mr-1" /> Acesso
            </Button>
          )}
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova Ação
          </Button>
        </div>
      </div>

      <DashboardAcoes acoes={acoes} />
      <FiltrosAcoes filtros={filtros} onChange={setFiltros} responsaveis={profiles} />

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando ações...</p>
      ) : (
        <TabelaAcoes acoes={acoesFiltradas} onSelecionar={setAcaoSelecionada} onEditar={handleEditar} onRefetch={refetch} />
      )}

      <ModalCriarEditar open={modalAberto} onClose={handleFecharModal} acao={acaoEditando} />

      {acaoSelecionada && (
        <DrawerDetalheAcao
          acao={acaoSelecionada}
          onClose={() => setAcaoSelecionada(null)}
          onEditar={() => handleEditar(acaoSelecionada)}
          onRefetch={() => { refetch(); }}
        />
      )}

      {isAdmin && <ControlAcessoModal open={controlAcessoAberto} onClose={() => setControlAcessoAberto(false)} />}
    </div>
  );
}
