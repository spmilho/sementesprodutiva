const AGRO_API = "http://api.agromonitoring.com/agro/1.0";
const API_KEY = "13ab2c8b70045ba0a48a6fd8f69e8f4b";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    let url: string;
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "create_polygon":
        url = `${AGRO_API}/polygons?appid=${API_KEY}&duplicated=true`;
        method = "POST";
        body = JSON.stringify(payload);
        break;

      case "search_images": {
        const { polyid, start, end } = payload;
        url = `${AGRO_API}/image/search?start=${start}&end=${end}&polyid=${polyid}&appid=${API_KEY}`;
        break;
      }

      case "get_stats": {
        // payload.url is the stats URL from the image search result
        const statsUrl = payload.url.includes("appid=")
          ? payload.url
          : `${payload.url}&appid=${API_KEY}`;
        url = statsUrl;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const res = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: JSON.stringify(data) }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
