import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Cycles from "./pages/Cycles";
import CycleForm from "./pages/CycleForm";
import CycleDetail from "./pages/CycleDetail";
import Placeholder from "./pages/Placeholder";
import MapaIntegrado from "./pages/MapaIntegrado";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/ciclos" element={<Cycles />} />
                    <Route path="/ciclos/novo" element={<CycleForm />} />
                    <Route path="/ciclos/:id" element={<CycleDetail />} />
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
                    <Route path="/mapa" element={<MapaIntegrado />} />
                    <Route path="/visitas" element={<Placeholder title="Visitas de Campo" />} />
                    <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
