import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Cycles from "./pages/Cycles";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ciclos" element={<Cycles />} />
            <Route path="/planejamento" element={<Placeholder title="Planejamento de Plantio" />} />
            <Route path="/plantio" element={<Placeholder title="Plantio Realizado" />} />
            <Route path="/fenologia" element={<Placeholder title="Fenologia" />} />
            <Route path="/emergencia" element={<Placeholder title="Emergência / Stand Count" />} />
            <Route path="/nicking" element={<Placeholder title="Nicking — Sincronismo Floral" />} />
            <Route path="/despendoamento" element={<Placeholder title="Despendoamento" />} />
            <Route path="/roguing" element={<Placeholder title="Roguing" />} />
            <Route path="/manejo-quimico" element={<Placeholder title="Manejo Químico" />} />
            <Route path="/pragas" element={<Placeholder title="Pragas e Doenças" />} />
            <Route path="/agua" element={<Placeholder title="Água — Irrigação e Chuva" />} />
            <Route path="/umidade" element={<Placeholder title="Umidade" />} />
            <Route path="/colheita" element={<Placeholder title="Colheita" />} />
            <Route path="/mapa" element={<Placeholder title="Mapa Integrado" />} />
            <Route path="/visitas" element={<Placeholder title="Visitas de Campo" />} />
            <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
            <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
