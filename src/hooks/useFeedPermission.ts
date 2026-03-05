import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type FeedRole = "viewer" | "poster" | "moderator" | "admin";

export interface FeedPermission {
  id: string;
  user_id: string;
  can_access_feed: boolean;
  role_feed: FeedRole;
  is_banned: boolean;
}

export function useFeedPermission() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["feed-permission", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feed_user_permissions")
        .select("*")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as FeedPermission | null;
    },
    staleTime: 2 * 60 * 1000,
  });

  const hasAccess = !!data?.can_access_feed && !data?.is_banned;
  const role = hasAccess ? (data?.role_feed ?? null) : null;

  return {
    hasAccess,
    role,
    isBanned: !!data?.is_banned,
    canPost: role === "poster" || role === "moderator" || role === "admin",
    canModerate: role === "moderator" || role === "admin",
    isFeedAdmin: role === "admin",
    loading: isLoading,
  };
}
