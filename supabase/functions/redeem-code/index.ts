import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Please enter a redeem code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Look up the code
    const { data: redeemCode, error: lookupErr } = await adminClient
      .from("redeem_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (lookupErr || !redeemCode) {
      return new Response(JSON.stringify({ error: "Invalid redeem code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!redeemCode.is_active) {
      return new Response(JSON.stringify({ error: "This code is no longer active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (redeemCode.redeemed_by) {
      return new Response(JSON.stringify({ error: "This code has already been redeemed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark code as redeemed
    const { error: updateCodeErr } = await adminClient
      .from("redeem_codes")
      .update({
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", redeemCode.id);

    if (updateCodeErr) {
      return new Response(JSON.stringify({ error: "Failed to redeem code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add credits to user
    const { data: currentCredits } = await adminClient
      .from("user_credits")
      .select("credits_remaining, plan")
      .eq("user_id", user.id)
      .single();

    const updates: Record<string, unknown> = {
      credits_remaining: (currentCredits?.credits_remaining ?? 0) + redeemCode.credits,
      updated_at: new Date().toISOString(),
    };

    // If code includes a plan upgrade
    if (redeemCode.plan_upgrade) {
      updates.plan = redeemCode.plan_upgrade;
    }

    const { error: creditErr } = await adminClient
      .from("user_credits")
      .update(updates)
      .eq("user_id", user.id);

    if (creditErr) {
      return new Response(JSON.stringify({ error: "Failed to add credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        credits_added: redeemCode.credits,
        plan_upgrade: redeemCode.plan_upgrade || null,
        message: redeemCode.plan_upgrade
          ? `Upgraded to ${redeemCode.plan_upgrade} plan and added ${redeemCode.credits} credits!`
          : `Added ${redeemCode.credits} credits to your account!`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
