import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  html: string;
  images: string[];
}

export default function WordPreview({ html, images }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Rendered HTML content */}
      <div
        className="prose prose-sm max-w-none dark:prose-invert bg-background p-6 rounded-lg border leading-relaxed
          [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
          [&_th]:bg-muted [&_th]:p-2 [&_th]:border [&_th]:border-border [&_th]:text-left [&_th]:font-semibold
          [&_td]:p-2 [&_td]:border [&_td]:border-border
          [&_tr:nth-child(even)]:bg-muted/30
          [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:max-h-96 [&_img]:object-contain [&_img]:cursor-pointer"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === "IMG") setLightbox((target as HTMLImageElement).src);
        }}
      />

      {/* Image gallery from Word */}
      {images.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Imagens do Documento</h4>
          <div className={`grid gap-4 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`Imagem ${i + 1}`}
                className="rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow max-h-96 w-full object-contain"
                onClick={() => setLightbox(src)}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightbox && <img src={lightbox} alt="Visualização" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
