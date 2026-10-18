/* =====================================================================
   LernBlick – KI-Lerntutor für den MedAT Trainer
   Schwebender Knopf auf jeder Seite → Aufnahme des aktuellen Bildschirms →
   Tutor erklärt im Seitenpanel mit Tafel, Zeichnung direkt auf dem Bildschirm
   und Stimme. Backend: Supabase-Funktionen lernblick-chat und lernblick-voice.
   Einbinden: <link rel="stylesheet" href="css/lernblick.css"> und
              <script src="js/lernblick.js" defer></script>
   ===================================================================== */
(function () {
if (window.LernBlick) return;
const BASE = (() => { try { return new URL("..", document.currentScript.src).href; } catch (e) { return "/"; } })();
const $ = (id) => document.getElementById("lb-" + id);

const EXTRAS = "\n\nMOLEKÜLE: Strukturformeln zeichnest du nie selbst mit Linien, sondern immer mit dem Baustein <molekuel> in der ZEICHNUNG (siehe unten). Ein Programm zeichnet daraus die exakte Strukturformel im Tafelstil.\n\nESELSBRÜCKEN: Wenn du eine Eselsbrücke oder einen Merksatz gibst, hänge NACH deinem Text zusätzlich eine Zeile an, damit sie gespeichert wird:\nESELSBRUECKE: Merksatz | wofür er gut ist\n\nTAFEL – du zeichnest wie eine Lehrkraft an der Tafel:\nTafel und Erklärung sind EINE Einheit. Alles, was du sagst (Zahlen, Kästchen, Flächen, Seiten, Formeln, Umformungen, Begriffe), steht auch an der Tafel. Nach Text und Tafel darf keine Frage offen bleiben. Wenn du von Kästchen sprichst, zeichne die Kästchen. Wenn du rechnest, schreib jeden Rechenschritt und jede Umformung als eigene Zeile an.\nZeichne, wann immer ein Bild hilft (Geometrie, Rechnen, Brüche, Zahlen, Graphen, Abläufe, Organe, Mechanismen). Hänge NACH deinem Text an:\nZEICHNUNG:\n<svg viewBox='0 0 1000 600'> ... </svg>\nAufteilung: links (x 30 bis 580) das Bild, rechts (x 600 bis 980) die Rechnung. Abstand zum Rand mindestens 30.\n\nBAUKASTEN – benutze diese Bausteine, wo sie passen. Das Programm berechnet und zeichnet sie exakt, mit allen Kästchen, Zahlen und Beschriftungen:\n1. <dreieck-rw a='3' b='4' x='30' y='30' breite='550' hoehe='540'/> rechtwinkliges Dreieck: Kathete a unten (blau), Kathete b links (grün), Hypotenuse c (rot). Zeichnet automatisch die Quadrate über allen drei Seiten mit Einheitskästchen zum Abzählen und schreibt a² = 9, b² = 16, c² = 25 hinein. Optional quadrate='nein', kaestchen='nein', c-zeigen='nein' (wenn die Person c selbst finden soll).\n   Teile: kathete-a, kathete-b, hypotenuse, kurze-seite, lange-kathete, rechter-winkel, quadrat-a, quadrat-b, quadrat-c\n2. <gleichung x='620' y='90' zeilen='a² + b² = c²; 3² + 4² = c²; 9 + 16 = c²; 25 = c²; c = √25 = 5' notizen='; einsetzen; Quadrate ausrechnen; zusammenzählen; Wurzel ziehen'/> Rechnung Zeile für Zeile, an den = ausgerichtet, rechts grau die Umformung. Die letzte Zeile wird als Ergebnis rot doppelt unterstrichen.\n   Teile: zeile-1, zeile-2, … , ergebnis\n3. <kaestchen x='60' y='80' spalten='4' zeilen='3' gefuellt='12' farbe='#1f6fd1' zahlen='ja' beschriftung='3 · 4 = 12'/> Kästchengitter mit Seitenlängen zum Zählen, Malnehmen, Flächen.\n   Teile: gitter, gefuellt, kaestchen-1, kaestchen-2, … , breite, hoehe\n4. <bruch-kreis cx='280' cy='290' r='200' teile='4' gefuellt='1' farbe='#d62828' beschriftung='1/4'/> Kreis (Pizza) in gleiche Stücke.   Teile: ganzes, gefuellt, stueck-1, …\n5. <bruch-balken x='60' y='200' breite='500' hoehe='90' teile='5' gefuellt='2' beschriftung='2/5'/>   Teile: ganzes, gefuellt, stueck-1, …\n6. <zahlenstrahl x='60' y='300' laenge='860' von='0' bis='10' schritt='1' markiere='3; 7'/>   Teile: zahlenstrahl, punkt-3, punkt-7, zahl-5\n7. <koordinaten x='60' y='40' breite='520' hoehe='520' xmin='-5' xmax='5' ymin='-5' ymax='5' funktion='x^2; 2*x+1'/> Koordinatensystem mit exakt berechneten Graphen.   Teile: x-achse, y-achse, graph-1, graph-2\n8. <pfeil x1='600' y1='300' x2='800' y2='300' text='wird zu' teil='umwandlung'/>\n9. <molekuel id='m1' smiles='CNC[C@H](O)C1=CC=C([OH:1])C([OH:2])=C1' name='Adrenalin' x='20' y='70' breite='420' hoehe='450' teile='1=phenol-oh-1; 2=phenol-oh-2'/> exakte Strukturformel. Gültige SMILES verwenden. Ringe IMMER in Kekulé-Schreibweise mit Großbuchstaben und = (z. B. Benzol C1=CC=CC=C1, nicht c1ccccc1), damit die Doppelbindungen wie an der Tafel sichtbar sind. Ladungen mit eckigen Klammern ([O-], [NH2+], [Cu+2], [Fe+3]). Atome, über die du sprichst, bekommen im SMILES eine Nummer ([OH:1], [O-:2], [NH:3], [C:4](=O), [N+:5]) und in teile='1=name; 2=name' einen Namen. Auf das ganze Molekül zeigst du mit seiner id oder seinem Namen in Kleinbuchstaben ohne Umlaute (z. B. [[m1|Adrenalin]]).\n   Teile: m1 (ganzes Molekül), die Namen aus teile=, außerdem m1-1, m1-2 … für die nummerierten Atome\n10. <bogenpfeil von='m1:1' nach='m1:3' text='e⁻' teil='elektronenpaar-1'/> gebogener Pfeil von Atom zu Atom (Elektronen, Angriff, Ringschluss). Für abgehende Teilchen ohne Ziel: <bogenpfeil von='m1:1' richtung='oben-rechts' laenge='90' text='H⁺' teil='proton-1-geht'/> (Richtungen: oben, unten, links, rechts, oben-links, oben-rechts, unten-links, unten-rechts).\n11. <titel text='Schritt 1: Oxidation der Hydroxygruppen'/> Überschrift oben links an der Tafel.\n12. <zahlenfolge zahlen='2; 5; 4; 7; 6; 9; ?; ?' boegen='+3; −1; +3; −1; +3; −1; +3' x='40' y='300' breite='920'/> Zahlenfolge in Kästchen, oben jeder Rechenschritt als Bogen, Lücken als ?. Für zwei verschränkte Folgen zusätzlich boegen2='…' (Schritt von jeder Zahl zur übernächsten, unten).\n   Teile: zahl-1 …, bogen-1 …, bogen2-1 …, luecke, muster, muster-2\n13. <venn a='Chirurgen' b='Ärzte' c='Läufer' cx='300' cy='330' r='150' leer='a; ac' kreuz='bc|abc'/> Mengenkreise für Implikationen (c weglassen bei zwei Mengen). Bereiche heißen nach den Mengen, in denen sie GENAU liegen: a, b, c, ab, ac, bc, abc. leer = laut Prämissen leere Bereiche, sie werden schraffiert: 'Alle A sind B' → leer='a; ac'. 'Kein A ist B' → leer='ab; abc'. 'Einige A sind B' → kreuz='ab', oder auf die Grenze 'ab|abc', wenn offen ist, ob es auch in C liegt. Rechts daneben mit text die Prämissen und die geprüften Schlussfolgerungen (✓ / ✗).\n   Teile: kreis-a, kreis-b, kreis-c, leer, kreuz, bereich-ab, bereich-bc …\n14. <buchstaben gemischt='NERGAT' wort='GARTEN'/> Wortflüssigkeit: oben die gemischten Buchstaben, Linien zu ihrem Platz im Lösungswort, der erste Buchstabe rot.\n   Teile: gemischt, loesung, erster-buchstabe, buchstabe-1 …\n15. <zusammensetzen ziel='kreis' teile='5' seed='3'/> Figuren zusammensetzen: links die verstreuten, gedrehten Teile, rechts gestrichelt die Zielfigur (kreis, halbkreis, dreieck, quadrat, rechteck, fuenfeck, sechseck, achteck). Zeigst du im Text auf [[zusammensetzen|…]], gleiten die Teile an ihren Platz.\n   Teile: stueck-1 …, ziel, zusammensetzen\n16. <vergessenskurve tage='30' wiederholungen='1; 3; 7; 14'/> Spaced Repetition: Vergessenskurve ohne und mit Wiederholungen.\n   Teile: ohne-wiederholung, mit-wiederholung, wiederholung-1 …\n17. <gedaechtnispalast raeume='Eingang: Türschild mit dem Namen; Küche: Torte mit dem Geburtsdatum; Bad: Blutgruppe als Badeschaum; …'/> Gedächtnispalast als Grundriss mit Rundgang und einem Merkbild je Raum (höchstens 8 Räume).\n   Teile: raum-1 …, weg\nDie Bausteine 12 bis 17 brauchen meist die ganze Tafel; nur venn lässt rechts Platz für Text.\n\nREAKTIONEN UND MECHANISMEN erklärst du SCHRITT FÜR SCHRITT, so wie Pharmazie- und Medizinstudierende es nachvollziehen müssen:\n- Pro Schritt eine eigene ZEICHNUNG (mehrere ZEICHNUNG-Blöcke hintereinander, 2 bis 5). Jede beginnt mit <titel text='Schritt n: …'/>.\n- Aufbau jedes Schritts: links das Ausgangsmolekül (x='20' breite='420'), in der Mitte ein <pfeil x1='450' y1='300' x2='560' y2='300' text='Reagenz/Bedingung'/>, rechts das Produkt (x='570' breite='410'). Abgehende Teilchen (H⁺, H₂O, e⁻) mit bogenpfeil zeigen, neue Bindungen und Elektronenwege ebenfalls mit bogenpfeil.\n- Benenne und nummeriere die Atome, die sich verändern (abgespaltene Protonen bzw. ihre OH-Gruppen, entstehende Ladungen, der angreifende Stickstoff, die neue Bindung), damit du im Text genau darauf zeigen kannst.\n- Ionen und Reagenzien (z. B. Kupferion) zeichnest du als eigenes kleines <molekuel> mit id, damit man im Text darauf zeigen kann.\n- Im Text schreibst du passend **Schritt 1: …**, **Schritt 2: …** und zeigst in jedem Satz mit [[name|…]] auf genau das, worüber du sprichst. Die Tafel wechselt dann automatisch zum richtigen Schritt.\nFür alles andere (Organe, Zellen, Abläufe, Kreisläufe) zeichnest du selbst mit line, polyline, polygon, path, circle, ellipse, rect und text (font-size 26 bis 40, text-anchor='middle'). Gib jedem wichtigen Element einen Namen mit teil='name', z. B. teil='zellkern'.\n\nZEIGEN – das Wichtigste: Wenn du im Text über einen Teil der Tafel sprichst, markiere ihn so: [[teilname|sichtbarer Text]]. Beispiel: Schau dir [[kurze-seite|die kurze Seite a]] an. Das [[quadrat-a|blaue Quadrat darunter]] hat 3 · 3 = 9 Kästchen. Genau dieser Teil leuchtet dann an der Tafel auf, während du darüber sprichst. Markiere in jedem Satz, der sich auf die Tafel bezieht, den passenden Teil. Nutze nur Teilnamen, die es an deiner Tafel wirklich gibt.\n\nSo sieht es aus:\n- Wie an einer echten Tafel: klare Linien, Flächen nur zart eingefärbt (fill mit einer Farbe, ohne fill-style). Schraffur nur ausnahmsweise mit fill-style='hachure', wenn etwas besonders betont werden soll.\n- Farben: #1A1A1A schwarz, #d62828 rot, #1f6fd1 blau, #2a9d4b grün, #f2b705 gelb, #f07c1a orange, #7b3fc4 lila, #e0559b rosa, #8b5a2b braun. Nenne im Text dieselben Farben, die an der Tafel stehen.\n- Reihenfolge der Elemente = Reihenfolge deiner Erklärung (zuerst das Bild, dann die Rechnung).\n- Rechne alle Zahlen korrekt. Text und Tafel zeigen dieselben Zahlen.\n- Keine Styles, keine Skripte, keine Bilder. Wenn eine Zeichnung nichts bringt, lass ZEICHNUNG ganz weg.";

// ================= kleine Helfer =================
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function md(s) {
  let html = "", inList = false;
  for (const line of esc(s).split("\n")) {
    const li = line.match(/^\s*[-*•]\s+(.*)/);
    if (li) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${li[1]}</li>`; continue; }
    if (inList) { html += "</ul>"; inList = false; }
    html += line.trim() ? line + "<br>" : "<br>";
  }
  if (inList) html += "</ul>";
  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, (m, a, b) => /^[a-z0-9äöüß\- ]+$/i.test(a) ? `<span class="ref" role="button" tabindex="0" data-ref="${a.trim().toLowerCase()}">${b}</span>` : b)
    .replace(/\[\[[^\]]*\]\]/g, "");
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function setStatus(t) { $("status").textContent = t; const s = $("stage-status"); if (s) s.textContent = t; }
function fmtDate(ms) { try { return new Date(ms).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" }) + ", " + new Date(ms).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }

// ================= Antwort zerlegen =================
function splitAnswer(text) {
  const idx = [
    text.search(/(?<!BILD)ZEICHNUNG\s*:/i), text.search(/BILDZEICHNUNG\s*:/i),
    text.search(/MOLEK(UE|Ü)L\s*:/i), text.search(/ESELSBR(UE|Ü)CKE\s*:/i), text.search(/MARKIERUNGEN\s*:/i)
  ].filter((i) => i >= 0);
  const body = (idx.length ? text.slice(0, Math.min(...idx)) : text).replace(/```\w*\s*$/, "").trim();
  const grab = (re) => { const i = text.search(re); if (i < 0) return null; const s = text.slice(i).match(/<svg[\s\S]*?<\/svg>/i); return s ? s[0] : null; };
  const mols = [...text.matchAll(/MOLEK(?:UE|Ü)L\s*:\s*([^|\n]+)\|\s*`?([^\s`\n]+)/gi)].map((m) => ({ name: m[1].replace(/[*`]/g, "").trim(), smiles: m[2].trim() }));
  const tricks = [...text.matchAll(/ESELSBR(?:UE|Ü)CKE\s*:\s*([^|\n]+)(?:\|\s*([^\n]*))?/gi)].map((m) => ({ merksatz: m[1].replace(/[*`"]/g, "").trim(), wofuer: (m[2] || "").replace(/[*`]/g, "").trim() })).filter((t) => t.merksatz);
  const svgs = [];
  for (const m of text.matchAll(/(?<!BILD)ZEICHNUNG\s*:/gi)) { const sv = text.slice(m.index).match(/<svg[\s\S]*?<\/svg>/i); if (sv && !svgs.includes(sv[0])) svgs.push(sv[0]); }
  return { body, svg: svgs[0] || null, svgs: svgs.slice(0, 6), imgSvg: grab(/BILDZEICHNUNG\s*:/i), mols, tricks };
}

// ================= Tafel-Baukasten: exakt berechnete Bausteine =================
const C = { ink: "#1A1A1A", red: "#d62828", blue: "#1f6fd1", green: "#2a9d4b", grey: "#7a756c" };
const N = (v, d) => { const x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : d; };
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmt = (v) => String(Math.round(v * 100) / 100).replace(".", ",");
const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
const S = (tag, attrs, text) => ({ tag, attrs, text });
const ln = (x1, y1, x2, y2, stroke, w, teil, precise) => S("line", { x1, y1, x2, y2, stroke, "stroke-width": w, teil, "data-p": precise ? 1 : null });
const tx = (x, y, s, o = {}) => S("text", { x, y, "font-size": o.size || 30, fill: o.fill || C.ink, "text-anchor": o.anchor || "middle", teil: o.teil }, s);
const pg = (p, o) => S("polygon", { points: p.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" "), stroke: o.stroke, "stroke-width": o.w || 4, fill: o.fill || "none", teil: o.teil });
function niceStep(range) { const raw = range / 10, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
function gridOnQuad(P0, U, V, n, color, teil) {
  const out = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    out.push(ln(P0[0] + U[0] * t, P0[1] + U[1] * t, P0[0] + U[0] * t + V[0], P0[1] + U[1] * t + V[1], color, 2, teil, true));
    out.push(ln(P0[0] + V[0] * t, P0[1] + V[1] * t, P0[0] + V[0] * t + U[0], P0[1] + V[1] * t + U[1], color, 2, teil, true));
  }
  return out;
}
function compTriangle(A) {
  const a = clampN(N(A("a"), 3), 0.5, 30), b = clampN(N(A("b"), 4), 0.5, 30), c = Math.hypot(a, b);
  const x0 = N(A("x"), 30), y0 = N(A("y"), 30), w = N(A("breite"), 550), h = N(A("hoehe"), 540);
  const sq = A("quadrate") !== "nein";
  const grid = A("kaestchen") === "ja" || (A("kaestchen") == null && isInt(a) && isInt(b) && a <= 12 && b <= 12);
  let u, P;
  if (sq) { u = Math.min(w / (a + 2 * b), h / (2 * a + b)); P = [x0 + b * u + (w - (a + 2 * b) * u) / 2, y0 + (a + b) * u + (h - (2 * a + b) * u) / 2]; }
  else { u = Math.min(w / a, h / b) * 0.85; P = [x0 + (w - a * u) / 2, y0 + b * u + (h - b * u) / 2]; }
  const Pa = [P[0] + a * u, P[1]], Pb = [P[0], P[1] - b * u];
  const shortA = a <= b;
  const nA = "kathete-a seite-a" + (shortA ? " kurze-seite kurze-kathete" : " lange-kathete") + " dreieck";
  const nB = "kathete-b seite-b" + (!shortA ? " kurze-seite kurze-kathete" : " lange-kathete") + " dreieck";
  const nC = "hypotenuse seite-c lange-seite laengste-seite dreieck";
  const out = [ln(P[0], P[1], Pa[0], Pa[1], C.blue, 5, nA), ln(P[0], P[1], Pb[0], Pb[1], C.green, 5, nB), ln(Pa[0], Pa[1], Pb[0], Pb[1], C.red, 5, nC)];
  const r = Math.min(26, u * 0.6);
  out.push(S("polyline", { points: `${P[0] + r},${P[1]} ${P[0] + r},${P[1] - r} ${P[0]},${P[1] - r}`, stroke: C.ink, "stroke-width": 3, fill: "none", teil: "rechter-winkel" }));
  out.push(S("circle", { cx: P[0] + r * 0.5, cy: P[1] - r * 0.5, r: 3, fill: C.ink, stroke: "none", "fill-style": "solid", teil: "rechter-winkel" }));
  const G = [(P[0] + Pa[0] + Pb[0]) / 3, (P[1] + Pa[1] + Pb[1]) / 3];
  const lab = (M, s, color, teil) => { const dx = M[0] - G[0], dy = M[1] - G[1], L = Math.hypot(dx, dy) || 1; return tx(M[0] + dx / L * 34, M[1] + dy / L * 34 + 10, s, { fill: color, size: 32, teil }); };
  const cTxt = A("c-zeigen") === "nein" ? "c = ?" : (isInt(c) ? "c = " : "c ≈ ") + fmt(c);
  if (!sq) {
    out.push(lab([(P[0] + Pa[0]) / 2, P[1]], "a = " + fmt(a), C.blue, nA));
    out.push(lab([P[0], (P[1] + Pb[1]) / 2], "b = " + fmt(b), C.green, nB));
    out.push(lab([(Pa[0] + Pb[0]) / 2, (Pa[1] + Pb[1]) / 2], cTxt, C.red, nC));
  }
  if (sq) {
    const qa = [P, Pa, [Pa[0], Pa[1] + a * u], [P[0], P[1] + a * u]];
    const qb = [P, [P[0] - b * u, P[1]], [P[0] - b * u, Pb[1]], Pb];
    const nrm = [b * u, -a * u]; // senkrecht zur Hypotenuse, vom rechten Winkel weg
    const qc = [Pa, Pb, [Pb[0] + nrm[0], Pb[1] + nrm[1]], [Pa[0] + nrm[0], Pa[1] + nrm[1]]];
    const quad = (pts4, color, n, U, V, teil, side, sideTeil, label) => {
      out.push(pg(pts4, { stroke: color, w: 4, fill: color, teil }));
      if (grid && isInt(n) && n <= 15) out.push(...gridOnQuad(pts4[0], U, V, Math.round(n), color, teil));
      const m = [(pts4[0][0] + pts4[2][0]) / 2, (pts4[0][1] + pts4[2][1]) / 2], fs = clampN(u * n * 0.17, 22, 42);
      out.push(tx(m[0], m[1] - fs * 0.35, side, { size: fs * 0.85, fill: color === C.red ? "#9B0000" : color === C.blue ? "#164f96" : "#1d6b34", teil: sideTeil }));
      out.push(tx(m[0], m[1] + fs * 0.85, label, { size: fs, teil }));
    };
    quad(qa, C.blue, a, [a * u, 0], [0, a * u], "quadrat-a flaeche-a", "a = " + fmt(a), nA + " quadrat-a", "a² = " + fmt(a * a));
    quad(qb, C.green, b, [-b * u, 0], [0, -b * u], "quadrat-b flaeche-b", "b = " + fmt(b), nB + " quadrat-b", "b² = " + fmt(b * b));
    quad(qc, C.red, c, [Pb[0] - Pa[0], Pb[1] - Pa[1]], nrm, "quadrat-c flaeche-c", cTxt, nC + " quadrat-c", "c² = " + fmt(a * a + b * b));
  }
  return out;
}
function compGrid(A) {
  const cols = clampN(Math.round(N(A("spalten"), 4)), 1, 30), rows = clampN(Math.round(N(A("zeilen"), 3)), 1, 30);
  const x = N(A("x"), 60), y = N(A("y"), 60);
  const s = N(A("groesse"), 0) || Math.min(500 / cols, 440 / rows, 60);
  const color = A("farbe") || C.blue, filled = clampN(Math.round(N(A("gefuellt"), 0)), 0, cols * rows);
  const teil = (A("teil") || "") + " kaestchen gitter";
  const out = [S("rect", { x, y, width: cols * s, height: rows * s, stroke: C.ink, "stroke-width": 4, fill: "none", teil })];
  for (let i = 1; i < cols; i++) out.push(ln(x + i * s, y, x + i * s, y + rows * s, C.ink, 2, teil, true));
  for (let j = 1; j < rows; j++) out.push(ln(x, y + j * s, x + cols * s, y + j * s, C.ink, 2, teil, true));
  if (A("masse") !== "nein") {
    out.push(tx(x + cols * s / 2, y - 14, String(cols), { size: 28, fill: C.grey, teil: "breite" }));
    out.push(tx(x - 22, y + rows * s / 2 + 10, String(rows), { size: 28, fill: C.grey, teil: "hoehe" }));
  }
  for (let k = 0; k < filled; k++) {
    const i = k % cols, j = Math.floor(k / cols);
    out.push(S("rect", { x: x + i * s + 3, y: y + j * s + 3, width: s - 6, height: s - 6, fill: color, stroke: "none", teil: "gefuellt kaestchen-" + (k + 1) }));
    if (A("zahlen") === "ja") out.push(tx(x + i * s + s / 2, y + j * s + s * 0.68, String(k + 1), { size: Math.max(14, s * 0.48), teil: "gefuellt kaestchen-" + (k + 1) }));
  }
  if (A("beschriftung")) out.push(tx(x + cols * s / 2, y + rows * s + 46, A("beschriftung"), { size: 36, fill: color, teil: "beschriftung" + teil }));
  return out;
}
function compEquation(A) {
  const lines = String(A("zeilen") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const notes = String(A("notizen") || "").split(";").map((s) => s.trim());
  const x = N(A("x"), 620), y = N(A("y"), 80);
  let size = N(A("groesse"), 36);
  const cw = 0.5;
  const parts = lines.map((l) => { const i = l.indexOf("="); return i < 0 ? { l, r: null } : { l: l.slice(0, i).trim(), r: l.slice(i + 1).trim() }; });
  const maxL = Math.max(0, ...parts.map((p) => (p.r == null ? 0 : p.l.length)));
  const maxR = Math.max(0, ...parts.map((p) => (p.r == null ? p.l.length : p.r.length)));
  const maxN = Math.max(0, ...notes.map((n) => n.length + 2));
  const need = (maxL + maxR) * cw + maxN * cw * 0.62 + 2.6;
  if (need * size > 985 - x) size = Math.max(18, (985 - x) / need);
  const eqX = x + maxL * cw * size + size * 0.6, lh = size * 1.5;
  const noteX = eqX + size * 0.6 + maxR * cw * size + size * 0.5;
  const color = A("farbe") || C.ink, out = [];
  parts.forEach((p, i) => {
    const yy = y + i * lh, last = i === parts.length - 1 && parts.length > 1;
    const teil = "zeile-" + (i + 1) + (last ? " ergebnis" : "") + " rechnung";
    const fill = last ? C.red : color;
    let x1, x2;
    if (p.r == null) { out.push(tx(x, yy, p.l, { anchor: "start", size, fill, teil })); x1 = x; x2 = x + p.l.length * cw * size; }
    else {
      out.push(tx(eqX - size * 0.55, yy, p.l, { anchor: "end", size, fill, teil }));
      out.push(tx(eqX, yy, "=", { size, fill, teil }));
      out.push(tx(eqX + size * 0.55, yy, p.r, { anchor: "start", size, fill, teil }));
      x1 = eqX - size * 0.55 - p.l.length * cw * size; x2 = eqX + size * 0.55 + p.r.length * cw * size;
    }
    if (notes[i]) out.push(tx(noteX, yy, "| " + notes[i], { anchor: "start", size: size * 0.62, fill: C.grey, teil }));
    if (last) { out.push(ln(x1 - 6, yy + size * 0.28, x2 + 8, yy + size * 0.28, C.red, 3, teil)); out.push(ln(x1 - 6, yy + size * 0.28 + 7, x2 + 8, yy + size * 0.28 + 7, C.red, 3, teil)); }
  });
  return out;
}
function compPie(A) {
  const cx = N(A("cx"), 280), cy = N(A("cy"), 290), r = N(A("r"), 200);
  const n = clampN(Math.round(N(A("teile"), 4)), 1, 24), k = clampN(Math.round(N(A("gefuellt"), 1)), 0, n), color = A("farbe") || C.red;
  const out = [S("circle", { cx, cy, r, stroke: C.ink, "stroke-width": 4, fill: "none", teil: "kreis ganzes", "data-p": 1 })];
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  if (n > 1) for (let i = 0; i < n; i++) out.push(ln(cx, cy, cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i)), C.ink, 3, "kreis ganzes teilung", true));
  for (let i = 0; i < k; i++) {
    const a0 = ang(i), a1 = ang(i + 1), p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)], p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const d = n === 1 ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
      : `M ${cx} ${cy} L ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Z`;
    out.push(S("path", { d, fill: color, stroke: "none", teil: "gefuellt stueck-" + (i + 1), "data-p": 1 }));
  }
  if (A("beschriftung")) out.push(tx(cx, cy + r + 50, A("beschriftung"), { size: 38, fill: color, teil: "beschriftung" }));
  return out;
}
function compBar(A) {
  const x = N(A("x"), 60), y = N(A("y"), 200), w = N(A("breite"), 500), h = N(A("hoehe"), 90);
  const n = clampN(Math.round(N(A("teile"), 4)), 1, 30), k = clampN(Math.round(N(A("gefuellt"), 1)), 0, n), color = A("farbe") || C.red;
  const out = [S("rect", { x, y, width: w, height: h, stroke: C.ink, "stroke-width": 4, fill: "none", teil: "balken ganzes" })];
  for (let i = 1; i < n; i++) out.push(ln(x + (i * w) / n, y, x + (i * w) / n, y + h, C.ink, 3, "balken ganzes teilung", true));
  for (let i = 0; i < k; i++) out.push(S("rect", { x: x + (i * w) / n + 3, y: y + 3, width: w / n - 6, height: h - 6, fill: color, stroke: "none", teil: "gefuellt stueck-" + (i + 1) }));
  if (A("beschriftung")) out.push(tx(x + w / 2, y + h + 48, A("beschriftung"), { size: 38, fill: color, teil: "beschriftung" }));
  return out;
}
function compNumberline(A) {
  const x = N(A("x"), 60), y = N(A("y"), 300), L = N(A("laenge"), 860), from = N(A("von"), 0), to = N(A("bis"), 10);
  if (!(to > from)) return [];
  let step = N(A("schritt"), 1);
  if (!(step > 0) || (to - from) / step > 40) step = niceStep(to - from);
  const X = (v) => x + ((v - from) / (to - from)) * L, color = A("farbe") || C.red;
  const out = [ln(x - 10, y, x + L + 34, y, C.ink, 4, "zahlenstrahl"), ln(x + L + 34, y, x + L + 18, y - 11, C.ink, 4, "zahlenstrahl"), ln(x + L + 34, y, x + L + 18, y + 11, C.ink, 4, "zahlenstrahl")];
  const count = Math.round((to - from) / step), every = count > 20 ? 2 : 1;
  for (let i = 0; i <= count; i++) {
    const v = from + i * step;
    out.push(ln(X(v), y - 12, X(v), y + 12, C.ink, 3, "zahlenstrahl", true));
    if (i % every === 0) out.push(tx(X(v), y + 48, fmt(v), { size: 26, teil: "zahl-" + fmt(v).replace(",", "-") }));
  }
  String(A("markiere") || "").split(/[;\s]+|,(?=\s)/).map((s) => N(s, NaN)).filter((v) => isFinite(v) && v >= from && v <= to).slice(0, 12).forEach((v) => {
    const t = "punkt-" + fmt(v).replace(",", "-") + " markiert";
    out.push(S("circle", { cx: X(v), cy: y, r: 10, fill: color, stroke: color, "fill-style": "solid", teil: t }));
    out.push(tx(X(v), y - 28, fmt(v), { size: 34, fill: color, teil: t }));
  });
  return out;
}
// Kleiner, sicherer Formel-Rechner für Funktionsgraphen (kein eval)
function makeFn(src) {
  const s = String(src).toLowerCase().replace(/^\s*(y|f\(x\))\s*=/, "").replace(/\s+/g, "").replace(/,/g, ".").replace(/[·×]/g, "*").replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√/g, "sqrt");
  let i = 0;
  const peek = () => s[i];
  const FN = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp };
  function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const op = s[i++], r = term(), l = v; v = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x); } return v; }
  function term() {
    let v = unary();
    for (;;) {
      const c = peek();
      if (c === "*" || c === "/") { i++; const r = unary(), l = v; v = c === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x); }
      else if (c && /[0-9a-z.(]/.test(c)) { const r = unary(), l = v; v = (x) => l(x) * r(x); }
      else return v;
    }
  }
  function unary() { if (peek() === "-") { i++; const v = unary(); return (x) => -v(x); } if (peek() === "+") i++; return power(); }
  function power() { const b = atom(); if (peek() === "^") { i++; const e = unary(); return (x) => Math.pow(b(x), e(x)); } return b; }
  function atom() {
    if (peek() === "(") { i++; const v = expr(); if (peek() !== ")") throw 0; i++; return v; }
    let m = s.slice(i).match(/^\d+(\.\d+)?|^\.\d+/);
    if (m) { i += m[0].length; const n = parseFloat(m[0]); return () => n; }
    m = s.slice(i).match(/^(sqrt|sin|cos|tan|abs|log|ln|exp|pi|e|x)/);
    if (!m) throw 0;
    i += m[0].length;
    if (m[0] === "x") return (x) => x;
    if (m[0] === "pi") return () => Math.PI;
    if (m[0] === "e") return () => Math.E;
    const f = FN[m[0]], a = power();
    return (x) => f(a(x));
  }
  try { const f = expr(); if (i !== s.length) return null; f(1); return f; } catch (e) { return null; }
}
function compAxes(A) {
  const x = N(A("x"), 60), y = N(A("y"), 40), w = N(A("breite"), 520), h = N(A("hoehe"), 520);
  const xmin = N(A("xmin"), -5), xmax = N(A("xmax"), 5), ymin = N(A("ymin"), -5), ymax = N(A("ymax"), 5);
  if (!(xmax > xmin && ymax > ymin)) return [];
  const X = (v) => x + ((v - xmin) / (xmax - xmin)) * w, Y = (v) => y + h - ((v - ymin) / (ymax - ymin)) * h;
  const yAx = ymin <= 0 && ymax >= 0 ? Y(0) : y + h, xAx = xmin <= 0 && xmax >= 0 ? X(0) : x;
  const out = [
    ln(x - 8, yAx, x + w + 26, yAx, C.ink, 3, "x-achse achsen"), ln(x + w + 26, yAx, x + w + 12, yAx - 9, C.ink, 3, "x-achse achsen"), ln(x + w + 26, yAx, x + w + 12, yAx + 9, C.ink, 3, "x-achse achsen"),
    ln(xAx, y + h + 8, xAx, y - 26, C.ink, 3, "y-achse achsen"), ln(xAx, y - 26, xAx - 9, y - 12, C.ink, 3, "y-achse achsen"), ln(xAx, y - 26, xAx + 9, y - 12, C.ink, 3, "y-achse achsen"),
    tx(x + w + 30, yAx + 30, A("x-name") || "x", { size: 28, teil: "x-achse" }), tx(xAx - 22, y - 18, A("y-name") || "y", { size: 28, teil: "y-achse" })
  ];
  const sx = niceStep(xmax - xmin), sy = niceStep(ymax - ymin);
  for (let v = Math.ceil(xmin / sx) * sx; v <= xmax + 1e-9; v += sx) if (Math.abs(v) > 1e-9) { out.push(ln(X(v), yAx - 7, X(v), yAx + 7, C.ink, 2, "x-achse", true)); out.push(tx(X(v), yAx + 30, fmt(v), { size: 20, fill: C.grey, teil: "x-achse" })); }
  for (let v = Math.ceil(ymin / sy) * sy; v <= ymax + 1e-9; v += sy) if (Math.abs(v) > 1e-9) { out.push(ln(xAx - 7, Y(v), xAx + 7, Y(v), C.ink, 2, "y-achse", true)); out.push(tx(xAx - 14, Y(v) + 7, fmt(v), { size: 20, fill: C.grey, anchor: "end", teil: "y-achse" })); }
  const fns = String(A("funktion") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const cols = String(A("farben") || "").split(";").map((s) => s.trim());
  const def = [C.red, C.blue, C.green, "#f07c1a"];
  fns.forEach((src, k) => {
    const f = makeFn(src);
    if (!f) return;
    const color = COLOR.test(cols[k] || "") ? cols[k] : def[k], teil = "graph-" + (k + 1) + " funktion-" + (k + 1);
    let seg = [], last = null;
    const flush = () => { if (seg.length > 1) out.push(S("polyline", { points: seg.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "), stroke: color, "stroke-width": 4, fill: "none", teil })); seg = []; };
    for (let j = 0; j <= 160; j++) {
      const xv = xmin + ((xmax - xmin) * j) / 160, yv = f(xv);
      if (isFinite(yv) && yv >= ymin - (ymax - ymin) * 0.02 && yv <= ymax + (ymax - ymin) * 0.02) { seg.push([X(xv), Y(yv)]); last = [X(xv), Y(yv)]; } else flush();
    }
    flush();
    if (last) out.push(tx(Math.min(last[0], x + w - 10), Math.max(last[1] - 14, y + 20 + k * 30), "f(x) = " + src.replace(/^\s*(y|f\(x\))\s*=\s*/i, "").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\*/g, "·"), { size: 26, fill: color, anchor: "end", teil }));
  });
  return out;
}
function compArrow(A) {
  const x1 = N(A("x1"), 0), y1 = N(A("y1"), 0), x2 = N(A("x2"), 100), y2 = N(A("y2"), 0), color = A("farbe") || C.ink, teil = (A("teil") || "") + " pfeil";
  const ang = Math.atan2(y2 - y1, x2 - x1), hl = 18;
  const out = [ln(x1, y1, x2, y2, color, 4, teil), ln(x2, y2, x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45), color, 4, teil), ln(x2, y2, x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45), color, 4, teil)];
  if (A("text")) { let nx = -Math.sin(ang) * 24, ny = Math.cos(ang) * 24; if (ny > 0) { nx = -nx; ny = -ny; } out.push(tx((x1 + x2) / 2 + nx, (y1 + y2) / 2 + ny + 6, A("text"), { size: 28, fill: color, teil })); }
  return out;
}
const COMPONENTS = { "dreieck-rw": compTriangle, "kaestchen": compGrid, "gleichung": compEquation, "bruch-kreis": compPie, "bruch-balken": compBar, "zahlenstrahl": compNumberline, "koordinaten": compAxes, "pfeil": compArrow };
const TEIL_OK = /^[a-z0-9äöüß\- ]+$/i;
// ================= Chemie-Bausteine: Moleküle in der Tafel, Atom-Markierungen, Elektronenpfeile =================
let MOLREG = {};
const DIRS = { "oben": [0, -1], "unten": [0, 1], "links": [-1, 0], "rechts": [1, 0], "oben-links": [-0.7, -0.7], "oben-rechts": [0.7, -0.7], "unten-links": [-0.7, 0.7], "unten-rechts": [0.7, 0.7] };
function compMolecule(A) {
  const x = N(A("x"), 40), y = N(A("y"), 80), w = N(A("breite"), 420), h = N(A("hoehe"), 400);
  const smiles = String(A("smiles") || "").trim();
  if (!smiles) return [];
  if (!window.SmilesDrawer) return [tx(x + w / 2, y + h / 2, "(Molekül-Zeichner nicht geladen)", { size: 22, fill: C.grey })];
  const id = String(A("id") || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const name = A("name") || "";
  const teilBase = ((A("teil") || "") + " molekuel" + (id ? " " + id : "")).trim();
  const tmp = document.createElementNS(SVGNS, "svg");
  const dr = new SmilesDrawer.SvgDrawer({ width: 400, height: 300, padding: 6 });
  let ok = false;
  try { SmilesDrawer.parse(smiles, (tree) => { try { dr.draw(tree, tmp, "light", null, false, []); ok = true; } catch (e) { ok = false; } }, () => { ok = false; }); } catch (e) { ok = false; }
  const vb = (tmp.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  if (!ok || vb.length !== 4 || !(vb[2] > 0)) return [tx(x + w / 2, y + h / 2, "Formel fehlerhaft: " + smiles.slice(0, 40), { size: 20, fill: C.grey })];
  const [vx, vy, vw, vh] = vb, labelSpace = name ? 54 : 0;
  const s = Math.min(w / vw, (h - labelSpace) / vh);
  const ox = x + (w - vw * s) / 2, oy = y + (h - labelSpace - vh * s) / 2;
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("transform", `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${s.toFixed(3)}) translate(${(-vx).toFixed(2)} ${(-vy).toFixed(2)})`);
  tmp.querySelectorAll("style, radialGradient, linearGradient").forEach((e) => e.remove());
  tmp.querySelectorAll("line").forEach((l) => {
    if (/^url/.test(l.getAttribute("stroke") || "")) l.setAttribute("stroke", C.ink);
    l.setAttribute("stroke-width", "1.5"); l.setAttribute("data-p", "1"); l.setAttribute("teil", teilBase);
  });
  tmp.querySelectorAll("polygon, path").forEach((p) => {
    if (p.closest("defs, mask")) return;
    for (const a of ["fill", "stroke"]) if (/^url/.test(p.getAttribute(a) || "")) p.setAttribute(a, C.ink);
    p.setAttribute("data-p", "1"); p.setAttribute("teil", teilBase);
  });
  tmp.querySelectorAll("text").forEach((t) => { t.setAttribute("font-size", "10"); t.setAttribute("font-weight", "700"); t.setAttribute("fill", C.ink); t.setAttribute("teil", teilBase); });
  [...tmp.childNodes].forEach((n) => g.appendChild(n));
  const names = {};
  String(A("teile") || "").split(";").forEach((p) => { const m = p.match(/^\s*(\d+)\s*=\s*([a-z0-9äöüß\- ]+?)\s*$/i); if (m) names[m[1]] = m[2].toLowerCase(); });
  const reg = {};
  for (const v of dr.preprocessor.graph.vertices) {
    const c = v.value.class;
    if (c === undefined || c === null || c < 0 || reg[c]) continue;
    reg[c] = [ox + (v.position.x - vx) * s, oy + (v.position.y - vy) * s];
    const ring = document.createElementNS(SVGNS, "circle");
    ring.setAttribute("cx", v.position.x); ring.setAttribute("cy", v.position.y); ring.setAttribute("r", (dr.opts.bondLength || 30) * 0.45);
    ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "none"); ring.setAttribute("stroke-width", "1.5");
    ring.setAttribute("teil", ((names[c] || "") + " atom-" + c + (id ? " " + id + "-" + c : "")).trim());
    g.appendChild(ring);
  }
  if (id) MOLREG[id] = reg;
  MOLREG._last = reg;
  const out = [{ raw: g }];
  if (name) out.push(tx(x + w / 2, oy + vh * s + 44, name, { size: 34, teil: teilBase }));
  return out;
}
function atomPos(ref) {
  const m = String(ref || "").trim().toLowerCase().match(/^([a-z0-9_-]+)?:(\d+)$/);
  if (!m) return null;
  const reg = m[1] ? MOLREG[m[1]] : MOLREG._last;
  return reg && reg[m[2]] ? reg[m[2]] : null;
}
function compCurved(A) {
  const p0 = atomPos(A("von")) || (A("von-x") != null ? [N(A("von-x"), 0), N(A("von-y"), 0)] : null);
  if (!p0) return [];
  let p1 = atomPos(A("nach")) || (A("nach-x") != null ? [N(A("nach-x"), 0), N(A("nach-y"), 0)] : null);
  if (!p1) {
    const d = (DIRS[String(A("richtung") || "oben-rechts").toLowerCase()] || DIRS["oben-rechts"]).slice(), L = N(A("laenge"), 90);
    if (p0[0] + d[0] * (L + 40) < 20 || p0[0] + d[0] * (L + 40) > 980) d[0] = -d[0];
    if (p0[1] + d[1] * (L + 40) < 70 || p0[1] + d[1] * (L + 40) > 585) d[1] = -d[1];
    p1 = [p0[0] + d[0] * L, p0[1] + d[1] * L];
  }
  const color = A("farbe") || C.red, teil = ((A("teil") || "") + " bogenpfeil").trim();
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, k = N(A("kruemmung"), 0.35);
  const s0 = [p0[0] + ux * 12, p0[1] + uy * 12], s1 = [p1[0] - ux * 10, p1[1] - uy * 10];
  const cx = (s0[0] + s1[0]) / 2 - uy * L * k, cy = (s0[1] + s1[1]) / 2 + ux * L * k;
  const ang = Math.atan2(s1[1] - cy, s1[0] - cx), hl = 16;
  const out = [
    S("path", { d: `M ${s0[0].toFixed(1)} ${s0[1].toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${s1[0].toFixed(1)} ${s1[1].toFixed(1)}`, stroke: color, "stroke-width": 3.5, fill: "none", teil }),
    ln(s1[0], s1[1], s1[0] - hl * Math.cos(ang - 0.45), s1[1] - hl * Math.sin(ang - 0.45), color, 3.5, teil),
    ln(s1[0], s1[1], s1[0] - hl * Math.cos(ang + 0.45), s1[1] - hl * Math.sin(ang + 0.45), color, 3.5, teil)
  ];
  if (A("text")) { const tpos = A("nach") ? [cx, cy - 8] : [p1[0] + ux * 26, p1[1] + uy * 26 + 10]; out.push(tx(tpos[0], tpos[1], A("text"), { size: 30, fill: color, teil })); }
  return out;
}
function compTitle(A) {
  const x = N(A("x"), 30), y = N(A("y"), 48), t = String(A("text") || ""), color = A("farbe") || C.red;
  return [tx(x, y, t, { anchor: "start", size: N(A("groesse"), 38), fill: color, teil: "titel" }), ln(x, y + 12, x + Math.min(940, t.length * 18), y + 12, color, 2.5, "titel")];
}
Object.assign(COMPONENTS, { "molekuel": compMolecule, "bogenpfeil": compCurved, "titel": compTitle });
// ================= MedAT-Bausteine =================
const ah = (x, y, ang, color, w, teil, hl = 14) => [ln(x, y, x - hl * Math.cos(ang - 0.45), y - hl * Math.sin(ang - 0.45), color, w, teil), ln(x, y, x - hl * Math.cos(ang + 0.45), y - hl * Math.sin(ang + 0.45), color, w, teil)];
const list = (v) => String(v || "").split(";").map((s) => s.trim());
// Zahlenfolgen: Zahlen in Kästchen, Bögen mit dem Rechenschritt
function compSequence(A) {
  const nums = list(A("zahlen")).filter((s) => s !== "").slice(0, 12);
  if (!nums.length) return [];
  const arcs = list(A("boegen") || A("bogen")), arcs2 = list(A("boegen2"));
  const x = N(A("x"), 40), y = N(A("y"), 300), W = N(A("breite"), 920), n = nums.length;
  const step = W / n, bw = Math.min(step * 0.74, 110), bh = 72, cx = (i) => x + step * (i + 0.5), out = [];
  nums.forEach((v, i) => {
    const q = v === "?", teil = (q ? "luecke " : "") + "zahl-" + (i + 1) + " folge";
    out.push(S("rect", { x: cx(i) - bw / 2, y: y - bh / 2, width: bw, height: bh, stroke: q ? C.red : C.ink, "stroke-width": q ? 4 : 3, fill: q ? C.red : "none", teil }));
    out.push(tx(cx(i), y + 13, v, { size: Math.min(40, bw * 0.42), fill: q ? C.red : C.ink, teil }));
  });
  arcs.forEach((a, i) => {
    if (!a || i >= n - 1) return;
    const x1 = cx(i) + bw * 0.12, x2 = cx(i + 1) - bw * 0.12, yy = y - bh / 2 - 6, mid = (x1 + x2) / 2, ch = yy - Math.min(95, step * 0.75), teil = "bogen-" + (i + 1) + " muster";
    out.push(S("path", { d: `M ${x1} ${yy} Q ${mid} ${ch} ${x2} ${yy}`, stroke: C.blue, "stroke-width": 3, fill: "none", teil }), ...ah(x2, yy, Math.atan2(yy - ch, x2 - mid), C.blue, 3, teil));
    out.push(tx(mid, (yy + ch) / 2 - 6, a, { size: 28, fill: C.blue, teil }));
  });
  arcs2.forEach((a, i) => {
    if (!a || i >= n - 2) return;
    const x1 = cx(i), x2 = cx(i + 2), yy = y + bh / 2 + 6, mid = (x1 + x2) / 2, ch = yy + Math.min(110, step * 0.9), teil = "bogen2-" + (i + 1) + " muster-2";
    out.push(S("path", { d: `M ${x1} ${yy} Q ${mid} ${ch} ${x2} ${yy}`, stroke: C.green, "stroke-width": 3, fill: "none", teil }), ...ah(x2, yy, Math.atan2(yy - ch, x2 - mid), C.green, 3, teil));
    out.push(tx(mid, (yy + ch) / 2 + 26, a, { size: 26, fill: C.green, teil }));
  });
  return out;
}
// Implikationen: Mengenkreise (2 oder 3 Mengen), leere Bereiche schraffiert, X = "es gibt mindestens eines"
let VENN_ID = 0;
function compVenn(A) {
  const cx = N(A("cx"), 300), cy = N(A("cy"), 320), r = N(A("r"), 150), three = !!A("c");
  const d = r * 0.62, sets = three ? ["a", "b", "c"] : ["a", "b"];
  const ctr = three ? { a: [cx - 0.866 * d, cy - 0.5 * d], b: [cx + 0.866 * d, cy - 0.5 * d], c: [cx, cy + d] } : { a: [cx - d * 0.8, cy], b: [cx + d * 0.8, cy] };
  const colors = { a: C.blue, b: C.green, c: "#f07c1a" }, id = "venn" + (++VENN_ID);
  const label = (k) => A(k) || k.toUpperCase();
  const inside = (p, k) => Math.hypot(p[0] - ctr[k][0], p[1] - ctr[k][1]) <= r;
  const norm = (s) => String(s).toLowerCase().replace(/[^abc]/g, "").split("").filter((k) => sets.includes(k)).sort().join("");
  const regionCenter = (reg) => {
    let sx = 0, sy = 0, n = 0;
    for (let gx = cx - 2.2 * r; gx <= cx + 2.2 * r; gx += r / 14) for (let gy = cy - 2.2 * r; gy <= cy + 2.2 * r; gy += r / 14) {
      const p = [gx, gy], m = sets.filter((k) => inside(p, k)).join("");
      if (m === reg) { sx += gx; sy += gy; n++; }
    }
    return n ? [sx / n, sy / n] : null;
  };
  const out = [];
  const defs = document.createElementNS(SVGNS, "defs");
  for (const k of sets) {
    const cp = document.createElementNS(SVGNS, "clipPath"); cp.setAttribute("id", id + "-" + k);
    const c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", ctr[k][0]); c.setAttribute("cy", ctr[k][1]); c.setAttribute("r", r);
    cp.appendChild(c); defs.appendChild(cp);
  }
  out.push({ raw: defs });
  for (const k of sets) out.push(S("circle", { cx: ctr[k][0], cy: ctr[k][1], r, stroke: colors[k], "stroke-width": 4, fill: "none", teil: "kreis-" + k + " menge-" + k + " " + slug(label(k)) }));
  // leere Bereiche schraffieren
  for (const reg of list(A("leer")).map(norm).filter(Boolean)) {
    const excl = sets.filter((k) => !reg.includes(k));
    const mid = id + "-m-" + reg;
    if (excl.length) {
      const mask = document.createElementNS(SVGNS, "mask"); mask.setAttribute("id", mid); mask.setAttribute("maskUnits", "userSpaceOnUse");
      const bg = document.createElementNS(SVGNS, "rect"); bg.setAttribute("x", cx - 3 * r); bg.setAttribute("y", cy - 3 * r); bg.setAttribute("width", 6 * r); bg.setAttribute("height", 6 * r); bg.setAttribute("fill", "white"); mask.appendChild(bg);
      for (const k of excl) { const c = document.createElementNS(SVGNS, "circle"); c.setAttribute("cx", ctr[k][0]); c.setAttribute("cy", ctr[k][1]); c.setAttribute("r", r + 2); c.setAttribute("fill", "black"); mask.appendChild(c); }
      defs.appendChild(mask);
    }
    let wrap = document.createElementNS(SVGNS, "g"), inner = wrap;
    for (const k of reg.split("")) { const g = document.createElementNS(SVGNS, "g"); g.setAttribute("clip-path", `url(#${id}-${k})`); inner.appendChild(g); inner = g; }
    if (excl.length) { const g = document.createElementNS(SVGNS, "g"); g.setAttribute("mask", `url(#${mid})`); inner.appendChild(g); inner = g; }
    const rc = document.createElementNS(SVGNS, "rect");
    for (const [k, v] of Object.entries({ x: cx - 2.5 * r, y: cy - 2.5 * r, width: 5 * r, height: 5 * r, fill: "#7a756c", stroke: "none", "fill-style": "hachure", teil: "leer bereich-" + reg })) rc.setAttribute(k, v);
    inner.appendChild(rc);
    out.push({ raw: wrap });
  }
  // Namen der Mengen
  for (const k of sets) {
    const dx = ctr[k][0] - cx, dy = ctr[k][1] - cy, L = Math.hypot(dx, dy) || 1, half = label(k).length * 9 + 10;
    const p = [clampN(ctr[k][0] + dx / L * (r * 0.75), 20 + half, 980 - half), clampN(ctr[k][1] + dy / L * (r + 30) + 10, 40, 588)];
    out.push(tx(p[0], p[1], label(k), { size: 32, fill: colors[k], teil: "kreis-" + k + " menge-" + k + " " + slug(label(k)) }));
  }
  // Kreuze: "es gibt mindestens eines"; 'bc|abc' = auf der Grenze zwischen zwei Bereichen
  for (const kr of list(A("kreuz")).filter(Boolean)) {
    const pts = kr.split("|").map(norm).filter(Boolean).map(regionCenter).filter(Boolean);
    if (!pts.length) continue;
    const p = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length], z = 16, teil = "kreuz bereich-" + kr.split("|").map(norm).join("-");
    out.push(ln(p[0] - z, p[1] - z, p[0] + z, p[1] + z, C.red, 5, teil), ln(p[0] - z, p[1] + z, p[0] + z, p[1] - z, C.red, 5, teil));
  }
  return out;
}
// Wortflüssigkeit: gemischte Buchstaben, Linien zur Lösung, erster Buchstabe rot
function compLetters(A) {
  const clean = (v) => String(v || "").toUpperCase().replace(/[^A-ZÄÖÜ]/g, "").split("");
  const mixed = clean(A("gemischt")), word = clean(A("wort"));
  if (!mixed.length) return [];
  const x = N(A("x"), 40), y = N(A("y"), 110), W = N(A("breite"), 920), n = Math.max(mixed.length, word.length);
  const step = Math.min(W / n, 100), s = step * 0.78, x0 = x + (W - step * n) / 2, gap = N(A("abstand"), 250);
  const pos = (i, row) => [x0 + step * i + (step - s) / 2, row ? y + gap : y];
  const out = [tx(x + W / 2, y - 22, A("titel-oben") || "gemischt", { size: 26, fill: C.grey, teil: "gemischt" })];
  const tile = (i, row, ch, teil, color, fill) => { const [X, Y] = pos(i, row); out.push(S("rect", { x: X, y: Y, width: s, height: s, stroke: color, "stroke-width": 3, fill: fill || "none", teil })); out.push(tx(X + s / 2, Y + s * 0.7, ch, { size: s * 0.56, teil })); };
  mixed.forEach((ch, i) => tile(i, 0, ch, "gemischt buchstabe-g" + (i + 1), C.ink));
  if (word.length) {
    out.push(tx(x + W / 2, y + gap + s + 40, A("titel-unten") || "Lösungswort", { size: 26, fill: C.grey, teil: "loesung" }));
    const used = new Array(mixed.length).fill(false);
    word.forEach((ch, j) => {
      const first = j === 0, i = mixed.findIndex((m, k) => !used[k] && m === ch);
      if (i >= 0) {
        used[i] = true;
        const [ax, ay] = pos(i, 0), [bx, by] = pos(j, 1);
        out.push(ln(ax + s / 2, ay + s + 6, bx + s / 2, by - 8, first ? C.red : "#b9b3a6", first ? 4 : 2, "weg-" + (j + 1) + (first ? " erster-buchstabe" : "")));
      }
      tile(j, 1, ch, "loesung buchstabe-" + (j + 1) + (first ? " erster-buchstabe" : ""), first ? C.red : C.blue, first ? C.red : C.blue);
    });
  }
  return out;
}
// Figuren zusammensetzen: Teile liegen verstreut, beim Zeigen auf "zusammensetzen" gleiten sie in die Zielfigur
function seeded(seed) { let s = (seed >>> 0) || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
function shapePoly(kind, R) {
  const reg = (k, rot = -Math.PI / 2) => Array.from({ length: k }, (_, i) => [R * Math.cos(rot + (i * 2 * Math.PI) / k), R * Math.sin(rot + (i * 2 * Math.PI) / k)]);
  switch (kind) {
    case "kreis": return reg(64);
    case "halbkreis": return [...Array.from({ length: 33 }, (_, i) => [R * Math.cos(Math.PI + (i * Math.PI) / 32), R * 0.5 + R * Math.sin(Math.PI + (i * Math.PI) / 32)])];
    case "dreieck": return reg(3);
    case "quadrat": return reg(4, -Math.PI / 4);
    case "rechteck": return [[-R, -R * 0.62], [R, -R * 0.62], [R, R * 0.62], [-R, R * 0.62]];
    case "fuenfeck": return reg(5);
    case "achteck": return reg(8, -Math.PI / 8);
    default: return reg(6);
  }
}
function clipHalf(poly, p, nrm) {
  const out = [], side = (q) => (q[0] - p[0]) * nrm[0] + (q[1] - p[1]) * nrm[1];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const area = (p) => Math.abs(p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0)) / 2;
const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
function compAssemble(A) {
  const kind = String(A("ziel") || "kreis").toLowerCase(), k = clampN(Math.round(N(A("teile"), 4)), 2, 7), rand = seeded(N(A("seed"), 11));
  const R = N(A("groesse"), 125), tcx = N(A("ziel-x"), 790), tcy = N(A("ziel-y"), 300);
  let pieces = [shapePoly(kind, R)];
  for (let c = 0; c < k - 1; c++) {
    pieces.sort((p, q) => area(q) - area(p));
    const big = pieces.shift(), ce = centroid(big), ang = rand() * Math.PI, nrm = [Math.cos(ang), Math.sin(ang)];
    const off = (rand() - 0.5) * R * 0.25, p = [ce[0] + nrm[0] * off, ce[1] + nrm[1] * off];
    pieces.push(clipHalf(big, p, nrm), clipHalf(big, p, [-nrm[0], -nrm[1]]));
  }
  pieces = pieces.filter((p) => p.length >= 3);
  const colors = [C.blue, C.green, "#f07c1a", "#7b3fc4", "#e0559b", C.red, "#8b5a2b"], out = [];
  out.push(S("polygon", { points: shapePoly(kind, R).map((q) => (tcx + q[0]).toFixed(1) + "," + (tcy + q[1]).toFixed(1)).join(" "), stroke: "#b9b3a6", "stroke-width": 3, "stroke-dasharray": "10 8", fill: "none", teil: "ziel umriss " + kind }));
  out.push(tx(tcx, tcy + R + 46, A("ziel-name") || kind.charAt(0).toUpperCase() + kind.slice(1), { size: 30, fill: C.grey, teil: "ziel " + kind }));
  const cols = Math.ceil(Math.sqrt(pieces.length)), cellW = 530 / cols, cellH = 515 / Math.ceil(pieces.length / cols);
  pieces.forEach((pc, i) => {
    const ce = centroid(pc), rot = Math.round((rand() * 2 - 1) * 4) * 30, ra = (rot * Math.PI) / 180;
    // Drehpunkt = Mitte des Rahmens (transform-box: fill-box); gedrehte Ausdehnung um diesen Punkt
    const bc = [(Math.min(...pc.map((q) => q[0])) + Math.max(...pc.map((q) => q[0]))) / 2, (Math.min(...pc.map((q) => q[1])) + Math.max(...pc.map((q) => q[1]))) / 2];
    const rp = pc.map((q) => [(q[0] - bc[0]) * Math.cos(ra) - (q[1] - bc[1]) * Math.sin(ra), (q[0] - bc[0]) * Math.sin(ra) + (q[1] - bc[1]) * Math.cos(ra)]);
    const minX = Math.min(...rp.map((q) => q[0])), maxX = Math.max(...rp.map((q) => q[0])), minY = Math.min(...rp.map((q) => q[1])), maxY = Math.max(...rp.map((q) => q[1]));
    let sx = 30 + cellW * (i % cols) + cellW / 2, sy = 70 + cellH * Math.floor(i / cols) + cellH / 2;
    sx = clampN(sx, 25 - minX, 560 - maxX); sy = clampN(sy, 70 - minY, 585 - maxY);
    const dx = sx - (tcx + bc[0]), dy = sy - (tcy + bc[1]);
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("data-move", `${dx.toFixed(1)},${dy.toFixed(1)},${rot}`);
    g.setAttribute("data-pivot", `${(tcx + bc[0]).toFixed(1)},${(tcy + bc[1]).toFixed(1)}`);
    g.setAttribute("style", `transform-box: fill-box; transform-origin: center; transform: translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot}deg)`);
    const poly = document.createElementNS(SVGNS, "polygon");
    for (const [a, v] of Object.entries({ points: pc.map((q) => (tcx + q[0]).toFixed(1) + "," + (tcy + q[1]).toFixed(1)).join(" "), stroke: colors[i % colors.length], "stroke-width": 4, fill: colors[i % colors.length], teil: "stueck-" + (i + 1) + " teil-" + (i + 1) + " zusammensetzen" })) poly.setAttribute(a, v);
    const t = document.createElementNS(SVGNS, "text");
    for (const [a, v] of Object.entries({ x: (tcx + ce[0]).toFixed(1), y: (tcy + ce[1] + 10).toFixed(1), "font-size": 30, fill: C.ink, "text-anchor": "middle", teil: "stueck-" + (i + 1) + " zusammensetzen" })) t.setAttribute(a, v);
    t.textContent = String(i + 1);
    g.append(poly, t);
    out.push({ raw: g });
  });
  return out;
}
function assemble(on) {
  document.querySelectorAll("#board [data-move], .big [data-move]").forEach((g, i) => {
    const [dx, dy, rot] = g.getAttribute("data-move").split(",").map(Number);
    const from = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, to = "translate(0px, 0px) rotate(0deg)";
    g.animate([{ transform: on ? from : to }, { transform: on ? to : from }], { duration: 1400, delay: i * 350, fill: "forwards", easing: "ease-in-out" });
  });
}
// Teilchen (Atome/Ionen) mit Elektronenübergang oder gemeinsamem Elektronenpaar
const METALS = new Set(["li", "na", "k", "rb", "cs", "be", "mg", "ca", "sr", "ba", "al", "fe", "cu", "zn", "ag", "au", "pb", "sn", "mn", "cr", "ni", "co", "hg", "pt"]);
const ELCOL = { h: "#7a756c", c: "#1A1A1A", o: "#d62828", n: "#1f6fd1", s: "#c9a000", p: "#f07c1a", f: "#2a9d4b", cl: "#2a9d4b", br: "#8b5a2b", i: "#7b3fc4" };
function compParticles(A) {
  const x = N(A("x"), 40), y = N(A("y"), 110), w = N(A("breite"), 920), h = N(A("hoehe"), 400);
  const list = String(A("liste") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 6).map((s) => { const [sym, ch] = s.split(":").map((v) => (v || "").trim()); return { sym: sym.slice(0, 4), ch: ch || "" }; });
  if (!list.length) return [];
  const names = String(A("namen") || "").split(";").map((s) => s.trim());
  const shared = String(A("teilen") || "").split(";").map((s) => s.trim().match(/^(\d)\s*-\s*(\d)$/)).filter(Boolean).map((m) => [m[1] - 1, m[2] - 1]);
  const trans = String(A("uebergang") || "").split(";").map((s) => s.trim().match(/^(\d)\s*>\s*(\d)(?:\s*:\s*(\d))?$/)).filter(Boolean).map((m) => [m[1] - 1, m[2] - 1, clampN(N(m[3], 1), 1, 3)]);
  const isShared = (a, b) => shared.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  let r = Math.min(h * 0.27, 120);
  const adv = (i) => (i > 0 && isShared(i - 1, i) ? 1.5 : 2.9) * r;
  let total = 2 * r; for (let i = 1; i < list.length; i++) total += adv(i);
  if (total > w) { r *= w / total; total = w; }
  const cy = y + h * 0.45, pos = [];
  let cx = x + (w - total) / 2 + r;
  list.forEach((_, i) => { if (i) cx += adv(i); pos.push([cx, cy]); });
  const out = [], count = {};
  list.forEach((p, i) => {
    const key = p.sym.toLowerCase(), c = METALS.has(key) ? "#f07c1a" : (ELCOL[key] || C.blue);
    count[key] = (count[key] || 0) + 1;
    const teil = `teilchen-${i + 1} ${key} ${key}-${count[key]}`;
    out.push(S("circle", { cx: pos[i][0], cy: pos[i][1], r, stroke: c, "stroke-width": 5, fill: c, teil }));
    out.push(tx(pos[i][0], pos[i][1] + r * 0.24, p.sym, { size: Math.round(r * 0.7), fill: C.ink, teil }));
    if (p.ch) { const t = tx(pos[i][0] + r * 0.78, pos[i][1] - r * 0.62, p.ch.replace(/-/g, "−"), { size: Math.round(r * 0.48), fill: C.red, teil: teil + " ladung" }); if (trans.length) { t.attrs["fill-opacity"] = 0.12; t.attrs["data-after"] = 1; } out.push(t); }
    if (names[i]) out.push(tx(pos[i][0], cy + r + 46, names[i], { size: 30, fill: C.grey, teil }));
  });
  shared.forEach(([a, b], k) => {
    if (!pos[a] || !pos[b]) return;
    const mx = (pos[a][0] + pos[b][0]) / 2;
    for (const dy of [-13, 13]) out.push(S("circle", { cx: mx, cy: cy + dy, r: 9, stroke: C.ink, "stroke-width": 2, fill: "#f2b705", teil: `paar paar-${k + 1} elektronenpaar` }));
    out.push(tx(mx, cy - r - 24, "geteiltes e⁻-Paar", { size: 28, fill: C.blue, teil: `paar paar-${k + 1} elektronenpaar` }));
  });
  let e = 0;
  trans.forEach(([a, b, n], k) => {
    if (!pos[a] || !pos[b]) return;
    const dir = Math.sign(pos[b][0] - pos[a][0]) || 1;
    const sx = pos[a][0] + dir * r * 0.95, tx2 = pos[b][0] - dir * r * 0.95;
    const lift = r + 40 + k * 26;
    out.push(S("path", { d: `M${sx} ${cy - r * 0.5} Q${(sx + tx2) / 2} ${cy - lift - 40} ${tx2} ${cy - r * 0.5}`, stroke: C.red, "stroke-width": 4, fill: "none", "stroke-dasharray": "12 9", teil: `uebergang uebergang-${k + 1}` }));
    const ex = tx2, ey = cy - r * 0.5, ang = Math.atan2(ey - (cy - lift - 40), ex - (sx + tx2) / 2);
    out.push(S("path", { d: `M${ex - 20 * Math.cos(ang - 0.5)} ${ey - 20 * Math.sin(ang - 0.5)} L${ex} ${ey} L${ex - 20 * Math.cos(ang + 0.5)} ${ey - 20 * Math.sin(ang + 0.5)}`, stroke: C.red, "stroke-width": 4, fill: "none", teil: `uebergang uebergang-${k + 1}` }));
    out.push(tx((sx + tx2) / 2, cy - lift - 30, n > 1 ? `${n} e⁻` : "e⁻", { size: 32, fill: C.red, teil: `uebergang uebergang-${k + 1}` }));
    for (let j = 0; j < n; j++, e++) {
      const fx = tx2, fy = cy - 14 + j * 28, ox = sx - fx, oy = (cy - 14 + j * 28) - fy;
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("data-fly", `${ox.toFixed(1)},${oy.toFixed(1)}`);
      g.setAttribute("style", `transform: translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`);
      const dot = document.createElementNS(SVGNS, "circle");
      for (const [kk, v] of Object.entries({ cx: fx, cy: fy, r: 10, stroke: C.ink, "stroke-width": 2, fill: "#f2b705", teil: `uebergang uebergang-${k + 1} elektron` })) dot.setAttribute(kk, v);
      g.appendChild(dot);
      out.push({ raw: g });
    }
  });
  return out;
}
// Wellen (longitudinal/transversal): exakt berechnet, Teilchen bewegen sich auf Zeigen hin
function compWave(A) {
  const x = N(A("x"), 60), y = N(A("y"), 110), w = N(A("breite"), 880), h = N(A("hoehe"), 440);
  const longi = !/trans/i.test(String(A("art") || "longitudinal"));
  const wl = clampN(N(A("wellenlaengen"), 2), 1.5, 4), n = longi ? 25 : 21;
  const x0 = x + 30, x1 = x + w - 30, d = (x1 - x0) / (n - 1), lam = (x1 - x0) / wl, k = (2 * Math.PI) / lam;
  const y1 = y + h * 0.12, y2 = y + h * (longi ? 0.52 : 0.55), out = [];
  const PURPLE = "#7b3fc4", ORANGE = "#f07c1a";
  const arrow = (ax, ay, bx, by, c, teil, both) => {
    const a = Math.atan2(by - ay, bx - ax), L = 16, head = (px, py, ang) => S("path", { d: `M${px - L * Math.cos(ang - 0.45)} ${py - L * Math.sin(ang - 0.45)} L${px} ${py} L${px - L * Math.cos(ang + 0.45)} ${py - L * Math.sin(ang + 0.45)}`, stroke: c, "stroke-width": 4, fill: "none", teil, "data-p": 1 });
    const r = [ln(ax, ay, bx, by, c, 4, teil, true), head(bx, by, a)];
    if (both) r.push(head(ax, ay, a + Math.PI));
    return r;
  };
  // Ruhelage
  out.push(tx(x0 - 4, y1 - 26, "Ruhelage", { size: 28, fill: C.grey, anchor: "start", teil: "ruhelage" }));
  for (let i = 0; i < n; i++) out.push(S("circle", { cx: x0 + i * d, cy: y1, r: 9, stroke: "#9aa7b8", "stroke-width": 3, fill: "#9aa7b8", teil: "ruhelage", "data-p": 1 }));
  const A_l = d * 0.45, A_t = h * 0.17;
  if (!longi) {
    // Mittellinie und Wellenform
    out.push(S("line", { x1: x0 - 10, y1: y2, x2: x1 + 10, y2: y2, stroke: "#b9b3a6", "stroke-width": 2, "stroke-dasharray": "8 8", teil: "ruhelinie", "data-p": 1 }));
    let dd = ""; for (let s = 0; s <= 120; s++) { const px = x0 + (x1 - x0) * s / 120; dd += (s ? " L" : "M") + px.toFixed(1) + " " + (y2 - A_t * Math.sin(k * (px - x0))).toFixed(1); }
    out.push(S("path", { d: dd, stroke: C.blue, "stroke-width": 3, fill: "none", teil: "wellenform", "data-p": 1, opacity: 0.55 }));
  }
  for (let i = 0; i < n; i++) {
    const xr = x0 + i * d, ph = k * (xr - x0);
    const px = longi ? xr + A_l * Math.sin(ph) : xr, py = longi ? y2 : y2 - A_t * Math.sin(ph);
    const cs = Math.cos(ph);
    const zone = longi ? (cs < -0.55 ? "verdichtung" : cs > 0.55 ? "verduennung" : "") : (Math.sin(ph) > 0.85 ? "wellenberg" : Math.sin(ph) < -0.85 ? "wellental" : "");
    const col = longi ? (zone === "verdichtung" ? C.red : zone === "verduennung" ? C.green : C.blue) : C.blue;
    out.push(S("line", { x1: xr, y1: y1 + 11, x2: px, y2: py - 11, stroke: "#cfc9bd", "stroke-width": 1.5, "stroke-dasharray": "4 6", teil: "verschiebung", "data-p": 1 }));
    const g = document.createElementNS(SVGNS, "g");
    g.setAttribute("data-wave", `${longi ? A_l : 0},${longi ? 0 : -A_t},${ph.toFixed(4)}`);
    const c = document.createElementNS(SVGNS, "circle");
    for (const [kk, v] of Object.entries({ cx: px.toFixed(1), cy: py.toFixed(1), r: 11, stroke: col, "stroke-width": 3, fill: col, teil: ("teilchen welle " + zone).trim(), "data-p": 1 })) c.setAttribute(kk, v);
    g.appendChild(c); out.push({ raw: g });
  }
  // Beschriftungen
  if (longi) {
    const cV = x0 + lam / 2, cD = x0 + lam;
    out.push(tx(cV, y2 + 62, "Verdichtung", { size: 32, fill: C.red, teil: "verdichtung" }));
    out.push(tx(cD, y2 + 62, "Verdünnung", { size: 32, fill: C.green, teil: "verduennung" }));
    const yb = y2 + 112;
    out.push(...arrow(cV, yb, cV + lam, yb, ORANGE, "wellenlaenge", true));
    out.push(tx(cV + lam / 2, yb + 42, "Wellenlänge λ", { size: 32, fill: ORANGE, teil: "wellenlaenge" }));
    const sx = x0 + lam * 0.25;
    out.push(...arrow(sx - A_l - 14, y2 - 40, sx + A_l + 14, y2 - 40, PURPLE, "schwingung", true));
    out.push(tx(sx, y2 - 62, "schwingt ↔", { size: 28, fill: PURPLE, teil: "schwingung" }));
  } else {
    const cB = x0 + lam / 4, cT = x0 + 3 * lam / 4;
    out.push(tx(cB, y2 - A_t - 30, "Wellenberg", { size: 32, fill: C.ink, teil: "wellenberg" }));
    out.push(tx(cT, y2 + A_t + 50, "Wellental", { size: 32, fill: C.ink, teil: "wellental" }));
    out.push(...arrow(cB + 34, y2, cB + 34, y2 - A_t + 4, PURPLE, "amplitude", true));
    out.push(tx(cB + 46, y2 - A_t / 2 + 10, "A", { size: 32, fill: PURPLE, anchor: "start", teil: "amplitude" }));
    const yb = y2 + A_t + 95;
    out.push(...arrow(cB, yb, cB + lam, yb, ORANGE, "wellenlaenge", true));
    out.push(tx(cB + lam / 2, yb + 40, "Wellenlänge λ", { size: 32, fill: ORANGE, teil: "wellenlaenge" }));
    const sx = x0 + lam * 1.5 + lam * 0.1;
    if (sx < x1 - 40) { out.push(...arrow(sx + 30, y2 - A_t * 0.9, sx + 30, y2 + A_t * 0.9, PURPLE, "schwingung", true)); out.push(tx(sx + 44, y2 + 10, "schwingt ↕", { size: 28, fill: PURPLE, anchor: "start", teil: "schwingung" })); }
  }
  const ay = y1 + (y2 - y1) * (longi ? 0.5 : 0.42);
  out.push(...arrow(x + w * 0.58, ay, x + w * 0.94, ay, C.blue, "ausbreitung"));
  out.push(tx(x + w * 0.76, ay - 16, "Ausbreitung", { size: 30, fill: C.blue, teil: "ausbreitung" }));
  return out;
}
// Teilchen einer Welle in Bewegung setzen (zwei volle Schwingungen, endet wieder im Standbild)
function playWave(svg) {
  if (!svg || svg.dataset.waving) return;
  const gs = svg.querySelectorAll("[data-wave]");
  if (!gs.length) return;
  svg.dataset.waving = "1";
  const T = 2200, periods = 2, steps = 48;
  gs.forEach((g) => {
    const [ax, ay, ph] = g.getAttribute("data-wave").split(",").map(Number);
    const frames = [];
    for (let s = 0; s <= steps; s++) { const t = (s / steps) * periods * 2 * Math.PI, f = Math.sin(ph - t) - Math.sin(ph); frames.push({ transform: `translate(${(ax * f).toFixed(2)}px, ${(ay * f).toFixed(2)}px)` }); }
    g.animate(frames, { duration: T * periods, easing: "linear" });
  });
  svg.querySelectorAll('[data-teil~="wellenform"], [data-teil~="verschiebung"]').forEach((e) => e.animate([{ opacity: 1 }, { opacity: 0.15 }, { opacity: 0.15 }, { opacity: 1 }], { duration: T * periods }));
  setTimeout(() => { delete svg.dataset.waving; }, T * periods + 50);
}
// Spaced Repetition: Vergessenskurve ohne und mit Wiederholungen (schematisch)
function compForgetting(A) {
  const x = N(A("x"), 70), y = N(A("y"), 60), w = N(A("breite"), 860), h = N(A("hoehe"), 440), days = clampN(N(A("tage"), 30), 5, 120);
  const reps = list(A("wiederholungen") || "1; 3; 7; 14").map(Number).filter((v) => v > 0 && v < days).sort((p, q) => p - q);
  const X = (t) => x + (t / days) * w, Y = (r) => y + h - (r / 100) * h, out = [];
  out.push(ln(x, y + h, x + w + 20, y + h, C.ink, 3, "achsen"), ...ah(x + w + 20, y + h, 0, C.ink, 3, "achsen"), ln(x, y + h, x, y - 20, C.ink, 3, "achsen"), ...ah(x, y - 20, -Math.PI / 2, C.ink, 3, "achsen"));
  out.push(tx(x + w, y + h + 40, "Tage", { size: 26, fill: C.grey, anchor: "end", teil: "achsen" }), tx(x + 10, y - 26, "behalten (%)", { size: 26, fill: C.grey, anchor: "start", teil: "achsen" }));
  for (const p of [0, 50, 100]) out.push(tx(x - 12, Y(p) + 8, String(p), { size: 20, fill: C.grey, anchor: "end", teil: "achsen" }));
  const curve = (pts, color, teil, dash) => out.push(S("polyline", { points: pts.map((q) => X(q[0]).toFixed(1) + "," + Y(q[1]).toFixed(1)).join(" "), stroke: color, "stroke-width": 4, fill: "none", "stroke-dasharray": dash || null, teil }));
  const without = []; for (let t = 0; t <= days; t += days / 80) without.push([t, 100 * Math.exp(-t / 1.6)]);
  curve(without, "#b9b3a6", "ohne-wiederholung vergessen", "10 8");
  out.push(tx(X(days * 0.18), Y(18), "ohne Wiederholung", { size: 26, fill: C.grey, anchor: "start", teil: "ohne-wiederholung" }));
  let S0 = 1.6, last = 0;
  const pts = [];
  const segEnd = [...reps, days];
  segEnd.forEach((end) => { for (let t = last; t <= end + 1e-9; t += Math.max(0.1, (end - last) / 30)) pts.push([t, 100 * Math.exp(-(t - last) / S0)]); last = end; S0 *= 2.4; if (end < days) pts.push([end, 100]); });
  curve(pts, C.red, "mit-wiederholung wiederholen");
  reps.forEach((t, i) => { const teil = "wiederholung-" + (i + 1) + " wiederholen"; out.push(ln(X(t), Y(100) - 6, X(t), y + h, C.blue, 2, teil, true)); out.push(tx(X(t), y + h + 30 + (i % 2) * 24, "Tag " + t, { size: 22, fill: C.blue, teil })); });
  out.push(tx(X(days) - 6, Y(100 * Math.exp(-(days - reps[reps.length - 1] || 0) / S0)) - 18, "mit Wiederholungen", { size: 26, fill: C.red, anchor: "end", teil: "mit-wiederholung" }));
  out.push(tx(x + w, y + 10, "schematisch", { size: 20, fill: C.grey, anchor: "end", teil: "achsen" }));
  return out;
}
// Gedächtnispalast: Räume als Grundriss, Weg mit Pfeilen, in jedem Raum ein Merkbild
function compPalace(A) {
  const rooms = list(A("raeume")).filter(Boolean).slice(0, 8).map((r) => { const i = r.indexOf(":"); return i < 0 ? { name: r, bild: "" } : { name: r.slice(0, i).trim(), bild: r.slice(i + 1).trim() }; });
  if (!rooms.length) return [];
  const x = N(A("x"), 30), y = N(A("y"), 70), w = N(A("breite"), 940), h = N(A("hoehe"), 500), cols = rooms.length <= 3 ? rooms.length : Math.ceil(rooms.length / 2), rows = Math.ceil(rooms.length / cols);
  const rw = w / cols, rh = h / rows, out = [S("rect", { x, y, width: w, height: h, stroke: C.ink, "stroke-width": 5, fill: "none", teil: "haus grundriss" })];
  const colors = [C.blue, C.green, "#f07c1a", "#7b3fc4", "#e0559b", C.red, "#8b5a2b", "#f2b705"];
  const order = rooms.map((_, i) => { const r = Math.floor(i / cols), c = r % 2 ? cols - 1 - (i % cols) : i % cols; return [r, c]; });
  rooms.forEach((rm, i) => {
    const [r, c] = order[i], X0 = x + c * rw, Y0 = y + r * rh, teil = "raum-" + (i + 1) + " " + slug(rm.name);
    out.push(S("rect", { x: X0 + 6, y: Y0 + 6, width: rw - 12, height: rh - 12, stroke: colors[i % 8], "stroke-width": 3, fill: colors[i % 8], teil }));
    out.push(tx(X0 + 16, Y0 + 40, (i + 1) + ". " + rm.name, { size: 28, anchor: "start", fill: colors[i % 8], teil }));
    const words = rm.bild.split(/\s+/), lines = [];
    let line = "";
    for (const wd of words) { if ((line + " " + wd).trim().length > Math.max(10, rw / 15)) { lines.push(line); line = wd; } else line = (line + " " + wd).trim(); }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((l, k) => out.push(tx(X0 + rw / 2, Y0 + rh / 2 + 10 + (k - (Math.min(lines.length, 4) - 1) / 2) * 30, l, { size: 25, teil: teil + " bild-" + (i + 1) })));
  });
  for (let i = 0; i < rooms.length - 1; i++) {
    const [r1, c1] = order[i], [r2, c2] = order[i + 1];
    const p1 = [x + c1 * rw + rw / 2, y + r1 * rh + rh - 22], p2 = [x + c2 * rw + rw / 2, y + r2 * rh + rh - 22];
    const a = r1 === r2 ? [x + c1 * rw + rw * (c2 > c1 ? 0.8 : 0.2), y + r1 * rh + rh - 22] : [x + c1 * rw + rw / 2, y + r1 * rh + rh - 22];
    const b = r1 === r2 ? [x + c2 * rw + rw * (c2 > c1 ? 0.2 : 0.8), y + r2 * rh + rh - 22] : [x + c2 * rw + rw / 2, y + r2 * rh + 30];
    out.push(ln(a[0], a[1], b[0], b[1], C.red, 4, "weg rundgang"), ...ah(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), C.red, 4, "weg rundgang"));
  }
  return out;
}
Object.assign(COMPONENTS, { "zahlenfolge": compSequence, "venn": compVenn, "buchstaben": compLetters, "zusammensetzen": compAssemble, "vergessenskurve": compForgetting, "gedaechtnispalast": compPalace, "teilchen": compParticles, "welle": compWave });



// ================= Zeichnen: sicher einlesen, handgezeichnet machen, animieren =================
const SVGNS = "http://www.w3.org/2000/svg";
const TAGS = new Set(["g", "line", "polyline", "polygon", "path", "circle", "ellipse", "rect", "text", "tspan"]);
const ATTRS = new Set(["teil", "fill-style", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points", "d", "dx", "dy", "transform", "stroke", "stroke-width", "fill", "font-size", "font-weight", "text-anchor", "dominant-baseline", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity"]);
const COLOR = /^(#[0-9a-f]{3,8}|none|white|black)$/i;
const SHAPES = "line,polyline,polygon,path,circle,ellipse,rect";
const PALETTE = {
  "#1a1a1a": "#f4f1e6", "#000000": "#f4f1e6", "#000": "#f4f1e6", "black": "#f4f1e6",
  "#d62828": "#ff8a80", "#9b0000": "#ff8a80", "#1f6fd1": "#8cc8ff", "#1f5fbf": "#8cc8ff",
  "#2a9d4b": "#9be7a8", "#1a7f4b": "#9be7a8", "#f2b705": "#ffe066", "#f07c1a": "#ffb37a",
  "#7b3fc4": "#d0a8ff", "#e0559b": "#ffa6cf", "#8b5a2b": "#e0bb92", "#7a756c": "#c9c3b5", "#666666": "#e8e4d8", "#222222": "#f4f1e6", "#3498db": "#8cc8ff", "#e74c3c": "#ff8a80", "#f1c40f": "#ffe066", "#27ae60": "#9be7a8", "#1abc9c": "#9be7a8", "#e67e22": "#ffb37a", "#16a085": "#9be7a8", "#d35400": "#ffb37a", "#8e44ad": "#d0a8ff", "#c0392b": "#ff8a80", "#ffffff": "#23392d", "white": "#23392d"
};
const FILLSTYLES = new Set(["hachure", "cross-hatch", "zigzag", "dots", "solid", "dashed", "zigzag-line"]);
const col = (c, theme) => (!c || c === "none") ? c : (theme === "chalk" ? (PALETTE[c.toLowerCase()] || c) : c);

function copyInto(src, dst) {
  for (const n of src.childNodes) {
    if (n.nodeType === 3) { if (/^(text|tspan)$/.test(dst.localName)) dst.appendChild(document.createTextNode(n.nodeValue)); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.localName.toLowerCase();
    if (COMPONENTS[tag]) {
      let specs = [];
      try { specs = COMPONENTS[tag]((k) => n.getAttribute(k)); } catch (err) { specs = []; }
      for (const sp of specs) {
        if (sp.raw) { dst.appendChild(sp.raw); continue; }
        const e = document.createElementNS(SVGNS, sp.tag);
        for (const [k, v] of Object.entries(sp.attrs)) if (v != null && v !== "" && !(k === "teil" && !TEIL_OK.test(String(v)))) e.setAttribute(k, String(v).trim());
        if (sp.text != null) e.textContent = sp.text;
        dst.appendChild(e);
      }
      continue;
    }
    if (!TAGS.has(tag)) continue;
    const e = document.createElementNS(SVGNS, tag);
    for (const a of n.attributes) {
      const name = a.name.toLowerCase(), v = a.value.trim();
      if (!ATTRS.has(name)) continue;
      if ((name === "stroke" || name === "fill") && !COLOR.test(v)) continue;
      if (name === "teil" && !TEIL_OK.test(v)) continue;
      if (name === "transform" && !/^[a-z0-9\s(),.+-]+$/i.test(v)) continue;
      e.setAttribute(name, v);
    }
    if (tag === "text") {
      if (!e.hasAttribute("fill")) e.setAttribute("fill", "#1A1A1A");
      if (!e.hasAttribute("font-size")) e.setAttribute("font-size", "30");
    } else if (tag !== "g" && tag !== "tspan") {
      if (!e.hasAttribute("fill")) e.setAttribute("fill", "none");
      if (!e.hasAttribute("stroke")) e.setAttribute("stroke", e.getAttribute("fill") === "none" ? "#1A1A1A" : e.getAttribute("fill"));
      if (!e.hasAttribute("stroke-width")) e.setAttribute("stroke-width", "4");
    }
    dst.appendChild(e);
    copyInto(n, e);
  }
}
function sanitizeSvg(svgText, fallbackVB) {
  if (!svgText) return null;
  MOLREG = {};
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const src = doc.documentElement;
  if (!src || src.localName !== "svg" || doc.getElementsByTagName("parsererror").length) return null;
  const out = document.createElementNS(SVGNS, "svg");
  const vb = (src.getAttribute("viewBox") || "").trim();
  out.setAttribute("viewBox", /^-?[\d.]+[\s,]+-?[\d.]+[\s,]+[\d.]+[\s,]+[\d.]+$/.test(vb) ? vb : fallbackVB);
  copyInto(src, out);
  return out.querySelector(SHAPES + ",text") ? out : null;
}
const num = (e, a, d = 0) => { const v = parseFloat(e.getAttribute(a)); return isFinite(v) ? v : d; };
const pts = (s) => { const n = (s || "").trim().split(/[\s,]+/).map(Number).filter(isFinite); const r = []; for (let i = 0; i + 1 < n.length; i += 2) r.push([n[i], n[i + 1]]); return r; };
function roughOpts(o) { return Object.assign({ roughness: 0.85, bowing: 0.7 }, o); }
// Jede Form wird handgezeichnet: erst der Umriss, dann die Schraffur
function roughify(svg, theme, scale) {
  if (!window.rough) return;
  const rc = rough.svg(svg), gen = rc.generator;
  let seed = 1;
  svg.querySelectorAll(SHAPES).forEach((e) => {
    if (e.closest("defs, mask")) return;
    const stroke = e.getAttribute("stroke"), fill = e.getAttribute("fill");
    const fs = (e.getAttribute("fill-style") || "tint").toLowerCase();
    const sw = num(e, "stroke-width", 4);
    const o = roughOpts({
      seed: seed++, stroke: stroke && stroke !== "none" ? col(stroke, theme) : "none", strokeWidth: sw,
      fillStyle: "hachure", hachureGap: 15 * scale, fillWeight: 1.3, hachureAngle: -41
    });
    if (e.getAttribute("data-p")) { o.roughness = 0.35; o.bowing = 0.3; o.disableMultiStroke = true; }
    if (fill && fill !== "none") {
      const c = col(fill, theme);
      if (/^(#fff(fff)?|white)$/i.test(fill)) { o.fill = c; o.fillStyle = "solid"; }
      else if (fs === "tint" || !FILLSTYLES.has(fs)) { o.fill = /^#[0-9a-f]{6}$/i.test(c) ? c + (theme === "chalk" ? "30" : "47") : c; o.fillStyle = "solid"; }
      else { o.fill = c; o.fillStyle = fs; }
    }
    let d = null;
    try {
      switch (e.localName) {
        case "line": d = gen.line(num(e, "x1"), num(e, "y1"), num(e, "x2"), num(e, "y2"), o); break;
        case "rect": d = gen.rectangle(num(e, "x"), num(e, "y"), num(e, "width"), num(e, "height"), o); break;
        case "circle": d = gen.circle(num(e, "cx"), num(e, "cy"), 2 * num(e, "r"), o); break;
        case "ellipse": d = gen.ellipse(num(e, "cx"), num(e, "cy"), 2 * num(e, "rx"), 2 * num(e, "ry"), o); break;
        case "polygon": d = gen.polygon(pts(e.getAttribute("points")), o); break;
        case "polyline": d = gen.linearPath(pts(e.getAttribute("points")), o); break;
        case "path": d = gen.path(e.getAttribute("d") || "", o); break;
      }
    } catch (err) { d = null; }
    if (!d) return;
    d.sets.sort((a, b) => (a.type === "path" ? 0 : 1) - (b.type === "path" ? 0 : 1));
    const g = rc.draw(d);
    if (e.getAttribute("teil")) g.setAttribute("data-teil", e.getAttribute("teil").toLowerCase());
    for (const a of ["transform", "opacity"]) if (e.hasAttribute(a)) g.setAttribute(a, e.getAttribute(a));
    e.replaceWith(g);
  });
  svg.querySelectorAll("text, tspan[fill]").forEach((t) => {
    const f = t.getAttribute("fill"); if (f) t.setAttribute("fill", col(f, theme));
    if (t.getAttribute("teil")) t.setAttribute("data-teil", t.getAttribute("teil").toLowerCase());
  });
}
function buildBoardSvg(svgText, theme) {
  const out = sanitizeSvg(svgText, "0 0 1000 600");
  if (!out) return null;
  out.setAttribute("role", "img");
  const vbw = parseFloat(out.getAttribute("viewBox").split(/[\s,]+/)[2]) || 1000;
  roughify(out, theme, vbw / 1000);
  return out;
}
function animateSvg(svg, cap = 20000) {
  if (!svg || !svg.animate) return 0;
  svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const plan = [];
  svg.querySelectorAll(SHAPES + ",text").forEach((e) => {
    if (e.closest("defs, mask")) return;
    if (e.localName === "text") { plan.push({ e, kind: "fade", dur: 380, step: 260 }); return; }
    let len = 0;
    try { len = e.getTotalLength(); } catch (err) { len = 0; }
    const hasStroke = e.getAttribute("stroke") && e.getAttribute("stroke") !== "none";
    if (!len || !isFinite(len) || !hasStroke) { plan.push({ e, kind: "fade", dur: 250, step: 90 }); return; }
    const isHatch = (e.getAttribute("d") || "").split("M").length > 4;
    const dur = isHatch ? Math.max(300, Math.min(1400, len * 0.35)) : Math.max(180, Math.min(1200, len * 2.2));
    plan.push({ e, kind: "stroke", len, dur, step: dur * 0.85 });
  });
  const total = plan.reduce((s, p) => s + p.step, 0);
  const k = total > cap ? cap / total : 1;
  let t = 200;
  plan.forEach((p) => {
    const dur = p.dur * k;
    if (p.kind === "stroke") {
      p.e.animate([{ strokeDasharray: p.len + " " + p.len, strokeDashoffset: p.len }, { strokeDasharray: p.len + " " + p.len, strokeDashoffset: 0 }], { duration: dur, delay: t, fill: "both", easing: "ease-in-out" });
      const f = p.e.getAttribute("fill");
      if (f && f !== "none") p.e.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 250, delay: t + dur, fill: "both" });
    } else {
      p.e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay: t, fill: "both" });
    }
    t += p.step * k;
  });
  return t;
}

// Strukturformeln (SmilesDrawer)
function renderMolecules(list, box, animate = true, height) {
  box.replaceChildren();
  if (!list || !list.length) return;
  if (!window.SmilesDrawer) { box.appendChild(el("p", "hint", "Die Molekül-Zeichenbibliothek konnte nicht geladen werden. Lade die Seite neu.")); return; }
  list.slice(0, 3).forEach(({ name, smiles }) => {
    const card = el("figure", "mol");
    card.setAttribute("data-teil", slug(name) + " molekuel");
    const svg = document.createElementNS(SVGNS, "svg");
    if (height) svg.style.height = height + "px";
    const cap = el("figcaption", null, name);
    card.append(svg, cap);
    box.appendChild(card);
    const fail = () => card.replaceChildren(cap, el("p", "hint", "Diese Struktur konnte nicht gezeichnet werden (fehlerhafte Formel: " + smiles + ")."));
    const highlights = [...new Set([...smiles.matchAll(/:(\d+)\]/g)].map((m) => Number(m[1])))].map((n) => [n, "#9B0000"]);
    try {
      const drawer = new SmilesDrawer.SvgDrawer({ width: 360, height: 240, padding: 18, bondThickness: 1.3 });
      SmilesDrawer.parse(smiles, (tree) => {
        try { drawer.draw(tree, svg, "light", null, false, highlights); svg.removeAttribute("width"); svg.removeAttribute("height"); if (animate) animateSvg(svg); }
        catch (err) { fail(); }
      }, fail);
    } catch (err) { fail(); }
  });
}


// ================= LernBlick in der App: Panel, Bildschirmaufnahme, Gespräch =================
const LB_LANGS = {
  de: { label: "Deutsch", name: "Deutsch", tts: ["de"] }, en: { label: "English", name: "Englisch", tts: ["en"] },
  ro: { label: "Română", name: "Rumänisch", tts: ["ro"] }, tr: { label: "Türkçe", name: "Türkisch", tts: ["tr"] },
  bks: { label: "B/K/S", name: "Bosnisch/Kroatisch/Serbisch in lateinischer Schrift", tts: ["hr", "bs", "sr"] },
  uk: { label: "Українська", name: "Ukrainisch", tts: ["uk"] }, ar: { label: "العربية", name: "Arabisch", tts: ["ar"] }
};
const LB_STYLES = {
  sokratisch: "LERNSTIL Selbst denken: Gib NICHT sofort die fertige Lösung. Erkläre kurz, was relevant ist, und stelle dann EINE gezielte Leitfrage. Wenn die Person ausdrücklich nach der Lösung fragt oder einen Fehler erklärt haben will, erkläre vollständig.",
  erklaeren: "LERNSTIL Erklären: Zuerst das Wichtigste in einem Satz, dann die Details Schritt für Schritt. Wenn sinnvoll eine Eselsbrücke. Am Ende eine kurze Kontrollfrage zum Selbsttest."
};
const LB_ROLE = "Du bist LernBlick, ein geduldiger, sehr anschaulicher Lerntutor in der App 'MedAT Trainer' für angehende Medizinstudierende in Österreich. Du siehst einen Screenshot genau des Bildschirms, auf dem die Person gerade ist (eine Prüfungsfrage, ein Lern-Tool wie Wellen, Kräfte, Stammbaum, eine Erklärseite …) und erklärst, was dort zu sehen ist und was die Person nicht versteht. Du kennst den MedAT: Basiskenntnistest (Biologie, Chemie, Physik, Mathematik), kognitive Fähigkeiten (Figuren zusammensetzen, Allergieausweise, Zahlenfolgen, Wortflüssigkeit, Implikationen erkennen), Textverständnis und sozial-emotionale Kompetenzen. Du duzt, sprichst einfach und klar und erklärst so, dass man es in der Prüfung unter Zeitdruck selbst anwenden kann. Offizielle Zahlen (Aufgabenanzahl, Zeiten, Punkte) nennst du nur, wenn sie im Kontext stehen. Ist eine richtige Antwort vorgegeben, gilt sie: Rechne sie nach, zeig den Weg dorthin, benenne genau den Denkfehler der gewählten falschen Antwort und schließe mit einem kurzen Strategie-Tipp. Kommst du beim Nachrechnen auf etwas anderes, sag das ehrlich.";

const lb = { open: false, shot: null, shotW: 1000, shotH: 600, shotScroll: [0, 0], ctx: null, style: "erklaeren", speak: true, natural: true, busy: false, turns: [], usedSession: false };
let cur = { boards: [], turns: [] };
let curBoard = -1, answerBoards = null, lastBody = "", walkTimers = [], lbSupabase = null;
let shotBlob = null, shotW = 1000, shotH = 600; // vom Zeichen-Teil (rules) erwartet

// ---------- Bibliotheken & Anmeldung ----------
const LIBS = {
  rough: "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js",
  smiles: "https://cdn.jsdelivr.net/npm/smiles-drawer@2.4.1/dist/smiles-drawer.min.js",
  h2c: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  supa: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",
  font: "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap"
};
const loaded = {};
function loadScript(src) {
  if (!loaded[src]) loaded[src] = new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Konnte nicht laden: " + src)); document.head.appendChild(s); });
  return loaded[src];
}
async function ensureLibs() {
  if (!document.querySelector('link[data-lb-font]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = LIBS.font; l.dataset.lbFont = "1"; document.head.appendChild(l); }
  await Promise.all([window.rough ? 0 : loadScript(LIBS.rough), window.SmilesDrawer ? 0 : loadScript(LIBS.smiles).catch(() => 0)]);
}
async function getSupabase() {
  if (typeof Auth !== "undefined" && Auth.supabase) return Auth.supabase;
  if (lbSupabase) return lbSupabase;
  if (typeof CONFIG === "undefined") await loadScript(BASE + "js/config.js");
  if (!window.supabase) await loadScript(LIBS.supa);
  lbSupabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return lbSupabase;
}
async function getToken() {
  const sb = await getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.access_token) return session.access_token;
  const { data: r } = await sb.auth.refreshSession();
  if (r && r.session && r.session.access_token) return r.session.access_token;
  throw Object.assign(new Error("Bitte melde dich in der App an, um LernBlick zu nutzen."), { code: "login" });
}
async function callFn(name, body, asBlob) {
  const token = await getToken();
  const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: CONFIG.SUPABASE_ANON_KEY },
    body: JSON.stringify(body)
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || `Fehler ${resp.status}`); }
  return asBlob ? resp.blob() : resp.json();
}

