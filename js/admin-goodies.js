// === MedAT Trainer – Admin Goodies (Create/Edit/Delete targeted gifts) ===
// Renders inside the Admin panel tab. Requires Auth, Admin, CONFIG.

const AdminGoodies = {
  _goodies: [],
  _userCount: 0,         // total registered users (for audience preview)
  _editingId: null,
  _pendingFiles: [],     // files staged for upload during create/edit
  _uploading: false,

  async render() {
    const host = document.getElementById('agd-root');
    if (!host) return;
    if (!Admin.isAdmin()) {
      host.innerHTML = '<div class="adm-empty"><div class="adm-empty-icon">⛔</div><div class="adm-empty-title">Kein Zugriff</div></div>';
      return;
    }

    host.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)"><div class="spinner"></div>Lade Cheat Sheets…</div>';
    try {
      await this._loadAll();
      host.innerHTML = this._buildList();
      this._bindListActions();
    } catch (e) {
      console.error('[AdminGoodies] load error:', e);
      host.innerHTML = `<div class="adm-empty"><div class="adm-empty-icon">⚠️</div><div class="adm-empty-title">Fehler</div><div class="adm-empty-sub">${this._escape(e.message || '')}</div></div>`;
    }
  },

  async _loadAll() {
    const sb = Auth.supabase;
    const { data, error } = await sb
      .from('goodies_with_stats')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    this._goodies = data || [];
    this._userCount = Array.isArray(Admin._users) ? Admin._users.length : 0;
  },

  _buildList() {
    const items = this._goodies;
    const listHtml = items.length === 0
      ? `<div class="gd-empty"><div class="gd-empty-icon">🎁</div><div class="gd-empty-title">Noch keine Cheat Sheets</div><div class="gd-empty-sub">Leg dein erstes Goodie an — z.B. dein TikTok Cheat Sheet Paket.</div></div>`
      : `<div class="agd-list">${items.map(g => this._listItem(g)).join('')}</div>`;

    return `
      <div class="agd-wrap">
        <div class="agd-header">
          <div class="agd-title-group">
            <h3>🎁 Cheat Sheets & Kampagnen</h3>
            <div class="agd-subtitle">Lade Cheat Sheets, PDFs oder Videos hoch — und steuere wer sie bekommt.</div>
          </div>
          <button class="agd-btn-primary" data-action="new">+ Neues Geschenk</button>
        </div>
        ${listHtml}
      </div>
    `;
  },

  _listItem(g) {
    const now = Date.now();
    const started = !g.starts_at || new Date(g.starts_at).getTime() <= now;
    const expired = g.expires_at && new Date(g.expires_at).getTime() < now;
    let statusChip;
    if (!g.is_active) statusChip = '<span class="agd-chip">Inaktiv</span>';
    else if (expired) statusChip = '<span class="agd-chip agd-chip-expired">Abgelaufen</span>';
    else if (!started) statusChip = '<span class="agd-chip agd-chip-scheduled">Geplant</span>';
    else statusChip = '<span class="agd-chip agd-chip-active">Aktiv</span>';

    const audienceLabel = this._audienceLabel(g.audience_rule);
    const fileCount = Array.isArray(g.files) ? g.files.length : 0;
    const coverClass = `gd-cover-${g.cover_style || 'yellow-coral'}`;
    const claims = g.claim_count || 0;
    const isPaid = !!g.price_cents;
    const purchaseCount = g.purchase_count || 0;
    const revenueEur = ((g.revenue_cents || 0) / 100).toFixed(2);

    const coverInner = g.cover_image_path
      ? `<img src="${this._publicUrl(g.cover_image_path)}" alt="">`
      : this._escape(g.cover_emoji || '🎁');

    const priceChip = isPaid
      ? `<span class="agd-chip" style="background:var(--mint);color:var(--dark)">💳 ${(g.price_cents/100).toFixed(2)}€</span>`
      : `<span class="agd-chip">🎁 Kostenlos</span>`;

    return `
      <div class="agd-list-item">
        <div class="agd-list-cover ${coverClass}">${coverInner}</div>
        <div class="agd-list-info">
          <div class="agd-list-title">${this._escape(g.title)}</div>
          <div class="agd-list-meta">
            ${statusChip}
            ${priceChip}
            <span class="agd-chip">${audienceLabel}</span>
            <span>${fileCount} Datei${fileCount === 1 ? '' : 'en'}</span>
            <span>·</span>
            <span>${claims} abgeholt</span>
            ${isPaid && purchaseCount > 0 ? `<span>·</span><span style="color:var(--mint-deep);font-weight:700">💰 ${purchaseCount}× verkauft (${revenueEur}€)</span>` : ''}
            ${g.expires_at ? `<span>·</span><span>bis ${this._fmtDate(g.expires_at)}</span>` : ''}
          </div>
        </div>
        <div class="agd-list-actions">
          <button class="agd-icon-btn" data-action="stats" data-id="${this._escape(g.id)}" title="Kampagnen-Analytics">📊</button>
          <button class="agd-icon-btn" data-action="mail" data-id="${this._escape(g.id)}" title="KI-Mail komponieren">🤖</button>
          <button class="agd-icon-btn" data-action="edit" data-id="${this._escape(g.id)}" title="Bearbeiten">✎</button>
          <button class="agd-icon-btn" data-action="toggle" data-id="${this._escape(g.id)}" title="${g.is_active ? 'Deaktivieren' : 'Aktivieren'}">${g.is_active ? '◐' : '○'}</button>
          <button class="agd-icon-btn agd-icon-danger" data-action="delete" data-id="${this._escape(g.id)}" title="Löschen">🗑</button>
        </div>
      </div>
    `;
  },

  _bindListActions() {
    const host = document.getElementById('agd-root');
    if (!host) return;
    // Remove previous delegated listener if any (avoid stacking on re-render)
    if (host._agdClickHandler) host.removeEventListener('click', host._agdClickHandler);
    // Event delegation at host level — robust against DOM re-renders inside the list.
    const handler = async (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn || !host.contains(btn)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const a = btn.dataset.action;
      const id = btn.dataset.id;
      console.log('[AdminGoodies] click', { action: a, id, btn });
      try {
        if (a === 'new') this._openForm(null);
        else if (a === 'edit') this._openForm(id);
        else if (a === 'mail') {
          if (typeof GoodiesMailer === 'undefined') { App.showToast?.('GoodiesMailer nicht geladen'); return; }
          await GoodiesMailer.open(id);
        }
        else if (a === 'stats') {
          if (typeof GoodiesAnalytics === 'undefined') { App.showToast?.('GoodiesAnalytics nicht geladen'); return; }
          await GoodiesAnalytics.open(id);
        }
        else if (a === 'toggle') await this._toggleActive(id);
        else if (a === 'delete') await this._deleteGoodie(id);
      } catch (e) {
        console.error('[AdminGoodies] action error:', a, id, e);
        App.showToast?.('Fehler: ' + (e.message || e));
      }
    };
    host.addEventListener('click', handler);
    host._agdClickHandler = handler;
  },

  // ===== Create / Edit Form Modal =====

  _openForm(id) {
    this._editingId = id;
    this._pendingFiles = [];
    const existing = id ? this._goodies.find(g => g.id === id) : null;

    document.querySelectorAll('.agd-modal').forEach(m => m.remove());
    const modal = document.createElement('div');
    modal.className = 'agd-modal';
    modal.innerHTML = this._formHtml(existing);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) {
        if (this._uploading) return;
        modal.remove();
      }
    });
    document.body.appendChild(modal);
    this._bindFormEvents(modal, existing);
  },

  _formHtml(existing) {
    const e = existing || {};
    const rule = e.audience_rule || { type: 'all' };
    const ruleType = rule.type || 'all';
    const files = Array.isArray(e.files) ? e.files : [];

    const audienceOptions = [
      { value: 'all',                title: 'Alle User',                              desc: 'Jeder angemeldete User sieht und bekommt das Goodie.',                         count: this._userCount },
      { value: 'registered_between', title: 'Neue User (Kampagne)',                   desc: 'Nur User die sich in einem bestimmten Zeitraum registrieren (z.B. TikTok).',   count: null },
      { value: 'registered_before',  title: 'Bestehende User (Dankeschön-Geschenk)',  desc: 'Alle User die sich vor einem Stichtag registriert haben — ideal für Reaktivierung.', count: null },
      { value: 'registered_after',   title: 'Ab einem bestimmten Datum',              desc: 'Alle User ab diesem Datum — ohne Enddatum.',                                    count: null },
    ];

    const coverStyles = ['yellow-coral', 'mint-yellow', 'lavender-coral'];

    return `
      <div class="agd-modal-card" onclick="event.stopPropagation()">
        <div class="agd-modal-head">
          <div class="agd-modal-title">${existing ? '✎ Goodie bearbeiten' : '🎁 Neues Geschenk'}</div>
          <button class="agd-modal-close" data-close>&times;</button>
        </div>
        <div class="agd-modal-body">

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">1</span> Was verschenkst du?</div>
            <div class="agd-field">
              <label class="agd-field-label">Titel *</label>
              <input class="agd-input" id="agd-title" type="text" value="${this._escape(e.title || '')}" placeholder="z.B. MedAT Cheat Sheet Paket" required>
            </div>
            <div class="agd-field">
              <label class="agd-field-label">Beschreibung</label>
              <textarea class="agd-textarea" id="agd-desc" placeholder="Kurze Beschreibung…">${this._escape(e.description || '')}</textarea>
            </div>
            <div class="agd-field">
              <label class="agd-field-label">Cover</label>
              <div class="agd-cover-edit">
                <div class="agd-cover-preview-wrap">
                  <div class="agd-cover-preview agd-cover-${e.cover_style || 'yellow-coral'}" id="agd-cover-preview" data-path="${this._escape(e.cover_image_path || '')}">
                    ${e.cover_image_path
                      ? `<img src="${this._publicUrl(e.cover_image_path)}" alt="Cover">`
                      : `<span class="agd-cover-preview-emoji">${this._escape(e.cover_emoji || '🎁')}</span>`
                    }
                  </div>
                </div>
                <div class="agd-cover-controls">
                  <label class="agd-field-label" style="font-size:0.72rem;margin-top:0">Farbe</label>
                  <select class="agd-select" id="agd-cover-style">
                    ${coverStyles.map(cs => `<option value="${cs}" ${(e.cover_style || 'yellow-coral') === cs ? 'selected' : ''}>${this._coverLabel(cs)}</option>`).join('')}
                  </select>
                  <label class="agd-field-label" style="font-size:0.72rem;margin-top:6px">Emoji (Fallback wenn kein Bild)</label>
                  <input class="agd-input" id="agd-cover-emoji" type="text" value="${this._escape(e.cover_emoji || '🎁')}" maxlength="4" placeholder="🎁">
                  <div class="agd-cover-actions">
                    <label class="agd-cover-btn">
                      <input type="file" id="agd-cover-image-input" accept="image/png,image/jpeg,image/webp" style="position:absolute;left:-9999px">
                      📷 Eigenes Bild
                    </label>
                    <button class="agd-cover-btn agd-cover-btn-ghost" type="button" id="agd-cover-remove">Bild entfernen</button>
                  </div>
                  <div class="agd-field-hint">Quadratisches Bild, max. 5 MB. Ohne Bild wird das Emoji + Hintergrund-Gradient gezeigt.</div>
                </div>
              </div>
            </div>

            <div class="agd-field" style="margin-top:1rem">
              <label class="agd-field-label">🔑 Was ist drin? (für die KI-Mail)</label>
              <div class="agd-field-hint" style="margin-top:-2px;margin-bottom:8px">Bullet-Points für die Highlight-Box in der Mail. Der User sieht auf einen Blick ob's für ihn relevant ist.</div>
              <div class="agd-bullets" id="agd-highlights">
                ${(Array.isArray(e.content_highlights) && e.content_highlights.length > 0 ? e.content_highlights : ['']).map(h => this._bulletRowHtml(h)).join('')}
              </div>
              <button type="button" class="agd-add-bullet" id="agd-add-highlight">+ Weiteren Punkt</button>
            </div>

            <div class="agd-field">
              <label class="agd-field-label">📍 Wo findet man es in der App? (für die Mail)</label>
              <input class="agd-input" id="agd-location-hint" type="text" value="${this._escape(e.location_hint || '')}" placeholder="z.B. Öffne die App → Menü (☰) → Cheat Sheets">
              <div class="agd-field-hint">Erscheint in der Mail als grüne Hinweis-Box. Leer lassen = Standard-Text wird genutzt.</div>
            </div>
          </div>

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">2</span> Dateien</div>
            <label class="agd-upload" id="agd-upload">
              <input type="file" id="agd-file-input" multiple accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm" style="display:none">
              <div class="agd-upload-icon">📤</div>
              <div class="agd-upload-text">Dateien hier ablegen oder klicken</div>
              <div class="agd-upload-hint">Bilder, PDFs, MP4 · max. 100 MB pro Datei</div>
            </label>
            <div class="agd-files" id="agd-files">
              ${files.map((f, i) => this._fileRowHtml(f, i, 'existing')).join('')}
            </div>
          </div>

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">3</span> Für wen?</div>
            <div class="agd-radio-list" id="agd-audience">
              ${audienceOptions.map(opt => `
                <label class="agd-radio-card ${ruleType === opt.value ? 'agd-active' : ''}" data-aud="${opt.value}">
                  <input type="radio" name="agd-aud" value="${opt.value}" ${ruleType === opt.value ? 'checked' : ''}>
                  <span class="agd-radio-circle"></span>
                  <div class="agd-radio-content">
                    <div class="agd-radio-title">${this._escape(opt.title)}${opt.count !== null ? ` <span class="agd-chip">${opt.count} User</span>` : ''}</div>
                    <div class="agd-radio-desc">${this._escape(opt.desc)}</div>
                  </div>
                </label>
                ${this._audienceSubField(opt.value, rule)}
              `).join('')}
            </div>
          </div>

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">4</span> Kostenlos oder Verkauf?</div>
            <div class="agd-radio-list" id="agd-pricing">
              <label class="agd-radio-card ${!e.price_cents ? 'agd-active' : ''}" data-pricing="free">
                <input type="radio" name="agd-pricing" value="free" ${!e.price_cents ? 'checked' : ''}>
                <span class="agd-radio-circle"></span>
                <div class="agd-radio-content">
                  <div class="agd-radio-title">🎁 Kostenloses Geschenk</div>
                  <div class="agd-radio-desc">Die Audience-Regel entscheidet wer Zugriff bekommt. Empfänger sehen das Cheat Sheet automatisch in ihrem Tab.</div>
                </div>
              </label>
              <label class="agd-radio-card ${e.price_cents ? 'agd-active' : ''}" data-pricing="paid">
                <input type="radio" name="agd-pricing" value="paid" ${e.price_cents ? 'checked' : ''}>
                <span class="agd-radio-circle"></span>
                <div class="agd-radio-content">
                  <div class="agd-radio-title">💳 Zum Verkauf (via Stripe)</div>
                  <div class="agd-radio-desc">User sehen Preis und "Kaufen"-Button. Nach erfolgter Zahlung wird das Cheat Sheet automatisch freigeschaltet.</div>
                </div>
              </label>
              <div class="agd-sub-field" data-sub="paid">
                <label class="agd-field-label">Preis (EUR)</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <input class="agd-input" id="agd-price-euro" type="number" min="0.50" max="999" step="0.01"
                         value="${e.price_cents ? (e.price_cents / 100).toFixed(2) : ''}" placeholder="9,99" style="flex:1;max-width:140px">
                  <span style="color:var(--text-muted);font-size:0.875rem">€</span>
                </div>
                <div class="agd-field-hint">Min. 0,50€. Tipp: unter 10€ = hoher Conversion, 9,99€ ist der Sweet-Spot für Cheat Sheets.</div>
                ${e.price_cents ? `<div style="margin-top:8px;padding:8px 10px;background:var(--mint);border-radius:8px;font-size:12px;color:var(--dark)"><strong>ℹ️ Wichtig bei Preis-Änderung:</strong> User die bereits gekauft haben behalten Zugriff.</div>` : ''}
              </div>
            </div>
          </div>

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">5</span> Verfügbarkeit</div>
            <div class="agd-field-row">
              <div>
                <label class="agd-field-label">Ab (optional)</label>
                <input class="agd-input" id="agd-starts-at" type="datetime-local" value="${this._toLocalInput(e.starts_at)}">
              </div>
              <div>
                <label class="agd-field-label">Bis (optional)</label>
                <input class="agd-input" id="agd-expires-at" type="datetime-local" value="${this._toLocalInput(e.expires_at)}">
                <div class="agd-field-hint">Leer = unbegrenzt verfügbar</div>
              </div>
            </div>
          </div>

          <div class="agd-section">
            <div class="agd-section-label"><span class="agd-num">6</span> Benachrichtigungen</div>
            <div class="agd-toggle-row">
              <div class="agd-toggle-info">
                <div class="agd-toggle-title">🔔 In-App Banner anzeigen</div>
                <div class="agd-toggle-desc">Hero-Banner auf der Startseite bis der User das Goodie abgeholt hat.</div>
              </div>
              <button class="agd-toggle ${e.notify_in_app !== false ? 'agd-on' : ''}" data-toggle="notify_in_app" type="button"></button>
            </div>
            <div class="agd-toggle-row">
              <div class="agd-toggle-info">
                <div class="agd-toggle-title">📬 E-Mail senden</div>
                <div class="agd-toggle-desc">Markiert als "soll per Mail benachrichtigt werden" (v1: Flag, Versand folgt).</div>
              </div>
              <button class="agd-toggle ${e.notify_email === true ? 'agd-on' : ''}" data-toggle="notify_email" type="button"></button>
            </div>
            <div class="agd-toggle-row">
              <div class="agd-toggle-info">
                <div class="agd-toggle-title">✨ "Neu!" Badge</div>
                <div class="agd-toggle-desc">Badge auf der Goodie-Karte.</div>
              </div>
              <button class="agd-toggle ${e.show_new_badge !== false ? 'agd-on' : ''}" data-toggle="show_new_badge" type="button"></button>
            </div>
            <div class="agd-toggle-row">
              <div class="agd-toggle-info">
                <div class="agd-toggle-title">Aktiv / Veröffentlicht</div>
                <div class="agd-toggle-desc">Wenn aus: wird keinem User angezeigt (Draft).</div>
              </div>
              <button class="agd-toggle ${e.is_active !== false ? 'agd-on' : ''}" data-toggle="is_active" type="button"></button>
            </div>
          </div>

          <div id="agd-progress" style="display:none">
            <div style="font-size:0.8125rem;margin-bottom:0.25rem">Upload läuft…</div>
            <div class="agd-progress-bar"><div class="agd-progress-bar-fill" id="agd-progress-fill" style="width:0%"></div></div>
          </div>

        </div>
        <div class="agd-modal-foot">
          <button class="agd-btn-ghost" data-close>Abbrechen</button>
          <button class="agd-btn-primary" id="agd-save">${existing ? 'Änderungen speichern' : '🚀 Veröffentlichen'}</button>
        </div>
      </div>
    `;
  },

  _audienceSubField(type, rule) {
    if (type === 'registered_between') {
      return `
        <div class="agd-sub-field" data-sub="registered_between">
          <div class="agd-field-row">
            <div>
              <label class="agd-field-label">Registriert ab</label>
              <input class="agd-input" id="agd-aud-from" type="datetime-local" value="${this._toLocalInput(rule.from)}">
            </div>
            <div>
              <label class="agd-field-label">Registriert bis</label>
              <input class="agd-input" id="agd-aud-to" type="datetime-local" value="${this._toLocalInput(rule.to)}">
            </div>
          </div>
        </div>
      `;
    }
    if (type === 'registered_before') {
      return `
        <div class="agd-sub-field" data-sub="registered_before">
          <label class="agd-field-label">Registriert vor</label>
          <input class="agd-input" id="agd-aud-until" type="datetime-local" value="${this._toLocalInput(rule.until)}">
        </div>
      `;
    }
    if (type === 'registered_after') {
      return `
        <div class="agd-sub-field" data-sub="registered_after">
          <label class="agd-field-label">Registriert ab</label>
          <input class="agd-input" id="agd-aud-from" type="datetime-local" value="${this._toLocalInput(rule.from)}">
        </div>
      `;
    }
    return '';
  },

  _fileRowHtml(f, index, source) {
    const icon = this._fileIcon(f);
    return `
      <div class="agd-file" data-source="${source}" data-index="${index}">
        <div class="agd-file-icon">${icon}</div>
        <div class="agd-file-info">
          <div class="agd-file-name">${this._escape(f.name || 'Datei')}</div>
          <div class="agd-file-size">${this._formatSize(f.size)}</div>
        </div>
        <button class="agd-file-remove" data-remove="${source}:${index}" type="button">×</button>
      </div>
    `;
  },

  _bulletRowHtml(value) {
    return `
      <div class="agd-bullet-row">
        <span class="agd-bullet-drag">⋮⋮</span>
        <input class="agd-input agd-bullet-input" type="text" value="${this._escape(value || '')}" placeholder="z.B. AB0-Blutgruppensystem inkl. Rhesusfaktor">
        <button class="agd-bullet-rm" type="button" data-rm-bullet title="Entfernen">×</button>
      </div>
    `;
  },

  _readHighlights(modal) {
    const inputs = modal.querySelectorAll('#agd-highlights .agd-bullet-input');
    const out = [];
    inputs.forEach(i => {
      const v = (i.value || '').trim();
      if (v) out.push(v);
    });
    return out;
  },

  _publicUrl(path) {
    if (!path) return '';
    const { data } = Auth.supabase.storage.from('goodies').getPublicUrl(path);
    return data?.publicUrl || '';
  },

  async _uploadCoverImage(modal, file, existing) {
    const preview = modal.querySelector('#agd-cover-preview');
    const oldPath = preview?.dataset.path || '';
    preview.innerHTML = '<div class="spinner"></div>';

    const safeName = (file.name || 'cover').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `covers/${crypto.randomUUID()}_${safeName}`;

    try {
      const { error } = await Auth.supabase.storage.from('goodies').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (error) throw error;
      preview.dataset.path = path;
      this._refreshCoverPreview(modal);

      // Best-effort cleanup of old cover (if user is replacing one)
      if (oldPath && oldPath !== path) {
        Auth.supabase.storage.from('goodies').remove([oldPath]).catch(() => {});
      }
      App.showToast?.('Cover hochgeladen ✓');
    } catch (e) {
      console.error('[AdminGoodies] cover upload failed:', e);
      App.showToast?.('Upload-Fehler: ' + (e.message || 'Unbekannt'));
      preview.dataset.path = oldPath;
      this._refreshCoverPreview(modal);
    }
  },

  _refreshCoverPreview(modal) {
    const preview = modal.querySelector('#agd-cover-preview');
    if (!preview) return;
    const path = preview.dataset.path;
    const emoji = modal.querySelector('#agd-cover-emoji')?.value || '🎁';
    if (path) {
      preview.innerHTML = `<img src="${this._publicUrl(path)}" alt="Cover">`;
    } else {
      preview.innerHTML = `<span class="agd-cover-preview-emoji">${this._escape(emoji)}</span>`;
    }
  },

  _bindFormEvents(modal, existing) {
    // File upload
    // NOTE: we intentionally do NOT attach a click listener to the label —
    // the native <label> → <input type="file"> relationship opens the picker
    // automatically (works on mobile, works on first click).
    // The old uploadBox.addEventListener('click',...) caused:
    //   - double-trigger on desktop (first click swallowed)
    //   - total block on mobile (programmatic .click() on file inputs is blocked by Safari/Chrome mobile)
    const uploadBox = modal.querySelector('#agd-upload');
    const fileInput = modal.querySelector('#agd-file-input');

    ['dragover','dragenter'].forEach(evt => uploadBox.addEventListener(evt, (e) => {
      e.preventDefault(); uploadBox.classList.add('dragover');
    }));
    ['dragleave','drop'].forEach(evt => uploadBox.addEventListener(evt, (e) => {
      e.preventDefault(); uploadBox.classList.remove('dragover');
    }));
    uploadBox.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer?.files || []);
      this._addPendingFiles(files, modal, existing);
    });
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      this._addPendingFiles(files, modal, existing);
      fileInput.value = '';
    });

    // Cover image upload (separate small picker)
    const coverInput = modal.querySelector('#agd-cover-image-input');
    coverInput?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { App.showToast?.('Cover max. 5 MB'); coverInput.value = ''; return; }
      await this._uploadCoverImage(modal, f, existing);
      coverInput.value = '';
    });
    modal.querySelector('#agd-cover-remove')?.addEventListener('click', () => {
      const preview = modal.querySelector('#agd-cover-preview');
      const oldPath = preview?.dataset.path || '';
      if (preview) preview.dataset.path = '';
      this._refreshCoverPreview(modal);
      if (oldPath) {
        Auth.supabase.storage.from('goodies').remove([oldPath]).catch(() => {});
      }
    });
    modal.querySelector('#agd-cover-emoji')?.addEventListener('input', () => this._refreshCoverPreview(modal));
    modal.querySelector('#agd-cover-style')?.addEventListener('change', (ev) => {
      const preview = modal.querySelector('#agd-cover-preview');
      if (!preview) return;
      preview.classList.remove('agd-cover-yellow-coral', 'agd-cover-mint-yellow', 'agd-cover-lavender-coral');
      preview.classList.add(`agd-cover-${ev.target.value}`);
    });

    // Remove file buttons (delegate, since list can re-render)
    modal.querySelector('#agd-files').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      const [source, idxStr] = btn.dataset.remove.split(':');
      const idx = parseInt(idxStr, 10);
      if (source === 'pending') {
        this._pendingFiles.splice(idx, 1);
      } else if (source === 'existing' && existing) {
        existing.files = (existing.files || []).filter((_, i) => i !== idx);
      }
      this._refreshFileList(modal, existing);
    });

    // Content-highlights bullet editor
    const highlightsHost = modal.querySelector('#agd-highlights');
    const addHighlightBtn = modal.querySelector('#agd-add-highlight');
    addHighlightBtn?.addEventListener('click', () => {
      highlightsHost.insertAdjacentHTML('beforeend', this._bulletRowHtml(''));
      highlightsHost.lastElementChild?.querySelector('input')?.focus();
    });
    highlightsHost?.addEventListener('click', (ev) => {
      const rm = ev.target.closest('[data-rm-bullet]');
      if (!rm) return;
      const row = rm.closest('.agd-bullet-row');
      if (row) row.remove();
    });

    // Pricing radio cards (separate from audience so they toggle independently)
    modal.querySelectorAll('#agd-pricing .agd-radio-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('#agd-pricing .agd-radio-card').forEach(c => c.classList.remove('agd-active'));
        card.classList.add('agd-active');
        const input = card.querySelector('input');
        if (input) input.checked = true;
      });
    });

    // Audience radio cards (scope to audience container so pricing radios don't collide)
    modal.querySelectorAll('#agd-audience .agd-radio-card').forEach(card => {
      card.addEventListener('click', () => {
        modal.querySelectorAll('#agd-audience .agd-radio-card').forEach(c => c.classList.remove('agd-active'));
        card.classList.add('agd-active');
        const input = card.querySelector('input');
        if (input) input.checked = true;
      });
    });

    // Toggles
    modal.querySelectorAll('[data-toggle]').forEach(t => {
      t.addEventListener('click', () => t.classList.toggle('agd-on'));
    });

    // Save button
    modal.querySelector('#agd-save').addEventListener('click', () => this._save(modal, existing));
  },

  _addPendingFiles(files, modal, existing) {
    const MAX = 100 * 1024 * 1024;
    files.forEach(f => {
      if (f.size > MAX) {
        App.showToast?.(`"${f.name}" ist zu groß (>100 MB)`);
        return;
      }
      this._pendingFiles.push(f);
    });
    this._refreshFileList(modal, existing);
  },

  _refreshFileList(modal, existing) {
    const host = modal.querySelector('#agd-files');
    const existingFiles = existing && Array.isArray(existing.files) ? existing.files : [];
    const existingHtml = existingFiles.map((f, i) => this._fileRowHtml(f, i, 'existing')).join('');
    const pendingHtml = this._pendingFiles.map((f, i) => this._fileRowHtml({ name: f.name, size: f.size }, i, 'pending')).join('');
    host.innerHTML = existingHtml + pendingHtml;
  },

  // ===== Save / Delete =====

  async _save(modal, existing) {
    if (this._uploading) return;
    const saveBtn = modal.querySelector('#agd-save');
    saveBtn.disabled = true;
    this._uploading = true;

    try {
      const title = modal.querySelector('#agd-title').value.trim();
      if (!title) { App.showToast?.('Titel ist Pflicht'); saveBtn.disabled = false; this._uploading = false; return; }
      const description = modal.querySelector('#agd-desc').value.trim();
      const cover_style = modal.querySelector('#agd-cover-style').value;
      const cover_emoji = modal.querySelector('#agd-cover-emoji').value.trim() || '🎁';
      const starts_at = this._fromLocalInput(modal.querySelector('#agd-starts-at').value);
      const expires_at = this._fromLocalInput(modal.querySelector('#agd-expires-at').value);

      // Audience rule
      const selected = modal.querySelector('.agd-radio-card.agd-active')?.dataset.aud || 'all';
      let audience_rule;
      if (selected === 'registered_between') {
        const from = this._fromLocalInput(modal.querySelector('#agd-aud-from')?.value);
        const to = this._fromLocalInput(modal.querySelector('#agd-aud-to')?.value);
        if (!from || !to) { App.showToast?.('Bitte Zeitraum ausfüllen'); saveBtn.disabled = false; this._uploading = false; return; }
        audience_rule = { type: 'registered_between', from, to };
      } else if (selected === 'registered_before') {
        const until = this._fromLocalInput(modal.querySelector('#agd-aud-until')?.value);
        if (!until) { App.showToast?.('Bitte Stichtag ausfüllen'); saveBtn.disabled = false; this._uploading = false; return; }
        audience_rule = { type: 'registered_before', until };
      } else if (selected === 'registered_after') {
        const from = this._fromLocalInput(modal.querySelector('.agd-sub-field[data-sub="registered_after"] #agd-aud-from')?.value);
        if (!from) { App.showToast?.('Bitte Startdatum ausfüllen'); saveBtn.disabled = false; this._uploading = false; return; }
        audience_rule = { type: 'registered_after', from };
      } else {
        audience_rule = { type: 'all' };
      }

      // Toggles
      const readToggle = (name) => modal.querySelector(`[data-toggle="${name}"]`)?.classList.contains('agd-on') || false;
      const notify_in_app = readToggle('notify_in_app');
      const notify_email  = readToggle('notify_email');
      const show_new_badge = readToggle('show_new_badge');
      const is_active      = readToggle('is_active');

      // Upload pending files
      const progress = modal.querySelector('#agd-progress');
      const progFill = modal.querySelector('#agd-progress-fill');
      const newFileRecords = [];
      if (this._pendingFiles.length > 0) {
        progress.style.display = '';
        for (let i = 0; i < this._pendingFiles.length; i++) {
          const f = this._pendingFiles[i];
          const safeName = f.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const path = `${crypto.randomUUID()}_${safeName}`;
          const { error: upErr } = await Auth.supabase.storage
            .from('goodies')
            .upload(path, f, { contentType: f.type || 'application/octet-stream', upsert: false });
          if (upErr) throw new Error(`Upload "${f.name}": ${upErr.message}`);
          newFileRecords.push({
            path, name: f.name, size: f.size,
            type: this._guessType(f.name), mime: f.type || '',
          });
          progFill.style.width = `${Math.round(((i + 1) / this._pendingFiles.length) * 100)}%`;
        }
      }

      // Combine with existing files (minus removed)
      const existingFiles = existing && Array.isArray(existing.files) ? existing.files : [];
      const files = [...existingFiles, ...newFileRecords];

      // New AI-mail related fields
      const content_highlights = this._readHighlights(modal);
      const location_hint = modal.querySelector('#agd-location-hint')?.value?.trim() || null;
      const cover_image_path = modal.querySelector('#agd-cover-preview')?.dataset.path || null;

      // Pricing (free gift vs. paid via Stripe)
      const pricingChoice = modal.querySelector('#agd-pricing .agd-radio-card.agd-active')?.dataset.pricing || 'free';
      let price_cents = null;
      if (pricingChoice === 'paid') {
        const priceEuro = parseFloat((modal.querySelector('#agd-price-euro')?.value || '').replace(',', '.'));
        if (!priceEuro || priceEuro < 0.50) {
          App.showToast?.('Preis muss mindestens 0,50€ sein');
          saveBtn.disabled = false; this._uploading = false; return;
        }
        price_cents = Math.round(priceEuro * 100);
      }

      const payload = {
        title, description, cover_style, cover_emoji,
        cover_image_path,
        files, audience_rule, starts_at, expires_at,
        notify_in_app, notify_email, show_new_badge, is_active,
        content_highlights, location_hint,
        price_cents, currency: 'EUR',
      };

      let savedGoodieId = existing?.id || null;
      if (existing) {
        const { error } = await Auth.supabase.from('goodies').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        payload.created_by = Auth.currentUser?.id || null;
        const { data: ins, error } = await Auth.supabase.from('goodies').insert(payload).select('id').single();
        if (error) throw error;
        savedGoodieId = ins?.id || null;
      }

      // Cleanup removed existing-files from storage (best-effort)
      if (existing && Array.isArray(existing.files)) {
        const oldPaths = existing.files.map(f => f.path);
        const keptPaths = new Set(files.map(f => f.path));
        const removed = oldPaths.filter(p => !keptPaths.has(p));
        if (removed.length > 0) {
          try { await Auth.supabase.storage.from('goodies').remove(removed); }
          catch (e) { console.warn('[AdminGoodies] cleanup of removed files failed (non-fatal):', e); }
        }
      }

      App.showToast?.(existing ? 'Gespeichert ✓' : 'Veröffentlicht 🎉');
      modal.remove();
      this._pendingFiles = [];
      this._uploading = false;
      await this.render();

      // If email-notification is on, warn the user EXPLICITLY that the mail hasn't been sent yet
      // and auto-open the AI composer so they can't miss it.
      if (notify_email && savedGoodieId && typeof GoodiesMailer !== 'undefined') {
        setTimeout(() => {
          alert('📬 WICHTIG — Mail muss noch gesendet werden!\n\nDu hast "E-Mail senden" aktiviert, aber es geht keine Mail automatisch raus.\n\nJetzt öffnet sich der KI-Mail-Komponist. Dort musst du:\n1. Kurz beschreiben was die Mail sagen soll\n2. Auf "Generieren" klicken\n3. Auf "Jetzt senden" oder "Geplant" klicken\n\nWenn du das Fenster schließt ohne zu senden, geht KEINE Mail raus.');
          GoodiesMailer.open(savedGoodieId);
        }, 300);
      }
    } catch (e) {
      console.error('[AdminGoodies] save failed:', e);
      App.showToast?.('Fehler: ' + (e.message || 'Unbekannt'));
      saveBtn.disabled = false;
      this._uploading = false;
    }
  },

  async _toggleActive(id) {
    const g = this._goodies.find(x => x.id === id);
    if (!g) return;
    const { error } = await Auth.supabase.from('goodies').update({ is_active: !g.is_active }).eq('id', id);
    if (error) { App.showToast?.('Fehler: ' + error.message); return; }
    App.showToast?.(g.is_active ? 'Deaktiviert' : 'Aktiviert');
    await this.render();
  },

  async _deleteGoodie(id) {
    const g = this._goodies.find(x => x.id === id);
    if (!g) return;
    if (!confirm(`"${g.title}" wirklich löschen? Alle hochgeladenen Dateien und Abhol-Datensätze werden ebenfalls gelöscht.`)) return;

    // Delete DB row first (claims cascade via FK)
    const { error } = await Auth.supabase.from('goodies').delete().eq('id', id);
    if (error) { App.showToast?.('Fehler: ' + error.message); return; }

    // Best-effort storage cleanup
    const paths = (g.files || []).map(f => f.path).filter(Boolean);
    if (paths.length > 0) {
      try { await Auth.supabase.storage.from('goodies').remove(paths); }
      catch (e) { console.warn('[AdminGoodies] storage cleanup failed (non-fatal):', e); }
    }

    App.showToast?.('Gelöscht');
    await this.render();
  },

  // ===== Helpers =====

  _audienceLabel(rule) {
    if (!rule) return 'Alle User';
    const t = rule.type;
    if (t === 'all') return 'Alle User';
    if (t === 'registered_between') return `Kampagne ${this._fmtDateShort(rule.from)} – ${this._fmtDateShort(rule.to)}`;
    if (t === 'registered_before') return `Bestehend (vor ${this._fmtDateShort(rule.until)})`;
    if (t === 'registered_after') return `Neu (ab ${this._fmtDateShort(rule.from)})`;
    return t;
  },

  _coverLabel(cs) {
    return ({
      'yellow-coral':   '🎨 Gelb / Coral',
      'mint-yellow':    '🌿 Mint / Gelb',
      'lavender-coral': '💜 Lavendel / Coral',
    })[cs] || cs;
  },

  _fileIcon(f) {
    const t = f.type || this._guessType(f.name || '');
    if (t === 'image') return '🖼';
    if (t === 'video') return '🎬';
    if (t === 'pdf') return '📄';
    return '📎';
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

  _fmtDate(iso) { return iso ? new Date(iso).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' }) : ''; },
  _fmtDateShort(iso) { return iso ? new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }) : ''; },

  _toLocalInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  _fromLocalInput(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  },

  _escape(s) {
    if (s == null) return '';
    return String(s)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  },
};

window.AdminGoodies = AdminGoodies;
