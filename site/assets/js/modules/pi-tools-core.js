/**
 * ============================================================
 * HOKAGE22B.COM — Module: Pi Tools Core (AI-Ready & Headless)
 * ============================================================
 * Núcleo determinístico (Zero-DOM) para utilitários Web3/Pi.
 * Projetado para rodar tanto no navegador quanto em Node/Deno
 * (Supabase Edge Functions / Bots / Function Calling de I.A.).
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.HokagePiTools = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const BASE32_LOOKUP = (function () {
    const map = {};
    for (let i = 0; i < BASE32_ALPHABET.length; i++) {
      map[BASE32_ALPHABET[i]] = i;
    }
    return map;
  })();

  function decodeBase32(str) {
    let buffer = 0;
    let bitsLeft = 0;
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const val = BASE32_LOOKUP[str[i]];
      if (val === undefined) return null;
      buffer = (buffer << 5) | val;
      bitsLeft += 5;
      if (bitsLeft >= 8) {
        bytes.push((buffer >>> (bitsLeft - 8)) & 0xff);
        bitsLeft -= 8;
      }
    }
    return bytes;
  }

  function crc16XModem(bytes) {
    let crc = 0x0000;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= (bytes[i] & 0xff) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xffff;
      }
    }
    return crc;
  }

  function verifyStellarStyleChecksum(clean, expectedVersionByte) {
    if (!clean || clean.length !== 56) return false;
    const decoded = decodeBase32(clean);
    if (!decoded || decoded.length !== 35) return false;
    if (decoded[0] !== expectedVersionByte) return false;
    const payload = decoded.slice(0, 33);
    const expectedCrc = decoded[33] | (decoded[34] << 8);
    return crc16XModem(payload) === expectedCrc;
  }

  function normalizeHandle(raw) {
    const clean = String(raw || '').trim().replace(/^@+/, '').toLowerCase();
    return /^[a-z0-9_]{2,32}$/.test(clean) ? clean : '';
  }

  /**
   * Valida e diagnostica um texto/endereço colado pelo usuário.
   * Detecta também riscos críticos (seed S... ou passphrase de 12/24 palavras).
   * Nunca armazena nem transmite o input.
   */
  function inspectPiAddress(rawInput) {
    const raw = String(rawInput == null ? '' : rawInput).trim();
    if (!raw) {
      return {
        valid: false,
        riskLevel: 'EMPTY',
        reasonCode: 'EMPTY_INPUT',
        summary: 'Nenhum endereço informado.',
        normalized: '',
        length: 0,
        checks: { prefixG: false, length56: false, base32: false, crc16: false }
      };
    }

    // 1. Detector crítico de Passphrase (12 ou 24 palavras)
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 12 && words.length <= 24 && words.every(function (w) { return /^[a-z]{2,16}$/i.test(w); })) {
      return {
        valid: false,
        riskLevel: 'CRITICAL',
        reasonCode: 'PASSPHRASE_DETECTED',
        summary: 'PERIGO: Isso parece uma Passphrase (frase secreta)! Limpe o campo imediatamente e nunca cole suas 24 palavras em sites.',
        normalized: '',
        length: raw.length,
        wordCount: words.length,
        checks: { prefixG: false, length56: false, base32: false, crc16: false }
      };
    }

    const clean = raw.toUpperCase();

    // 2. Detector crítico de Chave Secreta Stellar/Pi (começa com S, version byte 18 << 3 = 144)
    if (clean.startsWith('S') && clean.length === 56 && /^[A-Z2-7]{56}$/.test(clean)) {
      const isSeedChecksum = verifyStellarStyleChecksum(clean, 18 << 3);
      return {
        valid: false,
        riskLevel: 'CRITICAL',
        reasonCode: 'SECRET_SEED_DETECTED',
        summary: isSeedChecksum
          ? 'PERIGO CRÍTICO: Isso é uma Chave Secreta (Secret Seed S...)! Nunca compartilhe nem envie para ninguém.'
          : 'ATENÇÃO: Chaves que começam com "S" são chaves privadas/secretas. Para receber Pi, use apenas sua Chave Pública ("G...").',
        normalized: '',
        length: clean.length,
        checks: { prefixG: false, length56: true, base32: true, crc16: false }
      };
    }

    const prefixG = clean.startsWith('G');
    const length56 = clean.length === 56;
    const base32 = /^[A-Z2-7]+$/.test(clean);
    const crc16 = prefixG && length56 && base32 && verifyStellarStyleChecksum(clean, 6 << 3);

    if (crc16) {
      return {
        valid: true,
        riskLevel: 'SAFE',
        reasonCode: 'VALID_PI_PUBLIC_KEY',
        summary: 'Chave Pública Pi Network válida (56 caracteres Base32 + checksum CRC16 Ed25519 verificado).',
        normalized: clean,
        length: 56,
        checks: { prefixG: true, length56: true, base32: true, crc16: true }
      };
    }

    let reasonCode = 'INVALID_CRC16';
    let summary = 'Checksum CRC16 inválido. Provavelmente alguma letra ou número foi digitado/copiado errado.';
    if (!prefixG) {
      reasonCode = 'INVALID_PREFIX';
      summary = 'Uma chave pública da Pi Wallet deve começar com a letra "G".';
    } else if (!length56) {
      reasonCode = 'INVALID_LENGTH';
      summary = 'A chave possui ' + clean.length + ' caracteres, mas deve ter exatamente 56.';
    } else if (!base32) {
      reasonCode = 'INVALID_BASE32';
      summary = 'Contém caracteres inválidos. Chaves Pi usam apenas letras A-Z e dígitos 2-7 (nunca 0, 1, 8 ou 9).';
    }

    return {
      valid: false,
      riskLevel: 'ERROR',
      reasonCode: reasonCode,
      summary: summary,
      normalized: clean,
      length: clean.length,
      checks: { prefixG: prefixG, length56: length56, base32: base32, crc16: false }
    };
  }

  /**
   * Analisa uma URL ou mensagem para verificar se é domínio oficial Pi/Hokage22b
   * ou se contém sinais comuns de phishing.
   */
  function inspectPiLinkOrText(rawInput) {
    const text = String(rawInput == null ? '' : rawInput).trim();
    if (!text) {
      return {
        safe: false,
        riskLevel: 'EMPTY',
        reasonCode: 'EMPTY_INPUT',
        summary: 'Cole um link ou mensagem para analisar.'
      };
    }

    const lower = text.toLowerCase();
    const asksPassphrase = /(passphrase|seed phrase|24\s*palavras|24\s*words|frase\s*secreta|unlock\s*wallet|verify\s*wallet)/i.test(lower);

    let hostname = '';
    let protocol = '';
    try {
      const urlCandidate = /^[a-z]+:\/\//i.test(text) ? text : ('https://' + text.split(/\s+/)[0]);
      const parsed = new URL(urlCandidate);
      hostname = parsed.hostname.toLowerCase();
      protocol = parsed.protocol.toLowerCase();
    } catch (_) {}

    const officialHosts = [
      'hokage22b.com',
      'www.hokage22b.com',
      'minepi.com',
      'wallet.pi',
      'sandbox.minepi.com',
      'pinetwork.com'
    ];

    const isOfficialHost = Boolean(hostname) && officialHosts.some(function (h) {
      return hostname === h || hostname.endsWith('.' + h);
    });

    if (asksPassphrase) {
      return {
        safe: false,
        riskLevel: 'CRITICAL',
        reasonCode: 'PHISHING_PASSPHRASE_MENTION',
        hostname: hostname,
        summary: 'ALERTA DE GOLPE: O texto menciona passphrase/24 palavras/desbloqueio de carteira. Nenhum app ou suporte legítimo da Pi pede sua passphrase fora do wallet.pi oficial.'
      };
    }

    if (isOfficialHost && (protocol === 'https:' || protocol === 'pi:')) {
      return {
        safe: true,
        riskLevel: 'SAFE',
        reasonCode: 'OFFICIAL_DOMAIN',
        hostname: hostname,
        summary: 'Domínio oficial verificado (' + hostname + '). Ainda assim, nunca digite sua passphrase fora do wallet.pi.'
      };
    }

    if (hostname && /(minepi|pinetwork|pi-network|piwallet|walletpi|airdrop|claim-pi)/i.test(hostname) && !isOfficialHost) {
      return {
        safe: false,
        riskLevel: 'CRITICAL',
        reasonCode: 'LOOKALIKE_PI_DOMAIN',
        hostname: hostname,
        summary: 'ALTO RISCO (Domínio Imitador): "' + hostname + '" usa termos da Pi Network mas NÃO é um domínio oficial. Nunca conecte ou digite sua passphrase.'
      };
    }

    return {
      safe: false,
      riskLevel: 'WARN',
      reasonCode: 'EXTERNAL_UNVERIFIED',
      hostname: hostname,
      summary: hostname
        ? 'Domínio externo (' + hostname + '). Verifique a procedência antes de interagir e jamais informe sua passphrase.'
        : 'Não foi possível identificar um domínio oficial Pi/HOKAGE22B neste texto.'
    };
  }

  /**
   * Monta os links oficiais, deep link Pi Browser e dados para QR Code da Vitrine.
   */
  function buildVitrineQrPayload(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const clean = normalizeHandle(opts.username);
    if (!clean) {
      return {
        ok: false,
        reasonCode: 'INVALID_USERNAME',
        summary: 'Informe um @usuario válido (2 a 32 caracteres: letras, números ou _).'
      };
    }

    const title = String(opts.title || 'Aceitamos Pi Network aqui!').trim().slice(0, 80);
    const note = String(opts.note || 'Escaneie para ver nosso Passaporte Web3 e pagar com Pi').trim().slice(0, 120);
    const shortUrl = 'https://hokage22b.com/@' + encodeURIComponent(clean);
    const piBrowserUrl = 'pi://hokage22b.com/@' + encodeURIComponent(clean);
    const qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=' + encodeURIComponent(shortUrl);

    return {
      ok: true,
      username: '@' + clean,
      title: title,
      note: note,
      shortUrl: shortUrl,
      piBrowserUrl: piBrowserUrl,
      qrImageUrl: qrImageUrl,
      shareText: title + ' — Acesse meu Passaporte Web3 na Pi Network: ' + shortUrl
    };
  }

  /**
   * Calculadora de Balcão determinística (BRL / USD <-> Pi).
   */
  function convertPiAmount(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const amount = Number(opts.amount);
    const fromCurrency = String(opts.fromCurrency || 'BRL').trim().toUpperCase();
    const piPriceBrl = Number(opts.piPriceBrl);
    const piPriceUsd = Number(opts.piPriceUsd);

    if (!Number.isFinite(amount) || amount < 0) {
      return { ok: false, reasonCode: 'INVALID_AMOUNT', summary: 'Informe um valor numérico maior ou igual a zero.' };
    }
    if (!Number.isFinite(piPriceBrl) || piPriceBrl <= 0 || !Number.isFinite(piPriceUsd) || piPriceUsd <= 0) {
      return { ok: false, reasonCode: 'INVALID_RATE', summary: 'Informe cotações válidas (> 0) para BRL e USD por 1 Pi.' };
    }

    let piAmount = 0;
    let brlAmount = 0;
    let usdAmount = 0;

    if (fromCurrency === 'PI') {
      piAmount = amount;
      brlAmount = amount * piPriceBrl;
      usdAmount = amount * piPriceUsd;
    } else if (fromCurrency === 'USD') {
      usdAmount = amount;
      piAmount = amount / piPriceUsd;
      brlAmount = piAmount * piPriceBrl;
    } else {
      brlAmount = amount;
      piAmount = amount / piPriceBrl;
      usdAmount = piAmount * piPriceUsd;
    }

    return {
      ok: true,
      fromCurrency: fromCurrency === 'PI' || fromCurrency === 'USD' ? fromCurrency : 'BRL',
      piAmount: Number(piAmount.toFixed(4)),
      brlAmount: Number(brlAmount.toFixed(2)),
      usdAmount: Number(usdAmount.toFixed(2)),
      rates: { piPriceBrl: piPriceBrl, piPriceUsd: piPriceUsd }
    };
  }

  /**
   * Contratos JSON Schema prontos para Function Calling (Gemini / OpenAI / MCP).
   */
  const TOOL_SCHEMAS = [
    {
      name: 'inspectPiAddress',
      description: 'Valida criptograficamente uma Chave Pública Pi Network (G..., 56 chars Base32 + CRC16) e detecta se o usuário colou por engano uma Secret Seed (S...) ou Passphrase.',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Texto ou chave pública informada pelo usuário.' }
        },
        required: ['address']
      }
    },
    {
      name: 'inspectPiLinkOrText',
      description: 'Analisa uma URL ou mensagem para identificar domínios oficiais Pi/HOKAGE22B ou sinais de phishing (domínios imitadores ou pedido de passphrase).',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'URL ou texto suspeito para análise.' }
        },
        required: ['input']
      }
    },
    {
      name: 'buildVitrineQrPayload',
      description: 'Gera link curto oficial (/@usuario), deep link pi:// e QR Code de balcão para uma Passaporte Web3 HOKAGE22B.',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Handle @usuario da Pi Network.' },
          title: { type: 'string', description: 'Título opcional para a placa/cartão.' },
          note: { type: 'string', description: 'Subtítulo opcional para a placa/cartão.' }
        },
        required: ['username']
      }
    },
    {
      name: 'convertPiAmount',
      description: 'Converte valores entre Real (BRL), Dólar (USD) e Pi usando a cotação informada para uso em balcão ou orçamento.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Valor a converter.' },
          fromCurrency: { type: 'string', enum: ['BRL', 'USD', 'PI'], description: 'Moeda de origem.' },
          piPriceBrl: { type: 'number', description: 'Valor de 1 Pi em BRL.' },
          piPriceUsd: { type: 'number', description: 'Valor de 1 Pi em USD.' }
        },
        required: ['amount', 'fromCurrency', 'piPriceBrl', 'piPriceUsd']
      }
    }
  ];

  function executeTool(toolName, args) {
    const input = args && typeof args === 'object' ? args : {};
    if (toolName === 'inspectPiAddress') return inspectPiAddress(input.address);
    if (toolName === 'inspectPiLinkOrText') return inspectPiLinkOrText(input.input);
    if (toolName === 'buildVitrineQrPayload') return buildVitrineQrPayload(input);
    if (toolName === 'convertPiAmount') return convertPiAmount(input);
    return { ok: false, reasonCode: 'UNKNOWN_TOOL', summary: 'Ferramenta desconhecida: ' + String(toolName) };
  }

  return {
    version: '1.1.0',
    normalizeHandle: normalizeHandle,
    inspectPiAddress: inspectPiAddress,
    inspectPiLinkOrText: inspectPiLinkOrText,
    buildVitrineQrPayload: buildVitrineQrPayload,
    convertPiAmount: convertPiAmount,
    TOOL_SCHEMAS: TOOL_SCHEMAS,
    executeTool: executeTool
  };
});