// ---------- Was ist gerade auf dem Bildschirm? ----------
function visible(elm) { if (!elm) return false; const r = elm.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(elm).visibility !== "hidden" && !elm.closest(".hidden"); }
function readContext() {
  const ctx = { seite: document.title.replace(/\s+/g, " ").trim(), pfad: location.pathname.split("/").slice(-2).join("/"), ueberschrift: "", frage: null };
  const h = [...document.querySelectorAll("h1, h2, .tool-title, .screen.active h2")].find(visible);
  if (h) ctx.ueberschrift = h.textContent.replace(/\s+/g, " ").trim().slice(0, 140);
  const qScreen = document.getElementById("screen-question");
  if (qScreen && visible(qScreen) && typeof App !== "undefined" && App.questions) {
    const q = App.questions[App.currentIndex];
    if (q) {
      const c = q.content || {};
      const txt = (sel) => { const e = qScreen.querySelector(sel); return e ? e.textContent.replace(/\s+/g, " ").trim() : ""; };
      const labels = "ABCDEF";
      const opts = Array.isArray(c.options) ? c.options.map((o, i) => `${labels[i] || i + 1}) ${typeof o === "string" ? o : JSON.stringify(o)}`).join("\n") : "";
      const ci = c.correct ?? c.correct_index;
      ctx.frage = {
        bereich: q.type + (q.subtype ? " / " + q.subtype : ""),
        text: c.question || c.premise1 && `${c.premise1} ${c.premise2 || ""}` || c.word || c.sequence && String(c.sequence) || txt("#q-text, .question-text") || "",
        optionen: opts,
        richtig: Number.isInteger(ci) && c.options ? `${labels[ci]}) ${c.options[ci]}` : (txt(".answer-btn.correct") || ""),
        gewaehlt: txt(".answer-btn.incorrect") || "",
        erklaerung: (txt("#q-explanation") || c.explanation || "").slice(0, 1200)
      };
    }
  }
  return ctx;
}
function contextText(ctx) {
  let t = `KONTEXT (was gerade in der App zu sehen ist):\nSeite: ${ctx.seite}${ctx.ueberschrift ? " – " + ctx.ueberschrift : ""} (${ctx.pfad})`;
  const f = ctx.frage;
  if (f) {
    t += `\nAufgabe (${f.bereich}): ${f.text}`;
    if (f.optionen) t += `\nAntwortmöglichkeiten:\n${f.optionen}`;
    if (f.richtig) t += `\nRichtige Antwort laut Lösungsschlüssel: ${f.richtig}`;
    if (f.gewaehlt) t += `\nGewählte (falsche) Antwort: ${f.gewaehlt}`;
    if (f.erklaerung) t += `\nErklärung aus der App: ${f.erklaerung}`;
  }
  return t + "\nDer Screenshot zeigt genau diesen Bildschirm.";
}

