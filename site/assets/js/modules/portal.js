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
  function closeMobileDrawer() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (drawer) drawer.classList.remove('active');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.innerHTML = '☰';
    }
    document.body.style.overflow = '';
  }

  function initMobileDrawer() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (!burger || !drawer) return;

    burger.addEventListener('click', function () {
      const isOpen = drawer.classList.contains('active');
      drawer.classList.toggle('active', !isOpen);
      burger.setAttribute('aria-expanded', !isOpen);
      burger.innerHTML = isOpen ? '☰' : '✕';
      // Controla a rolagem no body de forma segura
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Fecha ao clicar em um link interno
    const drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(function (link) {
      link.addEventListener('click', closeMobileDrawer);
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

  // ─── 6. Captura de Lead para Desbloqueio do Manual ─────────
  function initManualLeadUnlock() {
    const form = document.getElementById('manual-lead-form');
    const leadBox = document.getElementById('manual-lead-box');
    const dlLinks = document.getElementById('manual-download-links');
    const feedback = document.getElementById('manual-lead-feedback');
    const submitBtn = document.getElementById('manual-lead-btn');

    // Se o usuário já desbloqueou anteriormente, mostra direto os links
    try {
      const unlocked = localStorage.getItem('hokage_lead_unlocked');
      if (unlocked && leadBox && dlLinks) {
        leadBox.style.display = 'none';
        dlLinks.style.display = 'block';
      }
    } catch (_) {}

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('manual-lead-name');
      const emailInput = document.getElementById('manual-lead-email');
      const consentInput = document.getElementById('manual-lead-consent');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, informe um endereço de e-mail válido.';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (consentInput && !consentInput.checked) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, confirme a caixinha de consentimento para prosseguir.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Liberando seu download…';
      }

      const payload = {
        name: name || 'Leitor do Manual',
        email: email,
        source: 'manual-pi-download',
        timestamp: new Date().toISOString()
      };

      // 1. Envia para Google Sheets
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      // 2. Salva no Supabase se disponível
      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead(payload);
        } catch (_) {}
      }

      // 3. Salva desbloqueio no localStorage
      try {
        localStorage.setItem('hokage_lead_unlocked', 'true');
        localStorage.setItem('hokage_subscriber', JSON.stringify(payload));
      } catch (_) {}

      // 4. Transição visual: oculta formulário e exibe botões de download
      if (leadBox && dlLinks) {
        leadBox.style.display = 'none';
        dlLinks.style.display = 'block';
      }

      // 5. Inicia o download do PDF automaticamente
      const pdfBtn = document.getElementById('btn-dl-pdf');
      if (pdfBtn) {
        setTimeout(function () {
          pdfBtn.click();
        }, 800);
      }
    });
  }

  // ─── 7. Pagamento do E-book via Pi Browser ────────────────
  function payEbookWithPi() {
    if (!window.HokagePi) {
      alert('Carregando integração Pi Network... Tente novamente em instantes.');
      return;
    }

    const payBtn = document.getElementById('btn-pay-pi-browser');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = 'Processando no Pi Browser…';
    }

    const feedbackArea = document.getElementById('pi-action-feedback');
    if (feedbackArea) {
      feedbackArea.style.display = 'block';
      feedbackArea.style.background = 'rgba(139, 92, 246, 0.15)';
      feedbackArea.style.border = '1px solid rgba(139, 92, 246, 0.3)';
      feedbackArea.style.color = '#c4b5fd';
      feedbackArea.textContent = '⏳ Autenticando e abrindo a Pi Wallet…';
    }

    window.HokagePi.requestPiPayment({
      amount: 3.14,
      memo: 'E-book: Pi para seu Negócio',
      metadata: {
        type: 'ebook',
        productId: 'pi-para-seu-negocio'
      },
      onSuccess: function (result) {
        console.log('Pagamento do e-book concluído com sucesso:', result);
        const modalBody = document.getElementById('pi-modal-content-area');
        if (modalBody) {
          modalBody.innerHTML = `
            <div style="text-align:center;padding:12px 0">
              <div style="font-size:3rem;margin-bottom:8px">🎉</div>
              <div class="section-tag section-tag--amber">Pagamento Confirmado</div>
              <h3 style="color:#fff;font-size:1.5rem;margin:12px 0 8px">Parabéns! Acesso Liberado</h3>
              <p style="color:var(--text-secondary);font-size:0.92rem;margin-bottom:18px">
                Sua transação de <strong>3.14 π</strong> foi validada com sucesso na blockchain da Pi Network.
              </p>
              <div style="background:rgba(16, 185, 129, 0.1);border:1px solid rgba(16, 185, 129, 0.3);border-radius:var(--radius-sm);padding:12px;margin-bottom:20px">
                <span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);word-break:break-all">TXID: ${result.txid || 'Confirmado via Pi SDK'}</span>
              </div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <a href="downloads/Manual-Pi-Network.pdf" download class="portal-btn portal-btn--primary portal-btn--full">
                  ⬇ Baixar E-book em PDF
                </a>
                <a href="downloads/Manual-Pi-Network.epub" download class="portal-btn portal-btn--outline portal-btn--full">
                  ⬇ Baixar em EPUB (Leitores Digitais)
                </a>
              </div>
            </div>
          `;
        }
      },
      onError: function (err) {
        console.warn('Erro ao processar pagamento:', err);
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = '⚡ Pagar 3.14 π na Pi Wallet (1 Clique)';
        }
        if (feedbackArea) {
          feedbackArea.style.background = 'rgba(239, 68, 68, 0.15)';
          feedbackArea.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          feedbackArea.style.color = '#fca5a5';
          feedbackArea.textContent = '⚠️ Não foi possível abrir o pagamento. Verifique se autorizou no Pi Browser.';
        }
      },
      onCancel: function () {
        if (payBtn) {
          payBtn.disabled = false;
          payBtn.textContent = '⚡ Pagar 3.14 π na Pi Wallet (1 Clique)';
        }
        if (feedbackArea) {
          feedbackArea.style.display = 'none';
        }
      }
    });
  }

  // ─── 8. Inicialização ──────────────────────────────────────
  function init() {
    initMobileDrawer();
    initModals();
    initNewsletter();
    initPartnerProposal();
    initCommunityWaitlist();
    initManualLeadUnlock();
  }

  window.HokagePortal = {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    closeMobileDrawer: closeMobileDrawer,
    payEbookWithPi: payEbookWithPi
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

