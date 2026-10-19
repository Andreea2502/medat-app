// lernblick-bild
// ==============
// "Thema lernen" in LernBlick: Infografik zu einem Thema in einer Grafik-Art und einem
// Zeichenstil aus dem Lehrerzimmer (art_label + art_regeln = Aufbau, stil_text = Machart).
// Eigene Funktion – nano-banana (Live-App, KI-Tutor) bleibt unberührt.
//
// Bildmodell (18.10.2026): Liste über LERNBLICK_BILD_MODELS, sonst DEFAULT unten.
// Preise je Bild (Google, Standard, 1K): 2.5 Flash Image 0,039 $ · 3.1 Flash-Lite Image 0,034 $ ·
// 3.1 Flash Image 0,067 $ · 3 Pro Image 0,134 $. Dazu der Text-Schritt (2.5 Flash) ≈ 0,1 ct.
// OpenAI (gpt-image-…): nur wenn das Secret OPENAI_API_KEY gesetzt ist; Auswahl über modell oder LERNBLICK_BILD_MODELS.
//   Gemessen im Lehrerzimmer (17.09.2026): gpt-image-2.5-flare 1024×1024 „medium" ≈ 0,013 $, 1536×1024 „high" ≈ 0,042 $.
//   Qualität über LERNBLICK_BILD_QUALITAET (low|medium|high, Standard medium) oder body.qualitaet.
// Zugang: angemeldete Nutzer – oder der private Prüfstand-Schlüssel (Vorschaubilder, Tests).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bench-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const BENCH_HASH = "1edc8f6609955c4d09a8610d50de1329ade2f8ac64f6cfcea2975f7f4f12bdd1";
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// 3.1 Flash Image: im Vergleich (Aktionspotenzial-Merkblatt) fachlich richtige Kurve und fehlerfreie Schrift,
// Flash-Lite zeichnete den Gipfel bei +100 mV und verschrieb sich. Rückfall auf Lite, dann 2.5.
const DEFAULT_MODELS = "gemini-3.1-flash-image,gemini-3.1-flash-image-preview,gemini-3.1-flash-lite-image,gemini-2.5-flash-image";
const ERLAUBT = new Set([
  "gemini-3.1-flash-image", "gemini-3.1-flash-image-preview", "gemini-3.1-flash-lite-image",
  "gemini-3.1-flash-lite-image-preview", "gemini-2.5-flash-image",
]);
const OPENAI_SIZE: Record<string, string> = { "3:4": "1024x1536", "4:3": "1536x1024", "1:1": "1024x1024" };
const ORIENT: Record<string, [string, string]> = {
  hochformat: ["3:4", "PORTRAIT orientation (taller than wide, like an A4 page standing upright)."],
  querformat: ["4:3", "LANDSCAPE orientation (wider than tall)."],
  quadrat: ["1:1", "SQUARE format."],
};
const TEXT_MODELS = ["gemini-2.5-flash", "gemini-flash-latest"];


