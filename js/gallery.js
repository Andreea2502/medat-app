// === MedAT Trainer – Lernarchiv (Lernbilder + Gespräche) ===

const Gallery = {
  items: [],
  currentFilter: '',
  currentTypeFilter: '', // '' | 'image' | 'conversation'
  _currentDetailId: null,
  _loaded: false,

  // Fun loading hints while thumbnails load
  _loadingHints: [
    '🧬 Wusstest du? DNA hat ~3 Mrd. Basenpaare',
    '🫀 Das Herz schlägt ~100.000× pro Tag',
    '🧠 Dein Gehirn verbraucht ~20% der Energie',
    '🦴 Babys haben ~300 Knochen, Erwachsene 206',
    '🔬 Eine Zelle enthält ~2m DNA',
    '💉 Blut braucht ~60 Sek. für einen Kreislauf',
    '👁️ Das Auge kann ~10 Mio. Farben unterscheiden',
    '🫁 Die Lunge hat ~300 Mio. Alveolen',
    '🧪 Der Magen produziert täglich ~2L Salzsäure',
    '🦠 Im Darm leben ~39 Billionen Bakterien',
    '💪 Der Körper hat über 650 Muskeln',
    '🩸 Ein Erwachsener hat ~5 Liter Blut',
  ],

  _getRandomHint() {
    return this._loadingHints[Math.floor(Math.random() * this._loadingHints.length)];
  },

  // ─── Open gallery screen ──────────────────────────────────────────────────
  async open() {
    App._closeMenu();
    App.showScreen('screen-gallery');
    await this.load();
  },

  // ─── Load items from API ──────────────────────────────────────────────────
  async load() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    if (!this._loaded) {
      if (grid) grid.innerHTML = '<div class="gallery-loading"><span class="gallery-loading-spinner"></span>Lade Lernarchiv…</div>';
    }
    if (empty) empty.classList.add('hidden');

    try {
      // Get token with auto-refresh fallback (handles expired sessions on mobile/PWA)
      let token;
      try {
        const { data: { session } } = await Auth.supabase.auth.getSession();
        token = session?.access_token;
        if (!token) {
          const { data: refreshed } = await Auth.supabase.auth.refreshSession();
          token = refreshed?.session?.access_token;
        }
      } catch(_) {}
      if (!token) throw new Error('Bitte einloggen');

      const doFetch = (t) => fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
        headers: {
          'Authorization': `Bearer ${t}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
      });

      let resp = await doFetch(token);
      // On 401: force token refresh and retry once
      if (resp.status === 401) {
        try {
          const { data: refreshed } = await Auth.supabase.auth.refreshSession();
          const newToken = refreshed?.session?.access_token;
          if (newToken) resp = await doFetch(newToken);
        } catch(_) {}
      }

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || `Serverfehler (${resp.status})`);

      this.items = data.items || [];
      this._loaded = true;
      this._renderFilterBar();
      this._renderGrid();
    } catch (err) {
      console.error('Gallery load error:', err);
      if (grid) grid.innerHTML = `
        <div class="gallery-error">
          ❌ ${err.message}
          <button onclick="Gallery.load()" style="margin-top:0.75rem;display:block;background:var(--yellow,#f5c542);border:none;border-radius:8px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;font-size:0.85rem">
            🔄 Nochmal versuchen
          </button>
        </div>`;
    }
  },

  // ─── Filter chips ─────────────────────────────────────────────────────────
  _renderFilterBar() {
    const bar = document.getElementById('gallery-filter-bar');
    if (!bar) return;

    const images = this.items.filter(i => (i.item_type || 'image') === 'image');
    const convs = this.items.filter(i => i.item_type === 'conversation');
    const bereiche = [...new Set(this.items.map(i => i.bereich).filter(Boolean))];

    bar.innerHTML = `
      <div class="gallery-type-tabs">
        <button class="gallery-type-tab ${this.currentTypeFilter === '' ? 'active' : ''}" data-type="">
          Alle <span class="gallery-chip-count">${this.items.length}</span>
        </button>
        <button class="gallery-type-tab ${this.currentTypeFilter === 'image' ? 'active' : ''}" data-type="image">
          🖼️ Bilder <span class="gallery-chip-count">${images.length}</span>
        </button>
        <button class="gallery-type-tab ${this.currentTypeFilter === 'conversation' ? 'active' : ''}" data-type="conversation">
          💬 Gespräche <span class="gallery-chip-count">${convs.length}</span>
        </button>
      </div>
      <div class="gallery-filter-chips" id="gallery-filter-chips">
        <button class="gallery-chip ${!this.currentFilter ? 'active' : ''}" data-filter="">
          Alle Fächer
        </button>
        ${bereiche.map(b => {
          const count = this.items.filter(i => i.bereich === b).length;
          const label = b.includes(' – ') ? b.split(' – ')[1] : b;
          return `<button class="gallery-chip ${this.currentFilter === b ? 'active' : ''}" data-filter="${b}">
            ${label} <span class="gallery-chip-count">${count}</span>
          </button>`;
        }).join('')}
      </div>
    `;

    bar.querySelectorAll('.gallery-type-tab').forEach(btn => {
      btn.onclick = () => {
        this.currentTypeFilter = btn.dataset.type;
        this._renderFilterBar();
        this._renderGrid();
      };
    });
    bar.querySelectorAll('.gallery-chip').forEach(btn => {
      btn.onclick = () => {
        this.currentFilter = btn.dataset.filter;
        this._renderFilterBar();
        this._renderGrid();
      };
    });
  },

  // ─── Grid of cards ────────────────────────────────────────────────────────
  _renderGrid() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    if (!grid) return;

    let filtered = this.items;
    if (this.currentTypeFilter) {
      filtered = filtered.filter(i => (i.item_type || 'image') === this.currentTypeFilter);
    }
    if (this.currentFilter) {
      filtered = filtered.filter(i => i.bereich === this.currentFilter);
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    const STIL_EMOJI = { sketch: '✏️', comic: '💥', plastilin: '🫧', animation: '🎨', retro_pixel: '👾', neon: '🌟', kawaii: '🌸' };
    const TYPE_EMOJI = { infografik: '📊', eselsbruecke: '🎭', ablaufdiagramm: '🔄', conversation: '💬' };
    const TYPE_LABEL = { infografik: 'Infografik', eselsbruecke: 'Eselsbrücke', ablaufdiagramm: 'Ablaufdiagramm', conversation: 'Gespräch' };

    grid.innerHTML = filtered.map(item => {
      const date = new Date(item.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' });
      const isConv = item.item_type === 'conversation';
      const te = TYPE_EMOJI[item.content_type] || (isConv ? '💬' : '📊');
      const tl = TYPE_LABEL[item.content_type] || (isConv ? 'Gespräch' : 'Bild');
      const se = STIL_EMOJI[item.stil] || (isConv ? '' : '🖼️');
      const preview = (item.frage_text || item.title || '').slice(0, 70);
      const hasNotes = item.notes && item.notes.trim().length > 0;

      if (isConv) {
        let msgCount = 0;
        try { msgCount = JSON.parse(item.conversation_data || '[]').length; } catch(e) {}
        return `
          <div class="gallery-card gallery-card-conv" onclick="Gallery.openDetail('${item.id}')">
            <button class="gallery-card-delete-btn" title="Löschen" onclick="event.stopPropagation();Gallery._quickDelete('${item.id}',true)">✕</button>
            <div class="gallery-card-thumb gallery-card-thumb-conv">
              <div class="gallery-conv-preview-icon">💬</div>
              <div class="gallery-conv-preview-tutor">${item.tutor_name || 'Tutor'}</div>
              <div class="gallery-card-badge gallery-badge-conv">💬 Gespräch</div>
            </div>
            <div class="gallery-card-body">
              <div class="gallery-card-bereich">${item.bereich || 'MedAT'}</div>
              <div class="gallery-card-preview">${preview}</div>
              <div class="gallery-card-meta">
                <span>${date}</span>
                <span class="gallery-card-msg-count">${msgCount} Nachrichten</span>
                ${hasNotes ? '<span class="gallery-card-notes-dot" title="Hat Notizen">📝</span>' : ''}
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="gallery-card" onclick="Gallery.openDetail('${item.id}')">
          <button class="gallery-card-delete-btn" title="Löschen" onclick="event.stopPropagation();Gallery._quickDelete('${item.id}',false)">✕</button>
          <div class="gallery-card-thumb" data-lazy-id="${item.id}">
            ${item.image_data
              ? `<img src="data:image/png;base64,${item.image_data}" alt="${tl}" loading="lazy" class="gallery-card-img">`
              : `<div class="gallery-thumb-shimmer gallery-thumb-loading">
                  <div class="gallery-thumb-shimmer-emoji">${se || '🔬'}</div>
                  <div class="gallery-thumb-shimmer-text">${this._getRandomHint()}</div>
                </div>`
            }
            <div class="gallery-card-badge">${se} ${tl}</div>
          </div>
          <div class="gallery-card-body">
            <div class="gallery-card-bereich">${item.bereich || 'MedAT'}</div>
            <div class="gallery-card-preview">${preview}</div>
            <div class="gallery-card-meta">
              <span>${date}</span>
              ${hasNotes ? '<span class="gallery-card-notes-dot" title="Hat Notizen">📝</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Load thumbnails sequentially (3 at a time)
    this._loadThumbnails();
  },

  // ─── Load thumbnails directly (no IntersectionObserver — simpler & reliable) ──
  async _loadThumbnails() {
    const imageItems = this.items.filter(i => !i.image_data && (i.item_type || 'image') === 'image');
    if (!imageItems.length) return;

    let token;
    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      token = session?.access_token;
    } catch(_) {}
    if (!token) return;

    // Load 3 at a time
    const BATCH = 3;
    for (let i = 0; i < imageItems.length; i += BATCH) {
      const batch = imageItems.slice(i, i + BATCH);
      await Promise.allSettled(batch.map(async (item) => {
        try {
          const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image?id=${item.id}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'apikey': CONFIG.SUPABASE_ANON_KEY },
          });
          if (!resp.ok) return;
          const result = await resp.json();
          if (!result.item?.image_data) return;

          // Cache
          item.image_data = result.item.image_data;

          // Update DOM
          const thumbEl = document.querySelector(`[data-lazy-id="${item.id}"]`);
          if (thumbEl) {
            const placeholder = thumbEl.querySelector('.gallery-thumb-loading');
            if (placeholder) {
              const img = document.createElement('img');
              img.src = `data:image/png;base64,${result.item.image_data}`;
              img.alt = 'Lernbild';
              img.className = 'gallery-card-img';
              img.style.opacity = '0';
              img.style.transition = 'opacity 0.4s ease';
              img.onload = () => { img.style.opacity = '1'; };
              placeholder.replaceWith(img);
            }
          }
        } catch(e) {
          console.warn('Thumb load error:', item.id, e);
        }
      }));
    }
  },

  // ─── Detail modal ─────────────────────────────────────────────────────────
  async openDetail(id) {
    let item = this.items.find(i => i.id === id);
    if (!item) return;
    this._currentDetailId = id;

    // Lazy-load full image_data if not yet loaded
    if (!item.image_data && (item.item_type || 'image') === 'image') {
      try {
        const { data: { session } } = await Auth.supabase.auth.getSession();
        const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image?id=${id}`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': CONFIG.SUPABASE_ANON_KEY,
          },
        });
        if (resp.ok) {
          const result = await resp.json();
          if (result.item?.image_data) {
            item.image_data = result.item.image_data;
          }
        }
      } catch (e) {
        console.warn('Failed to load full image:', e);
      }
    }

    const isConv = item.item_type === 'conversation';
    const date = new Date(item.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    document.getElementById('gm-title').textContent = item.title || (isConv ? 'Gespräch' : 'Lernbild');

    if (isConv) {
      document.getElementById('gm-meta').textContent = `${item.bereich || 'MedAT'} · ${item.tutor_name || 'Tutor'} · ${date}`;
      document.getElementById('gm-question').textContent = '';

      // Show conversation, hide image
      const imgWrap = document.getElementById('gm-img-wrap');
      const convWrap = document.getElementById('gm-conversation-wrap');
      if (imgWrap) imgWrap.style.display = 'none';
      if (convWrap) {
        convWrap.style.display = 'block';
        try {
          const msgs = JSON.parse(item.conversation_data || '[]');
          convWrap.innerHTML = `
            <div class="gm-conv-scroll">
              ${msgs.map(m => `
                <div class="gm-conv-msg gm-conv-msg-${m.role}">
                  <div class="gm-conv-msg-label">${m.role === 'assistant' ? (item.tutor_name || 'Tutor') : 'Du'}</div>
                  <div class="gm-conv-msg-text">${this._escapeHtml(m.content)}</div>
                </div>
              `).join('')}
            </div>
          `;
        } catch(e) {
          convWrap.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:1rem">Gespräch konnte nicht geladen werden.</p>';
        }
      }

      // Hide download + share + scratchpad for conversations
      const dlBtn = document.getElementById('gm-download');
      const shareBtn = document.getElementById('gm-share');
      const spBtn = document.getElementById('gm-load-scratchpad');
      if (dlBtn) dlBtn.style.display = 'none';
      if (shareBtn) shareBtn.style.display = 'none';
      if (spBtn) spBtn.style.display = 'none';

    } else {
      const TYPE_LABEL = { infografik: 'Infografik', eselsbruecke: 'Eselsbrücke', ablaufdiagramm: 'Ablaufdiagramm' };
      const STIL_LABEL = { sketch: 'Skizze', comic: 'Comic', plastilin: 'Plastilin', animation: 'Aquarell', retro_pixel: 'Pixel Art', neon: 'Neon', kawaii: 'Kawaii' };
      document.getElementById('gm-meta').textContent = `${item.bereich || 'MedAT'} · ${TYPE_LABEL[item.content_type] || ''} · ${STIL_LABEL[item.stil] || ''} · ${date}`;
      document.getElementById('gm-question').textContent = item.frage_text || '';

      // Show image, hide conversation
      const imgWrap = document.getElementById('gm-img-wrap');
      const convWrap = document.getElementById('gm-conversation-wrap');
      if (convWrap) convWrap.style.display = 'none';
      if (imgWrap) imgWrap.style.display = 'block';

      const imgSrc = item.image_data ? `data:image/png;base64,${item.image_data}` : '';
      const img = document.getElementById('gm-img');
      if (img) {
        if (imgSrc) {
          img.src = imgSrc;
          img.style.display = 'block';
          img.style.cursor = 'zoom-in';
          img.onclick = () => this.openFullscreen(imgSrc, item.title || item.bereich || 'Lernbild');
        } else {
          img.style.display = 'none';
          img.onclick = null;
        }
      }

      // Show download + share + scratchpad for images
      const dlBtn = document.getElementById('gm-download');
      const shareBtn = document.getElementById('gm-share');
      const spBtn = document.getElementById('gm-load-scratchpad');
      if (dlBtn) dlBtn.style.display = '';
      if (shareBtn) shareBtn.style.display = '';
      if (spBtn) spBtn.style.display = '';

      const imgSrcForBtn = imgSrc;
      const imgTitle = `lernbild_${(item.bereich || 'medat').replace(/\s/g, '_')}_${id.slice(0, 8)}`;
      if (spBtn) {
        spBtn.onclick = () => {
          this.closeDetail();
          App.showScreen('screen-question');
          setTimeout(() => {
            if (document.getElementById('scratchpad-container')?.classList.contains('hidden')) {
              Scratchpad.toggle();
            }
            Scratchpad.importBananaImage(imgSrcForBtn);
          }, 300);
        };
      }
      if (dlBtn) {
        dlBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = imgSrcForBtn;
          a.download = `${imgTitle}.png`;
          a.click();
        };
      }
      if (shareBtn) {
        shareBtn.onclick = () => this.shareImage(imgSrcForBtn, imgTitle);
      }
    }

    // Notes
    document.getElementById('gm-notes').value = item.notes || '';

    // Wire buttons
    const saveNotesBtn = document.getElementById('gm-save-notes');
    const delBtn = document.getElementById('gm-delete');

    if (saveNotesBtn) {
      saveNotesBtn.disabled = false;
      saveNotesBtn.textContent = '💾 Notizen speichern';
      saveNotesBtn.onclick = () => this.saveNotes(id, document.getElementById('gm-notes').value);
    }
    if (delBtn) {
      delBtn.disabled = false;
      delBtn.textContent = isConv ? '🗑️ Gespräch löschen' : '🗑️ Löschen';
      delBtn.onclick = () => this.deleteItem(id, isConv);
    }

    const modal = document.getElementById('gallery-modal');
    if (modal) modal.classList.remove('hidden');
    document.getElementById('gallery-modal-close').onclick = () => this.closeDetail();
    modal.onclick = (e) => { if (e.target === modal) this.closeDetail(); };
  },

  _escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  },

  closeDetail() {
    document.getElementById('gallery-modal')?.classList.add('hidden');
    this._currentDetailId = null;
  },

  // ─── Save notes ───────────────────────────────────────────────────────────
  async saveNotes(id, notes) {
    const btn = document.getElementById('gm-save-notes');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Speichert…'; }
    try {
      const { data: { session } } = await Auth.supabase.auth.getSession();
      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ id, notes }),
      });
      if (resp.ok) {
        const item = this.items.find(i => i.id === id);
        if (item) item.notes = notes;
        if (btn) { btn.textContent = '✓ Gespeichert!'; setTimeout(() => { if (btn) { btn.textContent = '💾 Notizen speichern'; btn.disabled = false; } }, 2000); }
      } else {
        throw new Error('Fehler');
      }
    } catch (e) {
      console.error('Save notes error:', e);
      if (btn) { btn.textContent = '❌ Fehler — nochmal?'; btn.disabled = false; }
    }
  },

  // ─── Delete item (from modal) ─────────────────────────────────────────────
  async deleteItem(id, isConv) {
    const label = isConv ? 'dieses Gespräch' : 'dieses Lernbild';
    if (!confirm(`Möchtest du ${label} wirklich löschen?`)) return;
    const btn = document.getElementById('gm-delete');
    if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }
    try {
      await this._doDelete(id);
      this.closeDetail();
    } catch (e) {
      console.error('Delete error:', e);
      if (btn) { btn.textContent = '🗑️ Löschen'; btn.disabled = false; }
    }
  },

  // ─── Quick delete (from card ×) ───────────────────────────────────────────
  async _quickDelete(id, isConv) {
    const label = isConv ? 'dieses Gespräch' : 'dieses Lernbild';
    if (!confirm(`${label} wirklich löschen?`)) return;
    try {
      await this._doDelete(id);
    } catch (e) {
      console.error('Quick delete error:', e);
      App.showToast('Löschen fehlgeschlagen');
    }
  },

  // ─── Shared delete logic ──────────────────────────────────────────────────
  async _doDelete(id) {
    const { data: { session } } = await Auth.supabase.auth.getSession();
    const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/save-banana-image?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
    });
    if (!resp.ok) throw new Error('Löschen fehlgeschlagen');
    this.items = this.items.filter(i => i.id !== id);
    this._renderFilterBar();
    this._renderGrid();
  },

  // ─── Share / Download image ───────────────────────────────────────────────
  async shareImage(imgSrc, title) {
    if (!imgSrc) return;
    // Try Web Share API (works on mobile)
    if (navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(imgSrc)).blob();
        const file = new File([blob], `${title || 'lernbild'}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: title || 'Lernbild' });
          return;
        }
      } catch(e) { /* fallback to download */ }
    }
    // Fallback: download
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `${(title || 'lernbild').replace(/\s/g, '_')}.png`;
    a.click();
  },

  // ─── Open fullscreen image viewer ────────────────────────────────────────
  openFullscreen(imgSrc, title) {
    if (!imgSrc) return;
    const ov = document.createElement('div');
    ov.id = 'gallery-fullscreen';
    ov.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;gap:0.75rem';
    ov.innerHTML = `
      <div style="display:flex;gap:0.75rem;z-index:1">
        <button onclick="Gallery.shareImage('${imgSrc}','${(title||'lernbild').replace(/'/g,"\\'")}');document.getElementById('gallery-fullscreen').remove()" style="background:#f5c542;color:#1a1a2e;border:none;border-radius:10px;padding:0.5rem 1.2rem;font-weight:700;cursor:pointer;font-size:0.9rem">⬆️ Teilen / Download</button>
        <button onclick="document.getElementById('gallery-fullscreen').remove()" style="background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:10px;padding:0.5rem 1.2rem;font-weight:700;cursor:pointer;font-size:0.9rem">✕ Schließen</button>
      </div>
      <img src="${imgSrc}" style="max-width:100%;max-height:calc(100dvh - 100px);border-radius:12px;object-fit:contain" alt="${title||''}">
    `;
    ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov);
  },
};
