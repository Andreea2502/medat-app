// lernblick-bench
// ===============
// Nur für den automatischen Prüfstand: gleiche KI-Anfrage wie lernblick-chat,
// aber ohne Nutzer-Login. Zugang nur mit dem privaten Prüfstand-Schlüssel (hier steht nur sein SHA-256-Hash).
// Gibt zusätzlich den Token-Verbrauch zurück, damit die Kosten pro Lauf exakt berechnet werden können.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TOKEN_HASH = "1edc8f6609955c4d09a8610d50de1329ade2f8ac64f6cfcea2975f7f4f12bdd1";
const MODELS = (Deno.env.get("LERNBLICK_MODELS") || "gemini-2.5-flash,gemini-flash-latest").split(",").map((m) => m.trim()).filter(Boolean);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  if ((await sha256(req.headers.get("x-bench-token") || "")) !== TOKEN_HASH) return json({ error: "Kein Zugang" }, 401);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "GEMINI_API_KEY fehlt" }, 500);
  const { system_prompt, messages, image, stream, modell } = await req.json();
  const modelle = modell === "pruefen" ? ["gemini-2.5-pro", "gemini-2.5-flash"] : MODELS;
  if (typeof system_prompt !== "string" || !Array.isArray(messages) || !messages.length) return json({ error: "Fehlende Angaben" }, 400);
  const contents = messages.slice(-14).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "").slice(0, 12_000) }],
  }));
  if (typeof image === "string" && image.length > 100) contents[contents.length - 1].parts.unshift({ inline_data: { mime_type: "image/jpeg", data: image } } as never);
  const body = JSON.stringify({
    system_instruction: { parts: [{ text: system_prompt }] },
    contents,
    generationConfig: { temperature: modell === "pruefen" ? 0.1 : 0.4, maxOutputTokens: 16384, thinkingConfig: { thinkingBudget: modell === "pruefen" ? 4096 : 2048 } },
  });
  const t0 = Date.now();
  for (const model of modelle) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, body,
    });
    if (res.status === 404) continue;
    if (!res.ok) return json({ error: `${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
    if (stream) {
      // wie lernblick-chat: nur der Antworttext, Stück für Stück; Verbrauch steht am Ende im Kopf-Ersatz-Zeile
      const enc = new TextEncoder(), dec = new TextDecoder();
      const out = new ReadableStream({
        async start(ctrl) {
          const reader = res.body!.getReader(); let buf = "", usage: Record<string, number> = {};
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            buf += dec.decode(value, { stream: true }); let i;
            while ((i = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
              if (!line.startsWith("data:")) continue;
              try { const d = JSON.parse(line.slice(5)); if (d.usageMetadata) usage = d.usageMetadata;
                const t = (d?.candidates?.[0]?.content?.parts || []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || "").join("");
                if (t) ctrl.enqueue(enc.encode(t)); } catch (_) { /* weiter */ }
            }
          }
          console.log("lernblick-bench-usage", JSON.stringify({ model, stream: true, in: usage.promptTokenCount || 0, out: usage.candidatesTokenCount || 0, think: usage.thoughtsTokenCount || 0 }));
          ctrl.enqueue(enc.encode(`\n<<<USAGE ${JSON.stringify({ in: usage.promptTokenCount || 0, out: usage.candidatesTokenCount || 0, think: usage.thoughtsTokenCount || 0 })}>>>`));
          ctrl.close();
        },
      });
      return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    const data = await res.json();
    const u = data?.usageMetadata || {};
    const usage = { in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0, think: u.thoughtsTokenCount || 0, cached: u.cachedContentTokenCount || 0 };
    console.log("lernblick-bench-usage", JSON.stringify({ model, ...usage }));
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    return json({ response: text, model, usage, ms: Date.now() - t0, finish: data?.candidates?.[0]?.finishReason || "" });
  }
  return json({ error: "Kein Modell" }, 502);
});
