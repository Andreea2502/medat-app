/* ==========================================================================
   Lern-Assistent – MedAT Trainer
   Text-Chat, der die ganze App kennt: startet Übungen und Simulationen,
   stellt Fragenblätter (PDF) aus der Fragenbank zusammen und merkt sich,
   was schon dran war, baut Arbeitsblätter und Zusammenfassungen auf
   MedAT-Niveau (mit KI) und übergibt Erklärungen an LernBlick.
   Grundsatz wie bei Nora im Lehrerzimmer: Er erfindet nichts, er wählt aus
   einem festen Katalog. Die KI versteht nur den Wunsch (eine kleine Anfrage),
   gebaut wird im Code aus den vorhandenen Fragen.
   ========================================================================== */
(function () {
"use strict";
if (window.Assistent) return;

const NAME = "Lern-Assistent";
const KI_HINWEIS = "Erstellt mit künstlicher Intelligenz (MedAT Trainer). KI kann Fehler machen – bitte wichtige Inhalte mit Lehrbuch oder Skript abgleichen.";
const $ = (id) => document.getElementById("as-" + id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9äöü]+/g, " ").trim();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

const st = { open: false, busy: false, verlauf: store.get("as-verlauf-v1", []), katalog: null };

// ---------------------------------------------------------------- Katalog
// Alles, was der Assistent anbieten darf – direkt aus der App gelesen (neue Werkzeuge sind ohne Pflege dabei).
const UNTERTESTE = {
  allergieausweise: { label: "Allergieausweise (Einprägen → Zahlenfolgen → Abruf, wie im MedAT)", block: "kff", pdf: ["kff__allergieausweis_mem", "kff__allergieausweis_abruf"] },
  figuren: { label: "Figuren zusammensetzen", block: "kff", key: "figuren" },
  zahlenfolge: { label: "Zahlenfolgen", block: "kff", key: "zahlenfolge" },
  wortfluessigkeit: { label: "Wortflüssigkeit", block: "kff", key: "wortfluessigkeit" },
  implikation: { label: "Implikationen erkennen", block: "kff", key: "implikation" },
  textverstaendnis: { label: "Textverständnis", block: "tv", key: "textverstaendnis" },
  emotionen_erkennen: { label: "Emotionen erkennen (SEK)", block: "sek", key: "emotionen_erkennen" },
  emotionen_regulieren: { label: "Emotionen regulieren (SEK)", block: "sek", key: "emotionen_regulieren" },
  soziales_entscheiden: { label: "Soziales Entscheiden (SEK)", block: "sek", key: "soziales_entscheiden" },
};
const BEREICHE = {
  b1: { titel: "Wissens-Lab (alle interaktiven Werkzeuge)", los: () => App.showScreen("screen-tools") },
  b2: { titel: "Lernarchiv (gespeicherte Bilder, Zusammenfassungen, Gespräche)", los: () => (typeof Gallery !== "undefined" ? Gallery.open() : App.showScreen("screen-gallery")) },
  b3: { titel: "Lernplan bis zum MedAT", los: () => App.showScreen("screen-lernplan") },
  b4: { titel: "Prüfungsfallen-Lab (typische Denkfehler trainieren)", los: () => (typeof TrapLab !== "undefined" ? TrapLab.open() : null) },
  b5: { titel: "Simulationen (komplette MedAT-Simulation, Übersicht)", los: () => App.openSimOverview() },
  b6: { titel: "Cheat-Sheets und Geschenke", los: () => App.showScreen("screen-goodies") },
  b7: { titel: "Statistik und Fortschritt", los: () => App.showScreen("screen-stats") },
  b8: { titel: "Schwächen-Analyse (welche Themen noch wackeln)", los: () => App.showScreen("screen-weakness") },
  b9: { titel: "PDF-Simulator (eigene Simulation zum Ausdrucken zusammenstellen)", los: () => (typeof PDFExport !== "undefined" ? PDFExport.openDialog() : null) },
  b10: { titel: "Übungsmodus (Untertest und Schwierigkeit selbst wählen)", los: () => App.showScreen("screen-practice-select") },
};
async function katalog() {
  if (st.katalog) return st.katalog;
  const werk = [];
  document.querySelectorAll("#screen-tools .tools-card, .eli5-card").forEach((a) => {
    const titel = ((a.querySelector("h3") || {}).textContent || "").replace(/\s+/g, " ").trim(), href = a.getAttribute("href");
    if (!titel || !href) return;
    const grid = a.closest(".tools-grid"), head = grid && grid.previousElementSibling;
    werk.push({ titel, text: ((a.querySelector("p") || {}).textContent || "").trim(), fach: a.classList.contains("eli5-card") ? "Einfach erklärt" : head && head.classList.contains("tools-section-title") ? head.textContent.trim() : "Wissens-Lab", href: new URL(href, location.origin + "/").href, card: a });
  });
  let sheets = [];
  try {
    if (typeof Auth !== "undefined" && Auth.supabase) {
      const { data } = await Auth.supabase.from("goodies").select("id,title,content_highlights,files");
      sheets = (data || []).map((g) => ({ id: g.id, titel: g.title, text: (Array.isArray(g.content_highlights) ? g.content_highlights : []).join(", ") }));
    }
  } catch (e) {}
  const ziele = {};
  Object.entries(BEREICHE).forEach(([k, v]) => { ziele[k] = { art: "bereich", ...v }; });
  werk.forEach((w, i) => { ziele["w" + (i + 1)] = { art: "werkzeug", ...w }; });
  sheets.forEach((s, i) => { ziele["s" + (i + 1)] = { art: "sheet", ...s }; });
  return (st.katalog = { ziele });
}
function katalogText(k) {
  const T = CONFIG.BMS_TOPICS || {};
  const fach = Object.entries(T).map(([f, ts]) => `- ${f}: ${ts.join(" | ")}`).join("\n");
  const ut = Object.entries(UNTERTESTE).map(([k2, v]) => `- ${k2}: ${v.label}`).join("\n");
  const z = Object.entries(k.ziele).map(([id, v]) => `- ${id}: ${v.art === "sheet" ? "Cheat-Sheet „" + v.titel + "“" + (v.text ? " (" + v.text.slice(0, 120) + ")" : "") : v.titel + (v.fach ? " – " + v.fach : "") + (v.text ? ": " + v.text : "")}`).join("\n");
  return `BMS-FÄCHER UND THEMEN (Fragenbank: Biologie 939, Chemie 495, Physik 303, Mathematik 250 Fragen):\n${fach}\n\nUNTERTESTE (KFF, TV, SEK):\n${ut}\n\nBEREICHE, WERKZEUGE, CHEAT-SHEETS (Kürzel):\n${z}`;
}

// ---------------------------------------------------------------- KI
async function token() {
  const sb = typeof Auth !== "undefined" && Auth.supabase;
  if (!sb) throw new Error("Bitte melde dich an, um den Lern-Assistenten zu nutzen.");
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.access_token) return session.access_token;
  const { data: r } = await sb.auth.refreshSession();
  if (r && r.session) return r.session.access_token;
  throw new Error("Bitte melde dich an, um den Lern-Assistenten zu nutzen.");
}
async function ki(system, messages, kurz) {
  const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lernblick-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, apikey: CONFIG.SUPABASE_ANON_KEY },
    body: JSON.stringify({ system_prompt: system, messages, kurz: !!kurz }),
  });
  const d = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(d.error || `Fehler ${resp.status}`);
  return String(d.response || "");
}
function jsonAus(t) {
  const s = String(t).replace(/^```(?:json)?\s*|\s*```$/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  return JSON.parse(s.slice(a, b + 1));
}

const PLAN_REGELN = (kt) => `Du bist der ${NAME} im MedAT Trainer – einer App zur Vorbereitung auf den MedAT (Medizinaufnahmetest Österreich). Du kennst die App genau und stellst Übungen, Blätter und Simulationen zusammen.
Sprich Deutsch, Du-Form, kurz und freundlich, auf Matura- bzw. Studienniveau (nicht kindlich).
Du erfindest NICHTS: Fächer, Themen, Untertests und Kürzel nur aus dem KATALOG unten.

Antworte NUR mit JSON, ohne Erklärtext drumherum:
{"antwort": "1–3 Sätze an die Person", "aktion": {…} oder null, "vorschlaege": ["höchstens 3 kurze nächste Wünsche, in Ich-Form"]}

Mögliche Aktionen:
1. {"typ":"fragen","fach":"biologie|chemie|physik|mathematik","themen":["exakter Themenname"],"anzahl":20,"wie":"app|blatt"}
   Multiple-Choice-Fragen aus der Fragenbank. "app" = gleich in der App üben, "blatt" = druckbares Blatt/PDF mit Antwortbogen und Lösungen. themen darf leer sein (= alle Themen des Fachs).
2. {"typ":"untertest","untertest":"<Schlüssel>","anzahl":10,"wie":"app|pdf"} – ein KFF-, TV- oder SEK-Untertest. "allergieausweise" läuft wie im MedAT: Einprägen, dann Zahlenfolgen, dann Abruf.
3. {"typ":"simulation","bloecke":["bms","tv","kff","sek"],"wie":"app|pdf"} – ganze oder Teil-Simulation (nur die genannten Blöcke).
4. {"typ":"oeffnen","ziel":"<Kürzel>"} – einen Bereich, ein Werkzeug oder ein Cheat-Sheet öffnen.
5. {"typ":"arbeitsblatt","fach":"…","thema":"genau so konkret wie gewünscht (z. B. „Synapse“, NICHT verallgemeinern zu „Nervensystem“)","bausteine":["aufgaben","multiple_choice","wahr_falsch","zuordnen","lueckentext","kreuzwort","tabelle"],"seiten":2,"bild":false}
   KI-Arbeitsblatt zu einem Thema zum Ausdrucken. bild:true = mit gezeichneter Abbildung zum Beschriften (nur wenn gewünscht oder bei Aufbau-/Anatomie-Themen sinnvoll).
6. {"typ":"zusammenfassung","fach":"…","thema":"genau so konkret wie gewünscht","bild":false} – kompakte Lernzusammenfassung auf MedAT-Niveau zum Ausdrucken.
7. {"typ":"erklaeren","frage":"…"} – wenn jemand etwas ERKLÄRT haben will (dann übernimmt LernBlick mit Tafel und Stimme).
HANDLE SOFORT: Sobald Art (Fragen, Arbeitsblatt, Zusammenfassung, Untertest, Simulation …) und Thema oder Fach erkennbar sind, setzt du die Aktion – frag NICHT nach Details wie Abbildung, Seitenzahl, Bausteinen oder Anzahl, nimm sinnvolle Standardwerte (bei Aufbau, Anatomie, Zellen, Organen, Geweben, Synapse, Neuron: "bild":true). In "antwort" sagst du kurz, was du baust.
Nur wenn wirklich nicht erkennbar ist, worum es geht, setze aktion auf null und stelle GENAU EINE kurze Rückfrage.
Standardwerte: 20 Fragen, wenn keine Zahl genannt ist (höchstens 80). "wie":"app", außer es fällt PDF, drucken, Blatt, ausdrucken oder Arbeitsblatt. Fragen nach dem, was die App kann, beantwortest du kurz und schlägst passende Aktionen vor.

KATALOG
${kt}`;

// ---------------------------------------------------------------- Prüfen
function pruefe(a, k) {
  if (!a || typeof a !== "object") return null;
  const T = CONFIG.BMS_TOPICS || {};
  const fach = (f) => { const n = norm(f); return Object.keys(T).find((x) => x === n || n.startsWith(x.slice(0, 4))) || null; };
  const thema = (f, t) => (T[f] || []).find((x) => norm(x) === norm(t)) || (T[f] || []).find((x) => norm(x).includes(norm(t)) || norm(t).includes(norm(x).split(" ")[0])) || null;
  const n = (v, d, max) => Math.max(1, Math.min(max, parseInt(v, 10) || d));
  switch (a.typ) {
    case "fragen": { const f = fach(a.fach); if (!f) return null; return { typ: "fragen", fach: f, themen: [...new Set((a.themen || []).map((t) => thema(f, t)).filter(Boolean))], anzahl: n(a.anzahl, 20, 80), wie: a.wie === "blatt" || a.wie === "pdf" ? "blatt" : "app" }; }
    case "untertest": return UNTERTESTE[a.untertest] ? { typ: "untertest", untertest: a.untertest, anzahl: n(a.anzahl, 0, 60), wie: a.wie === "pdf" || a.wie === "blatt" ? "pdf" : "app" } : null;
    case "simulation": { const b = (a.bloecke || []).filter((x) => CONFIG.TEST_BLOCKS[x]); return { typ: "simulation", bloecke: b.length ? CONFIG.SIMULATION_ORDER.filter((x) => b.includes(x)) : [...CONFIG.SIMULATION_ORDER], wie: a.wie === "pdf" || a.wie === "blatt" ? "pdf" : "app" }; }
    case "oeffnen": return k.ziele[a.ziel] ? { typ: "oeffnen", ziel: a.ziel } : null;
    case "arbeitsblatt": { const ok = ["aufgaben", "multiple_choice", "wahr_falsch", "zuordnen", "lueckentext", "kreuzwort", "tabelle"]; const b = (a.bausteine || []).filter((x) => ok.includes(x)); return a.thema ? { typ: "arbeitsblatt", fach: fach(a.fach), thema: String(a.thema).slice(0, 120), bausteine: b.length ? b : ["aufgaben", "multiple_choice", "zuordnen", "lueckentext", "kreuzwort"], seiten: n(a.seiten, 2, 3), bild: !!a.bild } : null; }
    case "zusammenfassung": return a.thema ? { typ: "zusammenfassung", fach: fach(a.fach), thema: String(a.thema).slice(0, 120), bild: !!a.bild } : null;
    case "erklaeren": return a.frage ? { typ: "erklaeren", frage: String(a.frage).slice(0, 500) } : null;
  }
  return null;
}

// ---------------------------------------------------------------- Oberfläche
function baue() {
  const root = el("div"); root.id = "as-root";
  root.innerHTML = `
  <button id="as-fab" type="button" aria-label="${NAME} öffnen"><span aria-hidden="true">✦</span><span>${NAME}</span></button>
  <aside id="as-panel" class="as-panel" hidden aria-label="${NAME}">
    <header class="as-head"><div class="as-brand">${NAME}</div><div class="as-head-r"><button class="as-ghost" id="as-neu" type="button">Neu</button><button class="as-icon" id="as-x" type="button" aria-label="Schließen">✕</button></div></header>
    <div class="as-scroll" id="as-scroll"><div id="as-chat" class="as-chat" aria-live="polite"></div></div>
    <footer class="as-foot">
      <div class="as-tips" id="as-tips"></div>
      <form class="as-form" id="as-form"><textarea id="as-q" rows="2" placeholder="Was möchtest du üben? z. B. „30 Fragen Genetik als PDF“" aria-label="Dein Wunsch"></textarea><button class="as-send" type="submit">Los</button></form>
      <div class="as-ki">⚠︎ Der ${NAME} arbeitet mit künstlicher Intelligenz und kann Fehler machen – prüf wichtige Fakten nach.</div>
    </footer>
  </aside>
  <div id="as-blatt" class="as-blatt" hidden role="dialog" aria-label="Blatt">
    <div class="as-blatt-bar"><b id="as-blatt-titel">Blatt</b><span class="as-blatt-btns">
      <button type="button" class="as-ghost" id="as-loes">Lösungen zeigen</button>
      <button type="button" class="as-send" id="as-druck">Drucken / PDF</button>
      <button type="button" class="as-ghost" id="as-druck-l">Mit Lösungen drucken</button>
      <button type="button" class="as-icon" id="as-blatt-x" aria-label="Schließen">✕</button></span></div>
    <div class="as-blatt-scroll"><article id="as-seite" class="as-seite"></article></div>
  </div>`;
  document.body.appendChild(root);
  $("fab").onclick = () => oeffne();
  $("x").onclick = schliesse;
  $("neu").onclick = () => { st.verlauf = []; store.set("as-verlauf-v1", []); willkommen(); };
  $("form").onsubmit = (e) => { e.preventDefault(); const q = $("q").value.trim(); if (q) { $("q").value = ""; frage(q); } };
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("form").requestSubmit(); } });
  $("blatt-x").onclick = () => { $("blatt").hidden = true; document.documentElement.classList.remove("as-blatt-offen"); };
  $("loes").onclick = () => { const on = $("seite").classList.toggle("mit-loesungen"); $("loes").textContent = on ? "Lösungen ausblenden" : "Lösungen zeigen"; };
  $("druck").onclick = () => drucke(false);
  $("druck-l").onclick = () => drucke(true);
  // Auf dem Anmeldebildschirm keinen Knopf zeigen
  setInterval(() => { const a = document.getElementById("screen-auth"); $("fab").style.display = a && a.classList.contains("active") ? "none" : ""; }, 800);
}
function drucke(mitLoes) {
  const s = $("seite"), vorher = s.classList.contains("mit-loesungen");
  s.classList.toggle("mit-loesungen", mitLoes);
  window.print();
  setTimeout(() => s.classList.toggle("mit-loesungen", vorher), 500);
}
function oeffne(text) {
  $("panel").hidden = false; st.open = true; document.documentElement.classList.add("as-offen");
  if (!$("chat").children.length) willkommen();
  katalog();
  if (text) frage(text); else setTimeout(() => $("q").focus(), 60);
}
function schliesse() { $("panel").hidden = true; st.open = false; document.documentElement.classList.remove("as-offen"); }
const STARTER = ["20 Biologie-Fragen zur Genetik als PDF", "Ich will Allergieausweise üben", "Arbeitsblatt zur Synapse zum Ausdrucken", "Zusammenfassung Säure-Base", "Mini-Simulation nur KFF", "Was kann die App alles?"];
function willkommen() {
  $("chat").replaceChildren();
  blase("as", `Hallo! Ich kenne die ganze App. Sag mir einfach, was du üben willst – ich stelle dir Fragen, Arbeitsblätter, Zusammenfassungen oder eine Simulation zusammen, als Übung in der App oder zum Ausdrucken. Erklären mit Tafel und Stimme übernimmt LernBlick.`);
  tipps(STARTER);
}
function tipps(list) {
  $("tips").replaceChildren(...(list || []).slice(0, 4).map((t) => { const b = el("button", "as-tip", t); b.type = "button"; b.onclick = () => frage(t); return b; }));
}
function blase(wer, text) {
  const b = el("div", "as-msg as-" + wer); b.textContent = text; $("chat").appendChild(b);
  $("scroll").scrollTop = $("scroll").scrollHeight; return b;
}
function karte(titel, text, knoepfe) {
  const c = el("div", "as-karte");
  c.appendChild(el("b", "", titel)); if (text) c.appendChild(el("p", "", text));
  if (knoepfe && knoepfe.length) { const r = el("div", "as-karte-btns"); knoepfe.forEach(([l, f, haupt]) => { const b = el("button", haupt ? "as-send" : "as-ghost", l); b.type = "button"; b.onclick = f; r.appendChild(b); }); c.appendChild(r); }
  $("chat").appendChild(c); $("scroll").scrollTop = $("scroll").scrollHeight; return c;
}
function warte(text) { const w = el("div", "as-msg as-as as-warte", text); $("chat").appendChild(w); $("scroll").scrollTop = $("scroll").scrollHeight; return w; }

