// === MedAT Trainer – App (Üben + Simulation) ===

const App = {
  mode: null, // 'practice' | 'simulation'
  currentBlock: null,
  currentSectionKey: null,
  currentSection: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  results: [],
  countdownTimer: null,
  countdownSeconds: 0,
  showTimer: true,

  // Simulation state
  simBlocks: [],
  simCurrentBlockIdx: 0,
  simSectionIdx: 0,
  simResults: {}, // { blockId: { sectionKey: { score, total } } }

  // Memorize state
  memorizeCards: [],
  memCardIdx: 0,
  memTimerInterval: null,
  memSecondsLeft: 0,

  // Track wrong answers for infographic generation
  wrongAnswers: [],

  // Infographic generation state
  _infographicQueue: [],
  _infographicResults: [],
  _infographicGenerating: false,

  // ===== INIT =====
  async init() {
    // Initialize all SVG icons
    ICONS.initAll();

    this.bindGlobal();
    this.bindAuth();
    this.bindNav();

    // Scratchpad init
    Scratchpad.init();

    // Auth initialisieren
    const isLoggedIn = await Auth.init();

    // Auth-Change Callback
    Auth.onAuthChange = async (loggedIn) => {
      this.updateAuthUI(loggedIn);
      if (loggedIn) {
        Auth.migrateSessionData();
        this._updateUpgradeIcon();
        Credits.load();
        // Check if onboarding is needed (handles email-confirm return etc.)
        const activeScreen = document.querySelector('.screen.active');
        const onAuth = activeScreen && activeScreen.id === 'screen-auth';
        const onOnboarding = activeScreen && activeScreen.id === 'screen-onboarding';
        if (onAuth && !onOnboarding) {
          const needsOB = await Onboarding.checkOnboardingNeeded();
          if (needsOB) {
            Onboarding.start();
          } else {
            this.showScreen('screen-home');
            this.loadHomeStats();
            this._checkPaymentReturn();
            this._checkEmailConfirmation();
          }
        } else if (!onOnboarding) {
          this.loadHomeStats();
        }
      } else {
        this._updateUpgradeIcon();
      }
    };

    if (isLoggedIn) {
      this.updateAuthUI(true);
      this._updateUpgradeIcon();
      // Load credits
      Credits.load();
      // Check if onboarding needed before showing home
      const needsOnboarding = await Onboarding.checkOnboardingNeeded();
      if (needsOnboarding && !this._checkPaymentReturn(true)) {
        Onboarding.start();
      } else {
        this.showScreen('screen-home');
        this.loadHomeStats();
        this._checkPaymentReturn();
        this._checkEmailConfirmation();
        // Show PWA install prompt after login (delayed)
        setTimeout(() => { if (window.showPWAInstallBanner) window.showPWAInstallBanner(); }, 4000);
      }
    } else {
      // Check for TikTok landing
      this._checkTikTokLanding();
      // Gast-Modus deaktiviert — immer Login verlangen
      this.showScreen('screen-auth');
    }
  },

  bindGlobal() {
    // Helper for safe onclick binding
    const bindClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };

    // Home buttons
    bindClick('btn-practice', () => this.openPracticeSelect());
    bindClick('btn-simulation', () => this.openSimOverview());
    bindClick('btn-smart-train', () => this.openSmartTraining());
    bindClick('btn-smart-train-main', () => this.openSmartTraining());
    document.getElementById('btn-sprint')?.addEventListener('click', () => this.startSprint());
    document.getElementById('btn-weakspot')?.addEventListener('click', () => this.startWeakspotTrainer());
    document.getElementById('btn-daily')?.addEventListener('click', () => this.startDailyChallenge());

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.onclick = () => this.showScreen(btn.dataset.target);
    });

    // Practice start
    bindClick('btn-start-practice', () => this.startPractice());

    // Simulation start
    bindClick('btn-start-sim', () => this.startSimulation());

    // Result buttons
    bindClick('res-home', () => this.showScreen('screen-home'));
    bindClick('res-restart', () => {
      if (this.mode === 'simulation') this.openSimOverview();
      else this.openPracticeSelect();
    });

    // Abort test button
    document.getElementById('btn-abort-test')?.addEventListener('click', () => this.abortTest());

    // Question next
    bindClick('q-next-btn', () => this.nextQuestion());

    // Memorize nav
    bindClick('mem-prev', () => this.memNavigate(-1));
    bindClick('mem-next', () => this.memNavigate(1));
    bindClick('mem-skip', () => this.endMemorize());
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    window.scrollTo(0, 0);

    // Hide simulation generating overlay on any screen transition
    this._hideSimGeneratingOverlay();

    // Hide scratchpad when leaving question screen
    if (id !== 'screen-question') Scratchpad.hide();

    // Close slide menu on screen change
    this._closeMenu();

    // Hide/show nav + credit counter on auth screen
    const creditWrap = document.getElementById('credit-counter-wrap');
    if (id === 'screen-auth' || id === 'screen-onboarding') {
      document.body.classList.add('hide-nav');
      if (creditWrap) creditWrap.style.display = 'none';
    } else {
      document.body.classList.remove('hide-nav');
      if (creditWrap) creditWrap.style.display = 'flex';
    }

    // Update slide menu active state
    document.querySelectorAll('.slide-menu-item').forEach(n => n.classList.remove('active'));
    if (id === 'screen-home') {
      document.getElementById('snav-home')?.classList.add('active');
    } else if (id === 'screen-practice-select') {
      document.getElementById('snav-practice')?.classList.add('active');
    } else if (id === 'screen-stats') {
      document.getElementById('snav-stats')?.classList.add('active');
    } else if (id === 'screen-konto') {
      document.getElementById('snav-konto')?.classList.add('active');
    }

    // Load data for specific screens
    if (id === 'screen-stats') this.loadStatsScreen();
    if (id === 'screen-admin') Admin.render();
    if (id === 'screen-konto') this.renderKonto();
    if (id === 'screen-home') { this._updateHomeCountdown(); this._loadHomeSimulations(); }
  },

  // ===== ABORT TEST =====
  abortTest() {
    if (!confirm('Test wirklich abbrechen? Dein bisheriger Fortschritt geht verloren.')) return;

    this.stopCountdown();
    this._sprintMode = false;
    this._dailyChallenge = false;
    this._inRecallPhase = false;

    if (this.mode === 'simulation') {
      this.showScreen('screen-sim-overview');
    } else {
      this.showScreen('screen-home');
      this.loadHomeStats();
    }
  },

  // ===== AUTH BINDINGS =====
  bindAuth() {
    // Restore saved email in login form
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
      const savedEmail = localStorage.getItem('medat_login_email');
      if (savedEmail) loginEmailInput.value = savedEmail;
    }

    // Login — bind to form submit AND button click for password manager support
    const loginForm = document.getElementById('auth-login');
    const btnLogin = document.getElementById('btn-login');
    const loginHandler = async (e) => {
      if (e) e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('auth-error');
        errorEl.classList.add('hidden');
        btnLogin.classList.add('btn-loading');

        try {
          // Save email for next time
          if (email) localStorage.setItem('medat_login_email', email);
          await Auth.signIn(email, password);
          const needsOB = await Onboarding.checkOnboardingNeeded();
          if (needsOB) {
            Onboarding.start();
          } else {
            this.showScreen('screen-home');
            this.loadHomeStats();
          }
        } catch (e) {
          errorEl.textContent = this._authErrorMsg(e);
          errorEl.classList.remove('hidden');
        } finally {
          btnLogin.classList.remove('btn-loading');
        }
    };
    if (loginForm) loginForm.onsubmit = loginHandler;
    if (btnLogin) btnLogin.onclick = loginHandler;

    // Signup
    const btnSignup = document.getElementById('btn-signup');
    if (btnSignup) {
      btnSignup.onclick = async () => {
        const name = document.getElementById('signup-name').value.trim();
        const username = document.getElementById('signup-username')?.value.trim() || '';
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const licenseCode = document.getElementById('signup-license')?.value.trim() || '';
        const errorEl = document.getElementById('signup-error');
        errorEl.classList.add('hidden');
        btnSignup.classList.add('btn-loading');

        try {
          if (!username) throw { message: 'Bitte wähle einen Benutzernamen' };
          if (password.length < 6) throw { message: 'Passwort muss mindestens 6 Zeichen haben' };
          const privacyBox = document.getElementById('signup-privacy');
          if (privacyBox && !privacyBox.checked) throw { message: 'Bitte akzeptiere die AGB und Datenschutzerklärung' };
          const signUpResult = await Auth.signUp(email, password, name);

          // Check if email confirmation is required
          if (!signUpResult.session) {
            // Email confirmation needed — show confirmation screen
            this._showEmailConfirmation(email);
            return;
          }

          // Save AGB + Datenschutz acceptance timestamp
          try {
            const now = new Date().toISOString();
            await Auth.updateProfile({ privacy_accepted_at: now, agb_accepted_at: now });
          } catch(ae) { console.warn('AGB/Datenschutz Timestamp speichern fehlgeschlagen:', ae); }

          // Set username
          if (username) {
            try { await Auth.setUsername(username); } catch(ue) {
              console.warn('Username setzen fehlgeschlagen:', ue);
            }
          }

          // Activate license if provided
          if (licenseCode) {
            try {
              const tier = await Auth.activateLicense(licenseCode, email);
              this.showToast(`Lizenz aktiviert: ${tier.toUpperCase()}`);
            } catch(le) {
              this.showToast(`Lizenzcode ungültig: ${le.message}`);
            }
          }

          // New users always get onboarding
          Onboarding.start();
        } catch (e) {
          errorEl.textContent = this._authErrorMsg(e);
          errorEl.classList.remove('hidden');
        } finally {
          btnSignup.classList.remove('btn-loading');
        }
      };
    }

    // Reset Password
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.onclick = async () => {
        const email = document.getElementById('reset-email').value.trim();
        const errorEl = document.getElementById('reset-error');
        const successEl = document.getElementById('reset-success');
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        try {
          await Auth.resetPassword(email);
          successEl.textContent = 'Link wurde gesendet! Prüfe deine E-Mails.';
          successEl.classList.remove('hidden');
        } catch (e) {
          errorEl.textContent = this._authErrorMsg(e);
          errorEl.classList.remove('hidden');
        }
      };
    }

    // Toggle forms
    document.getElementById('btn-show-signup')?.addEventListener('click', () => {
      document.getElementById('auth-login').classList.add('hidden');
      document.getElementById('auth-signup').classList.remove('hidden');
      document.getElementById('auth-reset').classList.add('hidden');
    });
    document.getElementById('btn-show-login')?.addEventListener('click', () => {
      document.getElementById('auth-login').classList.remove('hidden');
      document.getElementById('auth-signup').classList.add('hidden');
      document.getElementById('auth-reset').classList.add('hidden');
    });
    document.getElementById('btn-show-reset')?.addEventListener('click', () => {
      document.getElementById('auth-login').classList.add('hidden');
      document.getElementById('auth-signup').classList.add('hidden');
      document.getElementById('auth-reset').classList.remove('hidden');
    });
    document.getElementById('btn-back-login')?.addEventListener('click', () => {
      document.getElementById('auth-login').classList.remove('hidden');
      document.getElementById('auth-signup').classList.add('hidden');
      document.getElementById('auth-reset').classList.add('hidden');
    });

    // Datenschutz link
    document.getElementById('link-datenschutz')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('modal-datenschutz').style.display = '';
    });

    // AGB link
    document.getElementById('link-agb')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('modal-agb').style.display = '';
    });

    // Guest mode
    document.getElementById('btn-guest')?.addEventListener('click', () => {
      CONFIG.getSessionId(); // Erstellt session_id
      this.updateAuthUI(false);
      this.showScreen('screen-home');
      this.loadHomeStats();
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await Auth.signOut();
      this.showScreen('screen-auth');
    });

    // Go to auth from profile
    document.getElementById('btn-goto-auth')?.addEventListener('click', () => {
      this.showScreen('screen-auth');
    });

    // Save profile
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      if (!Auth.isLoggedIn) return;

      const updates = {
        display_name: document.getElementById('profile-display-name').value.trim(),
        medat_date: document.getElementById('profile-medat-date').value || null,
        target_score: parseInt(document.getElementById('profile-target-score').value) || null,
        study_hours_per_day: parseInt(document.getElementById('profile-study-hours').value) || 2,
      };

      try {
        await Auth.updateProfile(updates);
        this.showToast('Profil gespeichert!');
        this.loadHomeStats();
      } catch (e) {
        this.showToast('Fehler beim Speichern');
      }
    });

    // Enter-Taste in Login-Feldern
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnLogin?.click();
    });
    document.getElementById('signup-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnSignup?.click();
    });
  },

  // ===== MENU HELPERS =====
  _openMenu() {
    document.getElementById('slide-menu')?.classList.add('open');
    document.getElementById('slide-menu-overlay')?.classList.add('open');
    document.getElementById('hamburger-btn')?.classList.add('active');
    this._updateMenuUser();
  },
  _closeMenu() {
    document.getElementById('slide-menu')?.classList.remove('open');
    document.getElementById('slide-menu-overlay')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.classList.remove('active');
  },
  _updateMenuUser() {
    const el = document.getElementById('slide-menu-user');
    if (!el) return;
    // During impersonation, show impersonated user info
    const impersonating = typeof Admin !== 'undefined' && Admin.isImpersonating();
    const name = impersonating
      ? Admin._impersonating.name
      : (Auth.userProfile?.username || Auth.currentUser?.email || 'Gast');
    const tier = impersonating
      ? Admin._impersonating.tier
      : Auth.licenseTier;
    const tierLabel = (tier === 'premium' || tier === 'basic') ? 'Vollzugang' : 'Free';
    const tierClass = tier === 'premium' ? 'tier-premium' : tier === 'basic' ? 'tier-basic' : 'tier-free';
    el.innerHTML = `
      <div class="slide-menu-user-name">${name}</div>
      <span class="slide-menu-user-tier ${tierClass}">${tierLabel}</span>
    `;

    // Show/hide admin menu item (hide during impersonation for realistic preview)
    const isAdmin = typeof Admin !== 'undefined' && Admin.isAdmin() && !Admin.isImpersonating();
    const adminItem = document.getElementById('snav-admin');
    const adminDivider = document.getElementById('snav-admin-divider');
    if (adminItem) adminItem.style.display = isAdmin ? '' : 'none';
    if (adminDivider) adminDivider.style.display = isAdmin ? '' : 'none';
  },

  // ===== NAV BINDINGS =====
  bindNav() {
    // Hamburger menu
    document.getElementById('hamburger-btn')?.addEventListener('click', () => {
      const menu = document.getElementById('slide-menu');
      if (menu?.classList.contains('open')) {
        this._closeMenu();
      } else {
        this._openMenu();
      }
    });
    document.getElementById('slide-menu-close')?.addEventListener('click', () => this._closeMenu());
    document.getElementById('slide-menu-overlay')?.addEventListener('click', () => this._closeMenu());

    // Nav items
    document.getElementById('snav-home')?.addEventListener('click', () => {
      this._closeMenu();
      this.showScreen('screen-home');
      this.loadHomeStats();
    });
    document.getElementById('snav-practice')?.addEventListener('click', () => {
      this._closeMenu();
      this.openPracticeSelect();
    });
    document.getElementById('snav-stats')?.addEventListener('click', () => {
      this._closeMenu();
      this.showScreen('screen-stats');
    });
    document.getElementById('snav-konto')?.addEventListener('click', () => {
      this._closeMenu();
      this.showScreen('screen-konto');
    });
    document.getElementById('snav-pdf')?.addEventListener('click', () => {
      this._closeMenu();
    });
    document.getElementById('snav-weaknesses')?.addEventListener('click', () => {
      this._closeMenu();
    });
    document.getElementById('snav-daily')?.addEventListener('click', () => {
      this._closeMenu();
    });
    document.getElementById('snav-share')?.addEventListener('click', () => {
      this._closeMenu();
    });

    // Logout button
    document.getElementById('snav-logout')?.addEventListener('click', async () => {
      this._closeMenu();
      if (Auth.session?.user) {
        await Auth.logout();
      } else {
        localStorage.removeItem('guest_session_id');
        this.showScreen('screen-auth');
      }
    });

    // Lernplan button (coming soon)
    document.getElementById('btn-lernplan')?.addEventListener('click', () => {
      alert('Lernplan ist in Arbeit und wird bald freigeschaltet.');
    });
  },

  // ===== AUTH UI UPDATE =====
  updateAuthUI(isLoggedIn) {
    const profileActions = document.getElementById('profile-auth-actions');
    const guestPrompt = document.getElementById('profile-guest-prompt');

    if (isLoggedIn) {
      profileActions?.classList.remove('hidden');
      guestPrompt?.classList.add('hidden');

      // Check if license recently expired → show notification
      if (Auth.licenseExpired && Auth.userProfile?.license_tier && Auth.userProfile.license_tier !== 'free') {
        const expDate = Auth.licenseExpiresAt;
        const expStr = expDate ? expDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        this._showLicenseExpiredBanner(expStr);
      }
    } else {
      profileActions?.classList.add('hidden');
      guestPrompt?.classList.remove('hidden');
    }
  },

  _showLicenseExpiredBanner(expDateStr) {
    // Don't show if already dismissed today
    const today = new Date().toISOString().split('T')[0];
    const dismissKey = 'medat_license_expired_dismissed_' + today;
    if (localStorage.getItem(dismissKey)) return;

    let banner = document.getElementById('license-expired-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'license-expired-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;padding:0.9rem 1.2rem;text-align:center;font-size:0.9rem;font-weight:600;box-shadow:0 2px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;gap:0.8rem;flex-wrap:wrap;';
      banner.innerHTML = `
        <span>⚠️ Dein Vollzugang ist${expDateStr ? ' am ' + expDateStr : ''} abgelaufen. Du nutzt jetzt nur 20% der Fragen.</span>
        <button onclick="App.showScreen('screen-konto')" style="background:#fff;color:#c0392b;border:none;border-radius:8px;padding:0.4rem 1rem;font-weight:700;cursor:pointer;font-size:0.85rem;">Jetzt verlängern</button>
        <button onclick="document.getElementById('license-expired-banner').remove();localStorage.setItem('${dismissKey}','1')" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:8px;padding:0.4rem 0.8rem;cursor:pointer;font-size:0.8rem;">×</button>
      `;
      document.body.prepend(banner);
    }
  },

  // ===== HOME STATS LADEN =====
  async loadHomeStats() {
    this.updateDashboardLimitDisplay();
    try {
      const stats = await API.getSessionStats();
      if (!stats) return;

      // Update greeting with username
      const greetingEl = document.getElementById('hero-greeting');
      if (greetingEl) {
        const name = Auth.userProfile?.username || Auth.userProfile?.display_name || (Auth.isLoggedIn ? Auth.displayName : '');
        if (name) {
          const hour = new Date().getHours();
          const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Hey' : 'Guten Abend';
          greetingEl.textContent = `${greeting}, ${name}!`;
        } else {
          greetingEl.textContent = '';
        }
      }

      // Stat cards aktualisieren (by ID)
      const totalEl = document.getElementById('home-stat-total');
      const accEl = document.getElementById('home-stat-accuracy');
      const todayEl = document.getElementById('home-stat-today');
      const availEl = document.getElementById('home-stat-available');

      if (totalEl) totalEl.textContent = stats.total || '0';
      if (accEl) accEl.textContent = stats.total > 0 ? stats.percentage + '%' : '–';

      // Today's count
      if (todayEl) {
        todayEl.textContent = stats.todayCount || '0';
      }

      // Load and display total available questions
      if (availEl) {
        const totalAvailable = await API.getTotalAvailableQuestions();
        availEl.textContent = totalAvailable.toLocaleString('de-DE');
      }

      // Countdown on home screen
      this._updateHomeCountdown();

      // Admin link visibility
      this._updateAdminLink();

      // Daily Challenge UI aktualisieren
      this._updateDailyUI();
    } catch (e) {
      console.warn('Home Stats Fehler:', e);
    }
  },

  // ===== HOME COUNTDOWN =====
  _updateHomeCountdown() {
    const daysEl = document.getElementById('hero-countdown-days');
    const labelEl = document.getElementById('hero-countdown-label');
    if (!daysEl || !labelEl) return;

    // Default: July 3, 2026
    const medatDate = new Date('2026-07-03T00:00:00');

    // Check if user has a custom date
    if (Auth.isLoggedIn && Auth.userProfile?.medat_date) {
      const custom = new Date(Auth.userProfile.medat_date + 'T00:00:00');
      if (!isNaN(custom.getTime())) {
        medatDate.setTime(custom.getTime());
      }
    }

    const now = new Date();
    const diffMs = medatDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      daysEl.textContent = diffDays;
      labelEl.textContent = 'Tage bis zum MedAT';
    } else if (diffDays === 0) {
      daysEl.textContent = '🎯';
      labelEl.textContent = 'Heute ist MedAT!';
    } else {
      daysEl.textContent = '✓';
      labelEl.textContent = 'MedAT bereits geschrieben';
    }
  },

  // ===== HOME SIMULATIONS =====
  async _loadHomeSimulations() {
    const section = document.getElementById('home-simulations-section');
    const container = document.getElementById('home-simulations-list');
    if (!section || !container) return;

    if (!Auth.isLoggedIn) { section.style.display = 'none'; return; }

    try {
      const { data: sims, error } = await Auth.supabase
        .from('user_simulations')
        .select('id, title, created_at, status, total_questions, results')
        .eq('user_id', Auth.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      if (!sims || sims.length === 0) { section.style.display = 'none'; return; }

      section.style.display = '';
      let html = '';
      for (const sim of sims) {
        const date = new Date(sim.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isEvaluated = sim.status === 'evaluated' && sim.results;
        const resultPct = isEvaluated ? Math.round((sim.results.totalCorrect / sim.results.totalQuestions) * 100) : null;
        const resultColor = resultPct >= 80 ? '#22c55e' : resultPct >= 60 ? '#f5c542' : '#ef4444';

        html += `<div class="cs-compact-item" style="cursor:pointer;border-left:3px solid ${isEvaluated ? resultColor : 'transparent'}" onclick="App.openSimEval('${sim.id}')">
          <span class="cs-compact-icon">${isEvaluated ? '📊' : '📝'}</span>
          <div style="flex:1;min-width:0">
            <span class="cs-compact-text" style="display:block;font-size:0.82rem">${sim.title}</span>
            <span style="font-size:0.7rem;color:var(--text-muted)">${date} · ${sim.total_questions} Fragen</span>
          </div>
          ${isEvaluated
            ? `<span style="font-weight:800;font-size:0.95rem;color:${resultColor}">${resultPct}%</span>`
            : `<span class="cs-compact-badge" style="background:var(--primary);color:#fff;font-size:0.65rem">Auswerten</span>`
          }
        </div>`;
      }
      container.innerHTML = html;
    } catch (err) {
      console.error('Home Simulationen laden:', err);
      section.style.display = 'none';
    }
  },

  // ===== ADMIN LINK =====
  _updateAdminLink() {
    // Show admin link if user is admin
    let adminLink = document.getElementById('admin-link-home');
    if (typeof Admin !== 'undefined' && Admin.isAdmin()) {
      if (!adminLink) {
        adminLink = document.createElement('button');
        adminLink.id = 'admin-link-home';
        adminLink.className = 'admin-link-btn';
        adminLink.textContent = '🔧 Admin';
        adminLink.onclick = () => {
          this.showScreen('screen-admin');
          Admin.render();
        };
        // Insert after hero card
        const heroCard = document.querySelector('.hero-card');
        if (heroCard) heroCard.parentNode.insertBefore(adminLink, heroCard.nextSibling);
      }
      adminLink.style.display = '';
    } else if (adminLink) {
      adminLink.style.display = 'none';
    }
  },

  // ===== KONTO & PLAN SCREEN =====
  renderKonto() {
    const container = document.getElementById('konto-container');
    if (!container) return;

    const tier = Auth.licenseTier;
    const isPaid = tier === 'premium' || tier === 'basic';
    const isFree = !isPaid;
    const email = Auth.currentUser?.email || '–';
    const username = Auth.userProfile?.username || '–';

    const expiresAt = Auth.licenseExpiresAt;
    let daysLeft = null;
    let expiryStr = '';
    if (expiresAt) {
      daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
      expiryStr = daysLeft > 0 ? `bis ${expiresAt.toLocaleDateString('de-AT')} (noch ${daysLeft} Tage)` : 'Abgelaufen';
    }

    let html = '';

    // ===== ACCOUNT INFO (white card) =====
    html += `
      <div style="display:flex;align-items:center;gap:0.85rem;padding:1rem 1.1rem;background:#fff;border-radius:14px;margin-bottom:1.25rem;box-shadow:0 2px 8px rgba(26,26,46,0.06)">
        <div style="width:46px;height:46px;border-radius:50%;background:${isFree ? '#e8e2d8' : 'linear-gradient(135deg,#f5c542,#d4a017)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;color:${isFree ? '#5c5c6e' : '#1a1a2e'};flex-shrink:0">${(username[0] || '?').toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.95rem;color:#1a1a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${username || email.split('@')[0]}</div>
          <div style="font-size:0.78rem;color:#9e9eae;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${email}</div>
        </div>
        <span style="padding:0.25rem 0.7rem;border-radius:20px;font-size:0.72rem;font-weight:700;letter-spacing:0.02em;${isFree ? 'background:#e8e2d8;color:#5c5c6e' : 'background:#f5c542;color:#1a1a2e'}">${isFree ? 'FREE' : 'VOLLZUGANG'}</span>
      </div>
    `;

    // ===== PLAN CARDS =====
    html += `
      <div style="margin-bottom:1.25rem">
        <div style="font-size:1.1rem;font-weight:800;color:#1a1a2e;margin-bottom:0.85rem">Dein Plan</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:1rem">
          <!-- FREE -->
          <div style="border-radius:14px;padding:1.1rem 0.9rem;border:2px solid ${isFree ? '#1a1a2e' : '#e8e2d8'};background:#fff;position:relative;text-align:center;${isFree ? 'box-shadow:0 2px 12px rgba(26,26,46,0.08)' : 'opacity:0.5'}">
            ${isFree ? '<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:#fff;font-size:0.58rem;font-weight:800;padding:0.15rem 0.6rem;border-radius:8px;letter-spacing:0.04em">AKTUELL</div>' : ''}
            <div style="font-size:0.82rem;font-weight:700;color:#5c5c6e;margin-bottom:0.4rem">Free</div>
            <div style="font-size:1.7rem;font-weight:800;color:#1a1a2e;line-height:1">€0</div>
            <div style="font-size:0.68rem;color:#9e9eae;margin-top:0.3rem">Kostenlos</div>
          </div>
          <!-- VOLLZUGANG -->
          <div onclick="${isFree ? 'App.startStripeCheckout()' : ''}" style="border-radius:14px;padding:1.1rem 0.9rem;border:2px solid #f5c542;background:linear-gradient(135deg,#fdf3d7,#fef9e7);position:relative;text-align:center;${isFree ? 'cursor:pointer;box-shadow:0 4px 16px rgba(245,197,66,0.2);' : 'box-shadow:0 2px 12px rgba(26,26,46,0.08);'}transition:transform 0.15s" ${isFree ? 'onmousedown="this.style.transform=\'scale(0.97)\'" onmouseup="this.style.transform=\'scale(1)\'" onmouseleave="this.style.transform=\'scale(1)\'"' : ''}>
            ${isPaid ? '<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#f5c542;color:#1a1a2e;font-size:0.58rem;font-weight:800;padding:0.15rem 0.6rem;border-radius:8px;letter-spacing:0.04em">AKTUELL</div>' : '<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#f5c542;color:#1a1a2e;font-size:0.58rem;font-weight:800;padding:0.15rem 0.6rem;border-radius:8px;letter-spacing:0.04em">EMPFOHLEN</div>'}
            <div style="font-size:0.82rem;font-weight:700;color:#b8860b;margin-bottom:0.4rem">Vollzugang</div>
            <div style="font-size:1.7rem;font-weight:800;color:#1a1a2e;line-height:1">€17</div>
            <div style="font-size:0.68rem;color:#9e9eae;margin-top:0.3rem">Einmalig · bis MedAT 2026</div>
            ${isFree ? '<div style="margin-top:0.65rem;background:#1a1a2e;color:#f5c542;font-size:0.75rem;font-weight:700;padding:0.4rem 1rem;border-radius:8px;display:inline-block">Jetzt freischalten</div>' : ''}
          </div>
        </div>
      </div>
    `;

    // ===== FEATURE COMPARISON TABLE =====
    const chk = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    const dash = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4d0c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

    const feats = [
      { label: 'Alle Testbereiche (BMS, TV, KFF, SEK)', free: chk, paid: chk },
      { label: 'Fragen pro Untertest', free: '<span style="font-weight:700;color:#9e9eae">20%</span>', paid: '<span style="font-weight:800;color:#16a34a">100%</span>' },
      { label: 'PDF-Simulationen', free: '<span style="font-weight:700;color:#9e9eae">2</span>', paid: '<span style="font-weight:800;color:#16a34a">10+</span>' },
      { label: 'Schwächen-Trainer', free: chk, paid: chk },
      { label: 'Tägliche Challenge', free: chk, paid: chk },
      { label: 'Erklärungen & Statistiken', free: chk, paid: chk },
      { label: 'Neue Inhalte & Updates', free: dash, paid: chk, paidOnly: true },
      { label: 'Feedback & Wünsche', free: dash, paid: chk, paidOnly: true },
      { label: 'Priorität bei Features', free: dash, paid: chk, paidOnly: true },
    ];

    html += `
      <div style="margin-bottom:1.25rem">
        <div style="font-size:0.95rem;font-weight:700;color:#1a1a2e;margin-bottom:0.65rem">Was ist enthalten?</div>
        <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(26,26,46,0.06)">
          <div style="display:grid;grid-template-columns:1fr 56px 56px;padding:0.55rem 0.75rem;background:#1a1a2e;color:#a0a0b8;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">
            <span>Feature</span><span style="text-align:center;color:#a0a0b8">Free</span><span style="text-align:center;color:#f5c542">Voll</span>
          </div>
          ${feats.map((f, i) => `
            <div style="display:grid;grid-template-columns:1fr 56px 56px;padding:0.7rem 0.75rem;align-items:center;${i % 2 === 0 ? 'background:#fff' : 'background:#faf6ee'};${f.paidOnly ? 'border-left:3px solid #f5c542' : ''}">
              <span style="font-size:0.88rem;color:${f.paidOnly ? '#b8860b' : '#1a1a2e'};font-weight:${f.paidOnly ? '600' : '500'};line-height:1.3">${f.label}</span>
              <span style="text-align:center;display:flex;align-items:center;justify-content:center">${f.free}</span>
              <span style="text-align:center;display:flex;align-items:center;justify-content:center">${f.paid}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // ===== DYNAMIC NOTE (paid) =====
    if (isPaid) {
      html += `
        <div style="background:#fdf3d7;border:2px solid #f5c542;border-radius:14px;padding:1rem 1.1rem;margin-bottom:1.25rem;font-size:0.85rem">
          <div style="font-weight:700;margin-bottom:0.3rem;color:#b8860b">Vollzugang aktiv</div>
          <div style="color:#5c5c6e;line-height:1.5">
            ${expiryStr ? `Gültig ${expiryStr}.` : 'Unbegrenzt gültig.'} Dein Fragenpool und die Simulationen werden laufend erweitert — neue Inhalte sind automatisch freigeschaltet.
          </div>
        </div>
      `;
    }

    // ===== UPGRADE CTA (free) =====
    if (isFree) {
      html += `
        <div style="margin-bottom:1.25rem">
          <button class="btn-primary" id="konto-buy-btn" onclick="App.startStripeCheckout()" style="display:block;width:100%;text-align:center;padding:0.95rem;font-size:1.05rem;font-weight:700;border:none;border-radius:12px;background:#1a1a2e;color:#f5c542;cursor:pointer;box-shadow:0 4px 16px rgba(26,26,46,0.15);transition:transform 0.15s" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
            Jetzt Vollzugang freischalten →
          </button>
          <div style="text-align:center;font-size:0.7rem;color:#9e9eae;margin-top:0.45rem">Einmalzahlung €17 · Kein Abo · Gültig bis nach dem MedAT am 04.07.2026</div>
        </div>
      `;
    } else if (daysLeft !== null && daysLeft <= 14 && daysLeft > 0) {
      html += `
        <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:14px;padding:1rem;margin-bottom:1.25rem">
          <div style="font-weight:700;color:#dc2626;margin-bottom:0.3rem">Zugang läuft bald ab</div>
          <div style="font-size:0.85rem;color:#5c5c6e">Dein Zugang endet in ${daysLeft} Tagen. Kontaktiere uns für eine Verlängerung.</div>
        </div>
      `;
    }

    // ===== LICENSE CODE (free) =====
    if (isFree) {
      html += `
        <div style="background:#fff;border:2px solid #e8e2d8;border-radius:14px;padding:1.1rem;margin-bottom:1.25rem;box-shadow:0 2px 8px rgba(26,26,46,0.04)">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.65rem">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b8860b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span style="font-size:0.95rem;font-weight:700;color:#1a1a2e">Lizenzcode einlösen</span>
          </div>
          <div style="font-size:0.82rem;color:#5c5c6e;margin-bottom:0.7rem;line-height:1.4">Du hast einen Aktivierungscode erhalten? Gib ihn hier ein, um deinen Vollzugang sofort freizuschalten.</div>
          <div style="display:flex;gap:0.5rem">
            <input type="text" id="konto-license-input" placeholder="MEDAT-XXXX-XXXX-XXXX" style="flex:1;padding:0.7rem 0.8rem;border-radius:10px;border:2px solid #e8e2d8;background:#faf6ee;color:#1a1a2e;font-family:monospace;font-size:0.9rem;letter-spacing:0.03em">
            <button id="konto-activate-btn" style="white-space:nowrap;padding:0.7rem 1.1rem;font-size:0.88rem;font-weight:700;border-radius:10px;background:#1a1a2e;color:#f5c542;border:none;cursor:pointer">Einlösen</button>
          </div>
          <div id="konto-activate-status" style="font-size:0.82rem;margin-top:0.5rem"></div>
        </div>
      `;
    }

    // ===== FEEDBACK & WÜNSCHE =====
    html += `
      <div style="background:#fff;border:2px solid #e8e2d8;border-radius:14px;padding:1.1rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(26,26,46,0.04)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8860b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span style="font-weight:700;font-size:0.92rem;color:#1a1a2e">Feedback & Wünsche</span>
        </div>
        <div style="font-size:0.82rem;color:#5c5c6e;line-height:1.5;margin-bottom:0.7rem">
          Du wünschst dir mehr Fragen zu einem bestimmten Thema? Dir fehlt eine Übung oder du hast Verbesserungsvorschläge? Schreib uns — wir bauen den Trainer laufend aus!
        </div>
        <a href="mailto:office@ai-guide.at?subject=MedAT%20Trainer%20Feedback" style="display:inline-flex;align-items:center;gap:0.4rem;background:#1a1a2e;color:#f5c542;font-weight:600;font-size:0.82rem;padding:0.5rem 1rem;border-radius:8px;text-decoration:none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Feedback senden
        </a>
      </div>
    `;

    // ===== FREUNDE EINLADEN =====
    html += `
      <div onclick="App.shareApp()" style="background:#fff;border:2px solid #e8e2d8;border-radius:14px;padding:1rem 1.1rem;margin-bottom:1rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(26,26,46,0.04)">
        <div style="display:flex;align-items:center;gap:0.6rem">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5c5c6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <div>
            <div style="font-weight:700;font-size:0.9rem;color:#1a1a2e">Freunde einladen</div>
            <div style="font-size:0.78rem;color:#9e9eae">Teile den MedAT Trainer mit deiner Lerngruppe</div>
          </div>
        </div>
        <span style="color:#9e9eae;font-size:1.2rem;font-weight:600">›</span>
      </div>
    `;

    // ===== RECHTLICHES =====
    html += `
      <div style="display:flex;justify-content:center;gap:1.5rem;padding:0.75rem 0 1.5rem">
        <a href="#" onclick="document.getElementById('modal-agb').style.display='';return false" style="font-size:0.75rem;color:#9e9eae;text-decoration:underline">AGB</a>
        <a href="#" onclick="document.getElementById('modal-datenschutz').style.display='';return false" style="font-size:0.75rem;color:#9e9eae;text-decoration:underline">Datenschutz</a>
        <a href="https://ai-guide.at/impressum" target="_blank" style="font-size:0.75rem;color:#9e9eae;text-decoration:underline">Impressum</a>
      </div>
    `;

    container.innerHTML = html;

    // Bind activate button
    document.getElementById('konto-activate-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('konto-license-input');
      const status = document.getElementById('konto-activate-status');
      if (!input?.value.trim()) { status.textContent = 'Bitte Code eingeben.'; status.style.color = '#ef4444'; return; }
      try {
        status.textContent = 'Wird aktiviert...'; status.style.color = '#b8860b';
        const tier = await Auth.activateLicense(input.value.trim(), Auth.currentUser?.email);
        status.textContent = 'Erfolgreich! Dein Plan: Vollzugang bis 04.07.2026';
        status.style.color = '#16a34a';
        setTimeout(() => this.renderKonto(), 1500);
      } catch (e) {
        status.textContent = e.message; status.style.color = '#ef4444';
      }
    });
  },

  // ===== MEINE SIMULATIONEN LIST =====
  async _loadSimulationsList() {
    const container = document.getElementById('konto-simulations-list');
    if (!container) return;

    try {
      const { data: sims, error } = await Auth.supabase
        .from('user_simulations')
        .select('id, title, created_at, status, total_questions, results')
        .eq('user_id', Auth.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!sims || sims.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.85rem;background:var(--bg-secondary);border-radius:12px">
            <div style="font-size:1.5rem;margin-bottom:0.4rem">📄</div>
            Noch keine Simulationen erstellt.<br>
            <span style="font-size:0.8rem;opacity:0.7">Erstelle eine PDF-Simulation unter „PDF-Übungen", um sie hier zu sehen.</span>
          </div>`;
        return;
      }

      let html = '';
      for (const sim of sims) {
        const date = new Date(sim.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

        html += `<div style="background:var(--bg-secondary);border-radius:12px;padding:0.85rem 1rem;margin-bottom:0.5rem;border-left:3px solid var(--border)">
          <div style="font-weight:600;font-size:0.9rem">${sim.title}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.15rem">${date} · ${sim.total_questions} Fragen</div>
        </div>`;
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('Simulationen laden:', err);
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem">Fehler beim Laden.</div>';
    }
  },

  // ===== OPEN SIMULATION EVALUATION =====
  async openSimEval(simId) {
    this._currentSimId = simId;
    this.showScreen('screen-sim-eval');

    const container = document.getElementById('sim-eval-container');
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div class="spinner"></div>Wird geladen...</div>';

    try {
      const { data: sim, error } = await Auth.supabase
        .from('user_simulations')
        .select('*')
        .eq('id', simId)
        .single();

      if (error) throw error;
      this._currentSim = sim;

      if (sim.status === 'evaluated' && sim.results) {
        this._renderSimResults(sim);
      } else {
        this._renderSimAnswerEntry(sim);
      }
    } catch (err) {
      console.error('Simulation laden:', err);
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Fehler beim Laden der Simulation.</div>';
    }
  },

  // ===== DIGITAL ANSWER ENTRY =====
  _renderSimAnswerEntry(sim) {
    const container = document.getElementById('sim-eval-container');
    const answerKey = sim.answer_key || [];
    const blocks = sim.block_structure || [];

    let html = `
      <div style="padding:1rem">
        <div style="font-size:1.1rem;font-weight:700;margin-bottom:0.3rem">${sim.title}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">${sim.total_questions} Fragen · Trage deine Antworten ein</div>

        <!-- Antwortbogen Anleitung -->
        <div style="background:linear-gradient(135deg,var(--bg-secondary),var(--bg-tertiary));border-radius:12px;padding:1rem;margin-bottom:1rem;border:1px solid var(--border)">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.5rem">So f\u00fcllst du den Antwortbogen aus:</div>
          <div style="font-size:0.8rem;color:var(--text-muted);line-height:1.5">
            <div style="margin-bottom:0.35rem"><strong>1.</strong> Drucke die PDF-Simulation komplett aus (inkl. Antwortbogen am Ende).</div>
            <div style="margin-bottom:0.35rem"><strong>2.</strong> Bearbeite die Aufgaben auf Papier unter Zeitdruck — wie beim echten MedAT.</div>
            <div style="margin-bottom:0.35rem"><strong>3.</strong> Kreuze deine Antworten auf dem Antwortbogen an: <strong>ein Kreuz pro Frage</strong>, sauber innerhalb des K\u00e4stchens.</div>
            <div style="margin-bottom:0.35rem"><strong>4.</strong> Bei Zahlenfolgen: trage die fehlende Zahl direkt in das Feld ein.</div>
            <div><strong>5.</strong> Gib deine Antworten unten digital ein und klicke auf <em>Auswertung berechnen</em>.</div>
          </div>
        </div>

        <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.6rem;margin-top:0.5rem">Antworten eingeben:</div>
    `;

    // Group answers by block
    let currentBlock = null;
    for (const block of blocks) {
      if (block.isMemorize) continue;
      const label = `${block.blockLabel} · ${block.label}`;

      html += `<div style="margin-bottom:0.8rem">
        <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.4rem">
          <div style="width:3px;height:16px;border-radius:2px;background:${block.blockColor}"></div>
          <div style="font-size:0.85rem;font-weight:700">${label}</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">`;

      const isZahlenfolge = block.dbType === 'zahlenfolge';
      const isRanking = block.isRanking;

      for (let i = 0; i < block.count; i++) {
        const qNum = block.startNum + i;

        if (isZahlenfolge) {
          html += `<div style="display:flex;align-items:center;gap:3px;margin-right:8px;margin-bottom:4px">
            <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);width:22px">${qNum}.</span>
            <input type="text" data-q="${qNum}" data-type="number" placeholder="?" style="width:50px;padding:3px 5px;border-radius:4px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);font-size:0.8rem;text-align:center">
          </div>`;
        } else if (isRanking) {
          html += `<div style="display:flex;align-items:center;gap:2px;margin-right:8px;margin-bottom:4px">
            <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);width:22px">${qNum}.</span>`;
          for (let r = 0; r < 5; r++) {
            html += `<div style="display:flex;flex-direction:column;align-items:center">
              <span style="font-size:0.55rem;color:var(--text-muted)">${String.fromCharCode(65+r)}</span>
              <input type="text" data-q="${qNum}" data-rank="${r}" data-type="rank" maxlength="1" style="width:18px;padding:2px;border-radius:3px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);font-size:0.7rem;text-align:center">
            </div>`;
          }
          html += `</div>`;
        } else {
          // Standard MC: show A-E buttons
          const optCount = (block.dbType === 'wortfluessigkeit' || block.dbType === 'wortflüssigkeit' || block.dbType?.startsWith('sek_')) ? 5 : 5;
          html += `<div style="display:flex;align-items:center;gap:2px;margin-right:6px;margin-bottom:4px">
            <span style="font-size:0.7rem;font-weight:700;color:var(--text-muted);min-width:22px">${qNum}.</span>`;
          for (let o = 0; o < optCount; o++) {
            const letter = String.fromCharCode(65 + o);
            html += `<button class="sim-ans-btn" data-q="${qNum}" data-ans="${letter}"
              style="width:24px;height:24px;border-radius:50%;border:1.5px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);font-size:0.65rem;font-weight:600;cursor:pointer;padding:0;line-height:24px;text-align:center"
              onclick="App._selectSimAnswer(this, ${qNum}, '${letter}')">${letter}</button>`;
          }
          html += `</div>`;
        }
      }
      html += `</div></div>`;
    }

    html += `
        <button id="sim-eval-submit-btn" onclick="App._submitSimEval()" style="display:block;width:100%;margin-top:1.5rem;padding:0.9rem;background:var(--primary);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer">
          📊 Auswertung berechnen
        </button>
        <div id="sim-eval-status" style="text-align:center;font-size:0.85rem;margin-top:0.5rem"></div>
      </div>`;

    container.innerHTML = html;

    // Initialize answer storage
    this._simUserAnswers = {};

    // Bind photo upload
    document.getElementById('sim-photo-upload')?.addEventListener('change', (e) => this._handleSimPhotoUpload(e));
  },

  _selectSimAnswer(btn, qNum, letter) {
    // Deselect others for this question
    document.querySelectorAll(`.sim-ans-btn[data-q="${qNum}"]`).forEach(b => {
      b.style.background = 'var(--bg-secondary)';
      b.style.color = 'var(--text-muted)';
      b.style.borderColor = 'var(--border)';
    });
    // Select this one
    btn.style.background = 'var(--primary)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--primary)';
    this._simUserAnswers[qNum] = letter;
  },

  // ===== PHOTO UPLOAD & SCAN =====
  async _handleSimPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('sim-photo-status');
    status.textContent = 'Foto wird analysiert...';
    status.style.color = 'var(--yellow)';

    try {
      const img = await this._loadImage(file);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctxC = canvas.getContext('2d');
      ctxC.drawImage(img, 0, 0);

      // Simple scan: detect dark regions in expected grid positions
      // This is a basic implementation — works best with clean, well-lit photos
      const answers = this._scanAnswerGrid(ctxC, canvas.width, canvas.height);

      if (Object.keys(answers).length > 0) {
        // Apply scanned answers to the UI
        let applied = 0;
        for (const [qNum, answer] of Object.entries(answers)) {
          const btn = document.querySelector(`.sim-ans-btn[data-q="${qNum}"][data-ans="${answer}"]`);
          if (btn) {
            this._selectSimAnswer(btn, parseInt(qNum), answer);
            applied++;
          }
        }
        status.textContent = `✅ ${applied} Antworten erkannt! Bitte überprüfe die Eingaben.`;
        status.style.color = '#22c55e';
      } else {
        status.textContent = '⚠️ Konnte keine Antworten erkennen. Bitte manuell eingeben.';
        status.style.color = '#ef4444';
      }
    } catch (err) {
      console.error('Photo scan error:', err);
      status.textContent = '⚠️ Fehler beim Scannen. Bitte manuell eingeben.';
      status.style.color = '#ef4444';
    }
  },

  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  _scanAnswerGrid(ctx, width, height) {
    // Basic grid scanner: the Antwortbogen has a known layout.
    // Each question row has 5 bubbles (A-E) in fixed positions.
    // We scan for the darkest bubble per row.
    // This is a simplified version — works with well-aligned photos.

    const answers = {};
    const sim = this._currentSim;
    if (!sim || !sim.block_structure) return answers;

    // Get image brightness at a region
    const getRegionDarkness = (x, y, r) => {
      const imgData = ctx.getImageData(Math.max(0, x-r), Math.max(0, y-r), r*2, r*2);
      let totalDark = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        const brightness = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
        if (brightness < 128) totalDark++;
      }
      return totalDark / (imgData.data.length / 4);
    };

    // The Antwortbogen layout: we estimate positions based on the grid structure
    // This is approximate — the exact positions depend on the PDF layout
    // For now, we return empty (manual entry preferred) unless we can detect reliable markers
    // Future: add alignment markers to the PDF Antwortbogen for better detection

    return answers; // Return empty for now — photo is experimental, manual entry is primary
  },

  // ===== SUBMIT EVALUATION =====
  async _submitSimEval() {
    const sim = this._currentSim;
    if (!sim) return;

    const btn = document.getElementById('sim-eval-submit-btn');
    const status = document.getElementById('sim-eval-status');

    // Collect all answers
    const userAnswers = { ...this._simUserAnswers };

    // Also collect text inputs (Zahlenfolgen)
    document.querySelectorAll('input[data-type="number"]').forEach(inp => {
      const qNum = parseInt(inp.dataset.q);
      if (inp.value.trim()) userAnswers[qNum] = inp.value.trim();
    });

    // Collect ranking inputs
    const rankGroups = {};
    document.querySelectorAll('input[data-type="rank"]').forEach(inp => {
      const qNum = parseInt(inp.dataset.q);
      const rank = parseInt(inp.dataset.rank);
      if (!rankGroups[qNum]) rankGroups[qNum] = {};
      if (inp.value.trim()) rankGroups[qNum][rank] = inp.value.trim();
    });
    for (const [qNum, ranks] of Object.entries(rankGroups)) {
      const labels = ['A','B','C','D','E'];
      const rankStr = labels.map((l, i) => `${l}=${ranks[i] || '?'}`).join(', ');
      userAnswers[parseInt(qNum)] = rankStr;
    }

    // Count answered
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount === 0) {
      if (status) { status.textContent = 'Bitte trage mindestens eine Antwort ein.'; status.style.color = '#ef4444'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Wird ausgewertet...'; }

    // Compare with answer key
    const answerKey = sim.answer_key || [];
    let totalCorrect = 0;
    const perQuestion = [];
    const blockResults = {};

    // Initialize block results
    for (const block of (sim.block_structure || [])) {
      const key = `${block.blockLabel}_${block.label}`;
      if (!blockResults[key]) {
        blockResults[key] = {
          label: block.label,
          blockLabel: block.blockLabel,
          color: block.blockColor,
          weight: block.blockWeight,
          correct: 0,
          total: 0,
          answered: 0,
        };
      }
    }

    for (const ak of answerKey) {
      const qNum = ak.nr;
      const correctAnswer = ak.answer;
      const userAnswer = userAnswers[qNum] || null;

      // Find which block this question belongs to
      let blockKey = null;
      for (const block of (sim.block_structure || [])) {
        if (qNum >= block.startNum && qNum < block.startNum + block.count) {
          blockKey = `${block.blockLabel}_${block.label}`;
          break;
        }
      }

      let isCorrect = false;
      if (userAnswer) {
        // For MC: simple letter comparison
        if (correctAnswer.length === 1 && userAnswer.length === 1) {
          isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();
        }
        // For Zahlenfolgen: compare numbers
        else if (correctAnswer.includes(',') && !correctAnswer.includes('=')) {
          isCorrect = userAnswer.replace(/\s/g, '') === correctAnswer.replace(/\s/g, '');
        }
        // For EE (A=W, B=U, ...): compare per-option
        else if (correctAnswer.includes('=W') || correctAnswer.includes('=U')) {
          const correctParts = correctAnswer.split(',').map(s => s.trim());
          const userParts = userAnswer.split(',').map(s => s.trim());
          isCorrect = correctParts.every((cp, i) => userParts[i] && cp.trim() === userParts[i].trim());
        }
        // For rankings: compare
        else {
          isCorrect = userAnswer.replace(/\s/g, '').toLowerCase() === correctAnswer.replace(/\s/g, '').toLowerCase();
        }
      }

      if (isCorrect) totalCorrect++;

      perQuestion.push({ qNum, correct: correctAnswer, user: userAnswer, isCorrect });

      if (blockKey && blockResults[blockKey]) {
        blockResults[blockKey].total++;
        if (userAnswer) blockResults[blockKey].answered++;
        if (isCorrect) blockResults[blockKey].correct++;
      }
    }

    const results = {
      totalCorrect,
      totalQuestions: answerKey.length,
      totalAnswered: answeredCount,
      percentage: Math.round((totalCorrect / answerKey.length) * 100),
      perQuestion,
      blockResults,
    };

    // Save to database
    try {
      await Auth.supabase
        .from('user_simulations')
        .update({
          user_answers: userAnswers,
          results: results,
          status: 'evaluated',
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', sim.id);
    } catch (err) {
      console.warn('Ergebnis speichern fehlgeschlagen:', err);
    }

    // Show results
    sim.results = results;
    sim.status = 'evaluated';
    this._currentSim = sim;
    this._renderSimResults(sim);
  },

  // ===== RENDER RESULTS =====
  _renderSimResults(sim) {
    const container = document.getElementById('sim-eval-container');
    const r = sim.results;
    const pct = r.percentage;
    const pctColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f5c542' : '#ef4444';
    const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '💪';
    const msg = pct >= 80 ? 'Ausgezeichnet! Du bist auf einem sehr guten Weg.' :
                pct >= 60 ? 'Gut gemacht! Mit etwas mehr Übung schaffst du es.' :
                'Weiter üben — jede Simulation bringt dich näher ans Ziel!';

    let html = `<div style="padding:1rem">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="font-size:3rem;margin-bottom:0.3rem">${emoji}</div>
        <div style="font-size:2.2rem;font-weight:800;color:${pctColor}">${pct}%</div>
        <div style="font-size:0.9rem;color:var(--text-muted)">${r.totalCorrect} von ${r.totalQuestions} richtig</div>
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.4rem;line-height:1.4">${msg}</div>
      </div>

      <!-- Progress Circle -->
      <div style="display:flex;justify-content:center;margin-bottom:1.5rem">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="var(--bg-secondary)" stroke-width="10"/>
          <circle cx="70" cy="70" r="60" fill="none" stroke="${pctColor}" stroke-width="10"
            stroke-dasharray="${2 * Math.PI * 60}" stroke-dashoffset="${2 * Math.PI * 60 * (1 - pct/100)}"
            stroke-linecap="round" transform="rotate(-90 70 70)" style="transition:stroke-dashoffset 1s ease"/>
        </svg>
      </div>

      <!-- Block Results -->
      <div style="font-size:0.95rem;font-weight:700;margin-bottom:0.6rem">Ergebnis pro Bereich</div>`;

    // Aggregate blocks by blockLabel for weighted scoring
    const blockAgg = {};
    for (const [key, br] of Object.entries(r.blockResults)) {
      const bLabel = br.blockLabel || 'Sonstig';
      if (!blockAgg[bLabel]) {
        blockAgg[bLabel] = { label: bLabel, color: br.color, weight: br.weight, correct: 0, total: 0 };
      }
      blockAgg[bLabel].correct += br.correct;
      blockAgg[bLabel].total += br.total;
    }

    for (const [bLabel, agg] of Object.entries(blockAgg)) {
      const bPct = agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : 0;
      const bColor = bPct >= 80 ? '#22c55e' : bPct >= 60 ? '#f5c542' : '#ef4444';
      html += `<div style="background:var(--bg-secondary);border-radius:10px;padding:0.75rem;margin-bottom:0.5rem;border-left:3px solid ${agg.color}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:600;font-size:0.85rem">${bLabel}</div>
          <div style="font-weight:700;color:${bColor}">${bPct}%</div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${agg.correct}/${agg.total} richtig${agg.weight ? ` · Gewichtung: ${agg.weight}%` : ''}</div>
        <div style="background:var(--bg-tertiary);border-radius:4px;height:6px;margin-top:0.4rem;overflow:hidden">
          <div style="background:${bColor};height:100%;width:${bPct}%;border-radius:4px;transition:width 0.8s ease"></div>
        </div>
      </div>`;
    }

    // Detail per section
    html += `<div style="font-size:0.9rem;font-weight:700;margin:1rem 0 0.5rem">Details pro Untertest</div>`;
    for (const [key, br] of Object.entries(r.blockResults)) {
      const sPct = br.total > 0 ? Math.round((br.correct / br.total) * 100) : 0;
      const sColor = sPct >= 80 ? '#22c55e' : sPct >= 60 ? '#f5c542' : '#ef4444';
      html += `<div style="display:flex;justify-content:space-between;padding:0.4rem 0.6rem;font-size:0.8rem;border-bottom:1px solid var(--border)">
        <span>${br.blockLabel} · ${br.label}</span>
        <span style="font-weight:600;color:${sColor}">${br.correct}/${br.total} (${sPct}%)</span>
      </div>`;
    }

    // Buttons
    html += `
      <div style="display:flex;gap:0.5rem;margin-top:1.5rem">
        <button onclick="App._renderSimAnswerEntry(App._currentSim)" style="flex:1;padding:0.7rem;background:var(--bg-secondary);color:var(--text);border:1px solid var(--border);border-radius:10px;font-size:0.85rem;font-weight:600;cursor:pointer">✏️ Nochmal auswerten</button>
        <button onclick="App.showScreen('screen-konto')" style="flex:1;padding:0.7rem;background:var(--primary);color:#fff;border:none;border-radius:10px;font-size:0.85rem;font-weight:700;cursor:pointer">← Zurück</button>
      </div>
    </div>`;

    container.innerHTML = html;
  },

  // ===== STRIPE CHECKOUT =====
  async startStripeCheckout() {
    // Re-check session in case Auth state is stale
    if (!Auth.isLoggedIn && Auth.supabase) {
      try {
        const { data } = await Auth.supabase.auth.getSession();
        if (data?.session?.user) {
          Auth.currentUser = data.session.user;
        }
      } catch (e) { /* ignore */ }
    }

    if (!Auth.isLoggedIn) {
      this.showToast('Bitte melde dich zuerst an, um den Vollzugang zu kaufen.');
      this.showScreen('screen-auth');
      return;
    }

    const btn = document.getElementById('konto-buy-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Weiterleitung zu Stripe...'; }

    try {
      const userId = Auth.currentUser?.id;
      if (!userId) throw new Error('Nicht eingeloggt');

      // Redirect to Stripe Payment Link with client_reference_id for webhook identification
      const stripeUrl = new URL('https://buy.stripe.com/eVqbJ10Qs7vjalG3si2B200');
      stripeUrl.searchParams.set('client_reference_id', userId);
      stripeUrl.searchParams.set('prefilled_email', Auth.currentUser?.email || '');
      window.location.href = stripeUrl.toString();

    } catch (err) {
      console.error('Stripe checkout error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Jetzt für €17 freischalten →'; }
      this.showToast('Fehler: ' + err.message);
    }
  },

  // Handle payment success redirect. If checkOnly=true, just returns whether a payment param exists.
  _checkPaymentReturn(checkOnly) {
    const params = new URLSearchParams(window.location.search);
    const hasPayment = params.has('payment');
    if (checkOnly) return hasPayment;

    if (params.get('payment') === 'success') {
      this.showToast('Zahlung erfolgreich! Dein Vollzugang wird aktiviert...');
      window.history.replaceState({}, '', window.location.pathname);
      // Poll for license activation (webhook may take a few seconds)
      this._pollForLicenseActivation(0);
    } else if (params.get('payment') === 'cancelled') {
      this.showToast('Zahlung abgebrochen.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  },

  // Poll profile until license_tier changes from 'free' (max 30 seconds)
  async _pollForLicenseActivation(attempt) {
    if (!Auth.isLoggedIn || attempt > 10) {
      if (attempt > 10) {
        this.showToast('Lizenz wird verarbeitet. Bitte lade die Seite in ein paar Sekunden neu.');
      }
      return;
    }
    await Auth.loadProfile();
    if (Auth.licenseTier !== 'free') {
      this.showToast('Vollzugang aktiviert! Alle Fragen sind jetzt freigeschaltet. 🎉');
      this.renderKonto();
      this._updateUpgradeIcon();
      return;
    }
    setTimeout(() => this._pollForLicenseActivation(attempt + 1), 3000);
  },

  // ===== FREE TIER CONTENT LIMIT (20% per Untertest) =====
  _isAdmin() {
    return typeof Admin !== 'undefined' && Admin.isAdmin();
  },

  isFreeUser() {
    if (this._isAdmin()) return false;
    return Auth.licenseTier === 'free';
  },

  // Limit question count for free users: 20% of the requested amount
  // --- 100-Fragen-Limit ---
  _limitCache: null,

  async getFreeQuestionLimit(requestedCount) {
    if (!this.isFreeUser()) return requestedCount;
    if (!this._limitCache) this._limitCache = { lastFetch: 0, data: null };
    const now = Date.now();
    if (this._limitCache.data && (now - this._limitCache.lastFetch) < 60000) {
      const remaining = this._limitCache.data.limit - this._limitCache.data.totalAnswered;
      return Math.min(requestedCount, Math.max(0, remaining));
    }
    try {
      const uid = Auth.currentUser.id;
      const [creditsRes, profileRes] = await Promise.all([
        Auth.supabase.from('user_credits').select('questions_limit').eq('user_id', uid).maybeSingle(),
        Auth.supabase.from('user_profiles').select('total_questions_answered').eq('user_id', uid).maybeSingle()
      ]);
      const limit = creditsRes.data?.questions_limit ?? 100;
      const totalAnswered = profileRes.data?.total_questions_answered ?? 0;
      this._limitCache = { lastFetch: now, data: { limit, totalAnswered } };
      return Math.min(requestedCount, Math.max(0, limit - totalAnswered));
    } catch (e) { console.error('Limit-Fehler:', e); return requestedCount; }
  },

  async checkQuestionAccess() {
    if (!this.isFreeUser()) return { allowed: true, remaining: 999999, limit: 999999, totalAnswered: 0 };
    try {
      const uid = Auth.currentUser.id;
      const [cr, pr] = await Promise.all([
        Auth.supabase.from('user_credits').select('questions_limit').eq('user_id', uid).maybeSingle(),
        Auth.supabase.from('user_profiles').select('total_questions_answered').eq('user_id', uid).maybeSingle()
      ]);
      const limit = cr.data?.questions_limit ?? 100;
      const totalAnswered = pr.data?.total_questions_answered ?? 0;
      const remaining = Math.max(0, limit - totalAnswered);
      return { allowed: remaining > 0, remaining, limit, totalAnswered };
    } catch (e) { console.error('Access-Check-Fehler:', e); return { allowed: true, remaining: 100, limit: 100, totalAnswered: 0 }; }
  },

  async updateDashboardLimitDisplay() {
    const card = document.getElementById('question-limit-card');
    if (!card) return;
    if (!this.isFreeUser()) {
      card.innerHTML = '<div style="display:flex;align-items:center;gap:0.5rem;padding:0.8rem 1rem;background:#e8f5e9;border-radius:12px;font-size:0.85rem;color:#2e7d32;font-weight:600"><span>✓</span> Unbegrenzter Zugang</div>';
      return;
    }
    try {
      const a = await this.checkQuestionAccess();
      const pct = Math.round((a.totalAnswered / a.limit) * 100);
      const clr = a.remaining <= 10 ? '#e53935' : a.remaining <= 25 ? '#ff9800' : 'var(--primary, #667eea)';
      card.innerHTML = `<div style="background:var(--surface,#fff);border:2px solid var(--border,#e8e8ef);border-radius:var(--radius-sm,14px);padding:1rem 1.1rem;box-shadow:0 2px 8px rgba(26,26,46,0.05)"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem"><span style="font-size:0.88rem;font-weight:700;color:var(--dark,#1a1a2e)">📊 Noch ${a.remaining} von ${a.limit} Fragen</span><button onclick="App.showUpgradeOverlay('dashboard')" style="background:var(--dark,#1a1a2e);color:var(--yellow,#f5c542);border:none;border-radius:8px;padding:0.35rem 0.75rem;font-size:0.75rem;font-weight:700;cursor:pointer">Upgrade</button></div><div style="background:var(--bg-warm,#f0f0f5);border-radius:6px;height:8px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--yellow,#f5c542),var(--yellow-deep,#d4a017));border-radius:6px;transition:width 0.5s ease"></div></div><div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text-muted,#9e9eae);margin-top:0.35rem"><span>${a.totalAnswered} beantwortet</span><span>${a.remaining} verfügbar</span></div></div>`;
    } catch (e) { console.error('Dashboard-Limit-Fehler:', e); }
  },

  showUpgradeOverlay(reason) {
    let ov = document.getElementById('upgrade-overlay');
    if (ov) ov.remove();
    const t = reason === 'limit_reached' ? '🔒 Deine kostenlosen Fragen sind aufgebraucht!' : '🚀 Mehr Fragen freischalten';
    const s = reason === 'limit_reached' ? 'Du hast alle 100 kostenlosen Fragen beantwortet. Schalte jetzt unbegrenzten Zugang frei!' : 'Upgrade auf unbegrenzten Zugang und trainiere ohne Limit.';
    ov = document.createElement('div');
    ov.id = 'upgrade-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
    ov.innerHTML = `<div style="background:var(--surface,#fff);border-radius:var(--radius,20px);max-width:400px;width:100%;padding:2rem;text-align:center;position:relative"><button onclick="document.getElementById('upgrade-overlay').remove()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted)">✕</button><h2 style="font-size:1.3rem;margin:0 0 0.5rem;color:var(--dark)">${t}</h2><p style="color:var(--text-muted);font-size:0.9rem;margin:0 0 1.5rem">${s}</p><div style="display:flex;flex-direction:column;gap:0.65rem"><div onclick="App.startStripeCheckout('basic')" style="border:2px solid var(--border);border-radius:var(--radius-sm,14px);padding:1rem;cursor:pointer;text-align:left;transition:all 0.2s"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:800;color:var(--dark)">Basic</div><div style="font-size:0.8rem;color:var(--text-muted)">Alle Fragen + Statistiken</div></div><div style="font-size:1.2rem;font-weight:800;color:var(--dark)">€19,90</div></div></div><div onclick="App.startStripeCheckout('premium')" style="border:2px solid var(--yellow);border-radius:var(--radius-sm,14px);padding:1rem;cursor:pointer;background:var(--yellow-soft);position:relative;text-align:left"><div style="position:absolute;top:-8px;right:12px;background:linear-gradient(90deg,var(--yellow),var(--yellow-deep));color:var(--dark);font-size:0.65rem;font-weight:800;padding:2px 10px;border-radius:10px">BELIEBT</div><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:800;color:var(--dark)">Premium</div><div style="font-size:0.8rem;color:var(--text-muted)">Alles + KI-Tutoren + PDF-Simulationen</div></div><div style="font-size:1.2rem;font-weight:800;color:var(--dark)">€29,90</div></div></div></div><p style="font-size:0.72rem;color:var(--text-muted);margin:1rem 0 0">Einmalzahlung · Kein Abo · Kein Kleingedrucktes</p></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  },

  // ===== SHARE / FREUNDE EINLADEN =====
  async shareApp() {
    const shareData = {
      title: 'MedAT Trainer – Dein Weg zum Medizinstudium',
      text: 'Ich bereite mich mit dem MedAT Trainer auf den Medizinaufnahmetest vor. Über 1000 Fragen, Simulationen und mehr – schau mal rein!',
      url: 'https://medat-trainer.vercel.app',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareData.url);
        this.showToast('Link kopiert! Du kannst ihn jetzt teilen.');
      }
    } catch (e) {
      // User cancelled sharing or error
      if (e.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareData.url);
          this.showToast('Link kopiert!');
        } catch { /* ignore */ }
      }
    }
  },

  // ===== UPGRADE ICON (for free users) =====
  _updateUpgradeIcon() {
    const btn = document.getElementById('upgrade-float-btn');
    if (!btn) return;
    btn.style.display = this.isFreeUser() ? 'flex' : 'none';
  },

  // ===== SIMULATIONS-LIMIT CHECK (2 free simulations) =====
  _simulationCount: null,

  async getSimulationCount() {
    if (!Auth.isLoggedIn) return 0;
    if (this._simulationCount !== null) return this._simulationCount;
    try {
      const { count, error } = await Auth.supabase
        .from('user_simulations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', Auth.currentUser.id);
      this._simulationCount = error ? 0 : (count || 0);
    } catch { this._simulationCount = 0; }
    return this._simulationCount;
  },

  // Reset cache when a new simulation is created
  _incrementSimulationCount() {
    if (this._simulationCount !== null) this._simulationCount++;
  },

  MAX_SIMULATIONS_FREE: 3,

  async checkSimulationLimit() {
    if (!this.isFreeUser()) return true; // paid users: unlimited
    const count = await this.getSimulationCount();
    return count < this.MAX_SIMULATIONS_FREE;
  },

  showSimulationLimitPaywall(container) {
    if (!container) return;
    const count = this._simulationCount || 0;
    container.innerHTML = `
      <div class="sim-limit-overlay">
        <div class="sim-limit-icon">🔒</div>
        <div class="sim-limit-title">Kostenloses Kontingent aufgebraucht</div>
        <div class="sim-limit-desc">
          Du hast bereits ${count} von ${this.MAX_SIMULATIONS_FREE} kostenlosen Simulationen erstellt.
          Schalte den Vollzugang frei, um unbegrenzt Simulationen zu generieren
          und auf 100% aller Fragen zuzugreifen.
        </div>
        <button class="sim-limit-btn" onclick="App.showScreen('screen-konto');App.renderKonto();">
          Jetzt für €17 freischalten →
        </button>
      </div>
    `;
  },

  // ===== PROFIL SCREEN LADEN =====
  loadProfileScreen() {
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const countdownEl = document.getElementById('profile-countdown');

    if (Auth.isLoggedIn) {
      nameEl.textContent = Auth.displayName;
      emailEl.textContent = Auth.currentUser?.email || '';

      // Formfelder befüllen
      const profile = Auth.userProfile;
      if (profile) {
        document.getElementById('profile-display-name').value = profile.display_name || '';
        document.getElementById('profile-medat-date').value = profile.medat_date || '';
        document.getElementById('profile-target-score').value = profile.target_score || '';
        document.getElementById('profile-study-hours').value = profile.study_hours_per_day || 2;
      }

      // MedAT-Countdown
      const countdown = Auth.getMedATCountdown();
      if (countdown) {
        countdownEl.classList.remove('hidden');
        document.getElementById('countdown-days').textContent = countdown.days;
        document.getElementById('countdown-label').textContent = countdown.label;
      } else {
        countdownEl.classList.add('hidden');
      }

      // User Stats
      Auth.getUserStats().then(stats => {
        if (!stats) return;
        document.getElementById('profile-total').textContent = stats.total;
        document.getElementById('profile-correct').textContent = stats.total > 0 ? stats.percentage + '%' : '–';
        document.getElementById('profile-streak').textContent = stats.streak;

        const createdAt = Auth.userProfile?.created_at;
        if (createdAt) {
          const date = new Date(createdAt);
          document.getElementById('profile-member-since').textContent =
            date.toLocaleDateString('de-AT', { month: 'short', year: 'numeric' });
        }
      });
    } else {
      nameEl.textContent = 'Gast';
      emailEl.textContent = 'Nicht angemeldet';
      countdownEl.classList.add('hidden');
    }
  },

  // ===== STATS SCREEN LADEN =====
  async loadStatsScreen() {
    try {
      await Stats.render();
    } catch (e) {
      console.warn('Stats Screen Fehler:', e);
    }
  },

  // ===== TOAST NOTIFICATION =====
  showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  },

  // ===== EMAIL CONFIRMATION SCREEN =====
  _showEmailConfirmation(email) {
    const authContainer = document.querySelector('#screen-auth .auth-container') || document.getElementById('screen-auth');
    if (!authContainer) return;
    authContainer.innerHTML = `
      <div style="text-align:center;padding:2rem 1.25rem;max-width:420px;margin:0 auto">
        <div style="font-size:3rem;margin-bottom:1rem">📬</div>
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:0.5rem;color:var(--text)">Fast geschafft!</h2>
        <p style="font-size:0.95rem;color:var(--text-muted);line-height:1.6;margin-bottom:1.5rem">
          Wir haben dir eine Bestätigungsmail an<br>
          <strong style="color:var(--yellow)">${email}</strong><br>
          gesendet.
        </p>
        <div style="background:rgba(245,197,66,0.1);border:1px solid rgba(245,197,66,0.3);border-radius:14px;padding:1.25rem;margin-bottom:1.5rem;text-align:left">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">So geht's weiter:</div>
          <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.7">
            1. Öffne dein E-Mail-Postfach<br>
            2. Klicke auf den Bestätigungslink<br>
            3. Du wirst automatisch eingeloggt
          </div>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1.5rem">
          Keine Mail erhalten? Schau im Spam-Ordner nach.
        </p>
        <button class="btn-primary" style="width:100%;padding:0.75rem;font-size:0.95rem" onclick="location.reload()">
          Ich habe bestätigt — einloggen
        </button>

        <div style="margin-top:1.5rem;background:var(--surface);border-radius:14px;padding:1rem 1.25rem;text-align:left;box-shadow:0 1px 4px rgba(0,0,0,0.04)">
          <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.6">
            <strong style="color:var(--text)">📱 Tipp:</strong> Der MedAT Trainer ist eine Web-App. Nach dem Login kannst du sie ganz einfach auf deinem Homescreen speichern — wie eine normale App, ohne App Store!
          </div>
        </div>
      </div>
    `;
  },

  // ===== INSTALL GUIDE =====
  showInstallGuide() {
    // If native install prompt is available, use it directly
    if (window.deferredInstallPrompt) {
      window.deferredInstallPrompt.prompt();
      return;
    }
    // Otherwise show guide overlay
    let overlay = document.getElementById('install-guide-overlay');
    if (overlay) { overlay.remove(); }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    if (isStandalone) {
      this.showToast('Du nutzt die App bereits im Vollbildmodus!');
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'install-guide-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:var(--bg);overflow-y:auto;animation:fadeIn .3s ease';
    overlay.innerHTML = `
      <div style="max-width:480px;margin:0 auto;padding:1.5rem 1.25rem 3rem">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h2 style="font-size:1.2rem;font-weight:800;color:var(--text);margin:0">App installieren</h2>
          <button onclick="document.getElementById('install-guide-overlay').remove()" style="background:var(--surface);border:none;width:36px;height:36px;border-radius:50%;font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);box-shadow:0 1px 4px rgba(0,0,0,0.08)">✕</button>
        </div>

        <div style="background:var(--surface);border-radius:16px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 6px rgba(0,0,0,0.04)">
          <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;margin:0 0 0.5rem">
            Der MedAT Trainer ist eine <strong style="color:var(--text)">Web-App</strong> — du kannst sie wie eine normale App auf deinen Homescreen legen. Kein App Store nötig!
          </p>
        </div>

        ${isIOS ? `
        <!-- iOS Anleitung -->
        <div style="background:var(--surface);border-radius:16px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 6px rgba(0,0,0,0.04)">
          <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.3rem">🍎</span> iPhone / iPad (Safari)
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem">
            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">1</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">Teilen-Button antippen</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Tippe unten in Safari auf das Teilen-Symbol <span style="display:inline-flex;align-items:center;background:var(--bg);border-radius:6px;padding:0.15rem 0.4rem;margin:0 0.1rem">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" stroke-width="2.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </span> (das Quadrat mit dem Pfeil nach oben)</div>
              </div>
            </div>

            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">2</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">„Zum Home-Bildschirm" wählen</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Scrolle im Menü nach unten und tippe auf <strong style="color:var(--text)">„Zum Home-Bildschirm"</strong></div>
              </div>
            </div>

            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">3</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">„Hinzufügen" bestätigen</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Tippe oben rechts auf <strong style="color:var(--text)">„Hinzufügen"</strong> — fertig! Die App erscheint auf deinem Homescreen.</div>
              </div>
            </div>
          </div>
        </div>

        <div style="background:rgba(245,197,66,0.1);border:1px solid rgba(245,197,66,0.25);border-radius:12px;padding:0.9rem 1rem;font-size:0.8rem;color:var(--text-muted);line-height:1.5">
          <strong style="color:var(--text)">Wichtig:</strong> Nutze <strong>Safari</strong> — in Chrome oder Firefox auf iOS funktioniert „Zum Home-Bildschirm" leider nicht.
        </div>
        ` : `
        <!-- Android Anleitung -->
        <div style="background:var(--surface);border-radius:16px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 6px rgba(0,0,0,0.04)">
          <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.3rem">🤖</span> Android (Chrome)
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem">
            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">1</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">Drei-Punkte-Menü öffnen</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Tippe oben rechts in Chrome auf die drei Punkte <strong style="color:var(--text)">⋮</strong></div>
              </div>
            </div>

            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">2</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">„Zum Startbildschirm hinzufügen"</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Wähle <strong style="color:var(--text)">„Zum Startbildschirm hinzufügen"</strong> oder <strong style="color:var(--text)">„App installieren"</strong></div>
              </div>
            </div>

            <div style="display:flex;gap:0.75rem;align-items:flex-start">
              <div style="min-width:28px;height:28px;background:var(--yellow);color:var(--dark);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.8rem">3</div>
              <div>
                <div style="font-weight:600;font-size:0.88rem;color:var(--text);margin-bottom:0.25rem">Bestätigen</div>
                <div style="font-size:0.82rem;color:var(--text-muted);line-height:1.5">Tippe auf <strong style="color:var(--text)">„Installieren"</strong> — die App wird auf deinem Homescreen angezeigt.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Auch Desktop-Hinweis -->
        <div style="background:var(--surface);border-radius:16px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 1px 6px rgba(0,0,0,0.04)">
          <div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.3rem">💻</span> Desktop (Chrome / Edge)
          </div>
          <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.6">
            Klicke in der Adressleiste auf das <strong style="color:var(--text)">Installieren-Symbol</strong> (kleiner Pfeil / Monitor-Icon) und bestätige mit „Installieren".
          </div>
        </div>
        `}

        <button onclick="document.getElementById('install-guide-overlay').remove()" class="btn-primary" style="width:100%;margin-top:1rem;padding:0.8rem;font-size:0.95rem">Verstanden</button>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  // Handle email confirmation redirect
  _checkEmailConfirmation() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      this.showToast('E-Mail bestätigt! Willkommen beim MedAT Trainer! 🎉');
      window.history.replaceState({}, '', window.location.pathname);
    }
  },

  // ===== TIKTOK LANDING =====
  _checkTikTokLanding() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') !== 'tiktok') return;

    const authScreen = document.getElementById('screen-auth');
    if (!authScreen) return;

    // Hide the normal auth header
    const authHeader = authScreen.querySelector('.auth-header');
    if (authHeader) authHeader.style.display = 'none';

    // Create full TikTok welcome banner
    const banner = document.createElement('div');
    banner.id = 'tiktok-welcome-banner';
    banner.innerHTML = `
      <div style="background:linear-gradient(145deg,#0f0f1e 0%,#1a1a3e 50%,#0f1f2e 100%);color:white;padding:2rem 1.5rem;border-radius:20px;margin:0 0.5rem 1.5rem;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(245,197,66,0.15)">

        <img src="icon-512.png" alt="MedAT Trainer" style="width:72px;height:72px;border-radius:16px;margin-bottom:1rem;box-shadow:0 4px 16px rgba(0,0,0,0.3)">

        <h1 style="font-size:1.4rem;margin:0 0 0.25rem;color:white;font-weight:800">MedAT KFF Trainer</h1>
        <p style="font-size:0.8rem;color:rgba(255,255,255,0.5);margin:0 0 1.25rem">Dein smarter Begleiter für den MedAT</p>

        <div style="background:linear-gradient(135deg,rgba(245,197,66,0.15),rgba(109,184,138,0.15));border-radius:14px;padding:1.25rem;margin-bottom:1.25rem;border:1px solid rgba(245,197,66,0.2)">
          <div style="font-size:1.5rem;margin-bottom:0.5rem">🎉</div>
          <h2 style="font-size:1.15rem;margin:0 0 0.5rem;color:#f5c542;font-weight:700">Dein Vollzugang wartet!</h2>
          <p style="font-size:0.9rem;margin:0;line-height:1.5;color:rgba(255,255,255,0.9)">
            Du hast dich unter unserem TikTok-Video gemeldet — und wir halten unser Versprechen! Dein <strong style="color:#6db88a">kostenloser Vollzugang</strong> wird innerhalb von 48h freigeschaltet.
          </p>
        </div>

        <div style="text-align:left;font-size:0.88rem;line-height:1.8;padding:0 0.5rem">
          <div style="display:flex;align-items:flex-start;gap:0.6rem;margin-bottom:0.3rem">
            <span style="background:#f5c542;color:#1a1a2e;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;flex-shrink:0">1</span>
            <span>Erstelle jetzt unten deinen <strong>kostenlosen Account</strong></span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:0.6rem;margin-bottom:0.3rem">
            <span style="background:#f5c542;color:#1a1a2e;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;flex-shrink:0">2</span>
            <span>Trage als Benutzername deinen <strong style="color:#f5c542">exakten TikTok-Namen</strong> ein</span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:0.6rem">
            <span style="background:#6db88a;color:#1a1a2e;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.75rem;flex-shrink:0">✓</span>
            <span>Wir schalten deinen Vollzugang innerhalb von <strong>48 Stunden</strong> frei</span>
          </div>
        </div>

        <div style="margin-top:1.25rem;background:rgba(255,255,255,0.06);border-radius:10px;padding:0.85rem;font-size:0.78rem;color:rgba(255,255,255,0.6);line-height:1.5">
          🚀 Wir sind gerade in der <strong style="color:rgba(255,255,255,0.8)">Prelaunch-Phase</strong> und freuen uns riesig über dein Feedback — egal ob gut oder schlecht! Jede Rückmeldung hilft uns, die App für dich besser zu machen.
        </div>
      </div>
    `;

    authScreen.insertBefore(banner, authScreen.firstChild);

    // Switch to signup form and highlight username field
    setTimeout(() => {
      document.getElementById('auth-login')?.classList.add('hidden');
      document.getElementById('auth-signup')?.classList.remove('hidden');
      document.getElementById('auth-reset')?.classList.add('hidden');

      const usernameField = document.getElementById('signup-username');
      if (usernameField) {
        usernameField.placeholder = 'Dein exakter TikTok-Name (z.B. sarah_21)';
        usernameField.style.border = '2px solid #f5c542';
        usernameField.style.background = 'rgba(245,197,66,0.06)';
        usernameField.style.fontWeight = '600';
      }
      const usernameLabel = document.querySelector('label[for="signup-username"]');
      if (usernameLabel) {
        usernameLabel.innerHTML = 'Benutzername <span style="color:#f5c542;font-weight:700">(= dein TikTok-Name!)</span>';
      }
    }, 50);

    window.history.replaceState({}, '', window.location.pathname);
  },

  // ===== AUTH ERROR MESSAGE =====
  _authErrorMsg(e) {
    const msg = e?.message || e?.error_description || String(e);
    if (msg.includes('Invalid login credentials')) return 'E-Mail oder Passwort falsch';
    if (msg.includes('User already registered')) return 'Diese E-Mail ist bereits registriert';
    if (msg.includes('Password should be')) return 'Passwort muss mindestens 6 Zeichen haben';
    if (msg.includes('provide your email')) return 'Bitte E-Mail-Adresse eingeben';
    if (msg.includes('rate limit')) return 'Zu viele Versuche. Bitte warte kurz.';
    return msg;
  },

  // ===== SMART TRAINING =====
  openSmartTraining() {
    this.showScreen('screen-smart-train');
    this._updateReviewQueueCount();
    this._updateSmartTrainSummary();
  },

  async _updateSmartTrainSummary() {
    const el = document.getElementById('smart-train-summary');
    if (!el) return;
    try {
      const stats = await API.getSessionStats();
      if (stats && stats.total > 0) {
        const wrongCount = stats.total - stats.correct;
        el.textContent = `${stats.total} Fragen beantwortet, ${stats.percentage}% richtig — ${wrongCount} Fragen zum Wiederholen`;
      } else {
        el.textContent = 'Beantworte ein paar Fragen und komm dann hierher zurück!';
      }
    } catch(e) { el.textContent = ''; }
  },

  async _updateReviewQueueCount() {
    try {
      const el = document.getElementById('review-queue-count');
      if (!el) return;

      let query;
      if (Auth.isLoggedIn) {
        query = Auth.supabase.from('user_progress')
          .select('question_id', { count: 'exact', head: true })
          .eq('user_id', Auth.currentUser.id)
          .eq('answered_correctly', false);
      } else {
        query = Auth.supabase.from('user_progress')
          .select('question_id', { count: 'exact', head: true })
          .eq('session_id', CONFIG.getSessionId())
          .eq('answered_correctly', false);
      }

      const { count } = await query;
      el.textContent = count > 0 ? `${count} Fragen warten auf Wiederholung` : 'Keine offenen Fragen';
    } catch(e) { console.warn('Review count error:', e); }
  },

  async startReviewQueue() {
    this.mode = 'practice';
    this._sprintMode = false;
    this._dailyChallenge = false;

    try {
      // Load wrong answers
      let query;
      if (Auth.isLoggedIn) {
        query = Auth.supabase.from('user_progress')
          .select('question_id')
          .eq('user_id', Auth.currentUser.id)
          .eq('answered_correctly', false)
          .order('answered_at', { ascending: false })
          .limit(20);
      } else {
        query = Auth.supabase.from('user_progress')
          .select('question_id')
          .eq('session_id', CONFIG.getSessionId())
          .eq('answered_correctly', false)
          .order('answered_at', { ascending: false })
          .limit(20);
      }

      const { data: wrongAnswers } = await query;
      if (!wrongAnswers || wrongAnswers.length === 0) {
        App.showToast('Keine falschen Fragen vorhanden!');
        return;
      }

      const questionIds = [...new Set(wrongAnswers.map(w => w.question_id).filter(Boolean))];
      if (questionIds.length === 0) {
        App.showToast('Keine Fragen zum Wiederholen gefunden');
        return;
      }

      const { data: questions } = await Auth.supabase
        .from('questions')
        .select('*')
        .in('id', questionIds.slice(0, 15));

      if (!questions || questions.length === 0) {
        App.showToast('Keine Fragen zum Wiederholen gefunden');
        return;
      }

      // Shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }

      this.questions = questions;
      this.currentIndex = 0;
      this.score = 0;
      this.results = [];
      this.wrongAnswers = [];
      this.currentSectionKey = 'review';

      const badge = document.getElementById('q-section-badge');
      if (badge) badge.textContent = 'Wiederholung';

      this.showScreen('screen-question');
      this.showTimer = false;
      this.renderQuestion();
    } catch(e) {
      console.warn('Review queue error:', e);
      App.showToast('Fehler beim Laden der Wiederholungsfragen');
    }
  },

  // ===== TÄGLICHE CHALLENGE =====
  async startDailyChallenge() {
    const today = new Date().toISOString().split('T')[0];
    const doneKey = 'medat_daily_' + today;

    // Prüfen ob heute schon gemacht
    if (localStorage.getItem(doneKey)) {
      this.showToast('Heutige Challenge bereits absolviert!');
      return;
    }

    this.mode = 'practice';
    this.wrongAnswers = [];
    this._infographicQueue = [];
    this._infographicResults = [];
    this.showTimer = true;
    this._sprintMode = false;
    this._dailyChallenge = true;

    // Get BMS block
    const bmsBlock = CONFIG.TEST_BLOCKS.bms;
    this.currentBlock = bmsBlock;

    try {
      // Load BMS wrong answers
      let wrongAnswerIds = [];
      try {
        let query;
        if (Auth.isLoggedIn) {
          query = Auth.supabase.from('user_progress')
            .select('question_id')
            .eq('user_id', Auth.currentUser.id)
            .eq('answered_correctly', false);
        } else {
          query = Auth.supabase.from('user_progress')
            .select('question_id')
            .eq('session_id', CONFIG.getSessionId())
            .eq('answered_correctly', false);
        }
        const { data } = await query;
        if (data) {
          wrongAnswerIds = [...new Set(data.map(d => d.question_id).filter(Boolean))];
        }
      } catch (e) {
        console.warn('Error loading wrong answers:', e);
      }

      let questions = [];

      // If we have wrong answers, load them first
      if (wrongAnswerIds.length > 0) {
        const { data } = await Auth.supabase
          .from('questions')
          .select('*')
          .in('id', wrongAnswerIds.slice(0, 5));
        if (data) questions = data;
      }

      // Supplement with random BMS questions if needed
      if (questions.length < 5) {
        const neededCount = 5 - questions.length;
        const { data: randomQuestions } = await Auth.supabase
          .from('questions')
          .select('*')
          .eq('type', 'bms')
          .limit(neededCount);
        if (randomQuestions) questions = questions.concat(randomQuestions);
      }

      // Shuffle
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }

      this.questions = questions.slice(0, 10);
      if (this.questions.length === 0) {
        this.showToast('Keine BMS-Fragen gefunden');
        return;
      }
    } catch (e) {
      this.showToast('Fehler beim Laden');
      return;
    }

    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this.currentSectionKey = 'daily-bms';
    this.countdownSeconds = 600; // 10 min

    this.showScreen('screen-question');
    document.getElementById('q-section-badge').innerHTML =
      `${ICONS.flame} Tägliche BMS-Challenge`;

    this.startCountdown(() => this.showResult(this.score, this.questions.length, this.results));
    this.renderQuestion();
  },

  // Daily Challenge als erledigt markieren (wird nach Result aufgerufen)
  _markDailyDone() {
    if (this._dailyChallenge) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('medat_daily_' + today, '1');
      this._dailyChallenge = false;
      this._updateDailyUI();
    }
  },

  _updateDailyUI() {
    const today = new Date().toISOString().split('T')[0];
    const done = localStorage.getItem('medat_daily_' + today);
    const el = document.getElementById('daily-challenge');
    const descEl = document.getElementById('daily-desc');
    const btnEl = document.getElementById('btn-daily');
    if (el && done) {
      el.classList.add('daily-done');
      if (descEl) descEl.textContent = '✅ Heute schon erledigt!';
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = 'Erledigt';
        btnEl.style.opacity = '0.5';
        btnEl.style.cursor = 'default';
      }
    } else if (el) {
      el.classList.remove('daily-done');
      if (descEl) descEl.textContent = '10 zufällige Fragen – jeden Tag neu!';
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Los!';
        btnEl.style.opacity = '1';
        btnEl.style.cursor = 'pointer';
      }
    }
  },

  // ===== 5-MIN SPRINT =====
  async startSprint() {
    this.mode = 'practice';
    this.wrongAnswers = [];
    this._infographicQueue = [];
    this._infographicResults = [];
    this.showTimer = true;
    this._sprintMode = true;
    this._sprintStartTime = null;

    // Zufällige verfügbare Sektionen sammeln
    const availableSections = [];
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      if (block.available === false) continue;
      for (const [secKey, sec] of Object.entries(block.sections)) {
        if (sec.available === false || sec.isMemorize || sec.isRecall) continue;
        availableSections.push({ blockId, secKey, sec, block });
      }
    }

    if (availableSections.length === 0) {
      this.showToast('Keine Sektionen verfügbar');
      return;
    }

    // Zufällige Sektion wählen
    const picked = availableSections[Math.floor(Math.random() * availableSections.length)];
    this.currentBlock = picked.block;
    this.currentSectionKey = picked.secKey;
    this.currentSection = picked.sec;

    try {
      // Viele Fragen laden (Sprint = so viele wie möglich)
      this.questions = await API.getQuestions(picked.sec.dbType, 'mixed', 50, picked.sec.dbSubtype);
      if (this.questions.length === 0) {
        this.showToast('Keine Fragen gefunden');
        return;
      }
    } catch (e) {
      this.showToast('Fehler beim Laden');
      return;
    }

    this.currentIndex = 0;
    this.score = 0;
    this.results = [];

    // 5 Minuten Timer
    this.countdownSeconds = 300;
    this.showScreen('screen-question');

    document.getElementById('q-section-badge').innerHTML = `${ICONS.bolt} Sprint: <span class="sec-badge-icon">${ICONS[picked.sec.icon] || ''}</span> ${picked.sec.label}`;

    this._sprintStartTime = Date.now();
    this.startCountdown(() => {
      // Zeit abgelaufen → Ergebnis
      this._sprintMode = false;
      this.showResult(this.score, this.currentIndex, this.results);
    });

    this.renderQuestion();
  },

  // ===== SCHWACHSTELLEN-TRAINER =====
  async startWeakspotTrainer() {
    this.mode = 'practice';
    this.wrongAnswers = [];
    this._infographicQueue = [];
    this._infographicResults = [];
    this.showTimer = true;
    this._sprintMode = false;

    // Fortschrittsdaten laden
    let progressData = [];
    try {
      if (Auth.isLoggedIn && Auth.supabase) {
        const { data } = await Auth.supabase
          .from('user_progress')
          .select('question_id, answered_correctly, section_key')
          .eq('user_id', Auth.currentUser.id);
        progressData = data || [];
      } else {
        const sessionId = CONFIG.getSessionId();
        if (Auth.supabase) {
          const { data } = await Auth.supabase
            .from('user_progress')
            .select('question_id, answered_correctly, section_key')
            .eq('session_id', sessionId);
          progressData = data || [];
        }
      }
    } catch (e) {
      console.warn('Weakspot data load error:', e);
    }

    if (progressData.length < 5) {
      this.showToast('Beantworte erst mindestens 5 Fragen, um Schwachstellen zu erkennen.');
      return;
    }

    // Schwächste Sektion finden
    const bySection = {};
    progressData.forEach(p => {
      const key = p.section_key || 'unknown';
      if (!bySection[key]) bySection[key] = { total: 0, correct: 0 };
      bySection[key].total++;
      if (p.answered_correctly) bySection[key].correct++;
    });

    // Nur Sektionen mit min 3 Antworten + schlechteste zuerst
    const ranked = Object.entries(bySection)
      .filter(([k, v]) => v.total >= 3 && k !== 'unknown')
      .map(([k, v]) => ({ key: k, pct: v.correct / v.total, total: v.total }))
      .sort((a, b) => a.pct - b.pct);

    if (ranked.length === 0) {
      this.showToast('Noch nicht genug Daten für Schwachstellen-Analyse');
      return;
    }

    // Schlechteste Sektion
    const weakest = ranked[0];

    // Config-Info finden
    let sectionConfig = null;
    let blockConfig = null;
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      if (block.sections[weakest.key]) {
        sectionConfig = block.sections[weakest.key];
        blockConfig = block;
        break;
      }
    }

    if (!sectionConfig || sectionConfig.isMemorize || sectionConfig.isRecall) {
      // Nächste Schwachstelle nehmen
      for (const r of ranked.slice(1)) {
        for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
          if (block.sections[r.key] && !block.sections[r.key].isMemorize && !block.sections[r.key].isRecall) {
            sectionConfig = block.sections[r.key];
            blockConfig = block;
            weakest.key = r.key;
            weakest.pct = r.pct;
            break;
          }
        }
        if (sectionConfig) break;
      }
    }

    if (!sectionConfig) {
      this.showToast('Keine passende Sektion gefunden');
      return;
    }

    this.currentBlock = blockConfig;
    this.currentSectionKey = weakest.key;
    this.currentSection = sectionConfig;

    try {
      this.questions = await API.getQuestions(sectionConfig.dbType, 'mixed', 15, sectionConfig.dbSubtype);
      if (this.questions.length === 0) {
        this.showToast('Keine Fragen gefunden');
        return;
      }
    } catch (e) {
      this.showToast('Fehler beim Laden');
      return;
    }

    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this.countdownSeconds = sectionConfig.minutes * 60;

    this.showScreen('screen-question');
    document.getElementById('q-section-badge').innerHTML =
      `${ICONS.target} Schwachstelle: <span class="sec-badge-icon">${ICONS[sectionConfig.icon] || ''}</span> ${sectionConfig.label} (${Math.round(weakest.pct * 100)}%)`;

    this.startCountdown(() => this.showResult(this.score, this.questions.length, this.results));
    this.renderQuestion();
  },

  // ===== ERWEITERTE SCHWÄCHENANALYSE (Topic-basiert) =====
  async openWeaknessAnalysis() {
    this.showScreen('screen-weakness');
    const container = document.getElementById('weakness-container');
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)"><div class="spinner"></div>Analysiere deine Antworten...</div>';

    try {
      // Alle BMS-Fächer analysieren
      const subjects = ['biologie', 'chemie', 'physik', 'mathematik'];
      const subjectLabels = { biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik' };
      const allWeaknesses = {};
      let hasAnyData = false;

      for (const sub of subjects) {
        const weaknesses = await API.getTopicWeaknesses(sub);
        if (weaknesses && weaknesses.length > 0) {
          allWeaknesses[sub] = weaknesses;
          hasAnyData = true;
        }
      }

      if (!hasAnyData) {
        container.innerHTML = `<div class="weakness-no-data">
          <p style="font-size:2rem">📊</p>
          <p><strong>Noch keine Daten</strong></p>
          <p>Beantworte zuerst ein paar Fragen, damit die Schwächenanalyse funktioniert.</p>
          <button class="btn-primary" style="margin-top:1rem" onclick="App.openPracticeSelect()">Jetzt üben</button>
        </div>`;
        return;
      }

      let html = '';

      // Gesamtübersicht: Schwächste Topics über alle Fächer
      const allTopicsFlat = [];
      for (const [sub, topics] of Object.entries(allWeaknesses)) {
        topics.forEach(t => allTopicsFlat.push({ ...t, subject: sub }));
      }
      const weakest = allTopicsFlat.filter(t => t.total >= 3).sort((a, b) => a.percentage - b.percentage).slice(0, 3);

      if (weakest.length > 0) {
        html += `<div class="weakness-ai-card">
          <h3>🎯 Deine Top-Schwachstellen</h3>
          <div class="weakness-ai-content">`;

        weakest.forEach((w, i) => {
          const icon = CONFIG.TOPIC_ICONS[w.topic] || '📘';
          html += `<div style="margin-bottom:0.5rem">
            <strong>${i+1}. ${icon} ${w.topic}</strong> (${subjectLabels[w.subject]}) — ${w.percentage}% richtig (${w.wrong}/${w.total} falsch)
          </div>`;
        });

        // Regel-basierte Tipps
        html += '<div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid rgba(255,255,255,0.1)">';
        html += '<strong>💡 Tipp:</strong> ';
        if (weakest[0].percentage < 40) {
          html += `Fokussiere dich auf <strong>${weakest[0].topic}</strong> — hier hast du die meisten Fehler. Lies das Kapitel nochmal durch und übe gezielt mit dem Topic-Filter.`;
        } else if (weakest[0].percentage < 60) {
          html += `Du bist auf dem richtigen Weg! Bei <strong>${weakest[0].topic}</strong> verwechselst du noch einige Konzepte. Gezieltes Üben wird helfen.`;
        } else {
          html += `Du bist insgesamt stark! Kleine Verbesserungen bei <strong>${weakest[0].topic}</strong> können den Unterschied machen.`;
        }
        html += '</div>';

        html += `</div>
          <button class="weakness-topic-btn" onclick="App._practiceWeakestTopic('${weakest[0].subject}', '${weakest[0].topic}')">📌 ${weakest[0].topic} jetzt üben</button>
        </div>`;
      }

      // Pro Fach
      for (const [sub, topics] of Object.entries(allWeaknesses)) {
        html += `<h3 class="weakness-subject-title">${subjectLabels[sub]}</h3>`;

        topics.forEach(t => {
          const icon = CONFIG.TOPIC_ICONS[t.topic] || '📘';
          const barColor = t.percentage >= 80 ? 'var(--mint-deep)' : t.percentage >= 50 ? 'var(--yellow)' : 'var(--danger)';
          const badgeClass = t.percentage >= 80 ? 'good' : t.percentage >= 50 ? 'ok' : 'weak';

          html += `<div class="weakness-topic-card">
            <span class="weakness-topic-icon">${icon}</span>
            <div class="weakness-topic-info">
              <div class="weakness-topic-name">${t.topic}</div>
              <div class="weakness-topic-stats">${t.correct}/${t.total} richtig</div>
            </div>
            <div class="weakness-topic-bar"><div class="weakness-topic-bar-fill" style="width:${t.percentage}%;background:${barColor}"></div></div>
            <span class="weakness-topic-percent" style="color:${barColor}">${t.percentage}%</span>
          </div>`;
        });
      }

      container.innerHTML = html;
    } catch(e) {
      container.innerHTML = `<div class="weakness-no-data"><p>Fehler beim Laden der Analyse.</p></div>`;
      console.error('Weakness analysis error:', e);
    }
  },

  _practiceWeakestTopic(subject, topic) {
    // Direkt zur Übung mit dem schwächsten Topic springen
    const section = CONFIG.TEST_BLOCKS.bms.sections[subject];
    if (!section) return;

    this.currentBlock = CONFIG.TEST_BLOCKS.bms;
    this.currentSectionKey = subject;
    this.currentSection = section;
    this.currentTopic = topic;
    this.mode = 'practice';
    this.wrongAnswers = [];
    this._infographicQueue = [];
    this._infographicResults = [];
    this.showTimer = true;

    this.loadAndStartQuestions(section, null, 15, section.minutes, false);
  },

  // ===== PRACTICE MODE =====
  async openPracticeSelect() {
    this.mode = 'practice';
    const container = document.getElementById('practice-blocks');
    if (!container) return;
    container.innerHTML = '';

    // Fragenanzahl aus DB laden
    const dbCounts = await API.getQuestionCounts();

    // Gesamtanzahl Fragen laden und anzeigen
    const totalQuestions = await API.getTotalAvailableQuestions();
    const counterDiv = document.createElement('div');
    counterDiv.className = 'practice-total-counter';
    counterDiv.innerHTML = `<div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1.5rem;padding:0.75rem 1rem;background:var(--bg-secondary);border-radius:0.5rem;border-left:3px solid var(--yellow)"><strong>${totalQuestions.toLocaleString('de-DE')}</strong> Fragen verfügbar <span style="font-size:0.8rem;opacity:0.7">(+ ∞ Figuren)</span></div>`;
    container.appendChild(counterDiv);

    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      const group = document.createElement('div');
      group.className = 'practice-block-group';

      group.innerHTML = `<div class="practice-block-title" style="background:${block.gradient}">
        <span class="block-icon-inline">${ICONS.block(block.icon, 20, 1.75)}</span> ${block.label} <span style="opacity:0.7;font-weight:400;margin-left:auto;font-size:0.8rem">${block.weight}%</span>
      </div>`;

      const sections = document.createElement('div');
      sections.className = 'practice-sections';

      for (const [secKey, sec] of Object.entries(block.sections)) {
        const available = sec.available !== false && block.available !== false;
        const btn = document.createElement('button');
        btn.className = 'section-btn' + (available ? '' : ' disabled');

        // Gesamtanzahl für diese Sektion ermitteln
        let totalAvail = 0;
        const countKey = sec.dbSubtype ? `${sec.dbType}_${sec.dbSubtype}` : secKey;
        // Map section keys to DB count keys
        const countMap = {
          'textverstaendnis': 'textverstaendnis',
          'emotionen_erkennen': 'sek_emotionen_erkennen',
          'emotionen_regulieren': 'sek_emotionen_regulieren',
          'soziales_entscheiden': 'sek_soziales_entscheiden',
        };
        const lookupKey = countMap[secKey] || countKey;
        totalAvail = dbCounts[lookupKey] || dbCounts[sec.dbType] || 0;

        // Dynamische Sektionen
        if (secKey === 'figuren') totalAvail = '∞';
        if (secKey === 'allergieausweis_mem' || secKey === 'allergieausweis_abruf') totalAvail = 294;

        // Free vs Vollzugang: Anzeige
        const isFree = this.isFreeUser();
        let unlockBadge = '';
        if (totalAvail === '∞') {
          unlockBadge = `<span class="sec-unlock-badge full">∞ Variationen</span>`;
        } else if (totalAvail > 0) {
          if (isFree) {
            unlockBadge = `<span class="sec-unlock-badge full">${sec.questions} Fragen verfügbar</span>`;
          } else {
            unlockBadge = `<span class="sec-unlock-badge full">✓ ${totalAvail} Fragen verfügbar</span>`;
          }
        }

        btn.innerHTML = `
          <span class="sec-icon">${ICONS[sec.icon] || ''}</span>
          <span class="sec-label">${sec.label}</span>
          ${unlockBadge}
          <span class="sec-meta"><span>${sec.questions} Fragen</span><span>${sec.minutes} min</span></span>
        `;
        if (available) {
          btn.onclick = () => this.openPracticeSettings(blockId, secKey);
        }
        sections.appendChild(btn);
      }

      group.appendChild(sections);
      container.appendChild(group);
    }

    this.showScreen('screen-practice-select');
  },

  async openPracticeSettings(blockId, sectionKey) {
    const block = CONFIG.TEST_BLOCKS[blockId];
    const section = block.sections[sectionKey];
    this.currentBlock = block;
    this.currentSectionKey = sectionKey;
    this.currentSection = section;

    const titleEl = document.getElementById('practice-section-title');
    if (titleEl) titleEl.innerHTML = `<span class="header-icon">${ICONS[section.icon] || ''}</span> ${section.label}`;

    // Pre-fill count with test count
    const countSelect = document.getElementById('prac-count');
    if (countSelect) {
      const testCount = section.questions;
      const options = Array.from(countSelect.options).map(o => parseInt(o.value));
      const closest = options.reduce((a, b) => Math.abs(b - testCount) < Math.abs(a - testCount) ? b : a);
      countSelect.value = closest;
    }

    // Topic-Auswahl für BMS-Fächer anzeigen
    const topicRow = document.getElementById('topic-setting-row');
    const topicSelect = document.getElementById('prac-topic');
    const weaknessHint = document.getElementById('weakness-hint');

    if (blockId === 'bms' && CONFIG.BMS_TOPICS[sectionKey]) {
      if (topicRow) topicRow.style.display = '';
      if (topicSelect) topicSelect.innerHTML = '<option value="all">🎯 Alle Kapitel (gemischt)</option>';

      // Topics aus Config laden mit Emoji-Icons
      const topics = CONFIG.BMS_TOPICS[sectionKey];
      topics.forEach(t => {
        const icon = CONFIG.TOPIC_ICONS[t] || '📘';
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = `${icon} ${t}`;
        topicSelect.appendChild(opt);
      });

      // Schwächenanalyse laden (async, nicht blockierend)
      if (weaknessHint) weaknessHint.style.display = 'none';
      this._loadWeaknessHint(sectionKey, topicSelect);
    } else {
      if (topicRow) topicRow.style.display = 'none';
      if (weaknessHint) weaknessHint.style.display = 'none';
    }

    // Show Implikationen cheat sheet if applicable
    const cheatsheet = document.getElementById('implikationen-cheatsheet');
    if (cheatsheet) {
      cheatsheet.style.display = (sectionKey === 'implikation') ? '' : 'none';
      cheatsheet.classList.remove('open');
    }

    this.showScreen('screen-practice-settings');

    // Update credit cost hint
    this._updateCreditCostHint();
    const countSel = document.getElementById('prac-count');
    if (countSel) countSel.onchange = () => this._updateCreditCostHint();
  },

  _updateCreditCostHint() {
    const hint = document.getElementById('credit-cost-hint');
    const text = document.getElementById('credit-cost-text');
    if (!hint || !text) return;
    if (Credits.isUnlimited()) { hint.style.display = 'none'; return; }
    const count = parseInt(document.getElementById('prac-count')?.value || '10');
    hint.style.display = '';
    const rem = Credits.remaining;
    if (rem <= 0) {
      text.innerHTML = `<span style="color:#ef4444">Keine Credits mehr — <a href="#" onclick="Credits.showPaywall();return false" style="color:var(--yellow);font-weight:600">Upgraden</a></span>`;
    } else {
      text.textContent = `Diese Übung kostet ${count} Credit${count !== 1 ? 's' : ''} · ${rem} übrig`;
    }
  },

  async _loadWeaknessHint(subtype, topicSelect) {
    try {
      const weaknesses = await API.getTopicWeaknesses(subtype);
      if (!weaknesses || weaknesses.length === 0) return;

      const hint = document.getElementById('weakness-hint');
      const content = document.getElementById('weakness-hint-content');

      // Schwächste Topics finden (< 60% und mindestens 3 Fragen beantwortet)
      const weakTopics = weaknesses.filter(w => w.percentage < 60 && w.total >= 3);
      const okTopics = weaknesses.filter(w => w.percentage >= 60 && w.percentage < 80 && w.total >= 3);

      if (weakTopics.length === 0 && okTopics.length === 0) return;

      let html = '<div class="weakness-hint-title">💡 Lernempfehlung</div>';

      if (weakTopics.length > 0) {
        const worst = weakTopics[0];
        html += `<div class="weakness-hint-text">`;
        html += `Dein schwächstes Kapitel: <strong>${worst.topic}</strong> (${worst.percentage}% richtig, ${worst.total} Fragen). `;
        html += `Gezielt üben hilft!`;
        html += `</div>`;
        html += `<button class="weakness-topic-btn" onclick="document.getElementById('prac-topic').value='${worst.topic}'">📌 ${worst.topic} üben</button>`;
      } else if (okTopics.length > 0) {
        const ok = okTopics[0];
        html += `<div class="weakness-hint-text">`;
        html += `Verbesserungspotenzial: <strong>${ok.topic}</strong> (${ok.percentage}% richtig). Fast perfekt!`;
        html += `</div>`;
      }

      content.innerHTML = html;
      hint.style.display = '';
    } catch(e) {
      console.warn('Weakness hint load failed:', e);
    }
  },

  async startPractice() {
    const section = this.currentSection;
    const difficulty = document.getElementById('prac-difficulty').value;
    const count = parseInt(document.getElementById('prac-count').value);
    this.showTimer = document.getElementById('prac-timer-toggle').checked;

    // Topic aus Select lesen (nur BMS)
    const topicSelect = document.getElementById('prac-topic');
    const topicRow = document.getElementById('topic-setting-row');
    this.currentTopic = (topicRow.style.display !== 'none' && topicSelect.value !== 'all') ? topicSelect.value : null;

    // Reset wrong answers tracker
    this.wrongAnswers = [];
    this._infographicQueue = [];
    this._infographicResults = [];

    // Special: Allergieausweis Einprägen
    if (section.isMemorize) {
      await this.startMemorize(count);
      return;
    }

    await this.loadAndStartQuestions(section, difficulty, count, section.minutes, false);
  },

  async loadAndStartQuestions(section, difficulty, count, minutes, isSimulation) {
    // Credit check
    if (!Credits.isUnlimited() && !Credits.hasEnough(count)) {
      if (Credits.remaining <= 0) {
        Credits.showPaywall();
        return;
      }
      // Reduce to available credits
      count = Credits.remaining;
      this.showToast(`Nur noch ${count} Credits — Fragenanzahl angepasst`);
    }

    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this._tvTexts = null; // Reset TV state
    this._tvUserAnswers = {}; // Reset TV user answers for analysis
    this._tvCurrentTextIdx = 0;
    this._tvQuestionOffset = 0;

    // Show loading
    this.showScreen('screen-question');
    document.getElementById('q-content').innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div class="spinner"></div>Fragen werden geladen...</div>';
    document.getElementById('q-answers').innerHTML = '';
    document.getElementById('q-feedback').classList.add('hidden');

    try {
      // Phase 7: DB questions ALWAYS first, AI/generation only as fallback
      if (section.dbType === 'figur') {
        // Figuren: Try DB first, then generate locally
        this.questions = await API.getQuestions('figur', difficulty === 'mixed' ? null : difficulty, count, section.dbSubtype).catch(() => []);
        if (!this.questions || this.questions.length === 0) {
          const diff = difficulty === 'mixed' ? null : difficulty;
          this.questions = FigurenGenerator.generateBatch(count, diff || 'medium');
        }
      } else if (section.isAIGenerated && section.dbType === 'textverstaendnis') {
        // TV: Try DB first, then AI generation
        this.questions = await API.getQuestions('textverstaendnis', difficulty === 'mixed' ? null : difficulty, count, section.dbSubtype).catch(() => []);
        if (!this.questions || this.questions.length < 3) {
          this.questions = [];
          await this._loadTVQuestions(section);
        }
      } else if (section.isAIGenerated && section.dbType.startsWith('sek_')) {
        // SEK: Try DB first, then AI generation
        this.questions = await API.getQuestions(section.dbType, difficulty === 'mixed' ? null : difficulty, count, section.dbSubtype).catch(() => []);
        if (!this.questions || this.questions.length < 3) {
          this.questions = [];
          await this._loadSEKQuestions(section);
        }
      } else {
        // BMS + other: Only DB (with optional topic filter)
        this.questions = await API.getQuestions(
          section.dbType,
          difficulty === 'mixed' ? null : difficulty,
          count,
          section.dbSubtype,
          this.currentTopic || null
        );

        if (!this.questions || this.questions.length === 0) {
          throw new Error('Keine Fragen für diese Auswahl gefunden.');
        }
      }

      // Setup header
      document.getElementById('q-section-badge').innerHTML = `<span class="sec-badge-icon">${ICONS[section.icon] || ''}</span> ${section.label}`;

      // Timer
      if (this.showTimer || isSimulation) {
        this.startCountdown(minutes * 60);
        document.getElementById('q-countdown').classList.remove('hidden');
      } else {
        document.getElementById('q-countdown').classList.add('hidden');
      }

      this.renderQuestion();
    } catch (err) {
      document.getElementById('q-content').innerHTML = `<div style="text-align:center;padding:2rem;color:var(--danger)">${err.message}<br><button class="btn-secondary" style="margin-top:1rem" onclick="App.openPracticeSelect()">Zurück</button></div>`;
    }
  },

  async _loadTVQuestions(section) {
    const textCount = section.textCount || 4;
    const questionsPerText = section.questionsPerText || 3;

    // STEP 1: Try pre-generated pool first (no API costs!)
    if (Auth.supabase) {
      try {
        const { data: preGen } = await Auth.supabase
          .from('pre_generated_tv')
          .select('*')
          .order('times_used', { ascending: true })
          .limit(50);

        if (preGen && preGen.length >= textCount) {
          // Shuffle and pick random texts
          for (let i = preGen.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [preGen[i], preGen[j]] = [preGen[j], preGen[i]];
          }
          const selected = preGen.slice(0, textCount);

          this._tvTexts = selected.map(t => ({
            title: (t.text_content || '').substring(0, 80).split('.')[0] || 'Text',
            content: t.text_content,
            questions: typeof t.questions === 'string' ? JSON.parse(t.questions) : t.questions,
          }));
          this._tvCurrentTextIdx = 0;
          this._tvQuestionOffset = 0;

          this.questions = [];
          for (let ti = 0; ti < this._tvTexts.length; ti++) {
            const text = this._tvTexts[ti];
            const qs = text.questions.slice(0, questionsPerText);
            for (let qi = 0; qi < qs.length; qi++) {
              this.questions.push({
                id: `tv-${ti}-${qi}`,
                type: 'textverstaendnis',
                subtype: null,
                _tvTextIdx: ti,
                _tvQuestionIdx: qi,
                content: {
                  question: qs[qi].question,
                  options: qs[qi].options,
                  correct: qs[qi].correct,
                  explanation: qs[qi].explanation,
                }
              });
            }
          }

          // Increment usage counter
          selected.forEach(t => {
            Auth.supabase.from('pre_generated_tv').update({ times_used: (t.times_used || 0) + 1 }).eq('id', t.id).then(() => {});
          });

          if (this.questions.length > 0) return;
        }
      } catch(e) { console.warn('Pre-generated TV fallback:', e); }
    }

    // STEP 2: No live AI generation — only pre-generated content
    throw new Error('Textverständnis wird gerade vorbereitet. Bitte versuche es später erneut oder wähle einen anderen Bereich.');

    /* DISABLED — no more live AI calls
    const url = `${CONFIG.SUPABASE_URL}/functions/v1/generate-tv-text`;
    const tvController = new AbortController();
    const tvTimeout = setTimeout(() => tvController.abort(), 120000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ text_count: textCount, questions_per_text: questionsPerText }),
        signal: tvController.signal,
      });
    } catch (fetchErr) {
      clearTimeout(tvTimeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Textgenerierung hat zu lange gedauert (Timeout). Bitte versuche es erneut.');
      }
      throw fetchErr;
    }
    clearTimeout(tvTimeout);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Textgenerierung fehlgeschlagen (${response.status})`);
    }

    const data = await response.json();
    if (!data.texts || data.texts.length === 0) {
      throw new Error('Keine Texte generiert.');
    }

    this._tvTexts = data.texts;
    this._tvCurrentTextIdx = 0;
    this._tvQuestionOffset = 0;

    this.questions = [];
    for (let ti = 0; ti < data.texts.length; ti++) {
      const text = data.texts[ti];
      for (let qi = 0; qi < text.questions.length; qi++) {
        this.questions.push({
          id: `tv-${ti}-${qi}`,
          type: 'textverstaendnis',
          subtype: null,
          _tvTextIdx: ti,
          _tvQuestionIdx: qi,
          content: {
            question: text.questions[qi].question,
            options: text.questions[qi].options,
            correct: text.questions[qi].correct,
            explanation: text.questions[qi].explanation,
          }
        });
      }
    }
    DISABLED — end of TV AI block */
  },

  // ===== SEK (Sozial-emotionale Kompetenzen) =====
  async _loadSEKQuestions(section) {
    const subtype = section.dbSubtype; // 'erkennen', 'regulieren', 'entscheiden'
    const count = section.questions;

    // STEP 1: Try pre-generated pool first (no API costs!)
    if (Auth.supabase) {
      try {
        const { data: preGen } = await Auth.supabase
          .from('pre_generated_sek')
          .select('*')
          .eq('sek_type', subtype)
          .order('times_used', { ascending: true })
          .limit(50);

        if (preGen && preGen.length >= count) {
          // Shuffle and pick
          for (let i = preGen.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [preGen[i], preGen[j]] = [preGen[j], preGen[i]];
          }
          const selected = preGen.slice(0, count);

          this.questions = selected.map((q, idx) => {
            const content = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
            return {
              id: `sek-${subtype}-${idx}`,
              type: section.dbType,
              subtype: subtype,
              content: {
                scenario: content.scenario || '',
                person: content.person || '',
                question: content.question,
                options: content.options,
                correct: content.correct,
                correct_ranking: content.correct_ranking,
                explanation: content.explanation || '',
              }
            };
          });

          // Increment usage counter
          selected.forEach(s => {
            Auth.supabase.from('pre_generated_sek').update({ times_used: (s.times_used || 0) + 1 }).eq('id', s.id).then(() => {});
          });

          if (this.questions.length > 0) return;
        }
      } catch(e) { console.warn('Pre-generated SEK fallback:', e); }
    }

    // STEP 2: No live AI generation — only pre-generated content
    throw new Error('SEK-Fragen werden gerade vorbereitet. Bitte versuche es später erneut oder wähle einen anderen Bereich.');

    /* DISABLED — no more live AI calls
    const url = `${CONFIG.SUPABASE_URL}/functions/v1/generate-sek`;
    const sekController = new AbortController();
    const sekTimeout = setTimeout(() => sekController.abort(), 120000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subtype, count }),
        signal: sekController.signal,
      });
    } catch (fetchErr) {
      clearTimeout(sekTimeout);
      if (fetchErr.name === 'AbortError') {
        throw new Error('SEK-Generierung hat zu lange gedauert (Timeout). Bitte versuche es erneut.');
      }
      throw fetchErr;
    }
    clearTimeout(sekTimeout);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `SEK-Generierung fehlgeschlagen (${response.status})`);
    }

    const data = await response.json();
    if (!data.questions || data.questions.length === 0) {
      throw new Error('Keine SEK-Fragen generiert.');
    }

    this.questions = data.questions.map((q, idx) => ({
      id: `sek-${subtype}-${idx}`,
      type: section.dbType,
      subtype: subtype,
      content: {
        scenario: q.scenario || '',
        person: q.person || '',
        question: q.question,
        options: q.options,
        correct: q.correct,
        correct_ranking: q.correct_ranking,
        explanation: q.explanation || '',
      }
    }));
    DISABLED — end of SEK AI block */
  },

  renderSEKEmotionen(q, data, content, answers) {
    const labelMap = { erkennen: 'Emotionen erkennen', regulieren: 'Emotionen regulieren' };
    const label = labelMap[q.subtype] || 'SEK';
    const isEE = data._isEE || (data.correct_emotions && Array.isArray(data.correct_emotions));

    let html = `<p class="q-header-label" style="color:var(--coral)">${label}</p>`;
    html += `<div class="sek-scenario" style="background:var(--coral-soft);border-left:4px solid var(--coral);padding:12px 16px;border-radius:8px;margin-bottom:12px;">`;
    html += `<p style="margin:0;line-height:1.6">${data.scenario || ''}</p>`;
    html += `</div>`;
    html += `<p class="q-text">${data.question}</p>`;
    content.innerHTML = html;

    if (isEE) {
      // New binary format: each emotion → wahrscheinlich / unwahrscheinlich
      this._eeData = data;
      this._eeUserAnswers = new Array(data.options.length).fill(null);
      this._renderEETable(answers, data.options);
    } else {
      // ER: keep old MC format
      this._renderMCButtons(data.options, answers, data);
    }
  },

  _renderEETable(container, emotions) {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    container.innerHTML = `
      <div class="ee-table" style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:0;background:var(--bg-card)">
          <div style="padding:8px 12px;font-weight:700;font-size:0.85rem;border-bottom:2px solid var(--border)"></div>
          <div style="padding:8px 12px;font-weight:700;font-size:0.75rem;text-align:center;border-bottom:2px solid var(--border);min-width:80px;color:var(--success)">eher<br>wahrscheinlich</div>
          <div style="padding:8px 12px;font-weight:700;font-size:0.75rem;text-align:center;border-bottom:2px solid var(--border);min-width:80px;color:var(--danger)">eher<br>unwahrscheinlich</div>
          ${emotions.map((em, i) => `
            <div style="padding:10px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;${i % 2 ? 'background:rgba(0,0,0,0.02)' : ''}">
              <span style="font-weight:600;color:var(--text-muted)">${labels[i]}</span>
              <span>${em}</span>
            </div>
            <div class="ee-cell" style="padding:10px;text-align:center;border-bottom:1px solid var(--border);${i % 2 ? 'background:rgba(0,0,0,0.02)' : ''}">
              <button class="ee-radio" data-idx="${i}" data-val="w" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:transparent;cursor:pointer;transition:all 0.2s" onclick="App._selectEE(${i},'w')"></button>
            </div>
            <div class="ee-cell" style="padding:10px;text-align:center;border-bottom:1px solid var(--border);${i % 2 ? 'background:rgba(0,0,0,0.02)' : ''}">
              <button class="ee-radio" data-idx="${i}" data-val="u" style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:transparent;cursor:pointer;transition:all 0.2s" onclick="App._selectEE(${i},'u')"></button>
            </div>
          `).join('')}
        </div>
      </div>
      <button class="btn-primary" id="submit-ee" style="width:100%;opacity:0.5;pointer-events:none">Antworten bestätigen ✓</button>
    `;

    document.getElementById('submit-ee').onclick = () => this._submitEE(container, emotions);
  },

  _selectEE(idx, val) {
    this._eeUserAnswers[idx] = val === 'w';
    // Update radio button visuals
    document.querySelectorAll(`.ee-radio[data-idx="${idx}"]`).forEach(btn => {
      if (btn.dataset.val === val) {
        btn.style.background = val === 'w' ? 'var(--success)' : 'var(--danger)';
        btn.style.borderColor = val === 'w' ? 'var(--success)' : 'var(--danger)';
        btn.innerHTML = val === 'w' ? '✓' : '✗';
        btn.style.color = '#fff';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = '700';
      } else {
        btn.style.background = 'transparent';
        btn.style.borderColor = 'var(--border)';
        btn.innerHTML = '';
      }
    });
    // Enable submit when all answered
    const allAnswered = this._eeUserAnswers.every(a => a !== null);
    const submitBtn = document.getElementById('submit-ee');
    if (submitBtn) {
      submitBtn.style.opacity = allAnswered ? '1' : '0.5';
      submitBtn.style.pointerEvents = allAnswered ? 'auto' : 'none';
    }
  },

  _submitEE(container, emotions) {
    const data = this._eeData;
    const correctEmotions = data.correct_emotions || [];
    const userAnswers = this._eeUserAnswers;

    // Count correct answers
    let correct = 0;
    const total = Math.min(userAnswers.length, correctEmotions.length);
    for (let i = 0; i < total; i++) {
      if (userAnswers[i] === correctEmotions[i]) correct++;
    }

    const allCorrect = correct === total;
    const labels = ['A', 'B', 'C', 'D', 'E'];

    // Show results in the table
    document.querySelectorAll('.ee-radio').forEach(btn => {
      btn.style.pointerEvents = 'none';
      const idx = parseInt(btn.dataset.idx);
      const val = btn.dataset.val;
      const isCorrectAnswer = correctEmotions[idx] === (val === 'w');
      const userSelected = userAnswers[idx] === (val === 'w');

      if (isCorrectAnswer && userSelected) {
        btn.style.background = 'var(--success)';
        btn.style.borderColor = 'var(--success)';
        btn.innerHTML = '✓';
        btn.style.color = '#fff';
      } else if (!isCorrectAnswer && userSelected) {
        btn.style.background = 'var(--danger)';
        btn.style.borderColor = 'var(--danger)';
        btn.innerHTML = '✗';
        btn.style.color = '#fff';
      } else if (isCorrectAnswer && !userSelected) {
        btn.style.borderColor = 'var(--success)';
        btn.style.borderWidth = '3px';
        btn.innerHTML = '✓';
        btn.style.color = 'var(--success)';
        btn.style.fontSize = '12px';
      }
    });

    // Disable submit
    const submitBtn = document.getElementById('submit-ee');
    if (submitBtn) submitBtn.remove();

    // Show explanation
    if (data.explanation) {
      const expDiv = document.createElement('div');
      expDiv.style.cssText = 'margin-top:12px;padding:12px;background:var(--bg-card);border-radius:8px;border-left:4px solid var(--coral);font-size:0.9rem;line-height:1.5;color:var(--text)';
      expDiv.innerHTML = `<strong>Erklärung:</strong> ${data.explanation}`;
      container.appendChild(expDiv);
    }

    // Record answer
    const isCorrect = allCorrect;
    this.score += isCorrect ? 1 : 0;
    this.results.push({ correct: isCorrect });

    // Show next button
    const nextBtn = document.getElementById('q-next-btn');
    if (nextBtn) nextBtn.classList.remove('hidden');
  },

  renderSEKRanking(q, data, content, answers) {
    // SE: Soziales Entscheiden - ranking UI
    let html = `<p class="q-header-label" style="color:var(--coral)">Soziales Entscheiden</p>`;
    html += `<div class="sek-scenario" style="background:var(--coral-soft);border-left:4px solid var(--coral);padding:12px 16px;border-radius:8px;margin-bottom:12px;">`;
    html += `<p style="margin:0;line-height:1.6">${data.scenario || ''}</p>`;
    html += `</div>`;
    html += `<p class="q-text">${data.question}</p>`;
    html += `<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:8px">Ordne die Überlegungen nach ihrer Wichtigkeit (1 = wichtigste Überlegung)</p>`;
    content.innerHTML = html;

    // Build ranking interface
    this._sekUserRanking = data.options.map((_, i) => i); // Initial order: 0,1,2,3,4
    this._sekCorrectRanking = data.correct_ranking;
    this._sekData = data;
    this._renderRankingUI(answers, data.options);
  },

  _renderRankingUI(container, options) {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    container.innerHTML = `
      <div id="ranking-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
        ${this._sekUserRanking.map((optIdx, rank) => `
          <div class="ranking-item" data-rank="${rank}" style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-card);border:2px solid var(--border);border-radius:8px;cursor:grab;user-select:none">
            <span style="font-weight:700;color:var(--primary);min-width:24px">${rank + 1}.</span>
            <span style="font-weight:600;color:var(--text-muted);min-width:18px">${labels[optIdx]}</span>
            <span style="flex:1">${options[optIdx]}</span>
            <span class="rank-arrows" style="display:flex;flex-direction:column;gap:2px">
              <button class="rank-btn" data-dir="up" data-rank="${rank}" style="background:none;border:1px solid var(--border);border-radius:4px;padding:1px 6px;cursor:pointer;font-size:12px" ${rank === 0 ? 'disabled' : ''}>▲</button>
              <button class="rank-btn" data-dir="down" data-rank="${rank}" style="background:none;border:1px solid var(--border);border-radius:4px;padding:1px 6px;cursor:pointer;font-size:12px" ${rank === options.length - 1 ? 'disabled' : ''}>▼</button>
            </span>
          </div>
        `).join('')}
      </div>
      <button class="btn-primary" id="submit-ranking" style="width:100%">Reihenfolge bestätigen ✓</button>
    `;

    // Arrow button handlers
    container.querySelectorAll('.rank-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const rank = parseInt(btn.dataset.rank);
        const dir = btn.dataset.dir;
        if (dir === 'up' && rank > 0) {
          [this._sekUserRanking[rank], this._sekUserRanking[rank - 1]] = [this._sekUserRanking[rank - 1], this._sekUserRanking[rank]];
        } else if (dir === 'down' && rank < this._sekUserRanking.length - 1) {
          [this._sekUserRanking[rank], this._sekUserRanking[rank + 1]] = [this._sekUserRanking[rank + 1], this._sekUserRanking[rank]];
        }
        this._renderRankingUI(container, options);
      };
    });

    // Submit handler
    document.getElementById('submit-ranking').onclick = () => {
      this._submitRanking(container, options);
    };
  },

  _submitRanking(container, options) {
    // Calculate score: compare user ranking to correct ranking
    // User ranking: this._sekUserRanking[rank] = optionIndex at that rank position
    // Correct ranking: this._sekCorrectRanking[optionIndex] = ideal rank (0-4)

    // Convert user ranking to same format: userRanks[optionIndex] = rank
    const userRanks = new Array(5);
    for (let rank = 0; rank < this._sekUserRanking.length; rank++) {
      userRanks[this._sekUserRanking[rank]] = rank;
    }

    // Score: sum of absolute differences (lower = better)
    // Max possible diff = 0 (perfect), worst case = 2*(1+2+3+4) = 20? Actually max Kendall tau
    // MedAT uses a partial scoring system: max score when exact match, partial for close
    let totalDeviation = 0;
    for (let i = 0; i < 5; i++) {
      totalDeviation += Math.abs(userRanks[i] - this._sekCorrectRanking[i]);
    }
    // Max deviation = 12 (worst case: complete reversal)
    // Score: 1 - (deviation / 12), clamped to [0, 1]
    const score = Math.max(0, 1 - totalDeviation / 12);
    const isCorrect = totalDeviation === 0;
    const isPartial = score > 0 && !isCorrect;

    // Record as fraction of 1 point
    this.score += score;

    // Show result
    const labels = ['A', 'B', 'C', 'D', 'E'];

    // Convert correct_ranking to display order
    const correctOrder = this._sekCorrectRanking
      .map((rank, idx) => ({ rank, idx }))
      .sort((a, b) => a.rank - b.rank)
      .map(item => labels[item.idx]);

    // Disable all buttons
    container.querySelectorAll('.rank-btn').forEach(b => b.disabled = true);
    document.getElementById('submit-ranking').disabled = true;
    document.getElementById('submit-ranking').style.display = 'none';

    // Color the items
    container.querySelectorAll('.ranking-item').forEach(item => {
      const rank = parseInt(item.dataset.rank);
      const optIdx = this._sekUserRanking[rank];
      const idealRank = this._sekCorrectRanking[optIdx];
      if (rank === idealRank) {
        item.style.borderColor = 'var(--success)';
        item.style.background = 'var(--success-bg)';
      } else {
        item.style.borderColor = 'var(--danger)';
        item.style.background = 'var(--danger-bg)';
        // Show ideal position
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:0.75rem;color:var(--danger);margin-left:auto';
        badge.textContent = `(ideal: Platz ${idealRank + 1})`;
        item.appendChild(badge);
      }
    });

    // Show feedback
    const pctStr = `${Math.round(score * 100)}%`;
    const feedbackColor = isCorrect ? 'var(--success)' : isPartial ? 'var(--warning)' : 'var(--danger)';
    const feedbackIcon = isCorrect ? ICONS.checkCircle : isPartial ? '~' : '✗';
    const feedbackText = isCorrect ? 'Perfekt!' : isPartial ? `Teilpunkte: ${pctStr}` : 'Leider keine Punkte.';

    const fb = document.getElementById('q-feedback');
    fb.classList.remove('hidden', 'correct-fb', 'incorrect-fb');
    fb.classList.add(isCorrect ? 'correct-fb' : 'incorrect-fb');
    document.getElementById('q-feedback-icon').innerHTML = feedbackIcon;
    document.getElementById('q-feedback-text').textContent = feedbackText;
    document.getElementById('q-feedback-detail').textContent = `Ideale Reihenfolge: ${correctOrder.join(' > ')}`;
    document.getElementById('q-feedback-explanation').textContent = this._sekData.explanation || '';

    this.results.push({ correct: isCorrect, timeTaken: Math.round((Date.now() - this.questionStartTime) / 1000), score });
    this.currentIndex++;

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-primary';
    nextBtn.style.cssText = 'width:100%;margin-top:8px';
    nextBtn.textContent = 'Weiter →';
    nextBtn.onclick = () => this.renderQuestion();
    container.appendChild(nextBtn);
  },

  // ===== COUNTDOWN TIMER =====
  startCountdown(totalSeconds) {
    this.stopCountdown();
    this.countdownSeconds = totalSeconds;
    this.updateCountdownDisplay();

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      this.updateCountdownDisplay();

      if (this.countdownSeconds <= 0) {
        this.stopCountdown();
        if (this.mode === 'simulation') {
          this.finishSection();
        } else {
          this.finishPractice();
        }
      }
    }, 1000);
  },

  stopCountdown() {
    clearInterval(this.countdownTimer);
    this.countdownTimer = null;
  },

  updateCountdownDisplay() {
    const el = document.getElementById('q-countdown');
    if (!el) return;
    const m = Math.floor(this.countdownSeconds / 60);
    const s = this.countdownSeconds % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (this.countdownSeconds <= 60 && this.countdownSeconds > 0) {
      el.classList.add('urgent');
    } else {
      el.classList.remove('urgent');
    }
  },

  // ===== QUESTION RENDERING =====
  renderQuestion() {
    if (this.currentIndex >= this.questions.length) {
      if (this.mode === 'simulation') this.finishSection();
      else this.finishPractice();
      return;
    }

    const q = this.questions[this.currentIndex];
    const data = q.content;
    const total = this.questions.length;

    // Progress
    document.getElementById('q-progress-fill').style.width = `${((this.currentIndex + 1) / total) * 100}%`;
    document.getElementById('q-progress-text').textContent = `${this.currentIndex + 1} / ${total}`;

    // Hide feedback and clear ALL extra fields (prevents cross-section leaking)
    document.getElementById('q-feedback').classList.add('hidden');
    document.getElementById('q-feedback').classList.remove('correct-fb', 'incorrect-fb');
    document.getElementById('q-feedback-detail').textContent = '';
    document.getElementById('q-feedback-explanation').textContent = '';
    const qExplEl = document.getElementById('q-explanation');
    if (qExplEl) qExplEl.textContent = '';
    const qFeedbackText = document.getElementById('q-feedback-text');
    if (qFeedbackText) qFeedbackText.textContent = '';
    const eulerDiagrams = document.getElementById('q-euler-diagrams');
    if (eulerDiagrams) { eulerDiagrams.classList.add('hidden'); eulerDiagrams.innerHTML = ''; }

    const content = document.getElementById('q-content');
    const answers = document.getElementById('q-answers');

    const dbType = q.type;

    if (dbType === 'figur' && data.pieces) {
      this.renderFiguren(q, data, content, answers);
    } else if (dbType === 'textverstaendnis' && this._tvTexts) {
      this.renderTextverstaendnis(q, data, content, answers);
    } else if (dbType === 'zahlenfolge' && data.sequence) {
      this.renderZahlenfolge(data, content, answers);
    } else if (dbType === 'implikation' && data.premise1) {
      this.renderImplikation(data, content, answers);
    } else if ((dbType === 'wortflüssigkeit' || dbType === 'wortfluessigkeit') && data.word) {
      this.renderWortfluessigkeit(data, content, answers);
    } else if (dbType === 'allergieausweis_frage') {
      this.renderAllergieausweis(q, data, content, answers);
    } else if (dbType === 'sek_se' && data.correct_ranking) {
      this.renderSEKRanking(q, data, content, answers);
    } else if ((dbType === 'sek_ee' || dbType === 'sek_er') && data.scenario) {
      this.renderSEKEmotionen(q, data, content, answers);
    } else {
      // BMS + generic multiple choice
      this.renderMultipleChoice(q, data, content, answers);
    }

    // Show scratchpad button for all sections
    Scratchpad.show();

    this.questionStartTime = Date.now();
  },

  // === Figuren zusammensetzen ===
  renderFiguren(q, data, content, answers) {
    const rendered = FigurenGenerator.renderQuestion(data);

    content.innerHTML = `
      <p class="q-header-label">Figuren zusammensetzen</p>
      <p class="q-text" style="margin-bottom:0.5rem;">Welche Figur lässt sich aus den folgenden Teilen zusammensetzen?</p>
      ${rendered.piecesHTML}
    `;

    answers.innerHTML = rendered.optionsHTML;

    // Add click handlers
    const options = answers.querySelectorAll('.figur-option');
    options.forEach(opt => {
      opt.onclick = () => {
        if (opt.classList.contains('disabled')) return;

        // Remove previous selection
        options.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');

        const selectedIdx = parseInt(opt.dataset.idx);
        const isCorrect = selectedIdx === data.correct;

        // Disable all after selection
        setTimeout(() => {
          options.forEach(o => {
            o.classList.add('disabled');
            o.style.pointerEvents = 'none';
            const idx = parseInt(o.dataset.idx);
            if (idx === data.correct) {
              o.classList.add('correct-answer');
            } else if (idx === selectedIdx && !isCorrect) {
              o.classList.add('incorrect-answer');
            }
          });

          // Show feedback
          const fb = document.getElementById('q-feedback');
          fb.classList.remove('hidden', 'correct-fb', 'incorrect-fb');
          fb.classList.add(isCorrect ? 'correct-fb' : 'incorrect-fb');

          const labels = ['A', 'B', 'C', 'D', 'E'];
          document.getElementById('q-feedback-detail').textContent =
            isCorrect ? '✓ Richtig!' : `✗ Falsch – Richtige Antwort: ${labels[data.correct]}`;

          // === Show assembled figure with cut lines + tips ===
          const solutionSVG = FigurenGenerator.renderSolution(data);
          const tips = FigurenGenerator.generateTips(data, isCorrect);

          let explanationHTML = '<div class="figur-feedback-detail">';

          // Solution display
          explanationHTML += '<div class="figur-solution-section">';
          explanationHTML += '<p class="figur-solution-title">So setzt sich die Figur zusammen:</p>';
          explanationHTML += solutionSVG;
          explanationHTML += '<p class="figur-solution-caption">' + data.numPieces + ' Teile → Figur ' + labels[data.correct] + ' · <span style="opacity:0.7">Gestrichelte Linien = Schnittkanten</span></p>';
          explanationHTML += '</div>';

          // Tips
          if (tips.length > 0) {
            explanationHTML += '<div class="figur-tips">';
            explanationHTML += '<p class="figur-tips-title">' + (isCorrect ? 'Weiter so!' : 'Tipps für nächstes Mal:') + '</p>';
            for (const tip of tips) {
              explanationHTML += '<div class="figur-tip-item">' + tip + '</div>';
            }
            explanationHTML += '</div>';
          }

          explanationHTML += '</div>';

          const explEl = document.getElementById('q-feedback-explanation');
          explEl.innerHTML = explanationHTML;

          // Record result
          this.score += isCorrect ? 1 : 0;
          const figTimeSec = Math.round((Date.now() - this.questionStartTime) / 1000);
          this.results.push({
            questionId: q.id,
            correct: isCorrect,
            timeTaken: figTimeSec,
            selected: selectedIdx,
            correctAnswer: data.correct
          });

          // Save progress (no DB question id for generated questions)
          if (typeof API !== 'undefined' && API.saveProgress) {
            API.saveProgress(q.id || 'figur_gen', isCorrect, Date.now() - this.questionStartTime).catch(() => {});
          }
        }, 150);
      };
    });
  },

  renderTextverstaendnis(q, data, content, answers) {
    const textIdx = q._tvTextIdx;
    const text = this._tvTexts[textIdx];
    const qIdx = q._tvQuestionIdx;

    // Show text title, text content (collapsible if not the first question of this text), and question
    const isFirstQuestionOfText = qIdx === 0;
    const textLabel = `Text ${textIdx + 1}: ${text.title}`;

    content.innerHTML = `
      <p class="q-header-label">Textverständnis</p>
      <div class="tv-text-section">
        <div class="tv-text-title">${textLabel}</div>
        <div class="tv-text-body${isFirstQuestionOfText ? '' : ' tv-collapsed'}" id="tv-text-body">
          ${text.content.split('\n').map(p => `<p>${p}</p>`).join('')}
        </div>
        ${!isFirstQuestionOfText ? '<button class="tv-toggle-btn" id="tv-toggle-btn">Text anzeigen ▼</button>' : ''}
      </div>
      <div class="tv-question-label">Frage ${qIdx + 1} von ${text.questions.length} zu diesem Text</div>
      <p class="q-text">${data.question}</p>
    `;

    // Toggle button for collapsed text
    if (!isFirstQuestionOfText) {
      const toggleBtn = document.getElementById('tv-toggle-btn');
      const textBody = document.getElementById('tv-text-body');
      if (toggleBtn && textBody) {
        toggleBtn.onclick = () => {
          textBody.classList.toggle('tv-collapsed');
          toggleBtn.textContent = textBody.classList.contains('tv-collapsed') ? 'Text anzeigen ▼' : 'Text verbergen ▲';
        };
      }
    }

    this._renderMCButtons(data.options, answers, data);
  },

  renderZahlenfolge(data, content, answers) {
    let html = '<p class="q-header-label">Ergänze die fehlenden Zahlen</p>';
    html += '<div class="sequence-display">';
    data.sequence.forEach((num, i) => {
      html += num === null
        ? '<span class="seq-num seq-blank">?</span>'
        : `<span class="seq-num">${num}</span>`;
      if (i < data.sequence.length - 1) html += '<span class="seq-arrow">→</span>';
    });
    html += '</div>';
    content.innerHTML = html;

    const blanks = data.sequence.filter(n => n === null).length;
    let ah = '<div class="input-row">';
    for (let i = 0; i < blanks; i++) {
      ah += `<input type="number" class="seq-input" id="ans-${i}" placeholder="?" autocomplete="off">`;
    }
    ah += `<button class="btn-primary" id="submit-seq">Prüfen ✓</button></div>`;
    answers.innerHTML = ah;

    setTimeout(() => document.getElementById('ans-0')?.focus(), 100);

    answers.querySelectorAll('.seq-input').forEach(inp => {
      inp.onkeydown = e => { if (e.key === 'Enter') document.getElementById('submit-seq').click(); };
    });

    document.getElementById('submit-seq').onclick = () => {
      const ua = [];
      for (let i = 0; i < blanks; i++) { const inp = document.getElementById(`ans-${i}`); ua.push(inp ? Number(inp.value) : 0); }
      const correct = JSON.stringify(ua) === JSON.stringify(data.solution);
      this.handleAnswer(correct, data.pattern_description || data.explanation || '');
    };
  },

  renderImplikation(data, content, answers) {
    content.innerHTML = `
      <p class="q-header-label">Welche Schlussfolgerung ist korrekt?</p>
      <div class="premise-box">
        <div class="premise"><span class="premise-label">P1:</span> ${data.premise1}</div>
        <div class="premise"><span class="premise-label">P2:</span> ${data.premise2}</div>
      </div>
    `;
    const opts = data.answer_options || data.options || [];
    this._renderMCButtons(opts, answers, data);
  },

  renderWortfluessigkeit(data, content, answers) {
    // MedAT-style: show anagram, ask for first letter of the solution word
    const word = (data.word || '').toUpperCase();
    const anagram = this._scrambleWord(word);
    const firstLetter = word.charAt(0);

    content.innerHTML = `
      <p class="q-header-label">Welcher Buchstabe ist der Anfangsbuchstabe des Lösungswortes?</p>
      <div class="anagram-display">${anagram.split('').map(c => `<span class="anagram-letter">${c}</span>`).join('')}</div>
      <p class="hint-text">Bilde ein sinnvolles deutsches Substantiv aus diesen Buchstaben</p>
    `;

    // Generate answer options: correct first letter + 3 wrong + "Keine"
    // Sometimes (20% chance) don't include the correct letter → "Keine" is correct
    const keineCorrect = Math.random() < 0.2;
    const allLetters = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split('');
    const wrongLetters = allLetters.filter(l => l !== firstLetter).sort(() => Math.random() - 0.5);

    let options, correctIdx;
    if (keineCorrect) {
      options = wrongLetters.slice(0, 4);
      options.push('Keine der Antwortmöglichkeiten ist richtig');
      correctIdx = 4;
    } else {
      options = [firstLetter, ...wrongLetters.slice(0, 3)];
      // Shuffle the 4 letters
      for (let i = 3; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      correctIdx = options.indexOf(firstLetter);
      options.push('Keine der Antwortmöglichkeiten ist richtig');
    }

    // Store for answer handling
    data._wfCorrectIdx = correctIdx;
    data._wfSolutionWord = word;

    answers.innerHTML = options.map((opt, i) => {
      const label = i < 4 ? opt : 'E';
      const cssClass = i === 4 ? ' wf-keine-option' : '';
      return `<button class="answer-btn${cssClass}" data-idx="${i}">
        <span class="answer-label">${label}</span>
        <span class="answer-text">${i === 4 ? opt : `Buchstabe ${opt}`}</span>
      </button>`;
    }).join('');

    answers.querySelectorAll('.answer-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        const isCorrect = idx === correctIdx;

        answers.querySelectorAll('.answer-btn').forEach(b => {
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === correctIdx) b.classList.add('correct');
          else b.classList.add('faded');
          b.disabled = true;
        });
        if (!isCorrect) btn.classList.add('incorrect');

        const explanation = `Das Lösungswort ist: ${word}\nAnfangsbuchstabe: ${firstLetter}`;
        this.handleAnswer(isCorrect, explanation);
      };
    });
  },

  _scrambleWord(word) {
    const arr = word.split('');
    // Fisher-Yates shuffle, ensure it's different from original
    let scrambled;
    let attempts = 0;
    do {
      scrambled = [...arr];
      for (let i = scrambled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }
      attempts++;
    } while (scrambled.join('') === word && attempts < 20);
    return scrambled.join('');
  },

  renderAllergieausweis(q, data, content, answers) {
    const subtypes = { ablesen: 'Ablesen', kreuzallergie: 'Kreuzallergie', interaktion: 'Interaktion', notfall: 'Notfall', abruf: 'Abruf' };
    const tag = q.subtype && subtypes[q.subtype] ? `<span class="subject-tag" style="background:var(--lavender-deep)">${subtypes[q.subtype]}</span>` : '';

    let img = '';
    const imgSrc = data.image_url || data.image;
    if (imgSrc) {
      img = `<div class="allergieausweis-image"><img src="${imgSrc}" alt="Allergieausweis"
        onerror="this.parentElement.innerHTML='<div class=\\'placeholder-image\\'>Allergieausweis</div>'"></div>`;
    }

    content.innerHTML = `${tag}${img}<p class="q-text">${data.question}</p>`;
    this._renderMCButtons(data.answer_options || data.options || [], answers, data);
  },

  renderMultipleChoice(q, data, content, answers) {
    const colors = { biologie: '#6db88a', chemie: '#9b7fc4', physik: '#5ba3c9', mathematik: '#e0a820' };
    const labels = { biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik' };
    const tag = q.subtype && labels[q.subtype]
      ? `<span class="subject-tag" style="background:${colors[q.subtype] || '#6b7280'}">${labels[q.subtype]}</span>`
      : '';

    content.innerHTML = `${tag}<p class="q-text">${data.question}</p>`;
    this._renderMCButtons(data.options || data.answer_options || [], answers, data);
  },

  _renderMCButtons(options, container, data) {
    // Normalize options: convert object {"A":"...","B":"..."} to array ["...","..."]
    if (options && typeof options === 'object' && !Array.isArray(options)) {
      const keys = Object.keys(options).sort();
      options = keys.map(k => options[k]);
    }
    if (!Array.isArray(options)) options = [];

    // Determine original correct index
    let origCorrectIdx = -1;
    if (typeof data.correct === 'number') {
      origCorrectIdx = data.correct;
    } else if (typeof data.correct_answer === 'string') {
      origCorrectIdx = data.correct_answer.toLowerCase().charCodeAt(0) - 97;
    }

    // Separate "Keine der Antwortmöglichkeiten" — always stays as last option (E)
    const keineText = 'Keine der Antwortmöglichkeiten ist richtig';
    const keineIdx = options.findIndex(o => typeof o === 'string' && o.startsWith('Keine der Antwortmöglichkeiten'));
    let keineItem = null;
    const shuffleable = options.map((opt, i) => ({ opt, origIdx: i }));
    if (keineIdx >= 0) {
      keineItem = shuffleable.splice(keineIdx, 1)[0];
    }

    // Shuffle only the non-"Keine" options
    for (let i = shuffleable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleable[i], shuffleable[j]] = [shuffleable[j], shuffleable[i]];
    }

    // Re-append "Keine" at the end
    const indexed = keineItem ? [...shuffleable, keineItem] : shuffleable;
    const newCorrectIdx = indexed.findIndex(item => item.origIdx === origCorrectIdx);

    container.innerHTML = indexed.map((item, i) => {
      const label = String.fromCharCode(65 + i);
      return `<button class="answer-btn" data-idx="${i}">
        <span class="answer-label">${label}</span>
        <span class="answer-text">${item.opt}</span>
      </button>`;
    }).join('');

    container.querySelectorAll('.answer-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        const isCorrect = idx === newCorrectIdx;

        // Store user's original answer index for TV analysis
        const q = this.questions[this.currentIndex];
        if (q && q.type === 'textverstaendnis' && this._tvTexts) {
          if (!this._tvUserAnswers) this._tvUserAnswers = {};
          const key = `${q._tvTextIdx}-${q._tvQuestionIdx}`;
          // Map shuffled index back to original option index
          this._tvUserAnswers[key] = indexed[idx].origIdx;
        }

        // Highlight
        container.querySelectorAll('.answer-btn').forEach(b => {
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === newCorrectIdx) b.classList.add('correct');
          else b.classList.add('faded');
          b.disabled = true;
        });
        if (!isCorrect) btn.classList.add('incorrect');

        this.handleAnswer(isCorrect, data.explanation || '');
      };
    });
  },

  // ===== ANSWER HANDLING =====
  handleAnswer(correct, explanation) {
    const timeTaken = Math.round((Date.now() - this.questionStartTime) / 1000);
    if (correct) this.score++;
    this.results.push({ correct, timeTaken });

    // Track wrong answers for infographic generation at the end
    if (!correct && this.mode === 'practice') {
      const q = this.questions[this.currentIndex];
      const data = q.content;
      this.wrongAnswers.push({
        question: q,
        topic: data.question || data.premise1 || data.word || `Zahlenfolge: ${data.pattern_description || ''}`,
        correctAnswer: this._getCorrectAnswerText(data),
        explanation: explanation,
        type: q.type,
      });
    }

    // Feedback
    const fb = document.getElementById('q-feedback');
    fb.classList.remove('hidden', 'correct-fb', 'incorrect-fb');
    fb.classList.add(correct ? 'correct-fb' : 'incorrect-fb');
    document.getElementById('q-feedback-icon').innerHTML = correct ? ICONS.checkCircle : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle opacity="0.2" fill="currentColor" cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
    document.getElementById('q-feedback-text').textContent = correct ? 'Richtig!' : 'Leider falsch.';
    document.getElementById('q-explanation').textContent = explanation;

    // Euler/Venn diagrams for Implikationen questions
    const eulerContainer = document.getElementById('q-euler-diagrams');
    if (eulerContainer) {
      const currentQ = this.questions[this.currentIndex];
      if (currentQ && currentQ.type === 'implikation' && currentQ.content) {
        const d = currentQ.content;
        if (d.premise1 && d.premise2) {
          this._renderEulerDiagrams(d.premise1, d.premise2);
        } else {
          eulerContainer.classList.add('hidden');
        }
      } else {
        eulerContainer.classList.add('hidden');
      }
    }

    // Next button text
    const nextBtn = document.getElementById('q-next-btn');
    nextBtn.textContent = this.currentIndex >= this.questions.length - 1 ? 'Ergebnis anzeigen' : 'Nächste Frage →';

    // Save progress (with BMS wrong answer details for Phase 3)
    const q = this.questions[this.currentIndex];
    const progressData = { question_id: q.id, answered_correctly: correct, time_taken_seconds: timeTaken };

    // Phase 3: Track wrong BMS answers with extra detail
    if (!correct && this._isBMSQuestion(q)) {
      progressData.wrong_answer_detail = JSON.stringify({
        question: q.content?.question || '',
        correctAnswer: this._getCorrectAnswerText(q.content),
        subject: q.subtype || 'bms',
        explanation: explanation || '',
      });
    }

    API.saveProgress(progressData, this.currentSectionKey).catch(() => {});

    // Deduct 1 credit per answered question
    Credits.use(1, 'question', this.currentSectionKey || 'practice');

    // Auto-scroll to feedback
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * Check if question is BMS type (Biologie, Chemie, Physik, Mathematik)
   */
  _isBMSQuestion(q) {
    const bmsTypes = ['biologie', 'chemie', 'physik', 'mathematik', 'bms'];
    return bmsTypes.includes(q.type) || bmsTypes.includes(q.subtype);
  },

  _getCorrectAnswerText(data) {
    // Helper to normalize options object to array
    const normalizeOpts = (o) => {
      if (o && typeof o === 'object' && !Array.isArray(o)) {
        return Object.keys(o).sort().map(k => o[k]);
      }
      return Array.isArray(o) ? o : [];
    };
    if (typeof data.correct === 'number') {
      const opts = normalizeOpts(data.options || data.answer_options);
      return opts[data.correct] || '';
    }
    if (typeof data.correct_answer === 'string') {
      const idx = data.correct_answer.toLowerCase().charCodeAt(0) - 97;
      const opts = normalizeOpts(data.answer_options || data.options);
      return opts[idx] || data.correct_answer;
    }
    if (data._wfSolutionWord) return `${data._wfSolutionWord} (Anfangsbuchstabe: ${data._wfSolutionWord.charAt(0)})`;
    if (data.solution) return data.solution.join(', ');
    return '';
  },

  // ===== EULER / VENN DIAGRAMS FOR IMPLIKATIONEN =====

  /**
   * Render Euler/Venn diagrams in the feedback area after an Implikationen question.
   * Shows all possible Mengenbeziehungen for each premise.
   */
  _renderEulerDiagrams(premise1, premise2) {
    const container = document.getElementById('q-euler-diagrams');
    if (!container) return;

    // Parse a premise to extract quantifier, subject, predicate
    // Uses German capitalization: nouns are Capitalized, verbs are lowercase mid-sentence
    const parsePremise = (p) => {
      // "Einige ... nicht/keine" pattern
      const mNot = p.match(/^Einige\s+(.+?)\s+(?:[a-zäöüß]\S*)\s+(?:keine?n?|nicht)\s+(.+?)[\.\,]?\s*$/);
      if (mNot) return { quant: 'einige_nicht', subj: mNot[1].trim(), pred: mNot[2].trim() };
      // General: Alle/Einige/Keine + Subject + verb + Predicate
      const m = p.match(/^(Alle|Einige|Kein[e]?)\s+(.+?)\s+(?:[a-zäöüß]\S*)\s+(.+?)[\.\,]?\s*$/);
      if (!m) return null;
      let quant = m[1].toLowerCase();
      if (quant.startsWith('kein')) quant = 'keine';
      return { quant, subj: m[2].trim(), pred: m[3].trim() };
    };

    // Generate SVG for a single Euler diagram — bigger, clearer, app colors
    const makeSVG = (type, subjLabel, predLabel) => {
      const W = 140, H = 100;
      const cx = W / 2, cy = H / 2 + 2;
      // App palette: Gold for A, Lavender for B
      const colA = '#d4a017';  // deep gold
      const colB = '#7b5ea7';  // deep lavender
      const fillA = 'rgba(245,197,66,0.25)';
      const fillB = 'rgba(155,127,196,0.25)';
      const strokeW = 2.5;
      const fontSm = 10;
      const fontLg = 11;

      let circles = '';
      let labels = '';

      const sL = subjLabel.length > 10 ? subjLabel.substring(0, 9) + '…' : subjLabel;
      const pL = predLabel.length > 10 ? predLabel.substring(0, 9) + '…' : predLabel;

      switch (type) {
        case 'ausschliessend': {
          circles = `
            <circle cx="${cx - 28}" cy="${cy}" r="25" fill="${fillA}" stroke="${colA}" stroke-width="${strokeW}"/>
            <circle cx="${cx + 28}" cy="${cy}" r="25" fill="${fillB}" stroke="${colB}" stroke-width="${strokeW}"/>`;
          labels = `
            <text x="${cx - 28}" y="${cy + 4}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colA}" font-family="system-ui,sans-serif">${sL}</text>
            <text x="${cx + 28}" y="${cy + 4}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colB}" font-family="system-ui,sans-serif">${pL}</text>`;
          break;
        }
        case 'schnittmenge': {
          circles = `
            <circle cx="${cx - 16}" cy="${cy}" r="28" fill="${fillA}" stroke="${colA}" stroke-width="${strokeW}"/>
            <circle cx="${cx + 16}" cy="${cy}" r="28" fill="${fillB}" stroke="${colB}" stroke-width="${strokeW}"/>`;
          labels = `
            <text x="${cx - 27}" y="${cy + 4}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colA}" font-family="system-ui,sans-serif">${sL}</text>
            <text x="${cx + 27}" y="${cy + 4}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colB}" font-family="system-ui,sans-serif">${pL}</text>`;
          break;
        }
        case 'teilmenge': {
          circles = `
            <circle cx="${cx}" cy="${cy}" r="35" fill="${fillB}" stroke="${colB}" stroke-width="${strokeW}"/>
            <circle cx="${cx}" cy="${cy + 4}" r="18" fill="${fillA}" stroke="${colA}" stroke-width="${strokeW}"/>`;
          labels = `
            <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colA}" font-family="system-ui,sans-serif">${sL}</text>
            <text x="${cx}" y="${cy - 24}" text-anchor="middle" font-size="${fontLg}" font-weight="700" fill="${colB}" font-family="system-ui,sans-serif">${pL}</text>`;
          break;
        }
        case 'obermenge': {
          circles = `
            <circle cx="${cx}" cy="${cy}" r="35" fill="${fillA}" stroke="${colA}" stroke-width="${strokeW}"/>
            <circle cx="${cx}" cy="${cy + 4}" r="18" fill="${fillB}" stroke="${colB}" stroke-width="${strokeW}"/>`;
          labels = `
            <text x="${cx}" y="${cy - 24}" text-anchor="middle" font-size="${fontLg}" font-weight="700" fill="${colA}" font-family="system-ui,sans-serif">${sL}</text>
            <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colB}" font-family="system-ui,sans-serif">${pL}</text>`;
          break;
        }
        case 'gleich': {
          circles = `
            <circle cx="${cx}" cy="${cy}" r="32" fill="${fillA}" stroke="${colA}" stroke-width="${strokeW}"/>
            <circle cx="${cx}" cy="${cy}" r="28" fill="none" stroke="${colB}" stroke-width="${strokeW}" stroke-dasharray="6 4"/>`;
          labels = `
            <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="${fontLg}" font-weight="700" fill="${colA}" font-family="system-ui,sans-serif">${sL}</text>
            <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="${fontSm}" font-weight="700" fill="${colB}" font-family="system-ui,sans-serif">= ${pL}</text>`;
          break;
        }
      }

      return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block">${circles}${labels}</svg>`;
    };

    // Map quantifier → possible diagram types
    const diagramsForQuant = {
      'alle':          [{ type: 'teilmenge', label: 'Teilmenge' }],
      'einige':        [{ type: 'schnittmenge', label: 'Schnittmenge' },
                        { type: 'teilmenge', label: 'Teilmenge' },
                        { type: 'obermenge', label: 'Obermenge' },
                        { type: 'gleich', label: 'Gleich' }],
      'keine':         [{ type: 'ausschliessend', label: 'Ausschließend' }],
      'einige_nicht':  [{ type: 'schnittmenge', label: 'Schnittmenge' },
                        { type: 'ausschliessend', label: 'Ausschließend' },
                        { type: 'obermenge', label: 'Obermenge' }],
    };

    const renderPremiseSection = (premise, idx) => {
      const parsed = parsePremise(premise);
      if (!parsed) return '';
      const diagrams = diagramsForQuant[parsed.quant] || [];
      if (diagrams.length === 0) return '';

      const quantLabel = parsed.quant === 'einige_nicht' ? 'EINIGE … NICHT' : parsed.quant.toUpperCase();

      const optionsHtml = diagrams.map(d =>
        `<div class="euler-option">
          ${makeSVG(d.type, parsed.subj, parsed.pred)}
          <span class="euler-option-label">${d.label}</span>
        </div>`
      ).join('');

      return `
        <div class="euler-section">
          <div class="euler-premise-text">
            <span class="euler-label">Prämisse ${idx}</span>
            „${premise}"
            <span class="euler-quant-badge">${quantLabel} → ${diagrams.length} ${diagrams.length === 1 ? 'Darstellung' : 'Darstellungen'}</span>
          </div>
          <div class="euler-options-row">
            ${optionsHtml}
          </div>
        </div>`;
    };

    const html = renderPremiseSection(premise1, 1) + renderPremiseSection(premise2, 2);

    if (html) {
      container.innerHTML = html;
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  },

  nextQuestion() {
    this.currentIndex++;
    this.renderQuestion();
  },

  // ===== PRACTICE FINISH =====
  finishPractice() {
    this.stopCountdown();
    this._markDailyDone(); // Daily Challenge als erledigt markieren (falls aktiv)

    // Clear TV state if current section is NOT TV (prevents TV data leaking into other results)
    const currentType = this.questions?.[0]?.type;
    if (currentType !== 'textverstaendnis') {
      this._tvTexts = null;
      this._tvUserAnswers = {};
      this._tvAnalysisData = null;
    }

    this.showResult(this.score, this.questions.length, this.results);

    // Start generating infographics in background for wrong answers
    if (this.wrongAnswers.length > 0 && this.mode === 'practice') {
      this._startInfographicGeneration();
    }
  },

  // ===== INFOGRAPHIC BACKGROUND GENERATION =====
  _startInfographicGeneration() {
    const container = document.getElementById('result-infographics');
    const loadingEl = document.getElementById('infographics-loading');
    const infContainer = document.getElementById('infographics-container');

    if (!container || !loadingEl || !infContainer) return;

    container.classList.remove('hidden');
    loadingEl.classList.remove('hidden');
    infContainer.innerHTML = '';

    this._infographicQueue = [...this.wrongAnswers].slice(0, 5); // Max 5
    this._infographicResults = [];
    this._infographicGenerating = true;

    this._processNextInfographic();
  },

  async _processNextInfographic() {
    if (this._infographicQueue.length === 0) {
      this._infographicGenerating = false;
      const loadingEl = document.getElementById('infographics-loading');
      if (loadingEl) loadingEl.classList.add('hidden');

      if (this._infographicResults.length === 0) {
        const container = document.getElementById('result-infographics');
        if (container) container.classList.add('hidden');
      }
      return;
    }

    const item = this._infographicQueue.shift();

    try {
      const url = `${CONFIG.SUPABASE_URL}/functions/v1/generate-explanation-image`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          session_id: CONFIG.getSessionId(),
          topic: item.topic,
          wrong_answer: '',
          correct_answer: item.correctAnswer,
          question_type: item.type,
          question_context: item.explanation,
        }),
      });

      if (response.status === 429) {
        // Rate limited - show message and stop
        this._showInfographicItem(item, null, 'Tageslimit für Infografiken erreicht (5/Tag).');
        this._infographicQueue = []; // Stop further requests
      } else if (response.ok) {
        const data = await response.json();
        this._showInfographicItem(item, data, null);
      }
    } catch (err) {
      console.warn('Infographic generation failed:', err);
    }

    // Process next
    this._processNextInfographic();
  },

  _showInfographicItem(item, data, errorMsg) {
    const infContainer = document.getElementById('infographics-container');
    if (!infContainer) return;

    const div = document.createElement('div');
    div.className = 'infographic-card';

    const topicShort = item.topic.length > 80 ? item.topic.substring(0, 80) + '...' : item.topic;

    if (errorMsg) {
      div.innerHTML = `
        <div class="infographic-card-header">${topicShort}</div>
        <p class="infographic-card-msg">${errorMsg}</p>
      `;
    } else if (data && data.image) {
      div.innerHTML = `
        <div class="infographic-card-header">${topicShort}</div>
        <img src="${data.image}" alt="Infografik" class="infographic-card-img">
        <p class="infographic-card-answer">Richtige Antwort: <strong>${item.correctAnswer}</strong></p>
      `;
      this._infographicResults.push(data);
    } else if (data && data.text_explanation) {
      div.innerHTML = `
        <div class="infographic-card-header">${topicShort}</div>
        <p class="infographic-card-text">${data.text_explanation}</p>
        <p class="infographic-card-answer">Richtige Antwort: <strong>${item.correctAnswer}</strong></p>
      `;
    }

    infContainer.appendChild(div);
  },

  showResult(score, total, results) {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;

    // Circle animation
    const circ = document.getElementById('res-circle');
    const circumference = 2 * Math.PI * 52;
    circ.style.strokeDasharray = circumference;
    circ.style.strokeDashoffset = circumference;
    circ.style.stroke = pct >= 80 ? '#2d8a54' : pct >= 50 ? '#e0a820' : '#dc2626';
    setTimeout(() => { circ.style.strokeDashoffset = circumference - (pct / 100) * circumference; }, 100);

    document.getElementById('res-pct').textContent = `${pct}%`;
    document.getElementById('res-score').textContent = `${score} von ${total} richtig`;

    const resultIcon = pct >= 80 ? ICONS.trophy : pct >= 50 ? ICONS.checkCircle : ICONS.chartUp;
    const msg = pct >= 80 ? 'Ausgezeichnet!' : pct >= 50 ? 'Gut gemacht!' : 'Weiter üben!';
    document.getElementById('res-msg').innerHTML = `<span class="result-msg-icon">${resultIcon}</span> ${msg}`;

    // Stats
    const avgTime = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.timeTaken, 0) / results.length)
      : 0;

    document.getElementById('res-stats').innerHTML = `
      <div class="stat-box"><div class="stat-val">${avgTime}s</div><div class="stat-lbl">Ø pro Frage</div></div>
      <div class="stat-box"><div class="stat-val">${score}</div><div class="stat-lbl">Richtig</div></div>
      <div class="stat-box"><div class="stat-val">${total - score}</div><div class="stat-lbl">Falsch</div></div>
    `;

    document.getElementById('result-title').innerHTML = this.mode === 'simulation' ? `${ICONS.clock} Simulationsergebnis` : `${ICONS.barChart} Übungsergebnis`;

    // Reset infographic area
    const infArea = document.getElementById('result-infographics');
    if (infArea) infArea.classList.add('hidden');
    const infContainer = document.getElementById('infographics-container');
    if (infContainer) infContainer.innerHTML = '';

    // Simulation block results
    const simBlocksEl = document.getElementById('sim-result-blocks');
    if (this.mode === 'simulation' && Object.keys(this.simResults).length > 0) {
      simBlocksEl.classList.remove('hidden');
      let bhtml = '<h3 style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;text-align:center">Ergebnis pro Block</h3>';
      for (const [bId, sections] of Object.entries(this.simResults)) {
        const block = CONFIG.TEST_BLOCKS[bId];
        if (!block) continue;
        let blockScore = 0, blockTotal = 0;
        for (const sec of Object.values(sections)) {
          blockScore += sec.score;
          blockTotal += sec.total;
        }
        const bPct = blockTotal > 0 ? Math.round((blockScore / blockTotal) * 100) : 0;
        const weighted = (bPct / 100 * block.weight).toFixed(1);
        bhtml += `<div class="sim-result-block" style="border-left-color:${block.color}">
          <span class="srb-info"><span class="block-icon-inline">${ICONS.block(block.icon, 16, 1.75)}</span> ${block.label} (${block.weight}%)</span>
          <span class="srb-score">${blockScore}/${blockTotal} = ${bPct}% → ${weighted}P</span>
        </div>`;
      }
      // Total weighted score
      let totalWeighted = 0;
      for (const [bId, sections] of Object.entries(this.simResults)) {
        const block = CONFIG.TEST_BLOCKS[bId];
        if (!block) continue;
        let blockScore = 0, blockTotal = 0;
        for (const sec of Object.values(sections)) { blockScore += sec.score; blockTotal += sec.total; }
        totalWeighted += blockTotal > 0 ? (blockScore / blockTotal) * block.weight : 0;
      }
      bhtml += `<div class="sim-result-block" style="border-left-color:var(--primary);border-left-width:4px;font-size:1.05rem">
        <span class="srb-info">Gesamtergebnis</span>
        <span class="srb-score" style="color:var(--primary)">${totalWeighted.toFixed(1)} / 100 Punkte</span>
      </div>`;
      simBlocksEl.innerHTML = bhtml;
    } else {
      simBlocksEl.classList.add('hidden');
    }

    // TV Analysis: Show button if TV questions were answered
    const tvSection = document.getElementById('tv-analysis-section');
    const tvResult = document.getElementById('tv-analysis-result');
    const tvLoading = document.getElementById('tv-analysis-loading');
    if (tvSection) {
      tvSection.classList.add('hidden');
      tvResult.classList.add('hidden');
      tvResult.innerHTML = '';
      tvLoading.classList.add('hidden');

      if (this._tvTexts && this._tvTexts.length > 0) {
        tvSection.classList.remove('hidden');

        // Enrich TV texts with user answers
        this._tvAnalysisData = this._tvTexts.map((text, textIdx) => ({
          title: text.title,
          content: text.content,
          questions: text.questions.map((q, qIdx) => ({
            ...q,
            userAnswer: this._tvUserAnswers?.[`${textIdx}-${qIdx}`] ?? null,
          }))
        }));

        const analyzeBtn = document.getElementById('btn-tv-analyze');
        analyzeBtn.onclick = () => this._runTVAnalysis();
      }
    }

    // Upgrade-CTA für Free-User
    const upgradeEl = document.getElementById('result-upgrade-cta');
    if (upgradeEl) {
      if (this.isFreeUser()) {
        upgradeEl.classList.remove('hidden');
        upgradeEl.innerHTML = `
          <div style="background:linear-gradient(135deg,#fff3cd,#ffeaa7);border:2px solid #f0c040;border-radius:16px;padding:1.2rem;text-align:center;margin-top:1rem;">
            <div style="font-size:1.3rem;margin-bottom:0.3rem;">🎓</div>
            <div style="font-weight:700;font-size:1.05rem;color:#1a1a2e;margin-bottom:0.5rem;">Du hast alle kostenlosen Fragen absolviert!</div>
            <div style="font-size:0.85rem;color:#555;margin-bottom:0.8rem;line-height:1.5;">
              Im <strong>Vollzugang</strong> erhältst du:<br>
              <span style="font-size:1.1rem;font-weight:700;color:#1a1a2e;">2.300+ Fragen</span> in allen Kategorien<br>
              <span style="font-size:1.1rem;font-weight:700;color:#1a1a2e;">10+ PDF-Simulationen</span> im MedAT-Format
            </div>
            <button onclick="App.showScreen('screen-konto')" style="background:#1a1a2e;color:#f5c542;border:none;border-radius:12px;padding:0.7rem 1.8rem;font-size:0.95rem;font-weight:700;cursor:pointer;">Vollzugang für nur €17 →</button>
          </div>`;
      } else {
        upgradeEl.classList.add('hidden');
      }
    }

    this.showScreen('screen-result');
  },

  async _runTVAnalysis() {
    const tvSection = document.getElementById('tv-analysis-section');
    const tvResult = document.getElementById('tv-analysis-result');
    const tvLoading = document.getElementById('tv-analysis-loading');
    const analyzeBtn = document.getElementById('btn-tv-analyze');

    analyzeBtn.style.display = 'none';
    tvLoading.classList.remove('hidden');

    try {
      const url = `${CONFIG.SUPABASE_URL}/functions/v1/analyze-tv-results`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ texts: this._tvAnalysisData }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const analysis = await resp.json();

      tvLoading.classList.add('hidden');
      tvResult.classList.remove('hidden');
      tvResult.innerHTML = this._renderTVAnalysis(analysis);
    } catch (err) {
      console.error('[TV-ANALYSE] Fehler:', err);
      tvLoading.classList.add('hidden');
      analyzeBtn.style.display = 'flex';
      alert('Die Analyse konnte leider nicht geladen werden. Bitte versuche es erneut.');
    }
  },

  _renderTVAnalysis(a) {
    let html = '';

    // Summary
    if (a.summary) {
      const levelClass = a.summary.percentage >= 75 ? 'tv-ar-level-good' : a.summary.percentage >= 50 ? 'tv-ar-level-mid' : 'tv-ar-level-low';
      html += `<div class="tv-ar-summary">
        <div class="tv-ar-summary-header">
          <strong style="font-size:1.1rem">${a.summary.score}</strong>
          <span class="tv-ar-level ${levelClass}">${a.summary.level || ''}</span>
        </div>
        <p class="tv-ar-feedback">${a.summary.overallFeedback || ''}</p>
      </div>`;
    }

    // Mistake analysis
    if (a.mistakeAnalysis && a.mistakeAnalysis.length > 0) {
      html += '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem">Fehleranalyse</h4>';
      for (const m of a.mistakeAnalysis) {
        html += `<div class="tv-ar-mistake">
          <div class="tv-ar-mistake-q">${m.question || ''}</div>
          <div class="tv-ar-answers">
            <span class="tv-ar-your">Deine Antwort: ${m.yourAnswer || '?'}</span>
            <span class="tv-ar-correct">Richtig: ${m.correctAnswer || '?'}</span>
          </div>
          <p class="tv-ar-why"><strong>Warum falsch:</strong> ${m.whyWrong || ''}</p>
          <p class="tv-ar-trick"><strong>Der Trick:</strong> ${m.trick || ''}</p>
          <p class="tv-ar-how"><strong>So vermeidest du es:</strong> ${m.howToAvoid || ''}</p>
          ${m.errorType ? `<span class="tv-ar-error-type">${m.errorType}</span>` : ''}
        </div>`;
      }
    }

    // Patterns
    if (a.patterns) {
      html += `<div class="tv-ar-patterns">
        <h4>Dein Fehlermuster</h4>
        <p><strong>Hauptschwäche:</strong> ${a.patterns.mainWeakness || ''}</p>
        ${a.patterns.errorTypes ? `<p><strong>Häufigste Fehlertypen:</strong> ${a.patterns.errorTypes.join(', ')}</p>` : ''}
        <p><strong>Empfehlung:</strong> ${a.patterns.recommendation || ''}</p>
      </div>`;
    }

    // Strategies
    if (a.strategies && a.strategies.length > 0) {
      html += '<h4 style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem">Strategien für dich</h4>';
      for (const s of a.strategies) {
        html += `<div class="tv-ar-strategy">
          <h5>${s.title || ''}</h5>
          <p>${s.description || ''}</p>
          ${s.example ? `<p class="tv-ar-example">${s.example}</p>` : ''}
        </div>`;
      }
    }

    return html;
  },

  // ===== ALLERGIEAUSWEIS EINPRÄGEPHASE =====
  async startMemorize() {
    this.memorizeCards = this.generateMemorizeCards(8);
    this.memCardIdx = 0;
    this.renderMemorizeCards();

    // Show landscape orientation tip first
    await this._showLandscapeTip();

    this.memSecondsLeft = 8 * 60;
    this.updateMemTimer();
    this.memTimerInterval = setInterval(() => {
      this.memSecondsLeft--;
      this.updateMemTimer();
      if (this.memSecondsLeft <= 0) this.endMemorize();
    }, 1000);

    this.showScreen('screen-memorize');
  },

  _showLandscapeTip() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'landscape-tip-overlay';
      overlay.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">
          <div style="background:#fff;border-radius:20px;padding:2rem 1.8rem;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size:3rem;margin-bottom:0.5rem;">📱🔄</div>
            <div style="font-size:1.15rem;font-weight:700;color:#1a1a2e;margin-bottom:0.6rem;">Tipp: Handy drehen!</div>
            <div style="font-size:0.95rem;color:#555;margin-bottom:1.2rem;line-height:1.5;">
              Drehe dein Handy ins <strong>Querformat</strong>, um die Allergieausweise in der besten Auflösung zu sehen.
            </div>
            <div style="font-size:2.5rem;margin-bottom:1rem;opacity:0.8;">
              <span style="display:inline-block;transform:rotate(90deg);">📱</span>
            </div>
            <button id="landscape-tip-ok" style="background:#1a1a2e;color:#fff;border:none;border-radius:12px;padding:0.8rem 2.5rem;font-size:1rem;font-weight:600;cursor:pointer;">Verstanden</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      document.getElementById('landscape-tip-ok').onclick = () => {
        overlay.remove();
        resolve();
      };
    });
  },

  generateMemorizeCards(count) {
    // === MedAT-konform: 7 Datenfelder pro Allergieausweis ===
    const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const _shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // 1. Name: Ein einzelner MedAT-konformer Fantasiename (sinnlose Buchstabenkombination)
    // Echte Beispiele: HSKEL, GJJDSH, JHRJNS, lecon, Ashabul, Shyamol
    const _genName = () => {
      const allLetters = 'ABCDEFGHJKLMNOPQRSTVWXYZ';
      const consonants = 'BCDFGHJKLMNPRSTVWXZ';
      const vowels = 'AEIOU';
      const style = Math.random();
      let name = '';
      if (style < 0.4) {
        // Consonant-heavy style (like HSKEL, GJJDSH, JHRJNS)
        const len = 4 + Math.floor(Math.random() * 4); // 4-7
        for (let i = 0; i < len; i++) {
          if (Math.random() < 0.3) {
            name += vowels[Math.floor(Math.random() * vowels.length)];
          } else {
            name += consonants[Math.floor(Math.random() * consonants.length)];
          }
        }
        name = name.toUpperCase();
      } else if (style < 0.7) {
        // Pronounceable style (like Ashabul, Shyamol, lecon)
        const len = 5 + Math.floor(Math.random() * 3); // 5-7
        for (let i = 0; i < len; i++) {
          if (i % 2 === 0) {
            name += consonants[Math.floor(Math.random() * consonants.length)];
          } else {
            name += vowels[Math.floor(Math.random() * vowels.length)];
          }
        }
        // Randomly uppercase all or just capitalize
        name = Math.random() < 0.5 ? name.toUpperCase() : name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      } else {
        // Random letter soup (like BKTJL, XMFRN)
        const len = 4 + Math.floor(Math.random() * 3); // 4-6
        for (let i = 0; i < len; i++) {
          name += allLetters[Math.floor(Math.random() * allLetters.length)];
        }
        name = name.toUpperCase();
      }
      return name;
    };

    // 2. Geburtstag: nur Tag und Monat
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const _genBirthday = () => {
      const day = 1 + Math.floor(Math.random() * 28);
      const month = _pick(months);
      return `${day}. ${month}`;
    };

    // 3. Medikamente: Ja/Nein
    // 4. Blutgruppe: A, B, AB, 0
    const bloodGroups = ['A', 'B', 'AB', '0'];

    // 5. Bekannte Allergien: Keine oder 1-2 Allergene
    const allergenPool = ['Pollen', 'Hausstaubmilben', 'Tierhaare', 'Schimmelpilze', 'Insektengift', 'Nahrungsmittel', 'Latex', 'Nickel', 'Duftstoffe', 'Penicillin', 'Erdnuesse', 'Schalentiere', 'Soja', 'Weizen', 'Milch', 'Eier'];
    const _genAllergies = () => {
      const r = Math.random();
      if (r < 0.3) return 'Keine';
      if (r < 0.7) {
        const a = _pick(allergenPool);
        return a || 'Pollen';
      }
      const picked = _shuffle(allergenPool).slice(0, 2);
      return picked.join(', ') || 'Pollen';
    };

    // 6. Ausweisnummer: 5-stellige Zahl
    const _genIdNumber = () => String(10000 + Math.floor(Math.random() * 90000));

    // 7. Ausstellungsland
    const countries = ['Österreich', 'Deutschland', 'Schweiz', 'Italien', 'Frankreich', 'Spanien', 'Tunesien', 'Türkei', 'Griechenland', 'Polen', 'Ungarn', 'Tschechien', 'Kroatien', 'Schweden', 'Norwegen', 'Niederlande'];

    const usedNames = new Set();
    const usedIds = new Set();
    const usedPhotos = new Set();
    const cards = [];

    // Pick diverse photos: spread across categories, avoid recently used across sessions
    const _pickDiversePhotos = (n) => {
      if (typeof ALLERGIE_PHOTOS === 'undefined') {
        return Array.from({ length: n }, (_, i) => ({ file: null, label: `Bild_${i + 1}` }));
      }

      // Load recently used photos from localStorage (keeps last 200 to ensure rotation)
      const LS_KEY = 'medat_allergie_used_photos';
      let recentlyUsed = [];
      try { recentlyUsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e) {}
      const recentSet = new Set(recentlyUsed);

      const cats = Object.keys(ALLERGIE_PHOTOS);
      const totalPhotos = Object.values(ALLERGIE_PHOTOS).reduce((s, a) => s + a.length, 0);
      // If we've used most photos, reset the history to allow reuse
      if (recentSet.size > totalPhotos - n * 2) {
        recentSet.clear();
        recentlyUsed = [];
      }

      const picked = [];
      const catPool = _shuffle([...cats]);
      let catIdx = 0;
      while (picked.length < n && picked.length < totalPhotos) {
        const cat = catPool[catIdx % catPool.length];
        const available = ALLERGIE_PHOTOS[cat].filter(f => !usedPhotos.has(f) && !recentSet.has(f));
        if (available.length > 0) {
          const photo = available[Math.floor(Math.random() * available.length)];
          usedPhotos.add(photo);
          picked.push({ file: photo, label: `Bild ${picked.length + 1}` });
        }
        catIdx++;
        if (catIdx > cats.length * 20) break; // safety
      }

      // Save picked photos to localStorage history (keep last 200)
      const updatedHistory = [...recentlyUsed, ...picked.map(p => p.file)].slice(-200);
      try { localStorage.setItem(LS_KEY, JSON.stringify(updatedHistory)); } catch(e) {}

      return picked;
    };

    const photos = _pickDiversePhotos(count);

    for (let i = 0; i < count; i++) {
      // Ensure unique names and IDs
      let name;
      do { name = _genName(); } while (usedNames.has(name));
      usedNames.add(name);

      let idNumber;
      do { idNumber = _genIdNumber(); } while (usedIds.has(idNumber));
      usedIds.add(idNumber);

      cards.push({
        name: name,
        birthday: _genBirthday(),
        medications: Math.random() < 0.5 ? 'Ja' : 'Nein',
        bloodGroup: _pick(bloodGroups),
        allergies: _genAllergies(),
        idNumber: idNumber,
        country: _pick(countries),
        photoId: photos[i]?.label || `Bild ${i + 1}`,
        photoFile: photos[i]?.file || null,
      });
    }
    return cards;
  },

  renderMemorizeCards() {
    const container = document.getElementById('memorize-cards');
    // MedAT-konform: Schwarz-Weiß, alle Felder untereinander in fester Reihenfolge
    container.innerHTML = this.memorizeCards.map((card, i) => `
      <div class="mem-card ${i === 0 ? 'active' : ''}" id="mem-card-${i}">
        <div class="id-card">
          <div class="id-card-header">
            <span class="id-card-title">ALLERGIEAUSWEIS</span>
            <span class="id-card-nr">Nr. ${i + 1}</span>
          </div>
          <div class="id-card-body-with-photo">
            <div class="id-card-data">
              <div class="id-field"><span class="id-label">Name:</span><span class="id-value">${card.name}</span></div>
              <div class="id-field"><span class="id-label">Geburtsdatum:</span><span class="id-value">${card.birthday}</span></div>
              <div class="id-field"><span class="id-label">Medikamenteneinnahme:</span><span class="id-value">${card.medications}</span></div>
              <div class="id-field"><span class="id-label">Blutgruppe:</span><span class="id-value">${card.bloodGroup}</span></div>
              <div class="id-field"><span class="id-label">Bekannte Allergien:</span><span class="id-value">${card.allergies}</span></div>
              <div class="id-field"><span class="id-label">Ausweisnummer:</span><span class="id-value">${card.idNumber}</span></div>
              <div class="id-field"><span class="id-label">Ausstellungsland:</span><span class="id-value">${card.country}</span></div>
            </div>
            <div class="id-card-photo">
              ${card.photoFile
                ? `<img src="assets/allergieausweise/photos/${card.photoFile}" alt="${card.photoId}" class="id-photo-img" />`
                : `<div class="id-photo-placeholder"><span class="id-photo-label">${card.photoId}</span></div>`
              }
              <span class="id-photo-caption">${card.photoId}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    this.updateMemNav();
  },

  memNavigate(dir) {
    document.getElementById(`mem-card-${this.memCardIdx}`).classList.remove('active');
    this.memCardIdx = Math.max(0, Math.min(this.memorizeCards.length - 1, this.memCardIdx + dir));
    document.getElementById(`mem-card-${this.memCardIdx}`).classList.add('active');
    this.updateMemNav();
  },

  updateMemNav() {
    document.getElementById('mem-card-counter').textContent = `${this.memCardIdx + 1} / ${this.memorizeCards.length}`;
    document.getElementById('mem-prev').disabled = this.memCardIdx === 0;
    document.getElementById('mem-next').disabled = this.memCardIdx === this.memorizeCards.length - 1;
  },

  updateMemTimer() {
    const el = document.getElementById('mem-timer-display');
    const m = Math.floor(this.memSecondsLeft / 60);
    const s = this.memSecondsLeft % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (this.memSecondsLeft <= 60) el.style.color = '#fca5a5';
  },

  endMemorize() {
    clearInterval(this.memTimerInterval);
    if (this.mode === 'simulation' && this._simBlockId) {
      this.simResults[this._simBlockId]['allergieausweis_mem'] = {
        score: 0, total: 0,
      };
    }
    this.startMemorizeRecall();
  },

  async startMemorizeRecall() {
    const questions = this.generateRecallQuestions(this.memorizeCards, 25);
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
    this.results = [];
    this.showTimer = true;
    this._inRecallPhase = true;

    document.getElementById('q-section-badge').innerHTML = `${ICONS.clipboardCheck} Allergieausweise abrufen`;
    this.startCountdown(15 * 60);
    document.getElementById('q-countdown').classList.remove('hidden');

    this.showScreen('screen-question');
    this.renderQuestion();
  },

  generateRecallQuestions(cards, count) {
    // === MedAT-konform: 25 Fragen, 5 Optionen (E = "Keine Antwort ist richtig"), 3 Fragetypen ===
    const _shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const _pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const OPTION_E = 'Keine der Antwortmöglichkeiten ist richtig';

    // Field accessors for question generation
    // Exclude 'medications' (Ja/Nein only) — too few unique values for good MC options
    const fieldDefs = [
      { key: 'name', label: 'Name' },
      { key: 'birthday', label: 'Geburtstag' },
      { key: 'bloodGroup', label: 'Blutgruppe' },
      { key: 'allergies', label: 'Allergien' },
      { key: 'idNumber', label: 'Ausweisnummer' },
      { key: 'country', label: 'Land' },
    ];

    // Get wrong values for a field from other cards
    const getWrongValues = (fieldKey, correctVal) => {
      const others = cards.map(c => c[fieldKey]).filter(v => v !== correctVal);
      return _shuffle([...new Set(others)]);
    };

    // Generate plausible wrong values for fields where cards may not provide enough diversity
    const extraWrong = {
      bloodGroup: ['A', 'B', 'AB', '0'],
      country: ['Österreich', 'Deutschland', 'Schweiz', 'Italien', 'Frankreich', 'Spanien', 'Tunesien', 'Türkei', 'Griechenland', 'Polen', 'Ungarn', 'Niederlande', 'Schweden', 'Norwegen', 'Tschechien', 'Kroatien'],
      allergies: ['Pollen', 'Hausstaubmilben', 'Tierhaare', 'Schimmelpilze', 'Insektengift', 'Nahrungsmittel', 'Latex', 'Nickel', 'Duftstoffe', 'Penicillin', 'Erdnuesse', 'Schalentiere', 'Keine'],
      name: [],  // filled from cards dynamically
      birthday: [],  // filled from cards dynamically
      idNumber: [],  // filled from cards dynamically
    };

    // Build 4 wrong options for A-D (correct may or may not be in A-D)
    const buildOptions = (correctVal, fieldKey) => {
      // Decide if E ("Keine Antwort ist richtig") should be correct (~15% of time)
      const eIsCorrect = Math.random() < 0.15;

      let wrongs = getWrongValues(fieldKey, correctVal);
      // Add extra wrongs if not enough from cards
      if (wrongs.length < 4 && extraWrong[fieldKey]) {
        const extras = extraWrong[fieldKey].filter(v => v !== correctVal && !wrongs.includes(v));
        wrongs = [...wrongs, ..._shuffle(extras)];
      }
      // Generate plausible fallback wrongs for birthday and idNumber
      if (wrongs.length < 4 && fieldKey === 'birthday') {
        const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        while (wrongs.length < 6) {
          const fake = `${1 + Math.floor(Math.random() * 28)}. ${months[Math.floor(Math.random() * 12)]}`;
          if (fake !== correctVal && !wrongs.includes(fake)) wrongs.push(fake);
        }
      }
      if (wrongs.length < 4 && fieldKey === 'idNumber') {
        while (wrongs.length < 6) {
          const fake = String(10000 + Math.floor(Math.random() * 90000));
          if (fake !== correctVal && !wrongs.includes(fake)) wrongs.push(fake);
        }
      }
      if (wrongs.length < 4 && fieldKey === 'name') {
        // Generate fake names
        const letters = 'ABCDEFGHJKLMNPRSTVWXZ';
        while (wrongs.length < 6) {
          let fake = '';
          const len = 4 + Math.floor(Math.random() * 4);
          for (let c = 0; c < len; c++) fake += letters[Math.floor(Math.random() * letters.length)];
          if (fake !== correctVal && !wrongs.includes(fake)) wrongs.push(fake);
        }
      }

      if (eIsCorrect) {
        // All 4 options A-D are wrong, E is correct
        const opts = _shuffle(wrongs).slice(0, 4);
        opts.push(OPTION_E);
        return { options: opts, correct: 4 }; // E = index 4
      } else {
        // Place correct answer randomly in A-D positions
        const wrongOpts = _shuffle(wrongs).slice(0, 3);
        const fourOpts = _shuffle([correctVal, ...wrongOpts]);
        fourOpts.push(OPTION_E);
        const correctIdx = fourOpts.indexOf(correctVal);
        return { options: fourOpts, correct: correctIdx };
      }
    };

    const questions = [];

    // === Fragetyp 1: Kreuzreferenz (field of person by name) ===
    // "Welche Blutgruppe hatte GJJDSH?"
    const type1Templates = (card) => {
      const field = _pick(fieldDefs.filter(f => f.key !== 'name'));
      const { options, correct } = buildOptions(card[field.key], field.key);
      return {
        question: `Welche/r ${field.label} hatte ${card.name}?`,
        options, correct,
        explanation: `${card.name} hatte ${field.label}: ${card[field.key]}`,
      };
    };

    // === Fragetyp 2: Foto-zu-Daten (zeigt das echte Foto und fragt nach Daten) ===
    const type2Templates = (card) => {
      const field = _pick(fieldDefs);
      const { options, correct } = buildOptions(card[field.key], field.key);
      const photoHtml = card.photoFile
        ? `<img src="assets/allergieausweise/photos/${card.photoFile}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;border:2px solid #ddd;margin-bottom:8px;display:block;" />`
        : '';
      return {
        question: `${photoHtml}Welche/r ${field.label} gehörte zu dieser Person?`,
        options, correct,
        explanation: `${card.name} hatte ${field.label}: ${card[field.key]}`,
      };
    };

    // === Fragetyp 3: Visuelle Merkmale / Vergleich ===
    // "Welche Person hatte die Ausweisnummer 09384?"
    // "Welche Person kam aus Tunesien?"
    const type3Templates = (card) => {
      const field = _pick(fieldDefs.filter(f => f.key !== 'name' && f.key !== 'photoId'));
      const { options, correct } = buildOptions(card.name, 'name');
      return {
        question: `Welche Person hatte ${field.label}: ${card[field.key]}?`,
        options, correct,
        explanation: `${card.name} hatte ${field.label}: ${card[field.key]}`,
      };
    };

    // === Fragetyp 4: Übergreifende Fragen (mehrere Karten vergleichen) ===
    // "Welche Person nimmt keine Medikamente ein?" / "Welche Person stammt aus Tunesien?"
    const type4Templates = () => {
      const filterFields = [
        { key: 'medications', label: 'nimmt keine Medikamente ein', matchVal: 'Nein' },
        { key: 'medications', label: 'nimmt Medikamente ein', matchVal: 'Ja' },
        { key: 'allergies', label: 'hat keine bekannten Allergien', matchVal: 'Keine' },
      ];
      // Also add country-based questions dynamically
      const usedCountries = [...new Set(cards.map(c => c.country))];
      usedCountries.forEach(country => {
        filterFields.push({ key: 'country', label: `stammt aus ${country}`, matchVal: country });
      });
      // Blood group questions
      const usedBG = [...new Set(cards.map(c => c.bloodGroup))];
      usedBG.forEach(bg => {
        filterFields.push({ key: 'bloodGroup', label: `hat Blutgruppe ${bg}`, matchVal: bg });
      });

      const filter = _pick(filterFields);
      const matching = cards.filter(c => c[filter.key] === filter.matchVal);
      if (matching.length === 0 || matching.length === cards.length) return type1Templates(cards[0]);

      const correctCard = _pick(matching);
      const { options, correct } = buildOptions(correctCard.name, 'name');
      return {
        question: `Welche Person ${filter.label}?`,
        options, correct,
        explanation: `${correctCard.name} ${filter.label} (${filter.matchVal})`,
      };
    };

    const typeGenerators = [type1Templates, type2Templates, type3Templates, type4Templates];

    for (let q = 0; q < count; q++) {
      const card = cards[q % cards.length];
      const typeGen = typeGenerators[q % 4]; // Rotate through 4 types
      const generated = typeGen === type4Templates ? typeGen() : typeGen(card);

      questions.push({
        id: `recall-${q}`,
        type: 'allergieausweis_frage',
        subtype: 'abruf',
        content: {
          question: generated.question,
          options: generated.options,
          correct: generated.correct,
          explanation: generated.explanation,
        }
      });
    }
    return _shuffle(questions); // Shuffle final order
  },

  // ===== SIMULATION MODE =====
  async openSimOverview() {
    this.mode = 'simulation';
    this.simResults = {};
    this.wrongAnswers = [];

    const container = document.getElementById('sim-block-select');
    container.innerHTML = '';

    // Clean up any leftover banner
    const existingBanner = document.getElementById('sim-limit-banner');
    if (existingBanner) existingBanner.remove();

    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      const avail = block.available !== false;
      let totalQ = 0, totalMin = 0;
      for (const sec of Object.values(block.sections)) {
        totalQ += sec.questions;
        totalMin += sec.minutes;
      }

      const item = document.createElement('div');
      item.className = 'sim-block-item' + (avail ? '' : ' unavailable');
      item.innerHTML = `
        <span class="sbi-icon">${ICONS.block(block.icon, 24, 1.75)}</span>
        <div class="sbi-info">
          <strong>${block.fullLabel}</strong>
          <small>${totalQ} Aufgaben · ${totalMin} Minuten</small>
        </div>
        <span class="sbi-weight">${block.weight}%</span>
      `;
      container.appendChild(item);
    }

    this.showScreen('screen-sim-overview');
  },

  async startSimulation() {
    // Free-User: Simulation gesperrt
    if (this.isFreeUser()) {
      this._showToast('Simulation ist nur mit Vollzugang verfügbar. Einzelne Übungen sind im Free-Modus möglich.', 'warning');
      return;
    }


    this.simResults = {};
    this.simBlocks = CONFIG.SIMULATION_ORDER.filter(bId => CONFIG.TEST_BLOCKS[bId]?.available !== false);
    this.simCurrentBlockIdx = 0;

    // Show loading overlay while simulation is being prepared
    this._showSimGeneratingOverlay();

    await this.runNextSimBlock();
  },

  _showSimGeneratingOverlay() {
    // Remove if already exists
    const existing = document.getElementById('sim-generating-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'sim-generating-overlay';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;">
        <div style="background:#fff;border-radius:20px;padding:2.5rem 2rem;max-width:360px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="font-size:2.5rem;margin-bottom:0.8rem;">⏳</div>
          <div style="font-size:1.2rem;font-weight:700;color:#1a1a2e;margin-bottom:0.5rem;">Simulation wird vorbereitet</div>
          <div style="font-size:0.95rem;color:#666;margin-bottom:1.2rem;">Deine Fragen werden geladen und zusammengestellt. Das kann <strong>bis zu 3 Minuten</strong> dauern.</div>
          <div class="spinner" style="margin:0 auto;"></div>
          <div style="font-size:0.8rem;color:#999;margin-top:1rem;">Bitte hab etwas Geduld...</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  _hideSimGeneratingOverlay() {
    const overlay = document.getElementById('sim-generating-overlay');
    if (overlay) overlay.remove();
  },

  async runNextSimBlock() {
    if (this.simCurrentBlockIdx >= this.simBlocks.length) {
      this.showSimFinalResult();
      return;
    }

    const blockId = this.simBlocks[this.simCurrentBlockIdx];
    const block = CONFIG.TEST_BLOCKS[blockId];
    this.simResults[blockId] = {};

    let sectionKeys;
    if (blockId === 'kff') {
      sectionKeys = CONFIG.KFF_SECTION_ORDER.filter(k => block.sections[k] && block.sections[k].available !== false);
    } else if (blockId === 'sek' && CONFIG.SEK_SECTION_ORDER) {
      sectionKeys = CONFIG.SEK_SECTION_ORDER.filter(k => block.sections[k] && block.sections[k].available !== false);
    } else {
      sectionKeys = Object.keys(block.sections).filter(k => block.sections[k].available !== false);
    }

    this.simSectionIdx = 0;
    this._simSectionKeys = sectionKeys;
    this._simBlockId = blockId;
    this._simBlock = block;

    await this.runNextSimSection();
  },

  async runNextSimSection() {
    if (this.simSectionIdx >= this._simSectionKeys.length) {
      this.simCurrentBlockIdx++;
      await this.runNextSimBlock();
      return;
    }

    const secKey = this._simSectionKeys[this.simSectionIdx];
    const section = this._simBlock.sections[secKey];

    if (section.isMemorize) {
      await this.startMemorize();
      return;
    }

    if (section.isRecall) {
      if (this.simResults[this._simBlockId]?.['allergieausweis_abruf']) {
        this.simSectionIdx++;
        await this.runNextSimSection();
        return;
      }
      this.simSectionIdx++;
      await this.runNextSimSection();
      return;
    }

    this.currentSection = section;
    this.showTimer = true;
    await this.loadAndStartQuestions(section, null, section.questions, section.minutes, true);
  },

  finishSection() {
    this.stopCountdown();

    if (this._inRecallPhase && this._simBlockId) {
      this.simResults[this._simBlockId]['allergieausweis_abruf'] = {
        score: this.score,
        total: this.questions.length,
      };
      this._inRecallPhase = false;
      const abrufIdx = this._simSectionKeys.indexOf('allergieausweis_abruf');
      if (abrufIdx >= 0) {
        this.simSectionIdx = abrufIdx + 1;
      } else {
        this.simSectionIdx++;
      }
      this.runNextSimSection();
      return;
    }

    const secKey = this._simSectionKeys?.[this.simSectionIdx];
    if (secKey && this._simBlockId) {
      this.simResults[this._simBlockId][secKey] = {
        score: this.score,
        total: this.questions.length,
      };
    }

    this.simSectionIdx++;
    this.runNextSimSection();
  },

  showSimFinalResult() {
    // Clear TV state to prevent leaking into final results
    this._tvTexts = null;
    this._tvUserAnswers = {};
    this._tvAnalysisData = null;

    let totalScore = 0, totalQuestions = 0;
    for (const sections of Object.values(this.simResults)) {
      for (const sec of Object.values(sections)) {
        totalScore += sec.score;
        totalQuestions += sec.total;
      }
    }
    this.showResult(totalScore, totalQuestions, this.results);
  },

  // === NOTES SCREEN ===
  async showNotesScreen() {
    this._closeMenu();
    this.showScreen('screen-notes');
    await this.renderNotes();
  },

  async renderNotes() {
    const container = document.getElementById('notes-container');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Lade Notizen...</p>';

    if (!Auth.isLoggedIn || !Auth.currentUser) {
      container.innerHTML = '<div class="notes-empty"><p>Bitte einloggen, um Notizen zu sehen.</p></div>';
      return;
    }

    try {
      const { data: notes, error } = await Auth.supabase
        .from('user_notes')
        .select('*')
        .eq('user_id', Auth.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!notes || notes.length === 0) {
        container.innerHTML = `<div class="notes-empty">
          <p style="font-size:1.5rem;margin-bottom:0.5rem">📝</p>
          <p style="font-weight:600;color:var(--text)">Noch keine Notizen</p>
          <p>Nutze den Notizblock beim Üben, um dir Lernthemen zu merken.</p>
        </div>`;
        return;
      }

      const typeLabels = {
        bms: 'BMS', zahlenfolge: 'Zahlenfolgen', wortfluessigkeit: 'Wortflüssigkeit',
        implikation: 'Implikationen', textverstaendnis: 'Textverständnis',
        allergieausweis_frage: 'Allergieausweise', figur: 'Figuren',
      };
      const subtypeLabels = { biologie: 'Bio', chemie: 'Chem', physik: 'Phys', mathematik: 'Mathe' };

      container.innerHTML = notes.map(n => {
        const typeLabel = typeLabels[n.context_type] || n.context_type || '';
        const subLabel = subtypeLabels[n.context_subtype] || n.context_subtype || '';
        const meta = [typeLabel, subLabel].filter(Boolean).join(' · ');
        const date = new Date(n.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        const doneClass = n.is_done ? 'done' : '';
        const checkClass = n.is_done ? 'checked' : '';

        return `<div class="note-item ${doneClass}" data-id="${n.id}">
          <div class="note-check ${checkClass}" onclick="App.toggleNote('${n.id}', ${!n.is_done})">${n.is_done ? '✓' : ''}</div>
          <div class="note-body">
            <div class="note-text">${this._escapeHtml(n.note_text)}</div>
            <div class="note-meta">${meta ? meta + ' · ' : ''}${date}</div>
          </div>
          <button class="note-delete" onclick="App.deleteNote('${n.id}')" title="Löschen">✕</button>
        </div>`;
      }).join('');
    } catch (e) {
      console.error('Load notes error:', e);
      container.innerHTML = '<div class="notes-empty"><p>Fehler beim Laden der Notizen.</p></div>';
    }
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  async toggleNote(noteId, isDone) {
    try {
      await Auth.supabase.from('user_notes').update({ is_done: isDone, updated_at: new Date().toISOString() }).eq('id', noteId);
      await this.renderNotes();
    } catch (e) { console.error('Toggle note error:', e); }
  },

  async deleteNote(noteId) {
    try {
      await Auth.supabase.from('user_notes').delete().eq('id', noteId);
      await this.renderNotes();
    } catch (e) { console.error('Delete note error:', e); }
  },
};

// === SCRATCHPAD / NOTIZBLOCK ===
const Scratchpad = {
  canvas: null, ctx: null, drawing: false, mode: 'pen', lastX: 0, lastY: 0,
  color: '#1a1a2e', canvasHeight: 280,

  init() {
    this.canvas = document.getElementById('scratchpad-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Tool buttons
    document.getElementById('sp-pen')?.addEventListener('click', () => this.setMode('pen'));
    document.getElementById('sp-highlighter')?.addEventListener('click', () => this.setMode('highlighter'));
    document.getElementById('sp-eraser')?.addEventListener('click', () => this.setMode('eraser'));
    document.getElementById('sp-clear')?.addEventListener('click', () => this.clear(true));
    document.getElementById('sp-minimize')?.addEventListener('click', () => this.toggle());
    document.getElementById('scratchpad-btn')?.addEventListener('click', () => this.toggle());

    // Color buttons
    const colors = { 'sp-c-black': '#1a1a2e', 'sp-c-red': '#e74c3c', 'sp-c-blue': '#3498db', 'sp-c-green': '#27ae60', 'sp-c-yellow': '#f1c40f' };
    for (const [id, c] of Object.entries(colors)) {
      document.getElementById(id)?.addEventListener('click', () => this.setColor(c, id));
    }

    // Note save
    document.getElementById('sp-note-save')?.addEventListener('click', () => this.saveNote());
    document.getElementById('sp-note-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.saveNote(); });

    // Canvas drawing events — pointer events for stylus + touch + mouse
    this.canvas.addEventListener('pointerdown', (e) => this.startDraw(e));
    this.canvas.addEventListener('pointermove', (e) => this.draw(e));
    this.canvas.addEventListener('pointerup', () => this.stopDraw());
    this.canvas.addEventListener('pointerleave', () => this.stopDraw());
    // Prevent scroll while drawing on canvas
    this.canvas.addEventListener('touchstart', (e) => { if (this.drawing) e.preventDefault(); }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  },

  show() {
    const fab = document.getElementById('scratchpad-btn');
    if (fab) fab.classList.remove('hidden');
  },

  hide() {
    document.getElementById('scratchpad-btn')?.classList.add('hidden');
    document.getElementById('scratchpad-container')?.classList.add('hidden');
  },

  toggle() {
    const container = document.getElementById('scratchpad-container');
    const fab = document.getElementById('scratchpad-btn');
    if (!container) return;

    const isHidden = container.classList.contains('hidden');
    container.classList.toggle('hidden');

    if (isHidden) {
      fab.classList.add('hidden');

      // Check if current question is Zahlenfolge → prefill sequence on canvas
      const q = App.questions?.[App.currentIndex];
      const data = q?.content;
      // content might be a JSON string from the DB
      const parsed = typeof data === 'string' ? (() => { try { return JSON.parse(data); } catch { return data; } })() : data;
      console.log('[Scratchpad] toggle check:', { type: q?.type, hasSequence: !!parsed?.sequence, parsed: parsed });
      if (q?.type === 'zahlenfolge' && parsed?.sequence) {
        this.canvasHeight = 360; // Taller for calculation space
        this._currentSequence = parsed.sequence;
      } else {
        this.canvasHeight = 280;
        this._currentSequence = null;
      }

      // Use rAF to ensure the container is visible and has dimensions before drawing
      requestAnimationFrame(() => {
        this.resizeCanvas();
        if (this._currentSequence) {
          this.clear(false);
          this.drawSequenceOnCanvas(this._currentSequence);
        }
      });
    } else {
      fab.classList.remove('hidden');
    }
  },

  // === ZAHLENFOLGE PREFILL: draw numbers on bottom of canvas ===
  drawSequenceOnCanvas(sequence) {
    if (!this.ctx || !this.canvas) { console.warn('[Scratchpad] No canvas/ctx'); return; }
    if (!sequence || !Array.isArray(sequence) || sequence.length === 0) { console.warn('[Scratchpad] Invalid sequence:', sequence); return; }
    const ctx = this.ctx;
    const canvasW = this.canvas.clientWidth || (this.canvas.width / (window.devicePixelRatio || 1));
    const canvasH = this.canvasHeight;
    console.log('[Scratchpad] Drawing sequence on canvas:', { canvasW, canvasH, sequence });

    // Layout: numbers in a row at the bottom, with arrows between them
    const numCount = sequence.length;
    const fontSize = numCount > 8 ? 16 : 20;
    const arrowGap = numCount > 8 ? 14 : 20;
    const numWidth = numCount > 8 ? 36 : 44;
    const totalWidth = numCount * numWidth + (numCount - 1) * arrowGap;
    const startX = Math.max(10, (canvasW - totalWidth) / 2);
    const baseY = canvasH - 20; // Bottom of canvas

    // Draw separator line
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, baseY - fontSize - 12);
    ctx.lineTo(canvasW - 10, baseY - fontSize - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 11px Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Zahlenfolge — schreibe darüber ↑', 10, baseY - fontSize - 18);

    // Draw each number/blank
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let x = startX + numWidth / 2;
    for (let i = 0; i < numCount; i++) {
      const val = sequence[i];

      if (val === null) {
        // Blank: draw dashed box with "?"
        ctx.strokeStyle = '#F5C542';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        const boxW = numWidth - 4;
        const boxH = fontSize + 8;
        ctx.strokeRect(x - boxW/2, baseY - boxH/2, boxW, boxH);
        ctx.setLineDash([]);
        ctx.fillStyle = '#F5C542';
        ctx.font = `700 ${fontSize}px Inter, -apple-system, sans-serif`;
        ctx.fillText('?', x, baseY);
      } else {
        // Number: draw clearly
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${fontSize}px "SF Mono", "Fira Code", monospace`;
        ctx.fillText(String(val), x, baseY);
      }

      // Arrow between numbers
      if (i < numCount - 1) {
        const arrowX = x + numWidth / 2 + arrowGap / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = `400 ${fontSize - 4}px Inter, sans-serif`;
        ctx.fillText('→', arrowX, baseY);
      }

      x += numWidth + arrowGap;
    }

    ctx.restore();
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = rect.width * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    this.ctx.putImageData(imageData, 0, 0);
  },

  setMode(mode) {
    this.mode = mode;
    document.getElementById('sp-pen')?.classList.toggle('active', mode === 'pen');
    document.getElementById('sp-highlighter')?.classList.toggle('active', mode === 'highlighter');
    document.getElementById('sp-eraser')?.classList.toggle('active', mode === 'eraser');
  },

  setColor(color, btnId) {
    this.color = color;
    document.querySelectorAll('.scratchpad-color').forEach(b => b.classList.remove('active'));
    document.getElementById(btnId)?.classList.add('active');
  },

  clear(keepPrefill) {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Re-draw the Zahlenfolge prefill if we just cleared user drawings
    if (keepPrefill && this._currentSequence) {
      this.drawSequenceOnCanvas(this._currentSequence);
    }
  },

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  },

  startDraw(e) {
    this.drawing = true;
    const pos = this.getPos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.ctx.beginPath();
    if (this.mode === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalCompositeOperation = 'source-over';
    } else if (this.mode === 'highlighter') {
      this.ctx.globalAlpha = 0.3;
      this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = this.color;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    } else {
      this.ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      this.ctx.fillStyle = this.color;
      this.ctx.fill();
    }
  },

  draw(e) {
    if (!this.drawing) return;
    const pos = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);

    if (this.mode === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = 24;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.globalCompositeOperation = 'source-over';
    } else if (this.mode === 'highlighter') {
      this.ctx.globalAlpha = 0.3;
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 14;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;
    } else {
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 2.4;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }

    this.lastX = pos.x;
    this.lastY = pos.y;
  },

  stopDraw() {
    this.drawing = false;
  },

  // === NOTE SAVING ===
  async saveNote() {
    const input = document.getElementById('sp-note-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    if (!Auth.isLoggedIn || !Auth.currentUser) {
      input.value = '';
      return;
    }

    // Get current question context
    const q = App.questions?.[App.currentIndex];
    const contextType = q?.type || null;
    const contextSubtype = q?.subtype || null;
    const contextQuestion = (q?.content?.question || q?.content?.pattern_description || q?.content?.word || '').substring(0, 200);

    try {
      const { error } = await Auth.supabase.from('user_notes').insert({
        user_id: Auth.currentUser.id,
        note_text: text,
        context_type: contextType,
        context_subtype: contextSubtype,
        context_question: contextQuestion,
      });
      if (error) throw error;

      // Show saved confirmation
      input.value = '';
      const bar = input.parentElement;
      const msg = document.createElement('span');
      msg.className = 'sp-saved-msg';
      msg.textContent = '✓ Gespeichert!';
      bar.appendChild(msg);
      setTimeout(() => msg.remove(), 2000);
    } catch (e) {
      console.error('Note save error:', e);
      input.placeholder = 'Fehler beim Speichern';
      setTimeout(() => { input.placeholder = 'Notiz speichern...'; }, 2000);
    }
  }
};

