import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPT = `ESTILO VISUAL OBRIGATÓRIO:
- Fonte: 'Segoe UI', system-ui, sans-serif
- Cor primária: #1B5E20 (verde escuro)
- Cor secundária: #1565C0 (azul)
- Cor acento: #FF9800 (laranja)
- Fundo cards: #F5F5F5 com border-radius: 8px
- Tabelas: header #1B5E20 com texto branco, linhas alternadas #F5F5F5/#FFFFFF,
  border-collapse: collapse, padding: 8px 12px, font-size: 11px, width: 100%
- KPI cards: display:flex, gap:16px, border-left:4px solid [cor], padding:16px,
  background:#F5F5F5, border-radius:8px, valor em font-size:28px bold, label em font-size:11px uppercase #666
- Seções: margin-top:40px, título font-size:20px bold com ícone emoji,
  border-bottom:2px solid #1B5E20, padding-bottom:8px, margin-bottom:20px
- Badges: border-radius:12px, padding:2px 10px, font-size:11px, font-weight:600
  - Verde (ok): background:#E8F5E9, color:#2E7D32
  - Amarelo (atenção): background:#FFF8E1, color:#F57F17
  - Laranja (alerta): background:#FFF3E0, color:#E65100
  - Vermelho (crítico): background:#FFEBEE, color:#C62828
- Cada seção com page-break-before:always (class="page-break")

GRÁFICOS SVG INLINE:
Quando os dados permitirem visualização gráfica, gere SVGs inline com:
- viewBox adequado, width:100%, max-width:560px, margin:16px auto, display:block
- Cores do tema (#1B5E20, #1565C0, #FF9800, #4CAF50, #2196F3)
- Eixos com labels, título do gráfico, legendas
- Barras com border-radius nos cantos superiores
- Linhas com stroke-width:2, pontos com circles r=4
- Background branco, box-shadow via filter

FOTOS:
Se dados.fotos contém URLs com campo url:
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
  <div><img src="URL" style="width:100%;border-radius:8px;object-fit:cover;max-height:250px">
  <p style="font-size:10px;color:#666;margin:4px 0">[módulo - data - contexto]</p></div>
</div>

FORMATAÇÃO:
- Datas: já vêm em DD/MM/AAAA — use como estão
- Decimais com vírgula (1.234,56 → 1.234,56)
- Valores null/undefined: exibir "—"
- Arrays vazios: NÃO gerar a seção
- Tabelas com TODOS os registros (nunca resumir ou pular linhas)
- Rodapé de tabela com totais/médias quando relevante

PROIBIDO:
- JavaScript, template literals (\${...}), placeholders
- Mencionar IA, Claude, Gemini, modelos de linguagem
- Markdown, blocos de código
- Resumir dados — incluir TODOS os registros`;

const PART1_INSTRUCTIONS = `Gere a PARTE 1 do relatório técnico. Inclua:

1. <style> COMPLETO com TODO o CSS (será usado pelas 3 partes):
   - Reset básico, fontes, cores
   - Classes para tabelas, KPIs, badges, seções, page-break
   - @media print { @page { size:A4; margin:15mm 12mm; } .report-toolbar,.no-print{display:none!important} table{page-break-inside:auto} tr{page-break-inside:avoid} }

2. CAPA:
   - div height:100vh, background:linear-gradient(135deg,#1B5E20,#2E7D32,#388E3C)
   - Se logo_url: <img src="logo_url" style="max-height:80px;margin-bottom:20px">
   - Organização e slogan em branco
   - "RELATÓRIO TÉCNICO DE CAMPO" em font-size:13px, letter-spacing:6px, uppercase
   - Híbrido em font-size:42px, font-weight:700
   - Grid 2×4 com: Safra, Contrato, Cliente, Cooperado, Fazenda, Pivô, Área Total, Status
   - Data de geração no rodapé da capa
   - page-break-after:always

3. DADOS DO CICLO — Tabela completa com todos os campos do ciclo

4. GLEBAS — Se existirem: tabela Nome, Parental, Área, Linhas

5. SEMENTE BÁSICA — Tabela de lotes com todos os campos
   Se houver tratamentos: sub-tabela por lote com produtos (produto, IA, tipo, dose, unidade)

6. PLANEJAMENTO DE PLANTIO — Tabela: Gleba, Parental, Data, Área, Sem/metro, Pop.alvo

7. PLANTIO REALIZADO — Tabela COMPLETA com todos os campos
   Se houver cv_pontos: mencionar CV por ponto

8. EMERGÊNCIA — Se existir: tabela completa

9. STAND — Se existir: tabela completa

Termine exatamente com: <!-- PARTE 1 FIM -->`;

