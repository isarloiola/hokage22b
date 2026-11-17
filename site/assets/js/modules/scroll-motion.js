/**
 * ============================================================
 * HOKAGE22B.COM — Module: Senior Scroll Motion & Reading Progress
 * ============================================================
 * Animações de scroll 60fps (GPU transform + opacity),
 * progressive enhancement (sem FOUC/elementos presos invisíveis),
 * stagger automático e respeito a prefers-reduced-motion.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injectStyles() {
    if (document.getElementById('hk-scroll-motion-styles')) return;
    const style = document.createElement('style');
    style.id = 'hk-scroll-motion-styles';
    style.textContent = `
      #hk-scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #8b5cf6 0%, #f59e0b 100%);
        transform-origin: left center;
        transform: scaleX(0);
        z-index: 9999;
        pointer-events: none;
        opacity: 0.9;
        will-change: transform;
      }
      .hk-motion-pending {
        opacity: 0;
        transform: translate3d(0, 18px, 0);
        transition:
          opacity 0.58s cubic-bezier(0.22, 1, 0.36, 1) var(--hk-delay, 0ms),
          transform 0.58s cubic-bezier(0.22, 1, 0.36, 1) var(--hk-delay, 0ms);
        will-change: opacity, transform;
      }
      .hk-motion-in {
        opacity: 1 !important;
        transform: translate3d(0, 0, 0) !important;
        will-change: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .hk-motion-pending {
          opacity: 1 !important;
          transform: none !important;
          transition: none !important;
        }
        #hk-scroll-progress {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initProgressBar() {
    if (REDUCED_MOTION || document.getElementById('hk-scroll-progress')) return;
    const bar = document.createElement('div');
    bar.id = 'hk-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    let ticking = false;
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || 0;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      bar.style.transform = 'scaleX(' + progress.toFixed(4) + ')';

      const header = document.getElementById('portal-header') || document.querySelector('header.navbar');
      if (header) {
        if (scrollTop > 24) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  function collectTargets() {
    const selectors = [
      'main > section',
      '.portal-section',
      '.tool-card',
      '.feature-card',
      '.product-card',
      '.ebook-card',
      '.pioneer-card',
      '.step-card',
      '.faq-item'
    ];
    const seen = new Set();
    const list = [];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (seen.has(el)) return;
        if (el.closest('header, nav, .portal-drawer, .hk-ref-overlay')) return;
        seen.add(el);
        list.push(el);
      });
    });
    return list;
  }

  function initReveal() {
    if (REDUCED_MOTION || !('IntersectionObserver' in window)) return;

    const targets = collectTargets();
    if (!targets.length) return;

    const foldY = window.innerHeight * 0.92;
    const toObserve = [];

    targets.forEach(function (el) {
      const rect = el.getBoundingClientRect();
      // Elementos já visíveis acima da dobra aparecem imediatamente (protege LCP)
      if (rect.top < foldY) {
        el.classList.add('hk-motion-in');
        return;
      }
      el.classList.add('hk-motion-pending');
      toObserve.push(el);
    });

    if (!toObserve.length) return;

    const observer = new IntersectionObserver(function (entries) {
      let batchIdx = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const delayMs = Math.min(batchIdx * 45, 225);
        batchIdx += 1;
        el.style.setProperty('--hk-delay', delayMs + 'ms');
        el.classList.add('hk-motion-in');
        observer.unobserve(el);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    toObserve.forEach(function (el) {
      observer.observe(el);
    });
  }

  function boot() {
    injectStyles();
    initProgressBar();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
