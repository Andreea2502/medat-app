// lernblick-stimmprobe
// ====================
// Hörproben für die Stimmen-Auswahl (Gemini-Sprachausgabe). Nur mit dem privaten Prüfstand-Schlüssel.
// Body: { text: string (max. 600 Zeichen), stimme: "Kore" | "Aoede" | … }  →  audio/wav
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";

const BENCH_HASH = "1edc8f6609955c4d09a8610d50de1329ade2f8ac64f6cfcea2975f7f4f12bdd1";
const STIMMEN = new Set(["Kore", "Aoede", "Leda", "Despina", "Sulafat", "Achernar", "Gacrux", "Laomedeia", "Zephyr", "Callirrhoe", "Autonoe", "Erinome", "Vindemiatrix", "Pulcherrima"]);
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function wav(pcm: Uint8Array, rate = 24000): Uint8Array {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Nur POST", { status: 405 });
  if ((await sha256(req.headers.get("x-bench-token") || "")) !== BENCH_HASH) return new Response("Kein Zugang", { status: 401 });
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return new Response("GEMINI_API_KEY fehlt", { status: 500 });
  const b = await req.json();
  const text = String(b.text || "").slice(0, 600), stimme = STIMMEN.has(b.stimme) ? b.stimme : "Kore";
  let modelle = ["gemini-2.5-flash-preview-tts"];
  try {
    const l = await (await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": key } })).json();
    const tts = (l.models || []).map((m: { name: string }) => m.name.replace("models/", "")).filter((n: string) => /flash.*tts/i.test(n));
    if (tts.length) modelle = tts;
  } catch (_) { /* Standardliste */ }
  for (const model of modelle) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: stimme } } } } }),
    });
    if (!r.ok) { console.error("stimmprobe", model, r.status, (await r.text()).slice(0, 200)); continue; }
    const d = await r.json();
    const part = (d?.candidates?.[0]?.content?.parts || []).find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
    if (!part) continue;
    const rate = Number(((part.inlineData.mimeType || "").match(/rate=(\d+)/) || [])[1]) || 24000;
    return new Response(wav(decodeBase64(part.inlineData.data), rate), { headers: { "Content-Type": "audio/wav", "X-Model": model } });
  }
  return new Response("Keine Stimme verfügbar", { status: 502 });
});