// ============================================================
// ONBOARDING MODULE
// ============================================================
/**
 * Neues Onboarding-Modul für MedAT Trainer App (7 Schritte)
 * Ersetzt den bestehenden "const Onboarding = {...}" Block in app.js
 *
 * Nutzt dieselben .ob- CSS-Klassen wie das bisherige Onboarding.
 *
 * Schritte:
 * 1. Spitzname ("Wie dürfen wir dich nennen?")
 * 2. Uni-Wahl (wie Original)
 * 3. Erster Antritt (wie Original)
 * 4. Größte Sorgen (Multi-Select, NEU)
 * 5. Konkrete Schwachstellen (Freitext, NEU)
 * 6. Lade-Animation (angepasste Texte)
 * 7. Willkommen + Paywall (€19,90 Basic / €29,90 Premium)
 */

const Onboarding = {
  currentStep: 1,
  totalSteps: 7,
  data: {},
  selectedWorries: [],

  // --- Prüfe ob Onboarding nötig ist (von App.init() aufgerufen) ---
  async checkOnboardingNeeded() {
    if (!Auth.isLoggedIn) return false;
    const uid = Auth.currentUser.id;
    const lsKey = 'medat_onboarding_done_' + uid;
    if (localStorage.getItem(lsKey) === 'true') return false;
    try {
      const { data, error } = await Auth.supabase
        .from('user_onboarding')
        .select('onboarding_completed')
        .eq('user_id', uid)
        .maybeSingle();
      if (error) { console.error('Onboarding check error:', error); return false; }
      if (!data) return true;
      if (data.onboarding_completed) {
        localStorage.setItem(lsKey, 'true');
        return false;
      }
      return true;
    } catch (e) {
      console.error('Onboarding check error:', e);
      return false;
    }
  },

  // --- Starte Onboarding ---
  start() {
    this.currentStep = 1;
    this.data = {};
    this.selectedWorries = [];
    App.showScreen('screen-onboarding');
    this._showStep(1);
    this._bindEvents();
  },

  // --- Alle Events binden ---
  _bindEvents() {
    // Schritt 1: Nickname → Weiter-Button
    const nicknameNext = document.getElementById('ob-nickname-next');
    const nicknameInput = document.getElementById('ob-nickname');
    if (nicknameNext) nicknameNext.onclick = () => {
      const val = nicknameInput?.value?.trim();
      if (!val) { nicknameInput?.focus(); App.showToast('Bitte gib einen Namen ein 😊'); return; }
      this.data.display_nickname = val;
      this._nextStep();
    };
    // Enter-Taste für Nickname
    if (nicknameInput) nicknameInput.onkeydown = (e) => {
      if (e.key === 'Enter') nicknameNext?.click();
    };

    // Schritte 2 + 3: ob-option Buttons mit auto-advance (wie Original)
    document.querySelectorAll('.ob-options:not(#ob-worry-options)').forEach(group => {
      group.querySelectorAll('.ob-option:not(.ob-multi)').forEach(btn => {
        btn.onclick = () => {
          const field = group.dataset.field;
          const value = btn.dataset.value;
          group.querySelectorAll('.ob-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.data[field] = value;
          setTimeout(() => this._nextStep(), 400);
        };
      });
    });

    // Schritt 4: Sorgen — Multi-Select (kein auto-advance)
    document.querySelectorAll('.ob-multi').forEach(btn => {
      btn.onclick = () => {
        btn.classList.toggle('selected');
        const worry = btn.dataset.worry;
        if (btn.classList.contains('selected')) {
          if (!this.selectedWorries.includes(worry)) this.selectedWorries.push(worry);
        } else {
          this.selectedWorries = this.selectedWorries.filter(w => w !== worry);
        }
        // Weiter-Button zeigen wenn mindestens 1 ausgewählt
        const nextBtn = document.getElementById('ob-worry-next');
        if (nextBtn) nextBtn.style.display = this.selectedWorries.length > 0 ? 'block' : 'none';
      };
    });
    const worryNext = document.getElementById('ob-worry-next');
    if (worryNext) worryNext.onclick = () => {
      this.data.biggest_worry = [...this.selectedWorries];
      this._nextStep();
    };

    // Schritt 5: Schwachstellen → Weiter + Überspringen
    const topicsNext = document.getElementById('ob-topics-next');
    if (topicsNext) topicsNext.onclick = () => {
      this.data.weak_topics_freetext = document.getElementById('ob-weak-topics')?.value?.trim() || '';
      this._nextStep();
    };
    const topicsSkip = document.getElementById('ob-topics-skip');
    if (topicsSkip) topicsSkip.onclick = () => {
      this.data.weak_topics_freetext = '';
      this._nextStep();
    };

    // Schritt 7: Paywall
    const planBasic = document.getElementById('ob-plan-basic');
    if (planBasic) planBasic.onclick = () => {
      this._saveOnboarding(true);
      App.startStripeCheckout('basic');
    };
    const planPremium = document.getElementById('ob-plan-premium');
    if (planPremium) planPremium.onclick = () => {
      this._saveOnboarding(true);
      App.startStripeCheckout('premium');
    };
    const skipPaywall = document.getElementById('ob-skip-paywall');
    if (skipPaywall) skipPaywall.onclick = () => {
      this._saveOnboarding(true);
      App.showScreen('screen-home');
      if (App.loadHomeStats) App.loadHomeStats();
      const name = this.data.display_nickname || '';
      App.showToast(`Willkommen${name ? ', ' + name : ''}! 🎉`);
      setTimeout(() => { if (window.showPWAInstallBanner) window.showPWAInstallBanner(); }, 3000);
    };
  },

  // --- Nächster Schritt ---
  _nextStep() {
    if (this.currentStep >= this.totalSteps) return;
    this.currentStep++;
    this._showStep(this.currentStep);
  },

  // --- Zeige Schritt ---
  _showStep(step) {
    // Alle Steps verstecken, aktuellen zeigen
    document.querySelectorAll('.ob-step').forEach(s => s.classList.remove('active'));
    const el = document.querySelector(`.ob-step[data-step="${step}"]`);
    if (el) {
      el.classList.remove('active');
      void el.offsetWidth; // Re-trigger Animation
      el.classList.add('active');
    }
    // Fortschrittsbalken aktualisieren
    const pct = ((step - 1) / (this.totalSteps - 1)) * 100;
    const bar = document.getElementById('ob-progress-bar');
    if (bar) bar.style.width = pct + '%';

    // Spezielle Logik pro Schritt
    if (step === 6) this._runLoadingAnimation();
    if (step === 7) this._prepareWelcome();
  },

  // --- Lade-Animation (Schritt 6) ---
  _runLoadingAnimation() {
    const items = document.querySelectorAll('.ob-load-item');
    const bar = document.getElementById('ob-load-bar');
    let completed = 0;

    // Reset
    items.forEach(item => {
      item.classList.remove('active', 'done');
      item.querySelector('.ob-load-check').textContent = '⏳';
    });
    if (bar) bar.style.width = '0%';

    // Speichere Daten im Hintergrund während Animation läuft
    this._saveOnboarding(false);
    this._generateTutorPrompts();

    items.forEach((item, i) => {
      const delay = parseInt(item.dataset.delay) || i * 1500;
      setTimeout(() => {
        item.classList.add('active');
        if (bar) bar.style.width = ((i + 0.5) / items.length * 100) + '%';
      }, delay);
      setTimeout(() => {
        item.classList.remove('active');
        item.classList.add('done');
        item.querySelector('.ob-load-check').textContent = '✓';
        completed++;
        if (bar) bar.style.width = (completed / items.length * 100) + '%';
        if (completed === items.length) {
          setTimeout(() => this._nextStep(), 800);
        }
      }, delay + 1200);
    });
  },

  // --- Welcome-Schritt vorbereiten ---
  _prepareWelcome() {
    const title = document.getElementById('ob-welcome-title');
    if (title && this.data.display_nickname) {
      title.textContent = `${this.data.display_nickname}, dein Training ist bereit!`;
    }
  },

  // --- Tutor-Prompts generieren basierend auf weak_topics_freetext ---
  async _generateTutorPrompts() {
    if (!Auth.isLoggedIn) return;
    const uid = Auth.currentUser.id;
    const topics = (this.data.weak_topics_freetext || '').toLowerCase();
    if (!topics) return;

    const tutors = [
      {
        name: 'Banana',
        keywords: ['bms', 'bio', 'chemie', 'physik', 'mathe', 'hormone', 'stöchiometrie', 'aminosäuren', 'kohlenwasserstoffe', 'enzyme', 'zelle'],
        prompt: `Erstelle ein lustiges Merkbild (Mnemonic) für: ${this.data.weak_topics_freetext}. Nutze visuelle Assoziationen und Geschichten, die man nicht vergisst.`
      },
      {
        name: 'Professor Grimm',
        keywords: ['bms', 'bio', 'chemie', 'physik', 'mathe', 'hormone', 'stöchiometrie', 'galvanisch', 'osmose', 'enzyme', 'dna'],
        prompt: `Erkläre mir Schritt für Schritt: ${this.data.weak_topics_freetext}. Nutze Analogien und Beispiele, als würde ich es zum ersten Mal hören.`
      },
      {
        name: 'Rico',
        keywords: ['kff', 'zahlenfolgen', 'kognitiv', 'muster', 'logik', 'sequenz'],
        prompt: `Gib mir 5 typische MedAT-Zahlenfolgen zu: ${this.data.weak_topics_freetext}. Zeig mir die Muster und Lösungsstrategien.`
      },
      {
        name: 'Jojo',
        keywords: ['kff', 'figuren', 'räumlich', 'geometrie', 'figural', 'würfel'],
        prompt: `Trainiere mich in figuralem Reasoning: ${this.data.weak_topics_freetext}. Gib mir Übungen mit Erklärungen.`
      },
      {
        name: 'Drillmaster',
        keywords: ['schnell', 'speed', 'drill', 'zeitdruck', 'bms'],
        prompt: `Erstelle einen Schnelltest zu: ${this.data.weak_topics_freetext}. 10 Fragen, maximale Geschwindigkeit!`
      },
      {
        name: 'Lilly',
        keywords: ['sek', 'sozial', 'entscheiden', 'ethik', 'emotion'],
        prompt: `Gib mir realistische SEK-Szenarien zu: ${this.data.weak_topics_freetext}. Erkläre die ethische Dimension.`
      }
    ];

    const prompts = [];
    for (const tutor of tutors) {
      const isRelevant = tutor.keywords.some(kw => topics.includes(kw));
      // Drillmaster immer, wenn Themen angegeben
      if (isRelevant || tutor.name === 'Drillmaster') {
        prompts.push({
          user_id: uid,
          tutor_name: tutor.name,
          prompt_text: tutor.prompt,
          topic: this.data.weak_topics_freetext.substring(0, 200),
          created_at: new Date().toISOString()
        });
      }
    }

    if (prompts.length > 0) {
      try {
        await Auth.supabase.from('onboarding_saved_prompts').insert(prompts);
      } catch (e) {
        console.warn('Prompts speichern fehlgeschlagen:', e);
      }
    }
  },

  // --- Onboarding-Daten in Supabase speichern ---
  async _saveOnboarding(completed) {
    if (!Auth.isLoggedIn) return;
    const uid = Auth.currentUser.id;
    if (completed) {
      localStorage.setItem('medat_onboarding_done_' + uid, 'true');
    }
    try {
      const payload = {
        user_id: uid,
        target_uni: this.data.target_uni || null,
        is_first_attempt: this.data.is_first_attempt === 'true' ? true : this.data.is_first_attempt === 'false' ? false : null,
        biggest_worry: this.data.biggest_worry || this.selectedWorries || [],
        weak_topics_freetext: this.data.weak_topics_freetext || null,
        onboarding_completed: completed,
        onboarding_completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };
      const { error } = await Auth.supabase
        .from('user_onboarding')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) console.error('Onboarding save error:', error);

      // Nickname in user_profiles speichern
      if (this.data.display_nickname) {
        await Auth.supabase
          .from('user_profiles')
          .update({ display_nickname: this.data.display_nickname })
          .eq('user_id', uid);
      }
    } catch (e) {
      console.error('Onboarding save error:', e);
    }
  }
};


// Start
document.addEventListener('DOMContentLoaded', () => App.init().catch(e => {
  console.error('App Init Fehler:', e);
  App.showScreen('screen-home');
}));
