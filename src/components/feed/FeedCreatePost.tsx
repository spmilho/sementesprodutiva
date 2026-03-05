import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

const STAGES = ["Plantio", "Despendoamento", "Roguing", "Pragas", "Colheita", "UBS", "Qualidade", "Logística"];

interface Props {
  onCreated: () => void;
}

export default function FeedCreatePost({ onCreated }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [caption, setCaption] = useState("");
  const [stage, setStage] = useState("");
  const [safra, setSafra] = useState("");
  const [fazenda, setFazenda] = useState("");
  const [pivo, setPivo] = useState("");
  const [talhao, setTalhao] = useState("");
  const [hibrido, setHibrido] = useState("");
  const [locationText, setLocationText] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? []);
    if (files.length + newFiles.length > 10) {
      toast.error("Máximo de 10 arquivos por post");
      return;
    }
    setFiles((f) => [...f, ...newFiles]);
    newFiles.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => setPreviews((p) => [...p, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const getLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Localização capturada!");
      },
      () => toast.error("Não foi possível obter localização")
    );
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsStr
        .split(/[,#\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      // 1. Create post
      const { data: post, error } = await (supabase as any)
        .from("feed_posts")
        .insert({
          author_user_id: user!.id,
          caption: caption.trim() || null,
          stage: stage || null,
          safra: safra || null,
          fazenda: fazenda || null,
          pivo: pivo || null,
          talhao: talhao || null,
          hibrido: hibrido || null,
          tags,
          location_text: locationText || null,
          gps_lat: gps?.lat ?? null,
          gps_lng: gps?.lng ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // 2. Upload media
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const path = `${post.id}/${Date.now()}_${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("feed-media")
          .upload(path, file, { contentType: file.type });

        if (upErr) {
          console.error("Upload error:", upErr);
          continue;
        }

        const { data: urlData } = supabase.storage.from("feed-media").getPublicUrl(path);

        await (supabase as any).from("feed_media").insert({
          post_id: post.id,
          media_url: urlData.publicUrl,
          media_type: file.type.startsWith("video") ? "video" : "image",
          order_index: i,
        });
      }

      return post;
    },
    onSuccess: () => {
      toast.success("Post publicado!");
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      // Reset
      setCaption("");
      setStage("");
      setSafra("");
      setFazenda("");
      setPivo("");
      setTalhao("");
      setHibrido("");
      setLocationText("");
      setTagsStr("");
      setFiles([]);
      setPreviews([]);
      setGps(null);
      onCreated();
    },
    onError: (err: any) => {
      toast.error("Erro ao publicar: " + (err?.message ?? "Erro desconhecido"));
    },
  });

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Novo Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Media upload */}
        <div>
          <Label>Fotos / Vídeos (máx. 10)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {previews.map((p, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                  onClick={() => removeFile(i)}
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            <button
              className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
        </div>

        <div>
          <Label>Legenda</Label>
          <Textarea
            placeholder="O que está acontecendo no campo?"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Etapa</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Safra</Label>
            <Input placeholder="Ex: 2025/26" value={safra} onChange={(e) => setSafra(e.target.value)} />
          </div>
          <div>
            <Label>Fazenda</Label>
            <Input placeholder="Nome da fazenda" value={fazenda} onChange={(e) => setFazenda(e.target.value)} />
          </div>
          <div>
            <Label>Pivô</Label>
            <Input placeholder="Ex: Pivô 08" value={pivo} onChange={(e) => setPivo(e.target.value)} />
          </div>
          <div>
            <Label>Talhão</Label>
            <Input placeholder="Ex: T-03" value={talhao} onChange={(e) => setTalhao(e.target.value)} />
          </div>
          <div>
            <Label>Híbrido</Label>
            <Input placeholder="Ex: XB 8010" value={hibrido} onChange={(e) => setHibrido(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Tags (separadas por vírgula ou #)</Label>
          <Input placeholder="#granizo, #lagarta, #umidade" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Local manual</Label>
            <Input placeholder="Ex: Pivô 08 - Setor Norte" value={locationText} onChange={(e) => setLocationText(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={getLocation} title="Capturar GPS">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
        {gps && (
          <p className="text-xs text-muted-foreground">📍 {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}</p>
        )}

        <Button
          className="w-full"
          disabled={createMutation.isPending || (files.length === 0 && !caption.trim())}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Publicar
        </Button>
      </CardContent>
    </Card>
  );
}
