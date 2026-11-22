// ============================================================
// HOKAGE22B — Supabase Edge Function: Mural Action Server
// Zero-Trust Server-Side Handler para Anúncios, Edição 24h,
// Renovações, Comentários (com Rate Limit) e Denúncias
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  HttpPayloadError,
  jsonError as sharedJsonError,
  jsonOk as sharedJsonOk,
  jsonResponse as sharedJsonResponse,
  MURAL_CONFIG,
  parseJsonBody,
} from "../_shared/http.ts";
import { normalizeHandle, verifyPiAccessToken } from "../_shared/pi-auth.ts";
import { notifyAdmin } from "../_shared/notify.ts";

const MAX_BODY_BYTES = 800 * 1024; // 800 KB para suportar fotos Base64 de produtos/anúncios
const TIER_PRICES: Record<string, number> = {
  ouro: MURAL_CONFIG.plans.ouro.price_pi,
  prata: MURAL_CONFIG.plans.prata.price_pi,
  bronze: MURAL_CONFIG.plans.bronze.price_pi,
};

const AD_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const COMMENT_COOLDOWN_MS = 15 * 1000;
const AUTO_MODERATION_REPORT_THRESHOLD = 5;
const SAFE_PAYMENT_ID_RE = /^[A-Za-z0-9_.:-]{4,128}$/;

function validateHttpUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    throw new Error("URL inválida. Utilize http:// ou https:// sem caracteres inválidos.");
  }
  return trimmed.slice(0, 500);
}

function validateAdImageUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 350000 ? trimmed : null;
  }
  if (/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    return trimmed.slice(0, 500);
  }
  return null;
}

function decodeValidatedImageDataUrl(raw: unknown): { bytes: Uint8Array; ext: string; mime: string } {
  if (!raw || typeof raw !== "string") {
    throw new Error("Imagem Base64 inválida.");
  }
  const trimmed = raw.trim();
  const match = trimmed.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match || trimmed.length > 700000) {
    throw new Error("Formato de imagem não permitido. Use JPEG, PNG ou WebP (máx. 450KB).");
  }
  const binaryStr = atob(match[2]);
  if (binaryStr.length < 16 || binaryStr.length > 460 * 1024) {
    throw new Error("Tamanho da imagem fora do limite permitido (máx. 450KB).");
  }
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  // Validação de magic bytes reais
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (isJpeg) return { bytes, ext: "jpg", mime: "image/jpeg" };
  if (isPng) return { bytes, ext: "png", mime: "image/png" };
  if (isWebp) return { bytes, ext: "webp", mime: "image/webp" };
  throw new Error("Assinatura binária da imagem inválida.");
}

