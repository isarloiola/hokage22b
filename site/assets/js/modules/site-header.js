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
      heading: 'Trilha',
      items: [
        { href: 'zero', match: ['zero'], label: '📘 Pi do Zero', desktopLabel: 'Pi do Zero', color: 'var(--amber-light)' },
        { href: 'um', match: ['um', 'alem-do-clique'], label: '🚀 Passo 1: Além do Clique', desktopLabel: 'Passo 1', color: 'var(--amber-light)' },
        { href: 'jornada', match: ['jornada'], label: '🧭 Começar Jornada', desktopLabel: null }
      ]
    },
    {
      heading: 'Ecossistema',
      items: [
        { href: 'pioneiro', match: ['pioneiro'], label: '🪪 Passaporte', desktopLabel: 'Passaporte', color: 'var(--accent-light)' },
        { href: 'mural', match: ['mural'], label: '🏘️ A Vila (P2P)', desktopLabel: 'A Vila (P2P)', color: 'var(--amber-light)' },
        { href: 'vender', match: ['vender'], label: '🏷️ Como Vender', desktopLabel: null },
        { href: 'monte', match: ['monte'], label: '🏔️ Monte Hokage', desktopLabel: 'Monte', color: '#fb923c' }
      ]
    },
    {
      heading: 'Ferramentas & Devs',
      items: [
        { href: 'ferramentas', match: ['ferramentas'], label: '🛠️ Ferramentas Web3', desktopLabel: 'Ferramentas', color: '#6ee7b7' },
        { href: 'construir', match: ['construir', 'desenvolvedores'], label: '⚡ Construir (API & Devs)', desktopLabel: 'Construir' }
      ]
    }
  ];

  function getCurrentSlug() {
    const clean = (window.location.pathname || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.html$/i, '')
      .toLowerCase();
    return clean || 'index';
  }

  function renderHeader() {
    const mount = document.getElementById('hk-site-header-root');
    if (!mount) return;

    const current = getCurrentSlug();

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

    const drawerHtml = NAV_GROUPS.map(function (group) {
      const links = group.items.map(function (item) {
        const isActive = item.match.indexOf(current) !== -1;
        const colorStyle = item.color ? ('color:' + item.color + ';') : '';
        const activeBg = isActive ? 'background:rgba(139,92,246,0.14);border-radius:10px;' : '';
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

    mount.innerHTML =
      '<header class="portal-header" id="portal-header">' +
        '<div class="portal-container">' +
          '<div class="portal-header__inner">' +
            '<div class="portal-header__brand-group">' +
              '<a href="index.html" class="portal-brand" aria-label="HOKAGE22B Início" style="display:inline-flex;align-items:center;gap:9px">' +
                '<img src="assets/img/brand/hokage22b-logo.svg" alt="" width="22" height="22" aria-hidden="true" style="width:22px;height:22px;display:block;flex-shrink:0" />' +
                '<span>HOKAGE22B</span>' +
                '<span class="portal-brand__dot" aria-hidden="true"></span>' +
              '</a>' +
              '<nav class="portal-nav-desktop" aria-label="Navegação Principal">' +
                desktopItems.join('') +
              '</nav>' +
            '</div>' +
            '<div class="portal-header__actions">' +
              '<div class="lang-mount-point"></div>' +
              '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--sm portal-btn--desktop-only" style="white-space:nowrap;font-weight:800;text-decoration:none;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
                '🚀 Jornada' +
              '</a>' +
              '<button type="button" class="portal-burger" id="portal-burger-btn" aria-label="Abrir Menu" aria-expanded="false">☰</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="portal-drawer" id="portal-drawer" role="navigation" aria-label="Menu Mobile">' +
        '<div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.08)">' +
          '<span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600">🌐 Idioma / Language</span>' +
          '<div class="lang-mount-point"></div>' +
        '</div>' +
        '<div class="portal-drawer__nav">' + drawerHtml + '</div>' +
        '<div style="padding-top:12px;border-top:1px solid var(--border-subtle);margin-top:8px">' +
          '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--full" style="text-decoration:none;font-weight:800;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
            '🚀 Começar Minha Jornada' +
          '</a>' +
        '</div>' +
      '</div>';

    const main = document.querySelector('main');
    if (main && !main.dataset.hkHeaderSpaced) {
      main.dataset.hkHeaderSpaced = '1';
      const cs = window.getComputedStyle(main);
      const padTop = parseFloat(cs.paddingTop || '0');
      if (padTop < 76) {
        main.style.paddingTop = '92px';
      }
    }

    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (burger && drawer && !burger.dataset.hkBound) {
      burger.dataset.hkBound = '1';
      function closeDrawer() {
        drawer.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        burger.textContent = '☰';
      }
      burger.addEventListener('click', function () {
        const isOpen = drawer.classList.toggle('active');
        burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        burger.textContent = isOpen ? '✕' : '☰';
      });
      drawer.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeDrawer);
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && drawer.classList.contains('active')) {
          closeDrawer();
        }
      });
    }
  }

  renderHeader();
})();