const PART2_INSTRUCTIONS = `Gere a PARTE 2 do relatório técnico. NÃO inclua <style> (já veio na Parte 1).

10. MANEJO INTEGRADO (INSUMOS) — Tabela COMPLETA agrupada por tipo:
    Data exec, Produto, IA, Tipo, Grupo, Dose/ha, Unidade, Qtd Rec, Qtd Aplic, Status, DAP, Estádio
    Gerar SVG de barras: distribuição de insumos por tipo/grupo

11. NUTRIÇÃO — Se existir: tabela completa com N/P/K e balanço NPK (KPIs)
    Gerar SVG: balanço NPK total (barras horizontais)

12. APLICAÇÕES QUÍMICAS — Se existir: tabela completa

13. FENOLOGIA — Tabela cronológica: Data, Parental, Estádio, DAP, Observação
    Gerar SVG de timeline visual se possível

14. NDVI — Se existir: tabela de imagens (data, NDVI médio/min/max)
    Incluir parecer técnico se disponível

15. NICKING / SINCRONIA FLORAL — Marcos e observações em tabelas separadas

16. INSPEÇÕES — Se existir: tabela com todos os dados

17. DESPENDOAMENTO — Tabela COMPLETA com todos os campos
    Gerar SVG: evolução % remanescente por passada

18. ROGUING — Se existir: tabela completa

19. PRAGAS E DOENÇAS — Tabela completa com badges de severidade

Termine exatamente com: <!-- PARTE 2 FIM -->`;

const PART3_INSTRUCTIONS = `Gere a PARTE 3 do relatório técnico. NÃO inclua <style>.

20. CLIMA E IRRIGAÇÃO:
    a) KPIs resumo: dias monitorados, temp média/máx/mín absolutas, UR média, vento, ETo total, chuva total, GDU total
    b) Tabela climática diária COMPLETA (se dados existirem)
    c) Gerar SVG: evolução temperatura + GDU acumulado (linhas duplas)
    d) Irrigação: tabela Data, Lâmina, Tempo, Sistema
    e) Chuva: tabela Data, mm

21. UMIDADE — Se existir: tabela Data, Gleba, Umidade%, Estádio, Ponto

22. ESTIMATIVA DE PRODUTIVIDADE — Se existir:
    KPIs: Prod. líquida kg/ha, Total ton, sc/ha
    Tabela de pontos amostrais

23. PLANO DE COLHEITA — Se existir: tabela completa

24. COLHEITA REALIZADA — Se existir: tabela COMPLETA
    Gerar SVG: colheita acumulada por data (área de linha)

25. VISITAS DE CAMPO — Para cada visita: dados + sub-tabela de scores

26. GALERIA DE FOTOS — Exibir TODAS as fotos em grid 2 colunas com legenda

27. CONCLUSÃO TÉCNICA — Parecer técnico em texto corrido profissional:
    - Um parágrafo por módulo que tem dados
    - Tom de engenheiro agrônomo experiente
    - Baseado nos dados reais fornecidos
    - Recomendações técnicas
    - Espaço para assinatura (linha horizontal + nome do responsável técnico)

28. RODAPÉ — Texto de rodapé da organização + data de geração

Termine exatamente com: <!-- PARTE 3 FIM -->`;

function makeSystemPrompt(): string {
  return `Você é um designer de relatórios agrícolas de altíssimo nível profissional, gerando HTML para impressão A4.

RETORNE APENAS HTML PURO. Sem markdown, sem crases, sem explicações.
Todos os textos em português brasileiro.

${STYLE_PROMPT}`;
}

