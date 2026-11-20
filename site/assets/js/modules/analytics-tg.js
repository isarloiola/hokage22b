/**
 * ============================================================
 * HOKAGE22B.COM — Module: Lightweight Telegram Activity Tracker
 * ============================================================
 * Envia eventos de visitas e cliques importantes para o bot
 * privado do admin no Telegram com deduplicação por sessão.
 */
(function () {
  'use strict';

  const ENDPOINT = 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/telegram-bot';

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

  function sendEvent(eventName, detail, dedupeKey) {
    try {
      if (dedupeKey) {
        const storeKey = 'hk_tg_evt_' + dedupeKey;
        if (sessionStorage.getItem(storeKey) === '1') return;
        sessionStorage.setItem(storeKey, '1');
      }

      const page = (window.location.pathname || '/') + (window.location.search || '');
      const payload = JSON.stringify({
        action: 'track_event',
        event: String(eventName || 'Interação').slice(0, 60),
        page: page.slice(0, 120),
        detail: String(detail || '').slice(0, 140),
        ref: getActiveRef()
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
    const refSource = document.referrer ? ('Origem: ' + document.referrer.slice(0, 80)) : 'Acesso direto';
    sendEvent('👀 Nova Visita no Site', refSource, 'visit_' + path + search);
  }

  function classifyClick(el) {
    if (!el) return null;
    const href = (el.getAttribute('href') || '').trim();
    const onclick = (el.getAttribute('onclick') || '').trim();
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

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
