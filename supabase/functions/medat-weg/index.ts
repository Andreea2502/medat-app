// medat-weg – die drei Knöpfe der Status-Mail an die bisherigen Nutzer (Andreea, 19.10.2026)
// Jeder Link trägt einen persönlichen, signierten Schlüssel (t) – kein Login nötig.
//   POST { t, wahl: "bestanden" | "aufhoeren" | "weiterlernen" }        → Wahl speichern (weiterlernen: 14 Tage Probezeit)
//   POST { t, loeschen: true }                                           → Konto und alle Daten löschen (nach Bestätigung auf der Seite)
//   POST { aktion: "links", basis } mit Admin-Login                       → persönliche Links für alle Konten (zum Versenden)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const ADMINS = ["office@ai-guide.at", "andreea.negru@gmx.at"];
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sig(id: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("medat-weg|" + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(id)))).slice(0, 22);
}
const schluessel = async (id: string) => `${id}.${await sig(id)}`;
async function pruefe(t: string): Promise<string | null> {
  const [id, s] = String(t || "").split(".");
  if (!/^[0-9a-f-]{36}$/.test(id || "") || !s) return null;
  return (await sig(id)) === s ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const b = await req.json().catch(() => ({}));
    if (b.aktion === "links") {
      const auth = req.headers.get("Authorization") || "";
      const { data: { user } } = await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } }).auth.getUser();
      if (!user || !ADMINS.includes(user.email || "")) return json({ error: "Kein Zugang" }, 403);
      const basis = String(b.basis || "https://medat-trainer.vercel.app/weg.html");
      const alle: { id: string; email: string; letzter: string | null }[] = [];
      for (let seite = 1; seite < 20; seite++) {
        const { data } = await db.auth.admin.listUsers({ page: seite, perPage: 200 });
        const us = data?.users || []; us.forEach((u: any) => alle.push({ id: u.id, email: u.email, letzter: u.last_sign_in_at }));
        if (us.length < 200) break;
      }
      const raus = [];
      for (const u of alle) { if (ADMINS.includes(u.email)) continue; const t = await schluessel(u.id); raus.push({ email: u.email, letzter_login: u.letzter, bestanden: `${basis}?w=bestanden&t=${t}`, aufhoeren: `${basis}?w=aufhoeren&t=${t}`, weiterlernen: `${basis}?w=weiterlernen&t=${t}` }); }
      return json({ anzahl: raus.length, links: raus });
    }
    const id = await pruefe(b.t);
    if (!id) return json({ error: "Dieser Link ist ungültig oder abgelaufen." }, 400);
    const { data: { user } } = await db.auth.admin.getUserById(id);
    if (!user) return json({ error: "Dieses Konto gibt es nicht mehr." }, 404);
    if (b.loeschen === true) {
      const { data: r } = await db.from("medat_rueckmeldung").select("wahl").eq("user_id", id).maybeSingle();
      if (!r || r.wahl === "weiterlernen") return json({ error: "Bitte zuerst auswählen." }, 400);
      const st = db.storage.from("lernfilme");
      const { data: ordner } = await st.list(id, { limit: 1000 });
      for (const o of ordner || []) { const { data: f } = await st.list(`${id}/${o.name}`); if (f?.length) await st.remove(f.map((x: any) => `${id}/${o.name}/${x.name}`)); }
      const { data: pdfs } = await db.storage.from("user-pdfs").list(id, { limit: 1000 });
      if (pdfs?.length) await db.storage.from("user-pdfs").remove(pdfs.map((x: any) => `${id}/${x.name}`));
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) return json({ error: "Löschen hat nicht geklappt – bitte schreib uns kurz an office@ai-guide.at." }, 500);
      await db.from("medat_rueckmeldung").update({ konto_geloescht: true }).eq("user_id", id);
      return json({ ok: true, geloescht: true });
    }
    const wahl = String(b.wahl || "");
    if (!["bestanden", "aufhoeren", "weiterlernen"].includes(wahl)) return json({ error: "Unbekannte Auswahl" }, 400);
    await db.from("medat_rueckmeldung").upsert({ user_id: id, email: user.email, wahl, zeit: new Date().toISOString() }, { onConflict: "user_id" });
    if (wahl === "weiterlernen") {
      const { data } = await db.rpc("medat_probe_fuer", { p_user: id });
      // Einwilligung für Mails nur, wenn ausdrücklich angehakt
      if (b.mails === true) await db.from("user_profiles").update({ email_consent_at: new Date().toISOString() }).eq("user_id", id).is("email_consent_at", null);
      return json({ ok: true, wahl, probe: data, email: user.email });
    }
    return json({ ok: true, wahl, email: user.email });
  } catch (e) { return json({ error: String(e instanceof Error ? e.message : e) }, 500); }
});
