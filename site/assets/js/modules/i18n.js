// ============================================================
// isar.pi — Module: Internationalization (i18n)
// Multi-idioma: Português (PT-BR), English (EN), Español (ES)
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'isar_lang';
  const DEFAULT_LANG = 'pt';

  const translations = {
    pt: {
      'nav.manual': 'O Manual',
      'nav.blockchain': 'Blockchain',
      'nav.web3': 'Web3',
      'nav.pibrowser': 'Pi Browser',
      'nav.members': 'Área de Membros',
      'nav.youtube': 'YouTube',
      'nav.mine': 'Minerar Pi',
      'nav.donate': 'Apoiar',
      'nav.login': 'Entrar com Pi',
      'nav.free_ebook': '📖 Ebook Grátis',
      
      'hero.badge': 'Educação Aberta & Independente',
      'hero.subtitle': 'Entenda a arquitetura técnica, o ecossistema Web3 e o papel do Pi Browser sem ilusões, sem promessas de ganhos fáceis e com base em fontes oficiais.',
      'hero.btn_manual': '📖 Baixar Manual Gratuito',
      'hero.btn_members': '⚡ Conectar Área de Membros',

      'donation.badge': 'Contribua com a Comunidade',
      'donation.title': 'Apoie a Criação de Conteúdo Independente',
      'donation.desc': 'O projeto isar.pi é 100% mantido por esforço independente. Suas doações em Reais (PIX) ou em Pi ajudam a manter os servidores ativos, produzir novos vídeos e manter os livros gratuitos para todos os pioneiros.',
      'donation.pix_badge': 'Chave Pix (Reais)',
      'donation.pix_title': 'Doe via PIX',
      'donation.pix_desc': 'Qualquer valor — de R$ 2 a R$ 20 — faz uma enorme diferença para mantermos a pesquisa, gravação e atualizações em dia.',
      'donation.pix_label': 'Chave PIX (E-mail)',
      'donation.pix_btn': '📋 Copiar Chave PIX',
      'donation.pix_note': 'Envio instantâneo pelo app do seu banco',
      'donation.pi_badge': 'Cripto Nativa Web3',
      'donation.pi_title': 'Doe Pi Network (π)',
      'donation.pi_desc': 'Transfira Pi diretamente da sua carteira para apoiar o ecossistema e fortalecer o projeto dos pioneiros no Brasil.',
      'donation.pi_label': 'Endereço da Carteira Pi (Chave Pública)',
      'donation.pi_btn': '📋 Copiar Carteira Pi',
      'donation.pi_note': 'Transfira pelo Pi Browser ou Pi Wallet',
      'donation.copied': 'Chave copiada com sucesso!'
    },
    en: {
      'nav.manual': 'The Manual',
      'nav.blockchain': 'Blockchain',
      'nav.web3': 'Web3',
      'nav.pibrowser': 'Pi Browser',
      'nav.members': 'Members Area',
      'nav.youtube': 'YouTube',
      'nav.mine': 'Mine Pi',
      'nav.donate': 'Support',
      'nav.login': 'Sign in with Pi',
      'nav.free_ebook': '📖 Free Ebook',

      'hero.badge': 'Open & Independent Education',
      'hero.subtitle': 'Understand the technical architecture, Web3 ecosystem, and the role of Pi Browser without hype, false promises, and strictly based on official sources.',
      'hero.btn_manual': '📖 Download Free Manual',
      'hero.btn_members': '⚡ Connect Members Area',

      'donation.badge': 'Community Contribution',
      'donation.title': 'Support Independent Content Creation',
      'donation.desc': 'The isar.pi project is 100% maintained through independent effort. Your donations in BRL (PIX) or Pi Network help keep our servers alive, produce new videos, and provide free educational books for all Pioneers.',
      'donation.pix_badge': 'Pix Key (BRL)',
      'donation.pix_title': 'Donate via PIX (Brazil)',
      'donation.pix_desc': 'Any amount helps keep research, video production, and technical updates active and free for everyone.',
      'donation.pix_label': 'PIX Key (Email)',
      'donation.pix_btn': '📋 Copy PIX Key',
      'donation.pix_note': 'Instant transfer via Brazilian banking apps',
      'donation.pi_badge': 'Native Web3 Crypto',
      'donation.pi_title': 'Donate Pi Network (π)',
      'donation.pi_desc': 'Transfer Pi directly from your wallet to support the ecosystem and empower Pioneers worldwide.',
      'donation.pi_label': 'Pi Wallet Address (Public Key)',
      'donation.pi_btn': '📋 Copy Pi Wallet',
      'donation.pi_note': 'Transfer via Pi Browser or Pi Wallet',
      'donation.copied': 'Key copied to clipboard!'
    },
    es: {
      'nav.manual': 'El Manual',
      'nav.blockchain': 'Blockchain',
      'nav.web3': 'Web3',
      'nav.pibrowser': 'Pi Browser',
      'nav.members': 'Área de Miembros',
      'nav.youtube': 'YouTube',
      'nav.mine': 'Minar Pi',
      'nav.donate': 'Apoyar',
      'nav.login': 'Entrar con Pi',
      'nav.free_ebook': '📖 Ebook Gratis',

      'hero.badge': 'Educación Abierta e Independiente',
      'hero.subtitle': 'Comprende la arquitectura técnica, el ecosistema Web3 y el papel de Pi Browser sin exageraciones ni promesas falsas, basado en fuentes oficiales.',
      'hero.btn_manual': '📖 Descargar Manual Gratis',
      'hero.btn_members': '⚡ Conectar Área de Miembros',

      'donation.badge': 'Contribución a la Comunidad',
      'donation.title': 'Apoya la Creación de Contenido Independiente',
      'donation.desc': 'El proyecto isar.pi se mantiene al 100% con esfuerzo independiente. Tus donaciones en Reales (PIX) o en Pi ayudan a mantener activos los servidores y producir libros gratuitos para todos los pioneros.',
      'donation.pix_badge': 'Clave Pix (Reales)',
      'donation.pix_title': 'Donar vía PIX (Brasil)',
      'donation.pix_desc': 'Cualquier aporte ayuda a mantener la investigación, grabación y actualizaciones técnicas.',
      'donation.pix_label': 'Clave PIX (Correo)',
      'donation.pix_btn': '📋 Copiar Clave PIX',
      'donation.pix_note': 'Envío instantáneo mediante apps bancarias',
      'donation.pi_badge': 'Cripto Nativa Web3',
      'donation.pi_title': 'Donar Pi Network (π)',
      'donation.pi_desc': 'Transfiere Pi directamente desde tu billetera para apoyar el ecosistema pionero.',
      'donation.pi_label': 'Dirección de Billetera Pi (Clave Pública)',
      'donation.pi_btn': '📋 Copiar Billetera Pi',
      'donation.pi_note': 'Transfiere por Pi Browser o Pi Wallet',
      'donation.copied': '¡Clave copiada con éxito!'
    }
  };

  let currentLang = DEFAULT_LANG;

  function setLanguage(lang) {
    if (!translations[lang]) lang = DEFAULT_LANG;
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}

    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;

    // Atualiza todos os elementos que possuem o atributo data-i18n
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (translations[lang] && translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    // Atualiza botões ativos de seleção de idioma
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    if (window.showToast) {
      const msgs = { pt: 'Idioma alterado para Português', en: 'Language set to English', es: 'Idioma cambiado a Español' };
      window.showToast(msgs[lang] || msgs.pt, '🌐');
    }
  }

  function initI18n() {
    let savedLang = DEFAULT_LANG;
    try {
      savedLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    } catch (_) {}

    // Event listeners para os seletores de idioma
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.lang-btn');
      if (btn) {
        const lang = btn.getAttribute('data-lang');
        if (lang) setLanguage(lang);
      }
    });

    // Aplica o idioma salvo na inicialização
    if (savedLang !== 'pt') {
      setLanguage(savedLang);
    }
  }

  window.IsarI18n = {
    setLanguage: setLanguage,
    init: initI18n,
    getLang: function () { return currentLang; },
    t: function (key) {
      return (translations[currentLang] && translations[currentLang][key]) || key;
    }
  };

})();
