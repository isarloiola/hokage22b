// ============================================================
// isar.pi — Module: Mural dos Pioneiros & Gazeta Web3
// Classificados descentralizados da comunidade Pi
// ============================================================

(function () {
  'use strict';

  const defaultMockAds = [
    {
      id: 'mock-1',
      pioneer_name: 'Isar Loiola',
      pioneer_username: '@hokage22b',
      title: 'Canal @hokage22b no YouTube',
      description: 'Análises semanais sérias sobre Pi Network, Web3, blockchain e finanças digitais no Brasil. Sem hype, com fatos e tecnologia.',
      link_url: 'https://youtube.com/@hokage22b',
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
      description: 'Apoiando o projeto isar.pi pela coragem de falar a verdade sem prometer falsas riquezas. Parabéns pela iniciativa!',
      link_url: '',
      category: 'mensagem',
      plan_tier: 'bronze',
      price_pi: 0.314
    }
  ];

  let currentCategory = 'todos';
  let selectedTier = 'prata';

  const tierPrices = {
    ouro:   { pi: 3.14, brl: 'R$ 15,00', name: '🥇 Destaque Ouro (Topo do Mural)' },
    prata:  { pi: 1.00, brl: 'R$ 7,00',  name: '🥈 Destaque Prata (Card Médio)' },
    bronze: { pi: 0.314, brl: 'R$ 3,00', name: '🥉 Classificado Bronze (Básico)' }
  };

  async function loadAds(category) {
    const gridEl = document.getElementById('mural-ads-grid');
    if (!gridEl) return;

    category = category || currentCategory;
    currentCategory = category;

    let ads = [];
    if (window.IsarDB && window.IsarDB.getAnuncios) {
      ads = await window.IsarDB.getAnuncios(category);
    }

    // Mesclar anúncios locais salvos
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      if (localAds && localAds.length > 0) {
        ads = localAds.concat(ads);
      }
    } catch (_) {}

    // Fallback com mock data se o banco estiver vazio
    if (!ads || ads.length === 0) {
      ads = defaultMockAds;
      if (category !== 'todos') {
        ads = ads.filter(function (a) { return a.category === category; });
      }
    }

    renderAds(ads);
  }

  function renderAds(ads) {
    const gridEl = document.getElementById('mural-ads-grid');
    if (!gridEl) return;

    if (!ads || ads.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:48px 20px;color:var(--gray-light)">
          <div style="font-size:2.5rem;margin-bottom:12px">📢</div>
          <h4 style="color:#fff;margin-bottom:6px">Nenhum anúncio nesta categoria ainda</h4>
          <p style="font-size:0.9rem">Seja o primeiro pioneiro a anunciar aqui por uma taxa simbólica!</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="window.IsarMural && window.IsarMural.openModal()" style="margin-top:14px">
            + Publicar Meu Anúncio
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    ads.forEach(function (ad) {
      const tier = ad.plan_tier || 'bronze';
      const tierBadgeClass = 'ad-badge--' + tier;
      const tierLabel = tier === 'ouro' ? '🥇 Destaque Ouro' : (tier === 'prata' ? '🥈 Prata' : '🥉 Classificado');

      const author = ad.pioneer_username || ad.pioneer_name || '@pioneiro';
      const linkHtml = ad.link_url
        ? `<a href="${ad.link_url}" target="_blank" rel="noopener noreferrer" class="ad-card__link">Acessar Anúncio →</a>`
        : `<span style="color:var(--gray);font-size:0.8rem">Mensagem da Comunidade</span>`;

      html += `
        <article class="ad-card ad-card--${tier}">
          <div class="ad-card__top">
            <span class="ad-card__badge ${tierBadgeClass}">${tierLabel}</span>
            <span class="ad-card__author">${author}</span>
          </div>
          <h3 class="ad-card__title">${ad.title}</h3>
          <p class="ad-card__desc">${ad.description}</p>
          <div class="ad-card__footer">
            ${linkHtml}
            <span class="ad-card__price-tag">${ad.price_pi ? ad.price_pi + ' π' : ''}</span>
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

    // Pré-preenche usuário se estiver logado
    const userEl = document.getElementById('ad-input-user');
    try {
      const loggedUser = JSON.parse(localStorage.getItem('isar_pi_user') || 'null');
      if (loggedUser && userEl && !userEl.value) {
        userEl.value = loggedUser.username || '';
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

    const infoEl = document.getElementById('ad-selected-payment-info');
    if (infoEl) {
      const info = tierPrices[selectedTier];
      infoEl.textContent = `Valor do plano: ${info.pi} π (ou ${info.brl} via Pix)`;
    }
  }

  async function handleAdSubmit(e) {
    if (e) e.preventDefault();

    const titleInput = document.getElementById('ad-input-title');
    const descInput  = document.getElementById('ad-input-desc');
    const linkInput  = document.getElementById('ad-input-link');
    const catInput   = document.getElementById('ad-input-cat');
    const userInput  = document.getElementById('ad-input-user');

    if (!titleInput || !titleInput.value.trim()) {
      alert('Por favor, informe um título para o seu anúncio.');
      return;
    }
    if (!descInput || !descInput.value.trim()) {
      alert('Por favor, informe a descrição ou mensagem do anúncio.');
      return;
    }

    const priceInfo = tierPrices[selectedTier] || tierPrices.prata;

    const newAd = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      link_url: linkInput ? linkInput.value.trim() : '',
      category: catInput ? catInput.value : 'geral',
      pioneer_username: userInput && userInput.value.trim() ? userInput.value.trim() : '@pioneiro',
      pioneer_name: userInput && userInput.value.trim() ? userInput.value.trim() : 'Pioneiro',
      plan_tier: selectedTier,
      price_pi: priceInfo.pi,
      price_brl: parseFloat(priceInfo.brl.replace(/[^\d,]/g, '').replace(',', '.')),
      status: 'ativo',
      created_at: new Date().toISOString()
    };

    // Salva localmente para visualização instantânea
    try {
      const localAds = JSON.parse(localStorage.getItem('isar_local_ads') || '[]');
      localAds.unshift(newAd);
      localStorage.setItem('isar_local_ads', JSON.stringify(localAds));
    } catch (_) {}

    // Salva no Supabase se disponível
    if (window.IsarDB && window.IsarDB.createAnuncio) {
      window.IsarDB.createAnuncio(newAd);
    }

    closeModal();

    if (window.showToast) {
      window.showToast('Anúncio cadastrado com sucesso no Mural dos Pioneiros!', '🎉');
    }

    loadAds(currentCategory);

    // Abre modal de pagamento para o usuário copiar os dados
    if (window.openPiProModal) {
      setTimeout(function () {
        window.openPiProModal();
      }, 500);
    }
  }

  window.IsarMural = {
    init: function () {
      initFilters();
      loadAds('todos');
      selectTier('prata');

      // Bind fechar modal via botão ✕ e clique no overlay
      var closeBtn = document.getElementById('ad-modal-close');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      var overlay = document.getElementById('ad-create-modal');
      if (overlay) {
        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) closeModal();
        });
      }

      // Bind submit do formulário
      var form = document.getElementById('ad-create-form');
      if (form) form.addEventListener('submit', handleAdSubmit);
    },
    loadAds: loadAds,
    openModal: openModal,
    closeModal: closeModal,
    selectTier: selectTier,
    handleAdSubmit: handleAdSubmit
  };

})();

