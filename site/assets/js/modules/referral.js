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

  function captureFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = normalizeHandle(params.get('ref'));
      if (!ref) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ref: ref, ts: Date.now() }));
    } catch (_) {}
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

  captureFromUrl();

  window.HokageReferral = {
    normalizeHandle: normalizeHandle,
    getPendingRef: getPendingRef,
    clearPendingRef: clearPendingRef,
    buildInviteUrl: buildInviteUrl,
    fetchStats: fetchStats,
    fetchAffiliateSummary: fetchAffiliateSummary,
    requestPayout: requestPayout
  };
})();
