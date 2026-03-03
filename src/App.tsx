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

import MapaIntegrado from "./pages/MapaIntegrado";
import UbsCapacityPlanning from "./pages/UbsCapacityPlanning";
import Configuracoes from "./pages/Configuracoes";
import UserManagement from "./pages/UserManagement";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/ciclos" element={<Cycles />} />
                    <Route path="/ciclos/novo" element={<CycleForm />} />
                    <Route path="/ciclos/:id" element={<CycleDetail />} />
                    <Route path="/mapa" element={<MapaIntegrado />} />
                    <Route path="/ubs" element={<UbsCapacityPlanning />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/usuarios" element={<UserManagement />} />
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
