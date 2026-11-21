// ============================================================
// HOKAGE22B — Official Telegram Ecosystem, Sales & Telemetry Bot
// Gratuito via Supabase Edge Functions (Deno) + Telegram Bot API
// ============================================================
import { getCorsHeaders, MURAL_CONFIG } from "../_shared/http.ts";
import { notifyAdmin } from "../_shared/notify.ts";

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    from?: { id?: number; first_name?: string; username?: string; language_code?: string };
    chat?: { id?: number | string; first_name?: string; username?: string };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number; first_name?: string; username?: string };
    message?: { chat?: { id?: number | string }; message_id?: number };
  };
}

interface BotPayload {
  text: string;
  reply_markup?: {
    inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  };
}

async function callTelegram(
  token: string,
  method: string,
  payload: Record<string, unknown>
): Promise<Response> {
  return await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildWelcomePayload(firstName?: string): BotPayload {
  const hello = firstName ? `Olá, ${escapeHtml(firstName)}!` : "Olá, Pioneiro(a)!";
  const text = [
    `🔥 <b>${hello} Bem-vindo(a) ao HOKAGE22B</b>`,
    "",
    "Seu guia oficial para entrar na <b>Web3 &amp; Economia Pi Network</b> sem complicação:",
    "• 🧭 <b>Jornada Guiada</b> — entenda em minutos por onde começar",
    "• 🪪 <b>Passaporte Web3</b> — sua identidade &amp; carteira P2P grátis",
    "• 🏘️ <b>A Vila (Central P2P)</b> — negócios, serviços e pioneiros reais",
    "• 📚 <b>E-books &amp; Ferramentas</b> — guias práticos e proteção anti-golpe",
  ].join("\n");

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Começar Minha Jornada", callback_data: "jornada" }],
        [
          { text: "🪪 Passaporte Grátis", callback_data: "passaporte" },
          { text: "🏘️ A Vila (P2P)", callback_data: "vila" },
        ],
        [
          { text: "🏷️ Como Vender em Pi", callback_data: "vender" },
          { text: "📚 E-books & Guias", callback_data: "ebooks" },
        ],
        [
          { text: "🛠️ Ferramentas Web3", callback_data: "ferramentas" },
          { text: "🛡️ Anti-Golpe & Ajuda", callback_data: "seguranca" },
        ],
      ],
    },
  };
}

