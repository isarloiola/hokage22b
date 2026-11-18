/**
 * ============================================================
 * HOKAGE22B.COM — Embeddable Passport Widget (v1.0)
 * Uso em qualquer site:
 *   <div data-hokage-passport="hokage22b" data-theme="dark"></div>
 *   <script src="https://hokage22b.com/assets/js/hokage-embed.js" async></script>
 * ============================================================
 */
(function () {
  'use strict';

  var API_BASE = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/public-api/v1';

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function tierMeta(tier) {
    if (tier === 'hokage') {
      return { label: '🔥 Hokage · Construtor Líder', bg: 'rgba(249,115,22,0.16)', border: 'rgba(249,115,22,0.45)', color: '#fb923c' };
    }
    if (tier === 'construtor') {
      return { label: '⚡ Pioneiro Construtor', bg: 'rgba(139,92,246,0.16)', border: 'rgba(139,92,246,0.45)', color: '#c4b5fd' };
    }
    return { label: '🛡️ Pioneiro Verificado', bg: 'rgba(16,185,129,0.16)', border: 'rgba(16,185,129,0.45)', color: '#34d399' };
  }

  function renderWidget(host, passport, handle, theme) {
    var shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    var isLight = theme === 'light';
    var cleanHandle = esc(handle.replace(/^@+/, ''));
    var profileUrl = (passport && passport.profile_url) || ('https://hokage22b.com/pioneiro?u=' + encodeURIComponent(cleanHandle));
    var tier = tierMeta(passport && passport.journey_tier);
    var bio = passport && passport.bio ? esc(String(passport.bio).slice(0, 110)) : 'Passaporte Web3 Verificado no ecossistema HOKAGE22B.';
    var wallet = passport && passport.wallet_address ? String(passport.wallet_address) : '';
    var walletShort = wallet.length > 14 ? wallet.slice(0, 6) + '...' + wallet.slice(-4) : wallet;

    var bg = isLight ? '#ffffff' : '#09090b';
    var cardBorder = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(249,115,22,0.35)';
    var textMain = isLight ? '#09090b' : '#fafafa';
    var textSub = isLight ? '#52525b' : '#a1a1aa';
    var pillBg = isLight ? '#f4f4f5' : '#141419';

    shadow.innerHTML =
      '<style>' +
      ':host{display:block;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:380px}' +
      '.card{background:' + bg + ';border:1px solid ' + cardBorder + ';border-radius:16px;padding:16px;color:' + textMain + ';box-sizing:border-box;box-shadow:0 10px 28px rgba(0,0,0,0.22)}' +
      '.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}' +
      '.brand{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:0.05em;color:#f97316;text-transform:uppercase}' +
      '.badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:' + tier.bg + ';border:1px solid ' + tier.border + ';color:' + tier.color + '}' +
      '.handle{font-size:17px;font-weight:800;margin:0 0 4px;color:' + textMain + '}' +
      '.bio{font-size:12.5px;line-height:1.45;color:' + textSub + ';margin:0 0 12px}' +
      '.foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}' +
      '.wallet{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:' + pillBg + ';padding:5px 9px;border-radius:8px;color:' + textSub + ';border:1px solid ' + cardBorder + '}' +
      '.cta{display:inline-block;text-decoration:none;font-size:12px;font-weight:800;padding:7px 12px;border-radius:9px;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b}' +
      '</style>' +
      '<div class="card">' +
      '  <div class="top">' +
      '    <span class="brand">◆ HOKAGE22B</span>' +
      '    <span class="badge">' + esc(tier.label) + '</span>' +
      '  </div>' +
      '  <div class="handle">@' + cleanHandle + '</div>' +
      '  <p class="bio">' + bio + '</p>' +
      '  <div class="foot">' +
      (walletShort ? '<span class="wallet" title="Chave Pública Pi">Pi: ' + esc(walletShort) + '</span>' : '<span class="wallet">Pi KYC Verificado</span>') +
      '    <a class="cta" href="' + esc(profileUrl) + '" target="_blank" rel="noopener noreferrer">Abrir Passaporte ↗</a>' +
      '  </div>' +
      '</div>';
  }

  function mountAll() {
    var nodes = document.querySelectorAll('[data-hokage-passport]');
    nodes.forEach(function (el) {
      var handle = (el.getAttribute('data-hokage-passport') || '').trim().replace(/^@+/, '');
      if (!handle) return;
      var theme = (el.getAttribute('data-theme') || 'dark').toLowerCase();
      renderWidget(el, null, handle, theme);

      fetch(API_BASE + '/passaportes?u=' + encodeURIComponent(handle), {
        headers: { 'X-Hokage-Client': 'hokage-embed-widget' }
      })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json && json.ok && json.data && json.data.passport) {
            renderWidget(el, json.data.passport, handle, theme);
          }
        })
        .catch(function () { /* mantém fallback elegante */ });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
  window.HokageEmbed = { mountAll: mountAll };
})();
