/**
 * ============================================================
 * HOKAGE22B.COM — Module: Professional Telegram Activity Tracker
 * ============================================================
 * Rastreia visitas reais, trilha de navegação (por onde passaram),
 * tempo por página, dispositivo (Pi Browser / Mobile / Desktop)
 * e cliques estratégicos com filtro anti-bot e anti-ruído.
 */
(function () {
  'use strict';

  const ENDPOINT = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/telegram-bot';
  const TRAIL_KEY = 'hk_tg_trail_v2';
  const SESSION_KEY = 'hk_tg_sid_v2';
  const LAST_TS_KEY = 'hk_tg_last_ts_v2';

  function isNoiseSession() {
    try {
      const host = (window.location.hostname || '').toLowerCase();
      if (!host || host === 'localhost' || host === '127.0.0.1' || window.location.protocol === 'file:') {
        return true;
      }
      if (navigator.webdriver) return true;
      const ua = (navigator.userAgent || '').toLowerCase();
      if (/bot|crawler|spider|headless|lighthouse|pagespeed|pingdom|uptime/i.test(ua)) {
        return true;
      }
      const path = (window.location.pathname || '').toLowerCase();
      if (path.indexOf('admin') !== -1) return true;
      const piUser = getLoggedPiUsername();
      if (piUser && piUser.toLowerCase() === 'hokage22b') return true;
    } catch (_) {}
    return false;
  }

  function getSessionId() {
    try {
      let sid = sessionStorage.getItem(SESSION_KEY);
      if (!sid) {
        sid = Math.random().toString(36).slice(2, 6).toUpperCase();
        sessionStorage.setItem(SESSION_KEY, sid);
      }
      return sid;
    } catch (_) {
      return 'WEB';
    }
  }

  function getDeviceLabel() {
    const ua = navigator.userAgent || '';
    if (/PiBrowser|Pi Network/i.test(ua) || typeof window.Pi !== 'undefined' && /pi/i.test(document.referrer || '')) {
      return 'Pi Browser';
    }
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  function getLoggedPiUsername() {
    try {
      if (window.HokagePi && typeof window.HokagePi.getUser === 'function') {
        const u = window.HokagePi.getUser();
        if (u && u.username) return String(u.username).replace(/^@+/, '');
      }
      const raw = localStorage.getItem('hokage_pi_user') || sessionStorage.getItem('hokage_pi_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username) return String(parsed.username).replace(/^@+/, '');
      }
    } catch (_) {}
    return '';
  }

  function getActiveRef() {
    try {
      if (window.HokageReferral && typeof window.HokageReferral.getPendingRef === 'function') {
        return window.HokageReferral.getPendingRef() || '';
      }
      const raw = localStorage.getItem('hokage_pending_ref_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ref) return String(parsed.ref);
      }
    } catch (_) {}
    return '';
  }

  function getPageLabel() {
    const rawPath = (window.location.pathname || '/').replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '').toLowerCase();
    const search = window.location.search || '';
    const map = {
      '': 'Início',
      'index': 'Início',
      'jornada': 'Jornada',
      'zero': 'Pi do Zero',
      'um': 'Passo 1',
      'pioneiro': 'Passaporte',
      'mural': 'A Vila (P2P)',
      'vender': 'Como Vender',
      'monte': 'Monte Hokage',
      'ferramentas': 'Ferramentas',
      'construir': 'Construir (Devs)'
    };
    let label = map[rawPath] || ('/' + rawPath);
    if (rawPath === 'pioneiro' && search) {
      const m = search.match(/[?&]u=([^&]+)/i);
      if (m && m[1]) {
        label += ' (@' + decodeURIComponent(m[1]).replace(/^@+/, '').slice(0, 20) + ')';
      }
    }
    return label;
  }

  function updateTrailAndDuration() {
    const currentLabel = getPageLabel();
    let trail = [];
    let durationSec = 0;
    const now = Date.now();
    try {
      const lastTs = parseInt(sessionStorage.getItem(LAST_TS_KEY) || '0', 10);
      if (lastTs > 0 && now > lastTs) {
        durationSec = Math.min(1800, Math.round((now - lastTs) / 1000));
      }
      sessionStorage.setItem(LAST_TS_KEY, String(now));

      const rawTrail = sessionStorage.getItem(TRAIL_KEY);
      trail = rawTrail ? JSON.parse(rawTrail) : [];
      if (!Array.isArray(trail)) trail = [];
      if (trail[trail.length - 1] !== currentLabel) {
        trail.push(currentLabel);
        if (trail.length > 6) trail = trail.slice(-6);
        sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
      }
    } catch (_) {
      trail = [currentLabel];
    }
    return { trail: trail, durationSec: durationSec };
  }

  function getCurrentTrailString() {
    try {
      const rawTrail = sessionStorage.getItem(TRAIL_KEY);
      const trail = rawTrail ? JSON.parse(rawTrail) : [];
      if (Array.isArray(trail) && trail.length) return trail.join(' → ');
    } catch (_) {}
    return getPageLabel();
  }

  function getSourceLabel() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const utm = params.get('utm_source') || params.get('source');
      if (utm) return 'UTM: ' + utm.slice(0, 40);
      if (document.referrer) {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
          return 'Origem: ' + refUrl.hostname.replace(/^www\./, '');
        }
        return 'Navegação interna';
      }
    } catch (_) {}
    return 'Acesso direto';
  }

  function sendEvent(eventName, detail, dedupeKey, extra) {
    if (isNoiseSession()) return;
    try {
      if (dedupeKey) {
        const storeKey = 'hk_tg_evt_' + dedupeKey;
        if (sessionStorage.getItem(storeKey) === '1') return;
        sessionStorage.setItem(storeKey, '1');
      }

      const sid = getSessionId();
      const device = getDeviceLabel();
      const piUser = getLoggedPiUsername();
      const trailStr = (extra && extra.trailStr) ? extra.trailStr : getCurrentTrailString();
      const durationSec = (extra && typeof extra.durationSec === 'number') ? extra.durationSec : 0;
      const source = getSourceLabel();
      const page = (window.location.pathname || '/') + (window.location.search || '');

      const richParts = [
        '[' + sid + ' · ' + device + (piUser ? ' · @' + piUser : '') + ']',
        detail ? String(detail) : '',
        durationSec > 1 ? ('⏱️ ' + durationSec + 's na etapa ant.') : '',
        '🧭 ' + trailStr
      ].filter(Boolean);

      const payload = JSON.stringify({
        action: 'track_event',
        event: String(eventName || 'Interação').slice(0, 60),
        page: page.slice(0, 120),
        detail: richParts.join(' | ').slice(0, 220),
        ref: getActiveRef(),
        sessionId: sid,
        device: device,
        user: piUser ? '@' + piUser : '',
        trail: trailStr.slice(0, 180),
        source: source.slice(0, 80),
        durationSec: durationSec
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(function () {});
    } catch (_) {}
  }

  function trackPageVisit() {
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    const search = window.location.search || '';
    const info = updateTrailAndDuration();
    const isEntry = info.trail.length <= 1;
    const title = isEntry ? '🟢 Nova Sessão no Site' : ('🧭 Navegou → ' + getPageLabel());
    sendEvent(title, getSourceLabel(), 'visit_' + path + search, {
      trailStr: info.trail.join(' → '),
      durationSec: info.durationSec
    });
  }

  function classifyClick(el) {
    if (!el) return null;
    const href = (el.getAttribute('href') || '').trim();
    const onclick = (el.getAttribute('onclick') || '').trim();
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 55);

    if (/hotmart\.com/i.test(href)) {
      return { event: '💳 Clique Checkout Hotmart', detail: label || href, key: 'hotmart_' + href.slice(-12) };
    }
    if (/t\.me\/hokage22b_oficial_bot/i.test(href)) {
      return { event: '🤖 Clique no Bot Telegram', detail: label || 'Abriu @hokage22b_oficial_bot', key: 'tg_bot' };
    }
    if (/chat\.whatsapp\.com|wa\.me/i.test(href)) {
      return { event: '💬 Clique WhatsApp', detail: label || 'Comunidade / Contato', key: 'whatsapp' };
    }
    if (/github\.com\/isarloiola/i.test(href)) {
      return { event: '🧑‍💻 Clique no GitHub', detail: label || href, key: 'github' };
    }
    if (/linkedin\.com\/in\/isarloiola/i.test(href)) {
      return { event: '💼 Clique no LinkedIn', detail: label || href, key: 'linkedin' };
    }
    if (/\.pdf|\.epub|downloads\//i.test(href)) {
      return { event: '📘 Download de Material', detail: label || href, key: 'dl_' + href.slice(-16) };
    }
    if (/loginWithPi|startFromWelcomeModal/i.test(onclick)) {
      return { event: '⚡ Clique Conectar Pi', detail: label || 'Tentativa de login Pi Browser', key: 'pi_login' };
    }
    if (/buyProduct|payWithPi|openManualDownload|modal-manual-download/i.test(onclick)) {
      return { event: '🛒 Interesse em Produto/E-book', detail: label || onclick.slice(0, 50), key: 'prod_' + label.slice(0, 20) };
    }
    if (/shareProfile|shareReferralWhatsapp|copyWelcomeInviteLink/i.test(onclick)) {
      return { event: '📢 Compartilhou Passaporte/Convite', detail: label, key: 'share' };
    }
    if (/openWelcomeModal/i.test(onclick)) {
      return { event: '🎁 Abriu Balão de Convite', detail: label, key: 'ref_pill' };
    }
    if (/runAddressCheck|runLinkCheck|generateVitrineQr|runBalcaoCalc/i.test(onclick)) {
      return { event: '🛠️ Usou Ferramenta Web3', detail: label, key: 'tool_' + onclick.split('(')[0] };
    }
    // Cliques em links internos principais / CTAs de trilha
    if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto:')) {
      return {
        event: '👆 Clique de Navegação',
        detail: (label ? label + ' → ' : '') + href,
        key: 'nav_' + getPageLabel() + '_' + href.slice(0, 24)
      };
    }
    return null;
  }

  document.addEventListener('click', function (ev) {
    const target = ev.target && ev.target.closest ? ev.target.closest('a, button') : null;
    if (!target) return;
    const hit = classifyClick(target);
    if (hit) {
      sendEvent(hit.event, hit.detail, hit.key);
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageVisit);
  } else {
    trackPageVisit();
  }

  window.HokageAnalyticsTg = {
    sendEvent: sendEvent
  };
})();
