import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path")?.trim();
  const code = url.searchParams.get("code")?.trim();

  if (!rawPath && !code) {
    return new Response("Parâmetro 'path' ou 'code' é obrigatório", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let storagePath = rawPath || "";

  if (!storagePath && code) {
    const { data: linkData, error: linkError } = await supabase
      .from("shared_report_links")
      .select("storage_path")
      .eq("code", code)
      .maybeSingle();

    if (linkError || !linkData?.storage_path) {
      return new Response("Relatório não encontrado. O link pode ter expirado.", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    storagePath = linkData.storage_path;
  }

  const { data, error } = await supabase.storage
    .from("shared-reports")
    .download(storagePath);

  if (error || !data) {
    return new Response("Relatório não encontrado", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const htmlContent = await data.text();

  return new Response(htmlContent, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=86400",
    },
  });
});
