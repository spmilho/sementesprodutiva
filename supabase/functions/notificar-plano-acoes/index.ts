import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getNotificationEmails(): Promise<string[]> {
  const { data: acessos } = await supabase
    .from("plano_acoes_acesso")
    .select("user_id, profiles(email)")
    .eq("habilitado", true);

  const { data: admins } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "Admin");

  const emails = new Set<string>();
  acessos?.forEach((a: any) => { if (a.profiles?.email) emails.add(a.profiles.email); });
  admins?.forEach((a: any) => { if (a.email) emails.add(a.email); });

  return [...emails];
}

async function enviarEmail(para: string[], assunto: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || para.length === 0) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Arena Produtiva <notificacoes@suaempresa.com.br>",
      to: para,
      subject: assunto,
      html,
    }),
  });
  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const emails = await getNotificationEmails();

    // ─── NOVA AÇÃO ──────────────────────────────────────────────────────
    if (body.tipo === "nova_acao") {
      const { acao_what, acao_why, acao_where, when_prazo, prioridade, responsavel_nome, criador_nome } = body;
      const prazoFormatado = new Date(when_prazo + "T12:00:00").toLocaleDateString("pt-BR");

      const corPrioridade: Record<string, string> = {
        critica: "#ef4444", alta: "#f97316", media: "#eab308", baixa: "#22c55e",
      };

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;">
          <div style="background:#518955;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:white;margin:0;">📋 Nova ação criada no Plano de Ação</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5;">
            <div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">O QUÊ</p>
              <p style="margin:0;font-size:15px;font-weight:600;">${acao_what}</p>
            </div>
            <div style="background:white;border-radius:8px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">POR QUÊ</p>
              <p style="margin:0;font-size:14px;">${acao_why}</p>
            </div>
            <table style="width:100%;border-spacing:12px 0;margin-bottom:16px;"><tr>
              <td style="background:white;border-radius:8px;padding:12px;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">ONDE</p>
                <p style="margin:0;font-size:14px;">${acao_where}</p>
              </td>
              <td style="background:white;border-radius:8px;padding:12px;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">RESPONSÁVEL</p>
                <p style="margin:0;font-size:14px;font-weight:500;">${responsavel_nome || "—"}</p>
              </td>
            </tr></table>
            <table style="width:100%;border-spacing:12px 0;margin-bottom:16px;"><tr>
              <td style="background:white;border-radius:8px;padding:12px;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">PRAZO</p>
                <p style="margin:0;font-size:14px;font-weight:500;">${prazoFormatado}</p>
              </td>
              <td style="background:white;border-radius:8px;padding:12px;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#888;">PRIORIDADE</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:${corPrioridade[prioridade] || "#888"};">${(prioridade || "").toUpperCase()}</p>
              </td>
            </tr></table>
            <p style="color:#888;font-size:12px;margin:16px 0 0;border-top:1px solid #eee;padding-top:12px;">
              Criada por <strong>${criador_nome}</strong> · Acesse o Arena Produtiva para visualizar e comentar.
            </p>
          </div>
        </div>`;

      await enviarEmail(emails, `📋 Nova ação: ${(acao_what || "").substring(0, 60)}`, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── NOVO COMENTÁRIO ────────────────────────────────────────────────
    if (body.tipo === "novo_comentario") {
      const { acao_what, comentario_texto, autor_nome } = body;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;">
          <div style="background:#518955;padding:20px;border-radius:8px 8px 0 0;">
            <h2 style="color:white;margin:0;">💬 Novo comentário no Plano de Ação</h2>
          </div>
          <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5;">
            <p style="margin:0 0 8px;font-size:14px;"><strong>Ação:</strong> ${acao_what}</p>
            <p style="margin:0 0 8px;font-size:14px;"><strong>Comentário de:</strong> ${autor_nome}</p>
            <div style="background:white;border-radius:8px;padding:16px;margin:12px 0;border-left:4px solid #518955;">
              <p style="margin:0;font-size:14px;">${comentario_texto}</p>
            </div>
            <p style="color:#888;font-size:12px;margin:16px 0 0;border-top:1px solid #eee;padding-top:12px;">
              Acesse o Arena Produtiva para visualizar e responder.
            </p>
          </div>
        </div>`;

      await enviarEmail(emails, `💬 Novo comentário: ${(acao_what || "").substring(0, 50)}`, html);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRAZO 2 DIAS (Cron) ────────────────────────────────────────────
    if (body.tipo === "prazo_2dias" || !body.tipo) {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      const dataAlvo = d.toISOString().split("T")[0];

      const { data: acoes } = await supabase
        .from("plano_acoes")
        .select("id, what, when_prazo, who_resp, prioridade")
        .eq("when_prazo", dataAlvo)
        .in("status", ["aberta", "em_andamento"]);

      if (!acoes?.length) {
        return new Response(JSON.stringify({ ok: true, msg: "sem prazos" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      for (const acao of acoes) {
        const { data: jaEnviou } = await supabase
          .from("plano_acoes_notif_log")
          .select("id")
          .eq("acao_id", acao.id)
          .eq("tipo", "prazo_2dias")
          .gte("enviado_em", new Date().toISOString().split("T")[0]);

        if (jaEnviou?.length) continue;

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;">
            <div style="background:#f97316;padding:20px;border-radius:8px 8px 0 0;">
              <h2 style="color:white;margin:0;">⏰ Prazo se encerrando em 2 dias</h2>
            </div>
            <div style="background:#f9f9f9;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5;">
              <p style="font-size:15px;font-weight:600;">${acao.what}</p>
              <p>Prazo: ${new Date(acao.when_prazo + "T12:00:00").toLocaleDateString("pt-BR")}</p>
              <p>Prioridade: ${(acao.prioridade || "").toUpperCase()}</p>
              <p style="color:#888;font-size:12px;margin-top:16px;border-top:1px solid #eee;padding-top:12px;">
                Acesse o Arena Produtiva para atualizar o status desta ação.
              </p>
            </div>
          </div>`;

        await enviarEmail(emails, `⏰ Ação vence em 2 dias: ${(acao.what || "").substring(0, 60)}`, html);
        await supabase.from("plano_acoes_notif_log").insert({ acao_id: acao.id, tipo: "prazo_2dias" });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "tipo desconhecido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
