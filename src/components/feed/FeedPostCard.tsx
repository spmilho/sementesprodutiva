import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeedPermission } from "@/hooks/useFeedPermission";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, MoreVertical, Eye, EyeOff, Trash2, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import FeedCommentsDrawer from "./FeedCommentsDrawer";

function FeedImage({ src, className }: { src: string; className?: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full w-full bg-muted text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <span className="text-xs">Foto indisponível</span>
      </div>
    );
  }
  return <img src={src} alt="" className={className} onError={() => setError(true)} loading="lazy" />;
}

interface Props {
  post: any;
}

export default function FeedPostCard({ post }: Props) {
  const { user } = useAuth();
  const { canModerate } = useFeedPermission();
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const media = (post.feed_media ?? []).sort((a: any, b: any) => a.order_index - b.order_index);
  const likes = post.feed_likes ?? [];
  const commentsCount = (post.feed_comments ?? []).filter((c: any) => !c.is_deleted).length;
  const isLiked = likes.some((l: any) => l.user_id === user?.id);
  const isOwner = post.author_user_id === user?.id;

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isLiked) {
        const likeId = likes.find((l: any) => l.user_id === user?.id)?.id;
        if (likeId) await (supabase as any).from("feed_likes").delete().eq("id", likeId);
      } else {
        await (supabase as any).from("feed_likes").insert({ post_id: post.id, user_id: user!.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed-posts"] }),
  });

  const hideMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("feed_posts").update({ is_hidden: !post.is_hidden }).eq("id", post.id);
      await (supabase as any).from("feed_moderation_log").insert({
        action_type: post.is_hidden ? "unhide_post" : "hide_post",
        target_type: "post",
        target_id: post.id,
        moderator_user_id: user!.id,
      });
    },
    onSuccess: () => {
      toast.success(post.is_hidden ? "Post restaurado" : "Post ocultado");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("feed_posts").delete().eq("id", post.id);
    },
    onSuccess: () => {
      toast.success("Post excluído");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed?post=${post.id}`);
    toast.success("Link copiado!");
  };

  return (
    <>
      <Card className="overflow-hidden border-border/60">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {post.autor?.full_name
                ? post.autor.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
                : "?"}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground leading-tight">{post.autor?.full_name?.trim() || "Desconhecido"}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                {post.location_text && ` · ${post.location_text}`}
              </p>
            </div>
          </div>
          {(isOwner || canModerate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canModerate && (
                  <DropdownMenuItem onClick={() => hideMutation.mutate()}>
                    {post.is_hidden ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                    {post.is_hidden ? "Restaurar" : "Ocultar"}
                  </DropdownMenuItem>
                )}
                {(isOwner || canModerate) && (
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate()}>
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Media carousel */}
        {media.length > 0 && (
          <div className="relative bg-black/5 aspect-square">
            {media[mediaIndex]?.media_type === "video" ? (
              <video
                src={media[mediaIndex].media_url}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <FeedImage
                src={media[mediaIndex].media_url}
                className="w-full h-full object-cover"
              />
            )}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 h-8 w-8 rounded-full"
                  onClick={() => setMediaIndex((i) => (i - 1 + media.length) % media.length)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60 h-8 w-8 rounded-full"
                  onClick={() => setMediaIndex((i) => (i + 1) % media.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {media.map((_: any, i: number) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === mediaIndex ? "bg-white" : "bg-white/40"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <CardContent className="px-4 py-3 space-y-2">
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 px-1 ${isLiked ? "text-red-500" : ""}`}
              onClick={() => likeMutation.mutate()}
            >
              <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
              <span className="text-xs">{likes.length}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 px-1" onClick={() => setShowComments(true)}>
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">{commentsCount}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 px-1" onClick={copyLink}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Caption */}
          {post.caption && <p className="text-sm text-foreground">{post.caption}</p>}

          {/* Tags & Stage */}
          <div className="flex flex-wrap gap-1">
            {post.stage && <Badge variant="secondary" className="text-[10px]">{post.stage}</Badge>}
            {post.safra && <Badge variant="outline" className="text-[10px]">{post.safra}</Badge>}
            {post.fazenda && <Badge variant="outline" className="text-[10px]">{post.fazenda}</Badge>}
            {(post.tags ?? []).map((t: string) => (
              <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <FeedCommentsDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
      />
    </>
  );
}
