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

  // ============================================================
  // TOAST FEEDBACK
  // ============================================================
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

  // ============================================================
  // COPIAR URL DO SITE PARA O PI BROWSER
  // ============================================================
  window.copySiteUrl = function () {
    const url = 'https://isarloiola.github.io/hokage22b/';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        window.showToast('Link copiado! Cole na barra do Pi Browser.', '📋');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      window.showToast('Link copiado! Cole na barra do Pi Browser.', '📋');
    }
  };

  // ============================================================
  // DETECÇÃO DO PI BROWSER & SDK
  // ============================================================
  function isPiBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /PiBrowser|PiNetwork/i.test(ua) || (window.Pi && window.isPiBrowser);
  }

  function initPiSdk() {
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: false });
      } catch (err) {
        console.warn('Pi.init info:', err);
      }
    }
  }

  // ============================================================
  // MODAL DE LOGIN PI NETWORK
  // ============================================================
  window.openPiLoginModal = function () {
    const modal = document.getElementById('pi-login-modal');
    const envBadge = document.getElementById('env-badge');
    const envText = document.getElementById('env-badge-text');
    const envDot = document.getElementById('env-badge-dot');
    if (!modal) return;

    const inPi = isPiBrowser();
    if (envBadge && envText) {
      if (inPi) {
        envBadge.className = 'env-badge pi-detected';
        envDot.textContent = '🟢';
        envText.textContent = 'Pi Browser Web3 detectado';
      } else {
        envBadge.className = 'env-badge regular-detected';
        envDot.textContent = '🟡';
        envText.textContent = 'Navegador convencional (teste disponível)';
      }
    }

    modal.classList.add('active');
  };

  window.closePiLoginModal = function () {
    const modal = document.getElementById('pi-login-modal');
    if (modal) modal.classList.remove('active');
  };

  // Autenticação nativa com o SDK oficial da Pi Network
  window.handlePiNativeAuth = function () {
    const inPi = isPiBrowser();
    if (window.Pi && inPi) {
      const scopes = ['username', 'payments', 'wallet_address'];
      function onIncompletePaymentFound(payment) {
        console.log('Pagamento incompleto:', payment);
      }
      window.Pi.authenticate(scopes, onIncompletePaymentFound)
        .then(function (auth) {
          const username = auth && auth.user ? auth.user.username : 'Pioneiro';
          loginSuccess({
            username: username,
            uid: auth && auth.user ? auth.user.uid : null,
            authType: 'Nativo Pi Web3'
          });
        })
        .catch(function (err) {
          console.error('Erro na autenticação Pi:', err);
          window.showToast('Falha na autenticação Pi. Use o modo de teste.', '⚠️');
        });
    } else {
      window.showToast('Para login automático, abra no Pi Browser ou use o modo teste abaixo!', '💡');
      const input = document.getElementById('demo-username-input');
      if (input) input.focus();
    }
  };

  // Login de Demonstração / Teste para computadores e navegadores normais
  window.handleDemoLogin = function () {
    const input = document.getElementById('demo-username-input');
    let username = input && input.value.trim() ? input.value.trim() : 'hokage22b_pioneer';
    if (!username.startsWith('@')) username = '@' + username;

    loginSuccess({
      username: username,
      uid: 'demo-' + Date.now(),
      authType: 'Modo Teste / Demonstração'
    });
  };

  function loginSuccess(user) {
    try {
      localStorage.setItem('isar_pi_user', JSON.stringify(user));
    } catch (_) {}

    updateUserInterface(user);
    window.closePiLoginModal();
    window.showToast('Login realizado com sucesso! Bem-vindo(a), ' + user.username, '🎉');

    // Scroll suave para a Área de Membros
    setTimeout(function () {
      const target = document.getElementById('membros');
      if (target) {
        const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 8;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }, 400);
  }

  window.logoutPiUser = function () {
    try {
      localStorage.removeItem('isar_pi_user');
    } catch (_) {}

    updateUserInterface(null);
    window.showToast('Você saiu da Área de Membros.', '👋');
  };

  function updateUserInterface(user) {
    const navBtn = document.getElementById('nav-pi-login');
    const navText = document.getElementById('nav-pi-text');
    const mobileBtn = document.getElementById('mobile-pi-login');
    const mobileText = document.getElementById('mobile-pi-text');

    const lockedView = document.getElementById('members-locked-view');
    const dashView = document.getElementById('members-dashboard-view');
    const displayName = document.getElementById('member-display-name');
    const authType = document.getElementById('member-auth-type');

    if (user) {
      if (navBtn) {
        navBtn.classList.add('logged-in');
        navBtn.onclick = function () {
          const target = document.getElementById('membros');
          if (target) {
            const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 8, behavior: 'smooth' });
          }
        };
      }
      if (navText) navText.textContent = user.username;
      if (mobileText) mobileText.textContent = user.username + ' (Membro)';

      if (lockedView) lockedView.style.display = 'none';
      if (dashView) dashView.classList.add('active');
      if (displayName) displayName.textContent = user.username;
      if (authType) authType.textContent = user.authType || 'Sessão Web3 Ativa';
    } else {
      if (navBtn) {
        navBtn.classList.remove('logged-in');
        navBtn.onclick = window.openPiLoginModal;
      }
      if (navText) navText.textContent = 'Entrar com Pi';
      if (mobileText) mobileText.textContent = 'Entrar com Pi';

      if (lockedView) lockedView.style.display = 'block';
      if (dashView) dashView.classList.remove('active');
    }
  }

  function checkStoredSession() {
    try {
      const saved = localStorage.getItem('isar_pi_user');
      if (saved) {
        const user = JSON.parse(saved);
        updateUserInterface(user);
      } else {
        updateUserInterface(null);
      }
    } catch (_) {
      updateUserInterface(null);
    }
  }

  // ============================================================
  // CHECKLIST DO PIONEIRO (PERSISTÊNCIA & PROGRESSO)
  // ============================================================
  const CHECKLIST_KEY = 'isar_pi_checklist_items';

  window.toggleChecklistItem = function (id) {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (_) {}

    const chk = document.getElementById('chk-' + id);
    if (!chk) return;

    state[id] = chk.checked;
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
    } catch (_) {}

    updateChecklistUI();
  };

  function updateChecklistUI() {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (_) {}

    const total = 8;
    let completed = 0;

    for (let i = 1; i <= total; i++) {
      const chk = document.getElementById('chk-' + i);
      const item = document.getElementById('item-chk-' + i);
      if (chk) {
        chk.checked = !!state[i];
        if (chk.checked) completed++;
      }
      if (item) {
        item.classList.toggle('checked', !!state[i]);
      }
    }

    const pct = Math.round((completed / total) * 100);
    const bar = document.getElementById('checklist-progress-bar');
    const text = document.getElementById('checklist-progress-text');

    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = pct + '% Concluído (' + completed + ' de ' + total + ')';
  }

  // Fechar modal ao clicar fora ou apertar ESC
  function initModalListeners() {
    const modal = document.getElementById('pi-login-modal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) window.closePiLoginModal();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') window.closePiLoginModal();
      });
    }

    const navBtn = document.getElementById('nav-pi-login');
    if (navBtn && !localStorage.getItem('isar_pi_user')) {
      navBtn.onclick = window.openPiLoginModal;
    }

    const mobileBtn = document.getElementById('mobile-pi-login');
    if (mobileBtn) {
      mobileBtn.onclick = function () {
        const menu = document.getElementById('mobile-menu');
        if (menu) menu.classList.remove('open');
        document.body.style.overflow = '';
        window.openPiLoginModal();
      };
    }
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
    initPiSdk();
    initModalListeners();
    checkStoredSession();
    updateChecklistUI();
  });

})();

