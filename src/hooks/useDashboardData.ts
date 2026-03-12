import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DashboardCycle {
  id: string;
  contract_number: string | null;
  field_name: string;
  season: string;
  hybrid_name: string;
  status: string;
  female_area: number;
  male_area: number;
  total_area: number;
  updated_at: string;
  client_id: string;
  farm_id: string;
  cooperator_id: string | null;
  pivot_id: string | null;
  expected_productivity: number | null;
  expected_production: number | null;
  detasseling_dap: number | null;
  // Joined
  client_name: string;
  cooperator_name: string;
  farm_name: string;
}

export function useDashboardData(filters: {
  season: string;
  clientId: string;
  cooperatorId: string;
  statuses: string[];
}) {
  const { user } = useAuth();

  // Cycles with joins
  const cyclesQuery = useQuery({
    queryKey: ["dashboard-cycles", filters.season],
    enabled: !!user,
    queryFn: async () => {
      let q = (supabase as any)
        .from("production_cycles")
        .select("*, clients!inner(name), farms!inner(name), cooperators(name)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (filters.season && filters.season !== "all") {
        q = q.eq("season", filters.season);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        client_name: c.clients?.name || "",
        cooperator_name: c.cooperators?.name || "",
        farm_name: c.farms?.name || "",
      })) as DashboardCycle[];
    },
    staleTime: 30_000,
  });

  // Planting plans
  const plantingPlansQuery = useQuery({
    queryKey: ["dashboard-planting-plans", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("planting_plan")
        .select("cycle_id, type, planned_area, planned_date")
        .is("deleted_at", null);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Planting actuals
  const plantingActualsQuery = useQuery({
    queryKey: ["dashboard-planting-actuals", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("planting_actual")
        .select("cycle_id, type, actual_area, planting_date")
        .is("deleted_at", null);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Detasseling records
  const detasselingQuery = useQuery({
    queryKey: ["dashboard-detasseling", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("detasseling_records")
        .select("cycle_id, area_worked_ha, pass_type, pct_remaining_after")
        .is("deleted_at", null);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Harvest records
  const harvestRecordsQuery = useQuery({
    queryKey: ["dashboard-harvest-records", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("harvest_records")
        .select("cycle_id, area_harvested_ha, total_weight_tons, avg_moisture_pct, harvest_date")
        .is("deleted_at", null);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Harvest plans
  const harvestPlansQuery = useQuery({
    queryKey: ["dashboard-harvest-plans", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("harvest_plan")
        .select("cycle_id, planned_harvest_start, planned_harvest_end, target_ha_per_day")
        .is("deleted_at", null)
        .is("gleba_id", null);
      return data || [];
    },
    staleTime: 60_000,
  });

  // Moisture samples (latest per cycle)
  const moistureQuery = useQuery({
    queryKey: ["dashboard-moisture", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("moisture_samples")
        .select("cycle_id, moisture_pct, sample_date")
        .is("deleted_at", null)
        .order("sample_date", { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  // Nicking observations (latest per cycle)
  const nickingQuery = useQuery({
    queryKey: ["dashboard-nicking", filters.season],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("nicking_observations")
        .select("cycle_id, overall_synchrony_status, observation_date")
        .is("deleted_at", null)
        .order("observation_date", { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  // Clients for filter
  const clientsQuery = useQuery({
    queryKey: ["dashboard-clients"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("clients")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Cooperators for filter
  const cooperatorsQuery = useQuery({
    queryKey: ["dashboard-cooperators"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cooperators")
        .select("id, name")
        .is("deleted_at", null)
        .order("name");
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  // Seasons from cycles
  const seasonsQuery = useQuery({
    queryKey: ["dashboard-seasons"],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("production_cycles")
        .select("season")
        .is("deleted_at", null);
      const unique = [...new Set((data || []).map((d: any) => d.season))].sort().reverse();
      return unique as string[];
    },
    staleTime: 5 * 60_000,
  });

  const isLoading = cyclesQuery.isLoading;

  return {
    cycles: cyclesQuery.data || [],
    plantingPlans: plantingPlansQuery.data || [],
    plantingActuals: plantingActualsQuery.data || [],
    detasseling: detasselingQuery.data || [],
    harvestRecords: harvestRecordsQuery.data || [],
    harvestPlans: harvestPlansQuery.data || [],
    moisture: moistureQuery.data || [],
    nicking: nickingQuery.data || [],
    clients: clientsQuery.data || [],
    cooperators: cooperatorsQuery.data || [],
    seasons: seasonsQuery.data || [],
    isLoading,
  };
}
