// Teil des stripe-webhook: neues MedAT-Modell
// ==== NEUES MODELL (Andreea, 19.10.2026): Monatsabo, MedAT-Pass, KI-Credits ====
const PASS_BIS = "2027-07-10T00:00:00.000Z";
const MONATS_CREDITS: Record<string, number> = { monat: 350, pass: 300 };
async function stripeGet(path: string) {
  const r = await fetch("https://api.stripe.com/v1" + path, { headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` } });
  return r.ok ? r.json() : null;
}
function periodenEnde(sub: any): string {
  const t = sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end;
  const ms = t ? t * 1000 : Date.now() + 31 * 86400000;
  return new Date(ms + 2 * 86400000).toISOString();     // 2 Tage Puffer für die Zahlung
}
async function lizenz(supabase: any, userId: string, bis: string, betrag: number, sessionId: string, plan: string, email: string, pi: string | null) {
  const { data: prev } = await supabase.from("user_profiles").select("total_paid_cents").eq("user_id", userId).maybeSingle();
  await supabase.from("user_profiles").update({ license_tier: "premium", license_code: `STRIPE-${plan.toUpperCase()}-${sessionId.slice(-8).toUpperCase()}`, license_expires_at: bis, total_paid_cents: (prev?.total_paid_cents ?? 0) + (betrag || 0), updated_at: new Date().toISOString() }).eq("user_id", userId);
  await supabase.from("user_credits").upsert({ user_id: userId, questions_limit: null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  await supabase.from("stripe_payments").insert({ user_id: userId, stripe_session_id: sessionId, stripe_payment_intent: pi, amount: betrag, currency: "eur", customer_email: email, plan, status: "completed" });
}
async function guthabenAuffuellen(supabase: any, userId: string, menge: number) {
  await supabase.from("ki_guthaben").upsert({ user_id: userId, monat: menge, aufgefuellt: new Date().toISOString(), aktualisiert: new Date().toISOString() }, { onConflict: "user_id" });
  await supabase.from("ki_buchungen").insert({ user_id: userId, menge, grund: "Monatsguthaben" });
}
export async function medatEreignis(event: any, supabase: any, json: (d: unknown, s?: number) => Response): Promise<Response | null> {
  const o = event.data.object;
  if (event.type === "checkout.session.completed" && o.metadata?.app === "medat") {
    const userId = o.client_reference_id || o.metadata.user_id, art = o.metadata.art, email = (o.customer_details?.email || o.customer_email || "").toLowerCase();
    const { data: schon } = await supabase.from("stripe_payments").select("id").eq("stripe_session_id", o.id).maybeSingle();
    if (schon) return json({ received: true, already_processed: true });
    if (!userId) return json({ success: false, reason: "no_user" });
    const { data: abo } = await supabase.from("medat_abo").select("*").eq("user_id", userId).maybeSingle();
    if (art === "monat") {
      const sub = await stripeGet(`/subscriptions/${o.subscription}`);
      const bis = periodenEnde(sub);
      await supabase.from("medat_abo").upsert({ user_id: userId, art: "monat", status: "aktiv", start: new Date().toISOString(), bis, kuendigt: false, stripe_customer: o.customer, stripe_subscription: o.subscription, hatte_probe: abo?.hatte_probe ?? false, aktualisiert: new Date().toISOString() }, { onConflict: "user_id" });
      await guthabenAuffuellen(supabase, userId, MONATS_CREDITS.monat);
      await lizenz(supabase, userId, bis, o.amount_total, o.id, "monat", email, null);
    } else if (art === "pass") {
      await supabase.from("medat_abo").upsert({ user_id: userId, art: "pass", status: "aktiv", start: new Date().toISOString(), bis: PASS_BIS, kuendigt: false, stripe_customer: o.customer || abo?.stripe_customer || null, stripe_subscription: null, hatte_probe: abo?.hatte_probe ?? false, aktualisiert: new Date().toISOString() }, { onConflict: "user_id" });
      await guthabenAuffuellen(supabase, userId, MONATS_CREDITS.pass);
      await lizenz(supabase, userId, PASS_BIS, o.amount_total, o.id, "pass", email, o.payment_intent);
    } else if (art === "credits110" || art === "credits230") {
      const n = Number(o.metadata.credits) || 0;
      const { data: g } = await supabase.from("ki_guthaben").select("extra").eq("user_id", userId).maybeSingle();
      await supabase.from("ki_guthaben").upsert({ user_id: userId, extra: (g?.extra ?? 0) + n, aktualisiert: new Date().toISOString() }, { onConflict: "user_id" });
      await supabase.from("ki_buchungen").insert({ user_id: userId, menge: n, grund: "nachgekauft" });
      await supabase.from("stripe_payments").insert({ user_id: userId, stripe_session_id: o.id, stripe_payment_intent: o.payment_intent, amount: o.amount_total, currency: "eur", customer_email: email, plan: art, status: "completed" });
      if (o.customer && !abo?.stripe_customer) await supabase.from("medat_abo").update({ stripe_customer: o.customer }).eq("user_id", userId);
    }
    console.log(`✅ MedAT ${art} für ${userId}`);
    return json({ success: true, medat: art });
  }
  if (event.type === "invoice.paid" && o.subscription && o.billing_reason === "subscription_cycle") {
    const { data: abo } = await supabase.from("medat_abo").select("*").eq("stripe_subscription", o.subscription).maybeSingle();
    if (!abo) return null;
    const sub = await stripeGet(`/subscriptions/${o.subscription}`);
    const bis = periodenEnde(sub);
    await supabase.from("medat_abo").update({ bis, status: "aktiv", aktualisiert: new Date().toISOString() }).eq("user_id", abo.user_id);
    await supabase.from("user_profiles").update({ license_tier: "premium", license_expires_at: bis, updated_at: new Date().toISOString() }).eq("user_id", abo.user_id);
    await guthabenAuffuellen(supabase, abo.user_id, MONATS_CREDITS.monat);
    return json({ success: true, medat: "verlaengert" });
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const { data: abo } = await supabase.from("medat_abo").select("*").eq("stripe_subscription", o.id).maybeSingle();
    if (!abo) return null;
    if (event.type === "customer.subscription.deleted") {
      const ende = o.ended_at ? new Date(o.ended_at * 1000).toISOString() : new Date().toISOString();
      const bis = new Date(Math.min(new Date(abo.bis).getTime(), Math.max(Date.now(), new Date(ende).getTime()))).toISOString();
      await supabase.from("medat_abo").update({ status: "beendet", kuendigt: true, bis, aktualisiert: new Date().toISOString() }).eq("user_id", abo.user_id);
      await supabase.from("user_profiles").update({ license_expires_at: bis, updated_at: new Date().toISOString() }).eq("user_id", abo.user_id);
    } else {
      await supabase.from("medat_abo").update({ kuendigt: !!o.cancel_at_period_end, status: o.status === "active" || o.status === "trialing" ? "aktiv" : o.status, aktualisiert: new Date().toISOString() }).eq("user_id", abo.user_id);
    }
    return json({ success: true, medat: event.type });
  }
  return null;
}

