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

  let sdkLoaded = false;
  let authenticatedUser = null;

  // 1. Detecta se está rodando dentro do Pi Browser
  function isPiBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /PiBrowser|PiNetwork/i.test(ua) || Boolean(window.Pi && window.isPiBrowser);
  }

  // 2. Carrega o SDK oficial da Pi Network dinamicamente se necessário
  function loadPiSdk() {
    return new Promise(function (resolve) {
      if (window.Pi) {
        sdkLoaded = true;
        try {
          window.Pi.init({ version: '2.0', sandbox: false });
        } catch (_) {}
        return resolve(window.Pi);
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.minepi.com/pi-sdk.js';
      script.async = true;
      script.onload = function () {
        sdkLoaded = true;
        try {
          if (window.Pi) {
            window.Pi.init({ version: '2.0', sandbox: false });
          }
        } catch (err) {
          console.warn('Pi.init warning:', err);
        }
        resolve(window.Pi);
      };
      script.onerror = function () {
        console.warn('Falha ao carregar Pi SDK (provavelmente fora do Pi Browser).');
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }

  // 3. Autentica o pioneiro com 1 clique (sem senha)
  async function authenticatePioneer() {
    if (authenticatedUser) return authenticatedUser;

    const pi = await loadPiSdk();
    if (!pi || !isPiBrowser()) {
      return null;
    }

    return new Promise(function (resolve) {
      const scopes = ['username', 'payments', 'wallet_address'];

      function onIncompletePaymentFound(payment) {
        console.log('Pagamento incompleto encontrado:', payment);
        // Tenta completar automaticamente se houver transação pendente
        if (payment && payment.identifier && payment.transaction && payment.transaction.txid) {
          completePaymentOnServer(payment.identifier, payment.transaction.txid);
        }
      }

      pi.authenticate(scopes, onIncompletePaymentFound)
        .then(function (auth) {
          authenticatedUser = auth.user;
          try {
            localStorage.setItem('hokage_pi_user', JSON.stringify(auth.user));
          } catch (_) {}
          resolve(auth.user);
        })
        .catch(function (err) {
          console.warn('Erro ao autenticar no Pi Browser:', err);
          resolve(null);
        });
    });
  }

  // 4. Comunicação segura com a Edge Function no Supabase
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

  // 5. Função Principal: Dispara o Pagamento Nativo no Pi Browser
  // Opções: { amount, memo, metadata, onSuccess, onError, onCancel }
  async function requestPiPayment(options) {
    options = options || {};
    const amount = Number(options.amount) || 0.314;
    const memo = options.memo || 'Pagamento HOKAGE22B';
    const metadata = options.metadata || {};

    const inPi = isPiBrowser();

    // Se estiver fora do Pi Browser, orienta o usuário de forma transparente
    if (!inPi) {
      showManualP2PModal({
        amount: amount,
        memo: memo,
        metadata: metadata
      });
      return;
    }

    const pi = await loadPiSdk();
    if (!pi) {
      showManualP2PModal({ amount: amount, memo: memo, metadata: metadata });
      return;
    }

    // Garante que o pioneiro está autenticado
    const user = await authenticatePioneer();
    if (user && user.username) {
      metadata.pioneer_username = user.username;
    }

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
        console.log('Pagamento cancelado pelo usuário:', paymentId);
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
      pi.createPayment(paymentData, paymentCallbacks);
    } catch (err) {
      console.error('Erro ao chamar pi.createPayment:', err);
      showManualP2PModal({ amount: amount, memo: memo, metadata: metadata });
    }
  }

  // 6. Modal de Pagamento P2P (quando acessado fora do Pi Browser)
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
          💡 <strong>Dica de agilidade:</strong> Para pagar e validar com 1 clique, abra este site diretamente no aplicativo <strong>Pi Browser</strong>!
        </div>

        <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:18px;margin-bottom:18px">
          <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">Valor a transferir:</div>
          <div style="font-size:1.8rem;font-weight:800;color:var(--amber-light);font-family:var(--font-mono);margin:4px 0 14px">
            ${data.amount} π
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

  // 7. Expõe na API global
  window.HokagePi = {
    isPiBrowser: isPiBrowser,
    loadPiSdk: loadPiSdk,
    authenticatePioneer: authenticatePioneer,
    requestPiPayment: requestPiPayment,
    showManualP2PModal: showManualP2PModal,
    officialWallet: OFFICIAL_WALLET
  };

  // Inicializa detecção quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPiSdk);
  } else {
    loadPiSdk();
  }
})();
