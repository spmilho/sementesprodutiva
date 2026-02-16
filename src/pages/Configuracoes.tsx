import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin } from "lucide-react";
import ClientsTab from "@/components/settings/ClientsTab";
import FarmsTab from "@/components/settings/FarmsTab";

export default function Configuracoes() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie clientes, fazendas e preferências do sistema</p>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" /> Clientes
          </TabsTrigger>
          <TabsTrigger value="farms" className="gap-2">
            <MapPin className="h-4 w-4" /> Fazendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="farms">
          <FarmsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
