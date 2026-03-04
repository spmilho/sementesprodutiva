import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Camera, X, ClipboardList, Loader2 } from "lucide-react";
import { SubitemDef, ScoreValue } from "./constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  subitem: SubitemDef;
  value?: ScoreValue;
  notes?: string;
  photos: { id: string; photo_url: string }[];
  onChange: (value: ScoreValue) => void;
  onNotesChange: (notes: string) => void;
  onOpenInstructions: () => void;
  scoreId?: string;
  visitId: string;
  orgId: string;
  onPhotoAdded: (photo: { id: string; photo_url: string }) => void;
  onPhotoRemoved: (photoId: string) => void;
}

const scoreButtons: { value: ScoreValue; label: string; emoji: string; bgSelected: string; bgUnselected: string }[] = [
  { value: "bom", label: "BOM", emoji: "🟢", bgSelected: "bg-green-600 text-white border-green-700", bgUnselected: "bg-green-50 text-green-800 border-green-300 hover:bg-green-100" },
  { value: "regular", label: "REGULAR", emoji: "🟡", bgSelected: "bg-yellow-500 text-white border-yellow-600", bgUnselected: "bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100" },
  { value: "ruim", label: "RUIM", emoji: "🔴", bgSelected: "bg-red-600 text-white border-red-700", bgUnselected: "bg-red-50 text-red-800 border-red-300 hover:bg-red-100" },
];

export default function ScoreCard({
  subitem, value, notes, photos, onChange, onNotesChange,
  onOpenInstructions, scoreId, visitId, orgId,
  onPhotoAdded, onPhotoRemoved,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !scoreId) return;
    if (photos.length >= 5) {
      toast.error("Máximo de 5 fotos por subitem");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 5 - photos.length)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Arquivo ${file.name} excede 10MB`);
          continue;
        }
        const ext = file.name.split(".").pop();
        const path = `${orgId}/${visitId}/${scoreId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("field-visit-photos").upload(path, file);
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("field-visit-photos").getPublicUrl(path);
        const { data: photoRow, error: insertErr } = await (supabase as any)
          .from("field_visit_photos")
          .insert({ org_id: orgId, visit_id: visitId, score_id: scoreId, photo_url: urlData.publicUrl })
          .select("id, photo_url")
          .single();
        if (insertErr) throw insertErr;
        onPhotoAdded(photoRow);
      }
    } catch (err: any) {
      toast.error("Erro ao enviar foto: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    await (supabase as any).from("field_visit_photos").delete().eq("id", photoId);
    onPhotoRemoved(photoId);
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: value === "bom" ? "#16a34a" : value === "regular" ? "#eab308" : value === "ruim" ? "#dc2626" : "#d1d5db" }}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-semibold text-base">{subitem.label}</h4>
            <span className="text-xs text-muted-foreground">Máx: {subitem.bom} pts</span>
          </div>
          <div className="flex items-center gap-2">
            {subitem.refBadge && (
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted" onClick={onOpenInstructions}>
                {subitem.refBadge}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onOpenInstructions}>
              <ClipboardList className="h-3.5 w-3.5" /> Ver Instruções
            </Button>
          </div>
        </div>

        {/* Score buttons */}
        <div className="grid grid-cols-3 gap-2">
          {scoreButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all font-semibold text-sm min-h-[64px] ${value === btn.value ? btn.bgSelected : btn.bgUnselected}`}
              onClick={() => onChange(btn.value)}
            >
              <span className="text-lg mb-0.5">{btn.emoji}</span>
              <span>{btn.label}</span>
              <span className="text-xs font-normal opacity-80">{subitem[btn.value]} pts</span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <Textarea
          placeholder="Observações (opcional)"
          value={notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
          className="text-sm min-h-[60px]"
        />

        {/* Photos */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={uploading || !scoreId || photos.length >= 5}
              />
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${uploading || !scoreId ? "opacity-50 cursor-not-allowed" : "hover:bg-muted cursor-pointer"}`}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                📷 Adicionar Foto
              </div>
            </label>
            <span className="text-xs text-muted-foreground">{photos.length}/5</span>
          </div>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <div key={p.id} className="relative group">
                  <img src={p.photo_url} alt="" className="w-full h-20 object-cover rounded-md border" />
                  <button
                    type="button"
                    className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemovePhoto(p.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
