import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callLovableAI(messages: any[], apiKey: string) {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
}

async function callGeminiDirect(messages: any[], apiKey: string) {
  const systemMsg = messages.find((m: any) => m.role === "system");
  const userMsg = messages.find((m: any) => m.role === "user");
  const contents = [];
  if (systemMsg) contents.push({ role: "user", parts: [{ text: `[Instrução do sistema]: ${systemMsg.content}` }] });
  if (systemMsg) contents.push({ role: "model", parts: [{ text: "Entendido." }] });
  if (userMsg) contents.push({ role: "user", parts: [{ text: userMsg.content }] });

  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, tipo } = await req.json();
    if (!text) throw new Error("No text provided");

    const systemPrompt = `Você é um especialista em análise de contratos de produção de milho híbrido e beneficiamento de sementes.
Analise o texto do contrato fornecido e extraia os dados comerciais principais em formato estruturado.

Retorne APENAS o JSON com os seguintes campos (use null se não encontrar):
{
  "titulo": "título/objeto do contrato",
  "numero_contrato": "número do contrato",
  "contratante": "nome da empresa contratante",
  "contratado": "nome da empresa contratada",
  "tipo": "producao_campo" ou "beneficiamento",
  "hibrido": "nome do híbrido",
  "safra": "safra (ex: 2025/2026)",
  "data_inicio": "YYYY-MM-DD",
  "data_fim": "YYYY-MM-DD",
  "area_ha": número em hectares,
  "volume_sacos": número de sacos,
  "preco_por_ha": preço por hectare em R$,
  "preco_por_saco": preço por saco em R$,
  "valor_total": valor total do contrato em R$,
  "clausulas_importantes": ["lista de cláusulas relevantes resumidas"],
  "condicoes_pagamento": "condições de pagamento",
  "penalidades": "penalidades por descumprimento",
  "observacoes_gerais": "observações importantes"
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analise este contrato de ${tipo === 'beneficiamento' ? 'beneficiamento de sementes' : 'produção de campo de milho híbrido'}:\n\n${text}` },
    ];

    let content = "";

    // Try Lovable AI first
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let usedFallback = false;

    if (LOVABLE_API_KEY) {
      const response = await callLovableAI(messages, LOVABLE_API_KEY);
      if (response.ok) {
        const data = await response.json();
        content = data.choices?.[0]?.message?.content || "";
      } else if (response.status === 402 || response.status === 429) {
        await response.text();
        usedFallback = true;
      } else {
        await response.text();
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }

    if (usedFallback || !content) {
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("Nenhuma chave de IA disponível");

      const geminiResp = await callGeminiDirect(messages, GOOGLE_AI_API_KEY);
      if (!geminiResp.ok) {
        const t = await geminiResp.text();
        console.error("Gemini error:", geminiResp.status, t);
        throw new Error("Erro ao analisar contrato via Gemini");
      }
      const geminiData = await geminiResp.json();
      content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { raw_response: content };
    }

    return new Response(JSON.stringify({ dados: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-contrato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
