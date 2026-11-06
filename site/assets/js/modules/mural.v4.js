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
    ouro:   { pi: 3.14, name: '🥇 Destaque Ouro (Topo da Gazeta e Card Duplo)' },
    prata:  { pi: 1.00, name: '🥈 Destaque Prata (Card Médio)' },
    bronze: { pi: 0.314, name: '🥉 Classificado Bronze (Simples)' }
  };

  function buildAdCardHtml(ad) {
    const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata') ? ad.plan_tier : 'bronze';
    const tierBadgeClass = 'pioneer-badge--' + tier;
    const tierLabel = tier === 'ouro' ? '👑 Destaque Ouro · Card Duplo' : (tier === 'prata' ? '🥈 Destaque Prata' : '🥉 Classificado Bronze');

    const author = ad.pioneer_username || ad.pioneer_name || '@pioneiro';
    const safeAuthor = escapeHtml(author);
    const safeTitle = escapeHtml(ad.title || '');
    const safeDesc = escapeHtml(ad.description || '');
    const cleanUrl = tier !== 'bronze' ? safeUrl(ad.link_url) : '';
    const category = escapeHtml(ad.category || 'geral');
    const cardId = escapeHtml(ad.id || ('ad_' + Math.random().toString(36).substring(2, 7)));

    let linkHtml = '';
    if (tier === 'ouro' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" class="pioneer-card__link pioneer-card__link--ouro" style="background:var(--amber);color:#000;font-weight:900;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 14px rgba(245,158,11,0.35)">⚡ Acessar Canal Oficial →</a>`;
    } else if (tier === 'prata' && cleanUrl) {
      linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" class="pioneer-card__link">Acessar Anúncio →</a>`;
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
              ${tier === 'ouro' ? '👑 DESTAQUE VIP' : 'FOTO OFICIAL'}
            </span>
          </div>
        </div>
      `;
    }

    return `
      <article class="pioneer-card pioneer-card--${tier}" data-category="${category}" id="card-${cardId}">
        ${bannerHtml}
        <div class="pioneer-card__top">
          <span class="pioneer-card__badge ${tierBadgeClass}">${tierLabel}</span>
          <span class="pioneer-card__author">${safeAuthor}</span>
        </div>
        <h3 class="pioneer-card__title">${safeTitle}</h3>
        <p class="pioneer-card__desc">${safeDesc}</p>
        <div class="pioneer-card__footer">
          ${linkHtml}
          <span class="pioneer-card__price-tag">${ad.price_pi ? escapeHtml(String(ad.price_pi)) + ' π' : ''}</span>
        </div>
      </article>
    `;
  }

  // Filtragem estrita por CSS: NUNCA apaga nem altera o HTML dos cards existentes
  function filterCategory(cat) {
    currentCategory = cat || 'todos';
    const gridEl = document.getElementById('mural-ads-grid') || document.getElementById('gazeta-posts-grid');
    if (!gridEl) return;

    const cards = gridEl.querySelectorAll('.pioneer-card, .ad-card');
    let visibleCount = 0;

    cards.forEach(function (card) {
      const cardCat = card.getAttribute('data-category') || 'geral';
      if (currentCategory === 'todos' || cardCat === currentCategory) {
        card.classList.remove('pioneer-card--hidden', 'ad-card--hidden');
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.classList.add('pioneer-card--hidden', 'ad-card--hidden');
        card.style.display = 'none';
      }
    });

    let emptyNotice = document.getElementById('mural-empty-notice');
    if (visibleCount === 0) {
      if (!emptyNotice) {
        emptyNotice = document.createElement('div');
        emptyNotice.id = 'mural-empty-notice';
        emptyNotice.style.cssText = 'grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--text-secondary);';
        emptyNotice.innerHTML = `
          <div style="font-size:2.5rem;margin-bottom:12px">📢</div>
          <h4 style="color:#fff;margin-bottom:6px">Nenhum anúncio nesta categoria ainda</h4>
          <p style="font-size:0.9rem">Seja o primeiro pioneiro a anunciar aqui por uma taxa simbólica em Pi!</p>
          <button type="button" class="portal-btn portal-btn--primary portal-btn--sm" onclick="window.IsarMural && window.IsarMural.openModal()" style="margin-top:14px">
            + Publicar Meu Anúncio
          </button>
        `;
        gridEl.appendChild(emptyNotice);
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
        const gridEl = document.getElementById('mural-ads-grid');
        if (gridEl) {
          local.forEach(function (ad) {
            if (!document.getElementById('card-' + ad.id)) {
              gridEl.insertAdjacentHTML('afterbegin', buildAdCardHtml(ad));
            }
          });
        }
      }
    } catch (_) {}
  }

  // Sincroniza anúncios aprovados salvos no Supabase em background sem afetar os cards existentes
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
          const gridEl = document.getElementById('mural-ads-grid');
          if (gridEl) {
            remoteAds.forEach(function (ad) {
              if (!document.getElementById('card-' + ad.id)) {
                gridEl.insertAdjacentHTML('afterbegin', buildAdCardHtml(ad));
              }
            });
            filterCategory(currentCategory);
          }
        }
      } catch (_) {}
    }
  }

  // --- Modal de Criação de Anúncio ---
  function openModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) modal.classList.add('active');

    const userEl = document.getElementById('ad-input-user');
    try {
      const piUser = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
      if (piUser && userEl && !userEl.value) {
        userEl.value = '@' + (piUser.username || '');
      }
    } catch (_) {}
  }

  function closeModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) modal.classList.remove('active');
  }

  function selectTier(tier) {
    selectedTier = tier || 'prata';
    document.querySelectorAll('.ad-tier-option').forEach(function (opt) {
      opt.classList.toggle('selected', opt.getAttribute('data-tier') === selectedTier);
    });

    const info = tierPrices[selectedTier] || tierPrices.prata;
    const infoEl = document.getElementById('ad-selected-payment-info');
    if (infoEl) {
      infoEl.textContent = `Taxa da publicação: ${info.pi} π (pagamento exclusivo em Pi Network)`;
    }

    const submitBtn = document.getElementById('ad-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = `📢 Publicar Anúncio (${info.pi} π)`;
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
        linkInput.placeholder = 'https://youtube.com/... ou https://wa.me/...';
        linkInput.style.opacity = '1';
        linkInput.style.cursor = 'text';
        if (badgeEl) {
          badgeEl.textContent = 'Link Clicável Incluído 🥈';
          badgeEl.style.color = '#e2e8f0';
        }
        if (hintEl) {
          hintEl.textContent = 'Link direto para seu canal, WhatsApp, Instagram ou site.';
        }
      } else if (selectedTier === 'ouro') {
        linkInput.disabled = false;
        linkInput.placeholder = 'https://seu-canal-ou-loja.com';
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
  }

  async function handleAdSubmit(e) {
    if (e) e.preventDefault();

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');
    const catInput   = document.getElementById('ad-input-cat');
    const userInput  = document.getElementById('ad-input-user');
    const submitBtn  = document.getElementById('ad-submit-btn');

    const title = titleInput ? titleInput.value.trim() : '';
    const desc = descInput ? descInput.value.trim() : '';

    if (!title || title.length < 3) {
      alert('Por favor, informe um título para o seu anúncio (mínimo 3 caracteres).');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!desc || desc.length < 5) {
      alert('Por favor, informe uma descrição detalhada para o anúncio (mínimo 5 caracteres).');
      if (descInput) descInput.focus();
      return;
    }

    const priceInfo = tierPrices[selectedTier] || tierPrices.prata;

    const rawLink = linkInput ? linkInput.value.trim() : '';
    let validatedLink = '';
    if (selectedTier !== 'bronze' && rawLink) {
      if (/^https?:\/\//i.test(rawLink)) {
        validatedLink = rawLink;
      } else {
        alert('Por favor, informe um link válido iniciando com https:// ou http://');
        if (linkInput) linkInput.focus();
        return;
      }
    }

    const rawImg = imgInput ? imgInput.value.trim() : '';
    let validatedImg = '';
    if (selectedTier !== 'bronze' && rawImg && /^https?:\/\//i.test(rawImg)) {
      validatedImg = rawImg;
    }

    const adId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : '@pioneiro';

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
      status: 'pendente',
      created_at: new Date().toISOString()
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando…';
    }

    // ── FLUXO A: Dentro do Pi Browser (Pagamento Nativo com Pi SDK) ──
    if (window.HokagePi && window.HokagePi.isPiBrowser()) {
      window.HokagePi.requestPiPayment({
        amount: priceInfo.pi,
        memo: `Mural HOKAGE22B: ${title.substring(0, 24)}`,
        metadata: {
          type: 'anuncio',
          adId: adId,
          tier: selectedTier
        },
        onSuccess: async function (paymentResult) {
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

          closeModal();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `📢 Publicar Anúncio (${priceInfo.pi} π)`;
          }

          const gridEl = document.getElementById('mural-ads-grid');
          if (gridEl) {
            gridEl.insertAdjacentHTML('afterbegin', buildAdCardHtml(newAd));
          }
          filterCategory(currentCategory);
          alert(`🎉 Pagamento de ${priceInfo.pi} π confirmado na blockchain! Seu anúncio já está no ar na Gazeta dos Pioneiros.`);
        },
        onError: function (err) {
          console.error('Erro no pagamento Pi do mural:', err);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `📢 Publicar Anúncio (${priceInfo.pi} π)`;
          }
        },
        onCancel: function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = `📢 Publicar Anúncio (${priceInfo.pi} π)`;
          }
        }
      });
      return;
    }

    // ── FLUXO B: Fora do Pi Browser (Transferência P2P via Pi Wallet) ──
    if (window.IsarDB && window.IsarDB.createAnuncio) {
      try { await window.IsarDB.createAnuncio(newAd); } catch (_) {}
    }

    try {
      const localAdForSelf = Object.assign({}, newAd, { status: 'ativo' });
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      localAds.unshift(localAdForSelf);
      localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
    } catch (_) {}

    closeModal();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = `📢 Publicar Anúncio (${priceInfo.pi} π)`;
    }

    const gridEl = document.getElementById('mural-ads-grid');
    if (gridEl) {
      gridEl.insertAdjacentHTML('afterbegin', buildAdCardHtml(newAd));
    }
    filterCategory(currentCategory);

    if (window.HokagePi && window.HokagePi.showManualP2PModal) {
      window.HokagePi.showManualP2PModal({
        amount: priceInfo.pi,
        memo: `Anúncio ${selectedTier.toUpperCase()}: ${title}`,
        metadata: { adId: adId, plan: selectedTier }
      });
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

      const closeBtn = document.getElementById('ad-modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const overlay = document.getElementById('ad-create-modal');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeModal();
        });
      }

      const form = document.getElementById('ad-create-form');
      if (form) form.addEventListener('submit', handleAdSubmit);
    },
    filterCategory: filterCategory,
    openModal: openModal,
    closeModal: closeModal,
    selectTier: selectTier,
    handleAdSubmit: handleAdSubmit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.IsarMural) window.IsarMural.init();
    });
  } else {
    if (window.IsarMural) window.IsarMural.init();
  }
})();

