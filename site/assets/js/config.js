/**
 * ============================================================
 * HOKAGE22B.COM — Configuração Centralizada do Portal (v2.0)
 * ============================================================
 * Administra todos os dados comerciais, links sociais, produtos,
 * metadados e parâmetros da plataforma de forma unificada.
 */

(function () {
  'use strict';

  window.HOKAGE_CONFIG = {
    piNetwork: {
      // Flag centralizado de ambiente da Pi Network:
      // true  = Pi Testnet / Sandbox (Auditoria Oficial no develop.pi)
      // false = Pi Open Mainnet (Produção Comercial)
      sandbox: true,
      version: '2.0'
    },

    brand: {
      name: 'HOKAGE22B',
      founder: 'Isar Loiola',
      domain: 'https://hokage22b.com',
      canonicalUrl: 'https://hokage22b.com/',
      slogan: 'O futuro não se espera. Constrói-se.',
      complementaryMessage: 'Um espaço independente para explorar tecnologia, compartilhar conhecimento e descobrir novas possibilidades na economia digital.',
      contactEmail: 'contato@hokage22b.com',
      commercialEmail: 'contato@hokage22b.com',
      piReferralCode: 'hokage22b',
      piWalletAddress: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
    },

    social: {
      youtube: 'https://www.youtube.com/@justhokage22b',
      instagram: 'https://instagram.com/hokage22b',
      twitter: 'https://twitter.com/hokage22b',
      communityWhatsapp: 'https://chat.whatsapp.com/JR6vrB10rCfGYCg3E3BRrE?s=cl&p=a&iam=2'
    },

    manual: {
      title: 'Manual Pi Network',
      subtitle: 'Do primeiro clique ao uso consciente: Pi, dinheiro, tecnologia e Brasil',
      edition: 'Edição 1.0 (Revisão Trimestral)',
      lastUpdated: 'Outubro de 2026',
      pdfPath: 'downloads/Manual-Pi-Network.pdf',
      epubPath: 'downloads/Manual-Pi-Network.epub',
      isFree: true,
      pages: '23 Capítulos'
    },

    featuredProduct: {
      id: 'pi-para-seu-negocio',
      title: 'Pi para seu negócio',
      badge: 'Guia Prático Comercial Web3',
      headline: 'Como empreendedores podem compreender e explorar as possibilidades comerciais do ecossistema Pi.',
      description: 'Um guia direto e sem rodeios para lojistas, prestadores de serviços e empreendedores digitais avaliarem aceitação de pagamentos, precificação, aspectos legais no Brasil e estratégias seguras de expansão comercial com a Pi Network.',
      pricePi: '3.14 π',
      isExclusivePi: true,
      coverImage: 'assets/img/ebook-pago-negocios.jpg',
      benefits: [
        'Modelos práticos de precificação e liquidação peer-to-peer',
        'Checklist contábil e fiscal de conformidade no Brasil',
        'Modelos de aviso ao consumidor e política de devolução',
        'Como configurar recebimentos diretos e gerenciar carteira com segurança',
        'Diretrizes contra golpes e fraudes comerciais'
      ]
    },

    futureProducts: [
      {
        title: 'Manual Avançado Pi Network',
        badge: 'Em breve',
        description: 'Arquitetura técnica detalhada, operação de nós da rede, contratos inteligentes e ecossistema dApps.'
      },
      {
        title: 'Kit Pi Business',
        badge: 'Em breve',
        description: 'Planilhas prontas de precificação dinâmica, checklists tributários e materiais para balcão de loja.'
      },
      {
        title: 'Templates Comerciais',
        badge: 'Em breve',
        description: 'Identidade visual, banners de redes sociais e placas informativas para estabelecimentos que aceitam Pi.'
      },
      {
        title: 'Materiais Educativos',
        badge: 'Em breve',
        description: 'Trilhas em vídeo e resumos executivos sobre Web3, inteligência artificial e economia descentralizada.'
      }
    ],

    categories: [
      {
        id: 'negocios-pi',
        name: 'Negócios com Pi',
        description: 'Estratégias, modelos de transação e oportunidades comerciais para empreendedores e comerciantes.',
        icon: 'briefcase'
      },
      {
        id: 'ferramentas-apps',
        name: 'Aplicações e Ferramentas',
        description: 'dApps, utilitários de blockchain, calculadoras e rastreadores da rede Pi e Web3.',
        icon: 'tool'
      },
      {
        id: 'conexoes-comunidade',
        name: 'Conexões e Comunidade',
        description: 'Espaço de networking entre pioneiros, grupos regionais e troca de experiências reais.',
        icon: 'users'
      },
      {
        id: 'ideias-inovacao',
        name: 'Ideias e Inovação',
        description: 'Artigos e reflexões sobre inteligência artificial, descentralização e o futuro do trabalho digital.',
        icon: 'sparkles'
      }
    ],

    editorialDisclaimer: 'HOKAGE22B é uma marca pessoal e projeto de conteúdo independente. Não possui vínculo comercial, societário ou de representação oficial com a Pi Core Team, SocialChain Inc. ou qualquer corretora de criptoativos.'
  };

  // Congela o objeto para prevenir modificações acidentais em runtime
  if (Object.freeze) {
    Object.freeze(window.HOKAGE_CONFIG);
  }
})();

