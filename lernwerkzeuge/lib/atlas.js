/* ────────────────────────────────────────────────────────────────
   3D-Atlas — gemeinsame Baugruppe der 3D-Lernwerkzeuge (07.10.2026).

   Andreea (07.10.2026): „für die Volksschule eher bunt, also bunte
   Bilder von den Organen, Skelett und so weiter. Für die Mittelschule,
   da darf es aber schon etwas realistischer sein." Vorbild ist die App
   „Human Atlas": zusammengebaut drehen, „Alle Teile" fliegen in einen
   Setzkasten, Teil antippen → Steckbrief, Isolieren, Suche, Kamera.

   Ein Thema = ein Ordner public/lernwerkzeuge/atlas/<thema>/ mit
   teile.json und je Schicht einer GLB-Datei (Schnittstelle:
   scratchpad 3d/schnittstelle.md — Y oben, Meter, Gesicht nach +z,
   je Teil ein Knoten, node.name = id). Das Werkzeug liefert dazu die
   deutschen Namen, Gruppen, Kategorien, Farben und Texte:

     import { Atlas } from '../lib/atlas.js';
     const atlas = Atlas.start(document.getElementById('platz'), {
       thema: '../atlas/koerper/', darstellung: 'bunt',       // 'bunt' | 'echt'
       schichten: [{ id: 'skelett', name: 'Skelett', emo: '🦴', datei: 'skelett.glb', an: true }],
       kategorien: [{ id: 'kopf', name: 'Kopf', farbe: '#f08a24', echt: '#e6d8bd' }],
       teile: [{ id: 'schaedel', name: 'Schädel', kategorie: 'kopf',
                 wo: { schicht: 'skelett', en: /frontal|parietal/ },   // welche Knoten dazugehören
                 text: '…', wusstest: '…', quiz: 1, paar: 'schaedel' }],
       auto: (zeile) => ({ id, name, kategorie, text, quiz }) | null,  // für Knoten ohne Regel
     });

   Mehrere Knoten können EIN Teil bilden (Volksschule: alle Handknochen
   = „Hand"). Die Werkzeugseite braucht eine Import-Map mit relativen
   Pfaden: {"three":"../lib/three/three.module.js","three/addons/":"../lib/three/addons/"}.

   Leitplanken (Konzept, freigegeben 07.10.2026): nichts von fremden
   Servern; zuerst ein Standbild, gerendert wird nur bei Bewegung;
   Pixeldichte höchstens 2; ohne WebGL 2 oder bei verlorenem Kontext
   Standbild + Teileliste mit allen Steckbriefen; Touch zuerst (ein
   Finger drehen, zwei zoomen, Tippen = Steckbrief), Tastatur (Tab durch
   die Liste, Enter wählt, Pfeile drehen), „Bewegung reduzieren" =
   ohne Flüge. Keine Echtzeitschatten.

   Modi: ganz (zusammengebaut) · setzkasten · Explosion (Regler) ·
   Isolieren · Schichten · Suche · Kamera · quiz („Tippe auf …") ·
   puzzle (Teile an ihren Platz ziehen).
   ──────────────────────────────────────────────────────────────── */

const RUHIG = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const ZEIGER_FEIN = () => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } };

/** WebGL 2 da? (ohne three.js zu laden; der Prüf-Kontext wird gleich wieder freigegeben) */
export function kannWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const x = gl.getExtension('WEBGL_lose_context');
    if (x) x.loseContext();
    return true;
  } catch (e) { return false; }
}

