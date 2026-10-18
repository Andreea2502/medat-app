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

const EXTRAS = "\n\nMOLEKÜLE: Strukturformeln zeichnest du nie selbst mit Linien, sondern immer mit dem Baustein <molekuel> in der ZEICHNUNG (siehe unten). Ein Programm zeichnet daraus die exakte Strukturformel im Tafelstil.\n\nESELSBRÜCKEN: Wenn du eine Eselsbrücke oder einen Merksatz gibst, hänge NACH deinem Text zusätzlich eine Zeile an, damit sie gespeichert wird:\nESELSBRUECKE: Merksatz | wofür er gut ist\n\nTAFEL – du zeichnest wie eine Lehrkraft an der Tafel:\nTafel und Erklärung sind EINE Einheit. Alles, was du sagst (Zahlen, Kästchen, Flächen, Seiten, Formeln, Umformungen, Begriffe), steht auch an der Tafel. Nach Text und Tafel darf keine Frage offen bleiben. Wenn du von Kästchen sprichst, zeichne die Kästchen. Wenn du rechnest, schreib jeden Rechenschritt und jede Umformung als eigene Zeile an.\nZeichne, wann immer ein Bild hilft (Geometrie, Rechnen, Brüche, Zahlen, Graphen, Abläufe, Organe, Mechanismen). Format einer Tafel:\nZEICHNUNG:\n<svg viewBox='0 0 1000 600'> ... </svg>\nDer gesprochene Text zu einer Tafel steht direkt VOR ihrem ZEICHNUNG-Block. Abstand zum Rand mindestens 30.\n\nBAUKASTEN – benutze diese Bausteine, wo sie passen. Das Programm berechnet und zeichnet sie exakt, mit allen Kästchen, Zahlen und Beschriftungen:\n1. <dreieck-rw a='3' b='4' x='30' y='30' breite='550' hoehe='540'/> rechtwinkliges Dreieck: Kathete a unten (blau), Kathete b links (grün), Hypotenuse c (rot). Zeichnet automatisch die Quadrate über allen drei Seiten mit Einheitskästchen zum Abzählen und schreibt a² = 9, b² = 16, c² = 25 hinein. Optional quadrate='nein', kaestchen='nein', c-zeigen='nein' (wenn die Person c selbst finden soll).\n   Teile: kathete-a, kathete-b, hypotenuse, kurze-seite, lange-kathete, rechter-winkel, quadrat-a, quadrat-b, quadrat-c\n2. <gleichung x='620' y='90' zeilen='a² + b² = c²; 3² + 4² = c²; 9 + 16 = c²; 25 = c²; c = √25 = 5' notizen='; einsetzen; Quadrate ausrechnen; zusammenzählen; Wurzel ziehen'/> Rechenweg als Karte: Zeile für Zeile nummeriert, rechts grau was du tust, die letzte Zeile wird als Ergebnis grün hervorgehoben. Mehrere <gleichung> auf einer Tafel stapelt das Programm selbst untereinander.\n   Teile: zeile-1, zeile-2, … , ergebnis\n3. <kaestchen x='60' y='80' spalten='4' zeilen='3' gefuellt='12' farbe='#1f6fd1' zahlen='ja' beschriftung='3 · 4 = 12'/> Kästchengitter mit Seitenlängen zum Zählen, Malnehmen, Flächen.\n   Teile: gitter, gefuellt, kaestchen-1, kaestchen-2, … , breite, hoehe\n4. <bruch-kreis cx='280' cy='290' r='200' teile='4' gefuellt='1' farbe='#d62828' beschriftung='1/4'/> Kreis (Pizza) in gleiche Stücke.   Teile: ganzes, gefuellt, stueck-1, …\n5. <bruch-balken x='60' y='200' breite='500' hoehe='90' teile='5' gefuellt='2' beschriftung='2/5'/>   Teile: ganzes, gefuellt, stueck-1, …\n6. <zahlenstrahl x='60' y='300' laenge='860' von='0' bis='10' schritt='1' markiere='3; 7'/>   Teile: zahlenstrahl, punkt-3, punkt-7, zahl-5\n7. <koordinaten x='60' y='40' breite='520' hoehe='520' xmin='-5' xmax='5' ymin='-5' ymax='5' funktion='x^2; 2*x+1'/> Koordinatensystem mit exakt berechneten Graphen.   Teile: x-achse, y-achse, graph-1, graph-2\n8. <pfeil x1='600' y1='300' x2='800' y2='300' text='wird zu' teil='umwandlung'/>\n9. <molekuel id='m1' smiles='CNC[C@H](O)C1=CC=C([OH:1])C([OH:2])=C1' name='Adrenalin' x='20' y='70' breite='420' hoehe='450' teile='1=phenol-oh-1; 2=phenol-oh-2'/> exakte Strukturformel. Gültige SMILES verwenden. Ringe IMMER in Kekulé-Schreibweise mit Großbuchstaben und = (z. B. Benzol C1=CC=CC=C1, nicht c1ccccc1), damit die Doppelbindungen wie an der Tafel sichtbar sind. Ladungen mit eckigen Klammern ([O-], [NH2+], [Cu+2], [Fe+3]). Atome, über die du sprichst, bekommen im SMILES eine Nummer ([OH:1], [O-:2], [NH:3], [C:4](=O), [N+:5]) und in teile='1=name; 2=name' einen Namen. Auf das ganze Molekül zeigst du mit seiner id oder seinem Namen in Kleinbuchstaben ohne Umlaute (z. B. [[m1|Adrenalin]]).\n   Teile: m1 (ganzes Molekül), die Namen aus teile=, außerdem m1-1, m1-2 … für die nummerierten Atome\n10. <bogenpfeil von='m1:1' nach='m1:3' text='e⁻' teil='elektronenpaar-1'/> gebogener Pfeil von Atom zu Atom (Elektronen, Angriff, Ringschluss). Für abgehende Teilchen ohne Ziel: <bogenpfeil von='m1:1' richtung='oben-rechts' laenge='90' text='H⁺' teil='proton-1-geht'/> (Richtungen: oben, unten, links, rechts, oben-links, oben-rechts, unten-links, unten-rechts).\n11. <titel text='Schritt 1: Oxidation der Hydroxygruppen'/> Überschrift oben links an der Tafel.\n12. <zahlenfolge zahlen='2; 5; 4; 7; 6; 9; ?; ?' boegen='+3; −1; +3; −1; +3; −1; +3' x='40' y='300' breite='920'/> Zahlenfolge in Kästchen, oben jeder Rechenschritt als Bogen, Lücken als ?. Für zwei verschränkte Folgen zusätzlich boegen2='…' (Schritt von jeder Zahl zur übernächsten, unten).\n   Teile: zahl-1 …, bogen-1 …, bogen2-1 …, luecke, muster, muster-2\n13. <venn a='Chirurgen' b='Ärzte' c='Läufer' cx='300' cy='330' r='150' leer='a; ac' kreuz='bc|abc'/> Mengenkreise für Implikationen (c weglassen bei zwei Mengen). Bereiche heißen nach den Mengen, in denen sie GENAU liegen: a, b, c, ab, ac, bc, abc. leer = laut Prämissen leere Bereiche, sie werden schraffiert: 'Alle A sind B' → leer='a; ac'. 'Kein A ist B' → leer='ab; abc'. 'Einige A sind B' → kreuz='ab', oder auf die Grenze 'ab|abc', wenn offen ist, ob es auch in C liegt. Rechts daneben mit text die Prämissen und die geprüften Schlussfolgerungen (✓ / ✗).\n   Teile: kreis-a, kreis-b, kreis-c, leer, kreuz, bereich-ab, bereich-bc …\n14. <buchstaben gemischt='NERGAT' wort='GARTEN'/> Wortflüssigkeit: oben die gemischten Buchstaben, Linien zu ihrem Platz im Lösungswort, der erste Buchstabe rot.\n   Teile: gemischt, loesung, erster-buchstabe, buchstabe-1 …\n15. <zusammensetzen ziel='kreis' teile='5' seed='3'/> Figuren zusammensetzen: links die verstreuten, gedrehten Teile, rechts gestrichelt die Zielfigur (kreis, halbkreis, dreieck, quadrat, rechteck, fuenfeck, sechseck, achteck). Zeigst du im Text auf [[zusammensetzen|…]], gleiten die Teile an ihren Platz.\n   Teile: stueck-1 …, ziel, zusammensetzen\n16. <vergessenskurve tage='30' wiederholungen='1; 3; 7; 14'/> Spaced Repetition: Vergessenskurve ohne und mit Wiederholungen.\n   Teile: ohne-wiederholung, mit-wiederholung, wiederholung-1 …\n17. <gedaechtnispalast raeume='Eingang: Türschild mit dem Namen; Küche: Torte mit dem Geburtsdatum; Bad: Blutgruppe als Badeschaum; …'/> Gedächtnispalast als Grundriss mit Rundgang und einem Merkbild je Raum (höchstens 8 Räume).\n   Teile: raum-1 …, weg\nDie Bausteine 12 bis 17 brauchen meist die ganze Tafel; nur venn lässt rechts Platz für Text.\n\nREAKTIONEN UND MECHANISMEN erklärst du SCHRITT FÜR SCHRITT, so wie Pharmazie- und Medizinstudierende es nachvollziehen müssen:\n- Pro Schritt eine eigene ZEICHNUNG (mehrere ZEICHNUNG-Blöcke hintereinander, 2 bis 5). Jede beginnt mit <titel text='Schritt n: …'/>.\n- Aufbau jedes Schritts: links das Ausgangsmolekül (x='20' breite='420'), in der Mitte ein <pfeil x1='450' y1='300' x2='560' y2='300' text='Reagenz/Bedingung'/>, rechts das Produkt (x='570' breite='410'). Abgehende Teilchen (H⁺, H₂O, e⁻) mit bogenpfeil zeigen, neue Bindungen und Elektronenwege ebenfalls mit bogenpfeil.\n- Benenne und nummeriere die Atome, die sich verändern (abgespaltene Protonen bzw. ihre OH-Gruppen, entstehende Ladungen, der angreifende Stickstoff, die neue Bindung), damit du im Text genau darauf zeigen kannst.\n- Ionen und Reagenzien (z. B. Kupferion) zeichnest du als eigenes kleines <molekuel> mit id, damit man im Text darauf zeigen kann.\n- Im Text schreibst du passend **Schritt 1: …**, **Schritt 2: …** und zeigst in jedem Satz mit [[name|…]] auf genau das, worüber du sprichst. Die Tafel wechselt dann automatisch zum richtigen Schritt.\nNur wenn es wirklich keinen Baustein und keine Schablone gibt, zeichnest du selbst mit line, polyline, polygon, path, circle, ellipse, rect und text (font-size 24 bis 34, text-anchor='middle'). Gib jedem wichtigen Element einen Namen mit teil='name', z. B. teil='zellkern'.\n\nZEIGEN – das Wichtigste: Wenn du im Text über einen Teil der Tafel sprichst, markiere ihn so: [[teilname|sichtbarer Text]]. Beispiel: Schau dir [[kurze-seite|die kurze Seite a]] an. Das [[quadrat-a|blaue Quadrat darunter]] hat 3 · 3 = 9 Kästchen. Genau dieser Teil leuchtet dann an der Tafel auf, während du darüber sprichst. Markiere in jedem Satz, der sich auf die Tafel bezieht, den passenden Teil. Nutze nur Teilnamen, die es an deiner Tafel wirklich gibt.\n\nSo sieht es aus:\n- Moderner, ruhiger Stil: klare Linien, Flächen nur zart eingefärbt (fill mit einer Farbe, ohne fill-style). Wenig Text, viel Luft.\n- Farben: #1e293b dunkel, #dc2626 rot, #2563eb blau, #16a34a grün, #eab308 gelb, #ea580c orange, #7c3aed lila, #db2777 rosa, #8b5a2b braun. Nenne im Text dieselben Farben, die an der Tafel stehen.\n- Reihenfolge der Elemente = Reihenfolge deiner Erklärung (zuerst das Bild, dann die Rechnung).\n- Rechne alle Zahlen korrekt. Text und Tafel zeigen dieselben Zahlen.\n- Keine Styles, keine Skripte, keine Bilder. Wenn eine Zeichnung nichts bringt, lass ZEICHNUNG ganz weg.";

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
// Formeln: Die KI schreibt manchmal LaTeX ($F_G = m \cdot g$). An der Tafel und im Untertitel soll echte
// Formelschreibweise stehen: F_G → F mit tiefgestelltem G, \cdot → ·, ^2 → ², \frac{a}{b} → a/b, griechische Buchstaben …
const TEX = { cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", approx: "≈", neq: "≠", ne: "≠", leq: "≤", le: "≤", geq: "≥", ge: "≥", to: "→", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", leftrightarrow: "↔", rightleftharpoons: "⇌", infty: "∞", circ: "°", degree: "°", cdots: "…", ldots: "…", int: "∫", sum: "Σ", prod: "Π", partial: "∂", nabla: "∇", sqrt: "√", propto: "∝", cdotp: "·",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", eta: "η", theta: "θ", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω" };
const SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻", "n": "ⁿ", "x": "ˣ", "(": "⁽", ")": "⁾" };
const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋" };
function texToUnicode(t) {
  if (!t || !/[\\$^_{]/.test(t)) return t;
  let s = String(t).replace(/\$\$?([^$]+)\$\$?/g, "$1");
  for (let k = 0; k < 3; k++) s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (m, a, b) => `${/^[\w.,²³]+$/.test(a) ? a : "(" + a + ")"}/${/^[\w.,²³]+$/.test(b) ? b : "(" + b + ")"}`);
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (m, a) => "√" + (a.length > 1 ? "(" + a + ")" : a));
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\left|\\right|\\,|\;|\\!|\\quad|\\qquad/g, (m) => (/quad/.test(m) ? "  " : m === "\\," || m === "\;" ? " " : ""));
  s = s.replace(/\\([A-Za-z]+)/g, (m, w) => (TEX[w] != null ? TEX[w] : w));
  // Hochzahlen: ^2, ^{-1}, ^{10}
  s = s.replace(/\^\{([^{}]*)\}|\^([0-9n+\-−x])/g, (m, a, b) => { const x = a != null ? a : b; return [...x].every((c) => SUP[c]) ? [...x].map((c) => SUP[c]).join("") : "^(" + x + ")"; });
  // Tiefstellung nur mit Ziffern direkt als Unicode (H₂O); Buchstaben-Indizes (F_G) zeichnet die Tafel tiefgestellt
  s = s.replace(/_\{([0-9+\-]+)\}|_([0-9])/g, (m, a, b) => [...(a || b)].map((c) => SUB[c]).join(""));
  s = s.replace(/_\{([^{}]+)\}/g, "_$1").replace(/[{}]/g, "");
  return s;
}
// gesprochener Text: Index als Wort lesen lassen (F_G → F G)
const speakable = (t) => texToUnicode(t).replace(/([A-Za-zΔ])_([A-Za-z0-9]+)/g, "$1 $2");

