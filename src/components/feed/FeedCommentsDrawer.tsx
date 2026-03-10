import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeedPermission } from "@/hooks/useFeedPermission";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import FeedMentionInput from "./FeedMentionInput";
import { Trash2, CornerDownRight, Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  postId: string;
}

export default function FeedCommentsDrawer({ open, onClose, postId }: Props) {
  const { user } = useAuth();
  const { canModerate } = useFeedPermission();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["feed-comments", postId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("feed_comments")
        .select("*")
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch commenter names via RPC
      const userIds = [...new Set((data ?? []).map((c: any) => c.user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await (supabase as any).rpc("get_profiles_by_ids", { _ids: userIds });
        (profiles ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
      }

      return (data ?? []).map((c: any) => ({
        ...c,
        autor: profilesMap[c.user_id] || null,
      }));
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("feed_comments").insert({
        post_id: postId,
        user_id: user!.id,
        comment_text: text.trim(),
        parent_comment_id: replyTo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ["feed-comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      await (supabase as any).from("feed_comments").update({ is_deleted: true }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Comentário removido");
      qc.invalidateQueries({ queryKey: ["feed-comments", postId] });
    },
  });

  const topLevel = (comments ?? []).filter((c: any) => !c.parent_comment_id);
  const replies = (comments ?? []).filter((c: any) => c.parent_comment_id);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col h-full">
        <SheetHeader>
          <SheetTitle>Comentários</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : topLevel.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum comentário ainda</p>
          ) : (
            topLevel.map((c: any) => (
              <div key={c.id} className="space-y-1">
                <CommentItem
                  comment={c}
                  userId={user?.id}
                  canModerate={canModerate}
                  onDelete={(id) => deleteComment.mutate(id)}
                  onReply={(id) => setReplyTo(id)}
                />
                {replies.filter((r: any) => r.parent_comment_id === c.id).map((r: any) => (
                  <div key={r.id} className="ml-6">
                    <CommentItem
                      comment={r}
                      userId={user?.id}
                      canModerate={canModerate}
                      onDelete={(id) => deleteComment.mutate(id)}
                      isReply
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t pt-3 space-y-1">
          {replyTo && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CornerDownRight className="h-3 w-3" />
              Respondendo comentário
              <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={() => setReplyTo(null)}>
                Cancelar
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <FeedMentionInput
              placeholder="Escreva um comentário... use @ para mencionar"
              value={text}
              onChange={(val) => setText(val)}
              onKeyDown={(e) => e.key === "Enter" && text.trim() && addComment.mutate()}
            />
            <Button size="icon" disabled={!text.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CommentItem({
  comment,
  userId,
  canModerate,
  onDelete,
  onReply,
  isReply,
}: {
  comment: any;
  userId?: string;
  canModerate: boolean;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
  isReply?: boolean;
}) {
  const isOwner = comment.user_id === userId;
  const nome = comment.autor?.full_name?.trim() || '';
  const iniciais = nome
    ? nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="group flex gap-2">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
        {iniciais}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground leading-tight">{nome || 'Desconhecido'}</p>
        <p className="text-sm text-foreground">{comment.comment_text}</p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
          {!isReply && onReply && (
            <button className="hover:text-foreground" onClick={() => onReply(comment.id)}>
              Responder
            </button>
          )}
          {(isOwner || canModerate) && (
            <button className="hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onDelete(comment.id)}>
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
