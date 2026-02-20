import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, WifiOff } from "lucide-react";
import ClientsTab from "@/components/settings/ClientsTab";
import CooperadosTab from "@/components/settings/CooperadosTab";
import OfflineQueueTab from "@/components/settings/OfflineQueueTab";

export default function Configuracoes() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie clientes, cooperados, fazendas e pivôs</p>
      </div>

      <Tabs defaultValue="cooperados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cooperados" className="gap-2">
            <Users className="h-4 w-4" /> Cooperados
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-2">
            <WifiOff className="h-4 w-4" /> Fila Offline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cooperados">
          <CooperadosTab />
        </TabsContent>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="offline">
          <OfflineQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
