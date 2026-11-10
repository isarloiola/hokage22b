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
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return encodeURI(trimmed);
    }
    return '';
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
  let selectedTier = 'prata';

  const tierPrices = {
    ouro:   { pi: 3.14, name: '🥇 Destaque Ouro (Campanha 7 dias · Topo VIP & Card Duplo)' },
    prata:  { pi: 1.00, name: '🥈 Destaque Prata (Campanha 7 dias · Card Médio)' },
    bronze: { pi: 0.314, name: '🥉 Classificado Bronze (Validade 30 dias · Comunitário)' }
  };

  // Helper para localização dos grids das duas áreas comerciais
  function getFeaturedGrid() {
    return document.getElementById('mural-featured-grid') || document.getElementById('mural-ads-grid');
  }

  function getCommunityGrid() {
    return document.getElementById('mural-community-grid') || document.getElementById('mural-ads-grid');
  }

  // Rotação determinística e justa por fatia horária (UTC)
  // Sem modificação artificial de dados no banco de dados
  function rotateFairly(arr) {
    if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
    const offset = hourBucket % arr.length;
    return arr.slice(offset).concat(arr.slice(0, offset));
  }

  function buildAdCardHtml(ad) {
    const isFounderDemo = Boolean(ad.is_founder_demo || ad.status === 'demonstracao' || ad.id === 'card-mock-1');
    const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata') ? ad.plan_tier : 'bronze';
    const tierBadgeClass = 'pioneer-badge--' + tier;

    let tierLabel = '';
    let overlayLabel = '';
    let priceHtml = '';

    if (isFounderDemo) {
      tierLabel = '👑 Ouro Fundador · Demonstração';
      overlayLabel = '👑 OURO FUNDADOR · EXEMPLAR DEMONSTRATIVO';
      priceHtml = '<span class="pioneer-card__price-tag" style="background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.35);color:var(--amber-light)" title="Exemplar institucional">Exemplar Oficial</span>';
    } else if (tier === 'ouro') {
      tierLabel = '👑 Patrocinado · Destaque Ouro';
      overlayLabel = '👑 PATROCINADO · DESTAQUE VIP';
      priceHtml = `<span class="pioneer-card__price-tag">${ad.price_pi ? escapeHtml(String(ad.price_pi)) + ' π' : '3.14 π'}</span>`;
    } else if (tier === 'prata') {
      tierLabel = '🥈 Patrocinado · Destaque Prata';
      overlayLabel = '🥈 PATROCINADO · DESTAQUE';
      priceHtml = `<span class="pioneer-card__price-tag">${ad.price_pi ? escapeHtml(String(ad.price_pi)) + ' π' : '1.00 π'}</span>`;
    } else {
      tierLabel = '🥉 Comunitário · Bronze';
      overlayLabel = '';
      priceHtml = `<span class="pioneer-card__price-tag">${ad.price_pi ? escapeHtml(String(ad.price_pi)) + ' π' : '0.314 π'}</span>`;
    }

    const author = ad.pioneer_username || ad.pioneer_name || '@pioneiro';
    const safeAuthor = escapeHtml(author);
    const safeTitle = escapeHtml(ad.title || '');
    const safeDesc = escapeHtml(ad.description || '');
    const cleanUrl = tier !== 'bronze' ? safeUrl(ad.link_url) : '';
    const category = escapeHtml(ad.category || 'geral');
    const cardId = escapeHtml(ad.id || ('ad_' + Math.random().toString(36).substring(2, 7)));

    let linkHtml = '';
    if (tier === 'ouro' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" onclick="window.IsarMural && window.IsarMural.trackClick('${cardId}')" class="pioneer-card__link pioneer-card__link--ouro" style="background:var(--amber);color:#000;font-weight:900;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(245,158,11,0.35)">⚡ Acessar Canal Oficial →</a>`;
    } else if (tier === 'prata' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" onclick="window.IsarMural && window.IsarMural.trackClick('${cardId}')" class="pioneer-card__link">Acessar Anúncio →</a>`;
    } else {
      linkHtml = `<span style="color:var(--text-muted);font-size:0.8rem;display:inline-flex;align-items:center;gap:4px">💬 Recado Fraterno da Comunidade</span>`;
    }

    let bannerHtml = '';
    const rawImg = ad.image_url ? safeUrl(ad.image_url) : '';
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

    // Linha de métricas adaptada por tier:
    let metricsDetailsHtml = '';
    if (tier === 'bronze') {
      metricsDetailsHtml = `
        <span title="Visualizações">👁️ <strong style="color:var(--text-secondary)" class="ad-views-num" data-id="${cardId}">${views}</strong> views</span>
        <span title="Visitas ao Perfil">👤 <strong style="color:var(--accent-light)" class="ad-profile-visits-num" data-id="${cardId}">${profileVisits}</strong> visitas ao perfil</span>
      `;
    } else {
      metricsDetailsHtml = `
        <span title="Visualizações">👁️ <strong style="color:var(--text-secondary)" class="ad-views-num" data-id="${cardId}">${views}</strong> views</span>
        <span title="Cliques no Link Oficial">🖱️ <strong style="color:var(--amber-light)" class="ad-clicks-num" data-id="${cardId}">${clicks}</strong> cliques</span>
        <span title="Visitas ao Perfil">👤 <strong style="color:var(--accent-light)" class="ad-profile-visits-num" data-id="${cardId}">${profileVisits}</strong> perfil</span>
      `;
    }

    return `
      <article class="pioneer-card pioneer-card--${tier}" data-category="${category}" id="card-${cardId}">
        ${bannerHtml}
        <div class="pioneer-card__top">
          <span class="pioneer-card__badge ${tierBadgeClass}">${tierLabel}</span>
          <a href="pioneiro?u=${encodeURIComponent(safeAuthor.replace(/^@+/, ''))}" onclick="window.IsarMural && window.IsarMural.trackProfileVisit('${cardId}')" class="pioneer-card__author" style="text-decoration:none" title="Ver perfil e vitrine do pioneiro">${safeAuthor} ↗</a>
        </div>
        <h3 class="pioneer-card__title">${safeTitle}</h3>
        <p class="pioneer-card__desc">${safeDesc}</p>
        <div class="pioneer-card__footer">
          ${linkHtml}
          ${priceHtml}
        </div>
        <div class="pioneer-card__metrics" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:0.75rem;color:var(--text-muted);flex-wrap:wrap;gap:8px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${metricsDetailsHtml}
            <button type="button" class="btn-like-ad ${isLiked ? 'liked' : ''}" onclick="window.IsarMural && window.IsarMural.toggleLike('${cardId}')" data-id="${cardId}" title="Apoiar este anúncio da comunidade" style="background:${isLiked ? 'rgba(244,63,94,0.25)' : 'rgba(244,63,94,0.1)'};border:1px solid ${isLiked ? '#f43f5e' : 'rgba(244,63,94,0.3)'};color:${isLiked ? '#fff' : '#fb7185'};padding:2px 8px;border-radius:6px;cursor:pointer;font-size:0.74rem;display:inline-flex;align-items:center;gap:4px;font-weight:${isLiked ? '700' : '500'};transition:all 0.2s ease">
              <span>❤️</span> <strong class="ad-likes-num" data-id="${cardId}">${likes}</strong>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button type="button" class="btn-report-ad" onclick="window.IsarMural && window.IsarMural.openReportModal('${cardId}', '${safeTitle.replace(/'/g, "\\'")}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.72rem;display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px" title="Denunciar conteúdo impróprio ou fraude">
              🚩 Denunciar
            </button>
            <a href="pioneiro?u=${encodeURIComponent(safeAuthor.replace(/^@+/, ''))}" onclick="window.IsarMural && window.IsarMural.trackProfileVisit('${cardId}')" style="color:var(--accent-light);text-decoration:none;font-weight:700" title="Ver mini-página do anunciante">Perfil ↗</a>
          </div>
        </div>
      </article>
    `;
  }

  // Insere um único card no seu respectivo container comercial
  function insertAdCard(ad) {
    if (!ad || !ad.id) return;
    const cardId = 'card-' + ad.id;
    if (document.getElementById(cardId)) return;

    const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata') ? ad.plan_tier : 'bronze';
    const html = buildAdCardHtml(ad);

    if (tier === 'ouro') {
      const featuredGrid = getFeaturedGrid();
      if (featuredGrid) {
        featuredGrid.insertAdjacentHTML('afterbegin', html);
      }
    } else if (tier === 'prata') {
      const featuredGrid = getFeaturedGrid();
      if (featuredGrid) {
        const firstPrata = featuredGrid.querySelector('.pioneer-card--prata');
        if (firstPrata) {
          firstPrata.insertAdjacentHTML('beforebegin', html);
        } else {
          featuredGrid.insertAdjacentHTML('beforeend', html);
        }
      }
    } else {
      const commGrid = getCommunityGrid();
      if (commGrid) {
        commGrid.insertAdjacentHTML('afterbegin', html);
      }
    }
  }

  // Filtragem estrita por CSS em ambas as seções (Destaques e Comunidade)
  function filterCategory(cat) {
    currentCategory = cat || 'todos';
    const featuredSec = document.getElementById('section-destaques');
    const communitySec = document.getElementById('section-comunidade');
    const featuredGrid = document.getElementById('mural-featured-grid');
    const communityGrid = document.getElementById('mural-community-grid');

    const allCards = document.querySelectorAll('.pioneer-card, .ad-card');
    let totalVisible = 0;
    let featuredVisible = 0;
    let communityVisible = 0;

    allCards.forEach(function (card) {
      if (card.closest('.pi-modal') || card.closest('.ad-preview-wrapper')) return;

      const cardCat = card.getAttribute('data-category') || 'geral';
      const matches = (currentCategory === 'todos' || cardCat === currentCategory);

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

    if (featuredSec && featuredGrid) {
      featuredSec.style.display = featuredVisible > 0 ? 'block' : 'none';
    }
    if (communitySec && communityGrid) {
      communitySec.style.display = communityVisible > 0 ? 'block' : 'none';
    }

    let emptyNotice = document.getElementById('mural-empty-notice');
    if (totalVisible === 0) {
      if (!emptyNotice) {
        emptyNotice = document.createElement('div');
        emptyNotice.id = 'mural-empty-notice';
        emptyNotice.style.cssText = 'text-align:center;padding:56px 20px;color:var(--text-secondary);background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);margin:24px 0;';
        emptyNotice.innerHTML = `
          <div style="font-size:2.8rem;margin-bottom:12px">📢</div>
          <h4 style="color:#fff;margin-bottom:6px;font-size:1.2rem">Nenhum anúncio nesta categoria ainda</h4>
          <p style="font-size:0.9rem;max-width:500px;margin:0 auto">Seja o primeiro pioneiro a anunciar aqui com micro-taxa simbólica na Pi Network!</p>
          <button type="button" class="portal-btn portal-btn--primary portal-btn--sm" onclick="window.IsarMural && window.IsarMural.openModal()" style="margin-top:16px">
            + Publicar Meu Anúncio
          </button>
        `;
        const container = (featuredSec && featuredSec.parentElement) || document.querySelector('.mural-container') || document.body;
        if (communitySec && communitySec.nextSibling) {
          container.insertBefore(emptyNotice, communitySec.nextSibling);
        } else if (container) {
          container.appendChild(emptyNotice);
        }
      }
      emptyNotice.style.display = 'block';
    } else if (emptyNotice) {
      emptyNotice.style.display = 'none';
    }
  }

  function initFilters() {
    const filterBtns = document.querySelectorAll('.mural-filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const cat = btn.getAttribute('data-category') || 'todos';
        filterCategory(cat);
      });
    });
  }

  function loadSavedLocalAds() {
    try {
      const local = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      if (Array.isArray(local) && local.length > 0) {
        local.forEach(function (ad) {
          insertAdCard(ad);
        });
      }
    } catch (_) {}
  }

  // Sincroniza anúncios aprovados salvos no Supabase com rotação equilibrada e hierarquia estrita
  function renderRemoteAdsHierarchy(remoteAds) {
    if (!Array.isArray(remoteAds) || remoteAds.length === 0) return;

    const featuredGrid = getFeaturedGrid();
    const communityGrid = getCommunityGrid();
    if (!featuredGrid && !communityGrid) return;

    const ouroPaid = [];
    const ouroDemo = [];
    const prataAds = [];
    const bronzeAds = [];

    remoteAds.forEach(function (ad) {
      if (!ad || !ad.id) return;
      if (document.getElementById('card-' + ad.id)) return;

      const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata') ? ad.plan_tier : 'bronze';
      if (tier === 'ouro') {
        if (ad.is_founder_demo || ad.status === 'demonstracao') {
          ouroDemo.push(ad);
        } else {
          ouroPaid.push(ad);
        }
      } else if (tier === 'prata') {
        prataAds.push(ad);
      } else {
        bronzeAds.push(ad);
      }
    });

    // 1. Rotação justa entre os Ouros comerciais ativos
    const rotatedOuro = rotateFairly(ouroPaid);
    const orderedOuro = rotatedOuro.concat(ouroDemo);

    // 2. Rotação justa entre os Pratas ativos
    const rotatedPrata = rotateFairly(prataAds);

    // Inserção na Área A (Destaques do Mural):
    if (featuredGrid) {
      const firstPrataMock = featuredGrid.querySelector('.pioneer-card--prata');
      rotatedPrata.reverse().forEach(function (ad) {
        if (firstPrataMock) {
          firstPrataMock.insertAdjacentHTML('beforebegin', buildAdCardHtml(ad));
        } else {
          featuredGrid.insertAdjacentHTML('beforeend', buildAdCardHtml(ad));
        }
      });

      orderedOuro.reverse().forEach(function (ad) {
        featuredGrid.insertAdjacentHTML('afterbegin', buildAdCardHtml(ad));
      });
    }

    // 3. Mural da Comunidade (Bronze): ordenação cronológica decrescente estrita
    bronzeAds.sort(function (a, b) {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    if (communityGrid) {
      bronzeAds.forEach(function (ad) {
        communityGrid.insertAdjacentHTML('afterbegin', buildAdCardHtml(ad));
      });
    }

    filterCategory(currentCategory);
    trackVisibleAds(remoteAds);
  }

  // Sincroniza anúncios remotos em background
  async function syncRemoteAds() {
    if (window.IsarDB && window.IsarDB.getAnuncios) {
      try {
        const timeoutPromise = new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('timeout')); }, 3500);
        });
        const remoteAds = await Promise.race([
          window.IsarDB.getAnuncios('todos'),
          timeoutPromise
        ]);
        if (Array.isArray(remoteAds) && remoteAds.length > 0) {
          renderRemoteAdsHierarchy(remoteAds);
        }
      } catch (_) {}
    }
  }

  function trackVisibleAds(ads) {
    if (!Array.isArray(ads) || ads.length === 0) return;
    const sessionSeenKey = 'hokage_seen_ads';
    let seenAds = [];
    try {
      seenAds = JSON.parse(sessionStorage.getItem(sessionSeenKey) || '[]');
    } catch (_) {}

    ads.forEach(function (ad) {
      if (!ad || !ad.id || seenAds.includes(ad.id)) return;
      seenAds.push(ad.id);
      if (window.IsarDB && window.IsarDB.incrementAdView) {
        window.IsarDB.incrementAdView(ad.id).catch(function () {});
      }
    });

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

    const title = (titleInput && titleInput.value.trim()) || 'Seu Título Aqui (Ex: Canal Tech / Loja Pi)';
    const desc = (descInput && descInput.value.trim()) || 'Aqui aparecerá a mensagem que todos os pioneiros vão ler no mural. Mostre seu projeto e atraia a comunidade!';
    const user = (userInput && userInput.value.trim()) || '@seu_usuario';
    const cat = (catInput && catInput.value) || 'youtube';
    const link = (linkInput && !linkInput.disabled && linkInput.value.trim()) || (selectedTier !== 'bronze' ? 'https://hokage22b.com' : '');
    const img = (imgInput && imgInput.value.trim()) || '';

    const previewAd = {
      id: 'preview_card_mock',
      plan_tier: selectedTier,
      title: title,
      description: desc,
      pioneer_username: user,
      category: cat,
      link_url: link,
      image_url: img,
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
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  function saveDraft() {
    try {
      const titleEl = document.getElementById('ad-input-title');
      const descEl  = document.getElementById('ad-input-desc');
      const catEl   = document.getElementById('ad-input-cat');
      const linkEl  = document.getElementById('ad-input-link');
      const imgEl   = document.getElementById('ad-input-image');
      const userEl  = document.getElementById('ad-input-user');

      const draft = {
        title: (titleEl && titleEl.value) || '',
        desc: (descEl && descEl.value) || '',
        cat: (catEl && catEl.value) || 'youtube',
        link: (linkEl && linkEl.value) || '',
        img: (imgEl && imgEl.value) || '',
        user: (userEl && userEl.value) || '',
        tier: selectedTier || 'prata',
        timestamp: Date.now()
      };

      if (draft.title || draft.desc || draft.link || draft.img) {
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
    const banner   = document.getElementById('ad-draft-banner');
    const feedback = document.getElementById('ad-submit-feedback');

    if (titleEl) titleEl.value = '';
    if (descEl) descEl.value = '';
    if (linkEl) linkEl.value = '';
    if (imgEl) imgEl.value = '';
    if (banner) banner.style.display = 'none';
    if (feedback) {
      feedback.style.display = 'none';
      feedback.innerHTML = '';
    }

    pendingAdSubmission = null;
    selectTier('prata');
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

    const title = (titleInput && titleInput.value.trim()) || 'Exemplar Oficial Hokage22b';
    const desc  = (descInput && descInput.value.trim()) || 'Demonstração institucional da Gazeta dos Pioneiros.';

    const demoAd = {
      id: 'founder_demo_' + Date.now(),
      title: title,
      description: desc,
      link_url: linkInput && !linkInput.disabled ? normalizeUrl(linkInput.value.trim()) : '',
      image_url: imgInput && !imgInput.disabled ? normalizeUrl(imgInput.value.trim()) : '',
      category: catInput ? catInput.value : 'geral',
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
          alert(`🎉 Pagamento P2P de ${priceInfo.pi} π confirmado na blockchain! Seu anúncio já está no ar na Gazeta.`);
        }
      });
    }
  }

  function openModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) modal.classList.add('active');
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
    updateLivePreview();
  }

  function closeModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) modal.classList.remove('active');
    try {
      localStorage.setItem(MODAL_OPEN_KEY, '0');
    } catch (_) {}
  }

  function selectTier(tier) {
    selectedTier = tier || 'prata';
    document.querySelectorAll('.ad-tier-option').forEach(function (opt) {
      opt.classList.toggle('selected', opt.getAttribute('data-tier') === selectedTier);
    });

    const info = tierPrices[selectedTier] || tierPrices.prata;
    const infoEl = document.getElementById('ad-selected-payment-info');
    if (infoEl) {
      infoEl.textContent = `Taxa da publicação: ${info.pi} π (Ambiente Pi Testnet / Sandbox)`;
    }

    const submitBtn = document.getElementById('ad-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = `🚀 Pagar e Publicar com Pi Wallet (${info.pi} π Testnet)`;
    }

    const founderPayBtn = document.getElementById('founder-test-pay-btn');
    if (founderPayBtn) {
      founderPayBtn.textContent = `💳 Testar Pagamento Real na Pi Wallet (${info.pi} π Testnet)`;
    }

    const linkInput = document.getElementById('ad-input-link');
    const badgeEl   = document.getElementById('ad-link-status-badge');
    const hintEl    = document.getElementById('ad-link-hint');

    if (linkInput) {
      if (selectedTier === 'bronze') {
        linkInput.disabled = true;
        linkInput.value = '';
        linkInput.placeholder = '🚫 Links externos exclusivos para Prata e Ouro';
        linkInput.style.opacity = '0.5';
        linkInput.style.cursor = 'not-allowed';
        if (badgeEl) {
          badgeEl.textContent = 'Sem link externo no Bronze';
          badgeEl.style.color = 'var(--text-muted)';
        }
        if (hintEl) {
          hintEl.textContent = 'O plano Bronze publica sua mensagem fraterna e @usuário sem links externos.';
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
      if (selectedTier === 'bronze') {
        imgInput.disabled = true;
        imgInput.value = '';
        imgInput.placeholder = '🚫 Banners visuais exclusivos para Prata e Ouro';
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
      alert('Por favor, informe um título para o seu anúncio (mínimo 3 caracteres).');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!desc || desc.length < 5) {
      isAdSubmitInProgress = false;
      alert('Por favor, informe uma descrição detalhada para o anúncio (mínimo 5 caracteres).');
      if (descInput) descInput.focus();
      return;
    }

    const priceInfo = tierPrices[selectedTier] || tierPrices.prata;

    // Sanitização e normalização inteligente de URLs (nunca bloqueia falta de https://)
    const rawLink = linkInput ? linkInput.value.trim() : '';
    let validatedLink = '';
    if (selectedTier !== 'bronze' && rawLink) {
      validatedLink = normalizeUrl(rawLink);
      if (linkInput) linkInput.value = validatedLink;
    }

    const rawImg = imgInput ? imgInput.value.trim() : '';
    let validatedImg = '';
    if (selectedTier !== 'bronze' && rawImg) {
      validatedImg = normalizeUrl(rawImg);
      if (imgInput) imgInput.value = validatedImg;
    }

    const adId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : '@pioneiro';
    const isFounder = username.toLowerCase() === '@hokage22b' || username.toLowerCase() === 'hokage22b';

    const newAd = {
      id: adId,
      title: title,
      description: desc,
      link_url: validatedLink,
      image_url: validatedImg,
      category: catInput ? catInput.value : 'geral',
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

    pendingAdSubmission = newAd;

    function resetSubmitButtons() {
      isAdSubmitInProgress = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `🚀 Pagar e Publicar com Pi Wallet (${priceInfo.pi} π Testnet)`;
      }
      if (founderPayBtn) {
        founderPayBtn.disabled = false;
        founderPayBtn.textContent = `💳 Testar Pagamento Real na Pi Wallet (${priceInfo.pi} π Testnet)`;
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
    }, 25000);

    // Listener de retorno à página no celular (Samsung S20 / Pi Browser)
    const onReturnToPage = function () {
      setTimeout(function () {
        if ((submitBtn && submitBtn.disabled && submitBtn.textContent.includes('Processando')) ||
            (founderPayBtn && founderPayBtn.disabled && founderPayBtn.textContent.includes('Processando'))) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();
        }
      }, 2000);
    };
    window.addEventListener('focus', onReturnToPage, { once: true });
    document.addEventListener('visibilitychange', onReturnToPage, { once: true });

    // ── FLUXO A: Dentro do Pi Browser ou com Pi SDK Carregado (Pagamento Nativo) ──
    const canUsePi = window.HokagePi && (window.HokagePi.isPiBrowser() || Boolean(window.Pi));
    if (canUsePi) {
      window.HokagePi.requestPiPayment({
        amount: priceInfo.pi,
        memo: `Mural HOKAGE22B: ${title.substring(0, 24)}`,
        metadata: {
          type: 'anuncio',
          adId: adId,
          tier: selectedTier
        },
        onSuccess: async function (paymentResult) {
          if (watchdogTimer) clearTimeout(watchdogTimer);
          resetSubmitButtons();

          newAd.status = 'ativo';
          newAd.payment_txid = paymentResult.txid;

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
          filterCategory(currentCategory);
          alert(`🎉 Pagamento de ${priceInfo.pi} π confirmado na Pi Testnet! Seu anúncio já está no ar na Gazeta dos Pioneiros.`);
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
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = `🚀 Pagar e Publicar com Pi Wallet (${priceInfo.pi} π Testnet)`;
    }
    if (founderPayBtn) {
      founderPayBtn.disabled = false;
      founderPayBtn.textContent = `💳 Testar Pagamento Real na Pi Wallet (${priceInfo.pi} π Testnet)`;
    }

    const piDeepLink = 'pi://' + window.location.host + window.location.pathname;

    showSubmitFeedback(
      'warning',
      `<strong>⚠️ Validação Instantânea Obrigatória:</strong><br>
       Para manter a integridade comercial da Gazeta, anúncios pagos exigem validação instantânea pela blockchain via <strong>Pi Wallet oficial</strong>.<br>
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
          if (statusEl) statusEl.innerHTML = `⏳ <span>${msg}</span>`;
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
          statusEl.className = 'ad-upload-status error';
          statusEl.innerHTML = '⚠️ <span>Não foi possível salvar no Storage. A foto temporária foi mantida na prévia.</span>';
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

  function syncProfileButton() {
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      const profileBtn = document.getElementById('nav-btn-profile');
      if (profileBtn && piUser && piUser.username) {
        const u = piUser.username.startsWith('@') ? piUser.username : '@' + piUser.username;
        profileBtn.href = `pioneiro?u=${encodeURIComponent(u)}`;
        const textSpan = profileBtn.querySelector('.profile-btn-full');
        if (textSpan) textSpan.textContent = `👤 ${u}`;
      }
    } catch (_) {}
  }

  // --- PAINEL DO ANUNCIANTE (MEUS ANÚNCIOS SAAS) ---
  let myCachedAds = [];

  function openMyAdsModal() {
    const modal = document.getElementById('my-ads-modal');
    if (modal) modal.classList.add('active');

    const input = document.getElementById('my-ads-username-input');
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      if (piUser && piUser.username && input && !input.value) {
        input.value = '@' + piUser.username.replace('@', '');
      }
    } catch (_) {}

    if (input && input.value) {
      loadMyAds();
    }
  }

  function closeMyAdsModal() {
    const modal = document.getElementById('my-ads-modal');
    if (modal) modal.classList.remove('active');
  }

  async function loadMyAds() {
    const input = document.getElementById('my-ads-username-input');
    const container = document.getElementById('my-ads-list-container');
    const user = (input && input.value.trim()) || '';

    if (!user) {
      alert('Por favor, informe seu @usuário da Pi Network.');
      return;
    }

    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Consultando seus anúncios no banco...</div>';

    try {
      const ads = await window.IsarDB.getMyAds(user);
      myCachedAds = ads || [];

      let totalViews = 0;
      let totalClicks = 0;
      let totalProfileVisits = 0;
      let totalLikes = 0;
      myCachedAds.forEach(a => {
        totalViews += (Number(a.views_count) || 0);
        totalClicks += (Number(a.clicks_count) || 0);
        totalProfileVisits += (Number(a.profile_visits || a.profile_clicks) || 0);
        totalLikes += (Number(a.likes_count) || 0);
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
        const statusBadge = ad.status === 'ativo' 
          ? '<span style="color:#10b981;font-weight:700">● Ativo</span>' 
          : '<span style="color:#f59e0b;font-weight:700">● Moderação</span>';
        const daysLeft = ad.days_left !== undefined ? ad.days_left : 30;

        return `
          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="max-width:340px">
              <div style="font-size:0.75rem;color:var(--text-muted);display:flex;gap:8px;align-items:center;margin-bottom:4px">
                ${statusBadge}
                <span>·</span>
                <span style="color:var(--amber-light);font-weight:600">${ad.plan_tier ? ad.plan_tier.toUpperCase() : 'PRATA'}</span>
                <span>·</span>
                <span>Expira em: <strong>${daysLeft} dias</strong></span>
              </div>
              <strong style="color:#fff;font-size:0.95rem;display:block">${escapeHtml(ad.title || '')}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">
                <span>👁️ <strong>${Number(ad.views_count) || 0}</strong> views</span>
                ${ad.plan_tier === 'bronze' ? '' : `<span>🖱️ <strong style="color:var(--amber-light)">${Number(ad.clicks_count) || 0}</strong> cliques</span>`}
                <span>👤 <strong style="color:var(--accent-light)">${Number(ad.profile_visits || ad.profile_clicks) || 0}</strong> visitas perfil</span>
                <span>❤️ <strong style="color:#f43f5e">${Number(ad.likes_count) || 0}</strong> apoios</span>
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button type="button" class="btn btn-outline btn-sm" onclick="window.IsarMural.openEditModal('${ad.id}')" style="font-size:0.78rem;padding:6px 10px">
                ✏️ Editar
              </button>
              <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural.renewAdPrompt('${ad.id}')" style="font-size:0.78rem;padding:6px 10px">
                🚀 +30 dias
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:18px;color:#ef4444">Erro: ${escapeHtml(err.message)}</div>`;
    }
  }

  function openEditModal(adId) {
    const ad = myCachedAds.find(a => a.id === adId);
    if (!ad) return;

    document.getElementById('edit-ad-id').value = ad.id;
    document.getElementById('edit-ad-input-title').value = ad.title || '';
    document.getElementById('edit-ad-input-desc').value = ad.description || '';
    document.getElementById('edit-ad-input-link').value = ad.link_url || '';
    document.getElementById('edit-ad-input-image').value = ad.image_url || '';

    const editModal = document.getElementById('edit-ad-modal');
    if (editModal) editModal.classList.add('active');
  }

  function closeEditModal() {
    const editModal = document.getElementById('edit-ad-modal');
    if (editModal) editModal.classList.remove('active');
  }

  async function saveEditedAd() {
    const id = document.getElementById('edit-ad-id').value;
    const title = document.getElementById('edit-ad-input-title').value.trim();
    const desc = document.getElementById('edit-ad-input-desc').value.trim();
    const link = document.getElementById('edit-ad-input-link').value.trim();
    const img = document.getElementById('edit-ad-input-image').value.trim();
    const user = (document.getElementById('my-ads-username-input').value || '').trim();

    if (!title || !desc) {
      alert('Preencha pelo menos título e descrição.');
      return;
    }

    try {
      const ok = await window.IsarDB.updateMyAd(id, user, {
        title: title,
        description: desc,
        link_url: link,
        image_url: img
      });

      if (ok) {
        if (window.showToast) window.showToast('✓ Anúncio atualizado com sucesso!', '💾');
        closeEditModal();
        loadMyAds();
      } else {
        alert('Não foi possível atualizar o anúncio. Verifique o usuário.');
      }
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    }
  }

  async function renewAdPrompt(adId) {
    const user = (document.getElementById('my-ads-username-input').value || '').trim();
    if (!confirm('Deseja renovar a exibição deste anúncio por mais 30 dias na Gazeta?')) return;

    if (window.HokagePi && window.HokagePi.showManualP2PModal) {
      window.HokagePi.showManualP2PModal({
        amount: 1.0,
        memo: `Renovacao Anuncio 30d: ${adId}`,
        metadata: { adId: adId, action: 'renew' }
      });
    } else {
      const ok = await window.IsarDB.renewMyAd(adId, user);
      if (ok) {
        if (window.showToast) window.showToast('✓ Anúncio renovado com sucesso por +30 dias!', '🚀');
        loadMyAds();
      }
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
  }

  function closeReportModal() {
    const modal = document.getElementById('report-ad-modal');
    if (modal) modal.classList.remove('active');
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

    // Registra no Supabase se disponível
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
        console.warn('Erro ao salvar denúncia no Supabase:', err);
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

  let isInitialized = false;

  window.IsarMural = {
    init: function () {
      if (isInitialized) return;
      isInitialized = true;

      initFilters();
      loadSavedLocalAds();
      syncRemoteAds();
      selectTier('prata');
      initFileUpload();
      syncProfileButton();

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
        'ad-input-image'
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

      const catEl = document.getElementById('ad-input-cat');
      if (catEl) {
        catEl.addEventListener('change', function () {
          updateLivePreview();
          saveDraft();
        });
      }

      // Restauração inteligente se o usuário saiu para pesquisar links/fotos e o app foi recarregado
      try {
        const wasModalOpen = localStorage.getItem(MODAL_OPEN_KEY) === '1';
        const hasDraft = Boolean(localStorage.getItem(DRAFT_KEY));
        if (wasModalOpen && hasDraft) {
          openModal();
        }
      } catch (_) {}
    },
    filterCategory: filterCategory,
    openModal: openModal,
    closeModal: closeModal,
    selectTier: selectTier,
    handleAdSubmit: handleAdSubmit,
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
    openEditModal: openEditModal,
    closeEditModal: closeEditModal,
    saveEditedAd: saveEditedAd,
    renewAdPrompt: renewAdPrompt,
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

