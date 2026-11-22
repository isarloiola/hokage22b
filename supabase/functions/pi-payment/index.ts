// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Network Payment Server & E-book Vault
// Endpoint seguro para aprovar, validar montantes, completar pagamentos na Pi Network
// e liberar downloads vitalícios de E-books via Signed URLs (Bucket Privado)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ALLOWED_ORIGINS,
  getCorsHeaders,
  HttpPayloadError,
  jsonError,
  jsonOk,
  MURAL_CONFIG,
  parseJsonBody,
} from "../_shared/http.ts";
import { normalizeHandle, verifyPiAccessToken } from "../_shared/pi-auth.ts";
import { notifyAdmin } from "../_shared/notify.ts";

const SAFE_PAYMENT_ID_RE = /^[A-Za-z0-9_.:-]{4,128}$/;
const EMAIL_FORMAT_RE = /^[^@\s"<>'`]+@[^@\s"<>'`]+\.[^@\s"<>'`]+$/;
const NOTIFIED_LEADS_CACHE = new Map<string, number>();

const EBOOK_BUCKET = "ebooks-privados";

const EBOOK_VAULT_FILES: Record<string, Record<string, { path: string; downloadName: string }>> = {
  "ia-na-pratica": {
    pdf: {
      path: "ia-na-pratica/IA-na-Pratica_Hokage22b.pdf",
      downloadName: "IA-na-Pratica_Hokage22b.pdf",
    },
    epub: {
      path: "ia-na-pratica/IA-na-Pratica_Hokage22b.epub",
      downloadName: "IA-na-Pratica_Hokage22b.epub",
    },
    bonus: {
      path: "ia-na-pratica/Bonus_Checklist_Seguranca_e_Assistentes.pdf",
      downloadName: "Bonus_Checklist_Seguranca_e_Assistentes.pdf",
    },
  },
  "pi-para-seu-negocio": {
    pdf: {
      path: "pi-para-seu-negocio/Pi-para-seu-Negocio_Hokage22b.pdf",
      downloadName: "Pi-para-seu-Negocio_Hokage22b.pdf",
    },
    epub: {
      path: "pi-para-seu-negocio/Pi-para-seu-Negocio_Hokage22b.epub",
      downloadName: "Pi-para-seu-Negocio_Hokage22b.epub",
    },
  },
};

function sanitizeHttpUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    return trimmed.slice(0, 500);
  }
  return null;
}

function sanitizeAdImageUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed.length <= 350000 ? trimmed : null;
  }
  if (/^https:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    return trimmed.slice(0, 500);
  }
  return null;
}

async function getOwnedEbooksForUser(supabase: any, username: string, uid?: string | null): Promise<string[]> {
  const clean = normalizeHandle(username);
  if (!clean) return [];

  // O fundador @hokage22b sempre possui acesso vitalício a todo o catálogo editorial
  if (clean === "hokage22b") {
    return ["ia-na-pratica", "pi-para-seu-negocio"];
  }

  const owned = new Set<string>();

  // 1. Tabela indexada dedicada ebook_entitlements (vinculada a user_uid / username)
  const queries: Promise<any>[] = [
    supabase.from("ebook_entitlements").select("product_id").ilike("username", "@" + clean),
  ];
  if (uid) {
    queries.push(supabase.from("ebook_entitlements").select("product_id").eq("user_uid", uid));
  }

  const results = await Promise.all(queries);
  const tableMissing = results.some((r) =>
    r?.error && (r.error.code === "42P01" || String(r.error.message || "").includes("ebook_entitlements"))
  );

  if (!tableMissing) {
    for (const res of results) {
      if (Array.isArray(res?.data)) {
        for (const row of res.data) {
          const prodId = String(row?.product_id || "").toLowerCase();
          if (prodId === "ia-na-pratica" || prodId === "pi-para-seu-negocio") {
            owned.add(prodId);
          }
        }
      }
    }
    if (owned.size > 0) return Array.from(owned);
  }

  // 2. Fallback filtrado no PostgreSQL para compras anteriores em transacoes_pi
  const txQueries: Promise<any>[] = [
    supabase
      .from("transacoes_pi")
      .select("metadata")
      .eq("status", "completed")
      .eq("purpose", "ebook")
      .eq("metadata->>pioneer_username", "@" + clean)
      .limit(50),
  ];
  if (uid) {
    txQueries.push(
      supabase
        .from("transacoes_pi")
        .select("metadata")
        .eq("status", "completed")
        .eq("purpose", "ebook")
        .eq("metadata->>buyer_uid", uid)
        .limit(50)
    );
  }

  const txResults = await Promise.all(txQueries);
  for (const res of txResults) {
    if (Array.isArray(res?.data)) {
      for (const row of res.data) {
        const meta = (row && typeof row.metadata === "object" && row.metadata) ? row.metadata : {};
        const prodId = String(meta.productId || meta.product_id || meta.product || "pi-para-seu-negocio").toLowerCase();
        if (prodId === "ia-na-pratica" || prodId === "pi-para-seu-negocio") {
          owned.add(prodId);
        }
      }
    }
  }
  return Array.from(owned);
}

const MIN_AFFILIATE_PAYOUT_PI = 0.2;

async function verifyAdminOrFounder(
  supabase: any,
  accessToken?: string,
  adminSecret?: string
): Promise<boolean> {
  if (adminSecret && String(adminSecret).trim().length >= 8) {
    try {
      const { data: ok, error } = await supabase.rpc("admin_verify_access", {
        p_secret: String(adminSecret).trim(),
      });
      if (!error && Boolean(ok)) {
        return true;
      }
    } catch (_) {}
  }
  if (accessToken && String(accessToken).trim()) {
    try {
      const piUser = await verifyPiAccessToken(String(accessToken));
      if (normalizeHandle(piUser.username) === "hokage22b") {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

interface AffiliateCommissionOpts {
  paymentId: string;
  txid: string | null;
  paidAmount: number;
  buyerUsername: string;
  buyerUid?: string | null;
  buyerWallet?: string | null;
  purpose: "anuncio_mural" | "ebook";
  description: string;
  fallbackRefCode?: string | null;
}

async function processAffiliateCommission(
  supabase: any,
  opts: AffiliateCommissionOpts
): Promise<Record<string, unknown> | null> {
  try {
    const paidAmount = Number(opts.paidAmount) || 0;
    if (paidAmount <= 0 || String(opts.paymentId || "").startsWith("REF_CREDIT_")) {
      return null;
    }

    const cleanBuyer = normalizeHandle(opts.buyerUsername);
    if (!cleanBuyer) return null;

    // 1. Consulta comprador na tabela pioneiros
    const { data: buyerRow } = await supabase
      .from("pioneiros")
      .select("uid, username, wallet_address, referred_by_username")
      .ilike("username", "@" + cleanBuyer)
      .maybeSingle();

    let rawReferrer = buyerRow?.referred_by_username ? String(buyerRow.referred_by_username) : "";

    // 2. Fallback: consulta na tabela indicacoes caso referred_by_username não esteja preenchido
    if (!rawReferrer) {
      const { data: indRow } = await supabase
        .from("indicacoes")
        .select("referrer_username")
        .ilike("referred_username", "@" + cleanBuyer)
        .maybeSingle();
      if (indRow?.referrer_username) {
        rawReferrer = String(indRow.referrer_username);
      }
    }

    // 3. Fallback: convite pendente (refCode enviado na compra caso o comprador ainda não tenha criado Vitrine)
    if (!rawReferrer && opts.fallbackRefCode) {
      rawReferrer = String(opts.fallbackRefCode);
    }

    const cleanReferrer = normalizeHandle(rawReferrer);
    if (!cleanReferrer || cleanReferrer === cleanBuyer) {
      return null;
    }

    // 4. Localiza o indicador real na tabela pioneiros
    const { data: refRow } = await supabase
      .from("pioneiros")
      .select("uid, username, wallet_address, is_ambassador, referral_qualified_count")
      .ilike("username", "@" + cleanReferrer)
      .maybeSingle();

    if (!refRow || !refRow.username) {
      return null;
    }

    // 5. Blindagem Anti-Autoindicação (3 Camadas: Username, UID e Carteira Pi)
    if (normalizeHandle(refRow.username) === cleanBuyer) {
      return null;
    }
    const effectiveBuyerUid = opts.buyerUid || buyerRow?.uid || null;
    if (effectiveBuyerUid && refRow.uid && String(refRow.uid) === String(effectiveBuyerUid)) {
      return null;
    }
    const refWallet = refRow.wallet_address ? String(refRow.wallet_address).trim() : "";
    const buyWallet = String(opts.buyerWallet || buyerRow?.wallet_address || "").trim();
    if (refWallet && buyWallet && refWallet.toUpperCase() === buyWallet.toUpperCase()) {
      return null;
    }

    // 6. Persiste o vínculo referred_by_username no comprador se ainda estava vazio
    if (buyerRow && !buyerRow.referred_by_username) {
      await supabase
        .from("pioneiros")
        .update({ referred_by_username: "@" + cleanReferrer })
        .eq("uid", buyerRow.uid);
    }

    // 7. Verifica Idempotência: 1 única comissão por paymentId original
    const commId = `comm_${opts.paymentId}`;
    const { data: existingComm } = await supabase
      .from("transacoes_pi")
      .select("payment_id, amount, status, metadata")
      .eq("payment_id", commId)
      .maybeSingle();

    if (existingComm) {
      return existingComm;
    }

    // 8. Cálculo de Comissão: 20% Padrão | 25% Embaixador (5+ indicados qualificados)
    const isAmbassador = Boolean(refRow.is_ambassador) || Number(refRow.referral_qualified_count || 0) >= 5;
    const commissionRate = isAmbassador ? 0.25 : 0.20;
    const commissionPi = Math.round(paidAmount * commissionRate * 10000) / 10000;
    if (commissionPi <= 0) return null;

    const commRecord = {
      payment_id: commId,
      txid: opts.txid || null,
      from_address: buyWallet || null,
      to_address: refWallet || null,
      amount: commissionPi,
      status: "pending",
      purpose: "affiliate_commission",
      metadata: {
        referrer_username: "@" + cleanReferrer,
        referred_username: "@" + cleanBuyer,
        is_ambassador_rate: isAmbassador,
        commission_rate: commissionRate,
        source_payment_id: opts.paymentId,
        source_txid: opts.txid || null,
        source_purpose: opts.purpose,
        source_description: opts.description,
        source_amount_pi: paidAmount,
        referrer_wallet: refWallet || null,
        payout_status: "pending",
      },
      created_at: new Date().toISOString(),
    };

    await supabase.from("transacoes_pi").insert(commRecord);
    return commRecord;
  } catch (err) {
    console.warn("[Affiliate Warning] Erro ao calcular comissão de afiliado:", err);
    return null;
  }
}

function maskHandle(handle: string): string {
  const clean = normalizeHandle(handle);
  if (!clean) return "@pioneiro";
  if (clean.length <= 4) return "@" + clean.slice(0, 2) + "***";
  return "@" + clean.slice(0, 3) + "***" + clean.slice(-2);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);

  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Método não permitido.", corsHeaders, 405);
  }

  try {
    // Limite de 800KB para suportar adPayload com fotos Base64 durante o complete do Mural
    const body = await parseJsonBody(req, 800 * 1024);
    const {
      action,
      paymentId,
      txid,
      adPayload,
      accessToken,
      adminSecret,
      productId,
      format,
      targetUsername,
      username,
      refCode,
      walletAddress,
      commissionIds,
      payoutTxid,
    } = body;

    // Endpoint de catálogo/preços oficial (para consulta Agent-Ready)
    if (action === "get_catalog") {
      return jsonOk("PAYMENT_CATALOG", { catalog: MURAL_CONFIG }, corsHeaders, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Notificação de novo Lead / Lista de Espera / Proposta Comercial (anti-spam estrito)
    if (action === "notify_lead") {
      const reqOrigin = (req.headers.get("origin") || "").trim();
      const allowLocal = Deno.env.get("ALLOW_LOCALHOST_CORS") === "true" &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(reqOrigin);
      if (!ALLOWED_ORIGINS.has(reqOrigin) && !allowLocal) {
        return jsonError("FORBIDDEN_ORIGIN", "Origem não autorizada.", corsHeaders, 403);
      }

      const leadName = String(body?.name || "Pioneiro").trim().slice(0, 80);
      const leadEmail = String(body?.email || "").trim().slice(0, 120);
      const leadSource = String(body?.source || "site").trim().slice(0, 60);
      const leadPiUser = String(body?.pi_username || "").trim().slice(0, 60);
      if (!leadEmail || !EMAIL_FORMAT_RE.test(leadEmail)) {
        return jsonError("INVALID_LEAD", "E-mail inválido.", corsHeaders, 400);
      }

      const cacheKey = leadEmail.toLowerCase();
      const nowMs = Date.now();
      const prevNotifiedAt = NOTIFIED_LEADS_CACHE.get(cacheKey);
      if (prevNotifiedAt && (nowMs - prevNotifiedAt) < 10 * 60 * 1000) {
        return jsonOk("LEAD_NOTIFIED", { deduplicated: true }, corsHeaders, 200);
      }

      const fiveMinAgo = new Date(nowMs - 5 * 60 * 1000).toISOString();
      const { data: recentLead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", leadEmail)
        .gte("created_at", fiveMinAgo)
        .limit(1);

      if (!recentLead || recentLead.length === 0) {
        return jsonError("LEAD_NOT_FOUND", "Lead não registrado recentemente.", corsHeaders, 400);
      }

      NOTIFIED_LEADS_CACHE.set(cacheKey, nowMs);
      if (NOTIFIED_LEADS_CACHE.size > 500) {
        for (const [k, ts] of NOTIFIED_LEADS_CACHE.entries()) {
          if (nowMs - ts > 10 * 60 * 1000) NOTIFIED_LEADS_CACHE.delete(k);
        }
      }

      await notifyAdmin({
        priority: "normal",
        tag: "NOVO LEAD / CONTATO",
        title: `${leadName} (${leadSource})`,
        lines: [
          `Nome: ${leadName}`,
          `E-mail: ${leadEmail}`,
          `Origem: ${leadSource}`,
          leadPiUser ? `Usuário Pi: ${leadPiUser}` : "",
        ],
        linkUrl: "https://hokage22b.com/admin",
        linkLabel: "Ver Leads no Admin",
      });
      return jsonOk("LEAD_NOTIFIED", {}, corsHeaders, 200);
    }

    // ============================================================
    // PAINEL DE AFILIADOS & COMISSÕES EM PI (20% PADRÃO / 25% EMBAIXADOR)
    // ============================================================
    if (action === "affiliate_summary") {
      let cleanUser = "";
      let isAdminCaller = false;
      if (adminSecret && String(adminSecret).trim().length >= 8) {
        isAdminCaller = await verifyAdminOrFounder(supabase, undefined, adminSecret);
      }

      let piUser: { uid: string; username: string } | null = null;
      if (accessToken && String(accessToken).trim()) {
        try {
          piUser = await verifyPiAccessToken(String(accessToken));
        } catch (_) {}
      }

      if (!piUser && !isAdminCaller) {
        return jsonError(
          "UNAUTHORIZED",
          "Conecte sua conta oficial no Pi Browser para consultar comissões e carteira.",
          corsHeaders,
          401
        );
      }

      if (piUser && normalizeHandle(piUser.username) === "hokage22b") {
        isAdminCaller = true;
      }

      if (isAdminCaller) {
        cleanUser = normalizeHandle(String(username || targetUsername || piUser?.username || ""));
      } else if (piUser) {
        cleanUser = normalizeHandle(piUser.username);
      }

      const isVerifiedOwner = true;

      if (!cleanUser) {
        return jsonError("MISSING_USERNAME", "Informe o @username para consultar as comissões.", corsHeaders, 400);
      }

      const { data: profRow } = await supabase
        .from("pioneiros")
        .select("username, wallet_address, is_ambassador, referral_qualified_count, referral_credits")
        .ilike("username", "@" + cleanUser)
        .maybeSingle();

      const isAmb = Boolean(profRow?.is_ambassador) || Number(profRow?.referral_qualified_count || 0) >= 5;
      const ratePct = isAmb ? 25 : 20;

      const { data: rows } = await supabase
        .from("transacoes_pi")
        .select("payment_id, txid, to_address, amount, status, metadata, created_at")
        .eq("purpose", "affiliate_commission")
        .eq("metadata->>referrer_username", "@" + cleanUser)
        .order("created_at", { ascending: false })
        .limit(100);

      let pendingPi = 0;
      let requestedPi = 0;
      let paidPi = 0;
      const userCommissions: Record<string, unknown>[] = [];

      if (Array.isArray(rows)) {
        for (const r of rows) {
          const meta = (r && typeof r.metadata === "object" && r.metadata) ? r.metadata : {};
          const refHandle = normalizeHandle(String(meta.referrer_username || ""));
          if (refHandle !== cleanUser) continue;

          const amt = Number(r.amount) || 0;
          const st = String(r.status || "pending").toLowerCase();
          if (st === "paid") paidPi += amt;
          else if (st === "requested") requestedPi += amt;
          else pendingPi += amt;

          if (userCommissions.length < 30) {
            const rawBuyer = String(meta.referred_username || "@pioneiro");
            userCommissions.push({
              id: r.payment_id,
              created_at: r.created_at,
              referred_username: isVerifiedOwner ? rawBuyer : maskHandle(rawBuyer),
              source_purpose: meta.source_purpose || "anuncio_mural",
              source_description: meta.source_description || "Comissão de Indicação",
              source_amount_pi: Number(meta.source_amount_pi) || 0,
              commission_rate: Number(meta.commission_rate) || 0.20,
              amount_pi: Math.round(amt * 10000) / 10000,
              status: st,
              paid_txid: meta.paid_txid || (st === "paid" ? r.txid : null),
            });
          }
        }
      }

      pendingPi = Math.round(pendingPi * 10000) / 10000;
      requestedPi = Math.round(requestedPi * 10000) / 10000;
      paidPi = Math.round(paidPi * 10000) / 10000;
      const totalEarnedPi = Math.round((pendingPi + requestedPi + paidPi) * 10000) / 10000;

      return jsonOk(
        "AFFILIATE_SUMMARY",
        {
          username: "@" + cleanUser,
          is_ambassador: isAmb,
          commission_rate_pct: ratePct,
          pending_pi: pendingPi,
          requested_pi: requestedPi,
          paid_pi: paidPi,
          total_earned_pi: totalEarnedPi,
          min_payout_pi: MIN_AFFILIATE_PAYOUT_PI,
          wallet_address: profRow?.wallet_address || null,
          commissions: userCommissions,
        },
        corsHeaders,
        200
      );
    }

    if (action === "request_affiliate_payout") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      const cleanUser = normalizeHandle(piUser.username);
      if (!cleanUser) {
        return jsonError("UNAUTHORIZED", "Autenticação Pi inválida.", corsHeaders, 401);
      }

      const { data: profRow } = await supabase
        .from("pioneiros")
        .select("uid, username, wallet_address")
        .ilike("username", "@" + cleanUser)
        .maybeSingle();

      let cleanWallet = profRow?.wallet_address ? String(profRow.wallet_address).trim() : "";
      if (walletAddress && /^G[A-Z2-7]{55}$/.test(String(walletAddress).trim())) {
        cleanWallet = String(walletAddress).trim();
        if (profRow?.uid) {
          await supabase
            .from("pioneiros")
            .update({ wallet_address: cleanWallet })
            .eq("uid", profRow.uid);
        }
      }

      if (!cleanWallet || !/^G[A-Z2-7]{55}$/.test(cleanWallet)) {
        return jsonError(
          "MISSING_VALID_WALLET",
          "Cadastre sua Chave Pública da Pi Wallet (iniciada com G, 56 caracteres) na sua Vitrine antes de solicitar o saque.",
          corsHeaders,
          400
        );
      }

      let pendingSum = 0;
      let commissionsCount = 0;

      // Usa RPC atômica com FOR UPDATE quando disponível (Migration 022), mantendo fallback seguro
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("request_affiliate_payout_atomic", {
        p_username: "@" + cleanUser,
        p_wallet: cleanWallet,
        p_min_pi: MIN_AFFILIATE_PAYOUT_PI,
      });

      const rpcMsg = String(rpcErr?.message || "");
      const missingRpc = Boolean(
        rpcErr &&
          (rpcErr.code === "42883" ||
            rpcMsg.includes("Could not find the function") ||
            rpcMsg.includes("does not exist"))
      );

      if (!rpcErr && rpcRes && typeof rpcRes === "object") {
        const resObj = rpcRes as Record<string, unknown>;
        if (!resObj.ok) {
          const reason = String(resObj.reason || "");
          if (reason === "MIN_PAYOUT_NOT_REACHED") {
            const avail = Number(resObj.pending_pi || 0);
            return jsonError(
              "MIN_PAYOUT_NOT_REACHED",
              `Saldo disponível (${avail} π) abaixo do mínimo para saque (${MIN_AFFILIATE_PAYOUT_PI} π).`,
              corsHeaders,
              400
            );
          }
          return jsonError(reason || "PAYOUT_REQUEST_FAILED", "Não foi possível solicitar o saque.", corsHeaders, 400);
        }
        pendingSum = Math.round((Number(resObj.requested_pi) || 0) * 10000) / 10000;
        commissionsCount = Number(resObj.commissions_count || 0);
      } else if (missingRpc) {
        const { data: rows } = await supabase
          .from("transacoes_pi")
          .select("payment_id, amount, status, metadata")
          .eq("purpose", "affiliate_commission")
          .eq("status", "pending");

        const targetIds: string[] = [];
        if (Array.isArray(rows)) {
          for (const r of rows) {
            const meta = (r && typeof r.metadata === "object" && r.metadata) ? r.metadata : {};
            if (normalizeHandle(String(meta.referrer_username || "")) === cleanUser) {
              targetIds.push(r.payment_id);
              pendingSum += Number(r.amount) || 0;
            }
          }
        }

        pendingSum = Math.round(pendingSum * 10000) / 10000;
        if (targetIds.length === 0 || pendingSum + 1e-6 < MIN_AFFILIATE_PAYOUT_PI) {
          return jsonError(
            "MIN_PAYOUT_NOT_REACHED",
            `Saldo disponível (${pendingSum} π) abaixo do mínimo para saque (${MIN_AFFILIATE_PAYOUT_PI} π).`,
            corsHeaders,
            400
          );
        }

        const requestedAt = new Date().toISOString();
        let transitionedSum = 0;
        for (const id of targetIds) {
          const row = rows!.find((x: any) => x.payment_id === id);
          const oldMeta = (row && typeof row.metadata === "object" && row.metadata) ? row.metadata : {};
          const { data: updatedRow } = await supabase
            .from("transacoes_pi")
            .update({
              status: "requested",
              to_address: cleanWallet,
              metadata: {
                ...oldMeta,
                referrer_wallet: cleanWallet,
                payout_status: "requested",
                requested_at: requestedAt,
              },
            })
            .eq("payment_id", id)
            .eq("purpose", "affiliate_commission")
            .eq("status", "pending")
            .select("payment_id, amount")
            .maybeSingle();
          if (updatedRow) {
            commissionsCount += 1;
            transitionedSum += Number(updatedRow.amount) || 0;
          }
        }
        pendingSum = Math.round(transitionedSum * 10000) / 10000;
        if (commissionsCount === 0) {
          return jsonError("MIN_PAYOUT_NOT_REACHED", "Nenhuma comissão pendente disponível para saque.", corsHeaders, 409);
        }
      } else if (rpcErr) {
        throw rpcErr;
      }

      await notifyAdmin({
        priority: "high",
        tag: "SAQUE SOLICITADO",
        title: `@${cleanUser} pediu saque de ${pendingSum.toFixed(4)} π`,
        lines: [
          `Afiliado: @${cleanUser}`,
          `Valor pendente: ${pendingSum.toFixed(4)} π (${commissionsCount} comissões)`,
          `Carteira Pi: ${cleanWallet}`,
          `Ação: Envie a transferência P2P e clique em "Marcar Pago" no Admin.`,
        ],
        linkUrl: "https://hokage22b.com/admin",
        linkLabel: "Abrir Aba Afiliados no Admin",
      });

      return jsonOk(
        "PAYOUT_REQUESTED",
        {
          username: "@" + cleanUser,
          requested_pi: pendingSum,
          wallet_address: cleanWallet,
          commissions_count: commissionsCount,
        },
        corsHeaders,
        200
      );
    }

      if (action === "admin_test_notification") {
        const isAdmin = await verifyAdminOrFounder(supabase, accessToken, adminSecret);
        if (!isAdmin) {
          return jsonError("FORBIDDEN", "Acesso restrito ao administrador @hokage22b.", corsHeaders, 403);
        }
        const delivery = await notifyAdmin({
          priority: "normal",
          tag: "TESTE DO SISTEMA",
          title: "Notificações do HOKAGE22B ativas!",
          lines: [
            "Seu painel administrativo está conectado com sucesso.",
            "Você receberá alertas em tempo real de saques, denúncias, novos pioneiros, vendas em Pi e leads.",
          ],
          linkUrl: "https://hokage22b.com/admin",
          linkLabel: "Abrir Console Admin",
        });
        return jsonOk("TEST_NOTIFICATION_SENT", { delivery }, corsHeaders, 200);
      }

      if (action === "admin_list_commissions") {
      const isAdmin = await verifyAdminOrFounder(supabase, accessToken, adminSecret);
      if (!isAdmin) {
        return jsonError("FORBIDDEN", "Acesso restrito ao administrador @hokage22b.", corsHeaders, 403);
      }

      const { data: rows } = await supabase
        .from("transacoes_pi")
        .select("payment_id, txid, from_address, to_address, amount, status, metadata, created_at")
        .eq("purpose", "affiliate_commission")
        .order("created_at", { ascending: false });

      const { data: pioneers } = await supabase
        .from("pioneiros")
        .select("username, wallet_address, is_ambassador, referral_qualified_count");

      const walletMap = new Map<string, string>();
      if (Array.isArray(pioneers)) {
        for (const p of pioneers) {
          const h = normalizeHandle(p.username);
          if (h && p.wallet_address) {
            walletMap.set(h, String(p.wallet_address).trim());
          }
        }
      }

      const list = (Array.isArray(rows) ? rows : []).map((r: any) => {
        const meta = (r && typeof r.metadata === "object" && r.metadata) ? r.metadata : {};
        const refClean = normalizeHandle(String(meta.referrer_username || ""));
        const wallet = r.to_address || meta.referrer_wallet || walletMap.get(refClean) || "";
        return {
          id: r.payment_id,
          created_at: r.created_at,
          referrer_username: "@" + refClean,
          referred_username: String(meta.referred_username || "@pioneiro"),
          source_purpose: meta.source_purpose || "anuncio_mural",
          source_description: meta.source_description || "Comissão",
          source_amount_pi: Number(meta.source_amount_pi) || 0,
          commission_rate: Number(meta.commission_rate) || 0.20,
          amount_pi: Number(r.amount) || 0,
          status: String(r.status || "pending").toLowerCase(),
          wallet_address: wallet,
          requested_at: meta.requested_at || null,
          paid_at: meta.paid_at || null,
          paid_txid: meta.paid_txid || (r.status === "paid" ? r.txid : null),
        };
      });

      return jsonOk("ADMIN_COMMISSIONS_LIST", { commissions: list }, corsHeaders, 200);
    }

    if (action === "admin_mark_commission_paid") {
      const isAdmin = await verifyAdminOrFounder(supabase, accessToken, adminSecret);
      if (!isAdmin) {
        return jsonError("FORBIDDEN", "Acesso restrito ao administrador @hokage22b.", corsHeaders, 403);
      }

      const ids: string[] = Array.isArray(commissionIds)
        ? commissionIds.map((x: unknown) => String(x || "").trim()).filter(Boolean)
        : (paymentId ? [String(paymentId).trim()] : []);

      if (ids.length === 0) {
        return jsonError("MISSING_COMMISSION_IDS", "Informe o ID da comissão para marcar como paga.", corsHeaders, 400);
      }

      const cleanPaidTxid = payoutTxid ? String(payoutTxid).trim() : `payout_mainnet_${Date.now()}`;
      const paidAt = new Date().toISOString();

      const { data: rows } = await supabase
        .from("transacoes_pi")
        .select("payment_id, metadata")
        .eq("purpose", "affiliate_commission")
        .in("payment_id", ids);

      const updatedIds: string[] = [];
      if (Array.isArray(rows)) {
        for (const r of rows) {
          const oldMeta = (r && typeof r.metadata === "object" && r.metadata) ? r.metadata : {};
          const { data: updatedRow } = await supabase
            .from("transacoes_pi")
            .update({
              status: "paid",
              txid: cleanPaidTxid,
              metadata: {
                ...oldMeta,
                payout_status: "paid",
                paid_at: paidAt,
                paid_txid: cleanPaidTxid,
              },
            })
            .eq("payment_id", r.payment_id)
            .eq("purpose", "affiliate_commission")
            .select("payment_id")
            .maybeSingle();
          if (updatedRow?.payment_id) {
            updatedIds.push(updatedRow.payment_id);
          }
        }
      }

      if (updatedIds.length === 0) {
        return jsonError("COMMISSION_NOT_FOUND", "Nenhuma comissão elegível encontrada para os IDs informados.", corsHeaders, 404);
      }

      return jsonOk(
        "COMMISSION_MARKED_PAID",
        {
          updated_ids: updatedIds,
          paid_txid: cleanPaidTxid,
          paid_at: paidAt,
        },
        corsHeaders,
        200
      );
    }

    // ============================================================
    // BIBLIOTECA VITALÍCIA DO PIONEIRO (E-BOOKS PRIVADOS)
    // ============================================================
    if (action === "my_library") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      const ownedProducts = await getOwnedEbooksForUser(supabase, piUser.username, piUser.uid);
      return jsonOk(
        "LIBRARY_STATUS",
        {
          username: piUser.username,
          owned_products: ownedProducts,
        },
        corsHeaders,
        200
      );
    }

    if (action === "download_ebook") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      const cleanProd = String(productId || "").trim().toLowerCase();
      const cleanFormat = String(format || "pdf").trim().toLowerCase();

      const productFiles = EBOOK_VAULT_FILES[cleanProd];
      if (!productFiles || !productFiles[cleanFormat]) {
        return jsonError("EBOOK_FORMAT_NOT_FOUND", "Produto ou formato de arquivo inválido.", corsHeaders, 404);
      }

      const ownedProducts = await getOwnedEbooksForUser(supabase, piUser.username, piUser.uid);
      if (!ownedProducts.includes(cleanProd)) {
        return jsonError(
          "EBOOK_NOT_OWNED",
          `A conta ${piUser.username} ainda não possui compra confirmada para este e-book.`,
          corsHeaders,
          403
        );
      }

      const targetFile = productFiles[cleanFormat];
      const { data: signedData, error: signErr } = await supabase.storage
        .from(EBOOK_BUCKET)
        .createSignedUrl(targetFile.path, 120, { download: targetFile.downloadName });

      if (signErr || !signedData || !signedData.signedUrl) {
        return jsonError(
          "EBOOK_FILE_UNAVAILABLE",
          "O arquivo deste e-book ainda está sendo sincronizado no cofre privado. Tente novamente em instantes.",
          corsHeaders,
          404,
          { storage_error: signErr?.message || null }
        );
      }

      return jsonOk(
        "EBOOK_DOWNLOAD_READY",
        {
          product_id: cleanProd,
          format: cleanFormat,
          download_url: signedData.signedUrl,
          file_name: targetFile.downloadName,
          expires_in_seconds: 120,
        },
        corsHeaders,
        200
      );
    }

    if (action === "grant_ebook_access") {
      const isAdmin = await verifyAdminOrFounder(supabase, accessToken, adminSecret);
      if (!isAdmin) {
        return jsonError("FORBIDDEN", "Apenas o fundador @hokage22b pode conceder acesso manual P2P.", corsHeaders, 403);
      }

      const cleanTarget = normalizeHandle(String(targetUsername || ""));
      if (!cleanTarget) {
        return jsonError("INVALID_USERNAME", "Informe o @username do pioneiro comprador.", corsHeaders, 400);
      }

      const cleanProd = (String(productId || "").toLowerCase() === "pi-para-seu-negocio")
        ? "pi-para-seu-negocio"
        : "ia-na-pratica";
      const catalogItem = MURAL_CONFIG.products[cleanProd as "ia-na-pratica" | "pi-para-seu-negocio"];
      const grantPaymentId = `p2p_grant_${cleanProd}_${cleanTarget}`;
      const grantTxid = String(txid || `p2p_mainnet_${Date.now()}`);

      const { error: grantTxErr } = await supabase.from("transacoes_pi").upsert({
        payment_id: grantPaymentId,
        txid: grantTxid,
        amount: catalogItem.price_pi,
        status: "completed",
        purpose: "ebook",
        metadata: {
          type: "ebook",
          productId: cleanProd,
          pioneer_username: "@" + cleanTarget,
          granted_by: "@hokage22b",
          channel: "p2p_mainnet",
        },
        created_at: new Date().toISOString(),
      }, { onConflict: "payment_id" });

      if (grantTxErr) {
        return jsonError("DB_ERROR", "Não foi possível registrar a transação de liberação no banco.", corsHeaders, 500);
      }

      const { data: buyerProf } = await supabase
        .from("pioneiros")
        .select("uid")
        .ilike("username", "@" + cleanTarget)
        .maybeSingle();

      const { error: grantEntErr } = await supabase.from("ebook_entitlements").upsert({
        user_uid: buyerProf?.uid || null,
        username: "@" + cleanTarget,
        product_id: cleanProd,
        payment_id: grantPaymentId,
        granted_at: new Date().toISOString(),
      }, { onConflict: "username,product_id" });

      if (grantEntErr && grantEntErr.code !== "42P01") {
        console.warn("[Ebook Entitlement Warning]", grantEntErr.message);
      }

      const affiliateComm = await processAffiliateCommission(supabase, {
        paymentId: grantPaymentId,
        txid: grantTxid,
        paidAmount: catalogItem.price_pi,
        buyerUsername: "@" + cleanTarget,
        purpose: "ebook",
        description: `E-book: ${catalogItem.title} (P2P)`,
        fallbackRefCode: refCode ? String(refCode) : null,
      });

      await notifyAdmin({
        priority: "normal",
        tag: "E-BOOK P2P LIBERADO",
        title: `${catalogItem.title} → @${cleanTarget}`,
        lines: [
          `Comprador: @${cleanTarget}`,
          `Produto: ${catalogItem.title} (${catalogItem.price_pi} π)`,
          affiliateComm ? `Comissão gerada: +${(affiliateComm as Record<string, unknown>).amount || 0} π` : "Sem indicador vinculado",
        ],
        linkUrl: "https://hokage22b.com/admin",
        linkLabel: "Abrir Console Admin",
      });

      return jsonOk(
        "EBOOK_ACCESS_GRANTED",
        {
          username: "@" + cleanTarget,
          product_id: cleanProd,
          payment_id: grantPaymentId,
          affiliate_commission: affiliateComm,
        },
        corsHeaders,
        200
      );
    }

    if (action === "publish_free_ad") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      if (!piUser || !piUser.username) {
        return jsonError(
          "PI_AUTH_REQUIRED",
          "Conecte sua conta oficial no Pi Browser para publicar gratuitamente na Vila.",
          corsHeaders,
          401
        );
      }

      const cleanHandle = normalizeHandle(piUser.username);
      if (!cleanHandle) {
        return jsonError("INVALID_USERNAME", "Usuário Pi inválido.", corsHeaders, 400);
      }

      const payloadObj = (body && typeof body.adPayload === "object" && body.adPayload)
        ? (body.adPayload as Record<string, unknown>)
        : {};
      const title = String(payloadObj.title || "").trim().slice(0, 120);
      const description = String(payloadObj.description || "").trim().slice(0, 1000);
      if (title.length < 3 || description.length < 5) {
        return jsonError("INVALID_AD", "Informe título e descrição válidos para publicar na Vila.", corsHeaders, 400);
      }

      // Trava anti-spam: máximo 1 publicação gratuita nos últimos 7 dias (independente de status)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentFree } = await supabase
        .from("anuncios")
        .select("id, created_at")
        .eq("pioneer_username", "@" + cleanHandle)
        .eq("plan_tier", "gratis")
        .gte("created_at", sevenDaysAgo)
        .limit(1);

      if (recentFree && recentFree.length > 0) {
        return jsonError(
          "FREE_QUOTA_REACHED",
          "Você já utilizou sua publicação gratuita desta semana. Para publicar outra agora ou ganhar destaque, escolha Bronze (0.314 π) ou um Boost.",
          corsHeaders,
          429
        );
      }

      const adId = `free_${cleanHandle}_${crypto.randomUUID()}`;
      const rawCountry = String(payloadObj.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "GLOBAL";
      const rawPayMode = String(payloadObj.payment_modes || "pi").trim().toLowerCase();
      const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";
      const rawCat = String(payloadObj.category || "geral").trim().toLowerCase().slice(0, 40);
      const category = MURAL_CONFIG.categories.includes(rawCat) ? rawCat : "geral";
      const itemPrice = payloadObj.item_price ? String(payloadObj.item_price).trim().slice(0, 40) : null;
      const rawItemCurr = String(payloadObj.item_currency || "PI").trim().toUpperCase();
      const itemCurrency = (["PI", "BRL", "USD", "A_COMBINAR"].includes(rawItemCurr)) ? rawItemCurr : "PI";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from("anuncios").insert({
        id: adId,
        title,
        description,
        link_url: null,
        image_url: null,
        category,
        location: String(payloadObj.location || "Online / Global").slice(0, 60) || "Online / Global",
        country_code: rawCountry,
        payment_modes: paymentModes,
        item_price: itemPrice,
        item_currency: itemCurrency,
        pioneer_username: "@" + cleanHandle,
        pioneer_name: cleanHandle,
        plan_tier: "gratis",
        price_pi: 0,
        status: "ativo",
        expires_at: expiresAt,
      });

      if (insertErr) {
        return jsonError("DB_ERROR", "Não foi possível salvar sua publicação gratuita.", corsHeaders, 500);
      }

      await notifyAdmin({
        priority: "normal",
        tag: "VILA · GRÁTIS",
        title: `Nova publicação gratuita de @${cleanHandle}`,
        lines: [`Título: ${title}`, `Categoria: ${String(payloadObj.category || "geral")}`],
        linkUrl: "https://hokage22b.com/mural",
        linkLabel: "Abrir A Vila",
      });

      return jsonOk("FREE_AD_PUBLISHED", { id: adId, plan_tier: "gratis", price_pi: 0 }, corsHeaders, 200);
    }

    const PI_SERVER_API_KEY = Deno.env.get("PI_SERVER_API_KEY") || Deno.env.get("PI_API_KEY");
    if (!PI_SERVER_API_KEY) {
      return jsonError(
        "SERVER_CONFIG_ERROR",
        "PI_SERVER_API_KEY não configurada no Supabase Secrets.",
        corsHeaders,
        500
      );
    }

    if (!paymentId || typeof paymentId !== "string" || !SAFE_PAYMENT_ID_RE.test(paymentId)) {
      return jsonError("MISSING_PAYMENT_ID", "paymentId inválido ou ausente.", corsHeaders, 400);
    }

    const piApiBase = "https://api.minepi.com/v2";

    // 1. APROVAÇÃO DO PAGAMENTO (onReadyForServerApproval) — exige token Pi e valida dono + valor/rede
    if (action === "approve") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      if (!piUser || !piUser.uid) {
        return jsonError("PI_AUTH_REQUIRED", "Autenticação Pi Browser obrigatória para aprovar pagamento.", corsHeaders, 401);
      }

      const infoRes = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}`, {
        method: "GET",
        headers: { "Authorization": `Key ${PI_SERVER_API_KEY}` },
      });
      const paymentInfo = await infoRes.json().catch(() => ({}));
      if (!infoRes.ok || !paymentInfo || paymentInfo.user_uid !== piUser.uid) {
        return jsonError("FORBIDDEN", "Pagamento não pertence à conta Pi autenticada.", corsHeaders, 403);
      }
      if (Deno.env.get("PI_REJECT_TESTNET") === "true" && paymentInfo.network !== "Pi Network") {
        return jsonError("TESTNET_REJECTED", "Pagamentos Testnet não são aceitos em produção.", corsHeaders, 400);
      }

      const preMeta = (paymentInfo.metadata && typeof paymentInfo.metadata === "object") ? paymentInfo.metadata : {};
      const preAmount = Number(paymentInfo.amount) || 0;
      if (preMeta.type === "ebook") {
        const prodKey = String(preMeta.productId || preMeta.product_id || preMeta.product || "pi-para-seu-negocio").toLowerCase();
        const catItem = prodKey === "ia-na-pratica"
          ? MURAL_CONFIG.products["ia-na-pratica"]
          : MURAL_CONFIG.products["pi-para-seu-negocio"];
        if (preAmount + 0.0001 < catItem.price_pi) {
          return jsonError("PAYMENT_AMOUNT_MISMATCH", "Montante incompatível com o catálogo oficial.", corsHeaders, 400);
        }
      } else if (preMeta.adId && (preMeta.tier || preMeta.upgrade)) {
        const t = String(preMeta.upgrade || preMeta.tier).toLowerCase();
        const minPlan = t === "ouro"
          ? MURAL_CONFIG.plans.ouro.price_pi
          : (t === "prata" ? MURAL_CONFIG.plans.prata.price_pi : MURAL_CONFIG.plans.bronze.price_pi);
        if (preAmount + 0.0001 < minPlan) {
          return jsonError("PAYMENT_AMOUNT_MISMATCH", "Montante incompatível com o plano do Mural.", corsHeaders, 400);
        }
      }

      const response = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const data = await response.json().catch(() => ({}));
      console.log(`Pi Payment Approve [${paymentId}]: HTTP ${response.status}`, data);
      if (!response.ok) {
        return jsonError(
          "PI_APPROVE_FAILED",
          data?.error_message || data?.error || "Falha ao aprovar pagamento na Pi Network.",
          corsHeaders,
          response.status,
          { pi_response: data }
        );
      }
      return jsonOk("PAYMENT_APPROVED", { ...(typeof data === "object" && data ? data : {}) }, corsHeaders, 200);
    }

    // 2. CONCLUSÃO DO PAGAMENTO (onReadyForServerCompletion) — autenticado e idempotente
    if (action === "complete") {
      if (!txid || typeof txid !== "string" || !SAFE_PAYMENT_ID_RE.test(txid)) {
        return jsonError(
          "MISSING_TXID",
          "txid da transação blockchain inválido ou ausente.",
          corsHeaders,
          400
        );
      }

      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      if (!piUser || !piUser.uid || !piUser.username) {
        return jsonError("PI_AUTH_REQUIRED", "Autenticação Pi Browser obrigatória para concluir pagamento.", corsHeaders, 401);
      }

      // Idempotência estrita via consultas parametrizadas antes de qualquer efeito colateral
      const [{ data: recordedByPid }, { data: recordedByTx }] = await Promise.all([
        supabase
          .from("transacoes_pi")
          .select("payment_id, status")
          .eq("payment_id", paymentId)
          .eq("status", "completed")
          .limit(1),
        supabase
          .from("transacoes_pi")
          .select("payment_id, status")
          .eq("txid", txid)
          .eq("status", "completed")
          .limit(1),
      ]);

      if ((recordedByPid && recordedByPid.length > 0) || (recordedByTx && recordedByTx.length > 0)) {
        return jsonOk("PAYMENT_ALREADY_COMPLETED", { idempotent: true, payment_id: paymentId }, corsHeaders, 200);
      }

      // Conclui oficialmente o pagamento na Pi Core Team Platform API
      const response = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      let data = await response.json().catch(() => ({}));

      // Idempotência na Pi API: busca os dados do pagamento
      const isAlreadyCompleted = !response.ok && (
        (data?.error && String(data.error).includes("already_completed")) ||
        (data?.error_message && String(data.error_message).toLowerCase().includes("already"))
      );
      if (isAlreadyCompleted) {
        const getRes = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}`, {
          method: "GET",
          headers: { "Authorization": `Key ${PI_SERVER_API_KEY}` },
        });
        if (getRes.ok) {
          data = await getRes.json().catch(() => data);
        }
      }

      if ((response.ok || isAlreadyCompleted) && data) {
        if (data.user_uid && data.user_uid !== piUser.uid) {
          return jsonError("FORBIDDEN", "Pagamento não pertence à conta Pi autenticada.", corsHeaders, 403);
        }
        if (Deno.env.get("PI_REJECT_TESTNET") === "true" && data.network && data.network !== "Pi Network") {
          return jsonError("TESTNET_REJECTED", "Pagamentos Testnet não são aceitos em produção.", corsHeaders, 400);
        }
      }

      // Processamento contábil e ativação de serviços no Supabase
      if ((response.ok || isAlreadyCompleted) && data) {
        const paidAmount = Number(data.amount) || 0;
        const metadata = (data.metadata && typeof data.metadata === "object") ? { ...data.metadata } : {};
        const verifiedHandle = normalizeHandle(piUser.username);
        if (!verifiedHandle) {
          return jsonError("INVALID_USERNAME", "Usuário Pi inválido.", corsHeaders, 400);
        }
        metadata.pioneer_username = "@" + verifiedHandle;
        metadata.buyer_uid = piUser.uid;

        // A. Anti-Tampering: Validação estrita de montante mínimo por Tier Comercial (Ouro=3.14, Prata=1.00, Bronze=0.314)
        if (metadata.adId) {
          const { data: ad } = await supabase
            .from("anuncios")
            .select("id, pioneer_username, price_pi, plan_tier, status")
            .eq("id", metadata.adId)
            .maybeSingle();

          if (ad && ad.pioneer_username && normalizeHandle(ad.pioneer_username) !== verifiedHandle) {
            return jsonError("FORBIDDEN", "Você não tem permissão para alterar o anúncio de outro usuário.", corsHeaders, 403);
          }

          const rawTier = String(
            (ad && ad.plan_tier) ||
            (adPayload && adPayload.plan_tier) ||
            metadata.tier ||
            "bronze"
          ).toLowerCase();

          let expectedPrice = MURAL_CONFIG.plans.bronze.price_pi;
          if (metadata.action === "renew") {
            const renewTier = String(metadata.upgrade || metadata.tier || rawTier || "prata").toLowerCase();
            if (renewTier === "ouro") expectedPrice = MURAL_CONFIG.plans.ouro.price_pi;
            else if (renewTier === "bronze") expectedPrice = MURAL_CONFIG.plans.bronze.price_pi;
            else expectedPrice = MURAL_CONFIG.plans.prata.price_pi;
          } else {
            let tierPrice = MURAL_CONFIG.plans.bronze.price_pi;
            if (rawTier === "ouro") tierPrice = MURAL_CONFIG.plans.ouro.price_pi;
            else if (rawTier === "prata") tierPrice = MURAL_CONFIG.plans.prata.price_pi;

            const dbPrice = (ad && Number(ad.price_pi)) ? Number(ad.price_pi) : 0;
            expectedPrice = Math.max(tierPrice, dbPrice);
          }

          if (paidAmount + 0.0001 < expectedPrice) {
            console.error(`[Security Alert] Montante insuficiente: pago ${paidAmount} Pi, esperado ${expectedPrice} Pi (tier=${rawTier}).`);
            const msg = `Montante pago (${paidAmount} Pi) inferior ao plano selecionado (${expectedPrice} Pi).`;
            return jsonError(
              "PAYMENT_AMOUNT_MISMATCH",
              msg,
              corsHeaders,
              400,
              { security_rejected: true }
            );
          } else {
            // Todos os anúncios são permanentes (validade perpétua até 2099 para compatibilidade com triggers/RLS)
            const expiresAt = "2099-12-31T23:59:59.000Z";
            if (!ad && adPayload && typeof adPayload === "object") {
              // Cria e ativa o anúncio diretamente via service_role com TXID verificado (suporta foto Base64 até 350KB)
              const cleanTier = (rawTier === "ouro" || rawTier === "prata") ? rawTier : "bronze";
              const rawCountry = String(adPayload.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "GLOBAL";
              const rawPayMode = String(adPayload.payment_modes || "pi").trim().toLowerCase();
              const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";
              const rawCat = String(adPayload.category || "geral").trim().toLowerCase().slice(0, 40);
              const category = MURAL_CONFIG.categories.includes(rawCat) ? rawCat : "geral";
              const itemPrice = adPayload.item_price ? String(adPayload.item_price).trim().slice(0, 40) : null;
              const rawItemCurr = String(adPayload.item_currency || "PI").trim().toUpperCase();
              const itemCurrency = (["PI", "BRL", "USD", "A_COMBINAR"].includes(rawItemCurr)) ? rawItemCurr : "PI";
              const { error: adInsertErr } = await supabase.from("anuncios").insert({
                id: String(metadata.adId),
                title: String(adPayload.title || "").slice(0, 120),
                description: String(adPayload.description || "").slice(0, 1000),
                link_url: cleanTier !== "bronze" ? sanitizeHttpUrl(adPayload.link_url) : null,
                image_url: sanitizeAdImageUrl(adPayload.image_url),
                category,
                location: String(adPayload.location || "Online / Global").slice(0, 60) || "Online / Global",
                country_code: rawCountry,
                payment_modes: paymentModes,
                item_price: itemPrice,
                item_currency: itemCurrency,
                pioneer_username: "@" + verifiedHandle,
                pioneer_name: verifiedHandle,
                plan_tier: cleanTier,
                price_pi: paidAmount,
                status: "ativo",
                payment_txid: txid,
                pi_txid: txid,
                pi_payment_id: paymentId,
                expires_at: expiresAt,
              });
              if (adInsertErr && adInsertErr.code !== "23505") {
                return jsonError("DB_ERROR", "Falha ao registrar anúncio pago.", corsHeaders, 500);
              }
            } else if (ad) {
              // Ativa o anúncio existente com verificação de montante e propriedade aprovadas
              const { error: adUpdErr } = await supabase
                .from("anuncios")
                .update({
                  status: "ativo",
                  payment_txid: txid,
                  pi_txid: txid,
                  pi_payment_id: paymentId,
                  expires_at: expiresAt,
                })
                .eq("id", metadata.adId);
              if (adUpdErr) {
                return jsonError("DB_ERROR", "Falha ao ativar anúncio pago.", corsHeaders, 500);
              }
            }
          }
        } else if (metadata.type === "ebook") {
          // B. Validação de compra de E-book pelo Catálogo Oficial do Servidor (3.14 π ou 7.50 π)
          const rawProductId = String(metadata.productId || metadata.product_id || metadata.product || "pi-para-seu-negocio").toLowerCase();
          const catalogItem = (rawProductId === "ia-na-pratica")
            ? MURAL_CONFIG.products["ia-na-pratica"]
            : MURAL_CONFIG.products["pi-para-seu-negocio"];
          const expectedEbookPrice = catalogItem.price_pi;

          if (paidAmount + 0.0001 < expectedEbookPrice) {
            console.error(`[Security Alert] Montante insuficiente para E-book (${catalogItem.id}): pago ${paidAmount} Pi, esperado ${expectedEbookPrice} Pi.`);
            return jsonError(
              "PAYMENT_AMOUNT_MISMATCH",
              `Montante pago (${paidAmount} Pi) inferior ao preço oficial de ${catalogItem.title} (${expectedEbookPrice} Pi).`,
              corsHeaders,
              400,
              { security_rejected: true, product_id: catalogItem.id, expected_price_pi: expectedEbookPrice }
            );
          }

          metadata.productId = catalogItem.id;

          const { error: entErr } = await supabase.from("ebook_entitlements").upsert({
            user_uid: piUser.uid,
            username: "@" + verifiedHandle,
            product_id: catalogItem.id,
            payment_id: paymentId,
            granted_at: new Date().toISOString(),
          }, { onConflict: "username,product_id" });
          if (entErr && entErr.code !== "42P01") {
            console.warn("[Ebook Entitlement Warning]", entErr.message);
          }

          const { error: donErr } = await supabase
            .from("doacoes")
            .insert([{
              donor_identifier: "@" + verifiedHandle,
              currency: "PI",
              amount: paidAmount,
              status: "recebido"
            }]);
          if (donErr) {
            console.warn("[Doacoes Warning]", donErr.message);
          }
        }

        // C. Ledger Imutável de Transações (Idempotente)
        const txPurpose = metadata.type === "ebook" ? "ebook" : (metadata.adId ? "anuncio_mural" : "pagamento_geral");
        const { error: ledgerErr } = await supabase
          .from("transacoes_pi")
          .upsert({
            payment_id: paymentId,
            txid: txid || (data.transaction && data.transaction.txid) || null,
            from_address: data.from_address || null,
            to_address: data.to_address || null,
            amount: paidAmount,
            status: "completed",
            purpose: txPurpose,
            metadata: metadata,
            created_at: new Date().toISOString()
          }, { onConflict: "payment_id" });
        if (ledgerErr) {
          console.warn("[Ledger Warning] Erro ao registrar na tabela transacoes_pi:", ledgerErr.message);
        }

        // D. Motor de Comissão de Afiliados (20% Padrão / 25% Embaixador para Anúncios no Mural e E-books)
        let generatedComm: Record<string, unknown> | null = null;
        if (txPurpose === "anuncio_mural" || txPurpose === "ebook") {
          const buyerUser = "@" + verifiedHandle;
          const fallbackRef = String(
            refCode ||
            metadata.ref_code ||
            (adPayload && adPayload.ref_code) ||
            ""
          );
          const descLabel = txPurpose === "ebook"
            ? `E-book (${metadata.productId || "Catálogo"})`
            : `Anúncio no Mural (${String((adPayload && adPayload.plan_tier) || metadata.tier || "Destaque").toUpperCase()})`;

          generatedComm = await processAffiliateCommission(supabase, {
            paymentId: paymentId,
            txid: txid || (data.transaction && data.transaction.txid) || null,
            paidAmount: paidAmount,
            buyerUsername: buyerUser,
            buyerUid: piUser.uid,
            buyerWallet: data.from_address ? String(data.from_address) : null,
            purpose: txPurpose,
            description: descLabel,
            fallbackRefCode: fallbackRef || null,
          });
        }

        const buyerHandle = "@" + verifiedHandle;
        await notifyAdmin({
          priority: "high",
          tag: "PAGAMENTO PI",
          title: `${paidAmount} π recebido (${txPurpose === "ebook" ? "E-book" : "Mural"})`,
          lines: [
            `Comprador: ${buyerHandle}`,
            `Valor: ${paidAmount} π`,
            `TXID: ${txid || (data.transaction && data.transaction.txid) || paymentId}`,
            generatedComm ? `Comissão afiliado: +${generatedComm.amount || 0} π` : "",
          ],
          linkUrl: "https://hokage22b.com/admin",
          linkLabel: "Ver no Console Admin",
        });
      }

      if (!response.ok && !isAlreadyCompleted) {
        return jsonError(
          "PI_COMPLETE_FAILED",
          data?.error_message || data?.error || "Falha ao concluir pagamento na Pi Network.",
          corsHeaders,
          response.status,
          { pi_response: data }
        );
      }
      return jsonOk("PAYMENT_COMPLETED", { ...(typeof data === "object" && data ? data : {}) }, corsHeaders, 200);
    }

    // 3. CANCELAMENTO DO PAGAMENTO (onCancel ou limpeza de pendência com idempotência)
    if (action === "cancel") {
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      if (!piUser || !piUser.uid) {
        return jsonError("PI_AUTH_REQUIRED", "Autenticação Pi Browser obrigatória para cancelar pagamento.", corsHeaders, 401);
      }

      const infoRes = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}`, {
        method: "GET",
        headers: { "Authorization": `Key ${PI_SERVER_API_KEY}` },
      });
      if (infoRes.ok) {
        const paymentInfo = await infoRes.json().catch(() => ({}));
        if (paymentInfo && paymentInfo.user_uid && paymentInfo.user_uid !== piUser.uid) {
          return jsonError("FORBIDDEN", "Você não tem permissão para cancelar pagamento de outro usuário.", corsHeaders, 403);
        }
      }

      const response = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const data = await response.json().catch(() => ({}));

      // Se a Pi Network responder que já foi cancelado ou não encontrado, trata como sucesso (idempotente)
      const isAlreadyCancelled = !response.ok && (
        (data && data.error && (typeof data.error === "string") && (data.error.includes("already_cancelled") || data.error.includes("not_found") || data.error.includes("expired"))) ||
        (data && data.error_message && (typeof data.error_message === "string") && (data.error_message.includes("already") || data.error_message.includes("cancelled") || data.error_message.includes("canceled") || data.error_message.includes("expired")))
      );

      if (isAlreadyCancelled) {
        return jsonOk(
          "PAYMENT_ALREADY_CANCELLED",
          { status: "cancelled", message: "Pagamento já cancelado ou expirado na Pi Network.", data },
          corsHeaders,
          200
        );
      }

      if (!response.ok) {
        return jsonError(
          "PI_CANCEL_FAILED",
          data?.error_message || data?.error || "Falha ao cancelar pagamento na Pi Network.",
          corsHeaders,
          response.status,
          { pi_response: data }
        );
      }
      return jsonOk("PAYMENT_CANCELLED", { status: "cancelled", ...(typeof data === "object" && data ? data : {}) }, corsHeaders, 200);
    }

    return jsonError("INVALID_ACTION", "Ação inválida.", corsHeaders, 400);
  } catch (err) {
    if (err instanceof HttpPayloadError) {
      return jsonError(err.code, err.message, corsHeaders, err.status);
    }
    const msg = err && err.message ? String(err.message) : "Erro interno ao processar pagamento.";
    return jsonError("PAYMENT_INTERNAL_ERROR", msg, corsHeaders, 500);
  }
});
