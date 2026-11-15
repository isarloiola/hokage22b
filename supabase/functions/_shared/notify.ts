// ============================================================
// HOKAGE22B — Shared Admin Notification Helper
// Suporta Telegram Bot API (instantâneo) e Resend Email API (opcional)
// Execução não-bloqueante: nunca interrompe o fluxo do usuário.
// ============================================================

export interface AdminNotificationPayload {
  priority?: "high" | "normal";
  tag: string;
  title: string;
  lines: string[];
  linkUrl?: string;
  linkLabel?: string;
}

function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtmlTags(raw: string): string {
  return raw.replace(/<[^>]*>/g, "");
}

export async function notifyAdmin(
  payload: AdminNotificationPayload
): Promise<{ telegram: boolean; email: boolean }> {
  const result = { telegram: false, email: false };
  const prefix = payload.priority === "high" ? "🔴" : "🔔";
  const safeTag = escapeHtml(payload.tag);
  const safeTitle = escapeHtml(payload.title);

  // 1. Telegram Bot API (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
  const tgToken = (Deno.env.get("TELEGRAM_BOT_TOKEN") || "").trim();
  const tgChatId = (Deno.env.get("TELEGRAM_CHAT_ID") || "").trim();

  if (tgToken && tgChatId) {
    try {
      const bodyLines = payload.lines
        .filter((l) => Boolean(l && String(l).trim()))
        .map((l) => escapeHtml(l));

      let text = `${prefix} <b>[${safeTag}] ${safeTitle}</b>\n`;
      if (bodyLines.length > 0) {
        text += `\n${bodyLines.join("\n")}`;
      }
      if (payload.linkUrl) {
        const label = escapeHtml(payload.linkLabel || "Abrir no Painel");
        text += `\n\n🔗 <a href="${escapeHtml(payload.linkUrl)}">${label}</a>`;
      }

      const tgRes = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(tgToken)}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(4500),
        }
      );
      result.telegram = tgRes.ok;
      if (!tgRes.ok) {
        const errBody = await tgRes.text().catch(() => "");
        console.warn("[Notify Telegram] Falha HTTP:", tgRes.status, errBody);
      }
    } catch (err) {
      console.warn("[Notify Telegram] Erro:", err);
    }
  }

  // 2. Resend Email API (opcional: RESEND_API_KEY + ADMIN_NOTIFY_EMAIL)
  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  const adminEmail = (Deno.env.get("ADMIN_NOTIFY_EMAIL") || "").trim();

  if (resendKey && adminEmail) {
    try {
      const fromEmail =
        (Deno.env.get("RESEND_FROM_EMAIL") || "").trim() ||
        "HOKAGE22B Alertas <onboarding@resend.dev>";
      const subject = `${prefix} [${stripHtmlTags(payload.tag)}] ${stripHtmlTags(payload.title)}`;
      const htmlLines = payload.lines
        .filter((l) => Boolean(l && String(l).trim()))
        .map((l) => `<p style="margin:6px 0;color:#e5e7eb;font-size:14px">${escapeHtml(l)}</p>`)
        .join("");

      const linkHtml = payload.linkUrl
        ? `<p style="margin-top:16px"><a href="${escapeHtml(payload.linkUrl)}" style="background:#f59e0b;color:#000;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">${escapeHtml(payload.linkLabel || "Abrir Painel")}</a></p>`
        : "";

      const mailHtml = `
        <div style="background:#09090b;color:#fff;padding:24px;font-family:system-ui,-apple-system,sans-serif;border-radius:12px">
          <div style="font-size:12px;color:#fbbf24;font-weight:700;text-transform:uppercase">${safeTag}</div>
          <h2 style="margin:6px 0 14px;color:#fff">${safeTitle}</h2>
          ${htmlLines}
          ${linkHtml}
        </div>
      `;

      const mailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [adminEmail],
          subject,
          html: mailHtml,
        }),
        signal: AbortSignal.timeout(4500),
      });
      result.email = mailRes.ok;
    } catch (err) {
      console.warn("[Notify Email] Erro:", err);
    }
  }

  return result;
}
