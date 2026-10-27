// ============================================================
// isar.pi by hokage22b — main.js
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

  // --- Mobile Menu ---
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

  // --- Scroll Reveal ---
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
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
          const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });
  }

  // --- Copy invite code ---
  window.copyInviteCode = function () {
    const code = 'hokage22b';
    const btn  = document.getElementById('copy-invite-btn');
    if (!btn) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () {
        btn.textContent = '✅ Copiado!';
        setTimeout(function () { btn.textContent = '📋 Copiar'; }, 2500);
      });
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = '✅ Copiado!';
      setTimeout(function () { btn.textContent = '📋 Copiar'; }, 2500);
    }
  };

  // --- Waitlist Form ---
  function initWaitlistForm() {
    const form    = document.getElementById('waitlist-form');
    const success = document.getElementById('form-success');
    if (!form) return;

    function showError(id, show) {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'block' : 'none';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      const nameInput    = document.getElementById('waitlist-name');
      const emailInput   = document.getElementById('waitlist-email');
      const consentInput = document.getElementById('consent-lgpd');

      // Validate name
      if (!nameInput || nameInput.value.trim().length < 2) {
        showError('name-error', true);
        valid = false;
      } else {
        showError('name-error', false);
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput || !emailRegex.test(emailInput.value.trim())) {
        showError('email-error', true);
        valid = false;
      } else {
        showError('email-error', false);
      }

      // Validate consent
      if (!consentInput || !consentInput.checked) {
        showError('consent-error', true);
        valid = false;
      } else {
        showError('consent-error', false);
      }

      if (!valid) return;

      // Submit (HTML static — save to localStorage for now, swap action= for real service)
      const data = {
        name:      nameInput.value.trim(),
        email:     emailInput.value.trim(),
        timestamp: new Date().toISOString(),
        source:    'waitlist-form'
      };

      // Save locally (will be replaced by real form action when service is chosen)
      try {
        const existing = JSON.parse(localStorage.getItem('isar_leads') || '[]');
        existing.push(data);
        localStorage.setItem('isar_leads', JSON.stringify(existing));
      } catch (_) {}

      // Show success
      form.style.display = 'none';
      if (success) success.style.display = 'block';

      // Redirect to thank you page after 1.5s
      setTimeout(function () {
        window.location.href = 'obrigado.html';
      }, 1500);
    });

    // Clear errors on input
    ['waitlist-name', 'waitlist-email', 'consent-lgpd'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          const errMap = { 'waitlist-name': 'name-error', 'waitlist-email': 'email-error', 'consent-lgpd': 'consent-error' };
          showError(errMap[id], false);
        });
        el.addEventListener('change', function () {
          const errMap = { 'waitlist-name': 'name-error', 'waitlist-email': 'email-error', 'consent-lgpd': 'consent-error' };
          showError(errMap[id], false);
        });
      }
    });
  }

  // --- Cookie Banner ---
  function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const accept = document.getElementById('cookie-accept');
    if (!banner) return;

    const KEY = 'isar_cookie_accepted';
    if (localStorage.getItem(KEY)) return;

    // Show after 1.5s
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

  // --- Init all ---
  document.addEventListener('DOMContentLoaded', function () {
    initParticles();
    initNavbar();
    initMobileMenu();
    initScrollReveal();
    initSmoothScroll();
    initWaitlistForm();
    initCookieBanner();
    initActiveNav();
  });

})();
