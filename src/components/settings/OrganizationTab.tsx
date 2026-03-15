import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Upload, Building2, Eye, EyeOff, Key, Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import { callClaude } from "@/services/anthropicApi";

export default function OrganizationTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiStatus, setApiStatus] = useState<"untested" | "connected" | "error">("untested");
  const [testingApi, setTestingApi] = useState(false);

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

  const { data: settings } = useQuery({
    queryKey: ["org-settings", orgId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("organization_settings")
        .select("*")
        .eq("org_id", orgId)
        .single();
      return data as { id: string; anthropic_api_key: string | null } | null;
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

  useEffect(() => {
    if (settings?.anthropic_api_key) {
      setApiKey(settings.anthropic_api_key);
      // Auto-test silently
      setApiStatus("untested");
      callClaude("Responda apenas: OK", "teste", 10)
        .then(() => setApiStatus("connected"))
        .catch(() => setApiStatus("error"));
    }
  }, [settings]);

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

  const saveApiKeyMut = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Org not found");
      if (settings?.id) {
        const { error } = await (supabase as any)
          .from("organization_settings")
          .update({ anthropic_api_key: apiKey || null })
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("organization_settings")
          .insert({ org_id: orgId, anthropic_api_key: apiKey || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      toast.success("API Key salva!");
      setApiStatus("untested");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const handleTestApi = async () => {
    if (!apiKey || !apiKey.startsWith("sk-ant-")) {
      toast.error("Cole uma API key válida (começa com sk-ant-)");
      return;
    }
    setTestingApi(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 50,
          messages: [{ role: "user", content: "Responda apenas: OK" }],
        }),
      });
      if (response.ok) {
        setApiStatus("connected");
        toast.success("✅ Conexão OK!");
      } else {
        const err = await response.json().catch(() => ({}));
        setApiStatus("error");
        toast.error("❌ " + (err?.error?.message || "Erro " + response.status));
      }
    } catch (err: any) {
      setApiStatus("error");
      toast.error("❌ Erro de conexão");
    } finally {
      setTestingApi(false);
    }
  };

  if (isLoading) return <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> 🔑 Análise Avançada de Campo
            {apiStatus === "connected" && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> API conectada
              </span>
            )}
            {apiStatus === "error" && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-destructive">
                <XCircle className="h-3.5 w-3.5" /> API desconectada
              </span>
            )}
            {apiStatus === "untested" && apiKey && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-yellow-600">
                <MinusCircle className="h-3.5 w-3.5" /> Não testada
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>API Key para análises (Anthropic Claude)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setApiStatus("untested"); }}
                  placeholder="sk-ant-api03-..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha em{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                console.anthropic.com
              </a>
              . Custo: ~$0.003 por análise.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestApi}
              disabled={testingApi || !apiKey}
            >
              {testingApi ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Testar
            </Button>
            <Button
              size="sm"
              onClick={() => saveApiKeyMut.mutate()}
              disabled={saveApiKeyMut.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {saveApiKeyMut.isPending ? "Salvando..." : "Salvar Key"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}