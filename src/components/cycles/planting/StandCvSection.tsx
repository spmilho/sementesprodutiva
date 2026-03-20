import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sprout, Pencil, Plus, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCvLabel } from "./planting-utils";

interface Props {
  cycleId: string;
  orgId: string;
  femaleMaleRatio: string;
}

function parseMaleCount(ratio: string): number {
  const match = ratio.match(/(\d+)\s*M/i);
  return match ? parseInt(match[1], 10) : 1;
}

function getAvailableTypes(ratio: string) {
  const maleCount = parseMaleCount(ratio);
  const types = [{ value: "female", label: "Fêmea", badge: "F" }];
  types.push({ value: "male_1", label: "Macho 1", badge: "M1" });
  if (maleCount >= 2) types.push({ value: "male_2", label: "Macho 2", badge: "M2" });
  return types;
}

export default function StandCvSection({ cycleId, orgId, femaleMaleRatio }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [cvValue, setCvValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plantasPorMetro, setPlantasPorMetro] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const availableTypes = getAvailableTypes(femaleMaleRatio);

  const { data: cvRecords = [] } = useQuery({
    queryKey: ["stand_cv_records", cycleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stand_cv_records")
        .select("*")
        .eq("cycle_id", cycleId)
        .is("deleted_at", null)
        .order("type");
      if (error) throw error;
      return data as any[];
    },
  });

  // Generate signed URLs for photos stored as paths
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const paths = cvRecords
      .filter((r: any) => r.photo_url && !r.photo_url.startsWith("http"))
      .map((r: any) => r.photo_url);
    if (paths.length === 0) return;

    Promise.all(
      paths.map(async (path: string) => {
        const { data } = await supabase.storage.from("cycle-documents").createSignedUrl(path, 3600);
        return { path, url: data?.signedUrl ?? "" };
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach((r) => { if (r.url) map[r.path] = r.url; });
      setSignedUrls(map);
    });
  }, [cvRecords]);

  const getPhotoUrl = (record: any): string | null => {
    if (!record.photo_url) return null;
    if (record.photo_url.startsWith("http")) return record.photo_url;
    return signedUrls[record.photo_url] || null;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Foto deve ter no máximo 10MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    setUploading(true);
    try {
      const ext = photoFile.name.split(".").pop();
      const path = `${orgId}/${cycleId}/stand_cv_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("cycle-documents").upload(path, photoFile);
      if (error) throw error;
      // Store the path, not public URL (bucket is private)
      return path;
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const val = parseFloat(cvValue);
      if (isNaN(val) || val < 0) throw new Error("CV% inválido");
      if (!selectedType) throw new Error("Selecione o tipo");

      const photoUrl = await uploadPhoto();

      const ppm = plantasPorMetro ? parseFloat(plantasPorMetro) : null;

      const row: any = {
        cycle_id: cycleId,
        org_id: orgId,
        type: selectedType,
        cv_percent: val,
        plantas_por_metro: ppm,
        recorded_date: new Date().toISOString().split("T")[0],
      };
      if (photoUrl) row.photo_url = photoUrl;

      if (editingId) {
        const updateData: any = { cv_percent: val, plantas_por_metro: ppm };
        if (photoUrl) updateData.photo_url = photoUrl;
        const { error } = await (supabase as any)
          .from("stand_cv_records")
          .update(updateData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const existing = cvRecords.find((r: any) => r.type === selectedType);
        if (existing) {
          const updateData: any = { cv_percent: val, plantas_por_metro: ppm };
          if (photoUrl) updateData.photo_url = photoUrl;
          const { error } = await (supabase as any)
            .from("stand_cv_records")
            .update(updateData)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("stand_cv_records")
            .insert(row);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stand_cv_records", cycleId] });
      toast.success("CV% de stand final registrado com sucesso");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setEditingId(null);
    setCvValue("");
    setPlantasPorMetro("");
    setSelectedType("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (record: any) => {
    setEditingId(record.id);
    setSelectedType(record.type);
    setCvValue(String(record.cv_percent));
    setPlantasPorMetro(record.plantas_por_metro != null ? String(record.plantas_por_metro) : "");
    setPhotoFile(null);
    const url = getPhotoUrl(record);
    setPhotoPreview(url || null);
    setDialogOpen(true);
  };

  const cvVal = cvValue ? parseFloat(cvValue) : null;
  const preview = cvVal != null && !isNaN(cvVal) && cvVal >= 0 ? getCvLabel(cvVal) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sprout className="h-4 w-4" /> Stand Final de Plantas
        </h4>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Registrar CV%
        </Button>
      </div>

      {cvRecords.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableTypes.map((t) => {
            const record = cvRecords.find((r: any) => r.type === t.value);
            if (!record) {
              return (
                <Card key={t.value} className="border-dashed">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[80px]">
                    <p className="text-xs text-muted-foreground mb-2">{t.label}</p>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedType(t.value); setCvValue(""); setPlantasPorMetro(""); setEditingId(null); setPhotoFile(null); setPhotoPreview(null); setDialogOpen(true); }}>
                      + Registrar
                    </Button>
                  </CardContent>
                </Card>
              );
            }
            const label = getCvLabel(record.cv_percent);
            return (
              <Card key={t.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(record)}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{Number(record.cv_percent).toFixed(1)}%</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", label.bg)}>{label.emoji} {label.label}</span>
                  </div>
                  {record.plantas_por_metro != null && (
                    <p className="text-xs text-muted-foreground">{Number(record.plantas_por_metro).toFixed(1)} pl/m</p>
                  )}
                  {(() => {
                    const url = getPhotoUrl(record);
                    return url ? (
                      <div className="mt-2">
                        <img src={url} alt="Foto stand" className="h-16 w-auto rounded object-cover" />
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
          Nenhum CV% de stand final registrado. Clique em "Registrar CV%" para adicionar.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Registrar"} CV% de Stand Final</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Parental</Label>
              <Select value={selectedType} onValueChange={setSelectedType} disabled={!!editingId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stand Final (plantas por metro)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 5.2"
                value={plantasPorMetro}
                onChange={(e) => setPlantasPorMetro(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CV% (valor calculado externamente)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 18.5"
                value={cvValue}
                onChange={(e) => setCvValue(e.target.value)}
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-1.5">
              <Label>Foto (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
              {photoPreview ? (
                <div className="relative inline-block">
                  <img src={photoPreview} alt="Preview" className="h-24 rounded object-cover" />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" /> Inserir foto
                </Button>
              )}
            </div>

            {preview && (
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium", preview.bg)}>
                <span className="text-lg">{preview.emoji}</span>
                <span>{preview.label}</span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>🟢 &lt; 20%: Excelente</p>
              <p>🟡 20–25%: Bom</p>
              <p>🟠 25–30%: Aceitável</p>
              <p>🔴 &gt; 30%: Insatisfatório</p>
            </div>
            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading || !selectedType || !cvValue}
            >
              {saveMutation.isPending || uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
              ) : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
