import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { weatherData, plantingDate, phenologyStage, pivotName, hybridName } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Chave de análise não configurada");

    let dap: number | null = null;
    if (plantingDate) {
      const plantDate = new Date(plantingDate);
      const now = new Date();
      dap = Math.floor((now.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    const wd = weatherData || {};

    const systemPrompt = `Você é um ENGENHEIRO AGRÔNOMO experiente em produção de sementes de milho híbrido redigindo um parecer técnico de monitoramento climático do campo.

Tom: técnico, direto, objetivo. Sem mencionar que você é uma IA ou modelo de linguagem. Escreva em primeira pessoa do singular como se fosse o agrônomo responsável.

Estruture o parecer EXATAMENTE assim:

1. Primeiro parágrafo: SITUAÇÃO CLIMÁTICA ATUAL (2-3 frases resumindo temperatura, radiação solar e umidade do período e o que significam para o milho no estádio atual)

2. "🌡️ Temperatura:" (lista com hifens, 2-3 itens analisando médias, extremos, amplitude térmica e impacto no desenvolvimento)

3. "☀️ Radiação Solar:" (lista com hifens, 2-3 itens sobre média, variação e impacto na fotossíntese/enchimento de grão)

4. "💧 Umidade Relativa:" (lista com hifens, 2-3 itens sobre médias, extremos e risco de doenças foliares ou estresse)

5. "⚠️ Pontos de atenção:" ou "✅ Situação favorável:" (lista 2-4 itens sobre riscos ou condições positivas)

6. "📈 Impacto na produtividade:" (2-3 frases sobre como as condições climáticas recentes podem afetar a produtividade esperada do milho)

Referências agronômicas para milho:
- Temperatura ideal: 25-30°C (dia), 15-20°C (noite)
- Estresse por calor: >35°C (reduz polinização em VT-R1)
- Estresse por frio: <10°C (reduz crescimento)
- Amplitude térmica ideal: 8-12°C (favorece acúmulo de matéria seca)
- Radiação solar ideal: >18 MJ/m²/dia (fase reprodutiva)
- Radiação baixa: <14 MJ/m² (reduz fotossíntese e enchimento)
- Umidade relativa: 50-80% ideal
- UR >90% prolongada: risco de doenças foliares
- UR <40%: estresse hídrico atmosférico

Seja específico com números. Não invente dados.`;

    const userPrompt = `Dados climáticos do campo "${pivotName}"${hybridName ? ` (híbrido: ${hybridName})` : ""}:

- Período analisado: ${wd.totalDays || "?"} dias
- Estádio fenológico: ${phenologyStage || "não registrado"}
- DAP: ${dap != null ? dap : "não calculável"}
- Data do plantio: ${plantingDate || "não registrada"}

TEMPERATURA:
- Média geral: ${wd.avgTemp != null ? wd.avgTemp.toFixed(1) + "°C" : "—"}
- Máxima registrada: ${wd.maxTemp != null ? wd.maxTemp.toFixed(1) + "°C" : "—"}
- Mínima registrada: ${wd.minTemp != null ? wd.minTemp.toFixed(1) + "°C" : "—"}
- Dias com máxima >35°C: ${wd.daysAbove35 ?? "—"}
- Dias com mínima <10°C: ${wd.daysBelow10 ?? "—"}

RADIAÇÃO SOLAR:
- Média: ${wd.avgRadiation != null ? wd.avgRadiation.toFixed(1) + " MJ/m²" : "—"}
- Máxima: ${wd.maxRadiation != null ? wd.maxRadiation.toFixed(1) + " MJ/m²" : "—"}
- Mínima: ${wd.minRadiation != null ? wd.minRadiation.toFixed(1) + " MJ/m²" : "—"}
- Dias com radiação <14 MJ/m²: ${wd.daysLowRadiation ?? "—"}

UMIDADE RELATIVA:
- Média: ${wd.avgHumidity != null ? wd.avgHumidity.toFixed(0) + "%" : "—"}
- Máxima: ${wd.maxHumidity != null ? wd.maxHumidity.toFixed(0) + "%" : "—"}
- Mínima: ${wd.minHumidity != null ? wd.minHumidity.toFixed(0) + "%" : "—"}
- Dias com UR >90%: ${wd.daysHighHumidity ?? "—"}

GDU/HU:
- GDU acumulado total: ${wd.totalGdu ?? "—"}
- Precipitação total: ${wd.totalPrecip != null ? wd.totalPrecip.toFixed(1) + " mm" : "—"}
- ETo total: ${wd.totalEto != null ? wd.totalEto.toFixed(1) + " mm" : "—"}

Redija o parecer técnico de monitoramento climático e impacto na produtividade.`;

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
          { role: "user", content: userPrompt },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Contate o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      throw new Error("Erro ao gerar análise climática");
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

    return new Response(JSON.stringify({
      analysis: analysisText,
      growthStage: phenologyStage,
      dap,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weather-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
