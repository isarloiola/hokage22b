// ============================================================
// HOKAGE22B — Official Telegram Sales & Community Bot Webhook
// Gratuito via Supabase Edge Functions (Deno) + Telegram Bot API
// ============================================================
import { MURAL_CONFIG } from "../_shared/http.ts";

interface TelegramUpdate {
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number | string; first_name?: string; username?: string };
  };
  callback_query?: {
    id?: string;
    data?: string;
    message?: { chat?: { id?: number | string }; message_id?: number };
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

function buildWelcomePayload(firstName?: string) {
  const hello = firstName ? `Olá, ${firstName}!` : "Olá, Pioneiro(a)!";
  const text = [
    `🤖 <b>${hello} Bem-vindo(a) ao Bot Oficial HOKAGE22B</b>`,
    "",
    "Escolha abaixo o que você precisa agora:",
    "• <b>IA na Prática</b> (293 pág. + 50 Prompts) — 7.50 π ou R$ 47,00",
    "• <b>Pi para seu Negócio</b> — 3.14 π ou R$ 19,90",
    "• <b>Manual Pi Network</b> — 100% Gratuito",
    "• <b>Ferramentas Anti-Golpe & QR Code</b>",
  ].join("\n");

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🤖 E-book: IA na Prática (293 pág.)", callback_data: "ebook_ia" }],
        [{ text: "💼 E-book: Pi para seu Negócio", callback_data: "ebook_negocio" }],
        [
          { text: "📘 Manual Pi Grátis", url: "https://hokage22b.com/#manual" },
          { text: "🛠️ Ferramentas", url: "https://hokage22b.com/ferramentas" },
        ],
        [{ text: "👤 Abrir Vitrine @hokage22b", url: "https://hokage22b.com/@hokage22b" }],
      ],
    },
  };
}

function buildIaNaPraticaPayload() {
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
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

function buildPiNegocioPayload() {
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
        [{ text: "⬅️ Voltar ao Menu", callback_data: "menu" }],
      ],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "hokage22b-telegram-bot" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const botToken = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
  if (!botToken) {
    return new Response(JSON.stringify({ ok: false, error: "TELEGRAM_BOT_TOKEN não configurado" }), {
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

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    if (cb.id) {
      await callTelegram(botToken, "answerCallbackQuery", { callback_query_id: cb.id });
    }
    if (chatId) {
      const data = cb.data || "menu";
      const responsePayload =
        data === "ebook_ia"
          ? buildIaNaPraticaPayload()
          : data === "ebook_negocio"
            ? buildPiNegocioPayload()
            : buildWelcomePayload();
      await callTelegram(botToken, "sendMessage", {
        chat_id: chatId,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...responsePayload,
      });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = String(msg?.text || "").trim();
  if (!chatId || !text) {
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }

  const lower = text.toLowerCase();
  let responsePayload;

  if (lower.startsWith("/start ia_na_pratica") || lower === "/ebook" || lower.includes("ia na pratica") || lower.includes("ia na prática")) {
    responsePayload = buildIaNaPraticaPayload();
  } else if (lower.startsWith("/negocio") || lower.includes("pi para seu negocio")) {
    responsePayload = buildPiNegocioPayload();
  } else if (lower.startsWith("/ferramentas")) {
    responsePayload = {
      text: "🛠️ <b>Ferramentas Web3 & Segurança Pi</b>\n\nValide chaves públicas (G...), cheque links anti-golpe, use a calculadora de balcão e gere QR Codes da sua Vitrine:\n👉 https://hokage22b.com/ferramentas",
      reply_markup: { inline_keyboard: [[{ text: "🛠️ Abrir Ferramentas", url: "https://hokage22b.com/ferramentas" }]] },
    };
  } else if (lower.startsWith("/vitrine")) {
    responsePayload = {
      text: "👤 <b>Vitrine Oficial @hokage22b</b>\n\nAcesse produtos, links oficiais e crie sua própria Vitrine Web3 Grátis:\n👉 https://hokage22b.com/@hokage22b",
      reply_markup: { inline_keyboard: [[{ text: "👤 Abrir Vitrine", url: "https://hokage22b.com/@hokage22b" }]] },
    };
  } else {
    responsePayload = buildWelcomePayload(msg?.chat?.first_name);
  }

  await callTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...responsePayload,
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
