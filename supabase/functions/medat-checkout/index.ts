// medat-checkout – Kauf und Abo-Verwaltung für das neue Modell (Andreea, 19.10.2026)
// POST { art: "monat" | "pass" | "credits110" | "credits230" | "portal", zurueck: "https://…" }  (mit Login)
// → { url }  (Stripe Checkout bzw. Kundenportal)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const LOOKUP: Record<string, string> = { monat: "medat_monat", pass: "medat_pass_2027", credits110: "medat_credits_110", credits230: "medat_credits_230" };
const CREDITS: Record<string, number> = { credits110: 110, credits230: 230 };
const ERLAUBT = [/^https:\/\/[a-z0-9-]+\.vercel\.app\//, /^https:\/\/(www\.)?medat-trainer\.[a-z]+\//, /^http:\/\/localhost(:\d+)?\//];

function form(o: Record<string, unknown>, pre = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(o)) {
    const key = pre ? `${pre}[${k}]` : k;
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x, i) => typeof x === "object" ? form(x as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x)));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}
async function sp(key: string, path: string, body?: Record<string, unknown>) {
  const r = await fetch("https://api.stripe.com/v1" + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: body ? form(body).toString() : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || `Stripe ${r.status}`); return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const { data: { user } } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } }).auth.getUser();
    if (!user) return json({ error: "Bitte zuerst anmelden." }, 401);
    const key = Deno.env.get("STRIPE_SECRET_KEY")!;
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { art, zurueck } = await req.json();
    const basis = ERLAUBT.some((r) => r.test(String(zurueck || ""))) ? String(zurueck).split("#")[0] : "https://medat-trainer.vercel.app/";
    const { data: abo } = await db.from("medat_abo").select("*").eq("user_id", user.id).maybeSingle();
    const aktiv = abo && new Date(abo.bis) > new Date() && abo.status !== "beendet";

    if (art === "portal") {
      if (!abo?.stripe_customer) return json({ error: "Es gibt noch kein Abo zum Verwalten." }, 400);
      const s = await sp(key, "/billing_portal/sessions", { customer: abo.stripe_customer, return_url: basis });
      return json({ url: s.url });
    }
    if (!LOOKUP[art]) return json({ error: "Unbekanntes Angebot" }, 400);
    if (art === "monat" && aktiv && abo.art === "monat" && abo.stripe_subscription) return json({ error: "Du hast das Monatsabo schon. Verwalten kannst du es unter „Abo verwalten“." }, 409);
    if (art === "monat" && aktiv && abo.art === "pass") return json({ error: "Du hast den MedAT-Pass – damit ist alles schon freigeschaltet." }, 409);
    if (art === "pass" && aktiv && abo.art === "pass") return json({ error: "Du hast den MedAT-Pass schon." }, 409);
    if (CREDITS[art] && !(aktiv && abo.art !== "probe")) return json({ error: "Credits nachkaufen geht mit Monatsabo oder MedAT-Pass." }, 409);
    const preise = await sp(key, `/prices?active=true&lookup_keys[]=${LOOKUP[art]}`);
    const preis = preise.data?.[0]; if (!preis) return json({ error: "Angebot nicht gefunden" }, 500);
    const meta = { app: "medat", art, user_id: user.id, ...(CREDITS[art] ? { credits: String(CREDITS[art]) } : {}) };
    const sess = await sp(key, "/checkout/sessions", {
      mode: art === "monat" ? "subscription" : "payment",
      line_items: [{ price: preis.id, quantity: 1 }],
      client_reference_id: user.id,
      ...(abo?.stripe_customer ? { customer: abo.stripe_customer } : { customer_email: user.email }),
      ...(art !== "monat" && !abo?.stripe_customer ? { customer_creation: "always", invoice_creation: { enabled: true } } : {}),
      ...(art !== "monat" && abo?.stripe_customer ? { invoice_creation: { enabled: true } } : {}),
      metadata: meta,
      ...(art === "monat" ? { subscription_data: { metadata: meta } } : { payment_intent_data: { metadata: meta } }),
      automatic_tax: { enabled: true },
      ...(abo?.stripe_customer ? { customer_update: { address: "auto", name: "auto" } } : {}),
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      locale: "de",
      custom_text: { submit: { message: art === "monat" ? "Monatlich kündbar. Der Zugang startet sofort nach der Zahlung." : "Der Zugang startet sofort nach der Zahlung." } },
      success_url: basis + (basis.includes("?") ? "&" : "?") + "kauf=ok&art=" + art,
      cancel_url: basis + (basis.includes("?") ? "&" : "?") + "kauf=abbruch",
    });
    return json({ url: sess.url });
  } catch (e) { return json({ error: String(e instanceof Error ? e.message : e) }, 500); }
});
