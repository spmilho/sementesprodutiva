import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callLovableAI(messages: any[], apiKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  return response;
}

async function callClaude(messages: any[], apiKey: string) {
  const systemMsg = messages.find((m: any) => m.role === "system");
  const userMsg = messages.find((m: any) => m.role === "user");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemMsg?.content || "",
      messages: [{ role: "user", content: userMsg?.content || "" }],
    }),
  });
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ndviData, plantingDate, phenologyStage, pivotName, hybridName, filterStartDate } = await req.json();

    // Calculate DAP
    let dap: number | null = null;
    if (plantingDate) {
      const plantDate = new Date(plantingDate);
      const now = new Date();
      dap = Math.floor((now.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const currentNdvi = ndviData?.currentMean ?? null;
    const previousNdvi = ndviData?.previousMean ?? null;
    const trend = currentNdvi != null && previousNdvi != null ? currentNdvi - previousNdvi : null;
    const totalImages = ndviData?.totalImages ?? 0;
    const cleanImages = ndviData?.cleanImages ?? 0;
    const cloudyImages = totalImages - cleanImages;

    const systemPrompt = `Você é um ENGENHEIRO AGRÔNOMO experiente em produção de sementes de milho híbrido redigindo um parecer técnico de monitoramento de campo via satélite.

Tom: técnico, direto, objetivo. Sem mencionar que você é uma IA ou modelo de linguagem. Nunca diga "como IA", "minha análise como modelo", ou similares. Escreva em primeira pessoa do singular como se fosse o agrônomo responsável pelo monitoramento.

Exemplo: "O campo apresenta..." ou "Recomendo verificar..."
NÃO: "Com base nos dados fornecidos, esta análise indica..."

Estruture o parecer EXATAMENTE assim (use os emojis indicados):

1. Primeiro parágrafo: SITUAÇÃO ATUAL (2-3 frases: NDVI + estádio + o que isso significa agronomicamente)

2. "✅ Situação normal:" ou "⚠️ Pontos de atenção:" (lista com hifens, 2-4 itens)

3. "📋 Observações:" (lista com hifens, 2-3 itens sobre qualidade dos dados, nuvens, confiabilidade)

4. "📈 Perspectiva:" (1-2 frases sobre o que esperar nas próximas semanas)

Faixas de referência NDVI para milho:
- VE-V4: 0.10-0.30 (solo exposto domina)
- V6-V8: 0.30-0.50 (dossel fechando)
- V10-V12: 0.50-0.70 (crescimento vegetativo)
- VT-R1: 0.70-0.90 (pico vegetativo)
- R3-R5: 0.60-0.80 (enchimento de grão)
- R6: 0.40-0.60 (senescência)

Seja específico com números. Não invente dados que não foram fornecidos.`;

    const userPrompt = `Dados do campo "${pivotName}"${hybridName ? ` (híbrido: ${hybridName})` : ""}:

- NDVI atual: ${currentNdvi != null ? currentNdvi.toFixed(3) : "não disponível"}
- NDVI anterior: ${previousNdvi != null ? previousNdvi.toFixed(3) : "não disponível"}
- Tendência: ${trend != null ? (trend > 0 ? `+${trend.toFixed(3)} (subindo)` : `${trend.toFixed(3)} (descendo)`) : "não calculável"}
- Estádio fenológico registrado: ${phenologyStage || "não registrado"}
- Data do plantio: ${plantingDate || "não registrada"}
- DAP (dias após plantio): ${dap != null ? dap : "não calculável"}
- Total de capturas no período: ${totalImages}
- Capturas limpas (sem nuvem): ${cleanImages}
- Capturas descartadas por nuvem: ${cloudyImages}
- Período de análise iniciando em: ${filterStartDate || "todas as imagens"}
- NDVI mínimo no período: ${ndviData?.minMean != null ? ndviData.minMean.toFixed(3) : "—"}
- NDVI máximo no período: ${ndviData?.maxMean != null ? ndviData.maxMean.toFixed(3) : "—"}

Redija o parecer técnico de monitoramento.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    let analysisText = "";

    // Try Lovable AI first
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let usedFallback = false;

    if (LOVABLE_API_KEY) {
      const response = await callLovableAI(messages, LOVABLE_API_KEY);
      if (response.ok) {
        const data = await response.json();
        analysisText = data.choices?.[0]?.message?.content || "";
      } else if (response.status === 402 || response.status === 429) {
        await response.text();
        usedFallback = true;
      } else {
        const t = await response.text();
        console.error("Lovable AI error:", response.status, t);
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    // Fallback to Gemini direct
    if (usedFallback || !analysisText) {
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("Nenhuma chave de IA disponível");

      const geminiResp = await callGeminiDirect(messages, GOOGLE_AI_API_KEY);
      if (!geminiResp.ok) {
        const t = await geminiResp.text();
        console.error("Gemini error:", geminiResp.status, t);
        throw new Error("Erro ao gerar análise via Gemini");
      }
      const geminiData = await geminiResp.json();
      analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar a análise.";
    }

    return new Response(JSON.stringify({
      analysis: analysisText,
      ndviValue: currentNdvi,
      growthStage: phenologyStage,
      dap,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ndvi-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
