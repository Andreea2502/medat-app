// === Goodies Campaign Analytics ===
// Admin-only modal showing campaigns for a goodie + detailed per-campaign KPIs.

const GoodiesAnalytics = {
  _goodieId: null,
  _currentCampaignId: null,
  _liveSub: null,

  async open(goodieId) {
    if (!Admin || !Admin.isAdmin()) { App.showToast?.('Nur für Admins'); return; }
    // Defensive: reject invalid goodie IDs so we don't end up with goodie_id=eq.null queries
    if (!goodieId || typeof goodieId !== 'string' || goodieId.length < 10) {
      console.error('[GoodiesAnalytics] invalid goodieId:', goodieId);
      App.showToast?.('Cheat Sheet wurde noch nicht gespeichert');
      return;
    }
    this._goodieId = goodieId;
    this._currentCampaignId = null;
    this._render();
    await this._loadList();
  },

  close() {
    if (this._liveSub) { try { this._liveSub.unsubscribe(); } catch (_) {} this._liveSub = null; }
    if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
    document.body.style.overflow = '';
    document.querySelectorAll('.gan-modal').forEach(m => m.remove());
    this._goodieId = null;
    this._currentCampaignId = null;
  },

  _render() {
    // Remove old modal WITHOUT calling close() — close() would null _goodieId,
    // and _loadList() (called right after _render) needs that ID.
    if (this._escHandler) { document.removeEventListener('keydown', this._escHandler); this._escHandler = null; }
    document.body.style.overflow = 'hidden';
    document.querySelectorAll('.gan-modal').forEach(m => m.remove());
    if (!this._goodieId) {
      console.error('[GoodiesAnalytics] _render called without _goodieId');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'gan-modal';
    modal.innerHTML = `
      <div class="gan-card" onclick="event.stopPropagation()">
        <div class="gan-head">
          <div>
            <div class="gan-breadcrumb">Cheat Sheets › Analytics</div>
            <div class="gan-title">📊 Kampagnen & Statistik</div>
          </div>
          <button class="gan-close" data-close>&times;</button>
        </div>
        <div class="gan-body" id="gan-body">
          <div style="padding:2rem;text-align:center;color:var(--text-muted)"><div class="spinner"></div>Lade…</div>
        </div>
      </div>
    `;
    // Backdrop click (tap outside card) closes — important on mobile where there's no native "escape"
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) this.close();
    });
    // ESC key closes (desktop)
    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);
    // Lock background scroll while open
    document.body.style.overflow = 'hidden';
    document.body.appendChild(modal);
  },

  async _loadList() {
    const body = document.getElementById('gan-body');
    if (!body) return;

    // Defensive: never run the query with a null goodie_id (would produce uuid:"null" error)
    if (!this._goodieId) {
      body.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted)">Kein Cheat Sheet ausgewählt.</div>`;
      return;
    }

    let campaigns, error;
    try {
      const result = await Auth.supabase
        .from('goodie_campaigns_with_stats')
        .select('*')
        .eq('goodie_id', this._goodieId)
        .order('created_at', { ascending: false });
      campaigns = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      body.innerHTML = `
        <div style="padding:2rem;text-align:center">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="color:var(--coral);font-weight:700;margin-bottom:6px">Fehler beim Laden</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px">${this._escape(error.message || String(error))}</div>
          <button class="gan-btn-ghost" data-close>Schließen</button>
        </div>
      `;
      body.querySelector('[data-close]')?.addEventListener('click', () => this.close());
      return;
    }

    if (!campaigns || campaigns.length === 0) {
      body.innerHTML = `
        <div class="gan-empty">
          <div style="font-size:48px;opacity:0.4;margin-bottom:12px">📭</div>
          <div style="font-weight:700;margin-bottom:4px">Noch keine Kampagnen</div>
          <div style="font-size:13px;color:var(--text-muted)">Erstelle eine KI-Mail (🤖), um eine Kampagne zu starten.</div>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div class="gan-list">
        <div class="gan-section-label">Alle Kampagnen</div>
        ${campaigns.map(c => this._campaignRow(c)).join('')}
      </div>
    `;
    body.querySelectorAll('[data-campaign]').forEach(el => {
      el.addEventListener('click', () => this._loadDetail(el.dataset.campaign));
    });
    body.querySelectorAll('[data-cancel]').forEach(el => {
      el.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await this._cancelScheduled(el.dataset.cancel);
      });
    });
  },

  _campaignRow(c) {
    const statusPill = ({
      draft:     '<span class="gan-pill gan-pill-grey">Entwurf</span>',
      scheduled: `<span class="gan-pill gan-pill-lavender">⏰ Geplant</span>`,
      sending:   '<span class="gan-pill gan-pill-yellow">⏳ Wird gesendet</span>',
      sent:      '<span class="gan-pill gan-pill-mint">✓ Versendet</span>',
      failed:    '<span class="gan-pill gan-pill-coral">Fehlgeschlagen</span>',
      canceled:  '<span class="gan-pill gan-pill-grey">Abgebrochen</span>',
    })[c.status] || c.status;

    const openPct = c.open_rate_pct || 0;
    const clickPct = c.click_rate_pct || 0;
    const canCancel = c.status === 'scheduled';

    return `
      <div class="gan-campaign-row" data-campaign="${this._escape(c.id)}">
        <div class="gan-campaign-head">
          <div style="flex:1;min-width:0">
            <div class="gan-campaign-subj">${this._escape(c.subject)}</div>
            <div class="gan-campaign-meta">
              ${statusPill}
              <span>·</span>
              <span>${c.recipient_count || 0} Empfänger</span>
              ${c.scheduled_at ? `<span>·</span><span>${c.status === 'scheduled' ? 'Geplant für' : 'Gesendet um'} ${this._fmt(c.scheduled_at || c.sent_completed_at)}</span>` : (c.sent_completed_at ? `<span>·</span><span>${this._fmt(c.sent_completed_at)}</span>` : '')}
            </div>
          </div>
          ${canCancel ? `<button class="gan-btn-ghost" data-cancel="${this._escape(c.id)}" title="Versand abbrechen">✕ Abbrechen</button>` : ''}
        </div>
        ${c.status === 'sent' || c.status === 'sending' ? `
          <div class="gan-kpi-row">
            <div class="gan-kpi"><div class="gan-kpi-num">${c.sent_count || 0}</div><div class="gan-kpi-label">Versendet</div></div>
            <div class="gan-kpi"><div class="gan-kpi-num">${c.opened_count || 0}</div><div class="gan-kpi-label">Geöffnet<br><span class="gan-kpi-pct">${openPct}%</span></div></div>
            <div class="gan-kpi"><div class="gan-kpi-num">${c.clicked_count || 0}</div><div class="gan-kpi-label">Geklickt<br><span class="gan-kpi-pct">${clickPct}%</span></div></div>
          </div>
        ` : ''}
      </div>
    `;
  },

  async _cancelScheduled(id) {
    if (!confirm('Geplanten Versand wirklich abbrechen?')) return;
    const { error } = await Auth.supabase
      .from('goodie_campaigns')
      .update({ status: 'canceled' })
      .eq('id', id)
      .eq('status', 'scheduled');
    if (error) { App.showToast?.('Fehler: ' + error.message); return; }
    App.showToast?.('Versand abgebrochen');
    await this._loadList();
  },

  async _loadDetail(campaignId) {
    this._currentCampaignId = campaignId;
    const body = document.getElementById('gan-body');
    if (!body) return;
    body.innerHTML = `
      <button class="gan-btn-ghost" id="gan-back" style="margin-bottom:12px">← Zurück zur Liste</button>
      <div id="gan-detail"><div style="text-align:center;color:var(--text-muted);padding:2rem"><div class="spinner"></div>Lade Kampagne…</div></div>
    `;
    body.querySelector('#gan-back').addEventListener('click', () => this._loadList());

    let campaign, recipients;
    try {
      const [cRes, rRes] = await Promise.all([
        Auth.supabase.from('goodie_campaigns_with_stats').select('*').eq('id', campaignId).single(),
        Auth.supabase.from('campaign_recipients').select('*').eq('campaign_id', campaignId).order('last_opened_at', { ascending: false, nullsFirst: false }).limit(500),
      ]);
      if (cRes.error) throw cRes.error;
      campaign = cRes.data;
      recipients = rRes.data || [];
    } catch (e) {
      body.innerHTML = `
        <button class="gan-btn-ghost" id="gan-back" style="margin-bottom:12px">← Zurück zur Liste</button>
        <div style="padding:2rem;color:var(--coral);text-align:center">
          <div style="font-size:24px;margin-bottom:8px">⚠️</div>
          <div style="font-weight:700;margin-bottom:4px">Fehler beim Laden</div>
          <div style="font-size:13px;color:var(--text-muted)">${this._escape(e.message || String(e))}</div>
        </div>
      `;
      body.querySelector('#gan-back').addEventListener('click', () => this._loadList());
      return;
    }
    if (!campaign) {
      body.innerHTML = `
        <button class="gan-btn-ghost" id="gan-back" style="margin-bottom:12px">← Zurück zur Liste</button>
        <div style="padding:2rem;text-align:center;color:var(--text-muted)">Kampagne nicht gefunden.</div>
      `;
      body.querySelector('#gan-back').addEventListener('click', () => this._loadList());
      return;
    }

    const detail = body.querySelector('#gan-detail');
    detail.innerHTML = this._detailHtml(campaign, recipients || []);
    detail.querySelectorAll('[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        detail.querySelectorAll('[data-filter]').forEach(c => c.classList.remove('gan-chip-active'));
        chip.classList.add('gan-chip-active');
        this._applyFilter(detail, chip.dataset.filter, recipients || []);
      });
    });
    // Default filter: all
    this._applyFilter(detail, 'all', recipients || []);

    // Subscribe to live updates (best-effort — never block the UI if it fails)
    try { this._liveSub?.unsubscribe?.(); } catch (_) {}
    this._liveSub = null;
    try {
      this._liveSub = Auth.supabase.channel(`campaign-${campaignId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_recipients', filter: `campaign_id=eq.${campaignId}` },
            () => this._loadDetail(campaignId)
        )
        .subscribe();
    } catch (e) {
      console.warn('[GoodiesAnalytics] realtime subscription failed (non-fatal):', e);
    }
  },

  _detailHtml(c, recipients) {
    const sent = c.sent_count || 0;
    const delivered = recipients.filter(r => r.status === 'delivered' || r.status === 'sent').length;
    const bounced = recipients.filter(r => r.status === 'bounced').length;
    const opened = recipients.filter(r => r.open_count > 0).length;
    const clicked = recipients.filter(r => r.click_count > 0).length;
    const claimed = recipients.filter(r => r.claimed_at).length;
    const total = c.recipient_count || recipients.length || 0;
    const pct = (n) => total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

    return `
      <div class="gan-detail-head">
        <h3 style="margin:0 0 4px;font-size:18px">${this._escape(c.subject)}</h3>
        <div style="font-size:12px;color:var(--text-muted)">${c.status === 'sent' ? `Versendet ${this._fmt(c.sent_completed_at)}` : `Status: ${c.status}`}</div>
      </div>

      <div class="gan-kpi-grid">
        <div class="gan-kpi-box">
          <div class="gan-kpi-big">${sent}</div>
          <div class="gan-kpi-sub">Versendet</div>
        </div>
        <div class="gan-kpi-box">
          <div class="gan-kpi-big">${opened}</div>
          <div class="gan-kpi-sub"><strong style="color:var(--mint-deep)">${pct(opened)}%</strong> geöffnet</div>
        </div>
        <div class="gan-kpi-box">
          <div class="gan-kpi-big">${clicked}</div>
          <div class="gan-kpi-sub"><strong style="color:var(--mint-deep)">${pct(clicked)}%</strong> geklickt</div>
        </div>
        <div class="gan-kpi-box gan-kpi-box-dark">
          <div class="gan-kpi-big" style="color:var(--yellow)">${claimed}</div>
          <div class="gan-kpi-sub">Goodie abgeholt</div>
        </div>
      </div>

      <div class="gan-funnel">
        <div class="gan-funnel-row"><div class="gan-funnel-label">📤 Versendet</div><div class="gan-funnel-bar" style="width:100%;background:#1a1a2e"><span>${total}</span></div></div>
        <div class="gan-funnel-row"><div class="gan-funnel-label">👀 Geöffnet</div><div class="gan-funnel-bar" style="width:${pct(opened)}%;background:var(--lavender-deep)"><span>${opened}</span></div></div>
        <div class="gan-funnel-row"><div class="gan-funnel-label">🖱 Geklickt</div><div class="gan-funnel-bar" style="width:${pct(clicked)}%;background:var(--mint-deep)"><span>${clicked}</span></div></div>
        <div class="gan-funnel-row"><div class="gan-funnel-label">🎁 Abgeholt</div><div class="gan-funnel-bar" style="width:${pct(claimed)}%;background:var(--yellow-deep);color:var(--dark)"><span>${claimed}</span></div></div>
      </div>

      <div class="gan-section-label" style="margin-top:18px">Empfänger (${total})</div>
      <div class="gan-filter-row">
        <button class="gan-chip gan-chip-active" data-filter="all">Alle <span class="gan-chip-n">${total}</span></button>
        <button class="gan-chip" data-filter="claimed">🎁 Abgeholt <span class="gan-chip-n">${claimed}</span></button>
        <button class="gan-chip" data-filter="clicked">🖱 Geklickt <span class="gan-chip-n">${clicked}</span></button>
        <button class="gan-chip" data-filter="opened">👀 Geöffnet <span class="gan-chip-n">${opened}</span></button>
        <button class="gan-chip" data-filter="unopened">📭 Nicht geöffnet <span class="gan-chip-n">${total - opened}</span></button>
        <button class="gan-chip" data-filter="bounced">⚠ Bounce <span class="gan-chip-n">${bounced}</span></button>
      </div>
      <div class="gan-recip-table-wrap">
        <table class="gan-recip-table" id="gan-recip-table"></table>
      </div>
    `;
  },

  _applyFilter(detailEl, filter, recipients) {
    let filtered = recipients;
    if (filter === 'claimed')   filtered = recipients.filter(r => r.claimed_at);
    if (filter === 'clicked')   filtered = recipients.filter(r => r.click_count > 0);
    if (filter === 'opened')    filtered = recipients.filter(r => r.open_count > 0 && !r.click_count);
    if (filter === 'unopened')  filtered = recipients.filter(r => !r.open_count);
    if (filter === 'bounced')   filtered = recipients.filter(r => r.status === 'bounced' || r.status === 'failed');

    const tbl = detailEl.querySelector('#gan-recip-table');
    if (filtered.length === 0) {
      tbl.innerHTML = '<tr><td style="padding:20px;text-align:center;color:var(--text-muted)">Keine Empfänger in dieser Kategorie.</td></tr>';
      return;
    }
    tbl.innerHTML = `
      <thead>
        <tr>
          <th>Empfänger</th>
          <th>Status</th>
          <th>👀 Öffn.</th>
          <th>🖱 Klicks</th>
          <th>🎁</th>
          <th>Letzte Aktivität</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.slice(0, 200).map(r => this._recipRow(r)).join('')}
      </tbody>
      ${filtered.length > 200 ? `<tfoot><tr><td colspan="6" style="padding:10px;text-align:center;color:var(--text-muted);font-size:12px">Zeige 200 von ${filtered.length}</td></tr></tfoot>` : ''}
    `;
  },

  _recipRow(r) {
    const statusDot = ({
      sent: '<span class="gan-dot gan-dot-ok"></span>',
      delivered: '<span class="gan-dot gan-dot-ok"></span>',
      bounced: '<span class="gan-dot gan-dot-err"></span>',
      failed: '<span class="gan-dot gan-dot-err"></span>',
      pending: '<span class="gan-dot gan-dot-grey"></span>',
    })[r.status] || '<span class="gan-dot gan-dot-grey"></span>';

    const lastActivity = r.last_clicked_at || r.last_opened_at || r.sent_at || '';
    return `
      <tr>
        <td>
          <div style="font-weight:600">${this._escape(r.first_name || '—')}</div>
          <div style="font-size:11px;color:var(--text-muted)">${this._escape(r.email)}</div>
        </td>
        <td>${statusDot}${this._escape(r.status)}</td>
        <td><strong>${r.open_count || 0}</strong></td>
        <td><strong>${r.click_count || 0}</strong></td>
        <td>${r.claimed_at ? '<span style="color:var(--mint-deep);font-weight:700">✓</span>' : ''}</td>
        <td style="font-size:11px;color:var(--text-muted)">${this._humanAgo(lastActivity)}</td>
      </tr>
    `;
  },

  _fmt(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso; }
  },
  _humanAgo(iso) {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `vor ${h} Std.`;
    const d = Math.floor(h / 24);
    return `vor ${d} Tag${d === 1 ? '' : 'en'}`;
  },
  _escape(s) {
    if (s == null) return '';
    return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
  },
};

window.GoodiesAnalytics = GoodiesAnalytics;
