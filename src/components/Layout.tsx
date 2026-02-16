import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { createContext, useContext } from "react";

type OfflineSyncContextType = ReturnType<typeof useOfflineSync>;
export const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);
export const useOfflineSyncContext = () => {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) throw new Error("useOfflineSyncContext must be inside Layout");
  return ctx;
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-card shrink-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">Caderno de Campo</span>
              <div className="ml-auto">
                <OfflineIndicator syncStatus={offlineSync.syncStatus} pendingCount={offlineSync.pendingCount} />
              </div>
            </header>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </OfflineSyncContext.Provider>
  );
}
