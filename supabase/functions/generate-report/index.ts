import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um engenheiro agrônomo sênior especialista em produção de sementes de milho híbrido.
Gere um relatório HTML COMPLETO, autocontido, técnico e profissional com TODOS os dados recebidos em JSON.

REGRAS ABSOLUTAS:
- Retorne APENAS HTML puro (sem markdown, sem blocos de código, sem \`\`\`).
- O HTML DEVE começar com <style> e depois conteúdo HTML.
- NÃO use JavaScript, NÃO use template literals (\${...}), NÃO use placeholders.
- Todos os valores devem estar ESCRITOS no HTML como texto final já resolvido.
- Se um array estiver vazio, NÃO gere a seção correspondente.
- Se um campo for null, omita-o ou exiba "—".
- Datas já vêm formatadas em DD/MM/AAAA — use como estão.
- Decimais com vírgula (ex: 12,5).
- Português brasileiro, tom técnico profissional de agrônomo.
- NÃO mencione IA, Claude, Gemini, modelos de linguagem.

ESTILO VISUAL:
- Visual executivo McKinsey/BCG, profissional e limpo
- Fonte: Segoe UI, system-ui, sans-serif
- Cor primária: #1B5E20 (verde escuro), secundária: #1E88E5, acento: #FF9800
- Fundo branco, cabeçalhos com fundo verde escuro e texto branco
- Tabelas: bordas finas #e0e0e0, cabeçalho verde #1B5E20 com texto branco, linhas alternadas #f5f5f5
- KPIs: cards com borda esquerda colorida, valor grande e bold
- Badges coloridos para status (verde=ok, laranja=atenção, vermelho=crítico)
- @media print { @page { size: A4; margin: 15mm 12mm; } }
- Quebra de página entre seções principais: page-break-before: always

ESTRUTURA OBRIGATÓRIA DO RELATÓRIO (gere TODAS as seções que tiverem dados):

1. CAPA — Logo (se logo_url), nome da organização, slogan, título "RELATÓRIO TÉCNICO DE CAMPO",
   híbrido, safra, cliente, cooperado, fazenda, pivô, data de geração

2. DADOS DO CICLO — Tabela com TODOS os campos:
   Híbrido, Linhagem Fêmea/Macho, Safra, Contrato, Cliente, Cooperado, Fazenda, Pivô,
   Área Total/Fêmea/Macho, Proporção F:M, Split, Espaçamento FF/FM/MM,
   Sistema de irrigação, Ciclo (dias), DAP despendoamento, Umidade alvo,
   Produtividade esperada, Produção esperada, Status

3. GLEBAS — Tabela: Nome, Parental, Área (ha), Linhas

4. SEMENTE BÁSICA — Tabela de lotes: Lote, Parental, Origem, Safra, Peneira, PMS,
   Germinação%, Vigor%, Pureza%, Umidade%, TS
   Se houver tratamentos: sub-tabela com produtos (produto, IA, tipo, dose, unidade)

5. PLANEJAMENTO DE PLANTIO — Tabela: Gleba, Parental, Data prevista, Área, Sem/metro, Pop. alvo

6. PLANTIO REALIZADO — Tabela COMPLETA: Data, Tipo, Gleba, Lote, Área, Espaçamento,
   Sem/metro, Pop. alvo, CV%, Solo, Profundidade, Velocidade, Notas
   Se houver cv_pontos: sub-tabela com pontos individuais de CV

7. EMERGÊNCIA — Tabela: Data, Tipo, Ponto, Contagem, Comprimento, Plantas/metro,
   Plantas/ha, Emergência%, Pop. alvo, Observações

8. STAND — Tabela: Data, Tipo contagem, Parental, Gleba, DAP, Pontos, Pop (pl/ha), CV%, Emergência%

9. FENOLOGIA — Tabela cronológica: Data, Parental, Estádio, DAP, Observação
   Incluir linha do tempo visual se possível

10. MANEJO INTEGRADO (INSUMOS) — Tabela COMPLETA: Data exec., Data rec., Produto, IA,
    Tipo, Grupo, Dose/ha, Unidade, Qtd Rec., Qtd Aplic., Evento, Status, DAP, Estádio, Notas
    Agrupar por tipo (fertilizante macro, micro, inseticida, herbicida, fungicida, adjuvante)

11. NUTRIÇÃO — Tabela: Data, Tipo, Produto, Dose/ha, Unidade, Área, Método, Estádio,
    N%, P%, K%, N fornecido, P2O5, K2O, Alvo, Notas
    Gerar KPI de balanço NPK total se possível

12. APLICAÇÕES QUÍMICAS — Tabela: Data, Tipo, Produto, IA, Dose/ha, Área, Método,
    Alvo, Volume calda, Prescrição, Responsável, Temp, UR, Vento, Notas

13. NICKING / SINCRONIA FLORAL — Marcos: Parental, Ponto, Marco, Data, DAP
    Observações: Data, Ponto fixo, Parental, Estádio, Pendão%, Estigma%, Notas

14. INSPEÇÕES — Tabela: Número, Data, Despendoamento%, ER%, MP1%, MP2%, FP%, Observações

15. DESPENDOAMENTO — Tabela COMPLETA: Passada, Data, Gleba, Área, Método, Turno, Equipe,
    % Removido, % Remanescente, Rendimento, Altura pendão, Máquina, Horas, Velocidade,
    Dificuldades, NC, Notas

16. ROGUING — Tabela: Data, Gleba, Tipo, Área, Plantas removidas, % Off-type, Equipe, Notas

17. PRAGAS E DOENÇAS — Tabela: Data, Nome, Tipo, Incidência%, Severidade, Parental,
    Estádio, Ação tomada, Notas

18. CLIMA E IRRIGAÇÃO:
    a) Resumo climático: KPIs (dias, temp média/máx/mín, UR média, vento, ETo total, chuva total, GDU total)
    b) Tabela climática diária: Data, Temp max/min/média, UR max/min/média, Vento, Radiação, ETo, Chuva, GDU diário, GDU acumulado
    c) Irrigação: tabela Data, Lâmina mm, Tempo h, Sistema
    d) Chuva: tabela Data, mm

19. UMIDADE — Tabela: Data, Gleba, Umidade%, Estádio, Ponto

20. ESTIMATIVA DE PRODUTIVIDADE — Se houver:
    Pontos amostrais: Ponto, Gleba, Espigas/ha, Grãos/espiga, Umidade%, Prod. bruta
    KPIs: Prod. líquida kg/ha, Total ton, sc/ha

21. PLANO DE COLHEITA — Tabela: Gleba, Data início, Data fim, Ciclo dias, Fonte plantio,
    Umidade alvo, Meta ha/dia, Peso saco, Notas

22. COLHEITA REALIZADA — Tabela COMPLETA: Data, Gleba, Área, Umidade%, Cargas, Peso/carga,
    Total ton, Destino, Ticket, Colhedora, Transporte, Notas

23. VISITAS DE CAMPO — Para cada visita: Data, Número, Estágio, Técnico, Status,
    Nota final/máxima, Observações
    E sub-tabela de scores: Estágio, Subitem, Nota, Pontos, Observação

24. GALERIA DE FOTOS — Exibir TODAS as fotos por módulo:
    <img src="URL" style="max-width:100%; margin:8px 0"> com legenda (módulo, data, contexto)

25. CONCLUSÃO TÉCNICA — Parecer técnico escrito como texto corrido profissional
    analisando os dados reais do campo. Incluir recomendações.

26. RODAPÉ — Texto de rodapé da organização, data de geração

IMPORTANTE:
- Gere TODAS as seções que tiverem dados — não omita nenhuma.
- Cada tabela deve incluir TODOS os registros, não apenas os primeiros.
- Use SVG inline para gráficos simples quando relevante (ex: evolução de GDU, NDVI).
- As fotos devem ser incluídas com <img src="URL_FORNECIDA">.
- O relatório deve ser COMPLETO e EXAUSTIVO — imagine que é um dossiê técnico para auditoria.`;

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

async function callAiGateway(payload: string, repairMode = false): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("Chave de API não configurada");

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Gere o relatório HTML COMPLETO e EXAUSTIVO com base nestes dados JSON (todos os valores já estão resolvidos — use-os diretamente no HTML):\n\n${payload}`,
    },
  ];

  if (repairMode) {
    messages.push({
      role: "user",
      content:
        "A resposta anterior veio inválida com placeholders/template literals. Reescreva do zero e retorne SOMENTE HTML puro, sem ${...}, sem JavaScript e sem funções. TODOS os valores devem ser texto literal no HTML.",
    });
  }

  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages,
      max_tokens: 65000,
    }),
  });
}

async function parseGatewayResponse(response: Response): Promise<string> {
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { allData, reportData } = await req.json();
    const payload = reportData ?? allData;

    if (!payload) {
      return new Response(JSON.stringify({ error: "Payload de relatório não informado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataStr = JSON.stringify(payload, null, 0);
    // Use a higher truncation limit for comprehensive reports
    const truncatedData =
      dataStr.length > 200000 ? `${dataStr.substring(0, 200000)}...(dados truncados)` : dataStr;

    console.log(`Report data size: ${dataStr.length} chars`);

    const firstResponse = await callAiGateway(truncatedData, false);

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (firstResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Contate o administrador." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await firstResponse.text();
      console.error("Gateway error:", firstResponse.status, t);
      throw new Error(`Erro na API de geração: ${firstResponse.status}`);
    }

    let clean = cleanHtml(await parseGatewayResponse(firstResponse));

    if (!clean || hasInvalidTemplateTokens(clean)) {
      console.log("First response invalid, retrying in repair mode...");
      const retryResponse = await callAiGateway(truncatedData, true);

      if (!retryResponse.ok) {
        const t = await retryResponse.text();
        console.error("Gateway retry error:", retryResponse.status, t);
        throw new Error(`Erro na API de geração (retry): ${retryResponse.status}`);
      }

      clean = cleanHtml(await parseGatewayResponse(retryResponse));
    }

    if (!clean || hasInvalidTemplateTokens(clean)) {
      throw new Error("A IA retornou HTML inválido com placeholders não resolvidos.");
    }

    return new Response(JSON.stringify({ html: clean }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