async function verifyPiPayment(paymentId: string, expectedMinAmount: number, expectedUid: string) {
  const PI_SERVER_API_KEY = Deno.env.get("PI_SERVER_API_KEY") || Deno.env.get("PI_API_KEY");
  if (!PI_SERVER_API_KEY) {
    throw new Error("PI_SERVER_API_KEY não configurada no servidor.");
  }

  const res = await fetch(`https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: { Authorization: `Key ${PI_SERVER_API_KEY}` },
  });
  if (!res.ok) {
    throw new Error("Não foi possível validar o pagamento na API da Pi Network.");
  }

  const payment = await res.json();
  if (String(payment.user_uid || "") !== expectedUid) {
    throw new Error("O pagamento informado pertence a outro usuário Pi.");
  }
  if (Deno.env.get("PI_REJECT_TESTNET") === "true" && payment.network && payment.network !== "Pi Network") {
    throw new Error("Pagamentos Testnet não são aceitos em produção.");
  }
  if (!payment.status?.developer_completed || !payment.status?.transaction_verified) {
    throw new Error("Pagamento ainda não concluído ou não verificado na blockchain Pi.");
  }
  if (Number(payment.amount || 0) + 1e-6 < expectedMinAmount) {
    throw new Error("Valor do pagamento inferior ao plano selecionado.");
  }

  const txid = String(payment.transaction?.txid || "").trim();
  if (!txid) {
    throw new Error("TXID do pagamento não encontrado na Pi Network.");
  }

  return { txid, amount: Number(payment.amount) };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);
  const jsonResponse = (body: unknown, status = 200) => sharedJsonResponse(body, corsHeaders, status);
  const jsonOk = (code: string, data: Record<string, unknown> = {}, status = 200) =>
    sharedJsonOk(code, data, corsHeaders, status);
  const jsonError = (code: string, message: string, status = 400) =>
    sharedJsonError(code, message, corsHeaders, status);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Método não permitido.", 405);
  }

  try {
    const body = await parseJsonBody(req, MAX_BODY_BYTES);
    const { action, accessToken, payload } = body || {};

    if (!action || typeof action !== "string") {
      return jsonError("INVALID_ACTION", "Ação inválida.", 400);
    }

    // Endpoint público Agent-Ready para descoberta de planos, preços e enums
    if (action === "get_config") {
      return jsonOk("MURAL_CONFIG", { config: MURAL_CONFIG });
    }

    if (!accessToken || typeof accessToken !== "string") {
      return jsonError("MISSING_ACCESS_TOKEN", "Autenticação Pi Browser obrigatória (accessToken ausente).", 401);
    }

    const piUser = await verifyPiAccessToken(accessToken);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. CRIAR ANÚNCIO PAGO ──────────────────────────────────
    if (action === "create_ad") {
      const tier = (payload?.plan_tier === "ouro" || payload?.plan_tier === "prata") ? payload.plan_tier : "bronze";
      const expectedPrice = TIER_PRICES[tier];
      const paymentId = String(payload?.paymentId || "").trim();
      if (!paymentId) {
        return jsonResponse({ error: "paymentId da Pi Wallet é obrigatório." }, 400);
      }

      const verifiedPay = await verifyPiPayment(paymentId, expectedPrice, piUser.uid);

      // Proteção contra replay attack (mesmo TXID usado em mais de um anúncio)
      const { data: existingTx } = await supabase
        .from("anuncios")
        .select("id")
        .eq("payment_txid", verifiedPay.txid)
        .limit(1);
      if (existingTx && existingTx.length > 0) {
        return jsonResponse({ error: "Este pagamento (TXID) já foi utilizado em outro anúncio." }, 409);
      }

      const title = String(payload?.title || "").trim();
      const description = String(payload?.description || "").trim();
      if (title.length < 2 || title.length > 80) {
        return jsonResponse({ error: "O título deve ter entre 2 e 80 caracteres." }, 400);
      }
      if (description.length < 5 || description.length > 300) {
        return jsonResponse({ error: "A descrição deve ter entre 5 e 300 caracteres." }, 400);
      }

      const linkUrl = tier === "bronze" ? null : validateHttpUrl(payload?.link_url);
      const imageUrl = tier === "bronze" ? null : validateAdImageUrl(payload?.image_url);
      const category = String(payload?.category || "geral").trim().slice(0, 32);
      const location = String(payload?.location || "Online / Global").trim().slice(0, 60) || "Online / Global";
      const rawCountry = String(payload?.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
      const countryCode = rawCountry || "GLOBAL";
      const rawPayMode = String(payload?.payment_modes || "pi").trim().toLowerCase();
      const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";
      // Todos os anúncios são permanentes (validade perpétua até 2099 para compatibilidade com triggers/RLS)
      const expiresAt = "2099-12-31T23:59:59.000Z";

      const insertRow = {
        title,
        description,
        link_url: linkUrl,
        image_url: imageUrl,
        category,
        location,
        country_code: countryCode,
        payment_modes: paymentModes,
        pioneer_username: piUser.username,
        pioneer_name: piUser.username.replace(/^@+/, ""),
        plan_tier: tier,
        price_pi: expectedPrice,
        status: "ativo",
        payment_txid: verifiedPay.txid,
        expires_at: expiresAt,
      };

      const { data, error } = await supabase
        .from("anuncios")
        .insert([insertRow])
        .select()
        .single();

      if (error) throw error;
      await notifyAdmin({
        priority: "normal",
        tag: "ANÚNCIO MURAL",
        title: `Novo Anúncio ${tier.toUpperCase()} (${piUser.username})`,
        lines: [
          `Autor: ${piUser.username}`,
          `Plano: ${tier.toUpperCase()} (${expectedPrice} π)`,
          `Título: ${title}`,
          `Categoria: ${category} | País: ${countryCode}`,
        ],
        linkUrl: "https://hokage22b.com/mural",
        linkLabel: "Ver no Mural",
      });
      return jsonOk("AD_CREATED", { ad: data });
    }

    // ── 1B. CRIAR ANÚNCIO BRONZE COM CRÉDITO DE INDICAÇÃO ─────────
    if (action === "redeem_referral_ad") {
      const title = String(payload?.title || "").trim();
      const description = String(payload?.description || "").trim();
      if (title.length < 2 || title.length > 80) {
        return jsonError("INVALID_TITLE", "O título deve ter entre 2 e 80 caracteres.", 400);
      }
      if (description.length < 5 || description.length > 300) {
        return jsonError("INVALID_DESCRIPTION", "A descrição deve ter entre 5 e 300 caracteres.", 400);
      }

      const category = String(payload?.category || "geral").trim().slice(0, 32);
      const location = String(payload?.location || "Online / Global").trim().slice(0, 60) || "Online / Global";
      const rawCountry = String(payload?.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
      const countryCode = rawCountry || "GLOBAL";
      const rawPayMode = String(payload?.payment_modes || "pi").trim().toLowerCase();
      const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("redeem_referral_credit_for_ad", {
        p_uid: piUser.uid,
        p_username: piUser.username,
        p_title: title,
        p_description: description,
        p_category: category,
        p_location: location,
        p_country_code: countryCode,
        p_payment_modes: paymentModes,
      });

      if (rpcErr) {
        const msg = String(rpcErr.message || "");
        const isInsufficient = msg.includes("insuficiente");
        return jsonError(
          isInsufficient ? "INSUFFICIENT_REFERRAL_CREDITS" : "REFERRAL_REDEEM_FAILED",
          msg || "Não foi possível resgatar o crédito de indicação.",
          isInsufficient ? 409 : 400
        );
      }

      if (rpcRes?.ad?.id) {
        await supabase
          .from("anuncios")
          .update({ expires_at: "2099-12-31T23:59:59.000Z" })
          .eq("id", rpcRes.ad.id);
        rpcRes.ad.expires_at = "2099-12-31T23:59:59.000Z";
      }

      await notifyAdmin({
        priority: "normal",
        tag: "MURAL CRÉDITO GRÁTIS",
        title: `Novo Anúncio Bronze (${piUser.username})`,
        lines: [
          `Autor: ${piUser.username}`,
          `Título: ${title}`,
          `Categoria: ${category} | País: ${countryCode}`,
          `Créditos restantes do usuário: ${rpcRes?.remaining_credits ?? 0}`,
        ],
        linkUrl: "https://hokage22b.com/mural",
        linkLabel: "Ver no Mural",
      });

      return jsonOk("REFERRAL_AD_CREATED", {
        ad: rpcRes?.ad || null,
        remaining_credits: rpcRes?.remaining_credits ?? 0,
      });
    }

    // ── 2. EDITAR ANÚNCIO (PROPRIEDADE + PRAZO 24H) ─────────────
    if (action === "update_ad") {
      const adId = String(payload?.ad_id || "").trim();
      if (!adId) return jsonResponse({ error: "ad_id é obrigatório." }, 400);

      const title = String(payload?.title || "").trim();
      const description = String(payload?.description || "").trim();
      if (title.length < 2 || title.length > 80) {
        return jsonResponse({ error: "O título deve ter entre 2 e 80 caracteres." }, 400);
      }
      if (description.length < 5 || description.length > 300) {
        return jsonResponse({ error: "A descrição deve ter entre 5 e 300 caracteres." }, 400);
      }

      const { data: ad, error: fetchErr } = await supabase
        .from("anuncios")
        .select("id, pioneer_username, created_at, plan_tier")
        .eq("id", adId)
        .single();

      if (fetchErr || !ad) {
        return jsonResponse({ error: "Anúncio não encontrado." }, 404);
      }
      if (normalizeHandle(ad.pioneer_username) !== normalizeHandle(piUser.username)) {
        return jsonResponse({ error: "Sem permissão para editar este anúncio." }, 403);
      }

      const createdMs = new Date(ad.created_at).getTime();
      if (!Number.isFinite(createdMs) || (Date.now() - createdMs) > AD_EDIT_WINDOW_MS) {
        return jsonResponse({ error: "Prazo de edição expirado (máximo 24h após a publicação)." }, 403);
      }

      const isBronzeTier = String(ad.plan_tier || "bronze").toLowerCase() === "bronze";
      const safeLinkUrl = isBronzeTier ? null : validateHttpUrl(payload?.link_url);
      const safeImageUrl = isBronzeTier ? null : validateAdImageUrl(payload?.image_url);

      const { error: updErr } = await supabase
        .from("anuncios")
        .update({
          title,
          description,
          link_url: safeLinkUrl,
          image_url: safeImageUrl,
        })
        .eq("id", adId);

      if (updErr) throw updErr;
      return jsonResponse({ ok: true });
    }

    // ── 3. RENOVAR ANÚNCIO (+30 DIAS COM PAGAMENTO VALIDADO + ANTI-REPLAY) ────
    if (action === "renew_ad") {
      const adId = String(payload?.ad_id || "").trim();
      const paymentId = String(payload?.paymentId || "").trim();
      if (!adId || !paymentId) {
        return jsonResponse({ error: "ad_id e paymentId são obrigatórios." }, 400);
      }
      if (!SAFE_PAYMENT_ID_RE.test(paymentId)) {
        return jsonError("INVALID_PAYMENT_ID", "Identificador paymentId inválido.", 400);
      }

      const { data: ad, error: fetchErr } = await supabase
        .from("anuncios")
        .select("id, pioneer_username, plan_tier, status, expires_at")
        .eq("id", adId)
        .single();

      if (fetchErr || !ad) {
        return jsonResponse({ error: "Anúncio não encontrado." }, 404);
      }
      if (normalizeHandle(ad.pioneer_username) !== normalizeHandle(piUser.username)) {
        return jsonResponse({ error: "Sem permissão para renovar este anúncio." }, 403);
      }
      const adStatus = String(ad.status || "").toLowerCase();
      if (adStatus === "moderacao" || adStatus === "banido" || adStatus === "bloqueado" || adStatus === "suspenso") {
        return jsonError(
          "AD_MODERATED",
          "Este anúncio está suspenso ou em moderação e não pode ser reativado automaticamente.",
          403
        );
      }

      const tier = (ad.plan_tier === "ouro" || ad.plan_tier === "prata") ? ad.plan_tier : "bronze";
      const verifiedPay = await verifyPiPayment(paymentId, TIER_PRICES[tier], piUser.uid);

      // Proteção estrita contra replay attack (paymentId ou txid já utilizado em qualquer anúncio/transação)
      const [
        { data: usedLedgerPid },
        { data: usedLedgerTx },
        { data: usedAdPaymentTx },
        { data: usedAdPiTx },
        { data: usedAdPid },
      ] = await Promise.all([
        supabase.from("transacoes_pi").select("payment_id").eq("payment_id", paymentId).limit(1),
        supabase.from("transacoes_pi").select("payment_id").eq("txid", verifiedPay.txid).limit(1),
        supabase.from("anuncios").select("id").eq("payment_txid", verifiedPay.txid).limit(1),
        supabase.from("anuncios").select("id").eq("pi_txid", verifiedPay.txid).limit(1),
        supabase.from("anuncios").select("id").eq("pi_payment_id", paymentId).limit(1),
      ]);

      if (
        (usedLedgerPid && usedLedgerPid.length > 0) ||
        (usedLedgerTx && usedLedgerTx.length > 0) ||
        (usedAdPaymentTx && usedAdPaymentTx.length > 0) ||
        (usedAdPiTx && usedAdPiTx.length > 0) ||
        (usedAdPid && usedAdPid.length > 0)
      ) {
        return jsonError("PAYMENT_ALREADY_USED", "Este pagamento (paymentId/TXID) já foi utilizado anteriormente.", 409);
      }

      // Consome o pagamento no ledger antes de atualizar o anúncio
      const { error: ledgerErr } = await supabase.from("transacoes_pi").insert([{
        payment_id: paymentId,
        txid: verifiedPay.txid,
        amount: verifiedPay.amount,
        status: "completed",
        purpose: "renovacao_mural",
        metadata: {
          adId,
          tier,
          pioneer_username: piUser.username,
          buyer_uid: piUser.uid,
        },
        created_at: new Date().toISOString(),
      }]);
      if (ledgerErr) {
        if (ledgerErr.code === "23505") {
          return jsonError("PAYMENT_ALREADY_USED", "Este pagamento já foi registrado.", 409);
        }
        throw ledgerErr;
      }

      const baseMs = Math.max(Date.now(), ad.expires_at ? new Date(ad.expires_at).getTime() : Date.now());
      const newExpiresAt = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updErr } = await supabase
        .from("anuncios")
        .update({
          expires_at: newExpiresAt,
          status: "ativo",
          payment_txid: verifiedPay.txid,
          pi_txid: verifiedPay.txid,
          pi_payment_id: paymentId,
        })
        .eq("id", adId);

      if (updErr) throw updErr;
      return jsonResponse({ ok: true, expires_at: newExpiresAt });
    }

    // ── 4. PUBLICAR COMENTÁRIO (AUTH + RATE LIMIT SERVIDOR) ─────
    if (action === "create_comment") {
      const adId = String(payload?.ad_id || "").trim();
      const content = String(payload?.content || "").trim();
      if (!adId || content.length < 2 || content.length > 280) {
        return jsonResponse({ error: "Comentário inválido (entre 2 e 280 caracteres)." }, 400);
      }

      const cutoffIso = new Date(Date.now() - COMMENT_COOLDOWN_MS).toISOString();
      const { data: recentComments } = await supabase
        .from("anuncio_comentarios")
        .select("id")
        .eq("author_username", piUser.username)
        .gte("created_at", cutoffIso)
        .limit(1);

      if (recentComments && recentComments.length > 0) {
        return jsonResponse({ error: "Aguarde 15 segundos antes de enviar outro comentário." }, 429);
      }

      const { data, error } = await supabase
        .from("anuncio_comentarios")
        .insert([{
          ad_id: adId,
          author_username: piUser.username,
          content,
        }])
        .select("id, ad_id, author_username, content, created_at")
        .single();

      if (error) throw error;
      await notifyAdmin({
        priority: "normal",
        tag: "COMENTÁRIO NO MURAL",
        title: `${piUser.username} comentou em um anúncio`,
        lines: [
          `Autor: ${piUser.username}`,
          `Anúncio ID: ${adId}`,
          `Comentário: ${content}`,
        ],
        linkUrl: "https://hokage22b.com/mural",
        linkLabel: "Ver Mural",
      });
      return jsonResponse({ ok: true, comment: data });
    }

    // ── 5. DENUNCIAR ANÚNCIO (DEDUP + MODERAÇÃO AUTOMÁTICA) ─────
    if (action === "create_report") {
      const adId = String(payload?.ad_id || "").trim();
      const reason = String(payload?.reason || "outro").trim().slice(0, 60);
      const details = String(payload?.details || "").trim().slice(0, 500);
      if (!adId) return jsonResponse({ error: "ad_id é obrigatório." }, 400);

      const reportCutoffIso = new Date(Date.now() - COMMENT_COOLDOWN_MS).toISOString();
      const { data: recentReports } = await supabase
        .from("denuncias")
        .select("id")
        .eq("reporter_user", piUser.username)
        .gte("created_at", reportCutoffIso)
        .limit(1);

      if (recentReports && recentReports.length > 0) {
        return jsonResponse({ error: "Aguarde 15 segundos antes de enviar outra denúncia." }, 429);
      }

      const { data: existingReport } = await supabase
        .from("denuncias")
        .select("id")
        .eq("ad_id", adId)
        .eq("reporter_user", piUser.username)
        .limit(1);

      if (existingReport && existingReport.length > 0) {
        return jsonResponse({ error: "Você já denunciou este anúncio anteriormente." }, 409);
      }

      const { error: insErr } = await supabase
        .from("denuncias")
        .insert([{
          ad_id: adId,
          ad_title: String(payload?.ad_title || "").trim().slice(0, 100),
          reason,
          details,
          reporter_user: piUser.username,
        }]);

      if (insErr) throw insErr;

      // Auto-moderação se atingir o limite de denúncias distintas
      const { count } = await supabase
        .from("denuncias")
        .select("id", { count: "exact", head: true })
        .eq("ad_id", adId);

      const autoModerated = (count || 0) >= AUTO_MODERATION_REPORT_THRESHOLD;
      if (autoModerated) {
        await supabase
          .from("anuncios")
          .update({ status: "moderacao" })
          .eq("id", adId);
      }

      await notifyAdmin({
        priority: "high",
        tag: autoModerated ? "AUTO-MODERAÇÃO" : "DENÚNCIA NO MURAL",
        title: autoModerated
          ? `Anúncio pausado após ${count} denúncias!`
          : `Nova denúncia de ${piUser.username}`,
        lines: [
          `Denunciante: ${piUser.username}`,
          `Anúncio: ${String(payload?.ad_title || adId).slice(0, 100)}`,
          `Motivo: ${reason}`,
          details ? `Detalhes: ${details}` : "",
          `Total de denúncias neste anúncio: ${count || 1}`,
        ],
        linkUrl: "https://hokage22b.com/admin",
        linkLabel: "Moderar no Console Admin",
      });

      return jsonResponse({ ok: true, autoModerated });
    }

    // ── 6. AVALIAÇÃO VERIFICADA DE PIONEIRO (REPUTAÇÃO P2P) ──────
    if (action === "submit_review") {
      const cleanTarget = normalizeHandle(String(payload?.target_username || ""));
      if (!cleanTarget) {
        return jsonResponse({ error: "Perfil de destino inválido." }, 400);
      }
      const targetUsername = "@" + cleanTarget;
      if (cleanTarget === normalizeHandle(piUser.username)) {
        return jsonResponse({ error: "Você não pode avaliar a própria Vitrine." }, 400);
      }

      const rating = Math.round(Number(payload?.rating));
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return jsonResponse({ error: "A nota deve ser entre 1 e 5 estrelas." }, 400);
      }

      const comment = String(payload?.comment || "").trim();
      if (comment.length < 2 || comment.length > 200) {
        return jsonResponse({ error: "O comentário deve ter entre 2 e 200 caracteres." }, 400);
      }

      const reviewCutoffIso = new Date(Date.now() - 30 * 1000).toISOString();
      const { data: recentReviews } = await supabase
        .from("pioneer_reviews")
        .select("id")
        .eq("reviewer_username", piUser.username)
        .gte("created_at", reviewCutoffIso)
        .limit(1);

      if (recentReviews && recentReviews.length > 0) {
        return jsonResponse({ error: "Aguarde 30 segundos antes de enviar outra avaliação." }, 429);
      }

      const { data, error } = await supabase
        .from("pioneer_reviews")
        .upsert(
          [{
            target_username: targetUsername,
            reviewer_username: piUser.username,
            rating,
            comment,
          }],
          { onConflict: "target_username,reviewer_username" }
        )
        .select("id, target_username, reviewer_username, rating, comment, created_at")
        .single();

      if (error) throw error;

      // Sincroniza reputation_score na tabela pioneiros (total de recomendações positivas >= 4 estrelas)
      try {
        const { count: positiveCount } = await supabase
          .from("pioneer_reviews")
          .select("id", { count: "exact", head: true })
          .ilike("target_username", targetUsername)
          .gte("rating", 4);

        if (typeof positiveCount === "number") {
          await supabase
            .from("pioneiros")
            .update({ reputation_score: positiveCount })
            .ilike("username", targetUsername);
        }
      } catch (_) {}

      await notifyAdmin({
        priority: "normal",
        tag: "AVALIAÇÃO P2P",
        title: `${piUser.username} avaliou ${targetUsername} (${rating}/5 ★)`,
        lines: [
          `Avaliador: ${piUser.username}`,
          `Vitrine avaliada: ${targetUsername}`,
          `Nota: ${"★".repeat(rating)} (${rating}/5)`,
          `Comentário: ${comment}`,
        ],
        linkUrl: `https://hokage22b.com/pioneiro?u=${encodeURIComponent(cleanTarget)}`,
        linkLabel: "Ver Vitrine Avaliada",
      });

      return jsonResponse({ ok: true, review: data });
    }

    // ── 7. UPLOAD AUTENTICADO DE IMAGEM PARA MURAL-IMAGES ───────
    if (action === "upload_ad_image") {
      const { bytes, ext, mime } = decodeValidatedImageDataUrl(payload?.dataUrl);
      const cleanHandle = normalizeHandle(piUser.username) || "pioneiro";
      const filePath = `${cleanHandle}/ad_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("mural-images")
        .upload(filePath, bytes, {
          contentType: mime,
          cacheControl: "31536000",
          upsert: false,
        });

      if (upErr) {
        throw new Error(upErr.message || "Falha ao enviar imagem para o Storage.");
      }

      const { data: pubData } = supabase.storage
        .from("mural-images")
        .getPublicUrl(filePath);

      return jsonOk("IMAGE_UPLOADED", { publicUrl: pubData.publicUrl });
    }

    // ── 8. LISTAR MEUS ANÚNCIOS (AUTENTICADO, SUBSTITUI RPC ANON) ──
    if (action === "get_my_ads") {
      const cleanHandle = normalizeHandle(piUser.username);
      if (!cleanHandle) {
        return jsonError("INVALID_USERNAME", "Usuário Pi inválido.", 400);
      }
      const escapedHandle = cleanHandle.replace(/[\\%_]/g, "\\$&");
      const { data: adsData, error: adsErr } = await supabase
        .from("anuncios")
        .select("*")
        .ilike("pioneer_username", "@" + escapedHandle)
        .order("created_at", { ascending: false })
        .limit(100);

      if (adsErr) throw adsErr;

      const enriched = (adsData || []).map((ad: any) => {
        const expMs = ad.expires_at
          ? new Date(ad.expires_at).getTime()
          : (new Date(ad.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.max(0, Math.floor((expMs - Date.now()) / (24 * 60 * 60 * 1000)));
        return { ...ad, days_left: daysLeft };
      });

      return jsonOk("MY_ADS", { ads: enriched });
    }

    return jsonError("UNKNOWN_ACTION", "Ação desconhecida.", 400);
  } catch (err) {
    if (err instanceof HttpPayloadError) {
      return jsonError(err.code, err.message, err.status);
    }
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    return jsonError("MURAL_ACTION_ERROR", message, 400);
  }
});