// ---------- Bildschirmaufnahme ----------
async function captureScreen() {
  await loadScript(LIBS.h2c);
  const vw = window.innerWidth, vh = window.innerHeight;
  const canvas = await html2canvas(document.body, {
    x: window.scrollX, y: window.scrollY, width: vw, height: vh, windowWidth: document.documentElement.clientWidth,
    scale: Math.min(1.25, window.devicePixelRatio || 1), useCORS: true, logging: false, backgroundColor: null,
    ignoreElements: (e) => e.id === "lernblick-root"
  });
  const max = 1400, k = Math.min(1, max / Math.max(canvas.width, canvas.height));
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * k); out.height = Math.round(canvas.height * k);
  out.getContext("2d").drawImage(canvas, 0, 0, out.width, out.height);
  const dataUrl = out.toDataURL("image/jpeg", 0.82);
  return { dataUrl, w: vw, h: vh };
}

// ---------- Anker: Stellen des Bildschirms, auf die LernBlick exakt zeigen kann ----------
let anchors = {};
const clean = (s, n = 70) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
function collectAnchors() {
  anchors = {};
  const lines = [], vw = window.innerWidth, vh = window.innerHeight, k = 1000 / vw, used = new Set();
  const add = (name, e, desc) => {
    if (!e || anchors[name] || used.has(e) || lines.length >= 45 || e.closest("#lernblick-root, #lb-wrong-btn")) return;
    const r = e.getBoundingClientRect();
    if (r.width < 10 || r.height < 10 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || !visible(e)) return;
    anchors[name] = e; used.add(e);
    lines.push(`${name}: ${desc} [x ${Math.round(r.left * k)}, y ${Math.round(r.top * k)}, Breite ${Math.round(r.width * k)}, Höhe ${Math.round(r.height * k)}]`);
  };
  const qs = document.getElementById("screen-question");
  if (qs && visible(qs)) {
    add("frage", qs.querySelector("#q-text, .question-text, h2, h3"), "der Fragetext");
    [...qs.querySelectorAll(".answer-btn")].forEach((b, i) => {
      const L = "ABCDEFGH"[i] || String(i + 1);
      const state = b.classList.contains("incorrect") ? " – DIE GEWÄHLTE FALSCHE ANTWORT" : b.classList.contains("correct") ? " – DIE RICHTIGE ANTWORT" : "";
      const txt = b.querySelector(".answer-text") ? b.querySelector(".answer-text").textContent : b.textContent;
      add("antwort-" + L.toLowerCase(), b, `${i + 1}. Antwortknopf (${L}): "${clean(txt)}"${state}`);
    });
    add("rueckmeldung", qs.querySelector("#q-feedback"), "Rückmeldung der App (richtig/falsch)");
    add("erklaerung", qs.querySelector("#q-explanation"), "Erklärung der App");
  }
  let n = 0;
  document.querySelectorAll("h1, h2, h3").forEach((h) => add("ueberschrift-" + (++n), h, `Überschrift "${clean(h.textContent, 60)}"`));
  n = 0;
  document.querySelectorAll("canvas, svg, img, video").forEach((g) => { const r = g.getBoundingClientRect(); if (r.width > 140 && r.height > 90) add("bild-" + (++n), g, `${g.localName === "canvas" ? "Grafik/Animation" : "Bild"}${g.getAttribute("aria-label") || g.alt ? ' "' + clean(g.getAttribute("aria-label") || g.alt, 40) + '"' : ""}`); });
  n = 0;
  document.querySelectorAll("input[type=range]").forEach((s) => { const lab = s.closest("label, .slider, .control, div")?.textContent || s.getAttribute("aria-label") || ""; add("regler-" + (++n), s, `Regler "${clean(lab, 40)}" (Wert ${s.value})`); });
  n = 0;
  document.querySelectorAll("button, [role=tab], .tab, a.btn").forEach((b) => { const t = clean(b.textContent, 40); if (t && n < 14) add("knopf-" + (++n), b, `Knopf "${t}"`); });
  n = 0;
  document.querySelectorAll("table, .card, .info-box, .formula, .result, p, li, label").forEach((p) => { const t = clean(p.textContent, 60); if (t.length > 12 && n < 12 && !p.querySelector("table, .card")) add("text-" + (++n), p, `Text "${t}"`); });
  return lines.join("\n");
}

