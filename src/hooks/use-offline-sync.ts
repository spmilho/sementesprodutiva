import { useState, useEffect, useCallback, useRef } from "react";

export interface PendingRecord {
  id: string;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
}

const STORAGE_KEY = "offline_pending_records";

function loadPending(): PendingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePending(records: PendingRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export type SyncStatus = "online" | "offline" | "syncing" | "synced";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState<PendingRecord[]>(loadPending);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? "online" : "offline");
  const syncingRef = useRef(false);

  // Listen for online/offline events
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && pending.length > 0 && !syncingRef.current) {
      syncRecords();
    } else if (isOnline && pending.length === 0) {
      setSyncStatus("synced");
      // Reset to "online" after a brief "synced" display
      const t = setTimeout(() => setSyncStatus("online"), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, pending.length]);

  const syncRecords = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncStatus("syncing");

    const current = loadPending();
    const failed: PendingRecord[] = [];

    for (const record of current) {
      try {
        // Simulate API call — replace with real Supabase call when backend is connected
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log(`[Sync] Registro sincronizado: ${record.type} #${record.id}`);
      } catch {
        failed.push(record);
      }
    }

    savePending(failed);
    setPending(failed);
    syncingRef.current = false;

    if (failed.length === 0) {
      setSyncStatus("synced");
      setTimeout(() => setSyncStatus("online"), 3000);
    } else {
      setSyncStatus("online");
    }
  }, []);

  const addRecord = useCallback(
    (type: string, data: Record<string, unknown>) => {
      const record: PendingRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type,
        data,
      };
      const updated = [...loadPending(), record];
      savePending(updated);
      setPending(updated);

      if (navigator.onLine) {
        // Try syncing immediately
        setTimeout(syncRecords, 100);
      }

      return record.id;
    },
    [syncRecords]
  );

  const clearPending = useCallback(() => {
    savePending([]);
    setPending([]);
  }, []);

  return {
    isOnline,
    syncStatus,
    pending,
    pendingCount: pending.length,
    addRecord,
    syncRecords,
    clearPending,
  };
}
