import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  photos: string[];
  onChange: (photos: string[]) => void;
  cycleId: string;
  label?: string;
}

export default function PhotoUpload({ photos, onChange, cycleId, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for private bucket paths
  useEffect(() => {
    const paths = photos.filter(p => !p.startsWith("http") && !p.startsWith("blob:"));
    if (paths.length === 0) return;
    Promise.all(
      paths.map(async (path) => {
        const { data } = await supabase.storage.from("cycle-media").createSignedUrl(path, 3600);
        return { path, url: data?.signedUrl ?? "" };
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach((r) => { if (r.url) map[r.path] = r.url; });
      setSignedUrls(prev => ({ ...prev, ...map }));
    });
  }, [photos]);

  const getDisplayUrl = (photo: string): string => {
    if (photo.startsWith("http") || photo.startsWith("blob:")) return photo;
    return signedUrls[photo] || "";
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPaths: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `roguing/${cycleId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("cycle-media").upload(path, file, { upsert: false });
        if (error) throw error;
        newPaths.push(path);
      }
      onChange([...photos, ...newPaths]);
      toast.success(`${newPaths.length} foto(s) adicionada(s)`);
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
          {label ?? "📷 Adicionar fotos"}
        </Button>
        {photos.length > 0 && <span className="text-xs text-muted-foreground">{photos.length} foto(s)</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => {
            const url = getDisplayUrl(photo);
            return (
              <div key={i} className="relative group w-16 h-16 rounded overflow-hidden border">
                {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted animate-pulse" />}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
