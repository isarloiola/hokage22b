/**
 * ============================================================
 * HOKAGE22B.COM — Module: Mural dos Pioneiros & Gazeta Web3 (v4.0)
 * Classificados descentralizados da comunidade Pi
 * Arquitetura 100% À Prova de Falhas (Bulletproof & Zero-Dependency)
 * ============================================================
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

  const AD_EDIT_WINDOW_HOURS = 24;

  const CURRENCY_LABELS = {
    PI: 'π',
    BRL: 'R$',
    USD: 'US$',
    EUR: '€'
  };

  function formatSingleCurrency(val, curr) {
    const num = parseFloat(String(val || '').replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return '';
    const c = String(curr || 'PI').toUpperCase();
    if (c === 'PI') {
      return Number(num.toFixed(4)).toString() + ' π';
    }
    if (c === 'BRL') {
      return 'R$ ' + num.toFixed(2).replace('.', ',');
    }
    const sym = CURRENCY_LABELS[c] || c;
    return sym + ' ' + num.toFixed(2);
  }

  function composePricingPayload(mode, piRaw, fiatRaw, fiatCurr) {
    const safeMode = (mode === 'pi_fiat' || mode === 'fiat') ? mode : 'pi';
    const curr = ['BRL', 'USD', 'EUR'].indexOf(String(fiatCurr || '').toUpperCase()) !== -1
      ? String(fiatCurr).toUpperCase()
      : 'BRL';
    const piNum = parseFloat(String(piRaw || '').replace(',', '.'));
    const fiatNum = parseFloat(String(fiatRaw || '').replace(',', '.'));
    const hasPi = Number.isFinite(piNum) && piNum > 0;
    const hasFiat = Number.isFinite(fiatNum) && fiatNum > 0;

    if (safeMode === 'pi') {
      return {
        payment_modes: 'pi',
        item_price: hasPi ? Number(piNum.toFixed(4)).toString() : null,
        item_currency: 'PI'
      };
    }
    if (safeMode === 'fiat') {
      return {
        payment_modes: 'fiat',
        item_price: hasFiat ? fiatNum.toFixed(2) : null,
        item_currency: curr
      };
    }
    if (hasPi && hasFiat) {
      return {
        payment_modes: 'pi_fiat',
        item_price: (Number(piNum.toFixed(4)).toString() + ' π + ' + formatSingleCurrency(fiatNum, curr)).slice(0, 40),
        item_currency: curr
      };
    }
    if (hasPi) {
      return {
        payment_modes: 'pi_fiat',
        item_price: Number(piNum.toFixed(4)).toString() + ' π',
        item_currency: 'PI'
      };
    }
    if (hasFiat) {
      return {
        payment_modes: 'pi_fiat',
        item_price: fiatNum.toFixed(2),
        item_currency: curr
      };
    }
    return {
      payment_modes: 'pi_fiat',
      item_price: null,
      item_currency: curr
    };
  }

  function syncPaymentModeUi(prefix) {
    const modeEl = document.getElementById(prefix + '-input-payment-modes');
    const hiddenPriceEl = document.getElementById(prefix + '-input-item-price');
    const hiddenCurrEl = document.getElementById(prefix + '-input-item-currency');
    const piWrap = document.getElementById(prefix + '-price-pi-wrap');
    const fiatWrap = document.getElementById(prefix + '-price-fiat-wrap');
    const piInp = document.getElementById(prefix + '-input-price-pi');
    const fiatInp = document.getElementById(prefix + '-input-price-fiat');
    const fiatCurrEl = document.getElementById(prefix + '-input-fiat-currency');

    if (!modeEl) return null;
    const mode = (modeEl.value === 'pi_fiat' || modeEl.value === 'fiat') ? modeEl.value : 'pi';

    if (piWrap) {
      piWrap.style.display = (mode === 'pi' || mode === 'pi_fiat') ? 'block' : 'none';
    }
    if (fiatWrap) {
      fiatWrap.style.display = (mode === 'pi_fiat' || mode === 'fiat') ? 'grid' : 'none';
    }

    const checkboxes = document.querySelectorAll('input[data-' + prefix + '-pay-mode]');
    checkboxes.forEach(function (cb) {
      const m = cb.getAttribute('data-' + prefix + '-pay-mode');
      const isActive = m === mode;
      cb.checked = isActive;
      const card = cb.closest('.j-pay-check-card') || cb.parentElement;
      if (card) {
        card.style.borderColor = isActive ? '#f59e0b' : 'rgba(255,255,255,0.14)';
        card.style.background = isActive ? 'rgba(245,158,11,0.14)' : 'rgba(0,0,0,0.38)';
      }
    });

    const composed = composePricingPayload(
      mode,
      piInp ? piInp.value : '',
      fiatInp ? fiatInp.value : '',
      fiatCurrEl ? fiatCurrEl.value : 'BRL'
    );

    if (hiddenPriceEl) hiddenPriceEl.value = composed.item_price || '';
    if (hiddenCurrEl) hiddenCurrEl.value = composed.item_currency || 'PI';
    return composed;
  }

  function hydratePaymentModeUi(prefix, rawMode, rawItemPrice, rawItemCurrency) {
    const modeEl = document.getElementById(prefix + '-input-payment-modes');
    const piInp = document.getElementById(prefix + '-input-price-pi');
    const fiatInp = document.getElementById(prefix + '-input-price-fiat');
    const fiatCurrEl = document.getElementById(prefix + '-input-fiat-currency');
    if (!modeEl) return;

    let mode = 'pi';
    const normMode = String(rawMode || 'pi').trim().toLowerCase();
    if (normMode === 'pi_fiat' || normMode === 'pi_reais') mode = 'pi_fiat';
    else if (normMode === 'fiat' || normMode === 'reais') mode = 'fiat';
    modeEl.value = mode;

    const currUpper = String(rawItemCurrency || '').trim().toUpperCase();
    if (fiatCurrEl && (currUpper === 'BRL' || currUpper === 'USD' || currUpper === 'EUR')) {
      fiatCurrEl.value = currUpper;
    }

    let piVal = '';
    let fiatVal = '';
    const priceStr = rawItemPrice != null ? String(rawItemPrice).trim() : '';

    if (priceStr) {
      if (priceStr.indexOf('+') !== -1) {
        const parts = priceStr.split('+');
        const mPi = parts[0] ? parts[0].match(/([0-9]+(?:[.,][0-9]+)?)/) : null;
        const mFiat = parts[1] ? parts[1].match(/([0-9]+(?:[.,][0-9]+)?)/) : null;
        if (mPi) piVal = mPi[1].replace(',', '.');
        if (mFiat) fiatVal = mFiat[1].replace(',', '.');
        if (parts[1]) {
          if (parts[1].indexOf('US$') !== -1 && fiatCurrEl) fiatCurrEl.value = 'USD';
          else if (parts[1].indexOf('€') !== -1 && fiatCurrEl) fiatCurrEl.value = 'EUR';
          else if (parts[1].indexOf('R$') !== -1 && fiatCurrEl) fiatCurrEl.value = 'BRL';
        }
      } else if (priceStr.indexOf('π') !== -1 || currUpper === 'PI' || mode === 'pi') {
        const m = priceStr.match(/([0-9]+(?:[.,][0-9]+)?)/);
        if (m) piVal = m[1].replace(',', '.');
      } else {
        const m = priceStr.match(/([0-9]+(?:[.,][0-9]+)?)/);
        if (m) fiatVal = m[1].replace(',', '.');
      }
    }

    if (piInp) piInp.value = piVal;
    if (fiatInp) fiatInp.value = fiatVal;
    syncPaymentModeUi(prefix);
  }

  function bindPaymentModeGroup(prefix, onChangeCb) {
    const checkboxes = document.querySelectorAll('input[data-' + prefix + '-pay-mode]');
    const modeEl = document.getElementById(prefix + '-input-payment-modes');
    checkboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (!modeEl) return;
        modeEl.value = cb.getAttribute('data-' + prefix + '-pay-mode') || 'pi';
        syncPaymentModeUi(prefix);
        if (typeof onChangeCb === 'function') onChangeCb();
      });
    });
    ['-input-price-pi', '-input-price-fiat'].forEach(function (suffix) {
      const inp = document.getElementById(prefix + suffix);
      if (inp) {
        inp.addEventListener('input', function () {
          syncPaymentModeUi(prefix);
          if (typeof onChangeCb === 'function') onChangeCb();
        });
      }
    });
    const currSel = document.getElementById(prefix + '-input-fiat-currency');
    if (currSel) {
      currSel.addEventListener('change', function () {
        syncPaymentModeUi(prefix);
        if (typeof onChangeCb === 'function') onChangeCb();
      });
    }
    syncPaymentModeUi(prefix);
  }

  function normalizeHandle(handle) {
    return String(handle || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function getAuthenticatedPiUser() {
    if (!window.HokagePi || !window.HokagePi.isPiBrowser || !window.HokagePi.isPiBrowser()) {
      return null;
    }
    const u = window.HokagePi.getUser ? window.HokagePi.getUser() : null;
    if (!u || !u.username) return null;
    return {
      uid: u.uid || '',
      username: '@' + normalizeHandle(u.username)
    };
  }

  function getCommunityUser() {
    const piUser = getAuthenticatedPiUser();
    if (piUser) return piUser;
    const u = (window.HokagePi && window.HokagePi.getUser) ? window.HokagePi.getUser() : null;
    if (u && u.username && (u.authType === 'web2' || u.authType === 'hybrid')) {
      return {
        uid: u.uid || '',
        username: '@' + normalizeHandle(u.username)
      };
    }
    return null;
  }

  function getAdEditStatus(ad) {
    if (!ad || !ad.created_at) {
      return { editable: false, hoursLeft: 0 };
    }
    const createdMs = new Date(ad.created_at).getTime();
    if (!Number.isFinite(createdMs)) {
      return { editable: false, hoursLeft: 0 };
    }
    const elapsedHours = (Date.now() - createdMs) / (1000 * 60 * 60);
    const remaining = AD_EDIT_WINDOW_HOURS - elapsedHours;
    return {
      editable: remaining > 0,
      hoursLeft: Math.max(0, Math.ceil(remaining))
    };
  }

  function safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
      return escapeHtml(encodeURI(trimmed));
    }
    return '';
  }

  function safeImageUrl(url, allowBlob) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)) {
      return trimmed;
    }
    if (allowBlob && /^blob:https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
      return escapeHtml(trimmed);
    }
    return safeUrl(trimmed);
  }

  function getYouTubeThumb(url) {
    if (!url || typeof url !== 'string') return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return 'https://img.youtube.com/vi/' + match[2] + '/hqdefault.jpg';
    }
    return '';
  }

  let currentCategory = 'todos';
  let currentPillar = 'inicio';
  let selectedTier = 'gratis';
  let availableReferralCredits = 0;

  const tierPrices = {
    ouro:   { pi: 3.14, name: '🥇 Destaque Ouro (Topo VIP & Card Duplo)' },
    prata:  { pi: 1.00, name: '🥈 Destaque Prata (Boost + Link Direto)' },
    bronze: { pi: 0.314, name: '🥉 Bronze (Compromisso Verificado)' },
    gratis: { pi: 0, name: '🌱 Comunidade Grátis (1 ativa a cada 7 dias)' }
  };

  // Helper para localização dos grids das duas áreas comerciais
  function getFeaturedGrid() {
    return document.getElementById('mural-featured-grid') || document.getElementById('mural-ads-grid');
  }

  function getCommunityGrid() {
    return getFeaturedGrid();
  }

  // Rotação determinística e justa por fatia horária (UTC)
  // Sem modificação artificial de dados no banco de dados
  function rotateFairly(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
    const offset = hourBucket % arr.length;
    return arr.slice(offset).concat(arr.slice(0, offset));
  }

  const vitrineProductsCache = {};

  function normalizeSellerHandle(raw) {
    return String(raw || '').trim().replace(/^@+/, '').toLowerCase();
  }

  function inferVitrineCategory(prod) {
    const hay = (String((prod && prod.badge) || '') + ' ' + String((prod && prod.title) || '')).toLowerCase();
    if (/servi[cç]o|consultoria|mentoria|design|dev|manuten|freela|corte|barba/i.test(hay)) return 'servico';
    if (/e-?book|pdf|epub|curso|guia|digital/i.test(hay)) return 'digital';
    return 'produto';
  }

  function buildAdCardHtml(ad) {
    const isVitrineProduct = Boolean(ad.is_vitrine_product);
    const isFounderDemo = Boolean(ad.is_founder_demo || ad.status === 'demonstracao');
    const tier = isVitrineProduct
      ? 'vitrine'
      : ((ad.plan_tier === 'ouro' || ad.plan_tier === 'prata' || ad.plan_tier === 'gratis') ? ad.plan_tier : 'bronze');
    const tierBadgeClass = 'pioneer-badge--' + tier;

    const CAT_LABELS = {
      produto: '🛍️ Produto',
      digital: '📦 Digital',
      servico: '🛠️ Serviço',
      tecnologia: '💻 Tech & Apps',
      educacao: '🎓 Educação',
      alimentacao: '🍔 Alimentação',
      vaga: '💼 Vaga',
      freelancer: '🧑‍💻 Freelancer',
      aviso: '📢 Aviso',
      procura: '🔎 Procura-se',
      youtube: '▶ YouTube',
      mensagem: '💬 Recado',
      geral: '📌 Geral'
    };
    const catKey = String(ad.category || 'geral').toLowerCase();
    const catLabel = CAT_LABELS[catKey] || '📌 Oferta';

    let tierLabel = '';
    let overlayLabel = '';
    const priceHtmlDefault = '';
    let priceHtml = priceHtmlDefault;

    if (isVitrineProduct) {
      tierLabel = '🪪 Catálogo Hokage ID';
      overlayLabel = '🪪 CATÁLOGO HOKAGE ID';
    } else if (isFounderDemo) {
      tierLabel = '👑 Ouro Fundador · Demonstração';
      overlayLabel = '👑 OURO FUNDADOR · EXEMPLAR';
    } else if (tier === 'ouro') {
      tierLabel = '🚀 Boost VIP · Topo';
      overlayLabel = '🚀 BOOST VIP · TOPO';
    } else if (tier === 'prata') {
      tierLabel = '⚡ Boost · Destaque';
      overlayLabel = '⚡ BOOST · DESTAQUE';
    } else if (tier === 'gratis') {
      tierLabel = '🌱 Comunidade · Grátis';
      overlayLabel = '';
    } else {
      tierLabel = '🥉 Bronze · Compromisso';
      overlayLabel = '';
    }

    const itemPricePillHtml = '';
    const rawPriceStr = ad.item_price != null ? String(ad.item_price).trim() : '';
    if (rawPriceStr) {
      let formattedVal = '';
      if (rawPriceStr.indexOf('π') !== -1 || rawPriceStr.indexOf('+') !== -1 || /^(R\$|\$|€|USD|EUR|BRL|gr[aá]tis)/i.test(rawPriceStr)) {
        formattedVal = rawPriceStr;
      } else {
        const rawItemPrice = parseFloat(rawPriceStr.replace(',', '.'));
        if (Number.isFinite(rawItemPrice) && rawItemPrice > 0) {
          formattedVal = formatSingleCurrency(rawItemPrice, ad.item_currency || 'PI');
        }
      }
      if (formattedVal) {
        priceHtml = `<span class="pioneer-card__price-tag" title="Preço informado da oferta">${escapeHtml(formattedVal)}</span>`;
      }
    }

    const author = ad.pioneer_username || ad.pioneer_name || '@pioneiro';
    const safeAuthor = escapeHtml(author);
    const safeTitle = escapeHtml(ad.title || '');
    const safeDesc = escapeHtml(ad.description || '');
    const cleanUrl = (tier === 'ouro' || tier === 'prata' || isVitrineProduct) ? safeUrl(ad.link_url) : '';
    const category = escapeHtml(ad.category || 'geral');
    const cardId = escapeHtml(ad.id || ('ad_' + Math.random().toString(36).substring(2, 7)));
    const cleanAuthorSlug = String(author || '').replace(/^@+/, '');
    const sellerAttr = escapeHtml(cleanAuthorSlug.toLowerCase());
    const sourceAttr = isVitrineProduct ? 'vitrine' : 'anuncio';

    let loggedHandle = '';
    try {
      const rawLogged = localStorage.getItem('hokage_pi_user') || '';
      const parsedLogged = rawLogged ? JSON.parse(rawLogged) : null;
      if (parsedLogged && parsedLogged.username) loggedHandle = normalizeSellerHandle(parsedLogged.username);
    } catch (_) {}
    const isVitrineOwner = Boolean(isVitrineProduct && loggedHandle && loggedHandle === sellerAttr);

    let linkHtml = '';
    if (isVitrineProduct) {
      linkHtml = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <a href="pioneiro?u=${encodeURIComponent(cleanAuthorSlug)}#pioneer-products-section" data-mural-action="track-profile" data-ad-id="${cardId}" class="pioneer-card__link" style="background:linear-gradient(135deg,rgba(16,185,129,0.22),rgba(139,92,246,0.22));border:1px solid rgba(16,185,129,0.45);color:#ecfdf5;padding:7px 12px;border-radius:8px;font-weight:800;font-size:0.8rem;text-decoration:none;display:inline-flex;align-items:center;gap:5px">🪪 Ver no Hokage ID / Negociar →</a>
          ${cleanUrl ? `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" class="btn btn-outline btn-sm" style="padding:6px 10px;font-size:0.75rem;text-decoration:none;border-color:rgba(255,255,255,0.2);color:#e4e4e7">🔗 Abrir Oferta ↗</a>` : ''}
          ${isVitrineOwner ? `<button type="button" data-mural-action="promote-vitrine" data-ad-id="${cardId}" class="btn btn-outline btn-sm" style="padding:6px 10px;font-size:0.75rem;border-color:rgba(245,158,11,0.5);color:var(--amber-light);font-weight:700">⚡ Impulsionar na Vila</button>` : ''}
        </div>
      `;
    } else if (tier === 'ouro' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" data-mural-action="track-click" data-ad-id="${cardId}" class="pioneer-card__link pioneer-card__link--ouro" style="background:var(--amber);color:#000;font-weight:900;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(245,158,11,0.35)">⚡ Acessar Canal Oficial →</a>`;
    } else if (tier === 'prata' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" data-mural-action="track-click" data-ad-id="${cardId}" class="pioneer-card__link">Acessar Oferta →</a>`;
    } else {
      const cleanProfileSlug = String(author || '').replace(/^@+/, '');
      linkHtml = `<a href="pioneiro?u=${encodeURIComponent(cleanProfileSlug)}" data-mural-action="track-profile" data-ad-id="${cardId}" class="pioneer-card__link" style="font-size:0.78rem;color:var(--accent-light);text-decoration:none;display:inline-flex;align-items:center;gap:5px;font-weight:700">👤 Contatar ${safeAuthor} →</a>`;
    }

    let bannerHtml = '';
    const isPreviewCard = ad.id === 'preview_card_mock';
    const rawImg = ad.image_url ? safeImageUrl(ad.image_url, isPreviewCard) : '';
    const ytThumb = cleanUrl ? getYouTubeThumb(cleanUrl) : '';
    const finalImg = rawImg || ytThumb || (tier === 'ouro' ? 'assets/img/ebook-pago-negocios.jpg' : '');

    if (finalImg) {
      bannerHtml = `
        <div class="pioneer-card__banner">
          <img src="${finalImg}" alt="${safeTitle}" loading="lazy" />
          <div class="pioneer-card__banner-overlay">
            <span style="font-size:0.72rem;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);padding:3px 10px;border-radius:4px;color:#fff;font-weight:700;border:1px solid rgba(255,255,255,0.25)">
              ${overlayLabel || (tier === 'ouro' ? '👑 DESTAQUE VIP' : 'FOTO OFICIAL')}
            </span>
          </div>
        </div>
      `;
    }

    // Evita badge duplicado quando a imagem já exibe o selo de VIP/Boost
    const topBadgeText = bannerHtml ? catLabel : (tierLabel + ' · ' + catLabel);

    // Métricas reais (sem números fictícios)
    const views = Number(ad.views_count) || 0;
    const clicks = Number(ad.clicks_count) || 0;
    const profileVisits = Number(ad.profile_visits || ad.profile_clicks) || 0;
    const likes = Number(ad.likes_count) || 0;

    let isLiked = false;
    try {
      const likedAds = JSON.parse(localStorage.getItem('isar_liked_ads') || '[]');
      if (likedAds.includes(cardId)) isLiked = true;
    } catch (_) {}

    let metricsDetailsHtml = '';
    if (tier === 'bronze' || tier === 'gratis') {
      metricsDetailsHtml = `
        <span title="Visualizações">👁️ <strong style="color:var(--text-secondary)" class="ad-views-num" data-id="${cardId}">${views}</strong> views</span>
        <span title="Visitas ao Perfil">👤 <strong style="color:var(--accent-light)" class="ad-profile-visits-num" data-id="${cardId}">${profileVisits}</strong> perfil</span>
      `;
    } else {
      metricsDetailsHtml = `
        <span title="Visualizações">👁️ <strong style="color:var(--text-secondary)" class="ad-views-num" data-id="${cardId}">${views}</strong> views</span>
        <span title="Cliques no Link Oficial">🖱️ <strong style="color:var(--amber-light)" class="ad-clicks-num" data-id="${cardId}">${clicks}</strong> cliques</span>
        <span title="Visitas ao Perfil">👤 <strong style="color:var(--accent-light)" class="ad-profile-visits-num" data-id="${cardId}">${profileVisits}</strong> perfil</span>
      `;
    }

    const COUNTRY_MAP = {
      GLOBAL: '🌐 Global',
      BR: '🇧🇷 Brasil',
      US: '🇺🇸 USA',
      PT: '🇵🇹 Portugal',
      ES: '🇪🇸 España',
      NG: '🇳🇬 Nigeria',
      PH: '🇵🇭 Philippines',
      VN: '🇻🇳 Vietnam',
      IN: '🇮🇳 India',
      EU: '🇪🇺 Europe',
      OTHER: '🌍 Global'
    };
    const rawCountry = String(ad.country_code || 'GLOBAL').trim().toUpperCase();
    const countryCode = COUNTRY_MAP[rawCountry] ? rawCountry : 'GLOBAL';
    const countryLabel = COUNTRY_MAP[countryCode];

    let normalizedPayMode = 'pi';
    if (ad.payment_modes === 'pi_fiat' || ad.payment_modes === 'pi_reais') {
      normalizedPayMode = 'pi_fiat';
    } else if (ad.payment_modes === 'fiat' || ad.payment_modes === 'reais') {
      normalizedPayMode = 'fiat';
    }

    const payModeLabel = normalizedPayMode === 'pi_fiat'
      ? '⚡💵 Pi + Moeda'
      : (normalizedPayMode === 'fiat' ? '💵 Somente Moeda' : '⚡ Somente Pi');
    const safeLocation = escapeHtml((ad.location && String(ad.location).trim()) || 'Online');
    const createdAttr = escapeHtml(String(ad.created_at || ''));

    const cardMetricsFooterHtml = isVitrineProduct
      ? `
        <div class="pioneer-card__metrics" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:0.75rem;color:var(--text-muted);flex-wrap:wrap;gap:8px">
          <button type="button" data-mural-action="filter-seller" data-seller="${sellerAttr}" data-ad-id="${cardId}" style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);color:#fde68a;padding:3px 9px;border-radius:999px;cursor:pointer;font-size:0.73rem;font-weight:700">
            🏪 Loja de @${escapeHtml(cleanAuthorSlug)}
          </button>
          <a href="pioneiro?u=${encodeURIComponent(cleanAuthorSlug)}" data-mural-action="track-profile" data-ad-id="${cardId}" style="color:var(--accent-light);text-decoration:none;font-weight:700" title="Ver Passaporte do vendedor">Perfil ↗</a>
        </div>
      `
      : `
        <div class="pioneer-card__metrics" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:0.75rem;color:var(--text-muted);flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${metricsDetailsHtml}
            <button type="button" class="btn-like-ad ${isLiked ? 'liked' : ''}" data-mural-action="like" data-ad-id="${cardId}" data-id="${cardId}" title="Apoiar este anúncio da comunidade" style="background:${isLiked ? 'rgba(244,63,94,0.25)' : 'rgba(244,63,94,0.1)'};border:1px solid ${isLiked ? '#f43f5e' : 'rgba(244,63,94,0.3)'};color:${isLiked ? '#fff' : '#fb7185'};padding:2px 8px;border-radius:6px;cursor:pointer;font-size:0.74rem;display:inline-flex;align-items:center;gap:4px;font-weight:${isLiked ? '700' : '500'};transition:all 0.2s ease">
              <span>❤️</span> <strong class="ad-likes-num" data-id="${cardId}">${likes}</strong>
            </button>
            <button type="button" class="btn-comment-ad" data-mural-action="comments" data-ad-id="${cardId}" data-id="${cardId}" title="Ver ou publicar comentários" style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#c4b5fd;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:0.74rem;display:inline-flex;align-items:center;gap:4px;font-weight:500;transition:all 0.2s ease">
              <span>💬</span> <strong class="ad-comments-num" data-id="${cardId}">0</strong>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button type="button" class="btn-copy-ad-link" data-mural-action="copy-link" data-ad-id="${cardId}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.72rem;display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px" title="Copiar link direto deste anúncio">
              🔗 Copiar Link
            </button>
            <button type="button" class="btn-report-ad" data-mural-action="report" data-ad-id="${cardId}" data-ad-title="${safeTitle}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.72rem;display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px" title="Denunciar conteúdo impróprio ou fraude">
              🚩 Denunciar
            </button>
            <a href="pioneiro?u=${encodeURIComponent(cleanAuthorSlug)}" data-mural-action="track-profile" data-ad-id="${cardId}" style="color:var(--accent-light);text-decoration:none;font-weight:700" title="Ver Passaporte do anunciante">Perfil ↗</a>
          </div>
        </div>
        <div class="ad-comments-drawer" id="comments-drawer-${cardId}" style="display:none"></div>
      `;

    return `
      <article class="pioneer-card pioneer-card--${tier}" data-category="${category}" data-payment-mode="${normalizedPayMode}" data-country="${countryCode}" data-tier="${tier}" data-seller="${sellerAttr}" data-source="${sourceAttr}" data-created="${createdAttr}" data-likes="${likes}" id="card-${cardId}">
        ${bannerHtml}
        <div class="pioneer-card__top">
          <span class="pioneer-card__badge ${tierBadgeClass}">${topBadgeText}</span>
          <a href="pioneiro?u=${encodeURIComponent(cleanAuthorSlug)}" data-mural-action="track-profile" data-ad-id="${cardId}" class="pioneer-card__author" style="text-decoration:none" title="Ver Passaporte do pioneiro">${safeAuthor} ↗</a>
        </div>
        <h3 class="pioneer-card__title">${safeTitle}</h3>
        <p class="pioneer-card__desc">${safeDesc}</p>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:0.72rem">
          <span style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-secondary);padding:2px 8px;border-radius:999px">${countryLabel} · ${safeLocation}</span>
          <span style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:var(--amber-light);padding:2px 8px;border-radius:999px;font-weight:600">${payModeLabel}</span>
          ${itemPricePillHtml}
        </div>
        <div class="pioneer-card__footer">
          ${linkHtml}
          ${priceHtml}
        </div>
        ${cardMetricsFooterHtml}
      </article>
    `;
  }

  // Insere um único card no seu respectivo container comercial
  function insertAdCard(ad) {
    if (!ad || !ad.id) return;
    const cardId = 'card-' + ad.id;
    if (document.getElementById(cardId)) return;

    const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata' || ad.plan_tier === 'vitrine' || ad.plan_tier === 'gratis') ? ad.plan_tier : 'bronze';
    const html = buildAdCardHtml(ad);

    const unifiedGrid = getFeaturedGrid();
    if (!unifiedGrid) return;

    if (tier === 'ouro') {
      unifiedGrid.insertAdjacentHTML('afterbegin', html);
    } else if (tier === 'prata') {
      const firstPrata = unifiedGrid.querySelector('.pioneer-card--prata');
      const firstBronze = unifiedGrid.querySelector('.pioneer-card--bronze');
      const firstVitrine = unifiedGrid.querySelector('.pioneer-card--vitrine');
      const firstGratis = unifiedGrid.querySelector('.pioneer-card--gratis');
      if (firstPrata) {
        firstPrata.insertAdjacentHTML('beforebegin', html);
      } else if (firstBronze) {
        firstBronze.insertAdjacentHTML('beforebegin', html);
      } else if (firstVitrine) {
        firstVitrine.insertAdjacentHTML('beforebegin', html);
      } else if (firstGratis) {
        firstGratis.insertAdjacentHTML('beforebegin', html);
      } else {
        unifiedGrid.insertAdjacentHTML('beforeend', html);
      }
    } else if (tier === 'bronze') {
      const firstBronze = unifiedGrid.querySelector('.pioneer-card--bronze');
      const firstVitrine = unifiedGrid.querySelector('.pioneer-card--vitrine');
      const firstGratis = unifiedGrid.querySelector('.pioneer-card--gratis');
      if (firstBronze) {
        firstBronze.insertAdjacentHTML('beforebegin', html);
      } else if (firstVitrine) {
        firstVitrine.insertAdjacentHTML('beforebegin', html);
      } else if (firstGratis) {
        firstGratis.insertAdjacentHTML('beforebegin', html);
      } else {
        unifiedGrid.insertAdjacentHTML('beforeend', html);
      }
    } else if (tier === 'vitrine') {
      const firstGratis = unifiedGrid.querySelector('.pioneer-card--gratis');
      if (firstGratis) {
        firstGratis.insertAdjacentHTML('beforebegin', html);
      } else {
        unifiedGrid.insertAdjacentHTML('beforeend', html);
      }
    } else {
      unifiedGrid.insertAdjacentHTML('beforeend', html);
    }
  }

  let currentSearchQuery = '';
  let currentPaymentFilter = 'todos';
  let currentCountryFilter = 'todos';
  let currentTierFilter = 'todos';
  let currentRegionFilter = '';
  let currentLangFilter = 'todos';
  let currentSortOrder = 'destaque';
  let currentSellerFilter = '';
  let searchDebounceTimer = null;
  let hasAutoScrolledForSearch = false;

  const CATEGORY_META = {
    produto: { label: '🛍️ Produtos', pillars: ['inicio', 'mercado'] },
    digital: { label: '📦 Digitais', pillars: ['inicio', 'mercado'] },
    servico: { label: '🛠️ Serviços', pillars: ['inicio', 'mercado', 'trabalho'] },
    tecnologia: { label: '💻 Tech', pillars: ['inicio', 'mercado'] },
    educacao: { label: '🎓 Educação', pillars: ['inicio', 'mercado'] },
    alimentacao: { label: '🍔 Alimentação', pillars: ['inicio', 'mercado'] },
    vaga: { label: '💼 Vagas', pillars: ['inicio', 'trabalho'] },
    freelancer: { label: '🧑‍💻 Freelancer', pillars: ['inicio', 'trabalho'] },
    aviso: { label: '📢 Avisos', pillars: ['inicio', 'mural'] },
    procura: { label: '🔎 Procura-se', pillars: ['inicio', 'mural'] },
    youtube: { label: '▶ YouTube', pillars: ['inicio', 'mural'] },
    mensagem: { label: '💬 Recados', pillars: ['inicio', 'mural'] }
  };

  function normalizeSearchText(str) {
    try {
      return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    } catch (_) {
      return String(str || '').toLowerCase();
    }
  }

  function getCommandDockOffset() {
    const nav = document.getElementById('navbar');
    const dock = document.getElementById('vila-command-dock');
    const navH = nav ? nav.offsetHeight : 64;
    const dockH = dock ? dock.offsetHeight : 100;
    return navH + dockH + 10;
  }

  function scrollToResults(force) {
    const target = currentPillar === 'comunidade'
      ? document.getElementById('vila-community-hub')
      : document.getElementById('vila-results-anchor');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const minTop = getCommandDockOffset();
    if (!force && rect.top <= minTop + 40) return;
    const targetTop = Math.max(0, window.scrollY + rect.top - minTop);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  function toggleFiltersPanel(forceState) {
    const panel = document.getElementById('vila-filters-panel');
    const btn = document.getElementById('vila-filters-toggle-btn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    const nextOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    panel.style.display = nextOpen ? 'block' : 'none';
    if (btn) {
      btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
      btn.classList.toggle('active', nextOpen);
    }
  }

  function syncPaymentPillsUi() {
    document.querySelectorAll('.vila-pay-pill').forEach(function (pill) {
      pill.classList.toggle('active', pill.getAttribute('data-pay') === currentPaymentFilter);
    });
    const sel = document.getElementById('mural-payment-filter');
    if (sel) sel.value = currentPaymentFilter;
  }

  function syncCategorySelectAndChips() {
    const sel = document.getElementById('mural-category-filter');
    if (sel) sel.value = currentCategory;
    document.querySelectorAll('#vila-smart-cat-chips .vila-smart-chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.getAttribute('data-category') === currentCategory);
    });
  }

  function filterSeller(sellerHandle) {
    currentSellerFilter = normalizeSellerHandle(sellerHandle);
    applyFilters();
  }

  function filterPaymentMode(mode) {
    currentPaymentFilter = mode || 'todos';
    syncPaymentPillsUi();
    applyFilters();
  }

  function filterCountry(code) {
    currentCountryFilter = code || 'todos';
    applyFilters();
  }

  function filterTier(tier) {
    currentTierFilter = tier || 'todos';
    applyFilters();
  }

  function filterRegion(region) {
    currentRegionFilter = (region || '').trim().toLowerCase();
    applyFilters();
  }

  function filterLang(lang) {
    currentLangFilter = lang || 'todos';
    applyFilters();
  }

  function sortAds(order) {
    currentSortOrder = order || 'destaque';
    applyFilters();
  }

  function clearAllFilters() {
    currentCategory = 'todos';
    currentSearchQuery = '';
    currentPaymentFilter = 'todos';
    currentCountryFilter = 'todos';
    currentTierFilter = 'todos';
    currentRegionFilter = '';
    currentLangFilter = 'todos';
    currentSortOrder = 'destaque';
    currentSellerFilter = '';
    hasAutoScrolledForSearch = false;
    try {
      const urlObj = new URL(window.location.href);
      if (urlObj.searchParams.has('seller') || urlObj.searchParams.has('vendedor') || urlObj.searchParams.has('loja')) {
        urlObj.searchParams.delete('seller');
        urlObj.searchParams.delete('vendedor');
        urlObj.searchParams.delete('loja');
        window.history.replaceState(null, '', urlObj.pathname + urlObj.search + urlObj.hash);
      }
    } catch (_) {}

    const ids = {
      'mural-search-input': '',
      'mural-category-filter': 'todos',
      'mural-payment-filter': 'todos',
      'mural-country-filter': 'todos',
      'mural-tier-filter': 'todos',
      'mural-region-filter': '',
      'mural-lang-filter': 'todos',
      'mural-sort-filter': 'destaque'
    };
    Object.keys(ids).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.value = ids[id];
    });
    const clearBtn = document.getElementById('mural-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    syncPaymentPillsUi();
    syncCategorySelectAndChips();
    applyFilters();
  }

  function detectCardTier(card) {
    if (card.classList.contains('pioneer-card--ouro')) return 'ouro';
    if (card.classList.contains('pioneer-card--prata')) return 'prata';
    if (card.classList.contains('pioneer-card--vitrine')) return 'vitrine';
    if (card.classList.contains('pioneer-card--gratis')) return 'gratis';
    return 'bronze';
  }

  function detectCardLang(card, cardCountry) {
    const explicit = (card.getAttribute('data-lang') || '').toLowerCase();
    if (explicit) return explicit;
    const text = (card.textContent || '').toLowerCase();
    if (/\[en\]/i.test(text)) return 'en';
    if (/\[es\]/i.test(text)) return 'es';
    if (/\[pt\]/i.test(text)) return 'pt';
    if (cardCountry === 'BR' || cardCountry === 'PT') return 'pt';
    if (cardCountry === 'ES') return 'es';
    if (cardCountry === 'US' || cardCountry === 'NG' || cardCountry === 'PH') return 'en';
    if (/[ãõçáéíóúâêô]/i.test(text)) return 'pt';
    return 'other';
  }

  function reorderGridCards(grid, sortOrder) {
    if (!grid) return;
    const cards = Array.from(grid.children).filter(function (el) {
      return el.classList && (el.classList.contains('pioneer-card') || el.classList.contains('ad-card'));
    });
    if (cards.length < 2) return;
    if (sortOrder === 'recentes') {
      cards.sort(function (a, b) {
        const timeA = Date.parse(a.getAttribute('data-created') || '') || 0;
        const timeB = Date.parse(b.getAttribute('data-created') || '') || 0;
        return timeB - timeA;
      });
      cards.forEach(function (c) { grid.appendChild(c); });
      return;
    }
    if (sortOrder === 'curtidos') {
      cards.sort(function (a, b) {
        const likesA = parseInt((a.querySelector('.ad-likes-num') || {}).textContent || a.getAttribute('data-likes') || '0', 10) || 0;
        const likesB = parseInt((b.querySelector('.ad-likes-num') || {}).textContent || b.getAttribute('data-likes') || '0', 10) || 0;
        if (likesB !== likesA) return likesB - likesA;
        return (Date.parse(b.getAttribute('data-created') || '') || 0) - (Date.parse(a.getAttribute('data-created') || '') || 0);
      });
      cards.forEach(function (c) { grid.appendChild(c); });
      return;
    }
    const weight = { ouro: 0, prata: 1, bronze: 2, vitrine: 3, gratis: 4 };
    cards.sort(function (a, b) {
      const diff = (weight[detectCardTier(a)] ?? 3) - (weight[detectCardTier(b)] ?? 3);
      if (diff !== 0) return diff;
      return (Date.parse(b.getAttribute('data-created') || '') || 0) - (Date.parse(a.getAttribute('data-created') || '') || 0);
    });
    cards.forEach(function (c) { grid.appendChild(c); });
  }

  function cardMatchesPillar(cardCat, pillar) {
    if (!pillar || pillar === 'inicio' || pillar === 'comunidade') return true;
    const cat = String(cardCat || 'geral').toLowerCase();
    if (pillar === 'mercado') {
      return ['produto', 'digital', 'servico', 'tecnologia', 'educacao', 'alimentacao', 'geral', 'fisico', 'negocio', 'comercial'].indexOf(cat) !== -1;
    }
    if (pillar === 'mural') {
      return ['aviso', 'procura', 'youtube', 'mensagem', 'evento', 'projeto', 'noticia'].indexOf(cat) !== -1;
    }
    if (pillar === 'trabalho') {
      return ['vaga', 'freelancer', 'trabalho', 'servico'].indexOf(cat) !== -1;
    }
    return true;
  }

  let communityLoadedOnce = false;
  let cachedCommunityProfiles = [];

  function renderCommunityProfiles(profiles) {
    const grid = document.getElementById('vila-community-profiles-grid');
    if (!grid) return;
    if (!profiles || !profiles.length) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:0.86rem;padding:12px 0">Nenhum pioneiro encontrado com esse filtro.</div>';
      return;
    }
    grid.innerHTML = profiles.map(function (p) {
      const handle = String(p.username || '').replace(/^@+/, '');
      const bio = escapeHtml((p.bio || 'Pioneiro ativo no ecossistema HOKAGE22B.').slice(0, 110));
      const avatar = safeImageUrl(p.avatar_url || '');
      const kycBadge = p.kyc_verified === true
        ? '<span style="font-size:0.68rem;background:rgba(16,185,129,0.16);border:1px solid rgba(16,185,129,0.4);color:#34d399;padding:2px 8px;border-radius:999px;font-weight:700">🛡️ KYC Verificado</span>'
        : '<span style="font-size:0.68rem;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.35);color:#c4b5fd;padding:2px 8px;border-radius:999px;font-weight:700">🪪 Passaporte Web3</span>';
      const avatarHtml = avatar
        ? '<img src="' + escapeHtml(avatar) + '" alt="@' + escapeHtml(handle) + '" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.2);flex-shrink:0" />'
        : '<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#f59e0b);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0">π</div>';

      return (
        '<article style="background:#141419;border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            avatarHtml +
            '<div style="min-width:0">' +
              '<div class="notranslate" translate="no" style="font-weight:800;color:#fff;font-size:0.98rem;overflow:hidden;text-overflow:ellipsis">@' + escapeHtml(handle) + '</div>' +
              '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">' + kycBadge + '</div>' +
            '</div>' +
          '</div>' +
          '<p style="margin:0;font-size:0.82rem;color:#a1a1aa;line-height:1.45">' + bio + '</p>' +
          '<a href="pioneiro?u=' + encodeURIComponent(handle) + '" class="btn btn-outline btn-sm" style="text-decoration:none;text-align:center;font-weight:700">👀 Ver Passaporte →</a>' +
        '</article>'
      );
    }).join('');
  }

  function filterCommunity(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) {
      renderCommunityProfiles(cachedCommunityProfiles);
      return;
    }
    const filtered = cachedCommunityProfiles.filter(function (p) {
      const hay = (String(p.username || '') + ' ' + String(p.bio || '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    renderCommunityProfiles(filtered);
  }

  async function loadCommunityDirectory() {
    const grid = document.getElementById('vila-community-profiles-grid');
    if (!grid || communityLoadedOnce) return;
    if (!window.IsarDB || typeof window.IsarDB.getPioneersDirectory !== 'function') {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:0.86rem">Diretório da comunidade temporariamente indisponível.</div>';
      return;
    }
    try {
      const profiles = await window.IsarDB.getPioneersDirectory({ limit: 30 });
      communityLoadedOnce = true;
      cachedCommunityProfiles = Array.isArray(profiles) ? profiles : [];
      if (!cachedCommunityProfiles.length) {
        grid.innerHTML = '<div style="color:var(--text-muted);font-size:0.86rem">Nenhum perfil público encontrado ainda.</div>';
        return;
      }
      renderCommunityProfiles(cachedCommunityProfiles);
    } catch (_) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:0.86rem">Não foi possível carregar os perfis agora.</div>';
    }
  }

  function setPillar(pillar) {
    currentPillar = pillar || 'inicio';

    document.querySelectorAll('#vila-pillar-nav [data-pillar]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pillar') === currentPillar);
    });

    if (currentCategory !== 'todos') {
      const meta = CATEGORY_META[currentCategory];
      const allowed = meta ? meta.pillars : ['inicio', 'mercado', 'mural', 'trabalho'];
      if (allowed.indexOf(currentPillar) === -1) {
        currentCategory = 'todos';
      }
    }
    syncCategorySelectAndChips();

    // Pré-seleciona uma categoria coerente ao abrir publicação dentro de uma área
    const catSel = document.getElementById('ad-input-cat');
    if (catSel) {
      if (currentPillar === 'trabalho') catSel.value = 'vaga';
      else if (currentPillar === 'mural') catSel.value = 'aviso';
      else if (currentPillar === 'mercado') catSel.value = 'produto';
    }

    const searchInp = document.getElementById('mural-search-input');
    const smartChips = document.getElementById('vila-smart-cat-chips');
    const filterToggleBtn = document.getElementById('vila-filters-toggle-btn');
    const resultsBar = document.getElementById('vila-results-bar');
    const sellerBanner = document.getElementById('mural-seller-banner');
    const emptyNotice = document.getElementById('mural-empty-notice');
    const featuredSec = document.getElementById('section-destaques');
    const communitySec = document.getElementById('section-comunidade');
    const communityHub = document.getElementById('vila-community-hub');

    if (currentPillar === 'comunidade') {
      if (searchInp) searchInp.placeholder = 'Buscar pioneiro por @usuário, habilidade ou bio...';
      if (smartChips) smartChips.style.display = 'none';
      if (filterToggleBtn) filterToggleBtn.style.display = 'none';
      toggleFiltersPanel(false);
      if (resultsBar) resultsBar.style.display = 'none';
      if (sellerBanner) sellerBanner.style.display = 'none';
      if (emptyNotice) emptyNotice.style.display = 'none';
      if (featuredSec) featuredSec.style.display = 'none';
      if (communitySec) communitySec.style.display = 'none';
      if (communityHub) communityHub.style.display = 'block';
      loadCommunityDirectory().then(function () {
        if (currentSearchQuery) filterCommunity(currentSearchQuery);
      });
      return;
    }

    if (searchInp) searchInp.placeholder = 'Buscar produtos, serviços, @vendedor, cidade ou Pi...';
    if (smartChips) smartChips.style.display = 'flex';
    if (filterToggleBtn) filterToggleBtn.style.display = 'inline-flex';
    if (resultsBar) resultsBar.style.display = 'flex';
    if (communityHub) communityHub.style.display = 'none';
    applyFilters();
  }

  function renderSmartCategoryChips(counts, totalEligible) {
    const container = document.getElementById('vila-smart-cat-chips');
    const sel = document.getElementById('mural-category-filter');

    if (sel) {
      Array.from(sel.options).forEach(function (opt) {
        const val = opt.value;
        if (!opt.dataset.baseLabel) opt.dataset.baseLabel = opt.textContent;
        if (val === 'todos') {
          opt.textContent = opt.dataset.baseLabel + ' (' + totalEligible + ')';
        } else {
          const n = counts[val] || 0;
          opt.textContent = opt.dataset.baseLabel + (n > 0 ? ' (' + n + ')' : '');
        }
      });
    }

    if (!container) return;
    const entries = Object.keys(counts)
      .filter(function (cat) { return counts[cat] > 0 && CATEGORY_META[cat]; })
      .sort(function (a, b) { return counts[b] - counts[a]; })
      .slice(0, 6);

    if (!entries.length) {
      container.innerHTML = '';
      return;
    }

    const todosHtml =
      '<button type="button" class="vila-smart-chip ' + (currentCategory === 'todos' ? 'active' : '') + '" data-category="todos">' +
        'Todos <span class="vila-smart-chip__count">' + totalEligible + '</span>' +
      '</button>';

    const catsHtml = entries.map(function (cat) {
      const activeClass = currentCategory === cat ? ' active' : '';
      return (
        '<button type="button" class="vila-smart-chip' + activeClass + '" data-category="' + escapeHtml(cat) + '">' +
          escapeHtml(CATEGORY_META[cat].label) +
          ' <span class="vila-smart-chip__count">' + counts[cat] + '</span>' +
        '</button>'
      );
    }).join('');

    container.innerHTML = todosHtml + catsHtml;
    container.querySelectorAll('.vila-smart-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterCategory(btn.getAttribute('data-category') || 'todos');
      });
    });
  }

  function renderActiveFilterChips(regionQuery) {
    const badge = document.getElementById('vila-active-filters-badge');
    const chipsWrap = document.getElementById('vila-active-chips');
    const active = [];

    if (currentCategory !== 'todos') {
      active.push({
        key: 'category',
        label: (CATEGORY_META[currentCategory] && CATEGORY_META[currentCategory].label) || currentCategory
      });
    }
    if (currentPaymentFilter !== 'todos') {
      const payLabels = { pi: '⚡ Somente Pi', pi_fiat: '⚡💵 Pi + Moeda', fiat: '💵 Só Moeda' };
      active.push({ key: 'payment', label: payLabels[currentPaymentFilter] || currentPaymentFilter });
    }
    if (currentTierFilter !== 'todos') {
      const tierLabels = { ouro: '🥇 Ouro', prata: '🥈 Prata', bronze: '🥉 Bronze', vitrine: '🪪 Catálogo ID', gratis: '🌱 Grátis' };
      active.push({ key: 'tier', label: tierLabels[currentTierFilter] || currentTierFilter });
    }
    if (currentCountryFilter !== 'todos') {
      active.push({ key: 'country', label: '🌎 ' + currentCountryFilter });
    }
    if (regionQuery) {
      active.push({ key: 'region', label: '📍 ' + regionQuery });
    }
    if (currentLangFilter !== 'todos') {
      active.push({ key: 'lang', label: '🗣️ ' + currentLangFilter.toUpperCase() });
    }
    if (currentSellerFilter) {
      active.push({ key: 'seller', label: '🏪 @' + currentSellerFilter });
    }

    if (badge) {
      badge.textContent = String(active.length);
      badge.style.display = active.length > 0 ? 'inline-flex' : 'none';
    }

    if (!chipsWrap) return;
    if (!active.length) {
      chipsWrap.innerHTML = '';
      return;
    }

    chipsWrap.innerHTML = active.map(function (item) {
      return '<button type="button" class="vila-active-chip" data-clear-filter="' + escapeHtml(item.key) + '">' + escapeHtml(item.label) + ' <span aria-hidden="true">✕</span></button>';
    }).join('');

    chipsWrap.querySelectorAll('[data-clear-filter]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const k = btn.getAttribute('data-clear-filter');
        if (k === 'category') filterCategory('todos');
        else if (k === 'payment') filterPaymentMode('todos');
        else if (k === 'tier') {
          const el = document.getElementById('mural-tier-filter');
          if (el) el.value = 'todos';
          filterTier('todos');
        } else if (k === 'country') {
          const el = document.getElementById('mural-country-filter');
          if (el) el.value = 'todos';
          filterCountry('todos');
        } else if (k === 'region') {
          const el = document.getElementById('mural-region-filter');
          if (el) el.value = '';
          filterRegion('');
        } else if (k === 'lang') {
          const el = document.getElementById('mural-lang-filter');
          if (el) el.value = 'todos';
          filterLang('todos');
        } else if (k === 'seller') {
          filterSeller('');
        }
      });
    });
  }

  // Filtragem combinada em tempo real por Categoria, Nível, Moeda, País, Região, Idioma e Busca Multi-Token
  function applyFilters() {
    if (currentPillar === 'comunidade') return;
    const rawQuery = (currentSearchQuery || '').trim();
    const normQuery = normalizeSearchText(rawQuery);
    const searchTokens = normQuery ? normQuery.split(/\s+/).filter(Boolean) : [];
    const regionQuery = normalizeSearchText((currentRegionFilter || '').trim());
    const featuredSec = document.getElementById('section-destaques');
    const communitySec = document.getElementById('section-comunidade');
    const featuredGrid = document.getElementById('mural-featured-grid');
    const communityGrid = document.getElementById('mural-community-grid');

    const allCards = document.querySelectorAll('.pioneer-card, .ad-card');
    let totalVisible = 0;
    let featuredVisible = 0;
    let communityVisible = 0;
    let totalEligibleForChips = 0;
    const catCounts = {};
    const vitrineCountBySeller = {};

    const sellerBanner = document.getElementById('mural-seller-banner');
    if (sellerBanner) {
      if (currentSellerFilter) {
        const safeSeller = escapeHtml(currentSellerFilter);
        sellerBanner.style.display = 'flex';
        sellerBanner.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%;background:linear-gradient(135deg,rgba(16,185,129,0.14),rgba(139,92,246,0.14));border:1px solid rgba(16,185,129,0.4);border-radius:14px;padding:12px 16px">' +
            '<div>' +
              '<strong style="color:#6ee7b7;font-size:0.95rem;display:block">🏪 Loja de @' + safeSeller + ' na Vila</strong>' +
              '<span style="font-size:0.8rem;color:#d4d4d8">Exibindo todos os produtos, serviços e anúncios vinculados a este vendedor.</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<a href="pioneiro?u=' + encodeURIComponent(currentSellerFilter) + '" class="btn btn-outline btn-sm" style="text-decoration:none;border-color:rgba(139,92,246,0.45);color:#ddd6fe">🪪 Abrir Passaporte</a>' +
              '<button type="button" onclick="window.IsarMural && window.IsarMural.filterSeller(\'\')" class="btn btn-outline btn-sm" style="border-color:rgba(245,158,11,0.5);color:#fde68a">✕ Ver toda a Vila</button>' +
            '</div>' +
          '</div>';
      } else {
        sellerBanner.style.display = 'none';
        sellerBanner.innerHTML = '';
      }
    }

    allCards.forEach(function (card) {
      if (card.closest('.pi-modal') || card.closest('.ad-preview-wrapper')) return;

      const cardCat = card.getAttribute('data-category') || 'geral';
      const matchesCat = (currentCategory === 'todos' || cardCat === currentCategory);
      const matchesPillar = cardMatchesPillar(cardCat, currentPillar);

      const cardTier = detectCardTier(card);
      const matchesTier = (currentTierFilter === 'todos' || cardTier === currentTierFilter);

      const cardSeller = card.getAttribute('data-seller') || '';
      const matchesSeller = !currentSellerFilter || (cardSeller === currentSellerFilter);

      const cardPayMode = card.getAttribute('data-payment-mode') || 'pi';
      const matchesPay = (currentPaymentFilter === 'todos' || cardPayMode === currentPaymentFilter);

      const cardCountry = card.getAttribute('data-country') || 'GLOBAL';
      const matchesCountry = (currentCountryFilter === 'todos' || cardCountry === currentCountryFilter);

      const haystack = normalizeSearchText(
        (card.textContent || '') + ' ' + cardSeller + ' ' + cardCat + ' ' + cardCountry + ' ' + cardPayMode
      );
      const matchesRegion = !regionQuery || haystack.includes(regionQuery);

      const cardLang = detectCardLang(card, cardCountry);
      const matchesLang = (currentLangFilter === 'todos' || cardLang === currentLangFilter);

      const matchesSearch = searchTokens.length === 0 || searchTokens.every(function (tok) {
        const cleanTok = tok.charAt(0) === '@' ? tok.slice(1) : tok;
        return haystack.includes(tok) || (cleanTok && haystack.includes(cleanTok));
      });

      const matchesNonCat = matchesPillar && matchesTier && matchesSeller && matchesPay && matchesCountry && matchesRegion && matchesLang && matchesSearch;
      if (matchesNonCat) {
        totalEligibleForChips++;
        catCounts[cardCat] = (catCounts[cardCat] || 0) + 1;
      }

      let matches = matchesNonCat && matchesCat;
      if (matches && !currentSellerFilter && !normQuery && card.getAttribute('data-source') === 'vitrine') {
        const count = vitrineCountBySeller[cardSeller] || 0;
        if (count >= 4) {
          matches = false;
        } else {
          vitrineCountBySeller[cardSeller] = count + 1;
        }
      }

      if (matches) {
        card.classList.remove('pioneer-card--hidden', 'ad-card--hidden');
        card.style.display = 'flex';
        totalVisible++;
        if (featuredGrid && featuredGrid.contains(card)) featuredVisible++;
        if (communityGrid && communityGrid.contains(card)) communityVisible++;
      } else {
        card.classList.add('pioneer-card--hidden', 'ad-card--hidden');
        card.style.display = 'none';
      }
    });

    renderSmartCategoryChips(catCounts, totalEligibleForChips);
    renderActiveFilterChips((currentRegionFilter || '').trim());

    reorderGridCards(featuredGrid, currentSortOrder);
    reorderGridCards(communityGrid, currentSortOrder);

    if (featuredSec && featuredGrid) {
      featuredSec.style.display = featuredVisible > 0 ? 'block' : 'none';
    }
    if (communitySec && communityGrid) {
      communitySec.style.display = communityVisible > 0 ? 'block' : 'none';
    }

    const countEl = document.getElementById('mural-results-count');
    if (countEl) {
      countEl.textContent = totalVisible === 1
        ? '1 resultado na Vila'
        : totalVisible + ' resultados na Vila';
    }

    const hasActiveFilters = Boolean(
      currentCategory !== 'todos' ||
      rawQuery ||
      regionQuery ||
      currentPaymentFilter !== 'todos' ||
      currentCountryFilter !== 'todos' ||
      currentTierFilter !== 'todos' ||
      currentLangFilter !== 'todos' ||
      currentSortOrder !== 'destaque' ||
      Boolean(currentSellerFilter)
    );
    const resetBtn = document.getElementById('mural-reset-filters-btn');
    if (resetBtn) {
      resetBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';
    }

    let emptyNotice = document.getElementById('mural-empty-notice');
    if (totalVisible === 0) {
      if (!emptyNotice) {
        emptyNotice = document.createElement('div');
        emptyNotice.id = 'mural-empty-notice';
        emptyNotice.style.cssText = 'text-align:center;padding:48px 20px;color:var(--text-secondary);background:rgba(255,255,255,0.03);border:1px solid rgba(245,158,11,0.28);border-radius:18px;margin:20px 0 36px;';
        if (featuredSec && featuredSec.parentElement) {
          featuredSec.parentElement.insertBefore(emptyNotice, featuredSec.nextSibling);
        } else {
          (document.querySelector('.mural-main .container') || document.body).appendChild(emptyNotice);
        }
      }
      if (rawQuery) {
        emptyNotice.innerHTML = `
          <div style="font-size:2.4rem;margin-bottom:12px">🔍</div>
          <h4 style="color:#fff;margin-bottom:6px;font-size:1.15rem">Nenhum anúncio encontrado para "${escapeHtml(rawQuery)}"</h4>
          <p style="font-size:0.88rem;max-width:500px;margin:0 auto">Tente outras palavras-chave ou limpe os filtros para ver todos os classificados.</p>
          <button type="button" class="portal-btn portal-btn--amber portal-btn--sm" onclick="window.IsarMural && window.IsarMural.clearAllFilters()" style="margin-top:16px;padding:8px 18px;font-weight:700">
            ✕ Limpar Busca e Filtros
          </button>
        `;
      } else {
        emptyNotice.innerHTML = `
          <div style="font-size:2.8rem;margin-bottom:12px">📢</div>
          <h4 style="color:#fff;margin-bottom:6px;font-size:1.2rem">Nenhum anúncio com estes filtros</h4>
          <p style="font-size:0.9rem;max-width:500px;margin:0 auto">Limpe os filtros ativos ou seja o primeiro pioneiro a publicar aqui na Pi Network!</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="window.IsarMural && window.IsarMural.clearAllFilters()">✕ Limpar Filtros</button>
            <button type="button" class="portal-btn portal-btn--primary portal-btn--sm" onclick="window.IsarMural && window.IsarMural.openModal()">+ Publicar na Vila</button>
          </div>
        `;
      }
      emptyNotice.style.display = 'block';
    } else if (emptyNotice) {
      emptyNotice.style.display = 'none';
    }
  }

  function filterCategory(cat) {
    currentCategory = cat || 'todos';
    syncCategorySelectAndChips();
    applyFilters();
  }

  function handleSearchInput(value) {
    currentSearchQuery = value || '';
    const trimmed = currentSearchQuery.trim();
    const clearBtn = document.getElementById('mural-search-clear-btn');
    if (clearBtn) {
      clearBtn.style.display = currentSearchQuery.length > 0 ? 'inline-flex' : 'none';
    }

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function () {
      if (currentPillar === 'comunidade') {
        filterCommunity(currentSearchQuery);
      } else {
        applyFilters();
      }
      if (trimmed.length >= 2 && !hasAutoScrolledForSearch) {
        hasAutoScrolledForSearch = true;
        scrollToResults(false);
      } else if (trimmed.length === 0) {
        hasAutoScrolledForSearch = false;
      }
    }, 90);
  }

  function clearSearch() {
    currentSearchQuery = '';
    hasAutoScrolledForSearch = false;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const input = document.getElementById('mural-search-input');
    if (input) {
      input.value = '';
      input.focus();
    }
    const clearBtn = document.getElementById('mural-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    if (currentPillar === 'comunidade') {
      filterCommunity('');
    } else {
      applyFilters();
    }
  }

  function initFilters() {
    const searchInput = document.getElementById('mural-search-input');
    if (searchInput && !searchInput.dataset.hkKeyBound) {
      searchInput.dataset.hkKeyBound = '1';
      searchInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
          currentSearchQuery = searchInput.value || '';
          if (currentPillar === 'comunidade') {
            filterCommunity(currentSearchQuery);
          } else {
            applyFilters();
          }
          scrollToResults(true);
        } else if (ev.key === 'Escape') {
          if (searchInput.value) {
            clearSearch();
          } else {
            toggleFiltersPanel(false);
          }
        }
      });
    }
  }

  function loadSavedLocalAds() {
    try {
      const local = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        const cleaned = local.filter(function (ad) {
          return ad && ad.id && !String(ad.id).startsWith('card-mock-') && ad.id !== 'card-ia-na-pratica';
        });
        if (cleaned.length !== local.length) {
          localStorage.setItem('isar_local_ads', JSON.stringify(cleaned));
        }
        cleaned.forEach(function (ad) {
          insertAdCard(ad);
        });
      }
    } catch (_) {}
  }

  function removeLoadingSkeleton() {
    const sk = document.getElementById('mural-loading-skeleton');
    if (sk) sk.remove();
    const errBox = document.getElementById('mural-sync-error-box');
    if (errBox) errBox.remove();
  }

  // Sincroniza anúncios aprovados salvos no Supabase com rotação equilibrada e hierarquia estrita
  function renderRemoteAdsHierarchy(remoteAds) {
    removeLoadingSkeleton();
    if (!Array.isArray(remoteAds) || remoteAds.length === 0) return;

    const featuredGrid = getFeaturedGrid();
    if (!featuredGrid) return;

    const ouroPaid = [];
    const ouroDemo = [];
    const prataAds = [];
    const bronzeAds = [];
    const vitrineAds = [];
    const gratisAds = [];

    remoteAds.forEach(function (ad) {
      if (!ad || !ad.id) return;
      if (document.getElementById('card-' + ad.id)) return;

      const tier = ad.is_vitrine_product
        ? 'vitrine'
        : ((ad.plan_tier === 'ouro' || ad.plan_tier === 'prata' || ad.plan_tier === 'gratis') ? ad.plan_tier : 'bronze');
      if (tier === 'ouro') {
        if (ad.is_founder_demo || ad.status === 'demonstracao') {
          ouroDemo.push(ad);
        } else {
          ouroPaid.push(ad);
        }
      } else if (tier === 'prata') {
        prataAds.push(ad);
      } else if (tier === 'vitrine') {
        vitrineAds.push(ad);
      } else if (tier === 'gratis') {
        gratisAds.push(ad);
      } else {
        bronzeAds.push(ad);
      }
    });

    const rotatedOuro = rotateFairly(ouroPaid).concat(ouroDemo);
    const rotatedPrata = rotateFairly(prataAds);
    bronzeAds.sort(function (a, b) {
      return (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0);
    });
    gratisAds.sort(function (a, b) {
      return (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0);
    });

    rotatedOuro.concat(rotatedPrata, bronzeAds, vitrineAds, gratisAds).forEach(function (ad) {
      insertAdCard(ad);
    });

    applyFilters();
    trackVisibleAds(remoteAds);
    hydrateCommentCounts();
  }

  function focusDeepLinkedAd() {
    try {
      const targetId = new URLSearchParams(window.location.search).get('ad');
      if (!targetId) return;
      const el = document.getElementById('card-' + targetId);
      if (el) {
        el.style.display = 'flex';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 2px #f59e0b, 0 18px 42px rgba(245,158,11,0.35)';
        setTimeout(function () { el.style.boxShadow = ''; }, 4000);
      }
    } catch (_) {}
  }

  function buildVitrineProductAds(profiles, existingAds) {
    if (!Array.isArray(profiles) || !profiles.length) return [];
    const seenTitleBySeller = new Set();
    (existingAds || []).forEach(function (ad) {
      const s = normalizeSellerHandle(ad && (ad.pioneer_username || ad.pioneer_name));
      const t = String((ad && ad.title) || '').trim().toLowerCase();
      if (s && t) seenTitleBySeller.add(s + '::' + t);
    });

    const virtualAds = [];
    profiles.forEach(function (prof) {
      if (!prof || !Array.isArray(prof.products) || !prof.products.length) return;
      const cleanSeller = normalizeSellerHandle(prof.username);
      if (!cleanSeller) return;
      prof.products.forEach(function (prod, idx) {
        const title = String((prod && prod.title) || '').trim();
        if (!title) return;
        const dedupKey = cleanSeller + '::' + title.toLowerCase();
        if (seenTitleBySeller.has(dedupKey)) return;

        const price = String((prod && prod.price) || '').trim();
        const priceFiat = String((prod && prod.price_fiat) || '').trim();
        const badge = String((prod && prod.badge) || '').trim();
        const hasPi = /π|\bpi\b/i.test(price);
        const hasFiat = Boolean(priceFiat) || /^(R\$|\$|€|USD|EUR|BRL)/i.test(price);
        const paymentModes = (hasPi && hasFiat) ? 'pi_fiat' : (hasFiat ? 'fiat' : 'pi');
        const combinedPrice = (price && priceFiat) ? (price + ' + ' + priceFiat) : (price || priceFiat || '');
        const desc = String((prod && prod.description) || '').trim() ||
          ((badge ? badge + ' · ' : '') + 'Produto/serviço oficial do catálogo de @' + cleanSeller + '.');
        const cardId = 'vitrine_' + cleanSeller + '_' + idx;
        const link = String((prod && prod.link) || '').trim();
        const img = String((prod && prod.image_url) || '').trim();
        const cat = inferVitrineCategory(prod);

        vitrineProductsCache[cardId] = {
          title: title,
          desc: desc,
          link: link,
          img: img,
          cat: cat,
          price: price || priceFiat,
          payment_modes: paymentModes
        };

        virtualAds.push({
          id: cardId,
          title: title,
          description: desc,
          link_url: link,
          image_url: img,
          category: cat,
          location: 'Hokage ID @' + cleanSeller,
          country_code: 'GLOBAL',
          payment_modes: paymentModes,
          item_price: combinedPrice || null,
          item_currency: hasFiat && !hasPi ? 'BRL' : 'PI',
          pioneer_username: '@' + cleanSeller,
          pioneer_name: cleanSeller,
          plan_tier: 'vitrine',
          is_vitrine_product: true,
          created_at: prof.updated_at || new Date(0).toISOString()
        });
      });
    });
    return virtualAds;
  }

  // Sincroniza anúncios aprovados e produtos das Vitrines salvos no Supabase
  async function syncRemoteAds() {
    const featuredGrid = getFeaturedGrid();
    if (!window.IsarDB || !window.IsarDB.getAnuncios) {
      removeLoadingSkeleton();
      applyFilters();
      return;
    }
    try {
      const timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('timeout')); }, 12000);
      });
      const profilesPromise = (window.IsarDB.getPioneersDirectory
        ? window.IsarDB.getPioneersDirectory({ limit: 80 }).catch(function () { return []; })
        : Promise.resolve([]));
      const results = await Promise.race([
        Promise.all([window.IsarDB.getAnuncios('todos', { limit: 150 }), profilesPromise]),
        timeoutPromise
      ]);
      const remoteAds = Array.isArray(results && results[0]) ? results[0] : [];
      const profiles = Array.isArray(results && results[1]) ? results[1] : [];
      const vitrineAds = buildVitrineProductAds(profiles, remoteAds);
      const combinedAds = remoteAds.concat(vitrineAds);

      removeLoadingSkeleton();
      if (combinedAds.length > 0) {
        renderRemoteAdsHierarchy(combinedAds);
      } else {
        applyFilters();
      }
      focusDeepLinkedAd();
    } catch (_) {
      removeLoadingSkeleton();
      if (featuredGrid && featuredGrid.children.length === 0) {
        featuredGrid.innerHTML = `
          <div id="mural-sync-error-box" style="grid-column:1/-1;text-align:center;padding:38px 20px;border-radius:16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.32)">
            <div style="font-size:1.6rem;margin-bottom:8px">⚠️</div>
            <strong style="color:#fff;display:block;margin-bottom:6px">Conexão lenta ao sincronizar os anúncios da Vila</strong>
            <p style="font-size:0.85rem;color:#d4d4d8;margin:0 0 14px">Verifique sua internet e toque abaixo para recarregar o feed.</p>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural && window.IsarMural.syncRemoteAds()">🔄 Tentar Novamente</button>
          </div>
        `;
      } else {
        applyFilters();
      }
    }
  }

  function trackVisibleAds(ads) {
    if (!Array.isArray(ads) || ads.length === 0) return;
    const sessionSeenKey = 'hokage_seen_ads';
    let seenAds = [];
    try {
      seenAds = JSON.parse(sessionStorage.getItem(sessionSeenKey) || '[]');
    } catch (_) {}

    const newSeenIds = [];
    ads.forEach(function (ad) {
      if (!ad || !ad.id || seenAds.includes(ad.id)) return;
      seenAds.push(ad.id);
      newSeenIds.push(ad.id);
    });

    if (newSeenIds.length > 0 && window.IsarDB) {
      if (window.IsarDB.incrementAdViewsBatch) {
        window.IsarDB.incrementAdViewsBatch(newSeenIds).catch(function () {});
      } else if (window.IsarDB.incrementAdView) {
        newSeenIds.forEach(function (id) {
          window.IsarDB.incrementAdView(id).catch(function () {});
        });
      }
    }

    try {
      sessionStorage.setItem(sessionSeenKey, JSON.stringify(seenAds));
    } catch (_) {}
  }

  function trackClick(adId) {
    if (!adId || adId === 'preview_card_mock') return;

    // Atualização visual imediata no card
    document.querySelectorAll(`.ad-clicks-num[data-id="${adId}"]`).forEach(function (el) {
      const current = parseInt(el.textContent, 10) || 0;
      el.textContent = current + 1;
    });

    // Atualiza no cache local de anúncios
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      const found = localAds.find(a => a.id === adId);
      if (found) {
        found.clicks_count = (found.clicks_count || 0) + 1;
        localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
      }
    } catch (_) {}

    // Envio atômico ao Supabase
    if (window.IsarDB && window.IsarDB.incrementAdClick) {
      window.IsarDB.incrementAdClick(adId).catch(function () {});
    }
  }

  function trackProfileVisit(adId) {
    if (!adId || adId === 'preview_card_mock') return;

    // Atualização visual imediata no card
    document.querySelectorAll(`.ad-profile-visits-num[data-id="${adId}"]`).forEach(function (el) {
      const current = parseInt(el.textContent, 10) || 0;
      el.textContent = current + 1;
    });

    // Atualiza no cache local de anúncios
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      const found = localAds.find(a => a.id === adId);
      if (found) {
        found.profile_visits = (found.profile_visits || 0) + 1;
        localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
      }
    } catch (_) {}

    // Envio atômico ao Supabase
    if (window.IsarDB && window.IsarDB.incrementAdProfileVisit) {
      window.IsarDB.incrementAdProfileVisit(adId).catch(function () {});
    }
  }

  function toggleLike(adId) {
    if (!adId || adId === 'preview_card_mock') return;

    let likedAds = [];
    try {
      likedAds = JSON.parse(localStorage.getItem('isar_liked_ads') || '[]');
    } catch (_) {}

    const alreadyLiked = likedAds.includes(adId);
    const likeBtns = document.querySelectorAll(`.btn-like-ad[data-id="${adId}"]`);
    const likeNums = document.querySelectorAll(`.ad-likes-num[data-id="${adId}"]`);

    if (alreadyLiked) {
      // Desfaz curtida
      likedAds = likedAds.filter(id => id !== adId);
      try {
        localStorage.setItem('isar_liked_ads', JSON.stringify(likedAds));
      } catch (_) {}

      likeBtns.forEach(btn => {
        btn.classList.remove('liked');
        btn.style.background = 'rgba(244,63,94,0.1)';
        btn.style.borderColor = 'rgba(244,63,94,0.3)';
        btn.style.color = '#fb7185';
        btn.style.fontWeight = '500';
      });
      likeNums.forEach(el => {
        const current = parseInt(el.textContent, 10) || 0;
        el.textContent = Math.max(0, current - 1);
      });

      try {
        const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
        const found = localAds.find(a => a.id === adId);
        if (found) {
          found.likes_count = Math.max(0, (found.likes_count || 0) - 1);
          localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
        }
      } catch (_) {}

      if (window.IsarDB && window.IsarDB.decrementAdLike) {
        window.IsarDB.decrementAdLike(adId).catch(function () {});
      }

      if (window.HokagePi && window.HokagePi.showToast) {
        window.HokagePi.showToast('Apoio removido.', 'info');
      }
    } else {
      // Adiciona curtida
      likedAds.push(adId);
      try {
        localStorage.setItem('isar_liked_ads', JSON.stringify(likedAds));
      } catch (_) {}

      likeBtns.forEach(btn => {
        btn.classList.add('liked');
        btn.style.background = 'rgba(244,63,94,0.25)';
        btn.style.borderColor = '#f43f5e';
        btn.style.color = '#fff';
        btn.style.fontWeight = '700';
      });
      likeNums.forEach(el => {
        const current = parseInt(el.textContent, 10) || 0;
        el.textContent = current + 1;
      });

      try {
        const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
        const found = localAds.find(a => a.id === adId);
        if (found) {
          found.likes_count = (found.likes_count || 0) + 1;
          localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
        }
      } catch (_) {}

      if (window.IsarDB && window.IsarDB.incrementAdLike) {
        window.IsarDB.incrementAdLike(adId).catch(function () {});
      }

      if (window.HokagePi && window.HokagePi.showToast) {
        window.HokagePi.showToast('❤️ Você apoiou este anúncio!', 'success');
      }
    }
  }

  // --- Modal de Criação de Anúncio ---
  function updateLivePreview() {
    const previewContainer = document.getElementById('ad-live-preview-target');
    if (!previewContainer) return;

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const userInput  = document.getElementById('ad-input-user');
    const catInput   = document.getElementById('ad-input-cat');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');
    const priceInput = document.getElementById('ad-input-item-price');
    const currInput  = document.getElementById('ad-input-item-currency');
    const locInput   = document.getElementById('ad-input-location');
    const ctryInput  = document.getElementById('ad-input-country');
    const payInput   = document.getElementById('ad-input-payment-modes');
    const syncedPricing = syncPaymentModeUi('ad');

    const title = (titleInput && titleInput.value.trim()) || 'Seu Título Aqui (Ex: Canal Tech / Loja Pi)';
    const desc = (descInput && descInput.value.trim()) || 'Aqui aparecerá a mensagem que todos os pioneiros vão ler no mural. Mostre seu projeto e atraia a comunidade!';
    const user = (userInput && userInput.value.trim()) || '@seu_usuario';
    const cat = (catInput && catInput.value) || 'youtube';
    const link = (linkInput && !linkInput.disabled && linkInput.value.trim()) || (selectedTier !== 'bronze' && selectedTier !== 'gratis' ? 'https://hokage22b.com' : '');
    const img = (imgInput && imgInput.value.trim()) || '';
    const itemPriceStr = (syncedPricing && syncedPricing.item_price) || (priceInput && priceInput.value ? priceInput.value.trim() : '');
    const itemCurrency = (syncedPricing && syncedPricing.item_currency) || (currInput && currInput.value) || 'PI';

    const previewAd = {
      id: 'preview_card_mock',
      plan_tier: selectedTier,
      title: title,
      description: desc,
      pioneer_username: user,
      category: cat,
      link_url: link,
      image_url: img,
      location: (locInput && locInput.value.trim()) || 'Online',
      country_code: (ctryInput && ctryInput.value) || 'GLOBAL',
      payment_modes: (syncedPricing && syncedPricing.payment_modes) || (payInput && payInput.value) || 'pi',
      item_price: itemPriceStr || null,
      item_currency: itemCurrency,
      price_pi: tierPrices[selectedTier] ? tierPrices[selectedTier].pi : 1.0
    };

    previewContainer.innerHTML = buildAdCardHtml(previewAd);

    // Controle Inteligente: Alterne entre os Botões do Fundador e de Anunciantes Padrão
    const cleanUser = user.toLowerCase().replace('@', '').trim();
    let cachedPiUser = '';
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      if (piUser && piUser.username) {
        cachedPiUser = piUser.username.toLowerCase().replace('@', '').trim();
      }
    } catch (_) {}

    const isFounder = cleanUser === 'hokage22b' || cachedPiUser === 'hokage22b';
    const founderBox = document.getElementById('founder-actions-box');
    const standardBox = document.getElementById('standard-actions-box');
    if (founderBox && standardBox) {
      if (isFounder) {
        founderBox.style.display = 'block';
        standardBox.style.display = 'none';
      } else {
        founderBox.style.display = 'none';
        standardBox.style.display = 'flex';
      }
    }
  }

  // --- Função para Retornar da Prévia para o Formulário sem Perder Dados ---
  function returnFromPreview(testId) {
    if (testId) {
      const card = document.getElementById('card-' + testId);
      if (card) card.remove();
    }
    const returnBar = document.getElementById('mural-preview-return-bar');
    if (returnBar) returnBar.remove();

    openModal();
    const modal = document.getElementById('ad-create-modal');
    if (modal) {
      modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function simulateTestnetPublish() {
    saveDraft(); // Garante que nenhum dado digitado seja perdido

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const userInput  = document.getElementById('ad-input-user');
    const catInput   = document.getElementById('ad-input-cat');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');

    const title = (titleInput && titleInput.value.trim()) || 'Pioneiro Web3';
    const desc  = (descInput && descInput.value.trim()) || 'Simulação de anúncio no mural via Testnet Pi. Pronto para publicação oficial na Mainnet!';
    const user  = (userInput && userInput.value.trim()) || '@pioneiro_testnet';
    const cat   = (catInput && catInput.value) || 'geral';
    const link  = (linkInput && !linkInput.disabled && linkInput.value.trim()) || '';
    const img   = (imgInput && imgInput.value.trim()) || '';

    const testId = 'testnet_' + Date.now();
    const testAd = {
      id: testId,
      plan_tier: selectedTier,
      title: '🧪 [PRÉVIA] ' + title,
      description: desc + ' — (Simulação temporária de visualização)',
      pioneer_username: user,
      category: cat,
      link_url: link,
      image_url: img,
      price_pi: '0.00 (Prévia)'
    };

    insertAdCard(testAd);
    const newCard = document.getElementById('card-' + testId);
    if (newCard) {
      newCard.classList.add('card-testnet-highlight');

      // Botão visível de retorno no próprio topo do card de prévia
      const returnBadge = document.createElement('div');
      returnBadge.style.cssText = 'background:rgba(245,158,11,0.18);border:1px solid rgba(245,158,11,0.4);border-radius:6px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:8px';
      returnBadge.innerHTML = `
        <span style="font-size:0.78rem;color:var(--amber-light);font-weight:600">👁️ Você está visualizando a prévia deste card</span>
        <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.returnFromPreview('${testId}')" style="font-size:0.75rem;padding:5px 12px;background:#f59e0b;color:#000;font-weight:700">
          🔙 Voltar ao Formulário
        </button>
      `;
      newCard.prepend(returnBadge);
    }

    hideSubmitFeedback();
    closeModal();

    // Cria a barra flutuante de retorno rápido na parte inferior da tela
    const oldBar = document.getElementById('mural-preview-return-bar');
    if (oldBar) oldBar.remove();

    const returnBar = document.createElement('div');
    returnBar.id = 'mural-preview-return-bar';
    returnBar.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(15,23,42,0.95);border:1px solid rgba(245,158,11,0.5);box-shadow:0 10px 30px rgba(0,0,0,0.8);padding:10px 16px;border-radius:40px;display:flex;align-items:center;gap:12px;backdrop-filter:blur(10px);max-width:92vw';
    returnBar.innerHTML = `
      <span style="font-size:0.8rem;color:#f3f4f6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">👁️ Modo Prévia Ativo</span>
      <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.returnFromPreview('${testId}')" style="font-size:0.8rem;padding:7px 16px;border-radius:20px;background:#f59e0b;color:#000;font-weight:700;white-space:nowrap">
        🔙 Voltar a Editar / Pagar
      </button>
      <button type="button" onclick="document.getElementById('mural-preview-return-bar').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;padding:2px 6px" aria-label="Fechar">✕</button>
    `;
    document.body.appendChild(returnBar);

    if (window.showToast) {
      window.showToast('👁️ Prévia carregada no mural! Toque em "Voltar" a qualquer momento.', 'ℹ️');
    }

    setTimeout(function () {
      const newCard = document.getElementById('card-' + testId);
      if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
  }

  // --- Sistema de Persistência de Rascunho & Tolerância a Troca de Apps ---
  const DRAFT_KEY = 'hokage_mural_ad_draft';
  const MODAL_OPEN_KEY = 'hokage_mural_modal_open';
  let pendingAdSubmission = null;

  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(data:image\/(png|jpe?g|webp|gif);base64,|blob:https?:\/\/)/i.test(trimmed)) {
      return trimmed;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  function saveDraft() {
    try {
      syncPaymentModeUi('ad');
      const titleEl = document.getElementById('ad-input-title');
      const descEl  = document.getElementById('ad-input-desc');
      const catEl   = document.getElementById('ad-input-cat');
      const linkEl  = document.getElementById('ad-input-link');
      const imgEl   = document.getElementById('ad-input-image');
      const userEl  = document.getElementById('ad-input-user');
      const priceEl = document.getElementById('ad-input-item-price');
      const currEl  = document.getElementById('ad-input-item-currency');
      const pricePiEl   = document.getElementById('ad-input-price-pi');
      const priceFiatEl = document.getElementById('ad-input-price-fiat');
      const fiatCurrEl  = document.getElementById('ad-input-fiat-currency');
      const locEl   = document.getElementById('ad-input-location');
      const ctryEl  = document.getElementById('ad-input-country');
      const payEl   = document.getElementById('ad-input-payment-modes');

      const draft = {
        title: (titleEl && titleEl.value) || '',
        desc: (descEl && descEl.value) || '',
        cat: (catEl && catEl.value) || 'produto',
        link: (linkEl && linkEl.value) || '',
        img: (imgEl && imgEl.value) || '',
        user: (userEl && userEl.value) || '',
        itemPrice: (priceEl && priceEl.value) || '',
        itemCurrency: (currEl && currEl.value) || 'PI',
        pricePi: (pricePiEl && pricePiEl.value) || '',
        priceFiat: (priceFiatEl && priceFiatEl.value) || '',
        fiatCurr: (fiatCurrEl && fiatCurrEl.value) || 'BRL',
        location: (locEl && locEl.value) || '',
        country: (ctryEl && ctryEl.value) || 'GLOBAL',
        paymentModes: (payEl && payEl.value) || 'pi',
        tier: selectedTier || 'prata',
        timestamp: Date.now()
      };

      if (draft.title || draft.desc || draft.link || draft.img || draft.itemPrice || draft.pricePi || draft.priceFiat) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    } catch (_) {}
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft) return false;

      const titleEl = document.getElementById('ad-input-title');
      const descEl  = document.getElementById('ad-input-desc');
      const catEl   = document.getElementById('ad-input-cat');
      const linkEl  = document.getElementById('ad-input-link');
      const imgEl   = document.getElementById('ad-input-image');
      const userEl  = document.getElementById('ad-input-user');
      const pricePiEl   = document.getElementById('ad-input-price-pi');
      const priceFiatEl = document.getElementById('ad-input-price-fiat');
      const fiatCurrEl  = document.getElementById('ad-input-fiat-currency');
      const locEl   = document.getElementById('ad-input-location');
      const ctryEl  = document.getElementById('ad-input-country');
      const payEl   = document.getElementById('ad-input-payment-modes');
      const banner  = document.getElementById('ad-draft-banner');

      let restored = false;

      if (draft.tier && tierPrices[draft.tier]) {
        selectTier(draft.tier);
      }
      if (draft.title && titleEl) {
        titleEl.value = draft.title;
        restored = true;
      }
      if (draft.desc && descEl) {
        descEl.value = draft.desc;
        restored = true;
      }
      if (draft.cat && catEl) {
        catEl.value = draft.cat;
      }
      if (draft.location && locEl) {
        locEl.value = draft.location;
      }
      if (draft.country && ctryEl) {
        ctryEl.value = draft.country;
      }
      if (draft.pricePi !== undefined || draft.priceFiat !== undefined) {
        if (payEl) payEl.value = draft.paymentModes || 'pi';
        if (pricePiEl && draft.pricePi) { pricePiEl.value = draft.pricePi; restored = true; }
        if (priceFiatEl && draft.priceFiat) { priceFiatEl.value = draft.priceFiat; restored = true; }
        if (fiatCurrEl && draft.fiatCurr) fiatCurrEl.value = draft.fiatCurr;
        syncPaymentModeUi('ad');
      } else {
        hydratePaymentModeUi('ad', draft.paymentModes || 'pi', draft.itemPrice || '', draft.itemCurrency || 'PI');
      }
      if (draft.link && linkEl && !linkEl.disabled) {
        linkEl.value = draft.link;
        restored = true;
      }
      if (draft.img && imgEl && !imgEl.disabled) {
        imgEl.value = draft.img;
        restored = true;
      }
      if (draft.user && userEl && !userEl.value) {
        userEl.value = draft.user;
      }

      if (restored && banner) {
        banner.style.display = 'flex';
      }

      updateLivePreview();
      return restored;
    } catch (_) {
      return false;
    }
  }

  function clearDraft(confirmPrompt) {
    if (confirmPrompt && !confirm('Deseja descartar o rascunho salvo e começar um novo anúncio do zero?')) {
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(MODAL_OPEN_KEY);
    } catch (_) {}

    const titleEl  = document.getElementById('ad-input-title');
    const descEl   = document.getElementById('ad-input-desc');
    const linkEl   = document.getElementById('ad-input-link');
    const imgEl    = document.getElementById('ad-input-image');
    const priceEl  = document.getElementById('ad-input-item-price');
    const pricePiEl   = document.getElementById('ad-input-price-pi');
    const priceFiatEl = document.getElementById('ad-input-price-fiat');
    const fiatCurrEl  = document.getElementById('ad-input-fiat-currency');
    const payEl    = document.getElementById('ad-input-payment-modes');
    const locEl    = document.getElementById('ad-input-location');
    const banner   = document.getElementById('ad-draft-banner');
    const feedback = document.getElementById('ad-submit-feedback');

    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    if (linkEl) linkEl.value = '';
    if (imgEl) imgEl.value = '';
    if (priceEl) priceEl.value = '';
    if (pricePiEl) pricePiEl.value = '';
    if (priceFiatEl) priceFiatEl.value = '';
    if (fiatCurrEl) fiatCurrEl.value = 'BRL';
    if (payEl) payEl.value = 'pi';
    if (locEl) locEl.value = '';
    if (banner) banner.style.display = 'none';
    if (feedback) {
      feedback.style.display = 'none';
      feedback.innerHTML = '';
    }

    pendingAdSubmission = null;
    selectTier('prata');
    syncPaymentModeUi('ad');
    updateLivePreview();
  }

  function showSubmitFeedback(type, message, actionsHtml) {
    const fb = document.getElementById('ad-submit-feedback');
    if (!fb) return;
    fb.style.display = 'block';

    if (type === 'error' || type === 'warning') {
      fb.style.background = 'rgba(239,68,68,0.14)';
      fb.style.border = '1px solid rgba(239,68,68,0.4)';
      fb.style.color = '#fca5a5';
    } else if (type === 'success') {
      fb.style.background = 'rgba(16,185,129,0.15)';
      fb.style.border = '1px solid rgba(16,185,129,0.35)';
      fb.style.color = '#a7f3d0';
    } else {
      fb.style.background = 'rgba(59,130,246,0.12)';
      fb.style.border = '1px solid rgba(59,130,246,0.35)';
      fb.style.color = '#93c5fd';
    }

    fb.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:1.15rem;line-height:1.2">${type === 'success' ? '✅' : (type === 'error' || type === 'warning' ? '⚠️' : 'ℹ️')}</span>
        <div style="flex:1">
          <div style="font-size:0.86rem;line-height:1.45">${message}</div>
          ${actionsHtml ? `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${actionsHtml}</div>` : ''}
        </div>
      </div>
    `;
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideSubmitFeedback() {
    const fb = document.getElementById('ad-submit-feedback');
    if (fb) {
      fb.style.display = 'none';
      fb.innerHTML = '';
    }
  }

  // --- Publicação de Exemplar Demonstrativo Oficial (Exclusivo do Fundador @hokage22b) ---
  async function publishFounderDemo() {
    const userInput = document.getElementById('ad-input-user');
    const userHandle = ((userInput && userInput.value) || '').toLowerCase().replace('@', '').trim();
    if (userHandle !== 'hokage22b') {
      alert('A publicação de demonstração institucional é exclusiva para o Fundador (@hokage22b). Anunciantes comerciais devem realizar o pagamento via Pi Wallet.');
      return;
    }

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');
    const catInput   = document.getElementById('ad-input-cat');
    const priceInput = document.getElementById('ad-input-item-price');
    const currInput  = document.getElementById('ad-input-item-currency');
    const locInput   = document.getElementById('ad-input-location');
    const ctryInput  = document.getElementById('ad-input-country');
    const payInput   = document.getElementById('ad-input-payment-modes');
    const syncedPricing = syncPaymentModeUi('ad');

    const title = (titleInput && titleInput.value.trim()) || 'Exemplar Oficial Hokage22b';
    const desc  = (descInput && descInput.value.trim()) || 'Demonstração institucional da Vila · Central P2P.';
    const demoPriceStr = (syncedPricing && syncedPricing.item_price) || (priceInput && priceInput.value ? priceInput.value.trim() : '');

    const demoAd = {
      id: 'founder_demo_' + Date.now(),
      title: title,
      description: desc,
      link_url: linkInput && !linkInput.disabled ? normalizeUrl(linkInput.value.trim()) : '',
      image_url: imgInput && !imgInput.disabled ? normalizeUrl(imgInput.value.trim()) : '',
      category: catInput ? catInput.value : 'geral',
      location: (locInput && locInput.value.trim()) || 'Online',
      country_code: (ctryInput && ctryInput.value) || 'GLOBAL',
      payment_modes: (syncedPricing && syncedPricing.payment_modes) || (payInput && payInput.value) || 'pi',
      item_price: demoPriceStr || null,
      item_currency: (syncedPricing && syncedPricing.item_currency) || (currInput && currInput.value) || 'PI',
      pioneer_username: '@hokage22b',
      pioneer_name: 'Hokage22b',
      plan_tier: selectedTier || 'ouro',
      price_pi: 0.00,
      status: 'demonstracao',
      is_founder_demo: true,
      exposure_type: 'priority',
      payment_txid: 'FOUNDER_DEMO_OFFICIAL',
      views_count: 0,
      clicks_count: 0,
      profile_visits: 0,
      likes_count: 0,
      created_at: new Date().toISOString()
    };

    // 1. Salva no banco de dados Supabase para aparecer no admin e em todos os dispositivos
    if (window.IsarDB && window.IsarDB.createAnuncio) {
      try {
        const res = await window.IsarDB.createAnuncio(demoAd);
        console.log('✓ Exemplar fundador sincronizado no Supabase:', res);
      } catch (dbErr) {
        console.warn('Erro ao sincronizar exemplar no Supabase:', dbErr);
      }
    }

    // 2. Salva localmente para cache instantâneo
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      localAds.unshift(demoAd);
      localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
    } catch (_) {}

    clearDraft(false);
    closeModal();
    hideSubmitFeedback();

    insertAdCard(demoAd);
    filterCategory(currentCategory);

    if (window.showToast) {
      window.showToast('👑 Exemplar Ouro Fundador demonstrativo publicado!', '✨');
    }

    setTimeout(function () {
      const el = document.getElementById('card-' + demoAd.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  }

  // --- Recuperação / Destravamento de Sessão da Carteira Pi ---
  async function clearExpiredPaymentAndRetry() {
    if (window.showToast) window.showToast('Limpando pendências e liberando carteira Pi...', 'info');
    showSubmitFeedback(
      'info',
      '⏳ <strong>Destravando sessão da Pi Wallet...</strong><br>Aguarde enquanto limpamos pagamentos antigos pendentes na memória do SDK.'
    );
    if (window.HokagePi && window.HokagePi.clearIncompletePayments) {
      await window.HokagePi.clearIncompletePayments();
    } else if (window.Pi && window.Pi.authenticate) {
      try {
        await window.Pi.authenticate(['username', 'payments'], function (p) {
          console.log('Incomplete payment encontrado:', p);
        });
      } catch (_) {}
    }
    showSubmitFeedback(
      'success',
      '✅ <strong>Carteira Pi destravada!</strong><br>Você pode tentar o pagamento seguro novamente ou transferir via Chave P2P:',
      `
        <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.handleAdSubmit()" style="font-size:0.86rem;padding:9px 16px;background:#8b5cf6;border-color:#7c3aed;color:#fff;font-weight:700">
          🚀 Pagar com Pi Wallet Novamente
        </button>
        <button type="button" class="btn btn-sm btn-outline" onclick="window.IsarMural && window.IsarMural.openManualP2PForAd()" style="font-size:0.84rem;padding:8px 14px;border-color:rgba(245,158,11,0.6);color:var(--amber-light);font-weight:600">
          📲 Pagar via Chave P2P
        </button>
      `
    );
  }

  // --- Pagamento Alternativo via Chave P2P (Quando o SDK da Pi Wallet der erro) ---
  function openManualP2PForAd() {
    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');
    const catInput   = document.getElementById('ad-input-cat');
    const userInput  = document.getElementById('ad-input-user');

    const title = (titleInput && titleInput.value.trim()) || 'Anúncio';
    const user = (userInput && userInput.value.trim()) || '@pioneiro';
    const priceInfo = tierPrices[selectedTier] || tierPrices.prata;

    const adId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const pendingAd = {
      id: adId,
      title: title,
      description: (descInput && descInput.value.trim()) || '',
      link_url: linkInput && !linkInput.disabled ? normalizeUrl(linkInput.value.trim()) : '',
      image_url: imgInput && !imgInput.disabled ? normalizeUrl(imgInput.value.trim()) : '',
      category: catInput ? catInput.value : 'geral',
      pioneer_username: user,
      pioneer_name: user.replace('@', ''),
      plan_tier: selectedTier,
      price_pi: priceInfo.pi,
      status: 'pendente', // NUNCA ativo de graça! Pendente até confirmação
      payment_method: 'p2p_manual',
      created_at: new Date().toISOString()
    };

    if (window.HokagePi && window.HokagePi.showManualP2PModal) {
      window.HokagePi.showManualP2PModal({
        amount: priceInfo.pi,
        memo: `Anúncio ${selectedTier.toUpperCase()}: ${title}`,
        metadata: { adId: adId, plan: selectedTier, pioneer_username: user },
        onSuccess: async function (paymentResult) {
          pendingAd.status = 'ativo';
          pendingAd.payment_txid = paymentResult.txid;

          if (window.IsarDB && window.IsarDB.createAnuncio) {
            try { await window.IsarDB.createAnuncio(pendingAd); } catch (_) {}
          }
          try {
            const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
            localAds.unshift(pendingAd);
            localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
          } catch (_) {}

          clearDraft(false);
          closeModal();
          hideSubmitFeedback();

          insertAdCard(pendingAd);
          filterCategory(currentCategory);
          alert(`🎉 Pagamento P2P de ${priceInfo.pi} π confirmado na blockchain! Seu anúncio já está no ar na Vila · Central P2P.`);
        }
      });
    }
  }

  function openModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    try {
      localStorage.setItem(MODAL_OPEN_KEY, '1');
    } catch (_) {}

    const userEl = document.getElementById('ad-input-user');
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      if (piUser && userEl && !userEl.value) {
        userEl.value = '@' + (piUser.username || '');
      }
    } catch (_) {}

    restoreDraft();
    syncPaymentModeUi('ad');
    updateLivePreview();
    refreshReferralCreditUi();
  }

  async function refreshReferralCreditUi() {
    const btn = document.getElementById('ad-referral-credit-btn');
    if (!btn) return;
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      const username = piUser && piUser.username ? piUser.username : '';
      if (username && window.HokageReferral && typeof window.HokageReferral.fetchStats === 'function') {
        const stats = await window.HokageReferral.fetchStats(username);
        availableReferralCredits = Number((stats && stats.referral_credits) || 0);
      } else {
        availableReferralCredits = 0;
      }
    } catch (_) {
      availableReferralCredits = 0;
    }
    updateReferralButtonVisibility();
  }

  function updateReferralButtonVisibility() {
    const btn = document.getElementById('ad-referral-credit-btn');
    if (!btn) return;
    if (availableReferralCredits > 0) {
      if (selectedTier === 'bronze') {
        btn.textContent = `🎁 Usar 1 Crédito de Indicação (Grátis · Você tem ${availableReferralCredits})`;
        btn.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        btn.style.borderColor = '#059669';
        btn.onclick = function () { redeemReferralAd(); };
      } else {
        btn.textContent = `🎁 Você tem ${availableReferralCredits} Crédito(s) Bronze Grátis! Toque para mudar para o Plano Bronze (0.00 π)`;
        btn.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
        btn.style.borderColor = '#f59e0b';
        btn.onclick = function () { selectTier('bronze'); };
      }
      btn.style.display = 'block';
    } else {
      btn.style.display = 'none';
    }
  }

  async function redeemReferralAd() {
    if (selectedTier !== 'bronze' || availableReferralCredits <= 0) return;
    const titleEl = document.getElementById('ad-input-title');
    const descEl  = document.getElementById('ad-input-desc');
    const catEl   = document.getElementById('ad-input-cat');
    const locEl   = document.getElementById('ad-input-location');
    const ctryEl  = document.getElementById('ad-input-country');
    const payEl   = document.getElementById('ad-input-payment-modes');

    const title = titleEl ? titleEl.value.trim() : '';
    const description = descEl ? descEl.value.trim() : '';
    if (title.length < 2 || description.length < 5) {
      if (typeof showSubmitFeedback === 'function') {
        showSubmitFeedback('warning', '<div style="font-weight:700;color:#fcd34d">Preencha o título (mín. 2 caracteres) e a descrição (mín. 5 caracteres) antes de usar seu crédito.</div>', '');
      }
      return;
    }

    const btn = document.getElementById('ad-referral-credit-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Validando crédito no servidor...';
    }

    try {
      if (!window.IsarDB || typeof window.IsarDB.redeemReferralAd !== 'function') {
        throw new Error('Módulo de banco de dados indisponível.');
      }
      const priceEl = document.getElementById('ad-input-item-price');
      const currEl  = document.getElementById('ad-input-item-currency');
      const syncedPricing = syncPaymentModeUi('ad');
      const redeemPriceStr = (syncedPricing && syncedPricing.item_price) || (priceEl && priceEl.value ? priceEl.value.trim() : '');
      const res = await window.IsarDB.redeemReferralAd({
        title: title,
        description: description,
        category: catEl ? catEl.value : 'geral',
        location: locEl ? locEl.value.trim() : 'Online',
        country_code: ctryEl ? ctryEl.value : 'GLOBAL',
        payment_modes: (syncedPricing && syncedPricing.payment_modes) || (payEl ? payEl.value : 'pi'),
        item_price: redeemPriceStr || null,
        item_currency: (syncedPricing && syncedPricing.item_currency) || (currEl && currEl.value) || 'PI'
      });

      availableReferralCredits = Number((res && res.remaining_credits) || 0);
      clearDraft(false);
      closeModal();
      try {
        window.dispatchEvent(new CustomEvent('hokage:action', { detail: { action: 'mural_posted' } }));
      } catch (_) {}
      await syncRemoteAds();
      if (window.HokagePi && window.HokagePi.showToast) {
        window.HokagePi.showToast('🎁 Crédito de indicação resgatado e anúncio publicado na Vila!', 'success');
      }
    } catch (err) {
      const msg = (err && err.message) || 'Não foi possível resgatar o crédito de indicação.';
      if (typeof showSubmitFeedback === 'function') {
        showSubmitFeedback('warning', `<div style="font-weight:700;color:#fca5a5">${escapeHtml(msg)}</div>`, '');
      }
      updateReferralButtonVisibility();
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function closeModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    try {
      localStorage.setItem(MODAL_OPEN_KEY, '0');
    } catch (_) {}
  }

  function selectTier(tier) {
    selectedTier = tier || 'gratis';
    document.querySelectorAll('.ad-tier-option').forEach(function (opt) {
      const isSel = opt.getAttribute('data-tier') === selectedTier;
      opt.classList.toggle('selected', isSel);
      opt.setAttribute('aria-pressed', isSel ? 'true' : 'false');
    });

    const isSandbox = /sandbox\.minepi\.com/i.test(document.referrer || '') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      /[?&]sandbox=(1|true)/i.test(window.location.search || '');
    const envLabel = isSandbox ? 'Testnet' : 'Pi Wallet';

    const info = tierPrices[selectedTier] || tierPrices.gratis;
    const infoEl = document.getElementById('ad-selected-payment-info');
    if (infoEl) {
      infoEl.textContent = selectedTier === 'gratis'
        ? 'Publicação gratuita na Vila (Pi Browser · 1 ativa a cada 7 dias · sem link externo)'
        : `Taxa da publicação: ${info.pi} π (${envLabel})`;
    }

    const submitBtn = document.getElementById('ad-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = selectedTier === 'gratis'
        ? '🌱 Publicar Grátis na Vila (0 π)'
        : `🚀 Pagar e Publicar com Pi Wallet (${info.pi} π)`;
    }

    const founderPayBtn = document.getElementById('founder-test-pay-btn');
    if (founderPayBtn) {
      founderPayBtn.textContent = isSandbox
        ? `💳 Pagar com Pi Wallet (${info.pi} π Testnet)`
        : `💳 Pagar com Pi Wallet (${info.pi} π)`;
    }

    updateReferralButtonVisibility();

    const linkInput = document.getElementById('ad-input-link');
    const badgeEl   = document.getElementById('ad-link-status-badge');
    const hintEl    = document.getElementById('ad-link-hint');

    if (linkInput) {
      if (selectedTier === 'bronze' || selectedTier === 'gratis') {
        linkInput.disabled = true;
        linkInput.value = '';
        linkInput.placeholder = '🚫 Links externos exclusivos para Prata e Ouro';
        linkInput.style.opacity = '0.5';
        linkInput.style.cursor = 'not-allowed';
        if (badgeEl) {
          badgeEl.textContent = selectedTier === 'gratis' ? 'Sem link externo no Grátis' : 'Sem link externo no Bronze';
          badgeEl.style.color = 'var(--text-muted)';
        }
        if (hintEl) {
          hintEl.textContent = selectedTier === 'gratis'
            ? 'Publicação gratuita exibe seu @usuário e link para seu Passaporte na Vila.'
            : 'O nível Bronze publica sua mensagem e @usuário com selo de compromisso em Pi.';
        }
      } else if (selectedTier === 'prata') {
        linkInput.disabled = false;
        linkInput.placeholder = 'youtube.com/... ou https://wa.me/...';
        linkInput.style.opacity = '1';
        linkInput.style.cursor = 'text';
        if (badgeEl) {
          badgeEl.textContent = 'Link Clicável Incluído 🥈';
          badgeEl.style.color = '#e2e8f0';
        }
        if (hintEl) {
          hintEl.textContent = 'Link direto para seu canal, WhatsApp, Instagram ou site (ajusta https:// automaticamente).';
        }
      } else if (selectedTier === 'ouro') {
        linkInput.disabled = false;
        linkInput.placeholder = 'youtube.com/... ou seu-canal-ou-loja.com';
        linkInput.style.opacity = '1';
        linkInput.style.cursor = 'text';
        if (badgeEl) {
          badgeEl.textContent = 'Link VIP em Card Duplo 🥇';
          badgeEl.style.color = 'var(--amber-light)';
        }
        if (hintEl) {
          hintEl.textContent = 'Link prioritário com botão âmbar de alta conversão + card com dobro de largura no topo!';
        }
      }
    }

    const imgInput = document.getElementById('ad-input-image');
    const imgGroup = document.getElementById('ad-image-group');
    if (imgInput && imgGroup) {
      if (selectedTier === 'gratis') {
        imgInput.disabled = true;
        imgInput.value = '';
        imgInput.placeholder = '🚫 Foto disponível a partir do Bronze (0.314 π)';
        imgGroup.style.opacity = '0.5';
      } else {
        imgInput.disabled = false;
        imgGroup.style.opacity = '1';
        imgInput.placeholder = selectedTier === 'ouro'
          ? 'https://... (URL da foto/capa em alta resolução para o banner VIP)'
          : 'https://... (URL da foto do produto ou serviço)';
      }
    }

    saveDraft();
    updateLivePreview();
  }

  let isAdSubmitInProgress = false;

  async function handleAdSubmit(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }

    if (isAdSubmitInProgress) {
      console.warn('handleAdSubmit: submissão já em andamento, ignorando chamada concorrente.');
      return;
    }
    isAdSubmitInProgress = true;

    hideSubmitFeedback();

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');
    const catInput   = document.getElementById('ad-input-cat');
    const userInput  = document.getElementById('ad-input-user');
    const submitBtn  = document.getElementById('ad-submit-btn');
    const founderPayBtn = document.getElementById('founder-test-pay-btn');

    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';

    if (!title || title.length < 3) {
      isAdSubmitInProgress = false;
      showSubmitFeedback('warning', 'Informe um título para o seu anúncio (mínimo 3 caracteres).');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!desc || desc.length < 5) {
      isAdSubmitInProgress = false;
      showSubmitFeedback('warning', 'Informe uma descrição detalhada para o anúncio (mínimo 5 caracteres).');
      if (descInput) descInput.focus();
      return;
    }

    const priceInfo = tierPrices[selectedTier] || tierPrices.prata;

    // Sanitização e normalização inteligente de URLs (nunca bloqueia falta de https://)
    const rawLink = linkInput ? linkInput.value.trim() : '';
    let validatedLink = '';
    if (selectedTier !== 'bronze' && selectedTier !== 'gratis' && rawLink) {
      validatedLink = normalizeUrl(rawLink);
      if (linkInput) linkInput.value = validatedLink;
    }

    const rawImg = imgInput ? imgInput.value.trim() : '';
    let validatedImg = '';
    if (selectedTier !== 'gratis' && rawImg) {
      validatedImg = normalizeUrl(rawImg);
      if (imgInput) imgInput.value = validatedImg;
    }

    const adId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : '@pioneiro';
    const isFounder = username.toLowerCase() === '@hokage22b' || username.toLowerCase() === 'hokage22b';

    const locInput = document.getElementById('ad-input-location');
    const countryInput = document.getElementById('ad-input-country');
    const payModeInput = document.getElementById('ad-input-payment-modes');
    const priceInput = document.getElementById('ad-input-item-price');
    const currInput = document.getElementById('ad-input-item-currency');
    const syncedPricing = syncPaymentModeUi('ad');
    const submitPriceStr = (syncedPricing && syncedPricing.item_price) || (priceInput && priceInput.value ? priceInput.value.trim() : '');

    const newAd = {
      id: adId,
      title: title,
      description: desc.slice(0, 1000),
      link_url: validatedLink,
      image_url: validatedImg,
      category: catInput ? catInput.value : 'geral',
      country_code: (countryInput && countryInput.value) ? countryInput.value : 'GLOBAL',
      location: (locInput && locInput.value.trim()) ? locInput.value.trim().slice(0, 60) : 'Online',
      payment_modes: (syncedPricing && syncedPricing.payment_modes) || (payModeInput && payModeInput.value ? payModeInput.value : 'pi'),
      item_price: submitPriceStr || null,
      item_currency: (syncedPricing && syncedPricing.item_currency) || (currInput && currInput.value ? currInput.value : 'PI'),
      pioneer_username: username,
      pioneer_name: username.replace('@', ''),
      plan_tier: selectedTier,
      price_pi: priceInfo.pi,
      status: 'ativo',
      views_count: 0,
      clicks_count: 0,
      profile_visits: 0,
      likes_count: 0,
      created_at: new Date().toISOString()
    };

    if (selectedTier === 'gratis') {
      isAdSubmitInProgress = false;
      const submitBtnEl = document.getElementById('ad-submit-btn');
      if (submitBtnEl) { submitBtnEl.disabled = true; submitBtnEl.textContent = '🌱 Publicando grátis...'; }
      (async function () {
        try {
          let token = '';
          try { token = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
          if (!token && window.HokagePi && typeof window.HokagePi.ensureAccessToken === 'function') {
            token = await window.HokagePi.ensureAccessToken();
          } else if (!token && window.Pi && typeof window.Pi.authenticate === 'function') {
            const auth = await window.Pi.authenticate(['username'], function () {});
            if (auth && auth.accessToken) {
              token = auth.accessToken;
              try { sessionStorage.setItem('hokage_pi_access_token', token); } catch (_) {}
            }
          }
          let web2Token = '';
          if (!token && window.HokageWeb2Auth && typeof window.HokageWeb2Auth.getAccessToken === 'function') {
            try { web2Token = await window.HokageWeb2Auth.getAccessToken(); } catch (_) {}
          }
          if (!token && !web2Token) {
            const isInPi = Boolean(window.HokagePi && window.HokagePi.isPiBrowser && window.HokagePi.isPiBrowser());
            if (isInPi) {
              showSubmitFeedback('warning', 'Conecte sua conta no <strong>Pi Browser</strong> para publicar gratuitamente na Vila.');
            } else {
              showSubmitFeedback(
                'warning',
                'Para publicar seu anúncio grátis, entre com seu <strong>E-mail / Google</strong> ou crie seu @usuário primeiro.',
                '<button type="button" class="btn btn-sm btn-primary" onclick="if(window.HokagePi&&window.HokagePi.openPiConnectModal)window.HokagePi.openPiConnectModal()">🔑 Entrar / Criar Conta</button>'
              );
            }
            return;
          }
          const freeReqBody = {
            action: 'publish_free_ad',
            adPayload: newAd
          };
          if (token) freeReqBody.accessToken = token;
          if (web2Token) freeReqBody.web2Token = web2Token;
          const res = await fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(freeReqBody)
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) {
            showSubmitFeedback('warning', escapeHtml((json && json.error) || 'Não foi possível publicar gratuitamente agora.'));
            return;
          }
          const serverAd = json.ad || (json.data && json.data.ad) || null;
          if (serverAd && serverAd.id) {
            Object.assign(newAd, serverAd);
          }
          newAd.plan_tier = 'gratis';
          newAd.price_pi = 0;
          newAd.status = 'ativo';
          insertAdCard(newAd);
          applyFilters();
          clearDraft(false);
          closeModal();
          try {
            window.dispatchEvent(new CustomEvent('hokage:action', { detail: { action: 'mural_posted' } }));
          } catch (_) {}
          if (window.HokagePi && window.HokagePi.showToast) {
            window.HokagePi.showToast('✓ Publicação gratuita ativa na Vila!', 'success');
          }
        } catch (err) {
          showSubmitFeedback('warning', 'Erro de comunicação ao publicar gratuitamente. Tente novamente.');
        } finally {
          if (submitBtnEl) {
            submitBtnEl.disabled = false;
            submitBtnEl.textContent = '🌱 Publicar Grátis na Vila (0 π)';
          }
        }
      })();
      return;
    }

    pendingAdSubmission = newAd;

    function resetSubmitButtons() {
      isAdSubmitInProgress = false;
      const isSandboxEnv = Boolean(
        window.HOKAGE_CONFIG &&
        window.HOKAGE_CONFIG.piNetwork &&
        window.HOKAGE_CONFIG.piNetwork.sandbox === true
      );
      const suffix = isSandboxEnv ? ' Testnet' : '';
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `🚀 Pagar e Publicar com Pi Wallet (${priceInfo.pi} π${suffix})`;
      }
      if (founderPayBtn) {
        founderPayBtn.disabled = false;
        founderPayBtn.textContent = `💳 Pagar com Pi Wallet (${priceInfo.pi} π${suffix})`;
      }
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando publicação…';
    }
    if (founderPayBtn) {
      founderPayBtn.disabled = true;
      founderPayBtn.textContent = 'Processando na Pi Wallet…';
    }

    // WATCHDOG DE SEGURANÇA: Destrava os botões se o app nativo do Pi fechar sem disparar callbacks
    let watchdogTimer = setTimeout(function () {
      console.warn('Watchdog acionado: Pi Wallet demorou ou fechou sem resposta nativa.');
      resetSubmitButtons();
      const modal = document.getElementById('ad-create-modal');
      if (modal) modal.classList.add('active');
      showSubmitFeedback(
        'warning',
        `<div style="font-weight:700;font-size:0.96rem;margin-bottom:6px;color:#fca5a5">
          ⚠️ A janela da Pi Wallet foi encerrada ou demorou para responder
         </div>
         <div style="font-size:0.84rem;color:#f3f4f6;line-height:1.45;margin-bottom:12px">
          Seus dados continuam 100% salvos. Se o pagamento fechou, você pode tentar novamente ou publicar a demonstração:
         </div>`,
        `
          <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.clearExpiredPaymentAndRetry()" style="font-size:0.86rem;padding:9px 18px;background:#8b5cf6;border-color:#7c3aed;color:#fff;font-weight:700">
            🔄 Destravar Carteira e Pagar
          </button>
          ${isFounder ? `
            <button type="button" class="btn btn-sm btn-outline" onclick="window.IsarMural && window.IsarMural.publishFounderDemo()" style="font-size:0.8rem;padding:8px 12px;border-color:rgba(245,158,11,0.7);color:var(--amber-light);font-weight:700">
              👑 Publicar Exemplar Fundador (Demonstração)
            </button>
          ` : ''}
        `
      );
    }, 90000);

    // Listener de retorno à página no celular (Samsung S20 / Pi Browser)
    const onReturnToPage = function () {
      setTimeout(function () {
        if (window.HokagePi && typeof window.HokagePi.isPaymentInFlight === 'function' && window.HokagePi.isPaymentInFlight()) {
          return;
        }
        if ((submitBtn && submitBtn.disabled && submitBtn.textContent.includes('Processando')) ||
            (founderPayBtn && founderPayBtn.disabled && founderPayBtn.textContent.includes('Processando'))) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();
        }
      }, 4000);
    };
    window.addEventListener('focus', onReturnToPage, { once: true });
    document.addEventListener('visibilitychange', onReturnToPage, { once: true });

    // ── FLUXO A: Exclusivamente dentro do Pi Browser (Pagamento Nativo) ──
    const canUsePi = Boolean(window.HokagePi && window.HokagePi.isPiBrowser && window.HokagePi.isPiBrowser());
    if (canUsePi) {
      window.HokagePi.requestPiPayment({
        amount: priceInfo.pi,
        memo: `Mural HOKAGE22B: ${title.substring(0, 24)}`,
        adPayload: newAd,
        metadata: {
          type: 'anuncio',
          adId: adId,
          tier: selectedTier,
          expectedPrice: priceInfo.pi
        },
        onSuccess: async function (paymentResult) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();

          newAd.status = 'ativo';
          newAd.payment_txid = paymentResult.txid;
          const srvAd = (paymentResult && paymentResult.serverResult && (paymentResult.serverResult.ad || (paymentResult.serverResult.data && paymentResult.serverResult.data.ad))) || null;
          if (srvAd && srvAd.id) {
            Object.assign(newAd, srvAd);
          }

          if (window.IsarDB && window.IsarDB.createAnuncio) {
            try { await window.IsarDB.createAnuncio(newAd); } catch (_) {}
          }

          try {
            const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
            localAds.unshift(newAd);
            localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
          } catch (_) {}

          clearDraft(false);
          closeModal();
          hideSubmitFeedback();

          insertAdCard(newAd);
          applyFilters();
          try {
            window.dispatchEvent(new CustomEvent('hokage:action', { detail: { action: 'mural_posted' } }));
          } catch (_) {}
          if (window.HokagePi && window.HokagePi.showToast) {
            window.HokagePi.showToast(`🎉 Pagamento de ${priceInfo.pi} π confirmado! Seu anúncio está ativo na Vila.`, 'success');
          }
        },
        onError: function (err) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();

          console.error('Erro no pagamento Pi do mural:', err);

          // Garante que o modal permaneça aberto e ativo
          const modal = document.getElementById('ad-create-modal');
          if (modal) modal.classList.add('active');

          const errMsg = (err && (err.message || (typeof err === 'string' ? err : ''))) || 'Pagamento não concluído.';
          const isPendingOrCancelled = /expired|cancelled|canceled|progress/i.test(errMsg);

          if (isPendingOrCancelled) {
            showSubmitFeedback(
              'warning',
              `<div style="font-weight:700;font-size:0.96rem;margin-bottom:6px;color:#fca5a5">
                ⚠️ Transação anterior na Pi Wallet já cancelada ou expirada
               </div>
               <div style="font-size:0.84rem;color:#f3f4f6;line-height:1.45;margin-bottom:12px">
                A Pi Network reportou: <em>"${escapeHtml(errMsg)}"</em>.<br>
                Isso ocorre quando uma tentativa anterior não foi assinada a tempo ou já foi encerrada pela carteira.<br>
                <strong style="color:#10b981">Seus dados continuam 100% salvos.</strong> Clique abaixo para destravar a carteira e realizar o pagamento seguro:
               </div>`,
              `
                <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.clearExpiredPaymentAndRetry()" style="font-size:0.86rem;padding:9px 18px;background:#8b5cf6;border-color:#7c3aed;color:#fff;font-weight:700">
                  🔄 Destravar Carteira Pi e Pagar
                </button>
                ${isFounder ? `
                  <button type="button" class="btn btn-sm btn-outline" onclick="window.IsarMural && window.IsarMural.publishFounderDemo()" style="font-size:0.8rem;padding:8px 12px;border-color:rgba(245,158,11,0.7);color:var(--amber-light);font-weight:700">
                    👑 Publicar Exemplar Fundador (Demonstração)
                  </button>
                ` : ''}
              `
            );
          } else {
            showSubmitFeedback(
              'warning',
              `<strong>Atenção:</strong> O pagamento automático Pi não pôde ser concluído (${escapeHtml(errMsg)}).<br>
               <span style="color:#fff;font-weight:600">Seu rascunho continua 100% salvo.</span>`,
              `
                <button type="button" class="btn btn-sm btn-primary" onclick="window.IsarMural && window.IsarMural.clearExpiredPaymentAndRetry()" style="font-size:0.86rem;padding:9px 18px;background:#8b5cf6;border-color:#7c3aed;color:#fff;font-weight:700">
                  🔄 Tentar Novamente na Pi Wallet
                </button>
                ${isFounder ? `
                  <button type="button" class="btn btn-sm btn-outline" onclick="window.IsarMural && window.IsarMural.publishFounderDemo()" style="font-size:0.8rem;padding:8px 12px;border-color:rgba(245,158,11,0.7);color:var(--amber-light);font-weight:700">
                    👑 Publicar Exemplar Fundador (Demonstração)
                  </button>
                ` : ''}
              `
            );
          }
        },
        onCancel: function () {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();

          const modal = document.getElementById('ad-create-modal');
          if (modal) modal.classList.add('active');

          showSubmitFeedback(
            'info',
            'O pagamento Pi foi cancelado na carteira. Seu rascunho continua salvo para quando você quiser tentar novamente.'
          );
        }
      });
      return;
    }

    // ── FLUXO B: Fora do Pi Browser (Exige validação instantânea via Pi Wallet no Pi Browser) ──
    isAdSubmitInProgress = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = `🚀 Pagar e Publicar com Pi Wallet (${priceInfo.pi} π)`;
    }
    if (founderPayBtn) {
      founderPayBtn.disabled = false;
      founderPayBtn.textContent = `💳 Testar Pagamento Real na Pi Wallet (${priceInfo.pi} π)`;
    }

    const piDeepLink = 'pi://' + window.location.host + window.location.pathname;

    showSubmitFeedback(
      'warning',
      `<strong>⚠️ Validação Instantânea Obrigatória:</strong><br>
       Para manter a integridade comercial da Vila, anúncios pagos exigem validação instantânea pela blockchain via <strong>Pi Wallet oficial</strong>.<br>
       <span style="color:#fff;display:block;margin-top:6px">Seu rascunho continua 100% salvo. Abra esta página no Pi Browser oficial no celular para concluir:</span>`,
      `
        <a href="${piDeepLink}" class="btn btn-sm btn-primary" style="font-size:0.84rem;padding:8px 16px;text-decoration:none;display:inline-block;background:#8b5cf6;border-color:#7c3aed;font-weight:700">
          🚀 Abrir no Pi Browser Oficial
        </a>
        ${isFounder ? `
          <button type="button" class="btn btn-sm btn-outline" onclick="window.IsarMural && window.IsarMural.publishFounderDemo()" style="font-size:0.8rem;padding:8px 12px;border-color:rgba(245,158,11,0.7);color:var(--amber-light);font-weight:700">
            👑 Publicar Exemplar Fundador (Demonstração)
          </button>
        ` : ''}
      `
    );
  }

  // --- Upload Direto de Imagens (Supabase Storage) ---
  function initFileUpload() {
    const fileInput = document.getElementById('ad-file-input');
    const statusEl  = document.getElementById('ad-upload-status');
    const imgInput  = document.getElementById('ad-input-image');
    const clearBtn  = document.getElementById('ad-clear-img-btn');

    if (!fileInput) return;

    fileInput.addEventListener('change', async function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido (JPEG, PNG ou WebP).');
        return;
      }

      // 1. Atualiza a Prévia ao Vivo imediatamente com o blob local
      const localBlobUrl = URL.createObjectURL(file);
      if (imgInput) imgInput.value = localBlobUrl;
      updateLivePreview();

      // 2. Exibe feedback de envio
      if (statusEl) {
        statusEl.className = 'ad-upload-status';
        statusEl.style.display = 'flex';
        statusEl.innerHTML = '⏳ <span>Otimizando e enviando foto...</span>';
      }

      try {
        if (!window.IsarDB || !window.IsarDB.uploadAdImage) {
          throw new Error('Módulo de upload não disponível');
        }

        const publicUrl = await window.IsarDB.uploadAdImage(file, function (msg) {
          if (statusEl) statusEl.innerHTML = `⏳ <span>${escapeHtml(msg)}</span>`;
        });

        // 3. Sucesso: atualiza o input de imagem com a URL permanente do Supabase Storage
        if (imgInput) imgInput.value = publicUrl;
        if (statusEl) {
          statusEl.className = 'ad-upload-status success';
          statusEl.innerHTML = '✓ <span>Foto pronta e vinculada ao anúncio!</span>';
        }
        if (clearBtn) clearBtn.style.display = 'inline-block';
        updateLivePreview();

      } catch (err) {
        console.warn('Upload de imagem falhou:', err);
        if (statusEl) {
          const isAuthErr = err && /autentic|pi browser/i.test(String(err.message || ''));
          statusEl.className = 'ad-upload-status error';
          statusEl.innerHTML = isAuthErr
            ? '⚠️ <span>Conecte sua conta no <strong>Pi Browser</strong> para salvar a foto no servidor.</span>'
            : '⚠️ <span>Não foi possível salvar no Storage. A foto temporária foi mantida na prévia.</span>';
        }
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (fileInput) fileInput.value = '';
        if (imgInput) imgInput.value = '';
        if (statusEl) {
          statusEl.style.display = 'none';
          statusEl.textContent = '';
        }
        clearBtn.style.display = 'none';
        updateLivePreview();
      });
    }
  }

  // --- PAINEL DO ANUNCIANTE (MEUS ANÚNCIOS SAAS — BLINDADO) ---
  let myCachedAds = [];

  function renderMyAdsAuthGate(container, isPiBrowser) {
    const countEl = document.getElementById('my-ads-count');
    const viewsEl = document.getElementById('my-ads-views');
    const clicksEl = document.getElementById('my-ads-clicks');
    if (countEl) countEl.textContent = '0';
    if (viewsEl) viewsEl.textContent = '0';
    if (clicksEl) clicksEl.textContent = '0';

    if (!container) return;

    if (!isPiBrowser) {
      container.innerHTML = `
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.35);border-radius:10px;padding:18px;text-align:center">
          <div style="font-size:1.5rem;margin-bottom:6px">🔒</div>
          <strong style="color:#fcd34d;display:block;margin-bottom:6px">Painel Protegido — Exclusivo Pi Browser</strong>
          <p style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;margin:0">
            Por segurança, a gestão, edição e renovação de anúncios exige autenticação criptográfica via <strong>Pi SDK</strong> dentro do <strong>Pi Browser</strong>.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.35);border-radius:10px;padding:18px;text-align:center">
        <div style="font-size:1.5rem;margin-bottom:6px">🛡️</div>
        <strong style="color:#c4b5fd;display:block;margin-bottom:6px">Conecte sua conta Pi para continuar</strong>
        <p style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;margin:0 0 12px">
          Somente o titular autenticado pode visualizar métricas privadas, editar (até 24h) ou renovar seus anúncios.
        </p>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural && window.IsarMural.connectPiForMyAds()" style="padding:10px 18px;font-weight:700">
          ⚡ Conectar via Pi Login
        </button>
      </div>
    `;
  }

  function updateMyAdsAuthBar() {
    const authBar = document.getElementById('my-ads-auth-status');
    const authUser = getAuthenticatedPiUser();
    const isPi = Boolean(window.HokagePi && window.HokagePi.isPiBrowser && window.HokagePi.isPiBrowser());
    if (!authBar) return { authUser: authUser, isPi: isPi };

    if (authUser) {
      authBar.innerHTML = `
        <span style="color:#34d399;font-weight:700;font-size:0.84rem">✓ Sessão verificada: ${escapeHtml(authUser.username)}</span>
        <button type="button" class="btn btn-outline btn-sm" onclick="window.IsarMural && window.IsarMural.loadMyAds()" style="padding:6px 12px;font-size:0.78rem">
          🔄 Atualizar
        </button>
      `;
    } else if (isPi) {
      authBar.innerHTML = `
        <span style="color:#fcd34d;font-size:0.82rem">Sessão Pi não conectada</span>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural && window.IsarMural.connectPiForMyAds()" style="padding:6px 12px;font-size:0.78rem">
          ⚡ Conectar Pi
        </button>
      `;
    } else {
      authBar.innerHTML = `
        <span style="color:#fca5a5;font-size:0.8rem">🔒 Abra no Pi Browser para gerenciar seus anúncios</span>
      `;
    }
    return { authUser: authUser, isPi: isPi };
  }

  async function connectPiForMyAds() {
    if (!window.HokagePi || !window.HokagePi.isPiBrowser || !window.HokagePi.isPiBrowser()) {
      alert('A autenticação Pi só pode ser feita dentro do aplicativo oficial Pi Browser.');
      return;
    }
    try {
      const user = await window.HokagePi.loginWithPi();
      if (user && user.username) {
        loadMyAds();
      }
    } catch (err) {
      alert('Não foi possível conectar via Pi Login: ' + (err && err.message ? err.message : 'erro desconhecido'));
    }
  }

  function openMyAdsModal() {
    const modal = document.getElementById('my-ads-modal');
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    loadMyAds();
  }

  function closeMyAdsModal() {
    const modal = document.getElementById('my-ads-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function loadMyAds() {
    const container = document.getElementById('my-ads-list-container');
    const state = updateMyAdsAuthBar();

    if (!state.isPi || !state.authUser) {
      myCachedAds = [];
      renderMyAdsAuthGate(container, state.isPi);
      return;
    }

    const user = state.authUser.username;
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Consultando seus anúncios autenticados...</div>';

    try {
      const ads = await window.IsarDB.getMyAds(user);
      myCachedAds = (ads || []).filter(function (a) {
        return normalizeHandle(a.pioneer_username) === normalizeHandle(user);
      });

      let totalViews = 0;
      let totalClicks = 0;
      let totalProfileVisits = 0;
      myCachedAds.forEach(a => {
        totalViews += (Number(a.views_count) || 0);
        totalClicks += (Number(a.clicks_count) || 0);
        totalProfileVisits += (Number(a.profile_visits || a.profile_clicks) || 0);
      });

      const countEl = document.getElementById('my-ads-count');
      const viewsEl = document.getElementById('my-ads-views');
      const clicksEl = document.getElementById('my-ads-clicks');

      if (countEl) countEl.textContent = myCachedAds.length;
      if (viewsEl) viewsEl.textContent = totalViews;
      if (clicksEl) clicksEl.textContent = totalClicks + totalProfileVisits;

      if (myCachedAds.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px;color:var(--text-muted)">
            Nenhum anúncio encontrado para ${escapeHtml(user)}.<br />
            <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural.closeMyAdsModal();window.IsarMural.openModal();" style="margin-top:10px">
              + Publicar Primeiro Anúncio
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = myCachedAds.map(ad => {
        const st = String(ad.status || 'ativo').toLowerCase();
        const statusBadge = st === 'ativo'
          ? '<span style="color:#10b981;font-weight:700">● Ativo</span>'
          : (st === 'pausado'
            ? '<span style="color:#fbbf24;font-weight:700">⏸️ Pausado</span>'
            : (st === 'vendido'
              ? '<span style="color:#60a5fa;font-weight:700">✅ Vendido</span>'
              : (st === 'suspenso'
                ? '<span style="color:#ef4444;font-weight:700">⛔ Suspenso</span>'
                : '<span style="color:#f59e0b;font-weight:700">● Em moderação</span>')));
        const canSelfManage = st !== 'suspenso' && st !== 'moderacao';
        const editButtonHtml = canSelfManage
          ? `<button type="button" class="btn btn-outline btn-sm" data-mural-action="edit-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.78rem;padding:6px 10px">✏️ Editar</button>`
          : `<button type="button" class="btn btn-outline btn-sm" disabled title="Anúncio bloqueado para edição durante moderação" style="font-size:0.75rem;padding:6px 10px;opacity:0.45;cursor:not-allowed">🔒 Moderação</button>`;

        const toggleStatusHtml = canSelfManage
          ? (st === 'ativo'
            ? `<button type="button" class="btn btn-outline btn-sm" data-mural-action="pause-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.76rem;padding:6px 10px;color:#fbbf24;border-color:rgba(251,191,36,0.4)">⏸️ Pausar</button>`
            : `<button type="button" class="btn btn-outline btn-sm" data-mural-action="reactivate-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.76rem;padding:6px 10px;color:#34d399;border-color:rgba(52,211,153,0.4)">▶️ Reativar</button>`)
          : '';

        const soldBtnHtml = (canSelfManage && st !== 'vendido')
          ? `<button type="button" class="btn btn-outline btn-sm" data-mural-action="sold-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.76rem;padding:6px 10px;color:#93c5fd;border-color:rgba(147,197,253,0.4)">✅ Vendido</button>`
          : '';

        const deleteBtnHtml = `<button type="button" class="btn btn-outline btn-sm" data-mural-action="delete-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.76rem;padding:6px 10px;color:#fca5a5;border-color:rgba(239,68,68,0.45)">🗑️ Excluir</button>`;

        const upgradeButtonHtml = (ad.plan_tier === 'bronze' || ad.plan_tier === 'gratis')
          ? `<button type="button" class="btn btn-primary btn-sm" data-mural-action="upgrade-ad" data-ad-id="${escapeHtml(ad.id)}" style="font-size:0.76rem;padding:6px 11px;font-weight:800;background:linear-gradient(135deg,#d97706,#f59e0b);border:none;color:#140e0a">🚀 Boost</button>`
          : '';

        return `
          <div class="my-ad-item-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="flex:1 1 240px;min-width:0">
              <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
                ${statusBadge}
                <span>·</span>
                <span style="color:var(--amber-light);font-weight:600">${escapeHtml(ad.plan_tier ? ad.plan_tier.toUpperCase() : 'PRATA')}</span>
                ${ad.expires_at && ad.plan_tier === 'gratis' ? `<span>· Expira ${escapeHtml(new Date(ad.expires_at).toLocaleDateString('pt-BR'))}</span>` : ''}
              </div>
              <strong style="color:#fff;font-size:0.95rem;display:block;word-break:break-word">${escapeHtml(ad.title || '')}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">
                <span>👁️ <strong>${Number(ad.views_count) || 0}</strong> views</span>
                ${(ad.plan_tier === 'bronze' || ad.plan_tier === 'gratis') ? '' : `<span>🖱️ <strong style="color:var(--amber-light)">${Number(ad.clicks_count) || 0}</strong> cliques</span>`}
                <span>👤 <strong style="color:var(--accent-light)">${Number(ad.profile_visits || ad.profile_clicks) || 0}</strong> perfil</span>
                <span>❤️ <strong style="color:#f43f5e">${Number(ad.likes_count) || 0}</strong></span>
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${upgradeButtonHtml}
              ${editButtonHtml}
              ${toggleStatusHtml}
              ${soldBtnHtml}
              ${deleteBtnHtml}
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:18px;color:#ef4444">Erro: ${escapeHtml(err.message)}</div>`;
    }
  }

  function upgradeBronzeAd(adId) {
    const ad = myCachedAds.find(function (a) { return String(a.id) === String(adId); });
    closeMyAdsModal();
    openModal();
    selectTier('prata');
    if (ad) {
      const titleEl = document.getElementById('ad-input-title');
      const descEl = document.getElementById('ad-input-desc');
      const catEl = document.getElementById('ad-input-cat');
      const locEl = document.getElementById('ad-input-location');
      const ctryEl = document.getElementById('ad-input-country');
      const payEl = document.getElementById('ad-input-payment-modes');
      if (titleEl && ad.title) titleEl.value = ad.title;
      if (descEl && ad.description) descEl.value = ad.description;
      if (catEl && ad.category) catEl.value = ad.category;
      if (locEl && ad.location) locEl.value = ad.location;
      if (ctryEl && ad.country_code) ctryEl.value = ad.country_code;
      if (payEl && ad.payment_modes) payEl.value = ad.payment_modes;
      updateLivePreview();
    }
    if (window.HokagePi && typeof window.HokagePi.showToast === 'function') {
      window.HokagePi.showToast('🚀 Anúncio carregado no Plano Prata! Adicione seu link/foto ou escolha Ouro VIP.', 'info');
    }
  }

  function openEditModal(adId) {
    const authUser = getAuthenticatedPiUser();
    if (!authUser) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Conecte-se no Pi Browser para editar anúncios.', 'warning');
      return;
    }

    const ad = myCachedAds.find(a => a.id === adId);
    if (!ad) return;

    if (normalizeHandle(ad.pioneer_username) !== normalizeHandle(authUser.username)) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Você não tem permissão para editar este anúncio.', 'error');
      return;
    }

    const st = String(ad.status || 'ativo').toLowerCase();
    if (st === 'suspenso' || st === 'moderacao') {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Este anúncio está em moderação/suspenso e não pode ser editado.', 'warning');
      return;
    }

    const adTierLower = String(ad.plan_tier || 'bronze').toLowerCase();
    const isNoLinkTier = (adTierLower === 'bronze' || adTierLower === 'gratis');
    const isNoImgTier = (adTierLower === 'gratis');
    const linkInp = document.getElementById('edit-ad-input-link');
    const imgInp = document.getElementById('edit-ad-input-image');
    const catInp = document.getElementById('edit-ad-input-cat');
    const ctryInp = document.getElementById('edit-ad-input-country');
    const locInp = document.getElementById('edit-ad-input-location');

    document.getElementById('edit-ad-id').value = ad.id;
    document.getElementById('edit-ad-input-title').value = ad.title || '';
    document.getElementById('edit-ad-input-desc').value = ad.description || '';
    if (catInp && ad.category) catInp.value = ad.category;
    hydratePaymentModeUi('edit-ad', ad.payment_modes || 'pi', ad.item_price, ad.item_currency || 'PI');
    if (ctryInp && ad.country_code) ctryInp.value = String(ad.country_code).toUpperCase();
    if (locInp) locInp.value = ad.location || '';

    if (linkInp) {
      linkInp.value = isNoLinkTier ? '' : (ad.link_url || '');
      linkInp.disabled = isNoLinkTier;
      linkInp.placeholder = isNoLinkTier ? '🔒 Exclusivo nos planos Prata e Ouro (use 🚀 Boost)' : 'https://...';
      linkInp.style.opacity = isNoLinkTier ? '0.5' : '1';
    }
    if (imgInp) {
      imgInp.value = isNoImgTier ? '' : (ad.image_url || '');
      imgInp.disabled = isNoImgTier;
      imgInp.placeholder = isNoImgTier ? '🔒 Foto disponível a partir do Bronze (0.314 π)' : 'https://...';
      imgInp.style.opacity = isNoImgTier ? '0.5' : '1';
    }

    const deadlineHint = document.getElementById('edit-ad-deadline-hint');
    if (deadlineHint) {
      deadlineHint.textContent = '✓ Edição direta liberada ao proprietário autenticado.';
    }

    const editModal = document.getElementById('edit-ad-modal');
    if (editModal) {
      editModal.classList.add('active');
      editModal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeEditModal() {
    const editModal = document.getElementById('edit-ad-modal');
    if (editModal) {
      editModal.classList.remove('active');
      editModal.setAttribute('aria-hidden', 'true');
    }
  }

  async function saveEditedAd() {
    const authUser = getAuthenticatedPiUser();
    if (!authUser) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Sessão Pi expirada. Conecte-se novamente no Pi Browser.', 'warning');
      return;
    }

    const id = document.getElementById('edit-ad-id').value;
    const ad = myCachedAds.find(a => a.id === id);
    if (!ad || normalizeHandle(ad.pioneer_username) !== normalizeHandle(authUser.username)) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Anúncio não encontrado ou sem permissão.', 'error');
      return;
    }

    const adTierLower = String(ad.plan_tier || 'bronze').toLowerCase();
    const isNoLinkTier = (adTierLower === 'bronze' || adTierLower === 'gratis');
    const isNoImgTier = (adTierLower === 'gratis');
    const title = document.getElementById('edit-ad-input-title').value.trim();
    const desc = document.getElementById('edit-ad-input-desc').value.trim();
    const catInp = document.getElementById('edit-ad-input-cat');
    const priceInp = document.getElementById('edit-ad-input-item-price');
    const currInp = document.getElementById('edit-ad-input-item-currency');
    const ctryInp = document.getElementById('edit-ad-input-country');
    const locInp = document.getElementById('edit-ad-input-location');
    const rawLink = isNoLinkTier ? '' : document.getElementById('edit-ad-input-link').value.trim();
    const rawImg = isNoImgTier ? '' : document.getElementById('edit-ad-input-image').value.trim();

    if (title.length < 2 || desc.length < 5) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Preencha um título (mín. 2 chars) e descrição (mín. 5 chars).', 'warning');
      return;
    }

    const cleanLink = rawLink ? normalizeUrl(rawLink) : '';
    const cleanImg = rawImg ? normalizeUrl(rawImg) : '';
    if (rawLink && !/^https?:\/\//i.test(cleanLink)) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Link de destino inválido. Informe uma URL http(s)://.', 'warning');
      return;
    }
    if (rawImg && !/^https?:\/\//i.test(cleanImg)) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('URL de imagem inválida.', 'warning');
      return;
    }

    const syncedEditPricing = syncPaymentModeUi('edit-ad');

    try {
      const ok = await window.IsarDB.updateMyAd(id, authUser.username, {
        title: title.slice(0, 60),
        description: desc.slice(0, 1000),
        category: catInp ? catInp.value : ad.category,
        payment_modes: (syncedEditPricing && syncedEditPricing.payment_modes) || 'pi',
        item_price: (syncedEditPricing && syncedEditPricing.item_price) || null,
        item_currency: (syncedEditPricing && syncedEditPricing.item_currency) || (currInp ? currInp.value : 'PI'),
        country_code: ctryInp ? ctryInp.value : 'GLOBAL',
        location: locInp ? locInp.value.trim().slice(0, 60) : 'Online',
        link_url: cleanLink,
        image_url: cleanImg
      });

      if (ok) {
        if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('✓ Anúncio atualizado com sucesso!', 'success');
        const oldCard = document.getElementById('card-' + id);
        if (oldCard) oldCard.remove();
        closeEditModal();
        loadMyAds();
        syncRemoteAds();
      } else {
        if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Não foi possível atualizar o anúncio. Verifique sua conexão.', 'error');
      }
    } catch (err) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Erro ao salvar: ' + err.message, 'error');
    }
  }

  async function renewAdPrompt(adId) {
    const authUser = getAuthenticatedPiUser();
    if (!authUser) {
      alert('Autenticação no Pi Browser obrigatória para renovar anúncios.');
      return;
    }

    const ad = myCachedAds.find(a => a.id === adId);
    if (!ad || normalizeHandle(ad.pioneer_username) !== normalizeHandle(authUser.username)) {
      alert('Você não tem permissão para renovar este anúncio.');
      return;
    }

    const tierInfo = tierPrices[ad.plan_tier] || tierPrices.prata;
    if (!confirm(`Deseja renovar este anúncio (${(ad.plan_tier || 'prata').toUpperCase()}) por mais 30 dias por ${tierInfo.pi} π?`)) return;

    const handleRenewSuccess = async function (paymentResult) {
      const proofId = paymentResult && (paymentResult.paymentId || paymentResult.txid);
      if (!proofId) {
        alert('Pagamento sem identificador confirmado. Renovação cancelada.');
        return;
      }
      try {
        const ok = await window.IsarDB.renewMyAd(adId, authUser.username, proofId);
        if (ok) {
          if (window.showToast) window.showToast('✓ Anúncio renovado com sucesso por +30 dias!', '🚀');
          loadMyAds();
        } else {
          alert('Não foi possível registrar a renovação no banco.');
        }
      } catch (err) {
        alert('Erro ao validar renovação no servidor: ' + (err && err.message ? err.message : 'erro'));
      }
    };

    if (window.HokagePi && window.HokagePi.requestPiPayment) {
      window.HokagePi.requestPiPayment({
        amount: tierInfo.pi,
        memo: `Renovação Anúncio 30d (${ad.plan_tier || 'prata'}): ${adId}`,
        metadata: { adId: adId, action: 'renew', tier: ad.plan_tier || 'prata', pioneer_username: authUser.username },
        onSuccess: function (paymentResult) {
          handleRenewSuccess(paymentResult);
        },
        onError: function (err) {
          alert('Pagamento de renovação não concluído: ' + ((err && err.message) || 'erro'));
        }
      });
    } else if (window.HokagePi && window.HokagePi.showManualP2PModal) {
      window.HokagePi.showManualP2PModal({
        amount: tierInfo.pi,
        memo: `Renovacao Anuncio 30d: ${adId}`,
        metadata: { adId: adId, action: 'renew', tier: ad.plan_tier || 'prata', expectedPrice: tierInfo.pi },
        onSuccess: function (paymentResult) {
          handleRenewSuccess(paymentResult);
        }
      });
    } else {
      alert('Módulo de pagamento Pi indisponível no momento.');
    }
  }

  // --- Sistema de Moderação Descentralizada e Denúncias Comunitárias ---
  function openReportModal(adId, adTitle) {
    const modal = document.getElementById('report-ad-modal');
    const idInput = document.getElementById('report-target-ad-id');
    const titleEl = document.getElementById('report-target-ad-title');
    const detailsInput = document.getElementById('report-details');

    if (!modal) return;
    if (idInput) idInput.value = adId || '';
    if (titleEl) titleEl.textContent = adTitle || ('Anúncio #' + adId);
    if (detailsInput) detailsInput.value = '';

    // Verifica se já foi denunciado por este usuário
    let reported = [];
    try {
      reported = JSON.parse(localStorage.getItem('isar_reported_ads') || '[]');
    } catch (_) {}

    const submitBtn = document.getElementById('report-submit-btn');
    if (submitBtn) {
      if (reported.includes(adId)) {
        submitBtn.disabled = true;
        submitBtn.textContent = '✓ Já Denunciado';
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = '🚩 Confirmar Denúncia';
      }
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeReportModal() {
    const modal = document.getElementById('report-ad-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async function submitReport(e) {
    if (e && e.preventDefault) e.preventDefault();

    const idInput = document.getElementById('report-target-ad-id');
    const titleEl = document.getElementById('report-target-ad-title');
    const detailsInput = document.getElementById('report-details');
    const reasonInput = document.querySelector('input[name="report_reason"]:checked');
    const submitBtn = document.getElementById('report-submit-btn');

    const adId = idInput ? idInput.value : '';
    if (!adId) {
      closeReportModal();
      return;
    }

    let reported = [];
    try {
      reported = JSON.parse(localStorage.getItem('isar_reported_ads') || '[]');
    } catch (_) {}

    if (reported.includes(adId)) {
      alert('Você já enviou uma denúncia para este anúncio. Agradecemos sua colaboração com a comunidade!');
      closeReportModal();
      return;
    }

    const reason = reasonInput ? reasonInput.value : 'outro';
    const details = detailsInput ? detailsInput.value.trim() : '';
    const title = titleEl ? titleEl.textContent : '';

    let reporter = '@pioneiro';
    if (window.HokagePi && window.HokagePi.getUser()) {
      const u = window.HokagePi.getUser();
      if (u && u.username) reporter = '@' + u.username;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }

    // Registra no Supabase via Edge Function Zero-Trust
    if (window.IsarDB && window.IsarDB.createDenuncia) {
      try {
        await window.IsarDB.createDenuncia({
          ad_id: adId,
          ad_title: title,
          reason: reason,
          details: details,
          reporter_user: reporter
        });
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚩 Confirmar Denúncia';
        }
        alert(err && err.message ? err.message : 'Conecte-se no Pi Browser para registrar uma denúncia.');
        return;
      }
    }

    // Salva no localStorage local
    try {
      reported.push(adId);
      localStorage.setItem('isar_reported_ads', JSON.stringify(reported));
    } catch (_) {}

    // Atualiza visualmente o botão do card correspondente
    const cardEl = document.getElementById('card-' + adId);
    if (cardEl) {
      const btn = cardEl.querySelector('.btn-report-ad');
      if (btn) {
        btn.textContent = '✓ Denunciado';
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
        btn.disabled = true;
      }
    }

    closeReportModal();
    if (window.HokagePi && window.HokagePi.showToast) {
      window.HokagePi.showToast('✓ Denúncia registrada com sucesso! A comunidade agradece seu zelo.', 'success');
    } else {
      alert('✓ Denúncia registrada com sucesso! A comunidade agradece seu zelo pelo ecossistema.');
    }
  }

  // --- Sistema de Comentários Comunitários (Anti-XSS + Auth Pi Browser) ---
  const commentLastPostMap = {};

  function getLocalCommentsMap() {
    try {
      return JSON.parse(localStorage.getItem('isar_mural_comments') || '{}');
    } catch (_) {
      return {};
    }
  }

  function saveLocalComment(adId, commentObj) {
    try {
      const map = getLocalCommentsMap();
      if (!Array.isArray(map[adId])) map[adId] = [];
      map[adId].push(commentObj);
      localStorage.setItem('isar_mural_comments', JSON.stringify(map));
    } catch (_) {}
  }

  function formatCommentTime(iso) {
    if (!iso) return 'agora';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'agora';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function renderCommentsDrawerHtml(adId, comments) {
    const authUser = getCommunityUser();
    const isPi = Boolean(window.HokagePi && window.HokagePi.isPiBrowser && window.HokagePi.isPiBrowser());

    const listHtml = (!comments || comments.length === 0)
      ? '<div class="ad-comments-empty">Nenhum comentário ainda. Seja o primeiro pioneiro a comentar!</div>'
      : comments.map(function (c) {
          const author = escapeHtml(c.author_username || '@pioneiro');
          const text = escapeHtml(c.content || '');
          const when = escapeHtml(formatCommentTime(c.created_at));
          return `
            <div class="ad-comment-item">
              <div class="ad-comment-item__head">
                <a href="pioneiro?u=${encodeURIComponent(author.replace(/^@+/, ''))}" class="ad-comment-item__author">${author}</a>
                <span class="ad-comment-item__time">${when}</span>
              </div>
              <div class="ad-comment-item__body">${text}</div>
            </div>
          `;
        }).join('');

    let formHtml = '';
    if (authUser) {
      formHtml = `
        <form class="ad-comment-form" data-ad-id="${escapeHtml(adId)}">
          <input type="text" id="comment-input-${escapeHtml(adId)}" class="ad-comment-input" maxlength="280" placeholder="Comentar como ${escapeHtml(authUser.username)}..." required />
          <button type="submit" class="btn btn-primary btn-sm ad-comment-submit">Enviar</button>
        </form>
      `;
    } else if (isPi) {
      formHtml = `
        <div class="ad-comment-auth-note">
          <span>Conecte sua conta Pi para comentar com segurança:</span>
          <button type="button" class="btn btn-primary btn-sm" data-mural-action="login-comment" data-ad-id="${escapeHtml(adId)}">
            ⚡ Conectar Pi
          </button>
        </div>
      `;
    } else {
      formHtml = `
        <div class="ad-comment-auth-note">
          <span>💬 Entre no <strong>Pi Browser</strong> ou com seu <strong>e-mail (Membro Web)</strong> para comentar:</span>
          <button type="button" class="btn btn-outline btn-sm" onclick="if(window.HokagePi&&window.HokagePi.openPiConnectModal)window.HokagePi.openPiConnectModal()" style="border-color:rgba(56,189,248,0.5);color:#bae6fd">
            🔑 Entrar / Conectar
          </button>
        </div>
      `;
    }

    return `
      <div class="ad-comments-list">${listHtml}</div>
      ${formHtml}
    `;
  }

  async function hydrateCommentCounts() {
    const numEls = document.querySelectorAll('.ad-comments-num[data-id]');
    const ids = [];
    numEls.forEach(function (el) {
      const id = el.getAttribute('data-id');
      if (id && id !== 'preview_card_mock' && ids.indexOf(id) === -1) {
        ids.push(id);
      }
    });
    if (ids.length === 0) return;

    let remoteCounts = {};
    if (window.IsarDB && window.IsarDB.getAdCommentCounts) {
      remoteCounts = await window.IsarDB.getAdCommentCounts(ids);
    }
    const localMap = getLocalCommentsMap();

    numEls.forEach(function (el) {
      const id = el.getAttribute('data-id');
      const remoteCount = Number(remoteCounts[id]) || 0;
      const localCount = Array.isArray(localMap[id]) ? localMap[id].length : 0;
      el.textContent = Math.max(remoteCount, localCount);
    });
  }

  async function toggleComments(adId, forceOpen) {
    if (!adId || adId === 'preview_card_mock') return;
    const drawer = document.getElementById('comments-drawer-' + adId);
    if (!drawer) return;

    const isOpen = drawer.style.display === 'block';
    if (isOpen && !forceOpen) {
      drawer.style.display = 'none';
      return;
    }

    drawer.style.display = 'block';
    drawer.innerHTML = '<div class="ad-comments-loading">Carregando comentários...</div>';

    let comments = [];
    if (window.IsarDB && window.IsarDB.getAdComments) {
      comments = await window.IsarDB.getAdComments(adId);
    }

    document.querySelectorAll(`.ad-comments-num[data-id="${adId}"]`).forEach(function (el) {
      el.textContent = comments.length;
    });

    drawer.innerHTML = renderCommentsDrawerHtml(adId, comments);
  }

  async function submitComment(adId) {
    const authUser = getCommunityUser();
    if (!authUser) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Conecte-se no Pi Browser ou entre com seu e-mail para comentar.', 'warning');
      return;
    }

    const now = Date.now();
    if (commentLastPostMap[adId] && (now - commentLastPostMap[adId]) < 15000) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Aguarde alguns segundos antes de enviar outro comentário.', 'info');
      return;
    }

    const input = document.getElementById('comment-input-' + adId);
    if (!input) return;
    const content = input.value.trim();
    if (content.length < 2) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('Escreva um comentário com pelo menos 2 caracteres.', 'warning');
      return;
    }
    if (content.length > 280) {
      if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('O comentário deve ter no máximo 280 caracteres.', 'warning');
      return;
    }

    commentLastPostMap[adId] = now;
    let saved = null;
    if (window.IsarDB && window.IsarDB.createAdComment) {
      try {
        saved = await window.IsarDB.createAdComment({
          ad_id: adId,
          author_username: authUser.username,
          content: content
        });
      } catch (err) {
        console.warn('Falha ao salvar comentário no servidor:', err);
      }
    }

    if (!saved) {
      delete commentLastPostMap[adId];
      if (window.HokagePi && window.HokagePi.showToast) {
        window.HokagePi.showToast('Não foi possível salvar seu comentário no servidor. Verifique sua sessão Pi.', 'error');
      }
      return;
    }

    if (window.HokagePi && window.HokagePi.showToast) {
      window.HokagePi.showToast('💬 Comentário publicado!', 'success');
    }
    await toggleComments(adId, true);
  }

  let isInitialized = false;
  let delegationBound = false;

  function bindMuralEventDelegation() {
    if (delegationBound || typeof document === 'undefined') return;
    delegationBound = true;

    document.addEventListener('click', function (ev) {
      const target = ev.target && ev.target.closest ? ev.target.closest('[data-mural-action]') : null;
      if (!target) return;
      const action = target.getAttribute('data-mural-action');
      const adId = target.getAttribute('data-ad-id') || '';
      if (!adId && action !== 'login-comment') return;

      if (action === 'track-click') {
        trackClick(adId);
      } else if (action === 'track-profile') {
        trackProfileVisit(adId);
      } else if (action === 'like') {
        ev.preventDefault();
        toggleLike(adId);
      } else if (action === 'comments') {
        ev.preventDefault();
        toggleComments(adId);
      } else if (action === 'report') {
        ev.preventDefault();
        openReportModal(adId, target.getAttribute('data-ad-title') || '');
      } else if (action === 'copy-link') {
        ev.preventDefault();
        const url = 'https://hokage22b.com/mural?ad=' + encodeURIComponent(adId);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('🔗 Link direto do anúncio copiado!', 'success');
          }).catch(function () {});
        }
      } else if (action === 'edit-ad') {
        ev.preventDefault();
        openEditModal(adId);
      } else if (action === 'pause-ad' || action === 'reactivate-ad' || action === 'sold-ad') {
        ev.preventDefault();
        const nextStatus = action === 'pause-ad' ? 'pausado' : (action === 'sold-ad' ? 'vendido' : 'ativo');
        if (window.IsarDB && window.IsarDB.setMyAdStatus) {
          window.IsarDB.setMyAdStatus(adId, nextStatus).then(function (ok) {
            if (ok) {
              if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('✓ Status atualizado para ' + nextStatus + '.', 'success');
              const cardEl = document.getElementById('card-' + adId);
              if (cardEl && nextStatus !== 'ativo') cardEl.remove();
              loadMyAds();
              syncRemoteAds();
            } else if (window.HokagePi && window.HokagePi.showToast) {
              window.HokagePi.showToast('Não foi possível alterar o status.', 'error');
            }
          }).catch(function (err) {
            if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast(err && err.message ? err.message : 'Erro ao atualizar.', 'error');
          });
        }
      } else if (action === 'delete-ad') {
        ev.preventDefault();
        if (!confirm('Deseja excluir permanentemente este anúncio da Vila? Esta ação não pode ser desfeita.')) return;
        if (window.IsarDB && window.IsarDB.deleteMyAd) {
          window.IsarDB.deleteMyAd(adId).then(function (ok) {
            if (ok) {
              if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast('🗑️ Anúncio excluído permanentemente.', 'info');
              const cardEl = document.getElementById('card-' + adId);
              if (cardEl) cardEl.remove();
              loadMyAds();
              applyFilters();
            } else if (window.HokagePi && window.HokagePi.showToast) {
              window.HokagePi.showToast('Não foi possível excluir este anúncio.', 'error');
            }
          }).catch(function (err) {
            if (window.HokagePi && window.HokagePi.showToast) window.HokagePi.showToast(err && err.message ? err.message : 'Erro ao excluir.', 'error');
          });
        }
      } else if (action === 'upgrade-ad') {
        ev.preventDefault();
        upgradeBronzeAd(adId);
      } else if (action === 'filter-seller') {
        ev.preventDefault();
        filterSeller(target.getAttribute('data-seller') || '');
        const featuredSec = document.getElementById('section-destaques');
        if (featuredSec) featuredSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'promote-vitrine') {
        ev.preventDefault();
        const item = vitrineProductsCache[adId];
        selectTier('prata');
        openModal();
        if (item) {
          const tEl = document.getElementById('ad-input-title');
          const dEl = document.getElementById('ad-input-desc');
          const lEl = document.getElementById('ad-input-link');
          const iEl = document.getElementById('ad-input-image');
          const cEl = document.getElementById('ad-input-cat');
          if (tEl && item.title) tEl.value = item.title;
          if (dEl && item.desc) dEl.value = item.desc;
          if (lEl && item.link) lEl.value = item.link;
          if (iEl && item.img) iEl.value = item.img;
          if (cEl && item.cat) cEl.value = item.cat;
          updateLivePreview();
        }
      } else if (action === 'login-comment') {
        ev.preventDefault();
        if (window.HokagePi && window.HokagePi.loginWithPi) {
          Promise.resolve(window.HokagePi.loginWithPi()).then(function () {
            toggleComments(adId, true);
          });
        }
      }
    });

    document.addEventListener('submit', function (ev) {
      const form = ev.target && ev.target.closest ? ev.target.closest('form.ad-comment-form[data-ad-id]') : null;
      if (!form) return;
      ev.preventDefault();
      const adId = form.getAttribute('data-ad-id') || '';
      if (adId) submitComment(adId);
    });
  }

  window.IsarMural = {
    init: function () {
      if (isInitialized) return;
      isInitialized = true;

      bindMuralEventDelegation();
      initFilters();
      loadSavedLocalAds();
      syncRemoteAds();
      setTimeout(hydrateCommentCounts, 1200);
      selectTier('prata');
      initFileUpload();

      const closeBtn = document.getElementById('ad-modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const overlay = document.getElementById('ad-create-modal');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeModal();
        });
      }

      const form = document.getElementById('ad-create-form');
      if (form) {
        form.onsubmit = function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          return false;
        };
      }

      // Ouvintes para atualização da Prévia ao Vivo e Salvamento Automático
      const previewInputs = [
        'ad-input-title',
        'ad-input-desc',
        'ad-input-user',
        'ad-input-link',
        'ad-input-image',
        'ad-input-item-price',
        'ad-input-location'
      ];
      previewInputs.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', function () {
            updateLivePreview();
            saveDraft();
          });
        }
      });

      ['ad-input-cat', 'ad-input-item-currency', 'ad-input-country', 'ad-input-payment-modes'].forEach(function (id) {
        const sel = document.getElementById(id);
        if (sel) {
          sel.addEventListener('change', function () {
            updateLivePreview();
            saveDraft();
          });
        }
      });

      bindPaymentModeGroup('ad', function () {
        updateLivePreview();
        saveDraft();
      });
      bindPaymentModeGroup('edit-ad');

      document.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Escape') return;
        toggleFiltersPanel(false);
        closeReportModal();
        closeEditModal();
        closeMyAdsModal();
        closeModal();
      });

      // Sincronização Backend-First de preços/planos e parâmetros de URL (?tier=, ?cat=, ?country=, ?pillar=)
      if (window.IsarDB && typeof window.IsarDB.getMuralConfig === 'function') {
        window.IsarDB.getMuralConfig().then(function (cfg) {
          if (cfg && cfg.plans) {
            if (cfg.plans.ouro && typeof cfg.plans.ouro.price_pi === 'number') tierPrices.ouro.pi = cfg.plans.ouro.price_pi;
            if (cfg.plans.prata && typeof cfg.plans.prata.price_pi === 'number') tierPrices.prata.pi = cfg.plans.prata.price_pi;
            if (cfg.plans.bronze && typeof cfg.plans.bronze.price_pi === 'number') tierPrices.bronze.pi = cfg.plans.bronze.price_pi;
            selectTier(selectedTier);
          }
        }).catch(function () {});
      }

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTier = (urlParams.get('tier') || '').toLowerCase();
        const urlCat = (urlParams.get('cat') || '').toLowerCase();
        const urlCountry = (urlParams.get('country') || '').toUpperCase();
        const urlPillar = (urlParams.get('pillar') || '').toLowerCase();
        const urlQ = (urlParams.get('q') || '').trim();
        const urlPay = (urlParams.get('pay') || '').toLowerCase();
        const urlSeller = (urlParams.get('seller') || urlParams.get('vendedor') || urlParams.get('loja') || '').trim();
        const urlAction = (urlParams.get('action') || '').toLowerCase();
        const urlPublish = urlParams.get('publish') === '1' || urlAction === 'publish';
        if (urlTier === 'ouro' || urlTier === 'prata' || urlTier === 'bronze' || urlTier === 'gratis') {
          selectTier(urlTier);
        }
        if (urlPillar && ['inicio', 'mercado', 'mural', 'trabalho', 'comunidade'].indexOf(urlPillar) !== -1) {
          setPillar(urlPillar);
        }
        if (urlCat && typeof filterCategory === 'function') {
          filterCategory(urlCat);
        }
        const countryFilterEl = document.getElementById('mural-country-filter');
        if (urlCountry) {
          if (countryFilterEl) countryFilterEl.value = urlCountry;
          if (typeof filterCountry === 'function') filterCountry(urlCountry);
        }
        if (urlQ) {
          const searchInp = document.getElementById('mural-search-input');
          if (searchInp) searchInp.value = urlQ;
          currentSearchQuery = urlQ;
          const clearBtn = document.getElementById('mural-search-clear-btn');
          if (clearBtn) clearBtn.style.display = 'inline-flex';
          applyFilters();
        }
        if (urlPay && ['pi', 'pi_fiat', 'fiat'].indexOf(urlPay) !== -1) {
          if (typeof filterPaymentMode === 'function') filterPaymentMode(urlPay);
        }
        if (urlSeller) {
          filterSeller(urlSeller);
        }
        if (urlPublish) {
          setTimeout(function () { openModal(); }, 150);
        }
      } catch (_) {}

      // Restauração inteligente ou pré-preenchimento vindo da Vitrine ("Impulsionar no Mural")
      try {
        const params = new URLSearchParams(window.location.search || '');
        const promoteTitleParam = params.get('promote_title');
        const isPromoteDraft = params.get('promote_draft') === '1';
        let promoteData = null;
        if (isPromoteDraft || promoteTitleParam) {
          try {
            const rawDraft = sessionStorage.getItem('hokage_promote_draft') || localStorage.getItem('hokage_promote_draft');
            if (rawDraft) promoteData = JSON.parse(rawDraft);
            sessionStorage.removeItem('hokage_promote_draft');
            localStorage.removeItem('hokage_promote_draft');
          } catch (_) {}
        }
        const finalTitle = (promoteData && promoteData.title) || promoteTitleParam;
        if (finalTitle || isPromoteDraft) {
          openModal();
          const tEl = document.getElementById('ad-input-title');
          const dEl = document.getElementById('ad-input-desc');
          const lEl = document.getElementById('ad-input-link');
          const iEl = document.getElementById('ad-input-image');
          const cEl = document.getElementById('ad-input-cat');
          const finalDesc = (promoteData && promoteData.desc) || params.get('promote_desc') || '';
          const finalLink = (promoteData && promoteData.link) || params.get('promote_link') || '';
          const finalImg = (promoteData && promoteData.img) || params.get('promote_img') || '';
          const finalCat = (promoteData && promoteData.cat) || params.get('promote_cat') || '';
          if (tEl && finalTitle) tEl.value = String(finalTitle).slice(0, 60);
          if (dEl && finalDesc) dEl.value = String(finalDesc).slice(0, 160);
          if (lEl && finalLink) lEl.value = String(finalLink);
          if (iEl && finalImg) iEl.value = String(finalImg);
          if (cEl && finalCat) cEl.value = String(finalCat);
          updateLivePreview();
          saveDraft();
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          const wasModalOpen = localStorage.getItem(MODAL_OPEN_KEY) === '1';
          const hasDraft = Boolean(localStorage.getItem(DRAFT_KEY));
          if (wasModalOpen && hasDraft) {
            openModal();
          }
        }
      } catch (_) {}
    },
    filterCategory: filterCategory,
    setPillar: setPillar,
    filterSeller: filterSeller,
    filterCommunity: filterCommunity,
    filterPaymentMode: filterPaymentMode,
    filterCountry: filterCountry,
    filterTier: filterTier,
    filterRegion: filterRegion,
    filterLang: filterLang,
    sortAds: sortAds,
    clearAllFilters: clearAllFilters,
    toggleFiltersPanel: toggleFiltersPanel,
    scrollToResults: scrollToResults,
    handleSearchInput: handleSearchInput,
    clearSearch: clearSearch,
    applyFilters: applyFilters,
    syncRemoteAds: syncRemoteAds,
    openModal: openModal,
    closeModal: closeModal,
    selectTier: selectTier,
    handleAdSubmit: handleAdSubmit,
    redeemReferralAd: redeemReferralAd,
    updateLivePreview: updateLivePreview,
    simulateTestnetPublish: simulateTestnetPublish,
    returnFromPreview: returnFromPreview,
    publishFounderDemo: publishFounderDemo,
    openManualP2PForAd: openManualP2PForAd,
    clearExpiredPaymentAndRetry: clearExpiredPaymentAndRetry,
    clearDraft: clearDraft,
    trackClick: trackClick,
    trackProfileVisit: trackProfileVisit,
    toggleLike: toggleLike,
    // Métodos do Painel do Anunciante SaaS
    openMyAdsModal: openMyAdsModal,
    closeMyAdsModal: closeMyAdsModal,
    loadMyAds: loadMyAds,
    connectPiForMyAds: connectPiForMyAds,
    openEditModal: openEditModal,
    closeEditModal: closeEditModal,
    saveEditedAd: saveEditedAd,
    renewAdPrompt: renewAdPrompt,
    upgradeBronzeAd: upgradeBronzeAd,
    // Comentários Comunitários
    toggleComments: toggleComments,
    submitComment: submitComment,
    // Moderação Descentralizada e Denúncias
    openReportModal: openReportModal,
    closeReportModal: closeReportModal,
    submitReport: submitReport
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.IsarMural) window.IsarMural.init();
    });
  } else {
    if (window.IsarMural) window.IsarMural.init();
  }
})();

