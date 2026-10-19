// medat-stripe-einrichten
// =======================
// Einmal-Skript (Andreea, 19.10.2026): legt das neue Bezahlmodell in Stripe an und nimmt die alten Einmalzahlungen vom Markt.
//   - MedAT Trainer · Monatsabo      14,90 €/Monat   (lookup_key medat_monat)
//   - MedAT Trainer · MedAT-Pass     99,00 € einmal   (lookup_key medat_pass_2027, gültig bis MedAT 2027)
//   - MedAT Trainer · KI-Credits     4,90 € (110) und 9,90 € (230)  (lookup_keys medat_credits_110 / medat_credits_230)
//   - Kundenportal (Abo kündigen, Zahlungsart ändern, Rechnungen)
//   - Webhook-Endpunkt bekommt die Abo-Ereignisse
//   - alte MedAT-Zahlungslinks (29,90 € Pro, 39,90 € Premium) deaktivieren, alte Produkte archivieren
// Fasst NUR MedAT-Dinge an (nie SnapSell, Lehrerzimmer, AI-Guide).
// Aufruf: POST { action: "dry-run" | "setup" } mit Admin-JWT oder Prüfstand-Schlüssel (x-bench-token).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BENCH_HASH = "1edc8f6609955c4d09a8610d50de1329ade2f8ac64f6cfcea2975f7f4f12bdd1";
const ADMIN_EMAILS = ["office@ai-guide.at", "andreea.negru@gmx.at"];
const API = "https://api.stripe.com/v1";
const ALT_LINKS = ["plink_1TbkHbHmusxgXNGLqGcTuyz9", "plink_1TVz3OHmusxgXNGLyEcB8rfP"];
const ALT_PRODUKTE = ["prod_UUDIG2KMBAhplW", "prod_UUDIq14qX50vhe"];
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "Content-Type": "application/json" } });
async function sha256(s: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join(""); }

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
  const r = await fetch(API + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" }, body: body ? form(body).toString() : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(`${path}: ${d.error?.message || r.status}`); return d;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  let ok = (await sha256(req.headers.get("x-bench-token") || "")) === BENCH_HASH;
  if (!ok) {
    const auth = req.headers.get("Authorization") || "";
    const u = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } }).auth.getUser();
    ok = !!u.data?.user && ADMIN_EMAILS.includes(u.data.user.email || "");
  }
  if (!ok) return json({ error: "Kein Zugang" }, 401);
  const key = Deno.env.get("STRIPE_SECRET_KEY"); if (!key) return json({ error: "STRIPE_SECRET_KEY fehlt" }, 500);
  const { action = "dry-run" } = await req.json().catch(() => ({}));
  const dry = action !== "setup";
  const plan: string[] = [], erg: Record<string, unknown> = {};
  try {
    // Preise per lookup_key – idempotent
    const preise = await sp(key, "/prices?active=true&limit=100&lookup_keys[]=medat_monat&lookup_keys[]=medat_pass_2027&lookup_keys[]=medat_credits_110&lookup_keys[]=medat_credits_230");
    const hat = (lk: string) => (preise.data || []).find((p: { lookup_key: string }) => p.lookup_key === lk);
    const NEU = [
      { lk: "medat_monat", name: "MedAT Trainer · Monatsabo", desc: "Voller Zugang zum MedAT Trainer: alle Fragen, Simulationen (jede Woche neue), LernBlick mit Tafel und Stimme, 350 KI-Credits pro Monat. Monatlich kündbar.", betrag: 1490, wiederkehrend: true, meta: { app: "medat", art: "monat" } },
      { lk: "medat_pass_2027", name: "MedAT Trainer · MedAT-Pass 2027", desc: "Voller Zugang bis zum MedAT 2027 (Juli 2027): alle Fragen und Simulationen sofort, LernBlick mit Tafel und Stimme, 300 KI-Credits pro Monat. Einmalzahlung, kein Abo.", betrag: 9900, wiederkehrend: false, meta: { app: "medat", art: "pass" } },
      { lk: "medat_credits_110", name: "MedAT Trainer · 110 KI-Credits", desc: "110 zusätzliche KI-Credits für LernBlick (verfallen nicht).", betrag: 490, wiederkehrend: false, meta: { app: "medat", art: "credits", credits: "110" } },
      { lk: "medat_credits_230", name: "MedAT Trainer · 230 KI-Credits", desc: "230 zusätzliche KI-Credits für LernBlick (verfallen nicht).", betrag: 990, wiederkehrend: false, meta: { app: "medat", art: "credits", credits: "230" } },
    ];
    for (const n of NEU) {
      const p = hat(n.lk);
      if (p) { erg[n.lk] = p.id; plan.push(`✓ ${n.name} gibt es schon (${p.id})`); continue; }
      plan.push(`+ ${n.name}: ${(n.betrag / 100).toFixed(2).replace(".", ",")} €${n.wiederkehrend ? " pro Monat" : " einmalig"}`);
      if (dry) continue;
      const prod = await sp(key, "/products", { name: n.name, description: n.desc, tax_code: "txcd_10103001", metadata: n.meta });
      const pr = await sp(key, "/prices", { product: prod.id, currency: "eur", unit_amount: n.betrag, tax_behavior: "inclusive", lookup_key: n.lk, metadata: n.meta, ...(n.wiederkehrend ? { recurring: { interval: "month" } } : {}) });
      erg[n.lk] = pr.id;
    }
    // Kundenportal: kündigen zum Periodenende, Zahlungsart, Rechnungen
    const konf = await sp(key, "/billing_portal/configurations?active=true&limit=20");
    const unsere = (konf.data || []).find((c: { metadata?: Record<string, string> }) => c.metadata?.app === "medat");
    if (unsere) { erg.portal = unsere.id; plan.push(`✓ Kundenportal gibt es schon (${unsere.id})`); }
    else {
      plan.push("+ Kundenportal: Abo zum Monatsende kündigen, Zahlungsart ändern, Rechnungen ansehen");
      if (!dry) {
        const c = await sp(key, "/billing_portal/configurations", { metadata: { app: "medat" }, business_profile: { headline: "MedAT Trainer – dein Abo" }, features: { subscription_cancel: { enabled: true, mode: "at_period_end" }, payment_method_update: { enabled: true }, invoice_history: { enabled: true }, customer_update: { enabled: true, allowed_updates: ["email", "address"] } } });
        erg.portal = c.id;
      }
    }
    // Webhook: Abo-Ereignisse zusätzlich
    const hooks = await sp(key, "/webhook_endpoints?limit=50");
    const h = (hooks.data || []).find((w: { url: string }) => /vbmhkdrpglezbznnwpws\.supabase\.co\/functions\/v1\/stripe-webhook/.test(w.url));
    const brauch = ["checkout.session.completed", "invoice.paid", "customer.subscription.updated", "customer.subscription.deleted"];
    if (!h) plan.push("⚠ Kein Webhook-Endpunkt für stripe-webhook gefunden");
    else {
      const fehlt = h.enabled_events.includes("*") ? [] : brauch.filter((e) => !h.enabled_events.includes(e));
      if (!fehlt.length) plan.push("✓ Webhook bekommt schon alle nötigen Ereignisse");
      else { plan.push(`+ Webhook bekommt zusätzlich: ${fehlt.join(", ")}`); if (!dry) await sp(key, `/webhook_endpoints/${h.id}`, { enabled_events: [...h.enabled_events, ...fehlt] }); }
    }
    // Alte Einmalzahlungen vom Markt
    for (const id of ALT_LINKS) {
      const l = await sp(key, `/payment_links/${id}`);
      if (!l.active) { plan.push(`✓ Zahlungslink ${l.url} ist schon aus`); continue; }
      plan.push(`− Zahlungslink ${l.url} deaktivieren`);
      if (!dry) await sp(key, `/payment_links/${id}`, { active: false, inactive_message: "Diesen Einmalzugang gibt es nicht mehr. Im MedAT Trainer findest du jetzt das Monatsabo und den MedAT-Pass." });
    }
    for (const id of ALT_PRODUKTE) {
      const p = await sp(key, `/products/${id}`);
      if (!/medat/i.test(p.name)) { plan.push(`⚠ ${id} ist kein MedAT-Produkt – nicht angefasst`); continue; }
      if (!p.active) { plan.push(`✓ ${p.name} ist schon archiviert`); continue; }
      plan.push(`− Produkt archivieren: ${p.name}`);
      if (!dry) await sp(key, `/products/${id}`, { active: false });
    }
    return json({ action, plan, ...erg });
  } catch (e) { return json({ action, plan, fehler: String(e instanceof Error ? e.message : e) }, 500); }
});
