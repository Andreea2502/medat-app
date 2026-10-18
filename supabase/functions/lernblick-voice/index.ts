// lernblick-voice
// ===============
// Natürliche Stimme für LernBlick: wandelt einen Satz in Sprache um.
// Standard: Gemini-Sprachausgabe über den vorhandenen Secret GEMINI_API_KEY (günstig, kein eigener Schlüssel nötig).
// Ersatz: ElevenLabs (ELEVENLABS_API_KEY), falls Gemini nicht antwortet oder LERNBLICK_VOICE_PROVIDER=elevenlabs.
// Nur für angemeldete Nutzer.
//
// POST .../functions/v1/lernblick-voice
// Authorization: Bearer <access_token des Nutzers>
// Body: { text: string (max. 3000 Zeichen, die ganze Antwort), lang?: "de" | "en" | "ro" | "tr" | "bks" | "uk" | "ar" }
// Antwort: audio/wav (Gemini) oder audio/mpeg (ElevenLabs)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROVIDER = (Deno.env.get("LERNBLICK_VOICE_PROVIDER") || "gemini").toLowerCase();
const GEMINI_VOICE = Deno.env.get("LERNBLICK_GEMINI_VOICE") || "Kore";
const TTS_LANG: Record<string, string> = { de: "de-DE", en: "en-GB", ro: "ro-RO", tr: "tr-TR", bks: "hr-HR", uk: "uk-UA", ar: "ar-EG" };
const EL_VOICE = Deno.env.get("LERNBLICK_VOICE_ID") || "TGvCjJzuyubkDwINImMA";
const EL_MODEL = Deno.env.get("LERNBLICK_VOICE_MODEL") || "eleven_flash_v2_5";
const LANG_CODES: Record<string, string> = { de: "de", en: "en", ro: "ro", tr: "tr", bks: "hr", uk: "uk", ar: "ar" };

