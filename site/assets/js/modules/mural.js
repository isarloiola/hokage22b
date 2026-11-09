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
              ${tier === 'ouro' ? '👑 DESTAQUE VIP' : 'FOTO OFICIAL'}
            </span>
          </div>
        </div>
      `;
    }

    const views = ad.views_count || (tier === 'ouro' ? 142 : 56);
    const clicks = ad.clicks_count || (tier === 'ouro' ? 24 : 7);

    const cleanAuthor = safeAuthor.replace(/^@+/, '');

    return `
      <article class="pioneer-card pioneer-card--${tier}" data-category="${category}" id="card-${cardId}">
        ${bannerHtml}
        <div class="pioneer-card__top">
          <span class="pioneer-card__badge ${tierBadgeClass}">${tierLabel}</span>
          <a href="pioneiro?u=${encodeURIComponent(cleanAuthor)}" class="pioneer-card__author" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px" title="Ver vitrine oficial do pioneiro">${safeAuthor} ↗</a>
        </div>
        <h3 class="pioneer-card__title">${safeTitle}</h3>
        <p class="pioneer-card__desc">${safeDesc}</p>
        <div class="pioneer-card__footer" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          ${linkHtml}
          <div style="display:flex;align-items:center;gap:6px">
            <a href="pioneiro?u=${encodeURIComponent(cleanAuthor)}" class="portal-btn portal-btn--outline portal-btn--sm" style="font-size:0.75rem;padding:6px 12px;border-color:rgba(139,92,246,0.4);color:var(--accent-light);text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:700" title="Ver Vitrine do Pioneiro">
              <span>🌟</span> Ver Vitrine
            </a>
            ${ad.price_pi ? `<span class="pioneer-card__price-tag">${escapeHtml(String(ad.price_pi))} π</span>` : ''}
          </div>
        </div>
        <div class="pioneer-card__metrics" style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.07);font-size:0.75rem;color:var(--text-muted)">
          <div style="display:flex;align-items:center;gap:12px">
            <span title="Visualizações">👁️ <strong style="color:var(--text-secondary)">${views}</strong> views</span>
            <span title="Cliques no anúncio">🖱️ <strong style="color:var(--amber-light)" class="ad-clicks-num" data-id="${cardId}">${clicks}</strong> cliques</span>
          </div>
          <a href="pioneiro?u=${encodeURIComponent(cleanAuthor)}" style="color:var(--accent-light);text-decoration:none;font-weight:700" title="Ver vitrine do anunciante">Vitrine ↗</a>
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
            trackVisibleAds(remoteAds);
          }
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
    if (!adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return;

    // Atualização visual imediata no card
    document.querySelectorAll(`.ad-clicks-num[data-id="${adId}"]`).forEach(function (el) {
      const current = parseInt(el.textContent, 10) || 0;
      el.textContent = current + 1;
    });

    // Envio atômico ao Supabase
    if (window.IsarDB && window.IsarDB.incrementAdClick) {
      window.IsarDB.incrementAdClick(adId).catch(function () {});
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
  }

  function simulateTestnetPublish() {
    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const userInput  = document.getElementById('ad-input-user');
    const catInput   = document.getElementById('ad-input-cat');
    const linkInput  = document.getElementById('ad-input-link');
    const imgInput   = document.getElementById('ad-input-image');

    const title = (titleInput && titleInput.value.trim()) || 'Pioneiro Web3';
    const desc = (descInput && descInput.value.trim()) || 'Simulação de anúncio no mural via Testnet Pi. Pronto para publicação oficial na Mainnet!';
    const user = (userInput && userInput.value.trim()) || '@pioneiro_testnet';
    const cat = (catInput && catInput.value) || 'geral';
    const link = (linkInput && !linkInput.disabled && linkInput.value.trim()) || '';
    const img = (imgInput && imgInput.value.trim()) || '';

    const testId = 'testnet_' + Date.now();
    const testAd = {
      id: testId,
      plan_tier: selectedTier,
      title: '🧪 [TESTNET] ' + title,
      description: desc + ' — (Simulação gratuita de teste)',
      pioneer_username: user,
      category: cat,
      link_url: link,
      image_url: img,
      price_pi: '0.00 (Testnet)'
    };

    const gridEl = document.getElementById('mural-ads-grid');
    if (gridEl) {
      gridEl.insertAdjacentHTML('afterbegin', buildAdCardHtml(testAd));
      const newCard = document.getElementById('card-' + testId);
      if (newCard) {
        newCard.classList.add('card-testnet-highlight');
      }
    }

    closeModal();

    if (window.showToast) {
      window.showToast('🧪 Anúncio Testnet criado com sucesso! Role para ver seu card.', '🎉');
    }

    setTimeout(function () {
      const newCard = document.getElementById('card-' + testId);
      if (newCard) {
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
  }

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

    updateLivePreview();
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

    updateLivePreview();
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
      status: 'ativo',
      created_at: new Date().toISOString()
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processando…';
    }

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
      myCachedAds.forEach(a => {
        totalViews += (a.views_count || 0);
        totalClicks += (a.clicks_count || 0);
      });

      const countEl = document.getElementById('my-ads-count');
      const viewsEl = document.getElementById('my-ads-views');
      const clicksEl = document.getElementById('my-ads-clicks');

      if (countEl) countEl.textContent = myCachedAds.length;
      if (viewsEl) viewsEl.textContent = totalViews;
      if (clicksEl) clicksEl.textContent = totalClicks;

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
              <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
                👁️ ${ad.views_count || 0} views &nbsp;·&nbsp; 🖱️ <strong style="color:var(--amber-light)">${ad.clicks_count || 0} cliques</strong>
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
      if (form) form.addEventListener('submit', handleAdSubmit);

      // Ouvintes para atualização da Prévia ao Vivo em tempo real
      const previewInputs = [
        'ad-input-title',
        'ad-input-desc',
        'ad-input-user',
        'ad-input-link',
        'ad-input-image'
      ];
      previewInputs.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateLivePreview);
      });

      const catEl = document.getElementById('ad-input-cat');
      if (catEl) catEl.addEventListener('change', updateLivePreview);
    },
    filterCategory: filterCategory,
    openModal: openModal,
    closeModal: closeModal,
    selectTier: selectTier,
    handleAdSubmit: handleAdSubmit,
    updateLivePreview: updateLivePreview,
    simulateTestnetPublish: simulateTestnetPublish,
    trackClick: trackClick,
    // Métodos do Painel do Anunciante SaaS
    openMyAdsModal: openMyAdsModal,
    closeMyAdsModal: closeMyAdsModal,
    loadMyAds: loadMyAds,
    openEditModal: openEditModal,
    closeEditModal: closeEditModal,
    saveEditedAd: saveEditedAd,
    renewAdPrompt: renewAdPrompt
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (window.IsarMural) window.IsarMural.init();
    });
  } else {
    if (window.IsarMural) window.IsarMural.init();
  }
})();