// KI-Ausgaben reparieren, bevor sie zerlegt werden (häufigste Fehler laut Prüfstand)
function repairAnswer(text) {
  // ZEICHNUNG ohne <svg>-Hülle: die Bausteine direkt hingeschrieben
  text = text.replace(/((?:(?:BILD)?ZEICHNUNG|NEBENTAFEL)\s*:\s*(?:```[a-z]*\s*)?)(<(?!svg\b)[a-z!][\s\S]*?)(?=\n\s*\n|\n\s*```|\n\s*(?:BILD)?ZEICHNUNG|\n\s*(?:ESELSBR|MOLEK)|\n(?=[A-ZÄÖÜ*\[][^=<>\n]*(?:\n|$))|$)/gi,
    (m, head, tags) => `${head}<svg viewBox='0 0 1000 600'>\n${tags.trim()}\n</svg>\n`);
  // Einzelnes & (z. B. „Stütze & Ansatz“) macht die ganze Zeichnung ungültig
  // < und > in Attributwerten (z. B. zeilen='|2x − 5| < 3', knoten='a: ΔG < 0') ebenso
  return text.replace(/<svg[\s\S]*?<\/svg>/gi, (svg) => svg
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/(\s[a-z][a-z0-9-]*\s*=\s*)(['"])([\s\S]*?)\2/gi, (m, k, q, v) => k + q + v.replace(/</g, "&lt;").replace(/>/g, "&gt;") + q));
}
// Mehrere Ganz-Tafel-Bausteine (z. B. zwei <normalverteilung>) auf EINER Tafel würden übereinander liegen:
// das Programm verteilt sie auf eigene Tafeln, jede mit dem Titel. Bausteine mit eigener Breite (≤ 600) bleiben nebeneinander.
const FULL_BOARD = /^(abbildung|analyse|normalverteilung|schema|tabelle|kreislauf|kette|netz|vergleich|phasen|raeume|kurve|einheitskreis|vektoren|baum|prozent|einheiten|potenzen|auswahl|welle|vieleck|kreis)$/i;
function splitFull(svg) {
  const m = svg.match(/^(<svg[^>]*>)([\s\S]*)<\/svg>\s*$/i);
  if (!m) return [svg];
  const inner = m[2], tagRe = /<([a-z][a-z0-9-]*)\b[^>]*?\/>/gi, full = [];
  let t;
  while ((t = tagRe.exec(inner))) {
    if (!FULL_BOARD.test(t[1])) continue;
    const br = t[0].match(/breite=['"](\d+)/i);
    if (br && Number(br[1]) <= 600) continue;
    full.push({ i: t.index, end: tagRe.lastIndex });
  }
  if (full.length < 2) return [svg];
  const titel = (inner.match(/<titel\b[^>]*\/>/i) || [""])[0];
  const rest = inner.slice(0, full[1].i);                       // alles bis zum zweiten Baustein bleibt auf Tafel 1
  const out = [m[1] + rest + "</svg>"];
  full.slice(1).forEach((f, k) => {
    const next = full[k + 2] ? full[k + 2].i : inner.length;
    const chunk = inner.slice(f.i, next).replace(/<titel\b[^>]*\/>/gi, "");
    out.push(m[1] + titel + chunk + "</svg>");
  });
  return out;
}
function splitAnswer(text) {
  text = repairAnswer(String(text || "").replace(/^[ \t]*(?:ÖFFNEN|OEFFNEN)\s*:\s*[ws]\d+[ \t]*$/gmi, ""));
  const mols = [...text.matchAll(/MOLEK(?:UE|Ü)L\s*:\s*([^|\n]+)\|\s*`?([^\s`\n]+)/gi)].map((m) => ({ name: m[1].replace(/[*`]/g, "").trim(), smiles: m[2].trim() }));
  const tricks = [...text.matchAll(/ESELSBR(?:UE|Ü)CKE\s*:\s*([^|\n]+)(?:\|\s*([^\n]*))?/gi)].map((m) => ({ merksatz: m[1].replace(/[*`"]/g, "").trim(), wofuer: (m[2] || "").replace(/[*`]/g, "").trim() })).filter((t) => t.merksatz);
  // Text und Tafeln dürfen sich abwechseln: Text zu Tafel 1, Tafel 1, Text zu Tafel 2, Tafel 2 …
  // Alles außerhalb der Zeichen-Blöcke ist gesprochener Text; segs merkt sich, welcher Textabschnitt zu welcher Tafel gehört.
  const svgs = [], segs = [], sides = new Set();
  let imgSvg = null, body = "", last = 0;
  const re = /(BILDZEICHNUNG|ZEICHNUNG|NEBENTAFEL)\s*:\s*(?:```[a-z]*\s*)?(<svg[\s\S]*?<\/svg>)\s*(?:```)?/gi;
  let m;
  const addText = (t, board) => {
    t = texToUnicode(t);
    const clean = t.replace(/^\s*(MOLEK(UE|Ü)L|ESELSBR(UE|Ü)CKE|MARKIERUNGEN)\s*:.*$/gim, "").replace(/```\w*/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (!clean) return;
    segs.push({ start: body.length + (body ? 1 : 0), board, raw: board });
    body += (body ? "\n" : "") + clean;
  };
  while ((m = re.exec(text))) {
    const before = text.slice(last, m.index);
    if (/^BILD/i.test(m[1])) { addText(before, svgs.length); imgSvg = imgSvg || m[2]; }
    else if (/^NEBEN/i.test(m[1])) { addText(before, svgs.length); if (!svgs.includes(m[2])) { sides.add(svgs.length); svgs.push(m[2]); } }
    else { addText(before, svgs.length); splitFull(m[2]).forEach((sv) => { if (!svgs.includes(sv)) svgs.push(sv); }); }
    last = re.lastIndex;
  }
  addText(text.slice(last), svgs.length);
  // Text vor der ersten Tafel gehört zur ersten Tafel, Text nach der letzten Tafel zur letzten
  segs.forEach((g) => { g.board = Math.min(g.board, Math.max(0, svgs.length - 1)); });
  return { body, svg: svgs[0] || null, svgs: svgs.slice(0, 7), imgSvg, mols, tricks, segs, sides };
}

// ================= Tafel-Baukasten: exakt berechnete Bausteine =================
const C = { ink: "#1e293b", red: "#dc2626", blue: "#2563eb", green: "#16a34a", grey: "#64748b" };
// Moderner, klarer Tafelstil (statt Kreide/Handzeichnung). LB_STIL = "hand" schaltet zurück.
const MODERN = (window.LB_STIL || "modern") !== "hand";
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
  if (!MODERN) return compEquationHand(A);
  // modern: Rechenweg als Karte – nummerierte Schritte, Notiz in Grau, Ergebnis grün hinterlegt
  const lines = String(A("zeilen") || "").split(";").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  const notes = String(A("notizen") || "").split(";").map((t) => t.trim());
  if (!lines.length) return [];
  const x = clampN(N(A("x"), 60), 20, 900), y0 = N(A("y"), 80);
  const W = Math.max(260, 980 - x), hasNotes = notes.some(Boolean);
  const exprMax = Math.max(...lines.map((l) => l.length)), noteMax = hasNotes ? Math.max(...notes.map((n) => n.length)) : 0;
  let size = N(A("groesse"), 30);
  // Notizen rechts daneben – reicht der Platz nicht, stehen sie klein unter der Zeile
  const fit = (stack) => 56 + exprMax * size * 0.56 + (hasNotes && !stack ? 28 + noteMax * size * 0.6 * 0.56 : 0) + 24;
  let stacked = false;
  while (size > 22 && fit(false) > W) size -= 1;
  if (fit(false) > W) { stacked = true; size = N(A("groesse"), 30); while (size > 15 && fit(true) > W) size -= 1; }
  const noteSize = Math.max(14, size * 0.6);
  const lh = Math.max(46, size * 1.75) + (stacked && hasNotes ? noteSize * 1.1 : 0), pad = 14, out = [];
  const cardH = lines.length * lh + pad * 2 - 6;
  out.push(S("rect", { x, y: y0 - size - pad + 4, width: W, height: cardH, rx: 16, fill: "#f8fafc", stroke: "#e2e8f0", "stroke-width": 2, "fill-style": "solid", teil: "rechnung", "data-p": 1 }));
  const color = A("farbe") || C.ink;
  lines.forEach((l, i) => {
    const yy = y0 + i * lh, last = i === lines.length - 1 && lines.length > 1;
    const teil = "zeile-" + (i + 1) + (last ? " ergebnis" : "") + " rechnung";
    if (last) out.push(S("rect", { x: x + 8, y: yy - size * 0.95, width: W - 16, height: size * 1.45 + (stacked && notes[i] ? noteSize * 1.2 : 0), rx: 10, fill: "#dcfce7", stroke: "none", "fill-style": "solid", teil, "data-p": 1 }));
    out.push(S("circle", { cx: x + 28, cy: yy - size * 0.33, r: 13, fill: last ? C.green : "#e2e8f0", stroke: "none", "fill-style": "solid", teil, "data-p": 1 }));
    out.push(tx(x + 28, yy - size * 0.33 + 6, String(i + 1), { size: 17, fill: last ? "#ffffff" : C.grey, teil }));
    out.push(tx(x + 56, yy, l, { anchor: "start", size, fill: last ? "#15803d" : color, teil }));
    if (notes[i]) out.push(stacked ? tx(x + 56, yy + noteSize * 1.25, notes[i], { anchor: "start", size: noteSize, fill: C.grey, teil }) : tx(x + W - 16, yy, notes[i], { anchor: "end", size: noteSize, fill: C.grey, teil }));
  });
  out.forEach((o) => { if (o.tag === "text") o.attrs["data-placed"] = 1; });
  return out;
}
function compEquationHand(A) {
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
  const sx = niceStep(((xmax - xmin) * 10) / Math.max(3, w / 95)), sy = niceStep(((ymax - ymin) * 10) / Math.max(3, h / 70));
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
    if (last) out.push(tx(Math.min(last[0], x + w - 10), Math.max(last[1] - 14, y + 20 + k * 30), "fgh"[k] + "(x) = " + src.replace(/^\s*(y|[fgh]\(x\))\s*=\s*/i, "").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\*/g, "·"), { size: 26, fill: color, anchor: "end", teil }));
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
  const x = N(A("x"), 30), y = N(A("y"), 48), color = A("farbe") || C.red;
  let t = String(A("text") || "");
  if (!MODERN) return [tx(x, y, t, { anchor: "start", size: N(A("groesse"), 38), fill: color, teil: "titel" }), ln(x, y + 12, x + Math.min(940, t.length * 18), y + 12, color, 2.5, "titel")];
  // modern: Schrittnummer als Plakette, Titel ruhig in dunkler Schrift
  const m = t.match(/^\s*(?:Schritt\s*)?(\d{1,2})[.:)]\s*(.+)$/i), out = [];
  const size = Math.min(34, N(A("groesse"), 32));
  let tx0 = x + 4;
  if (m) {
    t = m[2];
    out.push(S("circle", { cx: x + 20, cy: y - size * 0.34, r: 19, fill: C.blue, stroke: "none", "fill-style": "solid", teil: "titel", "data-p": 1 }));
    out.push(tx(x + 20, y - size * 0.34 + 7.5, m[1], { size: 21, fill: "#ffffff", teil: "titel" }));
    tx0 = x + 52;
  } else { out.push(S("rect", { x, y: y - size * 0.86, width: 6, height: size * 0.98, rx: 3, fill: C.blue, stroke: "none", "fill-style": "solid", teil: "titel", "data-p": 1 })); tx0 = x + 20; }
  out.push(tx(tx0, y, t, { anchor: "start", size, fill: C.ink, teil: "titel" }));
  out.forEach((o) => { if (o.tag === "text") o.attrs["data-placed"] = 1; });
  return out;
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
  const list = String(A("liste") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 6).map((s) => { const [sym, ch] = s.split(":").map((v) => (v || "").trim()); return { sym: sym.slice(0, 4), ch: /^\d?[+−-]$|^[+−-]\d?$/.test(ch || "") ? ch : "" }; });   // nur echte Ladungen (2+, −), keine Formeln
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
// ================= Mathe-Bausteine (MedAT): alles exakt berechnet =================
const fmtN = (v, d = 2) => { if (!isFinite(v)) return "–"; const r = Math.round(v * 10 ** d) / 10 ** d; return String(Math.abs(r) < 1e-12 ? 0 : r).replace(".", ","); };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
function parseFrac(s) {
  const t = String(s || "").trim().replace(",", ".").replace(/[−–]/g, "-");
  let m = t.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (m) return { n: +m[1], d: +m[2], v: +m[1] / +m[2], txt: `${m[1]}/${m[2]}` };
  m = t.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (m) return { n: null, d: null, v: +m[1] / 100, txt: fmtN(+m[1], 2) + " %" };
  const v = parseFloat(t);
  return isFinite(v) ? { n: null, d: null, v, txt: fmtN(v, 4) } : null;
}
function mulFracs(fs) {
  if (fs.every((f) => f.n != null)) { let n = 1, d = 1; fs.forEach((f) => { n *= f.n; d *= f.d; }); const g = gcd(n, d); return { n: n / g, d: d / g, v: n / d, txt: d / g === 1 ? String(n / g) : `${n / g}/${d / g}` }; }
  const v = fs.reduce((a, f) => a * f.v, 1); return { v, txt: fmtN(v, 4) };
}
const superscript = (s) => String(s).replace(/\^(-?\d+)/g, (_, e) => e.split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"["0123456789".indexOf(c)] || (c === "-" ? "⁻" : c)).join("")).replace(/\*/g, "·");
const dot = (cx, cy, color, teil, r = 9) => S("circle", { cx, cy, r, stroke: color, "stroke-width": 3, fill: color, teil, "data-p": 1 });
function arrowLine(ax, ay, bx, by, c, w, teil, both) {
  const a = Math.atan2(by - ay, bx - ax), L = 16;
  const head = (px, py, ang) => S("path", { d: `M${(px - L * Math.cos(ang - 0.45)).toFixed(1)} ${(py - L * Math.sin(ang - 0.45)).toFixed(1)} L${px.toFixed(1)} ${py.toFixed(1)} L${(px - L * Math.cos(ang + 0.45)).toFixed(1)} ${(py - L * Math.sin(ang + 0.45)).toFixed(1)}`, stroke: c, "stroke-width": w, fill: "none", teil, "data-p": 1 });
  const r = [ln(ax, ay, bx, by, c, w, teil, true), head(bx, by, a)];
  if (both) r.push(head(ax, ay, a + Math.PI));
  return r;
}

// 20. Funktion untersuchen: Graph mit Nullstellen, Extrema, Wendepunkten, Tangente, Steigungsdreieck, Fläche, Schnittpunkt
function compAnalysis(A) {
  const x = N(A("x"), 70), y = Math.max(105, N(A("y"), 105)), w = N(A("breite"), 860), h = Math.min(N(A("hoehe"), 440), 560 - Math.max(105, N(A("y"), 105)));
  const srcs = String(A("funktion") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const fs = srcs.map(makeFn).filter(Boolean);
  if (!fs.length) return [tx(500, 300, "Funktion nicht lesbar: " + srcs.join("; "), { size: 26, fill: C.grey })];
  const [xa, xb] = String(A("bereich") || "-5;5").split(/[;,]/).map((v) => N(v, NaN));
  const xmin = isFinite(xa) ? xa : -5, xmax = isFinite(xb) && xb > xmin ? xb : xmin + 10;
  const f = fs[0], g = fs[1], STEPS = 1200, dx = (xmax - xmin) / STEPS;
  let lo = Infinity, hi = -Infinity;
  for (const fn of fs) for (let i = 0; i <= STEPS; i++) { const v = fn(xmin + i * dx); if (isFinite(v) && Math.abs(v) < 1e4) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
  if (!isFinite(lo)) { lo = -5; hi = 5; }
  lo = Math.min(lo, 0); hi = Math.max(hi, 0);
  const pad = (hi - lo || 2) * 0.14;
  const ymin = A("ymin") != null ? N(A("ymin"), lo - pad) : lo - pad, ymax = A("ymax") != null ? N(A("ymax"), hi + pad) : hi + pad;
  const out = compAxes((k) => ({ x, y, breite: w, hoehe: h, xmin, xmax, ymin, ymax, funktion: srcs.join("; ") }[k] ?? A(k)));
  const X = (v) => x + ((v - xmin) / (xmax - xmin)) * w, Y = (v) => y + h - ((v - ymin) / (ymax - ymin)) * h;
  const inside = (yy) => yy >= ymin && yy <= ymax;
  const d1 = (fn, v) => (fn(v + 1e-4) - fn(v - 1e-4)) / 2e-4, d2 = (fn, v) => (fn(v + 1e-3) - 2 * fn(v) + fn(v - 1e-3)) / 1e-6;
  const bisect = (fn, a, b) => { let fa = fn(a); for (let k = 0; k < 60; k++) { const m = (a + b) / 2, fm = fn(m); if ((fa < 0) === (fm < 0)) { a = m; fa = fm; } else b = m; } return (a + b) / 2; };
  const zeros = (fn) => { const r = []; let pv = fn(xmin); for (let i = 1; i <= STEPS; i++) { const xv = xmin + i * dx, v = fn(xv); if (isFinite(pv) && isFinite(v) && Math.abs(v - pv) < (ymax - ymin)) { if (v === 0) r.push(xv); else if ((pv < 0) !== (v < 0)) r.push(bisect(fn, xv - dx, xv)); } pv = v; } return r.filter((v, i, a) => !i || Math.abs(v - a[i - 1]) > dx * 2).slice(0, 6); };
  const yes = (k) => /^(ja|true|1)$/i.test(String(A(k) || ""));
  const label = (px, py, t, color, teil, above = true) => tx(X(px) + 10, Y(py) + (above ? -16 : 34), t, { size: 24, fill: color, anchor: "start", teil });
  // Extrema (auch Berührpunkte, die keine Vorzeichenwechsel-Nullstelle sind)
  const ext = zeros((v) => d1(f, v)).map((v) => ({ x: v, y: f(v), typ: d2(f, v) < 0 ? "hochpunkt" : "tiefpunkt" })).filter((p) => isFinite(p.y));
  if (yes("nullstellen")) {
    const zs = zeros(f); ext.forEach((p) => { if (Math.abs(p.y) < (ymax - ymin) * 1e-4 && !zs.some((z) => Math.abs(z - p.x) < dx * 3)) zs.push(p.x); });
    zs.sort((a, b) => a - b).forEach((z, i) => { out.push(dot(X(z), Y(0), C.red, `nullstelle nullstelle-${i + 1}`)); out.push(label(z, 0, `N${zs.length > 1 ? i + 1 : ""}(${fmtN(z)}|0)`, C.red, `nullstelle nullstelle-${i + 1}`, i % 2 === 0)); });
  }
  if (yes("extrema") || yes("scheitel")) ext.forEach((p, i) => { if (!inside(p.y)) return; const c = p.typ === "hochpunkt" ? C.green : C.blue, nm = p.typ === "hochpunkt" ? "H" : "T"; out.push(dot(X(p.x), Y(p.y), c, `${p.typ} extremum extremum-${i + 1} scheitel`)); out.push(label(p.x, p.y, `${nm}(${fmtN(p.x)}|${fmtN(p.y)})`, c, `${p.typ} extremum extremum-${i + 1} scheitel`, p.typ === "hochpunkt")); });
  if (yes("wendepunkte")) zeros((v) => d2(f, v)).forEach((wx, i) => { const wy = f(wx); if (!inside(wy)) return; out.push(dot(X(wx), Y(wy), "#7b3fc4", `wendepunkt wendepunkt-${i + 1}`)); out.push(label(wx, wy, `W(${fmtN(wx)}|${fmtN(wy)})`, "#7b3fc4", `wendepunkt wendepunkt-${i + 1}`, false)); });
  if (A("tangente") != null && isFinite(N(A("tangente"), NaN))) {
    const t0 = N(A("tangente"), 0), m = d1(f, t0), b0 = f(t0) - m * t0, x1 = xmin, x2 = xmax;
    out.push(S("line", { x1: X(x1), y1: Y(m * x1 + b0), x2: X(x2), y2: Y(m * x2 + b0), stroke: "#f07c1a", "stroke-width": 3, "stroke-dasharray": "12 8", teil: "tangente", "data-p": 1 }));
    out.push(dot(X(t0), Y(f(t0)), "#f07c1a", "tangente beruehrpunkt"));
    out.push(tx(x + w - 10, y + 24, `Tangente: y = ${fmtN(m)}x ${b0 < 0 ? "−" : "+"} ${fmtN(Math.abs(b0))}`, { size: 26, fill: "#f07c1a", anchor: "end", teil: "tangente" }));
  }
  if (A("steigungsdreieck") != null && isFinite(N(A("steigungsdreieck"), NaN))) {
    const s0 = N(A("steigungsdreieck"), 0), s1 = s0 + 1, y0 = f(s0), y1v = f(s1);
    out.push(S("polyline", { points: `${X(s0)},${Y(y0)} ${X(s1)},${Y(y0)} ${X(s1)},${Y(y1v)}`, stroke: "#f07c1a", "stroke-width": 4, fill: "none", teil: "steigungsdreieck", "data-p": 1 }));
    out.push(tx((X(s0) + X(s1)) / 2, Y(y0) + (y1v > y0 ? 32 : -12), "Δx = 1", { size: 26, fill: "#f07c1a", teil: "steigungsdreieck delta-x" }));
    out.push(tx(X(s1) + 10, (Y(y0) + Y(y1v)) / 2 + 9, `Δy = ${fmtN(y1v - y0)}`, { size: 26, fill: "#f07c1a", anchor: "start", teil: "steigungsdreieck delta-y" }));
    out.push(tx(x + w - 10, y + 56, `Steigung k = Δy/Δx = ${fmtN(y1v - y0)}`, { size: 26, fill: "#f07c1a", anchor: "end", teil: "steigungsdreieck steigung" }));
  }
  const fl = String(A("flaeche") || "").split(/\.\.|[;,]/).map((v) => N(v, NaN));
  if (fl.length === 2 && fl.every(isFinite) && fl[1] > fl[0]) {
    const [a, b] = fl, n = 200, hh = (b - a) / n; let sum = 0; const pts = [`${X(a)},${Y(0)}`];
    for (let i = 0; i <= n; i++) { const xv = a + i * hh, v = f(xv); pts.push(`${X(xv).toFixed(1)},${Y(Math.max(ymin, Math.min(ymax, v))).toFixed(1)}`); sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * v; }
    pts.push(`${X(b)},${Y(0)}`); const I = (sum * hh) / 3;
    out.unshift(S("polygon", { points: pts.join(" "), stroke: "none", fill: "#f2b705", teil: "flaeche integral" }));
    out.push(tx((X(a) + X(b)) / 2, Y(0) + (I >= 0 ? -16 : 40), `A = ${fmtN(I)}`, { size: 30, fill: C.ink, teil: "flaeche integral ergebnis" }));
    out.push(tx(X(a), Y(0) + 34, fmtN(a), { size: 24, fill: "#b38600", teil: "flaeche grenze" }), tx(X(b), Y(0) + 34, fmtN(b), { size: 24, fill: "#b38600", teil: "flaeche grenze" }));
  }
  if (g && yes("schnittpunkt")) zeros((v) => f(v) - g(v)).forEach((sx, i) => { const sy = f(sx); if (!inside(sy)) return; out.push(dot(X(sx), Y(sy), C.ink, `schnittpunkt schnittpunkt-${i + 1}`, 11)); out.push(label(sx, sy, `S(${fmtN(sx)}|${fmtN(sy)})`, C.ink, `schnittpunkt schnittpunkt-${i + 1}`)); });
  return out;
}

// 21. Prozent: Grundwert als Balken, nacheinander Änderungen (die Falle: −20 % und −10 % sind nicht −30 %)
function compPercent(A) {
  const x = N(A("x"), 80), y = N(A("y"), 100), w = N(A("breite"), 760);
  const start = N(String(A("start") || "100").replace(/[^\d.,-]/g, ""), 100), unit = String(A("start") || "").replace(/[\d.,\s-]/g, "").trim();
  const steps = String(A("schritte") || "").split(";").map((s) => s.trim()).filter(Boolean).slice(0, 4).map((s) => N(s.replace("%", "").replace(/[−–]/g, "-"), 0));
  const out = [], u = unit ? " " + unit : "", vals = [start];
  steps.forEach((p) => vals.push(vals[vals.length - 1] * (1 + p / 100)));
  const max = Math.max(...vals), barH = 54, gap = steps.length ? Math.min(118, 360 / steps.length) : 0;
  const bar = (i, v, color, teil) => {
    const yy = y + i * gap, bw = (w * v) / max;
    out.push(S("rect", { x, y: yy, width: w * start / max, height: barH, stroke: "#cfc9bd", "stroke-width": 2, fill: "none", "stroke-dasharray": "8 6", teil, "data-p": 1 }));
    out.push(S("rect", { x, y: yy, width: bw, height: barH, stroke: color, "stroke-width": 4, fill: color, teil, "data-p": 1 }));
    out.push(tx(x + bw + 14, yy + barH * 0.68, fmtN(v) + u, { size: 32, fill: color, anchor: "start", teil }));
  };
  if (!steps.length) {
    const p = N(String(A("anteil") || "25").replace("%", ""), 25);
    out.push(S("rect", { x, y: y + 60, width: w, height: 80, stroke: C.ink, "stroke-width": 4, fill: "none", teil: "grundwert", "data-p": 1 }));
    out.push(S("rect", { x, y: y + 60, width: (w * p) / 100, height: 80, stroke: C.blue, "stroke-width": 4, fill: C.blue, teil: "prozentwert anteil", "data-p": 1 }));
    for (let i = 1; i < 10; i++) out.push(ln(x + (w * i) / 10, y + 140, x + (w * i) / 10, y + 128, C.grey, 2, "skala", true));
    out.push(tx(x + w / 2, y + 40, `Grundwert G = ${fmtN(start)}${u} (100 %)`, { size: 30, teil: "grundwert" }));
    out.push(tx(x + (w * p) / 200, y + 190, `Prozentwert W = ${fmtN((start * p) / 100)}${u}`, { size: 30, fill: C.blue, teil: "prozentwert" }));
    out.push(tx(x + (w * p) / 200, y + 230, `Prozentsatz p = ${fmtN(p)} %`, { size: 30, fill: C.blue, teil: "prozentsatz" }));
    out.push(tx(x + w / 2, y + 320, `W = G · p / 100 = ${fmtN(start)} · ${fmtN(p)} / 100 = ${fmtN((start * p) / 100)}${u}`, { size: 30, teil: "formel ergebnis" }));
    return out;
  }
  bar(0, start, C.ink, "grundwert schritt-0");
  steps.forEach((p, i) => {
    const before = vals[i], after = vals[i + 1], yy = y + (i + 1) * gap, col = p < 0 ? C.red : C.green;
    bar(i + 1, after, col, `schritt-${i + 1}`);
    out.push(tx(x - 12, yy - 14, `${p > 0 ? "+" : "−"}${fmtN(Math.abs(p))} % von ${fmtN(before)}${u} = ${p > 0 ? "+" : "−"}${fmtN(Math.abs((before * p) / 100))}${u}`, { size: 26, fill: col, anchor: "start", teil: `schritt-${i + 1} rechnung-${i + 1}` }));
  });
  const end = vals[vals.length - 1], total = (end / start - 1) * 100, naive = steps.reduce((a, b) => a + b, 0);
  const yt = y + (steps.length + 1) * gap + 30;
  out.push(tx(x, yt, `insgesamt: ${fmtN(start)}${u} → ${fmtN(end)}${u} = ${total > 0 ? "+" : "−"}${fmtN(Math.abs(total))} %`, { size: 34, fill: C.ink, anchor: "start", teil: "gesamt ergebnis" }));
  if (steps.length > 1 && Math.abs(naive - total) > 0.01) out.push(tx(x, yt + 44, `nicht ${naive > 0 ? "+" : "−"}${fmtN(Math.abs(naive))} % – jeder Schritt rechnet vom neuen Wert!`, { size: 28, fill: C.red, anchor: "start", teil: "falle" }));
  return out;
}

// 22. Einheiten: Treppe der Vorsilben, Weg von → nach, Faktor und Ergebnis
const PREF = [["G", 9, "Giga"], ["M", 6, "Mega"], ["k", 3, "Kilo"], ["h", 2, "Hekto"], ["da", 1, "Deka"], ["", 0, ""], ["d", -1, "Dezi"], ["c", -2, "Zenti"], ["m", -3, "Milli"], ["µ", -6, "Mikro"], ["n", -9, "Nano"], ["p", -12, "Piko"]];
function parseUnit(s, base) {
  let t = String(s || "").trim().replace(/^u/, "µ").replace(/^μ/, "µ");
  const dim = /³|\^3/.test(t) ? 3 : /²|\^2/.test(t) ? 2 : 1;
  t = t.replace(/[²³]|\^[23]/g, "");
  if (!base) { const m = t.match(/(m|g|l|L|s|mol|Pa|Hz|J|W|V|A|N)$/); base = m ? m[1] : t.slice(-1); }
  const pre = t.endsWith(base) ? t.slice(0, t.length - base.length) : t;
  const p = PREF.find((q) => q[0] === pre) || (pre === "" ? PREF[5] : null);
  return p ? { pre: p[0], e: p[1], name: p[2], base, dim } : null;
}
// Zusammengesetzte Einheiten (g/cm³ → kg/m³, km/h → m/s): Zähler und Nenner getrennt umrechnen
function compUnitsRatio(A) {
  const von = String(A("von") || ""), nach = String(A("nach") || ""), wert = N(A("wert"), 1);
  const [vz, vn = ""] = von.split("/"), [nz, nn = ""] = nach.split("/");
  const TIME = { s: 1, min: 60, h: 3600, d: 86400 };
  const fac = (a, b) => {                                   // 1 a = f · b
    if (!a && !b) return 1;
    if (TIME[a] && TIME[b]) return TIME[a] / TIME[b];
    const pa = parseUnit(a), pb = parseUnit(b, pa ? pa.base : undefined);
    if (!pa || !pb) return null;
    return Math.pow(10, (pa.e - pb.e) * pa.dim);
  };
  const fz = fac(vz.trim(), nz.trim()), fn = fac(vn.trim(), nn.trim());
  const out = [];
  const num = (v) => { if (v === 0) return "0"; if (Math.abs(v) >= 1e-3 && Math.abs(v) < 1) return String(+v.toPrecision(6)).replace(".", ","); const e = Math.floor(Math.log10(Math.abs(v))); if (e >= 6 || e <= -4) { const m = v / Math.pow(10, e); const sup = String(e).replace("-", "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]); return (Math.abs(m - 1) < 1e-9 ? "" : fmt(m) + " · ") + "10" + sup; } return fmt(v).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  if (fz == null || fn == null) { out.push(tx(500, 300, `${von} → ${nach}`, { size: 34, teil: "von nach" })); return out; }
  const res = wert * fz / fn, lines = [
    [`${num(wert)} ${von} = ? ${nach}`, "Aufgabe", "von"],
    [`1 ${vz} = ${num(fz)} ${nz}`, "Zähler umrechnen", "zaehler"],
    ...(vn ? [[`1 ${vn} = ${num(fn)} ${nn}`, "Nenner umrechnen", "nenner"]] : []),
    [`${num(wert)} · ${num(fz)}${vn ? " / " + num(fn) : ""}`, "einsetzen", "einsetzen"],
    [`= ${num(res)} ${nach}`, "Ergebnis", "ergebnis"],
  ];
  lines.forEach((l, i) => {
    const y = 140 + i * 78, last = i === lines.length - 1;
    out.push(tx(90, y, l[0], { size: 36, anchor: "start", fill: last ? C.green : C.ink, teil: l[2] }));
    out.push(tx(940, y, l[1], { size: 22, anchor: "end", fill: C.grey, teil: l[2] }));
  });
  return out;
}
function compUnits(A) {
  const x = N(A("x"), 50), y = N(A("y"), 110), w = N(A("breite"), 900);
  const from = parseUnit(A("von") || "m"), to = parseUnit(A("nach") || "cm", from ? from.base : undefined);
  if (/\//.test(String(A("von") || "")) || /\//.test(String(A("nach") || ""))) return compUnitsRatio(A);
  if (!from || !to) return compUnitsRatio(A);
  const dim = Math.max(from.dim, N(A("dim"), 1)), base = from.base, sup = dim === 3 ? "³" : dim === 2 ? "²" : "";
  const lo = Math.min(from.e, to.e), hi = Math.max(from.e, to.e);
  let list = PREF.filter((p) => p[1] <= hi + 1 && p[1] >= lo - 1);
  if (list.length > 9) list = PREF.filter((p) => p[1] <= hi && p[1] >= lo);
  const n = list.length, stepW = w / n, stepH = Math.min(46, 300 / n), out = [];
  const ix = (e) => list.findIndex((p) => p[1] === e);
  list.forEach((p, i) => {
    const bx = x + i * stepW, by = y + i * stepH, on = p[1] === from.e || p[1] === to.e, sym = p[0] + base + sup;
    out.push(S("rect", { x: bx + 4, y: by, width: stepW - 8, height: 64, stroke: on ? C.red : C.ink, "stroke-width": on ? 5 : 3, fill: on ? "#ffe9e6" : "#ffffff", teil: `stufe stufe-${p[0] || "basis"}${p[1] === from.e ? " von" : ""}${p[1] === to.e ? " nach" : ""}`, "data-p": 1 }));
    out.push(tx(bx + stepW / 2, by + 44, sym, { size: 30, fill: on ? C.red : C.ink, teil: `stufe-${p[0] || "basis"}` }));
    if (p[2]) out.push(tx(bx + stepW / 2, by + 90, p[2], { size: 20, fill: C.grey, teil: `stufe-${p[0] || "basis"}` }));
    if (i < n - 1) { const f = Math.pow(10, (p[1] - list[i + 1][1]) * dim); out.push(tx(bx + stepW, by + stepH + 32 + 64, "· " + (f >= 1e4 ? "10" + superscript("^" + Math.log10(f)) : fmtN(f, 0)), { size: 22, fill: "#7b3fc4", teil: "faktor" })); }
  });
  const i1 = ix(from.e), i2 = ix(to.e);
  if (i1 >= 0 && i2 >= 0 && i1 !== i2) {
    const ax = x + i1 * stepW + stepW / 2, bx2 = x + i2 * stepW + stepW / 2, ay = y + i1 * stepH - 18, by2 = y + i2 * stepH - 18;
    out.push(S("path", { d: `M${ax} ${ay} Q${(ax + bx2) / 2} ${Math.min(ay, by2) - 70} ${bx2} ${by2}`, stroke: C.red, "stroke-width": 5, fill: "none", teil: "weg", "data-p": 1 }));
    const ang = Math.atan2(by2 - (Math.min(ay, by2) - 70), bx2 - (ax + bx2) / 2);
    out.push(S("path", { d: `M${bx2 - 18 * Math.cos(ang - 0.45)} ${by2 - 18 * Math.sin(ang - 0.45)} L${bx2} ${by2} L${bx2 - 18 * Math.cos(ang + 0.45)} ${by2 - 18 * Math.sin(ang + 0.45)}`, stroke: C.red, "stroke-width": 5, fill: "none", teil: "weg", "data-p": 1 }));
  }
  const expo = (from.e - to.e) * dim, factor = Math.pow(10, expo);
  const val = A("wert") != null ? N(A("wert"), NaN) : NaN;
  const yb = y + n * stepH + 170;
  const fTxt = Math.abs(expo) >= 4 ? "10" + superscript("^" + expo) : fmtN(factor, 6);
  out.push(tx(x + w / 2, yb, `1 ${from.pre}${base}${sup} = ${fTxt} ${to.pre}${base}${sup}   (${expo > 0 ? "kleiner werden → mal" : "größer werden → durch"} ${Math.abs(expo) >= 4 ? "10" + superscript("^" + Math.abs(expo)) : fmtN(Math.pow(10, Math.abs(expo)), 0)})`, { size: 28, teil: "faktor regel" }));
  if (isFinite(val)) out.push(tx(x + w / 2, yb + 56, `${fmtN(val, 6)} ${from.pre}${base}${sup} = ${fmtN(val, 6)} · ${fTxt} = ${fmtN(val * factor, 8)} ${to.pre}${base}${sup}`, { size: 34, fill: C.red, teil: "ergebnis" }));
  return out;
}

// 23. Potenzen: Faktoren als Kreise, kürzen, Ergebnis
function compPowers(A) {
  const b = String(A("basis") || "2").trim(), top = String(A("oben") || "5;3").split(/[;,]/).map((v) => Math.round(N(v, 0))).filter((v) => v > 0).slice(0, 3);
  const bot = String(A("unten") || "").split(/[;,]/).map((v) => Math.round(N(v, 0))).filter((v) => v > 0).slice(0, 2);
  const nt = top.reduce((a, c) => a + c, 0), nb = bot.reduce((a, c) => a + c, 0), x0 = 90, out = [], cols = [C.blue, C.green, "#f07c1a"];
  const r = Math.min(30, 760 / Math.max(nt, nb, 1) / 2.4), sp = r * 2.4;
  const row = (groups, yy, prefix) => { let i = 0; const pos = []; groups.forEach((g, k) => { for (let j = 0; j < g; j++, i++) { const cx = x0 + r + i * sp + k * 18; pos.push(cx); out.push(S("circle", { cx, cy: yy, r, stroke: cols[k % 3], "stroke-width": 3, fill: cols[k % 3], teil: `${prefix} ${prefix}-gruppe-${k + 1} faktor`, "data-p": 1 })); out.push(tx(cx, yy + r * 0.4, b, { size: Math.round(r * 1.05), teil: `${prefix} ${prefix}-gruppe-${k + 1}` })); } }); return pos; };
  const label = (groups) => groups.map((g) => b + superscript("^" + g)).join(" · ");
  out.push(tx(x0, 120, label(top), { size: 34, anchor: "start", teil: "zaehler" }));
  const pt = row(top, 190, "zaehler");
  let pb = [];
  if (nb) {
    const lw = Math.max(pt.length ? pt[pt.length - 1] : 0, x0 + nb * sp) + r + 10;
    out.push(ln(x0 - 10, 250, lw, 250, C.ink, 4, "bruchstrich", true));
    pb = row(bot, 310, "nenner");
    out.push(tx(x0, 390, label(bot), { size: 34, anchor: "start", teil: "nenner" }));
    for (let i = 0; i < Math.min(nt, nb); i++) { out.push(ln(pt[i] - r, 190 + r, pt[i] + r, 190 - r, C.red, 4, "kuerzen", true)); out.push(ln(pb[i] - r, 310 + r, pb[i] + r, 310 - r, C.red, 4, "kuerzen", true)); }
  }
  const e = nt - nb, val = Math.pow(N(b, NaN), e);
  const res = `= ${b}${superscript("^" + nt)}${nb ? " / " + b + superscript("^" + nb) : ""} = ${b}${superscript("^" + e)}${isFinite(val) ? " = " + fmtN(val, 6) : ""}`;
  out.push(tx(x0, nb ? 470 : 300, `Exponenten: ${top.join(" + ")}${nb ? " − " + bot.join(" − ") : ""} = ${e}`, { size: 32, fill: "#7b3fc4", anchor: "start", teil: "exponenten regel" }));
  out.push(tx(x0, nb ? 530 : 360, res, { size: 38, fill: C.red, anchor: "start", teil: "ergebnis" }));
  return out;
}

// 24. Baumdiagramm mit Pfadregel (Produkt) und Summenregel
function compTree(A) {
  const stages = String(A("stufen") || "1/2:Kopf; 1/2:Zahl").split("|").map((st) => st.split(";").map((b) => { const [p, ...l] = b.split(":"); return { p: parseFrac(p), l: l.join(":").trim() }; }).filter((b) => b.p)).filter((s) => s.length).slice(0, 3);
  if (!stages.length) return [];
  const paths = String(A("pfad") || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((s) => s.split("-").map((v) => Math.round(N(v, 0)) - 1));
  const x0 = 70, x1 = 690, y0 = 80, y1 = 560, out = [], colW = (x1 - x0) / stages.length;
  let nodes = [{ x: x0, y: (y0 + y1) / 2, path: [], probs: [] }];
  out.push(dot(x0, (y0 + y1) / 2, C.ink, "start", 7));
  stages.forEach((st, si) => {
    const next = [], leaves = nodes.length * st.length, slot = (y1 - y0) / leaves;
    nodes.forEach((nd, ni) => st.forEach((br, bi) => {
      const idx = ni * st.length + bi, nx = x0 + (si + 1) * colW, ny = y0 + slot * (idx + 0.5);
      const path = [...nd.path, bi], hot = paths.some((p) => p.slice(0, path.length).join() === path.join() && p.length >= path.length);
      const teil = `ast ast-${path.map((v) => v + 1).join("-")}${hot ? " pfad" : ""} stufe-${si + 1}`;
      out.push(ln(nd.x, nd.y, nx - 8, ny, hot ? C.red : C.ink, hot ? 5 : 3, teil, true));
      const mx = (nd.x + nx) / 2, my = (nd.y + ny) / 2;
      out.push(tx(mx, my + (ny < nd.y ? -10 : 28), br.p.txt, { size: Math.max(18, Math.min(28, slot * 0.55)), fill: hot ? C.red : C.blue, teil }));
      out.push(tx(nx + 4, ny + 8, br.l, { size: Math.max(16, Math.min(26, slot * 0.5)), anchor: "start", fill: hot ? C.red : C.ink, teil }));
      next.push({ x: nx + Math.min(110, 10 + br.l.length * 13), y: ny, path, probs: [...nd.probs, br.p] });
    }));
    nodes = next;
  });
  const leafSize = Math.max(16, Math.min(26, ((y1 - y0) / nodes.length) * 0.5));
  let sum = []; nodes.forEach((nd) => {
    const hot = paths.some((p) => p.join() === nd.path.join()), prod = mulFracs(nd.probs);
    if (hot) sum.push(prod);
    out.push(tx(Math.max(nd.x, x1 + 40), nd.y + 8, `${nd.probs.map((p) => p.txt).join(" · ")} = ${prod.txt}`, { size: leafSize, anchor: "start", fill: hot ? C.red : C.grey, teil: `blatt blatt-${nd.path.map((v) => v + 1).join("-")}${hot ? " pfad produkt" : ""}` }));
  });
  if (sum.length > 1) {
    const all = sum.every((f) => f.n != null) ? (() => { let n = 0, d = 1; sum.forEach((f) => { n = n * f.d + f.n * d; d *= f.d; const g = gcd(n, d); n /= g; d /= g; }); return d === 1 ? String(n) : `${n}/${d}`; })() : fmtN(sum.reduce((a, f) => a + f.v, 0), 4);
    out.push(tx(500, 590, `Summe der Pfade: ${sum.map((f) => f.txt).join(" + ")} = ${all}`, { size: 30, fill: C.red, teil: "summe ergebnis" }));
  }
  return out;
}

// 25. Normalverteilung: Glockenkurve, μ, σ-Bereiche mit 68 / 95 / 99,7 %
function compNormal(A) {
  const mu = N(A("mu") ?? A("mittelwert"), 0), sg = Math.abs(N(A("sigma") ?? A("standardabweichung"), 1)) || 1, band = clampN(Math.round(N(A("band"), 2)), 0, 3);
  const x = 80, y = 110, w = 840, h = 360, X = (v) => x + ((v - (mu - 3.6 * sg)) / (7.2 * sg)) * w, pdf = (v) => Math.exp(-0.5 * ((v - mu) / sg) ** 2), Y = (p) => y + h - p * h * 0.92, out = [];
  if (band) {
    const pts = [`${X(mu - band * sg)},${Y(0)}`]; for (let i = 0; i <= 80; i++) { const v = mu - band * sg + (2 * band * sg * i) / 80; pts.push(`${X(v).toFixed(1)},${Y(pdf(v)).toFixed(1)}`); } pts.push(`${X(mu + band * sg)},${Y(0)}`);
    out.push(S("polygon", { points: pts.join(" "), stroke: "none", fill: C.blue, teil: `band band-${band}` }));
  }
  let d = ""; for (let i = 0; i <= 160; i++) { const v = mu - 3.6 * sg + (7.2 * sg * i) / 160; d += (i ? " L" : "M") + X(v).toFixed(1) + " " + Y(pdf(v)).toFixed(1); }
  out.push(ln(x - 10, Y(0), x + w + 10, Y(0), C.ink, 3, "achse", true));
  out.push(S("path", { d, stroke: C.ink, "stroke-width": 4, fill: "none", teil: "kurve glocke", "data-p": 1 }));
  out.push(ln(X(mu), Y(0), X(mu), Y(1), C.red, 3, "mittelwert", true));
  out.push(tx(X(mu), Y(1) - 14, `μ = ${fmtN(mu)}`, { size: 30, fill: C.red, teil: "mittelwert" }));
  for (let k = -3; k <= 3; k++) { if (!k) continue; out.push(ln(X(mu + k * sg), Y(0) - 8, X(mu + k * sg), Y(0) + 8, C.ink, 2, `sigma sigma-${Math.abs(k)}`, true)); out.push(tx(X(mu + k * sg), Y(0) + 34, fmtN(mu + k * sg), { size: 22, fill: C.grey, teil: `sigma sigma-${Math.abs(k)}` })); out.push(tx(X(mu + k * sg), Y(0) + 60, `${k > 0 ? "+" : "−"}${Math.abs(k)}σ`, { size: 20, fill: C.grey, teil: `sigma sigma-${Math.abs(k)}` })); }
  out.push(tx(X(mu), Y(0) + 34, fmtN(mu), { size: 22, fill: C.red, teil: "mittelwert" }));
  const pct = { 1: "68 %", 2: "95 %", 3: "99,7 %" };
  if (band) { out.push(tx(X(mu), Y(0.35), pct[band], { size: 40, fill: C.blue, teil: `band prozent band-${band}` })); out.push(tx(500, Y(0) + 106, `${pct[band]} aller Werte liegen zwischen ${fmtN(mu - band * sg)} und ${fmtN(mu + band * sg)} (μ ± ${band}σ)`, { size: 30, fill: C.blue, teil: "band ergebnis" })); }
  return out;
}

// 26. Auswahl / Kombinatorik: Plätze füllen, mit oder ohne Reihenfolge
function compChoose(A) {
  const n = clampN(Math.round(N(A("n"), 5)), 1, 20), k = clampN(Math.round(N(A("k"), 3)), 1, Math.min(n, 8));
  const ordered = /^(ja|true|1)$/i.test(String(A("reihenfolge") || "nein")), repeat = /^(ja|true|1)$/i.test(String(A("zuruecklegen") || "nein"));
  const out = [], bw = Math.min(130, 760 / k), x0 = 500 - (k * bw) / 2, fact = (m) => { let r = 1; for (let i = 2; i <= m; i++) r *= i; return r; };
  const nums = []; for (let i = 0; i < k; i++) nums.push(repeat ? n : n - i);
  nums.forEach((v, i) => {
    out.push(S("rect", { x: x0 + i * bw + 8, y: 150, width: bw - 16, height: 110, stroke: C.blue, "stroke-width": 4, fill: C.blue, teil: `platz platz-${i + 1}`, "data-p": 1 }));
    out.push(tx(x0 + i * bw + bw / 2, 222, String(v), { size: 52, teil: `platz platz-${i + 1}` }));
    out.push(tx(x0 + i * bw + bw / 2, 296, `${i + 1}. Platz`, { size: 22, fill: C.grey, teil: `platz platz-${i + 1}` }));
    if (i < k - 1) out.push(tx(x0 + (i + 1) * bw, 222, "·", { size: 46, fill: C.grey, teil: "produkt" }));
  });
  const prod = nums.reduce((a, b) => a * b, 1);
  out.push(tx(500, 110, `${n} zur Auswahl, ${k} ${k === 1 ? "Platz" : "Plätze"}${repeat ? ", mit Zurücklegen" : ""}`, { size: 30, fill: C.grey, teil: "aufgabe" }));
  out.push(tx(500, 370, `${nums.join(" · ")} = ${prod}${ordered || repeat ? "  Möglichkeiten (Reihenfolge zählt)" : ""}`, { size: 36, fill: ordered || repeat ? C.red : C.ink, teil: `produkt${ordered || repeat ? " ergebnis" : ""}` }));
  if (!ordered && !repeat) {
    out.push(tx(500, 440, `Reihenfolge egal → durch ${k}! = ${fact(k)} teilen (so oft lässt sich jede Gruppe umordnen)`, { size: 26, fill: "#7b3fc4", teil: "ordnung fakultaet" }));
    out.push(tx(500, 510, `${prod} : ${fact(k)} = ${prod / fact(k)}   =  (${n} über ${k})`, { size: 40, fill: C.red, teil: "ergebnis binomial" }));
  }
  return out;
}

// 27. Einheitskreis: Winkel, sin und cos als Strecken, Werte
function compUnitCircle(A) {
  const deg = N(A("winkel"), 30), a = (deg * Math.PI) / 180, cx = 330, cy = 330, R = 220, out = [];
  const px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);
  const exact = { 0: ["0", "1", "0"], 30: ["1/2", "√3/2", "√3/3"], 45: ["√2/2", "√2/2", "1"], 60: ["√3/2", "1/2", "√3"], 90: ["1", "0", "–"], 180: ["0", "−1", "0"], 270: ["−1", "0", "–"], 360: ["0", "1", "0"] }[((deg % 360) + 360) % 360 === 0 && deg ? 360 : ((deg % 360) + 360) % 360];
  out.push(...arrowLine(cx - R - 40, cy, cx + R + 50, cy, C.ink, 3, "x-achse"), ...arrowLine(cx, cy + R + 40, cx, cy - R - 50, C.ink, 3, "y-achse"));
  out.push(S("circle", { cx, cy, r: R, stroke: C.grey, "stroke-width": 3, fill: "none", teil: "kreis einheitskreis", "data-p": 1 }));
  out.push(tx(cx + R + 8, cy + 30, "1", { size: 24, fill: C.grey, teil: "kreis" }), tx(cx - 14, cy - R - 8, "1", { size: 24, fill: C.grey, teil: "kreis" }));
  const ar = 56; out.push(S("path", { d: `M${cx + ar} ${cy} A${ar} ${ar} 0 ${deg % 360 > 180 ? 1 : 0} 0 ${cx + ar * Math.cos(a)} ${cy - ar * Math.sin(a)}`, stroke: "#7b3fc4", "stroke-width": 4, fill: "none", teil: "winkel", "data-p": 1 }));
  out.push(tx(cx + 84 * Math.cos(a / 2), cy - 84 * Math.sin(a / 2) + 8, `${fmtN(deg)}°`, { size: 26, fill: "#7b3fc4", teil: "winkel" }));
  out.push(ln(cx, cy, px, py, C.ink, 4, "radius", true));
  out.push(ln(cx, cy, px, cy, C.blue, 7, "cosinus cos", true));
  out.push(ln(px, cy, px, py, C.red, 7, "sinus sin", true));
  out.push(dot(px, py, C.ink, "punkt", 10));
  out.push(tx(px + (Math.cos(a) >= 0 ? 16 : -16), py - 14, "P(cos α | sin α)", { size: 24, anchor: Math.cos(a) >= 0 ? "start" : "end", teil: "punkt" }));
  const sv = Math.sin(a), cv = Math.cos(a), tv = Math.abs(cv) < 1e-9 ? NaN : sv / cv, R3 = 660;
  out.push(tx(R3, 170, `sin ${fmtN(deg)}° = ${exact ? exact[0] + " ≈ " : ""}${fmtN(sv, 3)}`, { size: 32, fill: C.red, anchor: "start", teil: "sinus sin" }));
  out.push(tx(R3, 230, `cos ${fmtN(deg)}° = ${exact ? exact[1] + " ≈ " : ""}${fmtN(cv, 3)}`, { size: 32, fill: C.blue, anchor: "start", teil: "cosinus cos" }));
  out.push(tx(R3, 290, `tan ${fmtN(deg)}° = ${isFinite(tv) ? (exact ? exact[2] + " ≈ " : "") + fmtN(tv, 3) : "nicht definiert"}`, { size: 32, fill: "#f07c1a", anchor: "start", teil: "tangens tan" }));
  out.push(tx(R3, 360, "rot = sin (Höhe)", { size: 24, fill: C.red, anchor: "start", teil: "sinus" }), tx(R3, 396, "blau = cos (Breite)", { size: 24, fill: C.blue, anchor: "start", teil: "cosinus" }), tx(R3, 432, "tan = sin / cos", { size: 24, fill: "#f07c1a", anchor: "start", teil: "tangens" }));
  out.push(tx(R3, 490, "sin² + cos² = 1", { size: 28, fill: C.ink, anchor: "start", teil: "pythagoras" }));
  return out;
}

// 28. Vektoren im Gitter: Pfeile, Addition (Spitze an Fuß), Betrag
function compVectors(A) {
  const vs = String(A("vektoren") || "a=3,1; b=1,2").split(";").map((s) => { const m = s.trim().match(/^([a-zA-Z]\w*)\s*=\s*\(?\s*(-?[\d.,]+)\s*[|,;\s]\s*(-?[\d.,]+)\s*\)?$/); return m ? { n: m[1], x: N(m[2], 0), y: N(m[3], 0) } : null; }).filter(Boolean).slice(0, 3);
  if (!vs.length) return [];
  const sum = /^(ja|true|1)$/i.test(String(A("summe") || "nein")) && vs.length >= 2, diff = /^(ja|true|1)$/i.test(String(A("differenz") || "nein")) && vs.length >= 2;
  const pts = [[0, 0]]; let cxs = 0, cys = 0; vs.forEach((v) => { pts.push([v.x, v.y]); cxs += v.x; cys += v.y; pts.push([cxs, cys]); });
  if (diff) pts.push([vs[0].x - vs[1].x, vs[0].y - vs[1].y]);
  const mnx = Math.min(...pts.map((p) => p[0])) - 1, mxx = Math.max(...pts.map((p) => p[0])) + 1, mny = Math.min(...pts.map((p) => p[1])) - 1, mxy = Math.max(...pts.map((p) => p[1])) + 1;
  const sz = Math.min(560 / (mxx - mnx), 480 / (mxy - mny)), ox = 60 + (-mnx) * sz, oy = 80 + mxy * sz, P = (vx, vy) => [ox + vx * sz, oy - vy * sz], out = [];
  for (let i = Math.ceil(mnx); i <= mxx; i++) out.push(ln(P(i, 0)[0], P(0, mny)[1], P(i, 0)[0], P(0, mxy)[1], i === 0 ? C.ink : "#e3ded3", i === 0 ? 3 : 1.5, "gitter", true));
  for (let j = Math.ceil(mny); j <= mxy; j++) out.push(ln(P(mnx, 0)[0], P(0, j)[1], P(mxx, 0)[0], P(0, j)[1], j === 0 ? C.ink : "#e3ded3", j === 0 ? 3 : 1.5, "gitter", true));
  const cols = [C.blue, C.green, "#f07c1a"]; let bx = 0, by = 0;
  vs.forEach((v, i) => {
    const sx = sum ? bx : 0, sy = sum ? by : 0, [x1, y1] = P(sx, sy), [x2, y2] = P(sx + v.x, sy + v.y);
    out.push(...arrowLine(x1, y1, x2, y2, cols[i], 5, `vektor-${v.n.toLowerCase()} vektor`));
    out.push(tx((x1 + x2) / 2 - 16, (y1 + y2) / 2 - 12, `${v.n} = (${fmtN(v.x)}|${fmtN(v.y)})`, { size: 28, fill: cols[i], anchor: "end", teil: `vektor-${v.n.toLowerCase()}` }));
    if (sum && i > 0) { const [c1, d1] = P(0, 0), [c2, d2] = P(v.x, v.y); out.push(S("line", { x1: c1, y1: d1, x2: c2, y2: d2, stroke: cols[i], "stroke-width": 2, "stroke-dasharray": "8 6", teil: `vektor-${v.n.toLowerCase()} parallelogramm`, "data-p": 1 })); }
    bx += v.x; by += v.y;
  });
  const R = 640;
  if (sum) { const [x1, y1] = P(0, 0), [x2, y2] = P(bx, by); out.push(...arrowLine(x1, y1, x2, y2, C.red, 6, "summe ergebnis")); out.push(tx(R, 150, `${vs.map((v) => v.n).join(" + ")} = (${fmtN(bx)}|${fmtN(by)})`, { size: 32, fill: C.red, anchor: "start", teil: "summe ergebnis" })); out.push(tx(R, 190, "Spitze an Fuß hängen", { size: 24, fill: C.grey, anchor: "start", teil: "summe regel" })); }
  if (diff) { const dx = vs[0].x - vs[1].x, dy = vs[0].y - vs[1].y, [x1, y1] = P(vs[1].x, vs[1].y), [x2, y2] = P(vs[0].x, vs[0].y); out.push(...arrowLine(x1, y1, x2, y2, "#7b3fc4", 5, "differenz")); out.push(tx(R, 250, `${vs[0].n} − ${vs[1].n} = (${fmtN(dx)}|${fmtN(dy)})`, { size: 32, fill: "#7b3fc4", anchor: "start", teil: "differenz" })); }
  const bn = String(A("betrag") || "").trim(); const bv = vs.find((v) => v.n === bn);
  if (bv) { const L = Math.hypot(bv.x, bv.y); out.push(tx(R, 330, `|${bv.n}| = √(${fmtN(bv.x)}² + ${fmtN(bv.y)}²)`, { size: 30, anchor: "start", teil: `betrag betrag-${bn.toLowerCase()}` })); out.push(tx(R, 372, `= √${fmtN(bv.x * bv.x + bv.y * bv.y)} ≈ ${fmtN(L)}`, { size: 30, fill: C.red, anchor: "start", teil: `betrag betrag-${bn.toLowerCase()} ergebnis` })); }
  return out;
}

// 29. Kreis: Radius, Durchmesser, Fläche und Umfang berechnet
function compCircle(A) {
  const r = N(A("r") ?? A("radius"), 5), u = String(A("einheit") || "cm"), cx = 300, cy = 320, R = 210, out = [];
  out.push(S("circle", { cx, cy, r: R, stroke: C.blue, "stroke-width": 5, fill: C.blue, teil: "flaeche kreis", "data-p": 1 }));
  out.push(S("circle", { cx, cy, r: R, stroke: C.red, "stroke-width": 5, fill: "none", teil: "umfang", "data-p": 1 }));
  out.push(ln(cx, cy, cx + R, cy, C.ink, 5, "radius", true), dot(cx, cy, C.ink, "mittelpunkt", 6));
  out.push(tx(cx + R / 2, cy - 14, `r = ${fmtN(r)} ${u}`, { size: 30, teil: "radius" }));
  out.push(S("line", { x1: cx - R * 0.7071, y1: cy + R * 0.7071, x2: cx + R * 0.7071, y2: cy - R * 0.7071, stroke: C.grey, "stroke-width": 3, "stroke-dasharray": "10 8", teil: "durchmesser", "data-p": 1 }));
  out.push(tx(cx - R * 0.45, cy + R * 0.45 + 40, `d = 2r = ${fmtN(2 * r)} ${u}`, { size: 26, fill: C.grey, teil: "durchmesser" }));
  const Rx = 590;
  out.push(tx(Rx, 200, "Fläche:", { size: 30, fill: C.blue, anchor: "start", teil: "flaeche" }));
  out.push(tx(Rx, 248, `A = π · r² = π · ${fmtN(r)}²`, { size: 32, anchor: "start", teil: "flaeche formel" }));
  out.push(tx(Rx, 296, `= ${fmtN(Math.PI * r * r)} ${u}²`, { size: 36, fill: C.red, anchor: "start", teil: "flaeche ergebnis" }));
  out.push(tx(Rx, 380, "Umfang:", { size: 30, fill: C.red, anchor: "start", teil: "umfang" }));
  out.push(tx(Rx, 428, `U = 2 · π · r = ${fmtN(2 * Math.PI * r)} ${u}`, { size: 32, anchor: "start", teil: "umfang formel ergebnis" }));
  out.push(tx(Rx, 490, "π ≈ 3,14", { size: 26, fill: C.grey, anchor: "start", teil: "pi" }));
  return out;
}

// 30. Vieleck mit Diagonalen: n·(n−3)/2
function compPolygon(A) {
  const n = clampN(Math.round(N(A("n") ?? A("ecken"), 6)), 3, 12), cx = 300, cy = 320, R = 220, out = [];
  const P = (i) => [cx + R * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), cy + R * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n)];
  out.push(S("polygon", { points: Array.from({ length: n }, (_, i) => P(i).map((v) => v.toFixed(1)).join(",")).join(" "), stroke: C.ink, "stroke-width": 4, fill: "#ffffff", teil: "vieleck", "data-p": 1 }));
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; const [a1, b1] = P(i), [a2, b2] = P(j); out.push(ln(a1, b1, a2, b2, i === 0 ? C.red : "#9fb6d8", i === 0 ? 4 : 2, i === 0 ? "von-einer-ecke diagonalen" : "diagonalen alle", true)); }
  for (let i = 0; i < n; i++) { const [a1, b1] = P(i); out.push(dot(a1, b1, i === 0 ? C.red : C.ink, `ecke ecke-${i + 1}`, 8)); }
  const Rx = 590, d = (n * (n - 3)) / 2;
  out.push(tx(Rx, 200, `${n} Ecken`, { size: 32, anchor: "start", teil: "ecke" }));
  out.push(tx(Rx, 250, `von einer Ecke: ${n} − 3 = ${n - 3} Diagonalen`, { size: 28, fill: C.red, anchor: "start", teil: "von-einer-ecke" }));
  out.push(tx(Rx, 300, `(nicht zu sich selbst und den 2 Nachbarn)`, { size: 22, fill: C.grey, anchor: "start", teil: "von-einer-ecke" }));
  out.push(tx(Rx, 370, `alle: ${n} · ${n - 3} : 2 = ${d}`, { size: 34, fill: C.ink, anchor: "start", teil: "diagonalen ergebnis" }));
  out.push(tx(Rx, 412, "(: 2, sonst jede doppelt gezählt)", { size: 22, fill: C.grey, anchor: "start", teil: "diagonalen" }));
  return out;
}
Object.assign(COMPONENTS, { "analyse": compAnalysis, "prozent": compPercent, "einheiten": compUnits, "potenzen": compPowers, "baum": compTree, "normalverteilung": compNormal, "auswahl": compChoose, "einheitskreis": compUnitCircle, "vektoren": compVectors, "kreis": compCircle, "vieleck": compPolygon });


// 31. Kreislauf (Citratzyklus, Calvin-Zyklus, Harnstoffzyklus, Herzzyklus …): Stationen im Kreis, Enzyme an den Pfeilen, Nebenprodukte außen
function compCycle(A) {
  const st = String(A("schritte") || "").split(";").map((t) => t.trim()).filter(Boolean).slice(0, 12);
  if (st.length < 2) return [];
  const enz = String(A("enzyme") || "").split(";").map((t) => t.trim());
  const extra = {}; String(A("extras") || "").split(";").forEach((e) => { const m = e.match(/^\s*(\d+)\s*:\s*(.+)$/); if (m) extra[+m[1] - 1] = m[2].trim(); });
  const cx = N(A("cx"), 500), cy = N(A("cy"), 345), rx = N(A("rx"), 300), ry = N(A("ry"), 190), n = st.length, out = [];
  const ang = (t) => -Math.PI / 2 + (2 * Math.PI * t) / n, E = (t, d = 0) => [cx + (rx + d) * Math.cos(ang(t)), cy + (ry + d * 0.7) * Math.sin(ang(t))];
  const slugT = (t) => slug(t).slice(0, 30) || "station";
  if (A("mitte")) out.push(tx(cx, cy + 12, A("mitte"), { size: 34, fill: C.red, teil: "zyklus kreislauf" }));
  const bw = (t) => Math.min(170, Math.max(84, t.length * 11 + 22));
  for (let i = 0; i < n; i++) {
    // Bogen zwischen den Kästchen (Start/Ende um die halbe Kästchenbreite eingerückt)
    const pts = []; for (let k = 0; k <= 24; k++) pts.push(E(i + k / 24));
    const [ax, ay] = E(i), [bx, by] = E(i + 1), wa = bw(st[i]) / 2 + 6, wb = bw(st[(i + 1) % n]) / 2 + 6;
    const inBox = (p, c, w) => Math.abs(p[0] - c[0]) < w && Math.abs(p[1] - c[1]) < 28;
    const seg = pts.filter((p) => !inBox(p, [ax, ay], wa) && !inBox(p, [bx, by], wb));
    if (seg.length < 2) continue;
    const tE = `schritt-${i + 1} reaktion-${i + 1}${enz[i] ? " " + slugT(enz[i]) : ""}`;
    out.push(S("polyline", { points: seg.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" "), stroke: C.ink, "stroke-width": 3, fill: "none", teil: tE, "data-p": 1 }));
    const [ex, ey] = seg[seg.length - 1], [px, py] = seg[seg.length - 2], ta = Math.atan2(ey - py, ex - px), L = 14;
    out.push(S("path", { d: `M${(ex - L * Math.cos(ta - 0.5)).toFixed(1)} ${(ey - L * Math.sin(ta - 0.5)).toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)} L${(ex - L * Math.cos(ta + 0.5)).toFixed(1)} ${(ey - L * Math.sin(ta + 0.5)).toFixed(1)}`, stroke: C.ink, "stroke-width": 3, fill: "none", teil: tE, "data-p": 1 }));
    const am = ang(i + 0.5), right = Math.cos(am) >= 0.15, left = Math.cos(am) <= -0.15, anchor = right ? "start" : left ? "end" : "middle";
    if (enz[i]) { const [lx, ly] = E(i + 0.5, -34 - 26 * Math.abs(Math.sin(am))); out.push(tx(lx, ly + 6, enz[i], { size: 19, fill: "#7b3fc4", anchor: right ? "end" : left ? "start" : "middle", teil: tE + " enzym" })); }
    if (extra[i]) { const [lx, ly] = E(i + 0.5, 22); out.push(tx(lx, ly + 6, "→ " + extra[i], { size: 20, fill: C.green, anchor, teil: tE + " produkt" })); }
  }
  for (let i = 0; i < n; i++) {
    const [px, py] = E(i), t = `station-${i + 1} ${slugT(st[i])}`, w = bw(st[i]);
    out.push(S("rect", { x: px - w / 2, y: py - 22, width: w, height: 44, stroke: C.blue, "stroke-width": 3, fill: "#ffffff", teil: t, "data-p": 1 }));
    out.push(tx(px, py + 8, st[i], { size: Math.min(22, (w - 12) / (st[i].length * 0.52)), fill: C.blue, teil: t }));
  }
  return out;
}
// 32. Kette / Signalweg / Kaskade: Stationen nacheinander (Glykolyse, Gerinnung, Reizleitung, Proteinbiosynthese …)
function compChain(A) {
  const st = String(A("schritte") || "").split(";").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  if (st.length < 2) return [];
  const lab = String(A("pfeile") || A("enzyme") || "").split(";").map((t) => t.trim());
  const n = st.length, cols = Math.min(n, N(A("spalten"), n > 5 ? Math.ceil(n / 2) : n)), rows = Math.ceil(n / cols);
  const x0 = 60, w = 880, cw = w / cols, rh = Math.min(200, 420 / rows), y0 = 120, out = [];
  const pos = st.map((_, i) => { const r = Math.floor(i / cols), c = r % 2 ? cols - 1 - (i % cols) : i % cols; return [x0 + cw * c + cw / 2, y0 + rh * r + 40]; });
  st.forEach((t, i) => {
    const [px, py] = pos[i], bw = Math.min(cw - 30, Math.max(110, t.length * 12 + 26)), tl = `station-${i + 1} ${slug(t).slice(0, 30)}`;
    out.push(S("rect", { x: px - bw / 2, y: py - 26, width: bw, height: 52, stroke: C.blue, "stroke-width": 3, fill: "#ffffff", teil: tl, "data-p": 1 }));
    out.push(tx(px, py + 8, t, { size: 22, fill: C.blue, teil: tl }));
    if (i < n - 1) {
      const [qx, qy] = pos[i + 1], te = `schritt-${i + 1}${lab[i] ? " " + slug(lab[i]).slice(0, 30) : ""}`;
      const same = Math.abs(qy - py) < 1, dir = Math.sign(qx - px);
      const ax = same ? px + dir * (bw / 2 + 4) : px, ay = same ? py : py + 28, bx = same ? qx - dir * (Math.min(cw - 30, Math.max(110, st[i + 1].length * 12 + 26)) / 2 + 4) : qx, by = same ? qy : qy - 28;
      out.push(...arrowLine(ax, ay, bx, by, C.ink, 3, te));
      if (lab[i]) out.push(tx((ax + bx) / 2 + (same ? 0 : 14), (ay + by) / 2 + (same ? -12 : 6), lab[i], { size: 18, fill: "#7b3fc4", anchor: same ? "middle" : "start", teil: te + " enzym" }));
    }
  });
  return out;
}
Object.assign(COMPONENTS, { "kreislauf": compCycle, "kette": compChain });
// ================= Layout-Bausteine für alle Fächer: die KI liefert Inhalte, das Programm ordnet an =================
const tw = (t, size) => String(t).length * size * (MODERN ? 0.54 : 0.5); // grobe Textbreite
function wrapWords(t, maxChars, max = 3) {                          // Zeilenumbruch nach Wörtern
  // Wörter, die länger als eine Zeile sind, mit Trennstrich teilen (zuerst an vorhandenen Bindestrichen)
  const words = [];
  for (const w of String(t).split(/\s+/)) {
    if (w.length <= maxChars) { words.push(w); continue; }
    let rest = w;
    while (rest.length > maxChars) { let cut = rest.lastIndexOf("-", maxChars - 1); if (cut < 3) cut = maxChars - 1; words.push(rest.slice(0, cut + (rest[cut] === "-" ? 1 : 0)) + (rest[cut] === "-" ? "" : "-")); rest = rest.slice(cut + (rest[cut] === "-" ? 1 : 0)); }
    if (rest) words.push(rest);
  }
  const lines = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur); return lines.slice(0, max);
}
function boxText(cx, cy, t, o) {                                    // Kästchen mit (umbrochenem) Text
  const size = o.size || 24, lines = wrapWords(t, o.chars || 18), lh = size * 1.15;
  const w = o.w || Math.max(90, Math.max(...lines.map((l) => tw(l, size))) + 28), h = o.h || lines.length * lh + 22, out = [];
  out.push(S("rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 10, stroke: o.color || C.blue, "stroke-width": o.sw || 3, fill: o.fill || "#ffffff", teil: o.teil, "data-p": 1 }));
  lines.forEach((l, i) => out.push(tx(cx, cy - ((lines.length - 1) * lh) / 2 + i * lh + size * 0.35, l, { size, fill: o.textColor || o.color || C.blue, teil: o.teil })));
  return { out, w, h };
}
const keyOf = (t) => slug(t).slice(0, 30) || "punkt";
const PALE = ["#1f6fd1", "#2a9d4b", "#f07c1a", "#7b3fc4", "#d62828", "#8b5a2b"];

// 33. Begriffsnetz / Flussdiagramm / Regelkreis – automatische Anordnung in Ebenen
function compNet(A) {
  const nodes = {}, order = [];
  String(A("knoten") || "").split(";").forEach((p) => { const m = p.match(/^\s*([a-z0-9_]+)\s*:\s*(.+?)\s*$/i); if (m && order.length < 14) { nodes[m[1]] = { id: m[1], label: m[2], out: [], inn: [] }; order.push(m[1]); } });
  const edges = [];
  String(A("kanten") || "").split(";").forEach((p) => { const m = p.match(/^\s*([a-z0-9_]+)\s*(-|>|<>)\s*([a-z0-9_]+)\s*(?::\s*(.+?))?\s*$/i); if (m && nodes[m[1]] && nodes[m[3]]) { edges.push({ a: m[1], b: m[3], type: m[2], label: m[4] || "" }); nodes[m[1]].out.push(m[3]); nodes[m[3]].inn.push(m[1]); } });
  if (!order.length) return [];
  // Ebenen: längster Weg von den Wurzeln (Kanten, die zurückführen, zählen nicht)
  const level = {}; order.forEach((k) => (level[k] = 0));
  const fwd = (e) => order.indexOf(e.a) < order.indexOf(e.b);
  for (let it = 0; it < order.length; it++) edges.forEach((e) => { if (fwd(e) && level[e.b] < level[e.a] + 1) level[e.b] = level[e.a] + 1; });
  const horiz = /rechts|horizontal/i.test(String(A("richtung") || ""));
  const layers = []; order.forEach((k) => { (layers[level[k]] = layers[level[k]] || []).push(k); });
  const L = layers.length, x0 = 50, y0 = 100, W = 900, H = 470, out = [], pos = {};
  layers.forEach((ly, li) => ly.forEach((k, j) => {
    const a = (li + 0.5) / L, b = (j + 0.5) / ly.length;
    pos[k] = horiz ? [x0 + a * W, y0 + b * H] : [x0 + b * W, y0 + a * H];
  }));
  const maxPer = Math.max(...layers.map((l) => l.length)), boxW = horiz ? Math.min(200, W / L - 40) : Math.min(220, W / maxPer - 24);
  const sizes = {};
  order.forEach((k, i) => { const col = level[k] === 0 ? C.red : PALE[(i + level[k]) % PALE.length]; const r = boxText(pos[k][0], pos[k][1], nodes[k].label, { w: boxW, size: 22, chars: Math.max(8, Math.round(boxW / 12)), color: col, teil: `knoten ${k} ${keyOf(nodes[k].label)}` }); sizes[k] = r; });
  const boxes = []; order.forEach((k) => boxes.push(...sizes[k].out));
  edges.forEach((e, i) => {
    const [ax, ay] = pos[e.a], [bx, by] = pos[e.b], ha = sizes[e.a].h / 2 + 4, hb = sizes[e.b].h / 2 + 4, wa = sizes[e.a].w / 2 + 4, wb = sizes[e.b].w / 2 + 4;
    const back = !fwd(e);
    const te = `kante kante-${i + 1} ${e.a}-${e.b}${e.label ? " " + keyOf(e.label) : ""}`;
    const clip = (px, py, qx, qy, w, h) => { const dx = qx - px, dy = qy - py, t = Math.min(Math.abs(w / (dx || 1e-9)), Math.abs(h / (dy || 1e-9))); return [px + dx * Math.min(t, 1), py + dy * Math.min(t, 1)]; };
    if (back) {
      // Rückkopplung als Bogen außen herum
      const [sx, sy] = clip(ax, ay, bx, by, wa, ha), [ex, ey] = clip(bx, by, ax, ay, wb, hb), off = horiz ? [0, -140] : [170, 0];
      const cx = (sx + ex) / 2 + off[0], cy = (sy + ey) / 2 + off[1];
      out.push(S("path", { d: `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`, stroke: C.red, "stroke-width": 3, "stroke-dasharray": "10 7", fill: "none", teil: te + " rueckkopplung", "data-p": 1 }));
      const ang = Math.atan2(ey - cy, ex - cx);
      out.push(S("path", { d: `M${ex - 16 * Math.cos(ang - 0.45)} ${ey - 16 * Math.sin(ang - 0.45)} L${ex} ${ey} L${ex - 16 * Math.cos(ang + 0.45)} ${ey - 16 * Math.sin(ang + 0.45)}`, stroke: C.red, "stroke-width": 3, fill: "none", teil: te, "data-p": 1 }));
      if (e.label) out.push(tx(cx, cy + (horiz ? -8 : 6), e.label, { size: 20, fill: C.red, anchor: horiz ? "middle" : "start", teil: te }));
      return;
    }
    const [sx, sy] = clip(ax, ay, bx, by, wa, ha), [ex, ey] = clip(bx, by, ax, ay, wb, hb);
    if (e.type === "-") out.push(ln(sx, sy, ex, ey, C.ink, 3, te, true)); else out.push(...arrowLine(sx, sy, ex, ey, C.ink, 3, te, e.type === "<>"));
    if (e.label) { const flat = Math.abs(ey - sy) < 30; out.push(tx((sx + ex) / 2 + (flat ? 0 : 10), (sy + ey) / 2 + (flat ? -16 : 6), e.label, { size: 19, fill: "#7b3fc4", anchor: flat ? "middle" : "start", teil: te })); }
  });
  return [...out, ...boxes];
}

// 34. Vergleich nebeneinander (2–3 Spalten), Zeilen mit Merkmal und Werten, ✓/✗ farbig
function compCompare(A) {
  const cols = String(A("spalten") || "").split(";").map((t) => t.trim()).filter(Boolean).slice(0, 3);
  const rows = String(A("zeilen") || "").split(";").map((r) => { const [k, v] = r.split(":"); return { k: (k || "").trim(), v: (v || "").split("|").map((t) => t.trim()) }; }).filter((r) => r.k).slice(0, 7);
  if (!cols.length) return [];
  // Lange Zellen (z. B. „Gelenkflächen, Trachea, Rippenknorpel …“) passen nicht in eine Zeile: dann als Tabelle mit Umbruch
  if (rows.some((r) => r.v.some((v) => v.length > 16))) {
    const T = { spalten: ["Merkmal", ...cols].join("; "), zeilen: rows.map((r) => [r.k, ...cols.map((c, i) => r.v[i] || "")].join(" | ")).join("; ") };
    return compTable((k) => (k in T ? T[k] : A(k)));
  }
  const x0 = 40, keyW = rows.length ? 250 : 0, colW = (920 - keyW) / cols.length, y0 = 100, rh = Math.min(66, 440 / Math.max(1, rows.length + 1)), out = [];
  cols.forEach((c, i) => { const cx = x0 + keyW + colW * (i + 0.5); out.push(...boxText(cx, y0 + rh / 2, c, { w: colW - 20, h: rh - 10, size: 26, color: PALE[i], fill: PALE[i], textColor: C.ink, teil: `spalte-${i + 1} ${keyOf(c)}` }).out); });
  rows.forEach((r, j) => {
    const cy = y0 + rh * (j + 1.5);
    out.push(ln(x0, cy - rh / 2, x0 + 920, cy - rh / 2, "#e3ded3", 2, "linie", true));
    out.push(tx(x0 + 8, cy + 8, r.k, { size: 22, anchor: "start", fill: C.grey, teil: `zeile-${j + 1} ${keyOf(r.k)}` }));
    cols.forEach((c, i) => {
      const v = r.v[i] || "", cx = x0 + keyW + colW * (i + 0.5), yes = /^(ja|✓|\+)$/i.test(v), no = /^(nein|✗|−|-)$/i.test(v);
      out.push(tx(cx, cy + 9, yes ? "✓" : no ? "✗" : v, { size: yes || no ? 36 : 24, fill: yes ? C.green : no ? C.red : C.ink, teil: `zeile-${j + 1} spalte-${i + 1} ${keyOf(r.k)}` }));
    });
  });
  return out;
}

// 40. Tabelle: Kopfzeile + bis zu 9 Zeilen, Spaltenbreite und Schriftgröße passen sich dem Inhalt an
function compTable(A) {
  const split = (s, sep) => String(s || "").split(sep).map((t) => t.trim());
  const head = split(A("spalten"), /\s*[;|]\s*/).filter(Boolean).slice(0, 5);
  let rows = split(A("zeilen"), ";").filter(Boolean).map((r) => split(r, "|"));
  if (!rows.length) return [];
  const nc = Math.min(5, Math.max(head.length, ...rows.map((r) => r.length)));
  rows = rows.slice(0, 9).map((r) => Array.from({ length: nc }, (_, i) => r[i] || ""));
  const x0 = 40, W = 920, top = Number(A("y")) || 92, H = 570 - top;
  const len = (i) => Math.max(6, ...[head[i] || "", ...rows.map((r) => r[i])].map((t) => Math.min(t.length, 34)));
  const tot = Array.from({ length: nc }, (_, i) => len(i)).reduce((a, b) => a + b, 0);
  const longest = (i) => Math.max(...[head[i] || "", ...rows.map((r) => r[i])].flatMap((t) => t.split(/\s+/)).map((w) => w.length));
  let size = 32, cells, heights, cw;
  for (; size >= 16; size -= 1) {
    const lh = size * 1.18;
    // Spalten so breit, dass das längste Wort hineinpasst; den Rest nach Textmenge verteilen
    const minW = Array.from({ length: nc }, (_, i) => Math.max(110, longest(i) * size * 0.57 + 22));
    const free = W - minW.reduce((a, b) => a + b, 0);
    if (free < 0 && size > 16) continue;
    cw = minW.map((m, i) => m + Math.max(0, free) * len(i) / tot);
    cells = [head.length ? head : null, ...rows].filter(Boolean).map((r) => r.map((t, i) => wrapWords(t, Math.max(6, Math.floor((cw[i] - 18) / (size * 0.57))), 5)));
    heights = cells.map((r) => Math.max(...r.map((l) => l.length || 1)) * lh + 18);
    if (heights.reduce((a, b) => a + b, 0) <= H) break;
  }
  const out = [], lh = size * 1.18, hasHead = !!head.length;
  let y = top;
  cells.forEach((r, j) => {
    const h = heights[j], isHead = hasHead && j === 0, rowNo = hasHead ? j : j + 1, rk = rowNo > 0 ? keyOf(rows[rowNo - 1][0]) : "";
    const rowTeil = isHead ? "kopfzeile" : `zeile-${rowNo} ${rk}`;
    out.push(S("rect", { x: x0, y, width: W, height: h, fill: isHead ? "#eef3fb" : rowNo % 2 ? "#ffffff" : "#faf7f0", stroke: "#d9d2c3", "stroke-width": 1.5, teil: rowTeil, "data-p": 1 }));
    let x = x0;
    r.forEach((lines, i) => {
      const col = PALE[i % PALE.length], teil = isHead ? `kopfzeile spalte-${i + 1} ${keyOf(head[i] || "")}` : `zeile-${rowNo} spalte-${i + 1} ${rk}${i ? " " + keyOf(rows[rowNo - 1][i]) : ""}`;
      lines.forEach((l, q) => out.push(tx(x + 10, y + 9 + size * 0.85 + q * lh + (h - 18 - lines.length * lh) / 2, l, { size, anchor: "start", fill: isHead ? col : i === 0 ? C.blue : C.ink, teil })));
      if (i) out.push(ln(x, y, x, y + h, "#d9d2c3", 1.5, "linie", true));
      x += cw[i];
    });
    y += h;
  });
  out.forEach((o) => { if (o.tag === "text") o.attrs["data-placed"] = 1; });
  return out;
}

// 35. Phasen / Zeitstrahl: nummerierte Stationen mit kurzer Beschreibung
function compPhases(A) {
  const ph = String(A("phasen") || "").split(";").map((p) => { const i = p.indexOf(":"); return i < 0 ? { n: p.trim(), d: "" } : { n: p.slice(0, i).trim(), d: p.slice(i + 1).trim() }; }).filter((p) => p.n).slice(0, 7);
  if (!ph.length) return [];
  const n = ph.length, x0 = 70, x1 = 930, y = 210, step = (x1 - x0) / Math.max(1, n - 1), out = [];
  out.push(...arrowLine(x0 - 30, y, x1 + 40, y, C.grey, 4, "zeitstrahl"));
  ph.forEach((p, i) => {
    const cx = n === 1 ? 500 : x0 + step * i, col = PALE[i % PALE.length], t = `phase-${i + 1} ${keyOf(p.n)}`;
    out.push(S("circle", { cx, cy: y, r: 22, stroke: col, "stroke-width": 4, fill: col, teil: t, "data-p": 1 }));
    out.push(tx(cx, y + 9, String(i + 1), { size: 24, teil: t }));
    out.push(tx(cx, y - 44, p.n, { size: Math.min(26, (step - 10) / (p.n.length * 0.5)), fill: col, teil: t }));
    wrapWords(p.d, Math.max(10, Math.round(step / 13))).forEach((l, k) => out.push(tx(cx, y + 64 + k * 28, l, { size: 21, fill: C.ink, teil: t })));
  });
  return out;
}

// 36. Verschachtelte Räume (Zelle › Organell › Membran …) mit Inhalten
function compRooms(A) {
  const rooms = String(A("bereiche") || "").split(">").map((t) => t.trim()).filter(Boolean).slice(0, 5);
  if (!rooms.length) return [];
  const items = {}; String(A("inhalt") || "").split(";").forEach((p) => { const i = p.indexOf(":"); if (i > 0) { const k = keyOf(p.slice(0, i)); (items[k] = items[k] || []).push(...p.slice(i + 1).split(",").map((t) => t.trim()).filter(Boolean)); } });
  const out = [], n = rooms.length;
  rooms.forEach((r, i) => {
    const pad = i * 52, x = 60 + pad, y = 95 + pad * 0.78, w = 880 - 2 * pad, h = 470 - 2 * pad * 0.78, col = PALE[i % PALE.length], t = `bereich-${i + 1} ${keyOf(r)}`;
    out.push(S("rect", { x, y, width: w, height: h, rx: 60 - i * 8, stroke: col, "stroke-width": 4, fill: i === n - 1 ? col : "#ffffff", teil: t, "data-p": 1 }));
    out.push(tx(x + 22, y + 34, r, { size: 24, fill: col, anchor: "start", teil: t }));
    const its = (items[keyOf(r)] || []).slice(0, 4), inner = i === n - 1;
    its.forEach((it, k) => {
      const ix = inner ? x + w / 2 + (k - (its.length - 1) / 2) * Math.min(200, w / its.length) : x + w - 24, iy = inner ? y + h / 2 + 10 : y + 34 + k * 30;
      out.push(tx(ix, iy, "• " + it, { size: 21, fill: C.ink, anchor: inner ? "middle" : "end", teil: `${t} ${keyOf(it)}` }));
    });
  });
  return out;
}

// 37. Kurven-Diagramm (Bio/Physik/Chemie): typische Kurvenformen exakt gezeichnet, Hilfslinien beschriftet
const CURVES = {
  saettigung: (x) => x / (0.25 + x), sigmoid: (x) => 1 / (1 + Math.exp(-12 * (x - 0.45))), exponentiell: (x) => (Math.exp(3 * x) - 1) / (Math.exp(3) - 1),
  abfall: (x) => Math.exp(-3.5 * x), glocke: (x) => Math.exp(-((x - 0.5) ** 2) / 0.03), linear: (x) => x, optimum: (x) => Math.exp(-((x - 0.62) ** 2) / 0.02) * (x < 0.62 ? 1 : 1),
  logistisch: (x) => 1 / (1 + Math.exp(-10 * (x - 0.5))), saegezahn: (x) => (x * 4) % 1, schwingung: (x) => 0.5 + 0.4 * Math.sin(x * Math.PI * 4)
};
function compCurve(A) {
  const x = 110, y = 100, w = 780, h = 400, out = [], X = (v) => x + v * w, Y = (v) => y + h - v * h * 0.9;
  out.push(...arrowLine(x, y + h, x + w + 30, y + h, C.ink, 3, "x-achse"), ...arrowLine(x, y + h, x, y - 20, C.ink, 3, "y-achse"));
  out.push(tx(x + w + 30, y + h + 40, A("x-name") || "x", { size: 24, anchor: "end", teil: "x-achse" }), tx(x - 14, y - 26, A("y-name") || "y", { size: 24, anchor: "start", teil: "y-achse" }));
  const ks = String(A("kurven") || "saettigung").split(";").map((k) => { const [typ, name] = k.split(":").map((t) => (t || "").trim()); return { typ: typ.toLowerCase(), name: name || "" }; }).filter((k) => CURVES[k.typ]).slice(0, 3);
  ks.forEach((k, i) => {
    let d = ""; for (let s = 0; s <= 120; s++) { const v = s / 120; d += (s ? " L" : "M") + X(v).toFixed(1) + " " + Y(CURVES[k.typ](v)).toFixed(1); }
    const col = [C.red, C.blue, C.green][i], t = `kurve kurve-${i + 1}${k.name ? " " + keyOf(k.name) : ""}`;
    out.push(S("path", { d, stroke: col, "stroke-width": 4, fill: "none", teil: t, "data-p": 1 }));
    if (k.name) { const v = k.typ === "abfall" ? 0.12 : 0.92; out.push(tx(X(v), Y(CURVES[k.typ](v)) - 16, k.name, { size: 24, fill: col, anchor: k.typ === "abfall" ? "start" : "end", teil: t })); }
  });
  String(A("hlinien") || "").split(";").forEach((p, i) => { const m = p.match(/^\s*([\d.,]+)\s*:\s*(.+)$/); if (!m) return; const v = N(m[1], 0), t = `hlinie-${i + 1} ${keyOf(m[2])}`; out.push(S("line", { x1: x, y1: Y(v), x2: x + w, y2: Y(v), stroke: C.grey, "stroke-width": 2, "stroke-dasharray": "10 8", teil: t, "data-p": 1 })); out.push(tx(x - 10, Y(v) + 8, m[2], { size: 21, fill: C.grey, anchor: "end", teil: t })); });
  String(A("vlinien") || "").split(";").forEach((p, i) => { const m = p.match(/^\s*([\d.,]+)\s*:\s*(.+)$/); if (!m) return; const v = N(m[1], 0), t = `vlinie-${i + 1} ${keyOf(m[2])}`; out.push(S("line", { x1: X(v), y1: y + h, x2: X(v), y2: y, stroke: C.grey, "stroke-width": 2, "stroke-dasharray": "10 8", teil: t, "data-p": 1 })); out.push(tx(X(v), y + h + 34, m[2], { size: 21, fill: C.grey, teil: t })); });
  String(A("punkte") || "").split(";").forEach((p, i) => { const m = p.match(/^\s*([\d.,]+)\s*:\s*(.+)$/); if (!m || !ks[0]) return; const v = N(m[1], 0), yy = CURVES[ks[0].typ](v), t = `punkt-${i + 1} ${keyOf(m[2])}`; out.push(dot(X(v), Y(yy), C.ink, t, 9)); out.push(tx(X(v) + 14, Y(yy) - 12, m[2], { size: 22, anchor: "start", teil: t })); });
  return out;
}

// 38. Beschriftung: die KI zeichnet eine Form, das Programm setzt die Beschriftung sauber daneben (mit Hinweislinie)
function compLabel(A) {
  const t = (A("teil") || "").toLowerCase(), z = (A("ziel") || "").toLowerCase().trim();
  if (!z || !A("text")) return [];
  const e = document.createElementNS(SVGNS, "text");
  e.setAttribute("data-callout", z); e.setAttribute("font-size", A("groesse") || "24"); e.setAttribute("fill", A("farbe") || C.ink);
  e.setAttribute("x", "0"); e.setAttribute("y", "0"); if (TEIL_OK.test(t || z)) e.setAttribute("teil", (t || z) + " beschriftung");
  e.textContent = String(A("text")).slice(0, 40);
  return [{ raw: e }];
}
// nach dem Zeichnen: Beschriftungen links/rechts in Spalten verteilen, Linie zur Stelle
function placeCallouts(svg) {
  const cs = [...svg.querySelectorAll("text[data-callout]")];
  if (!cs.length) return;
  const vb = svg.viewBox.baseVal, mid = vb.x + vb.width / 2, items = [];
  cs.forEach((c) => {
    if (c.hasAttribute("data-ax")) { const ax = +c.getAttribute("data-ax"), ay = +c.getAttribute("data-ay"); items.push({ c, ax, ay, side: ax < mid ? "l" : "r", ex: ax }); return; }
    const tg = [...svg.querySelectorAll(`[data-teil~="${c.getAttribute("data-callout")}"]`)].filter((e) => !e.hasAttribute("data-callout") && !e.closest("text[data-callout]"));
    if (!tg.length) { c.remove(); return; }
    let bx = Infinity, by = Infinity, bx2 = -Infinity, by2 = -Infinity;
    tg.forEach((e) => { try { const b = e.getBBox(); if (!b.width && !b.height) return; bx = Math.min(bx, b.x); by = Math.min(by, b.y); bx2 = Math.max(bx2, b.x + b.width); by2 = Math.max(by2, b.y + b.height); } catch (err) {} });
    if (!isFinite(bx)) { c.remove(); return; }
    const ax = (bx + bx2) / 2, ay = (by + by2) / 2;
    items.push({ c, ax, ay, side: ax < mid ? "l" : "r", ex: ax < mid ? bx : bx2 });
  });
  for (const side of ["l", "r"]) {
    const col = items.filter((i) => i.side === side).sort((a, b) => a.ay - b.ay);
    let lastY = vb.y + 40;
    col.forEach((i) => { i.ly = Math.max(i.ay, lastY); lastY = i.ly + 38; });
    const over = lastY - (vb.y + vb.height - 10);
    if (over > 0) col.forEach((i) => (i.ly -= over));
    const minX = Math.min(...col.map((i) => i.ex), 1e9), maxX = Math.max(...col.map((i) => i.ex), -1e9);
    col.forEach((i) => {
      const lx = side === "l" ? Math.max(vb.x + 20, Math.min(minX - 34, vb.x + 250)) : Math.min(vb.x + vb.width - 20, Math.max(maxX + 34, vb.x + vb.width - 250));
      i.c.setAttribute("x", lx); i.c.setAttribute("y", i.ly + 8); i.c.setAttribute("text-anchor", side === "l" ? "end" : "start");
      try { const b = i.c.getBBox(), room = side === "l" ? lx - (vb.x + 8) : vb.x + vb.width - 8 - lx; if (b.width > room && room > 40) i.c.setAttribute("font-size", (parseFloat(i.c.getAttribute("font-size")) * room / b.width).toFixed(1)); i.c.setAttribute("data-placed", "1"); } catch (e) {}
      const l = document.createElementNS(SVGNS, "path");
      const tx0 = side === "l" ? lx + 8 : lx - 8;
      l.setAttribute("d", `M${tx0} ${i.ly} L${(tx0 + i.ex) / 2} ${i.ly} L${i.ex} ${i.ay}`);
      for (const [k, v] of [["stroke", "#7a756c"], ["stroke-width", "2"], ["fill", "none"]]) l.setAttribute(k, v);
      if (i.c.getAttribute("data-teil")) l.setAttribute("data-teil", i.c.getAttribute("data-teil"));
      const d = document.createElementNS(SVGNS, "circle");
      for (const [k, v] of [["cx", i.ex], ["cy", i.ay], ["r", "4"], ["fill", "#7a756c"]]) d.setAttribute(k, v);
      i.c.parentNode.insertBefore(l, i.c); i.c.parentNode.insertBefore(d, i.c);
    });
  }
}
// 41. Echte Lehrbuch-Abbildung (Gewebe, Organe, Querschnitte) – wird vom Bildmodell gezeichnet, einmal je Motiv (Zwischenspeicher)
const ABB = {};
function abbSchluessel(m, b) { return slug(m) + "|" + slug(b); }
function holeAbbildung(motiv, begriffe) {
  const k = abbSchluessel(motiv, begriffe);
  if (ABB[k]) return ABB[k];
  if (!lb.open) return null;                                       // im Archiv/Druck nichts neu zeichnen lassen (kostet)
  const liste = begriffe.split(";").map((t) => t.trim()).filter(Boolean).slice(0, 10);
  ABB[k] = callFn("lernblick-bild", {
    thema: motiv, art_label: "Beschriftungsbild", orientation: "querformat",
    art_regeln: "- Ein großer Gegenstand in der Mitte, fachlich exakt wie im Histologie- bzw. Anatomie-Lehrbuch, nichts daneben.\n- Beschriftungen waagerecht in hellen Feldern, links und rechts verteilt, dünne Linien genau zur gemeinten Stelle.\n- Viel Luft, keine Überschrift.",
    beschreibung: `In der Mitte groß: ${motiv}. Beschriftungen an dünnen Linien: ${liste.join(", ")}. Keine Überschrift, sonst kein Text.`,
    stil_text: "Style: precise scientific textbook illustration (histology/anatomy atlas), clean thin outlines, soft natural colors like a stained microscope section where fitting, white background. Labels in a clean sans-serif.",
  }).then((d) => {
    if (!d || !d.image_base64) throw new Error("kein Bild");
    const url = `data:${d.mime_type || "image/jpeg"};base64,${d.image_base64}`;
    ABB[k] = url;
    document.querySelectorAll(`[data-abb="${CSS.escape(k)}"]`).forEach(setzeAbbildung);
    return url;
  }).catch(() => { ABB[k] = "fehler"; document.querySelectorAll(`[data-abb="${CSS.escape(k)}"]`).forEach(setzeAbbildung); return null; });
  return ABB[k];
}
function setzeAbbildung(g) {
  const v = ABB[g.getAttribute("data-abb")];
  const img = g.querySelector("image"), t = g.querySelector("text");
  if (typeof v === "string" && v.startsWith("data:")) { img.setAttribute("href", v); img.style.display = ""; if (t) t.style.display = "none"; }
  else if (v === "fehler" && t) t.textContent = "Die Abbildung konnte gerade nicht gezeichnet werden.";
}
function compAbbildung(A) {
  const motiv = String(A("motiv") || "").slice(0, 160), begriffe = String(A("begriffe") || "").slice(0, 400);
  if (!motiv) return [];
  const k = abbSchluessel(motiv, begriffe);
  holeAbbildung(motiv, begriffe);
  const g = document.createElementNS(SVGNS, "g");
  g.setAttribute("data-abb", k); g.setAttribute("data-teil", "abbildung " + slug(motiv)); g.setAttribute("teil", "abbildung " + slug(motiv));
  const r = document.createElementNS(SVGNS, "rect");
  for (const [a, v] of Object.entries({ x: 40, y: 92, width: 920, height: 480, rx: 14, fill: "#f6f3ec", stroke: "#e3ded3" })) r.setAttribute(a, v);
  const t = document.createElementNS(SVGNS, "text");
  for (const [a, v] of Object.entries({ x: 500, y: 340, "text-anchor": "middle", "font-size": 26, fill: "#7a7466" })) t.setAttribute(a, v);
  t.textContent = "✏️ Die Abbildung wird gezeichnet …";
  const im = document.createElementNS(SVGNS, "image");
  for (const [a, v] of Object.entries({ x: 40, y: 92, width: 920, height: 480, preserveAspectRatio: "xMidYMid meet" })) im.setAttribute(a, v);
  im.style.display = "none";
  g.append(r, t, im);
  setzeAbbildung(g);
  return [{ raw: g }];
}
Object.assign(COMPONENTS, { "abbildung": compAbbildung });
Object.assign(COMPONENTS, { "netz": compNet, "vergleich": compCompare, "phasen": compPhases, "raeume": compRooms, "kurve": compCurve, "beschriftung": compLabel, "tabelle": compTable });

// ================= Schablonen: fertige Schemata mit benannten Teilen (Anatomie, Zellbiologie) =================
// Die KI zeichnet diese nie selbst – sie wählt die Schablone, lässt Teile aufleuchten und beschriften.
const sE = (cx, cy, rx, ry, c, o = {}) => S("ellipse", { cx, cy, rx, ry, stroke: c, "stroke-width": o.sw || 3, fill: o.fill === undefined ? c : o.fill, "fill-style": o.fs, transform: o.tr, "data-p": 1 });
const sC = (cx, cy, r, c, o = {}) => S("circle", { cx, cy, r, stroke: c, "stroke-width": o.sw || 3, fill: o.fill === undefined ? c : o.fill, "data-p": 1 });
const sP = (d, c, o = {}) => S("path", { d, stroke: c, "stroke-width": o.sw || 3, fill: o.fill || "none", "stroke-linecap": "round", "stroke-dasharray": o.dash, "data-p": 1 });
const sR = (x, y, w, h, c, o = {}) => S("rect", { x, y, width: w, height: h, rx: o.rx || 0, stroke: c, "stroke-width": o.sw || 3, fill: o.fill === undefined ? c : o.fill, transform: o.tr, "data-p": 1 });
const sA = (x1, y1, x2, y2, c, w = 4) => arrowLine(x1, y1, x2, y2, c, w, "");
const RED = "#d62828", BLUE = "#1f6fd1", GREEN = "#2a9d4b", ORANGE = "#f07c1a", PURPLE = "#7b3fc4", BROWN = "#8b5a2b", INK = "#1A1A1A", YEL = "#f2b705";
// Teil: [id, Beschriftung, Ankerpunkt, Formen]
const SCHEMAS = {
  zelle: { titel: "Tierische Zelle", parts: [
    ["zellmembran", "Zellmembran", [705, 300], [sE(500, 330, 215, 195, GREEN, { sw: 5 })]],
    ["zytoplasma", "Zytoplasma", [350, 400], []],
    ["zellkern", "Zellkern", [470, 262], [sC(470, 330, 74, PURPLE, { sw: 2 }), sC(470, 330, 68, PURPLE)]],
    ["kernkoerperchen", "Kernkörperchen", [488, 322], [sC(488, 322, 18, PURPLE, { fill: PURPLE, sw: 2 })]],
    ["raues-er", "raues ER", [568, 330], [sP("M552 262 q22 14 0 28 q-22 14 0 28 q22 14 0 28 q-22 14 0 28 q22 14 0 28", BLUE), ...[270, 298, 326, 354, 382].map((y) => sC(566, y, 3.5, INK, { sw: 1 }))]],
    ["golgi-apparat", "Golgi-Apparat", [625, 235], [0, 1, 2, 3].map((k) => sP(`M${588 + k * 3} ${222 + k * 13} q38 -16 76 0`, ORANGE, { sw: 4 }))],
    ["mitochondrium", "Mitochondrium", [380, 205], [sE(380, 205, 48, 24, RED), sP("M340 205 l8 -11 l8 22 l8 -22 l8 22 l8 -22 l8 22 l8 -22 l8 22 l8 -11", RED, { sw: 2 }), sE(612, 445, 42, 21, RED), sP("M577 445 l7 -10 l7 20 l7 -20 l7 20 l7 -20 l7 20 l7 -20 l7 10", RED, { sw: 2 })]],
    ["ribosomen", "Ribosomen", [420, 470], [[420, 470], [440, 480], [520, 505], [330, 300], [345, 315], [640, 330]].map(([x, y]) => sC(x, y, 4, INK, { sw: 1 }))],
    ["lysosom", "Lysosom", [395, 450], [sC(395, 450, 19, BROWN)]],
    ["zentriolen", "Zentriolen", [540, 470], [sR(522, 462, 26, 12, INK, { fill: "#ffffff" }), sR(548, 452, 12, 26, INK, { fill: "#ffffff" })]],
  ]},
  mitochondrium: { titel: "Mitochondrium", parts: [
    ["aeussere-membran", "äußere Membran", [500, 190], [sE(500, 330, 255, 142, RED, { sw: 4 })]],
    ["intermembranraum", "Intermembranraum", [690, 300], []],
    ["innere-membran", "innere Membran", [710, 330], [sE(500, 330, 230, 120, ORANGE, { fill: YEL, sw: 3 })]],
    ["cristae", "Cristae", [445, 260], [-3, -2, -1, 0, 1, 2, 3].map((k) => { const x = 500 + k * 58, top = k % 2 === 0; const ye = 330 + (top ? -1 : 1) * 120 * Math.sqrt(Math.max(0, 1 - ((x - 500) / 230) ** 2)); const yi = top ? 360 : 300; return sP(`M${x - 13} ${ye.toFixed(1)} L${x - 13} ${yi} Q${x} ${top ? yi + 22 : yi - 22} ${x + 13} ${yi} L${x + 13} ${ye.toFixed(1)}`, ORANGE, { sw: 3 }); })],
    ["matrix", "Matrix", [530, 330], []],
    ["atp-synthase", "ATP-Synthase", [455, 300], [[442, 290], [442, 315], [558, 345], [558, 370]].map(([x, y]) => sC(x, y, 6, PURPLE, { sw: 2 }))],
    ["mtdna", "mtDNA (Ring)", [615, 300], [sC(615, 300, 14, PURPLE, { fill: "none", sw: 3 })]],
    ["ribosomen", "Ribosomen", [585, 370], [[580, 368], [592, 378], [372, 300]].map(([x, y]) => sC(x, y, 4, INK, { sw: 1 }))],
  ]},
  dna: { titel: "DNA-Doppelhelix", build: (A) => {
    const seq = String(A("basen") || "ATGCGTACGA").toUpperCase().replace(/[^ATGC]/g, "").slice(0, 12) || "ATGC";
    const comp = { A: "T", T: "A", G: "C", C: "G" }, col = { A: RED, T: BLUE, G: GREEN, C: ORANGE }, parts = [];
    const n = seq.length, y0 = 110, y1 = 550, dy = (y1 - y0) / n, xs = (y, s) => 500 + s * 120 * Math.sin(((y - y0) / (y1 - y0)) * Math.PI * 2.2);
    let d1 = "", d2 = ""; for (let y = y0 - 10; y <= y1 + 10; y += 6) { d1 += (d1 ? " L" : "M") + xs(y, 1).toFixed(1) + " " + y; d2 += (d2 ? " L" : "M") + xs(y, -1).toFixed(1) + " " + y; }
    parts.push(["rueckgrat", "Zucker-Phosphat-Rückgrat", [xs(y0 + 10, 1), y0 + 10], [sP(d1, INK, { sw: 6 }), sP(d2, INK, { sw: 6 })]]);
    const seen = {}, rung = [], hb = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + dy * (i + 0.5), a = xs(y, 1), b = xs(y, -1); if (Math.abs(a - b) < 50) continue;
      const m = (a + b) / 2, B = seq[i], Bc = comp[B];
      rung.push(ln(a, y, m - 3, y, col[B], 8, "", true), ln(m + 3, y, b, y, col[Bc], 8, "", true));
      hb.push(ln(m - 3, y - 6, m - 3, y + 6, C.grey, 2, "", true), ln(m + 3, y - 6, m + 3, y + 6, C.grey, 2, "", true));
      for (const [L, x] of [[B, (a + m) / 2], [Bc, (m + b) / 2]]) { rung.push(tx(x, y - 10, L, { size: 18, fill: col[L] })); if (!seen[L]) seen[L] = [x, y]; }
    }
    parts.push(["basenpaar", "Basenpaar", null, rung], ["wasserstoffbruecken", "Wasserstoffbrücken", null, hb]);
    const nm = { A: ["adenin", "Adenin (A)"], T: ["thymin", "Thymin (T)"], G: ["guanin", "Guanin (G)"], C: ["cytosin", "Cytosin (C)"] };
    for (const L of "ATGC") if (seen[L]) parts.push([nm[L][0], nm[L][1], seen[L], []]);
    parts.push(["5-ende", "5'-Ende", [xs(y0 - 10, 1), y0 - 10], [tx(xs(y0 - 10, 1), y0 - 22, "5'", { size: 22, fill: INK })]], ["3-ende", "3'-Ende", [xs(y0 - 10, -1), y0 - 10], [tx(xs(y0 - 10, -1), y0 - 22, "3'", { size: 22, fill: INK })]]);
    return parts;
  }},
  chromosom: { titel: "Chromosom (2 Chromatiden)", parts: [
    ["chromatid-1", "Chromatid", [452, 470], [sR(442, 168, 44, 150, BLUE, { rx: 22, tr: "rotate(-10 464 243)" }), sR(442, 340, 44, 210, BLUE, { rx: 22, tr: "rotate(10 464 445)" })]],
    ["chromatid-2", "Schwesterchromatid", [548, 470], [sR(514, 168, 44, 150, GREEN, { rx: 22, tr: "rotate(10 536 243)" }), sR(514, 340, 44, 210, GREEN, { rx: 22, tr: "rotate(-10 536 445)" })]],
    ["zentromer", "Zentromer", [500, 330], [sE(500, 330, 34, 16, INK)]],
    ["kinetochor", "Kinetochor", [462, 330], [sR(456, 322, 10, 16, PURPLE), sR(534, 322, 10, 16, PURPLE)]],
    ["p-arm", "p-Arm (kurz)", [452, 240], []],
    ["q-arm", "q-Arm (lang)", [545, 430], []],
    ["telomer", "Telomere", [478, 168], [[478, 172], [522, 172], [432, 545], [568, 545]].map(([x, y]) => sC(x, y, 9, RED))],
  ]},
  neuron: { titel: "Nervenzelle", parts: [
    ["dendriten", "Dendriten", [262, 248], [sP("M300 290 L260 240 L232 232 M260 240 L250 205", PURPLE, { sw: 4 }), sP("M275 315 L225 300 L200 280 M225 300 L205 318", PURPLE, { sw: 4 }), sP("M285 370 L245 410 L215 415 M245 410 L240 440", PURPLE, { sw: 4 }), sP("M320 280 L330 225 L320 200", PURPLE, { sw: 4 })]],
    ["soma", "Zellkörper (Soma)", [300, 380], [sC(310, 330, 52, PURPLE)]],
    ["zellkern", "Zellkern", [310, 330], [sC(310, 330, 18, INK, { fill: "#ffffff" })]],
    ["axonhuegel", "Axonhügel", [375, 330], [sP("M360 312 L398 324 L398 336 L360 348 Z", PURPLE, { fill: PURPLE })]],
    ["axon", "Axon", [410, 330], [ln(398, 330, 712, 330, INK, 4, "", true)]],
    ["myelinscheide", "Myelinscheide", [500, 312], [0, 1, 2, 3].map((k) => sR(418 + k * 72, 314, 58, 32, ORANGE, { rx: 14 }))],
    ["ranvier-schnuerring", "Ranvier-Schnürring", [483, 330], []],
    ["endknoepfchen", "synaptische Endknöpfchen", [748, 330], [sP("M712 330 L742 288 M712 330 L748 330 M712 330 L742 372", INK, { sw: 4 }), sC(746, 284, 10, RED), sC(752, 330, 10, RED), sC(746, 376, 10, RED)]],
    ["erregung", "Erregungsleitung", [600, 270], [...sA(420, 272, 700, 272, RED, 3)]],
  ]},
  synapse: { titel: "Chemische Synapse", parts: [
    ["aktionspotenzial", "ankommendes Aktionspotenzial", [500, 90], [...sA(500, 60, 500, 118, RED, 4)]],
    ["praesynapse", "Präsynapse (Endknöpfchen)", [380, 170], [sP("M400 95 L400 175 Q330 185 330 255 L330 300 L670 300 L670 255 Q670 185 600 175 L600 95", BLUE, { fill: BLUE, sw: 4 })]],
    ["vesikel", "Vesikel", [470, 245], [[420, 235], [470, 250], [560, 238], [515, 205]].map(([x, y]) => sC(x, y, 20, PURPLE, { fill: "#ffffff" }))],
    ["transmitter", "Neurotransmitter", [508, 322], [[414, 230], [424, 240], [466, 246], [476, 256], [556, 234], [566, 244], [510, 200], [520, 210], [490, 318], [508, 324], [526, 316]].map(([x, y]) => sC(x, y, 3.5, PURPLE, { sw: 1 }))],
    ["calciumkanal", "Ca²⁺-Kanal", [336, 270], [sR(326, 258, 16, 26, RED), ...sA(285, 272, 322, 272, RED, 3)]],
    ["synaptischer-spalt", "synaptischer Spalt", [640, 320], []],
    ["postsynapse", "Postsynapse", [620, 420], [sP("M330 340 L670 340 L670 500 L330 500 Z", GREEN, { fill: GREEN, sw: 4 })]],
    ["rezeptoren", "Rezeptoren (Ionenkanäle)", [580, 348], [420, 500, 580].map((x) => sR(x - 9, 338, 18, 20, ORANGE))],
  ]},
  herz: { titel: "Herz (Blick von vorne)", parts: [
    ["obere-hohlvene", "obere Hohlvene", [398, 120], [sR(382, 110, 34, 95, BLUE)]],
    ["untere-hohlvene", "untere Hohlvene", [300, 280], [sR(288, 266, 70, 30, BLUE)]],
    ["rechter-vorhof", "rechter Vorhof", [400, 250], [sE(415, 252, 70, 52, BLUE)]],
    ["rechte-kammer", "rechte Kammer", [430, 420], [sP("M352 302 Q336 420 462 520 L498 545 L498 302 Z", BLUE, { fill: BLUE, sw: 4 })]],
    ["linker-vorhof", "linker Vorhof", [590, 240], [sE(585, 245, 64, 48, RED)]],
    ["linke-kammer", "linke Kammer", [575, 420], [sP("M502 302 L502 545 Q570 520 640 420 Q668 345 650 302 Z", RED, { fill: RED, sw: 4 })]],
    ["septum", "Septum", [500, 440], [ln(500, 302, 500, 545, INK, 6, "", true)]],
    ["lungenarterie", "Lungenarterie", [360, 150], [sP("M462 300 L462 200 Q462 150 410 150 L350 150", BLUE, { sw: 18 })]],
    ["aorta", "Aorta", [610, 110], [sP("M528 300 L528 165 Q528 105 585 105 Q640 105 640 160 L640 200", RED, { sw: 22 })]],
    ["lungenvenen", "Lungenvenen", [690, 240], [ln(646, 228, 700, 218, RED, 10, "", true), ln(646, 258, 700, 268, RED, 10, "", true)]],
    ["trikuspidalklappe", "Trikuspidalklappe", [420, 303], [ln(400, 296, 418, 312, INK, 4, "", true), ln(440, 296, 422, 312, INK, 4, "", true)]],
    ["mitralklappe", "Mitralklappe", [580, 303], [ln(560, 296, 578, 312, INK, 4, "", true), ln(600, 296, 582, 312, INK, 4, "", true)]],
    ["pulmonalklappe", "Pulmonalklappe", [462, 286], [sP("M450 290 Q462 278 474 290", INK, { sw: 4 })]],
    ["aortenklappe", "Aortenklappe", [528, 286], [sP("M516 290 Q528 278 540 290", INK, { sw: 4 })]],
    ["blutfluss", "Weg des Blutes", null, [...sA(399, 160, 405, 228, INK, 3), ...sA(420, 285, 430, 360, INK, 3), ...sA(470, 400, 466, 230, INK, 3), ...sA(700, 243, 640, 243, INK, 3), ...sA(580, 280, 585, 360, INK, 3), ...sA(540, 400, 534, 230, INK, 3)]],
  ]},
  nephron: { titel: "Nephron", parts: [
    ["rinde", "Nierenrinde", [690, 125], [ln(250, 300, 760, 300, C.grey, 2, "", true)]],
    ["mark", "Nierenmark", [690, 330], []],
    ["vas-afferens", "zuführende Arteriole", [260, 165], [ln(240, 168, 292, 172, RED, 7, "", true)]],
    ["vas-efferens", "wegführende Arteriole", [260, 205], [ln(292, 196, 240, 202, RED, 5, "", true)]],
    ["glomerulus", "Glomerulus", [330, 185], [[318, 175], [338, 172], [328, 192], [345, 192], [315, 195]].map(([x, y]) => sC(x, y, 11, RED, { sw: 2 }))],
    ["bowman-kapsel", "Bowman-Kapsel", [330, 120], [sC(330, 185, 54, BLUE, { fill: "none", sw: 4 }), sC(330, 185, 46, BLUE, { fill: "none", sw: 2 })]],
    ["proximaler-tubulus", "proximaler Tubulus", [440, 160], [sP("M380 190 q30 -34 60 0 q30 34 60 0 q30 -34 60 0", ORANGE, { sw: 9 })]],
    ["henle-schleife", "Henle-Schleife", [585, 520], [sP("M560 190 L560 500 Q585 545 610 500 L610 235", PURPLE, { sw: 9 })]],
    ["distaler-tubulus", "distaler Tubulus", [660, 200], [sP("M610 235 q25 -34 50 0 q25 34 50 0", GREEN, { sw: 9 })]],
    ["sammelrohr", "Sammelrohr", [720, 450], [ln(720, 150, 720, 565, BROWN, 14, "", true)]],
    ["harnfluss", "Weg des Harns", null, [...sA(560, 300, 560, 420, INK, 3), ...sA(610, 450, 610, 320, INK, 3), ...sA(720, 300, 720, 460, INK, 3)]],
  ]},
  alveole: { titel: "Lungenbläschen und Gasaustausch", parts: [
    ["bronchiole", "Bronchiole", [430, 120], [sR(408, 85, 44, 110, BLUE, { rx: 10 })]],
    ["alveole", "Lungenbläschen (Alveole)", [400, 320], [sC(430, 310, 125, BLUE, { sw: 4 })]],
    ["alveolarwand", "Alveolarwand", [550, 260], []],
    ["kapillare", "Kapillare", [640, 470], [sP("M575 150 Q690 310 575 480", RED, { sw: 34 })]],
    ["erythrozyt", "rote Blutkörperchen", [615, 300], [[598, 220], [622, 300], [600, 390]].map(([x, y]) => sE(x, y, 13, 8, RED, { fill: "#ffffff", sw: 3 }))],
    ["sauerstoff", "O₂ ins Blut", [520, 280], [...sA(470, 282, 575, 300, BLUE, 4), tx(500, 270, "O₂", { size: 24, fill: BLUE })]],
    ["kohlendioxid", "CO₂ in die Luft", [520, 360], [...sA(578, 350, 470, 362, C.grey, 4), tx(500, 388, "CO₂", { size: 24, fill: C.grey })]],
  ]},
  auge: { titel: "Auge (Querschnitt)", parts: [
    ["lederhaut", "Lederhaut", [580, 165], [sC(480, 330, 170, INK, { fill: "#ffffff", sw: 4 })]],
    ["hornhaut", "Hornhaut", [318, 255], [sP("M330 245 Q282 330 330 415", BLUE, { sw: 5 })]],
    ["iris", "Iris (Regenbogenhaut)", [348, 268], [ln(348, 262, 348, 300, BROWN, 7, "", true), ln(348, 360, 348, 398, BROWN, 7, "", true)]],
    ["pupille", "Pupille", [345, 330], []],
    ["linse", "Linse", [372, 330], [sE(372, 330, 22, 52, BLUE)]],
    ["ziliarkoerper", "Ziliarmuskel", [360, 405], [sR(352, 384, 16, 22, RED), sR(352, 254, 16, 22, RED)]],
    ["glaskoerper", "Glaskörper", [490, 400], []],
    ["netzhaut", "Netzhaut", [620, 230], [sP("M560 182 A160 160 0 0 1 560 478", RED, { sw: 5 })]],
    ["gelber-fleck", "gelber Fleck (schärfstes Sehen)", [640, 318], [sC(640, 318, 9, YEL)]],
    ["blinder-fleck", "blinder Fleck", [632, 365], [sC(632, 365, 8, INK)]],
    ["sehnerv", "Sehnerv", [700, 380], [sR(630, 352, 110, 26, YEL, { rx: 8, tr: "rotate(8 630 365)" })]],
    ["lichtstrahlen", "Lichtstrahlen", [220, 290], [sP("M200 285 L330 300 L640 318", ORANGE, { sw: 2, dash: "8 6" }), sP("M200 380 L330 360 L640 318", ORANGE, { sw: 2, dash: "8 6" })]],
  ]},
};
function compSchema(A) {
  const name = String(A("name") || "").toLowerCase().trim(), sc = SCHEMAS[name];
  if (!sc) return [tx(500, 300, `Schablone „${name}“ gibt es nicht`, { size: 26, fill: C.grey })];
  const parts = sc.build ? sc.build(A) : sc.parts, out = [];
  const zeige = String(A("zeige") || "alle").toLowerCase().split(/[;,]/).map((t) => t.trim()).filter(Boolean);
  const flussAus = /^(nein|false|0)$/i.test(String(A("fluss") || "ja"));
  parts.forEach(([id, label, anchor, shapes]) => {
    if (flussAus && /fluss/.test(id)) return;
    const teil = `${id} ${keyOf(label)}`;
    shapes.forEach((sp) => { if (!sp) return; if (sp.raw) { out.push(sp); return; } sp.attrs.teil = ((sp.attrs.teil ? sp.attrs.teil + " " : "") + teil).trim(); out.push(sp); });
    // Jeder gezeichnete Teil bekommt seine Beschriftung (Andreea 18.10.: „wieso haben wir hier keine weiteren Beschriftungen“) –
    // sie erscheinen nacheinander beim Erklären, spätestens am Ende alle
    if (anchor) {
      out.push(S("circle", { cx: anchor[0], cy: anchor[1], r: 2, stroke: "none", fill: "none", teil: `anker-${id} ${teil}` }));
      const e = document.createElementNS(SVGNS, "text");
      e.setAttribute("data-callout", `anker-${id}`); e.setAttribute("data-ax", anchor[0]); e.setAttribute("data-ay", anchor[1]); e.setAttribute("font-size", "22"); e.setAttribute("fill", INK); e.setAttribute("x", "0"); e.setAttribute("y", "0");
      e.setAttribute("teil", teil + " beschriftung"); e.textContent = label;
      out.push({ raw: e });
    }
  });
  return out;
}
COMPONENTS["schema"] = compSchema;

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
const ATTRS = new Set(["teil", "fluss", "fill-style", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points", "d", "dx", "dy", "transform", "stroke", "stroke-width", "fill", "font-size", "font-weight", "text-anchor", "dominant-baseline", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity"]);
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
      // Jeder Baustein in eine eigene Gruppe – so kann das Programm ihn später als Ganzes verschieben
      const grp = document.createElementNS(SVGNS, "g"); grp.setAttribute("data-comp", tag); dst.appendChild(grp);
      if (n.getAttribute("fluss")) grp.setAttribute("fluss", n.getAttribute("fluss").slice(0, 20));
      // Ganz-Tafel-Baustein mit eigener Größe (z. B. zwei Kurven nebeneinander): in den gewünschten Bereich verkleinern
      if (FULL_BOARD.test(tag) && !/^(analyse|prozent|einheiten|welle)$/.test(tag) && (n.getAttribute("breite") || n.getAttribute("hoehe"))) {
        const bx = N(n.getAttribute("x"), 0), by = N(n.getAttribute("y"), 0), bw = clampN(N(n.getAttribute("breite"), 1000), 200, 1000), bh = clampN(N(n.getAttribute("hoehe"), 600), 150, 600);
        const k = Math.min(bw / 1000, bh / 600);
        if (k < 0.98) grp.setAttribute("transform", `translate(${(bx + (bw - 1000 * k) / 2).toFixed(1)} ${(by + (bh - 600 * k) / 2).toFixed(1)}) scale(${k.toFixed(3)})`);
      }
      for (const sp of specs) {
        if (sp.raw) { grp.appendChild(sp.raw); continue; }
        // Der Bausteinname zeigt auf den ganzen Baustein ([[gleichung|…]], [[tabelle|…]])
        if (sp.attrs) sp.attrs.teil = sp.attrs.teil ? sp.attrs.teil + " " + tag : tag;
        const e = document.createElementNS(SVGNS, sp.tag);
        for (const [k, v] of Object.entries(sp.attrs)) if (v != null && v !== "" && !(k === "teil" && !TEIL_OK.test(String(v)))) e.setAttribute(k, String(v).trim());
        if (sp.text != null) e.textContent = sp.text;
        grp.appendChild(e);
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
// Moderner Stil: klare Linien, weiche Flächen, runde Enden – gleiche Teil-Markierungen wie beim Handstil
function modernize(svg, theme) {
  svg.querySelectorAll(SHAPES).forEach((e) => {
    if (e.closest("defs, mask") || e.classList.contains("lb-flowpath")) return;
    const fill = e.getAttribute("fill");
    const fs = (e.getAttribute("fill-style") || "tint").toLowerCase();
    if (fill && fill !== "none" && !/^(#fff(fff)?|white)$/i.test(fill) && !e.hasAttribute("fill-opacity") && (fs === "tint" || !FILLSTYLES.has(fs))) e.setAttribute("fill-opacity", theme === "chalk" ? ".22" : ".2");
    if (!e.hasAttribute("fill")) e.setAttribute("fill", "none");
    e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-linejoin", "round");
    const sw = parseFloat(e.getAttribute("stroke-width")); if (sw > 3) e.setAttribute("stroke-width", String(Math.max(2.5, sw * 0.75)));
    const st = e.getAttribute("stroke"); if (st) e.setAttribute("stroke", col(st, theme));
    if (fill) e.setAttribute("fill", col(fill, theme));
    if (e.getAttribute("teil")) e.setAttribute("data-teil", e.getAttribute("teil").toLowerCase());
  });
  svg.querySelectorAll("text, tspan[fill]").forEach((t) => {
    const f = t.getAttribute("fill"); if (f) t.setAttribute("fill", col(f, theme));
    if (t.getAttribute("teil")) t.setAttribute("data-teil", t.getAttribute("teil").toLowerCase());
    // freie KI-Schrift nicht riesig
    const fz = parseFloat(t.getAttribute("font-size")); if (fz > 38 && !t.closest("[data-comp]")) t.setAttribute("font-size", "36");
  });
}
function roughify(svg, theme, scale) {
  if (MODERN) return modernize(svg, theme);
  if (!window.rough) return;
  const rc = rough.svg(svg), gen = rc.generator;
  let seed = 1;
  svg.querySelectorAll(SHAPES).forEach((e) => {
    if (e.closest("defs, mask") || e.classList.contains("lb-flowpath")) return;
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
    if (e.localName === "rect") g.setAttribute("data-rect", "1");
    if (e.getAttribute("teil")) g.setAttribute("data-teil", e.getAttribute("teil").toLowerCase());
    for (const a of ["transform", "opacity"]) if (e.hasAttribute(a)) g.setAttribute(a, e.getAttribute(a));
    e.replaceWith(g);
  });
  svg.querySelectorAll("text, tspan[fill]").forEach((t) => {
    const f = t.getAttribute("fill"); if (f) t.setAttribute("fill", col(f, theme));
    if (t.getAttribute("teil")) t.setAttribute("data-teil", t.getAttribute("teil").toLowerCase());
  });
}
// Verweise der KI, deren Name nicht exakt an der Tafel steht ([[ovulation|…]] bei Beschriftung „Eisprung (Ovulation)“),
// dem passenden Teil zuordnen: gleicher Wortstamm im Teilnamen oder in der Beschriftung.
function linkRefs(out, refs) {
  // läuft vor roughify: die Teilnamen stehen hier noch im Attribut „teil“
  const tl = (e) => (e.getAttribute("teil") || "").toLowerCase();
  const all = [...out.querySelectorAll("[teil]")];
  const have = (r) => all.some((e) => tl(e).split(/\s+/).includes(r));
  const parts = (t) => t.split(/[-_]+/).filter((x) => x.length >= 4);
  const like = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) || parts(a).some((x) => parts(b).includes(x));
  for (const r of refs) {
    if (!r || have(r)) continue;
    const rr = slug(r);
    let hit = all.filter((e) => tl(e).split(/\s+/).some((t) => like(slug(t), rr)));
    if (!hit.length) hit = [...out.querySelectorAll("text")].filter((t) => { const k = slug(t.textContent || ""); return k.length >= 3 && like(k, rr); });
    // Nur überschaubare Treffer, sonst würde zu viel aufleuchten
    if (hit.length && hit.length <= 12) hit.forEach((e) => { e.setAttribute("teil", (tl(e) + " " + r).trim()); if (!all.includes(e)) all.push(e); });
  }
}
// Text an der Tafel: LaTeX in Formelschreibweise, Buchstaben-Indizes (F_G, v_0x) als echte Tiefstellung
function formatFormulas(out) {
  out.querySelectorAll("text").forEach((t) => {
    if (t.children.length) return;
    let s = texToUnicode(t.textContent || "");
    if (!/[A-Za-zΔ)]_[A-Za-z0-9]/.test(s)) { if (s !== t.textContent) t.textContent = s; return; }
    const fs = parseFloat(t.getAttribute("font-size")) || 30;
    t.textContent = "";
    s.split(/([A-Za-zΔ)])_([A-Za-z0-9]{1,4})/).forEach((part, i) => {
      // split liefert: Text, Grundzeichen, Index, Text, …
      const k = i % 3;
      if (k === 0) { if (part) t.appendChild(document.createTextNode(part)); }
      else if (k === 1) t.appendChild(document.createTextNode(part));
      else { const sub = document.createElementNS(SVGNS, "tspan"); sub.setAttribute("dy", (fs * 0.28).toFixed(1)); sub.setAttribute("font-size", (fs * 0.68).toFixed(1)); sub.textContent = part; t.appendChild(sub); const back = document.createElementNS(SVGNS, "tspan"); back.setAttribute("dy", (-fs * 0.28).toFixed(1)); back.textContent = "\u200b"; t.appendChild(back); }
    });
  });
}
// ---------- Bewegte Punkte: Licht, Blut, Elektronen, Signale wandern sichtbar die Linien entlang ----------
// fluss='gelb' an einer Linie/einem Pfad (oder an <netz>, <kette>, <kreislauf>) → leuchtende Punkte laufen darauf.
// Von selbst: Kreisläufe und die Flusspfeile der Schablonen (Blut im Herz, Harn im Nephron, Licht im Auge, Erregung am Neuron).
const FLUSS_FARBE = { gelb: "#f5b700", licht: "#f5b700", photon: "#f5b700", photonen: "#f5b700", rot: "#e0303b", blut: "#e0303b", blau: "#1f6fd1", wasser: "#1f6fd1", gruen: "#2a9d4b", orange: "#f07c1a", lila: "#7b4fd1", elektron: "#f5b700", elektronen: "#f5b700", ja: "#f5b700" };
const AUTO_FLUSS = /(^|\s)(blutfluss|harnfluss|lichtstrahlen|erregung)(\s|$)/;
const AUS = /^(nein|aus|0|false)$/i;
function flowD(e) {
  switch (e.localName) {
    case "line": return `M${num(e, "x1")} ${num(e, "y1")} L${num(e, "x2")} ${num(e, "y2")}`;
    case "polyline": case "polygon": { const p = pts(e.getAttribute("points")); return p.length < 2 ? null : "M" + p.map((q) => q.join(" ")).join(" L") + (e.localName === "polygon" ? " Z" : ""); }
    case "path": return e.getAttribute("d");
    case "circle": { const cx = num(e, "cx"), cy = num(e, "cy"), r = num(e, "r"); return r > 0 ? `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0` : null; }
    case "ellipse": { const cx = num(e, "cx"), cy = num(e, "cy"), rx = num(e, "rx"), ry = num(e, "ry"); return rx > 0 && ry > 0 ? `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0` : null; }
  }
  return null;
}
function prepFlows(out) {
  out.querySelectorAll("line, polyline, polygon, path, circle, ellipse").forEach((e) => {
    if (e.closest("defs, mask")) return;
    const t = (e.getAttribute("teil") || "").toLowerCase(), g = e.closest("g[data-comp]");
    let f = e.getAttribute("fluss");
    if (!f && g && !AUS.test(g.getAttribute("fluss") || "")) {
      const kind = g.getAttribute("data-comp"), gf = g.getAttribute("fluss");
      if (AUTO_FLUSS.test(t)) f = /blut/.test(t) ? "rot" : /licht/.test(t) ? "gelb" : "blau";
      else if ((gf || kind === "kreislauf") && /(^|\s)(kante|schritt-\d+|uebergang|pfeil)/.test(t) && !/rueckkopplung/.test(t)) f = gf || "gelb";
    }
    if (!f || AUS.test(f)) return;
    const d = flowD(e); if (!d) return;
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d); p.setAttribute("class", "lb-flowpath"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "none");
    p.setAttribute("data-fluss", FLUSS_FARBE[slug(f)] || (COLOR.test(f) ? f : "#f5b700"));
    if (t) { p.setAttribute("teil", t); p.setAttribute("data-teil", t); }
    if (e.getAttribute("transform")) p.setAttribute("transform", e.getAttribute("transform"));
    e.after(p);
  });
}
const flowSvgs = new Set(); let flowRaf = 0;
function startFlows(svg) {
  if (!svg || svg.__flows || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const items = [];
  svg.querySelectorAll("path.lb-flowpath").forEach((p) => {
    let L = 0; try { L = p.getTotalLength(); } catch (e) { L = 0; }
    if (!(L >= 70)) return;                                                     // Pfeilspitzen und Mini-Striche nicht
    const k = Math.max(2, Math.min(7, Math.round(L / 110)));
    const g = document.createElementNS(SVGNS, "g"); g.setAttribute("class", "lb-flowdots"); g.setAttribute("pointer-events", "none");
    if (p.getAttribute("transform")) g.setAttribute("transform", p.getAttribute("transform"));
    const col2 = p.getAttribute("data-fluss"), dots = [];
    for (let i = 0; i < k; i++) {
      const c = document.createElementNS(SVGNS, "circle"); c.setAttribute("r", "7.5"); c.setAttribute("fill", col2);
      c.setAttribute("stroke", "#ffffff"); c.setAttribute("stroke-width", "2"); g.appendChild(c); dots.push(c);
    }
    p.after(g); items.push({ p, L, dots, g });
  });
  if (!items.length) return;
  svg.__flows = items; flowSvgs.add(svg);
  if (!flowRaf) flowRaf = requestAnimationFrame(flowTick);
}
function flowTick(t) {
  flowRaf = 0;
  for (const svg of flowSvgs) {
    if (!svg.isConnected) { flowSvgs.delete(svg); continue; }
    for (const it of svg.__flows) {
      const on = !it.p.closest(".lb-wait");
      it.g.style.display = on ? "" : "none";
      if (!on) continue;
      it.dots.forEach((c, i) => {
        const s = ((t / 1000) * 130 / it.L + i / it.dots.length) % 1, q = it.p.getPointAtLength(s * it.L);
        c.setAttribute("cx", q.x.toFixed(1)); c.setAttribute("cy", q.y.toFixed(1));
        c.setAttribute("opacity", (0.35 + 0.65 * Math.sin(Math.PI * s)).toFixed(2));   // weich ein- und ausblenden an den Enden
      });
    }
  }
  if (flowSvgs.size) flowRaf = requestAnimationFrame(flowTick);
}
function buildBoardSvg(svgText, theme, refs) {
  const out = sanitizeSvg(svgText, "0 0 1000 600");
  if (!out) return null;
  try { formatFormulas(out); } catch (e) {}
  if (refs && refs.length) try { linkRefs(out, refs); } catch (e) {}
  out.setAttribute("role", "img");
  const vbw = parseFloat(out.getAttribute("viewBox").split(/[\s,]+/)[2]) || 1000;
  try { prepFlows(out); } catch (e) {}
  roughify(out, theme, vbw / 1000);
  return out;
}
function animateSvg(svg, cap = 20000) {
  if (!svg || !svg.animate) return 0;
  svg.getAnimations?.({ subtree: true }).forEach((a) => a.cancel());
  return drawPlan([...svg.querySelectorAll(SHAPES + ",text")].filter((e) => !e.closest(".lb-wait")), cap, 200);
}
// Zeichnet die übergebenen Elemente nacheinander (wie mit der Hand)
function drawPlan(els, cap = 20000, start = 200) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const plan = [];
  els.forEach((e) => {
    if (e.closest("defs, mask, .lb-flowdots") || e.classList.contains("lb-flowpath")) return;
    if (e.localName === "text") { const n = (e.textContent || "").length; plan.push({ e, kind: "write", dur: Math.min(1100, 160 + n * 34), step: Math.min(800, 120 + n * 24) }); return; }
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
  let t = start;
  plan.forEach((p) => {
    const dur = p.dur * k;
    if (p.kind === "stroke") {
      p.e.animate([{ strokeDasharray: p.len + " " + p.len, strokeDashoffset: p.len }, { strokeDasharray: p.len + " " + p.len, strokeDashoffset: 0 }], { duration: dur, delay: t, fill: "both", easing: "ease-in-out" });
      const f = p.e.getAttribute("fill");
      // bis zur eigenen Deckkraft einblenden (getönte Flächen bleiben getönt, sonst wird z. B. die Zelle knallgrün)
      if (f && f !== "none") { const fo = parseFloat(p.e.getAttribute("fill-opacity")); p.e.animate([{ fillOpacity: 0 }, { fillOpacity: isFinite(fo) ? fo : 1 }], { duration: 250, delay: t + dur, fill: "both" }); }
    } else if (p.kind === "write") {
      // Text wird von links nach rechts „geschrieben“
      p.e.animate([{ opacity: 0, clipPath: "inset(-30% 100% -30% 0)" }, { opacity: 1, clipPath: "inset(-30% 92% -30% 0)", offset: 0.08 }, { opacity: 1, clipPath: "inset(-30% 0% -30% 0)" }], { duration: dur, delay: t, fill: "both", easing: "linear" });
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

const lb = { open: false, shot: null, shotW: 1000, shotH: 600, shotScroll: [0, 0], ctx: null, style: "erklaeren", speak: (() => { try { return localStorage.getItem("lb-vorlesen") === "1"; } catch (e) { return false; } })(), natural: true, busy: false, turns: [], usedSession: false };
let cur = { boards: [], turns: [] };
let curBoard = -1, answerBoards = null, lastBody = "", walkTimers = [], lbSupabase = null;
let shotBlob = null, shotW = 1000, shotH = 600; // vom Zeichen-Teil (rules) erwartet

// ---------- Bibliotheken & Anmeldung ----------
const LIBS = {
  rough: "https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js",
  smiles: "https://cdn.jsdelivr.net/npm/smiles-drawer@2.4.1/dist/smiles-drawer.min.js",
  // html2canvas-pro: wie html2canvas, versteht aber moderne CSS-Farben (oklab, oklch, color-mix) der Lernwerkzeuge
  h2c: "https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js",
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
      // Die App mischt die Antworten: maßgeblich ist, was auf dem BILDSCHIRM steht, nicht die Reihenfolge in der Datenbank
      const btns = [...qScreen.querySelectorAll(".answer-btn")].filter(visible);
      const btnTxt = (b) => (b.querySelector(".answer-text") || b).textContent.replace(/\s+/g, " ").trim();
      const btnLab = (b, i) => ((b.querySelector(".answer-label") || {}).textContent || labels[i] || String(i + 1)).trim();
      const fromScreen = btns.length >= 2;
      const opts = fromScreen ? btns.map((b, i) => `${btnLab(b, i)}) ${btnTxt(b)}`).join("\n")
        : Array.isArray(c.options) ? c.options.map((o, i) => `${labels[i] || i + 1}) ${typeof o === "string" ? o : JSON.stringify(o)}`).join("\n") : "";
      const bC = btns.find((b) => b.classList.contains("correct")), bW = btns.find((b) => b.classList.contains("incorrect"));
      const ci = c.correct ?? c.correct_index;
      ctx.frage = {
        bereich: q.type + (q.subtype ? " / " + q.subtype : ""),
        text: c.question || c.premise1 && `${c.premise1} ${c.premise2 || ""}` || c.word || c.sequence && String(c.sequence) || txt("#q-text, .question-text") || "",
        optionen: opts,
        richtig: bC ? `${btnLab(bC, btns.indexOf(bC))}) ${btnTxt(bC)}` : (!fromScreen && Number.isInteger(ci) && c.options ? `${labels[ci]}) ${c.options[ci]}` : ""),
        gewaehlt: bW ? `${btnLab(bW, btns.indexOf(bW))}) ${btnTxt(bW)}` : "",
        erklaerung: (txt("#q-explanation") || c.explanation || "").slice(0, 1200)
      };
    }
  }
  return ctx;
}
function contextText(ctx) {
  if (lb.upload && lb.upload.kind === "grafik") return `KONTEXT: Infografik „${lb.upload.title}“ (siehe Bild), die LernBlick gerade für die Person zum Thema erstellt hat.`;
  if (lb.upload && lb.upload.kind === "sheet") return `KONTEXT: Ausschnitt aus dem Cheat-Sheet „${lb.upload.title}“ (siehe Bild); die rot umkreiste Stelle hat die Person angetippt.`;
  if (lb.upload) return "KONTEXT: Die Person hat ein EIGENES BILD hochgeladen (siehe Bild) – z. B. ihre Lösung, Zeichnung oder Mitschrift – und fragt dazu.";
  let t = `KONTEXT (was gerade in der App zu sehen ist):\nSeite: ${ctx.seite}${ctx.ueberschrift ? " – " + ctx.ueberschrift : ""} (${ctx.pfad})`;
  const f = ctx.frage;
  if (f) {
    t += `\nAufgabe (${f.bereich}): ${f.text}`;
    if (f.optionen) t += `\nAntwortmöglichkeiten:\n${f.optionen}`;
    if (f.richtig) t += `\nRichtige Antwort (grün auf dem Bildschirm, laut Lösungsschlüssel): ${f.richtig}`;
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
  // 3D-Modell (Hormonsystem, Skelett …): jedes Teil ist ein Anker, der seiner Lage im 3D-Bild folgt
  const a3 = atlas3d();
  if (a3) {
    const parts = a3.teile().filter((t) => t.objekt).slice(0, 60);
    lines.push("3D-MODELL auf diesem Bildschirm – diese Teile kann das Programm zeigen, hindrehen und hervorheben (ziel='3d-…'):");
    parts.forEach((t) => { anchors["3d-" + t.id] = anchor3d(t.id); lines.push(`3d-${t.id}: ${clean(t.name || t.id, 40)}`); });
  }
  return lines.join("\n");
}
// ---------- Steuerung der 3D-Modelle aus dem Lehrerzimmer (window.atlas3d) ----------
function atlas3d() { try { const a = window.atlas3d; return a && a.zustand && a.zustand().bereit && !a.zustand().ohne3d ? a : null; } catch (e) { return null; } }
// Ein „virtueller“ Anker: liefert die aktuelle Bildschirmlage eines 3D-Teils, damit Kreis und Pfeil darauf sitzen
function anchor3d(id) {
  return {
    is3d: id, isConnected: true,
    getBoundingClientRect() {
      const a = atlas3d(), b = a && a.bildschirm(id);
      if (!b) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
      const p = b.jetzt, r = 26; return { left: p.x - r, top: p.y - r, right: p.x + r, bottom: p.y + r, width: 2 * r, height: 2 * r, x: p.x - r, y: p.y - r };
    },
    closest: () => null, querySelector: () => null, matches: () => false,
  };
}
let focus3dId = null;
function focus3d(id) {
  const a = atlas3d(); if (!a || !a.teil(id) || focus3dId === id) return;
  focus3dId = id;
  try {
    if (a.zustand().modus !== "ganz") a.modus("ganz");
    a.markiere([id], { rest: "geist" });                 // alles andere halb durchsichtig
    a.rahme([id], 900, null, 3);                          // Kamera dreht/zoomt zum Teil
    a.waehle(id, { karte: false });
  } catch (e) {}
  // Markierungen folgen dem gedrehten Modell
  [500, 1000, 1500].forEach((t) => walkTimers.push(setTimeout(() => { if (lastImg) renderImgDraw(lastImg, false); }, t)));
}

// ---------- Anleitung für die KI ----------
// Welche Bausteine braucht dieses Fach? Nur diese stehen in der Anleitung – kürzer, und die KI wählt treffsicherer.
const UNIVERSAL = ["abbildung", "titel", "pfeil", "gleichung", "netz", "vergleich", "phasen", "raeume", "kurve", "beschriftung", "tabelle", "kreislauf", "kette"];
const FACH_BAUSTEINE = {
  mathematik: ["dreieck-rw", "kaestchen", "bruch-kreis", "bruch-balken", "zahlenstrahl", "koordinaten", "analyse", "prozent", "einheiten", "potenzen", "baum", "normalverteilung", "auswahl", "einheitskreis", "vektoren", "kreis", "vieleck"],
  physik: ["koordinaten", "analyse", "einheiten", "potenzen", "vektoren", "welle", "teilchen", "einheitskreis", "kreis"],
  chemie: ["molekuel", "bogenpfeil", "teilchen", "einheiten", "potenzen", "prozent"],
  biologie: ["schema", "kreislauf", "kette", "molekuel", "bogenpfeil", "teilchen"],
  kff: ["zahlenfolge", "venn", "buchstaben", "zusammensetzen", "vergessenskurve", "gedaechtnispalast", "kaestchen"]
};
const FACH_WOERTER = {
  mathematik: /integral|ableitung|funktion|gleichung|prozent|zins|bruch|wahrscheinlich|statistik|mittelwert|vektor|winkel|dreieck|kreis|fläche|volumen|potenz|wurzel|logarithm|einheit|umrechn|kombinatorik|binom|sinus|cosinus|parabel|gerade|steigung/i,
  physik: /kraft|energie|arbeit|leistung|druck|welle|schall|licht|optik|linse|strom|spannung|widerstand|magnet|radioakt|zerfall|atomkern|wärme|temperatur|geschwindigkeit|beschleunigung|impuls|frequenz/i,
  chemie: /molekül|reaktion|säure|base|ph-?wert|redox|oxidation|reduktion|bindung|ion|elektron|organisch|alkan|alkohol|ester|amin|gleichgewicht|stöchiometr|mol\b|isomer|periodensystem|katalys/i,
  biologie: /zelle|organ|gewebe|herz|niere|lunge|nerv|synapse|hormon|drüse|enzym|dna|rna|gen|chromosom|mitose|meiose|immun|blut|verdauung|stoffwechsel|zyklus|evolution|ökolog|protein|muskel|knochen|auge/i,
  kff: /zahlenfolge|implikation|wortflüssigkeit|figuren|allergieausweis|gedächtnis|merk/i
};
function fachVon(ctx, q) {
  const f = ctx && ctx.frage, out = new Set();
  if (f && f.bereich) {
    const b = f.bereich.toLowerCase();
    for (const k of Object.keys(FACH_BAUSTEINE)) if (b.includes(k)) out.add(k);
    if (/zahlenfolge|implikation|wortfl|figur|allergie/.test(b)) out.add("kff");
  }
  const text = [q || "", f ? f.text : "", ctx ? ctx.ueberschrift : ""].join(" ");
  for (const [k, re] of Object.entries(FACH_WOERTER)) if (re.test(text)) out.add(k);
  return out;
}
// Baustein-Beschreibungen anderer Fächer aus der Anleitung nehmen (Punkt + eingerückte Folgezeilen)
function nurFach(prompt, faecher) {
  if (!faecher.size) return prompt;                        // Fach unklar: alles drinlassen
  const ok = new Set(UNIVERSAL); faecher.forEach((f) => FACH_BAUSTEINE[f].forEach((t) => ok.add(t)));
  const lines = prompt.split("\n"), out = []; let skip = false;
  for (const l of lines) {
    const m = l.match(/^(\d+)\. <([a-z-]+)/);
    if (m) skip = !ok.has(m[2]);
    else if (skip && !/^\s{2,}\S/.test(l)) skip = false;
    if (!skip) out.push(l);
  }
  let res = out.join("\n");
  if (!ok.has("molekuel")) res = res.replace(/\n\nREAKTIONEN UND MECHANISMEN[\s\S]*?(?=\nNur wenn es wirklich keinen Baustein)/, "\n");
  if (!ok.has("analyse")) res = res.replace(/\nMATHE-BAUSTEINE[^\n]*/, "\n").replace(/\n- Mathe-Aufbau:[^\n]*/, "");
  if (!ok.has("schema")) res = res.replace(/\nSCHABLONEN[^\n]*/, "\n").replace(/\n   Für Details \(z\. B\. was in der Henle-Schleife passiert\)[^\n]*/, "");
  return res;
}
function rules() {
  const L = LB_LANGS[$("lang").value] || LB_LANGS.de;
  const voice = lb.speak ? "LÄNGE – STRENGE GRENZE (wird automatisch geprüft): Die Antwort wird VORGELESEN. Insgesamt höchstens 12 kurze Sätze, höchstens 3 Sätze pro Tafel, höchstens 4 Tafeln. Kein Begrüßungs- oder Trostsatz ('Hallo!', 'Keine Sorge'), die Frage nicht wiederholen. Rechenschritte stehen an der Tafel in <gleichung>, gesprochen wird nur kurz, worauf man dort schaut. Im gesprochenen Text keine Aufzählungen und keine Sonderzeichen-Formeln (Formeln und Tabellen gehören an die Tafel). Jede Tafel, die du zeichnest, wird im Text auch erklärt, in der Reihenfolge der Tafeln. Kündige nie etwas an, das danach nicht kommt (kein 'schauen wir uns gleich genauer an', ohne dass es im nächsten Satz passiert)." : "Halte dich kurz (höchstens etwa 160 Wörter). **fett** und Listen mit '- ' sind erlaubt.";
  const H = Math.round(1000 * lb.shotH / lb.shotW);
  const anchorList = lb.anchorText ? `\nANKER – diese Stellen des Bildschirms kennt das Programm genau (Name: was dort steht [Position im Screenshot]):\n${lb.anchorText}\n` : "";
  const draw = lb.upload && lb.upload.kind === "grafik" ? `\n\nINFOGRAFIK ZUM THEMA („${lb.upload.title}“): Eine Bild-KI hat sie gerade für die Person gezeichnet; sie lernt damit das Thema. Führe sie wie eine Lehrkraft durch die Grafik: Schreibe GANZ AM ANFANG\nBILDZEICHNUNG:\n<svg viewBox='0 0 1000 ${H}'> … </svg>\nmit höchstens 5 Markierungen (rect, ellipse, line, text) in Bildkoordinaten (0,0 links oben, x=1000 rechts, y=${H} unten) um die Bereiche, die du nacheinander erklärst – jede mit teil (teil='bereich-1' …), damit du im Text mit [[bereich-1|…]] darauf zeigst und sie genau dann aufleuchtet.\nErkläre dann an der Tafel (ZEICHNUNG) mit EIGENEN Skizzen, was hinter den Bereichen steckt – nicht abschreiben, sondern verständlich machen (Mechanismus, Beispiel aus Alltag oder Klinik, typische MedAT-Falle).\nWICHTIG: Bild-KIs machen manchmal Fehler (vertauschte Beschriftung, falsche Zahl, verschriebenes Wort). Wenn dir in der Grafik etwas fachlich falsch vorkommt, sag es klar, kreise es rot ein (teil='fehler-1') und gib die richtige Angabe.` : lb.upload && lb.upload.kind === "sheet" ? `\n\nAUSSCHNITT AUS EINEM CHEAT-SHEET der App („${lb.upload.title}“): Die Person hat auf die ROT UMKREISTE Stelle getippt (Mittelpunkt x=${lb.upload.tx}, y=${lb.upload.ty} in den Bildkoordinaten unten) und will genau diesen Punkt verstehen. Lies genau, was dort steht oder abgebildet ist – darum geht es, nicht um den Rest des Ausschnitts. ${lb.upload.ki ? "Diese Grafik hat eine Bild-KI gezeichnet: Wenn an der Stelle etwas fachlich falsch ist, sag es klar und gib die richtige Angabe." : "Keine Fehlersuche – das Cheat-Sheet stimmt."}\nZeige zuerst auf dem Ausschnitt, worum es geht: Schreibe GANZ AM ANFANG\nBILDZEICHNUNG:\n<svg viewBox='0 0 1000 ${H}'> … </svg>\nmit höchstens 3 Markierungen (rect, ellipse, line, text) in Bildkoordinaten (0,0 links oben, x=1000 rechts, y=${H} unten), jede mit teil (z. B. teil='punkt', teil='begriff-1'), damit du im Text mit [[punkt|…]] darauf zeigst.\nDann erklärst du den Punkt an der Tafel (ZEICHNUNG) Schritt für Schritt mit EIGENER Skizze – nicht das Cheat-Sheet abschreiben, sondern verständlich machen, was dahintersteckt (Mechanismus, Beispiel, Merkhilfe).` : lb.upload ? `\n\nEIGENES BILD DER PERSON: Sie hat ein Foto oder Bild hochgeladen (z. B. ihre Zeichnung, Rechnung, Mitschrift). Schau es dir genau an: Was ist richtig, was ist falsch oder fehlt?\nMarkiere direkt AUF IHREM BILD, wie eine Lehrkraft mit dem Rotstift: Schreibe GANZ AM ANFANG deiner Antwort\nBILDZEICHNUNG:\n<svg viewBox='0 0 1000 ${H}'> … </svg>\nmit circle, ellipse, rect, line, path und text in Bildkoordinaten (0,0 links oben, x=1000 rechter Rand, y=${H} unterer Rand): Fehler rot einkreisen und mit 1–3 Wörtern benennen, Richtiges mit grünem Haken (path). Jede Markierung bekommt ein teil (z. B. teil='fehler-1', teil='richtig-1'), damit du im Text mit [[fehler-1|…]] darauf zeigst – dann erscheint sie genau in diesem Moment.\nDanach zeigst du an der Tafel (ZEICHNUNG) Schritt für Schritt, wie es richtig geht. Beginne mit einem Satz dazu, was schon gut ist.` : (lb.shot || lb.anchorText) ? `\n\nAUF DEN BILDSCHIRM ZEICHNEN: Wie eine Lehrkraft, die mit dem Marker ins Buch zeigt, markierst du Stellen direkt auf dem Bildschirm der Person. Schreibe dafür GANZ AM ANFANG deiner Antwort (vor dem ersten Satz):\nBILDZEICHNUNG:\n<svg viewBox='0 0 1000 ${H}'> ... </svg>\nBenutze dafür VOR ALLEM den Baustein markiere. Er sitzt immer exakt auf der richtigen Stelle, auch wenn die Person scrollt:\n<markiere ziel='antwort-c' art='kreis' farbe='rot' text='deine Wahl' teil='deine-wahl'/>\n- ziel: ein Name aus der ANKER-Liste unten (nie raten).\n- art: kreis (einkreisen), rahmen (Kasten drum), unterstreichen, leuchtstift (gelb hinterlegen), haken (✓), kreuz (✗), pfeil (Pfeil zeigt darauf).\n- farbe: rot, gruen, blau, orange, lila. Rot = falsch / deine Wahl, Grün = richtig.\n- text: höchstens 3 Wörter, steht neben der Stelle. Weglassen, wenn nicht nötig.\n- stelle='0.3,0.5' (optional, nur bei Bildern, Grafiken und Animationen): zeigt auf einen Punkt innerhalb des Ankers (0,0 links oben, 1,1 rechts unten).\n- teil: Name, damit du im Text mit [[teil|…]] darauf zeigst. Dann leuchtet die Markierung genau in dem Moment auf.\nHöchstens 5 Markierungen, jede mit eigenem teil. Nur wenn es für eine Stelle keinen Anker gibt, darfst du frei mit line, path, circle, ellipse, rect und text zeichnen (Koordinaten des Screenshots: 0,0 links oben, x=1000 rechter Rand, y=${H} unterer Rand). Wenn nichts zu markieren ist, lass BILDZEICHNUNG weg.${anchorList}` : "";
  const f = lb.ctx && lb.ctx.frage;
  const wrong = f && f.gewaehlt ? `\n\nFALSCH BEANTWORTETE AUFGABE – so erklärst du:\n1. Erst auf dem Bildschirm zeigen (BILDZEICHNUNG mit markiere): die gewählte Antwort rot einkreisen (text 'deine Wahl', teil 'deine-wahl'), die richtige grün einkreisen (text 'richtig', teil 'richtig'), ein entscheidendes Schlüsselwort der Frage (z. B. NICHT) orange unterstreichen. Achte genau darauf, welcher Buchstabe welche Antwort ist (KONTEXT und ANKER).\n2. Dann 1 bis 3 Tafeln, die das Fachwissen SICHTBAR machen – genau das, was man im Kopf haben muss, um die Frage zu lösen: Teilchen, Moleküle, Elektronen, Kräfte, Abläufe, Kurven. Bei Abläufen eine Tafel pro Schritt. Die Frage, die Antwortmöglichkeiten oder die Erklärung der App schreibst du NICHT an die Tafel – das steht schon auf dem Bildschirm.\n3. Im Text (vorgelesen) benennst du den Denkfehler in einem Satz, ohne Vorwurf, und gibst am Ende einen kurzen Prüfungstipp. Bei Aussagen-Kombinationen: vergleiche gewählte und richtige Kombination – erkläre NUR die Aussagen, bei denen sich beide unterscheiden (dort lag der Fehler), und sag kurz, welche die Person schon richtig hatte.` : "";
  const board = `\n\nTAFEL-REGELN (die Tafel füllt den ganzen Bildschirm):\n- Die Tafel ist für BILDER, nicht für Text: Skizzen, Moleküle, Teilchen, Pfeile, Abläufe, Graphen. Text an der Tafel nur als kurze Beschriftung (höchstens 4 Wörter) direkt am Bild. Keine Sätze, keine Listen, nichts abschreiben, was schon auf dem Bildschirm steht. AUSNAHME: Wünscht sich die Person ausdrücklich eine Tabelle oder Übersicht (z. B. Hormone, Drüsen, Wirkung), bekommt sie diese – mit dem Baustein <tabelle>.\n- Zeichne NIE Platzhalter oder Ersatztexte wie 'Tafel wird geladen', 'Hier sollte … sein' oder 'normalerweise siehst du hier'. Was du ankündigst, zeichnest du wirklich – mit einem Baustein.\n- Zu JEDER inhaltlichen Antwort gehört mindestens eine Tafel (ZEICHNUNG) – die Person lernt über das Bild. Nur bei reinen Rückfragen oder Smalltalk keine.\n- Benutze für das Bild IMMER zuerst einen passenden Baustein aus dem BAUKASTEN (exakt berechnet, sieht gut aus). Frei zeichnen nur, wenn wirklich keiner passt – dann groß über die ganze Tafel (x 60 bis 940), jede Beschriftung mit Abstand zu allem anderen.\n- Begriffe in Kästchen mit Pfeilen dazwischen, Signalwege, Ursache → Wirkung, Hemmung/Verstärkung: IMMER <netz> (oder <kette> für eine reine Abfolge) – NIE selbst Rechtecke, Pfeile und Texte zeichnen. Im <netz> gehören Eigenschaften (schnell, dünn, myelinisiert …) an die Kante als Text nach dem Doppelpunkt, nicht in eigene Kästchen.\n- Formeln gehören in <gleichung> und nur, wenn gerechnet wird – keine Formelsammlungen. Schreibe Formeln wie im Schulbuch, NIE als LaTeX-Code (kein $, kein \\cdot, kein \\frac): Malpunkt ·, Hochzahlen ² ³ ⁻¹, Brüche mit /, Indizes mit Unterstrich (F_G, v_0) – das Programm stellt sie tief.\n- Pro Tafel EIN Gedanke mit einem großen Bild, das die Tafel füllt. Lieber 3 Tafeln nacheinander (wie Schritte) als eine volle.\n- ECHTE ABBILDUNGEN: Geht es um Gewebe (Histologie), Organe, Zellen, Querschnitte oder anatomische Strukturen und es gibt keine passende Schablone, zeichnet eine gute Lehrkraft ein genaues Bild – dann nimm <abbildung motiv='…' begriffe='…'/> (z. B. motiv='Querschnitt durch hyalinen Knorpel unter dem Mikroskop' begriffe='Chondrozyt; Lakune; isogene Gruppe; Territorium; Interterritorium; Perichondrium'). NIE eine Tabelle oder Wortliste statt eines Bildes. Höchstens EINE Abbildung pro Antwort, sie braucht die ganze Tafel (mit <titel>); erkläre dann im Text, wo was im Bild liegt (oben links, in der Mitte …), und zeige mit [[abbildung|…]] darauf. Unterschiede (z. B. drei Knorpelarten) danach auf einer eigenen Tafel mit <vergleich> in KURZEN Stichworten.\n- BEWEGUNG: Was fließt oder wandert (Licht/Photonen, Blut, Elektronen, Ionen, Wasser, Nervensignal, Energie, Stoffe im Kreislauf), lässt du sichtbar wandern: Gib der Linie, dem Pfeil oder Pfad fluss='gelb' (Licht, Photonen, Elektronen), fluss='rot' (Blut), fluss='blau' (Wasser, Ionen, Signal) oder gruen/orange/lila – dann laufen leuchtende Punkte darauf entlang, sobald du darauf zeigst. Auch <netz>, <kette> und <kreislauf> verstehen fluss='gelb' (Punkte laufen über alle Pfeile). Nutze das in JEDEM Ablauf, in dem sich etwas bewegt – das macht es lebendig und verständlich.\n- NEBENTAFEL: Fällt nebenbei ein Begriff, ohne den man nicht weiterkommt (z. B. wo die Hypophyse liegt, was ein Rezeptor ist), schiebst du eine kleine Nebentafel ein: 1–2 Sätze Text, dann NEBENTAFEL: <svg viewBox='0 0 1000 600'>…</svg> mit EINER kleinen Skizze (ein Baustein oder eine Schablone, kaum Text). Danach geht es mit der nächsten normalen Tafel weiter. Höchstens eine Nebentafel pro Antwort.\n- Baue jede Tafel wie eine Lehrkraft an der Tafel auf: Das Programm zeichnet nur das, worauf du gerade mit [[teil|…]] zeigst. Erzähle darum in der Reihenfolge, in der das Bild entstehen soll (erst das Grundgerüst, dann Schritt für Schritt die Einzelheiten), und zeige in JEDEM Satz auf das, was jetzt neu dazukommt.\n- Schrift: font-size 26 bis 36, Überschriften nur mit <titel>. Nichts darf über den Rand (x 30 bis 970, y 30 bis 570) hinausragen oder sich überlappen.\n- Aufbau der Antwort: Schreibe den gesprochenen Text zu jeder Tafel direkt VOR ihren ZEICHNUNG-Block (Text 1, ZEICHNUNG 1, Text 2, ZEICHNUNG 2 …). Jede Tafel bekommt ihren eigenen Text – keine Tafel bleibt ohne Erklärung, und kein Satz endet mit einem Doppelpunkt ohne Fortsetzung.\n- Wechsle sprachlich klar zwischen Bildschirm und Tafel (\"Schau hier in der App …\" / \"An der Tafel siehst du …\") und setze in genau diesem Satz einen [[teil|…]] auf etwas, das dort wirklich zu sehen ist – so springt die Ansicht mit.\n- Zeige in fast jedem Satz mit [[teil|…]] auf das Bild, über das du gerade sprichst – so entsteht die Erklärung Schritt für Schritt vor den Augen.\n19. <welle art='longitudinal' wellenlaengen='2' x='60' y='110' breite='880' hoehe='440'/> Longitudinal- oder Transversalwelle (art='transversal'), exakt berechnet: Ruhelage, ausgelenkte Teilchen, Verdichtung/Verdünnung bzw. Wellenberg/Wellental, Amplitude, Wellenlänge λ, Ausbreitungsrichtung, Schwingungsrichtung. Zeigst du im Text auf [[ausbreitung|…]] oder [[schwingung|…]], bewegen sich die Teilchen wirklich. Für ALLE Fragen zu Wellen (Schall, Licht, Seilwelle) diesen Baustein benutzen, nie selbst zeichnen. Braucht die ganze Tafel (mit <titel>).\n   Teile: ruhelage, teilchen, verdichtung, verduennung, wellenberg, wellental, amplitude, wellenlaenge, ausbreitung, schwingung\nLEHRKRAFT-REGELN (das Wichtigste, so entsteht echtes Verständnis):\n- Alles, was du nennst, wird in genau diesem Moment GEZEIGT: jedes Fachwort, jede Größe, jede Fläche, Kurve, Grenze, jedes Enzym oder Molekül, jeder Rechenschritt steht an der Tafel oder ist auf dem Bildschirm markiert, und du zeigst mit [[teil|…]] darauf. Was nicht zu sehen ist, sagst du nicht.\n- Rechne immer ein konkretes Beispiel komplett vor, Zeile für Zeile mit <gleichung> (notizen = was du in dieser Zeile tust), mit echten Zahlen bis zum Ergebnis. Nie nur die Formel nennen.\n- Formeln dröselst du auf: jedes Symbol einzeln, farbig mit dem Bild verbunden (z. B. ∫ von a bis b f(x) dx: a und b = Grenzen auf der x-Achse, f(x) = die Kurve, dx = schmale Streifen, das Integral = die gelbe Fläche).\n- Mathe-Aufbau: Tafel 1 das Bild (z. B. <analyse> mit Fläche), Tafel 2 die Formel aufgedröselt, Tafel 3 Beispiel vorgerechnet: links <analyse x='40' breite='500'>, rechts <gleichung x='600'>.\n- Ist die Person in einem Lern-Tool (Grafik, Animation, Regler), beginne auf IHREM Bildschirm: markiere mit markiere ziel='bild-…' stelle='…' genau die Kurve, Fläche oder den Regler, über den du sprichst.\n- Abläufe (Zyklen, Kaskaden, Signalwege): zuerst der Überblick als <kreislauf> oder <kette>, dann einzelne Schritte auf eigenen Tafeln mit <molekuel> und <bogenpfeil>.\n31. <kreislauf schritte='Citrat; Isocitrat; α-Ketoglutarat; Succinyl-CoA; Succinat; Fumarat; Malat; Oxalacetat' enzyme='Aconitase; Isocitrat-DH; α-KG-DH; Succinyl-CoA-Synthetase; Succinat-DH; Fumarase; Malat-DH; Citrat-Synthase' extras='2: NADH + CO₂; 3: NADH + CO₂; 4: GTP; 5: FADH₂; 7: NADH' mitte='Citratzyklus'/> Kreislauf: Stationen im Kreis, Enzym n steht am Pfeil von Station n zu n+1, extras n = was bei Schritt n entsteht. Jede Station und jeder Schritt ist antippbar.\n   Teile: station-1 …, schritt-1 …, reaktion-1 …, enzym, produkt, zyklus, außerdem die Namen in Kleinbuchstaben (z. B. citrat, aconitase)\n32. <kette schritte='Glucose; Glucose-6-phosphat; Fructose-6-phosphat; …' pfeile='Hexokinase; Isomerase; …'/> Ablauf als Kette (bei mehr als 5 Stationen in Schlangenlinien).   Teile: station-1 …, schritt-1 …, enzym, Namen in Kleinbuchstaben\nBAUSTEINE FÜR ALLE FÄCHER (das Programm ordnet an – du lieferst nur die Inhalte; benutze sie statt frei zu zeichnen):\n33. <netz knoten='a: Isomere; b: Konstitutionsisomere; c: Stereoisomere' kanten='a>b; a>c: gleiche Summenformel' richtung='unten'/> Begriffsnetz, Übersicht, Flussdiagramm, Hormonachse, Regelkreis. kanten: a>b Pfeil, a-b Linie, a<>b Doppelpfeil, Text nach Doppelpunkt. Eine Kante zurück zu einem früheren Knoten wird als Rückkopplung gezeichnet (negative Rückkopplung!). richtung='rechts' für waagrecht. Höchstens 14 Knoten, kurze Begriffe.\n   Teile: knoten, a, b, … (die Kürzel), kante-1 …, a-b, rueckkopplung, außerdem die Begriffe in Kleinbuchstaben\n34. <vergleich spalten='Mitose; Meiose' zeilen='Teilungen: 1 | 2; Tochterzellen: 2 | 4; Crossing-over: nein | ja'/> Gegenüberstellung (ja/nein werden ✓/✗).   Teile: spalte-1, zeile-1 …\n35. <phasen phasen='Prophase: Chromosomen kondensieren; Metaphase: in der Mitte; Anaphase: Chromatiden getrennt; Telophase: zwei Kerne'/> Ablauf in Phasen auf einem Zeitstrahl (max. 7).   Teile: phase-1 …, Phasennamen in Kleinbuchstaben\n36. <raeume bereiche='Zelle > Mitochondrium > Matrix' inhalt='Matrix: Citratzyklus, β-Oxidation; Mitochondrium: Atmungskette'/> verschachtelte Räume (wo passiert was).   Teile: bereich-1 …, Namen in Kleinbuchstaben\n37. <kurve kurven='saettigung: Enzymaktivität' x-name='Substratkonzentration' y-name='v' hlinien='1: Vmax; 0.5: ½ Vmax' vlinien='0.25: Km' punkte='0.25: Km'/> typische Kurve exakt gezeichnet. Formen: saettigung, sigmoid (z. B. O₂-Bindung Hämoglobin), exponentiell, abfall (Zerfall), glocke, optimum (Temperatur/pH), logistisch, linear, schwingung. Werte von 0 bis 1.   Teile: kurve-1, hlinie-1, vlinie-1, punkt-1, x-achse, y-achse\n40. <tabelle spalten='Hormon; Drüse; Wirkung' zeilen='Insulin | Pankreas (β-Zellen) | senkt Blutzucker; Glukagon | Pankreas (α-Zellen) | hebt Blutzucker'/> Tabelle, wenn die Person eine Tabelle oder Übersicht will: bis zu 5 Spalten, höchstens 9 Zeilen pro Tafel (mehr Zeilen → zweite Tafel mit weiteren Zeilen), Zellen kurz (höchstens etwa 6 Wörter). Zeilen mit ; trennen, Zellen mit |. Das Programm passt Spaltenbreite und Schrift an. Dazu einen <titel>.\n   Teile: kopfzeile, spalte-1 …, zeile-1 …, außerdem der Inhalt der ersten Spalte in Kleinbuchstaben (z. B. insulin)\n38. <beschriftung ziel='teilname' text='…'/> wenn du doch frei zeichnest: Beschriftung NICHT selbst platzieren, sondern so – das Programm setzt sie mit Hinweislinie sauber daneben.\nSCHABLONEN (fertig gezeichnete Schemata – Anatomie und Zellen zeichnest du NIE selbst):\n39. <schema name='herz' zeige='alle'/> Namen: zelle, mitochondrium, dna (basen='ATGCGT'), chromosom, neuron, synapse, herz, nephron, alveole, auge. zeige='alle' oder nur bestimmte Teile (z. B. zeige='linke-kammer; aorta'), fluss='nein' blendet Flusspfeile aus. Die Schablone braucht die ganze Tafel; zeige mit [[teil|…]] auf die Teile:\n   zelle: zellmembran, zytoplasma, zellkern, kernkoerperchen, raues-er, golgi-apparat, mitochondrium, ribosomen, lysosom, zentriolen\n   mitochondrium: aeussere-membran, intermembranraum, innere-membran, cristae, matrix, atp-synthase, mtdna, ribosomen\n   dna: rueckgrat, basenpaar, wasserstoffbruecken, adenin, thymin, guanin, cytosin, 5-ende, 3-ende\n   chromosom: chromatid-1, chromatid-2, zentromer, kinetochor, p-arm, q-arm, telomer\n   neuron: dendriten, soma, zellkern, axonhuegel, axon, myelinscheide, ranvier-schnuerring, endknoepfchen, erregung\n   synapse: aktionspotenzial, praesynapse, vesikel, transmitter, calciumkanal, synaptischer-spalt, postsynapse, rezeptoren\n   herz: rechter-vorhof, rechte-kammer, linker-vorhof, linke-kammer, septum, trikuspidalklappe, mitralklappe, pulmonalklappe, aortenklappe, aorta, lungenarterie, obere-hohlvene, untere-hohlvene, lungenvenen, blutfluss\n   nephron: glomerulus, bowman-kapsel, vas-afferens, vas-efferens, proximaler-tubulus, henle-schleife, distaler-tubulus, sammelrohr, rinde, mark, harnfluss\n   alveole: bronchiole, alveole, alveolarwand, kapillare, erythrozyt, sauerstoff, kohlendioxid\n   auge: lederhaut, hornhaut, iris, pupille, linse, ziliarkoerper, glaskoerper, netzhaut, gelber-fleck, blinder-fleck, sehnerv, lichtstrahlen\n   Für Details (z. B. was in der Henle-Schleife passiert) eine zweite Tafel mit <netz>, <kette> oder <kurve>.\nMATHE-BAUSTEINE (für alle Mathe-Fragen zuerst diese benutzen, sie rechnen alles exakt; jeder braucht die ganze Tafel unter dem <titel>):\n20. <analyse funktion='x^3-3x' bereich='-3;3' nullstellen='ja' extrema='ja' wendepunkte='ja' tangente='1' steigungsdreieck='0' flaeche='0;2'/> Graph mit berechneten Punkten (N, H, T, W), Tangente an x=1, Steigungsdreieck ab x=0, Fläche/Integral von 0 bis 2. Nur angeben, was gebraucht wird. Zwei Funktionen: funktion='2x+1; x^2' schnittpunkt='ja' (Gleichungssysteme, Schnittpunkte). Für Geraden, Parabeln, Exponentialfunktionen, Ableitung (Tangente), Integral.\n   Teile: graph-1, graph-2, nullstelle, nullstelle-1, hochpunkt, tiefpunkt, extremum-1, scheitel, wendepunkt-1, tangente, steigungsdreieck, delta-x, delta-y, flaeche, ergebnis, schnittpunkt\n21. <prozent start='100 €' schritte='-20%; -10%'/> Balken nach jeder Änderung, Rechnung pro Schritt, Gesamtänderung und die Falle (nicht −30 %). Ohne schritte: <prozent start='80 €' anteil='25'/> zeigt Grundwert, Prozentwert, Prozentsatz.\n   Teile: grundwert, schritt-1, schritt-2, gesamt, falle, prozentwert, prozentsatz, ergebnis\n22. <einheiten von='mL' nach='µL' wert='0.025'/> Vorsilben-Treppe mit Faktoren, Weg von → nach, Ergebnis. Flächen/Volumen: von='m²' nach='cm²' bzw. 'cm³'. Für alle Umrechnungen und Vorsilben (k, M, m, µ, n …).\n   Teile: stufe, von, nach, weg, faktor, regel, ergebnis\n23. <potenzen basis='2' oben='5;3' unten='4'/> Faktoren als Kreise, Kürzen, Exponenten addieren/subtrahieren, Ergebnis.\n   Teile: zaehler, nenner, kuerzen, exponenten, regel, ergebnis\n24. <baum stufen='1/6:Sechs; 5/6:keine Sechs | 1/6:Sechs; 5/6:keine Sechs' pfad='1-1'/> Baumdiagramm, Stufen mit | getrennt, Äste mit ;. pfad='1-1' (mehrere: '1-2, 2-1') markiert Pfade rot, rechnet Produkt- und Summenregel mit Brüchen.\n   Teile: ast-1, ast-1-1, pfad, stufe-1, blatt-1-1, produkt, summe, ergebnis\n25. <normalverteilung mu='100' sigma='15' band='2'/> Glockenkurve, μ, ±σ-Werte, schattiertes Band mit 68 / 95 / 99,7 %.\n   Teile: kurve, mittelwert, sigma-1, sigma-2, band, prozent, ergebnis\n26. <auswahl n='5' k='3' reihenfolge='nein' zuruecklegen='nein'/> Plätze füllen (5 · 4 · 3), bei 'Reihenfolge egal' durch k! teilen = Binomialkoeffizient.\n   Teile: platz-1, platz-2, produkt, ordnung, fakultaet, ergebnis\n27. <einheitskreis winkel='30'/> Einheitskreis, Winkel, sin als Höhe (rot), cos als Breite (blau), exakte Werte, tan = sin/cos.\n   Teile: kreis, winkel, radius, punkt, sinus, cosinus, tangens, pythagoras\n28. <vektoren vektoren='a=3,1; b=1,2' summe='ja' differenz='nein' betrag='a'/> Vektoren im Gitter, Addition Spitze an Fuß, Betrag mit Pythagoras.\n   Teile: vektor-a, vektor-b, summe, differenz, betrag-a, gitter, ergebnis\n29. <kreis r='5' einheit='cm'/> Kreis mit r, d, Fläche und Umfang berechnet.   Teile: radius, durchmesser, flaeche, umfang, formel, ergebnis\n30. <vieleck n='6'/> regelmäßiges Vieleck mit allen Diagonalen, von einer Ecke rot, n·(n−3)/2.   Teile: ecke, von-einer-ecke, diagonalen, ergebnis\nFür Pythagoras <dreieck-rw>, für Rechenwege <gleichung>, für Brüche <bruch-kreis>/<bruch-balken>, für Zahlenfolgen <zahlenfolge>.\n18. <teilchen liste='Ca:2+; Cl:−; Cl:−' namen='Calcium; Chlorid; Chlorid' uebergang='1>2; 1>3' x='40' y='110' breite='920' hoehe='400'/> Atome und Ionen als farbige Kugeln (Metalle orange). uebergang='1>2' (oder '1>2:2' für zwei Elektronen): gelbe Elektronen fliegen sichtbar von Teilchen 1 zu Teilchen 2, sobald du im Text auf [[uebergang|…]] zeigst. teilen='1-2': die Kugeln überlappen, dazwischen das gemeinsame Elektronenpaar (für Atombindung, z. B. liste='Cl; Cl' teilen='1-2'). Ladungen nach dem Doppelpunkt.\n   Teile: teilchen-1 …, ca, cl-1, cl-2 …, uebergang, uebergang-1 …, elektron, paar, elektronenpaar, ladung\n   Ideal für Bindungsarten, Ionenbildung, Redox. Für Moleküle mit Struktur nimmst du <molekuel> (Wasser smiles='[H]O[H]', Ethanol 'CCO').`;
  return `${LB_ROLE}${nurFach(EXTRAS + board, lb.faecher || new Set())}${draw}${wrong}${appWissenText}\n\nSPRACHE: Antworte immer auf ${L.name}, auch Beschriftungen in Zeichnungen. Die Schlüsselwörter ZEICHNUNG, BILDZEICHNUNG und ESELSBRUECKE bleiben unverändert.\n\n${LB_STYLES[lb.style]}\n${voice}`;
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
        <button class="lb-ghost lb-thema-btn" id="lb-thema-open" type="button">📚 Thema lernen</button>
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
      <div class="lb-ki-hinweis">⚠︎ LernBlick arbeitet mit künstlicher Intelligenz und kann Fehler machen – prüf wichtige Fakten nach.</div>
      <div id="lb-status" class="lb-status"></div>
      <div class="lb-compose">
        <button class="lb-icon lb-mic" id="lb-mic" type="button" aria-label="Sprechen" hidden>🎤</button>
        <textarea id="lb-q" rows="2" placeholder="Was verstehst du hier nicht?" dir="auto"></textarea>
        <button class="lb-ghost lb-upbtn" id="lb-upbtn" type="button" title="Eigenes Bild prüfen lassen (Foto deiner Lösung, Zeichnung, Mitschrift)" aria-label="Eigenes Bild hochladen">📷</button><input id="lb-upfile" type="file" accept="image/*" hidden>
        <button class="lb-send" id="lb-send" type="button">Fragen</button>
      </div>
      <div class="lb-row lb-small">
        <button class="lb-ghost" id="lb-explain" type="button">▶ Nochmal zeigen</button>
        <button class="lb-ghost" id="lb-stop" type="button">Stopp</button>
        <label class="lb-check"><input type="checkbox" id="lb-speak"> Immer vorlesen</label>
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
      <div class="lb-qwrap"><button class="lb-qcard" id="lb-qcard" type="button" hidden></button>
        <div class="lb-qcard-detail" id="lb-qcard-detail" hidden><div id="lb-qcard-text"></div><button class="lb-ghost" id="lb-qcard-show" type="button">Auf dem Bildschirm zeigen</button></div></div>
      <div class="lb-row lb-stage-tools">
        <button class="lb-ghost" id="lb-vorlesen" type="button" title="Diese Erklärung mit Stimme vorlesen">🔊 Vorlesen</button>
        <button class="lb-ghost" id="lb-sum" type="button" title="Lernzusammenfassung ansehen, drucken oder speichern">📄 Zusammenfassung</button>
        <button class="lb-ghost" id="lb-stage-mode" type="button">Bildschirm ansehen</button>
        <button class="lb-icon" id="lb-stage-close" type="button" aria-label="Tafel schließen">✕</button>
      </div>
    </div>
    <div id="lb-stage-main" class="lb-stage-main"><div class="lb-waitcard" id="lb-waitcard"><div class="lb-dots"><span></span><span></span><span></span></div><div id="lb-wait-status" class="lb-wait-status"></div><div class="lb-wq-box"><div class="lb-label">Kurze Aufwärmfrage, solange du wartest</div><div id="lb-wq" class="lb-wq"></div><div id="lb-wa" class="lb-wa" hidden></div><div class="lb-row lb-wq-btns"><button class="lb-ghost" id="lb-wa-btn" type="button">Lösung zeigen</button><button class="lb-ghost" id="lb-wnext" type="button">Andere Frage</button></div></div></div><div class="lb-turn">Tipp: Handy quer halten – dann wird die Tafel groß.</div><div class="lb-taphint">Tipp auf etwas an der Tafel, um genau dazu zu fragen. · KI kann Fehler machen.</div></div>
    <div class="lb-stage-bottom">
      <div class="lb-stage-nav">
        <button class="lb-navbtn" id="lb-prev" type="button" aria-label="Vorherige Tafel">‹</button>
        <span id="lb-count" class="lb-count"></span>
        <button class="lb-navbtn" id="lb-next" type="button" aria-label="Nächste Tafel">›</button>
        <button class="lb-ghost lb-peekback" id="lb-peekback" type="button">Zur Tafel</button>
        <button class="lb-ghost lb-backbtn" id="lb-back" type="button" hidden>↩ Zurück</button>
        <button class="lb-send lb-resume" id="lb-resume" type="button" hidden>↩ Weiter mit der Erklärung</button>
      </div>
      <div class="lb-endbar" id="lb-endbar" hidden>
        <button class="lb-send" id="lb-end-weiter" type="button">▶ Weiterlernen</button>
        <button class="lb-ghost" id="lb-end-quiz" type="button">✍️ Frag mich ab</button>
        <button class="lb-ghost" id="lb-end-neu" type="button">Andere Frage</button>
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
  $("thema-open").onclick = () => openThema();
  $("end-weiter").onclick = () => { $("endbar").hidden = true; ask("Weiter: Erklär mir den nächsten wichtigen Punkt zu diesem Thema – Schritt für Schritt an der Tafel."); };
  $("end-quiz").onclick = () => { $("endbar").hidden = true; startQuiz(); };
  $("end-neu").onclick = () => { $("endbar").hidden = true; closeStage(); setTimeout(() => $("q").focus(), 50); };
  $("reshot").onclick = async () => { lb.upload = null; await takeShot(true); };
  $("toggle-draw").onclick = () => { drawHidden = !drawHidden; $("imgdraw").style.visibility = drawHidden ? "hidden" : "visible"; $("toggle-draw").textContent = drawHidden ? "Zeichnung einblenden" : "Zeichnung ausblenden"; };
  $("send").onclick = () => ask();
  $("upbtn").onclick = () => $("upfile").click();
  $("upfile").onchange = (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) pickUpload(f).catch(() => setStatus("Das Bild konnte nicht gelesen werden.")); };
  $("q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } });
  $("stop").onclick = () => { stopWalk(); if (narr) narr.stopped = true; endWait(); revealAll(); };
  $("explain").onclick = replayExplain;
  $("speak").checked = lb.speak;
  $("speak").onchange = () => { lb.speak = $("speak").checked; try { localStorage.setItem("lb-vorlesen", lb.speak ? "1" : "0"); } catch (e) {} };
  // Stimme nur auf Wunsch: diese eine Erklärung vorlesen lassen
  $("vorlesen").onclick = () => { if (!narr) return; lb.speak = true; $("stage").classList.remove("stumm"); playFrom(Math.max(0, narr.shown || 0)); };
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
  $("sum").onclick = () => { if (!cur.turns.length) { setStatus("Noch nichts zum Zusammenfassen – stell zuerst eine Frage."); return; } stopWalk(); if (narr) narr.stopped = true; try { currentAudio && currentAudio.pause(); } catch (e) {} openSummary(buildSummary()); };
  $("back").onclick = () => backToParent(false);
  setupBoardQuestions();
  $("wa-btn").onclick = () => { $("wa").hidden = false; $("wa-btn").hidden = true; };
  $("wnext").onclick = showWarmup;
  $("stage-mode").onclick = () => setStageMode(stageMode === "tafel" ? "peek" : "tafel");
  $("peekback").onclick = () => setStageMode("tafel");
  $("prev").onclick = () => { if (curBoard > 0) navTo(curBoard - 1); };
  $("next").onclick = () => { if (curBoard < cur.boards.length - 1) navTo(curBoard + 1); };
  $("sreplay").onclick = replayExplain;
  $("sstop").onclick = () => { stopWalk(); if (narr) narr.stopped = true; endWait(); revealAll(); };
  const stageAsk = () => { const v = $("sq").value.trim(); if (v) { $("sq").value = ""; ask(v); } };
  $("ssend").onclick = stageAsk;
  $("resume").onclick = resumeExplain;
  // Antippen/Tippen ins Nachfrage-Feld hält die Erklärung an (wie Hand heben)
  $("sq").addEventListener("focus", () => { if (narr && !narr.ended && !narr.stopped) { stopWalk(); narr.stopped = true; try { currentAudio && currentAudio.pause(); } catch (e) {} setStatus("Angehalten – stell deine Frage, danach geht es weiter."); } });
  $("qcard").onclick = () => { const d = $("qcard-detail"); d.hidden = !d.hidden; };
  $("qcard-show").onclick = () => { $("qcard-detail").hidden = true; setStageMode("peek"); };
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
    // Ohne Bild trotzdem die Stellen der Seite kennen (Knöpfe, Texte, 3D-Teile) – dann kann LernBlick weiter zeigen
    try { lb.shotW = window.innerWidth; lb.shotH = window.innerHeight; lb.shotScroll = [window.scrollX, window.scrollY]; lb.anchorText = collectAnchors(); } catch (e2) { lb.anchorText = ""; }
    setStatus("Die Bildschirmaufnahme hat nicht geklappt – du kannst trotzdem fragen.");
  }
}
// ---------- Datenschutz-Hinweis beim ersten Öffnen ----------
const CONSENT_KEY = "lb-datenschutz-v1";
function hasConsent() { try { return !!localStorage.getItem(CONSENT_KEY); } catch (e) { return true; } }
function askConsent(then) {
  let box = document.getElementById("lb-consent");
  if (!box) {
    box = el("div", "lb-consent"); box.id = "lb-consent"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "lb-consent-h");
    box.innerHTML = `<div class="lb-consent-card">
      <h2 id="lb-consent-h">Kurz zum Datenschutz</h2>
      <p>LernBlick ist ein KI-Tutor. Damit er dir helfen kann, schicken wir bei jeder Frage</p>
      <ul><li>deine Frage und den bisherigen Gesprächsverlauf und</li><li>ein Bild der gerade geöffneten App-Seite – nur diese Seite, nicht deinen übrigen Bildschirm –</li></ul>
      <p>an Google (Gemini). Daraus entstehen Erklärung, Tafel und Stimme. Google nutzt diese Daten nicht zum Training seiner KI, und wir speichern keine Gesprächsinhalte.</p>
      <p class="lb-consent-hint">Bitte gib keine sensiblen persönlichen Daten ein (z. B. zu deiner Gesundheit).</p>
      <a href="#" class="lb-consent-link">Datenschutzerklärung lesen</a>
      <div class="lb-consent-btns"><button type="button" class="lb-ghost lb-consent-no">Abbrechen</button><button type="button" class="lb-send lb-consent-ok">Verstanden, los geht's</button></div>
    </div>`;
    $("panel").parentNode.appendChild(box);
    box.querySelector(".lb-consent-link").onclick = (e) => { e.preventDefault(); const m = document.getElementById("modal-datenschutz"); if (m) { m.style.display = "block"; m.style.zIndex = "2147483647"; } else window.open("/", "_blank"); };
  }
  box.hidden = false;
  box.querySelector(".lb-consent-no").onclick = () => { box.hidden = true; };
  box.querySelector(".lb-consent-ok").onclick = () => { try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ am: new Date().toISOString() })); } catch (e) {} box.hidden = true; then(); };
  box.querySelector(".lb-consent-ok").focus();
}
async function openPanel(opts = {}) {
  if (lb.open) { if (opts.ask) ask(opts.ask); else if (opts.thema) openThema(opts.thema === true ? "" : opts.thema); return; }
  if (!hasConsent() && !window.__LB_BENCH) return askConsent(() => openPanel(opts));
  $("fab").hidden = true;
  lb.ctx = readContext();
  await takeShot(false);
  lb.open = true; lb.usedSession = false;
  cur = { boards: [], turns: [] }; curBoard = -1; answerBoards = null; lastBody = "";
  $("panel").hidden = false;
  document.documentElement.classList.add("lb-open");
  $("seen-title").textContent = lb.ctx.frage ? `Eine ${(() => { const p = lb.ctx.frage.bereich.split(" / "); const t = (p[1] || p[0] || "").replace(/^bms$/i, "BMS"); return t.charAt(0).toUpperCase() + t.slice(1); })()}-Aufgabe${lb.ctx.frage.gewaehlt ? " – deine Antwort war leider falsch" : ""}` : (lb.ctx.ueberschrift || lb.ctx.seite);
  $("chat").replaceChildren(el("p", "lb-empty", lb.ctx.frage && lb.ctx.frage.gewaehlt ? "Ich sehe deine Aufgabe. Soll ich dir zeigen, wo der Denkfehler lag?" : "Ich sehe, woran du gerade arbeitest. Frag mich einfach – oder tipp auf einen Vorschlag."));
  $("tips").hidden = false;
  if (opts.starters) showStarters();
  if (opts.thema) openThema(opts.thema === true ? "" : opts.thema);
  clearBoard(); $("boardwrap").hidden = true;
  ensureLibs().catch(() => setStatus("Zeichen-Bibliotheken konnten nicht geladen werden."));
  if (!appWissenText) ladeAppWissen();
  if (opts.ask) ask(opts.ask);
  else if (opts.thema) { /* Thema-Ansicht ist schon offen */ }
  else if (lb.ctx.frage && lb.ctx.frage.gewaehlt) analyseMistake();
  else setTimeout(() => $("q").focus(), 50);
}
// ---------- Falsch beantwortet: Denkfehler erkennen und passende Gesprächsaufhänger anbieten ----------
const WRONG_ASK = "Ich habe diese Aufgabe falsch beantwortet. Zeig mir an der Tafel Schritt für Schritt, wie man auf die richtige Antwort kommt, wo genau mein Denkfehler lag, und gib mir einen Strategie-Tipp für diesen Untertest.";
const MISTAKE_RULES = `Du bist eine erfahrene MedAT-Lehrkraft und analysierst eine falsch beantwortete Aufgabe, BEVOR du erklärst.
So findest du den Denkfehler:
- Aussagen-Kombinationen (Antworten wie "Aussagen 1, 3 und 4 sind richtig"): Vergleiche die gewählte mit der richtigen Kombination. Aussagen, die in BEIDEN stehen (oder in beiden fehlen), hat die Person richtig eingeschätzt. Aussagen, die nur in EINER der beiden vorkommen, sind genau die, bei denen sie falsch lag – dort liegt der Lernfehler.
- Rechenaufgaben: Welcher typische Fehler führt genau zur gewählten Zahl (Faktor 10 vergessen, Prozent addiert statt multipliziert, Einheit nicht umgerechnet …)?
- Wissensfragen: Welche Verwechslung steckt hinter der gewählten Antwort (ähnlicher Begriff, Umkehrung, falsche Zuordnung)?
- "Keine der Antwortmöglichkeiten": prüfe, ob die Person eine richtige Möglichkeit übersehen hat.
Antworte NUR mit JSON, ohne Erklärtext:
{"richtig_erkannt": "was die Person schon richtig hatte, höchstens 12 Wörter, Du-Form", "denkfehler": "der Denkfehler in einem Satz, Du-Form, ohne Vorwurf", "starter": [{"knopf": "höchstens 6 Wörter", "frage": "was LernBlick dann erklären soll, in Ich-Form aus Sicht der Person"}]}
3 bis 4 Starter: der erste trifft genau den Denkfehler (z. B. "Warum Aussage 2 doch stimmt"), die weiteren vertiefen das Fachwissen dahinter (ein Begriff, ein Mechanismus, ein Vergleich, eine Merkhilfe). Fachlich exakt, Sprache wie für eine 18-jährige Person.`;
let mistake = null;
async function analyseMistake() {
  const tips = $("tips"); mistake = null;
  const all = el("button", "lb-tip lb-tip-main", "▶ Alles Schritt für Schritt erklären"); all.type = "button";
  all.onclick = () => ask(mistake ? `${WRONG_ASK}\n(Hintergrund – erkannter Denkfehler: ${mistake.denkfehler || ""}. Schon richtig: ${mistake.richtig_erkannt || ""})` : WRONG_ASK);
  const wait = el("p", "lb-empty", "Ich schaue mir an, wo genau dein Denkfehler liegt …");
  $("chat").replaceChildren(wait); tips.replaceChildren(all); tips.hidden = false;
  try {
    const data = await callFn("lernblick-chat", { system_prompt: MISTAKE_RULES, messages: [{ role: "user", content: contextText(lb.ctx) }], kurz: true });
    const raw = String(data.response || "").replace(/^```(?:json)?\s*|\s*```$/g, "");
    const m = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    mistake = m;
    const box = el("div", "lb-mistake");
    if (m.richtig_erkannt) box.appendChild(el("p", "lb-mistake-ok", "✓ " + m.richtig_erkannt));
    if (m.denkfehler) box.appendChild(el("p", "lb-mistake-err", "✗ " + m.denkfehler));
    box.appendChild(el("p", "lb-muted", "Womit wollen wir anfangen?"));
    $("chat").replaceChildren(box);
    const btns = (m.starter || []).slice(0, 4).filter((x) => x && x.knopf && x.frage).map((x, i) => {
      const b = el("button", "lb-tip" + (i === 0 ? " lb-tip-main" : ""), x.knopf); b.type = "button";
      b.onclick = () => ask(`${x.frage}\n(Hintergrund – erkannter Denkfehler: ${m.denkfehler || ""}. Schon richtig: ${m.richtig_erkannt || ""})`);
      return b;
    });
    all.className = "lb-tip"; all.textContent = "Alles Schritt für Schritt erklären";
    tips.replaceChildren(...btns, all);
  } catch (e) {
    $("chat").replaceChildren(el("p", "lb-empty", "Ich sehe deine Aufgabe. Soll ich dir zeigen, wo der Denkfehler lag?"));
  }
}
// Gesprächsstarter (ersetzt das frühere KI-Lern-Studio): sofort fragen oder Satzanfang vorgeben
const STARTERS = [
  ["📐 Rechne mir etwas vor", "Rechne mir Schritt für Schritt vor: "], ["🧪 Zeig mir einen Ablauf", "Zeig mir den Ablauf von "],
  ["🔍 Erklär mir ein Thema", "Erklär mir einfach und mit Zeichnung: "], ["🧩 Ich hänge an einer Formel", "Drösel mir diese Formel auf: "],
  ["🧠 Eselsbrücke", "Gib mir eine gute Eselsbrücke für "], ["✅ Prüf mich ab", "Stell mir 3 kurze Fragen zu "],
  ["🔁 Wie lerne ich mit Wiederholung?", "Wie funktioniert Spaced Repetition und wie lerne ich damit für den MedAT? Zeig es mir an der Tafel."],
  ["🏰 Gedächtnispalast für Allergieausweise", "Wie baue ich einen Gedächtnispalast für den Untertest Allergieausweise? Zeig es mir an einem Beispiel."]
];
function showStarters() {
  const thBtn = el("button", "lb-tip lb-tip-main", "📚 Thema lernen"); thBtn.type = "button";
  thBtn.onclick = () => openThema();
  $("tips").replaceChildren(thBtn, ...STARTERS.map(([label, text]) => {
    const b = el("button", "lb-tip", label); b.type = "button";
    b.onclick = () => { if (/[:\s]$/.test(text) || / (von|für|zu)\s*$/.test(text)) { $("q").value = text; $("q").focus(); } else ask(text); };
    return b;
  }));
  $("chat").replaceChildren(el("p", "lb-empty", "Worum geht's? Tipp auf einen Vorschlag und ergänze das Thema – oder frag einfach drauflos."));
}
// ---------- Thema lernen: Thema eingeben → passende Inhalte der App, Infografik zum Einstieg, Erklärung an der Tafel ----------
const THEMEN = ["Zelle & Organellen", "Mitose & Meiose", "Vom Gen zum Protein", "Hormonsystem", "Aktionspotenzial", "Blutgruppen",
  "Mendelsche Regeln", "Herz & Kreislauf", "Immunsystem", "Enzyme", "Säuren & Basen", "Zellatmung"];
// Suchbegriffe → Wörter, die in Titeln der App vorkommen
const THEMA_SYN = {
  zell: ["zellbiologie", "organell", "zellorganellen"], organell: ["zellbiologie", "zellorganellen", "mitochondri"], mitochondri: ["mitochondri", "zellorganellen", "zellbiologie"],
  hormon: ["hormonsystem", "hypophyse", "hypothalamus"], drüse: ["hormonsystem"], hypophys: ["hormonsystem", "hypothalamus"], hypothalam: ["hormonsystem", "hypophyse"],
  schilddrüse: ["hormonsystem"], insulin: ["hormonsystem", "blutzucker"], blutzucker: ["hormonsystem"], diabetes: ["hormonsystem"],
  blutgrupp: ["blutgruppen", "ab0"], rhesus: ["blutgruppen"], ab0: ["blutgruppen"], transfusion: ["blutgruppen"],
  dna: ["dna", "translation", "genexpression", "molekulargenetik", "gen zum protein"], gen: ["dna", "genexpression", "genetik", "gen zum protein"],
  protein: ["translation", "aminosäuren", "gen zum protein"], translation: ["translation", "dna", "genexpression"], transkription: ["genexpression", "transkription", "dna"],
  codon: ["dna", "translation", "code"], mutation: ["dna", "mutation"], aminosäure: ["aminosäuren"],
  mitose: ["mitose", "meiose", "zellteilung"], meiose: ["meiose", "mitose"], zellteilung: ["mitose", "meiose"], zellzyklus: ["mitose"],
  vererb: ["stammbaum", "genetik", "mendel"], mendel: ["mendel", "genetik", "stammbaum"], erbgang: ["stammbaum", "genetik"], genetik: ["genetik", "stammbaum", "mendel"],
  gewebe: ["histologie"], histolog: ["histologie"], epithel: ["histologie"], muskel: ["muskeln", "skelett"], knochen: ["skelett"], skelett: ["skelett"], gelenk: ["skelett"],
  aktionspotenzial: ["aktionspotenzial"], nerv: ["aktionspotenzial"], synapse: ["aktionspotenzial"],
  säure: ["säure", "base"], base: ["säure", "base"], ph: ["säure"], puffer: ["säure"],
  welle: ["wellen"], schall: ["wellen"], doppler: ["wellen"], hebel: ["hebel"], kraft: ["kräfte"], kräfte: ["kräfte"], newton: ["kräfte"],
  strom: ["stromkreis"], widerstand: ["stromkreis"], ohm: ["stromkreis"], linse: ["linsen", "optik"], optik: ["optik", "linsen"], auge: ["linsen", "optik"],
  radioaktiv: ["halbwertszeit"], zerfall: ["halbwertszeit"], halbwert: ["halbwertszeit"],
};
const normT = (s) => String(s || "").toLowerCase().replace(/ß/g, "ss").replace(/[^a-z0-9äöü&+ ]+/g, " ").replace(/\s+/g, " ").trim();
function themaBegriffe(t) {
  const toks = normT(t).split(" ").filter((w) => w.length >= 3 && !/^(und|der|die|das|den|vom|von|mit|für|zum|zur|ein|eine)$/.test(w));
  const out = new Map();
  toks.forEach((w) => {
    out.set(w.length > 6 ? w.slice(0, w.length - 2) : w, 3);                       // Wortstamm: „hormone“ trifft „hormonsystem“
    Object.entries(THEMA_SYN).forEach(([k, v]) => { if (k.length <= 3 ? w === k : (w.startsWith(k) || (w.length >= 4 && k.startsWith(w)))) v.forEach((x) => out.set(x, Math.max(out.get(x) || 0, 2))); });
  });
  return out;
}
function themaTreffer(items, t, max) {
  const b = themaBegriffe(t);
  return items.map((it) => {
    const ti = normT(it.titel), tx = normT(it.text);
    let sc = 0; b.forEach((w, k) => { if (ti.includes(k)) sc += w * 2; else if (tx.includes(k)) sc += w; });
    return { it, sc };
  }).filter((x) => x.sc >= 2).sort((a, b2) => b2.sc - a.sc).slice(0, max).map((x) => x.it);
}
let appKatalogCache = null;
// Werkzeuge der App: direkt von der Startseite gelesen – neue Werkzeuge sind damit ohne Pflege dabei
async function appKatalog() {
  if (appKatalogCache) return appKatalogCache;
  let doc = document, live = true;
  if (!document.querySelector("#screen-tools .tools-card")) {
    live = false;
    try { doc = new DOMParser().parseFromString(await (await fetch("/index.html")).text(), "text/html"); } catch (e) { return (appKatalogCache = []); }
  }
  const items = [];
  doc.querySelectorAll("#screen-tools .tools-card, .eli5-card").forEach((a) => {
    const titel = ((a.querySelector("h3") || {}).textContent || "").replace(/\s+/g, " ").trim();
    const href = a.getAttribute("href");
    if (!titel || !href) return;
    const grid = a.closest(".tools-grid"), head = grid && grid.previousElementSibling;
    const fach = a.classList.contains("eli5-card") ? "Einfach erklärt" : (head && head.classList.contains("tools-section-title") ? head.textContent.trim() : "Wissens-Lab");
    items.push({ art: "werkzeug", titel, text: ((a.querySelector("p") || {}).textContent || "").trim(), fach, href: new URL(href, location.origin + "/").href, card: live ? a : null, d3: /3d/i.test(titel) });
  });
  return (appKatalogCache = items);
}
async function sheetKatalog() {
  try {
    const sb = await getSupabase();
    const { data } = await sb.from("goodies").select("id,title,description,content_highlights,files,cover_emoji");
    return (data || []).map((g) => ({ art: "sheet", id: g.id, titel: g.title, emoji: g.cover_emoji || "📄", files: (Array.isArray(g.files) ? g.files : []).filter((f) => f && f.path && /\.(png|jpe?g|webp)$/i.test(f.path)),
      text: [g.description || "", ...(Array.isArray(g.content_highlights) ? g.content_highlights : []), ...(Array.isArray(g.files) ? g.files.map((f) => (f && f.name) || "") : [])].join(" ") }));
  } catch (e) { return []; }
}
let grafikKatalogCache = null;
async function grafikKatalog() {
  if (!grafikKatalogCache) grafikKatalogCache = await (await fetch("/assets/lernblick/grafik.json")).json();
  return grafikKatalogCache;
}
const thema = { titel: "", treffer: [], grafik: null, wahl: { art: "poster", stil: "sketchnote" } };
const TOOL_ASK = (t) => `Ich will das Thema „${t}“ lernen und habe dafür dieses Werkzeug geöffnet. Zeig mir hier auf dem Bildschirm (mit Markierungen – und im 3D-Modell, falls es eins gibt), wo ich was finde und womit ich anfangen soll, und erklär mir das Thema dabei Schritt für Schritt an der Tafel – mit einem Beispiel aus dem Alltag oder der Medizin.`;
function themaHintergrund() {
  const parts = [];
  if (thema.treffer.length) parts.push("In der App gibt es dazu: " + thema.treffer.map((x) => `${x.titel}${x.art === "sheet" ? " (Cheat-Sheet)" : ` (${x.fach}${x.text ? ": " + x.text : ""})`}`).join("; ") + ". Sag mir am Ende in einem Satz, wo ich in der App damit weiterüben kann.");
  if (thema.grafik && thema.grafik.inhalt) parts.push("Ich habe dazu eben eine Infografik mit diesem Inhalt bekommen – knüpf daran an: " + thema.grafik.inhalt.replace(/\s+/g, " ").slice(0, 700));
  return parts.length ? `\n(Hintergrund – ${parts.join(" ")})` : "";
}
function openThema(topic) {
  $("tips").replaceChildren(); $("tips").hidden = true;
  const box = el("div", "lb-thema"); box.id = "lb-thema";
  box.appendChild(el("div", "lb-thema-h", "📚 Thema lernen"));
  const form = el("form", "lb-thema-form");
  const inp = el("input"); inp.type = "text"; inp.id = "lb-thema-in"; inp.placeholder = "Welches Thema? z. B. Zellatmung"; inp.value = topic || ""; inp.setAttribute("aria-label", "Thema");
  const go = el("button", "lb-send", "Los"); go.type = "submit";
  form.append(inp, go);
  form.onsubmit = (e) => { e.preventDefault(); if (inp.value.trim()) themaAnsicht(inp.value.trim()); };
  box.appendChild(form);
  const chips = el("div", "lb-thema-chips"); chips.id = "lb-thema-chips";
  THEMEN.forEach((t) => { const c = el("button", "lb-tip", t); c.type = "button"; c.onclick = () => { inp.value = t; themaAnsicht(t); }; chips.appendChild(c); });
  box.appendChild(chips);
  box.appendChild(el("div", "lb-thema-body")).id = "lb-thema-body";
  $("chat").replaceChildren(box);
  if (topic) themaAnsicht(topic); else setTimeout(() => inp.focus(), 50);
}
async function themaAnsicht(t) {
  thema.titel = t; thema.grafik = null; thema.treffer = [];
  const chips = document.getElementById("lb-thema-chips"); if (chips) chips.hidden = true;
  const body = document.getElementById("lb-thema-body"); if (!body) return;
  body.replaceChildren();
  // 1. Was es in der App schon gibt
  const app = el("section", "lb-thema-sec");
  app.appendChild(el("div", "lb-label", "In der App"));
  const list = el("div", "lb-thema-list"); list.appendChild(el("p", "lb-muted", "Ich schaue, was es dazu in der App gibt …"));
  app.appendChild(list); body.appendChild(app);
  // 2. Infografik zum Einstieg
  const gr = el("section", "lb-thema-sec"); gr.id = "lb-thema-grafik"; body.appendChild(gr);
  // 3. Direkt an der Tafel
  const tafel = el("section", "lb-thema-sec");
  tafel.appendChild(el("div", "lb-label", "An der Tafel lernen"));
  const tb = el("div", "lb-tips");
  [["▶ Von Grund auf erklären", () => `Ich will das Thema „${t}“ für den MedAT lernen. Bau es mir an der Tafel von Grund auf Schritt für Schritt auf: zuerst der Überblick (worum geht es, wozu braucht man das), dann die wichtigsten Kernpunkte nacheinander, ein Beispiel aus dem Alltag oder der Medizin und am Ende die typische MedAT-Falle.`, true],
   ["🌍 Mit Beispiel aus dem Alltag", () => `Erklär mir das Thema „${t}“ an einem anschaulichen Beispiel aus dem Alltag oder aus der Klinik – an der Tafel, Schritt für Schritt, und zeig, wie das Beispiel mit dem Fachwissen zusammenhängt.`],
   ["🧠 Eselsbrücke", () => `Gib mir eine gute Eselsbrücke für das Thema „${t}“ und zeig an der Tafel, wie sie mit dem Fachwissen zusammenhängt.`],
   ["✅ Prüf mich ab", () => `Stell mir 3 kurze MedAT-typische Fragen zum Thema „${t}“ – eine nach der anderen – und erklär mir nach jeder Antwort an der Tafel, was richtig ist.`]
  ].forEach(([label, q, main]) => { const b = el("button", "lb-tip" + (main ? " lb-tip-main" : ""), label); b.type = "button"; b.onclick = () => ask(q() + themaHintergrund()); tb.appendChild(b); });
  tafel.appendChild(tb); body.appendChild(tafel);
  grafikWahl(gr, t).catch(() => { gr.replaceChildren(el("p", "lb-muted", "Die Infografik-Auswahl konnte nicht geladen werden.")); });
  // Treffer suchen (Werkzeuge sofort, Cheat-Sheets brauchen die Anmeldung)
  const [werk, sheets] = await Promise.all([appKatalog().catch(() => []), sheetKatalog()]);
  if (thema.titel !== t) return;
  thema.treffer = [...themaTreffer(werk, t, 3), ...themaTreffer(sheets, t, 2)];
  list.replaceChildren();
  if (!thema.treffer.length) { list.appendChild(el("p", "lb-muted", "Dazu gibt es noch kein eigenes Werkzeug in der App – kein Problem: Infografik und Tafel funktionieren mit jedem Thema.")); return; }
  thema.treffer.forEach((it) => {
    const card = el("div", "lb-thema-card");
    const ico = el("div", "lb-thema-ico", it.art === "sheet" ? it.emoji : it.d3 ? "🧊" : "🧪");
    const tx = el("div", "lb-thema-tx"); tx.appendChild(el("b", "", it.titel));
    tx.appendChild(el("span", "", it.art === "sheet" ? "Cheat-Sheet – Punkt antippen, LernBlick erklärt ihn" : `${it.fach}${it.text ? " · " + it.text : ""}`));
    const b = el("button", "lb-ghost", it.art === "sheet" ? "Ansehen" : "Öffnen & erklären"); b.type = "button";
    b.onclick = () => (it.art === "sheet" ? oeffneSheet(it) : oeffneWerkzeug(it, t, b));
    card.append(ico, tx, b); list.appendChild(card);
  });
}
// ---------- LernBlick kennt die App: Werkzeuge und Cheat-Sheets mit Kürzel, Knöpfe zum Öffnen ----------
let appWissenText = "", appZiele = {};
async function ladeAppWissen() {
  try {
    const [werk, sheets] = await Promise.all([appKatalog().catch(() => []), sheetKatalog()]);
    appZiele = {};
    const zeilen = [];
    werk.forEach((it, i) => { const id = "w" + (i + 1); appZiele[id] = it; zeilen.push(`${id}: ${it.titel} – ${it.fach}${it.text ? ": " + it.text : ""}`); });
    sheets.forEach((it, i) => { const id = "s" + (i + 1); appZiele[id] = it; zeilen.push(`${id}: Cheat-Sheet „${it.titel}“ – ${it.text.replace(/\S+\.(png|jpe?g)/gi, "").replace(/\s+/g, " ").trim().slice(0, 160)}`); });
    appWissenText = zeilen.length ? `\n\nDIE APP (MedAT Trainer) – das gibt es hier zum Lernen, mit Kürzel:\n${zeilen.join("\n")}\nPasst ein Werkzeug oder Cheat-Sheet zur Frage, schreibe GANZ AM ENDE eine eigene Zeile \`ÖFFNEN: w3\` (höchstens zwei solche Zeilen, nur Kürzel aus der Liste). Dann erscheint ein Knopf, der die Person direkt hinbringt – Werkzeuge öffnen sich und du erklärst dort weiter. Sag im Text in einem Satz, was sie dort findet. Verweise NIE vage („vielleicht im BMS-Teil“, „schau im Wissens-Lab“) – entweder ein Kürzel oder gar nichts.` : "";
  } catch (e) { appWissenText = ""; }
}
function zielKnoepfe(ids, frage) {
  const its = [...new Set(ids)].map((id) => appZiele[id]).filter(Boolean).slice(0, 3);
  if (!its.length) return null;
  const box = el("div", "lb-ziele");
  its.forEach((it) => {
    const b = el("button", "lb-tip lb-tip-main", (it.art === "sheet" ? "📄 Cheat-Sheet: " : (it.d3 ? "🧊 " : "🧪 ")) + it.titel + (it.art === "sheet" ? "" : " öffnen"));
    b.type = "button";
    b.onclick = () => (it.art === "sheet" ? oeffneSheet(it) : oeffneWerkzeug(it, frage || it.titel, b));
    box.appendChild(b);
  });
  return box;
}
function oeffneWerkzeug(it, t, btn) {
  // Bezahlschranke der App bleibt – aber sichtbar im Gespräch statt eines stillen Klicks
  if (it.card && it.card.classList.contains("is-locked")) {
    const box = el("div", "lb-thema-lock");
    box.appendChild(el("p", "", `„${it.titel}“ gehört zu Premium. Mit Premium öffnet LernBlick das Werkzeug und erklärt dir das Thema direkt darin.`));
    const up = el("button", "lb-send", "Premium ansehen"); up.type = "button";
    up.onclick = () => { closePanel(); if (typeof App !== "undefined" && App.openToolsUpgradeModal) App.openToolsUpgradeModal(); else it.card.click(); };
    box.appendChild(up);
    const card = btn && btn.closest(".lb-thema-card");
    if (card) card.after(box); else $("chat").appendChild(box);
    return;
  }
  const u = new URL(it.href, location.origin + "/");
  if (u.pathname.replace(/\.html$/, "") === location.pathname.replace(/\.html$/, "")) { ask(TOOL_ASK(t)); return; }
  u.searchParams.set("lernblick", t);
  setStatus(`Ich öffne „${it.titel}“ …`);
  location.assign(u.href);
}
// Cheat-Sheet direkt hier im Gespräch zeigen – antippen erklärt den Punkt, Herunterladen geht auch
async function oeffneSheet(it) {
  try {
    const sb = await getSupabase();
    const files = it.files || [];
    if (!files.length) throw new Error("keine Bilder");
    const box = el("div", "lb-thema-sheets");
    box.appendChild(el("p", "lb-muted", `Cheat-Sheet „${it.titel}“ – tipp auf einen Punkt, dann erkläre ich genau den.`));
    files.forEach((f) => {
      const url = sb.storage.from("goodies").getPublicUrl(f.path).data.publicUrl;
      const fig = el("figure", "lb-grafik");
      const im = new Image(); im.className = "lb-sheet lb-grafik-img"; im.crossOrigin = "anonymous"; im.loading = "lazy"; im.src = url; im.alt = it.titel; im.setAttribute("data-title", it.titel);
      const dl = el("a", "lb-tip", "⬇ Herunterladen"); dl.href = url; dl.target = "_blank"; dl.rel = "noopener"; dl.setAttribute("download", (f.name || it.titel) .replace(/[^\wäöüÄÖÜß .-]+/g, ""));
      fig.append(im, dl); box.appendChild(fig);
    });
    const list = document.querySelector("#lb-thema .lb-thema-list");
    (list || $("chat")).appendChild(box);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) { setStatus("Das Cheat-Sheet konnte nicht geladen werden – bitte gleich nochmal versuchen."); }
}
async function grafikWahl(sec, t) {
  const kat = await grafikKatalog();
  if (thema.titel !== t) return;
  sec.replaceChildren(el("div", "lb-label", "Mit einer Infografik einsteigen"));
  const w = thema.wahl;
  const arten = el("div", "lb-art-row"); arten.setAttribute("role", "listbox"); arten.setAttribute("aria-label", "Art der Infografik");
  const info = el("p", "lb-art-info");
  const zeigeInfo = () => { const a = kat.arten.find((x) => x.id === w.art); info.textContent = a ? `${a.label}: ${a.aufteilung || a.hint}` : ""; };
  kat.arten.forEach((a) => {
    const b = el("button", "lb-art"); b.type = "button"; b.setAttribute("aria-pressed", String(a.id === w.art)); b.title = a.hint;
    const im = new Image(); im.loading = "lazy"; im.alt = ""; im.src = `/assets/lernblick/arten/${a.id}.jpg`;
    b.append(im, el("span", "", a.label.replace(/ \(sehr dicht\)/, "")));
    b.onclick = () => { w.art = a.id; arten.querySelectorAll(".lb-art").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); zeigeInfo(); };
    arten.appendChild(b);
  });
  const stile = el("div", "lb-stil-row"); stile.setAttribute("aria-label", "Zeichenstil");
  kat.stile.forEach((s) => {
    const b = el("button", "lb-stil"); b.type = "button"; b.setAttribute("aria-pressed", String(s.id === w.stil)); b.title = s.sub;
    const im = new Image(); im.loading = "lazy"; im.alt = ""; im.src = `/assets/lernblick/stile/${s.id}.jpg`;
    b.append(im, el("span", "", s.label));
    b.onclick = () => { w.stil = s.id; stile.querySelectorAll(".lb-stil").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); };
    stile.appendChild(b);
  });
  const go = el("button", "lb-send lb-grafik-go", "🎨 Infografik erstellen"); go.type = "button";
  const out = el("div", "lb-grafik-out");
  go.onclick = () => grafikErstellen(t, kat, out, go);
  zeigeInfo();
  sec.append(arten, info, el("div", "lb-label lb-label-sm", "Zeichenstil"), stile, go, out);
}
async function grafikErstellen(t, kat, out, go) {
  const a = kat.arten.find((x) => x.id === thema.wahl.art) || kat.arten[0];
  const s = kat.stile.find((x) => x.id === thema.wahl.stil) || kat.stile[0];
  go.disabled = true;
  out.replaceChildren(el("div", "lb-grafik-wait", `Die ${a.label.replace(/ \(sehr dicht\)/, "")} zu „${t}“ entsteht … das dauert etwa 15–30 Sekunden.`));
  try {
    const d = await callFn("lernblick-bild", { thema: t, art_label: a.label, art_regeln: a.regeln, stil_text: s.design, orientation: a.hoch ? "hochformat" : "querformat" });
    if (!d.image_base64) throw new Error(d.error || "Kein Bild");
    if (thema.titel !== t) return;
    const url = await kiStempel(`data:${d.mime_type || "image/jpeg"};base64,${d.image_base64}`);
    thema.grafik = { url, b64: url.split(",")[1], inhalt: d.inhalt || "", titel: `${a.label.replace(/ \(sehr dicht\)/, "")}: ${t}`, art: a.id, stil: s.id };
    const fig = el("figure", "lb-grafik");
    const im = new Image(); im.className = "lb-sheet lb-grafik-img"; im.src = url; im.alt = thema.grafik.titel; im.setAttribute("data-title", thema.grafik.titel); im.setAttribute("data-ki", "1");
    fig.append(im, el("figcaption", "", "Tipp auf eine Stelle – LernBlick erklärt genau die. Die Grafik hat eine KI gezeichnet: Wenn dir etwas komisch vorkommt, frag nach."));
    const row = el("div", "lb-tips");
    const b1 = el("button", "lb-tip lb-tip-main", "▶ Erklär mir die Grafik"); b1.type = "button"; b1.onclick = () => grafikErklaeren();
    const b2 = el("button", "lb-tip", "💾 Ins Lernarchiv"); b2.type = "button"; b2.onclick = () => grafikSpeichern(b2);
    const b3 = el("a", "lb-tip", "⬇ Herunterladen"); b3.href = url; b3.download = `${t.replace(/[^\wäöüÄÖÜß -]+/g, "").trim() || "infografik"} – ${a.id}.jpg`;
    const b4 = el("button", "lb-tip", "↻ Nochmal"); b4.type = "button"; b4.onclick = () => grafikErstellen(t, kat, out, go);
    row.append(b1, b2, b3, b4);
    out.replaceChildren(fig, row);
  } catch (e) {
    out.replaceChildren(el("p", "lb-err", "Die Infografik hat gerade nicht geklappt: " + (e.message || e) + " – versuch es gleich nochmal."));
  } finally { go.disabled = false; }
}
// Unten ins Bild: „Mit KI erstellt – kann Fehler enthalten“ – so steht der Hinweis auch auf jedem Ausdruck
async function kiStempel(src) {
  try {
    const im = await new Promise((r, j) => { const x = new Image(); x.onload = () => r(x); x.onerror = j; x.src = src; });
    const bar = Math.round(im.width * 0.035), c = document.createElement("canvas");
    c.width = im.width; c.height = im.height + bar;
    const g = c.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0);
    g.fillStyle = "#f4f1fa"; g.fillRect(0, im.height, c.width, bar);
    g.fillStyle = "#4a4560"; g.font = `${Math.round(bar * 0.45)}px Inter, Arial, sans-serif`; g.textBaseline = "middle";
    g.fillText("Mit KI erstellt – kann Fehler enthalten. Bitte wichtige Fakten prüfen. · MedAT Trainer", Math.round(bar * 0.5), im.height + bar / 2);
    return c.toDataURL("image/jpeg", 0.9);
  } catch (e) { return src; }
}
async function grafikErklaeren() {
  const g = thema.grafik; if (!g) return;
  const src = await new Promise((r, j) => { const x = new Image(); x.onload = () => r(x); x.onerror = j; x.src = g.url; });
  const k = Math.min(1, 1400 / Math.max(src.width, src.height)), c = document.createElement("canvas");
  c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.88);
  lb.upload = { dataUrl, w: c.width, h: c.height, fresh: true, kind: "grafik", title: g.titel };
  lb.shot = dataUrl; lb.shotW = c.width; lb.shotH = c.height; lb.anchorText = ""; anchors = {};
  lb.ctx = { seite: "Infografik „" + g.titel + "“", pfad: "", ueberschrift: g.titel, frage: null };
  ask(`Erklär mir diese Infografik zum Thema „${thema.titel}“ Schritt für Schritt: zeig auf der Grafik, wo was steht, und mach an der Tafel verständlich, was dahintersteckt.` + themaHintergrund().replace(/Ich habe dazu eben eine Infografik[^)]*/, ""));
}
async function grafikSpeichern(btn) {
  const g = thema.grafik; if (!g) return;
  try {
    btn.disabled = true; btn.textContent = "Speichere …";
    const token = await getToken();
    const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: CONFIG.SUPABASE_ANON_KEY },
      body: JSON.stringify({ title: g.titel.slice(0, 100), bereich: "LernBlick · Thema lernen", frage_text: thema.titel.slice(0, 120), stil: g.stil, content_type: g.art, image_data: g.b64 }),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || "Speichern fehlgeschlagen");
    btn.textContent = "✓ Im Lernarchiv"; if (typeof Gallery !== "undefined") Gallery._loaded = false;
  } catch (e) { btn.disabled = false; btn.textContent = "💾 Nochmal speichern"; setStatus("Speichern hat nicht geklappt: " + (e.message || e)); }
}
// ---------- Frag mich ab: schriftlich, zwei kleine KI-Anfragen (Fragen stellen, Antworten prüfen) – keine Stimme, keine Tafel ----------
let forceSpeak = null;
const QUIZ_FRAGEN = `Du bist eine MedAT-Lehrkraft. Aus der Erklärung unten stellst du GENAU 3 kurze Verständnisfragen, die zeigen, ob die Person es wirklich verstanden hat (nicht nur auswendig): eine zum Grundprinzip, eine zur Anwendung oder einem Beispiel, eine zu einer typischen Verwechslung. Jede ist in 1–2 Sätzen beantwortbar. Nur zu dem, was erklärt wurde. Du-Form, Deutsch.
Antworte NUR mit JSON: {"fragen":["…","…","…"]}`;
const QUIZ_PRUEF = `Du prüfst die Antworten einer Person, die sich auf den MedAT vorbereitet. Sei fair: sinngemäß richtig zählt als richtig, auch mit anderen Worten oder kleinen Tippfehlern. "teils" = Kern stimmt, aber etwas Wichtiges fehlt oder ist ungenau.
Antworte NUR mit JSON: {"ergebnisse":[{"ok":"ja|teils|nein","rueckmeldung":"1–2 Sätze, Du-Form, freundlich, sag konkret, was fehlt oder falsch ist","richtig":"die richtige Antwort in einem Satz"}]} – in derselben Reihenfolge wie die Fragen.`;
function quizStoff() {
  return cur.turns.slice(-3).map((t) => `${cleanAsk(t.ask) || ""}\n${String(t.a || "").replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1")}`).join("\n\n").slice(-6000);
}
function quizJson(t) { const s = String(t).replace(/^```(?:json)?\s*|\s*```$/g, ""); return JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1)); }
async function startQuiz() {
  closeStage();
  const box = el("div", "lb-quiz"); box.appendChild(el("p", "lb-muted", "Ich überlege mir drei Verständnisfragen …"));
  $("chat").appendChild(box); box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  let fragen;
  try { fragen = (quizJson((await callFn("lernblick-chat", { system_prompt: QUIZ_FRAGEN, messages: [{ role: "user", content: "ERKLÄRUNG:\n" + quizStoff() }], kurz: true })).response).fragen || []).slice(0, 3); }
  catch (e) { box.replaceChildren(el("p", "lb-err", "Die Fragen konnten gerade nicht erstellt werden – versuch es gleich nochmal.")); return; }
  box.replaceChildren(el("div", "lb-quiz-h", "✍️ Frag mich ab"), el("p", "lb-muted", "Schreib oder diktier deine Antworten – dann prüfe ich alles auf einmal."));
  const felder = fragen.map((f, i) => {
    const w = el("div", "lb-quiz-f"); w.appendChild(el("p", "lb-quiz-q", `${i + 1}. ${f}`));
    const row = el("div", "lb-quiz-row"), ta = el("textarea"); ta.rows = 2; ta.placeholder = "Deine Antwort …"; ta.setAttribute("aria-label", `Antwort zu Frage ${i + 1}`);
    row.appendChild(ta);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) { const m = el("button", "lb-icon", "🎤"); m.type = "button"; m.title = "Antwort diktieren"; m.onclick = () => { const r = new SR(); r.lang = "de-AT"; r.interimResults = false; m.classList.add("on"); r.onresult = (e) => { ta.value = (ta.value ? ta.value + " " : "") + e.results[0][0].transcript; }; r.onend = () => m.classList.remove("on"); r.onerror = () => m.classList.remove("on"); r.start(); }; row.appendChild(m); }
    w.appendChild(row); box.appendChild(w); return { f, ta, w };
  });
  const go = el("button", "lb-send", "Antworten prüfen"); go.type = "button"; box.appendChild(go);
  felder[0] && setTimeout(() => felder[0].ta.focus(), 60);
  go.onclick = async () => {
    go.disabled = true; go.textContent = "Ich prüfe …";
    try {
      const inhalt = "ERKLÄRUNG:\n" + quizStoff() + "\n\n" + felder.map((x, i) => `FRAGE ${i + 1}: ${x.f}\nANTWORT ${i + 1}: ${x.ta.value.trim() || "(keine Antwort)"}`).join("\n\n");
      const erg = (quizJson((await callFn("lernblick-chat", { system_prompt: QUIZ_PRUEF, messages: [{ role: "user", content: inhalt }], kurz: true })).response).ergebnisse) || [];
      let punkte = 0;
      felder.forEach((x, i) => {
        const e = erg[i] || {}, ok = String(e.ok || "nein").toLowerCase();
        punkte += ok === "ja" ? 1 : ok === "teils" ? 0.5 : 0;
        x.ta.readOnly = true;
        const fb = el("div", "lb-quiz-fb " + (ok === "ja" ? "ok" : ok === "teils" ? "teils" : "nein"));
        fb.appendChild(el("p", "", (ok === "ja" ? "✓ " : ok === "teils" ? "≈ " : "✗ ") + (e.rueckmeldung || "")));
        if (ok !== "ja") {
          if (e.richtig) fb.appendChild(el("p", "lb-quiz-r", "Richtig wäre: " + e.richtig));
          const r = el("div", "lb-quiz-btns");
          const b1 = el("button", "lb-tip", "Kurz erklären"); b1.type = "button"; b1.onclick = () => { forceSpeak = false; ask(`Erklär mir kurz und mit einer Skizze: ${x.f} (Ich hatte geantwortet: „${x.ta.value.trim()}“ – ${e.rueckmeldung || ""})`); };
          const b2 = el("button", "lb-tip", "🔊 Mit Stimme erklären"); b2.type = "button"; b2.onclick = () => { forceSpeak = true; ask(`Erklär mir kurz und mit einer Skizze: ${x.f} (Ich hatte geantwortet: „${x.ta.value.trim()}“ – ${e.rueckmeldung || ""})`); };
          r.append(b1, b2); fb.appendChild(r);
        }
        x.w.appendChild(fb);
      });
      go.remove();
      box.appendChild(el("p", "lb-quiz-sum", `${String(punkte).replace(".", ",")} von ${felder.length} – ${punkte >= felder.length ? "stark, das sitzt!" : punkte >= felder.length / 2 ? "gut, schau dir die markierten Punkte noch einmal an." : "das Thema lohnt eine zweite Runde."}`));
      const more = el("div", "lb-quiz-btns");
      const n1 = el("button", "lb-tip lb-tip-main", "Noch eine Runde"); n1.type = "button"; n1.onclick = () => startQuiz();
      const n2 = el("button", "lb-tip", "▶ Weiterlernen"); n2.type = "button"; n2.onclick = () => ask("Weiter: Erklär mir den nächsten wichtigen Punkt zu diesem Thema – Schritt für Schritt an der Tafel.");
      more.append(n1, n2); box.appendChild(more);
      box.lastChild.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch (e) { go.disabled = false; go.textContent = "Nochmal prüfen"; setStatus("Die Prüfung hat gerade nicht geklappt."); }
  };
}
function closePanel() {
  lb.upload = null; resumePoint = null;
  closeStage();
  stopWalk();
  lb.open = false;
  $("panel").hidden = true;
  $("fab").hidden = false;
  clearImgDraw();
  document.documentElement.classList.remove("lb-open");
}

