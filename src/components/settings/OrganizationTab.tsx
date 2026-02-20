import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizationTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("org_id").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const orgId = profile?.org_id;

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; logo_url: string | null; slogan: string | null };
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (org) {
      setName(org.name);
      setSlogan(org.slogan || "");
      setLogoPreview(org.logo_url);
    }
  }, [org]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Org not found");
      let logoUrl = org?.logo_url || null;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${orgId}/logo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("org-assets")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("org-assets").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }

      const { error } = await (supabase as any)
        .from("organizations")
        .update({ name, slogan, logo_url: logoUrl })
        .eq("id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setLogoFile(null);
      toast.success("Organização atualizada!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Dados da Organização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label>Nome da Organização</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-muted" />
            ) : (
              <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                Sem logo
              </div>
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Upload className="h-4 w-4" /> Alterar logo
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Slogan / Tagline</Label>
          <Input
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Aparece no rodapé do relatório"
          />
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
}