// ---------- Anleitung für die KI ----------
function rules() {
  const L = LB_LANGS[$("lang").value] || LB_LANGS.de;
  const voice = lb.speak ? "Die Antwort wird VORGELESEN: höchstens 6 kurze Sätze, keine Listen, keine Tabellen, keine Sonderzeichen-Formeln im Text (Formeln gehören an die Tafel)." : "Halte dich kurz (höchstens etwa 160 Wörter). **fett** und Listen mit '- ' sind erlaubt.";
  const H = Math.round(1000 * lb.shotH / lb.shotW);
  const anchorList = lb.anchorText ? `\nANKER – diese Stellen des Bildschirms kennt das Programm genau (Name: was dort steht [Position im Screenshot]):\n${lb.anchorText}\n` : "";
  const draw = lb.shot ? `\n\nAUF DEN BILDSCHIRM ZEICHNEN: Wie eine Lehrkraft, die mit dem Marker ins Buch zeigt, markierst du Stellen direkt auf dem Bildschirm der Person. Hänge dafür GANZ AM ENDE deiner Antwort an:\nBILDZEICHNUNG:\n<svg viewBox='0 0 1000 ${H}'> ... </svg>\nBenutze dafür VOR ALLEM den Baustein markiere. Er sitzt immer exakt auf der richtigen Stelle, auch wenn die Person scrollt:\n<markiere ziel='antwort-c' art='kreis' farbe='rot' text='deine Wahl' teil='deine-wahl'/>\n- ziel: ein Name aus der ANKER-Liste unten (nie raten).\n- art: kreis (einkreisen), rahmen (Kasten drum), unterstreichen, leuchtstift (gelb hinterlegen), haken (✓), kreuz (✗), pfeil (Pfeil zeigt darauf).\n- farbe: rot, gruen, blau, orange, lila. Rot = falsch / deine Wahl, Grün = richtig.\n- text: höchstens 3 Wörter, steht neben der Stelle. Weglassen, wenn nicht nötig.\n- stelle='0.3,0.5' (optional, nur bei Bildern, Grafiken und Animationen): zeigt auf einen Punkt innerhalb des Ankers (0,0 links oben, 1,1 rechts unten).\n- teil: Name, damit du im Text mit [[teil|…]] darauf zeigst. Dann leuchtet die Markierung genau in dem Moment auf.\nHöchstens 5 Markierungen, jede mit eigenem teil. Nur wenn es für eine Stelle keinen Anker gibt, darfst du frei mit line, path, circle, ellipse, rect und text zeichnen (Koordinaten des Screenshots: 0,0 links oben, x=1000 rechter Rand, y=${H} unterer Rand). Wenn nichts zu markieren ist, lass BILDZEICHNUNG weg.${anchorList}` : "";
  const f = lb.ctx && lb.ctx.frage;
  const wrong = f && f.gewaehlt ? `\n\nFALSCH BEANTWORTETE AUFGABE – so erklärst du:\n1. Erst auf dem Bildschirm zeigen (BILDZEICHNUNG mit markiere): die gewählte Antwort rot einkreisen (text 'deine Wahl', teil 'deine-wahl'), die richtige grün einkreisen (text 'richtig', teil 'richtig'), ein entscheidendes Schlüsselwort der Frage (z. B. NICHT) orange unterstreichen. Achte genau darauf, welcher Buchstabe welche Antwort ist (KONTEXT und ANKER).\n2. Dann 1 bis 3 Tafeln, die das Fachwissen SICHTBAR machen – genau das, was man im Kopf haben muss, um die Frage zu lösen: Teilchen, Moleküle, Elektronen, Kräfte, Abläufe, Kurven. Bei Abläufen eine Tafel pro Schritt. Die Frage, die Antwortmöglichkeiten oder die Erklärung der App schreibst du NICHT an die Tafel – das steht schon auf dem Bildschirm.\n3. Im Text (vorgelesen) benennst du den Denkfehler in einem Satz, ohne Vorwurf, und gibst am Ende einen kurzen Prüfungstipp.` : "";
  const board = `\n\nTAFEL-REGELN (die Tafel füllt den ganzen Bildschirm):\n- Die Tafel ist für BILDER, nicht für Text: Skizzen, Moleküle, Teilchen, Pfeile, Abläufe, Graphen. Text an der Tafel nur als kurze Beschriftung (höchstens 4 Wörter) direkt am Bild. Keine Sätze, keine Tabellen, keine Listen, nichts abschreiben, was schon auf dem Bildschirm steht.\n- Zu JEDER inhaltlichen Antwort gehört mindestens eine Tafel (ZEICHNUNG) – die Person lernt über das Bild. Nur bei reinen Rückfragen oder Smalltalk keine.\n- Benutze für das Bild IMMER zuerst einen passenden Baustein aus dem BAUKASTEN (exakt berechnet, sieht gut aus). Frei zeichnen nur, wenn wirklich keiner passt – dann groß über die ganze Tafel (x 60 bis 940), jede Beschriftung mit Abstand zu allem anderen.\n- Formeln gehören in <gleichung> und nur, wenn gerechnet wird – keine Formelsammlungen.\n- Pro Tafel EIN Gedanke mit einem großen Bild, das die Tafel füllt. Lieber 3 Tafeln nacheinander (wie Schritte) als eine volle.\n- Schrift: font-size 34 bis 46. Nichts darf über den Rand (x 30 bis 970, y 30 bis 570) hinausragen oder sich überlappen.\n- Wechsle sprachlich klar zwischen Bildschirm und Tafel (\"Schau hier in der App …\" / \"An der Tafel siehst du …\") und setze in genau diesem Satz einen [[teil|…]] auf etwas, das dort wirklich zu sehen ist – so springt die Ansicht mit.\n- Zeige in fast jedem Satz mit [[teil|…]] auf das Bild, über das du gerade sprichst – so entsteht die Erklärung Schritt für Schritt vor den Augen.\n19. <welle art='longitudinal' wellenlaengen='2' x='60' y='110' breite='880' hoehe='440'/> Longitudinal- oder Transversalwelle (art='transversal'), exakt berechnet: Ruhelage, ausgelenkte Teilchen, Verdichtung/Verdünnung bzw. Wellenberg/Wellental, Amplitude, Wellenlänge λ, Ausbreitungsrichtung, Schwingungsrichtung. Zeigst du im Text auf [[ausbreitung|…]] oder [[schwingung|…]], bewegen sich die Teilchen wirklich. Für ALLE Fragen zu Wellen (Schall, Licht, Seilwelle) diesen Baustein benutzen, nie selbst zeichnen. Braucht die ganze Tafel (mit <titel>).\n   Teile: ruhelage, teilchen, verdichtung, verduennung, wellenberg, wellental, amplitude, wellenlaenge, ausbreitung, schwingung\n18. <teilchen liste='Ca:2+; Cl:−; Cl:−' namen='Calcium; Chlorid; Chlorid' uebergang='1>2; 1>3' x='40' y='110' breite='920' hoehe='400'/> Atome und Ionen als farbige Kugeln (Metalle orange). uebergang='1>2' (oder '1>2:2' für zwei Elektronen): gelbe Elektronen fliegen sichtbar von Teilchen 1 zu Teilchen 2, sobald du im Text auf [[uebergang|…]] zeigst. teilen='1-2': die Kugeln überlappen, dazwischen das gemeinsame Elektronenpaar (für Atombindung, z. B. liste='Cl; Cl' teilen='1-2'). Ladungen nach dem Doppelpunkt.\n   Teile: teilchen-1 …, ca, cl-1, cl-2 …, uebergang, uebergang-1 …, elektron, paar, elektronenpaar, ladung\n   Ideal für Bindungsarten, Ionenbildung, Redox. Für Moleküle mit Struktur nimmst du <molekuel> (Wasser smiles='[H]O[H]', Ethanol 'CCO').`;
  return `${LB_ROLE}${EXTRAS}${board}${draw}${wrong}\n\nSPRACHE: Antworte immer auf ${L.name}, auch Beschriftungen in Zeichnungen. Die Schlüsselwörter ZEICHNUNG, BILDZEICHNUNG und ESELSBRUECKE bleiben unverändert.\n\n${LB_STYLES[lb.style]}\n${voice}`;
}

