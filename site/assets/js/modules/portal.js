/**
 * ============================================================
 * HOKAGE22B.COM — Portal Master Controller (v2.0)
 * ============================================================
 * Gerencia as interações da homepage, formulários reais de captura,
 * download transparente do manual e propostas comerciais.
 */

(function () {
  'use strict';

  const cfg = window.HOKAGE_CONFIG || {};

  // ─── 1. Menu Mobile Drawer ─────────────────────────────────
  function initMobileDrawer() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (!burger || !drawer) return;

    burger.addEventListener('click', function () {
      const isOpen = drawer.classList.contains('active');
      drawer.classList.toggle('active', !isOpen);
      burger.setAttribute('aria-expanded', !isOpen);
      burger.innerHTML = isOpen ? '☰' : '✕';
    });

    // Fecha ao clicar em um link interno
    const drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        drawer.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '☰';
      });
    });
  }

  // ─── 2. Modais (Manual, Proposta Comercial, Parceria) ─────
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function initModals() {
    // Trata fechamento por botão ✕ e clique no backdrop
    const overlays = document.querySelectorAll('.portal-modal-overlay');
    overlays.forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    const closeBtns = document.querySelectorAll('.portal-modal-close');
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const modal = btn.closest('.portal-modal-overlay');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // ─── 3. Formulário Real de Newsletter ──────────────────────
  function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');
    const submitBtn = document.getElementById('newsletter-submit-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('newsletter-name');
      const emailInput = document.getElementById('newsletter-email');
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

      // Validação básica de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, informe um endereço de e-mail válido.';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';
      }

      const payload = {
        name: name || 'Leitor HOKAGE22B',
        email: email,
        source: 'newsletter-hokage22b',
        timestamp: new Date().toISOString()
      };

      // 1. Envio para Google Apps Script Webhook
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function (err) {
          console.warn('Google Sheets sync info:', err);
        });
      } catch (_) {}

      // 2. Envio para Supabase
      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead(payload);
        } catch (_) {}
      }

      // 3. Salva no localStorage para reconhecer o usuário
      try {
        localStorage.setItem('hokage_subscriber', JSON.stringify(payload));
      } catch (_) {}

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Inscrição confirmada com sucesso! Você receberá nossos comunicados editoriais.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Inscrito com Sucesso!';
      }
    });
  }

  // ─── 4. Formulário de Parceria / Proposta Comercial ─────────
  function initPartnerProposal() {
    const form = document.getElementById('proposal-form');
    const feedback = document.getElementById('proposal-feedback');
    const submitBtn = document.getElementById('proposal-submit-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const name = (document.getElementById('prop-name') || {}).value || '';
      const email = (document.getElementById('prop-email') || {}).value || '';
      const company = (document.getElementById('prop-company') || {}).value || '';
      const category = (document.getElementById('prop-category') || {}).value || 'Parceria';
      const message = (document.getElementById('prop-message') || {}).value || '';

      if (!email || !message.trim()) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Preencha ao menos seu e-mail e uma mensagem sobre a proposta.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando proposta…';
      }

      const payload = {
        name: name,
        email: email,
        company: company,
        category: category,
        message: message,
        source: 'proposta-comercial-hokage22b',
        timestamp: new Date().toISOString()
      };

      // Dispara para o webhook
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Proposta enviada com sucesso! Nossa equipe entrará em contato em até 48 horas.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Proposta Enviada';
      }

      setTimeout(function () {
        closeModal('modal-proposta');
      }, 2500);
    });
  }

  // ─── 5. Formulário de Lista de Espera da Comunidade ────────
  function initCommunityWaitlist() {
    const form = document.getElementById('community-waitlist-form');
    const feedback = document.getElementById('community-waitlist-feedback');
    const submitBtn = document.getElementById('community-waitlist-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const emailInput = document.getElementById('community-email');
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

      if (!email) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cadastrando…';
      }

      const payload = {
        email: email,
        source: 'waitlist-comunidade-propria',
        timestamp: new Date().toISOString()
      };

      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Você está na lista de espera! Notificaremos você em primeira mão.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Inscrito na Lista!';
      }
    });
  }

  // ─── 6. Inicialização ──────────────────────────────────────
  function init() {
    initMobileDrawer();
    initModals();
    initNewsletter();
    initPartnerProposal();
    initCommunityWaitlist();
  }

  window.HokagePortal = {
    init: init,
    openModal: openModal,
    closeModal: closeModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

