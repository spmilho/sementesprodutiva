import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um engenheiro agrônomo especialista em produção de sementes de milho híbrido.

Sua tarefa é gerar um relatório técnico em HTML COMPLETO, já final, com dados reais recebidos em JSON.

REGRAS ABSOLUTAS:
- Retorne APENAS HTML puro (sem markdown, sem blocos de código).
- O HTML DEVE começar com <style> e depois conteúdo HTML.
- NÃO use JavaScript no resultado.
- NÃO use template literals (${"${...}"}) nem placeholders de nenhum tipo.
- NÃO use funções como formatDate(), formatNumber(), getParentTypeLabel() no HTML.
- Todos os valores devem sair no HTML como texto final já resolvido.
- Se um campo estiver vazio/null, não exiba.
- Gere seções apenas para módulos com dados.
- Datas em DD/MM/AAAA.
- Decimais com vírgula.
- Português brasileiro, tom técnico profissional.

ESTILO:
- Visual executivo McKinsey/BCG
- Fundo branco, tipografia Segoe UI/system-ui
- A4 print-friendly, seção por página quando necessário
- Cor primária #1B5E20, secundária #1E88E5, acento #FF9800
- Tabelas com cabeçalho colorido, KPIs, badges e gráficos SVG inline quando relevante
- Incluir @media print e @page { size: A4; margin: 15mm 12mm; }
`;

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

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Gere o relatório HTML completo com base nestes dados JSON resolvidos:\n\n${payload}`,
    },
  ];

  if (repairMode) {
    messages.push({
      role: "user",
      content:
        "A resposta anterior veio inválida com placeholders/template literals. Reescreva do zero e retorne SOMENTE HTML puro, sem ${...}, sem JavaScript e sem funções.",
    });
  }

  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
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
    const truncatedData =
      dataStr.length > 120000 ? `${dataStr.substring(0, 120000)}...(dados truncados)` : dataStr;

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
