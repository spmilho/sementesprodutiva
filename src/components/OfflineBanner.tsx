import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { SyncStatus } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  syncStatus: SyncStatus;
  syncMessage: string | null;
  pendingCount: number;
}

export function OfflineBanner({ syncStatus, syncMessage, pendingCount }: OfflineBannerProps) {
  if (syncStatus === "online" && !syncMessage) return null;

  const isOffline = syncStatus === "offline";
  const isSyncing = syncStatus === "syncing";
  const isSynced = syncStatus === "synced";
  const hasMessage = !!syncMessage;

  // Show banner for: offline, syncing, synced (briefly), or error messages
  if (!isOffline && !isSyncing && !isSynced && !hasMessage) return null;

  let bgClass = "bg-amber-500";
  let Icon = WifiOff;
  let text = `⚡ Você está offline. Registros serão salvos localmente e sincronizados ao reconectar.${pendingCount > 0 ? ` (${pendingCount} pendente${pendingCount > 1 ? "s" : ""})` : ""}`;

  if (isSyncing) {
    bgClass = "bg-blue-600";
    Icon = RefreshCw;
    text = syncMessage || `🔄 Sincronizando ${pendingCount} registro(s)...`;
  } else if (isSynced) {
    bgClass = "bg-emerald-600";
    Icon = CheckCircle2;
    text = syncMessage || "✅ Registros sincronizados!";
  } else if (syncMessage && !isOffline) {
    bgClass = "bg-amber-500";
    Icon = AlertTriangle;
    text = syncMessage;
  }

  return (
    <div className={cn("w-full px-4 py-2 text-white text-sm flex items-center gap-2 shrink-0 transition-colors", bgClass)}>
      <Icon className={cn("h-4 w-4 shrink-0", isSyncing && "animate-spin")} />
      <span>{text}</span>
    </div>
  );
}
