/**
 * ============================================================
 * HOKAGE22B.COM — Module: Web2 Auth (Google Identity + Magic Link)
 * Autenticação complementar para navegadores convencionais
 * operando diretamente em hokage22b.com (sem tela supabase.co)
 * e mantendo o Pi Browser 100% Pi-Native (Mainnet Compliance).
 * ============================================================
 */
(function () {
  'use strict';

  const SUPABASE_URL = window.ISAR_SUPABASE_URL || 'https://yhzoehwkuxteihsnagcj.supabase.co';
  const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem9laHdrdXh0ZWloc25hZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzg2OTgsImV4cCI6MjEwODg1NDY5OH0.0ym3I-8oyG3ot_J6ofoVl7pu1m7WyIORLiStQynHG5c';
  const PI_PROFILE_URL = SUPABASE_URL + '/functions/v1/pi-profile';
  const GOOGLE_CLIENT_ID = '598505051203-pc7mc0j900sb4r3n5t8m9b58ba81mav3.apps.googleusercontent.com';

  let sbClient = null;
  let currentWeb2Token = '';
  let currentWeb2Session = null;
  let currentWeb2Profile = null;
  let listenerBound = false;

  let gsiLoadPromise = null;
  let currentGoogleRawNonce = '';
  let activeGoogleOnSuccess = null;
  let activeGoogleOnError = null;
  let activeGoogleSkipRedirect = false;

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

  async function generateNoncePair() {
    const rawBytes = new Uint8Array(16);
    crypto.getRandomValues(rawBytes);
    const rawNonce = Array.from(rawBytes, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(digest), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
    return { rawNonce: rawNonce, hashedNonce: hashedNonce };
  }

  function loadGoogleGsi() {
    if (isPiBrowserEnv()) {
      return Promise.reject(new Error('Google login não carregado no Pi Browser.'));
    }
    if (window.google && window.google.accounts && window.google.accounts.id) {
      return Promise.resolve(window.google);
    }
    if (gsiLoadPromise) return gsiLoadPromise;

    gsiLoadPromise = new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[src^="https://accounts.google.com/gsi/client"]');
      const timer = setTimeout(function () {
        gsiLoadPromise = null;
        reject(new Error('Tempo esgotado ao carregar login do Google.'));
      }, 8000);

      function finishOk() {
        clearTimeout(timer);
        if (window.google && window.google.accounts && window.google.accounts.id) {
          resolve(window.google);
        } else {
          gsiLoadPromise = null;
          reject(new Error('SDK do Google não inicializou corretamente.'));
        }
      }

      if (existing) {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          finishOk();
          return;
        }
        existing.addEventListener('load', finishOk, { once: true });
        existing.addEventListener('error', function () {
          clearTimeout(timer);
          gsiLoadPromise = null;
          reject(new Error('Falha ao carregar SDK do Google.'));
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = finishOk;
      script.onerror = function () {
        clearTimeout(timer);
        gsiLoadPromise = null;
        reject(new Error('Falha ao carregar login do Google. Verifique bloqueadores ou use e-mail abaixo.'));
      };
      document.head.appendChild(script);
    });

    return gsiLoadPromise;
  }

  async function handleGoogleCredentialResponse(response) {
    try {
      if (!response || !response.credential) {
        throw new Error('Credencial do Google não recebida.');
      }
      const sb = getSupabase();
      if (!sb || !sb.auth) {
        throw new Error('Serviço de autenticação indisponível no momento.');
      }
      const nonceToSend = currentGoogleRawNonce;
      const { data, error } = await sb.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: nonceToSend
      });
      if (error) {
        throw new Error(error.message || 'Falha ao autenticar conta Google.');
      }
      if (data && data.session) {
        await syncSessionToApp(data.session);
      }
      if (typeof activeGoogleOnSuccess === 'function') {
        activeGoogleOnSuccess(data, currentWeb2Profile);
      }
      const isInlineOnboardingPage = /\/(pioneiro|jornada)(\.html)?\/?$/i.test(window.location.pathname || '');
      if (!activeGoogleSkipRedirect && !isInlineOnboardingPage && (!currentWeb2Profile || !currentWeb2Profile.username)) {
        window.location.assign('pioneiro?setup=web2');
      }
    } catch (err) {
      console.warn('HokageWeb2Auth: erro no signInWithIdToken:', err);
      if (typeof activeGoogleOnError === 'function') {
        activeGoogleOnError(err);
      }
    }
  }

  async function ensureGsiInitialized(onSuccess, onError, opts) {
    if (isPiBrowserEnv()) {
      throw new Error('Google login desabilitado no Pi Browser.');
    }
    const options = opts && typeof opts === 'object' ? opts : {};
    if (typeof onSuccess === 'function') activeGoogleOnSuccess = onSuccess;
    if (typeof onError === 'function') activeGoogleOnError = onError;
    activeGoogleSkipRedirect = Boolean(options.skipAutoRedirect);

    const googleObj = await loadGoogleGsi();
    const pair = await generateNoncePair();
    currentGoogleRawNonce = pair.rawNonce;

    googleObj.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: pair.hashedNonce,
      ux_mode: 'popup',
      callback: handleGoogleCredentialResponse
    });
    return googleObj;
  }

  async function renderGoogleButton(containerEl, opts) {
    if (isPiBrowserEnv() || !containerEl) return false;
    const options = opts && typeof opts === 'object' ? opts : {};
    try {
      const googleObj = await ensureGsiInitialized(options.onSuccess, options.onError, options);
      const rawWidth = containerEl.clientWidth || 320;
      const width = Math.min(360, Math.max(240, rawWidth));
      containerEl.innerHTML = '';
      googleObj.accounts.id.renderButton(containerEl, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'rectangular',
        width: width,
        locale: 'pt-BR'
      });
      return true;
    } catch (err) {
      if (typeof options.onError === 'function') {
        options.onError(err);
      }
      return false;
    }
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

  async function signInWithGoogle(redirectUrl, opts) {
    if (isPiBrowserEnv()) {
      throw new Error('Use a conexão nativa do Pi Browser.');
    }
    const options = opts && typeof opts === 'object' ? opts : {};
    const googleObj = await ensureGsiInitialized(options.onSuccess, options.onError, options);
    googleObj.accounts.id.prompt();
    return { ok: true };
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

  async function confirmAndLinkEmail(email, codeOrUrl, piAccessToken) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const raw = String(codeOrUrl || '').trim();
    if (!raw) {
      throw new Error('Cole o link recebido no e-mail ou digite o código de 6 dígitos.');
    }
    const sb = getSupabase();
    if (!sb || !sb.auth) {
      throw new Error('Serviço de autenticação indisponível no momento.');
    }

    let sess = null;
    if (/^\d{6,8}$/.test(raw)) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        throw new Error('Informe um e-mail válido para validar o código.');
      }
      let verifyRes = await sb.auth.verifyOtp({
        email: cleanEmail,
        token: raw,
        type: 'email'
      });
      if (verifyRes.error) {
        verifyRes = await sb.auth.verifyOtp({
          email: cleanEmail,
          token: raw,
          type: 'magiclink'
        });
      }
      if (verifyRes.error) {
        throw new Error(verifyRes.error.message || 'Código inválido ou expirado.');
      }
      sess = verifyRes.data && verifyRes.data.session ? verifyRes.data.session : null;
    } else {
      let accessToken = '';
      let refreshToken = '';
      let tokenHash = '';
      let otpType = 'magiclink';
      try {
        const hashIdx = raw.indexOf('#');
        const queryIdx = raw.indexOf('?');
        if (hashIdx !== -1) {
          const hp = new URLSearchParams(raw.slice(hashIdx + 1));
          accessToken = hp.get('access_token') || '';
          refreshToken = hp.get('refresh_token') || '';
        }
        if (queryIdx !== -1) {
          const endIdx = hashIdx > queryIdx ? hashIdx : raw.length;
          const qp = new URLSearchParams(raw.slice(queryIdx + 1, endIdx));
          if (!tokenHash) tokenHash = qp.get('token_hash') || qp.get('token') || '';
          if (qp.get('type')) otpType = qp.get('type');
        }
      } catch (_) {}

      if (accessToken && refreshToken) {
        const { data, error } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (error) {
          throw new Error(error.message || 'Link expirado ou inválido.');
        }
        sess = data && data.session ? data.session : null;
      } else if (tokenHash) {
        let verifyRes = await sb.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType || 'magiclink'
        });
        if (verifyRes.error && otpType !== 'email') {
          verifyRes = await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'email'
          });
        }
        if (verifyRes.error) {
          throw new Error(verifyRes.error.message || 'Link expirado ou já utilizado.');
        }
        sess = verifyRes.data && verifyRes.data.session ? verifyRes.data.session : null;
      } else {
        throw new Error('Não reconhecemos um código de 6 dígitos ou link válido. Envie um novo link e tente novamente.');
      }
    }

    if (!sess) {
      const { data: sessionData } = await sb.auth.getSession();
      sess = sessionData && sessionData.session ? sessionData.session : null;
    }
    if (!sess || !sess.access_token) {
      throw new Error('Sessão de e-mail não confirmada. Envie um novo link e tente novamente.');
    }

    currentWeb2Session = sess;
    currentWeb2Token = sess.access_token;
    const confirmedEmail = (sess.user && sess.user.email)
      ? String(sess.user.email).toLowerCase()
      : cleanEmail;
    try {
      if (confirmedEmail) localStorage.setItem('hokage_web2_session_email', confirmedEmail);
    } catch (_) {}

    let piTok = piAccessToken || '';
    if (!piTok && window.HokagePi) {
      if (typeof window.HokagePi.ensureAccessToken === 'function') {
        piTok = await window.HokagePi.ensureAccessToken();
      } else if (typeof window.HokagePi.getAccessToken === 'function') {
        piTok = window.HokagePi.getAccessToken();
      }
    }
    if (!piTok) {
      try { piTok = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    }

    const linkedProf = await linkPiAccount(piTok);
    try {
      const existingRaw = localStorage.getItem('hokage_pi_user');
      const existingObj = existingRaw ? JSON.parse(existingRaw) : {};
      const mergedUser = Object.assign({}, existingObj, {
        username: (linkedProf && linkedProf.username) || existingObj.username || '',
        uid: (linkedProf && linkedProf.uid) || existingObj.uid || '',
        authType: 'hybrid',
        is_pi_verified: true,
        email: confirmedEmail || existingObj.email || ''
      });
      localStorage.setItem('hokage_pi_user', JSON.stringify(mergedUser));
      localStorage.setItem('isar_pi_user', JSON.stringify(mergedUser));
      if (window.HokagePi && typeof window.HokagePi.updateAuthUi === 'function') {
        window.HokagePi.updateAuthUi(mergedUser);
      }
    } catch (_) {}
    return linkedProf;
  }

  async function signOut() {
    currentWeb2Token = '';
    currentWeb2Session = null;
    currentWeb2Profile = null;
    try {
      if (!isPiBrowserEnv() && window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    } catch (_) {}
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
    googleClientId: GOOGLE_CLIENT_ID,
    getSupabase: getSupabase,
    sendMagicLink: sendMagicLink,
    signInWithGoogle: signInWithGoogle,
    renderGoogleButton: renderGoogleButton,
    getSession: getSession,
    getAccessToken: getAccessToken,
    fetchMyProfile: fetchMyProfile,
    linkPiAccount: linkPiAccount,
    confirmAndLinkEmail: confirmAndLinkEmail,
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
