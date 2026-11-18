/**
 * ============================================================
 * HOKAGE22B.COM — Module: A Vila (Mural) Guided Publish Chatbot
 * ============================================================
 * Assistente conversacional rápido (5 passos) que monta e valida
 * o rascunho do anúncio antes de acionar o fluxo oficial Zero-Trust
 * (Pi SDK + Edge Function mural-action / pi-payment).
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const STEPS = [
    {
      key: 'title',
      prompt: '👋 Olá! Vou te ajudar a publicar na <strong>Vila (P2P)</strong> em menos de 1 minuto.<br><br><strong>1/5 — Qual é o título do que você quer divulgar?</strong>',
      type: 'text',
      placeholder: 'Ex: Aulas de Inglês Online aceitando Pi'
    },
    {
      key: 'category',
      prompt: '<strong>2/5 — Em qual categoria seu anúncio se encaixa melhor?</strong>',
      type: 'choices',
      options: [
        { value: 'produto', label: '🛍️ Produto / Loja' },
        { value: 'servico', label: '🛠️ Serviço Profissional' },
        { value: 'tecnologia', label: '💻 Tech & Apps' },
        { value: 'educacao', label: '🎓 Educação & Cursos' },
        { value: 'alimentacao', label: '🍔 Alimentação / Local' },
        { value: 'youtube', label: '▶ Canal YouTube' },
        { value: 'mensagem', label: '💬 Recado da Comunidade' }
      ]
    },
    {
      key: 'country_region',
      prompt: '<strong>3/5 — Qual é o País e Cidade/Região?</strong><br><span style="font-size:0.78rem;color:#a1a1aa">Digite a cidade/região ou escolha um atalho abaixo:</span>',
      type: 'country_region'
    },
    {
      key: 'desc',
      prompt: '<strong>4/5 — Descreva em 1 ou 2 frases o seu anúncio (e cole seu link opcional para Prata/Ouro):</strong>',
      type: 'desc_link'
    },
    {
      key: 'tier',
      prompt: '<strong>5/5 — Escolha o nível de destaque na Vila:</strong><br><span style="font-size:0.78rem;color:#a1a1aa">Se você tiver crédito Bronze grátis de convite, ele será aplicado na tela seguinte!</span>',
      type: 'choices',
      options: [
        { value: 'ouro', label: '🥇 Ouro (3.14 π · Topo + Foto + Link)' },
        { value: 'prata', label: '🥈 Prata (1.0 π · Destaque + Foto + Link)' },
        { value: 'bronze', label: '🥉 Bronze (0.314 π · Classificado)' }
      ]
    }
  ];

  const draft = {
    title: '',
    category: 'produto',
    country: 'BR',
    location: '',
    lang: 'PT',
    desc: '',
    link: '',
    tier: 'prata'
  };

  let currentStep = 0;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectStyles() {
    if (document.getElementById('hk-mural-bot-styles')) return;
    const style = document.createElement('style');
    style.id = 'hk-mural-bot-styles';
    style.textContent = `
      .hk-bot-overlay {
        position: fixed;
        inset: 0;
        z-index: 10040;
        background: rgba(5, 5, 10, 0.84);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
      }
      .hk-bot-card {
        width: 100%;
        max-width: 500px;
        background: #11111a;
        border: 1.5px solid rgba(139, 92, 246, 0.45);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.75);
        color: #f4f4f5;
      }
      .hk-bot-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(245, 158, 11, 0.14));
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .hk-bot-body {
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 75vh;
        overflow-y: auto;
      }
      .hk-bot-bubble {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 14px;
        padding: 13px 15px;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .hk-bot-choices {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .hk-bot-choice-btn {
        padding: 9px 13px;
        border-radius: 12px;
        border: 1px solid rgba(139, 92, 246, 0.4);
        background: rgba(139, 92, 246, 0.12);
        color: #e4e4e7;
        font-size: 0.84rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .hk-bot-choice-btn:hover {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.18);
        color: #fff;
      }
      .hk-bot-input {
        width: 100%;
        padding: 10px 13px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(0, 0, 0, 0.45);
        color: #fff;
        font-size: 0.88rem;
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
  }

  function closeBot() {
    const el = document.getElementById('hk-mural-chatbot-modal');
    if (el) el.remove();
  }

  function finishAndTransferToOfficialModal() {
    closeBot();

    if (window.IsarMural && typeof window.IsarMural.openModal === 'function') {
      window.IsarMural.openModal();
    } else {
      const fallbackBtn = document.querySelector('[onclick*="openModal"]');
      if (fallbackBtn) fallbackBtn.click();
    }

    setTimeout(function () {
      const titleEl = document.getElementById('ad-input-title');
      const catEl = document.getElementById('ad-input-cat');
      const descEl = document.getElementById('ad-input-desc');
      const countryEl = document.getElementById('ad-input-country');
      const locEl = document.getElementById('ad-input-location');
      const linkEl = document.getElementById('ad-input-link');

      if (titleEl) titleEl.value = draft.title;
      if (catEl) catEl.value = draft.category;
      if (descEl) descEl.value = draft.desc;
      if (countryEl) countryEl.value = draft.country;
      if (locEl) locEl.value = draft.location ? (draft.location + ' [' + draft.lang + ']') : ('[' + draft.lang + ']');
      if (linkEl && draft.link) linkEl.value = draft.link;

      if (window.IsarMural && typeof window.IsarMural.selectTier === 'function') {
        window.IsarMural.selectTier(draft.tier);
      }
    }, 120);
  }

  function renderStep() {
    const body = document.getElementById('hk-bot-body');
    if (!body) return;

    const step = STEPS[currentStep];
    if (!step) {
      finishAndTransferToOfficialModal();
      return;
    }

    let controlsHtml = '';
    if (step.type === 'text') {
      controlsHtml =
        '<input type="text" id="hk-bot-text-val" class="hk-bot-input" maxlength="60" placeholder="' + esc(step.placeholder) + '" value="' + esc(draft[step.key] || '') + '" />' +
        '<div style="display:flex;justify-content:flex-end;gap:8px">' +
          '<button type="button" id="hk-bot-next-btn" class="portal-btn portal-btn--primary portal-btn--sm">Continuar →</button>' +
        '</div>';
    } else if (step.type === 'choices') {
      controlsHtml =
        '<div class="hk-bot-choices">' +
          step.options.map(function (opt) {
            return '<button type="button" class="hk-bot-choice-btn" data-val="' + esc(opt.value) + '">' + esc(opt.label) + '</button>';
          }).join('') +
        '</div>';
    } else if (step.type === 'country_region') {
      controlsHtml =
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<select id="hk-bot-country" class="hk-bot-input">' +
            '<option value="BR" selected>🇧🇷 Brasil</option>' +
            '<option value="GLOBAL">🌐 Global / Online</option>' +
            '<option value="PT">🇵🇹 Portugal</option>' +
            '<option value="US">🇺🇸 USA</option>' +
            '<option value="ES">🇪🇸 España</option>' +
            '<option value="OTHER">🌍 Outro</option>' +
          '</select>' +
          '<select id="hk-bot-lang" class="hk-bot-input">' +
            '<option value="PT" selected>🗣️ Português</option>' +
            '<option value="EN">🗣️ English</option>' +
            '<option value="ES">🗣️ Español</option>' +
          '</select>' +
        '</div>' +
        '<input type="text" id="hk-bot-region" class="hk-bot-input" maxlength="45" placeholder="Cidade ou Região (ex: São Paulo, Online...)" value="' + esc(draft.location) + '" />' +
        '<div style="display:flex;justify-content:space-between;gap:8px">' +
          '<button type="button" id="hk-bot-back-btn" class="portal-btn portal-btn--outline portal-btn--sm">← Voltar</button>' +
          '<button type="button" id="hk-bot-next-btn" class="portal-btn portal-btn--primary portal-btn--sm">Continuar →</button>' +
        '</div>';
    } else if (step.type === 'desc_link') {
      controlsHtml =
        '<textarea id="hk-bot-desc" class="hk-bot-input" rows="3" maxlength="160" placeholder="Descreva seu produto, serviço ou recado...">' + esc(draft.desc) + '</textarea>' +
        '<input type="text" id="hk-bot-link" class="hk-bot-input" placeholder="Link opcional (WhatsApp, Vitrine, YouTube...)" value="' + esc(draft.link) + '" />' +
        '<div style="display:flex;justify-content:space-between;gap:8px">' +
          '<button type="button" id="hk-bot-back-btn" class="portal-btn portal-btn--outline portal-btn--sm">← Voltar</button>' +
          '<button type="button" id="hk-bot-next-btn" class="portal-btn portal-btn--primary portal-btn--sm">Continuar →</button>' +
        '</div>';
    }

    body.innerHTML =
      '<div class="hk-bot-bubble">' + step.prompt + '</div>' +
      controlsHtml;

    const backBtn = document.getElementById('hk-bot-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        currentStep = Math.max(0, currentStep - 1);
        renderStep();
      });
    }

    const nextBtn = document.getElementById('hk-bot-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        if (step.key === 'title') {
          const val = (document.getElementById('hk-bot-text-val').value || '').trim();
          if (val.length < 3) {
            alert('Digite um título com pelo menos 3 caracteres.');
            return;
          }
          draft.title = val;
        } else if (step.key === 'country_region') {
          draft.country = document.getElementById('hk-bot-country').value || 'BR';
          draft.lang = document.getElementById('hk-bot-lang').value || 'PT';
          draft.location = (document.getElementById('hk-bot-region').value || '').trim() || 'Online';
        } else if (step.key === 'desc') {
          const d = (document.getElementById('hk-bot-desc').value || '').trim();
          if (d.length < 6) {
            alert('Escreva uma descrição curta (pelo menos 6 caracteres).');
            return;
          }
          if (/(passphrase|24\s*palavras|seed\s*phrase)/i.test(d)) {
            alert('Por segurança, nunca inclua passphrase ou termos de frase secreta.');
            return;
          }
          draft.desc = d;
          draft.link = (document.getElementById('hk-bot-link').value || '').trim();
        }
        currentStep += 1;
        renderStep();
      });
    }

    body.querySelectorAll('.hk-bot-choice-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        draft[step.key] = btn.getAttribute('data-val');
        currentStep += 1;
        renderStep();
      });
    });
  }

  function openChatbot() {
    injectStyles();
    closeBot();
    currentStep = 0;

    const overlay = document.createElement('div');
    overlay.id = 'hk-mural-chatbot-modal';
    overlay.className = 'hk-bot-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="hk-bot-card">' +
        '<div class="hk-bot-head">' +
          '<div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:0.95rem">' +
            '<span>🤖</span><span>Assistente de Publicação · A Vila</span>' +
          '</div>' +
          '<button type="button" id="hk-bot-close-btn" style="background:transparent;border:1px solid rgba(255,255,255,0.18);color:#fff;border-radius:50%;width:30px;height:30px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div class="hk-bot-body" id="hk-bot-body"></div>' +
        '<div style="padding:10px 18px;border-top:1px solid rgba(255,255,255,0.07);text-align:center;background:rgba(0,0,0,0.25)">' +
          '<button type="button" id="hk-bot-direct-form-btn" style="background:none;border:none;color:#a1a1aa;font-size:0.78rem;text-decoration:underline;cursor:pointer">Prefere preencher o formulário completo direto? Abrir formulário →</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeBot();
    });
    document.getElementById('hk-bot-close-btn').addEventListener('click', closeBot);
    document.getElementById('hk-bot-direct-form-btn').addEventListener('click', function () {
      closeBot();
      if (window.IsarMural && typeof window.IsarMural.openModal === 'function') {
        window.IsarMural.openModal();
      }
    });
    renderStep();
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('chatbot') === '1') {
        setTimeout(openChatbot, 300);
      }
    } catch (_) {}
  });

  window.HokageMuralChatbot = {
    open: openChatbot,
    close: closeBot
  };
})();