// ---------- Panel aufbauen ----------
function buildUI() {
  const root = document.createElement("div");
  root.id = "lernblick-root";
  root.innerHTML = `
  <button id="lb-fab" type="button" aria-label="Mit dem Lerntutor lernen"><span class="lb-fab-dot"></span><span>Mit dem Lerntutor lernen</span></button>
  <svg id="lb-imgdraw" class="lb-imgdraw" preserveAspectRatio="none" aria-hidden="true"></svg>
  <aside id="lb-panel" class="lb-panel" hidden aria-label="LernBlick Lerntutor">
    <header class="lb-head">
      <div class="lb-brand">Lern<span>Blick</span></div>
      <div class="lb-head-actions">
        <select id="lb-lang" aria-label="Sprache"></select>
        <button class="lb-icon" id="lb-close" type="button" aria-label="Schließen">✕</button>
      </div>
    </header>
    <div class="lb-scroll">
      <div class="lb-seen" id="lb-seen">
        <img id="lb-shot" alt="Aufnahme deines Bildschirms">
        <div class="lb-seen-text"><div class="lb-label">Ich sehe gerade</div><div id="lb-seen-title"></div>
          <div class="lb-row"><button class="lb-ghost" id="lb-reshot" type="button">Neu aufnehmen</button><button class="lb-ghost" id="lb-toggle-draw" type="button" hidden>Zeichnung ausblenden</button></div></div>
      </div>
      <div class="lb-boardwrap" id="lb-boardwrap" hidden>
        <div class="lb-boardhead"><div class="lb-label">Tafel</div>
          <div class="lb-row"><select id="lb-boardStyle" aria-label="Tafel-Stil"><option value="white">Whiteboard</option><option value="chalk">Kreidetafel</option></select>
          <button class="lb-ghost" id="lb-newBoard" type="button">Neue Tafel</button></div></div>
        <div id="lb-mols" class="lb-mols"></div>
        <div id="lb-board" class="board"></div>
        <div id="lb-stripWrap" hidden><div id="lb-strip" class="lb-strip"></div></div>
      </div>
      <div id="lb-chat" class="lb-chat" aria-live="polite"></div>
      <div id="lb-tips" class="lb-tips"></div>
    </div>
    <footer class="lb-foot">
      <div id="lb-status" class="lb-status"></div>
      <div class="lb-compose">
        <button class="lb-icon lb-mic" id="lb-mic" type="button" aria-label="Sprechen" hidden>🎤</button>
        <textarea id="lb-q" rows="2" placeholder="Was verstehst du hier nicht?" dir="auto"></textarea>
        <button class="lb-send" id="lb-send" type="button">Fragen</button>
      </div>
      <div class="lb-row lb-small">
        <button class="lb-ghost" id="lb-explain" type="button">▶ Nochmal zeigen</button>
        <button class="lb-ghost" id="lb-stop" type="button">Stopp</button>
        <label class="lb-check"><input type="checkbox" id="lb-speak" checked> Vorlesen</label>
        <label class="lb-check"><input type="checkbox" id="lb-natural" checked> Natürliche Stimme</label>
        <span class="lb-seg"><button type="button" id="lb-styleErk" aria-pressed="true">Erklären</button><button type="button" id="lb-styleSok" aria-pressed="false">Selbst denken</button></span>
      </div>
    </footer>
  </aside>
  <div id="lb-pop" class="lb-pop" hidden role="dialog" aria-label="Frage zu diesem Teil">
    <div class="lb-pop-head"><span id="lb-pop-title"></span><button type="button" class="lb-pop-x" id="lb-pop-x" aria-label="Schließen">✕</button></div>
    <div class="lb-pop-btns" id="lb-pop-btns"></div>
    <div class="lb-pop-own"><input id="lb-pop-q" type="text" placeholder="Eigene Frage dazu …" dir="auto"><button type="button" class="lb-send" id="lb-pop-send">Fragen</button></div>
  </div>
  <section id="lb-stage" class="lb-stage" hidden aria-label="LernBlick Tafel">
    <div class="lb-stage-top">
      <div class="lb-brand">Lern<span>Blick</span></div>
      <div id="lb-stage-title" class="lb-stage-title"></div>
      <div class="lb-row lb-stage-tools">
        <button class="lb-ghost" id="lb-stage-mode" type="button">Bildschirm ansehen</button>
        <button class="lb-icon" id="lb-stage-close" type="button" aria-label="Tafel schließen">✕</button>
      </div>
    </div>
    <div id="lb-stage-main" class="lb-stage-main"><div class="lb-turn">Tipp: Handy quer halten – dann wird die Tafel groß.</div><div class="lb-taphint">Tipp auf etwas an der Tafel, um genau dazu zu fragen.</div></div>
    <div class="lb-stage-bottom">
      <div class="lb-stage-nav">
        <button class="lb-navbtn" id="lb-prev" type="button" aria-label="Vorherige Tafel">‹</button>
        <span id="lb-count" class="lb-count"></span>
        <button class="lb-navbtn" id="lb-next" type="button" aria-label="Nächste Tafel">›</button>
        <button class="lb-ghost lb-peekback" id="lb-peekback" type="button">Zur Tafel</button>
      </div>
      <div id="lb-sub" class="lb-sub" dir="auto" aria-live="polite"></div>
      <div id="lb-stage-status" class="lb-status"></div>
      <div class="lb-stage-actions">
        <button class="lb-ghost" id="lb-sreplay" type="button">▶ Nochmal</button>
        <button class="lb-ghost" id="lb-sstop" type="button">Stopp</button>
        <input id="lb-sq" type="text" placeholder="Nachfragen …" dir="auto" aria-label="Nachfragen">
        <button class="lb-send" id="lb-ssend" type="button">Fragen</button>
        <button class="lb-ghost lb-done" id="lb-sdone" type="button">Fertig</button>
      </div>
    </div>
  </section>`;
  document.body.appendChild(root);
  for (const [k, l] of Object.entries(LB_LANGS)) $("lang").add(new Option(l.label, k));
  $("fab").onclick = () => openPanel();
  $("close").onclick = closePanel;
  $("reshot").onclick = async () => { await takeShot(true); };
  $("toggle-draw").onclick = () => { drawHidden = !drawHidden; $("imgdraw").style.visibility = drawHidden ? "hidden" : "visible"; $("toggle-draw").textContent = drawHidden ? "Zeichnung einblenden" : "Zeichnung ausblenden"; };
  $("send").onclick = () => ask();
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } });
  $("stop").onclick = stopWalk;
  $("explain").onclick = replayExplain;
  $("speak").onchange = () => { lb.speak = $("speak").checked; };
  $("natural").onchange = () => { lb.natural = $("natural").checked; };
  $("styleErk").onclick = () => setStyle("erklaeren");
  $("styleSok").onclick = () => setStyle("sokratisch");
  $("newBoard").onclick = () => { clearBoard(); clearImgDraw(); };
  $("boardStyle").onchange = () => { if (curBoard >= 0) showBoard(curBoard); };
  let raf = 0;
  const follow = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (lastImg) renderImgDraw(lastImg, false); }); };
  window.addEventListener("scroll", follow, { passive: true });
  window.addEventListener("resize", follow);
  if (window.ResizeObserver) new ResizeObserver(follow).observe(document.body);
  $("stage-close").onclick = closeStage;
  $("sdone").onclick = closeStage;
  setupBoardQuestions();
  $("stage-mode").onclick = () => setStageMode(stageMode === "tafel" ? "peek" : "tafel");
  $("peekback").onclick = () => setStageMode("tafel");
  $("prev").onclick = () => { if (curBoard > 0) { stopWalk(); showBoard(curBoard - 1, true, 3000); } };
  $("next").onclick = () => { if (curBoard < cur.boards.length - 1) { stopWalk(); showBoard(curBoard + 1, true, 3000); } };
  $("sreplay").onclick = replayExplain;
  $("sstop").onclick = stopWalk;
  const stageAsk = () => { const v = $("sq").value.trim(); if (v) { $("sq").value = ""; ask(v); } };
  $("ssend").onclick = stageAsk;
  $("sq").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); stageAsk(); } });
  document.addEventListener("keydown", (e) => {
    if ($("stage").hidden || e.target.closest?.("input, textarea, select")) return;
    if (e.key === "Escape") { if (!$("pop").hidden) closePop(); else closeStage(); }
    if (e.key === "ArrowRight") $("next").click();
    if (e.key === "ArrowLeft") $("prev").click();
  });
  setupMic();
  for (const [label, question] of [
    ["Was sehe ich hier?", "Erklär mir einfach und anschaulich, was auf diesem Bildschirm gezeigt wird und worauf es ankommt."],
    ["Zeig's mir an der Tafel", "Ich verstehe das hier nicht. Erklär es mir Schritt für Schritt mit einer Zeichnung an der Tafel."],
    ["Eselsbrücke bitte", "Gib mir eine gute Eselsbrücke, damit ich mir das hier merke."],
    ["Prüf mich ab", "Stell mir eine kurze Kontrollfrage zu dem, was hier zu sehen ist."]
  ]) { const b = el("button", "lb-tip", label); b.type = "button"; b.onclick = () => ask(question); $("tips").appendChild(b); }
}
function setStyle(s) { lb.style = s; $("styleErk").setAttribute("aria-pressed", s === "erklaeren"); $("styleSok").setAttribute("aria-pressed", s === "sokratisch"); }
function setupMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  $("mic").hidden = false;
  let rec = null;
  $("mic").onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = { de: "de-AT", en: "en-GB", ro: "ro-RO", tr: "tr-TR", bks: "hr-HR", uk: "uk-UA", ar: "ar-SA" }[$("lang").value] || "de-AT"; rec.interimResults = true;
    let fin = "";
    rec.onresult = (e) => { let t = ""; for (const r of e.results) r.isFinal ? (fin = r[0].transcript) : (t += r[0].transcript); $("q").value = fin || t; };
    rec.onend = () => { $("mic").classList.remove("on"); rec = null; if (fin.trim()) ask(fin); };
    rec.onerror = () => setStatus("Das Mikrofon ist nicht freigegeben – tipp deine Frage einfach ein.");
    $("mic").classList.add("on"); rec.start();
  };
}

