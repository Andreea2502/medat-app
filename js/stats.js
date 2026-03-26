// === MedAT KFF Trainer – Statistik-Dashboard (v2) ===
// Meaningful stats: what you've done, gaps, weaknesses, study recommendations

const Stats = {
  /**
   * Dashboard rendern
   */
  async render() {
    const container = document.getElementById('stats-container');
    if (!container) return;

    // Daten laden
    const progress = await this.loadProgress();
    const countdown = Auth.isLoggedIn ? Auth.getMedATCountdown() : null;

    container.innerHTML = this._buildDashboard(progress, countdown);

    // Charts zeichnen (nach DOM-Insert)
    requestAnimationFrame(() => {
      this._drawSectionChart(progress);
      this._drawWeeklyChart(progress);
    });
  },

  /**
   * Fortschrittsdaten laden
   */
  async loadProgress() {
    try {
      if (Auth.isLoggedIn && Auth.supabase) {
        const { data, error } = await Auth.supabase
          .from('user_progress')
          .select('question_id, answered_correctly, time_taken_seconds, section_key, answered_at')
          .eq('user_id', Auth.currentUser.id)
          .order('answered_at', { ascending: false });

        if (!error && data) return data;
      }

      // Fallback: session-basiert
      const sessionId = CONFIG.getSessionId();
      if (Auth.supabase) {
        const { data } = await Auth.supabase
          .from('user_progress')
          .select('question_id, answered_correctly, time_taken_seconds, section_key, answered_at')
          .eq('session_id', sessionId)
          .order('answered_at', { ascending: false });
        return data || [];
      }
    } catch (e) {
      console.warn('Stats loadProgress:', e);
    }
    return [];
  },

  /**
   * Dashboard HTML aufbauen
   */
  _buildDashboard(progress, countdown) {
    const total = progress.length;
    const correct = progress.filter(p => p.answered_correctly).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Heute beantwortet
    const today = new Date().toISOString().split('T')[0];
    const todayItems = progress.filter(p => p.answered_at && p.answered_at.startsWith(today));
    const todayCount = todayItems.length;
    const todayCorrect = todayItems.filter(p => p.answered_correctly).length;

    // Sektions-Statistik berechnen
    const sectionStats = this._calcSectionStats(progress);

    // Schwachstellen identifizieren (schlechteste Sektionen)
    const weaknesses = sectionStats
      .filter(s => s.total >= 3)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);

    // Unberührte Sektionen
    const allSections = this._getAllSections();
    const touchedKeys = new Set(sectionStats.map(s => s.key));
    const untouched = allSections.filter(s => !touchedKeys.has(s.key));

    // Durchschnittliche Zeit
    const avgTime = total > 0
      ? Math.round(progress.reduce((s, p) => s + (p.time_taken_seconds || 0), 0) / total)
      : 0;

    // Falsche BMS-Antworten
    const wrongBMS = progress.filter(p =>
      !p.answered_correctly &&
      ['biologie', 'chemie', 'physik', 'mathematik'].includes(p.section_key)
    );

    return `
      ${countdown ? `
        <div class="stats-countdown-banner">
          <div class="stats-countdown-days">${countdown.days}</div>
          <div class="stats-countdown-text">${countdown.label}</div>
        </div>
      ` : ''}

      <!-- Was hast du bisher geschafft? -->
      <div class="stats-section-card">
        <h3>📊 Dein bisheriger Fortschritt</h3>
        <div class="stats-overview-grid">
          <div class="stats-ov-item">
            <div class="stats-ov-number">${total}</div>
            <div class="stats-ov-label">Fragen beantwortet</div>
          </div>
          <div class="stats-ov-item">
            <div class="stats-ov-number" style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'}">${total > 0 ? pct + '%' : '–'}</div>
            <div class="stats-ov-label">Genauigkeit</div>
          </div>
          <div class="stats-ov-item">
            <div class="stats-ov-number">${todayCount}</div>
            <div class="stats-ov-label">Heute beantwortet</div>
          </div>
          <div class="stats-ov-item">
            <div class="stats-ov-number">${avgTime}s</div>
            <div class="stats-ov-label">Ø pro Frage</div>
          </div>
        </div>
      </div>

      <!-- Leistung pro Block -->
      <div class="stats-section-card">
        <h3>📈 Leistung nach Testblock</h3>
        <canvas id="stats-section-canvas" width="340" height="200"></canvas>
        ${sectionStats.length === 0 ? '<p class="stats-empty">Noch keine Daten. Beantworte Fragen, um deine Statistik zu sehen.</p>' : ''}
      </div>

      <!-- Schwachstellen -->
      <div class="stats-section-card">
        <h3>⚠️ Deine Schwachstellen</h3>
        ${weaknesses.length > 0 ? `
          <p class="stats-hint">Hier solltest du mehr üben:</p>
          <div class="stats-weakness-list">
            ${weaknesses.map(w => `
              <div class="stats-weakness-item">
                <div class="stats-weakness-info">
                  <span class="stats-weakness-name">${w.label}</span>
                  <span class="stats-weakness-meta">${w.blockLabel} · ${w.total} Fragen</span>
                </div>
                <div class="stats-weakness-bar-wrap">
                  <div class="stats-weakness-bar">
                    <div class="stats-weakness-fill" style="width:${w.pct}%; background:${w.pct < 50 ? 'var(--danger)' : 'var(--warning)'}"></div>
                  </div>
                  <span class="stats-weakness-pct">${w.pct}%</span>
                </div>
              </div>
            `).join('')}
          </div>
          <button class="btn-primary btn-full" style="margin-top:0.75rem" onclick="App.startWeakspotTrainer()">Schwachstellen trainieren</button>
        ` : '<p class="stats-empty">Beantworte mindestens 3 Fragen pro Sektion, um Schwachstellen zu erkennen.</p>'}
      </div>

      <!-- Unberührte Bereiche -->
      ${untouched.length > 0 ? `
        <div class="stats-section-card">
          <h3>🔍 Noch nicht geübt</h3>
          <p class="stats-hint">Diese Bereiche hast du noch nicht bearbeitet:</p>
          <div class="stats-untouched-list">
            ${untouched.map(u => `
              <div class="stats-untouched-item">
                <span class="stats-untouched-dot" style="background:${u.blockColor}"></span>
                <span>${u.label}</span>
                <span class="stats-untouched-block">${u.blockLabel}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Falsche BMS-Antworten -->
      ${wrongBMS.length > 0 ? `
        <div class="stats-section-card">
          <h3>🔄 Falsche BMS-Antworten (${wrongBMS.length})</h3>
          <p class="stats-hint">Diese Fragen hast du falsch beantwortet. Wiederholung hilft!</p>
          <div class="stats-wrong-summary">
            ${this._buildWrongBMSSummary(wrongBMS)}
          </div>
        </div>
      ` : ''}

      <!-- Letzte 7 Tage -->
      <div class="stats-section-card">
        <h3>📅 Letzte 7 Tage</h3>
        <canvas id="stats-weekly-canvas" width="340" height="160"></canvas>
      </div>

      <!-- Sektionsdetails -->
      <div class="stats-section-card">
        <h3>📋 Alle Sektionen im Detail</h3>
        <div class="stats-detail-list">
          ${this._buildSectionDetails(sectionStats)}
        </div>
      </div>

      <!-- Lernempfehlung -->
      <div class="stats-section-card stats-recommendation">
        <h3>💡 Empfehlung</h3>
        <p>${this._getRecommendation(sectionStats, weaknesses, untouched, total)}</p>
      </div>
    `;
  },

  /**
   * Alle Sektionen aus CONFIG sammeln
   */
  _getAllSections() {
    const sections = [];
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      for (const [secKey, sec] of Object.entries(block.sections)) {
        if (!sec.isMemorize && !sec.isRecall) {
          sections.push({
            key: secKey,
            label: sec.label,
            blockLabel: block.label,
            blockColor: block.color,
          });
        }
      }
    }
    return sections;
  },

  /**
   * Sektions-Stats berechnen
   */
  _calcSectionStats(progress) {
    const bySection = {};

    progress.forEach(p => {
      const key = p.section_key || 'unknown';
      if (!bySection[key]) bySection[key] = { total: 0, correct: 0, key };
      bySection[key].total++;
      if (p.answered_correctly) bySection[key].correct++;
    });

    // Section-Labels aus CONFIG
    const labeled = [];
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      for (const [secKey, sec] of Object.entries(block.sections)) {
        if (bySection[secKey]) {
          const s = bySection[secKey];
          labeled.push({
            key: secKey,
            label: sec.label,
            icon: sec.icon,
            blockLabel: block.label,
            blockColor: block.color,
            total: s.total,
            correct: s.correct,
            pct: Math.round((s.correct / s.total) * 100),
          });
        }
      }
    }

    return labeled;
  },

  /**
   * Falsche BMS-Antworten Zusammenfassung
   */
  _buildWrongBMSSummary(wrongBMS) {
    const bySection = {};
    wrongBMS.forEach(p => {
      const key = p.section_key || 'unknown';
      if (!bySection[key]) bySection[key] = 0;
      bySection[key]++;
    });

    const labels = { biologie: 'Biologie', chemie: 'Chemie', physik: 'Physik', mathematik: 'Mathematik' };
    const colors = { biologie: '#6db88a', chemie: '#9b7fc4', physik: '#5ba3c9', mathematik: '#e0a820' };

    return Object.entries(bySection).map(([key, count]) => `
      <div class="stats-wrong-item">
        <span class="stats-wrong-dot" style="background:${colors[key] || '#9e9eae'}"></span>
        <span class="stats-wrong-label">${labels[key] || key}</span>
        <span class="stats-wrong-count">${count} Fehler</span>
      </div>
    `).join('');
  },

  /**
   * Sektionsdetails HTML
   */
  _buildSectionDetails(sectionStats) {
    if (sectionStats.length === 0) {
      return '<p class="stats-empty">Noch keine Daten vorhanden.</p>';
    }

    return sectionStats.map(s => `
      <div class="stats-detail-row">
        <div class="stats-detail-left">
          <div>
            <div class="stats-detail-name">${s.label}</div>
            <div class="stats-detail-meta">${s.blockLabel} · ${s.total} Fragen · ${s.correct} richtig</div>
          </div>
        </div>
        <div class="stats-detail-right">
          <div class="stats-detail-bar">
            <div class="stats-detail-fill" style="width:${s.pct}%; background:${s.pct >= 70 ? 'var(--success)' : s.pct >= 50 ? s.blockColor : 'var(--danger)'}"></div>
          </div>
          <span class="stats-detail-pct">${s.pct}%</span>
        </div>
      </div>
    `).join('');
  },

  /**
   * Lernempfehlung generieren
   */
  _getRecommendation(sectionStats, weaknesses, untouched, total) {
    if (total === 0) {
      return 'Starte mit dem Üben-Modus, um deinen Fortschritt zu tracken. Beginne am besten mit BMS – das macht 40% des Tests aus.';
    }
    if (total < 20) {
      return 'Guter Start! Versuche, jeden Tag mindestens 20 Fragen zu beantworten, um ein Gefühl für die verschiedenen Fragetypen zu bekommen.';
    }
    if (untouched.length > 5) {
      return `Du hast noch ${untouched.length} Bereiche nicht geübt. Versuche, alle Sektionen mindestens einmal durchzuarbeiten, bevor du dich auf Schwachstellen konzentrierst.`;
    }
    if (weaknesses.length > 0 && weaknesses[0].pct < 50) {
      return `Deine größte Schwachstelle ist "${weaknesses[0].label}" mit nur ${weaknesses[0].pct}%. Konzentriere dich darauf und nutze den Schwachstellen-Trainer.`;
    }
    const avgPct = sectionStats.reduce((s, sec) => s + sec.pct, 0) / sectionStats.length;
    if (avgPct >= 80) {
      return 'Hervorragend! Deine Genauigkeit ist sehr gut. Mache regelmäßig Simulationen unter Zeitdruck, um dich an die Testbedingungen zu gewöhnen.';
    }
    return 'Du machst gute Fortschritte. Versuche, deine Schwachstellen gezielt zu verbessern und regelmäßig zu üben.';
  },

  /**
   * Sektions-Balkendiagramm zeichnen (Canvas)
   */
  _drawSectionChart(progress) {
    const canvas = document.getElementById('stats-section-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Daten pro Block
    const blocks = [];
    for (const [blockId, block] of Object.entries(CONFIG.TEST_BLOCKS)) {
      let total = 0, correct = 0;
      for (const secKey of Object.keys(block.sections)) {
        progress.forEach(p => {
          if (p.section_key === secKey) {
            total++;
            if (p.answered_correctly) correct++;
          }
        });
      }
      blocks.push({
        label: block.label,
        color: block.color,
        total,
        correct,
        pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      });
    }

    if (blocks.every(b => b.total === 0)) {
      ctx.fillStyle = '#9e9eae';
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Noch keine Daten', w / 2, h / 2);
      return;
    }

    const padding = { top: 10, right: 10, bottom: 30, left: 35 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = Math.min(40, chartW / blocks.length - 20);
    const gap = (chartW - barW * blocks.length) / (blocks.length + 1);

    // Y-Achse
    ctx.strokeStyle = '#e0dcd4';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#9e9eae';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let y = 0; y <= 100; y += 25) {
      const yPos = padding.top + chartH - (y / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(w - padding.right, yPos);
      ctx.stroke();
      ctx.fillText(y + '%', padding.left - 5, yPos + 3);
    }

    // Balken
    blocks.forEach((b, i) => {
      const x = padding.left + gap + i * (barW + gap);
      const barH = (b.pct / 100) * chartH;
      const y = padding.top + chartH - barH;

      ctx.fillStyle = b.color;
      ctx.beginPath();
      const r = 4;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, padding.top + chartH);
      ctx.lineTo(x, padding.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      ctx.fillStyle = '#1a1a2e';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW / 2, padding.top + chartH + 16);

      if (b.total > 0) {
        ctx.fillStyle = b.color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(b.pct + '%', x + barW / 2, y - 4);
      }
    });
  },

  /**
   * Wöchentliche Aktivität zeichnen (Canvas)
   */
  _drawWeeklyChart(progress) {
    const canvas = document.getElementById('stats-weekly-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Letzte 7 Tage
    const days = [];
    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = progress.filter(p => p.answered_at && p.answered_at.startsWith(key)).length;
      const correctCount = progress.filter(p => p.answered_at && p.answered_at.startsWith(key) && p.answered_correctly).length;
      days.push({
        label: i === 0 ? 'Heute' : dayNames[d.getDay()],
        count,
        correct: correctCount,
      });
    }

    const maxCount = Math.max(...days.map(d => d.count), 5);
    const padding = { top: 15, right: 10, bottom: 25, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barW = Math.min(30, chartW / 7 - 12);
    const gap = (chartW - barW * 7) / 8;

    ctx.strokeStyle = '#e0dcd4';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const yPos = padding.top + (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(w - padding.right, yPos);
      ctx.stroke();
    }

    days.forEach((d, i) => {
      const x = padding.left + gap + i * (barW + gap);
      const barH = maxCount > 0 ? (d.count / maxCount) * chartH : 0;
      const y = padding.top + chartH - barH;

      ctx.fillStyle = '#e8e3db';
      ctx.fillRect(x, padding.top, barW, chartH);

      if (d.count > 0) {
        ctx.fillStyle = '#f5c542';
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, padding.top + chartH);
        ctx.lineTo(x, padding.top + chartH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.count, x + barW / 2, y - 3);
      }

      ctx.fillStyle = i === 6 ? '#1a1a2e' : '#9e9eae';
      ctx.font = (i === 6 ? 'bold ' : '') + '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, padding.top + chartH + 15);
    });
  },
};
