/**
 * AI analysis via direct Anthropic API call from the browser.
 * Uses VITE_ANTHROPIC_API_KEY (available at build time in the frontend).
 */
import { toast } from "sonner";

export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    toast.error("API key da Anthropic não configurada nas variáveis de ambiente");
    throw new Error("API key não configurada");
  }

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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Erro API Anthropic:", response.status, errorData);
    const msg = errorData?.error?.message || `Erro ${response.status}`;
    toast.error("Erro na análise: " + msg);
    throw new Error(msg);
  }

  const result = await response.json();
  return result.content?.[0]?.text || "";
}
