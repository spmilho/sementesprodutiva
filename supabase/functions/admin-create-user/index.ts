import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (roleData?.role !== "admin") throw new Error("Access denied: admin role required");

    const body = await req.json();
    const action = body.action || "create";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── RESET PASSWORD ──
    if (action === "reset_password") {
      const { user_id, password } = body;
      if (!user_id || !password) throw new Error("Missing user_id or password");
      const { error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DELETE USER ──
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) throw new Error("Missing user_id");
      if (user_id === caller.id) throw new Error("Não é possível remover a si mesmo");
      // Delete role first, then auth user
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      // Soft-delete profile
      await adminClient.from("profiles").update({ full_name: "[removido]" }).eq("id", user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CREATE USER ──
    const { email, password, full_name, role, client_id } = body;
    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields: email, password, full_name, role");
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    const userId = newUser.user.id;

    // Get caller's org_id
    const { data: callerProfile } = await anonClient
      .from("profiles")
      .select("org_id")
      .eq("id", caller.id)
      .single();
    if (!callerProfile?.org_id) throw new Error("Caller has no org_id");

    // Update profile with correct org_id
    await adminClient
      .from("profiles")
      .update({ org_id: callerProfile.org_id, full_name })
      .eq("id", userId);

    // Insert role
    await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        client_id: role === "client" && client_id ? client_id : null,
      });

    return new Response(JSON.stringify({ user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
