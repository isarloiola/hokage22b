/**
 * ============================================================
 * HOKAGE22B.COM — Portal Master Controller (v2.0)
 * ============================================================
 * Gerencia as interações da homepage, formulários reais de captura,
 * download transparente do manual e propostas comerciais.
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (window.HokageUtils && typeof window.HokageUtils.escapeHtml === 'function') {
      return window.HokageUtils.escapeHtml(str);
    }
    if (!str || typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const cfg = window.HOKAGE_CONFIG || {};

  // ─── 1. Menu Mobile Drawer ─────────────────────────────────
  function closeMobileDrawer() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (drawer) drawer.classList.remove('active');
    if (burger) {
      burger.setAttribute('aria-expanded', 'false');
      burger.innerHTML = '☰';
    }
    document.body.style.overflow = '';
  }

  function initMobileDrawer() {
    const burger = document.getElementById('portal-burger-btn');
    const drawer = document.getElementById('portal-drawer');
    if (!burger || !drawer || burger.dataset.hkBound) return;
    burger.dataset.hkBound = '1';

    burger.addEventListener('click', function () {
      const isOpen = drawer.classList.contains('active');
      drawer.classList.toggle('active', !isOpen);
      if (!isOpen) drawer.scrollTop = 0;
      burger.setAttribute('aria-expanded', !isOpen);
      burger.innerHTML = isOpen ? '☰' : '✕';
      // Controla a rolagem no body de forma segura
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Fecha ao clicar em um link interno
    const drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(function (link) {
      link.addEventListener('click', closeMobileDrawer);
    });

    // Fecha ao clicar fora do drawer
    document.addEventListener('click', function (e) {
      if (drawer.classList.contains('active') && !drawer.contains(e.target) && !burger.contains(e.target)) {
        closeMobileDrawer();
      }
    });

    // Fecha dropdown "Mais" do header na home ao clicar fora ou pressionar Escape
    const homeMore = document.querySelector('details.hk-home-more');
    if (homeMore && !homeMore.dataset.hkMoreBound) {
      homeMore.dataset.hkMoreBound = '1';
      document.addEventListener('click', function (e) {
        if (homeMore.open && !homeMore.contains(e.target)) {
          homeMore.open = false;
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && homeMore.open) {
          homeMore.open = false;
        }
      });
    }
  }

  // ─── 2. Modais (Manual, Proposta Comercial, Parceria) ─────
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function initModals() {
    // Trata fechamento por botão ✕ e clique no backdrop
    const overlays = document.querySelectorAll('.portal-modal-overlay');
    overlays.forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        }
      });
    });

    const closeBtns = document.querySelectorAll('.portal-modal-close');
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const modal = btn.closest('.portal-modal-overlay');
        if (modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        }
      });
    });

    if (!window._hkPortalEscBound) {
      window._hkPortalEscBound = true;
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        let closedAny = false;
        document.querySelectorAll('.portal-modal-overlay.active').forEach(function (modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
          closedAny = true;
        });
        const drawer = document.getElementById('portal-drawer');
        if (drawer && drawer.classList.contains('active')) {
          closeMobileDrawer();
          closedAny = true;
        }
        if (closedAny) {
          document.body.style.overflow = '';
        }
      });
    }
  }

  // ─── 3. Formulário Real de Newsletter ──────────────────────
  function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');
    const submitBtn = document.getElementById('newsletter-submit-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('newsletter-name');
      const emailInput = document.getElementById('newsletter-email');
      const consentInput = document.getElementById('newsletter-consent');
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

      // Validação básica de e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, informe um endereço de e-mail válido.';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (consentInput && !consentInput.checked) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Marque a caixa de consentimento para confirmar sua inscrição (LGPD).';
        }
        consentInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando…';
      }

      const payload = {
        name: name || 'Leitor HOKAGE22B',
        email: email,
        source: 'newsletter-hokage22b',
        timestamp: new Date().toISOString()
      };

      // 1. Envio para Google Apps Script Webhook
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function (err) {
          console.warn('Google Sheets sync info:', err);
        });
      } catch (_) {}

      // 2. Envio para Supabase
      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead(payload);
        } catch (_) {}
      }

      // 3. Salva no localStorage para reconhecer o usuário
      try {
        localStorage.setItem('hokage_subscriber', JSON.stringify(payload));
      } catch (_) {}

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Inscrição confirmada com sucesso! Você receberá nossos comunicados editoriais.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Inscrito com Sucesso!';
      }
    });
  }

  // ─── 4. Formulário de Parceria / Proposta Comercial ─────────
  function initPartnerProposal() {
    const form = document.getElementById('proposal-form');
    const feedback = document.getElementById('proposal-feedback');
    const submitBtn = document.getElementById('proposal-submit-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const name = (document.getElementById('prop-name') || {}).value || '';
      const email = (document.getElementById('prop-email') || {}).value || '';
      const company = (document.getElementById('prop-company') || {}).value || '';
      const category = (document.getElementById('prop-category') || {}).value || 'Parceria';
      const message = (document.getElementById('prop-message') || {}).value || '';

      const emailClean = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailClean || !emailRegex.test(emailClean) || !message.trim()) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Informe um e-mail válido e uma mensagem sobre a proposta.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando proposta…';
      }

      const payload = {
        name: name.trim() || company.trim() || 'Parceiro HOKAGE22B',
        email: emailClean,
        company: company,
        category: category,
        message: message,
        source: ('proposta-' + String(category || 'comercial')).slice(0, 60),
        timestamp: new Date().toISOString()
      };

      // Dispara para o webhook
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead({
            name: payload.name,
            email: payload.email,
            source: payload.source
          });
        } catch (_) {}
      }

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Proposta enviada com sucesso! Nossa equipe entrará em contato em até 48 horas.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Proposta Enviada';
      }

      setTimeout(function () {
        closeModal('modal-proposta');
        if (submitBtn) submitBtn.textContent = 'Enviar Proposta';
      }, 2500);
    });
  }

  // ─── 5. Formulário de Lista de Espera da Comunidade ────────
  function initCommunityWaitlist() {
    const form = document.getElementById('community-waitlist-form');
    const feedback = document.getElementById('community-waitlist-feedback');
    const submitBtn = document.getElementById('community-waitlist-btn');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const emailInput = document.getElementById('community-email');
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, informe um endereço de e-mail válido.';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Cadastrando…';
      }

      const payload = {
        name: 'Lista Comunidade HOKAGE22B',
        email: email,
        source: 'waitlist-comunidade-propria',
        timestamp: new Date().toISOString()
      };

      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead({
            name: payload.name,
            email: payload.email,
            source: payload.source
          });
        } catch (_) {}
      }

      if (feedback) {
        feedback.className = 'newsletter-feedback newsletter-feedback--success';
        feedback.textContent = '✓ Você está na lista de espera! Notificaremos você em primeira mão.';
      }

      form.reset();
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Inscrito na Lista!';
      }
    });
  }

  // ─── 6. Captura de Lead para Desbloqueio do Manual ─────────
  function initManualLeadUnlock() {
    const form = document.getElementById('manual-lead-form');
    const leadBox = document.getElementById('manual-lead-box');
    const dlLinks = document.getElementById('manual-download-links');
    const feedback = document.getElementById('manual-lead-feedback');
    const submitBtn = document.getElementById('manual-lead-btn');

    // Se o usuário já desbloqueou anteriormente, mostra direto os links
    try {
      const unlocked = localStorage.getItem('hokage_lead_unlocked');
      if (unlocked && leadBox && dlLinks) {
        leadBox.style.display = 'none';
        dlLinks.style.display = 'block';
      }
    } catch (_) {}

    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const nameInput = document.getElementById('manual-lead-name');
      const emailInput = document.getElementById('manual-lead-email');
      const consentInput = document.getElementById('manual-lead-consent');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim().toLowerCase() : '';

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, informe um endereço de e-mail válido.';
        }
        if (emailInput) emailInput.focus();
        return;
      }

      if (consentInput && !consentInput.checked) {
        if (feedback) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error';
          feedback.textContent = 'Por favor, confirme a caixinha de consentimento para prosseguir.';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Liberando seu download…';
      }

      const payload = {
        name: name || 'Leitor do Manual',
        email: email,
        source: 'manual-pi-download',
        timestamp: new Date().toISOString()
      };

      // 1. Envia para Google Sheets
      const sheetsUrl = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbznz-l1_Y5VKkBiPuRDT-1CJ-kII1Ll1sZ5P_Lpq7Ezb-ZjXVa8vFVNf1batKL_jlIDzA/exec';
      try {
        fetch(sheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).catch(function () {});
      } catch (_) {}

      // 2. Salva no Supabase se disponível
      if (window.IsarDB && window.IsarDB.saveLead) {
        try {
          await window.IsarDB.saveLead(payload);
        } catch (_) {}
      }

      // 3. Salva desbloqueio no localStorage
      try {
        localStorage.setItem('hokage_lead_unlocked', 'true');
        localStorage.setItem('hokage_subscriber', JSON.stringify(payload));
      } catch (_) {}

      // 4. Transição visual: oculta formulário e exibe botões de download
      if (leadBox && dlLinks) {
        leadBox.style.display = 'none';
        dlLinks.style.display = 'block';
      }

      // 5. Inicia o download do PDF automaticamente
      const pdfBtn = document.getElementById('btn-dl-pdf');
      if (pdfBtn) {
        setTimeout(function () {
          pdfBtn.click();
        }, 800);
      }
    });
  }

  // ─── 7. Pagamento do E-book via Pi Browser ────────────────
  function payEbookWithPi(productId) {
    const prodKey = productId === 'ia-na-pratica' ? 'ia-na-pratica' : 'pi-para-seu-negocio';
    const productsCfg = (window.HOKAGE_CONFIG && window.HOKAGE_CONFIG.products) || {};
    const prod = productsCfg[prodKey] || {
      pricePiValue: prodKey === 'ia-na-pratica' ? 7.5 : 3.14,
      title: prodKey === 'ia-na-pratica' ? 'IA na Prática' : 'Pi para seu negócio'
    };

    if (
      window.HokagePi &&
      typeof window.HokagePi.requestPiPayment === 'function' &&
      typeof window.HokagePi.isPiBrowser === 'function' &&
      window.HokagePi.isPiBrowser()
    ) {
      window.HokagePi.requestPiPayment({
        amount: prod.pricePiValue,
        memo: 'HOKAGE22B E-book: ' + prod.title,
        metadata: { type: 'ebook', productId: prodKey },
        onSuccess: function () {
          if (typeof window.HokagePi.syncOwnedEbooksUi === 'function') {
            window.HokagePi.syncOwnedEbooksUi();
          }
          const box = document.getElementById('pi-owned-library-' + prodKey);
          if (box) {
            box.style.display = 'block';
            box.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        },
        onError: function () {}
      });
      return;
    }

    openModal('modal-pagamento-pi');
  }

  // ─── 8. Prévia Ao Vivo da Vila na Home (Zero Anúncios Fake) ─
  async function initHomeVilaLivePreview() {
    const grid = document.getElementById('home-vila-live-grid');
    if (!grid) return;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    try {
      const [vilaRes, passRes] = await Promise.all([
        fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/public-api/v1/vila?limit=6'),
        fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/public-api/v1/passaportes?limit=15').catch(function () { return null; })
      ]);
      const json = await vilaRes.json().catch(function () { return {}; });
      const vilaItems = (json && json.data && Array.isArray(json.data.items))
        ? json.data.items
        : (Array.isArray(json.items) ? json.items : []);

      let passItems = [];
      if (passRes && passRes.ok) {
        const passJson = await passRes.json().catch(function () { return {}; });
        passItems = (passJson && passJson.data && Array.isArray(passJson.data.items))
          ? passJson.data.items
          : (Array.isArray(passJson.items) ? passJson.items : []);
      }

      const seenTitles = new Set();
      vilaItems.forEach(function (ad) {
        const rawAuthor = (ad.author && typeof ad.author === 'object')
          ? (ad.author.handle || ad.author.username || '')
          : (ad.author || ad.author_username || '');
        const s = String(rawAuthor).replace(/^@+/, '').toLowerCase();
        const t = String(ad.title || '').trim().toLowerCase();
        if (s && t) seenTitles.add(s + '::' + t);
      });

      const vitrineItems = [];
      passItems.forEach(function (prof) {
        const handle = String((prof && prof.username) || '').replace(/^@+/, '').toLowerCase();
        if (!handle || !Array.isArray(prof.products)) return;
        let countForSeller = 0;
        prof.products.forEach(function (prod) {
          if (countForSeller >= 4) return;
          const title = String((prod && prod.title) || '').trim();
          if (!title || seenTitles.has(handle + '::' + title.toLowerCase())) return;
          const price = String((prod && prod.price) || '').trim();
          const priceFiat = String((prod && prod.price_fiat) || '').trim();
          const hasPi = /π|\bpi\b/i.test(price);
          const hasFiat = Boolean(priceFiat) || /^(R\$|\$|€|USD|EUR|BRL)/i.test(price);
          const payMode = (hasPi && hasFiat) ? 'pi_fiat' : (hasFiat ? 'fiat' : 'pi');
          const combinedPrice = (price && priceFiat) ? (price + ' + ' + priceFiat) : (price || priceFiat || '');
          vitrineItems.push({
            id: 'vitrine_' + handle + '_' + countForSeller,
            is_vitrine_product: true,
            plan_tier: 'vitrine',
            author: handle,
            title: title,
            description: (prod && prod.description) || ((prod && prod.badge ? prod.badge + ' · ' : '') + 'Disponível no catálogo de @' + handle),
            payment_modes: payMode,
            item_price: combinedPrice,
            image_url: (prod && prod.image_url) || ''
          });
          countForSeller++;
        });
      });

      const items = vilaItems.concat(vitrineItems);

      if (!items.length) {
        grid.innerHTML =
          '<div style="grid-column:1/-1;text-align:center;padding:36px 20px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(245,158,11,0.28)">' +
            '<div style="font-size:2rem;margin-bottom:8px">🏘️</div>' +
            '<h3 style="color:#fff;margin:0 0 6px;font-size:1.1rem">Nenhum anúncio ativo no momento</h3>' +
            '<p style="color:var(--text-secondary);font-size:0.88rem;max-width:480px;margin:0 auto 14px">Publique gratuitamente ou destaque seu produto, serviço ou vaga na Vila em segundos.</p>' +
            '<a href="mural?publish=1" class="portal-btn portal-btn--amber portal-btn--sm">📢 Publicar Primeiro Anúncio</a>' +
          '</div>';
        return;
      }

      const maxItems = Math.max(1, parseInt(grid.getAttribute('data-limit') || '6', 10) || 6);
      grid.innerHTML = items.slice(0, maxItems).map(function (ad) {
        const isVitrine = Boolean(ad.is_vitrine_product);
        const rawTier = String(ad.plan_tier || ad.tier || ad.plan || 'bronze').toLowerCase();
        const tier = isVitrine ? 'vitrine' : (['ouro', 'prata', 'bronze', 'gratis'].includes(rawTier) ? rawTier : 'bronze');
        const rawAuthorObj = (ad.author && typeof ad.author === 'object')
          ? (ad.author.handle || ad.author.username || '@pioneiro')
          : (ad.author || ad.author_username || '@pioneiro');
        const authorRaw = String(rawAuthorObj).replace(/^@+/, '') || 'pioneiro';
        const badgeLabel = isVitrine ? '🪪 Catálogo Hokage ID'
          : (tier === 'ouro' ? '👑 Destaque Ouro VIP'
            : tier === 'prata' ? '🥈 Destaque Prata'
            : tier === 'gratis' ? '🌱 Comunidade' : '🥉 Classificado Bronze');

        const rawPay = String(ad.payment_modes || 'pi').toLowerCase();
        const payBadgeHtml = (rawPay === 'pi_fiat' || rawPay === 'pi_reais')
          ? '<span style="font-size:0.68rem;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.32);color:#fcd34d;padding:2px 7px;border-radius:999px;font-weight:700">⚡💵 Pi + Moeda</span>'
          : ((rawPay === 'fiat' || rawPay === 'reais')
            ? '<span style="font-size:0.68rem;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.32);color:#6ee7b7;padding:2px 7px;border-radius:999px;font-weight:700">💵 Só Moeda</span>'
            : '<span style="font-size:0.68rem;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.32);color:#ddd6fe;padding:2px 7px;border-radius:999px;font-weight:700">⚡ Somente Pi</span>');

        const rawPriceStr = ad.item_price != null ? String(ad.item_price).trim() : '';
        let itemPriceText = '';
        if (rawPriceStr) {
          if (rawPriceStr.indexOf('π') !== -1 || rawPriceStr.indexOf('+') !== -1 || /^(R\$|\$|€|USD|EUR|BRL)/i.test(rawPriceStr)) {
            itemPriceText = esc(rawPriceStr);
          } else {
            const n = parseFloat(rawPriceStr.replace(',', '.'));
            const curr = String(ad.item_currency || 'PI').toUpperCase();
            if (Number.isFinite(n) && n > 0) {
              itemPriceText = curr === 'PI'
                ? esc(Number(n.toFixed(4)).toString() + ' π')
                : (curr === 'BRL' ? esc('R$ ' + n.toFixed(2).replace('.', ',')) : esc((curr === 'USD' ? 'US$ ' : (curr === 'EUR' ? '€ ' : curr + ' ')) + n.toFixed(2)));
            }
          }
        }
        const targetHref = isVitrine
          ? ('mural?seller=' + encodeURIComponent(authorRaw))
          : ('mural?ad=' + encodeURIComponent(ad.id || ''));
        const ctaLabel = isVitrine ? 'Ver na Vila →' : 'Ver Oferta na Vila →';
        const safeImg = (ad.image_url && /^https?:\/\//i.test(ad.image_url)) ? esc(ad.image_url) : '';
        const bannerHtml = safeImg
          ? '<div class="pioneer-card__banner"><img src="' + safeImg + '" alt="' + esc(ad.title || '') + '" loading="lazy" /></div>'
          : '';
        return (
          '<article class="pioneer-card pioneer-card--' + tier + '">' +
            bannerHtml +
            '<div class="pioneer-card__top">' +
              '<span class="pioneer-card__badge pioneer-badge--' + tier + '">' + badgeLabel + '</span>' +
              '<a href="pioneiro?u=' + encodeURIComponent(authorRaw) + '" class="pioneer-card__author">@' + esc(authorRaw) + '</a>' +
            '</div>' +
            '<h3 class="pioneer-card__title">' + esc(ad.title || '') + '</h3>' +
            '<p class="pioneer-card__desc">' + esc(String(ad.description || '').slice(0, 140)) + '</p>' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
              payBadgeHtml +
            '</div>' +
            '<div class="pioneer-card__footer">' +
              '<a href="' + targetHref + '" class="pioneer-card__link">' + ctaLabel + '</a>' +
              (itemPriceText ? '<span class="pioneer-card__price-tag">' + itemPriceText + '</span>' : '') +
            '</div>' +
          '</article>'
        );
      }).join('');
    } catch (_) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:28px 16px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1)">' +
          '<p style="color:var(--text-secondary);margin:0 0 12px;font-size:0.9rem">Acesse A Vila para conferir as ofertas e oportunidades em tempo real.</p>' +
          '<a href="mural" class="portal-btn portal-btn--amber portal-btn--sm">🏘️ Abrir A Vila →</a>' +
        '</div>';
    }
  }

  // ─── 8B. Prévia Ao Vivo do Hokage Business na Home ────────
  async function initHomeBusinessPreview() {
    const grid = document.getElementById('home-business-live-grid');
    if (!grid) return;

    const apiUrl = (cfg.businessApiUrl || 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/business-api') + '?action=list';
    const fallbackRows = [
      {
        name: 'HOKAGE22B Oficial',
        tagline: 'Empresa #01 Piloto · Ecossistema Web3, E-books & A Vila',
        asset_code: 'HKG22B',
        token_network: 'testnet',
        verification_level: 2,
        owner_username: '@hokage22b',
        benefits: [
          { id: 'pilot-benefit-redeem' },
          { id: 'pilot-benefit-hold' }
        ]
      }
    ];

    let rows = [];
    try {
      const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json().catch(function () { return {}; });
        rows = (json && json.data && Array.isArray(json.data.businesses)) ? json.data.businesses : [];
      }
    } catch (_) {}

    if (!rows.length) rows = fallbackRows;

    const cardsHtml = rows.slice(0, 2).map(function (b) {
      const name = escapeHtml(String(b.name || 'Negócio Hokage Business'));
      const tagline = escapeHtml(String(b.tagline || b.utility_summary || 'Negócio com utilidade comercial verificada na rede Pi.').slice(0, 120));
      const assetCode = escapeHtml(String(b.asset_code || 'TOKEN').toUpperCase());
      const netLabel = String(b.token_network || 'testnet').toLowerCase() === 'mainnet' ? 'Mainnet' : 'Testnet';
      const level = Number(b.verification_level || 1);
      const levelBadge = level >= 3
        ? '<span style="font-size:0.66rem;background:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.42);color:#fde68a;padding:2px 8px;border-radius:999px;font-weight:700">🏆 Nível 3 · Auditado</span>'
        : (level === 2
          ? '<span style="font-size:0.66rem;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.38);color:#34d399;padding:2px 8px;border-radius:999px;font-weight:700">✓ Verificado</span>'
          : '<span style="font-size:0.66rem;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.38);color:#c4b5fd;padding:2px 8px;border-radius:999px;font-weight:700">● Ativo</span>');
      const rawOwner = String(b.owner_username || '@hokage22b').replace(/^@+/, '');
      const ownerEsc = escapeHtml(rawOwner);
      const benefitsCount = Array.isArray(b.benefits) ? b.benefits.length : Number(b.benefitsCount || 0);
      const benefitsLabel = benefitsCount === 1 ? '1 benefício ativo' : (benefitsCount > 1 ? benefitsCount + ' benefícios ativos' : 'Utilidade comercial');

      return (
        '<article style="background:rgba(18,22,26,0.92);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:10px">' +
          '<div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
              levelBadge +
              '<span style="font-size:0.7rem;font-weight:800;color:#6ee7b7;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.28);padding:2px 8px;border-radius:999px">$' + assetCode + ' · ' + escapeHtml(netLabel) + '</span>' +
            '</div>' +
            '<h4 style="margin:0 0 4px;font-size:1rem;font-weight:800;color:#fff">' + name + '</h4>' +
            '<p style="font-size:0.8rem;color:var(--text-secondary);margin:0;line-height:1.45">' + tagline + '</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07)">' +
            '<span style="font-size:0.76rem;color:#a1a1aa">@' + ownerEsc + ' · ' + escapeHtml(benefitsLabel) + '</span>' +
            '<a href="business" class="portal-btn portal-btn--outline portal-btn--sm" style="border-color:rgba(16,185,129,0.45);color:#6ee7b7;text-decoration:none">Ver Benefícios →</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    const ctaCardHtml =
      '<article style="background:linear-gradient(155deg,rgba(16,185,129,0.12),rgba(20,20,28,0.92));border:1px dashed rgba(16,185,129,0.45);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">' +
        '<div>' +
          '<strong style="color:#34d399;font-size:0.95rem;display:block;margin-bottom:4px">🏢 Tem uma loja, barbearia ou serviço?</strong>' +
          '<p style="font-size:0.8rem;color:var(--text-secondary);margin:0;line-height:1.45">Cadastre seu negócio, crie vouchers não-custodiais e fidelize clientes com tokens na rede Pi.</p>' +
        '</div>' +
        '<a href="business" class="portal-btn portal-btn--outline portal-btn--sm" style="justify-content:center;text-decoration:none;border-color:rgba(16,185,129,0.55);color:#6ee7b7">Cadastrar no Hokage Business →</a>' +
      '</article>';

    grid.innerHTML = cardsHtml + ctaCardHtml;
  }

  // ─── 8C. Prévia Ao Vivo de Passaportes & Diretório na Home ─
  async function initHomePioneersPreview() {
    const grid = document.getElementById('home-pioneers-live-grid');
    if (!grid) return;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    try {
      const res = await fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/public-api/v1/passaportes?limit=6');
      const json = await res.json().catch(function () { return {}; });
      const items = (json && json.data && Array.isArray(json.data.items))
        ? json.data.items
        : (Array.isArray(json.items) ? json.items : []);

      const maxItems = Math.max(1, parseInt(grid.getAttribute('data-limit') || '5', 10) || 5);
      const cardsHtml = items.slice(0, maxItems).map(function (p) {
        const cleanHandle = String(p.username || p.handle || 'pioneiro').replace(/^@+/, '');
        const initial = esc(cleanHandle.charAt(0).toUpperCase() || 'P');
        const safeAvatar = (p.avatar_url && /^https?:\/\//i.test(p.avatar_url)) ? esc(p.avatar_url) : '';
        const bio = esc(String(p.bio || 'Pioneiro verificado no ecossistema HOKAGE22B aceitando Pi na Mainnet.').slice(0, 110));
        const hasWallet = Boolean(p.wallet_address);
        const tier = String(p.journey_tier || '').toLowerCase();
        const isPiVerified = p.is_pi_verified !== false;
        const verifiedPill = isPiVerified
          ? '<span style="font-size:0.65rem;background:rgba(16,185,129,0.14);border:1px solid rgba(16,185,129,0.38);color:#34d399;padding:1px 7px;border-radius:999px;font-weight:700">✓ Pi Verificado</span>'
          : '<span style="font-size:0.65rem;background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.38);color:#7dd3fc;padding:1px 7px;border-radius:999px;font-weight:700">🌐 Membro Web</span>';
        const avatarHtml = safeAvatar
          ? '<img src="' + safeAvatar + '" alt="@' + esc(cleanHandle) + '" style="width:100%;height:100%;object-fit:cover" loading="lazy" />'
          : '<span style="font-size:1.1rem;font-weight:800;color:#fff">' + initial + '</span>';

        return (
          '<article style="background:rgba(20,20,28,0.88);border:1px solid rgba(139,92,246,0.28);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">' +
            '<div style="display:flex;align-items:center;gap:12px;min-width:0">' +
              '<div style="width:48px;height:48px;border-radius:50%;overflow:hidden;background:#1a0533;border:2px solid rgba(139,92,246,0.45);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + avatarHtml + '</div>' +
              '<div style="min-width:0;flex:1">' +
                '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
                  '<strong class="notranslate" translate="no" style="color:#fff;font-size:0.95rem">@' + esc(cleanHandle) + '</strong>' +
                  verifiedPill +
                  (tier === 'hokage' ? '<span style="font-size:0.65rem;background:rgba(249,115,22,0.16);border:1px solid rgba(249,115,22,0.45);color:#fb923c;padding:1px 7px;border-radius:999px;font-weight:700">🔥 Hokage</span>' : '') +
                  (hasWallet ? '<span style="font-size:0.65rem;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;padding:1px 7px;border-radius:999px;font-weight:700">⚡ Pi</span>' : '') +
                '</div>' +
                '<p style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0 0;line-height:1.4">' + bio + '</p>' +
              '</div>' +
            '</div>' +
            '<a href="pioneiro?u=' + encodeURIComponent(cleanHandle) + '" class="portal-btn portal-btn--outline portal-btn--sm" style="justify-content:center;text-decoration:none">Ver Hokage ID ↗</a>' +
          '</article>'
        );
      }).join('');

      const ctaCardHtml =
        '<article style="background:linear-gradient(155deg,rgba(16,185,129,0.12),rgba(139,92,246,0.14));border:1px dashed rgba(16,185,129,0.48);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">' +
          '<div>' +
            '<strong style="color:#34d399;font-size:0.95rem;display:block;margin-bottom:4px">+ Quer vender ou aparecer com confiança?</strong>' +
            '<p style="font-size:0.8rem;color:var(--text-secondary);margin:0;line-height:1.45">Ative seu Hokage ID, monte seu catálogo de produtos e conecte suas ofertas na Vila sem taxas abusivas.</p>' +
          '</div>' +
          '<a href="pioneiro?criar=1" class="portal-btn portal-btn--primary portal-btn--sm" style="justify-content:center;text-decoration:none">⚡ Ativar Meu Hokage ID Grátis →</a>' +
        '</article>';

      grid.innerHTML = (cardsHtml || '') + ctaCardHtml;
    } catch (_) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:24px 16px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1)">' +
          '<p style="color:var(--text-secondary);margin:0 0 12px;font-size:0.9rem">Consulte todos os pioneiros verificados e negócios que aceitam Pi no diretório oficial.</p>' +
          '<a href="explorar" class="portal-btn portal-btn--primary portal-btn--sm">🌐 Abrir Diretório de Passaportes →</a>' +
        '</div>';
    }
  }

  // ─── 9. Inicialização ──────────────────────────────────────
  function init() {
    initMobileDrawer();
    initModals();
    initNewsletter();
    initPartnerProposal();
    initCommunityWaitlist();
    initManualLeadUnlock();
    initHomeVilaLivePreview();
    initHomeBusinessPreview();
    initHomePioneersPreview();
  }

  window.HokagePortal = {
    init: init,
    openModal: openModal,
    closeModal: closeModal,
    closeMobileDrawer: closeMobileDrawer,
    payEbookWithPi: payEbookWithPi
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

