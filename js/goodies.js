// === MedAT Trainer – Goodies (Cheat Sheets / Cheat Sheets / Videos) ===
// User-facing logic: list, view, claim, download goodies targeted at current user.
// Requires: Auth (auth.js), App (app.js), CONFIG (config.js)

const Goodies = {
  _cache: null,           // array of visible goodies (with claim status)
  _claimsSet: new Set(),  // goodie_ids the user has claimed

  // ===== Public entry points =====

  /** Render the full Goodies screen into #screen-goodies */
  async render() {
    const screen = document.getElementById('screen-goodies');
    if (!screen) return;

    if (!Auth.isLoggedIn || !Auth.currentUser) {
      screen.innerHTML = this._renderShell(`
        <div class="gd-empty">
          <div class="gd-empty-icon">🔒</div>
          <div class="gd-empty-title">Nicht eingeloggt</div>
          <div class="gd-empty-sub">Cheat Sheets sind nur für angemeldete User sichtbar.</div>
        </div>
      `);
      this._bindBackButtons();
      return;
    }

    screen.innerHTML = this._renderShell(`
      <div style="text-align:center;padding:3rem;color:var(--text-muted)">
        <div class="spinner"></div>
        Cheat Sheets werden geladen...
      </div>
    `);
    this._bindBackButtons();

    try {
      await this._loadGoodies();
      screen.innerHTML = this._renderShell(this._buildContent());
      this._bindBackButtons();
      this._bindCardActions();
    } catch (e) {
      console.error('[Goodies] render error:', e);
      screen.innerHTML = this._renderShell(`
        <div class="gd-empty">
          <div class="gd-empty-icon">⚠️</div>
          <div class="gd-empty-title">Fehler beim Laden</div>
          <div class="gd-empty-sub">${this._escape(e.message || 'Unbekannt')}</div>
        </div>
      `);
      this._bindBackButtons();
    }
  },

  /** Show a teaser on the home screen if there's an unclaimed active goodie.
   *  Called from App.showScreen('screen-home') / home load. */
  async showHomeBanner() {
    if (!Auth.isLoggedIn || !Auth.currentUser) return;
    const host = document.getElementById('home-goodies-teaser');
    if (!host) return;

    try {
      await this._loadGoodies();
      const unclaimed = this._cache.filter(g => !g._claimed);
      if (unclaimed.length === 0) {
        host.innerHTML = '';
        return;
      }
      const g = unclaimed[0];
      const count = unclaimed.length;
      const teaserIcon = g.cover_image_path
        ? `<img src="${this._escape(this._publicUrl(g.cover_image_path))}" alt="">`
        : this._escape(g.cover_emoji || '📚');
      host.innerHTML = `
        <div class="gd-home-teaser" onclick="App.showScreen('screen-goodies')">
          <div class="gd-home-teaser-icon">${teaserIcon}</div>
          <div class="gd-home-teaser-text">
            <div class="gd-home-teaser-eyebrow">${count > 1 ? `${count} Cheat Sheets warten` : 'Neues Cheat Sheet für dich'}</div>
            <div class="gd-home-teaser-title">${this._escape(g.title)}</div>
            <div class="gd-home-teaser-sub">${this._escape(g.description || '').slice(0, 80)}${(g.description || '').length > 80 ? '…' : ''}</div>
          </div>
          <div class="gd-home-teaser-arrow">→</div>
        </div>
      `;
    } catch (e) {
      console.warn('[Goodies] home banner load failed (non-fatal):', e);
      host.innerHTML = '';
    }
  },

  // ===== Data loading =====

  async _loadGoodies() {
    const sb = Auth.supabase;
    // RLS filters: user only sees active, in-date, audience-matching goodies
    const { data: goodies, error } = await sb
      .from('goodies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const uid = Auth.currentUser.id;
    const { data: claims, error: cErr } = await sb
      .from('goodie_claims')
      .select('goodie_id, claimed_at')
      .eq('user_id', uid);
    if (cErr) throw cErr;

    this._claimsSet = new Set((claims || []).map(c => c.goodie_id));
    const claimTimes = {};
    (claims || []).forEach(c => { claimTimes[c.goodie_id] = c.claimed_at; });

    this._cache = (goodies || []).map(g => ({
      ...g,
      _claimed: this._claimsSet.has(g.id),
      _claimedAt: claimTimes[g.id] || null,
    }));
  },

  // ===== Claim / download =====

  async claim(goodieId) {
    if (!Auth.isLoggedIn || !Auth.currentUser) {
      App.showToast?.('Bitte zuerst einloggen');
      return false;
    }
    const uid = Auth.currentUser.id;
    const { error } = await Auth.supabase
      .from('goodie_claims')
      .upsert({ goodie_id: goodieId, user_id: uid }, { onConflict: 'goodie_id,user_id' });
    if (error) {
      console.error('[Goodies] claim error:', error);
      App.showToast?.('Fehler beim Abholen');
      return false;
    }
    this._claimsSet.add(goodieId);
    const g = (this._cache || []).find(x => x.id === goodieId);
    if (g) { g._claimed = true; g._claimedAt = new Date().toISOString(); }
    return true;
  },

  /** Open viewer modal; claim on open. */
  async openGoodie(goodieId) {
    const g = (this._cache || []).find(x => x.id === goodieId);
    if (!g) return;
    if (!g._claimed) await this.claim(goodieId);
    this._showViewer(g);
    // re-render in background so the card updates to "claimed" state on close
    this.render().catch(() => {});
  },

  _showViewer(g) {
    document.querySelectorAll('.gd-modal').forEach(m => m.remove());
    const files = Array.isArray(g.files) ? g.files : [];
    const modal = document.createElement('div');
    modal.className = 'gd-modal';
    modal.innerHTML = `
      <div class="gd-modal-card" onclick="event.stopPropagation()">
        <div class="gd-modal-head">
          <div>
            <div class="gd-modal-title">${this._escape(g.cover_emoji || '🎁')} ${this._escape(g.title)}</div>
            ${g.description ? `<div style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.25rem">${this._escape(g.description)}</div>` : ''}
          </div>
          <button class="gd-modal-close" data-close>&times;</button>
        </div>
        <div class="gd-modal-body">
          ${files.length === 0 ? '<div class="gd-empty"><div class="gd-empty-sub">Keine Dateien in diesem Geschenk.</div></div>' : ''}
          ${files.map((f, i) => this._renderFileItem(f, i)).join('')}
        </div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) modal.remove();
    });
    document.body.appendChild(modal);
  },

  _renderFileItem(file, index) {
    const url = this._publicUrl(file.path);
    const type = file.type || this._guessType(file.name || '');
    const size = this._formatSize(file.size);

    if (type === 'image') {
      return `
        <div class="gd-media-preview"><img src="${this._escape(url)}" alt="${this._escape(file.name || '')}"></div>
        <div class="gd-file-item">
          <div class="gd-file-thumb">🖼</div>
          <div class="gd-file-info">
            <div class="gd-file-name">${this._escape(file.name || 'Bild')}</div>
            <div class="gd-file-size">${size}</div>
          </div>
          <div class="gd-file-actions">
            <a class="gd-icon-btn" href="${this._escape(url)}" download="${this._escape(file.name || 'bild.png')}" title="Herunterladen">⬇</a>
          </div>
        </div>
      `;
    }
    if (type === 'video') {
      return `
        <div class="gd-media-preview"><video controls preload="metadata" src="${this._escape(url)}"></video></div>
        <div class="gd-file-item">
          <div class="gd-file-thumb">🎬</div>
          <div class="gd-file-info">
            <div class="gd-file-name">${this._escape(file.name || 'Video')}</div>
            <div class="gd-file-size">${size}</div>
          </div>
          <div class="gd-file-actions">
            <a class="gd-icon-btn" href="${this._escape(url)}" download="${this._escape(file.name || 'video.mp4')}" title="Herunterladen">⬇</a>
          </div>
        </div>
      `;
    }
    if (type === 'pdf') {
      return `
        <div class="gd-file-item">
          <div class="gd-file-thumb">📄</div>
          <div class="gd-file-info">
            <div class="gd-file-name">${this._escape(file.name || 'Dokument.pdf')}</div>
            <div class="gd-file-size">${size}</div>
          </div>
          <div class="gd-file-actions">
            <a class="gd-icon-btn gd-icon-btn-ghost" href="${this._escape(url)}" target="_blank" rel="noopener" title="Öffnen">👁</a>
            <a class="gd-icon-btn" href="${this._escape(url)}" download="${this._escape(file.name || 'dokument.pdf')}" title="Herunterladen">⬇</a>
          </div>
        </div>
      `;
    }
    return `
      <div class="gd-file-item">
        <div class="gd-file-thumb">📎</div>
        <div class="gd-file-info">
          <div class="gd-file-name">${this._escape(file.name || 'Datei')}</div>
          <div class="gd-file-size">${size}</div>
        </div>
        <div class="gd-file-actions">
          <a class="gd-icon-btn" href="${this._escape(url)}" download="${this._escape(file.name || 'datei')}" title="Herunterladen">⬇</a>
        </div>
      </div>
    `;
  },

  // ===== Rendering =====

  _renderShell(innerHtml) {
    return `
      <header class="app-header">
        <button class="back-btn" data-target="screen-home">← Zurück</button>
        <h1>📚 Cheat Sheets</h1>
      </header>
      <div class="gd-screen">${innerHtml}</div>
    `;
  },

  _buildContent() {
    const all = this._cache || [];
    const unclaimed = all.filter(g => !g._claimed);
    const claimed = all.filter(g => g._claimed);

    if (all.length === 0) {
      return `
        <div class="gd-empty">
          <div class="gd-empty-icon">🎁</div>
          <div class="gd-empty-title">Noch keine Cheat Sheets</div>
          <div class="gd-empty-sub">Schau bald wieder rein — neue Goodies und Cheat Sheets warten hier auf dich.</div>
        </div>
      `;
    }

    let html = '';

    // Hero for the first unclaimed goodie
    if (unclaimed.length > 0) {
      const hero = unclaimed[0];
      const remaining = this._timeRemaining(hero.expires_at);
      html += `
        <div class="gd-hero">
          <div class="gd-hero-badge"><span class="gd-pulse"></span> Neu · Nur für dich</div>
          <div class="gd-hero-title">${this._escape(hero.cover_emoji || '🎁')} ${this._escape(hero.title)}</div>
          <div class="gd-hero-sub">${this._escape(hero.description || 'Ein kleines Dankeschön, dass du dabei bist.')}</div>
          <button class="gd-hero-cta" data-open="${this._escape(hero.id)}">
            Jetzt kostenlos holen <span>→</span>
          </button>
        </div>
      `;
    }

    // Unclaimed grid
    if (unclaimed.length > 0) {
      html += `
        <div class="gd-section-head">
          <div class="gd-section-title">Verfügbar für dich</div>
          <div class="gd-section-count">${unclaimed.length} neu</div>
        </div>
        <div class="gd-grid">
          ${unclaimed.map(g => this._cardHtml(g)).join('')}
        </div>
      `;
    }

    // Claimed
    if (claimed.length > 0) {
      html += `
        <div class="gd-section-head">
          <div class="gd-section-title">Bereits abgeholt</div>
        </div>
        <div>
          ${claimed.map(g => this._claimedRowHtml(g)).join('')}
        </div>
      `;
    }

    return html;
  },

  _cardHtml(g) {
    const files = Array.isArray(g.files) ? g.files : [];
    const remaining = this._timeRemaining(g.expires_at);
    const coverClass = `gd-cover-${g.cover_style || 'yellow-coral'}`;
    const fileLabel = files.length === 1 ? '1 Datei' : `${files.length} Dateien`;
    const coverInner = g.cover_image_path
      ? `<img class="gd-cover-img" src="${this._escape(this._publicUrl(g.cover_image_path))}" alt="">`
      : `<div class="gd-cover-emoji">${this._escape(g.cover_emoji || '📚')}</div>`;
    const isPaid = !!g.price_cents;
    const priceLabel = isPaid ? `${(g.price_cents/100).toFixed(2).replace('.', ',')} €` : null;
    const ctaButton = isPaid
      ? `<button class="gd-btn gd-btn-primary" data-buy="${this._escape(g.id)}">💳 Jetzt kaufen · ${priceLabel}</button>`
      : `<button class="gd-btn gd-btn-primary" data-open="${this._escape(g.id)}">🎁 Abholen</button>`;
    return `
      <div class="gd-card">
        <div class="gd-cover ${coverClass}">
          ${g.show_new_badge !== false ? '<div class="gd-cover-new">Neu</div>' : ''}
          <div class="gd-cover-stack">${fileLabel}</div>
          ${isPaid ? `<div class="gd-cover-price">${priceLabel}</div>` : ''}
          ${coverInner}
        </div>
        <div class="gd-body">
          <div class="gd-title">${this._escape(g.title)}</div>
          ${g.description ? `<div class="gd-desc">${this._escape(g.description)}</div>` : ''}
          <div class="gd-meta">
            <span>${fileLabel}</span>
            ${remaining ? `<span class="gd-dot"></span><span class="gd-expires">${remaining}</span>` : ''}
          </div>
          <div class="gd-actions">
            ${ctaButton}
          </div>
        </div>
      </div>
    `;
  },

  _claimedRowHtml(g) {
    const when = this._humanAgo(g._claimedAt);
    const thumbInner = g.cover_image_path
      ? `<img src="${this._escape(this._publicUrl(g.cover_image_path))}" alt="">`
      : this._escape(g.cover_emoji || '🎁');
    return `
      <div class="gd-claimed-row">
        <div class="gd-claimed-thumb">${thumbInner}</div>
        <div class="gd-claimed-info">
          <div class="gd-claimed-name">${this._escape(g.title)}</div>
          <div class="gd-claimed-time">${when ? `Abgeholt ${when}` : 'Abgeholt'}</div>
        </div>
        <button class="gd-claimed-btn" data-open="${this._escape(g.id)}" title="Erneut öffnen">⬇</button>
      </div>
    `;
  },

  // ===== Bindings =====

  _bindBackButtons() {
    const screen = document.getElementById('screen-goodies');
    if (!screen) return;
    screen.querySelectorAll('.back-btn').forEach(btn => {
      btn.onclick = () => App.showScreen(btn.dataset.target || 'screen-home');
    });
  },

  _bindCardActions() {
    const screen = document.getElementById('screen-goodies');
    if (!screen) return;
    screen.querySelectorAll('[data-open]').forEach(el => {
      el.onclick = () => this.openGoodie(el.dataset.open);
    });
    screen.querySelectorAll('[data-buy]').forEach(el => {
      el.onclick = () => this.buyGoodie(el.dataset.buy);
    });
  },

  async buyGoodie(goodieId) {
    if (!Auth.isLoggedIn || !Auth.currentUser) {
      App.showToast?.('Bitte zuerst einloggen');
      return;
    }
    App.showToast?.('Öffne Checkout…');
    try {
      const session = await Auth.supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) throw new Error('Keine Session');

      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/goodie-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ goodie_id: goodieId }),
      });
      const j = await resp.json();
      if (!resp.ok || !j.url) throw new Error(j.error || 'Checkout-Fehler');
      window.location.href = j.url;
    } catch (e) {
      console.error('[Goodies] buy failed:', e);
      App.showToast?.('Kauf-Fehler: ' + (e.message || e));
    }
  },

  // ===== Helpers =====

  _publicUrl(path) {
    if (!path) return '';
    const { data } = Auth.supabase.storage.from('goodies').getPublicUrl(path);
    return data?.publicUrl || '';
  },

  _guessType(name) {
    const n = (name || '').toLowerCase();
    if (/\.(png|jpe?g|webp|gif)$/.test(n)) return 'image';
    if (/\.(mp4|mov|webm)$/.test(n)) return 'video';
    if (/\.pdf$/.test(n)) return 'pdf';
    return 'other';
  },

  _formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  _timeRemaining(expiresAt) {
    if (!expiresAt) return '';
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return '';
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    if (d >= 2) return `⏱ Noch ${d} Tage`;
    if (h >= 2) return `⏱ Noch ${h} Stunden`;
    const m = Math.max(1, Math.floor(ms / 60000));
    return `⏱ Noch ${m} min`;
  },

  _humanAgo(iso) {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `vor ${Math.max(1, mins)} Min.`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `vor ${h} Std.`;
    const d = Math.floor(h / 24);
    if (d < 30) return `vor ${d} Tag${d === 1 ? '' : 'en'}`;
    return new Date(iso).toLocaleDateString('de-AT');
  },

  _escape(s) {
    if (s == null) return '';
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  },
};

// Expose globally (matches existing pattern: Auth, App, Admin, etc. are all globals)
window.Goodies = Goodies;
