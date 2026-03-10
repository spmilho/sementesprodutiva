import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import FeedPostCard from "./FeedPostCard";

const STAGES = ["Plantio", "Despendoamento", "Roguing", "Pragas", "Colheita", "UBS", "Qualidade", "Logística"];

export default function FeedTimeline() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts", stageFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("feed_posts")
        .select("*, feed_media(*), feed_likes(id, user_id), feed_comments(id), autor:author_user_id(id, full_name)")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (stageFilter && stageFilter !== "all") {
        q = q.eq("stage", stageFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = (posts ?? []).filter((p: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.caption?.toLowerCase().includes(s) ||
      (p.tags ?? []).some((t: string) => t.toLowerCase().includes(s)) ||
      p.location_text?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por legenda, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas etapas</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum post encontrado
        </div>
      ) : (
        <div className="grid gap-4 max-w-2xl mx-auto">
          {filtered.map((post: any) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
