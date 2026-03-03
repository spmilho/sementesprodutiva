import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { UbsState, PhaseConfig, Client } from "@/components/ubs/types";

const DEFAULT_PHASE_CONFIG: Record<string, PhaseConfig> = {
  "Recebimento e Despalha": { shifts: 3, hoursPerShift: 8, operatingDays: 6 },
  Secador: { shifts: 3, hoursPerShift: 8, operatingDays: 6 },
  Debulha: { shifts: 2, hoursPerShift: 8, operatingDays: 6 },
  Classificação: { shifts: 2, hoursPerShift: 8, operatingDays: 6 },
  "Tratamento e Ensaque": { shifts: 2, hoursPerShift: 8, operatingDays: 6 },
  Expedição: { shifts: 1, hoursPerShift: 8, operatingDays: 5 },
};

const DEFAULT_CLIENTS: Client[] = [
  { id: "1", name: "Limagrain", color: "#5CDB6E", hybrids: [
    { id: "1a", name: "LG 36790", volumes: [0, 0, 0, 700, 700, 600, 600, 0, 0, 0, 0] },
    { id: "1b", name: "LG 34799", volumes: [0, 0, 0, 500, 500, 600, 600, 0, 0, 0, 0] },
  ]},
  { id: "2", name: "Advanta", color: "#4ECDC4", hybrids: [
    { id: "2a", name: "ADV 9275", volumes: [0, 0, 563, 836, 1084, 328, 0, 0, 0, 0, 0] },
  ]},
  { id: "3", name: "Milhão", color: "#FFD93D", hybrids: [
    { id: "3a", name: "MH 7040", volumes: [0, 0, 0, 0, 550, 0, 0, 0, 0, 0, 0] },
  ]},
];

const DEFAULT_STAFF: Record<string, number[]> = {
  "Recebimento e Despalha": [5, 5, 5],
  Secador: [2, 2, 2],
  Debulha: [3, 3],
  Classificação: [3, 3],
  "Tratamento e Ensaque": [3, 3],
  Expedição: [2],
};

const DEFAULT_CAP_PER_SHIFT: Record<string, number> = {
  "Recebimento e Despalha": 283,
  Secador: 5832,
  Debulha: 200,
  Classificação: 180,
  "Tratamento e Ensaque": 160,
  Expedição: 200,
};

const DEFAULT_STATE: UbsState = {
  ubsName: "UBS Produtiva Sementes",
  phaseConfig: DEFAULT_PHASE_CONFIG,
  phaseCapPerShift: DEFAULT_CAP_PER_SHIFT,
  clients: DEFAULT_CLIENTS,
  clientsPhase2: JSON.parse(JSON.stringify(DEFAULT_CLIENTS)),
  startDate: "2026-06-08",
  numWeeks: 11,
  staff: DEFAULT_STAFF,
  compareMode: false,
  altShifts: 3,
  altReceivingCapPerShift: 350,
  altDryingCapPerShift: 400,
  changeoverTimeH: 4,
  changeoverTimeHPhase2: 4,
};

function migrateState(parsed: any): UbsState {
  if (!parsed.phaseConfig) {
    const s = parsed.shifts || 3;
    const h = parsed.hoursPerShift || 8;
    const d = parsed.operatingDays || 6;
    const cfg: Record<string, PhaseConfig> = {};
    for (const phase of ["Recebimento e Despalha", "Secador", "Debulha", "Classificação", "Tratamento e Ensaque", "Expedição"]) {
      cfg[phase] = { shifts: s, hoursPerShift: h, operatingDays: d };
    }
    parsed.phaseConfig = cfg;
  }
  if (!parsed.phaseCapPerShift) {
    const dryingPerShift = parsed.dryingCapPerShift || 324;
    const dryingCfg = parsed.phaseConfig?.["Secador"] || { shifts: 3, operatingDays: 6 };
    parsed.phaseCapPerShift = {
      "Recebimento e Despalha": parsed.receivingCapPerShift || 283,
      Secador: dryingPerShift * (dryingCfg.shifts || 3) * (dryingCfg.operatingDays || 6),
      Debulha: 200, Classificação: 180, "Tratamento e Ensaque": 160, Expedição: 200,
    };
  }
  if (parsed.changeoverTimeH === undefined) parsed.changeoverTimeH = 4;
  if (parsed.changeoverTimeHPhase2 === undefined) parsed.changeoverTimeHPhase2 = 4;
  if (!parsed.clientsPhase2) parsed.clientsPhase2 = JSON.parse(JSON.stringify(parsed.clients || []));
  return parsed as UbsState;
}

export function useUbsState() {
  const { user } = useAuth();
  const [state, setState] = useState<UbsState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  // Load state from DB
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      try {
        // Get org_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", user!.id)
          .maybeSingle();

        if (cancelled || !profile?.org_id) {
          setLoading(false);
          return;
        }

        setOrgId(profile.org_id);

        // Try to load from DB
        const { data: dbState } = await (supabase as any)
          .from("ubs_capacity_state")
          .select("state_data")
          .eq("org_id", profile.org_id)
          .maybeSingle();

        if (cancelled) return;

        if (dbState?.state_data && Object.keys(dbState.state_data).length > 0) {
          setState(migrateState(dbState.state_data));
        } else {
          // Try migrating from localStorage
          try {
            const raw = localStorage.getItem("ubs-capacity-state");
            if (raw) {
              const parsed = JSON.parse(raw);
              const migrated = migrateState(parsed);
              setState(migrated);
              // Save to DB immediately
              await (supabase as any)
                .from("ubs_capacity_state")
                .upsert({
                  org_id: profile.org_id,
                  state_data: migrated,
                  updated_by: user!.id,
                }, { onConflict: "org_id" });
              localStorage.removeItem("ubs-capacity-state");
            }
          } catch {}
        }

        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load UBS state:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Debounced save to DB
  const saveToDb = useCallback(
    (newState: UbsState) => {
      if (!orgId || !user?.id || !hasLoadedRef.current) return;

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const { error } = await (supabase as any)
            .from("ubs_capacity_state")
            .upsert({
              org_id: orgId,
              state_data: newState,
              updated_by: user.id,
            }, { onConflict: "org_id" });

          if (error) {
            console.error("Failed to save UBS state:", error);
            toast.error("Erro ao salvar dados da UBS");
          }
        } catch (err) {
          console.error("Failed to save UBS state:", err);
        }
      }, 1500);
    },
    [orgId, user?.id]
  );

  const update = useCallback(<K extends keyof UbsState>(key: K, value: UbsState[K]) => {
    setState((prev) => {
      const next = { ...prev, [key]: value };
      saveToDb(next);
      return next;
    });
  }, [saveToDb]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return { state, update, loading };
}