// ---- Gemini: passendes Sprach-Modell einmal suchen und merken ----
let ttsModels: string[] | null = null;
async function geminiTtsModels(key: string): Promise<string[]> {
  if (ttsModels) return ttsModels;
  const preset = Deno.env.get("LERNBLICK_TTS_MODELS");
  if (preset) return (ttsModels = preset.split(",").map((s) => s.trim()).filter(Boolean));
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } });
    const d = await r.json();
    const names: string[] = (d.models || [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) => /tts/i.test(m.name) && (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""));
    // günstigste zuerst: flash-lite, dann flash, pro zuletzt
    const rank = (n: string) => (/lite/.test(n) ? 0 : /flash/.test(n) ? 1 : 2) + (/preview/.test(n) ? 0.5 : 0);
    names.sort((a, b) => rank(a) - rank(b));
    if (names.length) return (ttsModels = names.slice(0, 4));
  } catch (_) { /* weiter mit Standard */ }
  return (ttsModels = ["gemini-2.5-flash-preview-tts"]);
}
function wav(pcm: Uint8Array, rate = 24000): Uint8Array {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}
// Störgeräusche am Ende entfernen: kurzen Ausreißer nach einer Pause abschneiden, Stille kürzen, sanft ein- und ausblenden
function cleanPcm(bytes: Uint8Array, rate: number): Uint8Array {
  const n = Math.floor(bytes.length / 2);
  if (n < rate / 10) return bytes.subarray(0, n * 2);
  const s = new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + n * 2));
  const win = Math.round(rate * 0.02), wins = Math.floor(n / win), rms: number[] = [];
  let max = 0;
  for (let i = 0; i < wins; i++) { let e = 0; for (let j = i * win; j < (i + 1) * win; j++) e += s[j] * s[j]; const v = Math.sqrt(e / win); rms.push(v); if (v > max) max = v; }
  const thr = Math.max(250, max * 0.06), loud = rms.map((v) => v > thr);
  let end = wins - 1;
  while (end > 0 && !loud[end]) end--;
  // letztes lautes Stück: wenn kurz (< 0,4 s) und davor ≥ 0,2 s Pause → Ausreißer, weg damit (höchstens zweimal)
  for (let pass = 0; pass < 2; pass++) {
    let st = end; while (st > 0 && loud[st - 1]) st--;
    let gap = 0, g = st - 1; while (g > 0 && !loud[g]) { gap++; g--; }
    if ((end - st + 1) * 20 < 400 && gap * 20 >= 200 && g > 0) end = g; else break;
  }
  const cut = Math.min(n, (end + 1) * win + Math.round(rate * 0.15));
  const out = s.slice(0, cut);
  const fo = Math.min(cut, Math.round(rate * 0.06)), fi = Math.min(cut, Math.round(rate * 0.01));
  for (let i = 0; i < fo; i++) out[cut - 1 - i] = Math.round(out[cut - 1 - i] * (i / fo));
  for (let i = 0; i < fi; i++) out[i] = Math.round(out[i] * (i / fi));
  return new Uint8Array(out.buffer);
}
let langCodeOk = true, loggedMime = false;
async function geminiSpeak(text: string, lang: string): Promise<Response | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  // Nur der Text selbst – jede Regieanweisung würde mitgesprochen. Die Sprache wird fest vorgegeben (kein Akzent).
  const make = (withLang: boolean) => JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { ...(withLang ? { languageCode: TTS_LANG[lang] || "de-DE" } : {}), voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } },
    },
  });
  for (const model of await geminiTtsModels(key)) {
    const call = (b: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: b,
    });
    let r = await call(make(langCodeOk));
    if (!r.ok) {
      const t = await r.text();
      if (r.status === 400 && langCodeOk && /language/i.test(t)) {
        console.error("lernblick-voice: languageCode abgelehnt, versuche ohne", model, t.slice(0, 200));
        langCodeOk = false; r = await call(make(false));
        if (!r.ok) { console.error("lernblick-voice Gemini-Fehler", model, r.status, (await r.text()).slice(0, 300)); continue; }
      } else { console.error("lernblick-voice Gemini-Fehler", model, r.status, t.slice(0, 300)); continue; }
    }
    const d = await r.json();
    const part = (d?.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
    if (!part) { console.error("lernblick-voice: Gemini ohne Audio", model); continue; }
    const mime: string = part.inlineData.mimeType || "";
    const rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
    if (!loggedMime) { console.log("lernblick-voice Format", model, mime); loggedMime = true; }
    const bytes = decodeBase64(part.inlineData.data);
    // Kommt schon eine fertige Audiodatei (WAV/MP3/OGG), unverändert weitergeben – nicht ein zweites Mal verpacken.
    const isFile = /wav|mpeg|mp3|ogg|opus|webm/i.test(mime) || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46);
    if (isFile) return new Response(bytes, { status: 200, headers: { ...cors, "Content-Type": /mpeg|mp3/i.test(mime) ? "audio/mpeg" : /ogg|opus/i.test(mime) ? "audio/ogg" : "audio/wav", "Cache-Control": "no-store", "X-Voice": model } });
    return new Response(wav(cleanPcm(bytes, rate), rate), { status: 200, headers: { ...cors, "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-Voice": model } });
  }
  return null;
}
async function elevenSpeak(text: string, lang: string): Promise<Response | null> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) return null;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { Accept: "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify({ text, model_id: EL_MODEL, language_code: LANG_CODES[lang] || "de", voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true } }),
  });
  if (!res.ok) { console.error("lernblick-voice ElevenLabs-Fehler", res.status, (await res.text()).slice(0, 300)); return null; }
  return new Response(res.body, { status: 200, headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice": "elevenlabs" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Bitte melde dich an." }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Bitte melde dich an." }, 401);

    const { text, lang } = await req.json();
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return json({ error: "Kein Text" }, 400);
    if (clean.length > 3000) return json({ error: "Text zu lang (max. 3000 Zeichen)" }, 400);

    const order = PROVIDER === "elevenlabs" ? [() => elevenSpeak(clean, lang), () => geminiSpeak(clean, lang)] : [() => geminiSpeak(clean, lang), () => elevenSpeak(clean, lang)];
    for (const speak of order) { const r = await speak(); if (r) return r; }
    return json({ error: "Die Stimme ist gerade nicht erreichbar." }, 502);
  } catch (err) {
    console.error("lernblick-voice Fehler:", err);
    return json({ error: "Interner Fehler" }, 500);
  }
});
