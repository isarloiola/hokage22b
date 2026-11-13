// ============================================================
// HOKAGE22B — Supabase Edge Function: Mural Action Server
// Zero-Trust Server-Side Handler para Anúncios, Edição 24h,
// Renovações, Comentários (com Rate Limit) e Denúncias
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://hokage22b.com",
  "https://www.hokage22b.com",
  "https://isarloiola.github.io",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowOrigin = (ALLOWED_ORIGINS.has(origin) || isLocal) ? origin : "https://hokage22b.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const MAX_BODY_BYTES = 32 * 1024; // 32 KB limit against payload-flood DoS
const TIER_PRICES: Record<string, number> = {
  ouro: 3.14,
  prata: 1.0,
  bronze: 0.314,
};

const AD_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const COMMENT_COOLDOWN_MS = 15 * 1000;
const AUTO_MODERATION_REPORT_THRESHOLD = 5;

let currentCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://hokage22b.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...currentCorsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function normalizeHandle(handle: string): string {
  return String(handle || "").trim().replace(/^@+/, "").toLowerCase();
}

function validateHttpUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("URL inválida. Utilize http:// ou https://.");
  }
  return trimmed.slice(0, 500);
}

async function verifyPiAccessToken(accessToken: string) {
  const piResponse = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!piResponse.ok) {
    throw new Error("Sessão Pi Network inválida ou expirada. Faça login novamente no Pi Browser.");
  }
  const piUser = await piResponse.json();
  if (!piUser || !piUser.uid || !piUser.username) {
    throw new Error("Falha ao verificar identidade na Pi Network.");
  }
  return {
    uid: String(piUser.uid),
    username: "@" + normalizeHandle(String(piUser.username)),
  };
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
  currentCorsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: currentCorsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Payload excede o limite de segurança (32 KB)." }, 413);
    }

    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Payload excede o limite de segurança (32 KB)." }, 413);
    }

    const body = JSON.parse(rawText || "{}");
    const { action, accessToken, payload } = body || {};

    if (!action || typeof action !== "string") {
      return jsonResponse({ error: "Ação inválida." }, 400);
    }
    if (!accessToken || typeof accessToken !== "string") {
      return jsonResponse({ error: "Autenticação Pi Browser obrigatória (accessToken ausente)." }, 401);
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
      const imageUrl = tier === "bronze" ? null : validateHttpUrl(payload?.image_url);
      const category = String(payload?.category || "geral").trim().slice(0, 32);
      const location = String(payload?.location || "Online / Global").trim().slice(0, 60) || "Online / Global";
      const rawCountry = String(payload?.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6);
      const countryCode = rawCountry || "GLOBAL";
      const rawPayMode = String(payload?.payment_modes || "pi").trim().toLowerCase();
      const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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
      return jsonResponse({ ok: true, ad: data });
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

      const linkUrl = validateHttpUrl(payload?.link_url);
      const imageUrl = validateHttpUrl(payload?.image_url);

      const { data: ad, error: fetchErr } = await supabase
        .from("anuncios")
        .select("id, pioneer_username, created_at")
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

      const { error: updErr } = await supabase
        .from("anuncios")
        .update({
          title,
          description,
          link_url: linkUrl,
          image_url: imageUrl,
        })
        .eq("id", adId);

      if (updErr) throw updErr;
      return jsonResponse({ ok: true });
    }

    // ── 3. RENOVAR ANÚNCIO (+30 DIAS COM PAGAMENTO VALIDADO) ────
    if (action === "renew_ad") {
      const adId = String(payload?.ad_id || "").trim();
      const paymentId = String(payload?.paymentId || "").trim();
      if (!adId || !paymentId) {
        return jsonResponse({ error: "ad_id e paymentId são obrigatórios." }, 400);
      }

      const { data: ad, error: fetchErr } = await supabase
        .from("anuncios")
        .select("id, pioneer_username, plan_tier, expires_at")
        .eq("id", adId)
        .single();

      if (fetchErr || !ad) {
        return jsonResponse({ error: "Anúncio não encontrado." }, 404);
      }
      if (normalizeHandle(ad.pioneer_username) !== normalizeHandle(piUser.username)) {
        return jsonResponse({ error: "Sem permissão para renovar este anúncio." }, 403);
      }

      const tier = (ad.plan_tier === "ouro" || ad.plan_tier === "prata") ? ad.plan_tier : "bronze";
      const verifiedPay = await verifyPiPayment(paymentId, TIER_PRICES[tier], piUser.uid);

      const baseMs = Math.max(Date.now(), ad.expires_at ? new Date(ad.expires_at).getTime() : Date.now());
      const newExpiresAt = new Date(baseMs + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updErr } = await supabase
        .from("anuncios")
        .update({
          expires_at: newExpiresAt,
          status: "ativo",
          payment_txid: verifiedPay.txid,
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

      if ((count || 0) >= AUTO_MODERATION_REPORT_THRESHOLD) {
        await supabase
          .from("anuncios")
          .update({ status: "moderacao" })
          .eq("id", adId);
      }

      return jsonResponse({ ok: true, autoModerated: (count || 0) >= AUTO_MODERATION_REPORT_THRESHOLD });
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
      return jsonResponse({ ok: true, review: data });
    }

    return jsonResponse({ error: "Ação desconhecida." }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno no servidor.";
    return jsonResponse({ error: message }, 400);
  }
});