/* ── kleine Helfer ── */
function h(tag, attr, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kinder.flat()) if (k != null) e.append(k);
  return e;
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const normA = (s) => String(s || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
const normAE = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
function globPasst(id, muster) {
  return [].concat(muster).some((m) => new RegExp('^' + String(m).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(id));
}
/** Passt eine Zeile aus teile.json zu einer Regel? Mehrere Regeln in einer Liste = oder. */
function passt(z, wo) {
  if (!wo) return false;
  if (Array.isArray(wo)) return wo.some((w) => passt(z, w));
  if (wo.schicht && ![].concat(wo.schicht).includes(z.schicht)) return false;
  if (wo.region && ![].concat(wo.region).includes(z.region)) return false;
  if (wo.seite && z.seite !== wo.seite) return false;
  if (wo.en && !(wo.en instanceof RegExp ? wo.en : new RegExp(wo.en, 'i')).test(z.en || '')) return false;
  if (wo.id && !globPasst(z.id, wo.id)) return false;
  if (wo.nicht && passt(z, wo.nicht)) return false;
  return true;
}
function seiteAus(id) { return /-l$/.test(id) ? 'l' : /-r$/.test(id) ? 'r' : ''; }

const ECHT = { skelett: '#e9dcc2', organe: '#c4776a', muskeln: '#a83a31' };
const SEITE_NAME = { l: 'linke Körperseite', r: 'rechte Körperseite' };
const SEITE_KURZ = { l: 'links', r: 'rechts' };

/* ═══════════════════════════════════════════════════════════════ */
export const Atlas = { start, kannWebGL2 };
if (typeof window !== 'undefined') window.Atlas = Atlas;
export default Atlas;

function start(behaelter, cfg) {
  if (typeof behaelter === 'string') behaelter = document.getElementById(behaelter);
  cfg = Object.assign({ darstellung: 'bunt', schichten: [], kategorien: [], teile: [], leiste: {}, boden: true, setzkastenNamen: true }, cfg);
  const leiste = Object.assign({ modi: true, explosion: true, kamera: true, suche: true }, cfg.leiste);
  const thema = cfg.thema ? (cfg.thema.endsWith('/') ? cfg.thema : cfg.thema + '/') : './';
  const url = (d) => new URL(d, new URL(thema, document.baseURI)).href;
  const echt = cfg.darstellung === 'echt';
  const ton = (art) => { try { if (cfg.ton) cfg.ton(art); else if (window.KISTE) window.KISTE.ton(art); } catch (e) { /* egal */ } };

  /* ── Zustand ── */
  const S = {
    modus: 'ganz', explosion: 0, gewaehlt: null, isoliert: null, hover: null, latein: false, namen: false,
    schichtAn: {}, katAn: {}, suche: '', markiert: null, quiz: null, puzzle: null, raster: null, ohne3d: false, bereit: false,
  };
  for (const s of cfg.schichten) S.schichtAn[s.id] = s.an !== false;
  for (const k of cfg.kategorien) S.katAn[k.id] = true;
  const TEILE = []; const NACH_ID = new Map(); const KNOTEN = new Map(); // Knoten-id → Teil
  const horer = {};
  const melde = (art, d) => (horer[art] || []).forEach((f) => { try { f(d); } catch (e) { console.error(e); } });

  /* ═══ DOM ═══ */
  const root = h('div', { class: 'atlas', 'data-modus': 'ganz', 'data-darstellung': echt ? 'echt' : 'bunt' });
  const L = cfg.texte || {};
  const knopf = (txt, attr) => h('button', Object.assign({ type: 'button', class: 'atlas-knopf' }, attr || {}), ...[].concat(txt));
  const kGanz = knopf([h('span', { class: 'emo', 'aria-hidden': 'true', text: '🧍' }), L.ganz || 'Zusammen'], { 'aria-pressed': 'true', title: 'Zusammengebaut drehen' });
  const kSetz = knopf([h('span', { class: 'emo', 'aria-hidden': 'true', text: '🗃️' }), L.setzkasten || 'Setzkasten'], { 'aria-pressed': 'false', title: 'Alle Teile in den Setzkasten' });
  const regler = h('input', { type: 'range', min: '0', max: '100', value: '0', step: '1', 'aria-label': 'Explosion: Teile auseinanderziehen' });
  const reglerAus = h('output', { text: '0 %' });
  const kamKnoepfe = ['vorne', 'hinten', 'links', 'rechts'].map((r) => knopf((L.kamera || {})[r] || r[0].toUpperCase() + r.slice(1), {
    'data-kamera': r, title: { vorne: 'Von vorne', hinten: 'Von hinten', links: 'Linke Körperseite', rechts: 'Rechte Körperseite' }[r],
  }));
  const suchFeld = h('input', { type: 'search', placeholder: L.suche || 'Teil suchen …', 'aria-label': 'Teil suchen', autocomplete: 'off', enterkeyhint: 'search' });
  const trefferAnz = h('span', { class: 'atlas-treffer', 'aria-live': 'polite' });
  const kLatein = cfg.latein ? knopf('Latein', { 'aria-pressed': 'false', title: 'Lateinische Fachbegriffe zeigen' }) : null;
  const kNamen = cfg.namenKnopf ? knopf([h('span', { class: 'emo', 'aria-hidden': 'true', text: '🏷️' }), 'Namen'], { 'aria-pressed': 'false', title: 'Namen am Modell zeigen' }) : null;
  const leisteEl = h('div', { class: 'atlas-leiste', role: 'toolbar', 'aria-label': '3D-Steuerung' },
    leiste.modi ? h('div', { class: 'atlas-gruppe atlas-modi atlas-nur-3d' }, kGanz, kSetz) : null,
    leiste.explosion ? h('div', { class: 'atlas-gruppe atlas-nur-ganz atlas-nur-3d' }, h('label', { class: 'atlas-regler', title: 'Explosion' }, h('span', { 'aria-hidden': 'true', text: '💥' }), regler, reglerAus)) : null,
    leiste.kamera ? h('div', { class: 'atlas-gruppe atlas-kamera atlas-nur-3d', role: 'group', 'aria-label': 'Kamera' }, kamKnoepfe) : null,
    (kNamen || kLatein) ? h('div', { class: 'atlas-gruppe atlas-extra-knoepfe' }, kNamen, kLatein) : null,
    leiste.suche ? h('div', { class: 'atlas-suche' }, suchFeld) : null,
    leiste.suche ? trefferAnz : null);

  const buehne = h('div', { class: 'atlas-buehne', tabindex: '0', role: 'group', 'aria-roledescription': '3D-Modell',
    'aria-label': (cfg.titel || '3D-Modell') + '. Pfeiltasten drehen, Plus und Minus zoomen. Alle Teile stehen in der Liste.' });
  const poster = h('img', { class: 'atlas-poster', alt: '', 'aria-hidden': 'true', draggable: 'false' });
  const etiketten = h('div', { class: 'atlas-etiketten', 'aria-hidden': 'true' });
  const SVGNS = 'http://www.w3.org/2000/svg';
  const linien = document.createElementNS(SVGNS, 'svg'); linien.setAttribute('class', 'atlas-linien'); linien.setAttribute('aria-hidden', 'true');
  const tipp = h('div', { class: 'atlas-tipp', role: 'tooltip', hidden: true });
  const aufgabe = h('div', { class: 'atlas-aufgabe', hidden: true });
  const balken = h('i');
  const lade = h('div', { class: 'atlas-lade', role: 'status' }, h('div', { class: 'atlas-balken' }, balken), h('span', { text: L.laden || '3D-Modell wird geladen …' }));
  const hinweis = h('div', { class: 'atlas-hinweis', text: L.hinweis || '👆 Ziehen: drehen · Zwei Finger: zoomen · Tippen: Steckbrief' });
  const karte = h('section', { class: 'atlas-karte', hidden: true, 'aria-live': 'polite', 'aria-label': 'Steckbrief' });
  const kZoomRein = knopf('+', { 'aria-label': 'Näher heran', title: 'Näher heran' });
  const kZoomRaus = knopf('−', { 'aria-label': 'Weiter weg', title: 'Weiter weg' });
  const kReset = knopf('⟲', { 'aria-label': 'Ansicht zurücksetzen', title: 'Alles zurücksetzen' });
  const ecke = h('div', { class: 'atlas-ecke' }, kZoomRein, kZoomRaus, kReset);
  buehne.append(poster, linien, etiketten, aufgabe, tipp, lade, hinweis, ecke, karte);

  const listeEl = h('div', { class: 'atlas-liste' });
  const schichtEl = h('div', { class: 'atlas-schichten' });
  const katEl = h('div', { class: 'atlas-kategorien' });
  const seitenDetails = h('details', {}, h('summary', {}, h('span', { 'aria-hidden': 'true', text: '📋' }), h('span', { class: 'atlas-summe', text: L.liste || 'Schichten & Teile' })),
    cfg.schichten.length > 1 ? h('div', { class: 'atlas-titel', text: 'Schichten' }) : null, schichtEl,
    h('div', { class: 'atlas-titel', text: L.kategorien || 'Bereiche' }), katEl,
    h('div', { class: 'atlas-titel', text: L.teile || 'Alle Teile' }), listeEl);
  try { if (matchMedia('(min-width: 900px)').matches) seitenDetails.open = true; } catch (e) { /* egal */ }
  const seite = h('aside', { class: 'atlas-seite', 'aria-label': 'Schichten und Teileliste' }, seitenDetails);
  const status = h('p', { class: 'sr', 'aria-live': 'polite' });
  root.append(leisteEl, h('div', { class: 'atlas-haupt' }, buehne, seite), status);
  behaelter.append(root);
  const sag = (t) => { status.textContent = ''; setTimeout(() => { status.textContent = t; }, 30); };

  /* Standbild zuerst */
  const posterListe = [].concat(cfg.poster || []);
  if (posterListe.length) { poster.src = posterListe[0].includes('/') ? new URL(posterListe[0], document.baseURI).href : url(posterListe[0]); poster.onerror = () => { poster.removeAttribute('src'); poster.style.display = 'none'; }; }
  else poster.style.display = 'none';

  /* ═══ Teile aus teile.json + Regeln des Werkzeugs ═══ */
  function katVon(id) {
    let k = cfg.kategorien.find((x) => x.id === id);
    if (!k) { k = { id: id || 'weitere', name: 'Weitere', farbe: '#9aa3b5' }; cfg.kategorien.push(k); S.katAn[k.id] = true; }
    return k;
  }
  function neuesTeil(d) {
    const t = Object.assign({}, d, { kat: katVon(d.kategorie), zeilen: [], meshes: [], geladen: false, objekt: null, quiz: d.quiz || 3 });
    TEILE.push(t); NACH_ID.set(t.id, t);
    return t;
  }
  function zuordnen(z) {
    if (KNOTEN.has(z.id)) return KNOTEN.get(z.id);
    let t = null;
    for (const d of cfg.teile) if (d.wo && passt(z, d.wo)) { t = NACH_ID.get(d.id) || neuesTeil(d); break; }
    if (!t && cfg.auto) {
      const a = cfg.auto(z);
      if (a) { const id = a.id || z.id; t = NACH_ID.get(id) || neuesTeil(Object.assign({}, a, { id })); }
    }
    if (!t) return null;
    t.zeilen.push(z); KNOTEN.set(z.id, t);
    if (!t.schicht) t.schicht = z.schicht;
    return t;
  }
  function teileFertig(mitZeilen) {
    /* Regeln ohne Knoten fallen weg (das Modell hat das Teil nicht) — außer es gibt gar keine teile.json. */
    if (mitZeilen) for (let i = TEILE.length - 1; i >= 0; i--) if (!TEILE[i].zeilen.length) { NACH_ID.delete(TEILE[i].id); TEILE.splice(i, 1); }
    for (const t of TEILE) {
      if (!t.schicht) t.schicht = t.kat.schicht || (cfg.schichten[0] || {}).id;
      if (t.seite == null) { const s = [...new Set(t.zeilen.map((z) => z.seite || seiteAus(z.id)))]; t.seite = s.length === 1 ? s[0] : ''; }
      t.paar = t.paar || t.id.replace(/-[lr]$/, '');
    }
    /* Reihenfolge: nach Kategorie (Reihenfolge der Konfiguration), darin nach Regel-Reihenfolge */
    const kOrd = new Map(cfg.kategorien.map((k, i) => [k.id, i]));
    const tOrd = new Map(cfg.teile.map((d, i) => [d.id, i]));
    TEILE.forEach((t, i) => { t._i = i; });
    TEILE.sort((a, b) => (kOrd.get(a.kat.id) - kOrd.get(b.kat.id)) || ((tOrd.get(a.id) ?? 1e4 + a._i) - (tOrd.get(b.id) ?? 1e4 + b._i)));
  }

  /* ═══ Seitenleiste ═══ */
  const zaehle = (f) => TEILE.filter(f).length;
  function baueSeite() {
    schichtEl.innerHTML = ''; katEl.innerHTML = ''; listeEl.innerHTML = '';
    if (cfg.schichten.length > 1) for (const s of cfg.schichten) {
      const n = zaehle((t) => t.schicht === s.id);
      if (!n && TEILE.length) continue;
      const cb = h('input', { type: 'checkbox' }); cb.checked = !!S.schichtAn[s.id];
      cb.addEventListener('change', () => schicht(s.id, cb.checked));
      s._cb = cb;
      s._el = h('label', { class: 'atlas-schalter' }, cb, h('span', { 'aria-hidden': 'true', text: s.emo || '' }), h('span', { text: s.name }), h('span', { class: 'zahl', text: String(n) }));
      schichtEl.append(s._el);
    }
    for (const k of cfg.kategorien) {
      const n = zaehle((t) => t.kat === k);
      if (!n) continue;
      const cb = h('input', { type: 'checkbox' }); cb.checked = !!S.katAn[k.id];
      cb.addEventListener('change', () => kategorie(k.id, cb.checked));
      k._cb = cb;
      k._el = h('label', { class: 'atlas-schalter' }, cb, h('span', { class: 'punkt', style: `background:${punktFarbe(k)}` }), h('span', { text: k.name }), h('span', { class: 'zahl', text: String(n) }));
      katEl.append(k._el);
      const gruppe = h('div', { class: 'atlas-gruppe-liste', role: 'group', 'aria-label': `${k.name}, ${n} Teile` },
        h('h4', {}, h('span', { class: 'punkt', style: `background:${punktFarbe(k)}` }), `${k.name} (${n})`));
      for (const t of TEILE.filter((x) => x.kat === k)) {
        t.li = h('button', { type: 'button', class: 'atlas-teil', 'aria-pressed': 'false', 'data-teil': t.id },
          h('span', { class: 'punkt', style: `background:${echt ? punktFarbe(t.kat) : farbeTeil(t)}` }),
          h('span', {}, t.name, t.latein ? h('small', { class: 'lat', hidden: !S.latein, text: t.latein }) : null),
          t.seite && cfg.seitenZeigen !== false ? h('span', { class: 'seite', text: SEITE_KURZ[t.seite] }) : null);
        t.li.addEventListener('click', () => listeKlick(t));
        t.liText = h('div', { class: 'atlas-teil-text', html: steckbriefHtml(t, true) });
        gruppe.append(t.li, t.liText);
      }
      listeEl.append(gruppe);
    }
    root.querySelector('.atlas-summe').textContent = `${L.liste || 'Schichten & Teile'} (${TEILE.length})`;
  }
  function listeKlick(t) {
    if (S.ohne3d) { const an = t.li.getAttribute('aria-pressed') !== 'true'; TEILE.forEach((x) => x.li && x.li.setAttribute('aria-pressed', 'false')); t.li.setAttribute('aria-pressed', an ? 'true' : 'false'); return; }
    if (S.puzzle) { puzzleHilfe(t); return; }
    if (S.quiz) return;
    if (!sichtbarSoll(t) || !t.geladen) {
      S.katAn[t.kat.id] = true;
      schicht(t.schicht, true).then(() => waehle(t.id, { karte: true, rahmen: true }));
      return;
    }
    waehle(t.id, { karte: true, rahmen: true });
  }
  function syncSchalter() {
    for (const s of cfg.schichten) if (s._cb) s._cb.checked = !!S.schichtAn[s.id];
    for (const k of cfg.kategorien) if (k._cb) k._cb.checked = !!S.katAn[k.id];
    for (const t of TEILE) if (t.li) t.li.classList.toggle('aus', !sichtbarSoll(t));
  }

  /* ═══ Steckbrief ═══ */
  function punktFarbe(k) { return echt ? (k.chip || k.farbe || '#8c8aa3') : (k.farbe || '#7aa7e8'); }
  function farbeTeil(t) { return echt ? (t.echt || t.kat.echt || ECHT[t.schicht] || '#e9dcc2') : (t.farbe || t.kat.farbe || '#7aa7e8'); }
  function chipFarbe(t) { return t.kat.chip || t.kat.farbe || '#565470'; }
  function steckbriefHtml(t, kurz) {
    let s = '';
    if (t.latein && !kurz) s += '';
    if (t.text) s += `<p>${esc(t.text)}</p>`;
    if (t.wusstest) s += `<div class="atlas-wusstest"><b>${esc(L.wusstest || 'WUSSTEST DU?')}</b>${esc(t.wusstest)}</div>`;
    if (t.extra) s += `<div class="atlas-extra">${t.extra}</div>`;
    return s;
  }
  function zeigeKarte(t) {
    if (!t || S.quiz || cfg.karte === false) { karte.hidden = true; versatz(); return; }
    karte.innerHTML = '';
    const zu = h('button', { type: 'button', class: 'zu', 'aria-label': 'Steckbrief schließen', text: '✕' });
    zu.addEventListener('click', () => { waehle(null); buehne.focus({ preventScroll: true }); });
    const iso = knopf(S.isoliert === t ? ['↩ ', L.alleZeigen || 'Alle zeigen'] : ['🔍 ', L.isolieren || 'Isolieren'], { 'aria-pressed': S.isoliert === t ? 'true' : 'false' });
    iso.addEventListener('click', () => { if (S.isoliert === t) alleZeigen(); else isoliere(t.id); });
    const ran = knopf(['🎯 ', L.heran || 'Heranzoomen']);
    ran.addEventListener('click', () => rahme([t.id]));
    karte.append(...[zu,
      h('span', { class: 'atlas-chip', style: `background:${chipFarbe(t)}`, text: t.kat.name }),
      h('h3', { text: t.name }),
      t.latein && (S.latein || cfg.lateinImmer) ? h('div', { class: 'latein', text: t.latein }) : null,
      t.seite && cfg.seitenZeigen !== false ? h('div', { class: 'seite', text: SEITE_NAME[t.seite] }) : null,
      h('div', { html: steckbriefHtml(t) }),
      S.ohne3d ? null : h('div', { class: 'zeile' }, iso, ran)].filter(Boolean));
    karte.hidden = false;
    versatz();
  }
  /* Steckbrief offen: das Bild rückt zur Seite (Schreibtisch) bzw. nach oben (Handy), damit das Modell frei bleibt. */
  const VS = { x: 0, y: 0, zx: 0, zy: 0, an: null };
  function versatz() {
    if (!kamera || !breite) return;
    let zx = 0, zy = 0;
    if (!aufgabe.hidden && aufgabe.offsetHeight) zy = -Math.round((aufgabe.offsetHeight + 12) / 2);
    else if (!karte.hidden && !S.quiz && !S.puzzle && S.modus !== 'setzkasten') {
      const r = buehne.getBoundingClientRect(), k = karte.getBoundingClientRect();
      /* Das gewählte Teil in die Mitte der freien Fläche (links vom Steckbrief bzw. über dem Blatt am Handy) */
      const t = S.gewaehlt && S.gewaehlt.objekt ? S.gewaehlt : null;
      const p = t ? proj(t.objekt.getWorldPosition(new T3.THREE.Vector3())) : null;
      if (k.width && k.width < r.width * 0.7) {
        const frei = r.width - k.width - 24;
        zx = p ? Math.round(Math.max(-r.width / 3, Math.min(r.width / 2, p.x + VS.x - frei / 2))) : Math.round((k.width + 16) / 2);
      } else if (k.height) {
        const frei = r.height - Math.min(k.height, r.height * 0.6) - 12;
        zy = p ? Math.round(Math.max(-r.height / 3, Math.min(r.height / 2, p.y + VS.y - frei / 2))) : Math.round(Math.min(k.height, r.height * 0.6) / 2);
      }
    }
    if (zx === VS.zx && zy === VS.zy) return;
    VS.zx = zx; VS.zy = zy;
    const x0 = VS.x, y0 = VS.y, t0 = performance.now(), dauer = RUHIG() ? 0 : 420;
    if (VS.an) VS.an();
    const schritt = () => {
      const u = dauer ? Math.min(1, (performance.now() - t0) / dauer) : 1, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      VS.x = x0 + (zx - x0) * e; VS.y = y0 + (zy - y0) * e;
      ansichtSetzen();
      if (u >= 1 && VS.an) { VS.an(); VS.an = null; }
    };
    VS.an = animiere(schritt);
  }
  function ansichtSetzen() {
    if (!kamera || !breite) return;
    if (Math.abs(VS.x) < 0.5 && Math.abs(VS.y) < 0.5) kamera.clearViewOffset();
    else kamera.setViewOffset(breite, hoehe, VS.x, VS.y, breite, hoehe);
    kamera.updateProjectionMatrix();
  }

  /* Ab hier braucht es three.js. Ohne WebGL 2: Standbild + Liste. */
  let T3 = null; // { THREE, … }
  let renderer, szene, kamera, steuer, wurzelObj, boden, tweens, raycaster, zeiger;
  const ANIM = { an: 0 }; // laufende eigene Animationen
  let MODELL_BOX = null;
  const bereit = (async () => {
    let zeilen = [];
    try {
      const r = await fetch(url('teile.json'));
      if (r.ok) zeilen = await r.json();
    } catch (e) { /* ohne teile.json: Knoten aus den GLBs */ }
    if (cfg.zeilen) zeilen = cfg.zeilen(zeilen) || zeilen;
    for (const z of zeilen) { z.seite = z.seite === 'l' || z.seite === 'r' ? z.seite : seiteAus(z.id); zuordnen(z); }
    teileFertig(zeilen.length > 0);
    baueSeite(); syncSchalter();
    melde('teile', TEILE);
    if (!kannWebGL2()) { ohne3d(L.ohneWebgl || 'Dein Gerät kann die 3D-Ansicht nicht zeigen.'); return api; }
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap')) && !document.querySelector('script[type="importmap"]')) {
      ohne3d('Dieser Browser ist zu alt für die 3D-Ansicht.'); return api;
    }
    try {
      await sichtbarWarten();
      await ladeDrei();
      baueSzene();
      const erste = cfg.schichten.filter((s) => S.schichtAn[s.id] && !s.spaet);
      await Promise.all(erste.map((s) => ladeSchicht(s)));
      if (!TEILE.some((t) => t.geladen)) throw new Error('kein Teil geladen');
      nachDemLaden();
    } catch (e) {
      console.error('Atlas:', e);
      ohne3d(L.ladeFehler || 'Das 3D-Modell konnte nicht geladen werden.');
      melde('fehler', e);
    }
    return api;
  })();

  function sichtbarWarten() {
    return new Promise((ok) => {
      if (!('IntersectionObserver' in window) || cfg.sofort) { ok(); return; }
      const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); ok(); } }, { rootMargin: '300px' });
      io.observe(buehne);
    });
  }

  function ohne3d(grund) {
    S.ohne3d = true;
    root.classList.add('ohne-3d');
    lade.hidden = true; hinweis.hidden = true;
    if (renderer) renderer.domElement.style.display = 'none';
    poster.classList.remove('weg');
    if (poster.getAttribute('src')) poster.style.display = '';
    let alt = buehne.querySelector('.atlas-ohne');
    if (!alt) { alt = h('div', { class: 'atlas-ohne', role: 'status' }); buehne.append(alt); }
    alt.innerHTML = `<b>${esc(grund)}</b>${esc(L.ohneListe || 'Unten in der Liste stehen alle Teile mit ihrem Steckbrief — einfach antippen.')}`;
    seitenDetails.open = true;
    karte.hidden = true; aufgabe.hidden = true;
    root.classList.remove('ohne-seite');
    melde('ohne3d', grund);
  }

  async function ladeDrei() {
    const [THREE, oc, gl, mo, tw, bgu] = await Promise.all([
      import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'), import('three/addons/libs/tween.module.js'), import('three/addons/utils/BufferGeometryUtils.js'),
    ]);
    T3 = { THREE, OrbitControls: oc.OrbitControls, GLTFLoader: gl.GLTFLoader, MeshoptDecoder: mo.MeshoptDecoder, TWEEN: tw, mergeGeometries: bgu.mergeGeometries };
    if (T3.MeshoptDecoder.ready) await T3.MeshoptDecoder.ready;
  }

  /* ═══ Szene ═══ */
  function baueSzene() {
    const { THREE } = T3;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }); // MedAT: damit LernBlick das 3D-Bild sehen kann
    const schwach = (navigator.hardwareConcurrency || 8) <= 4 || /Android/.test(navigator.userAgent);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, schwach ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    const cv = renderer.domElement;
    cv.setAttribute('aria-hidden', 'true');
    buehne.insertBefore(cv, linien);
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); kontextWeg(); }, false);
    cv.addEventListener('webglcontextrestored', () => kontextDa(), false);

    szene = new THREE.Scene();
    kamera = new THREE.PerspectiveCamera(32, 1, 0.02, 60);
    kamera.position.set(0, 1, 4);
    szene.add(kamera);
    /* Licht: Himmel/Boden + ein Hauptlicht, das mit der Kamera wandert (auch hinten gut beleuchtet) + Gegenlicht. */
    szene.add(new THREE.HemisphereLight(0xffffff, echt ? 0x6b5a4a : 0xb7a68f, echt ? 1.15 : 1.55));
    const haupt = new THREE.DirectionalLight(0xffffff, echt ? 2.3 : 1.9);
    haupt.position.set(1.2, 1.6, 1.4); kamera.add(haupt); kamera.add(haupt.target); haupt.target.position.set(0, 0, -1);
    const gegen = new THREE.DirectionalLight(echt ? 0x9fb4ff : 0xfff1dc, echt ? 0.9 : 0.6);
    gegen.position.set(-1.5, 0.6, -1.2); kamera.add(gegen); kamera.add(gegen.target); gegen.target.position.set(0, 0, -1);
    wurzelObj = new THREE.Group(); szene.add(wurzelObj);
    tweens = new T3.TWEEN.Group();
    raycaster = new THREE.Raycaster();
    zeiger = new THREE.Vector2();

    steuer = new T3.OrbitControls(kamera, cv);
    steuer.enableDamping = true; steuer.dampingFactor = 0.12;
    steuer.minDistance = 0.12; steuer.maxDistance = 9;
    steuer.zoomToCursor = true;
    steuer.rotateSpeed = 0.8;
    steuer.addEventListener('change', zeichne);
    steuer.addEventListener('start', () => { hinweisWeg(); tipp.hidden = true; });

    const ro = new ResizeObserver(() => groesse());
    ro.observe(buehne);
    groesse();
    zeigerEreignisse(cv);
    tastatur();
  }
  function kontextWeg() { S.kontextWeg = true; ohne3d(L.kontextWeg || 'Die 3D-Ansicht wurde vom Gerät beendet (zu wenig Grafikspeicher).'); }
  function kontextDa() {
    if (!S.kontextWeg) return;
    S.kontextWeg = false; S.ohne3d = false;
    root.classList.remove('ohne-3d'); renderer.domElement.style.display = '';
    const alt = buehne.querySelector('.atlas-ohne'); if (alt) alt.remove();
    poster.classList.add('weg'); zeichne();
  }
  let breite = 0, hoehe = 0;
  function groesse() {
    if (!renderer) return;
    const w = buehne.clientWidth, hh = buehne.clientHeight;
    if (!w || !hh) return;
    const neu = Math.abs(w / hh - breite / Math.max(1, hoehe)) > 0.25;
    breite = w; hoehe = hh;
    renderer.setSize(w, hh, false);
    kamera.aspect = w / hh; ansichtSetzen();
    if (S.bereit && neu && S.modus === 'setzkasten') { rasterBerechnen(); if (faecher) { faecher.visible = true; faecher.material.opacity = 1; } stelleRaster(false); kameraAuf(S.raster.box, 'vorne', 0, 1.05); }
    else if (S.bereit && neu && S.puzzle) puzzleNeuLegen();
    else if (S.bereit && !S._ersteGroesse) { S._ersteGroesse = true; kameraAuf(sichtBox(), S.kameraRichtung || START, 0, 1.06); }
    zeichne();
  }

  /* ── Zeichnen nur bei Bedarf ── */
  let bestellt = false;
  function zeichne() { if (!bestellt && renderer) { bestellt = true; requestAnimationFrame(rahmen); } }
  function rahmen() {
    bestellt = false;
    if (!renderer || S.ohne3d || !breite) return;
    const laeuft = tweens.update();
    const bewegt = steuer.update();
    if (ANIM.an > 0) anims.forEach((a) => a());
    renderer.render(szene, kamera);
    etikettenSetzen();
    if (laeuft || bewegt || ANIM.an > 0) zeichne();
  }
  const anims = new Set();
  function animiere(f) { anims.add(f); ANIM.an = anims.size; zeichne(); return () => { anims.delete(f); ANIM.an = anims.size; }; }

  /* ═══ Laden einer Schicht ═══ */
  let ladeStand = {};
  function fortschritt() {
    const v = Object.values(ladeStand); if (!v.length) return;
    const ganz = v.reduce((a, x) => a + (x.total || 0), 0), da = v.reduce((a, x) => a + (x.loaded || 0), 0);
    balken.style.width = (ganz ? Math.min(100, (da / ganz) * 100) : 30) + '%';
  }
  const geladen = {};
  function ladeSchicht(s) {
    if (geladen[s.id]) return geladen[s.id];
    if (s._el) s._el.classList.add('laedt');
    lade.hidden = false;
    geladen[s.id] = new Promise((ok, nein) => {
      const loader = new T3.GLTFLoader();
      loader.setMeshoptDecoder(T3.MeshoptDecoder);
      loader.load(url(s.datei), (gltf) => {
        try { einbauen(s, gltf.scene); ok(); } catch (e) { nein(e); }
        if (s._el) s._el.classList.remove('laedt');
        if (Object.keys(geladen).every((k) => ladeStand[k] && ladeStand[k].fertig !== false)) lade.hidden = !!S.bereit;
      }, (e) => { ladeStand[s.id] = { loaded: e.loaded, total: e.total || e.loaded * 1.3 }; fortschritt(); },
      (e) => { if (s._el) s._el.classList.remove('laedt'); console.warn('Atlas: Schicht fehlt', s.datei, e); ok(); });
    });
    return geladen[s.id];
  }

  function einbauen(s, gscene) {
    const { THREE } = T3;
    gscene.updateMatrixWorld(true);
    const meshes = [];
    gscene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const betroffen = new Set(); const vorher = TEILE.length;
    for (const m of meshes) {
      const kid = m.name || (m.parent && m.parent.name) || '';
      let t = KNOTEN.get(kid);
      if (!t) t = zuordnen({ id: kid, schicht: s.id, en: '', region: '', seite: seiteAus(kid) });
      if (!t) { m.geometry.dispose(); continue; }
      t.meshes.push(m); betroffen.add(t);
    }
    for (const t of betroffen) {
      if (t.geladen) continue;
      const box = new THREE.Box3();
      for (const m of t.meshes) box.union(new THREE.Box3().setFromObject(m));
      const mitte = box.getCenter(new THREE.Vector3());
      const piv = new THREE.Group(); piv.name = t.id; piv.position.copy(mitte);
      wurzelObj.add(piv); piv.updateMatrixWorld(true);
      for (const m of t.meshes) piv.attach(m);
      /* mehrere Knoten = ein Teil: zu einem Mesh verschmelzen (weniger Zeichenaufrufe) */
      let mesh = t.meshes[0];
      if (t.meshes.length > 1) {
        const geos = t.meshes.map((m) => { m.updateMatrix(); const g = zuFloat(m.geometry); g.applyMatrix4(m.matrix); return g; });
        const g = T3.mergeGeometries(geos, false);
        geos.forEach((x) => x.dispose());
        t.meshes.forEach((m) => { piv.remove(m); m.geometry.dispose(); });
        if (g) { mesh = new THREE.Mesh(g); piv.add(mesh); } else { t.meshes.forEach((m) => piv.add(m)); }
      }
      t.mesh = mesh; t.meshes = [mesh];
      t.objekt = piv; t.heim = mitte.clone(); t.box = box; t.groesse = box.getSize(new THREE.Vector3());
      t.mat = baueMaterial(t, mesh);
      mesh.material = t.mat; mesh.userData.teil = t;
      t.geladen = true;
      if (t.li) t.li.disabled = false;
    }
    MODELL_BOX = null;
    if (TEILE.length !== vorher) { teileFertig(false); baueSeite(); syncSchalter(); }
    if (S.bereit) { richtungenBerechnen(); sichtbarkeit(); stelle(false); zeichne(); }
  }
  function zuFloat(g) {
    const { THREE } = T3;
    const n = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const a = g.getAttribute(name); if (!a) continue;
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
      n.setAttribute(name, new THREE.BufferAttribute(f, 3));
    }
    if (g.index) n.setIndex(new THREE.BufferAttribute(Uint32Array.from(g.index.array), 1));
    if (!n.getAttribute('normal')) n.computeVertexNormals();
    return n;
  }

  /* ── Materialien: „bunt" klar und freundlich, „echt" mit Farbspiel (Vertexfarben) und Muskelfasern ── */
  function baueMaterial(t, mesh) {
    const { THREE } = T3;
    const farbe = new THREE.Color(farbeTeil(t));
    const m = new THREE.MeshStandardMaterial({
      color: farbe, metalness: 0,
      roughness: echt ? (t.schicht === 'organe' ? 0.36 : t.schicht === 'muskeln' ? 0.52 : 0.7) : 0.48,
      vertexColors: echt,
    });
    if (echt) {
      farbspiel(mesh, t);
      if (t.schicht === 'muskeln') fasern(m, mesh, t);
    }
    m.userData.basis = farbe.clone();
    return m;
  }
  function wert(x, y, z) { // Werte-Rauschen 0..1
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const hs = (i, j, k) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); };
    const l = (a, b, f) => a + (b - a) * f;
    return l(l(l(hs(xi, yi, zi), hs(xi + 1, yi, zi), u), l(hs(xi, yi + 1, zi), hs(xi + 1, yi + 1, zi), u), v),
      l(l(hs(xi, yi, zi + 1), hs(xi + 1, yi, zi + 1), u), l(hs(xi, yi + 1, zi + 1), hs(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  function farbspiel(mesh, t) {
    const { THREE } = T3;
    const g = mesh.geometry, p = g.getAttribute('position');
    const c = new Float32Array(p.count * 3);
    const v = new THREE.Vector3();
    const k = t.schicht === 'skelett' ? 55 : 40, staerke = t.schicht === 'skelett' ? 0.16 : 0.2;
    mesh.updateMatrixWorld(true);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      const n = wert(v.x * k, v.y * k, v.z * k) * 0.65 + wert(v.x * k * 3.1, v.y * k * 3.1, v.z * k * 3.1) * 0.35;
      const f = 1 - staerke / 2 + n * staerke;
      c[i * 3] = f; c[i * 3 + 1] = f * (t.schicht === 'skelett' ? 0.985 + n * 0.02 : 1); c[i * 3 + 2] = f * (t.schicht === 'skelett' ? 0.96 + n * 0.04 : 1);
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  function fasern(m, mesh, t) {
    const { THREE } = T3;
    /* Hauptachse des Muskels (Potenzmethode über die Kovarianz) → Fasern laufen entlang dieser Achse. */
    const p = mesh.geometry.getAttribute('position'), v = new THREE.Vector3(), mi = new THREE.Vector3();
    const schritt = Math.max(1, Math.floor(p.count / 400)); let n = 0;
    for (let i = 0; i < p.count; i += schritt) { mi.add(v.fromBufferAttribute(p, i)); n++; }
    mi.divideScalar(n);
    const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < p.count; i += schritt) {
      v.fromBufferAttribute(p, i).sub(mi);
      C[0] += v.x * v.x; C[1] += v.x * v.y; C[2] += v.x * v.z; C[4] += v.y * v.y; C[5] += v.y * v.z; C[8] += v.z * v.z;
    }
    C[3] = C[1]; C[6] = C[2]; C[7] = C[5];
    let a = new THREE.Vector3(0.3, 1, 0.2).normalize();
    for (let k = 0; k < 12; k++) a = new THREE.Vector3(C[0] * a.x + C[1] * a.y + C[2] * a.z, C[3] * a.x + C[4] * a.y + C[5] * a.z, C[6] * a.x + C[7] * a.y + C[8] * a.z).normalize();
    /* Maßstab: Mesh-Koordinaten können quantisiert sein → Frequenz an die Meshgröße koppeln */
    mesh.geometry.computeBoundingBox();
    const gross = mesh.geometry.boundingBox.getSize(new THREE.Vector3()).length() || 1;
    const welt = t.groesse.length() || 0.2;
    const k = (2 * Math.PI / 0.0045) * (welt / gross);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uAchse = { value: a }; sh.uniforms.uK = { value: k };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFaser;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFaser = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFaser;\nuniform vec3 uAchse;\nuniform float uK;')
        .replace('#include <color_fragment>', `#include <color_fragment>
  vec3 qF = vFaser - uAchse * dot(vFaser, uAchse);
  float lF = dot(vFaser, uAchse);
  float fF = sin(qF.x * uK + qF.z * uK * 0.7 + sin(lF * uK * 0.08) * 2.2) * 0.5 + 0.5;
  float gF = sin(qF.y * uK * 0.9 - qF.x * uK * 0.4 + 1.3) * 0.5 + 0.5;
  diffuseColor.rgb *= 0.86 + 0.16 * mix(fF, gF, 0.4);`);
    };
    m.customProgramCacheKey = () => 'faser';
  }

  /* ═══ Nach dem Laden ═══ */
  function nachDemLaden() {
    S.bereit = true;
    richtungenBerechnen();
    if (cfg.boden !== false) bodenSchatten();
    sichtbarkeit();
    stelle(false);
    groesse();
    kameraAuf(sichtBox(), START, 0, 1.06);
    lade.hidden = true;
    zeichne();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      poster.classList.add('weg');
      root.dataset.bereit = '1';
      melde('bereit', api);
    }));
    setTimeout(hinweisWeg, 9000);
  }
  function hinweisWeg() { hinweis.classList.add('weg'); }

  function modellBox() {
    if (MODELL_BOX) return MODELL_BOX;
    const { THREE } = T3; const b = new THREE.Box3();
    for (const t of TEILE) if (t.geladen) b.union(t.box);
    MODELL_BOX = b; return b;
  }
  function richtungenBerechnen() {
    const { THREE } = T3; const b = modellBox(); const c = b.getCenter(new THREE.Vector3());
    for (const t of TEILE) {
      if (!t.geladen) continue;
      const d = t.heim.clone().sub(c);
      const sv = (cfg.schichten.find((s) => s.id === t.schicht) || {}).explosion || [0, 0, 0];
      t.explRicht = new THREE.Vector3(d.x * 1.35, d.y * 0.55, d.z * 1.8 + 0.03).add(new THREE.Vector3(...sv));
    }
  }
  function bodenSchatten() {
    const { THREE } = T3; const b = modellBox();
    if (b.min.y < -0.05 || b.min.y > 0.1) return;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(20,20,40,.34)'); g.addColorStop(0.55, 'rgba(20,20,40,.12)'); g.addColorStop(1, 'rgba(20,20,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const s = b.getSize(new THREE.Vector3());
    boden = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(0.5, s.x * 1.5), Math.max(0.35, s.z * 2.2)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    boden.rotation.x = -Math.PI / 2; boden.position.set(b.getCenter(new THREE.Vector3()).x, b.min.y + 0.002, b.getCenter(new THREE.Vector3()).z);
    boden.renderOrder = -1;
    szene.add(boden);
  }

  /* ═══ Sichtbarkeit, Hervorheben, Geist ═══ */
  function sichtbarSoll(t) { return !!(S.schichtAn[t.schicht] && S.katAn[t.kat.id]); }
  function sichtbarkeit() {
    if (!T3) { syncSchalter(); return; }
    for (const t of TEILE) {
      if (!t.geladen) continue;
      const soll = sichtbarSoll(t);
      let geist = false, aus = !soll;
      if (S.isoliert && S.isoliert !== t) geist = soll;
      const rest = S.markiert && !S.markiert.ids.has(t.id) ? (typeof S.markiert.rest === 'function' ? S.markiert.rest(t) : S.markiert.rest) : null;
      if (rest === 'geist') geist = soll;
      if (rest === 'weg') aus = true;
      if (S.puzzle) { geist = S.puzzle.geistRest && soll && !S.puzzle.ids.has(t.id); aus = !soll && !S.puzzle.ids.has(t.id); }
      if (S.sucheIds && !S.sucheIds.has(t.id) && soll && !S.isoliert) geist = true;
      t.objekt.visible = !aus;
      t.geist = geist && !aus;
      faerbe(t);
    }
    if (boden) boden.visible = S.modus === 'ganz' || S.modus === 'quiz' || S.modus === 'puzzle';
    syncSchalter();
    zeichne();
  }
  function faerbe(t) {
    const m = t.mat; if (!m) return;
    const geist = t.geist;
    const deck = S.puzzle && S.puzzle.deckRest && !S.puzzle.ids.has(t.id) ? S.puzzle.deckRest : 1;
    const op = geist ? (S.isoliert ? 0.07 : 0.16) : deck;
    const transp = op < 1;
    if (m.transparent !== transp) { m.transparent = transp; m.needsUpdate = true; }
    m.opacity = op; m.depthWrite = !transp;
    let em = 0x000000, st = 0;
    const mk = S.markiert && S.markiert.ids.has(t.id) ? S.markiert : null;
    let stEm = null;
    const mf = mk && mk.farbe ? mk.farbe(t) : null;
    if (mf) m.color.set(mf); else m.color.copy(m.userData.basis);
    if (mk && mk.leuchten && mf) { em = new T3.THREE.Color(mf).getHex(); st = mk.leuchten(t) || 0; }
    if (st) stEm = [em, st];
    if (t.blitz) { em = t.blitz; st = 0.55; }
    else if (stEm) { [em, st] = stEm; }
    else if (S.puzzle && S.puzzle.zug && S.puzzle.zug.t === t) { em = 0xffffff; st = 0.14; }
    else if (S.gewaehlt === t) { em = echt ? 0x5fa8ff : 0xffd23a; st = echt ? 0.42 : 0.5; }
    else if (S.hover === t) { em = echt ? 0x88b8ff : 0xffe58a; st = 0.22; }
    else if (S.sucheIds && S.sucheIds.has(t.id)) { em = 0xffd23a; st = 0.3; }
    m.emissive.setHex(em); m.emissiveIntensity = st;
  }

  /* ═══ Stellungen: ganz (mit Explosion und Pose), Setzkasten, Puzzle ═══ */
  function zielGanz(t) {
    const { THREE } = T3;
    const p = t.heim.clone().addScaledVector(t.explRicht, S.explosion);
    const q = new THREE.Quaternion(); const s = new THREE.Vector3(1, 1, 1);
    if (t.pose) {
      const P = t.pose;
      if (P.s) { s.copy(P.s); const a = P.anker || t.heim; p.sub(a).multiply(P.s).add(a); }
      if (P.q) { const u = P.um || t.heim; p.sub(u).applyQuaternion(P.q).add(u); q.copy(P.q); }
    }
    return { p, q, s };
  }
  function setze(t, z) { t.objekt.position.copy(z.p); t.objekt.quaternion.copy(z.q); t.objekt.scale.copy(z.s); }
  function stelle(flug) {
    if (!S.bereit) return;
    if (S.modus === 'setzkasten' && S.raster) return stelleRaster(flug);
    if (S.puzzle) return;
    for (const t of TEILE) if (t.geladen) setze(t, zielGanz(t));
    zeichne();
  }

  /* ── Tween-Helfer ── */
  function tween(von, nach, dauer, opt) {
    const { TWEEN } = T3;
    opt = opt || {};
    const tw = new TWEEN.Tween(von, tweens).to(nach, RUHIG() ? 0 : dauer).easing(opt.easing || TWEEN.Easing.Cubic.InOut);
    if (opt.delay && !RUHIG()) tw.delay(opt.delay);
    if (opt.update) tw.onUpdate(opt.update);
    return new Promise((ok) => { tw.onComplete(() => { if (opt.fertig) opt.fertig(); ok(); }); tw.onStop(ok); tw.start(); zeichne(); });
  }
  function fliege(t, z, dauer, delay, bogen) {
    const p0 = t.objekt.position.clone(), q0 = t.objekt.quaternion.clone(), s0 = t.objekt.scale.clone();
    const o = { u: 0 };
    if (t._flug) t._flug.stop();
    const { TWEEN } = T3;
    const tw = new TWEEN.Tween(o, tweens).to({ u: 1 }, RUHIG() ? 0 : dauer).easing(TWEEN.Easing.Cubic.InOut).delay(RUHIG() ? 0 : (delay || 0))
      .onUpdate(() => {
        t.objekt.position.lerpVectors(p0, z.p, o.u);
        if (bogen) t.objekt.position.z += Math.sin(Math.PI * o.u) * bogen;
        t.objekt.quaternion.slerpQuaternions(q0, z.q, o.u);
        t.objekt.scale.lerpVectors(s0, z.s, o.u);
      });
    t._flug = tw;
    return new Promise((ok) => { tw.onComplete(() => { t._flug = null; ok(); }).onStop(() => { t._flug = null; ok(); }).start(); zeichne(); });
  }
  /** Nur die Größe ändern (beim Greifen im Puzzle — die Position bestimmt der Finger). */
  function skaliereZu(t, s, dauer) {
    const s0 = t.objekt.scale.x, o = { u: 0 };
    if (t._flug) t._flug.stop();
    const { TWEEN } = T3;
    t._flug = new TWEEN.Tween(o, tweens).to({ u: 1 }, RUHIG() ? 0 : dauer).easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(() => { const v = s0 + (s - s0) * o.u; t.objekt.scale.set(v, v, v); })
      .onComplete(() => { t._flug = null; }).start();
    zeichne();
  }

  /* ═══ Kamera ═══ */
  const START = cfg.startRichtung || [0.3, 0.1, 1];
  const RICHTUNG = { vorne: [0, 0.06, 1], hinten: [0, 0.06, -1], links: [1, 0.06, 0], rechts: [-1, 0.06, 0], oben: [0, 1, 0.02] };
  function sichtBox(nurIds) {
    const { THREE } = T3; const b = new THREE.Box3();
    for (const t of TEILE) {
      if (!t.geladen || !t.objekt.visible) continue;
      if (nurIds && !nurIds.includes(t.id)) continue;
      if (!nurIds && t.geist && !S.puzzle) continue;
      t.objekt.updateMatrixWorld(true);
      b.union(new THREE.Box3().setFromObject(t.objekt));
    }
    if (b.isEmpty()) return modellBox().clone();
    return b;
  }
  function kameraZiel(box, richtung, rand) {
    const { THREE } = T3;
    const d = (Array.isArray(richtung) ? new THREE.Vector3(...richtung) : richtung.isVector3 ? richtung.clone() : new THREE.Vector3(...RICHTUNG[richtung] || RICHTUNG.vorne)).normalize();
    const c = box.getCenter(new THREE.Vector3());
    const oben = Math.abs(d.y) > 0.95 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const rechts = new THREE.Vector3().crossVectors(oben, d).normalize();
    const hoch = new THREE.Vector3().crossVectors(d, rechts).normalize();
    let hw = 0, hh = 0, hd = 0;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(c);
      hw = Math.max(hw, Math.abs(p.dot(rechts))); hh = Math.max(hh, Math.abs(p.dot(hoch))); hd = Math.max(hd, p.dot(d));
    }
    const tv = Math.tan(THREE.MathUtils.degToRad(kamera.fov / 2)), th = tv * kamera.aspect;
    const dist = Math.max(hh / tv, hw / th, 0.08) * (rand || 1.12) + hd;
    return { pos: c.clone().addScaledVector(d, dist), ziel: c };
  }
  /** Rand-Faktor, wenn oben die Aufgabe steht (Quiz, Puzzle): das Modell muss in den freien Teil passen. */
  function aufgabenRand(r) { const a = !aufgabe.hidden ? aufgabe.offsetHeight + 12 : 0; return (r || 1.06) * hoehe / Math.max(120, hoehe - a); }
  function kameraAuf(box, richtung, dauer, rand) {
    if (!kamera) return Promise.resolve();
    const z = kameraZiel(box, richtung, rand);
    return kameraFahrt(z.pos, z.ziel, dauer == null ? 900 : dauer);
  }
  function kameraFahrt(pos, ziel, dauer) {
    const p0 = kamera.position.clone(), z0 = steuer.target.clone();
    if (S._kFahrt) S._kFahrt.stop && S._kFahrt.stop();
    if (!dauer || RUHIG()) { kamera.position.copy(pos); steuer.target.copy(ziel); steuer.update(); zeichne(); return Promise.resolve(); }
    const o = { u: 0 };
    const { TWEEN } = T3;
    return new Promise((ok) => {
      const tw = new TWEEN.Tween(o, tweens).to({ u: 1 }, dauer).easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => { kamera.position.lerpVectors(p0, pos, o.u); steuer.target.lerpVectors(z0, ziel, o.u); })
        .onComplete(() => { S._kFahrt = null; steuer.update(); ok(); }).onStop(() => ok()).start();
      S._kFahrt = tw; zeichne();
    });
  }
  function kameraRichtung(r) {
    if (!S.bereit) return;
    S.kameraRichtung = r;
    kamKnoepfe.forEach((b) => b.setAttribute('aria-pressed', b.dataset.kamera === r ? 'true' : 'false'));
    const ids = S.isoliert ? [S.isoliert.id] : null;
    kameraAuf(sichtBox(ids), r, 900);
    sag({ vorne: 'Ansicht von vorne', hinten: 'Ansicht von hinten', links: 'Linke Körperseite', rechts: 'Rechte Körperseite' }[r] || r);
  }
  function zoom(f) {
    const { THREE } = T3; const d = new THREE.Vector3().subVectors(kamera.position, steuer.target);
    const neu = THREE.MathUtils.clamp(d.length() * f, steuer.minDistance, steuer.maxDistance);
    kameraFahrt(steuer.target.clone().addScaledVector(d.normalize(), neu), steuer.target.clone(), 280);
  }
  function drehen(dAz, dPol) {
    const { THREE } = T3; const d = new THREE.Vector3().subVectors(kamera.position, steuer.target);
    const sp = new THREE.Spherical().setFromVector3(d);
    sp.theta += dAz; sp.phi = THREE.MathUtils.clamp(sp.phi + dPol, 0.15, Math.PI - 0.15);
    kameraFahrt(steuer.target.clone().add(new THREE.Vector3().setFromSpherical(sp)), steuer.target.clone(), 220);
  }
  function rahme(ids, dauer, richtung, rand) {
    if (!S.bereit) return;
    const box = sichtBox(ids);
    const { THREE } = T3; const d = richtung || new THREE.Vector3().subVectors(kamera.position, steuer.target).normalize();
    return kameraAuf(box, S.modus === 'setzkasten' ? 'vorne' : d, dauer == null ? 800 : dauer, rand || 1.6);
  }

  /* ═══ Zeiger: tippen, zeigen, ziehen ═══ */
  function treffer(x, y, nur) {
    const r = buehne.getBoundingClientRect();
    zeiger.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(zeiger, kamera);
    const ziele = [];
    for (const t of TEILE) if (t.geladen && t.objekt.visible && !t.geist && (!nur || nur(t))) ziele.push(t.mesh);
    const hit = raycaster.intersectObjects(ziele, false)[0];
    return hit ? { t: hit.object.userData.teil, punkt: hit.point } : null;
  }
  let druck = null, letzterTipp = null, hoverWartet = false, hoverXY = null;
  function zeigerEreignisse(cv) {
    /* Vor den OrbitControls (Einfangphase am Elternteil): Puzzle-Teile greifen. */
    buehne.addEventListener('pointerdown', (e) => {
      if (e.target !== cv) return;
      hinweisWeg();
      druck = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, n: (druck && druck.aktiv ? druck.n + 1 : 1), aktiv: true };
      if (S.puzzle && !S.puzzle.fertig) {
        const hit = treffer(e.clientX, e.clientY, (t) => S.puzzle.ids.has(t.id) && !S.puzzle.platz.has(t.id));
        if (hit) { steuer.enabled = false; puzzleGreifen(hit.t, e); }
      }
    }, true);
    cv.addEventListener('pointermove', (e) => {
      if (S.puzzle && S.puzzle.zug) { puzzleZiehen(e); return; }
      if (e.pointerType === 'mouse' && !e.buttons && ZEIGER_FEIN()) { hoverXY = [e.clientX, e.clientY]; if (!hoverWartet) { hoverWartet = true; requestAnimationFrame(hoverPruefen); } }
    });
    cv.addEventListener('pointerleave', () => { hoverXY = null; setzeHover(null); });
    const hoch = (e) => {
      if (!druck) return;
      const d = druck; druck = null;
      if (S.puzzle && S.puzzle.zug) { puzzleLoslassen(e); steuer.enabled = true; return; }
      steuer.enabled = true;
      const weg = Math.hypot(e.clientX - d.x, e.clientY - d.y), zeit = performance.now() - d.t;
      if (e.type === 'pointerup' && weg < 9 && zeit < 650) tippen(e.clientX, e.clientY);
    };
    window.addEventListener('pointerup', hoch);
    window.addEventListener('pointercancel', hoch);
  }
  function hoverPruefen() {
    hoverWartet = false;
    if (!hoverXY || S.ohne3d || !S.bereit || (S.puzzle && S.puzzle.zug)) return;
    const hit = treffer(hoverXY[0], hoverXY[1]);
    const t = hit ? hit.t : null;
    setzeHover(t);
    const zeigName = t && !S.quiz && !(S.puzzle && S.puzzle.ohneNamen);
    if (zeigName) {
      tipp.innerHTML = esc(t.name) + (t.latein && S.latein ? `<small>${esc(t.latein)}</small>` : '') + (t.seite && cfg.seitenZeigen !== false ? `<small>${esc(SEITE_NAME[t.seite])}</small>` : '');
      const r = buehne.getBoundingClientRect();
      let x = hoverXY[0] - r.left + 14, y = hoverXY[1] - r.top + 16;
      tipp.hidden = false;
      const tw = tipp.offsetWidth, th = tipp.offsetHeight;
      if (x + tw > r.width - 6) x = hoverXY[0] - r.left - tw - 12;
      if (y + th > r.height - 6) y = hoverXY[1] - r.top - th - 12;
      tipp.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    } else tipp.hidden = true;
    buehne.classList.toggle('zeigt', !!t);
  }
  function setzeHover(t) {
    if (S.hover === t) return;
    const alt = S.hover; S.hover = t;
    if (alt) faerbe(alt); if (t) faerbe(t);
    if (!t) { tipp.hidden = true; buehne.classList.remove('zeigt'); }
    zeichne();
  }
  function tippen(x, y) {
    if (!S.bereit || S.ohne3d) return;
    const hit = treffer(x, y);
    if (S.quiz) { if (hit) quizAntwort(hit.t); return; }
    if (S.puzzle) return;
    if (!hit) { if (S.gewaehlt) waehle(null); return; }
    const jetzt = performance.now();
    if (letzterTipp && letzterTipp.t === hit.t && jetzt - letzterTipp.z < 380) { rahme([hit.t.id]); letzterTipp = null; return; }
    letzterTipp = { t: hit.t, z: jetzt };
    waehle(hit.t.id, { karte: true });
  }

  /* ── Tastatur auf der Bühne ── */
  function tastatur() {
    buehne.addEventListener('keydown', (e) => {
      if (e.target !== buehne || !S.bereit) return;
      const k = e.key;
      if (k === 'ArrowLeft') drehen(-0.26, 0); else if (k === 'ArrowRight') drehen(0.26, 0);
      else if (k === 'ArrowUp') drehen(0, -0.18); else if (k === 'ArrowDown') drehen(0, 0.18);
      else if (k === '+' || k === '=') zoom(0.8); else if (k === '-' || k === '_') zoom(1.25);
      else if (k === 'Escape') { if (S.isoliert) alleZeigen(); else waehle(null); }
      else return;
      e.preventDefault(); hinweisWeg();
    });
  }

  /* ═══ Wählen, Isolieren, Schichten, Suche ═══ */
  function waehle(id, opt) {
    opt = opt || {};
    const t = id ? NACH_ID.get(id) : null;
    const alt = S.gewaehlt; S.gewaehlt = t;
    if (alt && alt.li) alt.li.setAttribute('aria-pressed', 'false');
    if (t && t.li) t.li.setAttribute('aria-pressed', 'true');
    if (T3) { if (alt) faerbe(alt); if (t) faerbe(t); }
    if (t && S.namen && opt.karte !== false) { S.namen = false; if (kNamen) kNamen.setAttribute('aria-pressed', 'false'); etikettenLeeren(); }
    if (t && opt.karte !== false) zeigeKarte(t); else if (!t) { karte.hidden = true; versatz(); }
    if (t && opt.rahmen && S.bereit) rahme([t.id]);
    if (t) { sag(`${t.name} ausgewählt`); ton('klick'); }
    zeichne();
    melde('wahl', t);
  }
  function isoliere(id) {
    const t = NACH_ID.get(id); if (!t || !S.bereit) return;
    S.isoliert = t; S.gewaehlt = t;
    sichtbarkeit(); zeigeKarte(t);
    rahme([t.id], 900, null, 2.6);
    sag(`${t.name} allein. Escape oder „Alle zeigen" bringt alle zurück.`);
    melde('isoliert', t);
  }
  function alleZeigen() {
    S.isoliert = null; S.markiert = null;
    sichtbarkeit();
    if (S.gewaehlt) zeigeKarte(S.gewaehlt);
    if (S.bereit) kameraAuf(S.modus === 'setzkasten' && S.raster ? S.raster.box : sichtBox(), S.modus === 'setzkasten' ? 'vorne' : (S.kameraRichtung || 'vorne'), 900);
    melde('isoliert', null);
  }
  async function schicht(id, an) {
    S.schichtAn[id] = !!an;
    const s = cfg.schichten.find((x) => x.id === id);
    if (an && s && T3 && !geladen[id]) { await ladeSchicht(s); }
    if (S.isoliert && !sichtbarSoll(S.isoliert)) S.isoliert = null;
    sichtbarkeit();
    if (S.modus === 'setzkasten') setzkasten(true);
    melde('schicht', { id, an });
  }
  function kategorie(id, an) {
    S.katAn[id] = !!an; sichtbarkeit();
    if (S.modus === 'setzkasten') setzkasten(true);
  }
  function suche(q) {
    S.suche = q; const a = normA(q.trim()), b = normAE(q.trim());
    if (!a) { S.sucheIds = null; trefferAnz.textContent = ''; TEILE.forEach((t) => t.li && (t.li.classList.remove('treffer'), (t.li.style.display = ''))); sichtbarkeit(); return []; }
    const liste = TEILE.filter((t) => [t.name, t.latein, t.en, ...(t.suchwoerter || []), t.kat.name, ...t.zeilen.map((z) => z.en)].some((s) => s && (normA(s).includes(a) || normAE(s).includes(b))));
    S.sucheIds = new Set(liste.map((t) => t.id));
    TEILE.forEach((t) => { if (t.li) { t.li.classList.toggle('treffer', S.sucheIds.has(t.id)); t.li.style.display = S.sucheIds.has(t.id) ? '' : 'none'; } });
    listeEl.querySelectorAll('.atlas-gruppe-liste').forEach((g) => { g.style.display = [...g.querySelectorAll('.atlas-teil')].some((x) => x.style.display !== 'none') ? '' : 'none'; });
    trefferAnz.textContent = liste.length === 1 ? '1 Treffer' : `${liste.length} Treffer`;
    if (T3) sichtbarkeit();
    return liste;
  }

  /* ═══ Explosion ═══ */
  function explosion(f) {
    S.explosion = Math.max(0, Math.min(1, f));
    regler.value = String(Math.round(S.explosion * 100)); reglerAus.textContent = Math.round(S.explosion * 100) + ' %';
    if (S.modus !== 'ganz' || !S.bereit) return;
    stelle(false);
    clearTimeout(S._explT);
    S._explT = setTimeout(() => {
      if (S.isoliert) return;
      const { THREE } = T3; const d = new THREE.Vector3().subVectors(kamera.position, steuer.target).normalize();
      kameraAuf(sichtBox(), d, 500);
    }, 120);
  }

  /* ═══ Setzkasten: Raster nach Kategorie, Teile fliegen versetzt hinein ═══ */
  function rasterBerechnen() {
    const { THREE } = T3;
    const teile = TEILE.filter((t) => t.geladen && sichtbarSoll(t));
    const gruppen = cfg.kategorien.map((k) => ({ k, teile: teile.filter((t) => t.kat === k) })).filter((g) => g.teile.length);
    const CW = 0.22, CH = 0.27, LH = 0.085, GAP = 0.07;
    const aspekt = Math.max(0.45, breite / Math.max(1, hoehe)) * 0.96;
    /* Fluss-Anordnung: jede Kategorie ist ein Block (Überschrift + Fächer), Blöcke stehen nebeneinander und brechen um. */
    function anordnen(W) {
      const bloecke = []; let x = 0, y = 0, zeileH = 0;
      for (const g of gruppen) {
        const sp = Math.min(g.teile.length, W), zeilen = Math.ceil(g.teile.length / sp);
        const bw = sp * CW, bh = LH + zeilen * CH;
        if (x > 0 && x + bw > W * CW + 1e-6) { x = 0; y += zeileH + GAP; zeileH = 0; }
        bloecke.push({ g, sp, x, y, bw, bh });
        x += bw + GAP; zeileH = Math.max(zeileH, bh);
      }
      const breiteM = Math.max(...bloecke.map((b) => b.x + b.bw)), hoeheM = y + zeileH;
      return { bloecke, breiteM, hoeheM };
    }
    let best = null, bw = 1e9;
    const maxW = Math.max(4, Math.min(18, Math.max(...gruppen.map((g) => g.teile.length))));
    for (let W = 3; W <= maxW; W++) {
      const a = anordnen(W); const w = Math.abs(Math.log((a.breiteM / a.hoeheM) / aspekt));
      if (w < bw - 0.02) { bw = w; best = a; }
    }
    const mb = modellBox(); const mitteY = mb.getCenter(new THREE.Vector3()).y;
    const x0 = -best.breiteM / 2, y0 = mitteY + best.hoeheM / 2;
    const plaetze = new Map(), kats = [], zellen = [];
    for (const b of best.bloecke) {
      kats.push({ k: b.g.k, p: new THREE.Vector3(x0 + b.x, y0 - b.y - LH * 0.45, 0), bw: b.bw });
      b.g.teile.forEach((t, i) => {
        const sx = i % b.sp, sy = Math.floor(i / b.sp);
        const cx = x0 + b.x + CW * (sx + 0.5), cy = y0 - b.y - LH - CH * (sy + 0.5);
        const g2 = t.groesse;
        const s = Math.min(CW * 0.78 / Math.max(g2.x, 0.01), CH * 0.66 / Math.max(g2.y, 0.01), 3.4);
        plaetze.set(t.id, { p: new THREE.Vector3(cx, cy + CH * 0.07, 0), s, name: new THREE.Vector3(cx, cy - CH * 0.5 + 0.012, 0) });
        zellen.push({ x: cx, y: cy, farbe: punktFarbe(t.kat) });
      });
    }
    const box = new THREE.Box3(new THREE.Vector3(x0, y0 - best.hoeheM, -0.1), new THREE.Vector3(x0 + best.breiteM, y0, 0.1));
    S.raster = { plaetze, kats, box, CW, CH };
    faecherBauen(zellen, CW, CH);
  }
  /* Die Fächer des Setzkastens: helle Kacheln in der Kategoriefarbe — ein Zeichenaufruf für alle. */
  let faecher = null;
  function faecherBauen(zellen, CW, CH, z) {
    const { THREE } = T3;
    if (faecher) { szene.remove(faecher); faecher.geometry.dispose(); faecher.material.dispose(); faecher = null; }
    const form = new THREE.Shape(); const w = CW * 0.94, hh = CH * 0.95, r = 0.018;
    form.moveTo(-w / 2 + r, -hh / 2); form.lineTo(w / 2 - r, -hh / 2); form.quadraticCurveTo(w / 2, -hh / 2, w / 2, -hh / 2 + r);
    form.lineTo(w / 2, hh / 2 - r); form.quadraticCurveTo(w / 2, hh / 2, w / 2 - r, hh / 2); form.lineTo(-w / 2 + r, hh / 2);
    form.quadraticCurveTo(-w / 2, hh / 2, -w / 2, hh / 2 - r); form.lineTo(-w / 2, -hh / 2 + r); form.quadraticCurveTo(-w / 2, -hh / 2, -w / 2 + r, -hh / 2);
    const basis = new THREE.ShapeGeometry(form, 3);
    const geos = zellen.map((zl) => {
      const g = basis.clone(); g.translate(zl.x, zl.y, z == null ? -0.045 : z);
      const c = new THREE.Color(zl.farbe).lerp(new THREE.Color(echt ? 0x2b3144 : 0xffffff), echt ? 0.84 : 0.82);
      const n = g.getAttribute('position').count; const f = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { f[i * 3] = c.r; f[i * 3 + 1] = c.g; f[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(f, 3)); g.deleteAttribute('uv'); g.deleteAttribute('normal');
      return g;
    });
    basis.dispose();
    if (!geos.length) return;
    const g = T3.mergeGeometries(geos, false); geos.forEach((x) => x.dispose());
    faecher = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }));
    faecher.renderOrder = -2; faecher.visible = false;
    szene.add(faecher);
  }
  function faecherZeigen(an) {
    if (!faecher) return;
    const m = faecher.material, von = m.opacity, nach = an ? 1 : 0;
    if (an) faecher.visible = true;
    const o = { u: 0 };
    tween(o, { u: 1 }, an ? 700 : 350, { update: () => { m.opacity = von + (nach - von) * o.u; }, fertig: () => { if (!an) faecher.visible = false; } });
  }
  function rasterZiel(t) {
    const { THREE } = T3; const pl = S.raster.plaetze.get(t.id);
    if (!pl) return null;
    /* Das Teil um seinen Mittelpunkt skaliert — der Drehpunkt (Gruppe) liegt in der Teilmitte. */
    return { p: pl.p.clone(), q: new THREE.Quaternion(), s: new THREE.Vector3(pl.s, pl.s, pl.s) };
  }
  function stelleRaster(flug) {
    const liste = TEILE.filter((t) => t.geladen && S.raster.plaetze.has(t.id));
    const n = liste.length;
    const proms = [];
    liste.forEach((t, i) => {
      const z = rasterZiel(t);
      if (flug) proms.push(fliege(t, z, 950, i * Math.min(38, 1500 / Math.max(1, n)), 0.35));
      else setze(t, z);
    });
    etikettenRaster();
    zeichne();
    return Promise.all(proms);
  }
  async function setzkasten(neu) {
    if (!S.bereit) return;
    const war = S.modus;
    if (war !== 'setzkasten') waehle(null);
    modusSetzen('setzkasten');
    S.isoliert = null; sichtbarkeit();
    rasterBerechnen();
    steuerFuer('setzkasten');
    faecherZeigen(true);
    if (neu && war === 'setzkasten') { stelleRaster(true); kameraAuf(S.raster.box, 'vorne', 700, 1.05); return; }
    const flug = stelleRaster(true);
    /* Kamera: erst nah an den ersten Block, dann langsam über den ganzen Setzkasten */
    const { THREE } = T3;
    const k0 = S.raster.kats[0].p;
    const ersteBox = new THREE.Box3(new THREE.Vector3(k0.x - 0.05, k0.y - S.raster.CH * 2.2, -0.1), new THREE.Vector3(k0.x + S.raster.CW * 4.5, k0.y + 0.08, 0.1));
    await kameraAuf(ersteBox, 'vorne', 1100);
    await flug;
    await kameraAuf(S.raster.box, 'vorne', 2400, 1.05);
    melde('modus', 'setzkasten');
  }
  async function ganz() {
    if (!S.bereit) return;
    const war = S.modus;
    if (war === 'setzkasten') waehle(null);
    modusSetzen('ganz');
    steuerFuer('ganz');
    etikettenLeeren();
    faecherZeigen(false);
    sichtbarkeit();
    if (war === 'setzkasten') {
      const liste = TEILE.filter((t) => t.geladen);
      const n = liste.length;
      kameraAuf(modellBox(), S.kameraRichtung || 'vorne', 1400);
      await Promise.all(liste.slice().reverse().map((t, i) => fliege(t, zielGanz(t), 900, i * Math.min(30, 1200 / Math.max(1, n)), 0.3)));
    } else { stelle(false); if (war !== 'ganz') kameraAuf(sichtBox(), S.kameraRichtung || 'vorne', 700); }
    namenAnzeigen();
    melde('modus', 'ganz');
  }
  function modusSetzen(m) {
    if (S.modus !== m) { hinweisWeg(); kamKnoepfe.forEach((b) => b.setAttribute('aria-pressed', 'false')); }
    S.modus = m; root.dataset.modus = m;
    versatz();
    kGanz.setAttribute('aria-pressed', m === 'ganz' ? 'true' : 'false');
    kSetz.setAttribute('aria-pressed', m === 'setzkasten' ? 'true' : 'false');
    if (boden) boden.visible = m !== 'setzkasten';
  }
  function steuerFuer(m) {
    const { THREE } = T3;
    if (m === 'setzkasten') {
      steuer.enableRotate = false; steuer.enablePan = true; steuer.enableZoom = true; steuer.maxDistance = 14;
      steuer.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      steuer.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    } else if (m === 'puzzle') {
      steuer.enableRotate = false; steuer.enablePan = false; steuer.enableZoom = false;
    } else {
      steuer.enableRotate = true; steuer.enablePan = true; steuer.enableZoom = true; steuer.maxDistance = 9;
      steuer.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      steuer.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }
  }

  /* ═══ Etiketten (DOM über dem Bild, mit Linien) ═══ */
  let ETIK = []; // { el, anker: () => Vector3 (Welt), art: 'unter'|'kat'|'linie'|'marke', teil, seite }
  function etikettenLeeren() { ETIK.forEach((e) => e.el.remove()); ETIK = []; linien.innerHTML = ''; }
  function etikettenRaster() {
    etikettenLeeren();
    if (!S.raster) return;
    for (const k of S.raster.kats) {
      const el = h('div', { class: 'atlas-et kat', style: `background:${chipFarbe({ kat: k.k })}`, text: k.k.name });
      etiketten.append(el); ETIK.push({ el, art: 'kat', anker: () => k.p, bw: k.bw });
    }
    if (cfg.setzkastenNamen) for (const t of TEILE) {
      const pl = S.raster.plaetze.get(t.id); if (!pl) continue;
      const el = h('div', { class: 'atlas-et klein', text: t.kurz || t.name });
      etiketten.append(el); ETIK.push({ el, art: 'unter', anker: () => pl.name, teil: t, raster: true });
    }
  }
  const _v = [];
  function proj(p) {
    const { THREE } = T3; const v = _v[0] || (_v[0] = new THREE.Vector3());
    v.copy(p).project(kamera);
    return { x: (v.x * 0.5 + 0.5) * breite, y: (-v.y * 0.5 + 0.5) * hoehe, z: v.z };
  }
  function etikettenSetzen() {
    if (!ETIK.length) return;
    const { THREE } = T3;
    let zellPx = 999;
    if (S.raster && S.modus === 'setzkasten') {
      const a = proj(new THREE.Vector3(0, 0, 0)), b = proj(new THREE.Vector3(S.raster.CW, 0, 0)); zellPx = Math.abs(b.x - a.x);
    }
    const linienListe = ETIK.filter((e) => e.art === 'linie');
    for (const e of ETIK) {
      if (e.art === 'linie') continue;
      if (e.raster && S.modus !== 'setzkasten') { e.el.style.display = 'none'; continue; }
      if (e.teil && (!e.teil.objekt || !e.teil.objekt.visible || e.teil.geist)) { e.el.style.display = 'none'; continue; }
      const p = proj(e.anker());
      const sichtbar = p.z < 1 && p.x > -200 && p.x < breite + 200 && p.y > -60 && p.y < hoehe + 60 && !(e.art === 'unter' && zellPx < 46);
      e.el.style.display = sichtbar ? '' : 'none';
      if (!sichtbar) continue;
      if (e.art === 'unter') { e.el.style.maxWidth = Math.max(60, zellPx - 6) + 'px'; e.el.style.overflow = 'hidden'; e.el.style.textOverflow = 'ellipsis'; }
      if (e.art === 'kat' && e.bw) { e.el.style.maxWidth = Math.max(40, (e.bw / S.raster.CW) * zellPx + 6) + 'px'; }
      e.el.style.transform = e.art === 'kat' ? `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(0,-50%)`
        : e.art === 'marke' ? (e.el.classList.toggle('links', e.links ?? p.x > breite * 0.62), (e.links ?? p.x > breite * 0.62) ? `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(calc(-100% + 11px),-50%)` : `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-11px,-50%)`)
        : `translate(${Math.round(p.x)}px,${Math.round(p.y)}px) translate(-50%,0)`;
    }
    if (linienListe.length) linienSetzen(linienListe);
  }
  /* Namen oder Nummern mit Linie links und rechts vom Modell (auch für die Blätter: leere Kästchen) */
  function linienSetzen(liste) {
    const { THREE } = T3;
    const b = sichtBox(); let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9;
    for (let i = 0; i < 8; i++) {
      const p = proj(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
      xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y);
    }
    const mitteX = (xmin + xmax) / 2;
    const punkte = liste.map((e) => {
      const sichtbar = e.teil && e.teil.objekt && e.teil.objekt.visible;
      const p = sichtbar ? proj(e.anker()) : null;
      return { e, p };
    }).filter((x) => x.p && x.p.z < 1);
    for (const e of liste) e.el.style.display = 'none';
    const spalten = { links: [], rechts: [] };
    for (const x of punkte) (x.e.seiteFest || (x.p.x < mitteX ? 'links' : 'rechts')) === 'links' ? spalten.links.push(x) : spalten.rechts.push(x);
    let svg = '';
    const rand = 14;
    for (const [seite, sp] of Object.entries(spalten)) {
      sp.sort((a, c) => a.p.y - c.p.y);
      const hoeheEt = sp.length ? Math.max(30, sp[0].e.el.offsetHeight || 30) : 30;
      const abstand = hoeheEt + 8;
      let y = -1e9;
      for (const x of sp) { x.y = Math.max(x.p.y, y + abstand); y = x.y; }
      const ueber = y - (hoehe - hoeheEt / 2 - 6);
      if (ueber > 0) { for (const x of sp) x.y -= ueber; for (let i = 1; i < sp.length; i++) sp[i].y = Math.max(sp[i].y, sp[i - 1].y + abstand); }
      for (const x of sp) x.y = Math.max(hoeheEt / 2 + 4, x.y);
      for (const x of sp) {
        x.e.el.style.display = '';
        const w = x.e.el.offsetWidth || 120;
        let lx = seite === 'links' ? Math.max(w + 8, Math.min(xmin - 26, x.p.x - 40)) : Math.min(breite - w - 8, Math.max(xmax + 26, x.p.x + 40));
        x.e.el.style.display = '';
        x.e.el.classList.toggle('links', seite === 'links');
        x.e.el.style.transform = `translate(${Math.round(lx)}px,${Math.round(x.y)}px)` + (seite === 'links' ? ' translate(-100%,-50%)' : ' translate(0,-50%)');
        const farbe = echt && !S.druck ? '#ffffff' : '#1d1b33';
        svg += `<line x1="${lx.toFixed(1)}" y1="${x.y.toFixed(1)}" x2="${x.p.x.toFixed(1)}" y2="${x.p.y.toFixed(1)}" stroke="${farbe}" stroke-width="2.2" stroke-linecap="round"/>` +
          `<circle cx="${x.p.x.toFixed(1)}" cy="${x.p.y.toFixed(1)}" r="4.5" fill="${farbe}" stroke="${echt && !S.druck ? '#1d1b33' : '#fff'}" stroke-width="1.5"/>`;
        void rand;
      }
    }
    linien.innerHTML = svg;
    /* Nummern in Lesereihenfolge: linke Spalte von oben nach unten, dann die rechte. */
    if (S.autoNummer && !S.nummernFolge) {
      const folge = [...spalten.links, ...spalten.rechts];
      folge.forEach((x, i) => { const b = x.e.el.querySelector('b'); if (b) b.textContent = String(i + 1); });
      S.nummernFolge = folge.map((x) => x.e.teil.id);
    }
  }
  /* Ankerpunkt auf der sichtbaren Oberfläche (von vorne gesehen), in Teil-Koordinaten gespeichert */
  function oberflaechenPunkt(t, richtung, hoehe, quer) {
    const { THREE } = T3;
    const key = '_anker_' + (richtung || 'vorne') + (hoehe == null ? '' : '_' + hoehe) + (quer == null ? '' : '_q' + quer);
    if (!t[key]) {
      const d = new THREE.Vector3(...(RICHTUNG[richtung || 'vorne'] || RICHTUNG.vorne)).setY(0).normalize();
      const alt = { p: t.objekt.position.clone(), q: t.objekt.quaternion.clone(), s: t.objekt.scale.clone() };
      setze(t, { p: t.heim, q: new THREE.Quaternion(), s: new THREE.Vector3(1, 1, 1) });
      t.objekt.updateMatrixWorld(true);
      const start = t.heim.clone(); if (hoehe != null) start.y = t.box.min.y + hoehe * t.groesse.y;
      if (quer != null) start.x = t.box.min.x + quer * t.groesse.x;
      const ray = new THREE.Raycaster(start.clone().addScaledVector(d, 3), d.clone().negate());
      let hit = ray.intersectObject(t.mesh, false)[0];
      if (!hit) {
        const p = t.mesh.geometry.getAttribute('position'); const v = new THREE.Vector3(); let best = null, bw = -1e9;
        const st = Math.max(1, Math.floor(p.count / 300));
        for (let i = 0; i < p.count; i += st) { v.fromBufferAttribute(p, i).applyMatrix4(t.mesh.matrixWorld); const q = v.clone().sub(start); const w = v.dot(d) * 0.3 - q.sub(d.clone().multiplyScalar(q.dot(d))).length(); if (w > bw) { bw = w; best = v.clone(); } }
        hit = { point: best || t.heim.clone() };
      }
      t[key] = t.objekt.worldToLocal(hit.point.clone());
      setze(t, alt); t.objekt.updateMatrixWorld(true);
    }
    return t[key];
  }
  /** Namen/Nummern mit Linien: liste = [{ id, text? , nr? }] · opt.stil: 'name' | 'nummer' | 'loesung' */
  function beschriftung(liste, opt) {
    opt = opt || {};
    if (!S.bereit) return;
    etikettenLeeren();
    S.autoNummer = !!opt.autoNummer; S.nummernFolge = null;
    if (!liste) { zeichne(); return; }
    for (const x of liste) {
      const t = NACH_ID.get(x.id); if (!t || !t.geladen) continue;
      let el;
      if (opt.stil === 'nummer' || opt.stil === 'loesung') {
        el = h('div', { class: 'atlas-et nummer' + (opt.stil === 'loesung' ? ' mitname' : '') }, h('b', { text: String(x.nr) }), h('span', { text: opt.stil === 'loesung' ? (x.text || t.name) : '' }));
      } else el = h('div', { class: 'atlas-et', text: x.text || t.name });
      etiketten.append(el);
      const lok = oberflaechenPunkt(t, opt.richtung, x.hoehe, x.quer);
      const welt = new T3.THREE.Vector3();
      ETIK.push({ el, art: 'linie', teil: t, seiteFest: x.seite, anker: () => { t.objekt.updateMatrixWorld(true); return welt.copy(lok).applyMatrix4(t.objekt.matrixWorld); } });
    }
    zeichne();
  }
  function namenAnzeigen() {
    if (!S.namen || S.modus !== 'ganz' || !S.bereit) { if (S.modus === 'ganz' && !S.marken) etikettenLeeren(); return; }
    const liste = TEILE.filter((t) => t.geladen && sichtbarSoll(t) && (!S.isoliert || S.isoliert === t)).filter((t) => cfg.namenFilter ? cfg.namenFilter(t) : true).slice(0, 40).map((t) => ({ id: t.id }));
    beschriftung(liste);
  }
  /** Markierungen (pulsierende Punkte mit Text) an Weltpositionen, z. B. Gelenke */
  function marken(liste) {
    etikettenLeeren(); S.marken = !!(liste && liste.length);
    if (!liste) { zeichne(); return; }
    const { THREE } = T3;
    for (const m of liste) {
      const p = new THREE.Vector3(...[].concat(m.pos.toArray ? m.pos.toArray() : m.pos));
      const el = h('div', { class: 'atlas-marke', style: m.farbe ? `--m:${m.farbe}` : '' }, h('i'), m.text ? h('span', { text: m.text }) : null);
      etiketten.append(el); ETIK.push({ el, art: 'marke', anker: () => p, links: m.links });
    }
    zeichne();
  }

  /* ═══ Quiz: „Tippe auf …" ═══ */
  function quiz(opt) {
    if (!S.bereit) { bereit.then(() => quiz(opt)); return; }
    opt = Object.assign({ stufe: 1, runden: 10 }, opt);
    beenden(true); faecherZeigen(false);
    if (S.modus === 'setzkasten') { modusSetzen('quiz'); TEILE.forEach((t) => t.geladen && setze(t, zielGanz(t))); } else modusSetzen('quiz');
    steuerFuer('ganz'); etikettenLeeren();
    S.isoliert = null; waehle(null);
    if (opt.schichten) for (const s of cfg.schichten) S.schichtAn[s.id] = opt.schichten.includes(s.id);
    for (const k of cfg.kategorien) S.katAn[k.id] = true;
    Promise.all(cfg.schichten.filter((s) => S.schichtAn[s.id]).map((s) => ladeSchicht(s))).then(() => {
      explosion(0); sichtbarkeit(); stelle(false);
      const pool = TEILE.filter((t) => t.geladen && sichtbarSoll(t) && t.quiz <= opt.stufe && (!opt.filter || opt.filter(t)));
      const paare = new Map(); for (const t of K_mische(pool)) if (!paare.has(t.paar)) paare.set(t.paar, t);
      const fragen = K_mische([...paare.values()]).slice(0, Math.min(opt.runden, paare.size));
      S.quiz = { opt, fragen, nr: 0, sterne: 0, versuch: 0, fertig: false };
      root.classList.add('ohne-seite');
      if (opt.namen) beschriftung(pool.slice(0, 40).map((t) => ({ id: t.id })));
      quizZeigen();
      versatz();
      kameraAuf(sichtBox(), 'vorne', 700, aufgabenRand(1.04));
    });
  }
  function K_mische(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  function sterneHtml(n, max) { let s = ''; for (let i = 0; i < max; i++) s += `<span class="${i < n ? 'an' : ''}">⭐</span>`; return s; }
  function quizZeigen(rueck, art) {
    const Q = S.quiz; if (!Q) return;
    aufgabe.hidden = false;
    if (Q.fertig) {
      const max = Q.fragen.length;
      aufgabe.innerHTML = `<div class="frage">🏁 ${esc(L.quizFertig || 'Geschafft!')} ${Q.sterne} von ${max} ⭐</div><div class="sterne" aria-label="${Q.sterne} von ${max} Sternen">${sterneHtml(Q.sterne, max)}</div>`;
      const nochmal = knopf('↺ Noch einmal'); nochmal.addEventListener('click', () => quiz(Q.opt));
      aufgabe.append(nochmal);
      return;
    }
    const t = Q.fragen[Q.nr];
    aufgabe.innerHTML = `<span class="stand">${Q.nr + 1}/${Q.fragen.length}</span><div class="frage">👆 ${esc(L.tippeAuf || 'Tippe auf:')} <b>${esc(t.name)}</b></div><div class="sterne" aria-label="${Q.sterne} Sterne">${sterneHtml(Q.sterne, Q.fragen.length)}</div><div class="rueck ${art || ''}" aria-live="polite">${rueck || ''}</div>`;
    const weiter = knopf('⏭', { 'aria-label': 'Überspringen', title: 'Überspringen' });
    weiter.addEventListener('click', () => { quizLoesung(t); });
    aufgabe.insertBefore(weiter, aufgabe.querySelector('.rueck'));
    sag(`Frage ${Q.nr + 1}: Tippe auf ${t.name}`);
  }
  function blitz(t, farbe, dauer) {
    t.blitz = farbe; faerbe(t); zeichne();
    setTimeout(() => { t.blitz = null; faerbe(t); zeichne(); }, dauer || 900);
  }
  function quizLoesung(t) {
    const Q = S.quiz; if (!Q || Q.warte) return;
    Q.warte = true;
    blitz(t, 0x2fd17a, 1500);
    quizZeigen(`Hier ist ${esc(t.name)}.`, '');
    setTimeout(() => { Q.warte = false; naechste(); }, 1700);
  }
  function naechste() {
    const Q = S.quiz; if (!Q) return;
    Q.nr++; Q.versuch = 0;
    if (Q.nr >= Q.fragen.length) { Q.fertig = true; quizZeigen(); if (Q.sterne >= Q.fragen.length - 1) { try { window.KISTE && window.KISTE.konfetti(); } catch (e) { /* egal */ } } melde('quiz', { sterne: Q.sterne, max: Q.fragen.length }); if (Q.opt.ende) Q.opt.ende(Q.sterne, Q.fragen.length); return; }
    quizZeigen();
  }
  function quizAntwort(t) {
    const Q = S.quiz; if (!Q || Q.fertig || Q.warte) return;
    const ziel = Q.fragen[Q.nr];
    if (t === ziel || t.paar === ziel.paar) {
      if (Q.versuch === 0) Q.sterne++;
      ton('ok'); blitz(t, 0x2fd17a, 1100);
      Q.warte = true;
      quizZeigen(`✔ ${Q.versuch === 0 ? 'Richtig!' : 'Jetzt stimmt es.'} Das ist ${esc(t.name)}.`, 'ok');
      sag(`Richtig, das ist ${t.name}.`);
      setTimeout(() => { Q.warte = false; naechste(); }, 1250);
    } else {
      Q.versuch++; ton('falsch'); blitz(t, 0xff4d4d, 900);
      const zeige = Q.opt.stufe < 3 || Q.versuch >= 2;
      quizZeigen(`✖ ${zeige ? 'Das ist ' + esc(t.name) + '. ' : ''}${Q.versuch >= 2 ? 'Schau, wo es leuchtet!' : 'Versuch es noch einmal.'}`, 'falsch');
      sag(zeige ? `Nein, das ist ${t.name}.` : 'Leider falsch.');
      if (Q.versuch >= 2) { blitz(ziel, 0xffd23a, 2400); }
    }
  }

  /* ═══ Puzzle: Teile aus dem Kasten an ihren Platz ziehen ═══ */
  function puzzle(opt) {
    if (!S.bereit) { bereit.then(() => puzzle(opt)); return; }
    opt = Object.assign({ stufe: 1 }, opt);
    beenden(true); faecherZeigen(false);
    modusSetzen('puzzle'); steuerFuer('puzzle'); etikettenLeeren(); waehle(null);
    S.isoliert = null; explosion(0);
    if (opt.schichten) for (const s of cfg.schichten) S.schichtAn[s.id] = opt.schichten.includes(s.id);
    for (const k of cfg.kategorien) S.katAn[k.id] = true;
    Promise.all(cfg.schichten.filter((s) => S.schichtAn[s.id]).map((s) => ladeSchicht(s))).then(() => {
      const teile = TEILE.filter((t) => t.geladen && (opt.ids ? opt.ids.includes(t.id) : opt.filter ? opt.filter(t) : true) && (t.quiz || 1) <= (opt.stufeFilter === false ? 9 : opt.stufe));
      S.puzzle = { opt, ids: new Set(teile.map((t) => t.id)), liste: K_mische(teile), platz: new Set(), erste: 0, versuche: new Map(), zug: null, fertig: false,
        geistRest: false, deckRest: opt.deckRest ?? 0.32, ohneNamen: opt.stufe >= 3 };
      root.classList.toggle('ohne-seite', opt.stufe >= 3);
      for (const t of TEILE) if (t.li) t.li.classList.remove('platz');
      sichtbarkeit();
      for (const t of TEILE) if (t.geladen && !S.puzzle.ids.has(t.id)) setze(t, zielGanz(t));
      puzzleNeuLegen(true);
      puzzleStand();
    });
  }
  function puzzleNeuLegen(flug) {
    const P = S.puzzle; if (!P) return;
    const { THREE } = T3;
    /* Körper in der Mitte, die Teile links und rechts in einem Kasten */
    const rest = new THREE.Box3();
    for (const t of TEILE) if (t.geladen && sichtbarSoll(t)) rest.union(t.box);
    const offen = P.liste.filter((t) => !P.platz.has(t.id));
    const n = P.liste.length;
    const aspekt = Math.max(0.45, breite / Math.max(1, hoehe));
    const H = rest.max.y - rest.min.y, cy = (rest.max.y + rest.min.y) / 2;
    const spJeSeite = aspekt > 1.25 ? 2 : 1;
    const proSeite = Math.ceil(n / 2);
    const reihen = Math.ceil(proSeite / spJeSeite);
    const CH = Math.min(0.32, H / Math.max(1, reihen)), CW = Math.max(CH * 1.0, 0.16);
    const bw = rest.max.x - rest.min.x;
    const xs = [];
    for (let s = 0; s < spJeSeite; s++) { xs.push(rest.min.x - 0.06 - CW * (s + 0.5)); xs.push(rest.max.x + 0.06 + CW * (s + 0.5)); }
    P.plaetze = new Map(); const zellen = [];
    P.liste.forEach((t, i) => {
      const seite = i % 2, j = Math.floor(i / 2);
      const spalte = j % spJeSeite, reihe = Math.floor(j / spJeSeite);
      const x = seite === 0 ? rest.min.x - 0.06 - CW * (spalte + 0.5) : rest.max.x + 0.06 + CW * (spalte + 0.5);
      const y = cy + (reihen - 1) * CH / 2 - reihe * CH;
      const s = Math.min(CW * 0.82 / Math.max(t.groesse.x, 0.01), CH * 0.72 / Math.max(t.groesse.y, 0.01), 2.6);
      P.plaetze.set(t.id, { p: new THREE.Vector3(x, y, 0.15), s, name: new THREE.Vector3(x, y - CH * 0.46, 0.15) });
      zellen.push({ x, y: y - CH * 0.04, farbe: punktFarbe(t.kat) });
    });
    faecherBauen(zellen, CW, CH, 0.15 - 0.05);
    if (faecher) { faecher.visible = true; faecher.material.opacity = 1; }
    void xs; void bw;
    P.box = rest.clone().expandByPoint(new THREE.Vector3(rest.min.x - 0.06 - CW * spJeSeite, cy, 0)).expandByPoint(new THREE.Vector3(rest.max.x + 0.06 + CW * spJeSeite, cy, 0));
    if (aufgabe.hidden) puzzleStand();
    versatz();
    kameraAuf(P.box, 'vorne', flug ? 800 : 0, aufgabenRand(1.03));
    offen.forEach((t, i) => {
      const pl = P.plaetze.get(t.id);
      const z = { p: pl.p.clone(), q: new THREE.Quaternion(), s: new THREE.Vector3(pl.s, pl.s, pl.s) };
      if (flug) fliege(t, z, 800, i * 60, 0.2); else setze(t, z);
    });
    for (const t of P.liste) if (P.platz.has(t.id)) setze(t, zielGanz(t));
    /* Namen unter den Teilen (★ und ★★), Umriss am Ziel (★) */
    etikettenLeeren();
    if (!P.ohneNamen) for (const t of offen) {
      const el = h('div', { class: 'atlas-et klein', text: t.kurz || t.name });
      etiketten.append(el); ETIK.push({ el, art: 'unter', teil: t, anker: () => { const pl = P.plaetze.get(t.id); return P.zug && P.zug.t === t ? t.objekt.position.clone().setY(t.objekt.position.y - t.groesse.y * t.objekt.scale.y * 0.55) : pl.name; } });
    }
    puzzleUmrisse();
    zeichne();
  }
  function puzzleUmrisse() {
    const P = S.puzzle; const { THREE } = T3;
    if (P.umrisse) { P.umrisse.forEach((m) => { szene.remove(m); m.material.dispose(); }); }
    P.umrisse = [];
    if (P.opt.stufe > 1) return;
    for (const t of P.liste) {
      if (P.platz.has(t.id)) continue;
      const m = new THREE.Mesh(t.mesh.geometry, new THREE.MeshBasicMaterial({ color: farbeTeil(t), transparent: true, opacity: 0.22, depthWrite: false }));
      t.objekt.updateMatrixWorld(true);
      const heimM = new THREE.Matrix4().compose(t.heim, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).multiply(t.mesh.matrix);
      m.matrixAutoUpdate = false; m.matrix.copy(heimM); m.renderOrder = 2;
      m.userData.umriss = t.id;
      szene.add(m); P.umrisse.push(m);
    }
  }
  function puzzleStand(rueck, art) {
    const P = S.puzzle; if (!P) return;
    aufgabe.hidden = false;
    const n = P.liste.length, da = P.platz.size;
    if (da >= n) {
      P.fertig = true;
      aufgabe.innerHTML = `<div class="frage">🎉 ${esc(L.puzzleFertig || 'Alles an seinem Platz!')} <b>${P.erste} von ${n}</b> beim ersten Versuch.</div><div class="sterne">${sterneHtml(P.erste, n)}</div>`;
      const nochmal = knopf('↺ Noch einmal'); nochmal.addEventListener('click', () => puzzle(P.opt));
      aufgabe.append(nochmal);
      if (P.erste >= n - 1) { try { window.KISTE && window.KISTE.konfetti(); } catch (e) { /* egal */ } }
      melde('puzzle', { erste: P.erste, max: n });
      if (P.opt.ende) P.opt.ende(P.erste, n);
      return;
    }
    aufgabe.innerHTML = `<span class="stand">${da}/${n}</span><div class="frage">✋ ${esc(P.opt.auftrag || L.puzzleAuftrag || 'Zieh jedes Teil an seinen Platz im Körper.')}</div><div class="sterne">${sterneHtml(P.erste, n)}</div><div class="rueck ${art || ''}" aria-live="polite">${rueck || ''}</div>`;
  }
  function puzzleGreifen(t, e) {
    const P = S.puzzle; const { THREE } = T3;
    const ebene = new THREE.Plane(new THREE.Vector3(0, 0, 1), -t.objekt.position.z);
    const hit = new THREE.Vector3();
    const r = buehne.getBoundingClientRect();
    zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(zeiger, kamera);
    raycaster.ray.intersectPlane(ebene, hit);
    P.zug = { t, ebene, versatz: t.objekt.position.clone().sub(hit), id: e.pointerId };
    t.mat.depthTest = false; t.objekt.renderOrder = 10; t.mesh.renderOrder = 10;
    buehne.classList.add('zieht');
    try { renderer.domElement.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
    t.objekt.quaternion.identity();
    skaliereZu(t, 1, 180);
    faerbe(t); setzeHover(null); zeichne();
  }
  function puzzleZiehen(e) {
    const P = S.puzzle; const Z = P.zug; const { THREE } = T3;
    const r = buehne.getBoundingClientRect();
    zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(zeiger, kamera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(Z.ebene, hit)) {
      if (Z.t._flug) { /* Vergrößern läuft — Position trotzdem mitnehmen */ }
      Z.t.objekt.position.copy(hit.add(Z.versatz));
      zeichne();
    }
  }
  function puzzleLoslassen() {
    const P = S.puzzle; const Z = P.zug; P.zug = null;
    const t = Z.t; const { THREE } = T3;
    buehne.classList.remove('zieht');
    t.mat.depthTest = true; t.objekt.renderOrder = 0; t.mesh.renderOrder = 0;
    faerbe(t);
    const a = proj(t.objekt.position), b = proj(t.heim);
    const fang = Math.max(30, Math.min(breite, hoehe) * (P.opt.stufe === 1 ? 0.1 : 0.065)) * (P.opt.fang || 1);
    const v = (P.versuche.get(t.id) || 0) + 1; P.versuche.set(t.id, v);
    if (Math.hypot(a.x - b.x, a.y - b.y) <= fang) {
      P.platz.add(t.id); if (v === 1) P.erste++;
      fliege(t, zielGanz(t), 260, 0, 0);
      ton('ok'); blitz(t, 0x2fd17a, 900);
      if (t.li) t.li.classList.add('platz');
      puzzleUmrisse();
      ETIK = ETIK.filter((e) => { if (e.teil === t) { e.el.remove(); return false; } return true; });
      puzzleStand(`✔ ${v === 1 ? 'Richtig!' : 'Jetzt passt es.'} ${esc(t.name)} ist an seinem Platz.`, 'ok');
      sag(`${t.name} ist an seinem Platz.`);
    } else {
      const pl = P.plaetze.get(t.id);
      fliege(t, { p: pl.p.clone(), q: new THREE.Quaternion(), s: new THREE.Vector3(pl.s, pl.s, pl.s) }, 450, 0, 0.12);
      ton('falsch');
      puzzleStand(`✖ ${esc(P.ohneNamen ? 'Das passt dort nicht.' : t.name + ' gehört woanders hin.')} ${v >= 2 && P.opt.stufe < 3 ? esc(t.hinweis || '') : ''}`, 'falsch');
    }
    zeichne();
  }
  function puzzleHilfe(t) {
    const P = S.puzzle; if (!P || !P.ids.has(t.id) || P.platz.has(t.id)) return;
    P.versuche.set(t.id, 9); P.platz.add(t.id);
    fliege(t, zielGanz(t), 700, 0, 0.2); blitz(t, 0xffd23a, 1200);
    if (t.li) t.li.classList.add('platz');
    ETIK = ETIK.filter((e) => { if (e.teil === t) { e.el.remove(); return false; } return true; });
    puzzleUmrisse();
    puzzleStand(`${esc(t.name)} ist jetzt an seinem Platz (mit Hilfe).`, '');
  }

  /** Quiz oder Puzzle beenden, zurück zum ganzen Modell. */
  function beenden(still) {
    const warAufgabe = S.quiz || S.puzzle;
    if (S.puzzle && S.puzzle.umrisse) S.puzzle.umrisse.forEach((m) => { szene.remove(m); m.material.dispose(); });
    if (S.puzzle && faecher) faecher.visible = false;
    S.quiz = null; S.puzzle = null;
    aufgabe.hidden = true; aufgabe.innerHTML = '';
    versatz();
    root.classList.toggle('ohne-seite', !!S.seiteAus);
    for (const t of TEILE) { if (t.li) t.li.classList.remove('platz'); }
    if (!S.bereit) return;
    etikettenLeeren();
    if (warAufgabe && !still) { modusSetzen('ganz'); steuerFuer('ganz'); sichtbarkeit(); stelle(false); kameraAuf(sichtBox(), 'vorne', 600); }
    else if (warAufgabe) { sichtbarkeit(); }
  }

  /* ═══ Werkzeug-Helfer: markieren, Pose (Gelenke bewegen) ═══ */
  function markiere(ids, opt) {
    opt = opt || {};
    if (!ids) { S.markiert = null; sichtbarkeit(); return; }
    const farbe = typeof opt.farbe === 'function' ? opt.farbe : opt.farbe ? () => opt.farbe : null;
    S.markiert = { ids: new Set(ids), rest: opt.rest || 'geist', farbe, leuchten: opt.leuchten || null };
    sichtbarkeit();
    if (opt.rahmen) rahme(ids, opt.dauer);
  }
  function neuFaerben() { for (const t of TEILE) if (t.geladen) faerbe(t); zeichne(); }
  function pose(id, p) {
    const t = NACH_ID.get(id); if (!t) return;
    t.pose = p || null;
    if (S.modus === 'ganz' && S.bereit && t.geladen) { setze(t, zielGanz(t)); zeichne(); }
  }

  /* ═══ Leiste verdrahten ═══ */
  kGanz.addEventListener('click', () => { if (S.modus !== 'ganz') ganz(); });
  kSetz.addEventListener('click', () => { if (S.modus !== 'setzkasten') setzkasten(); });
  regler.addEventListener('input', () => { hinweisWeg(); explosion(Number(regler.value) / 100); });
  kamKnoepfe.forEach((b) => b.addEventListener('click', () => kameraRichtung(b.dataset.kamera)));
  suchFeld.addEventListener('input', () => suche(suchFeld.value));
  suchFeld.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const l = suche(suchFeld.value); if (l[0]) { waehle(l[0].id, { karte: true, rahmen: true }); } e.preventDefault(); }
    if (e.key === 'Escape') { suchFeld.value = ''; suche(''); }
  });
  if (kLatein) kLatein.addEventListener('click', () => latein(!S.latein));
  if (kNamen) kNamen.addEventListener('click', () => namen(!S.namen));
  kZoomRein.addEventListener('click', () => S.bereit && zoom(0.75));
  kZoomRaus.addEventListener('click', () => S.bereit && zoom(1.33));
  kReset.addEventListener('click', () => zuruecksetzen());
  function latein(an) {
    S.latein = !!an; if (kLatein) kLatein.setAttribute('aria-pressed', an ? 'true' : 'false');
    root.querySelectorAll('.atlas-teil .lat').forEach((x) => { x.hidden = !an; });
    if (S.gewaehlt) zeigeKarte(S.gewaehlt);
  }
  function namen(an) {
    S.namen = !!an; if (kNamen) kNamen.setAttribute('aria-pressed', an ? 'true' : 'false');
    if (an && S.gewaehlt) waehle(null); // Namen links und rechts — der Steckbrief würde sie verdecken
    namenAnzeigen(); zeichne();
  }
  function zuruecksetzen() {
    if (!S.bereit) return;
    beenden(true);
    S.isoliert = null; S.markiert = null; suchFeld.value = ''; suche('');
    for (const s of cfg.schichten) S.schichtAn[s.id] = s.an !== false;
    for (const k of cfg.kategorien) S.katAn[k.id] = true;
    for (const t of TEILE) t.pose = null;
    explosion(0); waehle(null);
    if (S.modus !== 'ganz') ganz(); else { sichtbarkeit(); stelle(false); }
    kameraRichtung('vorne');
  }

  /* ═══ Öffentliche Schnittstelle ═══ */
  const api = {
    el: root, bereit,
    ein(art, f) { (horer[art] = horer[art] || []).push(f); return api; },
    teile: () => TEILE.slice(),
    teil: (id) => NACH_ID.get(id),
    finde: (f) => TEILE.filter(f).map((t) => t.id),
    modus: (m) => (m === 'setzkasten' ? setzkasten() : m === 'ganz' ? (beenden(true), ganz()) : null),
    explosion, waehle, isoliere, alleZeigen, kamera: kameraRichtung, schicht, kategorie, suche, latein, namen,
    quiz, puzzle, beenden: () => beenden(false), markiere, pose, rahme, beschriftung, marken, zuruecksetzen, neuFaerben,
    box: (ids) => {
      const { THREE } = T3; const b = new THREE.Box3();
      for (const id of ids) { const t = NACH_ID.get(id); if (t && t.box) b.union(t.box); }
      return b;
    },
    drei: () => T3,
    /** Für Tests: Bildschirmlage (relativ zur Bühne) eines Teils jetzt und an seinem Platz. */
    bildschirm(id) { const t = NACH_ID.get(id); if (!t || !t.objekt) return null; const r = buehne.getBoundingClientRect(); const a = proj(t.objekt.position), b = proj(t.heim); return { jetzt: { x: r.left + a.x, y: r.top + a.y }, heim: { x: r.left + b.x, y: r.top + b.y } }; },
    zeichne,
    animiere,
    /** Nach beschriftung({autoNummer}): die Teile in der Reihenfolge der Nummern 1, 2, 3 … */
    nummernFolge: () => (S.nummernFolge || []).slice(),
    zustand: () => ({ modus: S.modus, explosion: S.explosion, gewaehlt: S.gewaehlt && S.gewaehlt.id, isoliert: S.isoliert && S.isoliert.id, ohne3d: S.ohne3d, bereit: S.bereit }),
    /** Den Atlas in einen anderen Platz (Reiter) setzen — EIN WebGL-Kontext für alle Reiter. */
    verschiebe(platz) { if (typeof platz === 'string') platz = document.getElementById(platz); if (platz && root.parentNode !== platz) { platz.append(root); requestAnimationFrame(() => { groesse(); zeichne(); }); } },
    kameraRichtung: kameraRichtung,
    leisteZeigen(teile) { Object.entries(teile || {}).forEach(([k, an]) => { const el = { modi: leisteEl.querySelector('.atlas-modi'), kamera: leisteEl.querySelector('.atlas-kamera'), suche: leisteEl.querySelector('.atlas-suche') }[k]; if (el) el.classList.toggle('versteckt', !an); }); },
    seiteZeigen(an) { S.seiteAus = !an; root.classList.toggle('ohne-seite', !an); },
    /** Die Leiste über der Bühne ein- oder ausblenden (Reiter mit eigener Steuerung). */
    leiste(an) { root.classList.toggle('ohne-leiste', !an); },
    /** Druckfassung für die Blätter: heller Grund, dunkle Linien, ohne Knöpfe. */
    druck(an) { S.druck = !!an; root.classList.toggle('druck', !!an); if (an) { aufgabe.hidden = true; karte.hidden = true; } zeichne(); },
  };
  return api;
}
