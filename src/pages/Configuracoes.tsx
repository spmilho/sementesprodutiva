import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Layers, FileText, Download, WifiOff, FileSignature, Database, Trash2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { Navigate } from "react-router-dom";
import OrganizationTab from "@/components/settings/OrganizationTab";
import UsersTab from "@/components/settings/UsersTab";
import CycleTeamTab from "@/components/settings/CycleTeamTab";
import ReportSettingsTab from "@/components/settings/ReportSettingsTab";
import ExportDataTab from "@/components/settings/ExportDataTab";
import CooperadosTab from "@/components/settings/CooperadosTab";
import ClientsTab from "@/components/settings/ClientsTab";
import OfflineQueueTab from "@/components/settings/OfflineQueueTab";
import BackupTab from "@/components/settings/BackupTab";
import TrashTab from "@/components/settings/TrashTab";
import { useState } from "react";
import ContratoAcessoModal from "@/components/contratos/ContratoAcessoModal";

export default function Configuracoes() {
  const { isAdmin, isManager, loading } = useRole();
  const [showContratoAccess, setShowContratoAccess] = useState(false);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isAdmin && !isManager) return <Navigate to="/" replace />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie organização, usuários, equipes, relatórios e dados</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="organization" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Organização
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" /> Usuários
            </TabsTrigger>
          )}
          <TabsTrigger value="team" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Equipe dos Ciclos
          </TabsTrigger>
          <TabsTrigger value="cooperados" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Cooperados
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Relatórios
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" /> Exportar
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-1.5 text-xs">
            <WifiOff className="h-3.5 w-3.5" /> Fila Offline
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="backup" className="gap-1.5 text-xs">
              <Database className="h-3.5 w-3.5" /> 💾 Backup
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="contrato-acesso" className="gap-1.5 text-xs">
              <FileSignature className="h-3.5 w-3.5" /> Acesso Contratos
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="trash" className="gap-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" /> 🗑️ Lixeira
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organization">
          <OrganizationTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}
        <TabsContent value="team">
          <CycleTeamTab />
        </TabsContent>
        <TabsContent value="cooperados">
          <CooperadosTab />
        </TabsContent>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportSettingsTab />
        </TabsContent>
        <TabsContent value="export">
          <ExportDataTab />
        </TabsContent>
        <TabsContent value="offline">
          <OfflineQueueTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="backup">
            <BackupTab />
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="contrato-acesso">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Gerencie quem pode visualizar, inserir e deletar contratos.</p>
              <ContratoAcessoModal open={showContratoAccess} onClose={() => setShowContratoAccess(false)} />
              <button
                onClick={() => setShowContratoAccess(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
              >
                <FileSignature className="h-4 w-4" /> Gerenciar Acessos
              </button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
