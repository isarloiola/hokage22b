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
    const { action, paymentId, txid, adPayload, accessToken, productId, format, targetUsername } = body;

    // Endpoint de catálogo/preços oficial (para consulta Agent-Ready)
    if (action === "get_catalog") {
      return jsonOk("PAYMENT_CATALOG", { catalog: MURAL_CONFIG }, corsHeaders, 200);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      const piUser = await verifyPiAccessToken(String(accessToken || ""));
      if (normalizeHandle(piUser.username) !== "hokage22b") {
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

      await supabase.from("transacoes_pi").upsert({
        payment_id: grantPaymentId,
        txid: String(txid || `p2p_mainnet_${Date.now()}`),
        amount: catalogItem.price_pi,
        status: "completed",
        purpose: "ebook",
        metadata: {
          type: "ebook",
          productId: cleanProd,
          pioneer_username: "@" + cleanTarget,
          granted_by: piUser.username,
          channel: "p2p_mainnet",
        },
        created_at: new Date().toISOString(),
      }, { onConflict: "payment_id" });

      return jsonOk(
        "EBOOK_ACCESS_GRANTED",
        {
          username: "@" + cleanTarget,
          product_id: cleanProd,
          payment_id: grantPaymentId,
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
            expectedPrice = (metadata.upgrade === "ouro")
              ? MURAL_CONFIG.plans.ouro.price_pi
              : MURAL_CONFIG.plans.prata.price_pi;
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
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
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
                image_url: cleanTier !== "bronze" ? sanitizeAdImageUrl(adPayload.image_url) : null,
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
              purpose: metadata.type || (metadata.adId ? "anuncio_mural" : "pagamento_geral"),
              metadata: metadata,
              created_at: new Date().toISOString()
            }, { onConflict: "payment_id" });
        } catch (ledgerErr) {
          console.warn("[Ledger Warning] Erro ao registrar na tabela transacoes_pi:", ledgerErr);
        }
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
