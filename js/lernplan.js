// === MedAT Lernplan – Uni Graz Stichwortliste + KFF-Wechsel ===
// Lokaler Plan (localStorage), adaptiv nach Zeitdruck + personalisierbarem Vorwissen

const Lernplan = (() => {

  // ── VOLLSTÄNDIGE UNI GRAZ STICHWORTLISTE ─────────────────────────────────

  const CATEGORIES = [
    {
      id: 'bio', label: 'Biologie', color: '#10b981', colorSoft: '#ecfdf5', icon: '🧬',
      topics: [
        { id: 'b01', name: 'Zellmembran & Organellen', key: 'biologie' },
        { id: 'b02', name: 'Zellzyklus: Mitose & Meiose', key: 'biologie' },
        { id: 'b03', name: 'DNA-Struktur & Replikation', key: 'biologie' },
        { id: 'b04', name: 'Transkription & Translation', key: 'biologie' },
        { id: 'b05', name: 'Genetik: Mendel & Erbgänge', key: 'biologie' },
        { id: 'b06', name: 'Mutationen & Erbkrankheiten', key: 'biologie' },
        { id: 'b07', name: 'Evolution & Selektion', key: 'biologie' },
        { id: 'b08', name: 'Ökosysteme & Nahrungsnetze', key: 'biologie' },
        { id: 'b09', name: 'Bakterien, Viren & Pilze', key: 'biologie' },
        { id: 'b10', name: 'Blut & Immunsystem', key: 'biologie' },
        { id: 'b11', name: 'Herz & Kreislauf', key: 'biologie' },
        { id: 'b12', name: 'Atmung & Gasaustausch', key: 'biologie' },
        { id: 'b13', name: 'Verdauung & Resorption', key: 'biologie' },
        { id: 'b14', name: 'Niere & Osmoregulation', key: 'biologie' },
        { id: 'b15', name: 'Nervensystem & Synapsen', key: 'biologie' },
        { id: 'b16', name: 'Sinnesorgane', key: 'biologie' },
        { id: 'b17', name: 'Hormonsystem & Regelkreise', key: 'biologie' },
        { id: 'b18', name: 'Bewegungsapparat & Muskel', key: 'biologie' },
        { id: 'b19', name: 'Reproduktion & Entwicklung', key: 'biologie' },
        { id: 'b20', name: 'Enzyme & Stoffwechselwege', key: 'biologie' },
      ],
    },
    {
      id: 'chem', label: 'Chemie', color: '#3b82f6', colorSoft: '#eff6ff', icon: '⚗️',
      topics: [
        { id: 'c01', name: 'Atombau & Periodensystem', key: 'chemie' },
        { id: 'c02', name: 'Chemische Bindungen', key: 'chemie' },
        { id: 'c03', name: 'Stöchiometrie & Molrechnung', key: 'chemie' },
        { id: 'c04', name: 'Säuren, Basen & pH-Wert', key: 'chemie' },
        { id: 'c05', name: 'Puffer & Gleichgewichte', key: 'chemie' },
        { id: 'c06', name: 'Redox & Elektrochemie', key: 'chemie' },
        { id: 'c07', name: 'Organische Grundverbindungen', key: 'chemie' },
        { id: 'c08', name: 'Funktionelle Gruppen & Reaktionen', key: 'chemie' },
        { id: 'c09', name: 'Kohlenhydrate & Lipide', key: 'chemie' },
        { id: 'c10', name: 'Proteine & Aminosäuren', key: 'chemie' },
        { id: 'c11', name: 'Nukleinsäuren & Vitamine', key: 'chemie' },
        { id: 'c12', name: 'Thermodynamik & Reaktionskinetik', key: 'chemie' },
      ],
    },
    {
      id: 'phys', label: 'Physik', color: '#8b5cf6', colorSoft: '#f3eeff', icon: '⚡',
      topics: [
        { id: 'p01', name: 'Kinematik & Beschleunigung', key: 'physik' },
        { id: 'p02', name: 'Kräfte & Newtonsche Gesetze', key: 'physik' },
        { id: 'p03', name: 'Arbeit, Energie & Leistung', key: 'physik' },
        { id: 'p04', name: 'Druck, Auftrieb & Hydrostatik', key: 'physik' },
        { id: 'p05', name: 'Elektrisches Feld & Spannung', key: 'physik' },
        { id: 'p06', name: 'Strom, Widerstand & Schaltkreise', key: 'physik' },
        { id: 'p07', name: 'Magnetismus & Elektromagnetismus', key: 'physik' },
        { id: 'p08', name: 'Wellen, Schall & Doppler', key: 'physik' },
        { id: 'p09', name: 'Optik: Reflexion, Brechung, Linsen', key: 'physik' },
        { id: 'p10', name: 'Radioaktivität & Strahlung', key: 'physik' },
      ],
    },
    {
      id: 'math', label: 'Mathematik', color: '#f59e0b', colorSoft: '#fffbeb', icon: '🔢',
      topics: [
        { id: 'm01', name: 'Algebra & lineare Gleichungen', key: 'mathematik' },
        { id: 'm02', name: 'Quadratische Gleichungen & Funktionen', key: 'mathematik' },
        { id: 'm03', name: 'Exponential- & Logarithmusfunktionen', key: 'mathematik' },
        { id: 'm04', name: 'Trigonometrie & Winkelfunktionen', key: 'mathematik' },
        { id: 'm05', name: 'Vektoren & Analytische Geometrie', key: 'mathematik' },
        { id: 'm06', name: 'Kombinatorik & Wahrscheinlichkeit', key: 'mathematik' },
        { id: 'm07', name: 'Statistik & Datenanalyse', key: 'mathematik' },
        { id: 'm08', name: 'Mengenlehre & Logik', key: 'mathematik' },
      ],
    },
  ];

  const ALL_TOPICS = CATEGORIES.flatMap(c => c.topics.map(t => ({ ...t, cat: c.id, catLabel: c.label, catColor: c.color, catIcon: c.icon })));

  const KFF_SECTIONS = [
    { key: 'zahlenfolge',        label: 'Zahlenfolgen',           icon: '🔢', desc: '~15 Aufgaben' },
    { key: 'implikation',        label: 'Implikationen erkennen', icon: '💭', desc: '~10 Aufgaben' },
    { key: 'wortflüssigkeit',    label: 'Wortflüssigkeit',        icon: '📝', desc: '~10 Aufgaben' },
    { key: 'figur',              label: 'Figuren zusammensetzen', icon: '🧩', desc: '~10 Aufgaben' },
    { key: 'allergieausweis_frage', label: 'Allergieausweise',   icon: '📋', desc: '~8 Aufgaben'  },
    { key: 'textverstaendnis',   label: 'Textverständnis',        icon: '📖', desc: '~8 Aufgaben'  },
  ];

  const LS_KEY = 'medat_lernplan_v3';

  // ── Setup state (persists between wizard steps) ───────────────────────────
  let _setupState = { step: 1, date: '', mins: 60, ratings: {} };

  // ── Weighted plan generation ──────────────────────────────────────────────

  function _buildWeightedTopics(topicRatings) {
    const red = [], yellow = [], green = [];
    ALL_TOPICS.forEach(t => {
      const r = topicRatings[t.id] || 'yellow';
      if (r === 'red')        red.push(t);
      else if (r === 'green') green.push(t);
      else                    yellow.push(t);
    });
    // Primary cycling pool: weak topics × 3, medium × 1
    const primaryPool = [...red, ...red, ...red, ...yellow];
    // Fallback: all topics if nothing in pool
    if (primaryPool.length === 0) return { primaryPool: [...ALL_TOPICS], green: [] };
    return { primaryPool, green };
  }

  function _generatePlan(medatDate, dailyMinutes = 60, topicRatings = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(medatDate);
    target.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.floor((target - today) / 86400000));

    // Adaptive topics per day based on time pressure + daily time
    let topicsPerDay;
    if (totalDays > 90)      topicsPerDay = dailyMinutes >= 90 ? 2 : 1;
    else if (totalDays > 60) topicsPerDay = dailyMinutes >= 90 ? 3 : 2;
    else if (totalDays > 30) topicsPerDay = dailyMinutes >= 90 ? 4 : 3;
    else                     topicsPerDay = dailyMinutes >= 60 ? 5 : 4;

    // Build weighted sequence: weak topics appear 3× as often, green at end
    const { primaryPool, green } = _buildWeightedTopics(topicRatings);
    const topicsFlat = [...primaryPool, ...green];
    const needed = totalDays * topicsPerDay;
    while (topicsFlat.length < needed) {
      topicsFlat.push(...primaryPool);
    }

    const days = [];
    let kffIdx = 0;

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(today.getTime() + d * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const startIdx = d * topicsPerDay;

      const dayTopics = topicsFlat.slice(startIdx, startIdx + topicsPerDay).map(t => ({
        id: t.id,
        name: t.name,
        cat: t.cat,
        catColor: t.catColor,
        catLabel: t.catLabel,
        catIcon: t.catIcon,
        bmsKey: t.key,
        done: false,
        confidence: null, // null | 'red' | 'yellow' | 'green'
      }));

      days.push({
        date: dateStr,
        dayNum: d + 1,
        topics: dayTopics,
        kff: KFF_SECTIONS[kffIdx % KFF_SECTIONS.length],
        kffDone: false,
        allDone: false,
      });

      kffIdx++;
    }

    return {
      medatDate,
      dailyMinutes,
      topicRatings,
      generatedAt: today.toISOString().split('T')[0],
      topicsPerDay,
      days,
    };
  }

  function _save(plan) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(plan)); } catch(e) {}
  }

  function _load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function _getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function _getStreak(plan) {
    if (!plan) return 0;
    const today = _getToday();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const day = plan.days.find(x => x.date === d);
      if (!day) break;
      if (day.allDone) streak++;
      else if (d === today) continue;
      else break;
    }
    return streak;
  }

  function _getDaysLeft(medatDate) {
    const diff = new Date(medatDate) - new Date();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function _getTodayDay(plan) {
    return plan?.days.find(d => d.date === _getToday());
  }

  function _getCompletionPct(plan) {
    if (!plan || plan.days.length === 0) return 0;
    const done = plan.days.filter(d => d.allDone).length;
    return Math.round(done / plan.days.length * 100);
  }

  // ── Main render ───────────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('lernplan-content');
    if (!container) return;
    const plan = _load();
    if (!plan) {
      _renderSetup(container);
    } else {
      _renderPlan(container, plan);
    }
  }

  // ── Setup / Wizard ────────────────────────────────────────────────────────

  function _renderSetup(container) {
    if (_setupState.step === 2) {
      _renderStep2(container);
    } else {
      _renderStep1(container);
    }
  }

  // Step indicator HTML
  function _stepIndicatorHTML(activeStep) {
    return `
      <div class="lp-step-indicator">
        <div class="lp-step-item ${activeStep === 1 ? 'lp-step-active' : 'lp-step-done'}">
          <span class="lp-step-circle">${activeStep > 1 ? '✓' : '1'}</span>
          <span class="lp-step-label">Zeitplan</span>
        </div>
        <div class="lp-step-line ${activeStep > 1 ? 'lp-step-line-done' : ''}"></div>
        <div class="lp-step-item ${activeStep === 2 ? 'lp-step-active' : ''}">
          <span class="lp-step-circle">2</span>
          <span class="lp-step-label">Vorwissen</span>
        </div>
      </div>
    `;
  }

  function _renderStep1(container) {
    const today = new Date();
    const profileDate = (typeof Auth !== 'undefined' && Auth?.userProfile?.medat_date) || '';
    const defaultDate = _setupState.date || profileDate || new Date(today.getFullYear(), 6, 4).toISOString().split('T')[0];
    const activeMins = _setupState.mins || 60;

    container.innerHTML = `
      <div class="lp-setup">
        ${_stepIndicatorHTML(1)}

        <div class="lp-setup-hero">
          <div class="lp-setup-icon">📅</div>
          <h2>Dein MedAT-Lernplan</h2>
          <p>Basierend auf der offiziellen <strong>Uni Graz Stichwortliste</strong> — täglich BMS-Themen + KFF-Training, adaptiv nach Zeitdruck.</p>
        </div>

        <div class="lp-setup-fields">
          <div class="lp-setup-field">
            <label class="lp-setup-label">📆 Wann ist dein MedAT?</label>
            <input type="date" id="lp-date-input" class="lp-setup-input"
              value="${defaultDate}"
              min="${today.toISOString().split('T')[0]}">
            <div class="lp-setup-hint" id="lp-date-hint"></div>
          </div>

          <div class="lp-setup-field">
            <label class="lp-setup-label">⏱️ Wie viel Zeit täglich?</label>
            <div class="lp-time-grid">
              <button class="lp-time-btn ${activeMins === 30 ? 'lp-time-active' : ''}" data-min="30">30 min</button>
              <button class="lp-time-btn ${activeMins === 60 ? 'lp-time-active' : ''}" data-min="60">1 Std</button>
              <button class="lp-time-btn ${activeMins === 90 ? 'lp-time-active' : ''}" data-min="90">1,5 Std</button>
              <button class="lp-time-btn ${activeMins === 120 ? 'lp-time-active' : ''}" data-min="120">2 Std</button>
              <button class="lp-time-btn ${activeMins === 180 ? 'lp-time-active' : ''}" data-min="180">3+ Std</button>
            </div>
          </div>
        </div>

        <div class="lp-preview-box" id="lp-preview-box"></div>

        <button class="lp-next-btn" id="lp-step1-next" style="margin-top:1.25rem">
          Weiter: Vorwissen einschätzen →
        </button>
      </div>
    `;

    const dateInput = document.getElementById('lp-date-input');

    const updatePreview = () => {
      const days = Math.ceil((new Date(dateInput.value) - new Date()) / 86400000);
      const mins = parseInt(document.querySelector('.lp-time-active')?.dataset.min || '60');
      const hint = document.getElementById('lp-date-hint');

      if (days <= 0) {
        if (hint) hint.innerHTML = `<span style="color:#ef4444">Datum liegt in der Vergangenheit!</span>`;
        return;
      }

      let tpd = days > 90 ? (mins >= 90 ? 2 : 1) : days > 60 ? (mins >= 90 ? 3 : 2) : days > 30 ? (mins >= 90 ? 4 : 3) : (mins >= 60 ? 5 : 4);
      if (hint) hint.innerHTML = `<span style="color:#059669">Noch ${days} Tage → ${tpd} BMS-Thema${tpd > 1 ? 'en' : ''} + 1 KFF-Einheit pro Tag</span>`;

      const preview = document.getElementById('lp-preview-box');
      if (preview) {
        preview.innerHTML = `
          <div class="lp-preview-row">
            <div class="lp-preview-stat"><span>${days}</span><small>Tage</small></div>
            <div class="lp-preview-stat"><span>${tpd}</span><small>Themen/Tag</small></div>
            <div class="lp-preview-stat"><span>${ALL_TOPICS.length}</span><small>BMS-Themen</small></div>
            <div class="lp-preview-stat"><span>${KFF_SECTIONS.length}</span><small>KFF-Typen</small></div>
          </div>
          <div class="lp-preview-note">Alle ${ALL_TOPICS.length} Uni Graz BMS-Themen werden abgedeckt${days > ALL_TOPICS.length / tpd ? ' + Wiederholungsrunden' : ''}.</div>
        `;
      }
    };

    dateInput.addEventListener('change', updatePreview);
    document.querySelectorAll('.lp-time-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.lp-time-btn').forEach(b => b.classList.remove('lp-time-active'));
        btn.classList.add('lp-time-active');
        updatePreview();
      };
    });

    document.getElementById('lp-step1-next').onclick = () => {
      const date = dateInput.value;
      if (!date || new Date(date) <= new Date()) {
        alert('Bitte ein gültiges MedAT-Datum wählen.');
        return;
      }
      const mins = parseInt(document.querySelector('.lp-time-active')?.dataset.min || '60');
      _setupState.date = date;
      _setupState.mins = mins;
      _setupState.step = 2;
      _renderStep2(container);
    };

    updatePreview();
  }

  function _renderStep2(container) {
    const counts = _getAssessCounts();

    const categoriesHTML = CATEGORIES.map(cat => {
      const topicsHTML = cat.topics.map(t => {
        const r = _setupState.ratings[t.id] || 'yellow';
        return `
          <div class="lp-assess-topic-row">
            <div class="lp-assess-topic-name">${t.name}</div>
            <div class="lp-assess-rating-btns">
              <button class="lp-assess-btn ${r === 'red' ? 'lp-assess-active lp-assess-active-red' : ''}"
                data-action="rate" data-tid="${t.id}" data-rating="red" title="Schwach — wird 3× öfter geübt">🔴</button>
              <button class="lp-assess-btn ${r === 'yellow' ? 'lp-assess-active lp-assess-active-yellow' : ''}"
                data-action="rate" data-tid="${t.id}" data-rating="yellow" title="Mittel — normales Pensum">🟡</button>
              <button class="lp-assess-btn ${r === 'green' ? 'lp-assess-active lp-assess-active-green' : ''}"
                data-action="rate" data-tid="${t.id}" data-rating="green" title="Gut — nur 1× zur Wiederholung am Ende">🟢</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="lp-assess-cat-section">
          <div class="lp-assess-cat-header" style="border-left: 4px solid ${cat.color}">
            <span class="lp-assess-cat-icon">${cat.icon}</span>
            <span class="lp-assess-cat-title" style="color:${cat.color}">${cat.label}</span>
            <div class="lp-assess-bulk-btns">
              <button class="lp-assess-bulk-btn lp-bulk-red" data-bulk-cat="${cat.id}" data-bulk-rating="red">Alle 🔴</button>
              <button class="lp-assess-bulk-btn lp-bulk-yellow" data-bulk-cat="${cat.id}" data-bulk-rating="yellow">Alle 🟡</button>
              <button class="lp-assess-bulk-btn lp-bulk-green" data-bulk-cat="${cat.id}" data-bulk-rating="green">Alle 🟢</button>
            </div>
          </div>
          ${topicsHTML}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="lp-assess">
        ${_stepIndicatorHTML(2)}

        <div class="lp-assess-header">
          <h2>📊 Vorwissen einschätzen</h2>
          <p>Bewerte jeden Themenbereich ehrlich. <strong>Schwache Themen 🔴 erscheinen 3× häufiger</strong> im Plan — gute Themen 🟢 kommen einmal zur Wiederholung ans Ende.</p>
        </div>

        <div class="lp-assess-summary" id="lp-assess-summary">
          <div class="lp-assess-summary-item lp-assess-summary-red">
            <span class="lp-assess-summary-count" id="lp-count-red">${counts.red}</span>
            <span class="lp-assess-summary-label">🔴 Schwach</span>
          </div>
          <div class="lp-assess-summary-item lp-assess-summary-yellow">
            <span class="lp-assess-summary-count" id="lp-count-yellow">${counts.yellow}</span>
            <span class="lp-assess-summary-label">🟡 Mittel</span>
          </div>
          <div class="lp-assess-summary-item lp-assess-summary-green">
            <span class="lp-assess-summary-count" id="lp-count-green">${counts.green}</span>
            <span class="lp-assess-summary-label">🟢 Gut</span>
          </div>
        </div>

        <div class="lp-assess-categories" id="lp-assess-categories">
          ${categoriesHTML}
        </div>

        <div class="lp-nav-btns">
          <button class="lp-back-btn" id="lp-back-btn">← Zurück</button>
          <button class="lp-create-btn" id="lp-create-btn">✨ Lernplan erstellen</button>
        </div>
      </div>
    `;

    // Delegate: topic rating buttons
    const catContainer = document.getElementById('lp-assess-categories');
    catContainer.addEventListener('click', e => {
      // Single topic rating
      const rateBtn = e.target.closest('[data-action="rate"]');
      if (rateBtn) {
        const tid = rateBtn.dataset.tid;
        const rating = rateBtn.dataset.rating;
        _setupState.ratings[tid] = rating;
        // Update visual for this row only
        const row = rateBtn.closest('.lp-assess-topic-row');
        row.querySelectorAll('.lp-assess-btn').forEach(b => {
          b.classList.remove('lp-assess-active', 'lp-assess-active-red', 'lp-assess-active-yellow', 'lp-assess-active-green');
        });
        rateBtn.classList.add('lp-assess-active', `lp-assess-active-${rating}`);
        _updateAssessCounts();
        return;
      }
      // Bulk rating per category
      const bulkBtn = e.target.closest('[data-bulk-cat]');
      if (bulkBtn) {
        const catId = bulkBtn.dataset.bulkCat;
        const rating = bulkBtn.dataset.bulkRating;
        const cat = CATEGORIES.find(c => c.id === catId);
        if (cat) {
          cat.topics.forEach(t => { _setupState.ratings[t.id] = rating; });
          // Re-render only categories section
          _renderStep2(container);
        }
      }
    });

    document.getElementById('lp-back-btn').onclick = () => {
      _setupState.step = 1;
      _renderStep1(container);
    };

    document.getElementById('lp-create-btn').onclick = () => {
      const plan = _generatePlan(_setupState.date, _setupState.mins, _setupState.ratings);
      _save(plan);
      _setupState = { step: 1, date: '', mins: 60, ratings: {} };
      render();
    };
  }

  function _getAssessCounts() {
    const counts = { red: 0, yellow: 0, green: 0 };
    ALL_TOPICS.forEach(t => {
      const r = _setupState.ratings[t.id] || 'yellow';
      counts[r]++;
    });
    return counts;
  }

  function _updateAssessCounts() {
    const counts = _getAssessCounts();
    const r = document.getElementById('lp-count-red');
    const y = document.getElementById('lp-count-yellow');
    const g = document.getElementById('lp-count-green');
    if (r) r.textContent = counts.red;
    if (y) y.textContent = counts.yellow;
    if (g) g.textContent = counts.green;
  }

  // ── Plan view ─────────────────────────────────────────────────────────────

  function _renderPlan(container, plan) {
    const today = _getToday();
    const todayDay = _getTodayDay(plan);
    const streak = _getStreak(plan);
    const pct = _getCompletionPct(plan);
    const daysLeft = _getDaysLeft(plan.medatDate);
    const doneDays = plan.days.filter(d => d.allDone).length;

    const todayTopicsDone = todayDay ? todayDay.topics.filter(t => t.done).length : 0;
    const todayTopicsTotal = todayDay ? todayDay.topics.length : 0;

    // Compute rating legend if plan has ratings
    const ratings = plan.topicRatings || {};
    const redCount = ALL_TOPICS.filter(t => ratings[t.id] === 'red').length;
    const greenCount = ALL_TOPICS.filter(t => ratings[t.id] === 'green').length;
    const ratingBadge = redCount > 0
      ? `<div class="lp-rating-badge">🔴 ${redCount} intensiv · 🟢 ${greenCount} Wiederholung</div>`
      : '';

    container.innerHTML = `
      <div class="lp-plan">

        <!-- Stats Header -->
        <div class="lp-stats-header">
          <div class="lp-stat-card lp-stat-countdown">
            <div class="lp-stat-big">${daysLeft}</div>
            <div class="lp-stat-sub">Tage bis MedAT</div>
          </div>
          <div class="lp-stat-card">
            <div class="lp-stat-big">${streak > 0 ? '🔥' : '—'}${streak}</div>
            <div class="lp-stat-sub">Streak</div>
          </div>
          <div class="lp-stat-card">
            <div class="lp-stat-big">${pct}%</div>
            <div class="lp-stat-sub">Erledigt</div>
          </div>
          <div class="lp-stat-card">
            <div class="lp-stat-big">${doneDays}/${plan.days.length}</div>
            <div class="lp-stat-sub">Tage</div>
          </div>
        </div>

        ${ratingBadge}

        <!-- Progress bar -->
        <div class="lp-global-progress">
          <div class="lp-global-progress-fill" style="width:${pct}%"></div>
        </div>

        <!-- Tabs -->
        <div class="lp-tabs" id="lp-tabs">
          <button class="lp-tab lp-tab-active" data-tab="heute">📌 Heute ${todayDay ? `(${todayTopicsDone}/${todayTopicsTotal})` : ''}</button>
          <button class="lp-tab" data-tab="woche">📅 Woche</button>
          <button class="lp-tab" data-tab="alle">📋 Alle Tage</button>
        </div>

        <div id="lp-tab-content"></div>

        <!-- Footer -->
        <div class="lp-footer-actions">
          <button class="lp-footer-btn" id="lp-reset-btn">🔄 Plan neu generieren</button>
        </div>
      </div>
    `;

    document.querySelectorAll('.lp-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.lp-tab').forEach(t => t.classList.remove('lp-tab-active'));
        tab.classList.add('lp-tab-active');
        _renderTab(tab.dataset.tab, plan);
      };
    });

    document.getElementById('lp-reset-btn').onclick = async () => {
      // Free-User: max 3 Lernplan-Resets
      if (typeof Credits !== 'undefined' && typeof Auth !== 'undefined') {
        const tier = Auth.licenseTier;
        const isFree = !tier || tier === 'free';
        if (isFree && Credits.lernplanResets >= 3) {
          // Spezifischen Lernplan-Paywall zeigen
          document.getElementById('ai-credits-paywall')?.remove();
          const overlay = document.createElement('div');
          overlay.id = 'ai-credits-paywall';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .3s ease';
          overlay.innerHTML = `
            <div style="background:#fff;border-radius:20px;max-width:400px;width:100%;padding:2rem 1.5rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);position:relative">
              <button onclick="document.getElementById('ai-credits-paywall').remove()" style="position:absolute;top:0.8rem;right:0.8rem;background:none;border:none;font-size:1.2rem;color:#9e9eae;cursor:pointer">✕</button>
              <div style="font-size:2.5rem;margin-bottom:0.75rem">📅</div>
              <h2 style="font-size:1.2rem;font-weight:800;color:#1a1a2e;margin:0 0 0.5rem">Lernplan-Resets aufgebraucht</h2>
              <p style="font-size:0.88rem;color:#5c5c6e;line-height:1.6;margin:0 0 1rem">
                Du hast dein kostenloses Limit von <strong>3 Lernplan-Resets</strong> erreicht.<br>
                Mit Basic oder Premium kannst du deinen Lernplan unbegrenzt neu generieren.
              </p>
              <div style="background:#f8f8f8;border-radius:14px;padding:1rem;margin-bottom:1.25rem;text-align:left;font-size:0.82rem;color:#5c5c6e;line-height:1.8">
                ✓ Free: 3 Resets lifetime<br>
                ✓ Basic: Unbegrenzte Resets — €19,90/Mo<br>
                ✓ Premium: Unbegrenzte Resets — €29,90/Mo
              </div>
              <button onclick="document.getElementById('ai-credits-paywall').remove();App.showScreen('screen-konto')"
                style="width:100%;background:linear-gradient(135deg,#f5c542,#e0a820);color:#1a1a2e;border:none;border-radius:12px;padding:0.85rem;font-weight:700;font-size:0.95rem;cursor:pointer;box-shadow:0 4px 12px rgba(245,197,66,0.3)">
                Jetzt upgraden
              </button>
            </div>
          `;
          document.body.appendChild(overlay);
          return;
        }
      }

      if (!confirm('Plan wirklich neu generieren? Dein Fortschritt geht verloren.')) return;

      // Lernplan-Reset zählen (nur Free)
      if (typeof Credits !== 'undefined' && typeof Auth !== 'undefined') {
        const tier = Auth.licenseTier;
        const isFree = !tier || tier === 'free';
        if (isFree && Auth.isLoggedIn && Credits._credits) {
          const newResets = (Credits._credits.lernplan_resets || 0) + 1;
          try {
            await Auth.supabase
              .from('user_credits')
              .update({ lernplan_resets: newResets, updated_at: new Date().toISOString() })
              .eq('user_id', Auth.currentUser.id);
            Credits._credits.lernplan_resets = newResets;
          } catch (e) { console.warn('[Credits] lernplan_resets update error:', e); }
        }
      }

      // Pre-fill setup state from existing plan
      _setupState = {
        step: 1,
        date: plan.medatDate || '',
        mins: plan.dailyMinutes || 60,
        ratings: plan.topicRatings ? { ...plan.topicRatings } : {},
      };
      localStorage.removeItem(LS_KEY);
      render();
    };

    _renderTab('heute', plan);
  }

  function _renderTab(tab, plan) {
    const content = document.getElementById('lp-tab-content');
    if (!content) return;
    const today = _getToday();

    if (tab === 'heute') {
      const day = _getTodayDay(plan);
      if (!day) {
        const overdue = plan.days.filter(d => d.date < today && !d.allDone);
        if (overdue.length > 0) {
          content.innerHTML = `<div class="lp-overdue-banner">⚠️ ${overdue.length} überfällige Tag${overdue.length > 1 ? 'e' : ''} — wechsle zu "Alle Tage"</div>`;
        } else {
          content.innerHTML = `<div class="lp-done-today">🎉 Für heute alles erledigt!</div>`;
        }
        return;
      }
      content.innerHTML = _renderDayCard(day, plan, true);
      _bindDayCard(day, plan);

    } else if (tab === 'woche') {
      const start = today;
      const end = new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0];
      const weekDays = plan.days.filter(d => d.date >= start && d.date <= end);
      if (weekDays.length === 0) {
        content.innerHTML = `<div class="lp-empty-msg">Keine Tage diese Woche.</div>`;
        return;
      }
      content.innerHTML = `<div class="lp-week-list">${weekDays.map(d => _renderDayCard(d, plan, d.date === today)).join('')}</div>`;
      weekDays.forEach(d => _bindDayCard(d, plan));

    } else {
      const pastUndone = plan.days.filter(d => d.date < today && !d.allDone);
      let html = '';
      if (pastUndone.length > 0) {
        html += `<div class="lp-section-header lp-section-overdue">⚠️ Überfällig (${pastUndone.length})</div>`;
        html += pastUndone.map(d => _renderDayCard(d, plan, false)).join('');
      }
      const future = plan.days.filter(d => d.date >= today);
      html += `<div class="lp-section-header">📅 Ab heute (${future.length} Tage)</div>`;
      html += future.map(d => _renderDayCard(d, plan, d.date === today)).join('');
      content.innerHTML = `<div class="lp-all-list">${html}</div>`;
      plan.days.forEach(d => _bindDayCard(d, plan));
    }
  }

  function _renderDayCard(day, plan, isToday) {
    const past = day.date < _getToday();
    const doneTopics = day.topics.filter(t => t.done).length;
    const totalTopics = day.topics.length;

    const dateObj = new Date(day.date + 'T00:00:00');
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const dateLabel = isToday ? 'Heute' : `${dayNames[dateObj.getDay()]}, ${dateObj.getDate()}. ${months[dateObj.getMonth()]}`;

    const planRatings = plan.topicRatings || {};

    const topicsHTML = day.topics.map(t => {
      const conf = t.confidence;
      const planRating = planRatings[t.id];
      const ratingDot = planRating === 'red' ? '<span class="lp-plan-rating-dot lp-prd-red" title="Schwaches Thema">🔴</span>'
                      : planRating === 'green' ? '<span class="lp-plan-rating-dot lp-prd-green" title="Gutes Thema">🟢</span>'
                      : '';
      return `
        <div class="lp-topic-row ${t.done ? 'lp-topic-done' : ''}" data-date="${day.date}" data-tid="${t.id}">
          <button class="lp-topic-check ${t.done ? 'lp-checked' : ''}"
            data-action="topic-done" data-date="${day.date}" data-tid="${t.id}">
            ${t.done ? '✓' : ''}
          </button>
          <div class="lp-topic-info">
            <span class="lp-topic-cat-dot" style="background:${t.catColor}"></span>
            <span class="lp-topic-name">${t.catIcon} ${t.name}</span>
            ${ratingDot}
            <span class="lp-topic-cat">${t.catLabel}</span>
          </div>
          <div class="lp-conf-btns" data-date="${day.date}" data-tid="${t.id}">
            <button class="lp-conf-btn ${conf === 'red' ? 'active' : ''}" data-action="conf" data-conf="red" data-date="${day.date}" data-tid="${t.id}" title="Schwierig">🔴</button>
            <button class="lp-conf-btn ${conf === 'yellow' ? 'active' : ''}" data-action="conf" data-conf="yellow" data-date="${day.date}" data-tid="${t.id}" title="Mittel">🟡</button>
            <button class="lp-conf-btn ${conf === 'green' ? 'active' : ''}" data-action="conf" data-conf="green" data-date="${day.date}" data-tid="${t.id}" title="Gut">🟢</button>
          </div>
        </div>
      `;
    }).join('');

    const kff = day.kff;
    const kffHTML = `
      <div class="lp-kff-row ${day.kffDone ? 'lp-topic-done' : ''}">
        <button class="lp-topic-check ${day.kffDone ? 'lp-checked' : ''}"
          data-action="kff-done" data-date="${day.date}">
          ${day.kffDone ? '✓' : ''}
        </button>
        <div class="lp-topic-info">
          <span class="lp-topic-cat-dot" style="background:#8b5cf6"></span>
          <span class="lp-topic-name">${kff.icon} ${kff.label}</span>
          <span class="lp-topic-cat">KFF · ${kff.desc}</span>
        </div>
        <button class="lp-kff-start-btn" data-action="kff-start" data-date="${day.date}" data-kff="${kff.key}">
          ▶ Üben
        </button>
      </div>
    `;

    const progress = Math.round(((doneTopics + (day.kffDone ? 1 : 0)) / (totalTopics + 1)) * 100);

    return `
      <div class="lp-day-card ${isToday ? 'lp-today-card' : ''} ${day.allDone ? 'lp-day-done' : ''} ${past && !day.allDone ? 'lp-day-overdue' : ''}" id="lp-day-${day.date}">
        <div class="lp-day-card-header">
          <div class="lp-day-label">
            ${day.allDone ? '✅' : past && !isToday ? '⚠️' : '📌'}
            <strong>${dateLabel}</strong>
            <span class="lp-day-num">Tag ${day.dayNum}</span>
          </div>
          <div class="lp-day-mini-progress">
            <div class="lp-day-mini-bar">
              <div class="lp-day-mini-fill" style="width:${progress}%"></div>
            </div>
            <span class="lp-day-pct">${progress}%</span>
          </div>
        </div>

        <div class="lp-day-card-body ${isToday ? '' : 'lp-day-collapsed'}" id="lp-body-${day.date}">
          <div class="lp-topics-section">
            <div class="lp-section-label">📚 BMS-Themen (${doneTopics}/${totalTopics} erledigt)</div>
            ${topicsHTML}
          </div>
          <div class="lp-kff-section">
            <div class="lp-section-label">🎯 KFF-Übungen</div>
            ${kffHTML}
          </div>
        </div>

        ${!isToday ? `<button class="lp-expand-btn" data-date="${day.date}">▾ anzeigen</button>` : ''}
      </div>
    `;
  }

  function _bindDayCard(day, plan) {
    const card = document.getElementById(`lp-day-${day.date}`);
    if (!card) return;

    const expandBtn = card.querySelector('.lp-expand-btn');
    if (expandBtn) {
      expandBtn.onclick = () => {
        const body = document.getElementById(`lp-body-${day.date}`);
        if (!body) return;
        const collapsed = body.classList.toggle('lp-day-collapsed');
        expandBtn.textContent = collapsed ? '▾ anzeigen' : '▴ ausblenden';
      };
    }

    card.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const date = btn.dataset.date;
      const tid = btn.dataset.tid;

      if (action === 'topic-done') {
        _toggleTopicDone(plan, date, tid);
      } else if (action === 'conf') {
        _setConfidence(plan, date, tid, btn.dataset.conf);
      } else if (action === 'kff-done') {
        _toggleKffDone(plan, date);
      } else if (action === 'kff-start') {
        _startKffExercise(btn.dataset.kff);
      }
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function _toggleTopicDone(plan, date, tid) {
    const day = plan.days.find(d => d.date === date);
    if (!day) return;
    const topic = day.topics.find(t => t.id === tid);
    if (!topic) return;
    topic.done = !topic.done;
    _updateAllDone(day);
    _save(plan);
    render();
  }

  function _setConfidence(plan, date, tid, level) {
    const day = plan.days.find(d => d.date === date);
    if (!day) return;
    const topic = day.topics.find(t => t.id === tid);
    if (!topic) return;
    topic.confidence = topic.confidence === level ? null : level;
    if (topic.confidence && !topic.done) topic.done = true;
    _updateAllDone(day);
    _save(plan);
    render();
  }

  function _toggleKffDone(plan, date) {
    const day = plan.days.find(d => d.date === date);
    if (!day) return;
    day.kffDone = !day.kffDone;
    _updateAllDone(day);
    _save(plan);
    render();
  }

  function _updateAllDone(day) {
    day.allDone = day.topics.every(t => t.done) && day.kffDone;
  }

  function _startKffExercise(kffKey) {
    if (typeof App !== 'undefined') {
      App._closeMenu?.();
      if (typeof App.startSectionDirect === 'function') {
        App.startSectionDirect(kffKey);
      } else {
        App.showScreen('screen-question');
        App.startPractice?.({ section: kffKey, limit: 15 });
      }
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    render,
    ALL_TOPICS,
    CATEGORIES,
    KFF_SECTIONS,
  };

})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {});
} else {}
