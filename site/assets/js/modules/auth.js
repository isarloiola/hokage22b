// ============================================================
// isar.pi — Module: Pi Network Web3 & Authentication
// ============================================================

(function () {
  'use strict';

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

  // --- Modal de Login Pi Network ---
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

  // --- Autenticação Nativa com SDK Pi Network ---
  window.handlePiNativeAuth = function () {
    const inPi = isPiBrowser();
    if (window.Pi && inPi) {
      const scopes = ['username', 'payments', 'wallet_address'];
      function onIncompletePaymentFound(payment) {
        console.log('Pagamento pendente:', payment);
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
          if (window.showToast) {
            window.showToast('Falha na autenticação Pi. Use o modo de teste.', '⚠️');
          }
        });
    } else {
      if (window.showToast) {
        window.showToast('Para login automático, abra no Pi Browser ou use o modo teste abaixo!', '💡');
      }
      const input = document.getElementById('demo-username-input');
      if (input) input.focus();
    }
  };

  // --- Login Demonstração / Teste ---
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

    if (window.showToast) {
      window.showToast('Login realizado com sucesso! Bem-vindo(a), ' + user.username, '🎉');
    }

    if (window.calculateAndUpdateReputation) {
      window.calculateAndUpdateReputation();
    }

    // Recuperar e sincronizar perfil completo salvo no Supabase (restaura checklist e reputação)
    if (window.IsarDB && window.IsarDB.getPioneerProfile && user.uid) {
      window.IsarDB.getPioneerProfile(user.uid).then(function (profile) {
        if (profile) {
          if (profile.checklist_state && Object.keys(profile.checklist_state).length > 0) {
            try { localStorage.setItem('isar_pi_checklist_items', JSON.stringify(profile.checklist_state)); } catch (_) {}
          }
          if (profile.ebook_downloaded) {
            try { localStorage.setItem('isar_rep_downloaded', '1'); } catch (_) {}
          }
          if (profile.ebook2_reserved) {
            try { localStorage.setItem('isar_rep_ebook2_reserved', '1'); } catch (_) {}
          }
          if (window.IsarChecklist && window.IsarChecklist.updateChecklistUI) {
            window.IsarChecklist.updateChecklistUI();
          }
          if (window.calculateAndUpdateReputation) {
            window.calculateAndUpdateReputation();
          }
        } else if (window.IsarDB && window.IsarDB.syncPioneerProfile) {
          // Novo pioneiro: salva o primeiro registro na nuvem
          window.IsarDB.syncPioneerProfile(user);
        }
      });
    } else if (window.IsarDB && window.IsarDB.syncPioneerProfile) {
      window.IsarDB.syncPioneerProfile(user);
    }

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

  // --- Logout ---
  window.logoutPiUser = function () {
    try {
      localStorage.removeItem('isar_pi_user');
    } catch (_) {}

    updateUserInterface(null);
    if (window.showToast) {
      window.showToast('Você saiu da Área de Membros.', '👋');
    }
    if (window.calculateAndUpdateReputation) {
      window.calculateAndUpdateReputation();
    }
  };

  // --- Sincronizar UI de Sessão ---
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

      if (mobileBtn) {
        mobileBtn.classList.add('logged-in');
        mobileBtn.onclick = function () {
          const menu = document.getElementById('mobile-menu');
          if (menu) menu.classList.remove('open');
          document.body.style.overflow = '';
          const target = document.getElementById('membros');
          if (target) {
            const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 70;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH - 8, behavior: 'smooth' });
          }
        };
      }
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

      if (mobileBtn) {
        mobileBtn.classList.remove('logged-in');
        mobileBtn.onclick = function () {
          const menu = document.getElementById('mobile-menu');
          if (menu) menu.classList.remove('open');
          document.body.style.overflow = '';
          window.openPiLoginModal();
        };
      }
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
    if (mobileBtn && !localStorage.getItem('isar_pi_user')) {
      mobileBtn.onclick = function () {
        const menu = document.getElementById('mobile-menu');
        if (menu) menu.classList.remove('open');
        document.body.style.overflow = '';
        window.openPiLoginModal();
      };
    }
  }

  window.IsarAuth = {
    isPiBrowser,
    initPiSdk,
    checkStoredSession,
    initModalListeners,
    updateUserInterface
  };

})();

