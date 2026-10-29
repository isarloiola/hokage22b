// ============================================================
// isar.pi — Module: UI Interactions & Visuals
// ============================================================

(function () {
  'use strict';

  // --- Particles Background ---
  function initParticles() {
    const container = document.getElementById('particles-bg');
    if (!container) return;
    const colors = ['rgba(109,40,217,', 'rgba(245,158,11,', 'rgba(139,92,246,'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 4 + 1;
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      const drift = (Math.random() - 0.5) * 200;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        background:${colorBase}${Math.random() * 0.6 + 0.2});
        --drift:${drift}px;
        animation-duration:${Math.random() * 15 + 10}s;
        animation-delay:${Math.random() * 10}s;
      `;
      container.appendChild(p);
    }
  }

  // --- Navbar scroll behavior ---
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    function onScroll() {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // --- Mobile Menu Drawer ---
  function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const menu   = document.getElementById('mobile-menu');
    const close  = document.getElementById('mobile-close');
    if (!toggle || !menu) return;

    function openMenu() {
      menu.classList.add('open');
      document.body.style.overflow = 'hidden';
      toggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      menu.classList.remove('open');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', openMenu);
    if (close) close.addEventListener('click', closeMenu);

    menu.querySelectorAll('.mobile-link').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // --- Scroll Reveal (Intersection Observer) ---
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      elements.forEach(function (el) { observer.observe(el); });
    } else {
      elements.forEach(function (el) { el.classList.add('revealed'); });
    }
  }

  // --- Smooth scroll for anchor links ---
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#' || href.length <= 1) return;
        try {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            setTimeout(function () {
              const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 70;
              const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
              window.scrollTo({ top: top, behavior: 'smooth' });
            }, 10);
          }
        } catch (_) {}
      });
    });
  }

  // --- Active nav link on scroll ---
  function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('.navbar__links a[href^="#"]');
    if (!sections.length || !links.length) return;

    function onScroll() {
      let current = '';
      sections.forEach(function (s) {
        if (window.scrollY >= s.offsetTop - 120) current = s.id;
      });
      links.forEach(function (link) {
        link.style.color = link.getAttribute('href') === '#' + current
          ? 'var(--amber)'
          : '';
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // --- Cookie Banner (LGPD) ---
  function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const accept = document.getElementById('cookie-accept');
    if (!banner) return;

    const KEY = 'isar_cookie_accepted';
    if (localStorage.getItem(KEY)) return;

    setTimeout(function () {
      banner.classList.add('visible');
    }, 1500);

    if (accept) {
      accept.addEventListener('click', function () {
        localStorage.setItem(KEY, '1');
        banner.classList.remove('visible');
        setTimeout(function () { banner.style.display = 'none'; }, 500);
      });
    }
  }

  // --- Toast Feedback ---
  window.showToast = function (message, icon) {
    const toast = document.getElementById('toast-msg');
    const toastText = document.getElementById('toast-text');
    const toastIcon = document.getElementById('toast-icon');
    if (!toast) return;

    if (toastText) toastText.textContent = message;
    if (toastIcon) toastIcon.textContent = icon || 'ℹ️';

    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 3500);
  };

  // --- Copy Invite Code ---
  window.copyInviteCode = function () {
    const code = 'hokage22b';
    const btn  = document.getElementById('copy-invite-btn');
    if (!btn) return;

    function success() {
      btn.textContent = '✅ Copiado!';
      setTimeout(function () { btn.textContent = '📋 Copiar'; }, 2500);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(success);
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      success();
    }
  };

  // --- Copy Site URL for Pi Browser ---
  window.copySiteUrl = function () {
    const url = 'https://isarloiola.github.io/hokage22b/';
    function done() {
      window.showToast('Link copiado! Cole na barra do Pi Browser.', '📋');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    }
  };

  // Exportar inicializadores do módulo
  window.IsarUI = {
    initParticles,
    initNavbar,
    initMobileMenu,
    initScrollReveal,
    initSmoothScroll,
    initActiveNav,
    initCookieBanner
  };

})();

