// ============================================================
// isar.pi by hokage22b — Application Bootstrap
// Modular Architecture (UI, Auth, Checklist, Lead, Reputation)
// ============================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    // 0. Internationalization (i18n)
    if (window.IsarI18n) {
      window.IsarI18n.init();
    }

    // 1. UI & Visuals
    if (window.IsarUI) {
      window.IsarUI.initParticles();
      window.IsarUI.initNavbar();
      window.IsarUI.initMobileMenu();
      window.IsarUI.initScrollReveal();
      window.IsarUI.initSmoothScroll();
      window.IsarUI.initActiveNav();
      window.IsarUI.initCookieBanner();
    }

    // 2. Pi Network SDK & Auth
    if (window.IsarAuth) {
      window.IsarAuth.initPiSdk();
      window.IsarAuth.initModalListeners();
      window.IsarAuth.checkStoredSession();
    }

    // 3. Lead Unlock Form
    if (window.IsarLead) {
      window.IsarLead.initLeadUnlockForm();
    }

    // 4. Checklist Mainnet
    if (window.IsarChecklist) {
      window.IsarChecklist.updateChecklistUI();
    }

    // 5. Pioneer Reputation Calculation
    if (window.calculateAndUpdateReputation) {
      window.calculateAndUpdateReputation();
    }

    // 6. Pioneer Tools, Tabs & Mining Calculator
    if (window.IsarTools) {
      window.IsarTools.init();
    }

    // 7. Interactive Onboarding & Conversion Flow
    if (window.IsarOnboarding) {
      window.IsarOnboarding.init();
    }
  });

})();
