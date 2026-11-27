/**
 * ============================================================
 * HOKAGE22B.COM — Module: Jornada Conversion Funnel Engine
 * ============================================================
 * Motor determinístico (Node + Browser) para o fluxo linear
 * de conversão: Qualificação -> A Vila + Passaporte (Hokage ID)
 * -> Login -> Pronto para Comprar ou Vender.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.HokageJornadaQuiz = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUESTIONS = [
    {
      id: 'intent',
      stepLabel: 'Passo 1 de 5',
      title: 'O que você quer fazer primeiro aqui?',
      subtitle: 'Escolha uma opção — levamos você direto ao ponto.',
      options: [
        {
          value: 'buy',
          icon: '🛒',
          label: 'Comprar ou explorar ofertas',
          desc: 'Encontrar produtos, serviços e pioneiros verificados na Vila.'
        },
        {
          value: 'sell',
          icon: '🏷️',
          label: 'Vender ou divulgar meu trabalho',
          desc: 'Publicar anúncios na Vila e montar meu catálogo profissional no Hokage ID.'
        },
        {
          value: 'both',
          icon: '⚡',
          label: 'Comprar e vender na comunidade',
          desc: 'Participar da economia completa com identidade verificada.'
        },
        {
          value: 'explore',
          icon: '🌱',
          label: 'Ainda estou conhecendo',
          desc: 'Quero entender rápido como funciona antes de negociar.'
        }
      ]
    },
    {
      id: 'experience',
      stepLabel: 'Passo 2 de 5',
      title: 'Você já usa a Pi Network?',
      subtitle: 'Assim ajustamos seu acesso da forma mais fácil para você.',
      options: [
        {
          value: 'pi_user',
          icon: '🟣',
          label: 'Sim, já tenho conta na Pi Network',
          desc: 'Quero usar meu @usuário Pi na prática além do clique diário.'
        },
        {
          value: 'web_user',
          icon: '🌐',
          label: 'Ainda não / Uso só internet comum',
          desc: 'Quero entrar rápido com Google ou E-mail sem complicação.'
        },
        {
          value: 'crypto_user',
          icon: '🪙',
          label: 'Já uso outras criptos ou Web3',
          desc: 'Quero conhecer a economia P2P da Vila e o Passaporte.'
        }
      ]
    }
  ];

  function buildEducationStep(answers) {
    const a = answers && typeof answers === 'object' ? answers : {};
    const intent = a.intent || 'explore';
    const experience = a.experience || 'web_user';

    let highlight = 'Em menos de 1 minuto você ativa seu acesso e entra pronto para negociar com pessoas reais.';
    if (intent === 'sell') {
      highlight = 'Para vender: seu Hokage ID funciona como catálogo confiável e publica suas ofertas direto na Vila.';
    } else if (intent === 'buy') {
      highlight = 'Para comprar: na Vila você encontra ofertas reais e confere pelo Hokage ID quem está por trás de cada anúncio.';
    } else if (intent === 'both') {
      highlight = 'Para comprar e vender: uma única conta conecta sua reputação no Hokage ID aos anúncios da Vila.';
    }

    if (experience === 'pi_user') {
      highlight += ' Como você já usa Pi, pode conectar direto pelo Pi Browser ou entrar agora pela Web e vincular depois.';
    } else if (experience === 'web_user') {
      highlight += ' Não precisa entender cripto nem instalar carteira agora: entre com Google ou E-mail em segundos.';
    }

    return {
      stepLabel: 'Passo 3 de 5',
      title: 'Como tudo funciona em 20 segundos',
      subtitle: 'Dois pilares simples conectam confiança e negócios reais:',
      pillars: [
        {
          icon: '🏘️',
          badge: 'Mercado Comunitário',
          title: 'A Vila (Classificados P2P)',
          desc: 'A praça de negócios da comunidade. Pessoas reais comprando e vendendo produtos, serviços e parcerias direto entre si — sem taxas abusivas.'
        },
        {
          icon: '🪪',
          badge: 'Identidade & Catálogo',
          title: 'Hokage ID (Passaporte)',
          desc: 'Sua identidade única e catálogo verificado. Ele liga seus anúncios ao seu perfil, mostra sua reputação e gera confiança imediata para fechar negócios.'
        }
      ],
      highlight: highlight,
      ctaLabel: 'Entendi! Ativar meu acesso →'
    };
  }

  function recommendPath(answers, user) {
    const a = answers && typeof answers === 'object' ? answers : {};
    const intent = a.intent || 'explore';
    const experience = a.experience || 'web_user';
    const u = user && typeof user === 'object' ? user : null;
    const rawSlug = u && u.username ? String(u.username).replace(/^@+/, '').trim() : '';
    const hasHandle = Boolean(rawSlug);
    const passportEditHref = hasHandle ? ('pioneiro?u=' + encodeURIComponent(rawSlug)) : 'pioneiro?criar=1';
    const passportViewHref = hasHandle ? ('pioneiro?u=' + encodeURIComponent(rawSlug)) : 'pioneiro';

    const intentNames = {
      buy: 'Comprar & Explorar',
      sell: 'Vender & Divulgar',
      both: 'Comprar & Vender',
      explore: 'Conhecendo a Vila'
    };
    const expNames = {
      pi_user: 'Usa Pi Network',
      web_user: 'Acesso Web',
      crypto_user: 'Experiência Web3'
    };

    const profileLabel = (intentNames[intent] || intent) + ' · ' + (expNames[experience] || experience);

    if (intent === 'sell') {
      return {
        profileLabel: profileLabel,
        headline: 'Tudo pronto para você vender e divulgar na Vila!',
        subheadline: hasHandle
          ? 'Seu Hokage ID já está ativo como @' + rawSlug + '. Agora publique sua primeira oferta ou ajuste seu catálogo.'
          : 'Entre na Vila para publicar anúncios ou configure seu Hokage ID e catálogo.',
        primary: {
          label: '🏷️ Abrir A Vila e Publicar Anúncio →',
          href: 'mural',
          style: 'amber'
        },
        secondary: {
          label: hasHandle ? '🪪 Editar meu Hokage ID (@' + rawSlug + ')' : '🪪 Configurar meu Hokage ID',
          href: passportEditHref
        },
        tertiary: {
          label: '📘 Ver guia rápido de como vender →',
          href: 'vender'
        }
      };
    }

    if (intent === 'buy') {
      return {
        profileLabel: profileLabel,
        headline: 'Tudo pronto para você explorar e comprar na Vila!',
        subheadline: 'Navegue pelos classificados P2P, filtre por categoria e fale direto com anunciantes verificados.',
        primary: {
          label: '🛒 Explorar e Comprar na Vila →',
          href: 'mural',
          style: 'amber'
        },
        secondary: {
          label: hasHandle ? '🪪 Ver meu Hokage ID (@' + rawSlug + ')' : '🪪 Ver meu Hokage ID',
          href: passportViewHref
        },
        tertiary: {
          label: '🌐 Explorar Pioneiros Verificados →',
          href: 'explorar'
        }
      };
    }

    if (intent === 'both') {
      return {
        profileLabel: profileLabel,
        headline: 'Acesso pronto para comprar e vender na comunidade!',
        subheadline: 'Use A Vila para descobrir negócios e anunciar suas ofertas com a confiança do seu Hokage ID.',
        primary: {
          label: '🛒 Entrar na Vila (Comprar & Anunciar) →',
          href: 'mural',
          style: 'amber'
        },
        secondary: {
          label: hasHandle ? '🪪 Abrir meu Hokage ID (@' + rawSlug + ')' : '🪪 Ativar Hokage ID e Catálogo',
          href: passportEditHref
        },
        tertiary: {
          label: '🏷️ Guia rápido para vender mais →',
          href: 'vender'
        }
      };
    }

    return {
      profileLabel: profileLabel,
      headline: 'Bem-vindo à comunidade! Escolha por onde começar:',
      subheadline: 'Você já entendeu como A Vila e o Hokage ID funcionam. Veja a praça de negócios ao vivo ou aprenda a base sem hype.',
      primary: {
        label: '🏘️ Conhecer A Vila agora →',
        href: 'mural',
        style: 'amber'
      },
      secondary: {
        label: '📘 Aprender do Zero (sem hype)',
        href: 'zero'
      },
      tertiary: {
        label: hasHandle ? '🪪 Ver meu Hokage ID (@' + rawSlug + ') →' : '🪪 Ver meu Hokage ID →',
        href: passportViewHref
      }
    };
  }

  return {
    QUESTIONS: QUESTIONS,
    buildEducationStep: buildEducationStep,
    recommendPath: recommendPath
  };
});
