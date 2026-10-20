import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { medatEreignis } from "./medat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan credit amounts (NEUE Tier-Namen seit Premium-Launch 2026-05-09)
//   basic   → Legacy (€19,90), nicht mehr verkaufbar, bleibt für Bestandskunden
//   pro     → €29,90 (Legacy)
//   premium → €29,90 (NEU 2026-05) inkl. Wissens-Lab Vollzugang
const PLAN_CREDITS: Record<string, { aiSessions: number; aiImages: number }> = {
  basic:    { aiSessions: 200, aiImages: 50  },
  pro:      { aiSessions: 400, aiImages: 100 },
  premium:  { aiSessions: 800, aiImages: 200 },
};

function planToTier(plan: string): "basic" | "pro" | "premium" {
  if (plan === "premium")                    return "premium";
  if (plan === "premium_launch20")           return "premium";
  if (plan.startsWith("premium_upgrade_"))   return "premium";
  if (plan === "ultimate")                   return "premium";
  if (plan.startsWith("ultimate_upgrade_"))  return "premium";
  if (plan === "pro")                         return "pro";
  return "basic";
}

// ⚠️ FALLBACK: Wenn metadata.plan FEHLT (z.B. weil Stripe Payment Link
// keine Metadata gesetzt hat), aus dem amount_total ableiten.
function tierFromAmount(amountCents: number | null | undefined): "basic" | "pro" | "premium" {
  const amt = amountCents ?? 0;
  // Heiße Vorbereitungsphase: 2990 = Premium €29,90 (Live-Payment-Link)
  if (amt >= 2990) return "premium";
  // Legacy Pro 29,90 hatte denselben Betrag — bei kollidierenden Beträgen
  // gewinnt 'premium', weil das der aktuell verkaufte Plan ist.
  if (amt >= 2500) return "pro";
  if (amt >= 1500) return "basic";
  return "basic";
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts     = sigHeader.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const signature = parts.find((p) => p.startsWith("v1="))?.slice(3);
    if (!timestamp || !signature) return false;

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig         = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return expectedSig === signature;
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body         = await req.text();
    const stripeSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (stripeSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) return json({ error: "Missing stripe-signature" }, 400);
      const valid = await verifyStripeSignature(body, sig, stripeSecret);
      if (!valid) return json({ error: "Invalid signature" }, 400);
    }

    const event = JSON.parse(body);

    // Neues Modell zuerst (Monatsabo, Pass, Credits, Abo-Verlängerung/Kündigung)
    const medat = await medatEreignis(event, createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), json);
    if (medat) return medat;

    if (event.type !== "checkout.session.completed") {
      return json({ received: true, skipped: event.type });
    }

    const session       = event.data.object;
    let   userId        = session.client_reference_id as string | null;
    const customerEmail = (session.customer_details?.email || session.customer_email || "").toLowerCase();
    const amount        = session.amount_total as number | null | undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ==== GOODIE PURCHASE BRANCH ====
    if (session.metadata?.type === "goodie_purchase") {
      const goodieId = session.metadata.goodie_id;
      if (!goodieId || !userId) {
        console.error("[goodie_purchase] missing metadata", session.id);
        return json({ error: "Missing goodie_id or user_id" }, 400);
      }
      const { error: pErr } = await supabase.from("goodie_purchases").upsert({
        goodie_id: goodieId,
        user_id: userId,
        email: customerEmail,
        amount_cents: amount || 0,
        currency: (session.currency || "eur").toUpperCase(),
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent || null,
        status: "completed",
      }, { onConflict: "stripe_session_id" });
      if (pErr) {
        console.error("[goodie_purchase] insert failed:", pErr);
        return json({ error: "Failed to record purchase" }, 500);
      }
      await supabase.from("goodie_claims").upsert({
        goodie_id: goodieId, user_id: userId,
      }, { onConflict: "goodie_id,user_id", ignoreDuplicates: true });
      console.log(`✅ Goodie purchased: goodie=${goodieId} user=${userId} amount=${amount}`);
      return json({ success: true, goodie_purchase: true, goodie_id: goodieId, user_id: userId });
    }

    // ==== LICENSE ACTIVATION BRANCH ====

    // Idempotency: wenn diese Session bereits verarbeitet wurde → still success.
    const { data: existingPayment } = await supabase
      .from("stripe_payments")
      .select("id, user_id, plan")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existingPayment) {
      console.log(`↻ Session ${session.id} already processed for user ${existingPayment.user_id}`);
      return json({ success: true, already_processed: true, userId: existingPayment.user_id });
    }

    // FALLBACK 1: kein client_reference_id → per Email in auth.users matchen.
    if (!userId && customerEmail) {
      const { data: emailMatch, error: emErr } = await supabase
        .from("user_profiles")
        .select("user_id, email")
        .ilike("email", customerEmail)
        .maybeSingle();
      if (emErr) console.warn("Email fallback (user_profiles.email) failed:", emErr);
      if (emailMatch?.user_id) {
        userId = emailMatch.user_id;
        console.log(`✉️  Matched user via user_profiles.email: ${customerEmail} → ${userId}`);
      } else {
        // 2. Versuch: direkt in auth.users (über die admin-API)
        try {
          const { data: { users }, error } = await supabase.auth.admin.listUsers();
          if (!error && Array.isArray(users)) {
            const u = users.find((x: any) => (x.email || "").toLowerCase() === customerEmail);
            if (u?.id) {
              userId = u.id;
              console.log(`✉️  Matched user via auth.users: ${customerEmail} → ${userId}`);
            }
          }
        } catch (e) {
          console.warn("auth.admin.listUsers fallback failed:", e);
        }
      }
    }

    // Tier: erst aus metadata.plan, sonst aus amount ableiten.
    const planRaw = session.metadata?.plan || session.metadata?.tier;
    const tier    = planRaw ? planToTier(planRaw) : tierFromAmount(amount);
    const planCredits = PLAN_CREDITS[tier] || PLAN_CREDITS["premium"];

    if (!userId) {
      console.error(`❌ Could not resolve user_id. session=${session.id} email=${customerEmail} amount=${amount}`);
      // Trotzdem in stripe_payments loggen (ohne user_id), damit du es im
      // Admin manuell zuordnen kannst. Webhook gibt 200 zurück, damit Stripe
      // nicht ewig retried.
      try {
        await supabase.from("stripe_payments").insert({
          user_id:               null,
          stripe_session_id:     session.id,
          stripe_payment_intent: session.payment_intent,
          amount,
          currency:              session.currency,
          customer_email:        customerEmail,
          plan:                  tier,
          status:                "unmatched",
        });
      } catch (e) { console.warn("unmatched payment log failed:", e); }
      return json({ success: false, reason: "no_user_match", email: customerEmail, amount });
    }

    console.log(`Processing payment: user=${userId}, tier=${tier}, email=${customerEmail}, amount=${amount}`);

    const licenseExpiresAt = "2026-07-05T00:00:00.000Z";
    const licenseCode      = `STRIPE-${tier.toUpperCase()}-${session.id.slice(-8).toUpperCase()}`;

    const { data: prevProfile } = await supabase
      .from("user_profiles")
      .select("total_paid_cents, license_tier")
      .eq("user_id", userId)
      .single();
    const prevPaid = prevProfile?.total_paid_cents ?? 0;
    const prevTier = prevProfile?.license_tier ?? "free";
    const thisPayment = amount ?? 0;

    // Wenn der bisherige Tier bereits ≥ neuer Tier ist (z.B. premium → kauft pro)
    // dann nicht degradieren — nur Credits aufstocken.
    const tierRank: Record<string, number> = { free: 0, basic: 1, pro: 2, premium: 3 };
    const finalTier = tierRank[prevTier] > tierRank[tier] ? prevTier : tier;

    const { error: profileErr } = await supabase
      .from("user_profiles")
      .update({
        license_tier:        finalTier,
        license_code:        licenseCode,
        license_expires_at:  licenseExpiresAt,
        total_paid_cents:    prevPaid + thisPayment,
        promo_window_until:  finalTier === "premium" ? null : undefined,
        updated_at:          new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (profileErr) {
      console.error("Failed to update user_profiles:", profileErr);
      return json({ error: "Failed to activate license" }, 500);
    }

    const finalCredits = PLAN_CREDITS[finalTier] || planCredits;
    const { error: creditsErr } = await supabase
      .from("user_credits")
      .upsert(
        {
          user_id:           userId,
          credits_total:     300,
          ai_sessions_total: finalCredits.aiSessions,
          ai_images_total:   finalCredits.aiImages,
          questions_limit:   null,
          lernplan_resets:   0,
          updated_at:        new Date().toISOString(),
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );
    if (creditsErr) console.warn("Failed to update user_credits (non-fatal):", creditsErr);

    try {
      await supabase.from("stripe_payments").insert({
        user_id:               userId,
        stripe_session_id:     session.id,
        stripe_payment_intent: session.payment_intent,
        amount,
        currency:              session.currency,
        customer_email:        customerEmail,
        plan:                  finalTier,
        status:                "completed",
      });
    } catch (e) {
      console.warn("stripe_payments insert failed (non-fatal):", e);
    }

    console.log(`✅ Activated ${finalTier} for user ${userId} (${finalCredits.aiSessions} sessions, ${finalCredits.aiImages} images)`);
    return json({ success: true, userId, tier: finalTier, prevTier });

  } catch (err: any) {
    console.error("Webhook error:", err);
    return json({ error: err.message }, 500);
  }
});
