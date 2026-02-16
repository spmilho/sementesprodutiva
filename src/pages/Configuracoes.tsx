import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users } from "lucide-react";
import ClientsTab from "@/components/settings/ClientsTab";
import CooperadosTab from "@/components/settings/CooperadosTab";

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
        </TabsList>

        <TabsContent value="cooperados">
          <CooperadosTab />
        </TabsContent>
        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