// ---------- Öffnen / Schließen ----------
async function takeShot(announce) {
  try {
    const s = await captureScreen();
    lb.shot = s.dataUrl; lb.shotW = s.w; lb.shotH = s.h; lb.shotScroll = [window.scrollX, window.scrollY];
    try { lb.anchorText = collectAnchors(); } catch (e) { lb.anchorText = ""; }
    shotBlob = true; shotW = s.w; shotH = s.h;
    $("shot").src = s.dataUrl;
    clearImgDraw();
    if (announce) setStatus("Neue Aufnahme ist drin.");
  } catch (e) {
    lb.shot = null; shotBlob = null;
    setStatus("Die Bildschirmaufnahme hat nicht geklappt – du kannst trotzdem fragen.");
  }
}
async function openPanel(opts = {}) {
  if (lb.open) { if (opts.ask) ask(opts.ask); return; }
  $("fab").hidden = true;
  lb.ctx = readContext();
  await takeShot(false);
  lb.open = true; lb.usedSession = false;
  cur = { boards: [], turns: [] }; curBoard = -1; answerBoards = null; lastBody = "";
  $("panel").hidden = false;
  document.documentElement.classList.add("lb-open");
  $("seen-title").textContent = lb.ctx.frage ? `Eine ${lb.ctx.frage.bereich.split(" /")[0]}-Aufgabe${lb.ctx.frage.gewaehlt ? " – deine Antwort war leider falsch" : ""}` : (lb.ctx.ueberschrift || lb.ctx.seite);
  $("chat").replaceChildren(el("p", "lb-empty", lb.ctx.frage && lb.ctx.frage.gewaehlt ? "Ich sehe deine Aufgabe. Soll ich dir zeigen, wo der Denkfehler lag?" : "Ich sehe, woran du gerade arbeitest. Frag mich einfach – oder tipp auf einen Vorschlag."));
  $("tips").hidden = false;
  clearBoard(); $("boardwrap").hidden = true;
  ensureLibs().catch(() => setStatus("Zeichen-Bibliotheken konnten nicht geladen werden."));
  if (opts.ask) ask(opts.ask);
  else setTimeout(() => $("q").focus(), 50);
}
function closePanel() {
  closeStage();
  stopWalk();
  lb.open = false;
  $("panel").hidden = true;
  $("fab").hidden = false;
  clearImgDraw();
  document.documentElement.classList.remove("lb-open");
}

