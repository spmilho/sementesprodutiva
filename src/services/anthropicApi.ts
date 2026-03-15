import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const getAnthropicKey = async (): Promise<string | null> => {
  // 1. Try env var first
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (envKey && envKey.startsWith('sk-ant-')) {
    console.log("Key encontrada via env var");
    return envKey;
  }

  // 2. Try from database
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("User:", user?.id);

    if (!user) {
      console.log("Sem usuário logado");
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();
    console.log("Profile org_id:", profile?.org_id);

    if (!profile?.org_id) {
      const { data: anySettings } = await (supabase as any)
        .from('organization_settings')
        .select('anthropic_api_key')
        .not('anthropic_api_key', 'is', null)
        .limit(1)
        .single();
      console.log("Settings sem filtro:", anySettings);
      if (anySettings?.anthropic_api_key) {
        return anySettings.anthropic_api_key;
      }
      return null;
    }

    const { data: settings, error } = await (supabase as any)
      .from('organization_settings')
      .select('anthropic_api_key')
      .eq('org_id', profile.org_id)
      .single();
    console.log("Settings:", settings, "Error:", error);

    if (settings?.anthropic_api_key) {
      return settings.anthropic_api_key;
    }

    // Fallback: any record with a key
    const { data: fallbackSettings } = await (supabase as any)
      .from('organization_settings')
      .select('anthropic_api_key')
      .not('anthropic_api_key', 'is', null)
      .limit(1)
      .single();
    console.log("Fallback settings:", fallbackSettings);

    if (fallbackSettings?.anthropic_api_key) {
      return fallbackSettings.anthropic_api_key;
    }
  } catch (e) {
    console.error("Erro buscando key:", e);
  }

  console.log("Nenhuma key encontrada");
  return null;
};

export const callClaude = async (
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 1500
): Promise<string> => {
  const apiKey = await getAnthropicKey();

  if (!apiKey) {
    toast.error("API key da Anthropic não configurada. Vá em Configurações → Organização.");
    throw new Error("API key não configurada");
  }

  console.log("Chamando Claude com key:", apiKey.substring(0, 15) + "...");

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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("Erro API Anthropic:", response.status, err);
    const msg =
      response.status === 401
        ? "API key inválida. Verifique a chave em Configurações."
        : response.status === 429
          ? "Limite de requisições atingido. Verifique seus créditos em console.anthropic.com"
          : `Erro ${response.status}: ${err?.error?.message || "desconhecido"}`;
    toast.error(msg);
    throw new Error(msg);
  }

  const data = await response.json();
  return data.content[0].text;
};
