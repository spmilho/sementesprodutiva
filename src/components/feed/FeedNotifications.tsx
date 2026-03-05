import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FeedNotifications() {
  const { user } = useAuth();

  // Get comments on my posts (as notifications)
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["feed-notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get my post IDs first
      const { data: myPosts } = await (supabase as any)
        .from("feed_posts")
        .select("id")
        .eq("author_user_id", user!.id);

      if (!myPosts?.length) return [];

      const postIds = myPosts.map((p: any) => p.id);

      // Get comments on my posts (not by me)
      const { data: comments, error } = await (supabase as any)
        .from("feed_comments")
        .select("*")
        .in("post_id", postIds)
        .neq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return comments as any[];
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!notifications?.length) {
    return <p className="text-center py-12 text-muted-foreground">Nenhuma notificação</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-2">
      {notifications.map((n: any) => (
        <Card key={n.id}>
          <CardContent className="flex items-start gap-3 py-3 px-4">
            <MessageCircle className="h-4 w-4 text-primary mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                Alguém comentou no seu post: <span className="text-muted-foreground">"{n.comment_text?.slice(0, 80)}"</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
