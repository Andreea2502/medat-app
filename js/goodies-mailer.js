// === MedAT Trainer – Goodies AI Mail Composer ===
// Admin-only. Opens a chat-style modal to compose Goodie campaign emails with Claude.
// Flow: open → describe in chat → AI generates → preview → test-send → save campaign → broadcast.

const GoodiesMailer = {
  _state: null,  // { goodie, draft, campaignId, chatLog }

  async open(goodieId) {
    if (!Admin || !Admin.isAdmin()) {
      App.showToast?.('Nur für Admins');
      return;
    }
    // Defensive: reject invalid goodie IDs (UUID should be 36 chars)
    if (!goodieId || typeof goodieId !== 'string' || goodieId.length < 10) {
      console.error('[GoodiesMailer] invalid goodieId:', goodieId);
      App.showToast?.('Cheat Sheet wurde noch nicht gespeichert — bitte erst "Veröffentlichen"');
      return;
    }

    // Load goodie fresh (so content_highlights etc. are current)
    const { data: goodie, error } = await Auth.supabase
      .from('goodies').select('*').eq('id', goodieId).single();
    if (error || !goodie) {
      App.showToast?.('Cheat Sheet nicht gefunden: ' + (error?.message || ''));
      return;
    }

    this._state = {
      goodie,
      draft: null,
      campaignId: null,
      chatLog: [],
    };

    this._render();
  },

  close() {
    document.body.style.overflow = '';
    document.querySelectorAll('.gm-modal').forEach(m => m.remove());
    this._state = null;
  },

  _render() {
    // Remove any previous modal WITHOUT clearing state (close() would null _state).
    document.body.style.overflow = 'hidden';
    document.querySelectorAll('.gm-modal').forEach(m => m.remove());
    if (!this._state || !this._state.goodie) {
      console.error('[GoodiesMailer] _render called without state');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'gm-modal';
    modal.innerHTML = this._shellHtml();
    // Tap on backdrop closes (mobile UX), but inner card click stops propagation
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });
    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
    this._bind(modal);
  },

  _shellHtml() {
    const g = this._state.goodie;
    const highlights = Array.isArray(g.content_highlights) ? g.content_highlights : [];
    const hasHighlights = highlights.length > 0;

    return `
      <div class="gm-card" onclick="event.stopPropagation()">
        <div class="gm-head">
          <div>
            <div class="gm-breadcrumb">Cheat Sheets › <strong>${this._escape(g.title)}</strong> › KI-Mail</div>
            <div class="gm-title">🤖 KI-Mail-Komponist</div>
          </div>
          <button class="gm-close" data-close>&times;</button>
        </div>

        ${!hasHighlights ? `
          <div class="gm-warn">
            <strong>💡 Tipp:</strong> Dieses Goodie hat keine <em>"Was ist drin"-Punkte</em>.
            Die Mail wird besser wenn du zurückgehst, das Goodie editierst und 3–5 Bullet-Points hinzufügst
            (z.B. "AB0-System", "Mitose vs. Meiose"). Du kannst aber auch ohne weitermachen.
          </div>
        ` : ''}

        <div class="gm-body">
          <!-- LEFT: chat + controls -->
          <div class="gm-left">

            <!-- Chat -->
            <div class="gm-chat" id="gm-chat">
              <div class="gm-msg gm-msg-ai">
                <strong>Hi! 👋</strong> Beschreib mir in ein paar Sätzen was die Mail rüberbringen soll — Ton, Anlass, Schwerpunkt. Ich bau sie dir im MedAT-Trainer-Brand-Stil, du kannst sie danach beliebig anpassen lassen.
              </div>
            </div>

            <!-- Input -->
            <div class="gm-input-row">
              <textarea class="gm-input" id="gm-prompt" placeholder="z.B. Schreib eine warme Danke-Mail an unsere bestehenden User. Cheat Sheet ist unser Geschenk, nicht zu werblich, mit Hinweis aufs Ablaufdatum."></textarea>
              <button class="gm-send" id="gm-send">✨ Generieren</button>
            </div>

            <!-- Presets (visible after first generation) -->
            <div class="gm-presets" id="gm-presets" style="display:none">
              <span class="gm-presets-label">Schnell anpassen:</span>
              <button class="gm-preset" data-preset="shorter">✏️ Kürzer</button>
              <button class="gm-preset" data-preset="urgent">🔥 Dringlicher</button>
              <button class="gm-preset" data-preset="personal">💝 Persönlicher</button>
              <button class="gm-preset" data-preset="formal">🎓 Sachlicher</button>
              <button class="gm-preset" data-preset="casual">😄 Lockerer</button>
            </div>

            <!-- Audience preview (only after generation) -->
            <div class="gm-audience-box" id="gm-audience" style="display:none"></div>

            <!-- Subject editor (only after generation) -->
            <div class="gm-subject-box" id="gm-subject-box" style="display:none">
              <label class="gm-label">Betreff (bearbeitbar)</label>
              <input class="gm-subject" id="gm-subject" type="text" placeholder="Betreff">
              <label class="gm-label" style="margin-top:8px">Preheader</label>
              <input class="gm-subject" id="gm-preheader" type="text" placeholder="Vorschau-Text im Posteingang">
            </div>

            <!-- Schedule picker (only after generation) -->
            <div class="gm-schedule-box" id="gm-schedule-box" style="display:none">
              <label class="gm-label">Wann soll die Mail raus?</label>
              <div class="gm-schedule-row">
                <label class="gm-schedule-opt gm-schedule-opt-active" data-sched="now">
                  <input type="radio" name="gm-sched" value="now" checked style="display:none">
                  <span class="gm-schedule-icon">🚀</span>
                  <span class="gm-schedule-title">Sofort</span>
                </label>
                <label class="gm-schedule-opt" data-sched="scheduled">
                  <input type="radio" name="gm-sched" value="scheduled" style="display:none">
                  <span class="gm-schedule-icon">⏰</span>
                  <span class="gm-schedule-title">Geplant</span>
                </label>
              </div>
              <div class="gm-schedule-datetime" id="gm-schedule-datetime" style="display:none">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                  <input class="gm-subject" id="gm-sched-date" type="date">
                  <input class="gm-subject" id="gm-sched-time" type="time" value="09:00">
                </div>
                <div class="gm-schedule-hint" id="gm-schedule-hint">💡 Dienstag 9:00 hat erfahrungsgemäß die höchste Open-Rate.</div>
              </div>
            </div>
          </div>

          <!-- RIGHT: live preview -->
          <div class="gm-right">
            <div class="gm-preview-head">
              <span class="gm-preview-label">📬 Live-Vorschau</span>
              <span class="gm-preview-hint" id="gm-preview-hint">— Generiere eine Mail, um die Vorschau zu sehen —</span>
            </div>
            <div class="gm-preview-frame" id="gm-preview-frame">
              <div class="gm-preview-empty">
                <div style="font-size:42px;opacity:0.3;margin-bottom:8px">📭</div>
                <div>Noch kein Entwurf</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Beschreibe links was du willst →</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="gm-foot">
          <div class="gm-foot-left">
            <span style="font-size:12px;color:var(--text-muted)">Modell: <code>claude-sonnet-4-6</code></span>
          </div>
          <div class="gm-foot-right">
            <button class="gm-btn gm-btn-ghost" data-close>Schließen</button>
            <button class="gm-btn gm-btn-secondary" id="gm-test-btn" disabled>📧 Test an mich</button>
            <button class="gm-btn gm-btn-primary" id="gm-send-btn" disabled>🚀 Senden…</button>
          </div>
        </div>
      </div>
    `;
  },

  _bind(modal) {
    modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => this.close()));

    // Esc to close
    this._keyHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._keyHandler, { once: true });

    modal.querySelector('#gm-send').addEventListener('click', () => this._generate(modal));
    modal.querySelectorAll('.gm-preset').forEach(btn => {
      btn.addEventListener('click', () => this._generate(modal, btn.dataset.preset));
    });

    modal.querySelector('#gm-test-btn').addEventListener('click', () => this._testSend(modal));
    modal.querySelector('#gm-send-btn').addEventListener('click', () => this._broadcast(modal));

    // Schedule picker
    modal.querySelectorAll('.gm-schedule-opt').forEach(el => {
      el.addEventListener('click', () => {
        modal.querySelectorAll('.gm-schedule-opt').forEach(o => o.classList.remove('gm-schedule-opt-active'));
        el.classList.add('gm-schedule-opt-active');
        const isScheduled = el.dataset.sched === 'scheduled';
        const box = modal.querySelector('#gm-schedule-datetime');
        box.style.display = isScheduled ? '' : 'none';
        // Update send-button label based on choice
        const sendBtn = modal.querySelector('#gm-send-btn');
        sendBtn.textContent = isScheduled ? '⏰ Planen…' : '🚀 Jetzt senden…';
      });
    });
    // Default date: tomorrow 09:00
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    modal.querySelector('#gm-sched-date').value = tomorrow.toISOString().slice(0, 10);

    // Keep draft subject/preheader in sync with state
    modal.querySelector('#gm-subject').addEventListener('input', (e) => {
      if (this._state?.draft) this._state.draft.subject = e.target.value;
    });
    modal.querySelector('#gm-preheader').addEventListener('input', (e) => {
      if (this._state?.draft) this._state.draft.preheader = e.target.value;
    });
  },

  // ===== Generate (call Claude edge function) =====

  async _generate(modal, preset = null) {
    const g = this._state.goodie;
    const promptEl = modal.querySelector('#gm-prompt');
    const brief = (promptEl.value || '').trim();
    const isFirstCall = !this._state.draft;

    if (isFirstCall && !brief && !preset) {
      App.showToast?.('Bitte kurz beschreiben was die Mail sagen soll');
      return;
    }

    // Add user message to chat
    if (brief || preset) {
      const label = preset ? `(Preset: ${this._presetLabel(preset)})${brief ? ' — ' + brief : ''}` : brief;
      this._appendChat('user', label);
      promptEl.value = '';
    }

    // Loading state
    const sendBtn = modal.querySelector('#gm-send');
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Claude denkt...';
    this._appendChat('ai', '<em>⏳ Generiere…</em>', { pending: true });

    try {
      const result = await this._callEdgeFunction('generate-goodie-email', {
        goodie_id: g.id,
        brief,
        preset: preset || null,
        existing_subject: this._state.draft?.subject || null,
        existing_body_html: this._state.draft?.body_html || null,
      });

      this._state.draft = {
        subject: result.subject,
        preheader: result.preheader || '',
        body_html: result.body_html,
        body_text: result.body_text || '',
        ai_model: result.ai_model,
        ai_brief: brief,
      };

      // Replace pending chat message with success
      this._replaceLastPendingChat(`<strong>Entwurf ${isFirstCall ? 'erstellt' : 'überarbeitet'} ✓</strong><br>Betreff: <em>"${this._escape(result.subject)}"</em><br><span style="color:var(--mint-deep)">👉 Schau rechts in die Vorschau.</span>`);

      // Fill subject/preheader inputs
      modal.querySelector('#gm-subject').value = result.subject;
      modal.querySelector('#gm-preheader').value = result.preheader || '';

      // Reveal the post-generation UI
      modal.querySelector('#gm-presets').style.display = '';
      modal.querySelector('#gm-subject-box').style.display = '';
      modal.querySelector('#gm-schedule-box').style.display = '';
      modal.querySelector('#gm-test-btn').disabled = false;
      modal.querySelector('#gm-send-btn').disabled = false;

      // Render preview
      this._renderPreview(modal);

      // Load & render audience preview (once)
      if (!this._audienceLoaded) {
        this._audienceLoaded = true;
        this._renderAudience(modal).catch(e => console.warn('[GoodiesMailer] audience preview failed:', e));
      }

    } catch (e) {
      console.error('[GoodiesMailer] generate error:', e);
      this._replaceLastPendingChat(`<strong style="color:var(--coral)">Fehler:</strong> ${this._escape(e.message || String(e))}`);
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = '✨ Generieren';
    }
  },

  // ===== Test send =====

  async _testSend(modal) {
    if (!this._state?.draft) return;
    const btn = modal.querySelector('#gm-test-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Sende...';
    try {
      const d = this._state.draft;
      const result = await this._callEdgeFunction('send-goodie-campaign', {
        action: 'test',
        subject: d.subject,
        preheader: d.preheader,
        body_html: d.body_html,
        body_text: d.body_text,
      });
      App.showToast?.(`Test-Mail an ${result.sent_to} verschickt 📧`);
    } catch (e) {
      App.showToast?.('Test-Fehler: ' + (e.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = '📧 Test an mich';
    }
  },

  // ===== Broadcast =====

  async _broadcast(modal) {
    if (!this._state?.draft) return;
    const d = this._state.draft;
    const g = this._state.goodie;

    // Check schedule choice
    const schedOpt = modal.querySelector('.gm-schedule-opt.gm-schedule-opt-active');
    const isScheduled = schedOpt?.dataset.sched === 'scheduled';
    let scheduledAt = null;
    if (isScheduled) {
      const date = modal.querySelector('#gm-sched-date').value;
      const time = modal.querySelector('#gm-sched-time').value;
      if (!date || !time) { App.showToast?.('Bitte Datum und Zeit wählen'); return; }
      scheduledAt = new Date(`${date}T${time}`);
      if (scheduledAt.getTime() < Date.now() + 60_000) {
        App.showToast?.('Geplante Zeit muss mind. 1 Min in der Zukunft liegen');
        return;
      }
    }

    const confirmMsg = isScheduled
      ? `⏰ Mail für ${scheduledAt.toLocaleString('de-AT')} einplanen?\n\nBetreff: "${d.subject}"\n\nDu kannst sie bis zur Sendezeit noch abbrechen.`
      : `⚠ Mail JETZT an alle Empfänger senden?\n\nBetreff: "${d.subject}"\n\nDas kann nicht rückgängig gemacht werden. Test-Mail vorher empfohlen.`;

    if (!confirm(confirmMsg)) return;

    const btn = modal.querySelector('#gm-send-btn');
    btn.disabled = true;
    btn.textContent = isScheduled ? '⏳ Planen...' : '⏳ Versand läuft...';

    try {
      const { data: campaign, error: cErr } = await Auth.supabase
        .from('goodie_campaigns')
        .insert({
          goodie_id: g.id,
          subject: d.subject,
          preheader: d.preheader,
          body_html: d.body_html,
          body_text: d.body_text,
          ai_brief: d.ai_brief,
          ai_model: d.ai_model,
          status: isScheduled ? 'scheduled' : 'draft',
          scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
          created_by: Auth.currentUser?.id || null,
        })
        .select('id').single();
      if (cErr) throw cErr;

      if (isScheduled) {
        App.showToast?.(`⏰ Für ${scheduledAt.toLocaleString('de-AT')} eingeplant`);
        this.close();
        return;
      }

      const result = await this._callEdgeFunction('send-goodie-campaign', {
        action: 'broadcast',
        campaign_id: campaign.id,
      });

      App.showToast?.(`🚀 ${result.sent} Mails gesendet · ${result.failed || 0} Fehler`);
      this.close();
    } catch (e) {
      console.error('[GoodiesMailer] broadcast error:', e);
      App.showToast?.('Versand-Fehler: ' + (e.message || e));
      btn.disabled = false;
      btn.textContent = isScheduled ? '⏰ Planen…' : '🚀 Jetzt senden…';
    }
  },

  // ===== Audience preview =====

  async _renderAudience(modal) {
    // Read goodie audience_rule and compute approximate recipient count via user_profiles
    const g = this._state.goodie;
    const rule = g.audience_rule || { type: 'all' };
    const host = modal.querySelector('#gm-audience');
    host.style.display = '';
    host.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)"><div class="spinner"></div>Empfänger werden berechnet…</div>`;

    try {
      // Best-effort estimate using user_profiles table. Exact numbers are resolved server-side on send.
      const { count: totalCount } = await Auth.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // We can't easily query auth.users from client — so we give an estimate based on rule type
      let label, estimate;
      if (rule.type === 'all') {
        label = 'Alle User';
        estimate = `~${totalCount || '?'}`;
      } else if (rule.type === 'registered_between') {
        label = `Neue User (${this._fmtDateShort(rule.from)}–${this._fmtDateShort(rule.to)})`;
        estimate = 'wird bei Versand berechnet';
      } else if (rule.type === 'registered_before') {
        label = `Bestehende User (vor ${this._fmtDateShort(rule.until)})`;
        estimate = 'wird bei Versand berechnet';
      } else if (rule.type === 'registered_after') {
        label = `Ab ${this._fmtDateShort(rule.from)}`;
        estimate = 'wird bei Versand berechnet';
      }

      // Claimed count (these get excluded automatically)
      const { count: claimedCount } = await Auth.supabase
        .from('goodie_claims')
        .select('*', { count: 'exact', head: true })
        .eq('goodie_id', g.id);

      host.innerHTML = `
        <div class="gm-audience-hero">
          <div class="gm-audience-num">${estimate}</div>
          <div class="gm-audience-info">
            <div class="gm-audience-label">${this._escape(label)}</div>
            <div class="gm-audience-sub">User die das Goodie schon abgeholt haben (${claimedCount || 0}) werden automatisch ausgeschlossen.</div>
          </div>
        </div>
      `;
    } catch (e) {
      host.innerHTML = `<div style="font-size:12px;color:var(--text-muted)">Empfänger-Anzahl wird beim Versand ermittelt.</div>`;
    }
  },

  // ===== Preview rendering =====

  _renderPreview(modal) {
    const frame = modal.querySelector('#gm-preview-frame');
    const hint = modal.querySelector('#gm-preview-hint');
    const d = this._state.draft;
    if (!d) return;

    // Personalize with a placeholder name for the preview
    const sample = 'Max';
    const html = (d.body_html || '').replaceAll('{{first_name}}', sample);

    frame.innerHTML = `
      <div class="gm-preview-meta">
        <div><strong>Von:</strong> Andreea von MedAT-Trainer &lt;office@ai-guide.at&gt;</div>
        <div><strong>An:</strong> ${this._escape(sample.toLowerCase())}@beispiel.at</div>
        <div><strong>Betreff:</strong> <strong>${this._escape(d.subject)}</strong></div>
        ${d.preheader ? `<div><strong>Vorschau:</strong> ${this._escape(d.preheader)}</div>` : ''}
      </div>
      <div class="gm-preview-body">
        <iframe id="gm-preview-iframe" style="width:100%;border:none;min-height:560px" srcdoc="${this._escape(html)}"></iframe>
      </div>
    `;
    hint.textContent = `Zeigt wie "${sample}" die Mail sieht. Jeder Empfänger bekommt seinen Vornamen eingesetzt.`;
  },

  // ===== Chat helpers =====

  _appendChat(role, html, meta = {}) {
    const chat = document.querySelector('#gm-chat');
    if (!chat) return;
    const div = document.createElement('div');
    div.className = `gm-msg gm-msg-${role}`;
    if (meta.pending) div.dataset.pending = '1';
    div.innerHTML = html;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  },

  _replaceLastPendingChat(html) {
    const pending = document.querySelector('#gm-chat .gm-msg[data-pending="1"]');
    if (pending) { pending.innerHTML = html; pending.removeAttribute('data-pending'); }
    else this._appendChat('ai', html);
  },

  // ===== Edge-function caller (reuses Admin._adminCall pattern) =====

  async _callEdgeFunction(name, payload) {
    const session = await Auth.supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Nicht eingeloggt');

    const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok || json.error) throw new Error(json.error || `HTTP ${resp.status}`);
    return json;
  },

  _presetLabel(p) {
    return ({
      shorter: 'Kürzer', urgent: 'Dringlicher',
      personal: 'Persönlicher', formal: 'Sachlicher', casual: 'Lockerer',
    })[p] || p;
  },

  _fmtDateShort(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }); }
    catch { return iso; }
  },

  _escape(s) {
    if (s == null) return '';
    return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
  },
};

window.GoodiesMailer = GoodiesMailer;
