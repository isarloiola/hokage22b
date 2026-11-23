/**
 * ============================================================
 * HOKAGE22B.COM — Shared Header & Mobile Drawer Component
 * ============================================================
 * Fonte única de verdade para o cabeçalho e menu mobile do portal.
 * Desktop: barra enxuta (sem corte em notebooks).
 * Mobile: barra limpa (Logo + Idioma + Pi + Hambúrguer) e
 *         drawer organizado em 3 grupos (Trilha, Ecossistema, Devs).
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const NAV_GROUPS = [
    {
      heading: 'Principal',
      items: [
        { href: 'explorar', match: ['explorar', 'diretorio'], label: '🌐 Explorar Pioneiros', desktopLabel: 'Explorar', color: '#34d399' },
        { href: 'mural', match: ['mural'], label: '🏘️ Classificados (A Vila)', desktopLabel: 'Classificados', color: 'var(--amber-light)' },
        { href: 'pioneiro', match: ['pioneiro'], label: '🪪 Passaporte (Meu Perfil)', desktopLabel: 'Passaporte', color: 'var(--accent-light)' },
        { href: 'zero', match: ['zero'], label: '📘 Aprender (Pi do Zero)', desktopLabel: 'Aprender', color: '#fde68a' }
      ]
    },
    {
      heading: 'Trilha & Jornada',
      items: [
        { href: 'um', match: ['um', 'alem-do-clique'], label: '🚀 Passo 1: Além do Clique', desktopLabel: null, color: 'var(--amber-light)' },
        { href: 'jornada', match: ['jornada'], label: '🧭 Começar Jornada', desktopLabel: null }
      ]
    },
    {
      heading: 'Ecossistema & Devs',
      items: [
        { href: 'monte', match: ['monte'], label: '🏔️ Monte Hokage', desktopLabel: null, color: '#fb923c' },
        { href: 'ferramentas', match: ['ferramentas'], label: '🛠️ Ferramentas Web3', desktopLabel: null, color: '#6ee7b7' },
        { href: 'vender', match: ['vender'], label: '🏷️ Como Vender', desktopLabel: null },
        { href: 'construir', match: ['construir', 'desenvolvedores'], label: '⚡ Construir (API & Devs)', desktopLabel: null }
      ]
    }
  ];

  function isPiBrowserEnv() {
    if (typeof window !== 'undefined' && window.HokagePi && typeof window.HokagePi.isPiBrowser === 'function') {
      return window.HokagePi.isPiBrowser();
    }
    const ua = (typeof navigator !== 'undefined' && (navigator.userAgent || navigator.vendor)) || '';
    if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;
    if (typeof window !== 'undefined') {
      if (window.PiNetwork || window.flutter_inappwebview) return true;
      if (window.location && (window.location.protocol === 'pi:' || (window.location.hostname && window.location.hostname.endsWith('.pi')))) return true;
    }
    return false;
  }

  function hasLoggedSession() {
    try {
      const raw = localStorage.getItem('hokage_pi_user') || '';
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && (parsed.username || parsed.authType === 'web2'));
    } catch (_) {
      return false;
    }
  }

  function getCurrentSlug() {
    const clean = (window.location.pathname || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.html$/i, '')
      .toLowerCase();
    return clean || 'index';
  }

  function buildDrawerHtml(current) {
    const drawerNav = NAV_GROUPS.map(function (group) {
      const links = group.items.map(function (item) {
        const isActive = item.match.indexOf(current) !== -1;
        const colorStyle = item.color ? ('color:' + item.color + ';') : '';
        const activeBg = isActive ? 'background:rgba(139,92,246,0.14);border-radius:10px;padding-left:8px;padding-right:8px;' : '';
        return '<a href="' + item.href + '" style="' + colorStyle + 'font-weight:700;' + activeBg + '"' +
          (isActive ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
      }).join('');
      return (
        '<div style="margin-bottom:10px">' +
          '<div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:#71717a;font-weight:800;padding:4px 6px">' + group.heading + '</div>' +
          links +
        '</div>'
      );
    }).join('');

    const authDrawerBtn = !hasLoggedSession()
      ? (isPiBrowserEnv()
          ? '<a href="pioneiro" class="portal-btn portal-btn--outline portal-btn--full" style="display:flex;align-items:center;justify-content:center;width:100%;padding:11px 16px;border-radius:12px;text-decoration:none;font-weight:700;margin-bottom:8px;border-color:rgba(139,92,246,0.45);color:#c4b5fd">⚡ Conectar no Pi Browser</a>'
          : '<a href="pioneiro?criar=1" class="portal-btn portal-btn--outline portal-btn--full" style="display:flex;align-items:center;justify-content:center;width:100%;padding:11px 16px;border-radius:12px;text-decoration:none;font-weight:700;margin-bottom:8px;border-color:rgba(56,189,248,0.45);color:#bae6fd">👤 Entrar / Criar Conta</a>')
      : '';

    return (
      '<div class="portal-drawer" id="portal-drawer" role="navigation" aria-label="Menu Mobile">' +
        '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.08)">' +
          '<span style="font-size:0.8rem;color:#a1a1aa;font-weight:600">🌐 Idioma / Language</span>' +
          '<div class="lang-mount-point"></div>' +
        '</div>' +
        '<div class="portal-drawer__nav">' + drawerNav + '</div>' +
        '<div style="padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);margin-top:8px">' +
          authDrawerBtn +
          '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--full" style="display:flex;align-items:center;justify-content:center;width:100%;padding:12px 16px;border-radius:12px;text-decoration:none;font-weight:800;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
            '🚀 Começar Minha Jornada' +
          '</a>' +
        '</div>' +
      '</div>'
    );
  }

  function injectHeaderMoreStyles() {
    if (document.getElementById('hk-nav-more-css')) return;
    const style = document.createElement('style');
    style.id = 'hk-nav-more-css';
    style.textContent =
      '.hk-nav-more{position:relative;list-style:none}' +
      '.hk-nav-more-btn{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.14);color:#e4e4e7;font-size:0.8rem;font-weight:700;padding:4px 10px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}' +
      '.hk-nav-more-btn:hover,.hk-nav-more-btn[aria-expanded="true"]{border-color:#8b5cf6;color:#fff;background:rgba(139,92,246,0.16)}' +
      '.hk-nav-more-menu{display:none;position:absolute;top:calc(100% + 8px);left:0;min-width:225px;background:rgba(14,14,20,0.98);border:1px solid rgba(139,92,246,0.38);border-radius:12px;padding:6px;box-shadow:0 18px 40px rgba(0,0,0,0.85);z-index:9999}' +
      '.hk-nav-more.open .hk-nav-more-menu{display:flex;flex-direction:column;gap:2px}' +
      '.hk-nav-more-menu a{display:block;padding:8px 10px;border-radius:8px;font-size:0.82rem;font-weight:700;color:#e4e4e7;text-decoration:none;white-space:nowrap}' +
      '.hk-nav-more-menu a:hover{background:rgba(139,92,246,0.16);color:#fff}';
    document.head.appendChild(style);
  }

  function injectStandaloneDrawerStyles() {
    if (document.getElementById('hk-standalone-drawer-css')) return;
    const style = document.createElement('style');
    style.id = 'hk-standalone-drawer-css';
    style.textContent =
      '.hk-burger-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;min-width:36px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.16);border-radius:10px;color:#f4f4f5;font-size:1.15rem;line-height:1;cursor:pointer;padding:0;margin:0;flex-shrink:0;transition:all 0.2s ease}' +
      '.hk-burger-btn:hover,.hk-burger-btn:focus-visible{border-color:#8b5cf6;background:rgba(139,92,246,0.18);color:#fff}' +
      '.hk-drawer-standalone .portal-drawer{display:none;position:fixed;top:64px;left:0;right:0;bottom:0;width:100vw;max-width:100vw;box-sizing:border-box;height:calc(100dvh - 64px);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(9,9,11,0.98);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,0.08);padding:16px 20px 80px;z-index:9999}' +
      '.hk-drawer-standalone .portal-drawer *{box-sizing:border-box;max-width:100%}' +
      '.hk-drawer-standalone .portal-drawer.active{display:block}' +
      '.hk-drawer-standalone .portal-drawer__nav{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}' +
      '.hk-drawer-standalone .portal-drawer__nav a{font-size:0.98rem;font-weight:700;color:#f4f4f5;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;text-decoration:none}';
    document.head.appendChild(style);
  }

  function bindDrawerEvents() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (burger && drawer && !burger.dataset.hkBound) {
      burger.dataset.hkBound = '1';
      function closeDrawer() {
        drawer.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        burger.textContent = '☰';
        document.body.style.overflow = '';
      }
      burger.addEventListener('click', function () {
        const isOpen = drawer.classList.toggle('active');
        burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        burger.textContent = isOpen ? '✕' : '☰';
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
      drawer.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeDrawer);
      });
      document.addEventListener('click', function (ev) {
        if (drawer.classList.contains('active') && !drawer.contains(ev.target) && !burger.contains(ev.target)) {
          closeDrawer();
        }
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && drawer.classList.contains('active')) {
          closeDrawer();
        }
      });
    }
  }

  function getHeaderUserChipHtml() {
    try {
      const raw = localStorage.getItem('hokage_pi_user') || '';
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.username) {
          const clean = String(parsed.username).trim().replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
          if (clean) {
            const isWebOnly = parsed.authType === 'web2' && !parsed.is_pi_verified;
            const chipStyle = isWebOnly
              ? 'white-space:nowrap;font-weight:700;text-decoration:none;border-color:rgba(56,189,248,0.45);color:#7dd3fc'
              : 'white-space:nowrap;font-weight:700;text-decoration:none;border-color:rgba(16,185,129,0.45);color:#6ee7b7';
            const chipIcon = isWebOnly ? '🌐' : '🟢';
            const chipTitle = isWebOnly ? 'Meu Passaporte Web' : 'Meu Passaporte Pi';
            return (
              '<a href="pioneiro?u=' + encodeURIComponent(clean) + '" class="portal-btn portal-btn--outline portal-btn--sm portal-btn--desktop-only" ' +
                'style="' + chipStyle + '" title="' + chipTitle + '">' +
                chipIcon + ' @' + clean +
              '</a>'
            );
          }
        } else if (parsed && parsed.authType === 'web2') {
          return (
            '<a href="pioneiro?setup=web2" class="portal-btn portal-btn--outline portal-btn--sm" ' +
              'style="white-space:nowrap;font-weight:700;text-decoration:none;border-color:rgba(56,189,248,0.45);color:#bae6fd" title="Finalizar meu Passaporte">' +
              '✨ Escolher @usuário' +
            '</a>'
          );
        }
      }
    } catch (_) {}
    if (!isPiBrowserEnv()) {
      return (
        '<a href="pioneiro?criar=1" class="portal-btn portal-btn--outline portal-btn--sm" ' +
          'style="white-space:nowrap;font-weight:700;text-decoration:none;border-color:rgba(56,189,248,0.45);color:#bae6fd" title="Entrar ou criar conta grátis">' +
          '👤 Entrar' +
        '</a>'
      );
    }
    return (
      '<a href="pioneiro" class="portal-btn portal-btn--outline portal-btn--sm" ' +
        'style="white-space:nowrap;font-weight:700;text-decoration:none;border-color:rgba(139,92,246,0.45);color:#c4b5fd" title="Conectar no Pi Browser">' +
        '⚡ Pi' +
      '</a>'
    );
  }

  function renderHeader() {
    const current = getCurrentSlug();
    const mount = document.getElementById('hk-site-header-root');
    const drawerOnlyMount = document.getElementById('hk-site-drawer-root');

    if (!mount) {
      if (drawerOnlyMount) {
        injectStandaloneDrawerStyles();
        drawerOnlyMount.classList.add('hk-drawer-standalone');
        drawerOnlyMount.innerHTML = buildDrawerHtml(current);
        bindDrawerEvents();
      }
      return;
    }

    const desktopItems = [];
    NAV_GROUPS.forEach(function (group) {
      group.items.forEach(function (item) {
        if (!item.desktopLabel) return;
        const isActive = item.match.indexOf(current) !== -1;
        const colorStyle = item.color ? ('color:' + item.color + ';') : '';
        const activeStyle = isActive
          ? 'text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px;'
          : '';
        desktopItems.push(
          '<li><a href="' + item.href + '" style="' + colorStyle + 'font-weight:700;white-space:nowrap;' + activeStyle + '"' +
            (isActive ? ' aria-current="page"' : '') + '>' + item.desktopLabel + '</a></li>'
        );
      });
    });

    const userChipHtml = getHeaderUserChipHtml();
    injectHeaderMoreStyles();

    const moreLinks = [
      { href: 'um', match: ['um', 'alem-do-clique'], label: '🚀 Passo 1: Além do Clique' },
      { href: 'jornada', match: ['jornada'], label: '🧭 Começar Jornada' },
      { href: 'monte', match: ['monte'], label: '🏔️ Monte Hokage' },
      { href: 'ferramentas', match: ['ferramentas'], label: '🛠️ Ferramentas Web3' },
      { href: 'vender', match: ['vender'], label: '🏷️ Como Vender' },
      { href: 'construir', match: ['construir', 'desenvolvedores'], label: '⚡ Construir (API & Devs)' }
    ].map(function (item) {
      const isActive = item.match.indexOf(current) !== -1;
      return '<a href="' + item.href + '"' + (isActive ? ' aria-current="page" style="background:rgba(139,92,246,0.18);color:#fff"' : '') + '>' + item.label + '</a>';
    }).join('');

    desktopItems.push(
      '<li class="hk-nav-more" id="hk-nav-more">' +
        '<button type="button" class="hk-nav-more-btn" id="hk-nav-more-btn" aria-expanded="false" aria-haspopup="true">Mais ▾</button>' +
        '<div class="hk-nav-more-menu" role="menu">' + moreLinks + '</div>' +
      '</li>'
    );

    mount.innerHTML =
      '<header class="portal-header" id="portal-header">' +
        '<div class="portal-container">' +
          '<div class="portal-header__inner">' +
            '<div class="portal-header__brand-group">' +
              '<a href="./" class="portal-brand" aria-label="HOKAGE22B Início" style="display:inline-flex;align-items:center;gap:9px">' +
                '<img src="assets/img/brand/hokage22b-logo.svg" alt="" width="22" height="22" aria-hidden="true" style="width:22px;height:22px;display:block;flex-shrink:0" />' +
                '<span>HOKAGE22B</span>' +
                '<span class="portal-brand__dot" aria-hidden="true"></span>' +
              '</a>' +
              '<nav class="portal-nav-desktop" aria-label="Navegação Principal">' +
                '<ul style="display:flex;list-style:none;margin:0;padding:0;gap:inherit;align-items:center">' +
                  desktopItems.join('') +
                '</ul>' +
              '</nav>' +
            '</div>' +
            '<div class="portal-header__actions">' +
              '<div class="lang-mount-point"></div>' +
              userChipHtml +
              '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--sm portal-btn--desktop-only" style="white-space:nowrap;font-weight:800;text-decoration:none;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
                '🚀 Jornada' +
              '</a>' +
              '<button type="button" class="portal-burger" id="portal-burger-btn" aria-label="Abrir Menu" aria-expanded="false">☰</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>' +
      buildDrawerHtml(current);

    const moreWrap = document.getElementById('hk-nav-more');
    const moreBtn = document.getElementById('hk-nav-more-btn');
    if (moreWrap && moreBtn) {
      moreBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const isOpen = moreWrap.classList.toggle('open');
        moreBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      document.addEventListener('click', function (ev) {
        if (moreWrap.classList.contains('open') && !moreWrap.contains(ev.target)) {
          moreWrap.classList.remove('open');
          moreBtn.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && moreWrap.classList.contains('open')) {
          moreWrap.classList.remove('open');
          moreBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    bindDrawerEvents();
  }

  renderHeader();
})();
