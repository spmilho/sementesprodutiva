import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "manager" | "field_user" | "client";

export interface UserRole {
  id: string;
  role: AppRole;
  client_id: string | null;
  created_at: string;
}

export function useRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("id, role, client_id, created_at")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as UserRole | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const role = data?.role ?? null;

  return {
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isFieldUser: role === "field_user",
    isClient: role === "client",
    canInsert: role === "admin" || role === "manager" || role === "field_user",
    canUpdate: role === "admin" || role === "manager",
    canDelete: role === "admin" || role === "manager",
    loading: isLoading,
    clientId: data?.client_id ?? null,
  };
}
