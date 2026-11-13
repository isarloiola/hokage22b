/**
 * ============================================================
 * HOKAGE22B.COM — Module: Pi Live Price Ticker (pi-ticker.js)
 * ============================================================
 * Exibe a cotação em tempo real de 1 π na moeda local do
 * visitante (via CoinGecko Public API com cache de 5 minutos).
 */
(function () {
  'use strict';

  const CACHE_KEY = 'hokage_pi_ticker_cache_v1';
  const CURRENCY_PREF_KEY = 'hokage_pi_currency_pref';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const SUPPORTED_CURRENCIES = ['brl', 'usd', 'eur', 'gbp', 'ars', 'mxn', 'cad', 'aud', 'jpy'];

  /**
   * Detecta automaticamente a moeda provável do leitor via idioma e fuso horário.
   */
  function detectUserCurrency() {
    try {
      const saved = (localStorage.getItem(CURRENCY_PREF_KEY) || '').toLowerCase();
      if (SUPPORTED_CURRENCIES.includes(saved)) return saved;
    } catch (_) {}

    const lang = (navigator.language || navigator.userLanguage || 'en-US').toLowerCase();
    let tz = '';
    try {
      tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    } catch (_) {}

    if (lang.startsWith('pt-br') || tz.includes('sao_paulo') || tz.includes('fortaleza') || tz.includes('recife') || tz.includes('manaus')) {
      return 'brl';
    }
    if (lang.startsWith('en-gb') || tz.includes('london')) return 'gbp';
    if (lang.startsWith('es-ar') || tz.includes('buenos_aires')) return 'ars';
    if (lang.startsWith('es-mx') || tz.includes('mexico_city')) return 'mxn';
    if (lang.startsWith('en-ca') || lang.startsWith('fr-ca') || tz.includes('toronto') || tz.includes('vancouver')) return 'cad';
    if (lang.startsWith('en-au') || tz.includes('sydney') || tz.includes('melbourne')) return 'aud';
    if (lang.startsWith('ja') || tz.includes('tokyo')) return 'jpy';
    if (/^(pt-pt|es-es|fr|de|it|nl|fi|el|sk|sl|et|lv|lt)/.test(lang) || tz.startsWith('europe/')) {
      return 'eur';
    }
    return 'usd';
  }

  function formatFiat(amount, currencyCode) {
    const code = currencyCode.toUpperCase();
    try {
      return new Intl.NumberFormat(navigator.language || 'pt-BR', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: code === 'JPY' ? 0 : 2,
        maximumFractionDigits: code === 'JPY' ? 0 : 2
      }).format(amount);
    } catch (_) {
      return code + ' ' + Number(amount).toFixed(2);
    }
  }

  async function fetchPiRates() {
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.data && (Date.now() - cached.ts) < CACHE_TTL_MS) {
          return cached.data;
        }
      }
    } catch (_) {}

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, 4500) : null;

    try {
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=' +
        SUPPORTED_CURRENCIES.join(',') + '&include_24hr_change=true';
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const data = json && json['pi-network'];
      if (!data || typeof data.usd !== 'number') throw new Error('Payload inválido');

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
      } catch (_) {}
      return data;
    } catch (_) {
      try {
        const staleRaw = localStorage.getItem(CACHE_KEY);
        if (staleRaw) {
          const stale = JSON.parse(staleRaw);
          if (stale && stale.data) return stale.data;
        }
      } catch (__) {}
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function renderTicker(container, data, activeCurrency) {
    if (!container || !data) return;
    const price = data[activeCurrency];
    if (typeof price !== 'number') return;

    const changeKey = activeCurrency + '_24h_change';
    const change = typeof data[changeKey] === 'number' ? data[changeKey] : null;
    const isUp = change !== null && change >= 0;

    container.textContent = '';

    const badge = document.createElement('span');
    badge.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#fcd34d';
    badge.textContent = 'π 1 Pi ≈ ' + formatFiat(price, activeCurrency);
    container.appendChild(badge);

    if (change !== null) {
      const delta = document.createElement('span');
      delta.style.cssText = 'font-size:0.74rem;font-weight:700;padding:2px 7px;border-radius:999px;' +
        (isUp
          ? 'background:rgba(16,185,129,0.14);color:#34d399;border:1px solid rgba(16,185,129,0.28)'
          : 'background:rgba(239,68,68,0.14);color:#fca5a5;border:1px solid rgba(239,68,68,0.28)');
      delta.textContent = (isUp ? '+' : '') + change.toFixed(1) + '% (24h)';
      container.appendChild(delta);
    }

    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Moeda de cotação do Pi');
    select.style.cssText = 'background:rgba(255,255,255,0.06);color:#e4e4e7;border:1px solid rgba(255,255,255,0.14);border-radius:6px;padding:2px 6px;font-size:0.74rem;font-weight:600;cursor:pointer;outline:none';
    SUPPORTED_CURRENCIES.forEach(function (cur) {
      if (typeof data[cur] !== 'number') return;
      const opt = document.createElement('option');
      opt.value = cur;
      opt.textContent = cur.toUpperCase();
      opt.style.background = '#18181b';
      opt.style.color = '#fff';
      if (cur === activeCurrency) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      const next = select.value;
      try { localStorage.setItem(CURRENCY_PREF_KEY, next); } catch (_) {}
      renderTicker(container, data, next);
    });
    container.appendChild(select);

    container.style.display = 'inline-flex';

    document.querySelectorAll('[data-pi-inline-price]').forEach(function (el) {
      el.textContent = '1 π ≈ ' + formatFiat(price, activeCurrency);
    });
    document.querySelectorAll('[data-pi-inline-change]').forEach(function (el) {
      if (change === null) {
        el.textContent = '';
        return;
      }
      el.textContent = ' (' + (isUp ? '+' : '') + change.toFixed(1) + '% em 24h)';
      el.style.color = isUp ? '#34d399' : '#fca5a5';
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    const target = document.getElementById('pi-live-ticker');
    if (!target) return;
    const data = await fetchPiRates();
    if (!data) return;
    const currency = detectUserCurrency();
    renderTicker(target, data, typeof data[currency] === 'number' ? currency : 'usd');
  });
})();