// ---------- Fragen ----------
function presentAnswer(text, o) {
  const ziele = [];
  text = String(text).replace(/^[ \t]*(?:ÖFFNEN|OEFFNEN)\s*:\s*([ws]\d+)[ \t]*$/gmi, (m, id) => { ziele.push(id.toLowerCase()); return ""; });
  const { body, svgs, imgSvg, mols, tricks, segs, sides } = splitAnswer(text);
  const early = o.early || null;
  answerSegs = segs;
  o.bubble.innerHTML = md(body);
  if (!o.partial && ziele.length) { const zk = zielKnoepfe(ziele, (thema && thema.titel) || ""); if (zk) o.bubble.appendChild(zk); }
  // Zeigt der Text auf eine Stelle des Bildschirms ([[antwort-b|…]], [[frage|…]]), die die KI nicht markiert hat,
  // markiert das Programm sie selbst – sonst würde der Verweis ins Leere zeigen.
  let img = imgSvg;
  const anchorRefs = [...new Set(refsIn(body))].filter((r) => anchors[r] && !(img && new RegExp(`(teil|ziel)=['"][^'"]*\\b${r}\\b`).test(img)));
  if (anchorRefs.length) {
    const extra = anchorRefs.slice(0, 6).map((r) => `<markiere ziel='${r}' art='${/^antwort-|^knopf-|^regler-/.test(r) ? "rahmen" : "unterstreichen"}' farbe='blau' teil='${r}'/>`).join("");
    img = img ? img.replace(/<\/svg>\s*$/i, extra + "</svg>") : `<svg viewBox='0 0 1000 600'>${extra}</svg>`;
  }
  const upload = lb.upload && lb.upload.fresh && !o.partial ? lb.upload : null;
  if (upload) { lb.upload.fresh = false; img = null; }
  if (img && (!early || img !== early.img)) {
    const hasImg = renderImgDraw(img, !early);
    if (imgSvg && !hasImg && !o.partial) setStatus("Die Zeichnung auf dem Bildschirm war fehlerhaft.");
  }
  const okIdx = svgs.map((x, i) => i).filter((i) => sanitizeSvg(svgs[i], "0 0 1000 600"));
  const okSvgs = okIdx.map((i) => svgs[i]);
  // Nebentafel: von der KI als NEBENTAFEL geschrieben oder per „Kurz nebenbei“ angefragt
  const isSide = (k) => sides.has(okIdx[k]) || !!(pendingDrill && pendingDrill.side);
  const allRefs = [...new Set(refsIn(body))];
  if (early && early.firstIdx != null) {
    // Rest der Antwort: neue Tafeln anhängen, bereits gezeigte bleiben
    const have = cur.boards.length - early.firstIdx;
    okSvgs.slice(have).forEach((sv, j) => cur.boards.push({ svg: sv, mols: [], q: o.q, titel: titleOf(sv), teile: teileOf(sv, allRefs), side: isSide(have + j) }));
    answerBoards = [early.firstIdx, cur.boards.length - 1];
    for (let i = early.firstIdx; i < cur.boards.length; i++) {
      const b = cur.boards[i];
      if (i - early.firstIdx >= have) Object.assign(b, { shown: new Set(), full: false, parent: early.parent });
      b.defer = allRefs; b.teile = teileOf(b.svg, allRefs);
    }
    renderStrip(); updateStageNav();
  } else if (okSvgs.length || mols.length || upload) {
    const firstIdx = cur.boards.length;
    if (upload) cur.boards.push({ upload: upload.dataUrl, uw: upload.w, uh: upload.h, svg: imgSvg || null, overlay: true, mols: [], q: o.q, titel: upload.kind === "sheet" ? "Cheat-Sheet: " + upload.title : upload.kind === "grafik" ? upload.title : "Dein Bild", teile: imgSvg ? teileOf(imgSvg, allRefs) : [] });
    if (!okSvgs.length && mols.length) cur.boards.push({ svg: null, mols, q: o.q, teile: mols.map((m) => slug(m.name)) });
    okSvgs.forEach((sv, k) => cur.boards.push({ svg: sv, mols: k === 0 ? mols : [], q: o.q, titel: titleOf(sv), teile: teileOf(sv, allRefs), side: isSide(k) }));
    answerBoards = [firstIdx, cur.boards.length - 1];
    for (let i = firstIdx; i < cur.boards.length; i++) Object.assign(cur.boards[i], { defer: allRefs, shown: new Set(), full: false, parent: pendingDrill || null });
    $("boardwrap").hidden = false;
    renderStrip();
    pendingBoard = firstIdx;
  } else if (!early) answerBoards = null;
  if (!early) {
    // Beginnt die Erklärung mit einer Stelle auf dem Bildschirm, zuerst den Bildschirm zeigen
    const firstRefs = sentencesOf(body).map(refsIn).find((r) => r.length) || [];
    const onScreen = firstRefs.some((n) => document.querySelector(`${SCOPE} #lb-imgdraw [data-teil~="${n}"]`));
    pendingMode = !answerBoards || onScreen ? "peek" : "tafel";
  }
  const state = { firstIdx: answerBoards ? answerBoards[0] : null, img, parent: pendingDrill || (early && early.parent) || null };
  if (o.partial) {
    // Erster Teil: erklären beginnen; die Stimme nimmt nur diesen Teil auf
    lastBody = body;
    explain(body, 0, true);
    return state;
  }
  cur.turns.push({ q: o.qText, a: body, raw: text, ask: o.q, tricks, upload: upload ? upload.dataUrl : null });
  if (tricks.length) addMsg("trick", tricks.map((t) => `<b>Eselsbrücke:</b> ${esc(t.merksatz)}${t.wofuer ? ` <span class="lb-muted">(${esc(t.wofuer)})</span>` : ""}`).join("<br>"));
  pendingDrill = null;
  lastBody = body;
  if (early) extendNarration(body); else explain(body, 0);
  return state;
}
async function ask(preset) {
  const q = (typeof preset === "string" ? preset : $("q").value).trim();
  if (!q || lb.busy) return;
  if (typeof Credits !== "undefined" && !lb.usedSession) {
    if (Credits.hasAiSession && !Credits.hasAiSession()) { Credits.showAiPaywall && Credits.showAiPaywall("session"); return; }
    if (Credits.useAiSession) Credits.useAiSession().catch(() => {});
    lb.usedSession = true;
  }
  lb.busy = true; $("send").disabled = true; $("q").value = ""; $("tips").hidden = true;
  lb.speak = forceSpeak != null ? forceSpeak : $("speak").checked; forceSpeak = null;
  if (!resumePoint) rememberResume();
  $("resume").hidden = true;
  stopWalk();
  addMsg("user", esc(q));
  startWait();
  const bubble = addMsg("ai", '<span class="lb-thinking">Ich schaue mir das an …</span>');
  setStatus("");
  const history = cur.turns.slice(-6).flatMap((t) => [{ role: "user", content: t.q }, { role: "assistant", content: t.a }]);
  const first = !cur.turns.length;
  const withCtx = first || (lb.upload && lb.upload.fresh);
  const messages = [...history, { role: "user", content: (withCtx ? contextText(lb.ctx) + "\n\nFRAGE: " : "") + q }];
  if (first) lb.faecher = new Set();
  fachVon(lb.ctx, q).forEach((f) => lb.faecher.add(f));
  let boardDur = 0;
  try {
    await ensureLibs();
    const qText = (first ? contextText(lb.ctx) + "\n\nFRAGE: " : "") + q;
    let early = null;
    const text = await chatStream({ system_prompt: rules(), messages, image: lb.shot ? lb.shot.split(",")[1] : null }, (partial) => {
      if (early || !(lb.speak && lb.natural) || (lb.upload && lb.upload.fresh)) return;
      // Sobald die erste Tafel komplett geschrieben ist: zeigen und mit dem Erklären anfangen, der Rest kommt nach
      const fixed = repairAnswer(partial);
      const m = /(?<!BILD)ZEICHNUNG\s*:\s*(?:```[a-z]*\s*)?<svg[\s\S]*?<\/svg>/i.exec(fixed);
      if (!m) return;
      const head = fixed.slice(0, m.index + m[0].length);
      if (!sentencesOf(splitAnswer(head).body).length) return;
      early = presentAnswer(head, { q, bubble, partial: true });
    });
    presentAnswer(text, { q, qText, bubble, early });
  } catch (e) {
    bubble.remove();
    const msg = e.code === "login" ? e.message : "Das hat gerade nicht geklappt: " + (e.message || e);
    addMsg("err", esc(msg));
    pendingBoard = null; pendingMode = null; endWait();
    if (!cur.boards.length) closeStage(); else setSub(msg);
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
  let dur = 0;
  if (b.upload) {
    // Eigenes Bild der Person, Markierungen der KI darüber (erscheinen, wenn der Text darauf zeigt)
    const wrap = el("div", "lb-upboard"), im = new Image(); im.src = b.upload; im.alt = "Dein Bild"; wrap.appendChild(im);
    const ov = b.svg ? buildBoardSvg(b.svg, "white", b.defer) : null;
    if (ov) { ov.setAttribute("preserveAspectRatio", "none"); ov.classList.add("lb-upov"); wrap.appendChild(ov); markDeferred(ov, b); if (animate) dur = animateSvg(ov, cap); }
    $("board").replaceChildren(wrap);
    markStrip(); updateStageNav();
    return dur;
  }
  const out = b.svg ? buildBoardSvg(b.svg, theme, b.defer) : null;
  if (out) {
    let bgSvg = null;
    if (b.side) {
      // Nebentafel: kleine Karte vor der (abgedunkelten) Haupttafel – danach geht es dort weiter
      let pi = b.parent ? b.parent.board : -1;
      if (pi < 0) for (let j = i - 1; j >= 0; j--) if (cur.boards[j] && !cur.boards[j].side && cur.boards[j].svg) { pi = j; break; }
      const card = el("div", "lb-side-card"); card.append(el("div", "lb-side-chip", "Kurz nebenbei"), out);
      const nodes = [card];
      if (pi >= 0) { bgSvg = buildBoardSvg(cur.boards[pi].svg, theme); if (bgSvg) { bgSvg.querySelectorAll("[data-teil]").forEach((e) => e.removeAttribute("data-teil")); const w = el("div", "lb-side-bg"); w.appendChild(bgSvg); nodes.push(w); } }
      $("board").classList.add("side");
      $("board").replaceChildren(...nodes);
    } else $("board").replaceChildren(out);
    try { placeCallouts(out); } catch (e) {} fitTexts(out); try { layoutBlocks(out); } catch (e) {}
    if (bgSvg) { try { placeCallouts(bgSvg); fitTexts(bgSvg); layoutBlocks(bgSvg); } catch (e) {} }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitTexts(out));
    markDeferred(out, b); if (animate) dur = animateSvg(out, cap);
    startFlows(out);
  }
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
  // Die Markierung hört auf ihren Teilnamen UND auf den Ankernamen ([[deine-wahl|…]] wie [[antwort-c|…]])
  const zname = (m.getAttribute("ziel") || "").trim().toLowerCase();
  const T = [teil, zname].filter((x) => x && TEIL_OK.test(x)).join(" ");
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
  // Antwortknopf: Beschriftung rechts im Knopf (dort ist Platz)
  if (wide && !pt && target.matches(".answer-btn, button")) {
    const fs = 28, tw = text.length * fs * 0.5;
    let lx = x + w - tw - 24, ly = y + h / 2 + 10, textRight = 0;
    try { const rg = document.createRange(); rg.selectNodeContents(target.querySelector(".answer-text") || target); for (const q of rg.getClientRects()) textRight = Math.max(textRight, q.right); } catch (e) {}
    if (lx > textRight + 8) { mk("text", { x: lx, y: ly, fill: c, "font-size": fs }, text); return; }
  }
  // Sonst als Notizzettel am RAND neben dem Inhalt, mit dünner Linie zur Stelle – nie über den Text der App
  const fs = 21, lab = text.length > 34 ? text.slice(0, 33) + "…" : text, pw = lab.length * fs * 0.55 + 22, ph = fs + 16;
  const box = (target.closest("#screen-question, .screen.active, main, .container") || document.body).getBoundingClientRect();
  const cy = pt ? pt[1] : y + h / 2;
  let lx, ly, lead = null;
  if (box.right + 18 + pw < vw - 6) { lx = box.right + 18; ly = cy - ph / 2; lead = [pt ? pt[0] : right, cy, lx, cy]; }
  else if (box.left - 18 - pw > 6) { lx = box.left - 18 - pw; ly = cy - ph / 2; lead = [pt ? pt[0] : x, cy, lx + pw, cy]; }
  else { lx = Math.max(6, Math.min(x + w - pw, vw - pw - 6)); ly = y > ph + 12 ? y - ph - 8 : y + h + 8; }
  ly = Math.max(6, Math.min(vh - ph - 6, ly));
  if (lead) mk("line", { x1: lead[0], y1: lead[1], x2: lead[2], y2: Math.max(ly + 6, Math.min(ly + ph - 6, lead[3])), stroke: c, "stroke-width": 2, "stroke-dasharray": "5 4" });
  mk("rect", { x: lx, y: ly, width: pw, height: ph, rx: 10, fill: "#ffffff", stroke: c, "stroke-width": 2.5 });
  mk("text", { x: lx + 11, y: ly + ph / 2 + fs * 0.36, fill: c, "font-size": fs }, lab);
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
  for (const m of marks.slice(0, 12)) { try { drawMark(tmp, m, vw, vh); } catch (e) {} }
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
let popHit = null, pendingDrill = null;
function openPop(hit, x, y) {
  popHit = hit;
  $("pop-title").textContent = `„${hit.label}“`;
  const qs = [["Was ist das?", "Was ist das genau, und wozu brauche ich es?"], ["Warum so gezeichnet?", "Warum hast du das so gezeichnet? Was soll mir das zeigen?"]];
  if (hit.isFormula) qs.push(["Erklär die Formel", "Warum ist die Formel so geschrieben? Erklär mir jeden Teil und jeden Rechenschritt."]);
  qs.push(["Noch einfacher", "Erklär mir genau diesen Teil noch einfacher, mit einem Vergleich aus dem Alltag."]);
  qs.push(["⚡ Kurz nebenbei", "SIDE"]);
  $("pop-btns").replaceChildren(...qs.map(([l, q]) => { const b = el("button", "lb-tip", l); b.type = "button"; b.onclick = () => (q === "SIDE" ? askAbout("Erklär mir das ganz kurz nebenbei.", true) : askAbout(q)); return b; }));
  const pop = $("pop"); pop.hidden = false;
  const w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + "px";
  pop.style.top = (y + 18 + h < window.innerHeight - 8 ? y + 18 : Math.max(8, y - h - 18)) + "px";
  $("pop-q").value = "";
}
function closePop() { $("pop").hidden = true; popHit = null; }
function askAbout(q, side) {
  const hit = popHit;
  if (!hit) return;
  const b = cur.boards[curBoard] || {};
  const where = b.titel ? ` an der Tafel „${b.titel}“` : " an der Tafel";
  const what = hit.texts.length ? ` (dort steht: ${hit.texts.map((t) => "„" + t + "“").join(", ")})` : "";
  const teil = hit.teile.length ? ` [Teil: ${hit.teile.join(", ")}]` : "";
  closePop();
  pendingDrill = { board: curBoard, teile: hit.teile, label: hit.label, title: b.titel || "Überblick", side: !!side };
  if (side) return ask(`Ich tippe${where} auf ${hit.label}${what}${teil}. ${q} NEBENTAFEL: Erklär das in höchstens 3 kurzen Sätzen mit EINER kleinen Skizze (eine einzige ZEICHNUNG, ein Baustein oder eine Schablone, wenig Text) – z. B. wo es liegt, was es macht, wie es weitergeleitet wird. Danach geht es automatisch mit der Haupterklärung weiter.`);
  ask(`Ich tippe${where} auf ${hit.label}${what}${teil}. ${q} VERTIEFUNG: Erklär genau diesen Teil einfach und gründlich mit einer EIGENEN neuen Tafel (z. B. die Reaktion, das Enzym, die Formel oder der Rechenschritt im Detail, Schritt für Schritt gezeichnet). Am Ende ein Satz, wie dieser Teil ins große Bild passt – danach geht es automatisch zurück zum Überblick.`);
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

// Blättern: gehört zur Tafel ein Teil der Erklärung, wird genau dieser Teil (mit Stimme) gespielt
function navTo(t) {
  const b = cur.boards[t];
  if (!b) return;
  let i = -1;
  if (narr && narr.boardOf) {
    // erster Satz des Textabschnitts, der zu dieser Tafel gehört
    i = narr.boardOf.indexOf(t);
  }
  if (i >= 0 && b.defer) { Object.assign(b, { shown: new Set(), full: false }); stopWalk(); showBoard(t, true, 3000); setStageMode("tafel"); playFrom(i); }
  else { stopWalk(); b.full = true; showBoard(t, true, 3000); }
}

// ---------- Warten: kurze Aufwärmfrage, bis Antwort und Stimme fertig sind ----------
const WARMUPS = [
  ["Wie viele Diagonalen hat ein Fünfeck?", "5 · (5 − 3) : 2 = 5"], ["Was ist 2³ · 2²?", "2⁵ = 32 (Exponenten addieren)"], ["Wie viele mL sind 1 dL?", "100 mL"],
  ["Mit welcher Base paart Adenin in der DNA?", "Thymin (in der RNA: Uracil)"], ["Wo läuft die Zellatmung hauptsächlich ab?", "In den Mitochondrien"],
  ["pH 3 statt pH 5 – wie viel saurer?", "100-mal (10²)"], ["Einheit der Kraft?", "Newton: 1 N = 1 kg · m/s²"], ["2, 4, 8, 16, … – welche Zahl kommt?", "32 (immer · 2)"],
  ["Was sind 15 % von 200?", "30"], ["Wie viele Chromosomen hat eine menschliche Keimzelle?", "23"], ["Ohmsches Gesetz?", "U = R · I"], ["sin 30° = ?", "1/2"],
  ["Welches Organ bildet Insulin?", "Bauchspeicheldrüse (β-Zellen der Langerhans-Inseln)"], ["Halbwertszeit 2 h – wie viel ist nach 6 h übrig?", "1/8 (3 Halbwertszeiten)"],
  ["Ableitung von x³?", "3x²"], ["In welcher Mitosephase liegen die Chromosomen in der Mitte?", "Metaphase"], ["−20 % und dann −10 %: wie viel insgesamt?", "−28 % (nicht −30 %)"],
  ["Wie viele µL sind 1 mL?", "1000 µL"], ["Welche Blutgruppe hat keine Antigene A und B auf den Erythrozyten?", "Blutgruppe 0"], ["Wie viele Möglichkeiten gibt es, 2 aus 4 zu wählen?", "6 = 4 · 3 : 2"]
];
let pendingBoard = null, pendingMode = null, waitIdx = Math.floor(Math.random() * WARMUPS.length);
function showWarmup() {
  waitIdx = (waitIdx + 1) % WARMUPS.length;
  $("wq").textContent = WARMUPS[waitIdx][0]; $("wa").textContent = WARMUPS[waitIdx][1]; $("wa").hidden = true; $("wa-btn").hidden = false;
}
function setWaitStatus(t) { const e = $("wait-status"); if (e) e.textContent = t; }
// Antwort der KI Stück für Stück lesen; onPart bekommt den bisherigen Text. Fällt auf die normale Antwort zurück.
async function chatStream(body, onPart) {
  const token = await getToken();
  const send = () => fetch(`${CONFIG.SUPABASE_URL}/functions/v1/lernblick-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: CONFIG.SUPABASE_ANON_KEY },
    body: JSON.stringify({ ...body, stream: true })
  });
  let resp = await send();
  // Kaltstart der Funktion schlägt manchmal fehl (BOOT_ERROR) – einmal still wiederholen
  if (resp.status >= 500 && resp.status !== 502) { await new Promise((r) => setTimeout(r, 800)); resp = await send(); }
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.error || `Fehler ${resp.status}`); }
  if (/json/i.test(resp.headers.get("content-type") || "") || !resp.body) { const d = await resp.json(); return d.response || ""; }
  const reader = resp.body.getReader(), dec = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    try { onPart && onPart(text); } catch (e) { console.warn("LernBlick Teilantwort", e); }
  }
  text += dec.decode();
  if (!text.trim()) throw new Error("Keine Antwort erhalten. Bitte nochmal versuchen.");
  return text;
}
function startWait() {
  openStage("tafel");
  const st = $("stage"); st.classList.remove("peek"); st.classList.add("waiting");
  setSub(""); setWaitStatus("LernBlick schaut sich das an und bereitet die Tafel vor …"); showWarmup();
}
function endWait() {
  const st = $("stage");
  if (!st.classList.contains("waiting")) return;
  st.classList.remove("waiting");
  if (pendingBoard != null) { const pb = pendingBoard; pendingBoard = null; showBoard(pb); }
  if (pendingMode) { setStageMode(pendingMode); pendingMode = null; }
  else if (!cur.boards.length) setStageMode("peek");
  if (lastImg) animateSvg($("imgdraw"));
}

