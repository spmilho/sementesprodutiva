import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OfflineRecord {
  id: string;
  table: string;
  data: Record<string, unknown>;
  cycle_id?: string;
  created_at: string;
  synced: boolean;
  error?: string;
  // Parent-child group support
  group_id?: string;
  local_id?: string;         // local UUID used as this record's id
  parent_local_id?: string;  // local UUID of the parent record
  fk_field?: string;         // which field in data holds the parent FK
  sort_order?: number;        // 0 = parent, 1+ = children
}

export interface GroupRecord {
  table: string;
  data: Record<string, unknown>;
  localId?: string;          // local UUID used as this record's PK
  parentLocalId?: string;    // local UUID of the parent record
  fkField?: string;          // field name in data that references parent
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

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
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

    // Separate grouped and ungrouped records
    const grouped = new Map<string, OfflineRecord[]>();
    const ungrouped: OfflineRecord[] = [];

    for (const record of current) {
      if (record.group_id) {
        if (!grouped.has(record.group_id)) grouped.set(record.group_id, []);
        grouped.get(record.group_id)!.push(record);
      } else {
        ungrouped.push(record);
      }
    }

    // Sort ungrouped by timestamp
    ungrouped.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Process ungrouped records
    for (const record of ungrouped) {
      try {
        const { error } = await supabase.from(record.table as any).insert(record.data as any);
        const idx = allRecords.findIndex((r) => r.id === record.id);
        if (error) {
          failCount++;
          if (idx >= 0) allRecords[idx].error = error.message;
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
        if (idx >= 0) allRecords[idx].error = err?.message || "Erro desconhecido";
      }
    }

    // Process grouped records (parent-child chains)
    for (const [groupId, records] of grouped) {
      // Sort: parents first (sort_order=0), then children
      records.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Map from local_id → real Supabase id
      const idMap = new Map<string, string>();
      let groupFailed = false;

      for (const record of records) {
        if (groupFailed) {
          const idx = allRecords.findIndex((r) => r.id === record.id);
          if (idx >= 0) allRecords[idx].error = "Registro pai falhou";
          failCount++;
          continue;
        }

        try {
          // Replace FK with real parent ID if this is a child
          const insertData = { ...record.data };
          if (record.parent_local_id && record.fk_field) {
            const realParentId = idMap.get(record.parent_local_id);
            if (realParentId) {
              insertData[record.fk_field] = realParentId;
            }
          }

          // Remove local_id from data if present (use DB-generated id)
          if (record.local_id && insertData.id === record.local_id) {
            delete insertData.id;
          }

          const res = await supabase
            .from(record.table as any)
            .insert(insertData as any)
            .select("id")
            .single();

          const result = res.data as any;
          const error = res.error;
          const idx = allRecords.findIndex((r) => r.id === record.id);
          if (error) {
            failCount++;
            groupFailed = true;
            if (idx >= 0) allRecords[idx].error = error.message;
          } else {
            successCount++;
            if (idx >= 0) {
              allRecords[idx].synced = true;
              allRecords[idx].error = undefined;
            }
            // Map local_id to real id for children to use
            if (record.local_id && result?.id) {
              idMap.set(record.local_id, result.id);
            }
          }
        } catch (err: any) {
          failCount++;
          groupFailed = true;
          const idx = allRecords.findIndex((r) => r.id === record.id);
          if (idx >= 0) allRecords[idx].error = err?.message || "Erro desconhecido";
        }
      }
    }

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

  /**
   * Insert a record. When online, inserts directly via Supabase.
   * When offline, queues locally for later sync.
   */
  const addRecord = useCallback(
    async (table: string, data: Record<string, unknown>, cycleId?: string): Promise<{ error: any }> => {
      if (navigator.onLine) {
        const { error } = await supabase.from(table as any).insert(data as any);
        if (error) {
          if (error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("Failed")) {
            return queueLocally(table, data, cycleId);
          }
          return { error };
        }
        return { error: null };
      } else {
        return queueLocally(table, data, cycleId);
      }
    },
    []
  );

  /**
   * Insert a record and return the inserted data (with select).
   * Only works when online. When offline, returns an error.
   */
  const addRecordWithReturn = useCallback(
    async (table: string, data: Record<string, unknown>): Promise<{ data: any; error: any }> => {
      if (!navigator.onLine) {
        return { data: null, error: { message: "Este formulário requer conexão com a internet." } };
      }
      const { data: result, error } = await supabase.from(table as any).insert(data as any).select().single();
      return { data: result, error };
    },
    []
  );

  /**
   * Queue a group of parent-child records for offline sync.
   * When online, attempts direct insert with proper chaining.
   * When offline, queues all records with group metadata.
   */
  const addRecordGroup = useCallback(
    async (records: GroupRecord[], cycleId?: string): Promise<{ error: any }> => {
      if (navigator.onLine) {
        // Try direct insert with chaining
        try {
          const idMap = new Map<string, string>();
          // Sort: records without parentLocalId first (parents)
          const sorted = [...records].sort((a, b) => {
            const aIsParent = !a.parentLocalId ? 0 : 1;
            const bIsParent = !b.parentLocalId ? 0 : 1;
            return aIsParent - bIsParent;
          });

          for (const rec of sorted) {
            const insertData = { ...rec.data };
            // Replace FK with real parent ID
            if (rec.parentLocalId && rec.fkField) {
              const realId = idMap.get(rec.parentLocalId);
              if (realId) insertData[rec.fkField] = realId;
            }
            // Remove local id
            if (rec.localId && insertData.id === rec.localId) {
              delete insertData.id;
            }

            const res = await supabase
              .from(rec.table as any)
              .insert(insertData as any)
              .select("id")
              .single();

            const result = res.data as any;
            const error = res.error;
            if (error) {
              if (error.message?.includes("fetch") || error.message?.includes("network") || error.message?.includes("Failed")) {
                return queueGroupLocally(records, cycleId);
              }
              return { error };
            }
            if (rec.localId && result?.id) {
              idMap.set(rec.localId, result.id);
            }
          }
          return { error: null };
        } catch (err: any) {
          if (err?.message?.includes("fetch") || err?.message?.includes("network")) {
            return queueGroupLocally(records, cycleId);
          }
          return { error: err };
        }
      } else {
        return queueGroupLocally(records, cycleId);
      }
    },
    []
  );

  const queueLocally = useCallback(
    (table: string, data: Record<string, unknown>, cycleId?: string): { error: any } => {
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
      toast.success("✅ Salvo localmente. Será enviado ao reconectar.", { icon: "📱" });
      return { error: null };
    },
    []
  );

  const queueGroupLocally = useCallback(
    (records: GroupRecord[], cycleId?: string): { error: any } => {
      const groupId = crypto.randomUUID();
      const offlineRecords: OfflineRecord[] = records.map((rec, i) => ({
        id: crypto.randomUUID(),
        table: rec.table,
        data: rec.data,
        cycle_id: cycleId,
        created_at: new Date().toISOString(),
        synced: false,
        group_id: groupId,
        local_id: rec.localId,
        parent_local_id: rec.parentLocalId,
        fk_field: rec.fkField,
        sort_order: rec.parentLocalId ? 1 : 0,
      }));
      const updated = [...loadQueue(), ...offlineRecords];
      saveQueue(updated);
      setQueue(updated);
      toast.success("✅ Salvo localmente. Será enviado ao reconectar.", { icon: "📱" });
      return { error: null };
    },
    []
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
    addRecordWithReturn,
    addRecordGroup,
    syncRecords,
    forceSync,
    clearQueue,
  };
}
