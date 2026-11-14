// ============================================================
// isar.pi by hokage22b — Application Bootstrap
// Inicializa módulos globais leves (i18n e UI) nas páginas institucionais/legais
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

    // 2. Pioneer Ads Mural — Gazeta Web3 (caso presente na página)
    if (window.IsarMural) {
      window.IsarMural.init();
    }
  });

})();
