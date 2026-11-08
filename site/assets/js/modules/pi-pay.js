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

  // 1. Toast Flutuante na Base da Tela (100% visível no celular)
  function showToast(msg, type) {
    let toast = document.getElementById('hokage-pi-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'hokage-pi-floating-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999999;padding:12px 22px;border-radius:10px;font-size:0.9rem;font-weight:700;max-width:92vw;box-shadow:0 12px 36px rgba(0,0,0,0.85);transition:all 0.3s ease;text-align:center;pointer-events:none;';
      document.body.appendChild(toast);
    }

    if (type === 'success') {
      toast.style.background = '#065f46';
      toast.style.color = '#a7f3d0';
      toast.style.border = '1px solid #10b981';
    } else if (type === 'error') {
      toast.style.background = '#7f1d1d';
      toast.style.color = '#fecaca';
      toast.style.border = '1px solid #ef4444';
    } else {
      toast.style.background = '#312e81';
      toast.style.color = '#c7d2fe';
      toast.style.border = '1px solid #6366f1';
    }

    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(function () {
      if (toast) {
        toast.style.opacity = '0';
        setTimeout(function () { toast.style.display = 'none'; }, 300);
      }
    }, 4500);
  }

  // 2. Inicialização segura do Pi SDK
  function initPiSdk(useSandbox) {
    if (useSandbox === undefined) useSandbox = false;
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: useSandbox });
      } catch (err) {
        console.warn('Pi.init info:', err);
      }
    }
  }

  // 3. Detecção Real e Precisa do Ambiente Pi Browser
  function isPiBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /PiBrowser|PiNetwork/i.test(ua);
  }

  // Helper: Garante handle limpo sem arrobas duplicadas (ex: @@usuario -> usuario)
  function formatUserHandle(raw) {
    if (!raw) return '';
    return String(raw).replace(/^@+/, '').trim();
  }

  // 4. Atualização de Elementos Visuais com status do pioneiro
  function updateAuthUi(user) {
    const handle = user && user.username ? formatUserHandle(user.username) : '';

    const headerBtns = document.querySelectorAll('.pi-auth-header-btn');
    headerBtns.forEach(function (btn) {
      if (handle) {
        const shortHandle = handle.length > 7 ? handle.slice(0, 6) + '…' : handle;
        btn.innerHTML = `<span style="color:#10b981">●</span> <span class="pi-btn-full">@${escapeHtml(handle)}</span><span class="pi-btn-short">@${escapeHtml(shortHandle)}</span>`;
        btn.title = `Conectado como @${handle} — Clique para gerenciar`;
      } else {
        btn.innerHTML = `<span class="pi-btn-full">⚡ Conectar Pi</span><span class="pi-btn-short">⚡ Pi</span>`;
        btn.title = 'Fazer login com Pi Network';
      }
    });

    const statusText = document.getElementById('pi-user-status-text');
    if (statusText) {
      if (handle) {
        statusText.innerHTML = `<span style="color:#10b981;font-weight:700">🟢 Conectado:</span> @${escapeHtml(handle)}`;
      } else {
        statusText.textContent = '⚪ Não conectado';
      }
    }

    const drawerStatuses = document.querySelectorAll('.pi-drawer-user-status');
    drawerStatuses.forEach(function (el) {
      if (handle) {
        el.innerHTML = `<span style="color:#10b981;font-weight:700">🟢 @${escapeHtml(handle)}</span>`;
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

    const muralUserInput = document.getElementById('ad-input-user');
    if (muralUserInput && user && user.username && !muralUserInput.value) {
      muralUserInput.value = '@' + user.username;
    }
  }

  // 5. Modal Web3 de Diagnóstico e Conexão Pi
  function openPiConnectModal() {
    let modal = document.getElementById('modal-pi-connect-diag');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'portal-modal-overlay';
      modal.id = 'modal-pi-connect-diag';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    const inPi = isPiBrowser();
    const hasSdk = Boolean(window.Pi);

    modal.innerHTML = `
      <div class="portal-modal" style="max-width:440px">
        <button type="button" class="portal-modal-close" onclick="document.getElementById('modal-pi-connect-diag').classList.remove('active')">✕</button>
        <div class="section-tag section-tag--amber">Web3 Pi Network</div>
        <h3 style="font-size:1.35rem;margin-bottom:12px;color:#fff">Conectar Pi Wallet</h3>

        <!-- Diagnóstico em Tempo Real -->
        <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;font-size:0.85rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-muted)">Navegador Atual:</span>
            <span style="font-weight:700;color:${inPi ? '#10b981' : '#f59e0b'}">
              ${inPi ? '✓ Pi Browser detectado' : '⚠️ Navegador Comum (Chrome/Safari)'}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:var(--text-muted)">Pi SDK Oficial:</span>
            <span style="font-weight:700;color:${hasSdk ? '#10b981' : '#ef4444'}">
              ${hasSdk ? '✓ Carregado v2.0' : '✕ Não detectado'}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-muted)">Status da Sessão:</span>
            <span id="diag-auth-status" style="font-weight:700;color:#c4b5fd">
              ${authenticatedUser ? ('🟢 @' + escapeHtml(formatUserHandle(authenticatedUser.username))) : '⚪ Desconectado'}
            </span>
          </div>
        </div>

        ${!inPi ? `
          <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px;font-size:0.84rem;color:var(--text-secondary);line-height:1.4">
            💡 <strong>Você está em um navegador comum:</strong><br>
            A autenticação automática por 1 clique é exclusiva do aplicativo <strong>Pi Browser</strong>. Abra o app Pi Browser no celular e acesse <strong>hokage22b.com</strong> para conectar!
          </div>
          <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" style="margin-bottom:12px" onclick="navigator.clipboard.writeText('https://hokage22b.com');this.textContent='✓ Link Copiado!';setTimeout(()=>this.textContent='📋 Copiar Link para abrir no Pi Browser',2000)">
            📋 Copiar Link para abrir no Pi Browser
          </button>
        ` : ''}

        <div id="diag-feedback-box" style="padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:0.85rem;line-height:1.4;display:none"></div>

        <!-- Ações -->
        <div style="display:flex;flex-direction:column;gap:10px">
          ${authenticatedUser ? `
            <div style="text-align:center;color:#10b981;font-weight:700;padding:12px;background:rgba(16,185,129,0.1);border-radius:var(--radius-sm);border:1px solid rgba(16,185,129,0.3)">
              ✓ Você já está conectado como @${escapeHtml(formatUserHandle(authenticatedUser.username))}!
            </div>
            <a href="pioneiro?u=${encodeURIComponent(formatUserHandle(authenticatedUser.username))}" class="portal-btn portal-btn--amber portal-btn--full" style="text-align:center;text-decoration:none;font-weight:700;padding:13px;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:8px">
              <span>🌟</span> Ir para Minha Vitrine
            </a>
            <a href="pioneiro" class="portal-btn portal-btn--outline portal-btn--full" style="text-align:center;text-decoration:none;font-size:0.85rem;padding:9px">
              🔍 Explorar Outras Vitrines
            </a>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" style="color:var(--text-muted);border-color:rgba(255,255,255,0.15);margin-top:4px" onclick="localStorage.removeItem('hokage_pi_user');localStorage.removeItem('isar_pi_user');location.reload()">
              Desconectar / Trocar de Conta
            </button>
          ` : `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--full" id="diag-auth-trigger-btn" onclick="HokagePi.triggerAuthFlow(false)" style="padding:14px;font-weight:700">
              ⚡ Conectar no Pi Browser
            </button>
            ${window.location.search.includes('sandbox=1') ? `
            <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" onclick="HokagePi.triggerAuthFlow(true)" style="font-size:0.78rem;opacity:0.85">
              🧪 Testar em Modo Sandbox (Debug)
            </button>` : ''}
          `}
        </div>

        <!-- Opção Direta de Carteira P2P -->
        <div style="background:rgba(245, 158, 11, 0.08);border:1px solid rgba(245, 158, 11, 0.25);border-radius:var(--radius-sm);padding:14px;margin-top:16px;font-size:0.82rem">
          <div style="font-weight:700;color:var(--amber-light);margin-bottom:4px">💰 Pagamento Direto via Pi Wallet:</div>
          <div style="color:var(--text-secondary);margin-bottom:8px">Envie Pi para a carteira oficial HOKAGE22B:</div>
          <code style="display:block;word-break:break-all;font-size:0.75rem;background:#09090b;padding:8px;border-radius:4px;color:var(--accent-light);user-select:all;margin-bottom:8px">${OFFICIAL_WALLET}</code>
          <div style="display:flex;gap:8px">
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--full" onclick="navigator.clipboard.writeText('${OFFICIAL_WALLET}');this.textContent='✓ Carteira Copiada!';setTimeout(()=>this.textContent='📋 Copiar Carteira',2000)">
              📋 Copiar Carteira
            </button>
            <a href="https://wallet.pi" class="portal-btn portal-btn--amber portal-btn--sm portal-btn--full" style="text-align:center;text-decoration:none">
              🚀 Abrir wallet.pi
            </a>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // Se estiver de fato no Pi Browser e desconectado, tenta autenticar
    if (inPi && !authenticatedUser) {
      setTimeout(function () {
        triggerAuthFlow(false);
      }, 350);
    }
  }

  // 6. Disparo Real da Autenticação com Pi SDK (com Proteção de Timeout)
  async function triggerAuthFlow(isSandbox) {
    if (isSandbox === undefined) isSandbox = false;

    const feedbackBox = document.getElementById('diag-feedback-box');
    const triggerBtn = document.getElementById('diag-auth-trigger-btn');
    const statusEl = document.getElementById('diag-auth-status');

    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = 'Aguardando no Pi…';
    }

    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.style.background = 'rgba(139,92,246,0.15)';
      feedbackBox.style.border = '1px solid rgba(139,92,246,0.3)';
      feedbackBox.style.color = '#c4b5fd';
      feedbackBox.innerHTML = '⏳ <strong>Aguardando janela de autorização do Pi Browser…</strong><br><small>Toque em "Permitir" assim que a caixa de permissões surgir.</small>';
    }

    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#f59e0b">⏳ Solicitando…</span>';
    }

    showToast('Aguardando permissão no Pi Browser...', 'info');

    if (!window.Pi) {
      if (feedbackBox) {
        feedbackBox.style.background = 'rgba(239,68,68,0.15)';
        feedbackBox.style.border = '1px solid rgba(239,68,68,0.3)';
        feedbackBox.style.color = '#fca5a5';
        feedbackBox.innerHTML = '⚠️ <strong>Pi SDK não encontrado.</strong><br>Abra este site dentro do aplicativo oficial Pi Browser no celular.';
      }
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = '⚡ Conectar no Pi Browser';
      }
      return null;
    }

    try {
      window.Pi.init({ version: '2.0', sandbox: isSandbox });
    } catch (_) {}

    const scopes = ['username', 'payments'];

    function onIncompletePaymentFound(payment) {
      console.log('Pagamento incompleto detectado:', payment);
      if (!payment || !payment.identifier) return;
      const st = payment.status || {};
      if (st.developer_completed) return;

      if (payment.transaction && payment.transaction.txid) {
        completePaymentOnServer(payment.identifier, payment.transaction.txid);
      } else if (st.developer_approved === false) {
        cancelPaymentOnServer(payment.identifier);
      }
    }

    try {
      // Cria promessa com timeout de 6.5s caso esteja aberto diretamente fora do container do develop.pi
      const authPromise = window.Pi.authenticate(scopes, onIncompletePaymentFound);
      const timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('TIMEOUT_STANDALONE'));
        }, 6500);
      });

      const auth = await Promise.race([authPromise, timeoutPromise]);
      authenticatedUser = auth.user;

      try {
        localStorage.setItem('hokage_pi_user', JSON.stringify(auth.user));
        if (auth.accessToken) {
          sessionStorage.setItem('hokage_pi_access_token', auth.accessToken);
        }
      } catch (_) {}

      const cleanAuthName = formatUserHandle(auth.user.username);
      updateAuthUi(authenticatedUser);
      showToast(`🎉 Conectado como @${cleanAuthName}!`, 'success');

      if (feedbackBox) {
        feedbackBox.style.background = 'rgba(16,185,129,0.15)';
        feedbackBox.style.border = '1px solid rgba(16,185,129,0.3)';
        feedbackBox.style.color = '#6ee7b7';
        feedbackBox.innerHTML = `✅ <strong>Autenticado com sucesso!</strong><br>Bem-vindo, <strong>@${escapeHtml(cleanAuthName)}</strong>.`;
      }

      if (statusEl) {
        statusEl.innerHTML = `<span style="color:#10b981">🟢 @${escapeHtml(cleanAuthName)}</span>`;
      }

      setTimeout(function () {
        const modal = document.getElementById('modal-pi-connect-diag');
        if (modal) modal.classList.remove('active');
      }, 1600);

      return auth.user;
    } catch (err) {
      console.warn('Erro ao autenticar:', err);

      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = '⚡ Tentar Novamente';
      }

      if (feedbackBox) {
        feedbackBox.style.background = 'rgba(239,68,68,0.15)';
        feedbackBox.style.border = '1px solid rgba(239,68,68,0.3)';
        feedbackBox.style.color = '#fca5a5';

        if (err && err.message === 'TIMEOUT_STANDALONE') {
          feedbackBox.innerHTML = `
            ℹ️ <strong>Como conectar seu app no Pi Browser:</strong><br>
            Você acessou pela barra de endereços direta.<br><br>
            Para que o Pi Browser abra a janela oficial de autorização nativa do SDK:<br>
            1. Acesse <strong>develop.pi</strong> na barra do Pi Browser.<br>
            2. Localize seu app cadastrado e toque em <strong>Open App</strong>.<br><br>
            <em>Ou realize o pagamento direto usando a carteira abaixo!</em>
          `;
        } else {
          const errMsg = (err && (err.message || err.error || (typeof err === 'string' ? err : ''))) || 'Autorização cancelada ou recusada.';
          feedbackBox.innerHTML = `⚠️ <strong>Resposta do Pi Browser:</strong><br>${escapeHtml(errMsg)}<br><small style="color:#fff;margin-top:6px;display:block">Se o app no develop.pi for Sandbox, toque no botão de Testnet acima.</small>`;
        }
      }

      if (statusEl) {
        statusEl.innerHTML = '<span style="color:#ef4444">✕ Não autorizado</span>';
      }

      return null;
    }
  }

  // 7. Ponto de Entrada para Login com Pi
  function loginWithPi() {
    openPiConnectModal();
  }

  // 8. Comunicação com a Edge Function no Supabase
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

  async function cancelPaymentOnServer(paymentId) {
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', paymentId: paymentId })
      });
      return await res.json();
    } catch (err) {
      console.error('Erro ao cancelar no servidor:', err);
      return null;
    }
  }

  // 9. Dispara Pagamento Nativo no Pi Browser
  async function requestPiPayment(options) {
    options = options || {};
    const amount = Number(options.amount) || 0.314;
    const memo = options.memo || 'Pagamento HOKAGE22B';
    const metadata = options.metadata || {};

    let user = authenticatedUser;
    if (!user) {
      openPiConnectModal();
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
        showToast('Aprovando transação no servidor...', 'info');
        await approvePaymentOnServer(paymentId);
      },

      onReadyForServerCompletion: async function (paymentId, txid) {
        console.log('Pi Payment aprovado na blockchain com TXID:', txid);
        showToast('✓ Pagamento confirmado na blockchain!', 'success');
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
        showToast('Pagamento cancelado na Pi Wallet.', 'info');
        if (typeof options.onCancel === 'function') {
          options.onCancel(paymentId);
        }
      },

      onError: function (error, payment) {
        console.error('Erro na transação Pi:', error, payment);
        const errText = error ? (error.message || JSON.stringify(error)) : 'Erro na transação';
        showToast('Erro Pi: ' + errText, 'error');
        if (typeof options.onError === 'function') {
          options.onError(error, payment);
        } else {
          alert('Houve um erro no processamento do pagamento via Pi. ' + errText);
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

  // 10. Modal de Pagamento P2P (quando fora do Pi Browser)
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

  // 12. Smart Banner Deep Link para Pi Browser (Modo Web2 -> Web3 Bridge)
  function initSmartPiBanner() {
    if (isPiBrowser()) return;
    try {
      if (sessionStorage.getItem('hokage_pi_banner_dismissed')) return;
    } catch (_) {}

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    if (!isMobile) return;

    if (document.getElementById('hokage-smart-pi-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'hokage-smart-pi-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:linear-gradient(90deg, #180d2b, #09090b);border-top:1px solid rgba(139,92,246,0.45);z-index:999998;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 -4px 25px rgba(0,0,0,0.85);font-family:system-ui,-apple-system,sans-serif;';

    const cleanHost = window.location.host;
    const cleanPath = window.location.pathname;
    const cleanSearch = window.location.search;
    const piDeepLink = 'pi://' + cleanHost + cleanPath + cleanSearch;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
        <span style="font-size:1.3rem;flex-shrink:0">⚡</span>
        <div style="min-width:0">
          <strong style="color:#fff;font-size:0.8rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Abra no Pi Browser Oficial</strong>
          <span style="color:#a78bfa;font-size:0.72rem;display:block">Conecte sua carteira e pague com 1 clique</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <a href="${piDeepLink}" style="background:linear-gradient(135deg, #8b5cf6, #7c3aed);color:#fff;font-size:0.78rem;font-weight:700;padding:7px 14px;border-radius:20px;text-decoration:none;border:1px solid rgba(255,255,255,0.25);white-space:nowrap;display:inline-block">
          🚀 Abrir Pi
        </a>
        <button type="button" onclick="document.getElementById('hokage-smart-pi-banner').remove();try{sessionStorage.setItem('hokage_pi_banner_dismissed','1')}catch(_){}" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:1.1rem;padding:4px 6px;cursor:pointer" aria-label="Fechar banner">
          ✕
        </button>
      </div>
    `;

    document.body.appendChild(banner);
  }

  // 13. Expõe na API global
  window.HokagePi = {
    initPiSdk: initPiSdk,
    isPiBrowser: isPiBrowser,
    loginWithPi: loginWithPi,
    authenticatePioneer: loginWithPi,
    openPiConnectModal: openPiConnectModal,
    triggerAuthFlow: triggerAuthFlow,
    requestPiPayment: requestPiPayment,
    showManualP2PModal: showManualP2PModal,
    showToast: showToast,
    getUser: function () { return authenticatedUser; },
    getAccessToken: function () {
      try {
        return sessionStorage.getItem('hokage_pi_access_token') || '';
      } catch (_) {
        return '';
      }
    },
    officialWallet: OFFICIAL_WALLET,
    initSmartPiBanner: initSmartPiBanner
  };

  // Inicializa bindings e recupera cache
  function autoInit() {
    initPiSdk(false);
    initSmartPiBanner();
    try {
      const cached = localStorage.getItem('hokage_pi_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.username) {
          authenticatedUser = parsed;
          updateAuthUi(authenticatedUser);
        }
      }
    } catch (_) {}

    document.querySelectorAll('.pi-auth-header-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openPiConnectModal();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
