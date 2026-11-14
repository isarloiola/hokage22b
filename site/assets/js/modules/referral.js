/**
 * ============================================================
 * HOKAGE22B.COM — Module: Referral & Ambassador Program
 * ============================================================
 * Captura convites (?ref=usuario) com expiração de 7 dias e
 * consulta estatísticas/créditos seguros via Supabase RPC.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'hokage_pending_ref_v1';
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const PAYMENT_EDGE_URL = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-payment';

  function normalizeHandle(raw) {
    const clean = String(raw || '').trim().replace(/^@+/, '').toLowerCase();
    return /^[a-z0-9_]{2,32}$/.test(clean) ? clean : '';
  }

  function escapeHtml(str) {
    if (window.HokageUtils && typeof window.HokageUtils.escapeHtml === 'function') {
      return window.HokageUtils.escapeHtml(str);
    }
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isPiBrowserEnv() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;
    if (typeof window !== 'undefined') {
      if (window.PiNetwork || window.flutter_inappwebview) return true;
      if (window.location && (window.location.protocol === 'pi:' || (window.location.hostname && window.location.hostname.endsWith('.pi')))) return true;
    }
    return false;
  }

  let capturedUrlRef = '';

  function captureFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = normalizeHandle(params.get('ref'));
      if (!ref) return '';
      capturedUrlRef = ref;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ref: ref, ts: Date.now() }));
      return ref;
    } catch (_) {
      return '';
    }
  }

  function getPendingRef() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ref || (Date.now() - Number(parsed.ts || 0)) > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return normalizeHandle(parsed.ref) || null;
    } catch (_) {
      return null;
    }
  }

  function clearPendingRef() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function buildInviteUrl(username) {
    const clean = normalizeHandle(username);
    if (!clean) return 'https://hokage22b.com/pioneiro';
    return 'https://hokage22b.com/pioneiro?ref=' + encodeURIComponent(clean);
  }

  async function fetchStats(username) {
    const clean = normalizeHandle(username);
    if (!clean) return null;
    if (window.IsarDB && typeof window.IsarDB.getReferralStats === 'function') {
      return await window.IsarDB.getReferralStats('@' + clean);
    }
    return null;
  }

  async function fetchAffiliateSummary(username, accessToken) {
    const clean = normalizeHandle(username);
    if (!clean) return null;
    try {
      let token = accessToken || '';
      if (!token && window.HokagePi && typeof window.HokagePi.getAccessToken === 'function') {
        token = window.HokagePi.getAccessToken() || '';
      }
      if (!token) {
        try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
      }
      const res = await fetch(PAYMENT_EDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'affiliate_summary',
          username: '@' + clean,
          accessToken: token || undefined
        })
      });
      const json = await res.json().catch(function () { return null; });
      if (res.ok && json && json.ok) {
        return json.data || json;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async function requestPayout(accessToken, walletAddress) {
    let token = accessToken || '';
    if (!token && window.HokagePi && typeof window.HokagePi.getAccessToken === 'function') {
      token = window.HokagePi.getAccessToken() || '';
    }
    if (!token) {
      try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    }
    const res = await fetch(PAYMENT_EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'request_affiliate_payout',
        accessToken: token,
        walletAddress: walletAddress || undefined
      })
    });
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.ok) {
      throw new Error((json && json.error) || 'Não foi possível solicitar o saque.');
    }
    return json.data || json;
  }

  function injectWelcomeStyles() {
    if (document.getElementById('hokage-ref-welcome-styles')) return;
    const style = document.createElement('style');
    style.id = 'hokage-ref-welcome-styles';
    style.textContent = `
      .hk-ref-overlay {
        position: fixed;
        inset: 0;
        z-index: 10050;
        background: rgba(5, 5, 10, 0.85);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
        overflow-y: auto;
        animation: hkRefFadeIn 0.25s ease-out;
      }
      @keyframes hkRefFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1); }
      }
      .hk-ref-card {
        position: relative;
        width: 100%;
        max-width: 500px;
        max-height: 92vh;
        overflow-y: auto;
        background: linear-gradient(165deg, #131122 0%, #09090f 100%);
        border: 1.5px solid rgba(245, 158, 11, 0.45);
        border-radius: 22px;
        padding: 24px 20px 20px;
        color: #f4f4f5;
        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.75), 0 0 40px rgba(139, 92, 246, 0.22);
        text-align: left;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
      }
      .hk-ref-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(255, 255, 255, 0.06);
        color: #e4e4e7;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .hk-ref-close:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .hk-ref-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.18));
        border: 1px solid rgba(245, 158, 11, 0.5);
        color: #fbbf24;
        font-size: 0.75rem;
        font-weight: 800;
        padding: 5px 12px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 10px;
      }
      .hk-ref-inviter-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(139, 92, 246, 0.35);
        border-radius: 12px;
        padding: 10px 14px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .hk-ref-benefit {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 13px;
        padding: 11px 13px;
        margin-bottom: 9px;
      }
      .hk-ref-benefit-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
      }
      .hk-ref-btn-primary {
        width: 100%;
        padding: 13px 16px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 50%, #f59e0b 100%);
        color: #fff;
        font-weight: 800;
        font-size: 0.94rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-decoration: none;
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.35);
        box-sizing: border-box;
        text-align: center;
      }
      .hk-ref-btn-outline {
        width: 100%;
        padding: 11px 14px;
        border-radius: 11px;
        border: 1px solid rgba(16, 185, 129, 0.45);
        background: rgba(16, 185, 129, 0.1);
        color: #6ee7b7;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        text-decoration: none;
        box-sizing: border-box;
        text-align: center;
      }
      .hk-ref-btn-ghost {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: #d4d4d8;
        font-weight: 700;
        font-size: 0.8rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        text-decoration: none;
        box-sizing: border-box;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  function closeWelcomeModal() {
    const existing = document.getElementById('hokage-ref-welcome-modal');
    if (existing) {
      existing.remove();
    }
  }

  function copyWelcomeInviteLink(refHandle) {
    const clean = normalizeHandle(refHandle) || getPendingRef() || 'hokage22b';
    const url = buildInviteUrl(clean);
    const btn = document.getElementById('hk-ref-copy-btn');
    function showCopied() {
      if (btn) {
        btn.innerHTML = '✓ Link Copiado! Abra o Pi Browser e cole na barra';
        btn.style.borderColor = '#10b981';
        btn.style.background = 'rgba(16,185,129,0.22)';
        btn.style.color = '#a7f3d0';
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(showCopied).catch(function () {
        window.prompt('Copie o link abaixo e cole no aplicativo Pi Browser:', url);
      });
    } else {
      window.prompt('Copie o link abaixo e cole no aplicativo Pi Browser:', url);
    }
  }

  function startFromWelcomeModal(refHandle) {
    const clean = normalizeHandle(refHandle) || getPendingRef() || '';
    closeWelcomeModal();
    if (typeof window.connectPiBrowserAndStart === 'function') {
      window.connectPiBrowserAndStart();
      return;
    }
    const target = clean ? ('pioneiro?ref=' + encodeURIComponent(clean) + '&autostart=1') : 'pioneiro?autostart=1';
    window.location.href = target;
  }

  function startSimFromWelcomeModal(refHandle) {
    const clean = normalizeHandle(refHandle) || getPendingRef() || '';
    closeWelcomeModal();
    if (typeof window.startSimulatorMode === 'function') {
      window.startSimulatorMode();
      return;
    }
    const target = clean ? ('pioneiro?ref=' + encodeURIComponent(clean) + '&simulador=1') : 'pioneiro?simulador=1';
    window.location.href = target;
  }

  function openWelcomeModal(customRef) {
    const ref = normalizeHandle(customRef) || capturedUrlRef || getPendingRef();
    if (!ref) return;

    injectWelcomeStyles();
    closeWelcomeModal();

    const safeRef = escapeHtml(ref);
    const inviteFullUrl = buildInviteUrl(ref);
    const piDeepLink = 'pi://hokage22b.com/pioneiro?ref=' + encodeURIComponent(ref);
    const vitrineRefUrl = 'pioneiro?u=' + encodeURIComponent(ref) + '&ref=' + encodeURIComponent(ref);
    const inPiBrowser = isPiBrowserEnv();

    let ctaHtml = '';
    if (inPiBrowser) {
      ctaHtml = `
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.35);border-radius:12px;padding:9px 12px;margin:12px 0 10px;font-size:0.78rem;color:#6ee7b7;display:flex;align-items:center;gap:8px;font-weight:700">
          <span>🟢</span>
          <span>Pi Browser detectado! Seu convite de @${safeRef} será vinculado automaticamente.</span>
        </div>
        <button type="button" class="hk-ref-btn-primary" onclick="window.HokageReferral.startFromWelcomeModal('${safeRef}')">
          <span>⚡</span> Conectar Pi Browser &amp; Criar Minha Vitrine Grátis
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
          <a href="${vitrineRefUrl}" class="hk-ref-btn-ghost" onclick="window.HokageReferral.closeWelcomeModal()">
            <span>👀</span> Ver Vitrine de @${safeRef}
          </a>
          <button type="button" class="hk-ref-btn-ghost" onclick="window.HokageReferral.startSimFromWelcomeModal('${safeRef}')">
            <span>🧪</span> Testar no Simulador
          </button>
        </div>
      `;
    } else {
      ctaHtml = `
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:12px;padding:10px 12px;margin:12px 0 10px;font-size:0.77rem;color:#fde68a;line-height:1.45">
          <strong style="color:#fbbf24;display:block;margin-bottom:2px">📱 Você está em um navegador comum</strong>
          Para criar sua Vitrine oficial com 1 clique e ativar seu convite de <strong>@${safeRef}</strong>, abra direto no aplicativo <strong>Pi Browser</strong> ou copie o link abaixo:
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <a href="${piDeepLink}" class="hk-ref-btn-primary">
            <span>🚀</span> Abrir Direto no Pi Browser (Com Convite)
          </a>
          <button type="button" id="hk-ref-copy-btn" class="hk-ref-btn-outline" onclick="window.HokageReferral.copyWelcomeInviteLink('${safeRef}')">
            <span>📋</span> Copiar Link com Convite para o Pi Browser
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px">
            <button type="button" class="hk-ref-btn-ghost" onclick="window.HokageReferral.startSimFromWelcomeModal('${safeRef}')">
              <span>🧪</span> Testar no Simulador
            </button>
            <a href="${vitrineRefUrl}" class="hk-ref-btn-ghost" onclick="window.HokageReferral.closeWelcomeModal()">
              <span>👀</span> Vitrine de @${safeRef}
            </a>
          </div>
        </div>
        <div style="margin-top:8px;font-size:0.7rem;color:#a1a1aa;text-align:center">
          Link do seu convite: <code style="color:#c4b5fd;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;user-select:all">${escapeHtml(inviteFullUrl)}</code>
        </div>
      `;
    }

    const overlay = document.createElement('div');
    overlay.id = 'hokage-ref-welcome-modal';
    overlay.className = 'hk-ref-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeWelcomeModal();
    });

    overlay.innerHTML = `
      <div class="hk-ref-card">
        <button type="button" class="hk-ref-close" onclick="window.HokageReferral.closeWelcomeModal()" aria-label="Fechar">✕</button>

        <div class="hk-ref-pill">
          <span>🎁</span> Presente Exclusivo de Convite Ativo
        </div>

        <h2 style="font-size:clamp(1.18rem, 4vw, 1.42rem);font-weight:800;color:#fff;margin:0 0 6px;line-height:1.25">
          Ative sua Vitrine Grátis &amp; Ganhe 1 Anúncio Bronze + Comissões em Pi!
        </h2>
        <p style="font-size:0.83rem;color:#a1a1aa;margin:0 0 12px;line-height:1.45">
          Por entrar através de um <strong>convite oficial</strong> no ecossistema <strong>HOKAGE22B</strong>, você desbloqueia vantagens exclusivas que quem entra sem convite não recebe:
        </p>

        <div class="hk-ref-inviter-box">
          <div style="display:flex;align-items:center;gap:9px">
            <span style="font-size:1.3rem">🤝</span>
            <div>
              <div style="font-size:0.68rem;color:#c4b5fd;text-transform:uppercase;font-weight:700;letter-spacing:0.04em">Convidado(a) Oficialmente por</div>
              <div style="font-size:0.95rem;font-weight:800;color:#fff">@${safeRef}</div>
            </div>
          </div>
          <span style="font-size:0.7rem;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.55);color:#fde68a;padding:3px 9px;border-radius:999px;font-weight:800">
            🎁 +1 Anúncio Bronze Grátis (0.314 π)
          </span>
        </div>

        <!-- 3 Vantagens Reais (Give & Get) -->
        <div class="hk-ref-benefit" style="border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.07)">
          <div class="hk-ref-benefit-icon" style="background:rgba(245,158,11,0.22);border:1px solid rgba(245,158,11,0.5)">🎁</div>
          <div>
            <div style="font-size:0.86rem;font-weight:800;color:#fbbf24;margin-bottom:2px">1. Seu Presente Imediato: 1 Anúncio Bronze Grátis (0.314 π)</div>
            <div style="font-size:0.76rem;color:#e4e4e7;line-height:1.4">
              Ao conectar o <strong>Pi Browser</strong> e salvar sua <strong>Vitrine 100% Grátis</strong> (<code style="color:#c4b5fd">hokage22b.com/@voce</code>), você ganha na hora <strong>1 Crédito de Anúncio Bronze Grátis (0.314 π)</strong> para publicar seu negócio na Gazeta dos Pioneiros (Mural)!
            </div>
          </div>
        </div>

        <div class="hk-ref-benefit" style="border-color:rgba(16,185,129,0.35);background:rgba(16,185,129,0.06)">
          <div class="hk-ref-benefit-icon" style="background:rgba(16,185,129,0.2);border:1px solid rgba(16,185,129,0.45)">💰</div>
          <div>
            <div style="font-size:0.86rem;font-weight:800;color:#6ee7b7;margin-bottom:2px">2. Ganhe de 20% a 25% em Pi Real (Comissão P2P)</div>
            <div style="font-size:0.76rem;color:#d4d4d8;line-height:1.4">
              Você também recebe seu próprio link de convite e ganha <strong>20% em Pi</strong> (ou <strong>25% como Embaixador</strong>) sobre cada <strong>Anúncio no Mural</strong> e cada <strong>E-book</strong> adquirido pelos seus indicados!
            </div>
          </div>
        </div>

        <div class="hk-ref-benefit">
          <div class="hk-ref-benefit-icon" style="background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.4)">🏅</div>
          <div>
            <div style="font-size:0.86rem;font-weight:800;color:#fff;margin-bottom:2px">3. Ganha-Ganha: Mais Créditos + Selo Embaixador</div>
            <div style="font-size:0.76rem;color:#a1a1aa;line-height:1.4">
              Cada amigo que entrar pelo seu link também ganha <strong>1 Anúncio Bronze Grátis</strong>, enquanto você acumula novos créditos Bronze e conquista o <strong>Selo Oficial de Embaixador Web3</strong> com 5 indicados!
            </div>
          </div>
        </div>

        ${ctaHtml}
      </div>
    `;

    document.body.appendChild(overlay);
  }

  captureFromUrl();

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlRef = normalizeHandle(params.get('ref'));
        const isAutoStart = params.get('autostart') === '1' || params.get('simulador') === '1' || params.get('teste') === '1';
        if (urlRef && !isAutoStart) {
          setTimeout(function () {
            openWelcomeModal(urlRef);
          }, 180);
        }
      } catch (_) {}
    });
  }

  window.HokageReferral = {
    normalizeHandle: normalizeHandle,
    getPendingRef: getPendingRef,
    clearPendingRef: clearPendingRef,
    buildInviteUrl: buildInviteUrl,
    fetchStats: fetchStats,
    fetchAffiliateSummary: fetchAffiliateSummary,
    requestPayout: requestPayout,
    openWelcomeModal: openWelcomeModal,
    closeWelcomeModal: closeWelcomeModal,
    copyWelcomeInviteLink: copyWelcomeInviteLink,
    startFromWelcomeModal: startFromWelcomeModal,
    startSimFromWelcomeModal: startSimFromWelcomeModal,
    isPiBrowserEnv: isPiBrowserEnv
  };
})();
