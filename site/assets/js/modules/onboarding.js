// ============================================================
// isar.pi — Module: Interactive Onboarding & Conversion Flow
// Diagnóstico de Boas-Vindas sem Atrito (Anti-Objeção)
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'isar_onboarded_seen';

  const diagnosticData = {
    beginner: {
      badge: '🧭 Rota Recomendada: Nível Básico',
      title: 'Comece com o Manual Pi Network (Gratuito)',
      text: 'Como você está conhecendo o ecossistema agora, o mais importante é não cair em golpes e não se iludir com falsas promessas de enriquecimento. Nosso Manual de 100 páginas explica em linguagem simples o que é dinheiro digital, como o app funciona e por que ele não consome sua bateria.',
      btnText: '📖 Baixar o Manual Gratuito',
      btnTarget: '#lista-espera'
    },
    intermediate: {
      badge: '🛡️ Rota Recomendada: Nível Intermediário',
      title: 'Foco no Checklist e Desbloqueio do Saldo',
      text: 'Você já minera, mas precisa garantir que seus Pi não fiquem presos. Acesse nosso Checklist Mainnet na Área de Membros para conferir as 8 etapas essenciais (configuração de carteira, frase secreta e aprovação no KYC).',
      btnText: '⚡ Ir para Checklist & Área de Membros',
      btnTarget: '#membros'
    },
    advanced: {
      badge: '💼 Rota Recomendada: Negócios & Web3',
      title: 'Monetização, dApps e Networking VIP',
      text: 'Excelente! A verdadeira revolução do Pi não é vender moeda em corretora, mas movimentar a economia digital. Acesse a Área de Membros para usar nossa Calculadora, entender como integrar o Pi SDK no seu negócio e conectar com outros pioneiros.',
      btnText: '🚀 Conectar Área de Negócios',
      btnTarget: '#membros'
    }
  };

  function openOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.add('active');
  }

  function closeOnboarding(markAsSeen) {
    const modal = document.getElementById('onboarding-modal');
    if (modal) modal.classList.remove('active');
    if (markAsSeen) {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch (_) {}
    }
  }

  function selectOption(type) {
    const options = document.querySelectorAll('.onboarding-option-btn');
    options.forEach(function (btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-type') === type);
    });

    const resultBox = document.getElementById('onboarding-result-box');
    const badgeEl   = document.getElementById('onboarding-res-badge');
    const titleEl   = document.getElementById('onboarding-res-title');
    const textEl    = document.getElementById('onboarding-res-text');
    const btnAction = document.getElementById('onboarding-res-btn');

    const data = diagnosticData[type] || diagnosticData.beginner;

    if (badgeEl) badgeEl.textContent = data.badge;
    if (titleEl) titleEl.textContent = data.title;
    if (textEl)  textEl.textContent  = data.text;

    if (btnAction) {
      btnAction.textContent = data.btnText;
      btnAction.onclick = function () {
        closeOnboarding(true);
        const target = document.querySelector(data.btnTarget);
        if (target) {
          setTimeout(function () {
            const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
            const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
            window.scrollTo({ top: top, behavior: 'smooth' });
          }, 100);
        }
      };
    }

    if (resultBox) resultBox.classList.add('active');
  }

  function handleAlreadyMember() {
    closeOnboarding(true);
    const target = document.getElementById('membros');
    if (target) {
      setTimeout(function () {
        const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 100);
    }
    // Se não estiver logado, abre o modal de login automaticamente para facilitar
    if (!localStorage.getItem('isar_pi_user') && window.openPiLoginModal) {
      setTimeout(function () {
        window.openPiLoginModal();
      }, 500);
    }
  }

  function initOnboarding() {
    // Abrir automaticamente no primeiro acesso após breve delay
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    const isLogged = localStorage.getItem('isar_pi_user');

    if (!hasSeen && !isLogged) {
      setTimeout(function () {
        openOnboarding();
      }, 1200);
    }

    // Event listener para botões de opção do Quiz
    document.querySelectorAll('.onboarding-option-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const type = btn.getAttribute('data-type');
        selectOption(type);
      });
    });
  }

  window.IsarOnboarding = {
    init: initOnboarding,
    open: openOnboarding,
    close: closeOnboarding,
    handleAlreadyMember: handleAlreadyMember
  };

})();
