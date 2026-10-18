// === MedAT KFF Trainer – Admin Dashboard v3 ===
// Full admin: user management, onboarding insights, license management, usage analytics

const Admin = {
  ADMIN_EMAILS: ['office@ai-guide.at', 'andreea.negru@gmx.at'],

  // Cached data
  _users: [],
  _progress: [],
  _licenses: [],
  _onboarding: [],
  _simulations: [],
  _notes: [],
  _questionCount: 0,

  // License selection state
  _selectedLicenseIds: new Set(),

  isAdmin() {
    if (!Auth.isLoggedIn || !Auth.currentUser) return false;
    return this.ADMIN_EMAILS.includes(Auth.currentUser.email);
  },

  async render() {
    const container = document.getElementById('admin-container');
    if (!container) return;

    if (!Auth.isLoggedIn || !Auth.currentUser) {
      container.innerHTML = '<div class="adm-empty"><div class="adm-empty-icon">🔒</div><div class="adm-empty-title">Nicht eingeloggt</div><div class="adm-empty-sub">Admin-Zugang nur für berechtigte Accounts.</div></div>';
      return;
    }

    if (!this.isAdmin()) {
      container.innerHTML = `<div class="adm-empty"><div class="adm-empty-icon">⛔</div><div class="adm-empty-title">Kein Admin-Zugang</div><div class="adm-empty-sub">Eingeloggt als: ${Auth.currentUser.email || 'unbekannt'}</div></div>`;
      return;
    }

    container.innerHTML = '<div class="adm-loading"><div class="spinner"></div><span>Admin-Dashboard wird geladen...</span></div>';

    try {
      const [users, progress, questions, licenses, onboarding, simulations, notes, creditData] = await Promise.allSettled([
        this._loadUsers(),
        this._loadAllProgress(),
        this._loadQuestionCount(),
        this._loadLicenses(),
        this._loadOnboarding(),
        this._loadSimulations(),
        this._loadNotes(),
        this._loadAllCredits(),
      ]);

      this._users = users.status === 'fulfilled' ? users.value : [];
      this._progress = progress.status === 'fulfilled' ? progress.value : [];
      this._questionCount = questions.status === 'fulfilled' ? questions.value : 0;
      this._licenses = licenses.status === 'fulfilled' ? licenses.value : [];
      this._onboarding = onboarding.status === 'fulfilled' ? onboarding.value : [];
      this._simulations = simulations.status === 'fulfilled' ? simulations.value : [];
      this._notes = notes.status === 'fulfilled' ? notes.value : [];
      this._creditsByUser = creditData.status === 'fulfilled' ? creditData.value : {};
      this._selectedLicenseIds = new Set();

      container.innerHTML = this._buildDashboard();
      this._bindAdminEvents();
    } catch (e) {
      container.innerHTML = `<div class="adm-empty"><div class="adm-empty-icon">❌</div><div class="adm-empty-title">Fehler</div><div class="adm-empty-sub">${e.message}</div></div>`;
    }
  },

  // ===== API HELPERS =====
  async _adminCall(action, params = {}) {
    const session = await Auth.supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Nicht eingeloggt');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/admin-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action, ...params }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const result = await resp.json();
      if (!resp.ok || result.error) throw new Error(result.error || 'Admin-API Fehler');
      return result.data;
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') throw new Error(`Timeout: ${action}`);
      throw e;
    }
  },

  async _loadUsers() { try { return await this._adminCall('list-users') || []; } catch { return []; } },
  async _loadAllProgress() { try { return await this._adminCall('get-progress') || []; } catch { return []; } },
  async _loadLicenses() { try { return await this._adminCall('list-licenses') || []; } catch { return []; } },
  async _loadOnboarding() { try { return await this._adminCall('list-onboarding') || []; } catch { return []; } },
  async _loadSimulations() {
    if (!Auth.supabase) return [];
    try {
      const { data: sims } = await Auth.supabase.from('simulations').select('*').order('number');
      if (!sims || sims.length === 0) return [];
      const { data: sqData } = await Auth.supabase.from('simulation_questions').select('simulation_id, section');
      const countMap = {};
      (sqData || []).forEach(sq => {
        if (!countMap[sq.simulation_id]) countMap[sq.simulation_id] = {};
        countMap[sq.simulation_id][sq.section] = (countMap[sq.simulation_id][sq.section] || 0) + 1;
      });
      return sims.map(s => ({ ...s, _sectionCounts: countMap[s.id] || {}, _totalQuestions: Object.values(countMap[s.id] || {}).reduce((a, b) => a + b, 0) }));
    } catch { return []; }
  },
  async _loadNotes() { try { return await this._adminCall('list-notes') || []; } catch { return []; } },
  async _loadAllCredits() {
    if (!Auth.supabase) return {};
    try {
      const { data, error } = await Auth.supabase.from('user_credits')
        .select('user_id, credits_total, credits_used, ai_sessions_used, ai_sessions_total, ai_images_used, ai_images_total, lernplan_resets');
      if (error || !data) return {};
      const map = {};
      data.forEach(c => {
        map[c.user_id] = {
          total:     c.credits_total,
          used:      c.credits_used,
          remaining: Math.max(0, c.credits_total - c.credits_used),
          aiSessUsed:  c.ai_sessions_used  ?? 0,
          aiSessTotal: c.ai_sessions_total ?? 0,
          aiImgUsed:   c.ai_images_used    ?? 0,
          aiImgTotal:  c.ai_images_total   ?? 0,
          lernplanResets: c.lernplan_resets ?? 0,
        };
      });
      return map;
    } catch { return {}; }
  },
  _buildAIUsageCard() {
    // Collect all users with AI usage
    const rows = [];
    let totalSessUsed = 0, totalSessTotal = 0, totalImgUsed = 0, totalImgTotal = 0;

    for (const u of this._users) {
      const cr = this._creditsByUser?.[u.user_id];
      if (!cr) continue;
      const sessUsed = cr.aiSessUsed || 0;
      const sessTotal = cr.aiSessTotal || 0;
      const imgUsed = cr.aiImgUsed || 0;
      const imgTotal = cr.aiImgTotal || 0;
      totalSessUsed += sessUsed;
      totalSessTotal += sessTotal;
      totalImgUsed += imgUsed;
      totalImgTotal += imgTotal;

      // Only show users who have used at least 1 session or image
      if (sessUsed > 0 || imgUsed > 0) {
        rows.push({ name: u.display_name || u.username || u.email || '?', tier: u.license_tier || 'free', sessUsed, sessTotal, imgUsed, imgTotal });
      }
    }

    // Sort by most usage
    rows.sort((a, b) => (b.sessUsed + b.imgUsed) - (a.sessUsed + a.imgUsed));

    // Estimated cost
    const estCostSess = totalSessUsed * 0.0014;
    const estCostImg = totalImgUsed * 0.07;
    const estCostTotal = estCostSess + estCostImg;

    const tierBadge = (t) => {
      const colors = { free: '#94a3b8', basic: '#7c3aed', premium: '#f59e0b' };
      return `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:0.65rem;font-weight:700;background:${colors[t] || '#94a3b8'}20;color:${colors[t] || '#94a3b8'}">${t}</span>`;
    };

    const sessPct = (used, total) => {
      if (!total) return '';
      const pct = Math.round((used / total) * 100);
      const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981';
      return `<div style="width:50px;height:5px;background:#e5e7eb;border-radius:3px;display:inline-block;vertical-align:middle;margin-left:4px">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:3px"></div>
      </div>`;
    };

    return `
      <div class="adm-card" style="border-left:3px solid #f59e0b">
        <div class="adm-card-header" style="display:flex;align-items:center;justify-content:space-between">
          <span>🤖 KI-Nutzung</span>
          <span style="font-size:0.75rem;color:var(--text-secondary)">Geschätzte Kosten: <strong style="color:#ef4444">$${estCostTotal.toFixed(2)}</strong></span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:1rem">
          <div style="text-align:center;padding:0.5rem;background:var(--bg-warm);border-radius:8px">
            <div style="font-size:1.2rem;font-weight:800;color:var(--text)">${totalSessUsed}</div>
            <div style="font-size:0.65rem;color:var(--text-secondary)">Sessions genutzt</div>
          </div>
          <div style="text-align:center;padding:0.5rem;background:var(--bg-warm);border-radius:8px">
            <div style="font-size:1.2rem;font-weight:800;color:var(--text)">${totalImgUsed}</div>
            <div style="font-size:0.65rem;color:var(--text-secondary)">Bilder generiert</div>
          </div>
          <div style="text-align:center;padding:0.5rem;background:var(--bg-warm);border-radius:8px">
            <div style="font-size:1.2rem;font-weight:800;color:#f59e0b">$${estCostSess.toFixed(2)}</div>
            <div style="font-size:0.65rem;color:var(--text-secondary)">Kosten Sessions</div>
          </div>
          <div style="text-align:center;padding:0.5rem;background:var(--bg-warm);border-radius:8px">
            <div style="font-size:1.2rem;font-weight:800;color:#ef4444">$${estCostImg.toFixed(2)}</div>
            <div style="font-size:0.65rem;color:var(--text-secondary)">Kosten Bilder</div>
          </div>
        </div>

        ${rows.length > 0 ? `
        <div class="adm-table-wrap">
          <table class="adm-table" style="font-size:0.78rem">
            <thead><tr>
              <th>User</th><th>Plan</th>
              <th style="text-align:center">🤖 Sessions frei</th>
              <th style="text-align:center">🍌 Bilder frei</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => {
                const sessRemain = Math.max(0, r.sessTotal - r.sessUsed);
                const imgRemain  = Math.max(0, r.imgTotal  - r.imgUsed);
                const sessColor = sessRemain === 0 ? '#ef4444' : sessRemain <= 2 ? '#f59e0b' : '#10b981';
                const imgColor  = imgRemain  === 0 ? '#ef4444' : imgRemain  <= 1 ? '#f59e0b' : '#10b981';
                return `
                <tr>
                  <td style="font-weight:600">${r.name}</td>
                  <td>${tierBadge(r.tier)}</td>
                  <td style="text-align:center">
                    <span style="font-weight:700;color:${sessColor}">${sessRemain}</span>
                    <span style="color:#94a3b8;font-size:0.7rem"> / ${r.sessTotal}</span>
                    ${sessPct(r.sessUsed, r.sessTotal)}
                  </td>
                  <td style="text-align:center">
                    <span style="font-weight:700;color:${imgColor}">${imgRemain}</span>
                    <span style="color:#94a3b8;font-size:0.7rem"> / ${r.imgTotal}</span>
                    ${sessPct(r.imgUsed, r.imgTotal)}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div style="text-align:center;color:var(--text-secondary);font-size:0.85rem;padding:1rem">Noch keine KI-Nutzung</div>'}
      </div>
    `;
  },

  async _loadQuestionCount() {
    if (!Auth.supabase) return 0;
    const { count, error } = await Auth.supabase.from('questions').select('id', { count: 'exact', head: true });
    return error ? 0 : (count || 0);
  },

  // ===== LABEL HELPERS =====
  _uniLabel(val) {
    const map = { wien: '🏛️ Wien', graz: '🏔️ Graz', innsbruck: '⛰️ Innsbruck', linz: '🌉 Linz' };
    return map[val] || val || '–';
  },
  _sectionLabel(val) {
    const map = { bms: '🧬 BMS', tv: '📖 Textverständnis', kff: '🧩 KFF', sek: '💬 SEK' };
    return map[val] || val || '–';
  },
  _confidenceLabel(val) {
    const map = { sehr_sicher: '💪 Ziemlich sicher', unsicher: '🤔 Unsicher', angst: '😟 Große Angst' };
    return map[val] || val || '–';
  },
  _studyTimeLabel(val) {
    const map = { morgens: '🌅 Morgens', mittags: '☀️ Mittags', abends: '🌙 Abends' };
    return map[val] || val || '–';
  },
  _formatDate(d) {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  _formatDateTime(d) {
    if (!d) return '–';
    return new Date(d).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  // ===== BUILD DASHBOARD =====
  _buildDashboard() {
    const users = this._users;
    const progress = this._progress;
    const licenses = this._licenses;
    const onboarding = this._onboarding;

    const uniqueUsers = users.length;
    const totalAnswers = progress.length;
    const correctAnswers = progress.filter(p => p.answered_correctly).length;

    const today = new Date().toISOString().split('T')[0];
    const todayProgress = progress.filter(p => p.answered_at && p.answered_at.startsWith(today));
    const todayUsers = new Set(todayProgress.map(p => p.user_id || p.session_id)).size;

    const totalLicenses = licenses.length;
    const activatedLicenses = licenses.filter(l => l.activated).length;
    // Revenue: only count users who actually paid (have a license_code set — either via Stripe or license code activation)
    // Manual admin upgrades do NOT set license_code, so they won't count
    const basicUsers = users.filter(u => u.license_tier === 'basic' && u.license_code).length;
    const proUsers = users.filter(u => u.license_tier === 'pro' && u.license_code).length;
    const premiumUsers = users.filter(u => u.license_tier === 'premium' && u.license_code).length;
    const paidUsers = basicUsers + proUsers + premiumUsers;
    // Legacy-Tiers (basic €19,90 / pro €29,90) bleiben für Bestandskunden in der Berechnung,
    // Premium ist jetzt einheitlich €29,90 — einziger verkäuflicher Plan.
    const totalRevenue = (basicUsers * 19.90) + (proUsers * 29.90) + (premiumUsers * 29.90);

    // Last 7 days
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayP = progress.filter(p => p.answered_at && p.answered_at.startsWith(key));
      last7.push({ date: key, count: dayP.length, users: new Set(dayP.map(p => p.user_id || p.session_id)).size });
    }

    // Per-user progress
    const userProgress = {};
    progress.forEach(p => {
      const uid = p.user_id || p.session_id;
      if (!userProgress[uid]) userProgress[uid] = { total: 0, correct: 0, sections: {} };
      userProgress[uid].total++;
      if (p.answered_correctly) userProgress[uid].correct++;
      const sk = p.section_key || 'unknown';
      userProgress[uid].sections[sk] = (userProgress[uid].sections[sk] || 0) + 1;
    });

    // Onboarding keyed by user_id
    const onboardingByUser = {};
    onboarding.forEach(o => { if (o.user_id) onboardingByUser[o.user_id] = o; });

    // Section popularity
    const bySec = {};
    progress.forEach(p => { const k = p.section_key || 'unknown'; bySec[k] = (bySec[k] || 0) + 1; });
    const secPopularity = Object.entries(bySec).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return `
      <!-- TABS -->
      <div class="adm-tabs">
        <button class="adm-tab active" data-tab="overview">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Übersicht
        </button>
        <button class="adm-tab" data-tab="users">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Nutzer <span class="adm-tab-badge">${uniqueUsers}</span>
        </button>
        <button class="adm-tab" data-tab="activity">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Aktivitäten
        </button>
        <button class="adm-tab" data-tab="licenses">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Lizenzen <span class="adm-tab-badge">${totalLicenses}</span>
        </button>
        <button class="adm-tab" data-tab="tools">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Tools
        </button>
        <button class="adm-tab" data-tab="simulations">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Simulationen <span class="adm-tab-badge">${this._simulations.length}</span>
        </button>
        <button class="adm-tab" data-tab="goodies">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          Cheat Sheets
        </button>
      </div>

      <!-- OVERVIEW TAB -->
      <div id="adm-tab-overview" class="adm-tab-content active">
        <div class="adm-stats-grid">
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#e8f4fd;color:#3b82f6">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">${uniqueUsers}</div>
              <div class="adm-stat-label">Registrierte Nutzer</div>
            </div>
          </div>
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#fef3c7;color:#d97706">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">${todayUsers}</div>
              <div class="adm-stat-label">Heute aktiv</div>
            </div>
          </div>
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#ede9fe;color:#7c3aed">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">€${totalRevenue.toFixed(0)}</div>
              <div class="adm-stat-label">Umsatz (${paidUsers} zahlend)</div>
            </div>
          </div>
        </div>

        ${this._buildAIUsageCard()}

        <div class="adm-card">
          <div class="adm-card-header">Aktivität letzte 7 Tage</div>
          <div class="adm-table-wrap">
            <table class="adm-table">
              <thead><tr><th>Datum</th><th>Antworten</th><th>Aktive Nutzer</th></tr></thead>
              <tbody>${last7.map(d => {
                const weekday = new Date(d.date).toLocaleDateString('de-AT', { weekday: 'short' });
                return `<tr><td><span class="adm-date-day">${weekday}</span> ${d.date}</td><td><strong>${d.count}</strong></td><td>${d.users}</td></tr>`;
              }).join('')}</tbody>
            </table>
          </div>
        </div>

        <div class="adm-card">
          <div class="adm-card-header">Beliebteste Sektionen</div>
          <div class="adm-section-bars">
            ${secPopularity.map(([key, count]) => {
              const maxCount = secPopularity[0]?.[1] || 1;
              const pct = Math.round((count / maxCount) * 100);
              return `<div class="adm-bar-row">
                <span class="adm-bar-label">${key}</span>
                <div class="adm-bar-track"><div class="adm-bar-fill" style="width:${pct}%"></div></div>
                <span class="adm-bar-value">${count}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- USERS TAB -->
      <div id="adm-tab-users" class="adm-tab-content">
        <div class="adm-card">
          <div class="adm-card-header">
            Alle Nutzer
            <span class="adm-card-badge">${uniqueUsers} registriert</span>
          </div>
          <div class="adm-search-row" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <input type="text" id="adm-user-search" class="adm-search-input" placeholder="Nutzer suchen (Name, Email)..." style="flex:1;min-width:200px">
            <button class="adm-btn adm-btn-ghost" id="adm-export-users" style="white-space:nowrap">📥 CSV Export</button>
          </div>
          <div class="adm-table-wrap" style="max-height:700px;overflow-y:auto">
            <table class="adm-table adm-table-users">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Abo</th>
                  <th>KI frei</th>
                  <th>Registriert</th>
                  <th>Letzte Aktivität</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody id="adm-users-tbody">
                ${users.map(u => {
                  const isUpgraded = u.license_tier === 'basic' || u.license_tier === 'premium';
                  const tierLabel = (u.license_tier || 'free').toUpperCase();
                  const tierClass = isUpgraded ? 'adm-tier-paid' : 'adm-tier-free';
                  const isBlocked = !!u.blocked;
                  const lastActive = u.last_active_date ? this._formatDateTime(u.last_active_date + 'T00:00:00') : '–';

                  // KI-Sessions & Bilder verbleibend
                  const cr = this._creditsByUser?.[u.user_id];
                  let creditHTML = '';
                  if (cr) {
                    const sessRemain = Math.max(0, cr.aiSessTotal - cr.aiSessUsed);
                    const imgRemain  = Math.max(0, cr.aiImgTotal  - cr.aiImgUsed);
                    const sessTotal  = cr.aiSessTotal;
                    const imgTotal   = cr.aiImgTotal;
                    // Color: green = plenty, yellow = few left, red = 0
                    const sessColor = sessRemain === 0 ? '#ef4444' : sessRemain <= 2 ? '#f59e0b' : '#10b981';
                    const imgColor  = imgRemain  === 0 ? '#ef4444' : imgRemain  <= 1 ? '#f59e0b' : '#10b981';
                    creditHTML = `
                      <div style="font-size:0.72rem;white-space:nowrap;line-height:1.6">
                        <div>🤖 <span style="font-weight:700;color:${sessColor}">${sessRemain}</span><span style="color:#94a3b8"> / ${sessTotal} frei</span></div>
                        <div>🍌 <span style="font-weight:700;color:${imgColor}">${imgRemain}</span><span style="color:#94a3b8"> / ${imgTotal} frei</span></div>
                      </div>`;
                  } else {
                    creditHTML = '<span style="color:#94a3b8;font-size:0.75rem">–</span>';
                  }

                  return `
                  <tr data-userid="${u.user_id}" data-search="${(u.display_name || '').toLowerCase()} ${(u.username || '').toLowerCase()} ${(u.email || '').toLowerCase()}"${isBlocked ? ' class="adm-row-blocked"' : ''}>
                    <td>
                      <div class="adm-user-cell">
                        <div class="adm-avatar">${(u.username || u.display_name || '?')[0].toUpperCase()}</div>
                        <a href="#" class="adm-user-link" data-userid="${u.user_id}">${u.username || u.display_name || '–'}${isBlocked ? ' 🚫' : ''}</a>
                      </div>
                    </td>
                    <td>${u.email ? `<a href="mailto:${u.email}" class="adm-email-link">${u.email}</a>` : '<span class="adm-muted">–</span>'}</td>
                    <td><span class="adm-tier ${tierClass}">${tierLabel}</span></td>
                    <td style="white-space:nowrap;text-align:center">${creditHTML}</td>
                    <td style="white-space:nowrap">${this._formatDate(u.created_at)}</td>
                    <td style="white-space:nowrap">${lastActive}</td>
                    <td style="white-space:nowrap">
                      <div style="display:flex;gap:4px;flex-wrap:wrap">
                        <button class="adm-btn-sm adm-btn-edit-plan" data-userid="${u.user_id}" data-username="${u.username || u.display_name || ''}" data-tier="${u.license_tier || 'free'}" title="Plan & Credits bearbeiten">✏️ Plan</button>
                        ${isBlocked
                          ? `<button class="adm-btn-sm adm-btn-unblock" data-userid="${u.user_id}">Entsperren</button>`
                          : `<button class="adm-btn-sm adm-btn-block" data-userid="${u.user_id}" data-username="${u.username || u.display_name || ''}">🔒 Sperren</button>`
                        }
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- USER DETAIL MODAL -->
      <div id="adm-user-modal" class="adm-modal-overlay" style="display:none">
        <div class="adm-modal">
          <div class="adm-modal-header">
            <h3 id="adm-modal-title">Nutzer-Details</h3>
            <button class="adm-modal-close" id="adm-modal-close">✕</button>
          </div>
          <div id="adm-modal-body" class="adm-modal-body"></div>
        </div>
      </div>

      <!-- ACTIVITY TAB -->
      <div id="adm-tab-activity" class="adm-tab-content">
        <div class="adm-card">
          <div class="adm-card-header">
            Nutzer-Aktivitäten
            <span class="adm-card-badge">${progress.length} Antworten · ${this._simulations.length} Simulationen</span>
          </div>
          <div class="adm-search-row" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
            <input type="text" id="adm-activity-search" class="adm-search-input" placeholder="Nutzer suchen..." style="flex:1;min-width:200px">
          </div>
        </div>
        <div id="adm-activity-cards">
          ${this._buildActivityCards(users, progress, userProgress, onboardingByUser)}
        </div>
      </div>

      <!-- LICENSES TAB -->
      <div id="adm-tab-licenses" class="adm-tab-content">
        <!-- License Stats -->
        <div class="adm-stats-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#fef3c7;color:#d97706">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">${totalLicenses}</div>
              <div class="adm-stat-label">Gesamt</div>
            </div>
          </div>
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#d1fae5;color:#059669">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">${activatedLicenses}</div>
              <div class="adm-stat-label">Aktiviert</div>
            </div>
          </div>
          <div class="adm-stat">
            <div class="adm-stat-icon" style="background:#e0f2fe;color:#0284c7">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div class="adm-stat-info">
              <div class="adm-stat-number">${totalLicenses - activatedLicenses}</div>
              <div class="adm-stat-label">Unbenutzt</div>
            </div>
          </div>
        </div>

        <!-- Generate Licenses -->
        <div class="adm-card">
          <div class="adm-card-header">Lizenzen generieren</div>
          <div class="adm-form-grid">
            <div class="adm-form-group">
              <label>Tier</label>
              <select id="admin-license-tier" class="adm-select">
                <option value="basic" selected>Vollzugang (€17)</option>
                <option value="premium">Premium</option>
                <option value="free">Free</option>
              </select>
            </div>
            <div class="adm-form-group">
              <label>Gültigkeit (Tage)</label>
              <input type="number" id="admin-license-validity" value="180" min="0" max="3650" class="adm-input">
              <small>0 = unbegrenzt</small>
            </div>
            <div class="adm-form-group">
              <label>Anzahl Codes</label>
              <input type="number" id="admin-license-count" value="1" min="1" max="500" class="adm-input">
            </div>
            <div class="adm-form-group">
              <label>Max. Nutzungen pro Code</label>
              <input type="number" id="admin-license-maxuses" value="1" min="0" max="10000" class="adm-input">
              <small>1 = Einzelcode, >1 = Mehrfachcode, 0 = unbegrenzt</small>
            </div>
          </div>
          <button class="adm-btn adm-btn-primary" id="admin-generate-licenses" style="margin-top:1rem">Lizenzen generieren</button>
          <div id="admin-license-status" style="margin-top:0.5rem;font-size:0.85rem"></div>
        </div>

        <!-- Existing Licenses -->
        <div class="adm-card">
          <div class="adm-card-header">
            Alle Lizenzen
            <span class="adm-card-badge">${totalLicenses} total</span>
          </div>

          <!-- Bulk actions bar -->
          <div class="adm-bulk-bar" id="adm-bulk-bar" style="display:none">
            <span id="adm-bulk-count">0 ausgewählt</span>
            <button class="adm-btn adm-btn-danger adm-btn-sm" id="adm-bulk-delete">🗑️ Ausgewählte löschen</button>
            <button class="adm-btn adm-btn-ghost adm-btn-sm" id="adm-bulk-clear">Auswahl aufheben</button>
          </div>

          <!-- Filters -->
          <div class="adm-filter-row">
            <button class="adm-filter active" data-filter="all">Alle</button>
            <button class="adm-filter" data-filter="unused">Unbenutzt</button>
            <button class="adm-filter" data-filter="basic">Basic</button>
            <button class="adm-filter" data-filter="premium">Premium</button>
            <button class="adm-filter" data-filter="free">Free</button>
          </div>

          <div class="adm-table-wrap" style="max-height:500px;overflow-y:auto" id="adm-licenses-table-wrap">
            <table class="adm-table adm-table-licenses">
              <thead>
                <tr>
                  <th style="width:36px"><input type="checkbox" id="adm-select-all" title="Alle auswählen"></th>
                  <th>Code</th>
                  <th>Tier</th>
                  <th>Gültig</th>
                  <th>Nutzung</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Erstellt</th>
                  <th style="width:36px"></th>
                </tr>
              </thead>
              <tbody id="adm-licenses-tbody">
                ${this._buildLicenseRows(licenses)}
              </tbody>
            </table>
          </div>
          <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
            <button class="adm-btn adm-btn-ghost" id="admin-export-licenses">📥 CSV Export (unbenutzte Codes)</button>
          </div>
        </div>
      </div>

      <!-- TOOLS TAB -->
      <div id="adm-tab-tools" class="adm-tab-content">
        <div class="adm-card" style="border:2px solid #6d28d9;background:linear-gradient(135deg,#faf5ff,#f3e8ff)">
          <div class="adm-card-header" style="color:#6d28d9">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Fragen-PDF Export
          </div>
          <p style="font-size:0.85rem;color:#666;margin-bottom:0.75rem">Exportiere alle Fragen als professionelles PDF mit Inhaltsverzeichnis, nach Themen sortiert, inkl. Antworten & Erklärungen.</p>
          <button class="adm-btn adm-btn-primary" onclick="PDFExport.openAdminExportDialog()" style="background:linear-gradient(135deg,#1a1a2e,#6d28d9);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:0.9rem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Fragen-PDF erstellen
          </button>
        </div>
        <div class="adm-card" style="border:2px solid #f5c542;background:linear-gradient(135deg,#fffdf5,#fff9e6)">
          <div class="adm-card-header" style="color:#1a1a2e">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5c542" stroke-width="2" style="vertical-align:middle;margin-right:6px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Lead Magnet PDFs generieren
          </div>
          <p style="font-size:0.85rem;color:#666;margin-bottom:0.75rem">Generiere 3 komplette Gratis-Simulationen als PDF aus der <code>leadmagnet_questions</code> Tabelle. Design im BMS Master Cover-Stil.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="adm-btn" onclick="LeadMagnetPDF.generateSimulation(1)" style="background:linear-gradient(135deg,#1a1a2e,#2d2d5e);border:none;color:#f5c542;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
              Simulation 1
            </button>
            <button class="adm-btn" onclick="LeadMagnetPDF.generateSimulation(2)" style="background:linear-gradient(135deg,#1a1a2e,#2d2d5e);border:none;color:#f5c542;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
              Simulation 2
            </button>
            <button class="adm-btn" onclick="LeadMagnetPDF.generateSimulation(3)" style="background:linear-gradient(135deg,#1a1a2e,#2d2d5e);border:none;color:#f5c542;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
              Simulation 3
            </button>
            <button class="adm-btn" onclick="LeadMagnetPDF.generateAll()" style="background:linear-gradient(135deg,#f5c542,#e0a820);border:none;color:#1a1a2e;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:700">
              Alle 3 generieren
            </button>
          </div>
        </div>
        <div class="adm-card">
          <div class="adm-card-header">Fragen hochladen</div>
          <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem">Lade neue Fragen als JSON-Datei hoch.</p>
          <input type="file" id="admin-upload-questions" accept=".json" class="adm-input" style="padding:0.5rem">
          <button class="adm-btn adm-btn-primary" onclick="Admin.uploadQuestions()" style="margin-top:0.5rem">Fragen importieren</button>
          <div id="admin-upload-status" style="margin-top:0.5rem;font-size:0.85rem"></div>
        </div>
        <div class="adm-card">
          <div class="adm-card-header">Datenbank-Info</div>
          <div class="adm-stats-grid" style="grid-template-columns:1fr 1fr">
            <div class="adm-stat">
              <div class="adm-stat-icon" style="background:#e0f2fe;color:#0284c7">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><ellipse cx="12" cy="5" rx="9" ry="3"/></svg>
              </div>
              <div class="adm-stat-info">
                <div class="adm-stat-number">${this._questionCount}</div>
                <div class="adm-stat-label">Fragen in DB</div>
              </div>
            </div>
            <div class="adm-stat">
              <div class="adm-stat-icon" style="background:#d1fae5;color:#059669">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div class="adm-stat-info">
                <div class="adm-stat-number">${this._onboarding.length}</div>
                <div class="adm-stat-label">Onboarding-Einträge</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SIMULATIONS TAB -->
      <div id="adm-tab-simulations" class="adm-tab-content">
        ${this._buildSimulationsTab()}
      </div>

      <!-- GOODIES TAB (delegated to AdminGoodies module) -->
      <div id="adm-tab-goodies" class="adm-tab-content">
        <div id="agd-root">
          <div style="text-align:center;padding:2rem;color:var(--text-muted)">Klicke den "Cheat Sheets"-Tab, um Goodies zu verwalten.</div>
        </div>
      </div>
    `;
  },

  // ===== SIMULATION STRUCTURE (MedAT-H 2026) =====
  SIM_STRUCTURE: [
    { section: 'bms_biologie', label: 'Biologie', count: 40, source: 'questions', type: 'bms', subtype: 'biologie', group: 'BMS' },
    { section: 'bms_chemie', label: 'Chemie', count: 24, source: 'questions', type: 'bms', subtype: 'chemie', group: 'BMS' },
    { section: 'bms_physik', label: 'Physik', count: 18, source: 'questions', type: 'bms', subtype: 'physik', group: 'BMS' },
    { section: 'bms_mathematik', label: 'Mathematik', count: 12, source: 'questions', type: 'bms', subtype: 'mathematik', group: 'BMS' },
    { section: 'tv', label: 'Textverständnis', count: 4, source: 'pre_generated_tv', group: 'TV' },
    { section: 'zahlenfolge', label: 'Zahlenfolgen', count: 10, source: 'questions', type: 'zahlenfolge', group: 'KFF' },
    { section: 'wortfluessigkeit', label: 'Wortflüssigkeit', count: 15, source: 'questions', type: 'wortfluessigkeit', group: 'KFF' },
    { section: 'implikation', label: 'Implikationen', count: 10, source: 'questions', type: 'implikation', group: 'KFF' },
    { section: 'sek_erkennen', label: 'SEK Erkennen', count: 14, source: 'pre_generated_sek', sek_type: 'erkennen', group: 'SEK' },
    { section: 'sek_regulieren', label: 'SEK Regulieren', count: 12, source: 'pre_generated_sek', sek_type: 'regulieren', group: 'SEK' },
    { section: 'sek_entscheiden', label: 'SEK Entscheiden', count: 14, source: 'pre_generated_sek', sek_type: 'entscheiden', group: 'SEK' },
  ],

  _buildSimulationsTab() {
    const sims = this._simulations || [];
    const totalAssigned = sims.reduce((a, s) => a + (s._totalQuestions || 0), 0);

    // Per-sim DB questions: 40+24+18+12+10+15+10+14+12+14 = 169 DB questions + 4 TV texts
    const dbQuestionsPerSim = 173;

    return `
      <div class="adm-stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="adm-stat">
          <div class="adm-stat-icon" style="background:#e0f2fe;color:#0284c7">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="adm-stat-info">
            <div class="adm-stat-number">${sims.length}</div>
            <div class="adm-stat-label">Simulationen erstellt</div>
          </div>
        </div>
        <div class="adm-stat">
          <div class="adm-stat-icon" style="background:#d1fae5;color:#059669">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="adm-stat-info">
            <div class="adm-stat-number">${totalAssigned}</div>
            <div class="adm-stat-label">Fragen zugewiesen</div>
          </div>
        </div>
        <div class="adm-stat">
          <div class="adm-stat-icon" style="background:#fef3c7;color:#d97706">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div class="adm-stat-info">
            <div class="adm-stat-number">${dbQuestionsPerSim}/Sim</div>
            <div class="adm-stat-label">DB-Fragen pro Simulation</div>
          </div>
        </div>
      </div>

      <div class="adm-card" style="border:2px solid #059669;background:linear-gradient(135deg,#f0fdf4,#dcfce7)">
        <div class="adm-card-header" style="color:#059669">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:6px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Neue Simulation erstellen
        </div>
        <p style="font-size:0.85rem;color:#666;margin-bottom:0.75rem">Erstellt eine neue MedAT-Simulation mit automatischer Fragenzuweisung. Fragen werden zufällig aus dem Pool gewählt und nicht doppelt vergeben. Figuren und Allergieausweise werden bei der Durchführung generiert (Seed = Simulationsnummer).</p>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">
          <button class="adm-btn adm-btn-primary" id="adm-create-sim" style="background:linear-gradient(135deg,#059669,#10b981);border:none;color:#fff;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:0.9rem;font-weight:600">
            + Simulation ${sims.length + 1} erstellen
          </button>
          <span id="adm-sim-status" style="font-size:0.85rem"></span>
        </div>
      </div>

      <div class="adm-card">
        <div class="adm-card-header">
          MedAT-H 2026 Struktur pro Simulation
          <span class="adm-card-badge">229 Aufgaben total</span>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table" style="font-size:0.85rem">
            <thead><tr><th>Testabschnitt</th><th>Bereich</th><th>Anzahl</th><th>Quelle</th></tr></thead>
            <tbody>
              <tr><td rowspan="4" style="font-weight:600;vertical-align:middle">BMS (94)</td><td>Biologie</td><td>40</td><td>DB</td></tr>
              <tr><td>Chemie</td><td>24</td><td>DB</td></tr>
              <tr><td>Physik</td><td>18</td><td>DB</td></tr>
              <tr><td>Mathematik</td><td>12</td><td>DB</td></tr>
              <tr><td style="font-weight:600">TV (12)</td><td>Textverständnis</td><td>4 Texte (je 3 Fragen)</td><td>DB</td></tr>
              <tr><td rowspan="5" style="font-weight:600;vertical-align:middle">KFF (83)</td><td>Figuren zusammensetzen</td><td>15</td><td style="color:#d97706">Generiert</td></tr>
              <tr><td>Allergieausweise</td><td>8 Lern + 25 Abruf</td><td style="color:#d97706">Generiert</td></tr>
              <tr><td>Zahlenfolgen</td><td>10</td><td>DB</td></tr>
              <tr><td>Wortflüssigkeit</td><td>15</td><td>DB</td></tr>
              <tr><td>Implikationen</td><td>10</td><td>DB</td></tr>
              <tr><td rowspan="3" style="font-weight:600;vertical-align:middle">SEK (40)</td><td>Emotionen erkennen</td><td>14</td><td>DB</td></tr>
              <tr><td>Emotionen regulieren</td><td>12</td><td>DB</td></tr>
              <tr><td>Soziales Entscheiden</td><td>14</td><td>DB</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${sims.length > 0 ? `
        <div class="adm-card">
          <div class="adm-card-header">
            Erstellte Simulationen
            <span class="adm-card-badge">${sims.length} Simulationen</span>
          </div>
          <div class="adm-table-wrap">
            <table class="adm-table">
              <thead><tr><th>#</th><th>Name</th><th>Fragen (DB)</th><th>Status</th><th>Erstellt</th><th>Aktion</th></tr></thead>
              <tbody>
                ${sims.map(s => {
                  const sc = s._sectionCounts || {};
                  const bmsCount = (sc.bms_biologie||0) + (sc.bms_chemie||0) + (sc.bms_physik||0) + (sc.bms_mathematik||0);
                  const tvCount = sc.tv || 0;
                  const kffCount = (sc.zahlenfolge||0) + (sc.wortfluessigkeit||0) + (sc.implikation||0);
                  const sekCount = (sc.sek_erkennen||0) + (sc.sek_regulieren||0) + (sc.sek_entscheiden||0);
                  const total = s._totalQuestions || 0;
                  const isComplete = total >= 173;
                  return `<tr>
                    <td style="font-weight:700;font-size:1.1rem">${s.number}</td>
                    <td>${s.name || 'Simulation ' + s.number}</td>
                    <td>
                      <div style="display:flex;gap:0.3rem;flex-wrap:wrap;font-size:0.8rem">
                        <span style="background:#e0f2fe;padding:1px 6px;border-radius:8px" title="BMS">🧬${bmsCount}</span>
                        <span style="background:#fef3c7;padding:1px 6px;border-radius:8px" title="TV">📖${tvCount}</span>
                        <span style="background:#ede9fe;padding:1px 6px;border-radius:8px" title="KFF (DB)">🧩${kffCount}</span>
                        <span style="background:#fce7f3;padding:1px 6px;border-radius:8px" title="SEK">💬${sekCount}</span>
                      </div>
                    </td>
                    <td>${isComplete ? '<span style="color:#059669;font-weight:600">✓ Vollständig</span>' : '<span style="color:#d97706">⚠ Unvollständig ('+total+'/173)</span>'}</td>
                    <td style="font-size:0.85rem">${this._formatDate(s.created_at)}</td>
                    <td style="white-space:nowrap">
                      <button class="adm-btn-sm adm-export-sim-pdf" data-simid="${s.id}" data-simnum="${s.number}" style="font-size:0.8rem;background:linear-gradient(135deg,#1a1a2e,#6d28d9);color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;margin-right:4px">📄 PDF</button>
                      <button class="adm-btn-sm adm-btn-danger adm-delete-sim" data-simid="${s.id}" data-simnum="${s.number}" style="font-size:0.8rem">🗑️</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : '<div class="adm-card"><div class="adm-empty"><div class="adm-empty-icon">📋</div><div class="adm-empty-title">Noch keine Simulationen</div><div class="adm-empty-sub">Erstelle deine erste MedAT-Simulation mit dem Button oben.</div></div></div>'}
    `;
  },

  _buildLicenseRows(licenses) {
    return licenses.map(l => {
      const vd = l.validity_days;
      const validityStr = !vd ? '∞' : vd <= 14 ? `${vd}d` : `${Math.round(vd / 30)}Mo`;
      const maxUses = l.max_uses || 1;
      const curUses = l.current_uses || 0;
      const usageStr = maxUses === 0 ? `${curUses}/∞` : maxUses === 1 ? (l.activated ? '1/1' : '0/1') : `${curUses}/${maxUses}`;
      const isMulti = maxUses > 1 || maxUses === 0;
      const isFull = maxUses > 0 && curUses >= maxUses;
      const isExpired = l.expires_at && new Date(l.expires_at) < new Date();

      let statusHtml;
      if (isExpired) statusHtml = '<span class="adm-status adm-status-expired">Abgelaufen</span>';
      else if (isFull) statusHtml = '<span class="adm-status adm-status-full">Voll</span>';
      else if (l.activated && !isMulti) statusHtml = '<span class="adm-status adm-status-active">Aktiviert</span>';
      else if (curUses > 0 && isMulti) statusHtml = '<span class="adm-status adm-status-active">Aktiv</span>';
      else statusHtml = '<span class="adm-status adm-status-free">Frei</span>';

      return `
      <tr data-tier="${l.tier}" data-activated="${l.activated}" data-id="${l.id}" data-multi="${isMulti}" class="adm-license-row">
        <td><input type="checkbox" class="adm-license-cb" data-id="${l.id}"></td>
        <td class="adm-code">${l.code}${isMulti ? ' <span class="adm-multi-badge">MULTI</span>' : ''}</td>
        <td><span class="adm-tier ${l.tier === 'basic' || l.tier === 'premium' ? 'adm-tier-paid' : 'adm-tier-free'}">${l.tier.toUpperCase()}</span></td>
        <td>${validityStr}</td>
        <td style="font-weight:600;color:${isFull ? '#dc2626' : '#059669'}">${usageStr}</td>
        <td>${statusHtml}</td>
        <td style="font-size:0.75rem">${l.email || '–'}</td>
        <td style="font-size:0.75rem">${this._formatDate(l.created_at)}</td>
        <td><button class="adm-btn-icon adm-delete-license" data-id="${l.id}" title="Löschen">✕</button></td>
      </tr>`;
    }).join('');
  },

  // ===== EVENT BINDINGS =====
  _bindAdminEvents() {
    // Tab switching
    document.querySelectorAll('.adm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.adm-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.adm-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('adm-tab-' + tab.dataset.tab)?.classList.add('active');
        // Lazy-load goodies admin when its tab is opened
        if (tab.dataset.tab === 'goodies' && typeof AdminGoodies !== 'undefined') {
          AdminGoodies.render();
        }
      });
    });

    // User search
    document.getElementById('adm-user-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#adm-users-tbody tr').forEach(row => {
        const match = !q || (row.dataset.search || '').includes(q);
        row.style.display = match ? '' : 'none';
      });
    });

    // CSV Export users
    document.getElementById('adm-export-users')?.addEventListener('click', () => this.exportUsers());

    // Activity search
    document.getElementById('adm-activity-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.adm-activity-card').forEach(card => {
        const match = !q || (card.dataset.search || '').includes(q);
        card.style.display = match ? '' : 'none';
      });
    });

    // User name click → open detail modal
    document.querySelectorAll('.adm-user-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this._openUserModal(link.dataset.userid);
      });
    });

    // Modal close
    document.getElementById('adm-modal-close')?.addEventListener('click', () => this._closeUserModal());
    document.getElementById('adm-user-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this._closeUserModal();
    });

    // Block/unblock user
    document.querySelectorAll('.adm-btn-block').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userid;
        const name = btn.dataset.username || 'diesen Nutzer';
        if (!confirm(`"${name}" wirklich sperren? Der Nutzer kann sich dann nicht mehr einloggen.`)) return;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          await this._adminCall('block-user', { userId, blocked: true });
          this.render(); // refresh
        } catch (err) {
          alert('Sperren fehlgeschlagen: ' + err.message);
          btn.textContent = '🔒 Sperren';
          btn.disabled = false;
        }
      });
    });
    document.querySelectorAll('.adm-btn-unblock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userid;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          await this._adminCall('block-user', { userId, blocked: false });
          this.render(); // refresh
        } catch (err) {
          alert('Entsperren fehlgeschlagen: ' + err.message);
          btn.textContent = 'Entsperren';
          btn.disabled = false;
        }
      });
    });

    // Upgrade user buttons
    document.querySelectorAll('.adm-btn-upgrade').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const userId = e.target.dataset.userid;
        const username = e.target.dataset.username;
        const label = username ? `"${username}"` : 'diesen Nutzer';
        if (!confirm(`${label} auf Vollzugang (basic, 180 Tage) freischalten?`)) return;
        e.target.textContent = '...';
        e.target.disabled = true;
        try {
          await this._adminCall('upgrade-user', { userId, tier: 'basic', validityDays: 180 });
          e.target.outerHTML = '<span class="adm-badge-ok">✓ Vollzugang</span>';
        } catch (err) {
          alert('Freischalten fehlgeschlagen: ' + err.message);
          e.target.textContent = '⚡ Freischalten';
          e.target.disabled = false;
        }
      });
    });

    // ── ✏️ Plan & Credits bearbeiten ──────────────────────────────────────────
    document.querySelectorAll('.adm-btn-edit-plan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const userId   = btn.dataset.userid;
        const username = btn.dataset.username || userId;
        const curTier  = btn.dataset.tier || 'free';
        const cr       = this._creditsByUser?.[userId];
        this._openEditPlanModal(userId, username, curTier, cr);
      });
    });

    // Generate licenses
    document.getElementById('admin-generate-licenses')?.addEventListener('click', () => this.generateLicenses());

    // Export licenses
    document.getElementById('admin-export-licenses')?.addEventListener('click', () => this.exportLicenses());

    // License filter
    document.querySelectorAll('.adm-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adm-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.adm-license-row').forEach(row => {
          if (filter === 'all') { row.style.display = ''; return; }
          if (filter === 'unused') { row.style.display = row.dataset.activated === 'false' ? '' : 'none'; return; }
          row.style.display = row.dataset.tier === filter ? '' : 'none';
        });
      });
    });

    // Single delete license
    document.querySelectorAll('.adm-delete-license').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (!confirm('Lizenz wirklich löschen?')) return;
        try {
          await this._adminCall('delete-license', { licenseId: id });
          btn.closest('tr').remove();
          App.showToast('Lizenz gelöscht');
        } catch (err) {
          alert('Löschen fehlgeschlagen: ' + err.message);
        }
      });
    });

    // Checkbox: select all
    document.getElementById('adm-select-all')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      // Only select visible rows
      document.querySelectorAll('.adm-license-row').forEach(row => {
        if (row.style.display === 'none') return;
        const cb = row.querySelector('.adm-license-cb');
        if (cb) {
          cb.checked = checked;
          if (checked) this._selectedLicenseIds.add(cb.dataset.id);
          else this._selectedLicenseIds.delete(cb.dataset.id);
        }
      });
      this._updateBulkBar();
    });

    // Checkbox: individual
    document.querySelectorAll('.adm-license-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) this._selectedLicenseIds.add(cb.dataset.id);
        else this._selectedLicenseIds.delete(cb.dataset.id);
        this._updateBulkBar();
      });
    });

    // Bulk delete
    document.getElementById('adm-bulk-delete')?.addEventListener('click', () => this.bulkDeleteLicenses());

    // === SIMULATION EVENTS ===
    document.getElementById('adm-create-sim')?.addEventListener('click', () => this.createSimulation());
    document.querySelectorAll('.adm-export-sim-pdf').forEach(btn => {
      btn.addEventListener('click', () => {
        const simId = btn.dataset.simid;
        const simNum = btn.dataset.simnum;
        PDFExport.exportSimulationPDF(simId, parseInt(simNum));
      });
    });
    document.querySelectorAll('.adm-delete-sim').forEach(btn => {
      btn.addEventListener('click', async () => {
        const simId = btn.dataset.simid;
        const simNum = btn.dataset.simnum;
        if (!confirm(`Simulation ${simNum} wirklich löschen? Alle Fragenzuweisungen gehen verloren.`)) return;
        btn.textContent = '...';
        btn.disabled = true;
        try {
          await Auth.supabase.from('simulation_questions').delete().eq('simulation_id', simId);
          await Auth.supabase.from('simulations').delete().eq('id', simId);
          App.showToast(`Simulation ${simNum} gelöscht`);
          this.render();
        } catch (err) {
          alert('Löschen fehlgeschlagen: ' + err.message);
          btn.textContent = '🗑️';
          btn.disabled = false;
        }
      });
    });

    // Bulk clear selection
    document.getElementById('adm-bulk-clear')?.addEventListener('click', () => {
      this._selectedLicenseIds.clear();
      document.querySelectorAll('.adm-license-cb').forEach(cb => cb.checked = false);
      document.getElementById('adm-select-all').checked = false;
      this._updateBulkBar();
    });
  },

  _updateBulkBar() {
    const bar = document.getElementById('adm-bulk-bar');
    const count = this._selectedLicenseIds.size;
    if (bar) {
      bar.style.display = count > 0 ? 'flex' : 'none';
      document.getElementById('adm-bulk-count').textContent = `${count} ausgewählt`;
    }
  },

  // ===== BULK DELETE =====
  async bulkDeleteLicenses() {
    const ids = [...this._selectedLicenseIds];
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} Lizenz${ids.length > 1 ? 'en' : ''} wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;

    const deleteBtn = document.getElementById('adm-bulk-delete');
    if (deleteBtn) { deleteBtn.textContent = 'Lösche...'; deleteBtn.disabled = true; }

    try {
      await this._adminCall('bulk-delete-licenses', { licenseIds: ids });
      // Remove rows from DOM
      ids.forEach(id => {
        document.querySelector(`tr[data-id="${id}"]`)?.remove();
      });
      this._selectedLicenseIds.clear();
      this._updateBulkBar();
      document.getElementById('adm-select-all').checked = false;
      App.showToast(`${ids.length} Lizenz${ids.length > 1 ? 'en' : ''} gelöscht`);
    } catch (err) {
      alert('Massenlöschen fehlgeschlagen: ' + err.message);
    } finally {
      if (deleteBtn) { deleteBtn.textContent = '🗑️ Ausgewählte löschen'; deleteBtn.disabled = false; }
    }
  },

  // ===== GENERATE LICENSES =====
  async generateLicenses() {
    const tier = document.getElementById('admin-license-tier').value;
    const count = parseInt(document.getElementById('admin-license-count').value);
    const validityDays = parseInt(document.getElementById('admin-license-validity').value);
    const maxUses = parseInt(document.getElementById('admin-license-maxuses').value);
    const statusEl = document.getElementById('admin-license-status');

    const validityLabel = validityDays === 0 ? 'unbegrenzt' : `${validityDays} Tage`;
    const usesLabel = maxUses === 0 ? 'unbegrenzt' : maxUses === 1 ? 'Einzelcode' : `${maxUses}x nutzbar`;
    statusEl.textContent = `Generiere ${count} ${tier}-Lizenzen (${validityLabel}, ${usesLabel})...`;
    statusEl.style.color = 'var(--text-muted)';

    try {
      await this._adminCall('generate-licenses', { tier, count, validityDays, maxUses });
      statusEl.textContent = `✅ ${count} ${tier}-Lizenzen erfolgreich erstellt!`;
      statusEl.style.color = 'var(--success)';
      setTimeout(() => this.render(), 1500);
    } catch (e) {
      statusEl.textContent = `❌ Fehler: ${e.message}`;
      statusEl.style.color = 'var(--danger)';
    }
  },

  // ===== EXPORT =====
  async exportLicenses() {
    try {
      const data = await this._adminCall('list-licenses');
      const unused = (data || []).filter(l => !l.activated);
      if (unused.length === 0) { alert('Keine unbenutzten Lizenzen vorhanden.'); return; }

      const csv = 'Code,Tier,Status\n' + unused.map(l => `${l.code},${l.tier},frei`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `medat-lizenzen-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export fehlgeschlagen: ' + e.message);
    }
  },

  // ===== USER DETAIL MODAL =====
  async _openUserModal(userId) {
    const u = this._users.find(x => x.user_id === userId);
    if (!u) return;

    const name = u.username || u.display_name || '–';
    const tierLabel = (u.license_tier || 'free').toUpperCase();
    const isBlocked = !!u.blocked;
    const ob = this._onboarding.find(o => o.user_id === userId);
    const cr = this._creditsByUser?.[userId];

    // Show loading state immediately
    document.getElementById('adm-modal-title').textContent = name;
    document.getElementById('adm-modal-body').innerHTML = '<div style="text-align:center;padding:2rem"><div class="spinner"></div><span style="display:block;margin-top:0.5rem;color:#94a3b8;font-size:0.85rem">Lade User-Daten...</span></div>';
    document.getElementById('adm-user-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fetch detailed user data from backend
    let detail = { creditLog: [], bananaImages: [], progress: [], simulations: [], notes: [], credits: null };
    try {
      detail = await this._adminCall('user-detail', { userId });
    } catch (e) { console.warn('user-detail failed, using cached data:', e); }

    const progress = detail.progress || [];
    const creditLog = detail.creditLog || [];
    const bananaImages = detail.bananaImages || [];
    const simulations = detail.simulations || [];
    const notes = detail.notes || [];
    const credits = detail.credits || cr || {};

    // Stats
    const totalQ = progress.length;
    const correctQ = progress.filter(p => p.answered_correctly).length;
    const accuracy = totalQ > 0 ? Math.round(correctQ / totalQ * 100) : 0;

    // Section breakdown with accuracy
    const bySec = {};
    progress.forEach(p => {
      const k = p.section_key || 'unknown';
      if (!bySec[k]) bySec[k] = { total: 0, correct: 0 };
      bySec[k].total++;
      if (p.answered_correctly) bySec[k].correct++;
    });
    const secEntries = Object.entries(bySec).sort((a, b) => b[1].total - a[1].total);

    // Credit stats
    const aiSessUsed = credits.ai_sessions_used || 0;
    const aiSessTotal = credits.ai_sessions_total || 0;
    const aiImgUsed = credits.ai_images_used || 0;
    const aiImgTotal = credits.ai_images_total || 0;

    // Build activity timeline (last 50 events of all types)
    const timeline = [];
    progress.slice(0, 100).forEach(p => {
      timeline.push({
        time: p.answered_at,
        icon: p.answered_correctly ? '✅' : '❌',
        text: `${p.section_key || '?'} — ${p.answered_correctly ? 'Richtig' : 'Falsch'}${p.time_taken_seconds ? ` (${p.time_taken_seconds}s)` : ''}`,
        type: 'question'
      });
    });
    bananaImages.forEach(b => {
      timeline.push({
        time: b.created_at,
        icon: b.item_type === 'conversation' ? '💬' : '🍌',
        text: b.item_type === 'conversation'
          ? `Chat mit ${b.tutor_name || 'Tutor'}: ${(b.title || b.frage_text || '').slice(0, 60)}`
          : `Bild: ${b.content_type || '?'} / ${b.stil || '?'} — ${(b.title || b.frage_text || '').slice(0, 50)}`,
        type: b.item_type === 'conversation' ? 'chat' : 'image'
      });
    });
    simulations.forEach(s => {
      timeline.push({
        time: s.created_at,
        icon: '📝',
        text: `Simulation: ${s.title || '?'} (${s.total_questions || '?'} Fragen) — ${s.status || '?'}`,
        type: 'simulation'
      });
    });
    notes.forEach(n => {
      timeline.push({
        time: n.created_at,
        icon: '📒',
        text: `Notiz: ${(n.note_text || '').slice(0, 60)}${(n.note_text || '').length > 60 ? '...' : ''}`,
        type: 'note'
      });
    });
    creditLog.forEach(cl => {
      if (cl.reason === 'ai_session' || cl.reason === 'ai_image') {
        timeline.push({
          time: cl.created_at,
          icon: cl.reason === 'ai_session' ? '🤖' : '🎨',
          text: cl.detail || `${cl.reason} (${cl.amount})`,
          type: 'credit'
        });
      }
    });
    timeline.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Build tabs HTML
    const tabBtnStyle = (id, label, icon, active) =>
      `<button class="adm-ud-tab${active ? ' adm-ud-tab-active' : ''}" data-udtab="${id}">${icon} ${label}</button>`;

    let html = `
      <div class="adm-ud-tabs" style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:1rem;border-bottom:2px solid #f0ede6;padding-bottom:0.6rem">
        ${tabBtnStyle('overview', 'Übersicht', '📊', true)}
        ${tabBtnStyle('timeline', 'Timeline', '🕐', false)}
        ${tabBtnStyle('questions', 'Fragen', '❓', false)}
        ${tabBtnStyle('images', 'Bilder & Chats', '🍌', false)}
        ${tabBtnStyle('credits', 'Credits', '💰', false)}
        ${tabBtnStyle('actions', 'Aktionen', '⚙️', false)}
      </div>

      <!-- TAB: Overview -->
      <div class="adm-ud-panel" id="adm-ud-overview">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem">
          <div style="background:#f8f6f1;border-radius:12px;padding:0.8rem;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#1a1a2e">${totalQ}</div>
            <div style="font-size:0.75rem;color:#94a3b8">Fragen</div>
          </div>
          <div style="background:#f8f6f1;border-radius:12px;padding:0.8rem;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:${accuracy >= 70 ? '#059669' : accuracy >= 50 ? '#d97706' : '#dc2626'}">${accuracy}%</div>
            <div style="font-size:0.75rem;color:#94a3b8">Genauigkeit</div>
          </div>
          <div style="background:#f8f6f1;border-radius:12px;padding:0.8rem;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#1a1a2e">${aiSessUsed}<span style="font-size:0.8rem;color:#94a3b8">/${aiSessTotal}</span></div>
            <div style="font-size:0.75rem;color:#94a3b8">KI-Sessions</div>
          </div>
          <div style="background:#f8f6f1;border-radius:12px;padding:0.8rem;text-align:center">
            <div style="font-size:1.6rem;font-weight:800;color:#1a1a2e">${aiImgUsed}<span style="font-size:0.8rem;color:#94a3b8">/${aiImgTotal}</span></div>
            <div style="font-size:0.75rem;color:#94a3b8">Bilder</div>
          </div>
        </div>

        <div class="adm-modal-section-title">Profil</div>
        <table>
          <tr><td style="width:38%;color:var(--text-muted)">Email</td><td>${u.email ? `<a href="mailto:${u.email}" style="color:#2980b9">${u.email}</a>` : '–'}</td></tr>
          <tr><td style="color:var(--text-muted)">Abo</td><td><span class="adm-tier ${u.license_tier === 'basic' || u.license_tier === 'premium' ? 'adm-tier-paid' : 'adm-tier-free'}">${tierLabel}</span></td></tr>
          <tr><td style="color:var(--text-muted)">Lizenz</td><td>${u.license_code || '–'}${u.license_expires_at ? ` (bis ${this._formatDate(u.license_expires_at)})` : ''}</td></tr>
          <tr><td style="color:var(--text-muted)">Status</td><td>${isBlocked ? '<span style="color:#dc2626;font-weight:600">🚫 Gesperrt</span>' : '<span style="color:#059669;font-weight:600">✓ Aktiv</span>'}</td></tr>
          <tr><td style="color:var(--text-muted)">Registriert</td><td>${this._formatDateTime(u.created_at)}</td></tr>
          <tr><td style="color:var(--text-muted)">Letzte Aktivität</td><td>${u.last_active_date || '–'}</td></tr>
          <tr><td style="color:var(--text-muted)">Streak</td><td>${u.streak_count || 0} Tage</td></tr>
          <tr><td style="color:var(--text-muted)">PDFs</td><td>${u.pdfs_created || 0}</td></tr>
          <tr><td style="color:var(--text-muted)">Simulationen</td><td>${simulations.length}</td></tr>
        </table>

        ${secEntries.length > 0 ? `
          <div class="adm-modal-section-title">Sektionen</div>
          <table>
            <tr style="font-weight:700;font-size:0.78rem;color:#5c5c6e"><td>Sektion</td><td>Fragen</td><td>Richtig</td><td>Quote</td></tr>
            ${secEntries.map(([k, v]) => {
              const pct = v.total > 0 ? Math.round(v.correct / v.total * 100) : 0;
              const col = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
              return `<tr><td style="color:var(--text-muted)">${this._sectionLabel(k)}</td><td><strong>${v.total}</strong></td><td>${v.correct}</td><td><span style="color:${col};font-weight:700">${pct}%</span></td></tr>`;
            }).join('')}
          </table>
        ` : '<p style="font-size:0.85rem;color:#94a3b8">Noch keine Fragen beantwortet</p>'}

        ${ob ? `
          <div class="adm-modal-section-title">Onboarding</div>
          <table>
            <tr><td style="width:38%;color:var(--text-muted)">Ziel-Uni</td><td>${this._uniLabel(ob.target_uni)}</td></tr>
            <tr><td style="color:var(--text-muted)">Erster Antritt?</td><td>${ob.is_first_attempt === true ? 'Ja' : ob.is_first_attempt === false ? 'Nein' : '–'}</td></tr>
            <tr><td style="color:var(--text-muted)">Größte Sorge</td><td>${this._sectionLabel(ob.weakest_section)}</td></tr>
            <tr><td style="color:var(--text-muted)">Sicherheitsgefühl</td><td>${this._confidenceLabel(ob.confidence_level)}</td></tr>
            <tr><td style="color:var(--text-muted)">Lernzeit</td><td>${this._studyTimeLabel(ob.preferred_study_time)}</td></tr>
          </table>
        ` : ''}
      </div>

      <!-- TAB: Timeline -->
      <div class="adm-ud-panel" id="adm-ud-timeline" style="display:none">
        ${timeline.length > 0 ? `
          <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:0.75rem">${timeline.length} Aktivitäten (neueste zuerst)</div>
          <div style="max-height:400px;overflow-y:auto;border:1px solid #f0ede6;border-radius:12px">
            ${timeline.slice(0, 100).map((ev, i) => {
              const d = new Date(ev.time);
              const dateStr = d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeStr = d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
              const bg = i % 2 === 0 ? '#fff' : '#faf9f6';
              return `<div style="display:flex;gap:0.5rem;align-items:flex-start;padding:0.5rem 0.7rem;background:${bg};font-size:0.8rem;border-bottom:1px solid #f5f3ee">
                <span style="flex-shrink:0;width:1.4rem;text-align:center">${ev.icon}</span>
                <span style="flex:1;color:#1a1a2e;line-height:1.35">${ev.text}</span>
                <span style="flex-shrink:0;color:#94a3b8;font-size:0.72rem;white-space:nowrap">${dateStr} ${timeStr}</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<p style="font-size:0.85rem;color:#94a3b8">Keine Aktivitäten vorhanden</p>'}
      </div>

      <!-- TAB: Questions -->
      <div class="adm-ud-panel" id="adm-ud-questions" style="display:none">
        ${progress.length > 0 ? (() => {
          // Group by date
          const byDate = {};
          progress.forEach(p => {
            const d = new Date(p.answered_at).toLocaleDateString('de-AT');
            if (!byDate[d]) byDate[d] = { total: 0, correct: 0, sections: {} };
            byDate[d].total++;
            if (p.answered_correctly) byDate[d].correct++;
            const sec = p.section_key || '?';
            byDate[d].sections[sec] = (byDate[d].sections[sec] || 0) + 1;
          });
          const dateEntries = Object.entries(byDate);
          return `
            <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:0.75rem">${totalQ} Fragen an ${dateEntries.length} Tagen</div>
            <div style="max-height:400px;overflow-y:auto;border:1px solid #f0ede6;border-radius:12px">
              ${dateEntries.map(([date, info]) => {
                const pct = Math.round(info.correct / info.total * 100);
                const col = pct >= 70 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626';
                const secs = Object.entries(info.sections).map(([s, c]) => `${s}: ${c}`).join(', ');
                return `<div style="padding:0.65rem 0.8rem;border-bottom:1px solid #f5f3ee">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.85rem;color:#1a1a2e">${date}</strong>
                    <div style="display:flex;gap:0.6rem;align-items:center">
                      <span style="font-size:0.8rem;color:#5c5c6e">${info.total} Fragen</span>
                      <span style="font-size:0.8rem;font-weight:700;color:${col}">${pct}%</span>
                    </div>
                  </div>
                  <div style="font-size:0.72rem;color:#94a3b8;margin-top:0.2rem">${secs}</div>
                </div>`;
              }).join('')}
            </div>`;
        })() : '<p style="font-size:0.85rem;color:#94a3b8">Noch keine Fragen beantwortet</p>'}
      </div>

      <!-- TAB: Images & Chats -->
      <div class="adm-ud-panel" id="adm-ud-images" style="display:none">
        ${bananaImages.length > 0 ? `
          <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:0.75rem">
            ${bananaImages.filter(b => b.item_type !== 'conversation').length} Bilder,
            ${bananaImages.filter(b => b.item_type === 'conversation').length} Chat-Sessions
          </div>
          <div style="max-height:400px;overflow-y:auto;border:1px solid #f0ede6;border-radius:12px">
            ${bananaImages.map((b, i) => {
              const isChat = b.item_type === 'conversation';
              const bg = i % 2 === 0 ? '#fff' : '#faf9f6';
              const d = new Date(b.created_at);
              const dateStr = d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit' });
              const timeStr = d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
              return `<div style="padding:0.6rem 0.8rem;background:${bg};border-bottom:1px solid #f5f3ee">
                <div style="display:flex;gap:0.5rem;align-items:flex-start">
                  <span style="font-size:1.1rem;flex-shrink:0">${isChat ? '💬' : '🍌'}</span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:600;color:#1a1a2e">${isChat ? `Chat mit ${b.tutor_name || 'Tutor'}` : `${b.content_type || 'Bild'} (${b.stil || '?'})`}</div>
                    <div style="font-size:0.75rem;color:#5c5c6e;margin-top:0.15rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(b.title || b.frage_text || '–').slice(0, 80)}</div>
                    ${b.bereich ? `<div style="font-size:0.7rem;color:#94a3b8;margin-top:0.1rem">Bereich: ${b.bereich}</div>` : ''}
                  </div>
                  <span style="flex-shrink:0;font-size:0.7rem;color:#94a3b8;white-space:nowrap">${dateStr}<br>${timeStr}</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : '<p style="font-size:0.85rem;color:#94a3b8">Keine Bilder oder Chats vorhanden</p>'}
      </div>

      <!-- TAB: Credits -->
      <div class="adm-ud-panel" id="adm-ud-credits" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem">
          <div style="background:linear-gradient(135deg,#1a1a2e,#2d2d50);border-radius:12px;padding:0.8rem;text-align:center;color:white">
            <div style="font-size:0.7rem;opacity:0.7">KI-Sessions</div>
            <div style="font-size:1.4rem;font-weight:800">${aiSessUsed} / ${aiSessTotal}</div>
            <div style="width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin-top:0.4rem">
              <div style="width:${aiSessTotal > 0 ? Math.min(100, Math.round(aiSessUsed/aiSessTotal*100)) : 0}%;height:100%;background:#f5c542;border-radius:2px"></div>
            </div>
          </div>
          <div style="background:linear-gradient(135deg,#1a1a2e,#2d2d50);border-radius:12px;padding:0.8rem;text-align:center;color:white">
            <div style="font-size:0.7rem;opacity:0.7">Banana-Bilder</div>
            <div style="font-size:1.4rem;font-weight:800">${aiImgUsed} / ${aiImgTotal}</div>
            <div style="width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;margin-top:0.4rem">
              <div style="width:${aiImgTotal > 0 ? Math.min(100, Math.round(aiImgUsed/aiImgTotal*100)) : 0}%;height:100%;background:#F59E0B;border-radius:2px"></div>
            </div>
          </div>
        </div>

        ${creditLog.length > 0 ? `
          <div class="adm-modal-section-title">Credit-Verlauf (${creditLog.length} Einträge)</div>
          <div style="max-height:300px;overflow-y:auto;border:1px solid #f0ede6;border-radius:12px">
            ${creditLog.map((cl, i) => {
              const bg = i % 2 === 0 ? '#fff' : '#faf9f6';
              const d = new Date(cl.created_at);
              const dateStr = d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
              const timeStr = d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
              const icon = cl.reason === 'ai_session' ? '🤖' : cl.reason === 'ai_image' ? '🎨' : cl.reason === 'question' ? '❓' : cl.reason === 'purchase' ? '💳' : cl.reason === 'bonus' ? '🎁' : '📋';
              const amtColor = cl.amount > 0 ? '#059669' : '#dc2626';
              return `<div style="display:flex;gap:0.4rem;align-items:center;padding:0.4rem 0.7rem;background:${bg};border-bottom:1px solid #f5f3ee;font-size:0.78rem">
                <span>${icon}</span>
                <span style="flex:1;color:#1a1a2e">${cl.detail || cl.reason}</span>
                <span style="font-weight:700;color:${amtColor}">${cl.amount > 0 ? '+' : ''}${cl.amount}</span>
                <span style="color:#94a3b8;font-size:0.7rem;width:4.5rem;text-align:right">${dateStr} ${timeStr}</span>
              </div>`;
            }).join('')}
          </div>
        ` : '<p style="font-size:0.85rem;color:#94a3b8">Kein Credit-Verlauf vorhanden</p>'}
      </div>

      <!-- TAB: Actions -->
      <div class="adm-ud-panel" id="adm-ud-actions" style="display:none">
        <div class="adm-modal-section-title">Plan & Credits</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem">
          <button onclick="Admin._openEditPlanModal('${userId}', '${name.replace(/'/g, "\\'")}', '${u.license_tier || 'free'}', ${JSON.stringify(cr || {}).replace(/"/g, '&quot;')})"
            style="background:#f0ede6;color:#1a1a2e;border:none;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer">
            ✏️ Plan & Credits bearbeiten
          </button>
        </div>

        <div class="adm-modal-section-title">Admin-Aktionen</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button onclick="Admin.openAsUser('${userId}')" style="background:var(--dark);color:var(--yellow);border:none;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Als User einloggen ↗
          </button>
          ${isBlocked
            ? `<button onclick="Admin.unblockUser('${userId}')" style="background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer">🔓 Entsperren</button>`
            : `<button onclick="Admin.blockUser('${userId}')" style="background:#fefce8;color:#ca8a04;border:1px solid #fef08a;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer">🔒 Sperren</button>`
          }
          <button onclick="Admin.deleteUser('${userId}', '${name.replace(/'/g, "\\'")}')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            User löschen
          </button>
        </div>
        <p style="font-size:0.72rem;color:var(--text-muted);margin-top:0.75rem;line-height:1.4">
          <strong>Als User einloggen</strong> = Öffnet neuen Tab, eingeloggt als dieser User (inkognito empfohlen!)<br>
          <strong>Sperren</strong> = Login wird blockiert, Account bleibt<br>
          <strong>Löschen</strong> = Account + alle Daten permanent entfernen
        </p>
      </div>
    `;

    document.getElementById('adm-modal-body').innerHTML = html;

    // Tab switching logic
    document.querySelectorAll('.adm-ud-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adm-ud-tab').forEach(b => b.classList.remove('adm-ud-tab-active'));
        document.querySelectorAll('.adm-ud-panel').forEach(p => p.style.display = 'none');
        btn.classList.add('adm-ud-tab-active');
        const panel = document.getElementById('adm-ud-' + btn.dataset.udtab);
        if (panel) panel.style.display = '';
      });
    });
  },

  // ===== PLAN & CREDITS BEARBEITEN =====
  _openEditPlanModal(userId, username, currentTier, cr) {
    // Remove any existing edit modal
    document.getElementById('adm-edit-plan-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'adm-edit-plan-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:1rem';
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;max-width:420px;width:100%;padding:1.75rem 1.5rem;box-shadow:0 24px 60px rgba(0,0,0,0.25);position:relative">
        <button onclick="document.getElementById('adm-edit-plan-modal').remove()"
          style="position:absolute;top:0.9rem;right:0.9rem;background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer">✕</button>
        <div style="font-size:1.05rem;font-weight:800;color:#1a1a2e;margin-bottom:0.25rem">✏️ Plan bearbeiten</div>
        <div style="font-size:0.82rem;color:#94a3b8;margin-bottom:1.25rem">${username}</div>

        <label style="font-size:0.8rem;font-weight:700;color:#5c5c6e;display:block;margin-bottom:0.4rem">Plan / Tier</label>
        <select id="adm-ep-tier" style="width:100%;padding:0.6rem 0.8rem;border-radius:10px;border:2px solid #e2e8f0;font-size:0.88rem;margin-bottom:1rem">
          <option value="free"    ${currentTier==='free'    ? 'selected':''}>🎓 Free</option>
          <option value="basic"   ${currentTier==='basic'   ? 'selected':''}>⚡ Basic</option>
          <option value="premium" ${currentTier==='premium' ? 'selected':''}>👑 Premium</option>
        </select>

        <label style="font-size:0.8rem;font-weight:700;color:#5c5c6e;display:block;margin-bottom:0.4rem">🤖 KI-Sessions gesamt</label>
        <input id="adm-ep-sessions" type="number" min="0" max="9999" value="${cr?.aiSessTotal ?? 10}"
          style="width:100%;padding:0.6rem 0.8rem;border-radius:10px;border:2px solid #e2e8f0;font-size:0.88rem;margin-bottom:1rem;box-sizing:border-box">

        <label style="font-size:0.8rem;font-weight:700;color:#5c5c6e;display:block;margin-bottom:0.4rem">🍌 Banana-Bilder gesamt</label>
        <input id="adm-ep-images" type="number" min="0" max="9999" value="${cr?.aiImgTotal ?? 3}"
          style="width:100%;padding:0.6rem 0.8rem;border-radius:10px;border:2px solid #e2e8f0;font-size:0.88rem;margin-bottom:1.5rem;box-sizing:border-box">

        <div id="adm-ep-status" style="font-size:0.82rem;min-height:1.2rem;margin-bottom:0.75rem"></div>
        <button id="adm-ep-save" style="width:100%;background:#1a1a2e;color:#f5c542;border:none;border-radius:12px;padding:0.8rem;font-weight:700;font-size:0.92rem;cursor:pointer">
          Speichern
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Auto-fill plan defaults when tier changes
    const tierSel = document.getElementById('adm-ep-tier');
    const sessFld = document.getElementById('adm-ep-sessions');
    const imgFld  = document.getElementById('adm-ep-images');
    const defaults = { free: [10,3], basic: [200,50], premium: [400,100] };
    tierSel.addEventListener('change', () => {
      const [s, i] = defaults[tierSel.value] || [10, 3];
      sessFld.value = s;
      imgFld.value  = i;
    });

    document.getElementById('adm-ep-save').addEventListener('click', async () => {
      const tier     = tierSel.value;
      const sessions = parseInt(sessFld.value) || 0;
      const images   = parseInt(imgFld.value)  || 0;
      const saveBtn  = document.getElementById('adm-ep-save');
      const status   = document.getElementById('adm-ep-status');
      saveBtn.disabled = true; saveBtn.textContent = '⏳ Speichert…';
      status.textContent = '';

      try {
        // Update license_tier via admin-api
        await this._adminCall('upgrade-user', { userId, tier, validityDays: tier === 'free' ? 0 : 99999 });

        // Update AI credits directly via Supabase
        const { error } = await Auth.supabase.from('user_credits')
          .upsert({ user_id: userId, ai_sessions_total: sessions, ai_images_total: images, updated_at: new Date().toISOString() }, { onConflict: 'user_id', ignoreDuplicates: false });

        if (error) throw new Error('Credits-Update fehlgeschlagen: ' + error.message);

        status.textContent = '✅ Gespeichert!';
        status.style.color = '#16a34a';
        setTimeout(() => { modal.remove(); this.render(); }, 1200);
      } catch (e) {
        status.textContent = '❌ ' + e.message;
        status.style.color = '#dc2626';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Speichern';
      }
    });
  },

  _closeUserModal() {
    document.getElementById('adm-user-modal').style.display = 'none';
    document.body.style.overflow = '';
  },

  // ===== ACTIVITY CARDS =====
  _buildActivityCards(users, progress, userProgress, onboardingByUser) {
    const simulations = this._simulations || [];
    const notes = this._notes || [];

    // Build a unified activity timeline per user
    const userMap = {};
    users.forEach(u => {
      userMap[u.user_id] = {
        name: u.username || u.display_name || 'Unbekannt',
        email: u.email || '',
        tier: u.license_tier || 'free',
        activities: []
      };
    });

    // Add progress (answered questions) as activities
    progress.forEach(p => {
      const uid = p.user_id || p.session_id;
      if (!userMap[uid]) return;
      userMap[uid].activities.push({
        type: 'answer',
        date: p.answered_at,
        section: p.section_key || 'unknown',
        correct: p.answered_correctly,
        time: p.time_taken_seconds
      });
    });

    // Add simulations
    simulations.forEach(s => {
      if (!userMap[s.user_id]) return;
      userMap[s.user_id].activities.push({
        type: 'simulation',
        date: s.created_at,
        title: s.title,
        status: s.status,
        totalQuestions: s.total_questions
      });
    });

    // Add notes
    notes.forEach(n => {
      if (!userMap[n.user_id]) return;
      userMap[n.user_id].activities.push({
        type: 'note',
        date: n.created_at,
        text: n.note_text,
        context: n.context_type
      });
    });

    // Sort activities per user by date desc
    Object.values(userMap).forEach(u => {
      u.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    });

    // Sort users by most recent activity
    const sortedUsers = Object.entries(userMap)
      .filter(([_, u]) => u.activities.length > 0)
      .sort((a, b) => {
        const aDate = a[1].activities[0]?.date || '';
        const bDate = b[1].activities[0]?.date || '';
        return new Date(bDate) - new Date(aDate);
      });

    if (sortedUsers.length === 0) {
      return '<div class="adm-card"><div class="adm-empty"><div class="adm-empty-icon">📭</div><div class="adm-empty-title">Noch keine Aktivitäten</div></div></div>';
    }

    return sortedUsers.map(([uid, u]) => {
      // Group activities by date
      const byDate = {};
      u.activities.forEach(a => {
        const dateKey = a.date ? new Date(a.date).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Unbekannt';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(a);
      });

      // Summary stats
      const totalAnswers = u.activities.filter(a => a.type === 'answer').length;
      const correctAnswers = u.activities.filter(a => a.type === 'answer' && a.correct).length;
      const accuracy = totalAnswers > 0 ? Math.round(correctAnswers / totalAnswers * 100) : 0;
      const simCount = u.activities.filter(a => a.type === 'simulation').length;
      const noteCount = u.activities.filter(a => a.type === 'note').length;

      // Section breakdown for answers
      const sections = {};
      u.activities.filter(a => a.type === 'answer').forEach(a => {
        if (!sections[a.section]) sections[a.section] = { total: 0, correct: 0 };
        sections[a.section].total++;
        if (a.correct) sections[a.section].correct++;
      });

      const tierLabel = u.tier.toUpperCase();
      const tierClass = (u.tier === 'basic' || u.tier === 'premium') ? 'adm-tier-paid' : 'adm-tier-free';

      const dateEntries = Object.entries(byDate).slice(0, 7); // Last 7 active days

      return `
      <div class="adm-card adm-activity-card" data-search="${u.name.toLowerCase()} ${u.email.toLowerCase()}" style="margin-bottom:1rem">
        <div class="adm-card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <div class="adm-avatar">${u.name[0].toUpperCase()}</div>
            <strong>${u.name}</strong>
            <span class="adm-tier ${tierClass}" style="font-size:11px">${tierLabel}</span>
          </div>
          <div style="display:flex;gap:1rem;font-size:13px;color:var(--text-muted)">
            <span>📝 ${totalAnswers} Fragen (${accuracy}%)</span>
            ${simCount > 0 ? `<span>📄 ${simCount} Simulationen</span>` : ''}
            ${noteCount > 0 ? `<span>🗒️ ${noteCount} Notizen</span>` : ''}
          </div>
        </div>

        ${Object.keys(sections).length > 0 ? `
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;padding:0.5rem 1rem;border-bottom:1px solid var(--border)">
          ${Object.entries(sections).map(([sec, s]) => {
            const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
            const color = pct >= 70 ? '#059669' : pct >= 40 ? '#d97706' : '#dc2626';
            return `<span style="font-size:12px;padding:2px 8px;border-radius:12px;background:${color}15;color:${color};border:1px solid ${color}30">${this._sectionLabel(sec) || sec}: ${s.total}× (${pct}%)</span>`;
          }).join('')}
        </div>` : ''}

        <div class="adm-activity-timeline" style="padding:0.75rem 1rem;max-height:300px;overflow-y:auto">
          ${dateEntries.map(([dateStr, acts]) => `
            <div style="margin-bottom:0.75rem">
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">${dateStr}</div>
              <div style="display:flex;flex-direction:column;gap:3px;padding-left:0.5rem;border-left:2px solid var(--border)">
                ${this._renderDayActivities(acts)}
              </div>
            </div>
          `).join('')}
          ${Object.keys(byDate).length > 7 ? `<div style="text-align:center;font-size:12px;color:var(--text-muted);padding-top:0.5rem">... und ${Object.keys(byDate).length - 7} weitere Tage</div>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  _renderDayActivities(acts) {
    // Group consecutive answers by section for compact display
    const grouped = [];
    let currentGroup = null;

    acts.forEach(a => {
      if (a.type === 'answer') {
        if (currentGroup && currentGroup.type === 'answers' && currentGroup.section === a.section) {
          currentGroup.total++;
          if (a.correct) currentGroup.correct++;
          currentGroup.totalTime += (a.time || 0);
        } else {
          if (currentGroup) grouped.push(currentGroup);
          currentGroup = { type: 'answers', section: a.section, total: 1, correct: a.correct ? 1 : 0, totalTime: a.time || 0, date: a.date };
        }
      } else {
        if (currentGroup) { grouped.push(currentGroup); currentGroup = null; }
        grouped.push(a);
      }
    });
    if (currentGroup) grouped.push(currentGroup);

    return grouped.map(item => {
      if (item.type === 'answers') {
        const pct = Math.round(item.correct / item.total * 100);
        const icon = pct >= 70 ? '✅' : pct >= 40 ? '⚠️' : '❌';
        const avgTime = item.total > 0 ? Math.round(item.totalTime / item.total) : 0;
        const time = item.date ? new Date(item.date).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div style="font-size:13px;padding:3px 0;display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:11px;min-width:40px">${time}</span>
          ${icon} <strong>${item.total}×</strong> ${this._sectionLabel(item.section) || item.section}
          <span style="color:var(--text-muted)">${pct}% richtig · Ø ${avgTime}s</span>
        </div>`;
      } else if (item.type === 'simulation') {
        const time = item.date ? new Date(item.date).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div style="font-size:13px;padding:3px 0;display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:11px;min-width:40px">${time}</span>
          📄 <strong>Simulation erstellt:</strong> ${item.title || 'MedAT Simulation'} (${item.totalQuestions || '?'} Fragen)
        </div>`;
      } else if (item.type === 'note') {
        const time = item.date ? new Date(item.date).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '';
        const preview = (item.text || '').substring(0, 60) + ((item.text || '').length > 60 ? '...' : '');
        return `<div style="font-size:13px;padding:3px 0;display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:11px;min-width:40px">${time}</span>
          🗒️ <strong>Notiz:</strong> <span style="color:var(--text-muted)">${preview}</span>
        </div>`;
      }
      return '';
    }).join('');
  },

  // ===== EXPORT USERS =====
  exportUsers() {
    // Helper: wrap a value in quotes and escape internal quotes
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const users = this._users;

    const columns = [
      'Email',
      'Name',
      'Plan',
      'KI Sessions frei',
      'KI Sessions gesamt',
      'KI Bilder frei',
      'KI Bilder gesamt',
      'Fragen beantwortet',
      'Registriert',
      'Letzte Aktivität',
    ];

    const rows = users.map(u => {
      const cr = this._creditsByUser?.[u.user_id];
      const sessRemain = cr ? Math.max(0, (cr.aiSessTotal || 0) - (cr.aiSessUsed || 0)) : '–';
      const imgRemain  = cr ? Math.max(0, (cr.aiImgTotal  || 0) - (cr.aiImgUsed  || 0)) : '–';
      const sessTotal  = cr ? (cr.aiSessTotal || 0) : '–';
      const imgTotal   = cr ? (cr.aiImgTotal  || 0) : '–';

      return [
        q(u.email || ''),
        q(u.username || u.display_name || ''),
        q((u.license_tier || 'free').toUpperCase()),
        q(sessRemain),
        q(sessTotal),
        q(imgRemain),
        q(imgTotal),
        q(u.total_questions_answered || 0),
        q(this._formatDate(u.created_at)),
        q(u.last_active_date || ''),
      ].join(';');
    });

    // Semicolons = European Excel standard; BOM = UTF-8 in Excel
    const csv = '\uFEFF' + columns.map(q).join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medat-nutzer-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // ===== UPLOAD =====
  async uploadQuestions() {
    const fileInput = document.getElementById('admin-upload-questions');
    const statusEl = document.getElementById('admin-upload-status');
    if (!fileInput?.files?.[0]) { statusEl.textContent = 'Bitte wähle eine JSON-Datei.'; statusEl.style.color = 'var(--danger)'; return; }
    try {
      statusEl.textContent = 'Wird hochgeladen...'; statusEl.style.color = 'var(--text-muted)';
      const text = await fileInput.files[0].text();
      const questions = JSON.parse(text);
      if (!Array.isArray(questions) || questions.length === 0) throw new Error('JSON muss ein Array sein.');
      const { error } = await Auth.supabase.from('questions').insert(questions.map(q => ({ type: q.type, subtype: q.subtype || null, difficulty: q.difficulty || 'medium', content: q.content, topic: q.topic || null })));
      if (error) throw error;
      statusEl.textContent = `✅ ${questions.length} Fragen importiert!`; statusEl.style.color = 'var(--success)';
    } catch (e) { statusEl.textContent = `❌ Fehler: ${e.message}`; statusEl.style.color = 'var(--danger)'; }
  },

  // ===== DELETE USER =====
  async blockUser(userId) {
    const u = this._users.find(x => x.user_id === userId);
    const name = u?.username || u?.display_name || 'diesen Nutzer';
    if (!confirm(`"${name}" wirklich sperren? Der Nutzer kann sich dann nicht mehr einloggen.`)) return;
    try {
      await this._adminCall('block-user', { userId, blocked: true });
      this._closeUserModal();
      App.showToast(`"${name}" wurde gesperrt`, 'success');
      this.render();
    } catch (err) { alert('Sperren fehlgeschlagen: ' + err.message); }
  },

  async unblockUser(userId) {
    try {
      await this._adminCall('block-user', { userId, blocked: false });
      this._closeUserModal();
      App.showToast('User wurde entsperrt', 'success');
      this.render();
    } catch (err) { alert('Entsperren fehlgeschlagen: ' + err.message); }
  },

  async deleteUser(userId, userName) {
    // Double confirmation for safety
    const label = userName || 'diesen Nutzer';
    if (!confirm(`"${label}" wirklich LÖSCHEN?\n\nAlle Daten (Fortschritt, PDFs, Credits, Simulationen) werden unwiderruflich entfernt.\nDie E-Mail-Adresse wird für eine neue Registrierung freigegeben.\n\nDies kann NICHT rückgängig gemacht werden!`)) return;
    if (!confirm(`Bist du SICHER? Letzte Warnung!\n\nUser "${label}" wird endgültig gelöscht.`)) return;

    try {
      App.showToast('User wird gelöscht...', 'info');
      await this._adminCall('delete-user', { userId });
      this._closeUserModal();
      App.showToast(`"${label}" wurde gelöscht`, 'success');
      this.render(); // Refresh admin dashboard
    } catch (err) {
      alert('Löschen fehlgeschlagen: ' + err.message);
    }
  },

  // ===== ECHTE IMPERSONATION: Session-Swap im selben Tab =====
  async openAsUser(userId) {
    try {
      App.showToast('Session wird vorbereitet...');

      // 1. Save current admin session
      const session = await Auth.supabase.auth.getSession();
      if (!session?.data?.session) {
        App.showToast('Keine aktive Admin-Session gefunden');
        return;
      }
      localStorage.setItem('medat_admin_backup_session', JSON.stringify({
        access_token: session.data.session.access_token,
        refresh_token: session.data.session.refresh_token,
        timestamp: Date.now(),
      }));

      // 2. Get user session tokens from backend
      const result = await this._adminCall('impersonate', { userId });
      if (!result?.access_token) {
        App.showToast('Keine Session-Tokens erhalten');
        return;
      }

      // 3. Swap session to the target user
      const { error: setErr } = await Auth.supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (setErr) {
        App.showToast('Session-Swap fehlgeschlagen: ' + setErr.message);
        return;
      }

      // 4. Store impersonation info for the banner
      localStorage.setItem('medat_impersonating', JSON.stringify({
        name: result.name,
        email: result.email,
        tier: result.tier,
      }));

      // 5. Reload the page — it will load as the target user
      location.reload();

    } catch (e) {
      console.error('Impersonation error:', e);
      App.showToast('Fehler: ' + (e.message || 'Unbekannt'));
    }
  },

  // Called on page load to show impersonation banner if active
  checkImpersonation() {
    const info = localStorage.getItem('medat_impersonating');
    const backup = localStorage.getItem('medat_admin_backup_session');
    if (!info || !backup) return;

    try {
      const { name, email, tier } = JSON.parse(info);

      // Remove old banner if exists
      document.getElementById('impersonation-banner-real')?.remove();

      const banner = document.createElement('div');
      banner.id = 'impersonation-banner-real';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;display:flex;align-items:center;justify-content:center;gap:0.6rem;padding:0.6rem 1rem;font-size:0.82rem;font-weight:600;box-shadow:0 2px 12px rgba(220,38,38,0.4)';
      banner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Eingeloggt als <strong>${name}</strong> (${email}) — ${(tier || 'free').toUpperCase()}</span>
        <button onclick="Admin.stopImpersonationReal()" style="background:rgba(255,255,255,0.25);border:none;color:#fff;border-radius:8px;padding:0.35rem 1rem;font-size:0.78rem;font-weight:700;cursor:pointer;margin-left:0.5rem">⬅ Zurück zum Admin</button>
      `;
      document.body.prepend(banner);
      document.body.style.paddingTop = banner.offsetHeight + 'px';
    } catch (e) {
      console.warn('Impersonation banner error:', e);
    }
  },

  // Switch back to admin
  async stopImpersonationReal() {
    const backup = localStorage.getItem('medat_admin_backup_session');
    if (!backup) {
      App.showToast('Kein Admin-Backup gefunden — bitte neu einloggen');
      localStorage.removeItem('medat_impersonating');
      location.reload();
      return;
    }

    try {
      const { access_token, refresh_token, timestamp } = JSON.parse(backup);

      // Check if backup is still valid (max 2 hours)
      if (Date.now() - timestamp > 7200000) {
        App.showToast('Admin-Backup abgelaufen — bitte neu einloggen');
        localStorage.removeItem('medat_admin_backup_session');
        localStorage.removeItem('medat_impersonating');
        await Auth.supabase.auth.signOut();
        location.reload();
        return;
      }

      await Auth.supabase.auth.setSession({ access_token, refresh_token });
      localStorage.removeItem('medat_admin_backup_session');
      localStorage.removeItem('medat_impersonating');
      location.reload();
    } catch (e) {
      App.showToast('Zurückwechseln fehlgeschlagen: ' + e.message);
    }
  },

  // ===== LEGACY IMPERSONATION (local preview, not real login) =====
  _impersonating: null,
  _originalProfile: null,

  async startImpersonation(userId) {
    const u = this._users.find(x => x.user_id === userId);
    if (!u) { App.showToast('User nicht gefunden'); return; }

    // Fetch their credit data
    const { data: creditData } = await Auth.supabase
      .from('user_credits')
      .select('credits_total, credits_used')
      .eq('user_id', userId)
      .maybeSingle();

    // Save original state
    this._originalProfile = {
      license_tier: Auth.userProfile?.license_tier,
      is_admin: true,
    };

    // Set impersonation state
    this._impersonating = {
      userId,
      email: u.email || '–',
      name: u.username || u.display_name || u.email || '–',
      tier: u.license_tier || 'free',
      credits_total: creditData?.credits_total || 300,
      credits_used: creditData?.credits_used || 0,
    };

    // Override Auth profile temporarily
    if (Auth.userProfile) {
      Auth.userProfile.license_tier = this._impersonating.tier;
    }

    // Override Credits
    Credits._credits = {
      credits_total: this._impersonating.credits_total,
      credits_used: this._impersonating.credits_used,
    };

    // Close modal & admin screen, go to home
    this._closeUserModal();
    App.showScreen('screen-home');

    // Show impersonation banner
    this._showImpersonationBanner();

    // Update UI — refresh menu to hide admin items and show impersonated user
    Credits.updateUI();
    App._updateMenuUser();
    App.showToast(`Vorschau als: ${this._impersonating.name}`);
  },

  _showImpersonationBanner() {
    document.getElementById('impersonation-banner')?.remove();
    if (!this._impersonating) return;

    const banner = document.createElement('div');
    banner.id = 'impersonation-banner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;display:flex;align-items:center;justify-content:center;gap:0.6rem;padding:0.5rem 1rem;font-size:0.8rem;font-weight:600;box-shadow:0 2px 12px rgba(124,58,237,0.4)';
    banner.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      <span>Vorschau als <strong>${this._impersonating.name}</strong> (${this._impersonating.tier.toUpperCase()})</span>
      <button onclick="Admin.stopImpersonation()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:8px;padding:0.3rem 0.8rem;font-size:0.75rem;font-weight:700;cursor:pointer;margin-left:0.5rem">Beenden</button>
    `;
    document.body.appendChild(banner);

    // Push body content down
    document.body.style.paddingTop = banner.offsetHeight + 'px';
  },

  stopImpersonation() {
    if (!this._impersonating) return;

    // Restore original profile
    if (Auth.userProfile && this._originalProfile) {
      Auth.userProfile.license_tier = this._originalProfile.license_tier;
    }

    this._impersonating = null;
    this._originalProfile = null;

    // Remove banner
    document.getElementById('impersonation-banner')?.remove();
    document.body.style.paddingTop = '';

    // Reload real credit data and refresh menu
    Credits.load();
    App._updateMenuUser();

    App.showToast('Vorschau beendet — zurück zu deinem Account');
  },

  isImpersonating() {
    return !!this._impersonating;
  },

  // ===== SIMULATION CREATION =====
  async createSimulation() {
    const statusEl = document.getElementById('adm-sim-status');
    const btn = document.getElementById('adm-create-sim');
    if (!Auth.supabase) { statusEl.textContent = '❌ Nicht eingeloggt'; return; }

    btn.disabled = true;
    btn.textContent = 'Wird erstellt...';
    statusEl.textContent = 'Lade Fragenpool...';
    statusEl.style.color = 'var(--text-muted)';

    try {
      // 1. Determine next simulation number
      const existingSims = this._simulations || [];
      const nextNum = existingSims.length > 0 ? Math.max(...existingSims.map(s => s.number)) + 1 : 1;

      // 2. Load all already-assigned question IDs (grouped by source)
      const { data: assigned } = await Auth.supabase.from('simulation_questions').select('question_id, question_source');
      const usedIds = { questions: new Set(), pre_generated_tv: new Set(), pre_generated_sek: new Set() };
      (assigned || []).forEach(a => {
        if (usedIds[a.question_source]) usedIds[a.question_source].add(a.question_id);
      });

      statusEl.textContent = 'Wähle Fragen aus...';

      // 3. For each section in SIM_STRUCTURE, pick random unassigned questions
      const assignments = []; // { question_id, question_source, section, sort_order }
      let sortOrder = 0;
      const errors = [];

      for (const spec of this.SIM_STRUCTURE) {
        let availableIds = [];

        if (spec.source === 'questions') {
          // Load IDs from questions table matching type (and optionally subtype)
          let query = Auth.supabase.from('questions').select('id').eq('type', spec.type);
          if (spec.subtype) query = query.eq('subtype', spec.subtype);
          const { data } = await query;
          availableIds = (data || []).map(r => r.id).filter(id => !usedIds.questions.has(id));
        } else if (spec.source === 'pre_generated_tv') {
          const { data } = await Auth.supabase.from('pre_generated_tv').select('id');
          availableIds = (data || []).map(r => r.id).filter(id => !usedIds.pre_generated_tv.has(id));
        } else if (spec.source === 'pre_generated_sek') {
          const { data } = await Auth.supabase.from('pre_generated_sek').select('id').eq('sek_type', spec.sek_type);
          availableIds = (data || []).map(r => r.id).filter(id => !usedIds.pre_generated_sek.has(id));
        }

        // Shuffle using Fisher-Yates
        for (let i = availableIds.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableIds[i], availableIds[j]] = [availableIds[j], availableIds[i]];
        }

        if (availableIds.length < spec.count) {
          errors.push(`${spec.label}: nur ${availableIds.length}/${spec.count} verfügbar`);
        }

        const picked = availableIds.slice(0, spec.count);
        picked.forEach(id => {
          sortOrder++;
          assignments.push({
            question_id: id,
            question_source: spec.source,
            section: spec.section,
            sort_order: sortOrder,
          });
          // Mark as used for subsequent sections
          if (usedIds[spec.source]) usedIds[spec.source].add(id);
        });
      }

      if (errors.length > 0) {
        const proceed = confirm(`Nicht genug Fragen für:\n\n${errors.join('\n')}\n\nTrotzdem erstellen mit weniger Fragen?`);
        if (!proceed) {
          btn.disabled = false;
          btn.textContent = `+ Simulation ${nextNum} erstellen`;
          statusEl.textContent = '';
          return;
        }
      }

      statusEl.textContent = `Erstelle Simulation ${nextNum} mit ${assignments.length} Fragen...`;

      // 4. Insert simulation
      const { data: simData, error: simError } = await Auth.supabase
        .from('simulations')
        .insert({ number: nextNum, name: `Simulation ${nextNum}`, is_active: true })
        .select()
        .single();

      if (simError) throw new Error('Simulation erstellen fehlgeschlagen: ' + simError.message);

      // 5. Insert question assignments in batches of 100
      const simId = simData.id;
      const rows = assignments.map(a => ({ simulation_id: simId, ...a }));

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error: insertError } = await Auth.supabase.from('simulation_questions').insert(batch);
        if (insertError) throw new Error('Fragen zuweisen fehlgeschlagen: ' + insertError.message);
      }

      statusEl.textContent = `✅ Simulation ${nextNum} erstellt mit ${assignments.length} Fragen!`;
      statusEl.style.color = 'var(--success)';
      App.showToast(`Simulation ${nextNum} erstellt!`, 'success');

      // Refresh
      setTimeout(() => this.render(), 1500);

    } catch (err) {
      statusEl.textContent = `❌ Fehler: ${err.message}`;
      statusEl.style.color = 'var(--danger)';
      btn.disabled = false;
      btn.textContent = '+ Neue Simulation erstellen';
    }
  },
};
