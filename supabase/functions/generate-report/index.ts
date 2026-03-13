import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um engenheiro agrônomo especialista em produção de sementes de milho híbrido gerando um relatório técnico profissional.

Gere um HTML COMPLETO e autocontido (com CSS inline e gráficos em SVG inline).
O HTML deve ser um documento de página única, estilo scroll contínuo, pronto para impressão via Ctrl+P do navegador.

ESTILO DO RELATÓRIO:
- Estilo McKinsey/BCG: limpo, profissional, dados visuais
- Fundo branco, fonte Segoe UI ou system-ui
- Largura máxima 210mm (A4), centralizado, margin auto
- Cor primária: #1B5E20 (verde escuro)
- Cor secundária: #1E88E5 (azul)
- Cor acento: #FF9800 (laranja)

CSS PARA IMPRESSÃO:
Incluir @media print com:
- Sem margin body
- page-break-before em cada seção principal
- Ocultar elementos interativos
- @page { size: A4; margin: 15mm 12mm; }

ESTRUTURA DO HTML:

1. CAPA (primeira "página"):
   - Fundo gradiente verde escuro (#1B5E20 → #2E7D32)
   - "RELATÓRIO DE PRODUÇÃO" centralizado, branco, uppercase
   - Nome do híbrido grande (36px)
   - Safra, contrato, cliente, cooperado, fazenda, pivô, áreas
   - Logo da empresa se a URL for fornecida (usar <img src="URL">)
   - Data de geração

2. RESUMO EXECUTIVO:
   - Tabela de dados do ciclo (split, espaçamentos, ciclo, etc.)
   - KPI boxes em grid 3×2 com borda colorida (só os que têm dados)
   - Cada KPI: valor grande + subtexto + badge cor

3-N. UMA SEÇÃO POR MÓDULO QUE TENHA DADOS:
   Para cada módulo com array não vazio, gerar seção com:
   - Título com ícone emoji
   - Tabela HTML estilizada (header verde escuro, linhas alternadas)
   - Badges de cor para status/classificação
   - Gráficos em SVG inline quando relevante:
     * Barras para comparativos
     * Linhas para evolução temporal
     * Donut para distribuição
   - Subtotais e resumos em boxes destaque
   - FOTOS: se houver URLs de fotos, incluir <img src="URL" style="max-width:300px;border-radius:8px;margin:4px"> em grid de 2 colunas

SEÇÕES POSSÍVEIS (gerar SÓ se dados existirem no JSON):
- 🌱 Semente Básica e Tratamento (lotes + produtos TS com doses)
- 🚜 Plantio (planejado vs realizado + CV% + gráfico SVG acumulado)
- 🌾 Stand de Plantas (população + CV% + % emergência)
- 🧪 Manejo de Insumos (timeline por estádio + tabelas adubo e defensivo separadas)
- 🌿 Fenologia (estádios observados)
- 📡 NDVI (último parecer técnico + dados de NDVI)
- 🔄 Nicking (milestones + inspeções + observações em destaque)
- ✂️ Despendoamento (passadas + remanescente + NCs em box vermelho)
- 🌿 Roguing (registros de roguing)
- 🐛 Pragas e Doenças (severidade + incidência)
- 💧 Água (irrigação + chuva)
- 💦 Umidade de Grãos (por gleba + status)
- 📊 Estimativa de Produtividade (pontos + parâmetros + resultado destaque)
- 🚛 Colheita (por gleba + totais)
- 📋 Visitas de Campo (scores + observações completas)
- 📸 Galeria Fotográfica (todas as fotos restantes agrupadas por módulo)

ÚLTIMA SEÇÃO — CONCLUSÃO TÉCNICA:
- Texto corrido profissional em parágrafos
- Um parágrafo por módulo que tem dados
- Tom: agrônomo experiente, técnico, objetivo
- Espaço para assinatura no final

REGRAS IMPORTANTES:
- NÃO incluir tags <html>, <head>, <body>. Começar direto com <style>...</style> seguido do conteúdo
- NÃO inventar dados. Se um campo está vazio ou null, não mostrar
- NÃO mostrar seções de módulos que não têm dados
- Datas devem estar em formato DD/MM/AAAA
- Números com vírgula como decimal (padrão brasileiro)
- Todas as tabelas devem ter cabeçalho com fundo colorido
- Usar classes CSS consistentes (não inline em cada elemento)
- O HTML deve ser bonito tanto na tela quanto impresso
- Usar font-family: 'Segoe UI', system-ui, -apple-system, sans-serif
- Incluir @import de Google Fonts Inter como fallback`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { allData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("Chave de API não configurada");

    // Truncate data if too large (keep essential info)
    const dataStr = JSON.stringify(allData, null, 0);
    const truncatedData = dataStr.length > 120000 ? dataStr.substring(0, 120000) + '...(dados truncados)' : dataStr;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Gere o relatório HTML completo com estes dados do ciclo de produção de sementes de milho híbrido:\n\n${truncatedData}`,
          },
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
      throw new Error(`Erro na API de geração: ${response.status}`);
    }

    const data = await response.json();
    const rawHtml = data.choices?.[0]?.message?.content || "";

    // Clean up any markdown fences
    const cleanHtml = rawHtml
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return new Response(JSON.stringify({ html: cleanHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