// ---------- Fragen ----------
async function ask(preset) {
  const q = (typeof preset === "string" ? preset : $("q").value).trim();
  if (!q || lb.busy) return;
  if (typeof Credits !== "undefined" && !lb.usedSession) {
    if (Credits.hasAiSession && !Credits.hasAiSession()) { Credits.showAiPaywall && Credits.showAiPaywall("session"); return; }
    if (Credits.useAiSession) Credits.useAiSession().catch(() => {});
    lb.usedSession = true;
  }
  lb.busy = true; $("send").disabled = true; $("q").value = ""; $("tips").hidden = true;
  stopWalk();
  addMsg("user", esc(q));
  if (!$("stage").hidden) setSub("Ich schaue mir das an …");
  const bubble = addMsg("ai", '<span class="lb-thinking">Ich schaue mir das an …</span>');
  setStatus("");
  const history = cur.turns.slice(-6).flatMap((t) => [{ role: "user", content: t.q }, { role: "assistant", content: t.a }]);
  const first = !cur.turns.length;
  const messages = [...history, { role: "user", content: (first ? contextText(lb.ctx) + "\n\nFRAGE: " : "") + q }];
  let boardDur = 0;
  try {
    await ensureLibs();
    const data = await callFn("lernblick-chat", { system_prompt: rules(), messages, image: lb.shot ? lb.shot.split(",")[1] : null });
    const text = data.response || "";
    const { body, svgs, imgSvg, mols, tricks } = splitAnswer(text);
    bubble.innerHTML = md(body);
    openStage(svgs.length || mols.length ? "tafel" : "peek");
    const hasImg = imgSvg ? renderImgDraw(imgSvg) : false;
    if (imgSvg && !hasImg) setStatus("Die Zeichnung auf dem Bildschirm war fehlerhaft.");
    cur.turns.push({ q: (first ? contextText(lb.ctx) + "\n\nFRAGE: " : "") + q, a: body });
    const okSvgs = svgs.filter((x) => sanitizeSvg(x, "0 0 1000 600"));
    if (okSvgs.length || mols.length) {
      const firstIdx = cur.boards.length;
      if (!okSvgs.length) cur.boards.push({ svg: null, mols, q, teile: mols.map((m) => slug(m.name)) });
      okSvgs.forEach((sv, k) => cur.boards.push({ svg: sv, mols: k === 0 ? mols : [], q, titel: titleOf(sv), teile: teileOf(sv) }));
      answerBoards = [firstIdx, cur.boards.length - 1];
      $("boardwrap").hidden = false;
      renderStrip();
      openStage("tafel");
      boardDur = showBoard(firstIdx) || 0;
    }
    if (!$("stage").hidden) {
      // Beginnt die Erklärung mit einer Stelle auf dem Bildschirm, zuerst den Bildschirm zeigen
      const firstRefs = sentencesOf(body).map(refsIn).find((r) => r.length) || [];
      const onScreen = firstRefs.some((n) => document.querySelector(`${SCOPE} #lb-imgdraw [data-teil~="${n}"]`));
      setStageMode(!cur.boards.length || onScreen ? "peek" : "tafel");
      setSub("");
    }
    if (tricks.length) addMsg("trick", tricks.map((t) => `<b>Eselsbrücke:</b> ${esc(t.merksatz)}${t.wofuer ? ` <span class="lb-muted">(${esc(t.wofuer)})</span>` : ""}`).join("<br>"));
    lastBody = body;
    explain(body, boardDur);
  } catch (e) {
    bubble.remove();
    addMsg("err", esc(e.code === "login" ? e.message : "Das hat gerade nicht geklappt: " + (e.message || e)));
  } finally {
    lb.busy = false; $("send").disabled = false;
  }
}
function addMsg(cls, html) {
  $("chat").querySelector(".lb-empty")?.remove();
  const d = el("div", "lb-msg lb-" + cls);
  d.dir = "auto"; d.innerHTML = html;
  $("chat").appendChild(d);
  if (cls === "user" || $("boardwrap").hidden) d.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return d;
}

// ---------- Tafel ----------
function clearBoard() {
  $("mols").replaceChildren();
  $("board").className = "board" + ($("boardStyle").value === "chalk" ? " chalk" : "");
  $("board").replaceChildren(el("div", "lb-board-empty", "Hier zeichne ich, wenn ein Bild beim Verstehen hilft."));
  curBoard = -1; markStrip();
}
function showBoard(i, animate = true, cap = 9000) {
  const b = cur.boards[i];
  if (!b) return 0;
  curBoard = i;
  const theme = $("boardStyle").value;
  renderMolecules(b.mols, $("mols"), animate);
  $("board").className = "board" + (theme === "chalk" ? " chalk" : "");
  const out = b.svg ? buildBoardSvg(b.svg, theme) : null;
  let dur = 0;
  if (out) { $("board").replaceChildren(out); fitTexts(out); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitTexts(out)); if (animate) dur = animateSvg(out, cap); }
  else $("board").replaceChildren(el("div", "lb-board-empty", b.mols && b.mols.length ? "Strukturformel siehe oben." : "Diese Zeichnung konnte nicht angezeigt werden."));
  markStrip();
  updateStageNav();
  return dur;
}
function renderStrip() {
  const strip = $("strip");
  strip.replaceChildren();
  $("stripWrap").hidden = cur.boards.length < 2;
  cur.boards.forEach((b, i) => {
    const btn = el("button", "lb-mini"); btn.type = "button";
    const s = b.svg ? buildBoardSvg(b.svg, "white") : null;
    if (s) btn.appendChild(s); else btn.appendChild(el("div", "lb-molcap", (b.mols || []).map((m) => m.name).join(", ") || "Tafel"));
    btn.appendChild(el("div", "lb-cap", b.titel || b.q || ""));
    btn.onclick = () => showBoard(i);
    strip.appendChild(btn);
  });
  markStrip();
}
function markStrip() { [...$("strip").children].forEach((c, i) => c.setAttribute("aria-current", i === curBoard ? "true" : "false")); }

// ---------- Auf den Bildschirm zeichnen ----------
// Markierungen sitzen auf echten Elementen der Seite (Anker) und wandern beim Scrollen mit.
let lastImg = null, drawHidden = false, curHL = [];
const MARK_COLORS = { rot: "#d62828", gruen: "#2a9d4b", "grün": "#2a9d4b", blau: "#1f6fd1", orange: "#f07c1a", lila: "#7b3fc4", gelb: "#f2b705", schwarz: "#1A1A1A" };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function clearImgDraw() { $("imgdraw").replaceChildren(); $("toggle-draw").hidden = true; lastImg = null; }
function drawMark(dst, m, vw, vh) {
  const target = anchors[(m.getAttribute("ziel") || "").trim().toLowerCase()];
  if (!target || !target.isConnected) return;
  let r = target.getBoundingClientRect();
  if (!r.width || r.bottom < 0 || r.top > vh) return;
  const art = (m.getAttribute("art") || "kreis").trim().toLowerCase();
  const fc = (m.getAttribute("farbe") || "rot").trim();
  const c = MARK_COLORS[fc.toLowerCase()] || (/^#[0-9a-f]{6}$/i.test(fc) ? fc : "#d62828");
  const teil = (m.getAttribute("teil") || "").trim().toLowerCase();
  const T = TEIL_OK.test(teil) ? teil : "";
  const text = clean(m.getAttribute("text") || "", 40);
  const mk = (tag, attrs, txt) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (T) e.setAttribute("teil", T); if (txt != null) e.textContent = txt; dst.appendChild(e); return e; };
  const st = (m.getAttribute("stelle") || "").split(/[\s,;]+/).map(Number);
  const pt = st.length === 2 && st.every(isFinite) ? [r.left + clamp01(st[0]) * r.width, r.top + clamp01(st[1]) * r.height] : null;
  const pad = 6;
  let x = r.left - pad, y = r.top - pad, w = r.width + 2 * pad, h = r.height + 2 * pad;
  const wide = w > 3.2 * h && w > 260;
  if (pt && art !== "pfeil") { x = pt[0] - 38; y = pt[1] - 30; w = 76; h = 60; }
  let right = x + w;
  switch (art) {
    case "rahmen": mk("rect", { x, y, width: w, height: h, stroke: c, "stroke-width": 5, fill: "none" }); break;
    case "unterstreichen": mk("line", { x1: x + 6, y1: y + h - 2, x2: x + w - 6, y2: y + h - 2, stroke: c, "stroke-width": 6 }); break;
    case "leuchtstift": mk("rect", { x, y, width: w, height: h, stroke: "none", fill: "#f2b705" }); break;
    case "haken": { const cx = x + w - 36, cy = y + h / 2; mk("path", { d: `M${cx - 18} ${cy} L${cx - 5} ${cy + 15} L${cx + 22} ${cy - 20}`, stroke: c, "stroke-width": 7 }); break; }
    case "kreuz": { const cx = x + w - 36, cy = y + h / 2; mk("path", { d: `M${cx - 16} ${cy - 16} L${cx + 16} ${cy + 16} M${cx + 16} ${cy - 16} L${cx - 16} ${cy + 16}`, stroke: c, "stroke-width": 7 }); break; }
    case "pfeil": {
      const tx = pt ? pt[0] : x - 2, ty = pt ? pt[1] : y + h / 2;
      const fromLeft = tx > 170, sx = fromLeft ? tx - 130 : tx + 130, sy = ty - 70;
      const ang = Math.atan2(ty - sy, tx - sx), hl = 20;
      mk("path", { d: `M${sx} ${sy} Q${(sx + tx) / 2} ${sy - 10} ${tx} ${ty}`, stroke: c, "stroke-width": 6 });
      mk("path", { d: `M${tx - hl * Math.cos(ang - 0.45)} ${ty - hl * Math.sin(ang - 0.45)} L${tx} ${ty} L${tx - hl * Math.cos(ang + 0.45)} ${ty - hl * Math.sin(ang + 0.45)}`, stroke: c, "stroke-width": 6 });
      if (text) { const fs = 30, tw = text.length * fs * 0.48; mk("text", { x: Math.max(8, Math.min(vw - tw - 8, sx - tw / 2)), y: Math.max(32, sy - 12), fill: c, "font-size": fs }, text); }
      return;
    }
    default: {
      // Einkreisen: bei breiten Antwortknöpfen den Buchstaben einkreisen, sonst das Ganze
      const badge = wide && target.querySelector(".answer-label, .option-label, .letter");
      if (badge && !pt) { const b = badge.getBoundingClientRect(); mk("ellipse", { cx: b.left + b.width / 2, cy: b.top + b.height / 2, rx: b.width / 2 + 14, ry: b.height / 2 + 12, stroke: c, "stroke-width": 6, fill: "none" }); mk("rect", { x, y, width: w, height: h, stroke: c, "stroke-width": 3, fill: "none", opacity: 0.6 }); }
      else { mk("ellipse", { cx: x + w / 2, cy: y + h / 2, rx: w / 2 + 12, ry: h / 2 + 12, stroke: c, "stroke-width": 6, fill: "none" }); right = x + w + 12; }
    }
  }
  if (!text) return;
  const fs = 32, tw = text.length * fs * 0.48;
  let lx, ly;
  if (wide && !pt) {                                                          // rechts im Knopf, sonst darüber
    lx = x + w - tw - 24; ly = y + h / 2 + 11;
    let textRight = 0;
    try { const rg = document.createRange(); rg.selectNodeContents(target.querySelector(".answer-text") || target); for (const q of rg.getClientRects()) textRight = Math.max(textRight, q.right); } catch (e) {}
    if (lx < textRight + 8) ly = y + 4;
  }
  else if (right + 14 + tw < vw - 8) { lx = right + 14; ly = y + h / 2 + 11; } // daneben
  else { lx = Math.max(8, Math.min(x + w - tw, vw - tw - 8)); ly = y > 50 ? y - 12 : y + h + 36; } // darüber/darunter
  mk("text", { x: lx, y: ly, fill: c, "font-size": fs }, text);
}
function renderImgDraw(svgText, animate = true) {
  const box = $("imgdraw");
  box.replaceChildren();
  lastImg = svgText || null;
  if (!svgText) return false;
  const vw = window.innerWidth, vh = window.innerHeight;
  box.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length || !doc.documentElement) return false;
  const marks = [...doc.documentElement.getElementsByTagName("markiere")];
  marks.forEach((m) => m.parentNode.removeChild(m));
  const tmp = document.createElementNS(SVGNS, "svg");
  for (const m of marks.slice(0, 8)) { try { drawMark(tmp, m, vw, vh); } catch (e) {} }
  roughify(tmp, "white", 1);
  // freie Zeichnung in Screenshot-Koordinaten: nur solange die Ansicht gleich ist
  const sameView = Math.abs(window.scrollY - lb.shotScroll[1]) < 30 && Math.abs(vw - lb.shotW) < 4;
  if (sameView && lb.shot) {
    const H = Math.round(1000 * lb.shotH / lb.shotW);
    const free = sanitizeSvg(new XMLSerializer().serializeToString(doc.documentElement), `0 0 1000 ${H}`);
    if (free) {
      roughify(free, "white", 1.2);
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("transform", `scale(${vw / 1000})`);
      [...free.childNodes].forEach((n) => g.appendChild(n));
      box.appendChild(g);
    }
  }
  [...tmp.childNodes].forEach((n) => box.appendChild(n));
  if (!box.childNodes.length) return !!marks.length;
  box.style.visibility = drawHidden ? "hidden" : "visible";
  $("toggle-draw").hidden = false;
  if (animate) animateSvg(box);
  else if (curHL.length) highlight(curHL);
  return true;
}

