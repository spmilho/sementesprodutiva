import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfBase64, tipo } = await req.json();
    if (!pdfBase64) throw new Error("pdfBase64 is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em análise de contratos de produção de milho híbrido e beneficiamento de sementes.
Analise o documento do contrato fornecido e extraia os dados comerciais principais em formato estruturado.

Retorne APENAS o JSON válido com os seguintes campos (use null se não encontrar):
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
  "tabela_precos": [{"faixa": "descrição da faixa de volume/área/produtividade", "preco": valor numérico, "unidade": "R$/sc ou R$/ha ou R$/kg", "observacao": "condição ou observação se houver"}],
  "clausulas_importantes": ["lista de cláusulas relevantes resumidas"],
  "condicoes_pagamento": "condições de pagamento",
  "penalidades": "penalidades por descumprimento",
  "observacoes_gerais": "observações importantes"
}

IMPORTANTE: Se o contrato tiver tabela de preços escalonada/por faixa (ex: diferentes preços para diferentes faixas de produtividade, volume ou área), extraia TODOS os itens na "tabela_precos". Se não houver tabela escalonada, retorne tabela_precos como array vazio [].`;

    const userPrompt = `Analise este contrato de ${tipo === 'beneficiamento' ? 'beneficiamento de sementes' : 'produção de campo de milho híbrido'} e extraia todos os dados. O documento está anexado como PDF.`;

    // Use Gemini vision via Lovable AI Gateway
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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: content };
    } catch {
      parsed = { raw_response: content };
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-contrato error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
