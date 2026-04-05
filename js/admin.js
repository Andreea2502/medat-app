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
      const [users, progress, questions, licenses, onboarding, simulations, notes] = await Promise.allSettled([
        this._loadUsers(),
        this._loadAllProgress(),
        this._loadQuestionCount(),
        this._loadLicenses(),
        this._loadOnboarding(),
        this._loadSimulations(),
        this._loadNotes(),
      ]);

      this._users = users.status === 'fulfilled' ? users.value : [];
      this._progress = progress.status === 'fulfilled' ? progress.value : [];
      this._questionCount = questions.status === 'fulfilled' ? questions.value : 0;
      this._licenses = licenses.status === 'fulfilled' ? licenses.value : [];
      this._onboarding = onboarding.status === 'fulfilled' ? onboarding.value : [];
      this._simulations = simulations.status === 'fulfilled' ? simulations.value : [];
      this._notes = notes.status === 'fulfilled' ? notes.value : [];
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
  async _loadSimulations() { try { return await this._adminCall('list-simulations') || []; } catch { return []; } },
  async _loadNotes() { try { return await this._adminCall('list-notes') || []; } catch { return []; } },
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
    const paidUsers = users.filter(u => (u.license_tier === 'basic' || u.license_tier === 'premium') && u.license_code).length;
    const totalRevenue = paidUsers * 17.00;

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
                    <td style="white-space:nowrap">${this._formatDate(u.created_at)}</td>
                    <td style="white-space:nowrap">${lastActive}</td>
                    <td style="white-space:nowrap">
                      <div style="display:flex;gap:4px;flex-wrap:wrap">
                        ${isUpgraded
                          ? '<span class="adm-badge-ok">✓ Vollzugang</span>'
                          : `<button class="adm-btn-sm adm-btn-upgrade" data-userid="${u.user_id}" data-username="${u.username || u.display_name || ''}">⚡ Freischalten</button>`
                        }
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

  // ===== BATCH PDF SIMULATIONEN =====
  async generateBatchSimulations() {
    const titlesRaw = document.getElementById('admin-batch-sims')?.value || '';
    const titles = titlesRaw.split('\\n').map(t => t.trim()).filter(Boolean);
    const statusEl = document.getElementById('admin-batch-sims-status');
    const btn = document.getElementById('btn-admin-batch-sims');
    
    if (titles.length === 0) {
      alert('Bitte gib mindestens einen Simulationstitel ein.');
      return;
    }
    
    if (!confirm(`${titles.length} komplette Simulationen wirklich generieren? Dies kann eine Weile dauern und verbraucht viele Fragen aus der Datenbank!`)) {
      return;
    }

    // Disable UI
    if (btn) btn.disabled = true;
    
    // Start fresh: Reset seen questions so we have a clean slate for THIS session,
    // but the API's track-list will grow with each simulation, ensuring no duplicates.
    API.resetSeenQuestions();
    
    statusEl.style.color = 'var(--text-muted)';
    
    let successCount = 0;
    for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        statusEl.innerHTML = `<span class="spinner" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></span> Generiere Simulation ${i + 1} von ${titles.length}: <b>${title}</b>...`;
        
        try {
            await PDFExport.generateAdminSimulationPDF(title);
            successCount++;
        } catch (err) {
            console.error('[Admin] Fehler bei Simulation', title, err);
            const proceed = confirm(`Fehler bei "${title}": ${err.message}\\n\\nMöchtest du trotzdem mit der nächsten Simulation fortfahren?`);
            if (!proceed) break;
        }
    }
    
    statusEl.style.color = 'var(--success)';
    statusEl.innerHTML = `✅ ${successCount} von ${titles.length} Simulationen erfolgreich generiert!`;
    if (btn) btn.disabled = false;
  },

  exportUsers() {
    const csvRows = ['Name,Email,Tier,Status,Registriert,Letzte Aktivitaet'];
    this._users.forEach(u => {
      const tierLabel = (u.license_tier || 'free').toUpperCase();
      const status = u.blocked ? 'Blockiert' : 'Aktiv';
      const dateStr = this._formatDate(u.created_at);
      const lastActive = u.last_active_date ? this._formatDateTime(u.last_active_date + 'T00:00:00') : '–';
      csvRows.push(`"${u.username || u.display_name || ''}","${u.email || ''}","${tierLabel}","${status}","${dateStr}","${lastActive}"`);
    });
    const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `medat-nutzer-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  },

  // ===== USER DETAIL MODAL =====
  _openUserModal(userId) {
    const u = this._users.find(x => x.user_id === userId);
    if (!u) return;

    const progress = this._progress;
    const onboarding = this._onboarding;

    // Per-user stats
    const userP = progress.filter(p => (p.user_id || p.session_id) === userId);
    const totalQ = userP.length;
    const correctQ = userP.filter(p => p.answered_correctly).length;
    const accuracy = totalQ > 0 ? Math.round(correctQ / totalQ * 100) : 0;

    // Section breakdown
    const bySec = {};
    userP.forEach(p => { const k = p.section_key || 'unknown'; bySec[k] = (bySec[k] || 0) + 1; });
    const secEntries = Object.entries(bySec).sort((a, b) => b[1] - a[1]);

    // Onboarding
    const ob = onboarding.find(o => o.user_id === userId);

    const name = u.username || u.display_name || '–';
    const tierLabel = (u.license_tier || 'free').toUpperCase();
    const isBlocked = !!u.blocked;

    let html = `
      <div class="adm-modal-section-title">Allgemein</div>
      <table>
        <tr><td style="width:40%;color:var(--text-muted)">Name</td><td><strong>${name}</strong></td></tr>
        <tr><td style="color:var(--text-muted)">Email</td><td>${u.email ? `<a href="mailto:${u.email}" class="adm-email-link">${u.email}</a>` : '–'}</td></tr>
        <tr><td style="color:var(--text-muted)">Abo</td><td><span class="adm-tier ${u.license_tier === 'basic' || u.license_tier === 'premium' ? 'adm-tier-paid' : 'adm-tier-free'}">${tierLabel}</span></td></tr>
        <tr><td style="color:var(--text-muted)">Lizenz-Code</td><td>${u.license_code || '–'}</td></tr>
        <tr><td style="color:var(--text-muted)">Lizenz läuft ab</td><td>${u.license_expires_at ? this._formatDateTime(u.license_expires_at) : '–'}</td></tr>
        <tr><td style="color:var(--text-muted)">Status</td><td>${isBlocked ? '<span style="color:#dc2626;font-weight:600">🚫 Gesperrt</span>' : '<span style="color:#059669;font-weight:600">✓ Aktiv</span>'}</td></tr>
        <tr><td style="color:var(--text-muted)">Registriert</td><td>${this._formatDateTime(u.created_at)}</td></tr>
      </table>

      <div class="adm-modal-section-title">Aktivität</div>
      <table>
        <tr><td style="width:40%;color:var(--text-muted)">Letzte Aktivität</td><td>${u.last_active_date || '–'}</td></tr>
        <tr><td style="color:var(--text-muted)">Streak</td><td>${u.streak_count || 0} Tage</td></tr>
        <tr><td style="color:var(--text-muted)">Fragen beantwortet</td><td><strong>${totalQ}</strong></td></tr>
        <tr><td style="color:var(--text-muted)">Genauigkeit</td><td>${accuracy > 0 ? `<span style="color:${accuracy >= 70 ? '#059669' : accuracy >= 50 ? '#d97706' : '#dc2626'};font-weight:600">${accuracy}%</span>` : '–'}</td></tr>
        <tr><td style="color:var(--text-muted)">PDFs erstellt</td><td>${u.pdfs_created || 0}</td></tr>
        <tr><td style="color:var(--text-muted)">Simulationen</td><td>${u.simulations_completed || 0}</td></tr>
      </table>

      ${secEntries.length > 0 ? `
        <div class="adm-modal-section-title">Sektionen-Breakdown</div>
        <table>
          ${secEntries.map(([k, v]) => `<tr><td style="width:40%;color:var(--text-muted)">${k}</td><td><strong>${v}</strong> Fragen</td></tr>`).join('')}
        </table>
      ` : ''}

      <div class="adm-modal-section-title">Onboarding</div>
      ${ob ? `
        <table>
          <tr><td style="width:40%;color:var(--text-muted)">Ziel-Uni</td><td>${this._uniLabel(ob.target_uni)}</td></tr>
          <tr><td style="color:var(--text-muted)">Erster Antritt?</td><td>${ob.is_first_attempt === true ? 'Ja' : ob.is_first_attempt === false ? 'Nein' : '–'}</td></tr>
          <tr><td style="color:var(--text-muted)">Größte Sorge</td><td>${this._sectionLabel(ob.weakest_section)}</td></tr>
          <tr><td style="color:var(--text-muted)">Sicherheitsgefühl</td><td>${this._confidenceLabel(ob.confidence_level)}</td></tr>
          <tr><td style="color:var(--text-muted)">Lernzeit</td><td>${this._studyTimeLabel(ob.preferred_study_time)}</td></tr>
          <tr><td style="color:var(--text-muted)">Abgeschlossen</td><td>${ob.onboarding_completed ? '✅ ' + this._formatDateTime(ob.onboarding_completed_at) : '❌ Nein'}</td></tr>
        </table>
      ` : '<p class="adm-muted" style="font-size:0.85rem">Kein Onboarding-Datensatz vorhanden</p>'}
    `;

    // Add admin action buttons
    html += `
      <div class="adm-modal-section-title">Admin-Aktionen</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button onclick="Admin.startImpersonation('${userId}')" style="background:var(--dark);color:var(--yellow);border:none;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Als User ansehen
        </button>
        <button onclick="Admin.deleteUser('${userId}', '${(name).replace(/'/g, "\\'")}')" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:10px;padding:0.6rem 1rem;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;gap:0.4rem">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          User löschen
        </button>
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">
        <strong>Löschen</strong> = Account + alle Daten entfernen (E-Mail kann sich neu registrieren).<br>
        <strong>Sperren</strong> = Account bleibt, aber Login gesperrt (E-Mail bleibt blockiert).
      </p>
    `;

    document.getElementById('adm-modal-title').textContent = name;
    document.getElementById('adm-modal-body').innerHTML = html;
    document.getElementById('adm-user-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
    const users = this._users;
    const progress = this._progress;
    const onboarding = this._onboarding;

    // Build per-user progress
    const userProgress = {};
    progress.forEach(p => {
      const uid = p.user_id || p.session_id;
      if (!userProgress[uid]) userProgress[uid] = { total: 0, correct: 0 };
      userProgress[uid].total++;
      if (p.answered_correctly) userProgress[uid].correct++;
    });

    // Onboarding keyed by user_id
    const obByUser = {};
    onboarding.forEach(o => { if (o.user_id) obByUser[o.user_id] = o; });

    const header = 'Name,Email,Tier,Fragen,Genauigkeit,Ziel-Uni,Schwächste Sektion,Registriert,Letzte Aktivität';
    const rows = users.map(u => {
      const up = userProgress[u.user_id] || { total: 0, correct: 0 };
      const accuracy = up.total > 0 ? Math.round(up.correct / up.total * 100) + '%' : '–';
      const ob = obByUser[u.user_id];
      const uni = ob?.target_uni || '–';
      const weak = ob?.weakest_section || '–';
      const name = (u.username || u.display_name || '–').replace(/,/g, ' ');
      const email = u.email || '–';
      const tier = u.license_tier || 'free';
      const reg = this._formatDate(u.created_at);
      const lastActive = u.last_active_date || '–';
      return `${name},${email},${tier},${u.total_questions_answered || 0},${accuracy},${uni},${weak},${reg},${lastActive}`;
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n'); // BOM for Excel UTF-8
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

  // ===== IMPERSONATION / "ALS USER ANSEHEN" =====
  _impersonating: null, // { userId, email, tier, credits }
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
};
 
