import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise este contrato de ${tipo === 'beneficiamento' ? 'beneficiamento de sementes' : 'produção de campo de milho híbrido'}:\n\n${text}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Tente novamente mais tarde." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

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
