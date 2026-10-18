// lernblick-chat
// ==============
// KI-Lerntutor LernBlick: nimmt das Gespräch plus einen Screenshot des aktuellen
// App-Bildschirms entgegen und fragt Google Gemini (liest Bilder).
// Nutzt den vorhandenen Secret GEMINI_API_KEY. Nur für angemeldete Nutzer.
//
// POST .../functions/v1/lernblick-chat
// Authorization: Bearer <access_token des Nutzers>
// Body: { system_prompt: string, messages: [{role, content}], image?: base64-JPEG ohne "data:"-Präfix, stream?: boolean }
// Antwort: { response: string } – oder mit stream: true der Text Stück für Stück (text/plain), sobald die KI schreibt

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Erst das bevorzugte Modell, bei "Modell nicht gefunden" das nächste.
const MODELS = (Deno.env.get("LERNBLICK_MODELS") || "gemini-2.5-flash,gemini-flash-latest").split(",").map((m) => m.trim()).filter(Boolean);
const MAX_IMAGE_BYTES = 4_000_000;

// Gemini schickt Server-Sent-Events; wir reichen nur den reinen Antworttext weiter (ohne Denk-Teile)
function streamOut(res: Response, model: string, img: boolean): Response {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const body = new ReadableStream({
    async start(ctrl) {
      const reader = res.body!.getReader();
      let buf = "", usage: Record<string, number> = {}, any = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const d = JSON.parse(line.slice(5));
              if (d.usageMetadata) usage = d.usageMetadata;
              const t = (d?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("");
              if (t) { any = true; ctrl.enqueue(enc.encode(t)); }
            } catch (_) { /* unvollständige Zeile */ }
          }
        }
      } catch (e) { console.error("lernblick-chat Stream-Fehler", e); }
      console.log("lernblick-usage", JSON.stringify({ model, in: usage.promptTokenCount || 0, out: usage.candidatesTokenCount || 0, think: usage.thoughtsTokenCount || 0, cached: usage.cachedContentTokenCount || 0, img, stream: true, empty: !any }));
      ctrl.close();
    },
  });
  return new Response(body, { status: 200, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Model": model } });
}

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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "KI nicht konfiguriert (GEMINI_API_KEY fehlt)" }, 500);

    const { system_prompt, messages, image, stream, kurz } = await req.json();
    if (typeof system_prompt !== "string" || !Array.isArray(messages) || !messages.length) {
      return json({ error: "Fehlende Angaben: system_prompt und messages" }, 400);
    }
    if (system_prompt.length > 60_000) return json({ error: "Anleitung zu lang" }, 400);

    const contents = messages.slice(-14).map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "").slice(0, 12_000) }],
    }));
    // Der Screenshot gehört zur letzten Frage
    if (typeof image === "string" && image.length > 100) {
      if (image.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: "Bildschirmaufnahme zu groß" }, 400);
      contents[contents.length - 1].parts.unshift({ inline_data: { mime_type: "image/jpeg", data: image } } as never);
    }

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: system_prompt }] },
      contents,
      // kurz: schnelle Analyse (Denkfehler, Gesprächsaufhänger) – ohne Nachdenk-Phase, wenige Wörter
      generationConfig: kurz ? { temperature: 0.3, maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } } : { temperature: 0.4, maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: 2048 } },
    });

    let lastError = "";
    for (const model of MODELS) {
      const call = (b: string) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: b,
      });
      let res = await call(body);
      // Falls ein Modell die Denk-Einstellung nicht kennt: ohne nochmal
      if (res.status === 400) { const t = await res.text(); if (/thinking/i.test(t)) res = await call(body.replace(/,"thinkingConfig":\{[^}]*\}/, "")); else res = new Response(t, { status: 400 }); }
      if (res.status === 404) { lastError = `Modell ${model} nicht verfügbar`; continue; }
      if (!res.ok) {
        lastError = `${res.status}: ${(await res.text()).slice(0, 300)}`;
        console.error("lernblick-chat Gemini-Fehler", model, lastError);
        return json({ error: "Die KI hat gerade nicht geantwortet. Bitte versuch es gleich nochmal." }, 502);
      }
      if (stream) return streamOut(res, model, !!image);
      const data = await res.json();
      // Verbrauch protokollieren (ohne Inhalte), damit die echten Kosten pro Antwort messbar sind
      const u = data?.usageMetadata || {};
      console.log("lernblick-usage", JSON.stringify({ model, in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0, think: u.thoughtsTokenCount || 0, cached: u.cachedContentTokenCount || 0, img: !!image, kurz: !!kurz }));
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
      if (!text) return json({ error: "Keine Antwort erhalten. Bitte nochmal versuchen." }, 502);
      return json({ response: text, model });
    }
    console.error("lernblick-chat: kein Modell verfügbar", lastError);
    return json({ error: "Kein KI-Modell verfügbar." }, 502);
  } catch (err) {
    console.error("lernblick-chat Fehler:", err);
    return json({ error: "Interner Fehler" }, 500);
  }
});
