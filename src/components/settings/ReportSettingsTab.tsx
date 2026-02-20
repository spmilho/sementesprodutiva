import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ReportSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [footerText, setFooterText] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("org_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.org_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["org-settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("organization_settings")
        .select("*")
        .eq("org_id", orgId)
        .maybeSingle();
      return data as { id?: string; report_logo_url?: string; report_cover_url?: string; report_footer_text?: string } | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setFooterText(settings.report_footer_text || "");
      setLogoPreview(settings.report_logo_url || null);
      setCoverPreview(settings.report_cover_url || null);
    }
  }, [settings]);

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (u: string) => void,
    maxMb: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Arquivo deve ter no máximo ${maxMb}MB`);
      return;
    }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Org not found");
      let logoUrl = settings?.report_logo_url || null;
      let coverUrl = settings?.report_cover_url || null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${orgId}/report-logo.${ext}`;
        await supabase.storage.from("org-assets").upload(path, logoFile, { upsert: true });
        logoUrl = supabase.storage.from("org-assets").getPublicUrl(path).data.publicUrl;
      }

      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${orgId}/report-cover.${ext}`;
        await supabase.storage.from("org-assets").upload(path, coverFile, { upsert: true });
        coverUrl = supabase.storage.from("org-assets").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        org_id: orgId,
        report_logo_url: logoUrl,
        report_cover_url: coverUrl,
        report_footer_text: footerText,
      };

      if (settings?.id) {
        const { error } = await (supabase as any).from("organization_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("organization_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      setLogoFile(null);
      setCoverFile(null);
      toast.success("Configurações de relatório salvas!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Personalizar Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo branca */}
            <div className="space-y-2">
              <Label>Logo branca (PNG transparente, max 2MB)</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="h-16 w-32 rounded-lg border bg-slate-800 flex items-center justify-center p-2">
                    <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-16 w-32 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem logo</div>
                )}
                <label className="cursor-pointer text-sm text-primary hover:underline flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Upload
                  <input type="file" accept="image/png" className="hidden" onChange={(e) => handleFile(e, setLogoFile, setLogoPreview, 2)} />
                </label>
              </div>
            </div>

            {/* Foto de capa */}
            <div className="space-y-2">
              <Label>Foto de capa (JPG/PNG, max 5MB)</Label>
              <div className="flex items-center gap-4">
                {coverPreview ? (
                  <img src={coverPreview} alt="Capa" className="h-16 w-28 rounded-lg border object-cover" />
                ) : (
                  <div className="h-16 w-28 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem capa</div>
                )}
                <label className="cursor-pointer text-sm text-primary hover:underline flex items-center gap-1">
                  <Upload className="h-4 w-4" /> Upload
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFile(e, setCoverFile, setCoverPreview, 5)} />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <Label>Texto do rodapé</Label>
            <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Ex: Produtiva Sementes — Caderno de Campo" />
          </div>

          {/* Preview miniatura */}
          <div className="space-y-2">
            <Label>Preview da capa</Label>
            <div className="w-[300px] aspect-[210/297] rounded-lg border overflow-hidden relative bg-slate-900">
              {coverPreview && (
                <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                {logoPreview && (
                  <img src={logoPreview} alt="" className="h-10 mb-3 object-contain" />
                )}
                <div className="text-[8px] font-medium opacity-80 mt-auto">{footerText}</div>
              </div>
            </div>
          </div>

          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
