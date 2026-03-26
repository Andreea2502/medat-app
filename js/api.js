// === MedAT KFF Trainer – API-Modul ===
// Kommunikation mit Supabase (REST + JS Client)

const API = {
  /**
   * Fragen laden (nutzt Supabase JS Client wenn verfügbar)
   */
  // Track already-seen question IDs in this session to avoid duplicates
  _seenQuestionIds: new Set(),
  // Cache of previously answered question IDs (loaded from DB once per session)
  _previouslyAnsweredIds: null,

  resetSeenQuestions() {
    this._seenQuestionIds = new Set();
  },

  /**
   * Load question IDs the user has previously answered (from user_progress).
   * Cached after first load so it's only one DB call per session.
   */
  async _loadPreviouslyAnswered() {
    if (this._previouslyAnsweredIds !== null) return this._previouslyAnsweredIds;
    this._previouslyAnsweredIds = new Set();
    try {
      if (Auth.isLoggedIn && Auth.supabase && Auth.currentUser?.id) {
        const { data, error } = await Auth.supabase
          .from('user_progress')
          .select('question_id')
          .eq('user_id', Auth.currentUser.id);
        if (!error && data) {
          data.forEach(d => { if (d.question_id) this._previouslyAnsweredIds.add(d.question_id); });
          console.log(`[API] ${this._previouslyAnsweredIds.size} zuvor beantwortete Fragen geladen`);
        }
      }
    } catch (e) { console.warn('[API] Zuvor beantwortete Fragen konnten nicht geladen werden:', e); }
    return this._previouslyAnsweredIds;
  },

  async getQuestions(type, difficulty, limit = 10, subtype = null, topic = null) {
    // Supabase JS Client verwenden wenn Auth initialisiert
    if (Auth.supabase) {
      let query = Auth.supabase
        .from('questions')
        .select('id, type, subtype, difficulty, content, topic');

      query = query.eq('type', type);

      if (difficulty && difficulty !== 'mixed') {
        query = query.eq('difficulty', difficulty);
      }
      if (subtype && subtype !== 'all') {
        query = query.eq('subtype', subtype);
      }
      if (topic && topic !== 'all') {
        query = query.eq('topic', topic);
      }

      // Load dramatically more to allow strict filtering of duplicates during batch generation
      query = query.limit(Math.min(limit * 20, 1000));

      const { data, error } = await query;
      if (error) throw new Error(`Fehler beim Laden der Fragen: ${error.message}`);

      // Load previously answered IDs (cached)
      const prevAnswered = await this._loadPreviouslyAnswered();

      // Filter out already-seen questions in this session
      let available = data.filter(q => !this._seenQuestionIds.has(q.id));
      if (available.length < limit) available = data;

      // 80% fresh strategy: prefer questions the user hasn't seen before
      const fresh = available.filter(q => !prevAnswered.has(q.id));
      const old = available.filter(q => prevAnswered.has(q.id));

      let selected;
      const freshTarget = Math.ceil(limit * 0.8); // 80% should be new

      if (fresh.length >= freshTarget) {
        // Enough fresh questions: pick 80% fresh + 20% old (shuffled)
        const freshPick = this._shuffleAndLimit(fresh, freshTarget);
        const oldPick = this._shuffleAndLimit(old, limit - freshTarget);
        selected = [...freshPick, ...oldPick];
        // If we didn't get enough old ones, fill with more fresh
        if (selected.length < limit) {
          const remaining = fresh.filter(q => !selected.some(s => s.id === q.id));
          selected.push(...this._shuffleAndLimit(remaining, limit - selected.length));
        }
        // Final shuffle so fresh/old are mixed
        selected = this._shuffleAndLimit(selected, selected.length);
      } else {
        // Not enough fresh questions: use all fresh + fill from old
        selected = [...this._shuffleAndLimit(fresh, fresh.length), ...this._shuffleAndLimit(old, limit - fresh.length)];
        selected = this._shuffleAndLimit(selected, limit);
      }

      // Mark these as seen
      selected.forEach(q => this._seenQuestionIds.add(q.id));

      return selected;
    }

    // Fallback: REST API
    return this._getQuestionsREST(type, difficulty, limit, subtype, topic);
  },

  /**
   * Fallback: REST API für Fragen
   */
  async _getQuestionsREST(type, difficulty, limit, subtype, topic) {
    let url = `${CONFIG.SUPABASE_URL}/rest/v1/questions?type=eq.${encodeURIComponent(type)}&select=id,type,subtype,difficulty,content,topic`;

    if (difficulty && difficulty !== 'mixed') {
      url += `&difficulty=eq.${difficulty}`;
    }
    if (subtype && subtype !== 'all') {
      url += `&subtype=eq.${encodeURIComponent(subtype)}`;
    }
    if (topic && topic !== 'all') {
      url += `&topic=eq.${encodeURIComponent(topic)}`;
    }
    url += `&limit=${Math.min(limit * 20, 1000)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Fehler beim Laden der Fragen (${response.status})`);
    }

    const questions = await response.json();
    return this._shuffleAndLimit(questions, limit);
  },

  /**
   * Mischen + Limitieren
   */
  _shuffleAndLimit(questions, limit) {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    return questions.slice(0, limit);
  },

  /**
   * Antwort-Fortschritt speichern (mit optionalem user_id + section_key + wrong_answer_detail)
   */
  async saveProgress(progress, sectionKey = null) {
    const body = {
      session_id: CONFIG.getSessionId(),
      ...progress,
    };

    // Auth: user_id hinzufügen wenn eingeloggt
    if (Auth.isLoggedIn) {
      body.user_id = Auth.currentUser.id;
    }

    // Section-Key hinzufügen
    if (sectionKey) {
      body.section_key = sectionKey;
    }

    // Note: wrong_answer_detail is passed through from progress if present
    // It will be stored in the user_progress table (column must exist)

    if (Auth.supabase) {
      const { error } = await Auth.supabase
        .from('user_progress')
        .insert(body);

      if (error) {
        console.warn('Fortschritt konnte nicht gespeichert werden:', error.message);
      }
      return;
    }

    // Fallback: REST
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/user_progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.warn('Fortschritt konnte nicht gespeichert werden:', response.status);
      }
    } catch (e) {
      console.warn('Fortschritt-Speicherung fehlgeschlagen:', e);
    }
  },

  /**
   * Session-Statistik laden (auth-basiert oder session-basiert)
   * Returns: { total, correct, percentage, streak, todayCount }
   */
  async getSessionStats() {
    // Wenn eingeloggt: User-Stats über Auth
    if (Auth.isLoggedIn) {
      const stats = await Auth.getUserStats();
      // Add today's count
      stats.todayCount = await this._getTodayCount();
      return stats;
    }

    // Fallback: Session-basiert
    const sessionId = CONFIG.getSessionId();

    if (Auth.supabase) {
      const { data, error } = await Auth.supabase
        .from('user_progress')
        .select('question_id, answered_correctly, time_taken_seconds, answered_at')
        .eq('session_id', sessionId);

      if (error) return { total: 0, correct: 0, percentage: 0, streak: 0, todayCount: 0 };

      const correct = data.filter(d => d.answered_correctly).length;
      const today = new Date().toISOString().split('T')[0];
      const todayCount = data.filter(d => d.answered_at && d.answered_at.startsWith(today)).length;
      return {
        total: data.length,
        correct,
        percentage: data.length > 0 ? Math.round((correct / data.length) * 100) : 0,
        streak: 0,
        todayCount,
      };
    }

    // Fallback: REST
    try {
      const url = `${CONFIG.SUPABASE_URL}/rest/v1/user_progress?session_id=eq.${sessionId}&select=question_id,answered_correctly,time_taken_seconds,answered_at`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'apikey': CONFIG.SUPABASE_ANON_KEY,
        },
      });

      if (!response.ok) return { total: 0, correct: 0, percentage: 0, streak: 0, todayCount: 0 };

      const data = await response.json();
      const correct = data.filter(d => d.answered_correctly).length;
      const today = new Date().toISOString().split('T')[0];
      const todayCount = data.filter(d => d.answered_at && d.answered_at.startsWith(today)).length;

      return {
        total: data.length,
        correct,
        percentage: data.length > 0 ? Math.round((correct / data.length) * 100) : 0,
        streak: 0,
        todayCount,
      };
    } catch {
      return { total: 0, correct: 0, percentage: 0, streak: 0, todayCount: 0 };
    }
  },

  /**
   * Heutige Fragen zählen (für eingeloggte User)
   */
  async _getTodayCount() {
    if (!Auth.supabase || !Auth.isLoggedIn) return 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { count, error } = await Auth.supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', Auth.currentUser.id)
        .gte('answered_at', today + 'T00:00:00');
      return error ? 0 : (count || 0);
    } catch {
      return 0;
    }
  },

  /**
   * Verfügbare Topics für eine Sektion laden
   */
  async getTopics(type, subtype) {
    if (Auth.supabase) {
      const { data, error } = await Auth.supabase
        .from('questions')
        .select('topic')
        .eq('type', type)
        .eq('subtype', subtype)
        .not('topic', 'is', null);

      if (error) return [];
      // Unique topics mit Zählung
      const counts = {};
      data.forEach(d => { counts[d.topic] = (counts[d.topic] || 0) + 1; });
      return Object.entries(counts)
        .map(([topic, count]) => ({ topic, count }))
        .sort((a, b) => a.topic.localeCompare(b.topic, 'de'));
    }
    return [];
  },

  /**
   * Schwächenanalyse: Topic-basierte Stats für User laden
   */
  async getTopicWeaknesses(subtype) {
    const userId = Auth.isLoggedIn ? Auth.currentUser.id : null;
    const sessionId = CONFIG.getSessionId();

    if (!Auth.supabase) return [];

    // Alle Antworten für diese Sektion laden
    let query = Auth.supabase
      .from('user_progress')
      .select('question_id, answered_correctly, wrong_answer_detail')
      .eq('section_key', `bms_${subtype}`);

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    // Frage-IDs sammeln um Topics zu laden
    const questionIds = [...new Set(data.map(d => d.question_id).filter(Boolean))];
    if (questionIds.length === 0) return [];

    // Topics für diese Fragen laden
    const { data: questions } = await Auth.supabase
      .from('questions')
      .select('id, topic')
      .in('id', questionIds);

    if (!questions) return [];

    // Topic-Map erstellen
    const topicMap = {};
    questions.forEach(q => { topicMap[q.id] = q.topic || 'Unbekannt'; });

    // Stats pro Topic berechnen
    const topicStats = {};
    data.forEach(d => {
      const topic = topicMap[d.question_id] || 'Unbekannt';
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0, wrong: 0, wrongDetails: [] };
      topicStats[topic].total++;
      if (d.answered_correctly) {
        topicStats[topic].correct++;
      } else {
        topicStats[topic].wrong++;
        if (d.wrong_answer_detail) {
          try {
            const detail = typeof d.wrong_answer_detail === 'string' ? JSON.parse(d.wrong_answer_detail) : d.wrong_answer_detail;
            topicStats[topic].wrongDetails.push(detail);
          } catch(e) {}
        }
      }
    });

    // Als Array sortiert nach Fehlerquote (schlechteste zuerst)
    return Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        ...stats,
        percentage: Math.round((stats.correct / stats.total) * 100),
        errorRate: Math.round((stats.wrong / stats.total) * 100),
      }))
      .sort((a, b) => a.percentage - b.percentage);
  },

  /**
   * KI-Schwächenanalyse: Personalisierte Erklärung generieren
   */
  async getWeaknessAnalysis(weaknesses) {
    const url = `${CONFIG.SUPABASE_URL}/functions/v1/analyze-weakness`;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      };
      if (Auth.supabase) {
        const { data: { session } } = await Auth.supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ weaknesses }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.analysis || null;
    } catch {
      return null;
    }
  },

  /**
   * KI-Erklärung holen (Edge Function)
   */
  /**
   * Fragenanzahl pro Sektion aus der DB laden (optimiert: einzelne COUNT-Abfragen)
   * Returns: { 'bms_biologie': 801, 'bms_chemie': 495, ... }
   */
  _questionCountsCache: null,
  _questionCountsCacheTime: 0,

  async getQuestionCounts() {
    // Cache für 5 Minuten
    if (this._questionCountsCache && (Date.now() - this._questionCountsCacheTime < 300000)) {
      return this._questionCountsCache;
    }

    try {
      if (!Auth.supabase) return {};

      // Alle Sektionen parallel zählen
      const sections = [
        { key: 'bms_biologie', type: 'bms', subtype: 'biologie' },
        { key: 'bms_chemie', type: 'bms', subtype: 'chemie' },
        { key: 'bms_physik', type: 'bms', subtype: 'physik' },
        { key: 'bms_mathematik', type: 'bms', subtype: 'mathematik' },
        { key: 'zahlenfolge', type: 'zahlenfolge', subtype: null },
        { key: 'wortfluessigkeit', type: 'wortfluessigkeit', subtype: null },
        { key: 'implikation', type: 'implikation', subtype: null },
      ];

      const promises = sections.map(async (sec) => {
        let query = Auth.supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .eq('type', sec.type);
        if (sec.subtype) query = query.eq('subtype', sec.subtype);
        const { count } = await query;
        return { key: sec.key, count: count || 0 };
      });

      // TV und SEK parallel zählen
      const tvPromise = Auth.supabase
        .from('pre_generated_tv')
        .select('id', { count: 'exact', head: true })
        .then(({ count }) => ({ key: 'textverstaendnis', count: (count || 0) * 3 }));

      const sekPromise = Auth.supabase
        .from('pre_generated_sek')
        .select('id', { count: 'exact', head: true })
        .then(({ count }) => ({ key: 'sek_total', count: count || 0 }));

      const sekSubPromises = ['emotionen_erkennen', 'emotionen_regulieren', 'soziales_entscheiden'].map(async (sub) => {
        const { count } = await Auth.supabase
          .from('pre_generated_sek')
          .select('id', { count: 'exact', head: true })
          .eq('sek_type', sub);
        return { key: `sek_${sub}`, count: count || 0 };
      });

      const results = await Promise.all([...promises, tvPromise, sekPromise, ...sekSubPromises]);
      const counts = {};
      results.forEach(r => { counts[r.key] = r.count; });

      // Dynamische Sektionen (Figuren = unbegrenzt, Allergieausweise = 294 Fotos)
      counts['figur'] = 999;
      counts['allergieausweis_mem'] = 294;
      counts['allergieausweis_abruf'] = 294;

      this._questionCountsCache = counts;
      this._questionCountsCacheTime = Date.now();
      return counts;
    } catch {
      return {};
    }
  },

  async getTotalAvailableQuestions() {
    // Cache für 5 Minuten
    if (this._totalQuestionsCache && (Date.now() - this._totalQuestionsCacheTime < 300000)) {
      return this._totalQuestionsCache;
    }

    try {
      if (!Auth.supabase) return 0;

      // Hauptfragen zählen
      const { count: mainCount } = await Auth.supabase
        .from('questions')
        .select('id', { count: 'exact', head: true });

      // pre_generated_sek zählen
      const { count: sekCount } = await Auth.supabase
        .from('pre_generated_sek')
        .select('id', { count: 'exact', head: true });

      // pre_generated_tv zählen und mit 3 multiplizieren (3 Fragen pro Text)
      const { count: tvCount } = await Auth.supabase
        .from('pre_generated_tv')
        .select('id', { count: 'exact', head: true });
      const tvQuestions = (tvCount || 0) * 3;

      // Figuren sind unbegrenzt (dynamisch generiert)
      const total = (mainCount || 0) + (sekCount || 0) + tvQuestions;

      this._totalQuestionsCache = total;
      this._totalQuestionsCacheTime = Date.now();
      return total;
    } catch {
      return 0;
    }
  },

  async getExplanation(questionData, userAnswer) {
    const url = `${CONFIG.SUPABASE_URL}/functions/v1/explain-answer`;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      };

      // Wenn eingeloggt: Auth-Token verwenden
      if (Auth.supabase) {
        const { data: { session } } = await Auth.supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ question: questionData, user_answer: userAnswer }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.explanation || null;
    } catch {
      return null;
    }
  },
};