// ---------- Vollbild-Tafel ----------
let stageMode = "tafel";
// ---------- Lernzusammenfassung: übersichtlich, druckbar, im Lernarchiv speicherbar ----------
const cleanAsk = (q) => /^Ich habe diese Aufgabe falsch beantwortet/.test(q || "") ? "Schritt für Schritt erklärt" : String(q || "").replace(/\n?\(Hintergrund[\s\S]*$/, "").replace(/\s*(VERTIEFUNG|NEBENTAFEL):[\s\S]*$/, "").replace(/^Ich tippe[^.]*?auf /, "Zu ").trim();
function buildSummary() {
  const f = lb.ctx && lb.ctx.frage;
  const first = cur.turns[0] || {};
  const titel = (f && f.text ? f.text.split("\n")[0] : cleanAsk(first.ask) || "LernBlick-Sitzung").slice(0, 120);
  return {
    v: 1, titel, datum: new Date().toISOString(),
    aufgabe: f ? { text: f.text, gewaehlt: f.gewaehlt, richtig: f.richtig, bereich: f.bereich } : null,
    analyse: mistake ? { ok: mistake.richtig_erkannt || "", fehler: mistake.denkfehler || "" } : null,
    teile: cur.turns.map((t) => {
      const tafeln = cur.boards.filter((b) => b.q === t.ask && (b.svg || b.upload)).map((b) => ({ titel: b.titel || "", svg: b.svg || null, neben: !!b.side, bild: b.upload ? b.upload : null, text: [], _teile: b.teile || [] }));
      const frage = cleanAsk(t.ask) || "Frage";
      // Text zur passenden Tafel stellen (Abschnitt vor einer Tafel gehört zu ihr)
      let rest = [];
      if (t.raw && tafeln.length) {
        const sp = splitAnswer(t.raw), off = tafeln[0].bild ? 1 : 0, n = tafeln.length;
        const segs = sp.segs.map((g, i) => { const end = i + 1 < sp.segs.length ? sp.segs[i + 1].start : sp.body.length; const txt = sp.body.slice(g.start, end); return { raw: (g.raw ?? g.board) + off, txt, refs: refsIn(txt) }; });
        // Steht der Text vor oder nach seiner Tafel? Die Verweise entscheiden (wie beim Vorlesen)
        const hit = (k, refs) => tafeln[k] && refs.some((r) => tafeln[k]._teile.includes(r));
        let before = 0, after = 0;
        segs.forEach((g) => g.refs.forEach((r) => {
          const a = hit(Math.min(n - 1, g.raw), [r]), b = g.raw > 0 && hit(g.raw - 1, [r]);
          if (a && !b) before++; if (b && !a) after++;                 // nur eindeutige Verweise zählen
        }));
        segs.forEach((g) => {
          const k = after > before ? Math.max(0, g.raw - 1) : Math.min(n - 1, g.raw);
          tafeln[k].text.push(...sentencesOf(g.txt).map(plain).filter((x) => x.length > 2));
        });
      } else rest = sentencesOf(t.a).map((x) => plain(x)).filter((x) => x.length > 2);
      return { frage: frage.length > 110 ? frage.slice(0, 107) + "…" : frage, text: rest, tafeln,
      eselsbruecken: (t.tricks || []).map((x) => x.merksatz + (x.wofuer ? " (" + x.wofuer + ")" : "")) };
    }),
  };
}
function openSummary(d) {
  let box = $("summary");
  if (!box) { box = el("div", "lb-summary"); box.id = "lb-summary"; $("panel").parentNode.appendChild(box); }
  const dt = new Date(d.datum);
  box.innerHTML = `<div class="lb-sum-bar"><b>Lernzusammenfassung</b><span class="lb-sum-btns"><button type="button" class="lb-send" id="lb-sum-print">Drucken / als PDF</button><button type="button" class="lb-ghost" id="lb-sum-save">Im Lernarchiv speichern</button><button type="button" class="lb-icon" id="lb-sum-x" aria-label="Schließen">✕</button></span></div>
  <article class="lb-sum-page">
    <header class="lb-sum-head"><div class="lb-sum-brand">Lern<span>Blick</span> · Lernzusammenfassung</div><h1></h1><div class="lb-sum-date">${esc(fmtDate(dt.getTime()))}</div></header>
    <div class="lb-sum-body"></div>
    <footer class="lb-sum-ki">Erstellt mit künstlicher Intelligenz (LernBlick, MedAT Trainer). KI kann Fehler machen – bitte wichtige Inhalte mit Lehrbuch oder Skript abgleichen.</footer>
  </article>`;
  box.querySelector("h1").textContent = d.titel;
  const body = box.querySelector(".lb-sum-body");
  if (d.aufgabe) {
    const a = el("section", "lb-sum-task");
    a.innerHTML = `<h2>Die Aufgabe</h2><p class="lb-sum-q"></p>${d.aufgabe.gewaehlt ? `<p class="lb-q-w">Deine Antwort: ${esc(d.aufgabe.gewaehlt)}</p>` : ""}${d.aufgabe.richtig ? `<p class="lb-q-r">Richtig: ${esc(d.aufgabe.richtig)}</p>` : ""}`;
    a.querySelector(".lb-sum-q").innerHTML = esc(d.aufgabe.text).replace(/\n/g, "<br>");
    body.appendChild(a);
  }
  if (d.analyse && (d.analyse.ok || d.analyse.fehler)) {
    const a = el("section", "lb-sum-mistake");
    a.innerHTML = `<h2>Dein Denkfehler</h2>${d.analyse.ok ? `<p class="lb-mistake-ok">✓ ${esc(d.analyse.ok)}</p>` : ""}${d.analyse.fehler ? `<p class="lb-mistake-err">✗ ${esc(d.analyse.fehler)}</p>` : ""}`;
    body.appendChild(a);
  }
  const tricks = [];
  d.teile.forEach((t, i) => {
    const sec = el("section", "lb-sum-part");
    sec.appendChild(el("h2", "", `${i + 1}. ${t.frage}`));
    if (t.text.length) { const p = el("div", "lb-sum-text"); t.text.forEach((x) => p.appendChild(el("p", "", x))); sec.appendChild(p); }
    t.tafeln.forEach((tf) => {
      const fig = el("figure", "lb-sum-board" + (tf.neben ? " neben" : ""));
      if (tf.bild) { const im = new Image(); im.src = tf.bild; im.alt = tf.titel; fig.appendChild(im); }
      if (tf.svg) { const sv = buildBoardSvg(tf.svg, "white"); if (sv) fig.appendChild(sv); }
      if (tf.neben) fig.appendChild(el("figcaption", "", "Kurz nebenbei: " + (tf.titel || "")));
      sec.appendChild(fig);
      delete tf._teile;
      if (tf.text && tf.text.length) { const p = el("div", "lb-sum-text"); tf.text.forEach((x) => p.appendChild(el("p", "", x))); sec.appendChild(p); }
    });
    (t.eselsbruecken || []).forEach((x) => tricks.push(x));
    body.appendChild(sec);
  });
  if (tricks.length) { const s2 = el("section", "lb-sum-tricks"); s2.appendChild(el("h2", "", "Eselsbrücken")); tricks.forEach((x) => s2.appendChild(el("p", "", "💡 " + x))); body.appendChild(s2); }
  box.hidden = false; document.documentElement.classList.add("lb-summary-open");
  // Tafeln sauber setzen (wie an der Tafel), erst wenn sie im Dokument sind
  requestAnimationFrame(() => box.querySelectorAll(".lb-sum-board > svg").forEach((sv) => { try { placeCallouts(sv); fitTexts(sv); layoutBlocks(sv); } catch (e) {} }));
  $("sum-x").onclick = () => { box.hidden = true; document.documentElement.classList.remove("lb-summary-open"); };
  $("sum-print").onclick = () => window.print();
  $("sum-save").onclick = () => saveSummary(d, $("sum-save"));
}
async function saveSummary(d, btn) {
  try {
    btn.disabled = true; btn.textContent = "Speichere …";
    const token = await getToken();
    // Bilder (eigene Fotos) nicht mitspeichern – zu groß; Tafeln und Text reichen
    const slim = { ...d, teile: d.teile.map((t) => ({ ...t, tafeln: t.tafeln.filter((x) => x.svg).map((x) => ({ ...x, bild: null })) })) };
    const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: CONFIG.SUPABASE_ANON_KEY },
      body: JSON.stringify({ item_type: "conversation", title: ("LernBlick: " + d.titel).slice(0, 100), frage_text: d.titel.slice(0, 120), bereich: (d.aufgabe && d.aufgabe.bereich) || "MedAT", tutor_name: "LernBlick", conversation_data: JSON.stringify([{ role: "assistant", content: d.teile.map((t) => t.frage + "\n" + t.text.join(" ")).join("\n\n"), lernblick: slim }]), stil: "chat", content_type: "conversation" }),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({}))).error || "Speichern fehlgeschlagen");
    btn.textContent = "✓ Im Lernarchiv"; if (typeof Gallery !== "undefined") Gallery._loaded = false;
  } catch (e) { btn.disabled = false; btn.textContent = "Nochmal speichern"; setStatus("Speichern hat nicht geklappt: " + (e.message || e)); }
}
// ---------- Cheat-Sheets: Punkt antippen → LernBlick erklärt genau diesen Punkt ----------
// Wir schicken einen scharfen Ausschnitt rund um die angetippte Stelle (rot umkreist) – so kann die KI auch kleine Schrift lesen.
async function explainSheetPoint(img, fx, fy) {
  const title = img.getAttribute("data-title") || "Cheat-Sheet";
  const src = await new Promise((r, j) => { const x = new Image(); x.crossOrigin = "anonymous"; x.onload = () => r(x); x.onerror = j; x.src = img.currentSrc || img.src; });
  const W = src.naturalWidth, H = src.naturalHeight;
  const cw = Math.min(W, Math.max(Math.min(W, 700), W * 0.6)), ch = Math.min(H, cw * 0.8);
  const x0 = Math.max(0, Math.min(W - cw, fx * W - cw / 2)), y0 = Math.max(0, Math.min(H - ch, fy * H - ch / 2));
  const k = Math.min(1, 1400 / Math.max(cw, ch)), c = document.createElement("canvas");
  c.width = Math.round(cw * k); c.height = Math.round(ch * k);
  const g = c.getContext("2d");
  g.drawImage(src, x0, y0, cw, ch, 0, 0, c.width, c.height);
  const px = (fx * W - x0) * k, py = (fy * H - y0) * k, rr = Math.max(18, c.width * 0.035);
  g.strokeStyle = "#d62828"; g.lineWidth = Math.max(4, c.width * 0.005);
  g.beginPath(); g.arc(px, py, rr, 0, Math.PI * 2); g.stroke();
  const dataUrl = c.toDataURL("image/jpeg", 0.88);
  document.querySelectorAll(".gd-modal").forEach((m) => m.remove());
  if (!lb.open) await openPanel({});
  if (!lb.open) return;                                            // z. B. Datenschutz-Hinweis noch offen
  lb.upload = { dataUrl, w: c.width, h: c.height, fresh: true, kind: "sheet", title, ki: img.hasAttribute("data-ki"), tx: Math.round(px / c.width * 1000), ty: Math.round(py / c.width * 1000) };
  lb.shot = dataUrl; lb.shotW = c.width; lb.shotH = c.height; lb.anchorText = ""; anchors = {};
  lb.ctx = { seite: "Cheat-Sheet „" + title + "“", pfad: "", ueberschrift: title, frage: null };
  addMsg("user", `<img class="lb-upthumb" src="${dataUrl}" alt="Ausschnitt aus dem Cheat-Sheet">`);
  ask(`Erklär mir genau den rot umkreisten Punkt auf dem Cheat-Sheet „${title}“ – einfach, mit eigener Skizze an der Tafel.`);
}
document.addEventListener("click", (e) => {
  const img = e.target && e.target.closest && e.target.closest("img.lb-sheet");
  if (!img) return;
  const r = img.getBoundingClientRect();
  explainSheetPoint(img, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height).catch(() => setStatus("Das Cheat-Sheet konnte nicht gelesen werden."));
});
// ---------- Eigenes Bild prüfen lassen ----------
async function pickUpload(file) {
  const url = await new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(file); });
  const im = await new Promise((r, j) => { const x = new Image(); x.onload = () => r(x); x.onerror = j; x.src = url; });
  const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement("canvas");
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
  c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.85);
  lb.upload = { dataUrl, w: c.width, h: c.height, fresh: true };
  lb.shot = dataUrl; lb.shotW = c.width; lb.shotH = c.height; lb.anchorText = ""; anchors = {};
  lb.ctx = { seite: "Eigenes Bild der Person", pfad: "", ueberschrift: "", frage: null };
  addMsg("user", `<img class="lb-upthumb" src="${dataUrl}" alt="Dein Bild">`);
  if (!$("q").value.trim()) $("q").value = "Was habe ich hier falsch gemacht?";
  $("q").focus();
}
function updateQCard() {
  const f = lb.ctx && lb.ctx.frage, c = $("qcard");
  if (!c) return;
  if (!f) { c.hidden = true; return; }
  const L = (x) => (String(x || "").match(/^([A-H])\)/) || [])[1] || "";
  c.innerHTML = `<span>Deine Aufgabe</span>${f.gewaehlt ? `<b class="lb-q-w">${esc(L(f.gewaehlt))}</b>→<b class="lb-q-r">${esc(L(f.richtig))}</b>` : ""}`;
  c.hidden = false;
  $("qcard-text").innerHTML = `<p>${esc(f.text).slice(0, 600).replace(/\n/g, "<br>")}</p>${f.gewaehlt ? `<p class="lb-q-w">Deine Wahl: ${esc(f.gewaehlt)}</p>` : ""}${f.richtig ? `<p class="lb-q-r">Richtig: ${esc(f.richtig)}</p>` : ""}`;
}
function openStage(mode) {
  updateQCard();
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
  $("stage-title").textContent = b ? ((b.parent ? b.parent.title + " › " : "") + (b.titel || (b.parent ? b.parent.label : ""))) : "";
  $("back").hidden = !(b && b.parent);
  if (b && b.parent) $("back").textContent = `↩ Zurück zu „${b.parent.title}“`;
}
function setSub(s) {
  const e = $("sub"); if (e) e.innerHTML = s ? md(s).replace(/([A-Za-zΔ)])_([A-Za-z0-9]{1,4})\b/g, "$1<sub>$2</sub>") : "";
  // Spricht die Erklärung von der Tafel bzw. vom Bildschirm, dorthin wechseln (Verweise mit [[…]] entscheiden danach genauer)
  if (!s || $("stage").hidden) return;
  const t = plain(s).toLowerCase();
  if (cur.boards.length && /tafel|skizze|zeichnung|hier siehst du|schau dir (das|die|den) (bild|modell)/.test(t)) setStageMode("tafel");
  else if (lastImg && /bildschirm|in der app|oben auf|auf der seite|in der animation|markiert|eingekreist/.test(t)) setStageMode("peek");
}
// Text an der Tafel, der über den Rand ragt, verkleinern bzw. hereinschieben
// Nach dem Zeichnen: Rechenblöcke, die sich überlappen, untereinander stapeln; ragt danach etwas über die Tafel,
// wird die ganze Tafel so verkleinert, dass alles sichtbar ist (statt abgeschnitten).
function layoutBlocks(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (!vb || !vb.width || !svg.isConnected) return;
  // Frei gezeichnete Kästen: Text, der in einem Kasten steht, wird so verkleinert, dass er hineinpasst
  try {
    const free = (e) => !e.closest("g[data-comp]");
    const boxes = [...svg.querySelectorAll("g[data-rect], rect")].filter(free).map((r) => r.getBBox()).filter((b) => b.width > 60 && b.height > 26 && b.width < vb.width * 0.95);
    [...svg.querySelectorAll("text")].filter(free).forEach((t) => {
      const tb = t.getBBox(), cx = tb.x + tb.width / 2, cy = tb.y + tb.height / 2;
      const bx = boxes.filter((b) => cx > b.x && cx < b.x + b.width && cy > b.y && cy < b.y + b.height).sort((a, b) => a.width * a.height - b.width * b.height)[0];
      if (!bx || tb.width <= bx.width - 12) return;
      const fs = parseFloat(t.getAttribute("font-size") || getComputedStyle(t).fontSize) || 30;
      const k = Math.max(0.45, (bx.width - 18) / tb.width);
      t.setAttribute("font-size", (fs * k).toFixed(1));
      if ((t.getAttribute("text-anchor") || "start") !== "middle") { t.setAttribute("text-anchor", "middle"); t.setAttribute("x", (bx.x + bx.width / 2).toFixed(1)); }
    });
  } catch (e) {}
  const flow = [...svg.querySelectorAll("g[data-comp='gleichung'], g[data-comp='zahlenfolge'], g[data-comp='potenzen']")];
  const boxes = flow.map((g) => ({ g, b: g.getBBox() })).filter((x) => x.b.width > 0).sort((a, b) => a.b.y - b.b.y);
  for (let i = 1; i < boxes.length; i++) for (let j = 0; j < i; j++) {
    const A = boxes[j].b, B = boxes[i].b, dy0 = boxes[j].dy || 0, dy1 = boxes[i].dy || 0;
    const xo = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
    const push = (A.y + dy0 + A.height + 14) - (B.y + dy1);
    if (xo > 10 && push > 0) { boxes[i].dy = dy1 + push; boxes[i].g.setAttribute("transform", `translate(0 ${boxes[i].dy.toFixed(1)})`); }
  }
  // Rechenkarte liegt auf einem Bild (z. B. Dreieck)? Dann daneben verkleinern oder darunter setzen
  const others = [...svg.querySelectorAll("g[data-comp]")].filter((g) => !flow.includes(g) && !/^(titel|pfeil|beschriftung|bogenpfeil)$/.test(g.getAttribute("data-comp")));
  const ob = others.map((g) => { try { return g.getBBox(); } catch (e) { return null; } }).filter((b) => b && b.width > 40);
  if (ob.length) {
    const O = ob.reduce((u, b) => ({ x: Math.min(u.x, b.x), y: Math.min(u.y, b.y), r: Math.max(u.r, b.x + b.width), b: Math.max(u.b, b.y + b.height) }), { x: 1e9, y: 1e9, r: -1e9, b: -1e9 });
    boxes.forEach((x) => {
      const dy = x.dy || 0, G = x.b, gy = G.y + dy;
      const hit = Math.min(G.x + G.width, O.r) - Math.max(G.x, O.x) > 10 && Math.min(gy + G.height, O.b) - Math.max(gy, O.y) > 10;
      if (!hit) return;
      const left = O.x - vb.x, right = vb.x + vb.width - O.r;
      const side = right >= left ? [O.r + 10, vb.x + vb.width - 10] : [vb.x + 10, O.x - 10];
      if (side[1] - side[0] >= 260) {
        const k = Math.min(1, (side[1] - side[0]) / G.width);
        x.g.setAttribute("transform", `translate(${(side[0] - G.x * k).toFixed(1)} ${(gy - G.y * k).toFixed(1)}) scale(${k.toFixed(3)})`);
      } else x.g.setAttribute("transform", `translate(0 ${(dy + O.b + 14 - gy).toFixed(1)})`);
    });
  }
  // Nur Schrift zählt fürs Einpassen – lange Linien (Tangenten, Achsen) dürfen über den Rand laufen
  const tb = [...svg.querySelectorAll("text")].map((t) => { try { const b = t.getBBox(); if (!b.width) return null; const m = t.getCTM && svg.getCTM ? svg.getCTM().inverse().multiply(t.getCTM()) : null; if (!m) return b; const p1 = new DOMPoint(b.x, b.y).matrixTransform(m), p2 = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m); return { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), width: Math.abs(p2.x - p1.x), height: Math.abs(p2.y - p1.y) }; } catch (e) { return null; } }).filter(Boolean);
  if (!tb.length) return;
  const bb = tb.reduce((u, b) => { const x0 = Math.min(u.x, b.x), y0 = Math.min(u.y, b.y); return { x: x0, y: y0, width: Math.max(u.x + u.width, b.x + b.width) - x0, height: Math.max(u.y + u.height, b.y + b.height) - y0 }; }), pad = 12;
  const x0 = Math.min(vb.x, bb.x - pad), y0 = Math.min(vb.y, bb.y - pad), x1 = Math.max(vb.x + vb.width, bb.x + bb.width + pad), y1 = Math.max(vb.y + vb.height, bb.y + bb.height + pad);
  if (x0 < vb.x - 1 || y0 < vb.y - 1 || x1 > vb.x + vb.width + 1 || y1 > vb.y + vb.height + 1) {
    let w = x1 - x0, h = y1 - y0; const ratio = vb.width / vb.height;
    if (w / h > ratio) h = w / ratio; else w = h * ratio;
    svg.setAttribute("viewBox", `${(x0 - (w - (x1 - x0)) / 2).toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }
}
function fitTexts(svg) {
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (!vb || !vb.width || !svg.isConnected) return;
  svg.querySelectorAll("text").forEach((t) => {
    if (t.getAttribute("transform") || t.closest("[transform]") || t.hasAttribute("data-placed")) return;
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
    if (t.hasAttribute("data-placed")) { placed.push(b); return; }
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

// ---------- Zeichnen im Takt der Erklärung ----------
// Teile, über die erst später gesprochen wird, bleiben unsichtbar, bis der passende Satz kommt.
// ---------- Tafel entsteht Schritt für Schritt (wie eine Lehrkraft, die beim Reden anschreibt) ----------
// Alles, worüber im Text noch gesprochen wird, wartet unsichtbar (.lb-wait) und erscheint genau in dem Satz,
// der darauf zeigt. Dazu gehören auch: der Rest eines Bausteins (Achsen, Kopfzeile, Rahmen) – mit seinem ersten
// erwähnten Teil; Pfeile im Begriffsnetz – erst wenn beide Enden stehen; freie Formen – mit ihrer Beschriftung.
const tokOf = (e) => (e.getAttribute("data-teil") || "").split(/\s+/).filter(Boolean);
function markDeferred(svg, b) {
  if (!svg || !b || !b.defer || b.full) return;
  const later = new Set(b.defer.filter((n) => !b.shown.has(n)));
  if (!later.size) return;
  const all = [...svg.querySelectorAll("[data-teil]")];
  all.forEach((e) => { const t = tokOf(e); if (t.includes("titel")) return; if (t.some((n) => later.has(n))) e.classList.add("lb-wait"); });
  // Pfeile im Begriffsnetz
  const nodes = all.filter((e) => tokOf(e).includes("knoten")), nodeIds = new Set(nodes.flatMap(tokOf));
  const nodeWaits = (id) => nodes.some((n) => tokOf(n).includes(id) && n.classList.contains("lb-wait"));
  all.forEach((e) => {
    const t = tokOf(e); if (!t.includes("kante")) return;
    const pair = t.find((x) => /^[a-z0-9_]+-[a-z0-9_]+$/i.test(x) && x.split("-").every((y) => nodeIds.has(y)));
    if (!pair) return;
    e.setAttribute("data-ends", pair.replace("-", " "));
    if (pair.split("-").some(nodeWaits)) e.classList.add("lb-wait");
  });
  const isShown = (e) => tokOf(e).some((n) => b.shown.has(n));
  const tie = (e, names) => { if (e.classList.contains("lb-wait") || e.querySelector(".lb-wait") || isShown(e) || tokOf(e).includes("titel")) return; e.classList.add("lb-wait"); e.setAttribute("data-any", names.join(" ")); };
  // Rest eines Bausteins erscheint mit seinem ersten erwähnten Teil
  svg.querySelectorAll("g[data-comp]").forEach((g) => {
    if (g.getAttribute("data-comp") === "titel") return;
    const names = [...new Set([...g.querySelectorAll(".lb-wait")].flatMap(tokOf).filter((n) => later.has(n)))];
    if (names.length) [...g.children].forEach((c) => tie(c, names));
  });
  // Freie Zeichnung: unbeschriftete Form erscheint mit dem nächsten wartenden Element (meist ihre Beschriftung)
  const kids = [...svg.children].filter((c) => !c.matches("g[data-comp], defs, style"));
  kids.forEach((c, i) => {
    if (c.classList.contains("lb-wait") || tokOf(c).length) return;
    const nxt = kids.slice(i + 1, i + 4).find((x) => x.classList.contains("lb-wait"));
    if (nxt) tie(c, tokOf(nxt).filter((n) => later.has(n)));
  });
}
function unitsOf(list) { return [...new Set(list.flatMap((e) => (e.matches(SHAPES + ",text") ? [e] : [...e.querySelectorAll(SHAPES + ",text")])).filter((e) => !e.closest(".lb-wait")))]; }
function reveal(names) {
  const svg = $("board").querySelector("svg"), b = cur.boards[curBoard];
  if (!svg || !names || !names.length) return;
  if (b && b.shown) names.forEach((n) => b.shown.add(n));
  const shown = b && b.shown ? b.shown : new Set(names);
  const waiting = [...svg.querySelectorAll(".lb-wait")];
  const direct = waiting.filter((e) => tokOf(e).some((n) => names.includes(n)) || (e.getAttribute("data-any") || "").split(" ").some((n) => names.includes(n) || shown.has(n)));
  if (!direct.length) return;
  direct.forEach((e) => e.classList.remove("lb-wait"));
  // Pfeile, deren beide Enden jetzt stehen
  const visibleNode = (id) => [...svg.querySelectorAll("[data-teil]")].some((n) => tokOf(n).includes("knoten") && tokOf(n).includes(id) && !n.classList.contains("lb-wait"));
  const edges = [...svg.querySelectorAll(".lb-wait[data-ends]")].filter((e) => e.getAttribute("data-ends").split(" ").every(visibleNode));
  edges.forEach((e) => e.classList.remove("lb-wait"));
  drawPlan([...unitsOf(direct), ...unitsOf(edges)], 3200, 0);
}
// Satz ohne Verweis: trotzdem weiterschreiben – das nächste wartende Stück der aktuellen Tafel erscheint
function revealNext() {
  const svg = $("board").querySelector("svg");
  if (!svg || $("stage").classList.contains("peek")) return;
  const w = [...svg.querySelectorAll(".lb-wait[data-teil]")].find((e) => !e.hasAttribute("data-ends"));
  if (w) reveal(tokOf(w).slice(0, 3));
}
function revealAll() {
  if (answerBoards) for (let i = answerBoards[0]; i <= answerBoards[1]; i++) if (cur.boards[i]) cur.boards[i].full = true;
  const svg = $("board").querySelector("svg");
  if (!svg) return;
  const hit = [...svg.querySelectorAll(".lb-wait")];
  hit.forEach((e) => e.classList.remove("lb-wait"));
  if (hit.length) drawPlan([...new Set(hit.flatMap((e) => (e.matches(SHAPES + ",text") ? [e] : [...e.querySelectorAll(SHAPES + ",text")])))], 2500, 0);
}

// ---------- Zeigen: Text und Tafel synchron ----------
const slug = (s) => String(s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function titleOf(svgText) { const m = String(svgText).match(/<titel[^>]*\btext\s*=\s*(['"])(.*?)\1/i); return m ? m[2] : ""; }
function teileOf(svgText, refs) {
  try { const out = buildBoardSvg(svgText, "white", refs); return out ? [...new Set([...out.querySelectorAll("[data-teil]")].flatMap((e) => e.getAttribute("data-teil").split(/\s+/)))] : []; }
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
  if (curHL.length && atlas3d()) {
    const ids = new Set();
    // auch Markierungen, die gerade nicht im Bild sind (Teil verdeckt/außerhalb): Zuordnung aus der Zeichnung selbst
    const marks = [...String(lastImg || "").matchAll(/<markiere\b[^>]*>/gi)].map((m) => ({ ziel: ((m[0].match(/ziel=['"]([^'"]+)/) || [])[1] || "").toLowerCase(), teil: ((m[0].match(/teil=['"]([^'"]+)/) || [])[1] || "").toLowerCase() }));
    curHL.forEach((n) => { if (/^3d-/.test(n)) ids.add(n.slice(3)); marks.forEach((m) => { if (m.teil === n && /^3d-/.test(m.ziel)) ids.add(m.ziel.slice(3)); }); });
    const first = [...ids][0]; if (first) focus3d(first);
  }
  if (curHL.length) reveal(curHL);
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
// Bildschirm-Ansicht: markierte Stelle so scrollen, dass sie nicht unter der Untertitel-Leiste liegt
function scrollMarkIntoView(refs) {
  const m = refs.map((n) => document.querySelector(`${SCOPE} #lb-imgdraw [data-teil~="${n}"]`)).find(Boolean);
  if (!m) return;
  const r = m.getBoundingClientRect(), bar = ($("stage").querySelector(".lb-stage-bottom, #lb-sub") || {}).getBoundingClientRect?.();
  const bottomFree = bar ? Math.min(window.innerHeight, bar.top - 8) : window.innerHeight - 220;
  if (r.top < 70 || r.bottom > bottomFree) window.scrollBy({ top: r.top - Math.max(90, (bottomFree - r.height) * 0.4), behavior: "smooth" });
}
function showRefs(refs) {
  if (!refs.length && curBoard >= 0 && !$("stage").hidden) { highlight([]); revealNext(); return; }
  if (!$("stage").hidden && refs.length) {
    const onScreen = refs.some((n) => document.querySelector(`${SCOPE} #lb-imgdraw [data-teil~="${n}"]`));
    const onBoard = refs.some((n) => cur.boards.some((b) => (b.teile || []).includes(n) || (b.mols || []).some((m) => slug(m.name) === n)));
    if (onScreen && !onBoard) { setStageMode("peek"); scrollMarkIntoView(refs); } else if (onBoard || cur.boards.length) setStageMode("tafel");
  }
  const moved = goToRefs(refs);
  if (moved) walkTimers.push(setTimeout(() => { highlight(refs); keepBoardInView(refs); }, 900));
  else { highlight(refs); keepBoardInView(refs); }
}
// Ende einer Erklärung: alles zeigen; war es eine Vertiefung, zurück zum großen Bild
function onNarrationEnd() {
  highlight([]); revealAll();
  if (narr) narr.ended = true;
  const b = cur.boards[curBoard];
  if (b && b.parent && !$("stage").hidden) {
    // Vertiefung/Nebentafel fertig: zurück zum Überblick und dort automatisch weitererklären
    walkTimers.push(setTimeout(() => backToParent(true), 2200));
    if (resumePoint && resumePoint.narr !== narr) walkTimers.push(setTimeout(() => resumeExplain(), 6000));
  } else if (resumePoint && resumePoint.narr !== narr) $("resume").hidden = false;
  else if (!$("stage").hidden) $("endbar").hidden = false;
}
function backToParent(auto) {
  const b = cur.boards[curBoard];
  if (!b || !b.parent) return;
  const p = b.parent, pb = cur.boards[p.board];
  if (!pb) return;
  stopWalk();
  pb.full = true; showBoard(p.board, true, 2500); setStageMode("tafel");
  setSub(`${auto ? "Zurück im Überblick" : "Wieder im Überblick"}: Hier gehört [[${p.teile[0] || "titel"}|${p.label}]] hin.`);
  walkTimers.push(setTimeout(() => highlight(p.teile.slice(0, 2)), 700));
  walkTimers.push(setTimeout(() => highlight([]), 5200));
}

// ---------- Erzählung: Sätze, zugehörige Tafeln, Tonspur ----------
let narr = null, answerSegs = [];
function boardOfSentences(sents, body) {
  if (!answerBoards) return sents.map(() => -1);
  const b0 = answerBoards[0], b1 = answerBoards[1], nB = b1 - b0 + 1;
  const has = (j, r) => { const b = cur.boards[j]; return !!b && ((b.teile || []).includes(r) || (b.mols || []).some((m) => slug(m.name) === r)); };
  // Steht derselbe Teil auf mehreren Tafeln (z. B. „gleichung“), zählt die Tafel, zu der der Abschnitt gehört
  const refBoard = (refs, near) => {
    if (!refs.length) return -1;
    for (const j of [near, near + 1, near - 1]) if (j >= b0 && j <= b1 && refs.some((r) => has(j, r))) return j;
    for (let j = b0; j <= b1; j++) if (refs.some((r) => has(j, r))) return j;
    return -1;
  };
  // Jeder Satz: in welchem Textabschnitt steht er (raw = Anzahl Tafeln davor) und worauf zeigt er?
  let cursor = 0;
  const info = sents.map((s) => {
    const pos = body ? body.indexOf(s, cursor) : -1; if (pos >= 0) cursor = pos + s.length;
    let seg = null, next = null; if (pos >= 0) for (const g of answerSegs) { if (g.start <= pos) seg = g; else if (!next) next = g; }
    // letzter Absatz seines Abschnitts? (dann leitet er oft schon die NÄCHSTE Tafel ein)
    const segEnd = next ? next.start : body.length;
    const lastPara = pos >= 0 && body.slice(pos, segEnd).indexOf("\n\n") < 0;
    const para = pos >= 0 ? body.lastIndexOf("\n\n", pos) : -1;
    return { raw: seg ? (seg.raw ?? seg.board) : 0, refs: refsIn(s), lastPara, para };
  });
  // erst ohne Nähe zählen (welche Konvention?), dann mit Nähe zuordnen
  info.forEach((x) => { x.ref = refBoard(x.refs, -99); });
  // Schreibt die KI den Text VOR ihre Tafel (so verlangt) oder DANACH (kommt oft vor)? Die Verweise entscheiden.
  let before = 0, after = 0;
  // nur eindeutige Verweise zählen (Begriffe, die auf beiden Tafeln stehen, sagen nichts)
  info.forEach((x) => x.refs.forEach((r) => {
    const a = has(b0 + Math.min(x.raw, nB - 1), r), b = x.raw > 0 && has(b0 + x.raw - 1, r);
    if (a && !b) before++; if (b && !a) after++;
  }));
  const afterMode = after > before;
  // Zeigt ein Satz auf etwas an einer Tafel, gehört er zu dieser Tafel – sonst zu seinem Abschnitt
  // Im Danach-Stil: der letzte Absatz zwischen zwei Tafeln, der nicht auf die vorige Tafel zeigt, leitet die nächste ein
  const intro = new Set();
  if (afterMode) {
    const paras = {};
    info.forEach((x) => { if (x.lastPara && x.raw >= 1 && x.raw < nB) (paras[x.para] = paras[x.para] || []).push(x); });
    Object.values(paras).forEach((xs) => { if (!xs.some((x) => x.ref === b0 + xs[0].raw - 1)) xs.forEach((x) => intro.add(x)); });
  }
  return info.map((x) => { const pos = b0 + (intro.has(x) ? Math.min(x.raw, nB - 1) : afterMode ? Math.max(0, x.raw - 1) : Math.min(x.raw, nB - 1)); const r = refBoard(x.refs, pos); return r >= 0 ? r : pos; });
}
// Unterbrechen und nachfragen: die laufende Erklärung merken und danach dort weitermachen
let resumePoint = null;
function rememberResume() {
  if (!narr || narr.ended || !answerBoards || narr.partial) return;
  resumePoint = { narr, answerBoards: answerBoards.slice(), answerSegs, board: curBoard, at: Math.max(0, narr.shown || 0) };
}
function resumeExplain() {
  const r = resumePoint; if (!r) return;
  resumePoint = null; $("resume").hidden = true;
  narr = r.narr; answerBoards = r.answerBoards; answerSegs = r.answerSegs; narr.ended = false; narr.stopped = false;
  lastBody = narr.body;
  showBoard(r.board, false); setStageMode("tafel");
  setSub("Weiter geht's, wo wir stehen geblieben sind.");
  walkTimers.push(setTimeout(() => playFrom(r.at), 900));
}
function explain(body, delay, partial) {
  stopWalk();
  if (narr && narr.parts && !(resumePoint && resumePoint.narr === narr)) narr.parts.forEach((p) => p.url && URL.revokeObjectURL(p.url));
  const sents = sentencesOf(body);
  narr = { body, sents, boardOf: boardOfSentences(sents, body), parts: null, jobs: null, from: 0, shown: 0, stopped: false, partial: !!partial };
  playFrom(0, delay);
}
// Ein Satz beginnt: Untertitel, die Tafel, zu der er gehört, und Zeigen/Anschreiben
function sayLine(k) {
  const n = narr; if (!n || !n.sents[k]) return;
  const s = n.sents[k], refs = refsIn(s);
  setSub(s);
  const want = n.boardOf ? n.boardOf[k] : -1;
  const onCur = refs.some((r) => { const b = cur.boards[curBoard]; return b && (b.teile || []).includes(r); });
  if (want >= 0 && want !== curBoard && cur.boards[want] && !onCur && !$("stage").hidden && !$("stage").classList.contains("waiting")) {
    const prev = cur.boards[curBoard]; if (prev && answerBoards && curBoard >= answerBoards[0] && curBoard <= answerBoards[1]) prev.full = true;
    showBoard(want, true, 4000); setStageMode("tafel");
  }
  showRefs(refs);
}
function playFrom(i, delay = 0) {
  const n = narr; if (!n) return;
  stopWalk(); n.stopped = false; n.from = i;
  $("stage").classList.toggle("stumm", !lb.speak);
  $("endbar").hidden = true;
  if (lb.speak && lb.natural) return speakNatural(i);
  endWait();
  if (lb.speak && "speechSynthesis" in window) return speakBrowser(n.sents.slice(i), i);
  let t = Math.min(delay || 0, 2500);
  n.sents.slice(i).forEach((s, j) => {
    const refs = refsIn(s);
    walkTimers.push(setTimeout(() => { n.shown = i + j; sayLine(i + j); }, t));
    t += Math.max(2200, plain(s).length * 60) + (refs.some(visibleHas) ? 0 : 1500);
  });
  walkTimers.push(setTimeout(() => onNarrationEnd(), t + 400));
}
function langVoices() {
  const codes = (LB_LANGS[$("lang").value] || LB_LANGS.de).tts;
  try { return speechSynthesis.getVoices().filter((x) => codes.some((c) => x.lang.toLowerCase().startsWith(c))).sort((a, b) => (/natural|neural|premium|enhanced|online/i.test(b.name) ? 1 : 0) - (/natural|neural|premium|enhanced|online/i.test(a.name) ? 1 : 0)); }
  catch (e) { return []; }
}
function speakBrowser(sents, off = 0) {
  const v = langVoices()[0] || null;
  sents.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(plain(s));
    u.voice = v; if (v) u.lang = v.lang;
    const refs = refsIn(s);
    u.onstart = () => { if (narr) narr.shown = off + i; sayLine(off + i); };
    if (i === sents.length - 1) u.onend = () => walkTimers.push(setTimeout(() => onNarrationEnd(), 1500));
    speechSynthesis.speak(u);
  });
}
// Natürliche Stimme: die ganze Antwort in EINEM Stück (gleiche Stimme, keine Brüche).
// Untertitel und Zeigen laufen anteilig zur Abspielzeit mit; beim Blättern wird an die passende Stelle gesprungen.
// Die Stimme kommt in Teilen: Teil 1 (alles bis zur ersten Tafel) wird schon aufgenommen, während die KI noch schreibt,
// Teil 2 (der Rest) sobald die Antwort komplett ist. Jeder Teil ist EIN Aufruf → gleichmäßige Stimme innerhalb des Teils.
function ensureJobs(n) {
  if (!n.jobs) n.jobs = [];
  for (let i = n.jobs.length; i < n.sents.length; i++) n.jobs.push({ s: n.sents[i], refs: refsIn(n.sents[i]), text: speakable(plain(n.sents[i])).trim() });
  if (!n.parts) n.parts = [];
  const covered = n.parts.length ? n.parts[n.parts.length - 1].to : 0;
  if (covered < n.jobs.length && !(n.partial && n.parts.length)) {
    const part = { from: covered, to: n.jobs.length, audio: null, url: null, loading: false, failed: false };
    const total = n.jobs.slice(part.from, part.to).reduce((a, j) => a + Math.max(1, j.text.length), 0);
    let acc = 0; part.starts = n.jobs.slice(part.from, part.to).map((j) => { const st = acc / total; acc += Math.max(1, j.text.length); return st; });
    n.parts.push(part);
  }
}
function partOf(n, i) { return n.parts.find((p) => i >= p.from && i < p.to) || null; }
function loadPart(n, part) {
  if (part.audio || part.loading || part.failed) return;
  const full = n.jobs.slice(part.from, part.to).map((j) => j.text).filter(Boolean).join(" ").slice(0, 6000);
  if (!full) { part.failed = true; return; }
  part.loading = true;
  callFn("lernblick-voice", { text: full, lang: $("lang").value }, true).then((blob) => {
    part.loading = false;
    if (narr !== n) return;
    part.url = URL.createObjectURL(blob);
    const a = part.audio = new Audio(part.url);
    a.ontimeupdate = () => {
      if (a.paused || !a.duration || !isFinite(a.duration) || currentAudio !== a) return;
      const f = a.currentTime / a.duration;
      let k = n.shown; if (k < part.from || k >= part.to) k = part.from;
      while (k + 1 < part.to && f >= part.starts[k + 1 - part.from] - 0.01) k++;
      if (k !== n.shown) { n.shown = k; sayLine(k); }
    };
    a.onended = () => {
      if (currentAudio !== a) return;
      const next = n.parts[n.parts.indexOf(part) + 1];
      if (next) return speakNatural(next.from);
      if (n.partial) { n.waitMore = true; setStatus("Gleich geht's weiter …"); return; }   // der Rest der Antwort kommt noch
      walkTimers.push(setTimeout(() => onNarrationEnd(), 1500));
    };
    if (n.want != null && n.want >= part.from && n.want < part.to && !n.stopped) { const w = n.want; n.want = null; startAudio(n, part, w); }
  }).catch(() => {
    part.loading = false; part.failed = true;
    if (narr !== n) return;
    lb.natural = false; $("natural").checked = false;
    setStatus("Die natürliche Stimme ist gerade nicht erreichbar – ich lese mit der Browser-Stimme vor.");
    if (!n.stopped) playFrom(n.want != null ? n.want : n.from); else endWait();
  });
}
function speakNatural(from) {
  const n = narr;
  ensureJobs(n);
  if (!n.jobs.length) { endWait(); return; }
  const part = partOf(n, from);
  if (!part) { if (n.partial) { n.waitMore = true; return; } endWait(); return; }
  if (part.audio) return startAudio(n, part, from);
  n.want = from;
  setStatus(""); setWaitStatus("Die Stimme wird aufgenommen …");
  loadPart(n, part);
}
function startAudio(n, part, from) {
  const a = part.audio;
  if (currentAudio && currentAudio !== a) { try { currentAudio.pause(); } catch (e) {} }
  const go = () => {
    try { a.currentTime = Math.max(0, (part.starts[from - part.from] || 0) * a.duration - 0.05); } catch (e) {}
    n.shown = from; currentAudio = a;
    a.play().then(() => { endWait(); setStatus(""); sayLine(from); })
      .catch(() => { endWait(); setStatus("Tippe auf ▶ Nochmal, um das Vorlesen zu starten."); });
  };
  if (isFinite(a.duration) && a.duration > 0) go(); else a.addEventListener("loadedmetadata", go, { once: true });
}
// Die Antwort ist komplett: Sätze ergänzen, Teil 2 der Stimme sofort aufnehmen, ggf. direkt weiterspielen
function extendNarration(body) {
  const n = narr; if (!n) return explain(body, 0);
  const sents = sentencesOf(body);
  const same = n.sents.every((x, i) => sents[i] === x);
  if (!same) { const keep = n.parts; n.parts = null; n.jobs = null; keep && keep.forEach((p) => p.url && URL.revokeObjectURL(p.url)); }
  n.body = body; n.sents = sents; n.boardOf = boardOfSentences(sents, body); n.partial = false;
  if (!(lb.speak && lb.natural)) return;
  ensureJobs(n);
  const last = n.parts[n.parts.length - 1];
  if (last) loadPart(n, last);
  if (n.waitMore || !same) { n.waitMore = false; if (!n.stopped) speakNatural(same ? last.from : 0); }
}
function replayExplain() {
  if (!lastBody) { setStatus("Stell zuerst eine Frage."); return; }
  document.querySelectorAll(`${SCOPE} [data-flown]`).forEach((g) => { g.getAnimations().forEach((a) => a.cancel()); delete g.dataset.flown; });
  if (answerBoards) { for (let i = answerBoards[0]; i <= answerBoards[1]; i++) if (cur.boards[i] && cur.boards[i].defer) Object.assign(cur.boards[i], { shown: new Set(), full: false }); showBoard(answerBoards[0], false); }
  let dur = 0;
  document.querySelectorAll(`${SCOPE} #lb-mols svg, ${SCOPE} #lb-board svg`).forEach((svg) => { dur = Math.max(dur, animateSvg(svg)); });
  animateSvg($("imgdraw"));
  if (narr && narr.body === lastBody) playFrom(0, dur); else explain(lastBody, dur);
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
    b.onclick = () => openPanel({});   // erst Denkfehler-Analyse mit passenden Gesprächsaufhängern
    fb.appendChild(b);
  };
  new MutationObserver(addBtn).observe(fb, { attributes: true, attributeFilter: ["class"] });
  addBtn();
}

