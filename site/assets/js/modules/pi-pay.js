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
  let isSdkSessionAuthenticated = false;

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

  // 2. Detecção Centralizada de Ambiente Sandbox (Testnet) vs Mainnet
  function isSandboxMode() {
    if (window.HOKAGE_CONFIG && window.HOKAGE_CONFIG.piNetwork && typeof window.HOKAGE_CONFIG.piNetwork.sandbox === 'boolean') {
      return window.HOKAGE_CONFIG.piNetwork.sandbox;
    }
    return true;
  }

  // Inicialização segura do Pi SDK
  function initPiSdk(useSandbox) {
    if (useSandbox === undefined) useSandbox = isSandboxMode();
    if (window.Pi) {
      try {
        window.Pi.init({ version: '2.0', sandbox: Boolean(useSandbox) });
      } catch (err) {
        console.warn('Pi.init info:', err);
      }
    }
  }

  // Callback global do Pi SDK para recuperar ou cancelar pagamentos pendentes/travados na carteira
  async function onIncompletePaymentFound(payment) {
    console.log('Pagamento incompleto detectado:', payment);
    if (!payment || !payment.identifier) return;
    const st = payment.status || {};
    if (st.developer_completed) return;

    if (payment.transaction && payment.transaction.txid) {
      let savedAdPayload = null;
      try {
        const rawSaved = localStorage.getItem('hokage_pending_ad_payload');
        if (rawSaved) savedAdPayload = JSON.parse(rawSaved);
      } catch (_) {}
      const res = await completePaymentOnServer(payment.identifier, payment.transaction.txid, savedAdPayload);
      if (res && (res.ok || res.code === 'PAYMENT_COMPLETED')) {
        try { localStorage.removeItem('hokage_pending_ad_payload'); } catch (_) {}
        showToast('✓ Pagamento pendente recuperado e confirmado na blockchain!', 'success');
      }
    } else {
      console.log('Limpando pagamento pendente sem txid:', payment.identifier);
      cancelPaymentOnServer(payment.identifier);
    }
  }

  // 3. Detecção Real e Precisa do Ambiente Pi Browser (Multicamadas)
  function isPiBrowser() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    // 1. Identificadores explícitos no User Agent
    if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;

    // 2. Pontes e objetos nativos injetados pelo app oficial Pi Browser (Flutter InAppWebView / Bridge)
    if (typeof window !== 'undefined') {
      if (window.PiNetwork || window.flutter_inappwebview) return true;
      if (window.location && (window.location.protocol === 'pi:' || (window.location.hostname && window.location.hostname.endsWith('.pi')))) return true;
    }
    return false;
  }

  // Helper: Garante handle limpo sem arrobas duplicadas (ex: @@usuario -> usuario)
  function formatUserHandle(raw) {
    if (!raw) return '';
    return String(raw).replace(/^@+/, '').trim();
  }

  // 4. Atualização de Elementos Visuais com status do pioneiro (Pi-First ou Membro Web)
  function updateAuthUi(user) {
    if (user && (user.authType === 'web2' || user.authType === 'hybrid')) {
      authenticatedUser = user;
    }
    const handle = user && user.username ? formatUserHandle(user.username) : '';
    const isWebOnly = Boolean(user && user.authType === 'web2' && !user.is_pi_verified);
    const dotColor = isWebOnly ? '#38bdf8' : '#10b981';

    const inPi = isPiBrowser();
    const headerBtns = document.querySelectorAll('.pi-auth-header-btn');
    headerBtns.forEach(function (btn) {
      if (handle) {
        const shortHandle = handle.length > 7 ? handle.slice(0, 6) + '…' : handle;
        btn.innerHTML = `<span style="color:${dotColor};flex-shrink:0;line-height:1">●</span><span class="pi-btn-full" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">@${escapeHtml(handle)}</span><span class="pi-btn-short" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">@${escapeHtml(shortHandle)}</span>`;
        btn.title = isWebOnly ? `Membro Web @${handle} — Clique para gerenciar` : `Conectado como @${handle} — Clique para gerenciar`;
      } else if (isWebOnly) {
        btn.innerHTML = `<span class="pi-btn-full" style="white-space:nowrap">🌐 Conta Web</span><span class="pi-btn-short" style="white-space:nowrap">🌐 Web</span>`;
        btn.title = 'Sessão Web ativa — escolha seu @usuário no Passaporte';
      } else if (inPi) {
        btn.innerHTML = `<span class="pi-btn-full" style="white-space:nowrap">⚡ Conectar Pi</span><span class="pi-btn-short" style="white-space:nowrap">⚡ Pi</span>`;
        btn.title = 'Fazer login com Pi Network';
      } else {
        btn.innerHTML = `<span class="pi-btn-full" style="white-space:nowrap">👤 Entrar / Criar Conta</span><span class="pi-btn-short" style="white-space:nowrap">👤 Entrar</span>`;
        btn.title = 'Entrar ou criar conta grátis';
      }
    });

    const statusText = document.getElementById('pi-user-status-text');
    if (statusText) {
      if (handle) {
        statusText.innerHTML = isWebOnly
          ? `<span style="color:#38bdf8;font-weight:700">🌐 Membro Web:</span> @${escapeHtml(handle)}`
          : `<span style="color:#10b981;font-weight:700">🟢 Conectado:</span> @${escapeHtml(handle)}`;
      } else if (isWebOnly) {
        statusText.innerHTML = `<span style="color:#38bdf8;font-weight:700">🌐 Sessão Web ativa</span>`;
      } else {
        statusText.textContent = '⚪ Não conectado';
      }
    }

    const drawerStatuses = document.querySelectorAll('.pi-drawer-user-status');
    drawerStatuses.forEach(function (el) {
      if (handle) {
        el.innerHTML = isWebOnly
          ? `<span style="color:#38bdf8;font-weight:700">🌐 @${escapeHtml(handle)}</span>`
          : `<span style="color:#10b981;font-weight:700">🟢 @${escapeHtml(handle)}</span>`;
      } else if (isWebOnly) {
        el.innerHTML = `<span style="color:#38bdf8;font-weight:700">🌐 Conta Web</span>`;
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

  const PENDING_LINK_EMAIL_KEY = 'hokage_pending_link_email';

  function getPendingLinkEmail() {
    try {
      const raw = localStorage.getItem(PENDING_LINK_EMAIL_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.email || !parsed.at) {
        localStorage.removeItem(PENDING_LINK_EMAIL_KEY);
        return '';
      }
      if (Date.now() - Number(parsed.at) > 20 * 60 * 1000) {
        localStorage.removeItem(PENDING_LINK_EMAIL_KEY);
        return '';
      }
      return String(parsed.email).trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function setPendingLinkEmail(email) {
    try {
      const clean = String(email || '').trim().toLowerCase();
      if (clean) {
        localStorage.setItem(PENDING_LINK_EMAIL_KEY, JSON.stringify({ email: clean, at: Date.now() }));
      }
    } catch (_) {}
  }

  function clearPendingLinkEmail() {
    try { localStorage.removeItem(PENDING_LINK_EMAIL_KEY); } catch (_) {}
  }

  // 5. Modal Web3 de Diagnóstico e Conexão Pi
  function openPiConnectModal(options) {
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
    const isSandbox = isSandboxMode();
    const pendingLinkEmail = getPendingLinkEmail();
    const netTag = isSandbox ? '🧪 Ambiente Pi Testnet (Sandbox)' : '⚡ Ambiente Oficial Pi Mainnet';
    const modalHeading = isSandbox ? 'Conectar Pi Wallet (Testnet)' : 'Conectar Pi Wallet (Pi Browser)';
    const netLabel = isSandbox ? '🧪 Pi Testnet (Sandbox)' : '⚡ Pi Network (Produção)';
    const cleanHost = window.location.host || 'hokage22b.com';
    const piOpenUrl = 'pi://' + cleanHost + (window.location.pathname || '/') + (window.location.search || '');
    const isWebGuestModal = !inPi && !authenticatedUser;
    const displayTag = isWebGuestModal ? '🌐 Acesso Web2 & Pi Network' : netTag;
    const displayHeading = isWebGuestModal ? 'Entrar ou Criar Conta' : modalHeading;

    modal.innerHTML = `
      <div class="portal-modal" style="max-width:440px">
        <button type="button" class="portal-modal-close" onclick="document.getElementById('modal-pi-connect-diag').classList.remove('active')">✕</button>
        <div class="section-tag section-tag--purple" style="background:rgba(139,92,246,0.15);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)">${displayTag}</div>
        <h3 style="font-size:1.35rem;margin-bottom:12px;color:#fff">${displayHeading}</h3>

        ${isWebGuestModal ? `
          <div id="diag-web2-box" style="background:rgba(56,189,248,0.09);border:1px solid rgba(56,189,248,0.32);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px">
            <div style="font-size:0.9rem;font-weight:800;color:#bae6fd;margin-bottom:6px">
              🌐 Criar Conta ou Entrar na Web (Grátis)
            </div>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin:0 0 10px;line-height:1.45">
              Entre com 1 clique pelo Google ou receba um link sem senha no seu e-mail. Você pode vincular sua conta Pi depois para ganhar o selo <strong>✓ Pi Verificado</strong>!
            </p>
            <div id="diag-web2-google-slot" style="margin-bottom:10px;display:flex;justify-content:center;min-height:42px">
              <button type="button" id="diag-web2-google-btn" class="portal-btn portal-btn--outline portal-btn--full" style="background:#fff;color:#111827;border-color:#e5e7eb;font-weight:800;justify-content:center;gap:8px;padding:10px 12px">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#f3f4f6;color:#2563eb;font-weight:900;font-size:0.8rem">G</span>
                <span>Continuar com Google</span>
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:0.72rem;color:var(--text-muted)">
              <span style="flex:1;height:1px;background:rgba(255,255,255,0.12)"></span>
              <span>ou entre por e-mail</span>
              <span style="flex:1;height:1px;background:rgba(255,255,255,0.12)"></span>
            </div>
            <form id="diag-web2-magic-form" style="display:flex;gap:6px;flex-wrap:wrap">
              <input type="email" id="diag-web2-email" required placeholder="seu@email.com" style="flex:1;min-width:155px;padding:9px 11px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.55);color:#fff;font-size:0.86rem;box-sizing:border-box" />
              <button type="submit" id="diag-web2-submit" class="portal-btn portal-btn--primary portal-btn--sm" style="white-space:nowrap;font-weight:800">
                ✉️ Enviar Link Mágico
              </button>
            </form>
            <div id="diag-web2-feedback" style="display:none;margin-top:8px;font-size:0.78rem;line-height:1.4"></div>
          </div>

          <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px">
            <div style="font-size:0.82rem;font-weight:700;color:#fde68a;margin-bottom:8px">
              ⚡ Já usa o Pi Browser? Conecte direto com 1 clique:
            </div>
            <a href="${piOpenUrl}" class="portal-btn portal-btn--amber portal-btn--full" style="margin-bottom:8px;text-align:center;text-decoration:none;font-weight:800;display:block">
              🚀 Abrir Direto no Pi Browser
            </a>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" onclick="navigator.clipboard.writeText('https://hokage22b.com');this.textContent='✓ Link Copiado!';setTimeout(()=>this.textContent='📋 Copiar Link para abrir no Pi Browser',2000)">
              📋 Copiar Link para abrir no Pi Browser
            </button>
          </div>
        ` : `
          <!-- Diagnóstico em Tempo Real -->
          <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;font-size:0.85rem">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:var(--text-muted)">Navegador Atual:</span>
              <span style="font-weight:700;color:${inPi ? '#10b981' : '#f59e0b'}">
                ${inPi ? '✓ Pi Browser detectado' : '⚠️ Navegador Comum (Chrome/Safari)'}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="color:var(--text-muted)">Rede Pi Ativa:</span>
              <span style="font-weight:700;color:#38bdf8">
                ${netLabel}
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
                ${authenticatedUser ? (
                  authenticatedUser.authType === 'web2' && !authenticatedUser.is_pi_verified
                    ? (authenticatedUser.username
                        ? ('🌐 @' + escapeHtml(formatUserHandle(authenticatedUser.username)) + ' (Web)')
                        : '🌐 Conta Web (E-mail)')
                    : ('🟢 @' + escapeHtml(formatUserHandle(authenticatedUser.username)))
                ) : '⚪ Desconectado'}
              </span>
            </div>
          </div>

          ${!inPi ? `
            <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-sm);padding:12px;margin-bottom:14px;font-size:0.84rem;color:var(--text-secondary);line-height:1.4">
              💡 <strong>Modo Web2 ativo:</strong><br>
              Para assinar transações em Pi ou ativar o selo <strong>✓ Pi Verificado</strong>, abra sua conta no aplicativo oficial <strong>Pi Browser</strong>.
            </div>
          ` : ''}
        `}

        <div id="diag-feedback-box" style="padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;font-size:0.85rem;line-height:1.4;display:none"></div>

        <!-- Ações -->
        <div style="display:flex;flex-direction:column;gap:10px">
          ${authenticatedUser ? (
            authenticatedUser.authType === 'web2' && !authenticatedUser.is_pi_verified ? `
              <div style="text-align:center;color:#7dd3fc;font-weight:700;padding:12px;background:rgba(56,189,248,0.1);border-radius:var(--radius-sm);border:1px solid rgba(56,189,248,0.3)">
                🌐 Sessão Membro Web ativa${authenticatedUser.username ? (' como @' + escapeHtml(formatUserHandle(authenticatedUser.username))) : (authenticatedUser.email ? (' (' + escapeHtml(authenticatedUser.email) + ')') : '')}
              </div>
              ${authenticatedUser.username ? `
                <a href="pioneiro?u=${encodeURIComponent(formatUserHandle(authenticatedUser.username))}" class="portal-btn portal-btn--primary portal-btn--full" style="text-align:center;text-decoration:none;font-weight:700;padding:13px;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:8px">
                  <span>🪪</span> Ir para Meu Passaporte
                </a>
              ` : `
                <a href="pioneiro?setup=web2" class="portal-btn portal-btn--primary portal-btn--full" style="text-align:center;text-decoration:none;font-weight:700;padding:13px;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:8px">
                  <span>✨</span> Escolher meu @usuário
                </a>
              `}
              <a href="${piOpenUrl}" class="portal-btn portal-btn--amber portal-btn--full" style="text-align:center;text-decoration:none;font-size:0.85rem;font-weight:700;padding:10px">
                🚀 Abrir no Pi Browser para selo ✓ Pi Verificado
              </a>
              <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" style="color:var(--text-muted);border-color:rgba(255,255,255,0.15);margin-top:4px" onclick="HokagePi.logout()">
                Sair
              </button>
            ` : `
              <div style="text-align:center;color:#10b981;font-weight:700;padding:12px;background:rgba(16,185,129,0.1);border-radius:var(--radius-sm);border:1px solid rgba(16,185,129,0.3)">
                ✓ Você já está conectado como @${escapeHtml(formatUserHandle(authenticatedUser.username))}!
              </div>
              <a href="pioneiro?u=${encodeURIComponent(formatUserHandle(authenticatedUser.username))}" class="portal-btn portal-btn--amber portal-btn--full" style="text-align:center;text-decoration:none;font-weight:700;padding:13px;font-size:0.95rem;display:flex;align-items:center;justify-content:center;gap:8px">
                <span>🪪</span> Ir para Meu Passaporte
              </a>
              ${(authenticatedUser.email || authenticatedUser.authType === 'hybrid') ? `
                <div style="text-align:center;font-size:0.8rem;color:#6ee7b7;padding:8px 12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-sm)">
                  ✓ E-mail vinculado${authenticatedUser.email ? (': <strong>' + escapeHtml(authenticatedUser.email) + '</strong>') : ' (conta híbrida ativa)'}
                </div>
              ` : `
                <button type="button" id="diag-toggle-link-email-btn" class="portal-btn portal-btn--outline portal-btn--full" style="border-color:rgba(56,189,248,0.45);color:#7dd3fc;font-weight:700;font-size:0.86rem;padding:10px 12px">
                  ${pendingLinkEmail ? ('🔑 Inserir código enviado para ' + escapeHtml(pendingLinkEmail)) : '✉️ Adicionar / Vincular E-mail (acesso fora do Pi Browser)'}
                </button>
                <div id="diag-link-email-box" style="display:${pendingLinkEmail ? 'block' : 'none'};background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.3);border-radius:var(--radius-sm);padding:12px">
                  <div style="font-size:0.8rem;font-weight:700;color:#bae6fd;margin-bottom:4px">
                    Vincular e-mail à sua conta Pi (@${escapeHtml(formatUserHandle(authenticatedUser.username))})
                  </div>
                  <p style="font-size:0.75rem;color:var(--text-secondary);margin:0 0 8px;line-height:1.4">
                    Assim você também consegue entrar no Chrome/Safari usando seu e-mail sem precisar abrir o Pi Browser.
                  </p>
                  <form id="diag-link-email-form" style="display:flex;gap:6px;flex-wrap:wrap">
                    <input type="email" id="diag-link-email-input" required value="${escapeHtml(pendingLinkEmail)}" placeholder="seu@email.com" style="flex:1;min-width:155px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.55);color:#fff;font-size:0.84rem;box-sizing:border-box" />
                    <button type="submit" id="diag-link-email-submit" class="portal-btn portal-btn--primary portal-btn--sm" style="white-space:nowrap;font-weight:700">
                      ${pendingLinkEmail ? 'Reenviar código' : 'Enviar link de confirmação'}
                    </button>
                  </form>
                  <div id="diag-link-step2" style="display:${pendingLinkEmail ? 'block' : 'none'};margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.12)">
                    <p style="font-size:0.75rem;color:#fde68a;margin:0 0 6px;line-height:1.4">
                      ✉️ <strong>Quase lá!</strong> Digite abaixo o <strong>código de 6 dígitos</strong> do e-mail (ou cole o link completo):
                    </p>
                    <input type="text" id="diag-link-confirm-input" autocomplete="one-time-code" inputmode="text" placeholder="Digite o código de 6 dígitos (ou cole o link)" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid rgba(245,158,11,0.45);background:rgba(0,0,0,0.65);color:#fff;font-size:0.86rem;box-sizing:border-box;margin-bottom:8px" />
                    <button type="button" id="diag-link-confirm-btn" class="portal-btn portal-btn--primary portal-btn--full portal-btn--sm" style="font-weight:800">
                      ✓ Confirmar e Vincular à minha conta Pi
                    </button>
                    <div style="text-align:center;margin-top:6px">
                      <button type="button" id="diag-link-cancel-btn" style="background:none;border:none;color:#a1a1aa;font-size:0.73rem;cursor:pointer;text-decoration:underline">
                        ✕ Cancelar / trocar e-mail
                      </button>
                    </div>
                  </div>
                  <div id="diag-link-email-feedback" style="display:none;margin-top:8px;font-size:0.77rem;line-height:1.4"></div>
                </div>
              `}
              <a href="pioneiro?explorar=1" class="portal-btn portal-btn--outline portal-btn--full" style="text-align:center;text-decoration:none;font-size:0.85rem;padding:9px">
                🔍 Explorar Outros Passaportes
              </a>
              <button type="button" class="portal-btn portal-btn--outline portal-btn--full portal-btn--sm" style="color:var(--text-muted);border-color:rgba(255,255,255,0.15);margin-top:4px" onclick="HokagePi.logout()">
                Desconectar / Trocar de Conta
              </button>
            `
          ) : (inPi ? `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--full" id="diag-auth-trigger-btn" onclick="HokagePi.triggerAuthFlow()" style="padding:14px;font-weight:700">
              ⚡ Conectar no Pi Browser
            </button>
          ` : '')}
        </div>

        <!-- Garantia de Segurança Oficial Pi SDK -->
        <div style="background:rgba(16, 185, 129, 0.08);border:1px solid rgba(16, 185, 129, 0.25);border-radius:var(--radius-sm);padding:14px;margin-top:16px;font-size:0.82rem">
          <div style="font-weight:700;color:#34d399;margin-bottom:4px;display:flex;align-items:center;gap:6px">
            <span>🔒</span> Protocolo Nativo Pi Platform SDK
          </div>
          <div style="color:var(--text-secondary);line-height:1.45">
            O HOKAGE22B opera em conformidade com as diretrizes da Pi Core Team (${isSandboxMode() ? 'Testnet (Sandbox)' : 'Mainnet'}) com assinatura biométrica oficial na Pi Wallet.
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const googleSlot = document.getElementById('diag-web2-google-slot');
    if (googleSlot && window.HokageWeb2Auth && typeof window.HokageWeb2Auth.renderGoogleButton === 'function') {
      window.HokageWeb2Auth.renderGoogleButton(googleSlot, {
        onSuccess: function () {
          modal.classList.remove('active');
          showToast('✓ Conectado com Google! Bem-vindo ao HOKAGE22B.', 'success');
        },
        onError: function (err) {
          const fbEl = document.getElementById('diag-web2-feedback');
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fde68a';
            fbEl.textContent = 'ℹ️ ' + ((err && err.message) || 'Use seu e-mail abaixo caso prefira.');
          }
        }
      });
    }

    const googleBtn = document.getElementById('diag-web2-google-btn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async function () {
        const fbEl = document.getElementById('diag-web2-feedback');
        if (!window.HokageWeb2Auth || typeof window.HokageWeb2Auth.signInWithGoogle !== 'function') {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = 'Login Google indisponível nesta página. Use seu e-mail abaixo.';
          }
          return;
        }
        googleBtn.disabled = true;
        const origHtml = googleBtn.innerHTML;
        googleBtn.textContent = '⏳ Conectando ao Google...';
        if (fbEl) fbEl.style.display = 'none';
        try {
          await window.HokageWeb2Auth.signInWithGoogle(window.location.origin + '/pioneiro');
        } catch (err) {
          googleBtn.disabled = false;
          googleBtn.innerHTML = origHtml;
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fde68a';
            fbEl.textContent = 'ℹ️ ' + ((err && err.message) || 'Login com Google em ativação — use seu e-mail abaixo!');
          }
        }
      });
    }

    const web2Form = document.getElementById('diag-web2-magic-form');
    if (web2Form) {
      web2Form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        const emailInp = document.getElementById('diag-web2-email');
        const submitBtn = document.getElementById('diag-web2-submit');
        const fbEl = document.getElementById('diag-web2-feedback');
        const emailVal = emailInp ? emailInp.value.trim() : '';
        if (!window.HokageWeb2Auth || typeof window.HokageWeb2Auth.sendMagicLink !== 'function') {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = 'Módulo de login Web indisponível nesta página. Acesse /pioneiro para entrar por e-mail.';
          }
          return;
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Enviando...';
        }
        if (fbEl) fbEl.style.display = 'none';
        try {
          await window.HokageWeb2Auth.sendMagicLink(emailVal, window.location.origin + '/pioneiro');
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#6ee7b7';
            fbEl.innerHTML = '✉️ <strong>Link enviado!</strong> Confira sua caixa de entrada (e spam) e toque no link para entrar instantaneamente.';
          }
          if (emailInp) emailInp.value = '';
        } catch (err) {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = '⚠️ ' + ((err && err.message) || 'Falha ao enviar link de acesso.');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✉️ Enviar Link Mágico';
          }
        }
      });
    }

    const toggleLinkEmailBtn = document.getElementById('diag-toggle-link-email-btn');
    const linkEmailBox = document.getElementById('diag-link-email-box');
    if (toggleLinkEmailBtn && linkEmailBox) {
      toggleLinkEmailBtn.addEventListener('click', function () {
        const show = linkEmailBox.style.display === 'none';
        linkEmailBox.style.display = show ? 'block' : 'none';
        if (show) {
          const inp = document.getElementById('diag-link-email-input');
          if (inp) inp.focus();
        }
      });
    }

    const linkEmailForm = document.getElementById('diag-link-email-form');
    if (linkEmailForm) {
      linkEmailForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        const emailInp = document.getElementById('diag-link-email-input');
        const submitBtn = document.getElementById('diag-link-email-submit');
        const step2 = document.getElementById('diag-link-step2');
        const fbEl = document.getElementById('diag-link-email-feedback');
        const emailVal = emailInp ? emailInp.value.trim() : '';

        if (!window.HokageWeb2Auth || typeof window.HokageWeb2Auth.sendMagicLink !== 'function') {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = 'Serviço de e-mail indisponível no momento.';
          }
          return;
        }
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Enviando...';
        }
        if (fbEl) fbEl.style.display = 'none';
        try {
          const handleSlug = authenticatedUser && authenticatedUser.username ? formatUserHandle(authenticatedUser.username) : '';
          const redirectTarget = handleSlug
            ? (window.location.origin + '/pioneiro?u=' + encodeURIComponent(handleSlug))
            : (window.location.origin + '/pioneiro');
          await window.HokageWeb2Auth.sendMagicLink(emailVal, redirectTarget);
          setPendingLinkEmail(emailVal);
          if (step2) step2.style.display = 'block';
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#6ee7b7';
            fbEl.textContent = '✓ Enviado para ' + emailVal + '. Se o Pi Browser recarregar ao voltar do e-mail, este campo reabrirá pronto!';
          }
        } catch (err) {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = '⚠️ ' + ((err && err.message) || 'Falha ao enviar link.');
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reenviar código';
          }
        }
      });
    }

    const linkCancelBtn = document.getElementById('diag-link-cancel-btn');
    if (linkCancelBtn) {
      linkCancelBtn.addEventListener('click', function () {
        clearPendingLinkEmail();
        openPiConnectModal({ noAutoAuth: true });
      });
    }

    const linkConfirmBtn = document.getElementById('diag-link-confirm-btn');
    if (linkConfirmBtn) {
      linkConfirmBtn.addEventListener('click', async function () {
        const emailInp = document.getElementById('diag-link-email-input');
        const confirmInp = document.getElementById('diag-link-confirm-input');
        const fbEl = document.getElementById('diag-link-email-feedback');
        const emailVal = emailInp ? emailInp.value.trim() : '';
        const confirmVal = confirmInp ? confirmInp.value.trim() : '';

        if (!confirmVal) {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fde68a';
            fbEl.textContent = '⚠️ Digite o código de 6 dígitos (ou cole o link do e-mail).';
          }
          if (confirmInp) confirmInp.focus();
          return;
        }
        if (!window.HokageWeb2Auth || typeof window.HokageWeb2Auth.confirmAndLinkEmail !== 'function') {
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = 'Módulo de vínculo indisponível.';
          }
          return;
        }

        linkConfirmBtn.disabled = true;
        linkConfirmBtn.textContent = '⏳ Vinculando e-mail...';
        if (fbEl) fbEl.style.display = 'none';
        try {
          const piTok = getAuthTokenForServer() || '';
          const linkedProf = await window.HokageWeb2Auth.confirmAndLinkEmail(emailVal, confirmVal, piTok);
          clearPendingLinkEmail();
          authenticatedUser = Object.assign({}, authenticatedUser || {}, {
            username: (linkedProf && linkedProf.username) || (authenticatedUser && authenticatedUser.username) || '',
            uid: (linkedProf && linkedProf.uid) || (authenticatedUser && authenticatedUser.uid) || '',
            authType: 'hybrid',
            is_pi_verified: true,
            email: emailVal || (authenticatedUser && authenticatedUser.email) || ''
          });
          updateAuthUi(authenticatedUser);
          showToast('✓ E-mail vinculado à sua conta Pi com sucesso!', 'success');
          openPiConnectModal({ noAutoAuth: true });
        } catch (err) {
          linkConfirmBtn.disabled = false;
          linkConfirmBtn.textContent = '✓ Confirmar e Vincular à minha conta Pi';
          if (fbEl) {
            fbEl.style.display = 'block';
            fbEl.style.color = '#fca5a5';
            fbEl.textContent = '⚠️ ' + ((err && err.message) || 'Não foi possível confirmar o vínculo.');
          }
        }
      });
    }

    // Se estiver de fato no Pi Browser e desconectado, tenta autenticar
    if (inPi && !authenticatedUser && !(options && options.noAutoAuth)) {
      setTimeout(function () {
        triggerAuthFlow();
      }, 350);
    }
  }

  // 6. Disparo Real da Autenticação com Pi SDK (com Proteção de Timeout)
  async function triggerAuthFlow(isSandbox) {
    if (isSandbox === undefined) isSandbox = isSandboxMode();

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
    } catch (_) { }

    const scopes = ['username', 'payments'];

    try {
      // Cria promessa com timeout de 25s para dar tempo ao pioneiro de aceitar no modal nativo
      const timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error('TIMEOUT_STANDALONE'));
        }, 25000);
      });

      let auth;
      try {
        auth = await Promise.race([
          window.Pi.authenticate(scopes, onIncompletePaymentFound),
          timeoutPromise
        ]);
      } catch (scopeErr) {
        // Se o escopo 'payments' ainda não estiver liberado em produção no develop.pi,
        // tenta autenticar apenas com ['username'] para garantir o login do pioneiro.
        if (scopeErr && scopeErr.message !== 'TIMEOUT_STANDALONE') {
          auth = await Promise.race([
            window.Pi.authenticate(['username'], onIncompletePaymentFound),
            timeoutPromise
          ]);
        } else {
          throw scopeErr;
        }
      }
      let prevCached = null;
      try {
        prevCached = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      } catch (_) {}
      if (prevCached && prevCached.username && formatUserHandle(prevCached.username) === formatUserHandle(auth.user.username) && (prevCached.authType === 'hybrid' || prevCached.email)) {
        authenticatedUser = Object.assign({}, auth.user, {
          authType: 'hybrid',
          is_pi_verified: true,
          email: prevCached.email || ''
        });
      } else {
        authenticatedUser = auth.user;
      }
      isSdkSessionAuthenticated = true;

      try {
        localStorage.setItem('hokage_pi_user', JSON.stringify(authenticatedUser));
        if (auth.accessToken) {
          sessionStorage.setItem('hokage_pi_access_token', auth.accessToken);
        }
      } catch (_) { }

      const cleanAuthName = formatUserHandle(auth.user.username);
      updateAuthUi(authenticatedUser);
      syncOwnedEbooksUi();
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
        if (modal && !getPendingLinkEmail()) modal.classList.remove('active');
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
          let errMsg = '';
          if (err) {
            errMsg = err.message || err.error || (typeof err === 'string' ? err : '');
            if (!errMsg) {
              try { errMsg = JSON.stringify(err); } catch (_) { errMsg = String(err); }
            }
          }
          if (!errMsg || errMsg === '{}') errMsg = 'Autorização cancelada ou recusada pelo Pi Browser.';
          feedbackBox.innerHTML = `⚠️ <strong>Resposta do Pi Browser:</strong><br>${escapeHtml(errMsg)}<br><small style="color:#fff;margin-top:6px;display:block">Confirme se a URL <strong>https://hokage22b.com</strong> está cadastrada no seu app em <strong>develop.pi</strong>.</small>`;
        }
      }

      if (statusEl) {
        statusEl.innerHTML = '<span style="color:#ef4444">✕ Não autorizado</span>';
      }

      return null;
    }
  }

  // 7. Ponto de Entrada para Login com Pi & Logout
  async function loginWithPi() {
    if (authenticatedUser && (authenticatedUser.username || authenticatedUser.authType === 'web2')) {
      openPiConnectModal({ noAutoAuth: true });
      return authenticatedUser;
    }
    if (isPiBrowser()) {
      const user = await triggerAuthFlow();
      if (!user) {
        openPiConnectModal({ noAutoAuth: true });
      }
      return user;
    }
    openPiConnectModal();
    return authenticatedUser || null;
  }

  function logout() {
    authenticatedUser = null;
    isSdkSessionAuthenticated = false;
    if (window.HokageWeb2Auth && typeof window.HokageWeb2Auth.signOut === 'function') {
      try { window.HokageWeb2Auth.signOut(); } catch (_) {}
    }
    try {
      localStorage.removeItem('hokage_pi_user');
      sessionStorage.removeItem('hokage_pi_user');
      sessionStorage.removeItem('hokage_pi_access_token');
    } catch (_) { }
    updateAuthUi(null);
    showToast('Sessão desconectada.', 'info');
    setTimeout(function () {
      window.location.reload();
    }, 350);
  }

  // 8. Comunicação com a Edge Function no Supabase
  function getAuthTokenForServer() {
    try { return sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) { return ''; }
  }

  async function approvePaymentOnServer(paymentId) {
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          paymentId: paymentId,
          accessToken: getAuthTokenForServer()
        })
      });
      return await res.json();
    } catch (err) {
      console.error('Erro ao aprovar no servidor:', err);
      return null;
    }
  }

  async function completePaymentOnServer(paymentId, txid, adPayload) {
    try {
      const pendingRef = (window.HokageReferral && typeof window.HokageReferral.getPendingRef === 'function')
        ? window.HokageReferral.getPendingRef()
        : null;
      const payload = {
        action: 'complete',
        paymentId: paymentId,
        txid: txid,
        accessToken: getAuthTokenForServer()
      };
      if (adPayload && typeof adPayload === 'object') {
        payload.adPayload = adPayload;
      }
      if (pendingRef) {
        payload.refCode = pendingRef;
      }
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        body: JSON.stringify({
          action: 'cancel',
          paymentId: paymentId,
          accessToken: getAuthTokenForServer()
        })
      });
      return await res.json();
    } catch (err) {
      console.error('Erro ao cancelar no servidor:', err);
      return null;
    }
  }

  // 9. Dispara Pagamento Nativo no Pi Browser (com Proteção contra Chamada Duplicada)
  let isPaymentRequestInFlight = false;

  async function requestPiPayment(options) {
    options = options || {};

    if (isPaymentRequestInFlight) {
      console.warn('requestPiPayment: chamada simultânea bloqueada para evitar expiração do Pi SDK.');
      return;
    }
    isPaymentRequestInFlight = true;

    function releasePaymentLock() {
      isPaymentRequestInFlight = false;
    }

    const amount = Number(options.amount) || 0.314;
    const memo = options.memo || 'Pagamento HOKAGE22B';
    const metadata = options.metadata || {};

    // O Pi SDK oficial exige que window.Pi.authenticate(['username', 'payments'], ...)
    // tenha sido aprovado nesta sessão de navegador para carregar o escopo 'payments' na memória do SDK.
    if (!isSdkSessionAuthenticated || !authenticatedUser) {
      showToast('Conectando escopo de pagamentos Pi...', 'info');
      try {
        const logged = await triggerAuthFlow();
        if (logged) {
          authenticatedUser = logged;
          isSdkSessionAuthenticated = true;
        } else {
          releasePaymentLock();
          openPiConnectModal();
          if (typeof options.onError === 'function') {
            options.onError(new Error('Sessão Pi não autorizada. Conecte sua carteira para continuar.'));
          }
          return;
        }
      } catch (err) {
        releasePaymentLock();
        console.warn('Tentativa de autenticação de pagamentos:', err);
        openPiConnectModal();
        if (typeof options.onError === 'function') {
          options.onError(err || new Error('Erro ao conectar carteira Pi'));
        }
        return;
      }
    }

    let user = authenticatedUser;
    if (!user) {
      releasePaymentLock();
      openPiConnectModal();
      if (typeof options.onError === 'function') {
        options.onError(new Error('Usuário pioneiro não autenticado'));
      }
      return;
    }

    metadata.pioneer_username = user.username;
    if (window.HokageReferral && typeof window.HokageReferral.getPendingRef === 'function') {
      const pendingRef = window.HokageReferral.getPendingRef();
      if (pendingRef) metadata.ref_code = pendingRef;
    }

    const paymentData = {
      amount: amount,
      memo: memo,
      metadata: metadata
    };

    const paymentCallbacks = {
      onReadyForServerApproval: async function (paymentId) {
        console.log('Pi Payment pronto para aprovação:', paymentId);
        showToast('Aprovando transação no servidor...', 'info');
        const approvalRes = await approvePaymentOnServer(paymentId);
        if (!approvalRes || approvalRes.error || approvalRes.ok === false) {
          releasePaymentLock();
          console.error('Erro na aprovação do servidor:', approvalRes);
          const msg = (approvalRes && (approvalRes.error_message || approvalRes.error)) || 'Falha de comunicação com o servidor na aprovação';
          showToast('Aviso do servidor: ' + msg, 'error');
          if (typeof options.onError === 'function') {
            options.onError(new Error('Aprovação recusada pelo servidor: ' + msg), { identifier: paymentId });
          }
        } else {
          const netLabel = isSandboxMode() ? 'Testnet' : 'Mainnet';
          showToast(`✓ Transação autorizada pelo servidor! Assinando na Pi Wallet (${netLabel})...`, 'info');
        }
      },

      onReadyForServerCompletion: async function (paymentId, txid) {
        releasePaymentLock();
        console.log('Pi Payment aprovado na blockchain com TXID:', txid);
        showToast(`✓ Pagamento confirmado na ${isSandboxMode() ? 'Pi Testnet' : 'Pi Mainnet'}!`, 'success');
        const result = await completePaymentOnServer(paymentId, txid, options.adPayload || null);

        if (result && result.security_rejected) {
          const secMsg = result.error || 'Montante pago inferior ao plano selecionado.';
          showToast('Erro de validação: ' + secMsg, 'error');
          if (typeof options.onError === 'function') {
            options.onError(new Error(secMsg), { identifier: paymentId });
          }
          return;
        }

        try { localStorage.removeItem('hokage_pending_ad_payload'); } catch (_) {}

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
        releasePaymentLock();
        console.log('Pagamento cancelado pelo pioneiro:', paymentId);
        if (paymentId) {
          cancelPaymentOnServer(paymentId);
        }
        showToast('Pagamento cancelado na Pi Wallet.', 'info');
        if (typeof options.onCancel === 'function') {
          options.onCancel(paymentId);
        }
      },

      onError: function (error, payment) {
        releasePaymentLock();
        console.error('Erro na transação Pi:', error, payment);
        const errText = error ? (error.message || (typeof error === 'string' ? error : JSON.stringify(error))) : 'Erro na transação';
        if (errText && (errText.includes('payments') || errText.includes('scope'))) {
          showScopeNoticeModal(options);
          if (typeof options.onError === 'function') {
            options.onError(error, payment);
          }
          return;
        }

        // Se o erro for de pagamento expirado, cancelado ou em andamento, reseta a sessão do SDK
        if (/expired|progress|cancelled|canceled/i.test(errText)) {
          console.warn('Pi Payment pendente/expirado/cancelado detectado:', error, payment);
          isSdkSessionAuthenticated = false;
          if (payment && payment.identifier) {
            cancelPaymentOnServer(payment.identifier);
          }
          if (window.Pi && window.Pi.authenticate) {
            try {
              window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(function () { });
            } catch (_) { }
          }
        }

        showToast('Erro no pagamento via Pi: ' + errText, 'error');
        if (typeof options.onError === 'function') {
          options.onError(error, payment);
        }
      }
    };

    try {
      if (options.adPayload && typeof options.adPayload === 'object') {
        try {
          localStorage.setItem('hokage_pending_ad_payload', JSON.stringify(options.adPayload));
        } catch (_) {}
      }
      // Fecha outros modais informativos, mas NUNCA fecha o modal de criação de anúncio
      document.querySelectorAll('.portal-modal-overlay.active, .pi-modal-overlay.active').forEach(function (m) {
        if (m.id !== 'ad-create-modal') {
          m.classList.remove('active');
        }
      });
      window.Pi.createPayment(paymentData, paymentCallbacks);
    } catch (err) {
      releasePaymentLock();
      console.error('Erro ao chamar window.Pi.createPayment:', err);
      const errMsg = err && (err.message || (typeof err === 'string' ? err : 'Erro no Pi SDK'));

      // Se for erro de escopo 'payments', abre modal explicativo com opção de alternar para Sandbox
      if (errMsg && (errMsg.includes('payments') || errMsg.includes('scope'))) {
        showScopeNoticeModal(options);
        if (typeof options.onError === 'function') {
          options.onError(err);
        }
        return;
      }

      if (/expired|progress|cancelled|canceled/i.test(errMsg)) {
        console.warn('Pi createPayment lançou pagamento expirado/cancelado:', errMsg);
        isSdkSessionAuthenticated = false;
        if (window.Pi && window.Pi.authenticate) {
          try {
            window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound).catch(function () { });
          } catch (_) { }
        }
      }

      showToast('Aviso Pi Wallet: ' + errMsg, 'warning');
      if (typeof options.onError === 'function') {
        options.onError(err);
      } else {
        showManualP2PModal(options);
      }
    }
  }

  // 10. Modal Explicativo de Escopo e Sandbox do Pi Developer Portal
  function showScopeNoticeModal(data) {
    data = data || {};
    let modal = document.getElementById('pi-scope-notice-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'portal-modal-overlay';
      modal.id = 'pi-scope-notice-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="portal-modal" style="max-width:460px">
        <button type="button" class="portal-modal-close" id="scope-notice-close-btn">✕</button>
        <div class="section-tag section-tag--amber">Configuração do Pi Developer Portal</div>
        <h3 style="font-size:1.35rem;margin-bottom:12px;color:#fff">Liberação de Pagamentos Pi</h3>
        
        <div style="background:rgba(245, 158, 11, 0.12);border:1px solid rgba(245, 158, 11, 0.35);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;font-size:0.86rem;color:var(--text-secondary);line-height:1.5">
          ℹ️ <strong>Por que este aviso apareceu?</strong><br>
          Seu aplicativo no <strong>develop.pi</strong> está em modo <em>Sandbox (desenvolvimento)</em> e aguarda aprovação da Mainnet. Na fase Sandbox, a Pi Network só concede o escopo de pagamentos no <strong>ambiente de teste (Testnet Pi)</strong>.
        </div>

        <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;font-size:0.84rem">
          <div style="color:#fff;font-weight:700;margin-bottom:6px">Como prosseguir:</div>
          <p style="color:var(--text-secondary);margin:0 0 8px;line-height:1.4">
            🧪 <strong>Para testar pagamentos agora:</strong> Toque no botão abaixo para testar no ambiente Sandbox usando Testnet Pi.
          </p>
          <p style="color:var(--text-secondary);margin:0;line-height:1.4">
            🚀 <strong>Para pagamentos reais em Mainnet:</strong> Complete a checklist do <strong>develop.pi</strong> e clique em <em>Apply for Mainnet Listing</em>.
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <button type="button" class="portal-btn portal-btn--amber portal-btn--full" id="scope-btn-test-sandbox" style="padding:14px;font-weight:700">
            🧪 Testar Pagamento em Modo Sandbox
          </button>
          <button type="button" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--full" id="scope-btn-open-diag">
            ⚙️ Abrir Diagnóstico da Conta
          </button>
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('#scope-notice-close-btn');
    if (closeBtn) closeBtn.onclick = function () { modal.classList.remove('active'); };

    const sandboxBtn = modal.querySelector('#scope-btn-test-sandbox');
    if (sandboxBtn) {
      sandboxBtn.onclick = async function () {
        modal.classList.remove('active');
        try {
          localStorage.setItem('hokage_pi_sandbox', 'true');
        } catch (_) { }
        showToast('Ativando Modo Sandbox (Testnet Pi)...', 'info');
        initPiSdk(true);
        isSdkSessionAuthenticated = false;
        try {
          const logged = await triggerAuthFlow(true);
          if (logged) {
            authenticatedUser = logged;
            isSdkSessionAuthenticated = true;
            showToast('✓ Sandbox conectado! Repetindo pagamento...', 'success');
            setTimeout(function () {
              requestPiPayment(data);
            }, 500);
          }
        } catch (err) {
          showToast('Erro ao inicializar Sandbox: ' + err, 'error');
        }
      };
    }

    const diagBtn = modal.querySelector('#scope-btn-open-diag');
    if (diagBtn) {
      diagBtn.onclick = function () {
        modal.classList.remove('active');
        openPiConnectModal();
      };
    }

    modal.classList.add('active');
  }

  // 10. Modal de Orientação e Checkout Pi SDK
  function showManualP2PModal(data) {
    data = data || {};
    let modal = document.getElementById('pi-p2p-checkout-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'portal-modal-overlay';
      modal.id = 'pi-p2p-checkout-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    const inPi = isPiBrowser() || Boolean(window.Pi);

    modal.innerHTML = `
      <div class="portal-modal">
        <button type="button" class="portal-modal-close" id="p2p-modal-close-btn">✕</button>
        <div class="section-tag section-tag--purple" style="background:rgba(139,92,246,0.15);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3)">🧪 Pagamento Oficial Pi Testnet</div>
        <h3 style="font-size:1.35rem;margin-bottom:12px;color:#fff">${escapeHtml(data.memo || 'Pagamento')}</h3>
        
        ${inPi ? `
          <div style="background:rgba(16, 185, 129, 0.1);border:1px solid rgba(16, 185, 129, 0.3);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;font-size:0.86rem;color:#a7f3d0;line-height:1.5">
            🧪 <strong>Ambiente Oficial Pi Testnet:</strong><br>
            O app está em auditoria pela Pi Core Team. Toque no botão abaixo para autorizar na sua Pi Wallet usando seus <strong>Test-Pi gratuitos</strong> (suas moedas mineradas reais estão 100% preservadas!).
          </div>
        ` : `
          <div style="background:rgba(245, 158, 11, 0.1);border:1px solid rgba(245, 158, 11, 0.3);border-radius:var(--radius-sm);padding:14px;margin-bottom:18px;font-size:0.86rem;color:var(--text-secondary);line-height:1.5">
            💡 <strong>Navegador Externo Detectado:</strong><br>
            Para sua segurança e autenticação biométrica via Pi Platform SDK, os pagamentos são processados com 1 clique dentro do aplicativo oficial <strong>Pi Browser</strong>.
          </div>
        `}

        <div style="background:rgba(0,0,0,0.5);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:16px;margin-bottom:18px;text-align:center">
          <div style="font-size:0.8rem;color:var(--text-muted);text-transform:uppercase">Valor em Pi Testnet:</div>
          <div style="font-size:2rem;font-weight:800;color:var(--amber-light);font-family:var(--font-mono);margin:4px 0">
            ${data.amount || '0.314'} Test-π
          </div>
          <span style="font-size:0.75rem;color:#38bdf8;font-weight:700">✓ Testnet Sandbox · Pi SDK v2.0</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          ${inPi ? `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--full" id="p2p-btn-auth-pay" style="padding:14px;font-weight:700">
              ⚡ Pagar com Test-Pi na Pi Wallet
            </button>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--full" id="p2p-btn-diag">
              ℹ️ Como funciona o Testnet?
            </button>
          ` : `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--full" id="p2p-btn-deep-link" style="padding:14px;font-weight:700">
              🚀 Abrir no Pi Browser
            </button>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--full" id="p2p-btn-copy-link">
              📋 Copiar Link do App
            </button>
          `}
        </div>
      </div>
    `;

    const closeBtn = modal.querySelector('#p2p-modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = function () { modal.classList.remove('active'); };
    }

    const authPayBtn = modal.querySelector('#p2p-btn-auth-pay');
    if (authPayBtn) {
      authPayBtn.onclick = function () {
        modal.classList.remove('active');
        showToast('Iniciando conexão com a Pi Wallet...', 'info');
        requestPiPayment(data);
      };
    }

    const diagBtn = modal.querySelector('#p2p-btn-diag');
    if (diagBtn) {
      diagBtn.onclick = function () {
        modal.classList.remove('active');
        openTestnetInfoModal();
      };
    }

    const deepLinkBtn = modal.querySelector('#p2p-btn-deep-link');
    if (deepLinkBtn) {
      deepLinkBtn.onclick = function () {
        openExternalDeepLink();
      };
    }

    const copyLinkBtn = modal.querySelector('#p2p-btn-copy-link');
    if (copyLinkBtn) {
      copyLinkBtn.onclick = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.href);
          copyLinkBtn.textContent = '✓ Link Copiado!';
          setTimeout(function () { copyLinkBtn.textContent = '📋 Copiar Link do App'; }, 2500);
        }
      };
    }

    modal.classList.add('active');
  }

  function openExternalDeepLink() {
    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl);
      showToast('Link copiado! Redirecionando para o Pi Browser...', 'info');
    }
    // Deep link padrão para o Pi Browser
    window.location.href = 'pi://' + cleanUrl;
    setTimeout(function () {
      showToast('Se o Pi Browser não abrir automaticamente, cole o link na barra dele.', 'info');
    }, 1800);
  }

  // 11. Modal Explicativo da Pi Testnet (Para Pioneiros)
  function openTestnetInfoModal() {
    let modal = document.getElementById('pi-testnet-info-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'portal-modal-overlay';
      modal.id = 'pi-testnet-info-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="portal-modal" style="max-width:520px;border-color:rgba(139,92,246,0.5);box-shadow:0 20px 60px rgba(0,0,0,0.85)">
        <button type="button" class="portal-modal-close" onclick="document.getElementById('pi-testnet-info-modal').classList.remove('active')">✕</button>
        <div class="section-tag section-tag--purple" style="background:rgba(139,92,246,0.15);color:#c4b5fd;border:1px solid rgba(139,92,246,0.3);padding:4px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;display:inline-block;margin-bottom:8px">🧪 Ecossistema Oficial · Pi Testnet</div>
        <h3 style="font-size:1.35rem;margin:0 0 12px;color:#fff;display:flex;align-items:center;gap:8px">
          <span>Como funciona a Pi Testnet?</span>
        </h3>
        
        <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;font-size:0.86rem;color:#e0e7ff;line-height:1.5">
          🚀 <strong>Auditoria Mainnet em Andamento:</strong><br>
          O aplicativo HOKAGE22B está passando pelo processo de auditoria e listagem oficial pela Pi Core Team no <strong>develop.pi</strong>. Durante esta etapa regulatória, os pagamentos operam com segurança total na <strong>Pi Testnet</strong>.
        </div>

        <div style="background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;font-size:0.84rem">
          <div style="color:var(--amber-light);font-weight:700;margin-bottom:6px">💰 Moedas Test-Pi 100% Gratuitas:</div>
          <p style="color:var(--text-secondary);margin:0 0 8px;line-height:1.45">
            Você <strong>NÃO gasta suas moedas reais mineradas</strong> na Mainnet! A Pi Network disponibiliza 100 Test-Pi gratuitos para cada pioneiro testar aplicativos no Pi Browser.
          </p>
          <div style="color:#34d399;font-weight:700;margin-bottom:6px">🔑 Como alternar para Testnet na Pi Wallet:</div>
          <ol style="color:var(--text-secondary);margin:0;padding-left:18px;line-height:1.5">
            <li>Abra o <strong>wallet.pi</strong> no Pi Browser;</li>
            <li>No topo da tela, toque em <strong>"Pi Mainnet"</strong> e alterne para <strong>"Pi Testnet"</strong>;</li>
            <li>Pronto! Seu saldo de Test-Pi estará disponível para autorizar transações com sua biometria ou passphrase.</li>
          </ol>
        </div>

        <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:var(--radius-sm);padding:12px;margin-bottom:16px;font-size:0.82rem;color:#a7f3d0;line-height:1.45">
          ✓ <strong>Publicação Instantânea:</strong> Ao pagar na Testnet, seu anúncio entra imediatamente no ar na Vila · Central P2P, sem necessidade de aprovação por administrador!
        </div>

        <button type="button" class="portal-btn portal-btn--amber portal-btn--full" onclick="document.getElementById('pi-testnet-info-modal').classList.remove('active')" style="padding:12px;font-weight:700">
          Entendi, vamos testar! 🚀
        </button>
      </div>
    `;

    modal.classList.add('active');
  }

  function escapeHtml(str) {
    if (window.HokageUtils && typeof window.HokageUtils.escapeHtml === 'function') {
      return window.HokageUtils.escapeHtml(str);
    }
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // 12. Smart Banner Deep Link para Pi Browser (Modo Web2 -> Web3 Bridge)
  function initSmartPiBanner() {
    if (isPiBrowser()) return;
    try {
      if (sessionStorage.getItem('hokage_pi_banner_dismissed')) return;
    } catch (_) { }

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    if (!isMobile) return;

    if (document.getElementById('hokage-smart-pi-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'hokage-smart-pi-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;background:linear-gradient(90deg, #180d2b, #09090b);border-top:1px solid rgba(139,92,246,0.45);z-index:250;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;box-shadow:0 -4px 25px rgba(0,0,0,0.85);font-family:system-ui,-apple-system,sans-serif;';

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
        <a id="hk-smart-pi-deeplink" href="pi://hokage22b.com/" style="background:linear-gradient(135deg, #8b5cf6, #7c3aed);color:#fff;font-size:0.78rem;font-weight:700;padding:7px 14px;border-radius:20px;text-decoration:none;border:1px solid rgba(255,255,255,0.25);white-space:nowrap;display:inline-block">
          🚀 Abrir Pi
        </a>
        <button type="button" onclick="document.getElementById('hokage-smart-pi-banner').remove();try{sessionStorage.setItem('hokage_pi_banner_dismissed','1')}catch(_){}" style="background:none;border:none;color:rgba(255,255,255,0.6);font-size:1.1rem;padding:4px 6px;cursor:pointer" aria-label="Fechar banner">
          ✕
        </button>
      </div>
    `;
    const linkEl = banner.querySelector('#hk-smart-pi-deeplink');
    if (linkEl) linkEl.setAttribute('href', piDeepLink);

    document.body.appendChild(banner);
  }

  async function clearIncompletePayments() {
    if (!window.Pi || !window.Pi.authenticate) return false;
    try {
      showToast('Verificando pagamentos expirados na Pi Wallet...', 'info');
      await window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound);
      showToast('Carteira verificada com sucesso.', 'success');
      return true;
    } catch (e) {
      console.warn('Erro ao limpar pagamentos incompletos:', e);
      return false;
    }
  }

  async function checkMyLibrary() {
    let token = '';
    try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    if (!token) return [];
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'my_library', accessToken: token })
      });
      const json = await res.json();
      const data = json && json.data ? json.data : json;
      if (data && Array.isArray(data.owned_products)) {
        return data.owned_products;
      }
    } catch (err) {
      console.warn('Erro ao consultar biblioteca Pi:', err);
    }
    return [];
  }

  async function downloadOwnedEbook(productId, format) {
    let token = '';
    try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    if (!token && isPiBrowser()) {
      await triggerAuthFlow();
      try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    }
    if (!token) {
      showToast('Conecte sua carteira no Pi Browser para validar sua compra.', 'error');
      openPiConnectModal();
      return;
    }

    showToast('Gerando link assinado exclusivo de download...', 'info');
    try {
      const res = await fetch(SUPABASE_FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download_ebook',
          accessToken: token,
          productId: productId,
          format: format || 'pdf'
        })
      });
      const json = await res.json();
      const data = json && json.data ? json.data : json;
      if (res.ok && data && data.download_url) {
        showToast('✓ Compra verificada! Iniciando download...', 'success');
        const box = document.getElementById('pi-owned-library-' + productId);
        if (box) {
          let fallback = box.querySelector('.hk-dl-direct-link');
          if (!fallback) {
            fallback = document.createElement('a');
            fallback.className = 'hk-dl-direct-link';
            fallback.target = '_blank';
            fallback.rel = 'noopener noreferrer';
            fallback.style.cssText = 'display:inline-block;margin-top:8px;font-size:0.8rem;color:#6ee7b7;text-decoration:underline;font-weight:700';
            box.appendChild(fallback);
          }
          fallback.href = data.download_url;
          fallback.textContent = '⬇️ Se o download não abriu automaticamente, toque aqui (' + (format || 'pdf').toUpperCase() + ')';
        }
        const win = window.open(data.download_url, '_blank', 'noopener,noreferrer');
        if (!win) {
          window.location.assign(data.download_url);
        }
      } else {
        const msg = (json && json.error) || 'Arquivo ainda não disponível ou compra não localizada.';
        showToast(msg, 'error');
      }
    } catch (err) {
      showToast('Erro ao gerar download seguro.', 'error');
    }
  }

  async function syncOwnedEbooksUi() {
    const owned = await checkMyLibrary();
    if (!owned || !owned.length) return [];
    owned.forEach(function (prodId) {
      const box = document.getElementById('pi-owned-library-' + prodId);
      if (box) {
        box.style.display = 'block';
      }
    });
    return owned;
  }

  async function restoreOwnedEbooks() {
    let token = '';
    try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    if (!token) {
      if (isPiBrowser()) {
        showToast('Autenticando sua conta no Pi Browser...', 'info');
        await triggerAuthFlow();
        try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
      } else {
        showToast('Abra no aplicativo oficial Pi Browser para restaurar seus E-books adquiridos em Pi.', 'error');
        openPiConnectModal();
        return;
      }
    }
    if (!token) {
      showToast('Conecte sua carteira no Pi Browser para verificar suas compras.', 'error');
      return;
    }
    showToast('⏳ Verificando compras na sua conta Pi...', 'info');
    const owned = await syncOwnedEbooksUi();
    if (owned && owned.length > 0) {
      showToast('✓ Compra(s) encontrada(s)! Seus botões de download vitalício foram liberados abaixo.', 'success');
      const firstBox = document.getElementById('pi-owned-library-' + owned[0]);
      if (firstBox) {
        firstBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      showToast('Nenhuma compra de E-book em Pi localizada para esta conta até o momento.', 'info');
    }
  }

  // 13. Expõe na API global
  window.HokagePi = {
    initPiSdk: initPiSdk,
    isPiBrowser: isPiBrowser,
    loginWithPi: loginWithPi,
    logout: logout,
    authenticatePioneer: loginWithPi,
    openPiConnectModal: openPiConnectModal,
    openTestnetInfoModal: openTestnetInfoModal,
    triggerAuthFlow: triggerAuthFlow,
    requestPiPayment: requestPiPayment,
    clearIncompletePayments: clearIncompletePayments,
    showManualP2PModal: showManualP2PModal,
    openExternalDeepLink: openExternalDeepLink,
    showToast: showToast,
    checkMyLibrary: checkMyLibrary,
    downloadOwnedEbook: downloadOwnedEbook,
    syncOwnedEbooksUi: syncOwnedEbooksUi,
    restoreOwnedEbooks: restoreOwnedEbooks,
    isPaymentInFlight: function () { return isPaymentRequestInFlight; },
    getUser: function () { return authenticatedUser; },
    updateAuthUi: updateAuthUi,
    getAccessToken: function () {
      return getAuthTokenForServer();
    },
    ensureAccessToken: async function () {
      const existing = getAuthTokenForServer();
      if (existing) return existing;
      if (isPiBrowser()) {
        await triggerAuthFlow();
        return getAuthTokenForServer();
      }
      return '';
    },
    officialWallet: OFFICIAL_WALLET,
    initSmartPiBanner: initSmartPiBanner
  };

  // Inicializa bindings e recupera cache
  function autoInit() {
    initPiSdk();
    initSmartPiBanner();
    try {
      const cached = localStorage.getItem('hokage_pi_user');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.username || parsed.authType === 'web2')) {
          authenticatedUser = parsed;
          updateAuthUi(authenticatedUser);

          // Se estiver no Pi Browser, pré-autoriza a sessão em background na Testnet para carregar o escopo 'payments'
          if (isPiBrowser() && window.Pi) {
            setTimeout(function () {
              if (!isSdkSessionAuthenticated && !isAuthenticating) {
                triggerAuthFlow().then(function () {
                  syncOwnedEbooksUi();
                }).catch(function () { });
              } else {
                syncOwnedEbooksUi();
              }
            }, 450);
          } else {
            syncOwnedEbooksUi();
          }

          if (getPendingLinkEmail() && authenticatedUser && authenticatedUser.username && !authenticatedUser.email && authenticatedUser.authType !== 'hybrid') {
            setTimeout(function () {
              const existingDiagModal = document.getElementById('modal-pi-connect-diag');
              if (getPendingLinkEmail() && (!existingDiagModal || !existingDiagModal.classList.contains('active'))) {
                openPiConnectModal({ noAutoAuth: true });
              }
            }, 700);
          }
        }
      }
    } catch (_) { }
    updateAuthUi(authenticatedUser);

    document.querySelectorAll('.pi-auth-header-btn').forEach(function (btn) {
      if (btn.getAttribute('onclick')) return;
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