function buildJornadaPayload(): BotPayload {
  return {
    text: [
      "🧭 <b>Jornada Web3 HOKAGE22B</b>",
      "",
      "Não sabe por onde começar na Web3 ou na Pi Network?",
      "Em menos de 2 minutos o diagnóstico interativo identifica seu perfil (iniciante, vendedor, criador ou dev) e monta seu próximo passo.",
      "",
      "📘 Se preferir ir do zero absoluto, acesse também o guia <b>Pi do Zero</b>.",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Abrir Diagnóstico da Jornada", url: "https://hokage22b.com/jornada?utm_source=telegram_bot" }],
        [{ text: "📘 Ler Pi do Zero", url: "https://hokage22b.com/zero?utm_source=telegram_bot" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildPassaportePayload(): BotPayload {
  return {
    text: [
      "🪪 <b>Passaporte do Pioneiro Web3 (100% Grátis)</b>",
      "",
      "Sua credencial oficial no ecossistema HOKAGE22B:",
      "• Receba pagamentos P2P direto na sua <b>Pi Wallet</b>",
      "• Reúna seus links, produtos, serviços e títulos verificados",
      "• Ganhe <b>1 Publicação Bônus na Vila</b> ao ativar por convite",
      "",
      "Veja o exemplo oficial de <b>@hokage22b</b> ou ative o seu agora:",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🪪 Criar Meu Passaporte Grátis", url: "https://hokage22b.com/pioneiro?utm_source=telegram_bot" }],
        [{ text: "👀 Ver Passaporte @hokage22b", url: "https://hokage22b.com/@hokage22b?utm_source=telegram_bot" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildVilaPayload(): BotPayload {
  return {
    text: [
      "🏘️ <b>A Vila · Central P2P da Comunidade</b>",
      "",
      "O mural independente onde pioneiros divulgam serviços, produtos que aceitam Pi, canais e projetos reais.",
      "",
      "• Explore negócios e criadores verificados",
      "• Publique sua oferta usando seu Passaporte",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏘️ Entrar na Vila (P2P)", url: "https://hokage22b.com/mural?utm_source=telegram_bot" }],
        [{ text: "🪪 Ativar Passaporte Primeiro", callback_data: "passaporte" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildVenderPayload(): BotPayload {
  return {
    text: [
      "🏷️ <b>Como Vender &amp; Aceitar Pi no Seu Negócio</b>",
      "",
      "A internet está convergindo para a Web3 — e quem estrutura presença P2P hoje sai na frente:",
      "• Como usar o <b>Passaporte</b> para receber em Pi sem intermediários",
      "• Como precificar e intermediar negócios com segurança",
      "• Boas práticas para lojistas, autônomos e prestadores de serviço",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🏷️ Ver Guia Como Vender", url: "https://hokage22b.com/vender?utm_source=telegram_bot" }],
        [{ text: "💼 E-book: Pi para seu Negócio", callback_data: "ebook_negocio" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildEbooksHubPayload(): BotPayload {
  return {
    text: [
      "📚 <b>Biblioteca Oficial HOKAGE22B</b>",
      "",
      "Escolha um material abaixo para ver detalhes e formas de pagamento (<b>Pi Network</b> ou <b>Pix/Cartão</b>):",
      "",
      "• 🤖 <b>IA na Prática</b> (293 pág. + 50 Prompts) — 7.50 π ou R$ 47,00",
      "• 💼 <b>Pi para seu Negócio</b> — 3.14 π ou R$ 19,90",
      "• 📘 <b>Manual Pi Network</b> — 100% Gratuito",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🤖 IA na Prática (293 pág.)", callback_data: "ebook_ia" }],
        [{ text: "💼 Pi para seu Negócio", callback_data: "ebook_negocio" }],
        [{ text: "📘 Baixar Manual Gratuito", url: "https://hokage22b.com/#manual" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildIaNaPraticaPayload(): BotPayload {
  const prod = MURAL_CONFIG.products["ia-na-pratica"];
  const text = [
    "🤖 <b>IA na Prática: O Seu Assistente Pessoal</b>",
    "",
    "📖 <b>293 páginas</b> práticas + <b>50 Prompts prontos</b> para trabalho, estudos, segurança digital e negócios.",
    "",
    `💎 <b>Pagando em Pi Network:</b> ${prod.price_pi.toFixed(2)} π (via Pi Browser)`,
    `💳 <b>Pagando em Reais (Cartão/Pix):</b> R$ ${prod.price_brl.toFixed(2).replace(".", ",")}`,
    "",
    "Escolha como prefere garantir o seu:",
  ].join("\n");

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡ Pagar com Pi (7.50 π) no Portal", url: "https://hokage22b.com/#produto-ia-na-pratica" }],
        [{ text: "💳 Pagar em R$ (Pix / Cartão - Hotmart)", url: "https://pay.hotmart.com/J108469065H" }],
        [{ text: "⬅️ Voltar aos E-books", callback_data: "ebooks" }],
      ],
    },
  };
}

function buildPiNegocioPayload(): BotPayload {
  const prod = MURAL_CONFIG.products["pi-para-seu-negocio"];
  const text = [
    "💼 <b>Pi para seu Negócio</b>",
    "",
    "O guia direto para lojistas, autônomos e empreendedores aceitarem Pi com segurança e conformidade.",
    "",
    `💎 <b>Pagando em Pi Network:</b> ${prod.price_pi.toFixed(2)} π`,
    `💳 <b>Pagando em Reais (Cartão/Pix):</b> R$ ${prod.price_brl.toFixed(2).replace(".", ",")}`,
  ].join("\n");

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "⚡ Pagar com Pi (3.14 π) no Portal", url: "https://hokage22b.com/#produtos" }],
        [{ text: "💳 Pagar em R$ (Pix / Cartão - Hotmart)", url: "https://pay.hotmart.com/A108356534I" }],
        [{ text: "⬅️ Voltar aos E-books", callback_data: "ebooks" }],
      ],
    },
  };
}

function buildFerramentasPayload(): BotPayload {
  return {
    text: [
      "🛠️ <b>Ferramentas Web3 &amp; Segurança Pi</b>",
      "",
      "Utilitários gratuitos para o dia a dia na rede:",
      "• Validador de Chave Pública Pi (<code>G...</code>)",
      "• Verificador de links anti-phishing",
      "• Calculadora de balcão P2P",
      "• Gerador de placa QR Code para o seu <b>Passaporte</b>",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛠️ Abrir Ferramentas Web3", url: "https://hokage22b.com/ferramentas?utm_source=telegram_bot" }],
        [{ text: "⚡ Construir (API & Devs)", url: "https://hokage22b.com/construir?utm_source=telegram_bot" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildSegurancaPayload(): BotPayload {
  return {
    text: [
      "🛡️ <b>Segurança Anti-Golpe &amp; Suporte</b>",
      "",
      "<b>Regras de ouro na Pi Network:</b>",
      "1️⃣ <b>NUNCA</b> digite suas 24 palavras (Passphrase) em nenhum site externo — ela só pertence à Pi Wallet oficial dentro do Pi Browser.",
      "2️⃣ O HOKAGE22B nunca pede sua senha nem promete multiplicação de moedas.",
      "3️⃣ Pagamentos oficiais em Pi são feitos exclusivamente pelo fluxo verificado no Pi Browser ou P2P direto com chave pública conferida.",
      "",
      "Precisa falar com o suporte ou comprou P2P? Acesse o portal:",
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛡️ Checar Link / Carteira", url: "https://hokage22b.com/ferramentas?utm_source=telegram_bot" }],
        [{ text: "🌐 Acessar Portal HOKAGE22B", url: "https://hokage22b.com/?utm_source=telegram_bot" }],
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function routeCallback(data: string, firstName?: string): BotPayload {
  switch (data) {
    case "jornada": return buildJornadaPayload();
    case "passaporte": return buildPassaportePayload();
    case "vila": return buildVilaPayload();
    case "vender": return buildVenderPayload();
    case "ebooks": return buildEbooksHubPayload();
    case "ebook_ia": return buildIaNaPraticaPayload();
    case "ebook_negocio": return buildPiNegocioPayload();
    case "ferramentas": return buildFerramentasPayload();
    case "seguranca": return buildSegurancaPayload();
    default: return buildWelcomePayload(firstName);
  }
}

function routeTextCommand(text: string, firstName?: string): BotPayload {
  const lower = text.toLowerCase();

  if (lower.startsWith("/start")) {
    const param = lower.replace(/^\/start\s*/, "").trim();
    if (param.includes("ia_na_pratica") || param === "ia") return buildIaNaPraticaPayload();
    if (param.includes("negocio")) return buildPiNegocioPayload();
    if (param.includes("ebook")) return buildEbooksHubPayload();
    if (param.includes("jornada")) return buildJornadaPayload();
    if (param.includes("passaporte") || param.includes("vitrine")) return buildPassaportePayload();
    if (param.includes("vila") || param.includes("mural")) return buildVilaPayload();
    if (param.includes("vender")) return buildVenderPayload();
    if (param.includes("ferramenta")) return buildFerramentasPayload();
    if (param.includes("seguranca") || param.includes("ajuda")) return buildSegurancaPayload();
    return buildWelcomePayload(firstName);
  }

  if (lower.startsWith("/jornada") || lower.includes("jornada") || lower.includes("comecar") || lower.includes("começar")) {
    return buildJornadaPayload();
  }
  if (lower.startsWith("/passaporte") || lower.startsWith("/vitrine") || lower.includes("passaporte") || lower.includes("vitrine")) {
    return buildPassaportePayload();
  }
  if (lower.startsWith("/vila") || lower.startsWith("/mural") || lower.includes("vila") || lower.includes("p2p") || lower.includes("anunciar")) {
    return buildVilaPayload();
  }
  if (lower.startsWith("/vender") || lower.includes("vender") || lower.includes("aceitar pi")) {
    return buildVenderPayload();
  }
  if (lower.includes("ia na pratica") || lower.includes("ia na prática")) {
    return buildIaNaPraticaPayload();
  }
  if (lower.startsWith("/negocio") || lower.includes("pi para seu negocio") || lower.includes("pi para seu negócio")) {
    return buildPiNegocioPayload();
  }
  if (lower.startsWith("/ebook") || lower.includes("ebook") || lower.includes("e-book") || lower.includes("livro") || lower.includes("hotmart") || lower.includes("pix") || lower.includes("comprar")) {
    return buildEbooksHubPayload();
  }
  if (lower.startsWith("/ferramentas") || lower.includes("ferramenta") || lower.includes("qr")) {
    return buildFerramentasPayload();
  }
  if (lower.startsWith("/ajuda") || lower.startsWith("/seguranca") || lower.includes("golpe") || lower.includes("kyc") || lower.includes("suporte") || lower.includes("passphrase") || lower.includes("ajuda")) {
    return buildSegurancaPayload();
  }

  return buildWelcomePayload(firstName);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, false);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("setup") === "1") {
      const botToken = (Deno.env.get("TELEGRAM_PUBLIC_BOT_TOKEN") || Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
      if (!botToken) {
        return new Response(JSON.stringify({ ok: false, error: "TELEGRAM_PUBLIC_BOT_TOKEN não encontrado nos Secrets." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const webhookUrl = "https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/telegram-bot";
      const secretToken = (Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "").trim();
      const body: Record<string, unknown> = { url: webhookUrl };
      if (secretToken) body.secret_token = secretToken;

      const tgRes = await callTelegram(botToken, "setWebhook", body);
      const tgData = await tgRes.json().catch(() => ({ ok: false }));

      const cmdRes = await callTelegram(botToken, "setMyCommands", {
        commands: [
          { command: "start", description: "Menu principal HOKAGE22B" },
          { command: "jornada", description: "Diagnóstico e trilha Web3" },
          { command: "passaporte", description: "Criar Passaporte Web3 grátis" },
          { command: "vila", description: "A Vila · Central P2P" },
          { command: "vender", description: "Como vender e aceitar Pi" },
          { command: "ebooks", description: "E-books e Manual gratuito" },
          { command: "ferramentas", description: "Ferramentas Web3 e Anti-Golpe" },
          { command: "ajuda", description: "Segurança KYC e suporte" },
        ],
      });
      const cmdData = await cmdRes.json().catch(() => ({ ok: false }));

      return new Response(
        JSON.stringify({ ok: Boolean(tgData.ok), telegram: tgData, commands: cmdData, webhookUrl }),
        {
          status: tgData.ok ? 200 : 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(JSON.stringify({ ok: true, service: "hokage22b-telegram-bot" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.json().catch(() => null) as (TelegramUpdate & {
    action?: string;
    event?: string;
    page?: string;
    detail?: string;
    ref?: string;
    sessionId?: string;
    device?: string;
    user?: string;
    trail?: string;
    source?: string;
    durationSec?: number;
  }) | null;

  // Telemetria profissional de visitas, trilha de navegação e cliques reais para o Telegram do admin
  if (rawBody && rawBody.action === "track_event") {
    const ua = (req.headers.get("user-agent") || "").toLowerCase();
    if (/bot|crawler|spider|headless|curl|wget|python-requests|lighthouse|pagespeed|uptime/i.test(ua)) {
      return new Response(JSON.stringify({ ok: true, skipped: "bot" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventName = String(rawBody.event || "interacao").trim().slice(0, 60);
    const pagePath = String(rawBody.page || "/").trim().slice(0, 120);
    const detail = String(rawBody.detail || "").trim().slice(0, 220);
    const ref = String(rawBody.ref || "").trim().slice(0, 40);
    const sessionId = String(rawBody.sessionId || "").trim().slice(0, 12);
    const device = String(rawBody.device || "").trim().slice(0, 24);
    const userHandle = String(rawBody.user || "").trim().slice(0, 32);
    const trail = String(rawBody.trail || "").trim().slice(0, 180);
    const source = String(rawBody.source || "").trim().slice(0, 80);
    const durationSec = Number(rawBody.durationSec || 0);
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "";

    const sessionMeta = [
      sessionId ? `#${sessionId}` : "",
      device || "",
      country || "",
      userHandle || "",
    ].filter(Boolean).join(" · ");

    const lines = [
      sessionMeta ? `Sessão: ${sessionMeta}` : "",
      `Página: ${pagePath}`,
      source ? `Origem: ${source}` : "",
      trail ? `Trilha: ${trail}` : "",
      durationSec > 1 ? `Tempo na etapa anterior: ${durationSec}s` : "",
      !trail && detail ? `Detalhe: ${detail}` : "",
      ref ? `Convite ativo: @${ref.replace(/^@+/, "")}` : "",
    ].filter(Boolean);

    await notifyAdmin({
      priority: "normal",
      tag: "ATIVIDADE",
      title: eventName,
      lines,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const botToken = (Deno.env.get("TELEGRAM_PUBLIC_BOT_TOKEN") || Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
  if (!botToken) {
    return new Response(JSON.stringify({ ok: false, error: "TELEGRAM_PUBLIC_BOT_TOKEN ou TELEGRAM_BOT_TOKEN não configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const expectedSecret = (Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "").trim();
  if (expectedSecret) {
    const gotSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (gotSecret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const update = rawBody;
  if (!update) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    if (cb.id) {
      await callTelegram(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
    }
    if (chatId) {
      const data = cb.data || "menu";
      const responsePayload = routeCallback(data, cb.from?.first_name);
      let edited = false;
      if (messageId) {
        const editRes = await callTelegram(botToken, "editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...responsePayload,
        });
        edited = editRes.ok;
      }
      if (!edited) {
        await callTelegram(botToken, "sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...responsePayload,
        });
      }
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = String(msg?.text || "").trim();
  if (!chatId || !text) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  const firstName = msg?.from?.first_name || msg?.chat?.first_name;
  const tgUsername = msg?.from?.username || msg?.chat?.username;
  if (text.toLowerCase().startsWith("/start")) {
    await notifyAdmin({
      priority: "normal",
      tag: "BOT TELEGRAM",
      title: "Novo /start no @hokage22b_oficial_bot",
      lines: [
        `Usuário: ${firstName || "Visitante"}${tgUsername ? " (@" + tgUsername + ")" : ""}`,
        `Comando: ${text.slice(0, 60)}`,
      ],
    });
  }

  const responsePayload = routeTextCommand(text, firstName);

  await callTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...responsePayload,
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
