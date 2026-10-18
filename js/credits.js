// === MedAT Trainer – Credit-System ===
// Free-User: max 150 Fragen, danach Paywall.
// KI-Features: Free=10/3, Basic=200/50, Premium=400/100.

const Credits = {
  _credits: null,      // { credits_total, credits_used, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, ai_reset_month, lernplan_resets, questions_limit }
  _loading: false,
  _questionCount: null, // cached total questions answered (from user_progress)

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

  get aiSessionsRemaining() {
    if (!this._credits) return 0;
    return Math.max(0, this._credits.ai_sessions_total - this._credits.ai_sessions_used);
  },

  get aiImagesRemaining() {
    if (!this._credits) return 0;
    return Math.max(0, this._credits.ai_images_total - this._credits.ai_images_used);
  },

  get lernplanResets() {
    return this._credits?.lernplan_resets || 0;
  },

  /** Max questions for free users (from DB, default 150) */
  get questionsLimit() {
    return this._credits?.questions_limit ?? 150;
  },

  /** Load total question count from user_progress */
  async loadQuestionCount() {
    if (!Auth.isLoggedIn) return 0;
    if (this._questionCount !== null) return this._questionCount;
    try {
      const { count, error } = await Auth.supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', Auth.currentUser.id);
      this._questionCount = error ? 0 : (count || 0);
    } catch {
      this._questionCount = 0;
    }
    return this._questionCount;
  },

  /** Increment cached question count (call after answering a question) */
  incrementQuestionCount() {
    if (this._questionCount !== null) this._questionCount++;
  },

  /** Check if free user still has questions remaining */
  async hasQuestionsRemaining() {
    if (this.isUnlimited()) return true;
    const count = await this.loadQuestionCount();
    const limit = this.questionsLimit;
    return count < limit;
  },

  /** Get remaining question count for free users */
  async getQuestionsRemaining() {
    if (this.isUnlimited()) return Infinity;
    const count = await this.loadQuestionCount();
    return Math.max(0, this.questionsLimit - count);
  },

  /** Is user exempt from credit limits? (Premium or Admin) */
  isUnlimited() {
    if (!Auth.isLoggedIn) return false;
    // During admin impersonation, use the impersonated tier
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) {
      const impTier = Admin._impersonating?.tier;
      return impTier && impTier !== 'free';
    }
    // Use Auth.licenseTier which checks expiry, not raw userProfile.license_tier
    const tier = Auth.licenseTier;
    if (tier && tier !== 'free') return true;
    return false;
  },

  /** Check if user has AI session credits left */
  hasAiSession() {
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) return true;
    return this.aiSessionsRemaining > 0;
  },

  /** Check if user has AI image (Banana) credits left */
  hasAiImage() {
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) return true;
    return this.aiImagesRemaining > 0;
  },

  /** Load credits from DB */
  async load() {
    if (!Auth.isLoggedIn) { this._credits = null; return; }
    if (this._loading) return;
    this._loading = true;
    try {
      const { data, error } = await Auth.supabase
        .from('user_credits')
        .select('credits_total, credits_used, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, ai_reset_month, lernplan_resets, questions_limit')
        .eq('user_id', Auth.currentUser.id)
        .maybeSingle();

      if (error) { console.error('Credits load error:', error); return; }

      if (!data) {
        // Neuer User — Plan-Defaults bestimmen
        const tier = Auth.licenseTier;
        const aiSessionsTotal = tier === 'premium' ? 400 : tier === 'basic' ? 200 : 10;
        const aiImagesTotal   = tier === 'premium' ? 100 : tier === 'basic' ? 50  : 3;
        const aiResetMonth    = (tier === 'basic' || tier === 'premium')
          ? new Date().toISOString().slice(0, 7) : null;

        const { data: newRow, error: insertErr } = await Auth.supabase
          .from('user_credits')
          .insert({
            user_id: Auth.currentUser.id,
            credits_total: 300, credits_used: 0,
            ai_sessions_used: 0, ai_sessions_total: aiSessionsTotal,
            ai_images_used: 0, ai_images_total: aiImagesTotal,
            ai_reset_month: aiResetMonth, lernplan_resets: 0,
          })
          .select('credits_total, credits_used, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, ai_reset_month, lernplan_resets, questions_limit')
          .single();
        if (insertErr) console.error('Credits init error:', insertErr);
        this._credits = newRow || {
          credits_total: 300, credits_used: 0,
          ai_sessions_used: 0, ai_sessions_total: aiSessionsTotal,
          ai_images_used: 0, ai_images_total: aiImagesTotal,
          ai_reset_month: aiResetMonth, lernplan_resets: 0,
        };
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

  /** Placeholder — kein monatlicher Reset, Kontingent gilt einmalig bis MedAT Juli 2026 */
  async _checkMonthlyReset() { return; },

  /** Check if user has enough credits. Always true — questions are unlimited for everyone. */
  hasEnough(amount) {
    return true;
  },

  /** Mutex to prevent concurrent use() calls from racing */
  _useInFlight: false,
  _useQueue: [],

  /**
   * Use credits. Returns true if successful, false if not enough.
   * Questions & PDFs are FREE for everyone — only AI session/image credits are tracked.
   * @param {number} amount - credits to consume
   * @param {string} reason - 'question' | 'pdf_page' | 'purchase' | 'bonus'
   * @param {string} detail - human-readable detail
   */
  async use(amount, reason, detail) {
    // Questions and PDFs are unlimited for all users — no deduction needed
    return true;
  },

  /** Internal: actually deduct credits (called serialized) */
  async _doUse(amount, reason, detail) {
    this._useInFlight = true;
    try {
      // Auto-reload credits if not yet loaded
      if (!this._credits) {
        await this.load();
        if (!this._credits) {
          console.warn('[Credits] _credits still null after reload — cannot deduct');
          return false;
        }
      }

      if (!this.hasEnough(amount)) return false;

      const newUsed = this.used + amount;
      const balanceAfter = this.total - newUsed;

      // Update credits in DB
      const { error } = await Auth.supabase
        .from('user_credits')
        .update({ credits_used: newUsed, updated_at: new Date().toISOString() })
        .eq('user_id', Auth.currentUser.id);

      if (error) {
        console.error('[Credits] DB update error:', error);
        return false;
      }

      // Log it
      const { error: logErr } = await Auth.supabase
        .from('credit_log')
        .insert({
          user_id: Auth.currentUser.id,
          amount: -amount,
          reason: reason,
          detail: detail || null,
          balance_after: balanceAfter,
        });
      if (logErr) console.warn('[Credits] Log insert error:', logErr);

      // Update local state AFTER successful DB write
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
      console.error('[Credits] use() exception:', e);
      return false;
    } finally {
      this._useInFlight = false;
      // Process next queued call if any
      const next = this._useQueue.shift();
      if (next) next();
    }
  },

  /** Zieht 1 KI-Session ab und loggt in credit_log */
  async useAiSession() {
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) return true;
    if (!Auth.isLoggedIn || !this._credits) return false;
    if (!this.hasAiSession()) return false;

    const newUsed = this._credits.ai_sessions_used + 1;
    const { error } = await Auth.supabase
      .from('user_credits')
      .update({ ai_sessions_used: newUsed, updated_at: new Date().toISOString() })
      .eq('user_id', Auth.currentUser.id);

    if (error) { console.error('[Credits] AI session deduct error:', error); return false; }

    await Auth.supabase.from('credit_log').insert({
      user_id: Auth.currentUser.id, amount: -1, reason: 'ai_session',
      detail: `KI-Session (${this._credits.ai_sessions_total - newUsed} übrig)`,
      balance_after: this._credits.credits_total - this._credits.credits_used,
    }).catch(e => console.warn('[Credits] ai_session log:', e));

    this._credits.ai_sessions_used = newUsed;
    this.updateUI();
    return true;
  },

  /** Zieht 1 Banana-Bild ab und loggt in credit_log */
  async useAiImage() {
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) return true;
    if (!Auth.isLoggedIn || !this._credits) return false;
    if (!this.hasAiImage()) return false;

    const newUsed = this._credits.ai_images_used + 1;
    const { error } = await Auth.supabase
      .from('user_credits')
      .update({ ai_images_used: newUsed, updated_at: new Date().toISOString() })
      .eq('user_id', Auth.currentUser.id);

    if (error) { console.error('[Credits] AI image deduct error:', error); return false; }

    await Auth.supabase.from('credit_log').insert({
      user_id: Auth.currentUser.id, amount: -1, reason: 'ai_image',
      detail: `Banana-Bild (${this._credits.ai_images_total - newUsed} übrig)`,
      balance_after: this._credits.credits_total - this._credits.credits_used,
    }).catch(e => console.warn('[Credits] ai_image log:', e));

    this._credits.ai_images_used = newUsed;
    this.updateUI();
    return true;
  },

  /** Zeigt Paywall wenn KI-Sessions oder Bilder aufgebraucht sind */
  showAiPaywall(type) {
    document.getElementById('ai-credits-paywall')?.remove();
    const isSession = type === 'session';
    const tier = Auth.licenseTier;
    const isFree = !tier || tier === 'free';
    const isBasic = tier === 'basic';

    const title   = isSession ? 'Tutor-Sessions aufgebraucht' : 'Merkbilder aufgebraucht';
    const icon    = isSession ? '🤖' : '🖼️';
    const details = isSession
      ? '✓ Free: 10 Sessions gesamt<br>✓ Premium (€29,90): 800 Sessions bis MedAT 2026'
      : '✓ Free: 3 Merkbilder gesamt<br>✓ Premium (€29,90): 200 Merkbilder bis MedAT 2026';
    const resetMsg = (!isFree) ? 'Dein einmaliges Kontingent ist aufgebraucht.' : '';
    const showUpgradeBtn = isFree || isBasic;

    const overlay = document.createElement('div');
    overlay.id = 'ai-credits-paywall';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .3s ease';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;max-width:400px;width:100%;padding:2rem 1.5rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative">
        <button onclick="document.getElementById('ai-credits-paywall').remove()" style="position:absolute;top:0.8rem;right:0.8rem;background:none;border:none;font-size:1.2rem;color:#9e9eae;cursor:pointer">✕</button>
        <div style="font-size:2.5rem;margin-bottom:0.75rem">${icon}</div>
        <h2 style="font-size:1.2rem;font-weight:800;color:#1a1a2e;margin:0 0 0.5rem">${title}</h2>
        <p style="font-size:0.88rem;color:#5c5c6e;line-height:1.6;margin:0 0 1rem">
          ${isFree ? 'Dein kostenloses Kontingent ist aufgebraucht.' : resetMsg}
        </p>
        <div style="background:#f8f8f8;border-radius:14px;padding:1rem;margin-bottom:1.25rem;text-align:left;font-size:0.82rem;color:#5c5c6e;line-height:1.8">${details}</div>
        ${showUpgradeBtn ? `
          <button onclick="document.getElementById('ai-credits-paywall').remove();App.showScreen('screen-konto')"
            style="width:100%;background:linear-gradient(135deg,#f5c542,#e0a820);color:#1a1a2e;border:none;border-radius:12px;padding:0.85rem;font-weight:700;font-size:0.95rem;cursor:pointer;box-shadow:0 4px 12px rgba(245,197,66,0.3)">
            ${isFree ? 'Jetzt upgraden' : 'Auf Premium upgraden'}
          </button>
          <div style="margin-top:0.75rem;font-size:0.75rem;color:#9e9eae">Einmalige Zahlung · kein Abo · gültig bis MedAT Juli 2026</div>
        ` : `<div style="font-size:0.82rem;color:#9e9eae;padding:0.5rem">${resetMsg}</div>`}
      </div>
    `;
    document.body.appendChild(overlay);
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
          Du hast alle <strong>150 kostenlosen Fragen</strong> aufgebraucht. Schalte den <strong style="color:var(--yellow)">Vollzugang</strong> frei für unbegrenztes Üben und alle PDF-Simulationen!
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
        <div style="margin-top:0.75rem;font-size:0.75rem;color:var(--text-muted)">Premium €29,90 · einmalig, kein Abo</div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  /** Update the credit UI — badge shows AI sessions for paid users & admin */
  updateUI() {
    const costHint = document.getElementById('credit-cost-hint');
    const badge = document.getElementById('credit-badge');
    const badgeCount = document.getElementById('credit-badge-count');
    const badgeTotal = document.getElementById('credit-badge-total');

    // Cost hint is always hidden — questions are unlimited for everyone
    if (costHint) costHint.style.display = 'none';

    // No badge if not logged in or credits not loaded
    if (!Auth.isLoggedIn || !this._credits) {
      if (badge) badge.style.display = 'none';
      return;
    }

    // For free users: hide badge (upgrade button shows at same position top-right)
    // Free users see their AI credits clearly in Konto & Plan screen
    if (!this.isUnlimited()) {
      if (badge) badge.style.display = 'none';
      return;
    }

    // Show AI sessions remaining in badge for paid/admin users
    const aiRem = this.aiSessionsRemaining;
    const aiTotal = this._credits.ai_sessions_total || 0;
    const pct = aiTotal > 0 ? Math.round((aiRem / aiTotal) * 100) : 100;
    let color = '#4ade80';
    if (pct <= 10) color = '#ef4444';
    else if (pct <= 30) color = '#f59e0b';

    if (badge) {
      badge.style.display = '';
      if (badgeCount) {
        badgeCount.textContent = aiRem;
        badgeCount.style.color = color;
      }
      if (badgeTotal) badgeTotal.textContent = `/${aiTotal}`;
    }
  },

  // === Reason labels for credit history ===
  _reasonLabels: {
    question:   'Frage beantwortet',
    pdf_page:   'PDF-Seite generiert',
    purchase:   'Credits gekauft',
    bonus:      'Bonus-Credits',
    ai_session: 'KI-Session genutzt',
    ai_image:   'Banana-Bild generiert',
    tutor:      'Tutor-Chat',
  },

  _reasonIcons: {
    question:   '📝',
    pdf_page:   '📄',
    purchase:   '💳',
    bonus:      '🎁',
    ai_session: '🤖',
    ai_image:   '🍌',
    tutor:      '🎓',
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
