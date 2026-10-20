// === Fehler-Analyse auf dem Ergebnis-Bildschirm (Andreea, 19.10.2026) ===
// „am Ende … eine kurze Analyse … von den falschen Fragen … zu jedem einzelnen Thema … ob man ein maßgeschneidertes Erklärvideo dazu haben möchte“
// Eine kurze KI-Auswertung fasst die Fehler zu Themen zusammen (je ein Satz zum Denkfehler); pro Thema startet ein Knopf
// die Tafel-Erklärung von LernBlick – genau zu dieser Aufgabe und dieser falschen Antwort.
const FehlerAnalyse = (() => {
  const OHNE_VIDEO = /^(figur|allergieausweis_frage|wortfluessigkeit)$/;   // dort kann LernBlick nicht sinnvoll an der Tafel erklären
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BEREICH = (f) => f.typ === 'bms' ? (f.untertyp ? f.untertyp.charAt(0).toUpperCase() + f.untertyp.slice(1) : 'BMS') : ({ textverstaendnis: 'Textverständnis', zahlenfolge: 'Zahlenfolgen', implikation: 'Implikationen', figur: 'Figuren', allergieausweis_frage: 'Allergieausweise', wortfluessigkeit: 'Wortflüssigkeit' }[f.typ] || (/^sek/.test(f.typ) ? 'SEK' : f.typ || 'MedAT'));
  const SYSTEM = `Du bist eine erfahrene MedAT-Lehrkraft. Die Person hat am Ende einer Prüfung diese Aufgaben FALSCH beantwortet. Fasse sie zu THEMEN zusammen (Aufgaben zum selben Konzept gehören zusammen, z. B. „Schilddrüse – Rückkopplung“, „Verdünnungsrechnung“), höchstens 8 Themen.
Antworte NUR mit JSON: {"muster":"1–2 Sätze: Was fällt über alle Fehler hinweg auf (Du-Form, ohne Vorwurf, konkret)","themen":[{"thema":"kurzer Themenname","aufgaben":[1,4],"denkfehler":"1 Satz, Du-Form: welche falsche Annahme steckt hinter der gewählten Antwort","merke":"1 kurzer Merksatz"}]}
Fachlich exakt, Niveau Matura/MedAT. aufgaben = die Nummern aus der Liste.`;
  let laufend = 0;

  function box() {
    let el = document.getElementById('result-fehler');
    if (!el) {
      el = document.createElement('section'); el.id = 'result-fehler'; el.className = 'fa-box';
      const nach = document.getElementById('sim-result-blocks') || document.getElementById('res-stats');
      if (nach && nach.parentNode) nach.parentNode.insertBefore(el, nach.nextSibling);
    }
    return el;
  }
  function erklaere(f, thema, denkfehler) {
    if (!window.LernBlick || !LernBlick.fehler) return;
    LernBlick.fehler({ bereich: BEREICH(f), text: f.frage, optionen: f.optionen, gewaehlt: f.gewaehlt, richtig: f.richtig, erklaerung: f.erklaerung },
      `Thema: ${thema || BEREICH(f)}${denkfehler ? '. Erkannter Denkfehler: ' + denkfehler : ''}`);
  }
  // Jede falsche Aufgabe bekommt ihren eigenen Knopf (Andreea, 19.10.2026: „nicht nur ein vorgegebenes … für alles als Auswahl, was ich falsch hatte“)
  function karte(thema, liste, analyse) {
    const d = document.createElement('div'); d.className = 'fa-thema';
    d.innerHTML = `<div class="fa-kopf"><b>${esc(thema)}</b><span class="fa-zahl">${liste.length} Fehler</span></div>
      ${analyse && analyse.denkfehler ? `<p class="fa-df">✗ ${esc(analyse.denkfehler)}</p>` : ''}
      ${analyse && analyse.merke ? `<p class="fa-merke">💡 ${esc(analyse.merke)}</p>` : ''}`;
    const ul = document.createElement('div'); ul.className = 'fa-liste';
    liste.forEach((f) => {
      const z = document.createElement('div'); z.className = 'fa-frage';
      z.innerHTML = `<p class="fa-ftext">${esc(f.frage.slice(0, 220))}${f.frage.length > 220 ? ' …' : ''}</p>${f.gewaehlt ? `<p class="fa-falsch">Deine Antwort: ${esc(f.gewaehlt)}</p>` : ''}${f.richtig ? `<p class="fa-richtig">Richtig: ${esc(f.richtig)}</p>` : ''}`;
      if (!OHNE_VIDEO.test(f.typ)) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-cta fa-video';
        b.textContent = '🎬 Erklärvideo zu dieser Aufgabe';
        b.onclick = () => erklaere(f, thema, analyse && analyse.denkfehler);
        z.appendChild(b);
      }
      ul.appendChild(z);
    });
    d.appendChild(ul);
    if (liste.every((f) => OHNE_VIDEO.test(f.typ))) d.insertAdjacentHTML('beforeend', '<p class="fa-hinweis">Für diesen Untertest gibt es Strategie-Tipps im Lern-Assistenten statt eines Erklärvideos.</p>');
    return d;
  }
  async function zeige(fehler, modus) {
    const el = box(); if (!el) return;
    const nr = ++laufend;
    if (!fehler || !fehler.length) { el.hidden = true; return; }
    el.hidden = false;
    const liste = fehler.slice(0, 30);
    el.innerHTML = `<h3 class="fa-titel">🔍 Deine Fehler-Analyse</h3><p class="fa-muster" id="fa-muster">Ich schaue mir deine ${fehler.length} Fehler an …</p><div class="fa-themen" id="fa-themen"></div>`;
    const themen = document.getElementById('fa-themen');
    // Sofort: nach Bereich gruppiert (falls die KI-Auswertung nicht klappt, bleibt das stehen)
    const gruppen = {};
    liste.forEach((f) => { (gruppen[BEREICH(f)] = gruppen[BEREICH(f)] || []).push(f); });
    Object.entries(gruppen).forEach(([t, l]) => themen.appendChild(karte(t, l, null)));
    if (!window.LernBlick || !LernBlick.kurz || typeof Auth === 'undefined' || !Auth.isLoggedIn) { document.getElementById('fa-muster').textContent = 'Tippe bei einem Thema auf das Erklärvideo – LernBlick erklärt dir genau deinen Fehler.'; return; }
    try {
      const text = liste.map((f, i) => `${i + 1}. [${BEREICH(f)}] ${f.frage.slice(0, 400)}\n   gewählt: ${f.gewaehlt || '–'}\n   richtig: ${f.richtig || '–'}`).join('\n');
      const roh = await LernBlick.kurz(SYSTEM, text);
      if (nr !== laufend) return;
      const s = String(roh).replace(/^```(?:json)?\s*|\s*```$/g, ''), j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
      document.getElementById('fa-muster').textContent = j.muster || '';
      const genutzt = new Set();
      const neu = (j.themen || []).map((t) => {
        const l = (t.aufgaben || []).map((n) => liste[n - 1]).filter(Boolean);
        l.forEach((f) => genutzt.add(f));
        return l.length ? karte(t.thema || BEREICH(l[0]), l, t) : null;
      }).filter(Boolean);
      const rest = liste.filter((f) => !genutzt.has(f));
      if (rest.length) neu.push(karte('Weitere Fehler', rest, null));
      if (neu.length) themen.replaceChildren(...neu);
    } catch (e) {
      if (nr === laufend) document.getElementById('fa-muster').textContent = 'Tippe bei einem Thema auf das Erklärvideo – LernBlick erklärt dir genau deinen Fehler.';
    }
  }
  return { zeige };
})();