// ---------------------------------------------------------------- Ablauf
async function frage(q) {
  if (st.busy) return;
  st.busy = true; tipps([]);
  blase("ich", q);
  const w = warte("Moment …");
  try {
    const k = await katalog();
    st.verlauf.push({ role: "user", content: q });
    const roh = await ki(PLAN_REGELN(katalogText(k)), st.verlauf.slice(-8), true);
    let plan; try { plan = jsonAus(roh); } catch (e) { plan = { antwort: roh.replace(/[{}"]/g, "").slice(0, 400), aktion: null }; }
    w.remove();
    const antwort = String(plan.antwort || "").trim();
    if (antwort) blase("as", antwort);
    st.verlauf.push({ role: "assistant", content: antwort || "…" });
    st.verlauf = st.verlauf.slice(-12); store.set("as-verlauf-v1", st.verlauf);
    const akt = pruefe(plan.aktion, k);
    if (akt) await fuehreAus(akt, k);
    tipps(Array.isArray(plan.vorschlaege) && plan.vorschlaege.length ? plan.vorschlaege : STARTER.slice(0, 3));
  } catch (e) {
    w.remove(); blase("as", "Das hat gerade nicht geklappt: " + (e.message || e)); tipps(STARTER.slice(0, 3));
  } finally { st.busy = false; }
}

async function fuehreAus(a, k) {
  switch (a.typ) {
    case "fragen": return a.wie === "app" ? karteUeben(a) : fragenBlatt(a);
    case "untertest": return untertest(a);
    case "simulation": return simulation(a);
    case "oeffnen": return oeffneZiel(k.ziele[a.ziel]);
    case "arbeitsblatt": return arbeitsblatt(a);
    case "zusammenfassung": return zusammenfassung(a);
    case "erklaeren": return karte("Erklären mit LernBlick", "LernBlick erklärt dir das an der Tafel – Schritt für Schritt und mit Stimme.", [["▶ LernBlick öffnen", () => { schliesse(); window.LernBlick && LernBlick.ask(a.frage); }, true]]);
  }
}

// Fragen in der App üben (bestehender Übungsmodus der App: bevorzugt noch nicht beantwortete Fragen)
function karteUeben(a) {
  const sec = CONFIG.TEST_BLOCKS.bms.sections[a.fach];
  const thema = a.themen.length === 1 ? a.themen[0] : null;
  karte(`${a.anzahl} Fragen ${sec.label}${thema ? " · " + thema : a.themen.length ? " · " + a.themen.join(", ") : ""}`, `Mit Zeitlimit wie im MedAT (etwa ${Math.max(1, Math.round(sec.minutes / sec.questions * a.anzahl))} Minuten). Fragen, die du schon richtig hattest, kommen seltener.`, [
    ["▶ Jetzt starten", () => starteFragen(a), true],
    ["📄 Lieber als PDF", () => fragenBlatt({ ...a, wie: "blatt" })],
  ]);
}
async function starteFragen(a) {
  const sec = CONFIG.TEST_BLOCKS.bms.sections[a.fach];
  schliesse();
  App.mode = "practice"; App.currentSection = sec; App.currentSectionKey = a.fach; App.wrongAnswers = []; App.showTimer = true;
  App.currentTopic = a.themen.length === 1 ? a.themen[0] : null;
  await App.loadAndStartQuestions(sec, null, a.anzahl, Math.max(1, Math.round(sec.minutes / sec.questions * a.anzahl)), false);
}

// Fragenblatt (PDF) aus der Fragenbank – mit Gedächtnis: ausgegebene Fragen kommen erst später wieder
async function waehleFragen(fach, themen, anzahl) {
  const sb = Auth.supabase;
  let q = sb.from("questions").select("id, type, subtype, difficulty, content, topic").eq("type", "bms").eq("subtype", fach);
  if (themen.length) q = q.in("topic", themen);
  const { data: pool, error } = await q.limit(1000);
  if (error) throw error;
  const ids = new Set((pool || []).map((x) => x.id));
  const jetzt = Date.now(), tag = 86400000;
  const zuletzt = {};
  try {
    const [{ data: prog }, { data: aus }] = await Promise.all([
      sb.from("user_progress").select("question_id, answered_correctly, answered_at").order("answered_at", { ascending: false }).limit(4000),
      sb.from("assistent_ausgabe").select("question_id, ausgegeben_am").order("ausgegeben_am", { ascending: false }).limit(4000),
    ]);
    (prog || []).forEach((p) => { if (!ids.has(p.question_id) || zuletzt[p.question_id]) return; zuletzt[p.question_id] = { t: new Date(p.answered_at).getTime(), ok: p.answered_correctly }; });
    (aus || []).forEach((p) => { if (!ids.has(p.question_id)) return; const t = new Date(p.ausgegeben_am).getTime(); const z = zuletzt[p.question_id]; if (!z || t > z.t) zuletzt[p.question_id] = { t, ok: null }; });
  } catch (e) { /* ohne Verlauf: einfach gemischt */ }
  // Rang: nie gesehen → falsch beantwortet (älter als 2 Tage) → ausgegeben/richtig (älter als 3 Wochen) → der Rest
  const rang = (x) => { const z = zuletzt[x.id]; if (!z) return 0; const alt = (jetzt - z.t) / tag; if (z.ok === false && alt >= 2) return 1; if (alt >= 21) return 2; return z.ok === false ? 3 : 4; };
  const gut = (pool || []).filter((x) => { const c = x.content || {}; return (c.question || c.text) && (Array.isArray(c.options) || Array.isArray(c.answer_options)); });
  return shuffle(gut).sort((x, y) => rang(x) - rang(y)).slice(0, anzahl);
}
function frageDaten(x) {
  const c = x.content || {};
  const opts = Array.isArray(c.options) ? c.options : c.answer_options || [];
  let r = Number.isInteger(c.correct) ? c.correct : typeof c.correct_answer === "number" ? c.correct_answer : opts.findIndex((o) => o === c.correct_answer || o === c.correct);
  return { frage: c.question || c.text || "", opts: opts.map((o) => (typeof o === "string" ? o : o && (o.text || o.label) || JSON.stringify(o))), richtig: r, erkl: c.explanation || "" };
}
async function fragenBlatt(a) {
  const w = warte("Ich suche passende Fragen aus der Fragenbank …");
  try {
    const fragen = await waehleFragen(a.fach, a.themen, a.anzahl);
    w.remove();
    if (!fragen.length) { blase("as", "Zu dieser Auswahl habe ich keine Fragen gefunden. Versuch ein anderes Thema."); return; }
    const sec = CONFIG.TEST_BLOCKS.bms.sections[a.fach];
    const titel = `${sec.label}${a.themen.length ? ": " + a.themen.join(", ") : ""} – ${fragen.length} Fragen`;
    const L = "ABCDE";
    const teile = fragen.map((x, i) => { const d = frageDaten(x); return { d, i }; });
    const html = `
      ${kopf(titel, `MedAT · BMS ${sec.label} · Bearbeitungszeit etwa ${Math.max(1, Math.round(sec.minutes / sec.questions * fragen.length))} Minuten`)}
      <section class="as-b"><ol class="as-mc">${teile.map(({ d }) => `<li><p>${esc(d.frage)}</p><ol class="as-opts" type="A">${d.opts.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></li>`).join("")}</ol></section>
      <section class="as-b as-neu"><h2>Antwortbogen</h2><div class="as-bogen">${teile.map(({ i }) => `<div><b>${i + 1}</b>${"ABCDE".slice(0, 5).split("").map((l) => `<span>${l}</span>`).join("")}</div>`).join("")}</div></section>
      <section class="as-b as-neu as-loesung"><h2>Lösungen und Erklärungen</h2><ol class="as-loes-liste">${teile.map(({ d }) => `<li><b>${d.richtig >= 0 ? L[d.richtig] : "–"}</b> ${d.richtig >= 0 ? esc(d.opts[d.richtig] || "") : ""}${d.erkl ? `<p>${esc(d.erkl)}</p>` : ""}</li>`).join("")}</ol></section>
      ${fuss()}`;
    zeigeBlatt(titel, html, true);
    karte(titel, "Das Blatt ist offen – drucken oder als PDF speichern. Ich merke mir die Fragen: Sie kommen frühestens in drei Wochen wieder, falsch beantwortete früher.", [["📄 Blatt öffnen", () => zeigeBlatt(titel, html, true), true]]);
    try { await Auth.supabase.from("assistent_ausgabe").insert(fragen.map((x) => ({ question_id: x.id, art: "pdf" }))); } catch (e) {}
  } catch (e) { w.remove(); blase("as", "Die Fragen konnten nicht geladen werden: " + (e.message || e)); }
}

// Untertests (KFF, TV, SEK)
function untertest(a) {
  const u = UNTERTESTE[a.untertest];
  if (a.wie === "pdf") {
    const keys = u.pdf || [`${u.block}__${u.key}`];
    return karte(`${u.label} als PDF`, "Ich stelle das Blatt mit dem PDF-Simulator der App zusammen – mit Antwortbogen und Lösungen.", [["📄 PDF erstellen", async () => { schliesse(); PDFExport._selectedSections = keys; await PDFExport.generateCustomPDF(); }, true]]);
  }
  if (a.untertest === "allergieausweise") {
    return karte("Allergieausweise wie im MedAT", "8 Minuten einprägen, dann 10 Zahlenfolgen, dann 25 Abruf-Fragen.", [["▶ Starten", async () => { schliesse(); App.mode = "practice"; App.currentSectionKey = "allergieausweis_mem"; App.currentSection = CONFIG.TEST_BLOCKS.kff.sections.allergieausweis_mem; await App.startMemorize(); }, true]]);
  }
  const sec = CONFIG.TEST_BLOCKS[u.block].sections[u.key];
  const n = a.anzahl || sec.questions;
  karte(`${sec.label} · ${n} Aufgaben`, `Mit Zeitlimit wie im MedAT (etwa ${Math.max(1, Math.round(sec.minutes / sec.questions * n))} Minuten).`, [["▶ Starten", async () => {
    schliesse(); App.mode = "practice"; App.currentSection = sec; App.currentSectionKey = u.key; App.currentTopic = null; App.wrongAnswers = []; App.showTimer = true;
    await App.loadAndStartQuestions(sec, null, n, Math.max(1, Math.round(sec.minutes / sec.questions * n)), false);
  }, true]]);
}
function simulation(a) {
  const namen = a.bloecke.map((b) => CONFIG.TEST_BLOCKS[b].label).join(" + ");
  if (a.wie === "pdf") {
    const keys = a.bloecke.flatMap((b) => Object.keys(CONFIG.TEST_BLOCKS[b].sections).filter((k) => CONFIG.TEST_BLOCKS[b].sections[k].available !== false).map((k) => `${b}__${k}`));
    return karte(`Simulation ${namen} als PDF`, "Mit Antwortbogen und Lösungen, in der Reihenfolge des MedAT.", [["📄 PDF erstellen", async () => { schliesse(); PDFExport._selectedSections = keys; await PDFExport.generateCustomPDF(); }, true]]);
  }
  const min = a.bloecke.reduce((s, b) => s + Object.values(CONFIG.TEST_BLOCKS[b].sections).reduce((x, y) => x + (y.minutes || 0), 0), 0);
  karte(`Simulation: ${namen}`, `Etwa ${min} Minuten, mit Zeitlimit pro Untertest wie am Testtag.`, [["▶ Simulation starten", async () => {
    schliesse();
    if (App.isFreeUser && App.isFreeUser()) { App._showToast && App._showToast("Simulation ist nur mit Vollzugang verfügbar.", "warning"); return; }
    if (a.bloecke.length === CONFIG.SIMULATION_ORDER.length) return App.startSimulation();
    App.mode = "simulation"; App.simResults = {}; App.simBlocks = a.bloecke; App.simCurrentBlockIdx = 0;
    App._showSimGeneratingOverlay && App._showSimGeneratingOverlay();
    await App.runNextSimBlock();
  }, true]]);
}
function oeffneZiel(z) {
  if (!z) return;
  const los = () => {
    schliesse();
    if (z.art === "bereich") return z.los();
    if (z.art === "sheet") { App.showScreen("screen-goodies"); setTimeout(() => { try { Goodies._cache ? Goodies.openGoodie(z.id) : Goodies._loadGoodies().then(() => Goodies.openGoodie(z.id)); } catch (e) {} }, 400); return; }
    if (z.card && z.card.classList.contains("is-locked")) { if (App.openToolsUpgradeModal) App.openToolsUpgradeModal(); return; }
    location.assign(z.href);
  };
  karte(z.art === "sheet" ? "Cheat-Sheet: " + z.titel : z.titel, z.text || "", [["Öffnen", los, true]]);
}

// ---------------------------------------------------------------- KI-Blätter
async function quellenFragen(fach, thema, n) {
  // Fragen aus der Fragenbank als Grundlage – so bleibt das Blatt auf MedAT-Niveau und passt zu den Übungen der App
  try {
    if (!fach) return "";
    const T = CONFIG.BMS_TOPICS[fach] || [];
    const nt = norm(thema);
    const topic = T.find((x) => norm(x).split(" ").some((w) => w.length > 4 && nt.includes(w.slice(0, 5)))) || null;
    let q = Auth.supabase.from("questions").select("content, topic").eq("type", "bms").eq("subtype", fach);
    if (topic) q = q.eq("topic", topic);
    const { data } = await q.limit(400);
    const passend = (data || []).filter((x) => { const t = norm((x.content || {}).question || ""); return nt.split(" ").some((w) => w.length > 4 && t.includes(w.slice(0, 5))); });
    const wahl = shuffle(passend.length >= 4 ? passend : data || []).slice(0, n).map((x) => { const d = frageDaten(x); return `- ${d.frage} → ${d.opts[d.richtig] || ""}${d.erkl ? " (" + d.erkl.slice(0, 220) + ")" : ""}`; });
    return wahl.length ? `\n\nFRAGEN AUS UNSERER FRAGENBANK ZU DIESEM THEMA (Niveau und Inhalte daran ausrichten, nicht wörtlich übernehmen):\n${wahl.join("\n")}` : "";
  } catch (e) { return ""; }
}
const BLATT_REGELN = `Du erstellst Lernmaterial für die MedAT-Vorbereitung (Medizinaufnahmetest Österreich), Niveau Matura bis erstes Studienjahr – sachlich, nicht kindlich, fachlich exakt.
Schreibweise: Deutsch, keine LaTeX-Befehle, Formeln und Ionen wie gedruckt (Na⁺, Ca²⁺, CO₂, H₂O, →, ·). Keine Platzhalter.
Antworte NUR mit JSON.`;
async function arbeitsblatt(a) {
  const w = warte(`Ich baue dein Arbeitsblatt „${a.thema}“ – das dauert etwa 20–40 Sekunden${a.bild ? " (mit Abbildung etwas länger)" : ""} …`);
  try {
    const quellen = await quellenFragen(a.fach, a.thema, 10);
    const schema = `{"titel":"…","untertitel":"…","bloecke":[
 {"art":"aufgaben","titel":"…","items":[{"aufgabe":"…","loesung":"…","zeilen":3}]},
 {"art":"multiple_choice","titel":"…","items":[{"frage":"…","optionen":["…","…","…","…","…"],"richtig":0,"erklaerung":"…"}]},
 {"art":"wahr_falsch","titel":"…","items":[{"satz":"…","richtig":true,"begruendung":"…"}]},
 {"art":"zuordnen","titel":"…","anweisung":"…","paare":[{"links":"…","rechts":"…"}]},
 {"art":"lueckentext","titel":"…","text":"Satz mit {{Lösungswort}} als Lücke …"},
 {"art":"kreuzwort","titel":"…","woerter":[{"wort":"EINWORT","frage":"…"}]},
 {"art":"tabelle","titel":"…","kopf":["…","…"],"zeilen":[["…","…"]],"leer":[[0,1]]}
],"bild":{"objekt":"was gezeichnet wird","begriffe":["Begriff 1","Begriff 2"]}}`;
    const auftrag = `Erstelle ein Arbeitsblatt zum Thema „${a.thema}“${a.fach ? " (Fach " + a.fach + ")" : ""}.
Umfang: ${a.seiten} Seite(n) A4, mindestens drei Übungen pro Seite. Benutze diese Bausteine (jeden höchstens einmal, sinnvolle Reihenfolge vom Verstehen zum Anwenden): ${a.bausteine.join(", ")}.
Multiple Choice wie im MedAT: 5 Optionen, genau eine richtig. Kreuzworträtsel: 6–10 Fachwörter ohne Leerzeichen, jede Frage eindeutig. Lückentext: 6–10 Lücken. Zuordnen: 5–8 Paare. Bei "tabelle" stehen in "leer" die Zellen [Zeile, Spalte], die zum Ausfüllen leer bleiben (Lösung = der Text dort).
${a.bild ? `Füge "bild" hinzu: ein Objekt, das man beschriften kann (z. B. Organ, Zelle, Struktur, Ablauf), mit 6–9 Fachbegriffen.` : `Lass "bild" weg.`}
Format:
${schema}${quellen}`;
    const roh = await ki(BLATT_REGELN, [{ role: "user", content: auftrag }], false);
    const blatt = jsonAus(roh);
    let bild = null;
    if (a.bild && blatt.bild && Array.isArray(blatt.bild.begriffe) && blatt.bild.begriffe.length) {
      w.textContent = "Das Arbeitsblatt steht – jetzt zeichne ich die Abbildung zum Beschriften …";
      bild = await zeichneBeschriftung(a.thema, blatt.bild).catch(() => null);
    }
    w.remove();
    const html = kopf(blatt.titel || a.thema, blatt.untertitel || "MedAT · Arbeitsblatt") + (bild ? bildBlock(bild, blatt.bild.begriffe) : "") + (blatt.bloecke || []).map(block).join("") + fuss();
    zeigeBlatt(blatt.titel || a.thema, html, false);
    karte(blatt.titel || "Arbeitsblatt", "Zum Ausfüllen am Bildschirm oder zum Drucken – die Lösungen kannst du ein- und ausblenden.", [["📄 Arbeitsblatt öffnen", () => zeigeBlatt(blatt.titel || a.thema, html, false), true]]);
  } catch (e) { w.remove(); blase("as", "Das Arbeitsblatt hat gerade nicht geklappt: " + (e.message || e) + " – versuch es gleich nochmal."); }
}
async function zusammenfassung(a) {
  const w = warte(`Ich fasse „${a.thema}“ für dich zusammen …`);
  try {
    const quellen = await quellenFragen(a.fach, a.thema, 12);
    const auftrag = `Erstelle eine kompakte Lernzusammenfassung zum Thema „${a.thema}“ für den MedAT (1–2 Seiten A4): das Wichtigste übersichtlich, mit Fachbegriffen, Zahlen und Zusammenhängen, so wie man sie für die Prüfung braucht.
Format: {"titel":"…","einleitung":"1–2 Sätze","abschnitte":[{"ueberschrift":"…","punkte":["…"]}],"tabelle":{"titel":"…","kopf":["…"],"zeilen":[["…"]]} oder null,"merksaetze":["…"],"pruefungsfallen":["…"]${a.bild ? `,"bild":{"objekt":"was gezeichnet wird","begriffe":["…"]}` : ""}}
4–7 Abschnitte mit je 3–6 Punkten, 2–3 Merksätze, 3–5 typische MedAT-Fallen.${quellen}`;
    const s = jsonAus(await ki(BLATT_REGELN, [{ role: "user", content: auftrag }], false));
    let bild = null;
    if (a.bild && s.bild && Array.isArray(s.bild.begriffe)) { w.textContent = "Die Zusammenfassung steht – jetzt zeichne ich die Abbildung …"; bild = await zeichneBeschriftung(a.thema, s.bild, true).catch(() => null); }
    w.remove();
    const html = kopf(s.titel || a.thema, "MedAT · Lernzusammenfassung") + (s.einleitung ? `<p class="as-einl">${esc(s.einleitung)}</p>` : "") +
      (bild ? `<figure class="as-b as-fig"><img src="${bild}" alt="Abbildung ${esc(a.thema)}"></figure>` : "") +
      `<div class="as-zf">${(s.abschnitte || []).map((x) => `<section class="as-b"><h2>${esc(x.ueberschrift)}</h2><ul>${(x.punkte || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul></section>`).join("")}</div>` +
      (s.tabelle && s.tabelle.kopf ? block({ art: "tabelle", ...s.tabelle }) : "") +
      ((s.merksaetze || []).length ? `<section class="as-b as-merk"><h2>Merksätze</h2>${s.merksaetze.map((m) => `<p>💡 ${esc(m)}</p>`).join("")}</section>` : "") +
      ((s.pruefungsfallen || []).length ? `<section class="as-b as-falle"><h2>Prüfungsfallen</h2><ul>${s.pruefungsfallen.map((m) => `<li>${esc(m)}</li>`).join("")}</ul></section>` : "") + fuss();
    zeigeBlatt(s.titel || a.thema, html, false);
    karte(s.titel || "Zusammenfassung", "Zum Lesen oder Ausdrucken.", [["📄 Zusammenfassung öffnen", () => zeigeBlatt(s.titel || a.thema, html, false), true]]);
  } catch (e) { w.remove(); blase("as", "Die Zusammenfassung hat gerade nicht geklappt: " + (e.message || e)); }
}
// Abbildung über die Bild-Funktion von LernBlick: zum Beschriften nur Nummern, für Zusammenfassungen mit Wörtern
async function zeichneBeschriftung(thema, b, mitWoertern) {
  const begr = b.begriffe.slice(0, 9);
  const beschreibung = mitWoertern
    ? `Überschrift oben: „${thema}“. In der Mitte groß: ${b.objekt}. Beschriftungen an dünnen Linien: ${begr.join(", ")}. Sonst kein Text.`
    : `Keine Überschrift. In der Mitte groß: ${b.objekt}. ${begr.length} kleine leere Kästchen an dünnen Linien, in jedem Kästchen NUR eine Nummer: ${begr.map((x, i) => `${i + 1} zeigt auf ${x}`).join("; ")}. In den Kästchen stehen NUR die Nummern 1 bis ${begr.length}, KEINE Wörter. Sonst kein Text im Bild.`;
  const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lernblick-bild`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}`, apikey: CONFIG.SUPABASE_ANON_KEY },
    body: JSON.stringify({ thema, art_label: "Beschriftungsbild", art_regeln: "- Ein großer Gegenstand in der Mitte, fachlich richtig, nichts daneben.\n- Beschriftungsfelder waagerecht, gleichmäßig links und rechts, dünne Linien zur gemeinten Stelle.\n- Viel Luft.", beschreibung, orientation: "querformat", stil_text: "Style: clean scientific textbook illustration, precise thin outlines, soft flat colors, white background. Print-friendly." }),
  });
  const d = await resp.json();
  if (!d.image_base64) throw new Error(d.error || "kein Bild");
  return `data:${d.mime_type || "image/jpeg"};base64,${d.image_base64}`;
}
function bildBlock(src, begriffe) {
  return `<section class="as-b"><h2>Beschrifte die Abbildung</h2><figure class="as-fig"><img src="${src}" alt="Abbildung zum Beschriften"></figure>
    <ol class="as-beschr">${begriffe.slice(0, 9).map((b) => `<li><span class="as-linie"></span><span class="as-l">${esc(b)}</span></li>`).join("")}</ol></section>`;
}

// Bausteine → HTML (Lösungen stecken in .as-l und erscheinen mit „Lösungen zeigen“ bzw. beim Drucken mit Lösungen)
let nr = 0;
function block(b) {
  if (!b || !b.art) return "";
  const h = b.titel ? `<h2><span class="as-nr">${++nr}</span>${esc(b.titel)}</h2>` : "";
  switch (b.art) {
    case "aufgaben": return `<section class="as-b">${h}<ol class="as-auf">${(b.items || []).map((x) => `<li><p>${esc(x.aufgabe)}</p>${'<span class="as-linie"></span>'.repeat(Math.max(1, Math.min(8, x.zeilen || 3)))}<p class="as-l">${esc(x.loesung)}</p></li>`).join("")}</ol></section>`;
    case "multiple_choice": return `<section class="as-b">${h}<ol class="as-mc">${(b.items || []).map((x) => `<li><p>${esc(x.frage)}</p><ol class="as-opts" type="A">${(x.optionen || []).map((o, i) => `<li class="${i === x.richtig ? "as-richtig" : ""}">${esc(o)}</li>`).join("")}</ol>${x.erklaerung ? `<p class="as-l">${esc(x.erklaerung)}</p>` : ""}</li>`).join("")}</ol></section>`;
    case "wahr_falsch": return `<section class="as-b">${h}<table class="as-wf"><thead><tr><th>Aussage</th><th>richtig</th><th>falsch</th></tr></thead><tbody>${(b.items || []).map((x) => `<tr><td>${esc(x.satz)}<p class="as-l">${x.richtig ? "Richtig" : "Falsch"}${x.begruendung ? ": " + esc(x.begruendung) : ""}</p></td><td class="${x.richtig ? "as-x" : ""}">☐</td><td class="${x.richtig ? "" : "as-x"}">☐</td></tr>`).join("")}</tbody></table></section>`;
    case "zuordnen": {
      const paare = (b.paare || []).slice(0, 10), rechts = shuffle(paare.map((p, i) => ({ t: p.rechts, i })));
      const buchst = "ABCDEFGHIJ", los = paare.map((p, i) => buchst[rechts.findIndex((r) => r.i === i)]);
      return `<section class="as-b">${h}${b.anweisung ? `<p class="as-anw">${esc(b.anweisung)}</p>` : ""}<div class="as-zu"><ol>${paare.map((p, i) => `<li>${esc(p.links)} <span class="as-kast">${'<span class="as-l">' + los[i] + "</span>"}</span></li>`).join("")}</ol><ol type="A">${rechts.map((r) => `<li>${esc(r.t)}</li>`).join("")}</ol></div></section>`;
    }
    case "lueckentext": {
      const woerter = [];
      const t = esc(b.text || "").replace(/\{\{(.+?)\}\}/g, (m, w) => { woerter.push(w); return `<span class="as-luecke"><span class="as-l">${w}</span></span>`; });
      return `<section class="as-b">${h}<p class="as-bank">${shuffle(woerter).map((x) => `<span>${x}</span>`).join("")}</p><p class="as-lt">${t}</p></section>`;
    }
    case "kreuzwort": return kreuzwort(b, h);
    case "tabelle": {
      const leer = new Set((b.leer || []).map((x) => x.join(",")));
      return `<section class="as-b">${h}<table class="as-tab"><thead><tr>${(b.kopf || []).map((k) => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${(b.zeilen || []).map((z, i) => `<tr>${z.map((c, j) => `<td>${leer.has(i + "," + j) ? `<span class="as-l">${esc(c)}</span>` : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
    }
  }
  return "";
}
function kreuzwort(b, h) {
  if (!window.Raetsel) return "";
  const r = Raetsel.legeRaetsel((b.woerter || []).filter((x) => x && x.wort && x.frage).slice(0, 12).map((x) => ({ wort: x.wort, frage: x.frage })));
  if (!r || !r.woerter.length) return "";
  const feld = Array.from({ length: r.hoehe }, () => Array(r.breite).fill(null));
  r.woerter.forEach((w) => { [...w.wort].forEach((ch, k) => { const z = w.zeile + (w.richtung === "senkrecht" ? k : 0), s = w.spalte + (w.richtung === "waagrecht" ? k : 0); feld[z][s] = feld[z][s] || { ch }; }); feld[w.zeile][w.spalte].nr = w.nummer; });
  const gitter = `<table class="as-kw">${feld.map((row) => `<tr>${row.map((c) => (c ? `<td class="as-kw-f">${c.nr ? `<sup>${c.nr}</sup>` : ""}<span class="as-l">${c.ch}</span></td>` : "<td></td>")).join("")}</tr>`).join("")}</table>`;
  const liste = (rich) => r.woerter.filter((w) => w.richtung === rich).sort((x, y) => x.nummer - y.nummer).map((w) => `<li value="${w.nummer}">${esc(w.frage)}</li>`).join("");
  return `<section class="as-b">${h}<div class="as-kw-wrap">${gitter}<div class="as-kw-fragen"><h3>Waagrecht</h3><ol>${liste("waagrecht")}</ol><h3>Senkrecht</h3><ol>${liste("senkrecht")}</ol></div></div></section>`;
}
function kopf(titel, unter) {
  nr = 0;
  return `<header class="as-kopf"><div class="as-marke">MedAT Trainer · ${esc(NAME)}</div><h1>${esc(titel)}</h1><div class="as-unter">${esc(unter || "")}</div><div class="as-name"><span>Name: <i></i></span><span>Datum: <i></i></span></div></header>`;
}
function fuss() { return `<footer class="as-fuss">${esc(KI_HINWEIS)}</footer>`; }
function zeigeBlatt(titel, html, mitBogen) {
  $("blatt-titel").textContent = titel;
  $("seite").innerHTML = html;
  $("seite").classList.remove("mit-loesungen"); $("loes").textContent = "Lösungen zeigen";
  $("blatt").hidden = false; document.documentElement.classList.add("as-blatt-offen");
  $("blatt").querySelector(".as-blatt-scroll").scrollTop = 0;
}

// ---------------------------------------------------------------- Start
function init() {
  if (typeof CONFIG === "undefined" || typeof App === "undefined") return;
  baue();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
window.Assistent = { open: (t) => oeffne(t), close: schliesse };
})();
