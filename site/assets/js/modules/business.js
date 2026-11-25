/**
 * ============================================================
 * HOKAGE22B.COM — Hokage Business Controller (v1.0)
 * ============================================================
 * Consome window.HOKAGE_CONFIG.businessApiUrl (Supabase Edge Function
 * hoje, pronta para migração transparente para Backend Java depois).
 */
(function () {
  'use strict';

  const cfg = window.HOKAGE_CONFIG || {};
  const API_URL = cfg.businessApiUrl || 'https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/business-api';

  const PILOT_FALLBACK_BUSINESSES = [
    {
      id: 'pilot-hokage22b',
      slug: 'hokage22b',
      name: 'HOKAGE22B Oficial',
      tagline: 'Empresa #01 Piloto · Ecossistema Web3, E-books & A Vila',
      description: 'Negócio piloto oficial validando o padrão Hokage Business na Pi Testnet antes da abertura da Pi DEX Mainnet.',
      category: 'tecnologia',
      city_region: 'Brasil · Global',
      owner_username: '@hokage22b',
      wallet_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
      verification_level: 2,
      plan_tier: 'pro',
      token_network: 'testnet',
      asset_code: 'HKG22B',
      issuer_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
      utility_summary: 'Token piloto de utilidade comercial: resgate de destaques na Vila, e-books oficiais e acesso ao Clube Construtor VIP.',
      trust_score: 92,
      total_redemptions_count: 0,
      isFallbackPilot: true,
      benefits: [
        {
          id: 'pilot-benefit-redeem',
          mode: 'transfer_redeem',
          title: 'Resgate Piloto: Destaque Bronze na Vila ou E-book Oficial',
          description: 'Envie 10 HKG22B (Testnet) com o memo da ordem para liberar seu voucher.',
          required_amount: 10,
          reward_type: 'vila_boost'
        },
        {
          id: 'pilot-benefit-hold',
          mode: 'hold_unlock',
          title: 'Clube Construtor VIP HOKAGE22B',
          description: 'Mantenha pelo menos 50 HKG22B na carteira Pi (Testnet) para desbloquear benefícios VIP.',
          required_amount: 50,
          reward_type: 'vip_access'
        }
      ]
    }
  ];

  let loadedBusinesses = [];
  let activeFilter = 'all';
  let activeBenefit = null;
  let activeRedemptionId = '';

  function esc(str) {
    if (window.HokageUtils && typeof window.HokageUtils.escapeHtml === 'function') {
      return window.HokageUtils.escapeHtml(str);
    }
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isValidWallet(addr) {
    if (window.HokageUtils && typeof window.HokageUtils.isValidPiPublicKey === 'function') {
      return window.HokageUtils.isValidPiPublicKey(addr);
    }
    return /^G[A-Z2-7]{55}$/.test(String(addr || '').trim());
  }

  async function resolveAuthTokens() {
    let accessToken = (window.HokagePi && typeof window.HokagePi.getAccessToken === 'function')
      ? window.HokagePi.getAccessToken()
      : '';
    if (!accessToken) {
      try { accessToken = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) {}
    }
    let web2Token = '';
    if (!accessToken && window.HokageWeb2Auth && typeof window.HokageWeb2Auth.getAccessToken === 'function') {
      try { web2Token = await window.HokageWeb2Auth.getAccessToken(); } catch (_) {}
    }
    return { accessToken: accessToken || '', web2Token: web2Token || '' };
  }

  async function callApiPost(action, payload) {
    const tokens = await resolveAuthTokens();
    if (!tokens.accessToken && !tokens.web2Token) {
      throw new Error('Conecte sua conta primeiro (Pi Browser ou E-mail/Google) no botão do topo.');
    }
    const body = { action: action, payload: payload || {} };
    if (tokens.accessToken) body.accessToken = tokens.accessToken;
    if (tokens.web2Token) body.web2Token = tokens.web2Token;

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || 'Erro ao comunicar com o servidor Hokage Business.');
    }
    return json.data || json;
  }

  function setFeedback(elId, msg, isError) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = 'hb-feedback ' + (isError ? 'hb-feedback--err' : 'hb-feedback--ok');
  }

  function clearFeedback(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = '';
    el.className = 'hb-feedback';
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function levelBadgeHtml(level) {
    const lv = Number(level || 1);
    if (lv >= 3) return '<span class="hb-level-badge hb-level-3">🏆 Nível 3 · Auditado Pi DEX</span>';
    if (lv === 2) return '<span class="hb-level-badge hb-level-2">✓ Nível 2 · Business Verificado</span>';
    return '<span class="hb-level-badge hb-level-1">● Nível 1 · Cadastrado</span>';
  }

  function renderDirectory() {
    const grid = document.getElementById('hb-directory-grid');
    if (!grid) return;

    const q = ((document.getElementById('hb-search-input') || {}).value || '').trim().toLowerCase();
    const items = loadedBusinesses.filter(function (b) {
      if (activeFilter === 'verified' && Number(b.verification_level || 1) < 2) return false;
      if (activeFilter === 'testnet' && (b.token_network || 'testnet') !== 'testnet') return false;
      if (activeFilter === 'mainnet' && b.token_network !== 'mainnet') return false;
      if (!q) return true;
      const hay = [b.name, b.slug, b.tagline, b.category, b.asset_code, b.owner_username, b.city_region]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });

    if (!items.length) {
      grid.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:28px;border-radius:16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);color:var(--text-muted)">' +
          'Nenhuma empresa encontrada com este filtro. Seja o primeiro dessa categoria!' +
        '</div>';
      return;
    }

    grid.innerHTML = items.map(function (b) {
      const benefits = Array.isArray(b.benefits) ? b.benefits : [];
      const netLabel = b.token_network === 'mainnet' ? '⚡ Mainnet' : '🧪 Testnet';
      const tokenHtml = b.asset_code
        ? (
          '<div class="hb-token-box">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
              '<strong style="color:#c4b5fd;font-family:var(--font-mono);font-size:0.95rem">$' + esc(b.asset_code) + '</strong>' +
              '<span style="font-size:0.72rem;font-weight:700;color:#fde68a">' + netLabel + ' · Confiança ' + esc(b.trust_score || 50) + '/100</span>' +
            '</div>' +
            '<p style="font-size:0.8rem;color:#d4d4d8;margin:0;line-height:1.45">' + esc(b.utility_summary || '') + '</p>' +
          '</div>'
        )
        : '<div style="font-size:0.8rem;color:var(--text-muted)">Token comercial ainda em configuração.</div>';

      const benefitsHtml = benefits.map(function (bf) {
        const isHold = bf.mode === 'hold_unlock';
        const btnLabel = isHold ? '🔓 Checar Acesso VIP' : '🎟️ Resgatar com Token';
        const btnCls = isHold ? 'portal-btn--outline' : 'portal-btn--amber';
        return (
          '<div class="hb-benefit-item">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
              '<strong style="font-size:0.88rem;color:#fff">' + esc(bf.title) + '</strong>' +
              '<span style="font-family:var(--font-mono);font-size:0.76rem;color:#fbbf24;font-weight:800">' +
                esc(bf.required_amount) + ' ' + esc(b.asset_code || 'TOKEN') +
              '</span>' +
            '</div>' +
            (bf.description ? '<p style="font-size:0.78rem;color:#a1a1aa;margin:0;line-height:1.4">' + esc(bf.description) + '</p>' : '') +
            '<button type="button" class="portal-btn ' + btnCls + ' portal-btn--sm" data-hb-action="' + esc(bf.mode) + '" data-biz-id="' + esc(b.id) + '" data-benefit-id="' + esc(bf.id) + '" style="align-self:flex-start;font-weight:800">' +
              btnLabel +
            '</button>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="hb-card' + (Number(b.verification_level || 1) >= 2 ? ' hb-card--featured' : '') + '">' +
          '<div class="hb-card-head">' +
            '<div>' +
              levelBadgeHtml(b.verification_level) +
              '<h3 style="font-size:1.18rem;color:#fff;margin:8px 0 2px">' + esc(b.name) + '</h3>' +
              '<div style="font-size:0.78rem;color:#a1a1aa">' + esc(b.owner_username) + (b.city_region ? ' · ' + esc(b.city_region) : '') + '</div>' +
            '</div>' +
            '<a href="pioneiro?u=' + encodeURIComponent(b.owner_username || '') + '" class="portal-btn portal-btn--outline portal-btn--sm" style="text-decoration:none">🪪 Ver Dono</a>' +
          '</div>' +
          (b.tagline ? '<p style="font-size:0.85rem;color:#e4e4e7;margin:0;line-height:1.45">' + esc(b.tagline) + '</p>' : '') +
          tokenHtml +
          '<div class="hb-benefits-list">' + benefitsHtml + '</div>' +
        '</article>'
      );
    }).join('');
  }

  async function loadDirectory() {
    const banner = document.getElementById('hb-status-banner');
    try {
      const res = await fetch(API_URL + '?action=list', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('API offline');
      const json = await res.json();
      const rows = (json && json.data && Array.isArray(json.data.businesses)) ? json.data.businesses : [];
      if (rows.length > 0) {
        loadedBusinesses = rows;
        if (banner) banner.style.display = 'none';
      } else {
        loadedBusinesses = PILOT_FALLBACK_BUSINESSES;
      }
    } catch (_) {
      loadedBusinesses = PILOT_FALLBACK_BUSINESSES;
      if (banner) {
        banner.style.display = 'block';
        banner.textContent = '🧪 Modo Demonstração Local: exibindo Empresa #01 Piloto (HOKAGE22B). Aplique a migration 025 e faça deploy da Edge Function business-api para ativar gravação em produção.';
      }
    }
    renderDirectory();
  }

  function findBenefitContext(bizId, benefitId) {
    const biz = loadedBusinesses.find(function (b) { return String(b.id) === String(bizId); });
    if (!biz) return null;
    const bf = (biz.benefits || []).find(function (item) { return String(item.id) === String(benefitId); });
    if (!bf) return null;
    return { biz: biz, bf: bf };
  }

  function openRedeemModal(biz, bf) {
    activeBenefit = { biz: biz, bf: bf };
    activeRedemptionId = '';
    document.getElementById('hb-redeem-title').textContent = bf.title;
    document.getElementById('hb-redeem-desc').textContent =
      'Resgate não-custodial de ' + bf.required_amount + ' ' + (biz.asset_code || 'TOKEN') +
      ' direto para ' + biz.name + '.';
    document.getElementById('hb-redeem-step1').style.display = 'block';
    document.getElementById('hb-redeem-step2').style.display = 'none';
    document.getElementById('hb-tx-hash-input').value = '';
    clearFeedback('hb-redeem-feedback');
    openModal('hb-modal-redeem');
  }

  function openHoldModal(biz, bf) {
    activeBenefit = { biz: biz, bf: bf };
    document.getElementById('hb-hold-title').textContent = bf.title;
    document.getElementById('hb-hold-desc').textContent =
      'Verifique se sua carteira Pi possui pelo menos ' + bf.required_amount + ' ' + (biz.asset_code || 'TOKEN') +
      ' na rede ' + (biz.token_network || 'testnet') + '.';
    clearFeedback('hb-hold-feedback');
    openModal('hb-modal-hold');
  }

  function bindEvents() {
    document.querySelectorAll('.portal-modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay) closeModal(overlay.id);
      });
    });
    document.querySelectorAll('.portal-modal-close').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const modal = btn.closest('.portal-modal-overlay');
        if (modal) closeModal(modal.id);
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        document.querySelectorAll('.portal-modal-overlay.active').forEach(function (m) {
          closeModal(m.id);
        });
      }
    });

    const openCreateBtn = document.getElementById('hb-open-create-btn');
    if (openCreateBtn) {
      openCreateBtn.addEventListener('click', function () {
        clearFeedback('hb-create-feedback');
        openModal('hb-modal-create');
      });
    }

    const searchInput = document.getElementById('hb-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', renderDirectory);
    }

    document.querySelectorAll('.hb-pill[data-filter]').forEach(function (pill) {
      pill.addEventListener('click', function () {
        activeFilter = pill.getAttribute('data-filter') || 'all';
        document.querySelectorAll('.hb-pill[data-filter]').forEach(function (p) {
          p.classList.toggle('active', p === pill);
        });
        renderDirectory();
      });
    });

    const grid = document.getElementById('hb-directory-grid');
    if (grid) {
      grid.addEventListener('click', function (ev) {
        const btn = ev.target.closest('button[data-hb-action]');
        if (!btn) return;
        const ctx = findBenefitContext(btn.getAttribute('data-biz-id'), btn.getAttribute('data-benefit-id'));
        if (!ctx) return;
        if (btn.getAttribute('data-hb-action') === 'hold_unlock') {
          openHoldModal(ctx.biz, ctx.bf);
        } else {
          openRedeemModal(ctx.biz, ctx.bf);
        }
      });
    }

    document.querySelectorAll('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = document.getElementById(btn.getAttribute('data-copy-target'));
        if (!target || !navigator.clipboard) return;
        navigator.clipboard.writeText(target.textContent || '').then(function () {
          const old = btn.textContent;
          btn.textContent = '✓';
          setTimeout(function () { btn.textContent = old; }, 1200);
        });
      });
    });

    const createForm = document.getElementById('hb-create-form');
    if (createForm) {
      createForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        clearFeedback('hb-create-feedback');
        const submitBtn = document.getElementById('hb-create-submit');
        const wallet = (document.getElementById('hb-biz-wallet').value || '').trim();
        if (!isValidWallet(wallet)) {
          setFeedback('hb-create-feedback', 'Chave pública Pi inválida. Deve iniciar com G e ter 56 caracteres válidos.', true);
          return;
        }
        submitBtn.disabled = true;
        try {
          const bizRes = await callApiPost('create_business', {
            name: document.getElementById('hb-biz-name').value,
            slug: document.getElementById('hb-biz-slug').value,
            category: document.getElementById('hb-biz-cat').value,
            city_region: document.getElementById('hb-biz-city').value,
            wallet_address: wallet,
            tagline: document.getElementById('hb-biz-tagline').value
          });
          const biz = bizRes.business;
          const tokCode = (document.getElementById('hb-tok-code').value || '').trim().toUpperCase();
          if (biz && tokCode) {
            const issuer = (document.getElementById('hb-tok-issuer').value || wallet).trim();
            await callApiPost('register_token', {
              business_id: biz.id,
              network: document.getElementById('hb-tok-net').value,
              asset_code: tokCode,
              issuer_address: issuer,
              utility_summary: document.getElementById('hb-tok-util').value || ('Token comercial ' + tokCode)
            });
          }
          setFeedback('hb-create-feedback', '✓ Empresa salva com sucesso no Hokage Business (Nível 1)!', false);
          loadDirectory();
        } catch (err) {
          setFeedback('hb-create-feedback', err.message || 'Erro ao cadastrar empresa.', true);
        } finally {
          submitBtn.disabled = false;
        }
      });
    }

    const genBtn = document.getElementById('hb-generate-intent-btn');
    if (genBtn) {
      genBtn.addEventListener('click', async function () {
        if (!activeBenefit) return;
        clearFeedback('hb-redeem-feedback');
        if (String(activeBenefit.bf.id).indexOf('pilot-') === 0) {
          setFeedback('hb-redeem-feedback', 'Publique a migration 025 e a Edge Function business-api para gerar ordens reais.', true);
          return;
        }
        genBtn.disabled = true;
        try {
          const data = await callApiPost('create_redemption_intent', { benefit_id: activeBenefit.bf.id });
          activeRedemptionId = data.redemption_id;
          document.getElementById('hb-intent-wallet').textContent = data.destination_wallet;
          document.getElementById('hb-intent-memo').textContent = data.expected_memo;
          document.getElementById('hb-intent-summary').textContent =
            'Valor: ' + data.expected_amount + ' ' + data.asset_code + ' (' + data.network + '). Válido por 30 minutos.';
          document.getElementById('hb-redeem-step1').style.display = 'none';
          document.getElementById('hb-redeem-step2').style.display = 'block';
        } catch (err) {
          setFeedback('hb-redeem-feedback', err.message || 'Não foi possível gerar ordem.', true);
        } finally {
          genBtn.disabled = false;
        }
      });
    }

    const confirmBtn = document.getElementById('hb-confirm-tx-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async function () {
        clearFeedback('hb-redeem-feedback');
        const txHash = (document.getElementById('hb-tx-hash-input').value || '').trim();
        if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
          setFeedback('hb-redeem-feedback', 'Informe um tx_hash válido com 64 caracteres hexadecimais.', true);
          return;
        }
        confirmBtn.disabled = true;
        try {
          const data = await callApiPost('confirm_redemption', {
            redemption_id: activeRedemptionId,
            tx_hash: txHash
          });
          setFeedback('hb-redeem-feedback', '✓ Resgate confirmado on-chain! Seu voucher: ' + data.voucher_code, false);
          loadDirectory();
        } catch (err) {
          setFeedback('hb-redeem-feedback', err.message || 'Falha ao validar transação.', true);
        } finally {
          confirmBtn.disabled = false;
        }
      });
    }

    const holdBtn = document.getElementById('hb-check-hold-btn');
    if (holdBtn) {
      holdBtn.addEventListener('click', async function () {
        if (!activeBenefit) return;
        clearFeedback('hb-hold-feedback');
        const wallet = (document.getElementById('hb-hold-wallet-input').value || '').trim();
        if (!isValidWallet(wallet)) {
          setFeedback('hb-hold-feedback', 'Chave pública Pi (G...) inválida.', true);
          return;
        }
        if (String(activeBenefit.bf.id).indexOf('pilot-') === 0) {
          setFeedback('hb-hold-feedback', 'Publique a migration 025 e a Edge Function business-api para validar saldos reais na Pi Horizon API.', true);
          return;
        }
        holdBtn.disabled = true;
        try {
          const url = API_URL + '?action=eligibility&benefit_id=' + encodeURIComponent(activeBenefit.bf.id) + '&wallet=' + encodeURIComponent(wallet);
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          const json = await res.json().catch(function () { return {}; });
          if (!res.ok || json.ok === false) {
            throw new Error(json.error || 'Não foi possível consultar a carteira.');
          }
          const d = json.data || json;
          if (d.eligible) {
            setFeedback('hb-hold-feedback', '✓ Elegível! Saldo atual: ' + d.current_balance + ' ' + d.asset_code + ' (mínimo ' + d.required_amount + '). Acesso VIP liberado!', false);
          } else {
            setFeedback('hb-hold-feedback', 'Saldo atual: ' + d.current_balance + ' ' + d.asset_code + '. Necessário manter pelo menos ' + d.required_amount + ' ' + d.asset_code + '.', true);
          }
        } catch (err) {
          setFeedback('hb-hold-feedback', err.message || 'Erro ao consultar saldo.', true);
        } finally {
          holdBtn.disabled = false;
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    loadDirectory();
  });
})();
