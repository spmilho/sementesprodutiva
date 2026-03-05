import { useState } from "react";
import { useFeedPermission } from "@/hooks/useFeedPermission";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Loader2 } from "lucide-react";
import FeedTimeline from "@/components/feed/FeedTimeline";
import FeedCreatePost from "@/components/feed/FeedCreatePost";
import FeedMyPosts from "@/components/feed/FeedMyPosts";
import FeedAdminPanel from "@/components/feed/FeedAdminPanel";
import FeedNotifications from "@/components/feed/FeedNotifications";

export default function FeedCampo() {
  const { hasAccess, canPost, isFeedAdmin, loading, isBanned } = useFeedPermission();
  const { user } = useAuth();
  const [tab, setTab] = useState("feed");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/40" />
        <h2 className="text-xl font-semibold text-foreground">Acesso restrito</h2>
        <p className="text-muted-foreground max-w-md">
          {isBanned
            ? "Seu acesso ao Feed de Campo foi suspenso. Entre em contato com o administrador."
            : "Você não possui permissão para acessar o Feed de Campo. Solicite acesso a um administrador do feed."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feed de Campo</h1>
        <p className="text-sm text-muted-foreground">Compartilhe fotos e atualizações da produção</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="meus">Meus Posts</TabsTrigger>
          {canPost && <TabsTrigger value="novo">Novo Post</TabsTrigger>}
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          {isFeedAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="feed"><FeedTimeline /></TabsContent>
        <TabsContent value="meus"><FeedMyPosts userId={user!.id} /></TabsContent>
        {canPost && (
          <TabsContent value="novo">
            <FeedCreatePost onCreated={() => setTab("feed")} />
          </TabsContent>
        )}
        <TabsContent value="notificacoes"><FeedNotifications /></TabsContent>
        {isFeedAdmin && <TabsContent value="admin"><FeedAdminPanel /></TabsContent>}
      </Tabs>
    </div>
  );
}
