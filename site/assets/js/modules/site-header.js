/**
 * ============================================================
 * HOKAGE22B.COM — Shared Header & Mobile Drawer Component
 * ============================================================
 * Fonte única de verdade para páginas secundárias/novas
 * (monte, jornada, desenvolvedores, ferramentas), garantindo
 * o mesmo header, tradutor (.lang-mount-point) e CTA principal.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const NAV_ITEMS = [
    { href: 'index.html', match: ['index', ''], label: 'Início' },
    { href: 'zero', match: ['zero'], label: '📘 Pi do Zero', color: 'var(--amber-light)' },
    { href: 'um', match: ['um', 'alem-do-clique'], label: '🚀 Passo 1: Além do Clique', color: 'var(--amber-light)' },
    { href: 'pioneiro', match: ['pioneiro'], label: '🪪 Passaporte', color: 'var(--accent-light)' },
    { href: 'mural', match: ['mural'], label: '🏘️ A Vila (P2P)', color: 'var(--amber-light)' },
    { href: 'monte', match: ['monte'], label: '🏔️ Monte Hokage', color: '#fb923c' },
    { href: 'ferramentas', match: ['ferramentas'], label: '🛠️ Ferramentas', color: '#6ee7b7' },
    { href: 'construir', match: ['construir', 'desenvolvedores'], label: '⚡ Construir (Devs)' }
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

    const desktopLinks = NAV_ITEMS.map(function (item) {
      const isActive = item.match.indexOf(current) !== -1;
      const colorStyle = item.color ? ('color:' + item.color + ';') : '';
      const activeStyle = isActive
        ? 'text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px;'
        : '';
      return '<li><a href="' + item.href + '" style="' + colorStyle + 'font-weight:700;' + activeStyle + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' + item.label + '</a></li>';
    }).join('');

    const drawerLinks = NAV_ITEMS.map(function (item) {
      const isActive = item.match.indexOf(current) !== -1;
      const colorStyle = item.color ? ('color:' + item.color + ';') : '';
      const activeBg = isActive ? 'background:rgba(139,92,246,0.14);border-radius:10px;' : '';
      return '<a href="' + item.href + '" style="' + colorStyle + 'font-weight:700;' + activeBg + '"' +
        (isActive ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
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
                desktopLinks +
              '</nav>' +
            '</div>' +
            '<div class="portal-header__actions">' +
              '<div class="lang-mount-point"></div>' +
              '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--sm portal-btn--desktop-only" style="white-space:nowrap;font-weight:800;text-decoration:none;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
                '🚀 Começar Jornada' +
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
        '<div class="portal-drawer__nav">' + drawerLinks + '</div>' +
        '<div style="padding-top:14px;border-top:1px solid var(--border-subtle);margin-top:12px">' +
          '<a href="jornada" class="portal-btn portal-btn--primary portal-btn--full" style="text-decoration:none;font-weight:800;background:linear-gradient(135deg,#f97316,#f59e0b);color:#09090b">' +
            '🚀 Começar Minha Jornada' +
          '</a>' +
        '</div>' +
      '</div>';

    // Ajusta espaçamento superior do conteúdo principal para o header fixo
    const main = document.querySelector('main');
    if (main && !main.dataset.hkHeaderSpaced) {
      main.dataset.hkHeaderSpaced = '1';
      const cs = window.getComputedStyle(main);
      const padTop = parseFloat(cs.paddingTop || '0');
      if (padTop < 76) {
        main.style.paddingTop = '92px';
      }
    }

    // Bind do menu hambúrguer mobile
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (burger && drawer) {
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
