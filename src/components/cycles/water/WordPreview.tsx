import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

interface Props {
  images: string[];
}

export default function WordPreview({ images }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 py-2">
        <ImageIcon className="h-3.5 w-3.5" /> Nenhuma imagem encontrada no documento
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{images.length} imagem(ns) extraída(s)</p>
      <div className={`grid gap-3 ${images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Imagem ${i + 1}`}
            className="rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow max-h-80 w-full object-contain bg-muted/30"
            onClick={() => setLightbox(src)}
          />
        ))}
      </div>

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightbox && <img src={lightbox} alt="Visualização" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}