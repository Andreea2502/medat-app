// lernblick-voice
// ===============
// Natürliche Stimme für LernBlick: wandelt einen Satz in Sprache um (ElevenLabs).
// Nutzt den vorhandenen Secret ELEVENLABS_API_KEY. Nur für angemeldete Nutzer.
// Günstiges, schnelles Modell (eleven_flash_v2_5) und kurze Texte, damit die Kosten klein bleiben.
//
// POST .../functions/v1/lernblick-voice
// Authorization: Bearer <access_token des Nutzers>
// Body: { text: string (max. 600 Zeichen), lang?: "de" | "en" | "ro" | "tr" | "bks" | "uk" | "ar", voice_id?: string }
// Antwort: audio/mpeg

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_VOICE = Deno.env.get("LERNBLICK_VOICE_ID") || "TGvCjJzuyubkDwINImMA";
const MODEL_ID = Deno.env.get("LERNBLICK_VOICE_MODEL") || "eleven_flash_v2_5";
const LANG_CODES: Record<string, string> = { de: "de", en: "en", ro: "ro", tr: "tr", bks: "hr", uk: "uk", ar: "ar" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Bitte melde dich an." }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Bitte melde dich an." }, 401);

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return json({ error: "Stimme nicht konfiguriert (ELEVENLABS_API_KEY fehlt)" }, 500);

    const { text, lang, voice_id } = await req.json();
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return json({ error: "Kein Text" }, 400);
    if (clean.length > 600) return json({ error: "Text zu lang (max. 600 Zeichen pro Satz)" }, 400);

    const voice = typeof voice_id === "string" && /^[A-Za-z0-9]{10,40}$/.test(voice_id) ? voice_id : DEFAULT_VOICE;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { Accept: "audio/mpeg", "Content-Type": "application/json", "xi-api-key": apiKey },
      body: JSON.stringify({
        text: clean,
        model_id: MODEL_ID,
        language_code: LANG_CODES[lang] || "de",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
      }),
    });
    if (!res.ok) {
      console.error("lernblick-voice ElevenLabs-Fehler", res.status, (await res.text()).slice(0, 300));
      return json({ error: "Die Stimme ist gerade nicht erreichbar." }, 502);
    }
    return new Response(res.body, { status: 200, headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("lernblick-voice Fehler:", err);
    return json({ error: "Interner Fehler" }, 500);
  }
});
