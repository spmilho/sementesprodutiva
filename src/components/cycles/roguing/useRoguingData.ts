import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RoguingEvaluation, RoguingRequest, RoguingExecution } from "./types";

export function useRoguingData(cycleId: string) {
  const qc = useQueryClient();

  const evaluationsQuery = useQuery({
    queryKey: ["roguing-evaluations", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roguing_evaluations")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return (data || []) as RoguingEvaluation[];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["roguing-requests", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roguing_requests")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("request_date", { ascending: false });
      if (error) throw error;
      return (data || []) as RoguingRequest[];
    },
  });

  const executionsQuery = useQuery({
    queryKey: ["roguing-executions", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roguing_executions")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("execution_date", { ascending: false });
      if (error) throw error;
      return (data || []) as RoguingExecution[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["roguing-evaluations", cycleId] });
    qc.invalidateQueries({ queryKey: ["roguing-requests", cycleId] });
    qc.invalidateQueries({ queryKey: ["roguing-executions", cycleId] });
  };

  return {
    evaluations: evaluationsQuery.data ?? [],
    requests: requestsQuery.data ?? [],
    executions: executionsQuery.data ?? [],
    isLoading: evaluationsQuery.isLoading || requestsQuery.isLoading || executionsQuery.isLoading,
    invalidateAll,
  };
}
