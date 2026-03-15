/**
 * AI analysis via Lovable AI (edge function).
 * Replaces direct Anthropic browser calls.
 */
import { supabase } from "@/integrations/supabase/client";

export async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2048,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-analysis", {
    body: { systemPrompt, userPrompt, maxTokens },
  });

  if (error) {
    throw new Error(error.message || "Erro ao chamar a IA");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data?.text || "";
}
