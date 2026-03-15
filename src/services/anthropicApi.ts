import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const getAnthropicKey = async (): Promise<string | null> => {
  // 1. Try from database (organization_settings)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (profile?.org_id) {
        const { data: settings } = await (supabase as any)
          .from("organization_settings")
          .select("anthropic_api_key")
          .eq("org_id", profile.org_id)
          .single();

        if (settings?.anthropic_api_key) {
          return settings.anthropic_api_key;
        }
      }
    }
  } catch (e) {
    console.log("Key não encontrada no banco, tentando env var...");
  }

  // 2. Try VITE env var (available at build time in frontend)
  const envKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (envKey && envKey.startsWith("sk-ant-")) return envKey;

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
