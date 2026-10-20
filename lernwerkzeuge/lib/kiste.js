/* ────────────────────────────────────────────────────────────────
   Werkzeugkiste — gemeinsame Helfer der Kinder-Werkzeuge (28.09.2026).
   window.KISTE: Reiter, Ton, Vorlesen, Rückmeldung, Sterne, Konfetti,
   Ziffernblock, Ziehen mit Finger/Maus.
   Keine Abhängigkeiten; Netz nur für die Vorlesestimme (/api/vorlesen).
   Jede Speicher-Nutzung in try/catch: im abgeschotteten Rahmen oder
   privaten Fenster fehlt localStorage.
   ──────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  var K = {};

  /* ── Sprache (16.10.2026) ── Andreea: „dass wir diese Tools … auch immer in anderen Sprachen zur Verfügung haben,
     allen voran Englisch". Die englischen Fassungen (public/lernwerkzeuge/en/, scripts/werkzeug-uebersetzen.mjs) bringen
     window.LZ_TEXTE mit: deutscher Text → übersetzter Text (src/lib/lernwerkstatt/uebersetzung/en/_gemeinsam.json → lib).
     Deutsche Seiten haben keine Tabelle: T gibt den deutschen Text zurück. {0}, {1} … → die weiteren Argumente. */
  var TEXTE = window.LZ_TEXTE || null;
  var deutsch = /^de\b/i.test(document.documentElement.lang || 'de');
  function T(s) {
    var t = (TEXTE && TEXTE[s]) || s;
    for (var i = 1; i < arguments.length; i++) t = t.split('{' + (i - 1) + '}').join(arguments[i]);
    return t;
  }
  K.T = T;
  K.deutsch = function () { return deutsch; };

  function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function schreib(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* egal */ } }
  K.lies = lies; K.schreib = schreib;

  /* ── Zufall ── */
  K.zufall = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  K.wahl = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  K.mische = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  /* ── Ton: EIN Schalter für alles, was aus dem Lautsprecher kommt ──
     Andreea, 03.10.2026: „Der Ausschaltknopf ist immer kaputt. Wenn ich
     ihn ausschalte, hört man trotzdem die Stimme was sagen." Er schaltete
     nur die Pieptöne — die Stimme lief daran vorbei. Jetzt gilt er für
     Töne UND Stimme, und Ausschalten bricht auch einen laufenden Satz ab.
     Ohne gespeicherte Wahl: aus, außer die Seite spricht
     (<html data-ton="an">, z. B. Silben & Anlaute, Uhr). */
  /* Vorlesen nur für die 1. und 2. Klasse (Andreea, 06.10.2026: „Das würden
     wir bitte nur für die erste Klasse und höchstens noch für die zweite
     Klasse machen. Bei den anderen Tools bitte nicht mehr."). Werkzeuge ab
     der 3. Schulstufe tragen <html data-stimme="aus">: K.sprich schweigt,
     die 🔈-Knöpfe (K.schritte, K.quiz, .nur-stimme) verschwinden. */
  /* Die Stimme spricht nur Deutsch (Aufnahmen aus src/lib/vorlesen/texte.ts). Andere Sprachen: still, kein Aufruf von
     /api/vorlesen — die Gerätestimme springt auch dort nicht ein (siehe Vorlesen unten). */
  var stimmeAus = document.documentElement.getAttribute('data-stimme') === 'aus' || !deutsch;
  K.stimmeAus = function () { return stimmeAus; };
  var gewaehlt = lies('kiste.ton');
  var tonAn = gewaehlt === '1' || (gewaehlt !== '0' && document.documentElement.getAttribute('data-ton') === 'an');
  var ctx = null;
  function audio() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    return ctx;
  }
  function piep(freq, dauer, wann, typ) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = typ || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + (wann || 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dauer + 0.02);
  }
  K.ton = function (art) {
    if (!tonAn) return;
    if (art === 'ok') { piep(660, .12); piep(880, .18, .1); }
    else if (art === 'falsch') { piep(220, .22, 0, 'triangle'); }
    else if (art === 'fanfare') { piep(523, .14); piep(659, .14, .12); piep(784, .14, .24); piep(1046, .3, .36); }
    else { piep(520, .05, 0, 'triangle'); }
  };

  /* ── Vorlesen: Rachelle statt der Gerätestimme (03.10.2026) ──
     Andreea: „Kontrolliere, dass überall die Stimme, die so robotisch vom
     Browser drinnen ist, durch ihre Stimme ersetzt wird." speechSynthesis
     gibt es hier nicht mehr. Jeder Text kommt als Aufnahme von
     /api/vorlesen (ElevenLabs, einmal gesprochen und abgelegt) — die
     Route spricht nur, was in src/lib/vorlesen/texte.ts steht
     (node scripts/vorlesen-texte.mjs). Ist sie nicht erreichbar (kein
     Netz, Datei lokal geöffnet), bleibt es still; nie springt die
     Gerätestimme ein.

     EIN Abspieler für alles: iPads erlauben das Abspielen ohne Antippen
     nur einem Element, das schon einmal beim Antippen gespielt hat. Die
     Aufnahmen kommen als Blob — so braucht der Server keine Teil-Abrufe,
     und Vorladen heißt: einmal holen, dann sofort abspielbar. */
  var FASSUNG = '2'; // = VORLESE_FASSUNG in src/lib/vorlesen/werkzeug-stimme.ts (2: Silben auf Deutsch, 10.10.2026)
  var aufnahmen = {}, holen = {}, spieler = null, nr = 0, gemeldet = false;
  function adresse(text) { return '/api/vorlesen?v=' + FASSUNG + '&t=' + encodeURIComponent(text); }
  K.kannSprechen = function () {
    return /^https?:$/.test(location.protocol) && typeof fetch === 'function' && typeof Audio === 'function' && !!window.URL && !!URL.createObjectURL;
  };
  function ohneStimme() {
    if (gemeldet) return;
    gemeldet = true;
    document.dispatchEvent(new CustomEvent('kiste:ohne-stimme'));
  }
  function lade(text) {
    if (!deutsch) return Promise.resolve(null); // andere Sprache: nie /api/vorlesen (Aufnahmen gibt es nur deutsch)
    if (aufnahmen[text]) return Promise.resolve(aufnahmen[text]);
    if (holen[text]) return holen[text];
    holen[text] = fetch(adresse(text)).then(function (r) {
      if (!r.ok) throw new Error('Stimme ' + r.status);
      return r.blob();
    }).then(function (b) {
      aufnahmen[text] = URL.createObjectURL(b);
      return aufnahmen[text];
    }).catch(function () {
      delete holen[text];
      ohneStimme();
      return null;
    });
    return holen[text];
  }
  /** Aufnahmen schon holen, damit sie beim Antippen sofort da sind. */
  K.vorladen = function (texte) {
    if (!tonAn || !K.kannSprechen()) return Promise.resolve([]);
    return Promise.all((texte || []).filter(Boolean).map(lade));
  };
  /* Kurze Stille (WAV, 8 kHz) — zum Freischalten des Abspielers beim ersten Antippen. */
  function stilleWav() {
    var n = 400, b = new Uint8Array(44 + n), v = new DataView(b.buffer), i;
    function str(o, t) { for (var j = 0; j < t.length; j++) b[o + j] = t.charCodeAt(j); }
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    for (i = 0; i < n; i++) b[44 + i] = 128;
    var s = ''; for (i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  }
  function abspieler() {
    if (!spieler && typeof Audio === 'function') { spieler = new Audio(); spieler.preload = 'auto'; }
    return spieler;
  }
  var frei = false;
  function freischalten() {
    if (frei || !tonAn || !K.kannSprechen()) return;
    frei = true;
    var a = abspieler(); if (!a || !a.paused) return;
    try { a.src = stilleWav(); var p = a.play(); if (p && p.catch) p.catch(function () { /* egal */ }); } catch (e) { /* egal */ }
  }
  ['touchend', 'click', 'keydown'].forEach(function (art) { document.addEventListener(art, freischalten, true); });

  /** Ton aus oder neuer Satz: Was gerade läuft oder noch lädt, verstummt. */
  K.still = function () {
    nr++;
    if (spieler) { try { spieler.onended = null; spieler.pause(); } catch (e) { /* egal */ } }
  };
  /* Antippen bei ausgeschaltetem Ton: der Ton-Knopf winkt, beim ersten Mal mit Satz. */
  var hinweisDa = false;
  function tonIstAus() {
    var tk = document.getElementById('tonKnopf');
    if (tk) { tk.classList.remove('winkt'); void tk.offsetWidth; tk.classList.add('winkt'); }
    if (hinweisDa) return;
    hinweisDa = true;
    var h = document.createElement('div');
    h.className = 'ton-hinweis'; h.setAttribute('role', 'status');
    h.textContent = T('🔇 Der Ton ist aus. Tippe oben auf 🔇, dann hörst du die Stimme.');
    document.body.appendChild(h);
    setTimeout(function () { h.remove(); }, 3500);
  }
  /**
   * Text vorlesen. opt.fertig läuft, wenn die Aufnahme zu Ende ist (oder
   * nicht kommt), opt.gewollt = die Person hat ausdrücklich auf „Hören"
   * getippt. Rückgabe false: Ton aus oder keine Stimme möglich.
   */
  K.sprich = function (text, opt) {
    opt = opt || {};
    if (stimmeAus) return false;
    if (!tonAn) { if (opt.gewollt) tonIstAus(); return false; }
    if (!K.kannSprechen()) { ohneStimme(); return false; }
    K.still();
    var meins = nr, erledigt = false;
    function fertig() { if (erledigt) return; erledigt = true; if (opt.fertig) opt.fertig(); }
    function spiele(url) {
      if (meins !== nr || !tonAn) return;
      if (!url) { fertig(); return; }
      var a = abspieler();
      try {
        a.onended = fertig;
        a.src = url;
        var p = a.play();
        if (p && p.catch) p.catch(function () { if (meins === nr) fertig(); });
      } catch (e) { fertig(); }
    }
    if (aufnahmen[text]) spiele(aufnahmen[text]);
    else lade(text).then(spiele);
    return true;
  };

  /* ── Rückmeldung ── */
  K.melde = function (el, art, text) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    el.className = 'meldung' + (art ? ' ' + art : '');
    void el.offsetWidth; // Animation neu starten
    el.className = 'meldung' + (art ? ' ' + art : '');
    /* Ein einziges Kind (10.10.2026): .meldung ist ein Flex-Kasten — ohne Hülle zerfiel „Richtig wäre: <b>went</b>"
       in Spalten (gefunden beim Bau von Kinderrechte; betraf u. a. English Tenses und Brüche). */
    el.innerHTML = '<span>' + text + '</span>';
    if (art === 'ok') K.ton('ok'); else if (art === 'falsch') K.ton('falsch');
  };

  K.sterne = function (el, n, max) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    var h = '';
    for (var i = 0; i < max; i++) h += '<span class="' + (i < n ? 'an' : '') + '">⭐</span>';
    el.innerHTML = h;
    el.setAttribute('aria-label', T('{0} von {1} Sternen', n, max));
  };

  K.konfetti = function () {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div'); box.className = 'konfetti';
    var farben = ['#e2574c', '#3d7be0', '#f5b82e', '#2fa36b', '#8a5be0', '#f08a24'];
    for (var i = 0; i < 60; i++) {
      var s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = farben[i % farben.length];
      s.style.animationDelay = Math.random() * 0.4 + 's';
      s.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(s);
    }
    document.body.appendChild(box);
    K.ton('fanfare');
    setTimeout(function () { box.remove(); }, 2000);
  };

  /* ── Ziffernblock: kein Tastatur-Aufklappen am Tablet ── */
  K.ziffernblock = function (box, opt) {
    if (typeof box === 'string') box = document.getElementById(box);
    var wert = '';
    var max = opt.stellen || 3;
    function zeig() { if (opt.anzeige) opt.anzeige(wert); }
    var tasten = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', 'OK'];
    box.className = 'ziffern'; box.innerHTML = '';
    tasten.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t === 'OK' ? '✔ OK' : t;
      if (t === '⌫') { b.className = 'weg'; b.setAttribute('aria-label', T('Löschen')); }
      if (t === 'OK') b.className = 'ok';
      b.addEventListener('click', function () {
        K.ton('klick');
        if (t === '⌫') wert = wert.slice(0, -1);
        else if (t === 'OK') { if (wert !== '' && opt.ok) opt.ok(Number(wert)); return; }
        else if (wert.length < max) wert = (wert === '0' ? '' : wert) + t;
        zeig();
      });
      box.appendChild(b);
    });
    zeig();
    return { leeren: function () { wert = ''; zeig(); }, wert: function () { return wert; } };
  };

  /* ── Ziehen mit Finger oder Maus ── */
  K.ziehen = function (el, opt) {
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button > 0) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      if (opt.start) opt.start(e);
      function bew(ev) { if (opt.bewegen) opt.bewegen(ev); }
      function ende(ev) {
        el.removeEventListener('pointermove', bew);
        el.removeEventListener('pointerup', ende);
        el.removeEventListener('pointercancel', ende);
        if (opt.ende) opt.ende(ev);
      }
      el.addEventListener('pointermove', bew);
      el.addEventListener('pointerup', ende);
      el.addEventListener('pointercancel', ende);
    });
  };

  /* ── Reiter + Ton-Knopf + Symbole ── */
  K.start = function () {
    var knoepfe = [].slice.call(document.querySelectorAll('.reiter [data-ziel]'));
    function zeige(id, still) {
      knoepfe.forEach(function (b) {
        var an = b.getAttribute('data-ziel') === id;
        b.setAttribute('aria-selected', an ? 'true' : 'false');
        var s = document.getElementById(b.getAttribute('data-ziel'));
        if (s) s.classList.toggle('an', an);
      });
      if (!still) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* egal */ } }
      document.dispatchEvent(new CustomEvent('kiste:reiter', { detail: id }));
    }
    knoepfe.forEach(function (b) {
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { K.ton('klick'); zeige(b.getAttribute('data-ziel')); });
    });
    var h = (location.hash || '').slice(1);
    if (h && document.getElementById(h) && knoepfe.some(function (b) { return b.getAttribute('data-ziel') === h; })) zeige(h, true);
    else if (knoepfe[0]) zeige(knoepfe[0].getAttribute('data-ziel'), true);
    K.zeige = zeige;

    var tk = document.getElementById('tonKnopf');
    if (tk) {
      var setz = function () {
        tk.setAttribute('aria-pressed', tonAn ? 'true' : 'false');
        tk.title = tonAn ? T('Töne aus') : T('Töne an');
        tk.innerHTML = tonAn ? '🔊' : '🔇';
      };
      setz();
      tk.addEventListener('click', function () {
        tonAn = !tonAn; schreib('kiste.ton', tonAn ? '1' : '0'); setz();
        if (tonAn) { frei = false; freischalten(); K.ton('ok'); } else K.still();
      });
    }
    var vk = document.getElementById('vollKnopf');
    if (vk) {
      if (!document.fullscreenEnabled) vk.classList.add('versteckt');
      vk.addEventListener('click', function () {
        try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* egal */ }
      });
    }
    blaetterKnopf();
    zurueckKnopf();
    motivPlaetze();
    bildrasterKnopf();
    sprachKnopf();
  };

  /* ── DE | EN im Kopf (16.10.2026) ── Nur bei Werkzeugen mit Übersetzung: Die deutsche Seite fragt die Liste
     /lernwerkzeuge/en/fassungen.json (scripts/werkzeug-uebersetzen.mjs), die englische kennt ihr Original
     (<link rel="alternate" hreflang="de">). Der offene Reiter (#…) kommt mit. */
  function sprachKnopf() {
    var platz = document.querySelector('.kopf .rechts');
    if (!platz || location.protocol === 'file:' || document.getElementById('sprachKnopf')) return;
    function setze(ziel, kurz, titel, sprache) {
      if (document.getElementById('sprachKnopf')) return;
      var a = document.createElement('a');
      a.id = 'sprachKnopf'; a.className = 'rund sprach-knopf'; a.href = ziel; a.hreflang = sprache;
      a.title = titel; a.setAttribute('aria-label', titel); a.textContent = kurz;
      a.addEventListener('click', function () { a.href = ziel + (location.hash || ''); });
      platz.insertBefore(a, platz.firstChild);
    }
    if (!deutsch) {
      var de = document.querySelector('link[rel="alternate"][hreflang="de"]');
      if (de) setze(de.getAttribute('href'), 'DE', 'Deutsche Fassung', 'de');
      return;
    }
    var m = /\/([a-z0-9-]+)\.html$/i.exec(location.pathname);
    if (!m || typeof fetch !== 'function') return;
    var d = m[1].toLowerCase();
    fetch('/lernwerkzeuge/en/fassungen.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (liste) { if (Array.isArray(liste) && liste.indexOf(d) >= 0) setze('/lernwerkzeuge/en/' + d + '.html', 'EN', 'English version', 'en'); })
      .catch(function () { /* ohne Liste kein Knopf */ });
  }

  /* ── Bildraster für die Superadmin (11.10.2026) ──
     Andreea: „für mich als Superadmin und auch wirklich nur für mich als Superadmin … in jedem Werkzeug ein Button, wo
     die Bildraster hinterlegt sind, die ich dann anklicken kann und dann werden sie automatisch an die richtige Stelle
     eingefügt." Gefragt wird nur in einem Browser, in dem die Verwaltung schon einmal offen war (lz.superadmin), und
     zeigen darf es erst die Antwort des Servers. Der Knopf öffnet /admin/bilder/werkzeug/<werkzeug> in einem neuen Tab;
     kommt man zurück und es wurde inzwischen abgelegt, lädt sich das Werkzeug neu. */
  function bildrasterKnopf() {
    if (location.protocol === 'file:' || lies('lz.superadmin') !== '1' || !document.getElementById('lz-motive')) return;
    var m = /\/([a-z0-9-]+)\.html$/i.exec(location.pathname);
    var platz = document.querySelector('.kopf .rechts');
    if (!m || !platz || document.getElementById('bildrasterKnopf')) return;
    fetch('/api/werkzeug/bildraster', { credentials: 'same-origin', redirect: 'manual', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || j.superadmin !== true || document.getElementById('bildrasterKnopf')) return;
        var a = document.createElement('a');
        a.id = 'bildrasterKnopf';
        a.className = 'blaetter-knopf';
        a.href = '/admin/bilder/werkzeug/' + m[1].toLowerCase();
        a.target = '_blank'; a.rel = 'noopener';
        a.title = 'Bildraster dieses Werkzeugs zeichnen lassen — nur für die Superadmin';
        a.innerHTML = '🖼️<span>Bildraster</span>';
        platz.insertBefore(a, platz.firstChild);
        var beimStart = lies('lz.bildstand');
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'visible' && lies('lz.bildstand') !== beimStart) location.reload();
        });
      })
      .catch(function () { /* kein Knopf */ });
  }

  /* ── Blätter zum Ausdrucken (07.10.2026) ── Der Knopf „📄 Blätter" kommt aus
     ../lib/blaetter-knopf.js (gilt auch für ältere Werkzeuge ohne kiste.js). */
  function blaetterKnopf() {
    if (window.__blaetterKnopf || document.querySelector('script[src*="blaetter-knopf.js"]')) return;
    var s = document.createElement('script');
    s.src = '../lib/blaetter-knopf.js'; s.defer = true;
    document.head.appendChild(s);
  }

  /* ── Zurück zur Lernwerkstatt (11.10.2026) ── Der Knopf „← Lernwerkstatt" kommt aus
     ../lib/zurueck-knopf.js — nur, wenn eine Lehrkraft das Werkzeug aus der Lernwerkstatt geöffnet hat. */
  function zurueckKnopf() {
    if (window.__zurueckKnopf || document.querySelector('script[src*="zurueck-knopf.js"]')) return;
    var s = document.createElement('script');
    s.src = '../lib/zurueck-knopf.js'; s.defer = true;
    document.head.appendChild(s);
  }

  /* ── Bilder aus der Bildbibliothek, sobald es sie gibt (11.10.2026) ──
     Andreea: „muss ich jetzt extra sagen dass das jetzt da ist oder können wir das so einrichten dass sich unser tool
     … automatisch die neuen bilder holt." Ein Bildplatz zeigt zuerst, was das Werkzeug selbst mitbringt (Zeichnung
     oder ../bilder/…webp). Gibt es in der Bildbibliothek ein GEPRÜFTES Bild zu diesem Schlüssel und Stil, tauscht er
     es ein, sobald es geladen ist — legt Andreea ein neues Bild ab, steht es nach spätestens einer Stunde im Werkzeug,
     ohne dass jemand etwas ändert. Über /api/blatt/bild/<schlüssel> (nur lesen, eigene Domain). Unter file:// (Fotos
     für die Blätter) bleibt alles, wie es ist — die Fotos sollen sich nicht von selbst ändern.
     K.bildPlatz(el, schluessel, stile, fertig): el = <img> oder SVG-<image> (oder ein Element, dessen
     data-bibliothek-Kind ersetzt wird); stile = "sachzeichnung,sachbild3d"; fertig(url) nach dem Tausch. */
  var bildCache = {};
  K.lernbild = function (schluessel, stile, breite) {
    if (location.protocol === 'file:' || !/^[a-z0-9-]{2,60}$/.test(schluessel || '')) return null;
    var q = [];
    if (stile) q.push('stil=' + encodeURIComponent(stile));
    if (breite) q.push('w=' + breite);
    /* Gerade in der Bildbibliothek abgelegt (lz.bildstand, nur im Browser der Superadmin): an jedem Zwischenspeicher
       vorbei, damit das neue Bild sofort dasteht und nicht erst nach einer Stunde. */
    var stand = Number(lies('lz.bildstand')) || 0;
    if (stand && Date.now() - stand < 2 * 3600e3) q.push('v=' + stand);
    return '/api/blatt/bild/' + schluessel + (q.length ? '?' + q.join('&') : '');
  };
  /* Wartende je Adresse: Zeigt ein Werkzeug dasselbe Motiv zwanzigmal, geht trotzdem nur EINE Anfrage hinaus. */
  var bildWartet = {};
  K.bildPlatz = function (el, schluessel, stile, fertig, breite) {
    var u = K.lernbild(schluessel, stile, breite);
    if (!el || !u) return;
    var setzen = function () {
      if (el.tagName && el.tagName.toLowerCase() === 'image') { el.setAttribute('href', u); el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', u); }
      else if (el.tagName && el.tagName.toLowerCase() === 'img') el.src = u;
      el.classList.add('aus-bibliothek');
      if (fertig) fertig(u);
    };
    if (bildCache[u] === true) { setzen(); return; }
    if (bildCache[u] === false) return;
    if (bildWartet[u]) { bildWartet[u].push(setzen); return; }
    bildWartet[u] = [setzen];
    var probe = new Image();
    probe.onload = function () { bildCache[u] = true; var w = bildWartet[u]; delete bildWartet[u]; w.forEach(function (f) { f(); }); };
    probe.onerror = function () { bildCache[u] = false; delete bildWartet[u]; };
    probe.src = u;
  };

  /* ── Motivplätze in jedem Werkzeug (11.10.2026) ──
     Andreea: „in vielen Werkzeugen fehlen die Bilder noch - wie können wir das gestalten dass sich das tool
     automatisch neue Motive holt, und dass aber auch der Bauplan weiß was er noch zu machen hat."
     Jedes Werkzeug nennt in <script type="application/json" id="lz-motive"> die Motive, die es zeigen kann
     ({"stil":"clipart","motive":[{"b":"der Igel","en":"hedgehog …"}]}) — daraus rechnet die Bildbibliothek, was
     noch fehlt (scripts/werkzeug-motive.mjs). Wo das Werkzeug ein Motiv zeigt, steht data-motiv="<schlüssel>":
       <img data-motiv>, SVG-<image data-motiv>   → die Adresse wird getauscht
       <span data-motiv>🦔</span> (HTML)          → das Emoji/der Text weicht einem Bild in Schriftgröße
       SVG-<text data-motiv>🦔</text>              → ein Bild an seiner Stelle, so groß wie die Schrift
       SVG-<g data-motiv data-feld="x y b h">      → ein Bild im Feld, die Zeichnung darunter wird ausgeblendet
     Der Stil kommt aus data-stil, sonst aus der Motivliste, sonst Clipart. Unter file:// bleibt alles, wie es ist. */
  K.schluessel = function (begriff) {
    return String(begriff || '').toLowerCase()
      .replace(/^(der|die|das|the|an|a)\s+/, '').replace(/\s+(zum|als|im|am)\s+.*$/, '')
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[éèê]/g, 'e')
      .replace(/[^a-z0-9]+/g, '');
  };
  var motivListe = null;
  K.motive = function () {
    if (motivListe) return motivListe;
    motivListe = { stil: 'clipart', je: {} };
    var el = document.getElementById('lz-motive');
    if (el) {
      try {
        var m = JSON.parse(el.textContent || '{}');
        if (m.stil) motivListe.stil = m.stil;
        (m.motive || []).forEach(function (x) { var k = x.k || K.schluessel(x.b); if (k) motivListe.je[k] = x.s || motivListe.stil; });
      } catch (e) { /* kaputte Liste: dann eben Clipart */ }
    }
    return motivListe;
  };
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ── Genau einpassen (data-passen, 11.10.2026) ──
     Bibliotheksbilder haben einen durchsichtigen Rand, und ihr Seitenverhältnis ist ein anderes als das der Zeichnung.
     Mit „meet" allein schwebt ein Igel mit 20 % Rand über dem Boden. Steht data-passen am Platz (oder an einem
     Vorfahren, z. B. am <svg>), misst kiste.js den sichtbaren Teil (Deckkraft) und setzt ihn genau dorthin, wo vorher
     das alte Bild oder das Feld war: gleich groß, unverzerrt, unten auf dem Boden (data-ausrichtung „…YMid"/„…YMin"
     für Mitte/oben). Nur SVG-<image> und SVG-<g data-feld>; HTML-Bilder passen sich per CSS ein. */
  var bildMasse = {};
  function bildMass(u, fertig) {
    var m = bildMasse[u];
    if (m && m.da) { fertig(m.r); return; }
    if (m) { m.warte.push(fertig); return; }
    m = bildMasse[u] = { warte: [fertig] };
    var ende = function (r) { m.r = r; m.da = true; m.warte.forEach(function (f) { f(r); }); m.warte = []; };
    var im = new Image();
    im.onload = function () {
      var W = im.naturalWidth || 1, H = im.naturalHeight || 1, k = Math.min(1, 128 / Math.max(W, H));
      var w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k)), b = [0, 0, 1, 1];
      try {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
        var d = g.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] > 25) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; y1 = j; }
        if (x1 >= x0) b = [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h];
      } catch (e) { /* nicht messbar: das ganze Bild */ }
      ende({ a: W / H, b: b });
    };
    im.onerror = function () { ende(null); };
    im.src = u;
  }
  function kastenVon(el) {
    var z = function (n) { return parseFloat(el.getAttribute(n)) || 0; };
    return { x: z('x'), y: z('y'), w: z('width'), h: z('height') };
  }
  /* Der sichtbare Teil des Bildes r im Kasten k bei preserveAspectRatio par („… meet") */
  function sichtbarIn(k, par, r) {
    var al = /x(Min|Mid|Max)Y(Min|Mid|Max)/.exec(par || '') || [0, 'Mid', 'Mid'], A = { Min: 0, Mid: 0.5, Max: 1 };
    var rw = Math.min(k.w, k.h * r.a), rh = rw / r.a, rx = k.x + (k.w - rw) * A[al[1]], ry = k.y + (k.h - rh) * A[al[2]];
    return { x: rx + r.b[0] * rw, y: ry + r.b[1] * rh, w: (r.b[2] - r.b[0]) * rw, h: (r.b[3] - r.b[1]) * rh };
  }
  /* Das <image> el so setzen, dass der sichtbare Teil von r genau in V liegt */
  function passeEin(el, V, r, ausr) {
    var bw = r.b[2] - r.b[0], bh = r.b[3] - r.b[1], rnd = function (n) { return Math.round(n * 10) / 10; };
    if (!(V.w > 0 && V.h > 0 && bw > 0 && bh > 0)) return;
    var rw = Math.min(V.w / bw, V.h * r.a / bh), rh = rw / r.a, rx = V.x + V.w / 2 - (r.b[0] + bw / 2) * rw;
    var ry = /YMin/.test(ausr) ? V.y - r.b[1] * rh : /YMid/.test(ausr) ? V.y + V.h / 2 - (r.b[1] + bh / 2) * rh : V.y + V.h - r.b[3] * rh;
    el.setAttribute('x', rnd(rx)); el.setAttribute('y', rnd(ry)); el.setAttribute('width', rnd(rw)); el.setAttribute('height', rnd(rh));
    el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  function motivPlatz(el) {
    if (el.getAttribute('data-motiv-an')) return;
    el.setAttribute('data-motiv-an', '1');
    var k = el.getAttribute('data-motiv'), stil = el.getAttribute('data-stil') || K.motive().je[k] || K.motive().stil;
    var tag = (el.tagName || '').toLowerCase(), svg = el.namespaceURI === SVGNS;
    /* Breite fürs Verkleinern: ein Emoji-Platz braucht wenig, ein Feld oder ein füllendes Bild mehr. */
    var breite = Number(el.getAttribute('data-breite')) || (tag === 'img' || tag === 'image' || el.hasAttribute('data-motiv-fuellen') || (svg && tag !== 'text') ? 640 : 320);
    if (tag === 'img' || tag === 'image') {
      /* Zeigt der Platz schon das Bibliotheksbild als mitgeliefertes webp (../bilder/<schlüssel>.webp ist Clipart,
         …-3d.webp Sachbild 3D), wird nur gefragt, wenn es fehlt — sonst lädt z. B. die Anlaut-Tabelle 180 Bilder
         doppelt (11.10.2026 gemessen: pixelgleich, nur die zwanzigfache Datenmenge). */
      var lokal = /\/bilder\/([a-z0-9-]+)\.webp(?:[?#]|$)/.exec(el.getAttribute('src') || el.getAttribute('href') || '');
      if (lokal && ((lokal[1] === k && stil === 'clipart') || (lokal[1] === k + '-3d' && stil === 'sachbild3d'))) {
        var fehlt = function () { K.bildPlatz(el, k, stil, null, breite); };
        if (tag === 'img' && el.complete && !el.naturalWidth) fehlt();
        else el.addEventListener('error', fehlt, { once: true });
        return;
      }
      if (tag === 'image' && el.closest('[data-passen]')) {
        /* Wo war das alte Bild sichtbar? Erst messen, dann tauschen und den neuen sichtbaren Teil genau dorthin. */
        var alt = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
        var k0 = kastenVon(el), par0 = el.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
        var ausr0 = el.getAttribute('data-ausrichtung') || (el.closest('[data-ausrichtung]') || el).getAttribute('data-ausrichtung') || 'xMidYMax';
        var tauschen = function (rAlt) {
          var V = rAlt ? sichtbarIn(k0, par0, rAlt) : k0;
          K.bildPlatz(new Image(), k, stil, function (u) {
            bildMass(u, function (r) {
              if (!el.isConnected) return;
              if (r) passeEin(el, V, r, ausr0);
              el.setAttribute('href', u); el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', u);
              el.classList.add('aus-bibliothek');
            });
          }, breite);
        };
        if (alt) bildMass(alt, tauschen); else tauschen(null);
        return;
      }
      K.bildPlatz(el, k, stil, null, breite);
      return;
    }
    K.bildPlatz(new Image(), k, stil, function (u) {
      if (!el.isConnected) return;
      if (svg && tag === 'text') {
        var fs = parseFloat(el.getAttribute('font-size') || getComputedStyle(el).fontSize) || 16;
        var x = parseFloat(el.getAttribute('x')) || 0, y = parseFloat(el.getAttribute('y')) || 0, gr = fs * 1.15;
        var anker = el.getAttribute('text-anchor') || getComputedStyle(el).textAnchor || 'start';
        var bi = document.createElementNS(SVGNS, 'image');
        bi.setAttribute('x', anker === 'middle' ? x - gr / 2 : anker === 'end' ? x - gr : x);
        bi.setAttribute('y', y - gr * 0.82);
        bi.setAttribute('width', gr); bi.setAttribute('height', gr);
        bi.setAttribute('href', u); bi.setAttribute('class', 'lz-motiv aus-bibliothek');
        if (el.getAttribute('transform')) bi.setAttribute('transform', el.getAttribute('transform'));
        el.parentNode.insertBefore(bi, el);
        el.style.display = 'none';
      } else if (svg) {
        var f = (el.getAttribute('data-feld') || '').split(/[\s,]+/).map(Number);
        if (f.length !== 4 || f.some(isNaN)) return;
        for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].style) el.childNodes[i].style.display = 'none';
        var gi = document.createElementNS(SVGNS, 'image');
        gi.setAttribute('x', f[0]); gi.setAttribute('y', f[1]); gi.setAttribute('width', f[2]); gi.setAttribute('height', f[3]);
        gi.setAttribute('preserveAspectRatio', el.getAttribute('data-ausrichtung') || 'xMidYMid meet');
        gi.setAttribute('href', u); gi.setAttribute('class', 'lz-motiv aus-bibliothek');
        if (el.closest('[data-passen]')) {
          /* Der sichtbare Teil füllt das Feld (unten auf dem Boden, außer data-ausrichtung sagt …YMid/…YMin). */
          gi.style.visibility = 'hidden';
          bildMass(u, function (r) {
            if (r) passeEin(gi, { x: f[0], y: f[1], w: f[2], h: f[3] }, r, el.getAttribute('data-ausrichtung') || 'xMidYMax');
            gi.style.visibility = '';
          });
        }
        el.appendChild(gi);
      } else {
        var img = document.createElement('img');
        img.src = u; img.alt = el.getAttribute('aria-label') || el.getAttribute('title') || '';
        img.className = 'lz-motiv aus-bibliothek' + (el.hasAttribute('data-motiv-fuellen') ? ' fuellen' : '');
        img.draggable = false;
        el.textContent = '';
        el.appendChild(img);
        el.classList.add('mit-motiv');
      }
    }, breite);
  }
  function motivPlaetze() {
    if (location.protocol === 'file:' || window.__motivPlaetze) return;
    window.__motivPlaetze = true;
    var suche = function (w) {
      if (!w || w.nodeType !== 1) return;
      if (w.hasAttribute('data-motiv')) motivPlatz(w);
      var l = w.querySelectorAll('[data-motiv]:not([data-motiv-an])');
      for (var i = 0; i < l.length; i++) motivPlatz(l[i]);
    };
    suche(document.body);
    if (window.MutationObserver) new MutationObserver(function (ms) {
      ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) suche(m.addedNodes[i]); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── Erklären Schritt für Schritt (06.10.2026) ──
     Andreea: „Wir müssen wirklich immer davon ausgehen, dass wir … auch
     was dazu erklären müssen." Jedes neue Werkzeug erklärt zuerst: ein
     kurzer Satz je Schritt, die Animation zeigt ihn, Rachelle liest ihn
     vor. opt: texte (Liste ganzer Sätze aus dem #vorlesen-Block), text
     (Element für den Satz), zeige(i) (Animation zu Schritt i), punkte,
     zurueck, weiter, hoeren, abspielen (Elemente oder ids, alle optional).
     Weiter/Zurück liest den neuen Schritt gleich vor (nur nach Antippen,
     nur bei Ton an). Rückgabe: { geh(i), nr(), stopp() }. */
  function elem(x) { return typeof x === 'string' ? document.getElementById(x) : x; }
  K.schritte = function (opt) {
    var texte = opt.texte || [], i = 0, lauf = null;
    var text = elem(opt.text), punkte = elem(opt.punkte), zur = elem(opt.zurueck), wei = elem(opt.weiter), hoer = elem(opt.hoeren), ab = elem(opt.abspielen);
    function zeichne(sprechen) {
      if (text) { text.textContent = texte[i] || ''; text.classList.remove('neu'); void text.offsetWidth; text.classList.add('neu'); }
      if (punkte) {
        punkte.innerHTML = '';
        texte.forEach(function (_, j) {
          var p = document.createElement('button'); p.type = 'button';
          p.className = 'punkt' + (j === i ? ' an' : j < i ? ' war' : '');
          p.setAttribute('aria-label', T('Schritt {0} von {1}', j + 1, texte.length));
          p.addEventListener('click', function () { stopp(); geh(j, true); });
          punkte.appendChild(p);
        });
      }
      if (zur) zur.disabled = i === 0;
      if (wei) wei.disabled = i === texte.length - 1;
      if (opt.zeige) opt.zeige(i);
      if (sprechen && texte[i]) K.sprich(texte[i]);
    }
    function geh(j, sprechen) { i = Math.max(0, Math.min(texte.length - 1, j)); K.ton('klick'); zeichne(sprechen); }
    /* „Alles abspielen": liest jeden Schritt vor und blättert nach dem Satz
       selbst weiter — ohne Ton nach einer Lesezeit je nach Satzlänge. */
    function stopp() {
      if (!lauf) return;
      clearTimeout(lauf.t); lauf = null;
      if (ab) { ab.textContent = T('▶ Alles abspielen'); ab.setAttribute('aria-pressed', 'false'); }
    }
    function sprichUndWarte() {
      var meins = lauf, t = texte[i] || '';
      var danach = function () { if (lauf === meins && lauf) lauf.t = setTimeout(naechster, 900); };
      if (!K.sprich(t, { fertig: danach })) lauf.t = setTimeout(naechster, 1800 + t.length * 60);
    }
    function naechster() {
      if (!lauf) return;
      if (i >= texte.length - 1) { stopp(); return; }
      geh(i + 1, false); sprichUndWarte();
    }
    if (zur) zur.addEventListener('click', function () { stopp(); geh(i - 1, true); });
    if (wei) wei.addEventListener('click', function () { stopp(); geh(i + 1, true); });
    if (hoer && stimmeAus) hoer.classList.add('versteckt');
    if (hoer) hoer.addEventListener('click', function () { stopp(); if (texte[i]) K.sprich(texte[i], { gewollt: true }); });
    if (ab) {
      ab.textContent = T('▶ Alles abspielen'); ab.setAttribute('aria-pressed', 'false');
      ab.addEventListener('click', function () {
        if (lauf) { stopp(); K.still(); return; }
        lauf = { t: null };
        ab.textContent = T('⏸ Anhalten'); ab.setAttribute('aria-pressed', 'true');
        if (i >= texte.length - 1) geh(0, false);
        sprichUndWarte();
      });
    }
    document.addEventListener('kiste:reiter', function () { if (lauf) { stopp(); K.still(); } });
    zeichne(false);
    praesentation({
      text: text, knopfNach: ab || wei,
      anzahl: function () { return texte.length; }, nr: function () { return i; },
      geh: function (j) { stopp(); geh(j, true); },
      vorlesen: hoer && !stimmeAus ? function () { if (texte[i]) K.sprich(texte[i], { gewollt: true }); } : null,
    });
    return { geh: function (j) { stopp(); geh(j, false); }, nr: function () { return i; }, stopp: stopp };
  };

  /* ── Präsentieren (11.10.2026) ──
     Andreea: „wenn die lehrer die erklär-seite … wie eine präsentation durchklicken könnten. so dass der lesetext
     unten steht, aber das was man sieht die komplette seite einnimmt und man mit einem klicker die verschiedenen
     ‚Entdecken' Bereiche weiterscrollen kann."
     Der Knopf „🖥️ Präsentieren" steht bei jeder Erklärung (K.schritte). Er hebt Bühne und Satz in eine Fläche über
     dem ganzen Bildschirm (Vollbild, wenn der Browser darf): die Bühne so groß es geht, der Satz groß darunter.
     Weiter mit Klicker (Bild ↓), Pfeil rechts/unten, Leertaste, Enter oder Tippen auf die Bühne; zurück mit Bild ↑,
     Pfeil links/oben oder Tippen auf das linke Viertel; Pos1/Ende für den ersten/letzten Schritt; B oder Punkt macht
     den Schirm schwarz; Esc beendet. Nach dem letzten Schritt kommt die Merkkarte des Bereichs als eigene Folie.
     Die Elemente werden nur umgehängt (und danach zurück) — das Werkzeug merkt davon nichts. */
  var praesiAktiv = null;
  function praesentation(o) {
    var text = o.text, knopfNach = o.knopfNach;
    if (!text || !knopfNach || !knopfNach.parentNode) return;
    var karte = text.closest('.karte') || text.closest('section') || text.parentNode;
    var buehne = karte.querySelector('.buehne') || (karte.querySelector('svg') && karte.querySelector('svg').parentNode);
    if (!buehne || buehne.contains(text)) return;
    var knopf = document.createElement('button');
    knopf.type = 'button'; knopf.className = 'k leise praesi-knopf';
    knopf.innerHTML = T('🖥️ Präsentieren');
    knopf.title = T('Die Erklärung im Vollbild zeigen und mit dem Klicker weiterschalten');
    knopfNach.parentNode.appendChild(knopf);

    var flaeche = null, merkFolie = false, merkBild = null, plaetze = [];
    function merkkarte() {
      var bereich = karte.closest('.bereich') || document;
      var svg = bereich.querySelector('.merk-wrap svg, svg#merkkarte');
      return svg && !buehne.contains(svg) ? svg : null;
    }
    function umhaengen(el, ziel) {
      var platz = document.createComment('praesi');
      el.parentNode.insertBefore(platz, el);
      plaetze.push([el, platz]);
      ziel.appendChild(el);
    }
    function stand() {
      if (!flaeche) return;
      var n = o.anzahl(), i = o.nr(), mk = !!merkkarte();
      flaeche.querySelector('.praesi-stand').textContent = merkFolie ? T('Merkkarte') : (i + 1) + ' / ' + n;
      flaeche.querySelector('.praesi-zur').disabled = !merkFolie && i === 0;
      flaeche.querySelector('.praesi-vor').disabled = merkFolie || (i === n - 1 && !mk);
    }
    function zeigeMerk(an) {
      merkFolie = an;
      flaeche.classList.toggle('merk', an);
      var slot = flaeche.querySelector('.praesi-merk');
      slot.innerHTML = '';
      if (an) {
        var svg = merkkarte();
        merkBild = svg.cloneNode(true);
        [].forEach.call(merkBild.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
        merkBild.removeAttribute('id');
        slot.appendChild(merkBild);
        var h = (svg.closest('.karte') || document).querySelector('h2');
        flaeche.querySelector('.praesi-merktitel').textContent = h ? h.textContent.replace(/^\s*🗂️\s*/, '') : T('Merkkarte');
      }
      stand();
    }
    function vor() {
      if (merkFolie) return;
      if (o.nr() < o.anzahl() - 1) o.geh(o.nr() + 1);
      else if (merkkarte()) zeigeMerk(true);
      stand();
    }
    function zur() {
      if (merkFolie) zeigeMerk(false); else o.geh(o.nr() - 1);
      stand();
    }
    function taste(e) {
      if (praesiAktiv !== beenden) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter' || k === 'n') vor();
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace' || k === 'p') zur();
      else if (k === 'Home') { zeigeMerk(false); o.geh(0); stand(); }
      else if (k === 'End') { zeigeMerk(false); o.geh(o.anzahl() - 1); stand(); }
      else if (k === 'b' || k === 'B' || k === '.') flaeche.classList.toggle('schwarz');
      else if (k === 'Escape') beenden();
      else return;
      e.preventDefault();
    }
    function vollbildWeg() { if (!document.fullscreenElement && praesiAktiv === beenden) beenden(); }
    function beenden() {
      if (!flaeche) return;
      document.removeEventListener('keydown', taste, true);
      document.removeEventListener('fullscreenchange', vollbildWeg);
      plaetze.reverse().forEach(function (p) { p[1].parentNode.insertBefore(p[0], p[1]); p[1].parentNode.removeChild(p[1]); });
      plaetze = [];
      flaeche.parentNode.removeChild(flaeche); flaeche = null; merkFolie = false;
      document.documentElement.classList.remove('praesi-an');
      praesiAktiv = null;
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* egal */ }
      knopf.focus();
    }
    knopf.addEventListener('click', function () {
      if (praesiAktiv) praesiAktiv();
      flaeche = document.createElement('div');
      flaeche.className = 'praesi-flaeche';
      flaeche.setAttribute('role', 'dialog'); flaeche.setAttribute('aria-modal', 'true'); flaeche.setAttribute('aria-label', T('Präsentation'));
      flaeche.innerHTML =
        '<div class="praesi-buehne"></div><div class="praesi-merk" aria-hidden="false"></div>' +
        '<div class="praesi-unten"><p class="praesi-merktitel"></p></div>' +
        '<div class="praesi-leiste" role="group" aria-label="' + T('Präsentation steuern') + '">' +
        '<button type="button" class="praesi-zur" aria-label="' + T('Zurück') + '">◀</button><span class="praesi-stand" aria-live="polite"></span>' +
        '<button type="button" class="praesi-vor" aria-label="' + T('Weiter') + '">▶</button>' +
        (o.vorlesen ? '<button type="button" class="praesi-hoeren" aria-label="' + T('Vorlesen') + '">🔈</button>' : '') +
        '<button type="button" class="praesi-ende" aria-label="' + T('Präsentation beenden') + '">✕</button></div>';
      document.body.appendChild(flaeche);
      umhaengen(buehne, flaeche.querySelector('.praesi-buehne'));
      umhaengen(text, flaeche.querySelector('.praesi-unten'));
      flaeche.querySelector('.praesi-vor').addEventListener('click', vor);
      flaeche.querySelector('.praesi-zur').addEventListener('click', zur);
      flaeche.querySelector('.praesi-ende').addEventListener('click', beenden);
      if (o.vorlesen) flaeche.querySelector('.praesi-hoeren').addEventListener('click', o.vorlesen);
      /* Tippen auf die Bühne blättert — außer auf Knöpfen und Zielen zum Ziehen. */
      flaeche.querySelector('.praesi-buehne').addEventListener('click', function (e) {
        if (e.target.closest('button, a, input, select, textarea, [data-drop], [draggable="true"], .zieh')) return;
        var r = this.getBoundingClientRect();
        if (e.clientX < r.left + r.width / 4) zur(); else vor();
      });
      flaeche.querySelector('.praesi-merk').addEventListener('click', zur);
      document.documentElement.classList.add('praesi-an');
      document.addEventListener('keydown', taste, true);
      document.addEventListener('fullscreenchange', vollbildWeg);
      praesiAktiv = beenden;
      stand();
      try { var v = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (v && v.catch) v.catch(function () {}); } catch (e) { /* ohne Vollbild: die Fläche deckt das Fenster */ }
      flaeche.querySelector('.praesi-vor').focus();
    });
  }

  /* ── Quiz mit Sternen und Erklärung (06.10.2026) ──
     box: leeres Element. opt.fragen: [{ f: 'Frage', a: ['…', '…'], r: 0,
     w: 'Warum es stimmt', t: 'Tipp nach falscher Antwort' (optional),
     bild: 'HTML über der Frage' (optional, z. B. Emoji oder SVG) }].
     f, w und t kommen aus dem #vorlesen-Block — sie werden vorgelesen.
     opt.anzahl (Standard 10), opt.lob: { super, gut, weiter } (Sätze aus
     dem #vorlesen-Block für das Ende), opt.ende(sterne, max).
     Ein Stern nur beim ersten Versuch; nach falscher Antwort Tipp und
     noch einmal versuchen; nach richtiger Antwort die Erklärung. */
  K.quiz = function (box, opt) {
    box = elem(box);
    var Q = { liste: [], nr: 0, sterne: 0, versuch: 0, fertig: false, satz: '' };
    var anzahl = Math.min(opt.anzahl || 10, (opt.fragen || []).length);
    box.classList.add('quiz');
    box.innerHTML =
      '<div class="quiz-kopf"><span class="stand quiz-nr"></span><div class="sterne quiz-sterne"></div></div>' +
      '<div class="quiz-bild" aria-hidden="true"></div>' +
      '<p class="quiz-frage" aria-live="polite"></p>' +
      '<div class="zeile mitte"><button type="button" class="k quiz-hoeren">' + T('🔈 Vorlesen') + '</button></div>' +
      '<div class="quiz-antworten" role="group" aria-label="' + T('Antworten') + '"></div>' +
      '<div class="meldung quiz-meldung" aria-live="polite"></div>' +
      '<div class="zeile mitte" style="margin-top:12px"><button type="button" class="k haupt quiz-weiter">' + T('Weiter ➜') + '</button></div>';
    /* Einmal festhalten: K.melde setzt die Klasse der Meldung neu. */
    var teile = {};
    ['.quiz-nr', '.quiz-sterne', '.quiz-bild', '.quiz-frage', '.quiz-hoeren', '.quiz-antworten', '.quiz-meldung', '.quiz-weiter'].forEach(function (c) { teile[c] = box.querySelector(c); });
    var $ = function (c) { return teile[c]; };
    function frage() { return Q.liste[Q.nr]; }
    function zeige(sprechen) {
      var q = frage(); Q.versuch = 0; Q.fertig = false;
      $('.quiz-nr').textContent = T('Frage {0} von {1}', Q.nr + 1, anzahl);
      K.sterne($('.quiz-sterne'), Q.sterne, anzahl);
      $('.quiz-bild').innerHTML = q.bild || '';
      $('.quiz-bild').style.display = q.bild ? '' : 'none';
      $('.quiz-frage').textContent = q.f;
      var aw = $('.quiz-antworten'); aw.innerHTML = '';
      var reihe = K.mische(q.a.map(function (_, j) { return j; }));
      reihe.forEach(function (j) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-a';
        b.innerHTML = q.a[j];
        b.addEventListener('click', function () { pruefe(j, b); });
        aw.appendChild(b);
      });
      K.melde($('.quiz-meldung'), '', T('Tippe auf die richtige Antwort.'));
      $('.quiz-weiter').disabled = true;
      $('.quiz-weiter').textContent = Q.nr === anzahl - 1 ? T('Zum Ergebnis ➜') : T('Weiter ➜');
      if (sprechen) K.sprich(q.f);
    }
    function pruefe(j, b) {
      if (Q.fertig) return;
      var q = frage();
      if (j === q.r) {
        Q.fertig = true;
        if (Q.versuch === 0) Q.sterne++;
        b.classList.add('richtig');
        [].forEach.call(box.querySelectorAll('.quiz-a'), function (x) { x.disabled = x !== b; });
        K.melde($('.quiz-meldung'), 'ok', '✔ ' + (Q.versuch === 0 ? T('Richtig! ') : T('Jetzt stimmt es. ')) + (q.w || ''));
        K.sterne($('.quiz-sterne'), Q.sterne, anzahl);
        $('.quiz-weiter').disabled = false;
        if (q.w) K.sprich(q.w);
      } else {
        Q.versuch++;
        b.classList.add('daneben'); b.disabled = true;
        K.melde($('.quiz-meldung'), 'falsch', T('✖ Noch nicht. ') + (q.t || T('Versuch es noch einmal.')));
        if (q.t) K.sprich(q.t);
      }
    }
    function ende() {
      var max = anzahl, n = Q.sterne, lob = opt.lob || {};
      var top = n >= Math.max(1, max - 1), gut = n >= Math.max(1, Math.ceil(max / 2));
      var satz = top ? lob['super'] : gut ? lob.gut : lob.weiter;
      $('.quiz-nr').textContent = T('Geschafft!');
      $('.quiz-bild').style.display = '';
      $('.quiz-bild').innerHTML = '<span style="font-size:64px">' + (top ? '🏆' : gut ? '🌟' : '💪') + '</span>';
      $('.quiz-frage').textContent = T('Du hast {0} von {1} Sternen.', n, max);
      $('.quiz-antworten').innerHTML = '';
      K.melde($('.quiz-meldung'), gut ? 'ok' : '', satz || T('Spiel noch einmal und sammle mehr Sterne.'));
      $('.quiz-weiter').disabled = false;
      $('.quiz-weiter').textContent = T('↺ Noch einmal');
      if (top) K.konfetti();
      Q.satz = satz || '';
      if (satz) K.sprich(satz);
      if (opt.ende) opt.ende(n, max);
    }
    function neu(sprechen) {
      Q.liste = K.mische(opt.fragen).slice(0, anzahl); Q.nr = 0; Q.sterne = 0;
      zeige(sprechen);
    }
    $('.quiz-weiter').addEventListener('click', function () {
      if (Q.nr >= anzahl) { neu(true); return; }
      Q.nr++;
      if (Q.nr >= anzahl) ende(); else zeige(true);
    });
    if (stimmeAus) $('.quiz-hoeren').parentNode.classList.add('versteckt');
    $('.quiz-hoeren').addEventListener('click', function () {
      var q = frage();
      if (Q.nr < anzahl && q) K.sprich(q.f, { gewollt: true });
      else if (Q.satz) K.sprich(Q.satz, { gewollt: true });
    });
    neu(false);
    return { neu: function () { neu(false); } };
  };

  K.tonAn = function () { return tonAn; };
  K.hinweisTonAus = tonIstAus;

  window.KISTE = K;
})();
