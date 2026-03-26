// === MedAT Trainer – Credit-System ===
// 300 Free Credits bei Registrierung. 1 Credit = 1 Frage oder 1 PDF-Seite.
// Premium-User & Admins = unbegrenzt.

const Credits = {
  _credits: null,      // { credits_total, credits_used }
  _loading: false,

  get remaining() {
    if (!this._credits) return 0;
    return Math.max(0, this._credits.credits_total - this._credits.credits_used);
  },

  get used() {
    return this._credits?.credits_used || 0;
  },

  get total() {
    return this._credits?.credits_total || 300;
  },

  /** Is user exempt from credit limits? (Premium or Admin) */
  isUnlimited() {
    if (!Auth.isLoggedIn) return false;
    // During admin impersonation, use the impersonated tier
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) {
      const impTier = Admin._impersonating?.tier;
      return impTier && impTier !== 'free';
    }
    const tier = Auth.userProfile?.license_tier;
    if (tier && tier !== 'free') return true;
    return false;
  },

  /** Load credits from DB */
  async load() {
    if (!Auth.isLoggedIn) { this._credits = null; return; }
    if (this._loading) return;
    this._loading = true;
    try {
      const { data, error } = await Auth.supabase
        .from('user_credits')
        .select('credits_total, credits_used')
        .eq('user_id', Auth.currentUser.id)
        .maybeSingle();

      if (error) { console.error('Credits load error:', error); return; }

      if (!data) {
        // New user — create record with 300 credits
        const { data: newRow, error: insertErr } = await Auth.supabase
          .from('user_credits')
          .insert({ user_id: Auth.currentUser.id, credits_total: 300, credits_used: 0 })
          .select('credits_total, credits_used')
          .single();
        if (insertErr) console.error('Credits init error:', insertErr);
        this._credits = newRow || { credits_total: 300, credits_used: 0 };
      } else {
        this._credits = data;
      }
    } catch (e) {
      console.error('Credits load error:', e);
    } finally {
      this._loading = false;
      this.updateUI();
    }
  },

  /** Check if user has enough credits. Returns true if OK, false if blocked. */
  hasEnough(amount) {
    if (this.isUnlimited()) return true;
    return this.remaining >= amount;
  },

  /**
   * Use credits. Returns true if successful, false if not enough.
   * @param {number} amount - credits to consume
   * @param {string} reason - 'question' | 'pdf_page' | 'purchase' | 'bonus'
   * @param {string} detail - human-readable detail
   */
  async use(amount, reason, detail) {
    if (this.isUnlimited()) return true;
    // During impersonation, simulate credit use locally only (don't write to DB)
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) {
      if (!this.hasEnough(amount)) return false;
      this._credits.credits_used += amount;
      this.updateUI();
      return true;
    }
    if (!this.hasEnough(amount)) return false;
    if (!Auth.isLoggedIn) return false;

    const newUsed = this.used + amount;
    const balanceAfter = this.total - newUsed;

    try {
      // Update credits
      const { error } = await Auth.supabase
        .from('user_credits')
        .update({ credits_used: newUsed, updated_at: new Date().toISOString() })
        .eq('user_id', Auth.currentUser.id);

      if (error) { console.error('Credits use error:', error); return false; }

      // Log it (use proper {data, error} pattern — .catch() on Supabase builder can swallow errors)
      const { error: logErr } = await Auth.supabase
        .from('credit_log')
        .insert({
          user_id: Auth.currentUser.id,
          amount: -amount,
          reason: reason,
          detail: detail || null,
          balance_after: balanceAfter,
        });
      if (logErr) console.warn('Credit log insert error:', logErr);

      // Update local state
      this._credits.credits_used = newUsed;
      this.updateUI();

      // Show warning at milestones
      if (balanceAfter <= 50 && balanceAfter + amount > 50) {
        App.showToast('Noch 50 Credits übrig!');
      } else if (balanceAfter <= 10 && balanceAfter + amount > 10) {
        App.showToast('Nur noch 10 Credits!');
      }

      return true;
    } catch (e) {
      console.error('Credits use error:', e);
      return false;
    }
  },

  /** Show paywall when credits are depleted */
  showPaywall() {
    document.getElementById('credits-paywall')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'credits-paywall';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .3s ease';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;max-width:400px;width:100%;padding:2rem 1.5rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative">
        <button onclick="document.getElementById('credits-paywall').remove()" style="position:absolute;top:0.8rem;right:0.8rem;background:none;border:none;font-size:1.2rem;color:var(--text-muted);cursor:pointer">✕</button>
        <div style="font-size:2.5rem;margin-bottom:0.75rem">🔒</div>
        <h2 style="font-size:1.2rem;font-weight:800;color:var(--dark);margin:0 0 0.5rem">Credits aufgebraucht</h2>
        <p style="font-size:0.88rem;color:var(--text-muted);line-height:1.6;margin:0 0 1rem">
          Deine 300 kostenlosen Credits sind verbraucht. Schalte den <strong style="color:var(--yellow)">Vollzugang</strong> frei für unbegrenztes Üben und alle PDF-Simulationen!
        </p>
        <div style="background:var(--bg);border-radius:14px;padding:1rem;margin-bottom:1.25rem;text-align:left">
          <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.7">
            ✓ Unbegrenzte Fragen & PDFs<br>
            ✓ Alle Untertests freigeschaltet<br>
            ✓ KI-generierte Simulationen<br>
            ✓ Detaillierte Statistiken
          </div>
        </div>
        <button onclick="document.getElementById('credits-paywall').remove();App.showScreen('screen-konto')" style="width:100%;background:linear-gradient(135deg,#f5c542,#e0a820);color:var(--dark);border:none;border-radius:12px;padding:0.85rem;font-weight:700;font-size:0.95rem;cursor:pointer;box-shadow:0 4px 12px rgba(245,197,66,0.3)">
          Jetzt upgraden
        </button>
        <div style="margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted)">ab €17 einmalig</div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  /** Update the credit UI — menu item for free users, hidden for unlimited */
  updateUI() {
    const menuItem = document.getElementById('snav-credits');
    const menuLabel = document.getElementById('snav-credits-label');
    const costHint = document.getElementById('credit-cost-hint');

    // Unlimited users: hide ALL credit UI
    if (this.isUnlimited()) {
      if (menuItem) menuItem.style.display = 'none';
      if (costHint) costHint.style.display = 'none';
      return;
    }

    // Free users: show credits in menu
    if (menuItem) {
      menuItem.style.display = '';
      const rem = this.remaining;
      const pct = Math.round((rem / this.total) * 100);
      let color = '#4ade80';
      if (pct <= 10) color = '#ef4444';
      else if (pct <= 30) color = '#f59e0b';

      if (menuLabel) {
        menuLabel.innerHTML = `Credits <span style="font-weight:800;color:${color};margin-left:0.3rem;font-size:0.82rem">${rem}</span>`;
      }
    }
  },

  // === Reason labels for credit history ===
  _reasonLabels: {
    question: 'Frage beantwortet',
    pdf_page: 'PDF-Seite generiert',
    purchase: 'Credits gekauft',
    bonus: 'Bonus-Credits',
  },

  _reasonIcons: {
    question: '📝',
    pdf_page: '📄',
    purchase: '💳',
    bonus: '🎁',
  },

  /** Show credit history overlay (pulled from credit_log) */
  async showHistory() {
    document.getElementById('credit-history-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'credit-history-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    // Build header with remaining credits
    const rem = this.remaining;
    const tot = this.total;
    const pct = tot > 0 ? Math.round((rem / tot) * 100) : 0;
    const unlimited = this.isUnlimited();

    let barColor = '#4ade80';
    if (pct <= 10) barColor = '#ef4444';
    else if (pct <= 30) barColor = '#f59e0b';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px 20px 0 0;max-width:440px;width:100%;max-height:75vh;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,0.2);animation:slideUp .3s ease">
        <!-- Header -->
        <div style="padding:1.25rem 1.25rem 0.75rem;border-bottom:1px solid var(--border-light)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
            <h3 style="font-size:1.05rem;font-weight:800;color:var(--dark);margin:0">Deine Credits</h3>
            <button onclick="document.getElementById('credit-history-overlay').remove()" style="background:none;border:none;font-size:1.2rem;color:var(--text-muted);cursor:pointer;padding:0.2rem">✕</button>
          </div>
          ${unlimited ? `
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
              <span style="font-size:1.5rem;color:var(--yellow);font-weight:800">∞</span>
              <span style="font-size:0.82rem;color:var(--text-muted)">Unbegrenzte Credits (Premium)</span>
            </div>
          ` : `
            <div style="display:flex;align-items:baseline;gap:0.4rem;margin-bottom:0.5rem">
              <span style="font-size:1.5rem;font-weight:800;color:var(--dark)">${rem}</span>
              <span style="font-size:0.82rem;color:var(--text-muted)">von ${tot} Credits übrig</span>
            </div>
            <div style="background:var(--border-light);border-radius:6px;height:6px;overflow:hidden;margin-bottom:0.3rem">
              <div style="background:${barColor};height:100%;width:${pct}%;border-radius:6px;transition:width .5s"></div>
            </div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.25rem">${this.used} Credits verbraucht</div>
          `}
        </div>
        <!-- History list -->
        <div id="credit-history-list" style="flex:1;overflow-y:auto;padding:0.75rem 1.25rem 1.5rem">
          <div style="text-align:center;padding:2rem 0;color:var(--text-muted);font-size:0.82rem">Lade Verlauf...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Fetch credit log
    try {
      if (!Auth.isLoggedIn) return;
      const { data, error } = await Auth.supabase
        .from('credit_log')
        .select('*')
        .eq('user_id', Auth.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const listEl = document.getElementById('credit-history-list');
      if (!listEl) return;

      if (error || !data || data.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:2rem 0;color:var(--text-muted);font-size:0.85rem">Noch keine Aktivität</div>';
        return;
      }

      // Group by date
      const groups = {};
      data.forEach(entry => {
        const date = new Date(entry.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(entry);
      });

      let html = '';
      for (const [date, entries] of Object.entries(groups)) {
        html += `<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin:0.75rem 0 0.4rem;letter-spacing:0.03em">${date}</div>`;
        entries.forEach(e => {
          const icon = this._reasonIcons[e.reason] || '⚡';
          const label = this._reasonLabels[e.reason] || e.reason;
          const detail = e.detail ? ` · ${e.detail}` : '';
          const amountStr = e.amount > 0 ? `+${e.amount}` : `${e.amount}`;
          const amountColor = e.amount > 0 ? '#2d8a54' : '#ef4444';
          const time = new Date(e.created_at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

          html += `
            <div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0;border-bottom:1px solid var(--border-light)">
              <span style="font-size:1rem;flex-shrink:0">${icon}</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.8rem;font-weight:600;color:var(--dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}${detail}</div>
                <div style="font-size:0.68rem;color:var(--text-muted)">${time} · Guthaben: ${e.balance_after ?? '–'}</div>
              </div>
              <span style="font-size:0.82rem;font-weight:700;color:${amountColor};flex-shrink:0">${amountStr}</span>
            </div>
          `;
        });
      }
      listEl.innerHTML = html;
    } catch (e) {
      console.error('Credit history error:', e);
      const listEl = document.getElementById('credit-history-list');
      if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:2rem 0;color:var(--text-muted);font-size:0.85rem">Fehler beim Laden</div>';
    }
  },
};
