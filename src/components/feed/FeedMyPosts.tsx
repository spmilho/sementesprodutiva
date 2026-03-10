import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import FeedPostCard from "./FeedPostCard";

interface Props {
  userId: string;
}

export default function FeedMyPosts({ userId }: Props) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts-mine", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feed_posts")
        .select("*, feed_media(*), feed_likes(id, user_id), feed_comments(id, is_deleted)")
        .eq("author_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      // Fetch author profile via RPC
      let autor: any = null;
      if (userId) {
        const { data: profiles } = await (supabase as any).rpc("get_profiles_by_ids", { _ids: [userId] });
        autor = profiles?.[0] || null;
      }

      return (data ?? []).map((p: any) => ({ ...p, autor }));
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!posts?.length) {
    return <p className="text-center py-12 text-muted-foreground">Você ainda não publicou nenhum post</p>;
  }

  return (
    <div className="grid gap-4 max-w-2xl mx-auto">
      {posts.map((post: any) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