function cleanHtml(rawHtml: string): string {
  let html = rawHtml
    .replace(/```html\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  const doctypeIdx = html.toLowerCase().indexOf("<!doctype");
  if (doctypeIdx >= 0) {
    html = html.slice(doctypeIdx);
  }

  if (html.toLowerCase().startsWith("<!doctype") || html.toLowerCase().startsWith("<html")) {
    const styleBlocks = html.match(/<style[\s\S]*?<\/style>/gi) || [];
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
      html = `${styleBlocks.join("\n")}\n${bodyMatch[1]}`.trim();
    }
  }

  return html;
}

function hasInvalidTemplateTokens(html: string): boolean {
  return (
    /\$\{[^}]+\}/.test(html) ||
    /\b(formatDate|formatNumber|getParentTypeLabel)\s*\(/.test(html) ||
    /\<script\b/i.test(html)
  );
}

function pickKeys(obj: any, keys: string[]): any {
  const result: any = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

const MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-3-flash-preview",
  "openai/gpt-5-mini",
];

async function callAiGateway(systemPrompt: string, userMessage: string, retryOnFail = true): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("Chave de API não configurada");

  const doCall = async (model: string, repair = false): Promise<string> => {
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    if (repair) {
      messages.push({
        role: "user",
        content: "A resposta anterior veio inválida com placeholders. Reescreva do zero: APENAS HTML puro, sem ${...}, sem JavaScript, sem funções. Todos os valores como texto literal.",
      });
    }

    console.log(`Trying model: ${model}`);
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 65000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error(`Model ${model} error:`, response.status, t);
      if (response.status === 429) throw new Error("RATE_LIMIT");
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED:" + model);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  };

  // Try models in order, failover on 402
  for (const model of MODELS) {
    try {
      let html = cleanHtml(await doCall(model, false));
      if (retryOnFail && (!html || hasInvalidTemplateTokens(html))) {
        console.log(`First response invalid with ${model}, retrying...`);
        html = cleanHtml(await doCall(model, true));
      }
      if (html) {
        console.log(`Success with model: ${model}`);
        return html;
      }
    } catch (e: any) {
      if (e.message === "RATE_LIMIT") throw e;
      if (e.message?.startsWith("PAYMENT_REQUIRED")) {
        console.warn(`Model ${model} returned 402, trying next...`);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Todos os modelos falharam. Tente novamente mais tarde.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { reportData, allData, part } = body;
    const payload = reportData ?? allData;

    if (!payload) {
      return new Response(JSON.stringify({ error: "Payload de relatório não informado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = makeSystemPrompt();

    // Single-part mode (backward compat) or multi-part mode
    if (part) {
      const dataStr = JSON.stringify(payload, null, 0);
      const truncated = dataStr.length > 120000 ? `${dataStr.substring(0, 120000)}...(truncado)` : dataStr;
      
      let instructions = "";
      if (part === 1) instructions = PART1_INSTRUCTIONS;
      else if (part === 2) instructions = PART2_INSTRUCTIONS;
      else if (part === 3) instructions = PART3_INSTRUCTIONS;
      else throw new Error("Parte inválida: " + part);

      const userMessage = `${instructions}\n\nDados JSON do ciclo (use diretamente no HTML, não interprete como código):\n\n${truncated}`;
      
      console.log(`Generating part ${part}, data size: ${dataStr.length} chars`);

      try {
        const html = await callAiGateway(systemPrompt, userMessage);

        if (!html) {
          throw new Error(`Parte ${part} retornou vazia`);
        }

        return new Response(JSON.stringify({ html, part }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        if (e.message === "RATE_LIMIT") {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (e.message === "PAYMENT_REQUIRED") {
          return new Response(JSON.stringify({ error: "Créditos insuficientes. Contate o administrador." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw e;
      }
    }

    // Legacy single-call mode
    const dataStr = JSON.stringify(payload, null, 0);
    const truncated = dataStr.length > 200000 ? `${dataStr.substring(0, 200000)}...(truncado)` : dataStr;
    console.log(`Report data size: ${dataStr.length} chars (single mode)`);

    const userMessage = `Gere o relatório HTML COMPLETO e EXAUSTIVO com base nestes dados JSON:\n\n${truncated}`;
    const html = await callAiGateway(systemPrompt, userMessage);

    if (!html || hasInvalidTemplateTokens(html)) {
      throw new Error("A IA retornou HTML inválido com placeholders não resolvidos.");
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
