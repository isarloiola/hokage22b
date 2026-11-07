// ============================================================
// HOKAGE22B — Module: Internationalization (i18n & Google Engine)
// Seletor multilíngue de alta fidelidade para comunidade global Pi Network
// ============================================================

(function () {
  'use strict';

  var COOKIE_NAME = 'googtrans';
  var STORAGE_KEY = 'hokage_selected_lang';
  var DEFAULT_LANG = 'pt';

  // Idiomas em destaque para a comunidade global Pi Network
  var LANGUAGES = [
    // Principais
    { code: 'pt', name: 'Português', flag: '🇧🇷', tag: 'PT', group: 'main' },
    { code: 'en', name: 'English', flag: '🇺🇸', tag: 'EN', group: 'main' },
    { code: 'es', name: 'Español', flag: '🇪🇸', tag: 'ES', group: 'main' },
    // Comunidades Pi Fortes (Ásia, Américas, Europa, África)
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
    var domain = window.location.hostname;
    // Define cookie para o host local e para o domínio raiz se aplicável
    document.cookie = name + '=' + value + expires + '; path=/; SameSite=Lax';
    if (domain.includes('hokage22b.com')) {
      document.cookie = name + '=' + value + expires + '; path=/; domain=.hokage22b.com; SameSite=Lax';
    }
  }

  function deleteCookie(name) {
    var domain = window.location.hostname;
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + domain + '; SameSite=Lax';
    if (domain.includes('hokage22b.com')) {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.hokage22b.com; SameSite=Lax';
    }
  }

  function detectBrowserLanguage() {
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (!navLang || navLang.startsWith('pt')) return null;

    // Procura correspondência exata ou por prefixo (ex: 'en-US' -> 'en')
    for (var i = 0; i < LANGUAGES.length; i++) {
      var l = LANGUAGES[i];
      if (l.code === 'pt') continue;
      if (navLang === l.code.toLowerCase() || navLang.startsWith(l.code.toLowerCase() + '-')) {
        return l.code;
      }
    }
    // Se o navegador for em qualquer outro idioma estrangeiro, prioriza inglês (língua franca do X)
    return 'en';
  }

  function checkAutoDetect() {
    var stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (_) {}
    var cookie = getCookie(COOKIE_NAME);

    // Se o usuário nunca escolheu manualmente e não tem cookie:
    if (!stored && !cookie) {
      var detected = detectBrowserLanguage();
      if (detected && detected !== 'pt') {
        try {
          localStorage.setItem(STORAGE_KEY, detected);
        } catch (_) {}
        setCookie(COOKIE_NAME, '/pt/' + detected, 30);
        setCookie('googtrans', '/pt/' + detected, 30);
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

  function changeLanguage(langCode) {
    try {
      localStorage.setItem(STORAGE_KEY, langCode);
    } catch (_) {}

    if (langCode === 'pt') {
      deleteCookie(COOKIE_NAME);
      deleteCookie('googtrans');
      // Recarrega sem parâmetros para voltar ao original
      window.location.reload();
      return;
    }

    // Configura o cookie reconhecido pelo Google Translate
    setCookie(COOKIE_NAME, '/pt/' + langCode, 30);
    setCookie('googtrans', '/pt/' + langCode, 30);

    // Tenta disparar evento direto se o elemento do google já existir
    var combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = langCode;
      combo.dispatchEvent(new Event('change'));
      updateUIState(langCode);
    } else {
      window.location.reload();
    }
  }

  function updateUIState(activeLang) {
    // Atualiza botões de trigger
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
    });

    // Atualiza classes ativas dentro dos dropdowns
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

    var html = '<div class="lang-selector" id="hokage-lang-selector">';
    html += '<button type="button" class="lang-btn-trigger" aria-label="Alterar idioma / Change Language" aria-expanded="false">';
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
    // Cria div oculta para o Google Translate
    if (!document.getElementById('google_translate_element')) {
      var div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);
    }

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement({
        pageLanguage: 'pt',
        includedLanguages: 'en,es,vi,zh-CN,ko,ja,id,tl,fr,de,ru,ar,tr,hi,it,pt',
        autoDisplay: false
      }, 'google_translate_element');
    };

    // Carrega script do Google Translate de forma assíncrona
    if (!document.getElementById('google-translate-script')) {
      var s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.head.appendChild(s);
    }
  }

  function bindEvents() {
    // Abrir/Fechar Dropdown
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
        }
        return;
      }

      // Clicou fora: fecha qualquer seletor aberto
      document.querySelectorAll('.lang-selector.open').forEach(function (s) {
        s.classList.remove('open');
        var tr = s.querySelector('.lang-btn-trigger');
        if (tr) tr.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function init() {
    // Detecta automaticamente se for visitante estrangeiro pela primeira vez
    checkAutoDetect();

    // Carrega script do Google
    initGoogleScript();

    // Injeta componente nos locais desejados se ainda não existir
    var containers = document.querySelectorAll('.lang-mount-point');
    containers.forEach(function (c) {
      if (!c.querySelector('.lang-selector')) {
        c.innerHTML = createLanguageSelectorHTML();
      }
    });

    bindEvents();
    updateUIState(getActiveLang());
  }

  // API pública
  window.HokageI18n = {
    init: init,
    changeLanguage: changeLanguage,
    getActiveLang: getActiveLang,
    createHTML: createLanguageSelectorHTML
  };

  // Compatibilidade com window.IsarI18n
  window.IsarI18n = window.HokageI18n;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
