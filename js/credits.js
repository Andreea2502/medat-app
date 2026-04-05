// === MedAT Trainer – Credits (Legacy Stub) ===
// Credit-System wurde entfernt. Free User haben 100 Fragen + 1 Simulation.
// Dieses Objekt existiert nur noch als Stub damit bestehende Aufrufe nicht crashen.

const Credits = {
  _credits: null,
  _loading: false,

  get remaining() { return 999999; },
  get used() { return 0; },
  get total() { return 999999; },

  isUnlimited() {
    if (!Auth.isLoggedIn) return false;
    if (typeof Admin !== 'undefined' && Admin.isImpersonating()) {
      const impTier = Admin._impersonating?.tier;
      return impTier && impTier !== 'free';
    }
    const tier = Auth.userProfile?.license_tier;
    return tier && tier !== 'free';
  },

  async load() { /* no-op */ },
  hasEnough() { return true; },
  async use() { return true; },
  showPaywall() { App.showUpgradeOverlay('limit_reached'); },
  updateUI() {
    const menuItem = document.getElementById('snav-credits');
    if (menuItem) menuItem.style.display = 'none';
    const costHint = document.getElementById('credit-cost-hint');
    if (costHint) costHint.style.display = 'none';
  },
  async showHistory() { /* no-op */ },
};
