/**
 * ============================================================
 * HOKAGE22B.COM — Module: Web2 Auth (Supabase Email Magic Link)
 * Autenticação complementar para navegadores convencionais
 * mantendo o Pi Browser 100% Pi-Native (Mainnet Compliance).
 * ============================================================
 */
(function () {
  'use strict';

  const SUPABASE_URL = window.ISAR_SUPABASE_URL || 'https://yhzoehwkuxteihsnagcj.supabase.co';
  const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem9laHdrdXh0ZWloc25hZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzg2OTgsImV4cCI6MjEwODg1NDY5OH0.0ym3I-8oyG3ot_J6ofoVl7pu1m7WyIORLiStQynHG5c';
  const PI_PROFILE_URL = SUPABASE_URL + '/functions/v1/pi-profile';

  let sbClient = null;
  let currentWeb2Token = '';
  let currentWeb2Session = null;
  let currentWeb2Profile = null;
  let listenerBound = false;

  function isPiBrowserEnv() {
    if (window.HokagePi && typeof window.HokagePi.isPiBrowser === 'function') {
      return window.HokagePi.isPiBrowser();
    }
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;
    if (window.PiNetwork || window.flutter_inappwebview) return true;
    if (window.location && (window.location.protocol === 'pi:' || (window.location.hostname && window.location.hostname.endsWith('.pi')))) {
      return true;
    }
    return false;
  }

  function getSupabase() {
    if (sbClient) return sbClient;
    if (window.IsarDB && typeof window.IsarDB.getClient === 'function') {
      sbClient = window.IsarDB.getClient();
      if (sbClient) return sbClient;
    }
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (err) {
        console.warn('HokageWeb2Auth: falha ao inicializar Supabase:', err);
      }
    }
    return sbClient;
  }

  async function sendMagicLink(email, redirectUrl) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Por favor, informe um endereço de e-mail válido.');
    }
    const sb = getSupabase();
    if (!sb || !sb.auth) {
      throw new Error('Serviço de autenticação indisponível no momento.');
    }
    const targetRedirect = redirectUrl || (window.location.origin + '/pioneiro');
    const { error } = await sb.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: targetRedirect }
    });
    if (error) {
      throw new Error(error.message || 'Não foi possível enviar o link de acesso.');
    }
    try {
      localStorage.setItem('hokage_web2_session_email', cleanEmail);
    } catch (_) {}
    return { ok: true, email: cleanEmail };
  }

  async function getSession() {
    if (currentWeb2Session && currentWeb2Session.access_token) {
      return currentWeb2Session;
    }
    const sb = getSupabase();
    if (!sb || !sb.auth) return null;
    try {
      const { data } = await sb.auth.getSession();
      const sess = data && data.session ? data.session : null;
      if (sess && sess.access_token) {
        currentWeb2Session = sess;
        currentWeb2Token = sess.access_token;
      }
      return sess;
    } catch (_) {
      return null;
    }
  }

  async function getAccessToken() {
    if (currentWeb2Token) return currentWeb2Token;
    const sess = await getSession();
    return (sess && sess.access_token) ? sess.access_token : '';
  }

  async function fetchMyProfile(token) {
    const tok = token || (await getAccessToken());
    if (!tok) return null;
    try {
      const res = await fetch(PI_PROFILE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_my_web2_profile', web2Token: tok })
      });
      const json = await res.json().catch(function () { return {}; });
      const payload = (json && json.data) ? json.data : json;
      const prof = payload && payload.profile ? payload.profile : null;
      currentWeb2Profile = prof;
      return prof;
    } catch (err) {
      console.warn('HokageWeb2Auth: erro ao buscar perfil Web2:', err);
      return null;
    }
  }

  async function linkPiAccount(piAccessToken) {
    const web2Tok = await getAccessToken();
    if (!web2Tok) {
      throw new Error('Faça login com seu e-mail primeiro para vincular a conta Pi.');
    }
    if (!piAccessToken) {
      throw new Error('Autenticação Pi Network obrigatória para vincular.');
    }
    const res = await fetch(PI_PROFILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'link_pi_account',
        web2Token: web2Tok,
        accessToken: piAccessToken
      })
    });
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.ok) {
      throw new Error((json && json.error) || 'Não foi possível vincular a conta Pi.');
    }
    const payload = json.data || json;
    const prof = payload && payload.profile ? payload.profile : null;
    if (prof && prof.username) {
      currentWeb2Profile = prof;
      const email = currentWeb2Session && currentWeb2Session.user ? currentWeb2Session.user.email : undefined;
      const userObj = {
        username: prof.username,
        uid: prof.uid,
        authType: 'hybrid',
        is_pi_verified: true,
        email: email
      };
      try {
        localStorage.setItem('hokage_pi_user', JSON.stringify(userObj));
        localStorage.setItem('isar_pi_user', JSON.stringify(userObj));
      } catch (_) {}
      if (window.HokagePi && typeof window.HokagePi.updateAuthUi === 'function') {
        window.HokagePi.updateAuthUi(userObj);
      }
    }
    return prof;
  }

  async function signOut() {
    currentWeb2Token = '';
    currentWeb2Session = null;
    currentWeb2Profile = null;
    try {
      localStorage.removeItem('hokage_pi_user');
      localStorage.removeItem('isar_pi_user');
      localStorage.removeItem('hokage_web2_session_email');
    } catch (_) {}
    const sb = getSupabase();
    if (sb && sb.auth) {
      try {
        await sb.auth.signOut();
      } catch (_) {}
    }
  }

  async function syncSessionToApp(session) {
    if (!session || !session.access_token) return;
    currentWeb2Session = session;
    currentWeb2Token = session.access_token;
    const email = (session.user && session.user.email) ? String(session.user.email).toLowerCase() : '';
    try {
      if (email) localStorage.setItem('hokage_web2_session_email', email);
    } catch (_) {}

    // No Pi Browser, se já existe sessão Pi SDK ativa, preserva e tenta vincular se aplicável
    if (isPiBrowserEnv()) {
      let existingUser = null;
      let piTok = '';
      try {
        const raw = localStorage.getItem('hokage_pi_user');
        if (raw) existingUser = JSON.parse(raw);
        piTok = (window.HokagePi && window.HokagePi.getAccessToken)
          ? window.HokagePi.getAccessToken()
          : (sessionStorage.getItem('hokage_pi_access_token') || '');
      } catch (_) {}
      if (existingUser && existingUser.username && existingUser.authType !== 'web2') {
        if (piTok && existingUser.authType === 'pi-sdk') {
          try { await linkPiAccount(piTok); } catch (_) {}
        }
        return;
      }
    }

    const prof = await fetchMyProfile(session.access_token);
    let userObj;
    if (prof && prof.username) {
      userObj = {
        username: prof.username,
        uid: prof.uid,
        authType: prof.is_pi_verified ? 'hybrid' : 'web2',
        is_pi_verified: Boolean(prof.is_pi_verified),
        email: email
      };
    } else {
      userObj = {
        username: '',
        uid: 'web2_' + (session.user && session.user.id ? session.user.id : ''),
        authType: 'web2',
        is_pi_verified: false,
        email: email,
        needsHandle: true
      };
    }

    try {
      localStorage.setItem('hokage_pi_user', JSON.stringify(userObj));
      localStorage.setItem('isar_pi_user', JSON.stringify(userObj));
    } catch (_) {}

    if (window.HokagePi && typeof window.HokagePi.updateAuthUi === 'function') {
      window.HokagePi.updateAuthUi(userObj);
    }

    try {
      window.dispatchEvent(new CustomEvent('hokage:web2-auth-ready', {
        detail: {
          email: email,
          profile: prof,
          token: session.access_token,
          user: userObj
        }
      }));
    } catch (_) {}
  }

  function init() {
    const sb = getSupabase();
    if (!sb || !sb.auth) return;

    if (!listenerBound) {
      listenerBound = true;
      sb.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session && session.access_token) {
            syncSessionToApp(session);
          }
        } else if (event === 'SIGNED_OUT') {
          currentWeb2Token = '';
          currentWeb2Session = null;
          currentWeb2Profile = null;
        }
      });
    }

    getSession().then(function (sess) {
      if (sess && sess.access_token) {
        syncSessionToApp(sess);
      }
    }).catch(function () {});
  }

  window.HokageWeb2Auth = {
    getSupabase: getSupabase,
    sendMagicLink: sendMagicLink,
    getSession: getSession,
    getAccessToken: getAccessToken,
    fetchMyProfile: fetchMyProfile,
    linkPiAccount: linkPiAccount,
    signOut: signOut,
    getCachedProfile: function () { return currentWeb2Profile; },
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
