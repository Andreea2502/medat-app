// === MedAT Trainer – Free-User Limits (ehemals "Credits") ===
// Free-User-Limits werden in der `user_credits` Tabelle getrackt:
//   • questions_limit       (default 150) — Lifetime-Cap an Übungsfragen
//   • ai_sessions_used/total (default 0/10) — KI-Tutor-Sessions
//   • ai_images_used/total   (default 0/3)  — Banana-Bilder
//   • lernplan_resets        (default 0)    — Lernplan-Resets
// Premium / Pro / Basic / Admin = unlimitiert (Cap wird nicht geprüft).
//
// Das Objekt heißt aus historischen Gründen weiter `Credits` damit
// bestehende Aufrufe (tutor.js, app.js, pdf.js, lernplan.js, nudge.js,
// admin.js, gallery.js, goodies.js, mascot.js) ohne Refactoring laufen.

const Credits = {
  _credits: null,    // { questions_limit, ai_sessions_used/total, ai_images_used/total, lernplan_resets }
  _loading: false,

  // ── Getter (für UI-Anzeige) ─────────────────────────────────────────────
  get remaining() {
    if (this.isUnlimited()) return 999999;
    const limit = this._credits?.questions_limit ?? 150;
    const used  = Auth.userProfile?.total_questions_answered ?? 0;
    return Math.max(0, limit - used);
  },
  get used()  { return Auth.userProfile?.total_questions_answered ?? 0; },
  get total() { return this._credits?.questions_limit ?? 150; },

  get aiSessionsUsed()      { return this._credits?.ai_sessions_used ?? 0; },
  get aiSessionsTotal()     { return this._credits?.ai_sessions_total ?? 10; },
  get aiSessionsRemaining() { return Math.max(0, this.aiSessionsTotal - this.aiSessionsUsed); },

  get aiImagesUsed()      { return this._credits?.ai_images_used ?? 0; },
  get aiImagesTotal()     { return this._credits?.ai_images_total ?? 3; },
  get aiImagesRemaining() { return Math.max(0, this.aiImagesTotal - this.aiImagesUsed); },

  get lernplanResets() { return this._credits?.lernplan_resets ?? 0; },

  // ── Tier-Check ──────────────────────────────────────────────────────────
  /** Premium / Pro / Basic / Admin = unlimitiert */
  isUnlimited() {
    if (!Auth.isLoggedIn) return false;
    if (typeof Admin !== 'undefined' && Admin.isAdmin?.()) return true;
    if (typeof Admin !== 'undefined' && Admin.isImpersonating?.()) {
      const impTier = Admin._impersonating?.tier;
      return impTier && impTier !== 'free';
    }
    const tier = Auth.userProfile?.license_tier;
    return tier && tier !== 'free';
  },

  // ── Load (aus DB) ───────────────────────────────────────────────────────
  async load() {
    if (!Auth.isLoggedIn) { this._credits = null; return; }
    if (this._loading) return;
    this._loading = true;
    try {
      const { data, error } = await Auth.supabase
        .from('user_credits')
        .select('questions_limit, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, lernplan_resets')
        .eq('user_id', Auth.currentUser.id)
        .maybeSingle();

      if (error) { console.warn('[Credits] load error:', error); }

      if (!data) {
        // Kein Eintrag → Defaults anlegen
        const defaults = {
          user_id: Auth.currentUser.id,
          questions_limit: 150,
          ai_sessions_used: 0, ai_sessions_total: 10,
          ai_images_used: 0,   ai_images_total: 3,
          lernplan_resets: 0,
        };
        const { data: newRow } = await Auth.supabase
          .from('user_credits')
          .insert(defaults)
          .select('questions_limit, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, lernplan_resets')
          .single();
        this._credits = newRow || defaults;
      } else {
        this._credits = data;
      }
    } catch (e) {
      console.warn('[Credits] load exception:', e);
    } finally {
      this._loading = false;
      this.updateUI();
    }
  },

  // ── Question Limit (Free-User-Trial) ────────────────────────────────────
  /** Wird von app.js vor loadAndStartQuestions aufgerufen */
  async getQuestionsRemaining() {
    if (this.isUnlimited()) return 999999;
    return this.remaining;
  },

  hasEnough(amount = 1) {
    if (this.isUnlimited()) return true;
    return this.remaining >= amount;
  },

  /** Legacy-Aufruf: amount, reason, detail. Question-Increments laufen nun
   *  via auth.js → user_profiles.total_questions_answered (zentrales Counter).
   *  Diese Funktion bleibt als No-op damit alte Aufrufer nicht crashen. */
  async use(_amount, _reason, _detail) { return true; },

  // ── KI-Tutor Sessions ───────────────────────────────────────────────────
  hasAiSession() {
    if (this.isUnlimited()) return true;
    return this.aiSessionsRemaining > 0;
  },
  hasAiImage() {
    if (this.isUnlimited()) return true;
    return this.aiImagesRemaining > 0;
  },

  async useAiSession() {
    if (this.isUnlimited()) return true;
    if (!Auth.isLoggedIn) return false;
    if (this.aiSessionsRemaining <= 0) return false;
    try {
      const newUsed = this.aiSessionsUsed + 1;
      const { error } = await Auth.supabase
        .from('user_credits')
        .update({ ai_sessions_used: newUsed, updated_at: new Date().toISOString() })
        .eq('user_id', Auth.currentUser.id);
      if (error) { console.warn('[Credits] useAiSession DB error:', error); return false; }
      this._credits.ai_sessions_used = newUsed;
      this.updateUI();
      return true;
    } catch (e) {
      console.warn('[Credits] useAiSession exception:', e);
      return false;
    }
  },

  async useAiImage() {
    if (this.isUnlimited()) return true;
    if (!Auth.isLoggedIn) return false;
    if (this.aiImagesRemaining <= 0) return false;
    try {
      const newUsed = this.aiImagesUsed + 1;
      const { error } = await Auth.supabase
        .from('user_credits')
        .update({ ai_images_used: newUsed, updated_at: new Date().toISOString() })
        .eq('user_id', Auth.currentUser.id);
      if (error) { console.warn('[Credits] useAiImage DB error:', error); return false; }
      this._credits.ai_images_used = newUsed;
      this.updateUI();
      return true;
    } catch (e) {
      console.warn('[Credits] useAiImage exception:', e);
      return false;
    }
  },

  // ── Paywalls ────────────────────────────────────────────────────────────
  showPaywall()        { App?.showUpgradeOverlay?.('limit_reached'); },
  showAiPaywall(_kind) { App?.showUpgradeOverlay?.('ai_limit_reached'); },

  // ── UI ──────────────────────────────────────────────────────────────────
  updateUI() {
    // Alte Credit-UI ausblenden (Counter, Hint) — Credits nicht mehr sichtbar
    const menuItem = document.getElementById('snav-credits');
    if (menuItem) menuItem.style.display = 'none';
    const counter = document.getElementById('credit-counter');
    if (counter) counter.style.display = 'none';
    const costHint = document.getElementById('credit-cost-hint');
    if (costHint) costHint.style.display = 'none';
  },

  async showHistory() { /* no-op */ },
};
