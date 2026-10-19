// === MedAT Trainer – neues Bezahlmodell (Andreea, 19.10.2026) ===
// Monatsabo 14,90 € (Simulationen werden wöchentlich freigeschaltet), MedAT-Pass 99 € bis zum MedAT 2027 (alles sofort),
// 14 Tage Probezeit, KI-Credits pro Monat mit Nachkauf. Ohne gültigen Zugang ist die App ausgegraut – nur Konto,
// Lernarchiv und Profil bleiben offen. Die Abbuchung der Credits passiert auf dem Server (lernblick-chat/-voice/-bild).
const Abo = (() => {
  const NEUES_MODELL = true;                 // false = altes Verhalten (Notbremse)
  const OFFEN = new Set(['screen-konto', 'screen-auth', 'screen-gallery', 'screen-profile', 'screen-admin', 'screen-legal', 'screen-impressum', 'screen-datenschutz', 'screen-agb']);
  const PREISE = {
    monat: { titel: 'Monatsabo', preis: '14,90 €', zusatz: 'pro Monat · monatlich kündbar', credits: 350, punkte: ['Alle Fragen und Lernwerkzeuge', 'Jede Woche neue Simulationen', 'LernBlick mit Tafel und Stimme', '350 KI-Credits pro Monat'] },
    pass: { titel: 'MedAT-Pass 2027', preis: '99 €', zusatz: 'einmalig · gültig bis zum MedAT 2027', credits: 300, punkte: ['Alles vom Monatsabo', 'Alle Simulationen sofort', '300 KI-Credits jeden Monat', 'Kein Abo, keine Kündigung nötig'] },
  };
  let stand = null, ladend = null, sperrTimer = null;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const istAdmin = () => { try { return typeof Admin !== 'undefined' && Admin.isAdmin(); } catch (e) { return false; } };
  const datum = (d) => d ? new Date(d).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  async function laden(neu) {
    if (!NEUES_MODELL || typeof Auth === 'undefined' || !Auth.isLoggedIn || !Auth.supabase) { stand = null; return null; }
    if (ladend && !neu) return ladend;
    ladend = (async () => {
      try { const { data, error } = await Auth.supabase.rpc('medat_stand'); if (!error) stand = data; } catch (e) {}
      ladend = null; pruefeSperre(); return stand;
    })();
    return ladend;
  }
  // Zugang: Admin, aktives Abo/Pass/Probe, oder alter bezahlter Zugang, der noch läuft
  function zugang() {
    if (!NEUES_MODELL) return true;
    if (istAdmin()) return true;
    if (stand && stand.aktiv) return true;
    try { const t = Auth.licenseTier; if (t && t !== 'free') return true; } catch (e) {}
    return false;
  }
  const credits = () => (stand ? (stand.monat || 0) + (stand.extra || 0) : 0);
  // Monatsabo: 2 Simulationen sofort, dann jede Woche eine weitere. Pass, Admin und Altkunden: alle.
  function simFreigabe(gesamt) {
    if (!NEUES_MODELL || istAdmin() || !stand || !stand.aktiv) return gesamt;
    if (stand.art === 'monat') return Math.min(gesamt, 2 + Math.floor((Date.now() - new Date(stand.start)) / (7 * 86400000)));
    if (stand.art === 'probe') return Math.min(gesamt, 2);
    return gesamt;
  }
  function naechsteSimAm() {
    if (!stand || stand.art !== 'monat') return null;
    const w = Math.floor((Date.now() - new Date(stand.start)) / (7 * 86400000)) + 1;
    return new Date(new Date(stand.start).getTime() + w * 7 * 86400000);
  }

  // ---------- Kauf ----------
  async function kaufen(art, knopf) {
    if (!Auth.isLoggedIn) { App.showScreen('screen-auth'); return; }
    const alt = knopf ? knopf.textContent : '';
    if (knopf) { knopf.disabled = true; knopf.textContent = 'Einen Moment …'; }
    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      const r = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/medat-checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: CONFIG.SUPABASE_ANON_KEY },
        body: JSON.stringify({ art, zurueck: location.origin + location.pathname }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || 'Das hat nicht geklappt.');
      location.href = d.url;
    } catch (e) {
      if (knopf) { knopf.disabled = false; knopf.textContent = alt; }
      (App.showToast ? App.showToast(e.message || String(e)) : alert(e.message || e));
    }
  }
  async function probeStarten(knopf) {
    if (!Auth.isLoggedIn) { App.showScreen('screen-auth'); return; }
    if (knopf) { knopf.disabled = true; knopf.textContent = 'Wird freigeschaltet …'; }
    const { data, error } = await Auth.supabase.rpc('medat_probe_starten');
    if (error || !data || !data.ok) { if (knopf) { knopf.disabled = false; knopf.textContent = '14 Tage kostenlos testen'; } App.showToast && App.showToast((data && data.grund) || 'Das hat nicht geklappt.'); return; }
    try { await Auth.loadProfile?.(); } catch (e) {}
    try { await Auth.loadProfile?.(); } catch (e) {}
    await laden(true);
    App.showToast && App.showToast('🎉 Deine 14 Tage laufen – viel Erfolg!');
    App.showScreen('screen-home');
    setTimeout(() => location.reload(), 600);
  }

  // ---------- Konto-Seite ----------
  function renderKonto(container) {
    if (!NEUES_MODELL) return false;
    const s = stand || {}, aktiv = !!s.aktiv, art = s.art;
    const alt = (() => { try { const t = Auth.licenseTier; return t && t !== 'free' && !aktiv; } catch (e) { return false; } })();
    let status = '';
    if (istAdmin()) status = '<div class="abo-status ok">🛠️ Admin-Zugang – alles frei, keine Credits nötig.</div>';
    else if (aktiv && art === 'monat') status = `<div class="abo-status ok"><b>Monatsabo aktiv</b> · ${s.kuendigt ? `gekündigt, läuft bis ${datum(s.bis)}` : `verlängert sich am ${datum(s.bis)}`}</div>`;
    else if (aktiv && art === 'pass') status = `<div class="abo-status ok"><b>MedAT-Pass aktiv</b> · gültig bis ${datum(s.bis)}</div>`;
    else if (aktiv && art === 'probe') status = `<div class="abo-status probe"><b>Probezeit</b> · noch bis ${datum(s.bis)}</div>`;
    else if (alt) status = `<div class="abo-status ok"><b>Bisheriger Zugang</b> · gültig bis ${datum(Auth.licenseExpiresAt)}</div>`;
    else status = '<div class="abo-status aus"><b>Kein aktiver Zugang</b> · wähle ein Angebot, um weiterzulernen.</div>';
    const cr = aktiv || istAdmin() ? `<div class="abo-credits"><div><b>${istAdmin() ? '∞' : credits()}</b> KI-Credits übrig</div><small>${istAdmin() ? '' : `${s.monat || 0} aus dem Monat · ${s.extra || 0} nachgekauft (verfallen nicht)`}</small></div>` : '';
    const karte = (k) => {
      const p = PREISE[k], hat = aktiv && art === k;
      const sperre = (k === 'monat' && aktiv && art === 'pass') || hat;
      return `<div class="abo-karte ${k === 'pass' ? 'abo-empfohlen' : ''}">
        ${k === 'pass' ? '<div class="abo-band">Spart 20 € gegenüber 8 Monaten Abo</div>' : ''}
        <h3>${p.titel}</h3><div class="abo-preis">${p.preis}</div><div class="abo-zusatz">${p.zusatz}</div>
        <ul>${p.punkte.map((x) => `<li>✓ ${esc(x)}</li>`).join('')}</ul>
        <button class="abo-knopf" data-kauf="${k}" ${sperre ? 'disabled' : ''}>${hat ? 'Hast du schon' : sperre ? 'Im Pass enthalten' : k === 'monat' ? 'Abo starten' : 'Pass kaufen'}</button></div>`;
    };
    const packs = aktiv && art !== 'probe' ? `<div class="abo-nachkauf"><h3>KI-Credits nachkaufen</h3><p>Für mehr Erklärungen mit Tafel und Stimme. Nachgekaufte Credits verfallen nicht.</p>
      <div class="abo-packs"><button class="abo-knopf zweit" data-kauf="credits110">110 Credits · 4,90 €</button><button class="abo-knopf zweit" data-kauf="credits230">230 Credits · 9,90 €</button></div></div>` : '';
    const probe = !aktiv && !alt && !istAdmin() && !s.hatte_probe ? `<div class="abo-probe"><b>Neu hier oder zurück?</b> Teste 14 Tage kostenlos alles, auch LernBlick mit Tafel und Stimme. <button class="abo-knopf" data-probe="1">14 Tage kostenlos testen</button></div>` : '';
    const verwalten = s.art === 'monat' || (aktiv && art === 'pass') ? `<button class="abo-link" data-portal="1">Abo, Zahlungsart und Rechnungen verwalten →</button>` : '';
    container.innerHTML = `<div class="abo-seite">
      <div class="abo-kopf"><div><div class="abo-email">${esc(Auth.currentUser?.email || '')}</div>${status}</div>${cr}</div>
      ${probe}
      <div class="abo-karten">${karte('monat')}${karte('pass')}</div>
      ${packs}
      <div class="abo-fuss">${verwalten}
        <p>Was kosten Credits? Eine Tafel-Erklärung mit Stimme etwa 5, eine Foto-Korrektur etwa 2, eine Profi-Skizze 8. Fragen, Simulationen und PDFs kosten keine Credits.</p>
        <p>PDFs: bis zu 10 pro 30 Tage, mit deinem Namen als Wasserzeichen.</p></div></div>`;
    container.querySelectorAll('[data-kauf]').forEach((b) => (b.onclick = () => kaufen(b.dataset.kauf, b)));
    container.querySelectorAll('[data-probe]').forEach((b) => (b.onclick = () => probeStarten(b)));
    container.querySelectorAll('[data-portal]').forEach((b) => (b.onclick = () => kaufen('portal', b)));
    return true;
  }

  // ---------- Ausgrauen ohne Zugang ----------
  function pruefeSperre() {
    if (!NEUES_MODELL) return;
    let el = document.getElementById('abo-sperre');
    const aktivScreen = document.querySelector('.screen.active');
    const gesperrt = typeof Auth !== 'undefined' && Auth.isLoggedIn && stand && !zugang() && aktivScreen && !OFFEN.has(aktivScreen.id);
    document.documentElement.classList.toggle('abo-gesperrt', !!gesperrt);
    if (!gesperrt) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'abo-sperre'; el.className = 'abo-sperre';
      document.body.appendChild(el);
    }
    if (!el.hidden && el.dataset.fuer === String(stand.hatte_probe)) return;
    el.dataset.fuer = String(stand.hatte_probe);
    el.innerHTML = `<div class="abo-sperre-karte"><div class="abo-sperre-icon">🔒</div><h2>Dein Zugang ist gerade nicht aktiv</h2>
      <p>Deine Fortschritte und dein Lernarchiv sind gespeichert. Mit dem Monatsabo oder dem MedAT-Pass geht's sofort weiter${stand.hatte_probe ? '' : ' – oder du testest zuerst 14 Tage kostenlos'}.</p>
      <div class="abo-sperre-knoepfe">${stand.hatte_probe ? '' : '<button class="abo-knopf" data-probe="1">14 Tage kostenlos testen</button>'}
      <button class="abo-knopf ${stand.hatte_probe ? '' : 'zweit'}" data-konto="1">Angebote ansehen</button>
      <button class="abo-link" data-archiv="1">Zum Lernarchiv</button></div></div>`;
    el.hidden = false;
    el.querySelectorAll('[data-probe]').forEach((b) => (b.onclick = () => probeStarten(b)));
    el.querySelector('[data-konto]').onclick = () => App.showScreen('screen-konto');
    el.querySelector('[data-archiv]').onclick = () => (typeof Gallery !== 'undefined' ? Gallery.open() : App.showScreen('screen-gallery'));
  }

  // ---------- Credits aufgebraucht (Antwort 402 vom Server) ----------
  function creditsLeer() {
    laden(true);
    document.getElementById('abo-leer')?.remove();
    const d = document.createElement('div'); d.id = 'abo-leer'; d.className = 'abo-sperre';
    const kannKaufen = stand && stand.aktiv && stand.art !== 'probe';
    d.innerHTML = `<div class="abo-sperre-karte"><div class="abo-sperre-icon">⚡</div><h2>Deine KI-Credits sind aufgebraucht</h2>
      <p>${kannKaufen ? 'Kauf Credits nach – sie verfallen nicht. Dein Monatsguthaben füllt sich außerdem mit dem nächsten Monat wieder auf.' : stand && stand.aktiv ? 'In der Probezeit sind 150 Credits enthalten. Mit Monatsabo oder MedAT-Pass bekommst du jeden Monat neue und kannst nachkaufen.' : 'Mit Monatsabo oder MedAT-Pass bekommst du jeden Monat neue KI-Credits.'}</p>
      <div class="abo-sperre-knoepfe">${kannKaufen ? '<button class="abo-knopf" data-kauf="credits110">110 Credits · 4,90 €</button><button class="abo-knopf" data-kauf="credits230">230 Credits · 9,90 €</button>' : '<button class="abo-knopf" data-konto="1">Angebote ansehen</button>'}
      <button class="abo-link" data-zu="1">Schließen</button></div></div>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-kauf]').forEach((b) => (b.onclick = () => kaufen(b.dataset.kauf, b)));
    d.querySelector('[data-konto]')?.addEventListener('click', () => { d.remove(); App.showScreen('screen-konto'); });
    d.querySelector('[data-zu]').onclick = () => d.remove();
  }

  // ---------- PDFs: Obergrenze und Wasserzeichen ----------
  async function pdfFreigabe(was) {
    if (!NEUES_MODELL || !Auth.isLoggedIn) return { ok: true };
    try { const { data, error } = await Auth.supabase.rpc('medat_pdf_freigabe', { p_was: String(was || 'PDF') }); if (error) return { ok: true }; return data || { ok: true }; }
    catch (e) { return { ok: true }; }
  }
  function wasserzeichen(pdf) {
    try {
      const email = Auth.currentUser?.email || '', heute = new Date().toLocaleDateString('de-AT');
      const n = pdf.getNumberOfPages(), W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
      for (let p = 1; p <= n; p++) {
        pdf.setPage(p);
        pdf.saveGraphicsState();
        if (pdf.GState) pdf.setGState(new pdf.GState({ opacity: 0.07 }));
        pdf.setFontSize(30); pdf.setTextColor(60, 60, 60);
        pdf.text(email, W / 2, H / 2, { angle: 35, align: 'center' });
        pdf.restoreGraphicsState();
        pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
        pdf.text(`Persönliche Kopie für ${email} · ${heute} · MedAT Trainer – Weitergabe nicht erlaubt`, W / 2, H - 3, { align: 'center' });
      }
    } catch (e) { console.warn('Wasserzeichen', e); }
  }
  function pdfGrenze(f) {
    const msg = `Du hast in den letzten 30 Tagen schon ${f.grenze || 10} PDFs erstellt. Ab dem nächsten Tag geht es wieder – online üben kannst du jederzeit.`;
    App.showToast ? App.showToast(msg) : alert(msg);
  }

  // ---------- Start ----------
  function init() {
    if (!NEUES_MODELL) return;
    document.documentElement.classList.add('abo-modell');
    const p = new URLSearchParams(location.search);
    if (p.get('kauf') === 'ok') {
      const u = new URL(location.href); u.searchParams.delete('kauf'); u.searchParams.delete('art'); history.replaceState(history.state, '', u.href);
      setTimeout(async () => { try { await Auth.loadProfile?.(); } catch (e) {} await laden(true); App.showToast && App.showToast('🎉 Danke! Dein Zugang ist freigeschaltet.'); }, 2500);
    }
    setTimeout(() => laden(true), 1200);
    clearInterval(sperrTimer);
    sperrTimer = setInterval(() => { if (!stand && typeof Auth !== 'undefined' && Auth.isLoggedIn) laden(); pruefeSperre(); }, 800);
    addEventListener('focus', () => laden(true));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { laden, zugang, credits, simFreigabe, naechsteSimAm, kaufen, probeStarten, renderKonto, creditsLeer, pdfFreigabe, wasserzeichen, pdfGrenze, get stand() { return stand; }, NEUES_MODELL };
})();
