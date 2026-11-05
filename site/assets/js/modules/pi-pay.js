/**
 * ============================================================
 * HOKAGE22B.COM — Module: Pi Network Web3 Payments & Validation
 * Integração Oficial Pi SDK v2.0 com Supabase Edge Function
 * ============================================================
 */

(function () {
  'use strict';

  const SUPABASE_FUNCTIONS_URL = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-payment';
  const OFFICIAL_WALLET = 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR';

  let authenticatedUser = null;
  let isAuthenticating = false;

  // 1. Inicializa o SDK oficial da Pi Network
  function initPiSdk() {
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: false });
      } catch (err) {
        console.warn('Pi.init info:', err);
      }
    }
  }

  // 2. Detecta se está rodando dentro do Pi Browser
  function isPiBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /PiBrowser|PiNetwork/i.test(ua) || Boolean(window.Pi);
  }

  // 3. Atualiza os componentes visuais com o estado do pioneiro
  function updateAuthUi(user) {
    const headerBtns = document.querySelectorAll('.pi-auth-header-btn');
    headerBtns.forEach(function (btn) {
      if (user && user.username) {
        btn.innerHTML = `<span style="color:#10b981">●</span> @${escapeHtml(user.username)}`;
        btn.title = `Conectado como @${user.username}`;
      } else {
        btn.innerHTML = `⚡ Conectar Pi`;
        btn.title = 'Fazer login com Pi Network';
      }
    });

    const statusText = document.getElementById('pi-user-status-text');
    if (statusText) {
      if (user && user.username) {
        statusText.innerHTML = `<span style="color:#10b981;font-weight:700">🟢 Conectado:</span> @${escapeHtml(user.username)}`;
      } else {
        statusText.textContent = '⚪ Não conectado';
      }
    }

    const drawerStatuses = document.querySelectorAll('.pi-drawer-user-status');
    drawerStatuses.forEach(function (el) {
      if (user && user.username) {
        el.innerHTML = `<span style="color:#10b981;font-weight:700">🟢 @${escapeHtml(user.username)}</span>`;
      } else {
        el.textContent = '⚪ Não conectado';
      }
    });

    const loginFlowBtn = document.getElementById('btn-login-pi-flow');
    if (loginFlowBtn) {
      if (user && user.username) {
        loginFlowBtn.textContent = '✓ Conectado';
        loginFlowBtn.disabled = true;
        loginFlowBtn.style.opacity = '0.75';
      } else {
        loginFlowBtn.textContent = '⚡ Conectar Pi Wallet';
        loginFlowBtn.disabled = false;
        loginFlowBtn.style.opacity = '1';
      }
    }

    const hint = document.getElementById('pi-connection-hint');
    if (hint) {
      if (user && user.username) {
        hint.innerHTML = `✓ Carteira autorizada com sucesso. Pronto para efetuar pagamentos com 1 clique!`;
        hint.style.color = '#10b981';
      } else {
        hint.innerHTML = `💡 No Pi Browser, clique em <strong>Conectar Pi Wallet</strong> para autorizar sua sessão e habilitar o pagamento com 1 clique.`;
        hint.style.color = 'var(--text-secondary)';
      }
    }

    // Se estiver no modal do mural, preenche o campo de usuário
    const muralUserInput = document.getElementById('ad-input-user');
    if (muralUserInput && user && user.username && !muralUserInput.value) {
      muralUserInput.value = '@' + user.username;
    }
  }

  // 4. Autenticação oficial de Pioneiro (Pi.authenticate)
  async function loginWithPi(interactive) {
    if (interactive === undefined) interactive = true;

    // Se já estiver em memória, retorna
    if (authenticatedUser) {
      updateAuthUi(authenticatedUser);
      return authenticatedUser;
    }

    // Tenta restaurar do cache local
    try {
      const cached = localStorage.getItem('hokage_pi_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.username) {
          authenticatedUser = parsed;
          updateAuthUi(authenticatedUser);
          if (!interactive) return authenticatedUser;
        }
      }
    } catch (_) {}

    if (!window.Pi) {
      if (interactive) {
        showManualP2PModal({
          memo: 'Pagamento Pi Network',
          amount: 3.14
        });
      }
      return null;
    }

    initPiSdk();

    if (isAuthenticating) return null;
    isAuthenticating = true;

    const flowBtn = document.getElementById('btn-login-pi-flow');
    if (flowBtn) {
      flowBtn.disabled = true;
      flowBtn.textContent = 'Aguardando autorização…';
    }

    const feedbackArea = document.getElementById('pi-action-feedback');
    if (feedbackArea) {
      feedbackArea.style.display = 'block';
      feedbackArea.style.background = 'rgba(139, 92, 246, 0.15)';
      feedbackArea.style.border = '1px solid rgba(139, 92, 246, 0.3)';
      feedbackArea.style.color = '#c4b5fd';
      feedbackArea.textContent = '⏳ Autorize a conexão na tela do Pi Browser…';
    }

    return new Promise(function (resolve) {
      // Scopes estritamente aceitos pela Pi Core Team
      const scopes = ['username', 'payments'];

      function onIncompletePaymentFound(payment) {
        console.log('Pagamento incompleto detectado:', payment);
        if (payment && payment.identifier && payment.transaction && payment.transaction.txid) {
          completePaymentOnServer(payment.identifier, payment.transaction.txid);
        }
      }

      window.Pi.authenticate(scopes, onIncompletePaymentFound)
        .then(function (auth) {
          isAuthenticating = false;
          authenticatedUser = auth.user;
          try {
            localStorage.setItem('hokage_pi_user', JSON.stringify(auth.user));
          } catch (_) {}

          updateAuthUi(authenticatedUser);

          if (feedbackArea) {
            feedbackArea.style.background = 'rgba(16, 185, 129, 0.15)';
            feedbackArea.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            feedbackArea.style.color = '#6ee7b7';
            feedbackArea.textContent = `✓ Conectado como @${auth.user.username}!`;
            setTimeout(function () {
              feedbackArea.style.display = 'none';
            }, 4000);
          }

          resolve(auth.user);
        })
        .catch(function (err) {
          isAuthenticating = false;
          console.warn('Erro ou cancelamento ao autenticar no Pi Browser:', err);

          if (flowBtn) {
            flowBtn.disabled = false;
            flowBtn.textContent = '⚡ Conectar Pi Wallet';
          }

          if (feedbackArea) {
            feedbackArea.style.background = 'rgba(239, 68, 68, 0.15)';
            feedbackArea.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            feedbackArea.style.color = '#fca5a5';
            feedbackArea.textContent = '⚠️ Para conectar, acesse pelo aplicativo Pi Browser no celular e autorize a permissão.';
          } else if (interactive) {
            alert('💡 Para conectar sua Pi Wallet com 1 clique, abra o site hokage22b.com dentro do aplicativo Pi Browser no celular e autorize o acesso.');
          }

          resolve(null);
        });
    });
  }

  // 5. Comunicação segura com a Edge Function no Supabase
  async function approvePaymentOnServer(paymentId) {
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', paymentId: paymentId })
      });
      return await res.json();
    } catch (err) {
      console.error('Erro ao aprovar no servidor:', err);
      return null;
    }
  }

  async function completePaymentOnServer(paymentId, txid) {
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', paymentId: paymentId, txid: txid })
      });
      return await res.json();
    } catch (err) {
      console.error('Erro ao completar no servidor:', err);
      return null;
    }
  }

  // 6. Função Principal: Dispara o Pagamento Nativo no Pi Browser
  async function requestPiPayment(options) {
    options = options || {};
    const amount = Number(options.amount) || 0.314;
    const memo = options.memo || 'Pagamento HOKAGE22B';
    const metadata = options.metadata || {};

    initPiSdk();

    // 1. Garante que o pioneiro está autenticado
    let user = authenticatedUser;
    if (!user) {
      user = await loginWithPi(true);
    }

    // Se o usuário ainda não estiver autenticado (ex: fora do Pi Browser ou recusou)
    if (!user) {
      showManualP2PModal({
        amount: amount,
        memo: memo,
        metadata: metadata
      });
      if (typeof options.onCancel === 'function') {
        options.onCancel('not_authenticated');
      }
      return;
    }

    metadata.pioneer_username = user.username;

    const paymentData = {
      amount: amount,
      memo: memo,
      metadata: metadata
    };

    const paymentCallbacks = {
      onReadyForServerApproval: async function (paymentId) {
        console.log('Pi Payment pronto para aprovação:', paymentId);
        await approvePaymentOnServer(paymentId);
      },

      onReadyForServerCompletion: async function (paymentId, txid) {
        console.log('Pi Payment aprovado na blockchain com TXID:', txid);
        const result = await completePaymentOnServer(paymentId, txid);

        if (typeof options.onSuccess === 'function') {
          options.onSuccess({
            paymentId: paymentId,
            txid: txid,
            amount: amount,
            serverResult: result
          });
        }
      },

      onCancel: function (paymentId) {
        console.log('Pagamento cancelado pelo pioneiro:', paymentId);
        if (typeof options.onCancel === 'function') {
          options.onCancel(paymentId);
        }
      },

      onError: function (error, payment) {
        console.error('Erro na transação Pi:', error, payment);
        if (typeof options.onError === 'function') {
          options.onError(error, payment);
        } else {
          alert('Houve um erro no processamento do pagamento via Pi. Tente novamente.');
        }
      }
    };

    try {
      window.Pi.createPayment(paymentData, paymentCallbacks);
    } catch (err) {
      console.error('Erro ao chamar window.Pi.createPayment:', err);
      showManualP2PModal({ amount: amount, memo: memo, metadata: metadata });
      if (typeof options.onError === 'function') {
        options.onError(err);
      }
    }
  }

  // 7. Modal de Pagamento P2P (quando acessado fora do Pi Browser)
  function showManualP2PModal(data) {
    let modal = document.getElementById('pi-p2p-checkout-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'portal-modal-overlay';
      modal.id = 'pi-p2p-checkout-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="portal-modal">
        <button type="button" class="portal-modal-close" onclick="document.getElementById('pi-p2p-checkout-modal').classList.remove('active')">✕</button>
        <div class="section-tag section-tag--amber">Pagamento em Pi Network</div>
        <h3 style="font-size:1.35rem;margin-bottom:12px;color:#fff">${escapeHtml(data.memo || 'Pagamento')}</h3>
        
        <div style="background:rgba(245, 158, 11, 0.08);border:1px solid rgba(245, 158, 11, 0.25);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;font-size:0.88rem;color:var(--text-secondary)">
          💡 <strong>Dica de agilidade:</strong> Para pagar e validar com 1 clique, abra este site diretamente no aplicativo <strong>Pi Browser</strong> no seu celular!
        </div>

        <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:18px;margin-bottom:18px">
          <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">Valor a transferir:</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--amber-light);font-family:var(--font-mono);margin:4px 0 14px">
            ${data.amount || '3.14'} π
          </div>
          
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:6px">Endereço da Carteira Oficial HOKAGE22B:</div>
          <code style="display:block;word-break:break-all;font-size:0.75rem;background:#09090b;padding:10px;border-radius:4px;color:var(--accent-light);border:1px solid rgba(255,255,255,0.1);user-select:all" id="p2p-wallet-code">${OFFICIAL_WALLET}</code>

          <button type="button" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--full" style="margin-top:10px" onclick="navigator.clipboard.writeText('${OFFICIAL_WALLET}');this.textContent='✓ Endereço Copiado!';setTimeout(()=>this.textContent='📋 Copiar Endereço da Carteira',2000)">
            📋 Copiar Endereço da Carteira
          </button>
        </div>

        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:18px;line-height:1.5">
          Após enviar a transferência no seu Pi Wallet, envie o comprovante ou hash para <strong>contato@hokage22b.com</strong> para ativação imediata.
        </p>

        <a href="mailto:contato@hokage22b.com?subject=Pagamento%20Pi%20Network%20-%20${encodeURIComponent(data.memo || '')}&body=Enviei%20${data.amount}%20Pi%20para%20a%20sua%20carteira.%20Seguem%20meus%20dados:" class="portal-btn portal-btn--amber portal-btn--full">
          Enviar Comprovante por E-mail
        </a>
      </div>
    `;

    modal.classList.add('active');
  }

  function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 8. Expõe na API global
  window.HokagePi = {
    initPiSdk: initPiSdk,
    isPiBrowser: isPiBrowser,
    loginWithPi: loginWithPi,
    authenticatePioneer: loginWithPi,
    requestPiPayment: requestPiPayment,
    showManualP2PModal: showManualP2PModal,
    getUser: function () { return authenticatedUser; },
    officialWallet: OFFICIAL_WALLET
  };

  // Inicializa detecção e recupera sessão na carga do DOM
  function autoInit() {
    initPiSdk();
    loginWithPi(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
