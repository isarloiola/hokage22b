// ============================================================
// HOKAGE22B — Module: Internationalization (i18n Hybrid Engine v5.0)
// Motor híbrido: Google Translate Widget + Fallback DOM direto (Pi Browser)
// ============================================================

(function () {
  'use strict';

  var COOKIE_NAME = 'googtrans';
  var STORAGE_KEY = 'hokage_selected_lang';
  var DEFAULT_LANG = 'pt';
  var CACHE_PREFIX = 'hk_tr_cache_v1_';

  var LANGUAGES = [
    { code: 'pt', name: 'Português', flag: '🇧🇷', tag: 'PT', group: 'main' },
    { code: 'en', name: 'English', flag: '🇺🇸', tag: 'EN', group: 'main' },
    { code: 'es', name: 'Español', flag: '🇪🇸', tag: 'ES', group: 'main' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', tag: 'VI', group: 'global' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳', tag: 'ZH', group: 'global' },
    { code: 'ko', name: '한국어', flag: '🇰🇷', tag: 'KO', group: 'global' },
    { code: 'ja', name: '日本語', flag: '🇯🇵', tag: 'JA', group: 'global' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', tag: 'ID', group: 'global' },
    { code: 'tl', name: 'Tagalog (Filipino)', flag: '🇵🇭', tag: 'PH', group: 'global' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', tag: 'FR', group: 'global' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', tag: 'DE', group: 'global' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺', tag: 'RU', group: 'global' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', tag: 'AR', group: 'global' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷', tag: 'TR', group: 'global' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', tag: 'HI', group: 'global' }
  ];

  var originalTextMap = typeof WeakMap === 'function' ? new WeakMap() : null;
  var originalPlaceholderMap = typeof WeakMap === 'function' ? new WeakMap() : null;
  var trackedTextNodes = new Set();
  var trackedPlaceholderEls = new Set();
  var memoryCache = {};
  var isFallbackActive = false;
  var activeFallbackLang = DEFAULT_LANG;
  var translationRunId = 0;
  var isApplyingMutation = false;
  var domObserver = null;
  var mutationTimer = null;

  function isPiBrowserEnv() {
    if (window.HokagePi && typeof window.HokagePi.isPiBrowser === 'function' && window.HokagePi.isPiBrowser()) {
      return true;
    }
    var ua = (navigator && (navigator.userAgent || navigator.vendor)) || '';
    if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;
    if (window.PiNetwork || window.flutter_inappwebview) return true;
    if (window.location && (window.location.protocol === 'pi:' || /\.pi$/i.test(window.location.hostname || ''))) {
      return true;
    }
    return false;
  }

  function isGoogleTranslated() {
    var htmlEl = document.documentElement;
    var bodyEl = document.body;
    return Boolean(
      (htmlEl && (htmlEl.classList.contains('translated-ltr') || htmlEl.classList.contains('translated-rtl'))) ||
      (bodyEl && (bodyEl.classList.contains('translated-ltr') || bodyEl.classList.contains('translated-rtl')))
    );
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + d.toUTCString();
    }
    var domain = window.location.hostname || '';
    var secureAttrs = window.location.protocol === 'https:' ? '; SameSite=None; Secure' : '; SameSite=Lax';
    document.cookie = name + '=' + value + expires + '; path=/' + secureAttrs;
    document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
    if (domain.indexOf('.') !== -1) {
      document.cookie = name + '=' + value + expires + '; path=/; domain=' + domain + secureAttrs;
      var parts = domain.split('.');
      var root = parts.slice(-2).join('.');
      if (root && root !== domain) {
        document.cookie = name + '=' + value + expires + '; path=/; domain=.' + root + secureAttrs;
      }
    }
  }

  function deleteCookie(name) {
    var domain = window.location.hostname || '';
    var past = '; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
    document.cookie = name + '=;' + past;
    if (domain) {
      document.cookie = name + '=;' + past + '; domain=' + domain;
    }
    if (domain.indexOf('.') !== -1) {
      var parts = domain.split('.');
      var root = parts.slice(-2).join('.');
      if (root) {
        document.cookie = name + '=;' + past + '; domain=.' + root;
      }
    }
  }

  function detectBrowserLanguage() {
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (!navLang || navLang.startsWith('pt')) return null;

    for (var i = 0; i < LANGUAGES.length; i++) {
      var l = LANGUAGES[i];
      if (l.code === 'pt') continue;
      if (navLang === l.code.toLowerCase() || navLang.startsWith(l.code.toLowerCase() + '-')) {
        return l.code;
      }
    }
    return 'en';
  }

  function checkAutoDetect() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (_) {}
    var cookie = getCookie(COOKIE_NAME);

    if (!stored && !cookie) {
      var detected = detectBrowserLanguage();
      if (detected && detected !== 'pt') {
        try {
          localStorage.setItem(STORAGE_KEY, detected);
        } catch (_) {}
        setCookie(COOKIE_NAME, '/pt/' + detected, 30);
      }
    }
  }

  function getActiveLang() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (_) {}
    if (stored) return stored;

    var cookie = getCookie(COOKIE_NAME);
    if (cookie) {
      var parts = cookie.split('/');
      var cLang = parts[parts.length - 1];
      if (cLang) return cLang;
    }
    return DEFAULT_LANG;
  }

  function setTranslatingIndicator(busy) {
    document.querySelectorAll('.lang-btn-trigger').forEach(function (btn) {
      btn.classList.toggle('is-translating', Boolean(busy));
    });
  }

  function getLangCache(langCode) {
    if (!memoryCache[langCode]) {
      var loaded = {};
      try {
        var raw = sessionStorage.getItem(CACHE_PREFIX + langCode);
        if (raw) loaded = JSON.parse(raw) || {};
      } catch (_) {}
      memoryCache[langCode] = loaded;
    }
    return memoryCache[langCode];
  }

  function saveLangCache(langCode) {
    try {
      var cache = memoryCache[langCode];
      if (!cache) return;
      var keys = Object.keys(cache);
      if (keys.length > 600) {
        var trimmed = {};
        keys.slice(keys.length - 450).forEach(function (k) { trimmed[k] = cache[k]; });
        memoryCache[langCode] = trimmed;
      }
      sessionStorage.setItem(CACHE_PREFIX + langCode, JSON.stringify(memoryCache[langCode]));
    } catch (_) {}
  }

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return true;
    var tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'CODE' || tag === 'PRE' || tag === 'SVG' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') {
      return true;
    }
    if (el.closest && el.closest('.notranslate, [translate="no"], .lang-selector, #google_translate_element, .skiptranslate, script, style, code, pre, svg')) {
      return true;
    }
    return false;
  }

  function collectTranslatableItems() {
    var textItems = [];
    var placeholderItems = [];
    if (!document.body || typeof document.createTreeWalker !== 'function') {
      return { textItems: textItems, placeholderItems: placeholderItems };
    }

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (shouldSkipElement(parent)) continue;

      var raw = originalTextMap && originalTextMap.has(node)
        ? originalTextMap.get(node)
        : node.nodeValue;

      if (!raw) continue;
      var match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
      var core = match ? match[2] : raw.trim();
      if (!core || core.length < 2 || !/[A-Za-zÀ-ÿ]/.test(core)) continue;
      if (/^(https?:\/\/|mailto:|@)/i.test(core) && core.indexOf(' ') === -1) continue;

      if (originalTextMap && !originalTextMap.has(node)) {
        originalTextMap.set(node, raw);
      }
      trackedTextNodes.add(node);
      textItems.push({
        node: node,
        lead: match ? match[1] : '',
        core: core,
        trail: match ? match[3] : ''
      });
    }

    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (el) {
      if (el.closest && el.closest('.notranslate, [translate="no"], .lang-selector')) return;
      var origPh = originalPlaceholderMap && originalPlaceholderMap.has(el)
        ? originalPlaceholderMap.get(el)
        : el.getAttribute('placeholder');
      if (!origPh || origPh.trim().length < 2 || !/[A-Za-zÀ-ÿ]/.test(origPh)) return;
      if (originalPlaceholderMap && !originalPlaceholderMap.has(el)) {
        originalPlaceholderMap.set(el, origPh);
      }
      trackedPlaceholderEls.add(el);
      placeholderItems.push({ el: el, core: origPh.trim() });
    });

    return { textItems: textItems, placeholderItems: placeholderItems };
  }

  function parseGoogleSingleResponse(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) return '';
    return data[0].map(function (seg) {
      return Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : '';
    }).join('');
  }

  async function translateSingleText(text, targetLang) {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=' +
      encodeURIComponent(targetLang) + '&dt=t&q=' + encodeURIComponent(text);
    var res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var json = await res.json();
    return parseGoogleSingleResponse(json) || text;
  }

  async function translateChunk(strings, targetLang, cache) {
    if (strings.length === 1) {
      var single = await translateSingleText(strings[0], targetLang);
      cache[strings[0]] = single;
      return;
    }

    var normalizedInputs = strings.map(function (s) {
      return s.replace(/\s*\n+\s*/g, ' ');
    });
    var joined = normalizedInputs.join('\n');

    try {
      var translatedJoined = await translateSingleText(joined, targetLang);
      var parts = translatedJoined.split(/\n/);
      if (parts.length === strings.length) {
        for (var i = 0; i < strings.length; i++) {
          cache[strings[i]] = (parts[i] || '').trim() || strings[i];
        }
        return;
      }
    } catch (_) {}

    await Promise.all(strings.map(function (s) {
      return translateSingleText(s, targetLang)
        .then(function (tr) { cache[s] = tr || s; })
        .catch(function () {});
    }));
  }

  async function fetchTranslationsBatch(uniqueStrings, targetLang, runId) {
    var cache = getLangCache(targetLang);
    var missing = uniqueStrings.filter(function (s) { return !cache[s]; });
    if (!missing.length) return;

    var chunks = [];
    var current = [];
    var currentLen = 0;

    for (var i = 0; i < missing.length; i++) {
      var item = missing[i];
      if (current.length >= 10 || (currentLen + item.length > 900 && current.length > 0)) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push(item);
      currentLen += item.length;
    }
    if (current.length) chunks.push(current);

    var cursor = 0;
    var concurrency = 4;

    async function worker() {
      while (cursor < chunks.length) {
        if (runId !== translationRunId) return;
        var idx = cursor++;
        await translateChunk(chunks[idx], targetLang, cache);
      }
    }

    var workers = [];
    for (var w = 0; w < Math.min(concurrency, chunks.length); w++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    saveLangCache(targetLang);
  }

  function applyCachedDomUpdates(items, langCode) {
    var cache = getLangCache(langCode);
    isApplyingMutation = true;
    try {
      items.textItems.forEach(function (it) {
        var tr = cache[it.core];
        if (tr && it.node && it.node.parentElement) {
          var nextVal = it.lead + tr + it.trail;
          if (it.node.nodeValue !== nextVal) {
            it.node.nodeValue = nextVal;
          }
        }
      });
      items.placeholderItems.forEach(function (it) {
        var tr = cache[it.core];
        if (tr && it.el) {
          it.el.setAttribute('placeholder', tr);
        }
      });
    } finally {
      isApplyingMutation = false;
    }
  }

  function stopFallbackObserver() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (mutationTimer) {
      clearTimeout(mutationTimer);
      mutationTimer = null;
    }
  }

  function ensureFallbackObserver() {
    if (domObserver || !window.MutationObserver || !document.body) return;
    domObserver = new MutationObserver(function () {
      if (isApplyingMutation || !isFallbackActive || activeFallbackLang === DEFAULT_LANG) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(function () {
        if (isFallbackActive && activeFallbackLang !== DEFAULT_LANG) {
          applyDomTranslation(activeFallbackLang);
        }
      }, 350);
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  async function applyDomTranslation(langCode) {
    if (!langCode || langCode === DEFAULT_LANG) return;
    var myRunId = ++translationRunId;
    isFallbackActive = true;
    activeFallbackLang = langCode;

    document.documentElement.lang = langCode;
    document.documentElement.dir = langCode === 'ar' ? 'rtl' : 'ltr';

    var collected = collectTranslatableItems();
    var uniqueSet = new Set();
    collected.textItems.forEach(function (it) { uniqueSet.add(it.core); });
    collected.placeholderItems.forEach(function (it) { uniqueSet.add(it.core); });

    if (!uniqueSet.size) return;

    applyCachedDomUpdates(collected, langCode);
    setTranslatingIndicator(true);

    try {
      await fetchTranslationsBatch(Array.from(uniqueSet), langCode, myRunId);
      if (myRunId !== translationRunId || !isFallbackActive || activeFallbackLang !== langCode) return;
      applyCachedDomUpdates(collected, langCode);
      ensureFallbackObserver();
    } catch (err) {
      console.warn('[HokageI18n Fallback]', err);
    } finally {
      if (myRunId === translationRunId) {
        setTranslatingIndicator(false);
      }
    }
  }

  function restoreDomOriginal() {
    translationRunId++;
    isFallbackActive = false;
    activeFallbackLang = DEFAULT_LANG;
    stopFallbackObserver();
    setTranslatingIndicator(false);

    isApplyingMutation = true;
    try {
      trackedTextNodes.forEach(function (node) {
        if (originalTextMap && originalTextMap.has(node)) {
          node.nodeValue = originalTextMap.get(node);
        }
      });
      trackedPlaceholderEls.forEach(function (el) {
        if (originalPlaceholderMap && originalPlaceholderMap.has(el)) {
          el.setAttribute('placeholder', originalPlaceholderMap.get(el));
        }
      });
    } finally {
      isApplyingMutation = false;
    }

    document.documentElement.lang = 'pt-BR';
    document.documentElement.dir = 'ltr';
  }

  function tryGoogleWidget(langCode) {
    var combo = document.querySelector('.goog-te-combo');
    if (!combo) return false;
    combo.value = langCode;
    combo.dispatchEvent(new Event('change'));
    return true;
  }

  function changeLanguage(langCode) {
    try {
      localStorage.setItem(STORAGE_KEY, langCode);
    } catch (_) {}

    if (langCode === 'pt') {
      deleteCookie(COOKIE_NAME);
      deleteCookie('googtrans');
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      updateUIState('pt');
      if (isGoogleTranslated()) {
        window.location.reload();
        return;
      }
      restoreDomOriginal();
      return;
    }

    var cookieVal = '/pt/' + langCode;
    setCookie(COOKIE_NAME, cookieVal, 30);
    setCookie('googtrans', cookieVal, 30);
    updateUIState(langCode);

    if (isPiBrowserEnv()) {
      applyDomTranslation(langCode);
      return;
    }

    var triggered = tryGoogleWidget(langCode);
    if (triggered) {
      setTimeout(function () {
        if (!isGoogleTranslated() && getActiveLang() === langCode) {
          applyDomTranslation(langCode);
        }
      }, 1800);
    } else {
      applyDomTranslation(langCode);
    }
  }

  function updateUIState(activeLang) {
    document.querySelectorAll('.lang-btn-trigger').forEach(function (btn) {
      var langObj = LANGUAGES.find(function (l) { return l.code === activeLang; }) || { tag: activeLang.toUpperCase(), flag: '🌐' };
      var codeSpan = btn.querySelector('.lang-code');
      if (codeSpan) {
        codeSpan.textContent = langObj.tag;
      }
      var flagSpan = btn.querySelector('.lang-globe-icon');
      if (flagSpan && langObj.flag) {
        flagSpan.textContent = langObj.flag;
      }
      btn.setAttribute('aria-label', langObj.tag + ' — Alterar idioma');
    });

    document.querySelectorAll('.lang-item').forEach(function (item) {
      var code = item.getAttribute('data-lang');
      item.classList.toggle('active', code === activeLang);
    });
  }

  function createLanguageSelectorHTML() {
    var active = getActiveLang();
    var currentObj = LANGUAGES.find(function (l) { return l.code === active; }) || { tag: 'PT', flag: '🌐' };

    var mainLangs = LANGUAGES.filter(function (l) { return l.group === 'main'; });
    var globalLangs = LANGUAGES.filter(function (l) { return l.group === 'global'; });

    var html = '<div class="lang-selector">';
    html += '<button type="button" class="lang-btn-trigger" aria-label="' + currentObj.tag + ' — Alterar idioma" aria-expanded="false">';
    html += '  <span class="lang-globe-icon">' + currentObj.flag + '</span>';
    html += '  <span class="lang-code">' + currentObj.tag + '</span>';
    html += '  <span class="lang-arrow">▼</span>';
    html += '</button>';

    html += '<div class="lang-dropdown" role="menu" aria-label="Opções de idioma">';
    html += '  <div class="lang-group-title">Destaques / Main</div>';

    mainLangs.forEach(function (l) {
      var isActive = l.code === active ? ' active' : '';
      html += '  <button type="button" class="lang-item' + isActive + '" data-lang="' + l.code + '" role="menuitem">';
      html += '    <div class="lang-item-content">';
      html += '      <span class="lang-flag">' + l.flag + '</span>';
      html += '      <span class="lang-native">' + l.name + '</span>';
      html += '    </div>';
      html += '    <span class="lang-tag">' + l.tag + '</span>';
      html += '  </button>';
    });

    html += '  <div class="lang-divider"></div>';
    html += '  <div class="lang-group-title">Comunidade Pi Global</div>';

    globalLangs.forEach(function (l) {
      var isActive = l.code === active ? ' active' : '';
      html += '  <button type="button" class="lang-item' + isActive + '" data-lang="' + l.code + '" role="menuitem">';
      html += '    <div class="lang-item-content">';
      html += '      <span class="lang-flag">' + l.flag + '</span>';
      html += '      <span class="lang-native">' + l.name + '</span>';
      html += '    </div>';
      html += '    <span class="lang-tag">' + l.tag + '</span>';
      html += '  </button>';
    });

    html += '</div>';
    html += '</div>';

    return html;
  }

  function initGoogleScript() {
    if (!document.getElementById('google_translate_element') && document.body) {
      var div = document.createElement('div');
      div.id = 'google_translate_element';
      div.setAttribute('aria-hidden', 'true');
      document.body.appendChild(div);
    }

    window.googleTranslateElementInit = function () {
      if (!window.google || !window.google.translate || !window.google.translate.TranslateElement) return;
      new window.google.translate.TranslateElement({
        pageLanguage: 'pt',
        includedLanguages: 'en,es,vi,zh-CN,ko,ja,id,tl,fr,de,ru,ar,tr,hi,it,pt',
        autoDisplay: false
      }, 'google_translate_element');
    };

    if (!document.getElementById('google-translate-script') && !isPiBrowserEnv()) {
      var s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.head.appendChild(s);
    }
  }

  function suppressGoogleBanner() {
    function resetBodyTop() {
      if (document.body) {
        if (document.body.style.top && document.body.style.top !== '0px') {
          document.body.style.setProperty('top', '0px', 'important');
        }
        if (document.body.style.position && document.body.style.position !== 'static') {
          document.body.style.setProperty('position', 'static', 'important');
        }
      }
      if (document.documentElement && document.documentElement.style.top && document.documentElement.style.top !== '0px') {
        document.documentElement.style.setProperty('top', '0px', 'important');
      }
      var banners = document.querySelectorAll('.goog-te-banner-frame, iframe[id*=":1.container"], iframe[id*=":2.container"], .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-ORHb-OEVmcd');
      banners.forEach(function (b) {
        b.style.setProperty('display', 'none', 'important');
        b.style.setProperty('visibility', 'hidden', 'important');
        b.style.setProperty('height', '0px', 'important');
      });
    }

    resetBodyTop();

    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(function () {
        resetBodyTop();
      });
      observer.observe(document.body, { childList: true, attributes: true, attributeFilter: ['style', 'class'] });
    }

    var count = 0;
    var timer = setInterval(function () {
      resetBodyTop();
      count++;
      if (count > 25) clearInterval(timer);
    }, 120);
  }

  var isEventsBound = false;
  function bindEvents() {
    if (isEventsBound) return;
    isEventsBound = true;

    function closeAllSelectors() {
      document.querySelectorAll('.lang-selector.open').forEach(function (s) {
        s.classList.remove('open');
        var tr = s.querySelector('.lang-btn-trigger');
        if (tr) tr.setAttribute('aria-expanded', 'false');
      });
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.lang-btn-trigger');
      var selector = e.target.closest('.lang-selector');

      if (trigger && selector) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = selector.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        return;
      }

      var item = e.target.closest('.lang-item');
      if (item) {
        var lang = item.getAttribute('data-lang');
        if (lang) {
          changeLanguage(lang);
        }
        var parentSel = item.closest('.lang-selector');
        if (parentSel) {
          parentSel.classList.remove('open');
          var tr = parentSel.querySelector('.lang-btn-trigger');
          if (tr) tr.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      closeAllSelectors();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeAllSelectors();
      }
    });
  }

  var hasInitialized = false;
  function init() {
    if (hasInitialized) return;
    hasInitialized = true;
    suppressGoogleBanner();
    checkAutoDetect();
    initGoogleScript();

    var containers = document.querySelectorAll('.lang-mount-point');
    containers.forEach(function (c) {
      if (!c.querySelector('.lang-selector')) {
        c.innerHTML = createLanguageSelectorHTML();
      }
    });

    bindEvents();

    var activeLang = getActiveLang();
    updateUIState(activeLang);

    if (activeLang && activeLang !== DEFAULT_LANG) {
      if (isPiBrowserEnv()) {
        applyDomTranslation(activeLang);
      } else {
        setTimeout(function () {
          if (!isGoogleTranslated() && getActiveLang() === activeLang) {
            if (tryGoogleWidget(activeLang)) {
              setTimeout(function () {
                if (!isGoogleTranslated() && getActiveLang() === activeLang) {
                  applyDomTranslation(activeLang);
                }
              }, 1200);
            } else {
              applyDomTranslation(activeLang);
            }
          }
        }, 900);
      }
    }
  }

  window.HokageI18n = {
    init: init,
    changeLanguage: changeLanguage,
    getActiveLang: getActiveLang,
    createHTML: createLanguageSelectorHTML
  };

  window.IsarI18n = window.HokageI18n;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
