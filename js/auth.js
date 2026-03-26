// === MedAT KFF Trainer – Auth-Modul ===
// Supabase Auth mit Email/Passwort

const Auth = {
  supabase: null,
  currentUser: null,
  userProfile: null,

  /**
   * Supabase Client initialisieren
   */
  init() {
    this.supabase = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );

    // Auth-State Listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.currentUser = session?.user || null;
        this.onAuthChange(true);
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.userProfile = null;
        this.onAuthChange(false);
      }
    });

    // Initiale Session prüfen
    return this.checkSession();
  },

  /**
   * Bestehende Session prüfen
   */
  async checkSession() {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        await this.loadProfile();
        return true;
      }
    } catch (e) {
      console.warn('Session-Check fehlgeschlagen:', e);
    }
    return false;
  },

  /**
   * Registrierung
   */
  async signUp(email, password, displayName) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin + '/?confirmed=true',
      }
    });

    if (error) throw error;

    // Wenn Email-Bestätigung nicht nötig (dev), direkt einloggen
    if (data.session) {
      this.currentUser = data.user;
      await this.loadProfile();
    }

    return data;
  },

  /**
   * Login
   */
  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    this.currentUser = data.user;
    await this.loadProfile();
    return data;
  },

  /**
   * Logout
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentUser = null;
    this.userProfile = null;
  },

  /**
   * Passwort zurücksetzen
   */
  async resetPassword(email) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html',
    });
    if (error) throw error;
  },

  /**
   * User-Profil laden
   */
  async loadProfile() {
    if (!this.currentUser) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profil laden fehlgeschlagen:', error);
        return null;
      }

      this.userProfile = data;

      // Check if user is blocked by admin
      if (data && data.blocked) {
        await this.supabase.auth.signOut();
        this.currentUser = null;
        this.userProfile = null;
        alert('Dein Account wurde gesperrt. Bitte kontaktiere den Support.');
        window.location.reload();
        return null;
      }

      return data;
    } catch (e) {
      console.warn('Profil-Fehler:', e);
      return null;
    }
  },

  /**
   * User-Profil aktualisieren
   */
  async updateProfile(updates) {
    if (!this.currentUser) return null;

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', this.currentUser.id)
      .select()
      .single();

    if (error) throw error;
    this.userProfile = data;
    return data;
  },

  /**
   * User-Statistiken laden (auth-basiert)
   */
  async getUserStats() {
    if (!this.currentUser) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_progress')
        .select('question_id, answered_correctly, time_taken_seconds, section_key, answered_at')
        .eq('user_id', this.currentUser.id);

      if (error) throw error;

      const total = data.length;
      const correct = data.filter(d => d.answered_correctly).length;

      // Streak berechnen
      const streak = this.calculateStreak(data);

      // Aktualisiere Profil-Stats
      if (this.userProfile && (this.userProfile.total_questions_answered !== total || this.userProfile.streak_count !== streak)) {
        this.updateProfile({
          total_questions_answered: total,
          total_correct: correct,
          streak_count: streak,
          last_active_date: new Date().toISOString().split('T')[0],
        }).catch(() => {});
      }

      return {
        total,
        correct,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        streak,
      };
    } catch (e) {
      console.warn('Stats-Fehler:', e);
      return { total: 0, correct: 0, percentage: 0, streak: 0 };
    }
  },

  /**
   * Streak berechnen (aufeinanderfolgende Tage mit Aktivität)
   */
  calculateStreak(progressData) {
    if (!progressData || progressData.length === 0) return 0;

    // Unique Tage extrahieren
    const days = [...new Set(progressData.map(d => {
      const date = new Date(d.answered_at);
      return date.toISOString().split('T')[0];
    }))].sort().reverse();

    if (days.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Streak nur zählen wenn heute oder gestern aktiv
    if (days[0] !== today && days[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < days.length; i++) {
      const current = new Date(days[i - 1]);
      const prev = new Date(days[i]);
      const diffDays = (current - prev) / 86400000;

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  },

  /**
   * Alte session_id-Daten zum neuen User migrieren
   */
  async migrateSessionData() {
    if (!this.currentUser) return;

    const sessionId = CONFIG.getSessionId();
    if (!sessionId) return;

    try {
      // Alle session-basierten Einträge zum User migrieren
      const { error } = await this.supabase
        .from('user_progress')
        .update({ user_id: this.currentUser.id })
        .eq('session_id', sessionId)
        .is('user_id', null);

      if (error) {
        console.warn('Migration fehlgeschlagen:', error);
      } else {
        console.log('Session-Daten erfolgreich migriert');
      }
    } catch (e) {
      console.warn('Migration-Fehler:', e);
    }
  },

  /**
   * MedAT-Countdown berechnen
   */
  getMedATCountdown() {
    if (!this.userProfile?.medat_date) return null;

    const target = new Date(this.userProfile.medat_date);
    const now = new Date();
    const diffMs = target - now;

    if (diffMs <= 0) return { days: 0, label: 'Der MedAT ist heute!' };

    const days = Math.ceil(diffMs / 86400000);
    return { days, label: `Noch ${days} Tage bis zum MedAT` };
  },

  /**
   * Callback bei Auth-Änderung (wird von App überschrieben)
   */
  onAuthChange(isLoggedIn) {
    // Wird von App.init() überschrieben
    console.log('Auth changed:', isLoggedIn);
  },

  /**
   * Hilfsfunktion: Ist User eingeloggt?
   */
  get isLoggedIn() {
    return !!this.currentUser;
  },

  /**
   * Hilfsfunktion: Display Name
   */
  get displayName() {
    return this.userProfile?.display_name
      || this.currentUser?.user_metadata?.display_name
      || this.currentUser?.email?.split('@')[0]
      || 'Gast';
  },

  /**
   * Lizenzcode validieren und aktivieren
   */
  async activateLicense(code, email) {
    if (!this.supabase) throw new Error('Keine Verbindung');
    if (!this.currentUser) throw new Error('Nicht eingeloggt');

    // Call server-side Edge Function (uses Service Role to update license_tier)
    const session = await this.supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    if (!token) throw new Error('Nicht eingeloggt');

    const resp = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/activate-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await resp.json();
    if (!resp.ok || data.error) throw new Error(data.error || 'Aktivierung fehlgeschlagen');

    // Reload profile from DB to get updated tier
    await this.loadProfile();

    return data.tier;
  },

  /**
   * Username setzen (bei Erstanmeldung)
   */
  async setUsername(username) {
    if (!this.currentUser) throw new Error('Nicht angemeldet');

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({
        username: username.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', this.currentUser.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Dieser Benutzername ist bereits vergeben');
      throw error;
    }
    this.userProfile = data;
    return data;
  },

  /**
   * Lizenz-Tier des aktuellen Users
   */
  get licenseTier() {
    const tier = this.userProfile?.license_tier || 'free';
    // Check if license has expired
    if (tier !== 'free' && this.userProfile?.license_expires_at) {
      if (new Date(this.userProfile.license_expires_at) < new Date()) {
        return 'free'; // Expired → treat as free
      }
    }
    return tier;
  },

  get licenseExpired() {
    if (!this.userProfile?.license_expires_at) return false;
    return new Date(this.userProfile.license_expires_at) < new Date();
  },

  get licenseExpiresAt() {
    return this.userProfile?.license_expires_at ? new Date(this.userProfile.license_expires_at) : null;
  },
};
