/**
 * ============================================================
 * HOKAGE22B.COM — Module: Mural dos Pioneiros & Gazeta Web3
 * Classificados descentralizados da comunidade Pi
 * ============================================================
 */

(function () {
  'use strict';

  // Sanitização estrita contra Cross-Site Scripting (XSS)
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

  const defaultMockAds = [
    {
      id: 'mock-1',
      pioneer_name: 'Isar Loiola',
      pioneer_username: '@hokage22b',
      title: 'Canal @justhokage22b no YouTube',
      description: 'Análises semanais sérias sobre Pi Network, Web3, blockchain e finanças digitais no Brasil. Sem hype, com fatos e tecnologia.',
      link_url: 'https://www.youtube.com/@justhokage22b',
      category: 'youtube',
      plan_tier: 'ouro',
      price_pi: 3.14
    },
    {
      id: 'mock-2',
      pioneer_name: 'Carlos Oliveira',
      pioneer_username: '@carlos_dev',
      title: 'Desenvolvimento de dApps no Pi Browser',
      description: 'Programador front-end cria páginas e integrações com o Pi SDK para pequenos lojistas que querem aceitar Pi.',
      link_url: 'https://wa.me/5511999999999',
      category: 'servico',
      plan_tier: 'prata',
      price_pi: 1.0
    },
    {
      id: 'mock-3',
      pioneer_name: 'Loja Artesanato Mineiro',
      pioneer_username: '@artes_brasil',
      title: 'Artesanato Local Aceitando Pi (P2P)',
      description: 'Peças em madeira e cerâmica enviadas para todo o Brasil. Aceitamos 100% em Pi na Mainnet para pioneiros com KYC aprovado.',
      link_url: 'https://instagram.com/hokage22b',
      category: 'produto',
      plan_tier: 'prata',
      price_pi: 1.0
    },
    {
      id: 'mock-4',
      pioneer_name: 'Pioneiro Curitiba',
      pioneer_username: '@pioneiro_cwb',
      title: 'Rumo à Open Mainnet!',
      description: 'Apoiando o projeto HOKAGE22B pela coragem de falar a verdade sem prometer falsas riquezas. Parabéns pela iniciativa!',
      link_url: '',
      category: 'mensagem',
      plan_tier: 'bronze',
      price_pi: 0.314
    }
  ];

  let currentCategory = 'todos';
  let selectedTier = 'prata';

  const tierPrices = {
    ouro:   { pi: 3.14, brl: 'R$ 15,00', name: '🥇 Destaque Ouro (Topo da Gazeta e Card Duplo)' },
    prata:  { pi: 1.00, brl: 'R$ 7,00',  name: '🥈 Destaque Prata (Card Médio)' },
    bronze: { pi: 0.314, brl: 'R$ 3,00', name: '🥉 Classificado Bronze (Simples)' }
  };

  async function loadAds(category) {
    const gridEl = document.getElementById('mural-ads-grid');
    if (!gridEl) return;

    category = category || currentCategory;
    currentCategory = category;

    let ads = [];
    if (window.IsarDB && window.IsarDB.getAnuncios) {
      try {
        ads = await window.IsarDB.getAnuncios(category);
      } catch (_) {}
    }

    // Mesclar anúncios locais salvos pelo próprio usuário
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      if (localAds && localAds.length > 0) {
        ads = localAds.concat(ads);
      }
    } catch (_) {}

    // Fallback elegante se o banco ainda não tiver registros
    if (!ads || ads.length === 0) {
      ads = defaultMockAds;
      if (category !== 'todos') {
        ads = ads.filter(function (a) { return a.category === category; });
      }
    }

    renderAds(ads);
  }

  function renderAds(ads, targetGridId) {
    const gridEl = document.getElementById(targetGridId || 'mural-ads-grid');
    if (!gridEl) return;

    if (!ads || ads.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--text-secondary)">
          <div style="font-size:2.5rem;margin-bottom:12px">📢</div>
          <h4 style="color:#fff;margin-bottom:6px">Nenhum anúncio nesta categoria ainda</h4>
          <p style="font-size:0.9rem">Seja o primeiro pioneiro a anunciar aqui por uma taxa simbólica em Pi!</p>
          <button type="button" class="portal-btn portal-btn--primary portal-btn--sm" onclick="window.IsarMural && window.IsarMural.openModal()" style="margin-top:14px">
            + Publicar Meu Anúncio
          </button>
        </div>
      `;
      return;
    }

    // Ordenar: Ouro primeiro (topo), depois Prata, depois Bronze
    const tierPriority = { ouro: 3, prata: 2, bronze: 1 };
    const sortedAds = ads.slice().sort(function (a, b) {
      const pA = tierPriority[a.plan_tier] || 1;
      const pB = tierPriority[b.plan_tier] || 1;
      return pB - pA;
    });

    let html = '';
    sortedAds.forEach(function (ad) {
      const tier = (ad.plan_tier === 'ouro' || ad.plan_tier === 'prata') ? ad.plan_tier : 'bronze';
      const tierBadgeClass = 'ad-badge--' + tier;
      const tierLabel = tier === 'ouro' ? '🥇 Destaque Ouro (Card Duplo)' : (tier === 'prata' ? '🥈 Destaque Prata' : '🥉 Classificado Bronze');

      const author = ad.pioneer_username || ad.pioneer_name || '@pioneiro';
      const safeAuthor = escapeHtml(author);
      const safeTitle = escapeHtml(ad.title || '');
      const safeDesc = escapeHtml(ad.description || '');
      const cleanUrl = tier !== 'bronze' ? safeUrl(ad.link_url) : '';

      let linkHtml = '';
      if (tier === 'ouro' && cleanUrl) {
        linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" class="ad-card__link ad-card__link--ouro" style="background:var(--amber);color:#000;font-weight:800;padding:8px 16px;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:6px">⚡ Visitar Agora →</a>`;
      } else if (tier === 'prata' && cleanUrl) {
        linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer nofollow" class="ad-card__link">Acessar Anúncio →</a>`;
      } else {
        linkHtml = `<span style="color:var(--text-muted);font-size:0.8rem;display:inline-flex;align-items:center;gap:4px">💬 Recado da Comunidade</span>`;
      }

      html += `
        <article class="ad-card ad-card--${tier}">
          <div class="ad-card__top">
            <span class="ad-card__badge ${tierBadgeClass}">${tierLabel}</span>
            <span class="ad-card__author">${safeAuthor}</span>
          </div>
          <h3 class="ad-card__title">${safeTitle}</h3>
          <p class="ad-card__desc">${safeDesc}</p>
          <div class="ad-card__footer">
            ${linkHtml}
            <span class="ad-card__price-tag">${ad.price_pi ? escapeHtml(String(ad.price_pi)) + ' π' : ''}</span>
          </div>
        </article>
      `;
    });

    gridEl.innerHTML = html;
  }

  function initFilters() {
    const filterBtns = document.querySelectorAll('.mural-filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        const cat = btn.getAttribute('data-category') || 'todos';
        loadAds(cat);
      });
    });
  }

  // --- Modal de Criação de Anúncio ---
  function openModal() {
    const modal = document.getElementById('ad-create-modal');
    if (modal) modal.classList.add('active');

    // Pré-preenche usuário se estiver logado ou na Pi Network
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
      infoEl.textContent = `Valor do plano: ${info.pi} π (ou ${info.brl} via Pix)`;
    }

    const submitBtn = document.getElementById('ad-submit-btn');
    if (submitBtn) {
      submitBtn.textContent = `📢 Publicar Anúncio (${info.pi} π)`;
    }

    // Regras de Link conforme o plano selecionado
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
  }

  async function handleAdSubmit(e) {
    if (e) e.preventDefault();

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
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

    // Gera ID único confiável para a transação
    const adId = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : ('ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8));

    const username = userInput && userInput.value.trim() ? userInput.value.trim() : '@pioneiro';

    const newAd = {
      id: adId,
      title: title,
      description: desc,
      link_url: validatedLink,
      category: catInput ? catInput.value : 'geral',
      pioneer_username: username,
      pioneer_name: username.replace('@', ''),
      plan_tier: selectedTier,
      price_pi: priceInfo.pi,
      price_brl: parseFloat(priceInfo.brl.replace(/[^\d,]/g, '').replace(',', '.')),
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
          // Pagamento validado na blockchain e confirmado pela Edge Function
          newAd.status = 'ativo';
          newAd.payment_txid = paymentResult.txid;

          // Salva no banco de dados Supabase como ativo
          if (window.IsarDB && window.IsarDB.createAnuncio) {
            await window.IsarDB.createAnuncio(newAd);
          }

          // Salva no cache local
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

          loadAds(currentCategory);
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

    // ── FLUXO B: Fora do Pi Browser (P2P / Pix) ──
    // Salva o anúncio como pendente no banco
    if (window.IsarDB && window.IsarDB.createAnuncio) {
      try {
        await window.IsarDB.createAnuncio(newAd);
      } catch (_) {}
    }

    // Salva localmente para o visitante visualizar de imediato
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

    loadAds(currentCategory);

    // Abre modal P2P explicativo com a carteira oficial
    if (window.HokagePi && window.HokagePi.showManualP2PModal) {
      window.HokagePi.showManualP2PModal({
        amount: priceInfo.pi,
        memo: `Anúncio ${selectedTier.toUpperCase()}: ${title}`,
        metadata: { adId: adId, plan: selectedTier }
      });
    }
  }

  window.IsarMural = {
    init: function () {
      initFilters();
      loadAds('todos');
      selectTier('prata');

      // Bind fechar modal
      const closeBtn = document.getElementById('ad-modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const overlay = document.getElementById('ad-create-modal');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeModal();
        });
      }

      // Bind submit
      const form = document.getElementById('ad-create-form');
      if (form) form.addEventListener('submit', handleAdSubmit);
    },
    loadAds: loadAds,
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
