/**
 * ============================================================
 * HOKAGE22B.COM — Module: Jornada Interactive Quiz Engine
 * ============================================================
 * Motor determinístico (Node + Browser) para diagnosticar o
 * momento do visitante em Web3/IA e recomendar a trilha ideal.
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
      id: 'role',
      stepLabel: 'Pergunta 1 de 3',
      title: 'Qual opção descreve melhor você hoje?',
      subtitle: 'Não precisa saber nada sobre cripto para começar.',
      options: [
        { value: 'curioso', icon: '🌱', label: 'Curioso / Explorando o futuro', desc: 'Quero entender para onde Web3 e IA estão indo.' },
        { value: 'estudante', icon: '🎓', label: 'Estudante / Aprendiz', desc: 'Quero aprender tecnologia, segurança digital e IA na prática.' },
        { value: 'empreendedor', icon: '🛍️', label: 'Empreendedor / Autônomo', desc: 'Quero divulgar produtos, serviços ou vender online.' },
        { value: 'dev', icon: '⚡', label: 'Desenvolvedor / Construtor', desc: 'Quero usar APIs, incorporar widgets ou integrar código.' }
      ]
    },
    {
      id: 'crypto',
      stepLabel: 'Pergunta 2 de 3',
      title: 'Qual sua familiaridade com Web3 e criptomoedas?',
      subtitle: 'Isso ajusta a profundidade da nossa recomendação.',
      options: [
        { value: 'zero', icon: '🆕', label: 'Estou começando do zero', desc: 'Nunca usei carteiras digitais ou cripto.' },
        { value: 'crypto_other', icon: '🪙', label: 'Já conheço ou uso cripto', desc: 'Já entendo o básico de blockchain e carteiras.' },
        { value: 'pi_user', icon: '🟣', label: 'Já tenho conta na Pi Network', desc: 'Quero ir além do clique diário e usar na prática.' }
      ]
    },
    {
      id: 'goal',
      stepLabel: 'Pergunta 3 de 3',
      title: 'O que você quer resolver primeiro?',
      subtitle: 'Vamos montar seu próximo passo ideal em 1 clique.',
      options: [
        { value: 'learn', icon: '📘', label: 'Aprender com segurança (sem hype)', desc: 'Entender como funciona e evitar golpes comuns.' },
        { value: 'ai', icon: '🤖', label: 'Usar IA no trabalho ou estudos', desc: 'Transformar IA em assistente pessoal produtivo.' },
        { value: 'business', icon: '🪪', label: 'Criar presença digital ou negociar', desc: 'Montar meu Passaporte Web3 ou explorar A Vila P2P.' },
        { value: 'build', icon: '🔧', label: 'Integrar código, APIs e ferramentas', desc: 'Construir apps, bots e soluções sobre infraestrutura aberta.' }
      ]
    }
  ];

  function recommendPath(answers) {
    const a = answers && typeof answers === 'object' ? answers : {};
    const role = a.role || 'curioso';
    const crypto = a.crypto || 'zero';
    const goal = a.goal || 'learn';

    const roleNames = {
      curioso: 'Curioso',
      estudante: 'Estudante',
      empreendedor: 'Empreendedor',
      dev: 'Desenvolvedor'
    };
    const cryptoNames = {
      zero: 'Iniciante Web3',
      crypto_other: 'Usa Cripto',
      pi_user: 'Já tem Pi'
    };
    const goalNames = {
      learn: 'Aprender com Segurança',
      ai: 'IA na Prática',
      business: 'Negócios & Passaporte',
      build: 'Código & APIs'
    };

    const profileLabel = (roleNames[role] || role) + ' · ' + (cryptoNames[crypto] || crypto) + ' · ' + (goalNames[goal] || goal);

    const futureInsight = [
      'Identidade verificada: menos bots e mais confiança entre humanos reais na internet.',
      'Economia direta (Web3): pagamentos e trocas sem depender de intermediários caros.',
      'IA como alavanca: quem aprende a usar ferramentas abertas hoje sai na frente.'
    ];

    // 1. Trilha Desenvolvedor / Construir
    if (goal === 'build' || role === 'dev') {
      return {
        profileLabel: profileLabel,
        futureInsight: futureInsight,
        primary: {
          badge: 'Recomendado para Construtores',
          title: '⚡ Área Construir: API Aberta, Embed & Starter Kit',
          desc: 'Consuma Passaportes verificados, feed P2P da Vila, validador CRC16 e suba seu dApp em 10 minutos sem pagar servidor.',
          href: 'construir',
          cta: 'Ir para Construir (Devs) →'
        },
        secondary: crypto === 'zero'
          ? { title: '📘 Entender a base em Pi do Zero', href: 'zero', cta: 'Ver Passo Zero →' }
          : { title: '🛠️ Ferramentas Web3 (Validador & QR)', href: 'ferramentas', cta: 'Abrir Ferramentas →' }
      };
    }

    // 2. Trilha IA na Prática
    if (goal === 'ai') {
      return {
        profileLabel: profileLabel,
        futureInsight: futureInsight,
        primary: {
          badge: 'Recomendado para Produtividade',
          title: '🤖 IA na Prática: O Seu Assistente Pessoal',
          desc: 'Guia prático com 293 páginas e 50 prompts prontos para aplicar IA no trabalho, estudos, segurança e negócios.',
          href: 'index.html#produto-ia-na-pratica',
          cta: 'Conhecer IA na Prática →'
        },
        secondary: crypto === 'pi_user'
          ? { title: '🚀 Passo 1: Além do Clique (Pi Browser)', href: 'um', cta: 'Ir para Passo 1 →' }
          : { title: '📘 Fundamentos Web3 em Pi do Zero', href: 'zero', cta: 'Ver Passo Zero →' }
      };
    }

    // 3. Trilha Empreendedor / Negócios / Passaporte
    if (goal === 'business' || role === 'empreendedor') {
      if (crypto === 'pi_user') {
        return {
          profileLabel: profileLabel,
          futureInsight: futureInsight,
          primary: {
            badge: 'Recomendado para Vender & Divulgar',
            title: '🏷️ Tutorial: Como Vender & Anunciar no Passaporte',
            desc: 'Monte sua página profissional aceitando Pi, gere placa QR de balcão e publique na Vila em 1 minuto via Chatbot.',
            href: 'vender',
            cta: 'Ver Tutorial de Venda →'
          },
          secondary: { title: '🏘️ Explorar ofertas na Vila (P2P)', href: 'mural', cta: 'Entrar na Vila →' }
        };
      }
      if (crypto === 'crypto_other') {
        return {
          profileLabel: profileLabel,
          futureInsight: futureInsight,
          primary: {
            badge: 'Recomendado para Quem Já Usa Cripto',
            title: '🚀 Passo 1: Pi Browser & Passaporte Web3',
            desc: 'Veja como funciona a camada de identidade verificada da Pi e ative seu Passaporte para negócios.',
            href: 'um',
            cta: 'Ir para Passo 1 →'
          },
          secondary: { title: '🏷️ Tutorial: Como Vender no Passaporte', href: 'vender', cta: 'Ver Tutorial →' }
        };
      }
      return {
        profileLabel: profileLabel,
        futureInsight: futureInsight,
        primary: {
          badge: 'Melhor Começo Sem Risco',
          title: '📘 Passo Zero: Entenda Web3 & Autocustódia',
          desc: 'Antes de vender ou receber em cripto, domine em minutos como funciona uma carteira pública e como evitar golpes.',
          href: 'zero',
          cta: 'Começar pelo Passo Zero →'
        },
        secondary: { title: '🏷️ Ver como funciona vender no Passaporte', href: 'vender', cta: 'Ver Tutorial →' }
      };
    }

    // 4. Trilha Aprendizado / Curioso / Estudante
    if (crypto === 'pi_user') {
      return {
        profileLabel: profileLabel,
        futureInsight: futureInsight,
        primary: {
          badge: 'Próximo Nível para Pioneiros',
          title: '🚀 Passo 1: Além do Clique Diário',
          desc: 'Saia da espera passiva: domine o Pi Browser, segurança avançada e ative seu Passaporte Web3.',
          href: 'um',
          cta: 'Ir para Passo 1 →'
        },
        secondary: { title: '🔥 Conhecer o Monte Hokage (Mérito)', href: 'monte', cta: 'Ver Monte Hokage →' }
      };
    }

    return {
      profileLabel: profileLabel,
      futureInsight: futureInsight,
      primary: {
        badge: 'Ponto de Partida Ideal',
        title: '📘 Passo Zero: Web3 & Pi Network sem Hype',
        desc: 'Aprenda do zero o que é blockchain, como funciona a economia digital e como proteger seus ativos sem promessas mágicas.',
        href: 'zero',
        cta: 'Começar pelo Passo Zero →'
      },
      secondary: { title: '🛠️ Testar Ferramentas Anti-Golpe & Calculadora', href: 'ferramentas', cta: 'Abrir Ferramentas →' }
    };
  }

  return {
    QUESTIONS: QUESTIONS,
    recommendPath: recommendPath
  };
});