// ---------- In die Zeichnung tippen und dazu fragen ----------
const NICE = (n) => n.replace(/-(\d+)$/, " $1").replace(/-/g, " ").replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü");
function describeHit(el) {
  const teile = (el.getAttribute("data-teil") || "").split(/\s+/).filter((t) => t && !/^(molekuel|welle|teilchen-\d+|atom-\d+)$/.test(t));
  const svg = el.closest("svg");
  const sameTexts = teile.length && svg ? [...svg.querySelectorAll("text")].filter((t) => (t.getAttribute("data-teil") || "").split(/\s+/).some((x) => teile.includes(x))).map((t) => t.textContent.trim()).filter(Boolean) : [];
  const own = el.localName === "text" ? el.textContent.trim() : "";
  const label = clean(own || sameTexts[0] || (teile[0] ? NICE(teile[0]) : "diese Stelle"), 50);
  const isFormula = /=|²|√|·|\/|\^/.test(own + " " + sameTexts.join(" ")) || teile.some((t) => /^(zeile|ergebnis|gleichung)/.test(t));
  return { teile, label, texts: [...new Set([own, ...sameTexts].filter(Boolean))].slice(0, 4), isFormula };
}
let popHit = null;
function openPop(hit, x, y) {
  popHit = hit;
  $("pop-title").textContent = `„${hit.label}“`;
  const qs = [["Was ist das?", "Was ist das genau, und wozu brauche ich es?"], ["Warum so gezeichnet?", "Warum hast du das so gezeichnet? Was soll mir das zeigen?"]];
  if (hit.isFormula) qs.push(["Erklär die Formel", "Warum ist die Formel so geschrieben? Erklär mir jeden Teil und jeden Rechenschritt."]);
  qs.push(["Noch einfacher", "Erklär mir genau diesen Teil noch einfacher, mit einem Vergleich aus dem Alltag."]);
  $("pop-btns").replaceChildren(...qs.map(([l, q]) => { const b = el("button", "lb-tip", l); b.type = "button"; b.onclick = () => askAbout(q); return b; }));
  const pop = $("pop"); pop.hidden = false;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + "px";
  pop.style.top = (y + 18 + h < window.innerHeight - 8 ? y + 18 : Math.max(8, y - h - 18)) + "px";
  $("pop-q").value = "";
}
function closePop() { $("pop").hidden = true; popHit = null; }
function askAbout(q) {
  const hit = popHit;
  if (!hit) return;
  const b = cur.boards[curBoard] || {};
  const where = b.titel ? ` an der Tafel „${b.titel}“` : " an der Tafel";
  const what = hit.texts.length ? ` (dort steht: ${hit.texts.map((t) => "„" + t + "“").join(", ")})` : "";
  const teil = hit.teile.length ? ` [Teil: ${hit.teile.join(", ")}]` : "";
  closePop();
  ask(`Ich tippe${where} auf ${hit.label}${what}${teil}. ${q} Zeig beim Erklären mit [[…]] genau auf diesen Teil.`);
}
function setupBoardQuestions() {
  const onTap = (e) => {
    const hitEl = e.target.closest && e.target.closest("#lb-board [data-teil], #lb-mols [data-teil]");
    if (!hitEl || e.target.closest(".ref")) return;
    e.stopPropagation();
    const hit = describeHit(hitEl);
    stopWalk(); highlight(hit.teile.slice(0, 2));
    openPop(hit, e.clientX, e.clientY);
  };
  $("board").addEventListener("click", onTap);
  $("mols").addEventListener("click", onTap);
  $("pop-x").onclick = closePop;
  $("pop-send").onclick = () => { const v = $("pop-q").value.trim(); if (v) askAbout(v); };
  $("pop-q").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("pop-send").click(); } if (e.key === "Escape") closePop(); });
  document.addEventListener("pointerdown", (e) => { if (!$("pop").hidden && !e.target.closest("#lb-pop") && !e.target.closest("#lb-board, #lb-mols")) closePop(); });
}

// ---------- Vollbild-Tafel ----------
let stageMode = "tafel";
function openStage(mode) {
  const st = $("stage");
  if (st.hidden) {
    $("stage-main").append($("mols"), $("board"));
    st.hidden = false;
    document.documentElement.classList.add("lb-staged");
  }
  setStageMode(mode || (cur.boards.length ? "tafel" : "peek"));
  updateStageNav();
}
function closeStage() {
  const st = $("stage");
  if (st.hidden) return;
  stopWalk();
  $("boardwrap").insertBefore($("mols"), $("stripWrap"));
  $("boardwrap").insertBefore($("board"), $("stripWrap"));
  st.hidden = true; st.classList.remove("peek");
  document.documentElement.classList.remove("lb-staged");
  if (curBoard >= 0) showBoard(curBoard, false);
}
function setStageMode(m) {
  if (m === "tafel" && !cur.boards.length) m = "peek";
  stageMode = m;
  $("stage").classList.toggle("peek", m === "peek");
  $("stage").classList.toggle("has-boards", cur.boards.length > 0);
  if (m === "peek" && drawHidden) { drawHidden = false; $("imgdraw").style.visibility = "visible"; }
  if (m === "tafel" && curBoard >= 0) requestAnimationFrame(() => { const s = $("board").querySelector("svg"); if (s) fitTexts(s); });
}
function updateStageNav() {
  const n = cur.boards.length;
  $("count").textContent = n ? `Tafel ${curBoard + 1} von ${n}` : "";
  $("prev").disabled = curBoard <= 0; $("next").disabled = curBoard >= n - 1;
  $("prev").hidden = $("next").hidden = n < 2;
  const b = cur.boards[curBoard];
  $("stage-title").textContent = b ? (b.titel || "") : "";
}
function setSub(s) {
  const e = $("sub"); if (e) e.innerHTML = s ? md(s) : "";
  // Spricht die Erklärung von der Tafel bzw. vom Bildschirm, dorthin wechseln (Verweise mit [[…]] entscheiden danach genauer)
  if (!s || $("stage").hidden) return;
  const t = plain(s).toLowerCase();
  if (cur.boards.length && /tafel|skizze|zeichnung|hier siehst du|schau dir (das|die|den) (bild|modell)/.test(t)) setStageMode("tafel");
  else if (lastImg && /bildschirm|in der app|oben auf|auf der seite|in der animation|markiert|eingekreist/.test(t)) setStageMode("peek");
}
// Text an der Tafel, der über den Rand ragt, verkleinern bzw. hereinschieben
function fitTexts(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (!vb || !vb.width || !svg.isConnected) return;
  svg.querySelectorAll("text").forEach((t) => {
    if (t.getAttribute("transform") || t.closest("[transform]")) return;
    let b; try { b = t.getBBox(); } catch (e) { return; }
    if (!b || !b.width) return;
    const maxW = vb.width - 40;
    if (b.width > maxW) { const fs = parseFloat(t.getAttribute("font-size")) || 30; t.setAttribute("font-size", Math.max(16, fs * maxW / b.width).toFixed(1)); b = t.getBBox(); }
    let dx = 0;
    if (b.x < vb.x + 15) dx = vb.x + 15 - b.x; else if (b.x + b.width > vb.x + vb.width - 15) dx = vb.x + vb.width - 15 - (b.x + b.width);
    if (dx && t.hasAttribute("x") && !/[\s,]/.test(t.getAttribute("x").trim())) t.setAttribute("x", (parseFloat(t.getAttribute("x")) || 0) + dx);
  });
  // Beschriftungen, die sich überlappen, auseinanderschieben
  const placed = [];
  svg.querySelectorAll("text").forEach((t) => {
    if (t.getAttribute("transform") || t.closest("[transform]") || !t.hasAttribute("y")) return;
    let b; try { b = t.getBBox(); } catch (e) { return; }
    if (!b || !b.width) return;
    for (let tries = 0; tries < 4; tries++) {
      const hit = placed.find((p) => b.x < p.x + p.width - 4 && p.x < b.x + b.width - 4 && b.y < p.y + p.height - 4 && p.y < b.y + b.height - 4);
      if (!hit) break;
      const down = hit.y + hit.height + 4 - b.y, up = hit.y - 4 - (b.y + b.height);
      const dy = b.y + b.height + down < vb.y + vb.height - 5 ? down : up;
      t.setAttribute("y", (parseFloat(t.getAttribute("y")) || 0) + dy);
      b = t.getBBox();
    }
    placed.push(b);
  });
}

// ---------- Zeigen: Text und Tafel synchron ----------
const slug = (s) => String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function titleOf(svgText) { const m = String(svgText).match(/<titel[^>]*\btext\s*=\s*(['"])(.*?)\1/i); return m ? m[2] : ""; }
function teileOf(svgText) {
  try { const out = buildBoardSvg(svgText, "white"); return out ? [...new Set([...out.querySelectorAll("[data-teil]")].flatMap((e) => e.getAttribute("data-teil").split(/\s+/)))] : []; }
  catch (e) { return []; }
}
const refsIn = (s) => [...s.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim().toLowerCase()).filter((n) => /^[a-z0-9äöüß-]+$/i.test(n));
const plain = (s) => String(s || "").replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, "$2").replace(/\[\[[^\]]*\]\]/g, "").replace(/\*\*/g, "").replace(/^\s*[-*•]\s+/gm, "");
const sentencesOf = (body) => body.split(/(?<=[.!?:])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const SCOPE = "#lernblick-root";
function visibleHas(n) { return !!document.querySelector(`${SCOPE} #lb-board [data-teil~="${n}"], ${SCOPE} #lb-mols [data-teil~="${n}"], ${SCOPE} #lb-imgdraw [data-teil~="${n}"]`); }
function goToRefs(refs) {
  if (!refs.length || !cur.boards.length || refs.some(visibleHas)) return false;
  const [a, b] = answerBoards || [0, cur.boards.length - 1], order = [];
  for (let i = Math.max(curBoard + 1, a); i <= b; i++) order.push(i);
  for (let i = a; i <= b; i++) if (!order.includes(i)) order.push(i);
  for (let i = cur.boards.length - 1; i >= 0; i--) if (!order.includes(i)) order.push(i);
  for (const i of order) {
    const bd = cur.boards[i];
    if (!bd.teile) bd.teile = bd.svg ? teileOf(bd.svg) : [];
    if (refs.some((r) => bd.teile.includes(r) || (bd.mols || []).some((m) => slug(m.name) === r))) { showBoard(i, true, 5000); return true; }
  }
  return false;
}
function highlight(names) {
  curHL = names || [];
  if ((names || []).some((n) => n === "zusammensetzen" || n === "ziel")) assemble(true);
  document.querySelectorAll(`${SCOPE} .glow`).forEach((e) => e.classList.remove("glow"));
  document.querySelectorAll(`${SCOPE} .ref.active`).forEach((e) => e.classList.remove("active"));
  for (const n of names || []) {
    document.querySelectorAll(`${SCOPE} #lb-board [data-teil~="${n}"], ${SCOPE} #lb-imgdraw [data-teil~="${n}"], ${SCOPE} #lb-mols [data-teil~="${n}"]`).forEach((e) => {
      e.getAnimations?.({ subtree: true }).forEach((a) => { try { a.finish(); } catch (err) {} });
      e.classList.add("glow");
      if (/^uebergang/.test(n)) e.closest("svg")?.querySelectorAll("[data-after]").forEach((a) => { a.animate([{ fillOpacity: 0.12 }, { fillOpacity: 1 }], { duration: 600, delay: 1500, fill: "forwards" }); });
      if (/^(ausbreitung|welle|schwingung|teilchen|bewegung)$/.test(n)) playWave(e.closest("svg"));
      const fly = e.closest("[data-fly]");
      if (fly && !fly.dataset.flown) {
        fly.dataset.flown = "1";
        const [dx, dy] = fly.getAttribute("data-fly").split(",").map(Number);
        fly.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }], { duration: 1600, easing: "ease-in-out", fill: "forwards" });
      }
    });
    document.querySelectorAll(`${SCOPE} .ref[data-ref="${n}"]`).forEach((e) => e.classList.add("active"));
  }
}
function assemble(on) {
  document.querySelectorAll(`${SCOPE} [data-move]`).forEach((g, i) => {
    const [dx, dy, rot] = g.getAttribute("data-move").split(",").map(Number);
    const from = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, to = "translate(0px, 0px) rotate(0deg)";
    g.animate([{ transform: on ? from : to }, { transform: on ? to : from }], { duration: 1400, delay: i * 350, fill: "forwards", easing: "ease-in-out" });
  });
}
let audioQueue = [], currentAudio = null;
function stopWalk() {
  walkTimers.forEach(clearTimeout); walkTimers = [];
  try { speechSynthesis.cancel(); } catch (e) {}
  audioQueue.forEach((a) => a.abort && a.abort()); audioQueue = [];
  speakToken = null;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  highlight([]);
}
function keepBoardInView(refs) {
  for (const n of refs) {
    const e = document.querySelector(`${SCOPE} #lb-board [data-teil~="${n}"], ${SCOPE} #lb-mols [data-teil~="${n}"]`);
    if (!e) continue;
    const r = e.getBoundingClientRect(), box = document.querySelector(`${SCOPE} .lb-scroll`).getBoundingClientRect();
    if (r.top < box.top + 10 || r.bottom > box.bottom - 10) e.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
}
function showRefs(refs) {
  if (!$("stage").hidden && refs.length) {
    const onScreen = refs.some((n) => document.querySelector(`${SCOPE} #lb-imgdraw [data-teil~="${n}"]`));
    const onBoard = refs.some((n) => cur.boards.some((b) => (b.teile || []).includes(n) || (b.mols || []).some((m) => slug(m.name) === n)));
    if (onScreen && !onBoard) setStageMode("peek"); else if (onBoard || cur.boards.length) setStageMode("tafel");
  }
  const moved = goToRefs(refs);
  if (moved) walkTimers.push(setTimeout(() => { highlight(refs); keepBoardInView(refs); }, 900));
  else { highlight(refs); keepBoardInView(refs); }
}
function explain(body, delay) {
  stopWalk();
  const sents = sentencesOf(body);
  if (lb.speak && lb.natural) return speakNatural(sents);
  if (lb.speak && "speechSynthesis" in window) return speakBrowser(sents);
  let t = Math.min(delay || 0, 2500);
  for (const s of sents) {
    const refs = refsIn(s);
    walkTimers.push(setTimeout(() => { setSub(s); if (refs.length) showRefs(refs); }, t));
    t += Math.max(2200, plain(s).length * 60) + (refs.some(visibleHas) ? 0 : 1500);
  }
  walkTimers.push(setTimeout(() => highlight([]), t + 400));
}
function langVoices() {
  const codes = (LB_LANGS[$("lang").value] || LB_LANGS.de).tts;
  try { return speechSynthesis.getVoices().filter((x) => codes.some((c) => x.lang.toLowerCase().startsWith(c))).sort((a, b) => (/natural|neural|premium|enhanced|online/i.test(b.name) ? 1 : 0) - (/natural|neural|premium|enhanced|online/i.test(a.name) ? 1 : 0)); }
  catch (e) { return []; }
}
function speakBrowser(sents) {
  const v = langVoices()[0] || null;
  sents.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(plain(s));
    u.voice = v; if (v) u.lang = v.lang;
    const refs = refsIn(s);
    u.onstart = () => { setSub(s); showRefs(refs); };
    if (i === sents.length - 1) u.onend = () => walkTimers.push(setTimeout(() => highlight([]), 1500));
    speechSynthesis.speak(u);
  });
}
// Natürliche Stimme: die ganze Antwort in EINEM Stück (gleiche Stimme, keine Brüche);
// Untertitel und Zeigen laufen anteilig zur Abspielzeit mit.
function speakNatural(sents) {
  const lang = $("lang").value;
  const jobs = sents.map((s) => ({ s, refs: refsIn(s), text: plain(s).trim() })).filter((j) => j.text || j.refs.length);
  const full = jobs.map((j) => j.text).filter(Boolean).join(" ").slice(0, 3000);
  if (!full) return;
  const total = jobs.reduce((a, j) => a + Math.max(1, j.text.length), 0);
  let acc = 0; const starts = jobs.map((j) => { const st = acc / total; acc += Math.max(1, j.text.length); return st; });
  const token = {}; speakToken = token;
  setSub(jobs[0].s); showRefs(jobs[0].refs);
  setStatus("");
  if (!$("stage").hidden) $("stage-status").textContent = "Stimme wird vorbereitet …";
  callFn("lernblick-voice", { text: full, lang }, true).then((blob) => {
    if (speakToken !== token) return;
    $("stage-status").textContent = "";
    const url = URL.createObjectURL(blob);
    const a = new Audio(url); currentAudio = a;
    let shown = 0;
    a.ontimeupdate = () => {
      if (!a.duration || !isFinite(a.duration)) return;
      const f = a.currentTime / a.duration;
      let k = shown; while (k + 1 < jobs.length && f >= starts[k + 1] - 0.01) k++;
      if (k !== shown) { shown = k; setSub(jobs[k].s); showRefs(jobs[k].refs); }
    };
    a.onended = () => { URL.revokeObjectURL(url); walkTimers.push(setTimeout(() => highlight([]), 1500)); };
    a.play().catch(() => setStatus("Tippe auf ▶ Nochmal, um das Vorlesen zu starten."));
  }).catch(() => {
    if (speakToken !== token) return;
    $("stage-status").textContent = "";
    setStatus("Die natürliche Stimme ist gerade nicht erreichbar – ich lese mit der Browser-Stimme vor.");
    speakBrowser(sents);
  });
}
let speakToken = null;
function replayExplain() {
  if (!lastBody) { setStatus("Stell zuerst eine Frage."); return; }
  document.querySelectorAll(`${SCOPE} [data-flown]`).forEach((g) => { g.getAnimations().forEach((a) => a.cancel()); delete g.dataset.flown; });
  if (answerBoards && curBoard !== answerBoards[0]) showBoard(answerBoards[0], false);
  let dur = 0;
  document.querySelectorAll(`${SCOPE} #lb-mols svg, ${SCOPE} #lb-board svg`).forEach((svg) => { dur = Math.max(dur, animateSvg(svg)); });
  animateSvg($("imgdraw"));
  explain(lastBody, dur);
}
document.addEventListener("click", (e) => {
  const r = e.target.closest && e.target.closest(`${SCOPE} .ref`);
  if (!r) return;
  stopWalk(); showRefs([r.dataset.ref]);
  walkTimers.push(setTimeout(() => highlight([]), 3500));
});

// ---------- Fragen-Bildschirm: Knopf nach falscher Antwort ----------
function watchWrongAnswers() {
  const fb = document.getElementById("q-feedback");
  if (!fb) return;
  const addBtn = () => {
    const wrong = fb.classList.contains("incorrect-fb") && !fb.classList.contains("hidden");
    let b = document.getElementById("lb-wrong-btn");
    if (!wrong) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement("button");
    b.id = "lb-wrong-btn"; b.type = "button"; b.className = "lb-wrong-btn";
    b.innerHTML = '<span class="lb-fab-dot"></span> Mit LernBlick verstehen';
    b.onclick = () => openPanel({ ask: "Ich habe diese Aufgabe falsch beantwortet. Zeig mir an der Tafel Schritt für Schritt, wie man auf die richtige Antwort kommt, wo genau mein Denkfehler lag, und gib mir einen Strategie-Tipp für diesen Untertest." });
    fb.appendChild(b);
  };
  new MutationObserver(addBtn).observe(fb, { attributes: true, attributeFilter: ["class"] });
  addBtn();
}

// ---------- Start ----------
function init() {
  if (document.getElementById("lernblick-root")) return;
  buildUI();
  watchWrongAnswers();
  // Auf dem Anmelde-/Registrierungsbildschirm der App keinen Knopf zeigen
  setInterval(() => { const a = document.getElementById("screen-auth"); $("fab").style.display = a && visible(a) ? "none" : ""; }, 700);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
window.LernBlick = { open: openPanel, close: closePanel, ask: (q) => openPanel({ ask: q }) };

})();
