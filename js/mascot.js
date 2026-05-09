// === Mister Owl – Floating Tutor Mascot ===
// Schwebt unten rechts, zeigt kontextuelle Sprechblasen,
// macht die KI-Tutoren sichtbarer für alle User.

const Mascot = {
  _el: null,
  _bubbleEl: null,
  _timer: null,
  _dismissed: false,
  _currentScreen: 'screen-home',
  _bubbleIndex: 0,
  _visible: false,
  _lastWrongAnswer: false,

  // Kontextuelle Sprüche — je nach Screen/Situation
  _messages: {
    home: [
      'Hast du schon die KI-Tutoren probiert? 🎓',
      'Ich kann dir Merkbilder erstellen! 🎨',
      'Brauchst du Hilfe beim Lernen? Klick mich!',
      'Tipp: Lass dir schwierige Themen erklären! 💡',
      'Ich kenne 8 verschiedene Lernstile! 🦉',
    ],
    question: [
      'Brauchst du einen Tipp? 🤔',
      'Ich kann dir das erklären!',
      'Klick mich für Hilfe! 💡',
    ],
    wrongAnswer: [
      'Das kann ich dir erklären! 🎓',
      'Lass uns das zusammen verstehen!',
      'Soll ich dir ein Merkbild dazu erstellen? 🎨',
      'Nicht schlimm — ich helfe dir dabei! 💪',
    ],
    result: [
      'Gut gemacht! Soll ich Merkbilder erstellen? 🎨',
      'Lass dir die schwierigen Themen erklären!',
      'Ich kann dir eine Zusammenfassung machen! 📋',
    ],
    stats: [
      'Ich kann dir bei schwachen Themen helfen! 📊',
      'Probier mal das Lernstudio! 🎓',
    ],
    gallery: [
      'Noch mehr Merkbilder? Klick mich! 🎨',
      'Ich kann über 8 Bildtypen erstellen!',
    ],
    default: [
      'Ich bin Mister Owl, dein Lernbegleiter! 🦉',
      'Klick mich für KI-Tutoren & Merkbilder!',
      'Brauchst du Hilfe? Frag mich! 💡',
    ],
  },

  // Screens auf denen der Mascot NICHT angezeigt wird
  _hiddenScreens: ['screen-auth', 'screen-admin', 'screen-tutor'],

  init() {
    this._createDOM();
    this._hookShowScreen();
    this._startBubbleCycle();
  },

  _createDOM() {
    // Container
    const wrap = document.createElement('div');
    wrap.id = 'mascot-wrap';
    wrap.className = 'mascot-wrap';
    wrap.innerHTML = `
      <div class="mascot-bubble" id="mascot-bubble">
        <span class="mascot-bubble-text" id="mascot-bubble-text"></span>
        <button class="mascot-bubble-close" onclick="Mascot.dismissBubble()" aria-label="Schließen">✕</button>
      </div>
      <button class="mascot-btn" id="mascot-btn" onclick="Mascot._handleClick()" aria-label="Mister Owl – KI-Tutor öffnen">
        <img src="/img/mister-owl-128.png" alt="Mister Owl" class="mascot-img" width="56" height="56">
      </button>
    `;
    document.body.appendChild(wrap);

    this._el = wrap;
    this._bubbleEl = document.getElementById('mascot-bubble');
  },

  _hookShowScreen() {
    // Wait for App to be ready, then patch showScreen
    const wait = setInterval(() => {
      if (typeof App === 'undefined' || !App.showScreen) return;
      clearInterval(wait);

      const origShowScreen = App.showScreen.bind(App);
      App.showScreen = (id) => {
        origShowScreen(id);
        this._onScreenChange(id);
      };

      // Initial state based on current screen
      const active = document.querySelector('.screen.active');
      if (active) this._onScreenChange(active.id);
    }, 200);
  },

  _onScreenChange(screenId) {
    this._currentScreen = screenId;
    this._dismissed = false;
    this._lastWrongAnswer = false;

    // Hide on certain screens
    if (this._hiddenScreens.includes(screenId)) {
      this.hide();
      return;
    }

    // Hide when tutor overlay is open
    const tutorOverlay = document.getElementById('tutor-overlay');
    if (tutorOverlay && !tutorOverlay.classList.contains('hidden')) {
      this.hide();
      return;
    }

    this.show();
    // Show a fresh bubble after a short delay on screen change
    this._scheduleBubble(2000);
  },

  show() {
    if (!this._el) return;
    this._el.classList.add('mascot-visible');
    this._visible = true;
  },

  hide() {
    if (!this._el) return;
    this._el.classList.remove('mascot-visible');
    this._visible = false;
    this._hideBubble();
  },

  // Called from app.js when user answers wrong
  onWrongAnswer() {
    this._lastWrongAnswer = true;
    this._showBubble(this._pickMessage('wrongAnswer'));
  },

  // Called when tutor overlay opens/closes
  onTutorToggle(isOpen) {
    if (isOpen) {
      this.hide();
    } else {
      // Re-show after closing tutor
      setTimeout(() => {
        const active = document.querySelector('.screen.active');
        if (active && !this._hiddenScreens.includes(active.id)) {
          this.show();
        }
      }, 300);
    }
  },

  _handleClick() {
    // Open tutor panel
    if (typeof Tutor !== 'undefined') {
      if (this._currentScreen === 'screen-question') {
        // Open with current question context
        Tutor.open(typeof App !== 'undefined' ? App.questions?.[App.currentIndex] : null);
      } else {
        // Open Lernstudio (free mode)
        Tutor.openFreeMode('');
      }
    }
    this._hideBubble();
  },

  dismissBubble() {
    this._hideBubble();
    this._dismissed = true;
    // Don't show again for 60 seconds
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._dismissed = false;
      this._scheduleBubble(5000);
    }, 60000);
  },

  _startBubbleCycle() {
    // Initial bubble after 3 seconds
    this._scheduleBubble(3000);
  },

  _scheduleBubble(delay) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      if (!this._visible || this._dismissed) return;
      this._showContextualBubble();
      // Next bubble in 25-40 seconds
      const nextDelay = 25000 + Math.random() * 15000;
      this._scheduleBubble(nextDelay);
    }, delay);
  },

  _showContextualBubble() {
    const ctx = this._getContext();
    const msg = this._pickMessage(ctx);
    this._showBubble(msg);
  },

  _getContext() {
    if (this._lastWrongAnswer) return 'wrongAnswer';

    switch (this._currentScreen) {
      case 'screen-home': return 'home';
      case 'screen-question': return 'question';
      case 'screen-result': return 'result';
      case 'screen-stats': return 'stats';
      case 'screen-gallery': return 'gallery';
      default: return 'default';
    }
  },

  _pickMessage(ctx) {
    const msgs = this._messages[ctx] || this._messages.default;
    const msg = msgs[this._bubbleIndex % msgs.length];
    this._bubbleIndex++;
    return msg;
  },

  _showBubble(text) {
    if (!this._bubbleEl || !this._visible) return;
    const textEl = document.getElementById('mascot-bubble-text');
    if (textEl) textEl.textContent = text;
    this._bubbleEl.classList.add('mascot-bubble-show');

    // Auto-hide after 6 seconds
    setTimeout(() => {
      if (this._bubbleEl?.classList.contains('mascot-bubble-show')) {
        this._hideBubble();
      }
    }, 6000);
  },

  _hideBubble() {
    if (this._bubbleEl) {
      this._bubbleEl.classList.remove('mascot-bubble-show');
    }
  },
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Mascot.init());
} else {
  Mascot.init();
}
