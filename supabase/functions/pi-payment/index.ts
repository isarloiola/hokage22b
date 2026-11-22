// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Network Payment Server & E-book Vault
// Endpoint seguro para aprovar, validar montantes, completar pagamentos na Pi Network
// e liberar downloads vitalícios de E-books via Signed URLs (Bucket Privado)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  HttpPayloadError,
  jsonError,
  jsonOk,
  MURAL_CONFIG,
  parseJsonBody,
} from "../_shared/http.ts";
import { normalizeHandle, verifyPiAccessToken } from "../_shared/pi-auth.ts";
import { notifyAdmin } from "../_shared/notify.ts";

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

function sanitizeAdImageUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) {
    return trimmed.length <= 350000 ? trimmed : null;
  }
  return trimmed.slice(0, 500);
}

async function getOwnedEbooksForUser(supabase: any, username: string): Promise<string[]> {
  const clean = normalizeHandle(username);
  if (!clean) return [];

  // O fundador @hokage22b sempre possui acesso vitalício a todo o catálogo editorial
  if (clean === "hokage22b") {
    return ["ia-na-pratica", "pi-para-seu-negocio"];
  }

  const { data: rows } = await supabase
    .from("transacoes_pi")
    .select("payment_id, amount, status, purpose, metadata")
    .eq("status", "completed")
    .eq("purpose", "ebook");

  const owned = new Set<string>();
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const meta = (row && typeof row.metadata === "object" && row.metadata) ? row.metadata : {};
      const buyer = normalizeHandle(String(meta.pioneer_username || meta.buyer_username || ""));
      if (buyer && buyer === clean) {
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
  const corsHeaders = getCorsHeaders(req, false);

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

    // Notificação de novo Lead / Lista de Espera / Proposta Comercial
    if (action === "notify_lead") {
      const leadName = String(body?.name || "Pioneiro").trim().slice(0, 80);
      const leadEmail = String(body?.email || "").trim().slice(0, 120);
      const leadSource = String(body?.source || "site").trim().slice(0, 60);
      const leadPiUser = String(body?.pi_username || "").trim().slice(0, 60);
      if (!leadEmail || !leadEmail.includes("@")) {
        return jsonError("INVALID_LEAD", "E-mail inválido.", corsHeaders, 400);
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================================
    // PAINEL DE AFILIADOS & COMISSÕES EM PI (20% PADRÃO / 25% EMBAIXADOR)
    // ============================================================
    if (action === "affiliate_summary") {
      let cleanUser = normalizeHandle(String(username || targetUsername || ""));
      let isVerifiedOwner = false;

      if (accessToken && String(accessToken).trim()) {
        try {
          const piUser = await verifyPiAccessToken(String(accessToken));
          const tokenHandle = normalizeHandle(piUser.username);
          if (!cleanUser) cleanUser = tokenHandle;
          if (tokenHandle && tokenHandle === cleanUser) {
            isVerifiedOwner = true;
          }
        } catch (_) {}
      }

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
        .order("created_at", { ascending: false });

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

      const { data: rows } = await supabase
        .from("transacoes_pi")
        .select("payment_id, amount, status, metadata")
        .eq("purpose", "affiliate_commission")
        .eq("status", "pending");

      const targetIds: string[] = [];
      let pendingSum = 0;

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
      for (const id of targetIds) {
        const row = rows!.find((x: any) => x.payment_id === id);
        const oldMeta = (row && typeof row.metadata === "object" && row.metadata) ? row.metadata : {};
        await supabase
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
          .eq("payment_id", id);
      }

      await notifyAdmin({
        priority: "high",
        tag: "SAQUE SOLICITADO",
        title: `@${cleanUser} pediu saque de ${pendingSum.toFixed(4)} π`,
        lines: [
          `Afiliado: @${cleanUser}`,
          `Valor pendente: ${pendingSum.toFixed(4)} π (${targetIds.length} comissões)`,
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
          commissions_count: targetIds.length,
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
        .in("payment_id", ids);

      if (Array.isArray(rows)) {
        for (const r of rows) {
          const oldMeta = (r && typeof r.metadata === "object" && r.metadata) ? r.metadata : {};
          await supabase
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
            .eq("payment_id", r.payment_id);
        }
      }

      return jsonOk(
        "COMMISSION_MARKED_PAID",
        {
          updated_ids: ids,
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
      const ownedProducts = await getOwnedEbooksForUser(supabase, piUser.username);
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

      const ownedProducts = await getOwnedEbooksForUser(supabase, piUser.username);
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
        .createSignedUrl(targetFile.path, 3600, { download: targetFile.downloadName });

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
          expires_in_seconds: 3600,
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

      await supabase.from("transacoes_pi").upsert({
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

    const PI_SERVER_API_KEY = Deno.env.get("PI_SERVER_API_KEY") || Deno.env.get("PI_API_KEY");
    if (!PI_SERVER_API_KEY) {
      return jsonError(
        "SERVER_CONFIG_ERROR",
        "PI_SERVER_API_KEY não configurada no Supabase Secrets.",
        corsHeaders,
        500
      );
    }

    if (!paymentId || typeof paymentId !== "string") {
      return jsonError("MISSING_PAYMENT_ID", "paymentId é obrigatório.", corsHeaders, 400);
    }

    const piApiBase = "https://api.minepi.com/v2";

    // 1. APROVAÇÃO DO PAGAMENTO (onReadyForServerApproval)
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

      const payloadObj = (rawBody && typeof rawBody.adPayload === "object" && rawBody.adPayload)
        ? (rawBody.adPayload as Record<string, unknown>)
        : {};
      const title = String(payloadObj.title || "").trim().slice(0, 120);
      const description = String(payloadObj.description || "").trim().slice(0, 600);
      if (title.length < 3 || description.length < 5) {
        return jsonError("INVALID_AD", "Informe título e descrição válidos para publicar na Vila.", corsHeaders, 400);
      }

      // Trava anti-spam: máximo 1 publicação gratuita ativa a cada 7 dias por conta Pi
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentFree } = await supabase
        .from("anuncios")
        .select("id, created_at")
        .eq("pioneer_username", "@" + cleanHandle)
        .eq("plan_tier", "gratis")
        .eq("status", "ativo")
        .gte("created_at", sevenDaysAgo)
        .limit(1);

      if (recentFree && recentFree.length > 0) {
        return jsonError(
          "FREE_QUOTA_REACHED",
          "Você já possui uma publicação gratuita ativa esta semana. Para publicar outra agora ou ganhar destaque, escolha Bronze (0.314 π) ou um Boost.",
          corsHeaders,
          429
        );
      }

      const adId = String(payloadObj.id || `free_${cleanHandle}_${Date.now()}`).slice(0, 80);
      const rawCountry = String(payloadObj.country_code || "GLOBAL").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "GLOBAL";
      const rawPayMode = String(payloadObj.payment_modes || "pi").trim().toLowerCase();
      const paymentModes = (["pi", "pi_fiat", "fiat", "pi_reais", "reais"].includes(rawPayMode)) ? rawPayMode : "pi";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertErr } = await supabase.from("anuncios").upsert({
        id: adId,
        title,
        description,
        link_url: null,
        image_url: null,
        category: String(payloadObj.category || "geral").slice(0, 40),
        location: String(payloadObj.location || "Online / Global").slice(0, 60) || "Online / Global",
        country_code: rawCountry,
        payment_modes: paymentModes,
        pioneer_username: "@" + cleanHandle,
        pioneer_name: cleanHandle,
        plan_tier: "gratis",
        price_pi: 0,
        status: "ativo",
        expires_at: expiresAt,
      }, { onConflict: "id" });

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

    if (action === "approve") {
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

    // 2. CONCLUSÃO DO PAGAMENTO (onReadyForServerCompletion)
    if (action === "complete") {
      if (!txid || typeof txid !== "string") {
        return jsonError(
          "MISSING_TXID",
          "txid da transação blockchain é obrigatório para conclusão.",
          corsHeaders,
          400
        );
      }

      // Conclui oficialmente o pagamento na Pi Core Team Platform API IMEDIATAMENTE
      const response = await fetch(`${piApiBase}/payments/${encodeURIComponent(paymentId)}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      let data = await response.json().catch(() => ({}));

      // Idempotência: se a Pi Network informar que o pagamento já foi completado anteriormente, busca os dados do pagamento
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

      // Processamento contábil e ativação de serviços no Supabase
      if ((response.ok || isAlreadyCompleted) && data) {
        const paidAmount = Number(data.amount) || 0;
        const metadata = data.metadata || {};

        // A. Anti-Tampering: Validação estrita de montante mínimo por Tier Comercial (Ouro=3.14, Prata=1.00, Bronze=0.314)
        if (metadata.adId) {
          const { data: ad } = await supabase
            .from("anuncios")
            .select("id, price_pi, plan_tier, status")
            .eq("id", metadata.adId)
            .maybeSingle();

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
              await supabase.from("anuncios").upsert({
                id: String(metadata.adId),
                title: String(adPayload.title || "").slice(0, 120),
                description: String(adPayload.description || "").slice(0, 600),
                link_url: cleanTier !== "bronze" && adPayload.link_url ? String(adPayload.link_url).slice(0, 500) : null,
                image_url: sanitizeAdImageUrl(adPayload.image_url),
                category: String(adPayload.category || "geral").slice(0, 40),
                location: String(adPayload.location || "Online / Global").slice(0, 60) || "Online / Global",
                country_code: rawCountry,
                payment_modes: paymentModes,
                pioneer_username: String(adPayload.pioneer_username || metadata.pioneer_username || "@pioneiro").slice(0, 60),
                pioneer_name: String(adPayload.pioneer_name || metadata.pioneer_username || "pioneiro").replace(/^@+/, "").slice(0, 60),
                plan_tier: cleanTier,
                price_pi: paidAmount,
                status: "ativo",
                payment_txid: txid,
                pi_txid: txid,
                pi_payment_id: paymentId,
                expires_at: expiresAt,
              }, { onConflict: "id" });
            } else if (ad) {
              // Ativa o anúncio existente com verificação de montante aprovada
              await supabase
                .from("anuncios")
                .update({
                  status: "ativo",
                  payment_txid: txid,
                  pi_txid: txid,
                  pi_payment_id: paymentId,
                  expires_at: expiresAt,
                })
                .eq("id", metadata.adId);
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

          await supabase
            .from("doacoes")
            .insert([{
              donor_identifier: metadata.pioneer_username || "Pioneiro Pi",
              currency: "PI",
              amount: paidAmount,
              status: "recebido"
            }]);
        }

        // C. Ledger Imutável de Transações (Idempotente)
        const txPurpose = metadata.type === "ebook" ? "ebook" : (metadata.adId ? "anuncio_mural" : "pagamento_geral");
        try {
          await supabase
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
        } catch (ledgerErr) {
          console.warn("[Ledger Warning] Erro ao registrar na tabela transacoes_pi:", ledgerErr);
        }

        // D. Motor de Comissão de Afiliados (20% Padrão / 25% Embaixador para Anúncios no Mural e E-books)
        let generatedComm: Record<string, unknown> | null = null;
        if (txPurpose === "anuncio_mural" || txPurpose === "ebook") {
          const buyerUser = String(
            (adPayload && adPayload.pioneer_username) ||
            metadata.pioneer_username ||
            ""
          );
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
            buyerUid: data.user_uid ? String(data.user_uid) : null,
            buyerWallet: data.from_address ? String(data.from_address) : null,
            purpose: txPurpose,
            description: descLabel,
            fallbackRefCode: fallbackRef || null,
          });
        }

        const buyerHandle = String(
          (adPayload && adPayload.pioneer_username) ||
          metadata.pioneer_username ||
          "@pioneiro"
        );
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
