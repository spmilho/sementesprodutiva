import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OfflineRecord {
  id: string;
  table: string;
  data: Record<string, unknown>;
  cycle_id?: string;
  created_at: string;
  synced: boolean;
  error?: string;
}

const STORAGE_KEY = "offline_queue";

function loadQueue(): OfflineRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(records: OfflineRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export type SyncStatus = "online" | "offline" | "syncing" | "synced";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<OfflineRecord[]>(loadQueue);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? "online" : "offline");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingRecords = queue.filter((r) => !r.synced);
  const pendingCount = pendingRecords.length;

  // Listen for online/offline events
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
    };
    const goOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
      setSyncMessage(null);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const syncRecords = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const current = loadQueue().filter((r) => !r.synced);
    if (current.length === 0) {
      setSyncStatus("online");
      return;
    }

    syncingRef.current = true;
    setSyncStatus("syncing");
    setSyncMessage(`🔄 Sincronizando ${current.length} registro(s)...`);

    let successCount = 0;
    let failCount = 0;
    const allRecords = loadQueue();

    // Process in chronological order
    const sorted = [...current].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const record of sorted) {
      try {
        const { error } = await supabase
          .from(record.table as any)
          .insert(record.data as any);

        const idx = allRecords.findIndex((r) => r.id === record.id);
        if (error) {
          failCount++;
          if (idx >= 0) {
            allRecords[idx].error = error.message;
          }
        } else {
          successCount++;
          if (idx >= 0) {
            allRecords[idx].synced = true;
            allRecords[idx].error = undefined;
          }
        }
      } catch (err: any) {
        failCount++;
        const idx = allRecords.findIndex((r) => r.id === record.id);
        if (idx >= 0) {
          allRecords[idx].error = err?.message || "Erro desconhecido";
        }
      }
    }

    // Remove synced records from queue
    const remaining = allRecords.filter((r) => !r.synced);
    saveQueue(remaining);
    setQueue(remaining);
    syncingRef.current = false;

    if (failCount > 0) {
      setSyncMessage(`⚠️ ${successCount} sincronizado(s), ${failCount} falha(s). Retry em 30s.`);
      setSyncStatus("online");
      retryTimerRef.current = setTimeout(() => {
        setSyncMessage(null);
        syncRecords();
      }, 30000);
    } else {
      setSyncMessage(`✅ ${successCount} registro(s) sincronizado(s)!`);
      setSyncStatus("synced");
      setTimeout(() => {
        setSyncStatus("online");
        setSyncMessage(null);
      }, 4000);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncingRef.current) {
      syncRecords();
    } else if (isOnline && pendingCount === 0 && syncStatus === "offline") {
      setSyncStatus("online");
    }
  }, [isOnline, pendingCount]);

  const addRecord = useCallback(
    (table: string, data: Record<string, unknown>, cycleId?: string) => {
      const record: OfflineRecord = {
        id: crypto.randomUUID(),
        table,
        data,
        cycle_id: cycleId,
        created_at: new Date().toISOString(),
        synced: false,
      };
      const updated = [...loadQueue(), record];
      saveQueue(updated);
      setQueue(updated);

      if (navigator.onLine) {
        // Try syncing immediately
        setTimeout(syncRecords, 200);
      }

      return record.id;
    },
    [syncRecords]
  );

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setQueue([]);
    setSyncMessage(null);
  }, []);

  const forceSync = useCallback(() => {
    if (!navigator.onLine) {
      setSyncMessage("⚠️ Sem conexão. Aguarde reconectar.");
      return;
    }
    syncRecords();
  }, [syncRecords]);

  return {
    isOnline,
    syncStatus,
    syncMessage,
    queue,
    pending: pendingRecords,
    pendingCount,
    addRecord,
    syncRecords,
    forceSync,
    clearQueue,
  };
}
