import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { SyncStatus } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  syncStatus: SyncStatus;
  pendingCount: number;
}

const config: Record<SyncStatus, { icon: typeof Wifi; label: string; className: string }> = {
  online: {
    icon: Wifi,
    label: "Online",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  offline: {
    icon: WifiOff,
    label: "Offline",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  syncing: {
    icon: CloudUpload,
    label: "Sincronizando…",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  synced: {
    icon: CheckCircle2,
    label: "Sincronizado",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
};

export function OfflineIndicator({ syncStatus, pendingCount }: OfflineIndicatorProps) {
  const { icon: Icon, label, className } = config[syncStatus];

  const displayLabel =
    syncStatus === "offline" && pendingCount > 0
      ? `Offline (${pendingCount} pendente${pendingCount > 1 ? "s" : ""})`
      : syncStatus === "synced"
        ? "Online (sincronizado)"
        : label;

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors", className)}>
      <Icon className={cn("h-3.5 w-3.5", syncStatus === "syncing" && "animate-spin")} />
      <span>{displayLabel}</span>
    </div>
  );
}