// ---------- Start ----------
function init() {
  if (document.getElementById("lernblick-root")) return;
  buildUI();
  // Die früheren KI-Tutoren führen jetzt zu LernBlick
  if (typeof Tutor !== "undefined" && Tutor) {
    try {
      Tutor.open = (q) => { const c = q && (q.content || q); const t = c && (c.question || c.text) ? `Erklär mir diese Aufgabe Schritt für Schritt an der Tafel: ${c.question || c.text}` : null; openPanel(t ? { ask: t } : { starters: true }); };
      Tutor.openFreeMode = () => openPanel({ starters: true });
      Tutor.selectTutor = () => {};
    } catch (e) {}
  }
  watchWrongAnswers();
  // „Thema lernen“ → Werkzeug öffnen: dort startet LernBlick von selbst und erklärt im Werkzeug
  try {
    const t = new URLSearchParams(location.search).get("lernblick");
    if (t) {
      const u = new URL(location.href); u.searchParams.delete("lernblick"); history.replaceState(history.state, "", u.href);
      setTimeout(() => openPanel({ ask: TOOL_ASK(t.slice(0, 120)) }), 1600);   // Werkzeug (3D) erst fertig aufbauen lassen
    }
  } catch (e) {}
  // Auf dem Anmelde-/Registrierungsbildschirm der App keinen Knopf zeigen
  setInterval(() => { const a = document.getElementById("screen-auth"); $("fab").style.display = a && visible(a) ? "none" : ""; }, 700);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
window.LernBlick = { open: (o) => openPanel(o || {}), thema: (t) => openPanel({ thema: t || true }), close: closePanel, ask: (q) => openPanel({ ask: q }), showSummary: (d) => openSummary(d) };
// Nur für den automatischen Prüfstand (wird im normalen Betrieb nie gesetzt)
if (window.__LB_BENCH) window.LernBlick._bench = {
  state: () => ({ turns: cur.turns.length, busy: lb.busy, boards: cur.boards.map((b) => ({ titel: b.titel || "", teile: b.teile || [], svg: !!b.svg })), answerBoards, sents: narr ? narr.sents : [], boardOf: narr ? narr.boardOf : [], segs: answerSegs, anchors: Object.keys(anchors), imgTeile: [...document.querySelectorAll("#lb-imgdraw [data-teil]")].flatMap((e) => e.getAttribute("data-teil").split(/\s+/)), status: $("status").textContent }),
  comps: () => Object.keys(COMPONENTS),
  repair: (t) => repairAnswer(t),
  show: (i) => { stopWalk(); if (narr) { narr.stopped = true; try { currentAudio && currentAudio.pause(); } catch (e) {} } if (i === "peek") return setStageMode("peek"); revealAll(); showBoard(i, false); setStageMode("tafel"); revealAll(); }
};

})();