// ---- KI-Credits (neues Modell, Andreea 19.10.2026) ----
// Abgebucht wird, wenn die neue App es verlangt (abrechnung: "credits") oder MEDAT_CREDITS_PFLICHT=1 gesetzt ist.
// Admins zahlen nichts. Bei einem Datenbankfehler wird nicht blockiert.
const KI_ADMINS = ["office@ai-guide.at", "andreea.negru@gmx.at"];
async function kiAbbuchen(user: { id: string; email?: string }, menge: number, grund: string, verlangt: boolean): Promise<boolean> {
  if (!(verlangt || Deno.env.get("MEDAT_CREDITS_PFLICHT") === "1") || KI_ADMINS.includes(user.email || "")) return true;
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await db.rpc("ki_abbuchen", { p_user: user.id, p_menge: menge, p_grund: grund });
    if (error) { console.error("ki_abbuchen", error.message); return true; }
    return (data as number) >= 0;
  } catch (e) { console.error("ki_abbuchen", e); return true; }
}
const CREDITS_LEER = { error: "Deine KI-Credits sind für diesen Monat aufgebraucht. Du kannst im Konto Credits nachkaufen.", code: "credits" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  const t0 = Date.now();
  let userId: string | null = null, userEmail = "", abgebucht = false;
  try {
    const bt = req.headers.get("x-bench-token");
    const bench = !!bt && (await sha256(bt)) === BENCH_HASH;
    if (!bench) {
      const auth = req.headers.get("Authorization");
      if (!auth) return json({ error: "Bitte melde dich an." }, 401);
      const uc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
      const { data: { user }, error } = await uc.auth.getUser();
      if (error || !user) return json({ error: "Bitte melde dich an." }, 401);
      userId = user.id; userEmail = user.email || "";
    }
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "GEMINI_API_KEY fehlt" }, 500);

    const b = await req.json();
    if (b.pruefen && bench) return json({ openai: !!Deno.env.get("OPENAI_API_KEY"), modelle: Deno.env.get("LERNBLICK_BILD_MODELS") || DEFAULT_MODELS });   // nur nachsehen, ob der Schlüssel da ist – kostet nichts
    const thema = String(b.thema || "").trim().slice(0, 300);
    if (!thema) return json({ error: "Welches Thema?" }, 400);
    if (!bench && userId) {
      if (!(await kiAbbuchen({ id: userId, email: userEmail }, 8, "Bild", b.abrechnung === "credits"))) return json(CREDITS_LEER, 402);
      abgebucht = b.abrechnung === "credits" || Deno.env.get("MEDAT_CREDITS_PFLICHT") === "1";
    }
    const artLabel = String(b.art_label || "Lernposter").slice(0, 80);
    const artRegeln = String(b.art_regeln || "").slice(0, 2500);
    const stilText = String(b.stil_text || "Hand-drawn sketchnote style on cream paper, black felt-tip lines, small color accents.").slice(0, 900);
    const inhalt = String(b.inhalt || "").slice(0, 1500);
    const [aspect, orientText] = ORIENT[b.orientation] || ORIENT.hochformat;
    // Fertiger Inhalt (z. B. für Vorschaubilder) überspringt den Text-Schritt
    let beschreibung = String(b.beschreibung || "").slice(0, 3000);

    // ── 1. Inhalt planen ────────────────────────────────────────────
    if (!beschreibung) {
      const plan = `Du bist MEDIZIN-DOZENT und planst eine Lern-Infografik für den MedAT (Medizinaufnahmetest Österreich).
Niveau: Oberstufe bis erstes Studienjahr — fachlich exakt, in klaren, kurzen Stichworten.

THEMA: ${thema}
${inhalt ? `\nDAS MUSS VORKOMMEN (aus dem Gespräch mit dem Lernenden):\n${inhalt}\n` : ""}
GRAFIK-ART: ${artLabel}
So ist diese Art aufgebaut (halte dich genau daran):
${artRegeln}

Schreibe den kompletten INHALT der Grafik auf Deutsch:
- die Überschrift,
- jeden Bereich / Schritt / Ast mit Überschrift und 2–5 Stichworten (echte Fachbegriffe, Zahlen, Werte – keine Platzhalter),
- was gezeichnet wird und wo es steht (oben, Mitte, unten, links, rechts) – solche Zeichen-Anweisungen IMMER in [eckige Klammern], damit sie nicht als Text ins Bild kommen,
- wenn die Art es vorsieht: eine typische MedAT-Prüfungsfalle und eine Eselsbrücke.
Es ist eine GRAFIK, kein Text: Zeichnungen, Symbole und Pfeile tragen mindestens die Hälfte der Aussage.
Höchstens 90 Wörter sichtbarer Text insgesamt, nur Stichworte, keine ganzen Sätze.
Schreibweise: kein Markdown (keine Sternchen), kein LaTeX – Ionen und Formeln so, wie sie gedruckt aussehen (Na⁺, K⁺, Ca²⁺, CO₂, H₂O, →).
Antworte NUR mit der Beschreibung.`;
      for (const m of TEXT_MODELS) {
        if (beschreibung) break;
        try {
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
            method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ parts: [{ text: plan }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1600, thinkingConfig: { thinkingBudget: 0 } } }),
          });
          if (!r.ok) { console.error("plan", m, r.status, (await r.text()).slice(0, 200)); continue; }
          const d = await r.json();
          const t = (d?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
          if (t.length > 60) beschreibung = t;
        } catch (e) { console.error("plan", m, e); }
      }
      if (!beschreibung) beschreibung = `Lernposter auf Deutsch zum Thema ${thema}.`;
    }

    // ── 2. Bild ─────────────────────────────────────────────────────
    const prompt = [
      `Create a high-quality educational infographic. ${orientText}`,
      `Art der Grafik: „${artLabel}" zum Thema: ${thema}.`,
      artRegeln ? `AUFBAU DIESER ART:\n${artRegeln}` : "",
      `INHALT (genau diese Texte, fachlich korrekt, auf Deutsch). Was in [eckigen Klammern] steht, beschreibt nur, was gezeichnet wird – diese Wörter NICHT ins Bild schreiben:\n${beschreibung.replace(/\*\*/g, "")}`,
      stilText,
      "Text: Alle sichtbaren Wörter auf DEUTSCH, richtig geschrieben, gut lesbar, waagerecht. Kein englisches Wort, keine Platzhalter, keine Wasserzeichen, keine Logos.",
    ].filter(Boolean).join("\n\n");

    const liste = (Deno.env.get("LERNBLICK_BILD_MODELS") || DEFAULT_MODELS).split(",").map((m) => m.trim()).filter(Boolean);
    const wunsch = String(b.modell || "");
    const okModell = (m: string) => ERLAUBT.has(m) || /^gpt-image-[a-z0-9.\-]+$/.test(m);
    const models = okModell(wunsch) ? [wunsch, ...liste.filter((m) => m !== wunsch)] : liste;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const qualitaet = ["low", "medium", "high"].includes(b.qualitaet) ? b.qualitaet : (Deno.env.get("LERNBLICK_BILD_QUALITAET") || "medium");
    const fehler: string[] = [];
    for (const m of models) {
      if (m.startsWith("gpt-image")) {
        if (!openaiKey) { fehler.push(`${m}: OPENAI_API_KEY fehlt`); continue; }
        try {
          const r = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
            body: JSON.stringify({ model: m, prompt: prompt.slice(0, 32000), size: OPENAI_SIZE[aspect] || "1024x1536", quality: qualitaet, output_format: "jpeg", output_compression: 88, n: 1 }),
            signal: AbortSignal.timeout(150000),
          });
          const d = await r.json().catch(() => ({}));
          const b64 = d?.data?.[0]?.b64_json;
          if (!r.ok || !b64) { fehler.push(`${m}: ${r.status} ${String(d?.error?.message || "kein Bild").slice(0, 160)}`); continue; }
          const u = d?.usage || {};
          console.log("lernblick-bild-usage", JSON.stringify({ model: m, quality: qualitaet, in: u.input_tokens || 0, out: u.output_tokens || 0, ms: Date.now() - t0, bench }));
          try {
            const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
            await admin.from("image_generations").insert({ user_id: userId, session_id: crypto.randomUUID(), topic: `[LernBlick ${artLabel}] ${thema}`.slice(0, 500), prompt_used: `[${m} ${qualitaet}] ${prompt}`.slice(0, 3000), success: true });
          } catch (_) { /* Protokoll ist nicht wichtig */ }
          return json({ image_base64: b64, mime_type: "image/jpeg", inhalt: beschreibung, model: `${m} (${qualitaet})`, ms: Date.now() - t0, usage: { in: u.input_tokens || 0, out: u.output_tokens || 0 } });
        } catch (e) { fehler.push(`${m}: ${String(e)}`); continue; }
      }
      const send = (cfg: boolean) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"], temperature: 0.8,
            ...(cfg ? { imageConfig: { aspectRatio: aspect, ...(m.startsWith("gemini-2.5") ? {} : { imageSize: "1K" }) } } : {}),
          },
        }),
      });
      try {
        let r = await send(true);
        if (r.status === 400) {
          const t = await r.text();
          if (/image_?config|image_?size|aspect/i.test(t)) r = await send(false);
          else { fehler.push(`${m}: 400 ${t.slice(0, 160)}`); continue; }
        }
        if (!r.ok) { fehler.push(`${m}: ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
        const d = await r.json();
        const part = (d?.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { mimeType?: string } }) => p?.inlineData?.mimeType?.startsWith("image/"));
        if (!part) { fehler.push(`${m}: kein Bild`); continue; }
        const u = d?.usageMetadata || {};
        console.log("lernblick-bild-usage", JSON.stringify({ model: m, in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0, ms: Date.now() - t0, bench }));
        try {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          await admin.from("image_generations").insert({ user_id: userId, session_id: crypto.randomUUID(), topic: `[LernBlick ${artLabel}] ${thema}`.slice(0, 500), prompt_used: `[${m}] ${prompt}`.slice(0, 3000), success: true });
        } catch (_) { /* Protokoll ist nicht wichtig */ }
        return json({ image_base64: part.inlineData.data, mime_type: part.inlineData.mimeType, inhalt: beschreibung, model: m, ms: Date.now() - t0 });
      } catch (e) { fehler.push(`${m}: ${String(e)}`); }
    }
    console.error("lernblick-bild: kein Bild", fehler.join(" | "));
    if (abgebucht && userId && !KI_ADMINS.includes(userEmail)) { try { await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).rpc("ki_abbuchen", { p_user: userId, p_menge: -8, p_grund: "Bild fehlgeschlagen – zurück" }); } catch (_) { /* egal */ } }
    return json({ error: "Das Bild konnte gerade nicht erstellt werden. Bitte gleich nochmal versuchen.", inhalt: beschreibung, _fehler: fehler }, 502);
  } catch (e) {
    console.error("lernblick-bild", e);
    return json({ error: "Interner Fehler" }, 500);
  }
});
