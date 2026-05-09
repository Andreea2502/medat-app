// === MedAT KI-Nudge System ===
// Contextual nudges to promote AI tutors & Banana to users who haven't tried them yet
// Speaks in Austrian student slang, shows social proof, respects user choice

const Nudge = {

  // ===== STATE =====
  _wrongThisSession: 0,
  _nudgeShownThisSession: false,
  _lastNudgeType: null,

  // ===== MESSAGE BANKS =====

  // After wrong BMS answer → suggest tutor
  _tutorNudges: [
    { icon: '🎓', msg: (topic) => `Hey, <b>${topic}</b> is echt zach. Lass dir das mal von <b>Lilly</b> erklären — die macht da eine Analogie draus, die du nie wieder vergisst.` },
    { icon: '🦉', msg: (topic) => `Probier mal den <b>Sokrates-Tutor</b> für ${topic} — der fragt dich so lang, bis du's selber checkst. Kein Witz, die meisten haben danach ihren Aha-Moment.` },
    { icon: '🔍', msg: (topic) => `${topic} falsch? Kann passieren. Aber stell dir vor, eine KI erklärt dir das jetzt in 2 Minuten so, dass es sitzt. <b>72% der User</b> in der App nutzen die Tutoren genau dafür.` },
    { icon: '💡', msg: (topic) => `Wusstest du? Die meisten MedAT-Teilnehmer in der App lassen sich schwierige ${topic}-Fragen nochmal <b>vom KI-Tutor erklären</b> — und schneiden beim nächsten Mal deutlich besser ab.` },
  ],

  // After wrong answer → suggest Merkbild
  _bildNudges: [
    { icon: '🍌', msg: (topic) => `Stell dir vor: <b>${topic}</b> als coole Infografik, die du dir einfach merkst. Dauert 30 Sekunden. Probier's aus!` },
    { icon: '🎨', msg: (topic) => `Ein Merkbild zu <b>${topic}</b>? Die meisten, die Banana ausprobiert haben, sagen es ist ihr Geheimtipp fürs Lernen.` },
    { icon: '🧠', msg: (topic) => `${topic} will einfach nicht rein? Ein <b>visuelles Merkbild</b> kann Wunder wirken. Unser Bild-Generator erstellt dir eins in Sekunden — in deinem Stil.` },
    { icon: '🖼️', msg: (topic) => `<b>65% der MedAT-Lerner</b> sind visuelle Typen. Versuch's mal mit einem Merkbild zu ${topic} — viele sagen, danach vergessen sie's nie wieder.` },
  ],

  // 3rd wrong answer → stronger combined nudge
  _strongNudges: [
    { icon: '💪', msg: () => `Okay real talk: Du kastelst dich grad durch und das muss nicht sein. Du hast <b>KI-Tutoren</b> dabei, die dir das erklären können. Einer erklärt, einer fragt, einer macht Bilder. Probier mal einen aus.` },
    { icon: '🚀', msg: () => `Drei daneben — ich kenn das Gefühl. Aber wusstest du, dass du <b>7 verschiedene KI-Tutoren</b> hast, die nur auf dich warten? Die meisten User sagen: "Hätte ich das mal früher probiert." Jetzt ist früher.` },
  ],

  // Result screen < 60%
  _resultNudges: [
    (wrongCount, topic) => `<b>${wrongCount} Fragen</b> daneben — aber jetzt kommt der Trick: Lass dir die schwierigen Themen <b>vom KI-Tutor erklären</b> oder als <b>Merkbild</b> generieren. Die meisten verstehen's danach sofort.`,
    (wrongCount, topic) => `Nicht perfekt, aber dafür sind wir ja da. 💡 Tipp von anderen MedAT-Teilnehmern: <b>Die Fehler nochmal mit dem Tutor durchgehen</b> — das bringt mehr als 10x die gleiche Frage nochmal zu machen.`,
    (wrongCount, topic) => `${wrongCount} Fehler sind ${wrongCount} Chancen zu lernen. Andere Teilnehmer in der App nutzen dafür die <b>KI-Tutoren</b> — Sokrates stellt dir Fragen, Lilly erklärt's mit Analogien, Banana macht Merkbilder. <b>Probier's jetzt aus.</b>`,
  ],

  // ===== MAIN ENTRY: After answering a question =====
  maybeShow(isCorrect, question) {
    if (isCorrect) return;

    this._wrongThisSession++;

    // Only for Free users — paid users already know the features
    if (this._isPaidUser()) return;
    // Don't show if: already shown this session, dismissed, already experienced AI (5+ sessions), or simulation
    if (this._nudgeShownThisSession) return;
    if (localStorage.getItem('ki_nudge_dismissed')) return;
    if (this._userKnowsAI()) return;
    if (typeof App !== 'undefined' && App.mode === 'simulation') return;

    // Determine nudge type
    let nudgeHTML;
    if (this._wrongThisSession >= 3) {
      nudgeHTML = this._buildStrongNudge(question);
    } else {
      // Alternate between tutor and bild nudges
      if (Math.random() > 0.5) {
        nudgeHTML = this._buildTutorNudge(question);
      } else {
        nudgeHTML = this._buildBildNudge(question);
      }
    }

    // Insert with delay (let explanation render first)
    setTimeout(() => {
      this._insertInlineNudge(nudgeHTML);
      this._nudgeShownThisSession = true;
    }, 900);
  },

  // ===== RESULT SCREEN NUDGE =====
  maybeShowOnResult(pct, wrongCount, topicLabel) {
    if (pct >= 60) return;
    if (wrongCount < 2) return;
    if (this._isPaidUser()) return;
    if (localStorage.getItem('ki_nudge_dismissed')) return;
    if (this._userKnowsAI()) return;
    if (localStorage.getItem('ki_nudge_result_' + new Date().toISOString().split('T')[0])) return;

    const msgFn = this._resultNudges[Math.floor(Math.random() * this._resultNudges.length)];
    const msg = msgFn(wrongCount, topicLabel || 'deine Schwachstellen');

    const html = `
      <div class="ki-nudge-result-card" id="ki-nudge-result-card">
        <button class="ki-nudge-close" onclick="Nudge.dismissResult()" title="Schließen">&times;</button>
        <div class="ki-nudge-result-body">
          <div class="ki-nudge-result-icon">🚀</div>
          <p class="ki-nudge-result-text">${msg}</p>
          <div class="ki-nudge-result-actions">
            <button class="ki-nudge-btn ki-nudge-btn-tutor" onclick="Nudge.openTutor()">
              🎓 Tutor starten
            </button>
            <button class="ki-nudge-btn ki-nudge-btn-banana" onclick="Nudge.openBananaFromResult()">
              🍌 Merkbild erstellen
            </button>
          </div>
          <div class="ki-nudge-social">
            <span class="ki-nudge-social-dot"></span>
            Über 70% der aktiven User nutzen die KI-Features für ihre Schwachstellen
          </div>
        </div>
        <a href="#" class="ki-nudge-dismiss-link" onclick="Nudge.dismissPermanent();return false">Nicht mehr anzeigen</a>
      </div>
    `;

    const container = document.getElementById('ki-nudge-result');
    if (container) {
      container.innerHTML = html;
      container.classList.remove('hidden');
      localStorage.setItem('ki_nudge_result_' + new Date().toISOString().split('T')[0], '1');
    }
  },

  // ===== BUILDERS =====

  _buildTutorNudge(question) {
    const topic = this._extractTopic(question);
    const nudge = this._tutorNudges[Math.floor(Math.random() * this._tutorNudges.length)];
    return this._wrapNudge(nudge.icon, nudge.msg(topic), [
      { label: '🎓 Tutor fragen', cls: 'ki-nudge-btn-tutor', action: `Nudge.openTutorFor()` },
      { label: '🍌 Merkbild', cls: 'ki-nudge-btn-banana', action: `Nudge.openBananaFor()` },
    ]);
  },

  _buildBildNudge(question) {
    const topic = this._extractTopic(question);
    const nudge = this._bildNudges[Math.floor(Math.random() * this._bildNudges.length)];
    return this._wrapNudge(nudge.icon, nudge.msg(topic), [
      { label: '🍌 Merkbild erstellen', cls: 'ki-nudge-btn-banana', action: `Nudge.openBananaFor()` },
      { label: '🎓 Tutor', cls: 'ki-nudge-btn-tutor-secondary', action: `Nudge.openTutorFor()` },
    ]);
  },

  _buildStrongNudge(question) {
    const nudge = this._strongNudges[Math.floor(Math.random() * this._strongNudges.length)];
    return this._wrapNudge(nudge.icon, nudge.msg(), [
      { label: '🎓 Tutor ausprobieren', cls: 'ki-nudge-btn-tutor', action: `Nudge.openTutorFor()` },
      { label: '🍌 Merkbild', cls: 'ki-nudge-btn-banana', action: `Nudge.openBananaFor()` },
    ]);
  },

  _wrapNudge(icon, msg, buttons) {
    const btns = buttons.map(b =>
      `<button class="ki-nudge-btn ${b.cls}" onclick="${b.action}">${b.label}</button>`
    ).join('');

    return `
      <div class="ki-nudge-card" id="ki-nudge-card">
        <button class="ki-nudge-close" onclick="Nudge.dismissInline()" title="Schließen">&times;</button>
        <div class="ki-nudge-body">
          <span class="ki-nudge-icon">${icon}</span>
          <div class="ki-nudge-content">
            <p class="ki-nudge-msg">${msg}</p>
            <div class="ki-nudge-actions">${btns}</div>
          </div>
        </div>
        <a href="#" class="ki-nudge-dismiss-link" onclick="Nudge.dismissPermanent();return false">Nicht mehr anzeigen</a>
      </div>
    `;
  },

  // ===== DOM INSERTION =====

  _insertInlineNudge(html) {
    const container = document.getElementById('ki-nudge-inline');
    if (!container) return;
    container.innerHTML = html;
    container.classList.remove('hidden');
    // Animate in
    const card = container.querySelector('.ki-nudge-card');
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    }
  },

  clearInline() {
    const container = document.getElementById('ki-nudge-inline');
    if (container) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  },

  // ===== ACTIONS =====

  openTutorFor() {
    this.dismissInline();
    if (typeof Tutor !== 'undefined' && typeof App !== 'undefined') {
      const q = App.questions?.[App.currentIndex];
      if (q) {
        Tutor.open(q);
      } else {
        Tutor.openFreeMode('');
      }
    }
  },

  openBananaFor() {
    this.dismissInline();
    if (typeof Tutor !== 'undefined' && typeof App !== 'undefined') {
      const q = App.questions?.[App.currentIndex];
      if (q) {
        Tutor.open(q);
        setTimeout(() => {
          if (typeof Tutor.selectTutor === 'function') Tutor.selectTutor('banana');
        }, 150);
      }
    }
  },

  openTutor() {
    this.dismissResult();
    if (typeof Tutor !== 'undefined') {
      Tutor.openFreeMode('');
    }
  },

  openBananaFromResult() {
    this.dismissResult();
    if (typeof Tutor !== 'undefined') {
      Tutor.openFreeMode('');
      setTimeout(() => {
        if (typeof Tutor.selectTutor === 'function') Tutor.selectTutor('banana');
      }, 150);
    }
  },

  // ===== DISMISS =====

  dismissInline() {
    const container = document.getElementById('ki-nudge-inline');
    if (container) {
      const card = container.querySelector('.ki-nudge-card');
      if (card) {
        card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        card.style.opacity = '0';
        card.style.transform = 'translateY(-8px)';
        setTimeout(() => { container.classList.add('hidden'); container.innerHTML = ''; }, 250);
      } else {
        container.classList.add('hidden');
        container.innerHTML = '';
      }
    }
  },

  dismissResult() {
    const container = document.getElementById('ki-nudge-result');
    if (container) {
      container.classList.add('hidden');
      container.innerHTML = '';
    }
  },

  dismissPermanent() {
    localStorage.setItem('ki_nudge_dismissed', '1');
    this.dismissInline();
    this.dismissResult();
  },

  // ===== HELPERS =====

  _isPaidUser() {
    // Basic/Premium users already know the features — don't nudge them
    if (typeof Credits === 'undefined' || !Credits._credits) return false;
    const tier = Credits._credits.tier || Credits._tier || '';
    if (tier === 'basic' || tier === 'premium') return true;
    // Also check via Auth profile
    if (typeof Auth !== 'undefined' && Auth.currentUser?.user_metadata?.license_tier) {
      const t = Auth.currentUser.user_metadata.license_tier;
      if (t === 'basic' || t === 'premium') return true;
    }
    // Check credit totals as proxy (Free = 10 sessions, Basic = 200, Premium = 400)
    if (Credits._credits.ai_sessions_total > 10) return true;
    return false;
  },

  _userKnowsAI() {
    // Free user who has used 5+ AI sessions already knows the features
    if (typeof Credits === 'undefined' || !Credits._credits) return false;
    const used = (Credits._credits.ai_sessions_used || 0) + (Credits._credits.ai_images_used || 0);
    return used >= 5;
  },

  _extractTopic(question) {
    if (!question) return 'das Thema';
    const data = question.content || question;
    // Try subtype first (most specific)
    if (question.subtype) {
      const labels = {
        'biologie': 'Biologie', 'chemie': 'Chemie', 'physik': 'Physik', 'mathematik': 'Mathematik',
        'genetik': 'Genetik', 'zellbiologie': 'Zellbiologie', 'immunsystem': 'Immunsystem',
        'nervensystem': 'Nervensystem', 'stoffwechsel': 'Stoffwechsel', 'atmung': 'Atmung',
        'herz_kreislauf': 'Herz-Kreislauf', 'verdauung': 'Verdauung', 'hormonsystem': 'Hormonsystem',
      };
      if (labels[question.subtype]) return labels[question.subtype];
      // Capitalize first letter as fallback
      return question.subtype.charAt(0).toUpperCase() + question.subtype.slice(1).replace(/_/g, ' ');
    }
    if (question.type) {
      const typeLabels = { 'biologie': 'Biologie', 'chemie': 'Chemie', 'physik': 'Physik', 'mathematik': 'Mathematik' };
      if (typeLabels[question.type]) return typeLabels[question.type];
    }
    return 'das Thema';
  },

  // Reset per practice session
  resetSession() {
    this._wrongThisSession = 0;
    this._nudgeShownThisSession = false;
    this.clearInline();
  },
};
