/**
 * Direct browser call to Anthropic API using VITE_ANTHROPIC_API_KEY.
 * No edge functions, no Supabase secrets.
 */
export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048,
): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || "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";
  if (!apiKey) {
    throw new Error("API key da Anthropic não configurada (VITE_ANTHROPIC_API_KEY)");
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
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro na API Anthropic (${response.status})`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}
