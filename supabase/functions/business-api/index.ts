// ============================================================
// HOKAGE22B.COM — Supabase Edge Function: Hokage Business API
// Motor Não-Custodial de Utilidade Comercial (Pi Testnet -> Pi DEX Mainnet)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getCorsHeaders,
  HttpPayloadError,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "../_shared/http.ts";
import { normalizeHandle, RESERVED_HANDLES, resolveActor } from "../_shared/pi-auth.ts";

function isValidPiPublicKey(address: string): boolean {
  const clean = String(address || "").trim();
  if (!/^G[A-Z2-7]{55}$/.test(clean)) return false;
  try {
    const RFC4648 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (let i = 0; i < clean.length; i++) {
      const idx = RFC4648.indexOf(clean[i]);
      if (idx === -1) return false;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    if (bytes.length !== 35 || bytes[0] !== 48) return false;
    let crc = 0x0000;
    for (let j = 0; j < 33; j++) {
      let code = (crc >>> 8) & 0xff;
      code ^= bytes[j] & 0xff;
      code ^= code >>> 4;
      crc = (crc << 8) & 0xffff;
      crc ^= code;
      code = (code << 5) & 0xffff;
      crc ^= code;
      code = (code << 7) & 0xffff;
      crc ^= code;
    }
    const expectedCrc = bytes[33] | (bytes[34] << 8);
    return crc === expectedCrc;
  } catch (_) {
    return false;
  }
}

function getHorizonBaseUrl(network: string): string {
  if (network === "mainnet") {
    return Deno.env.get("PI_MAINNET_HORIZON_URL") || "https://api.mainnet.minepi.com";
  }
  return Deno.env.get("PI_TESTNET_HORIZON_URL") || "https://api.testnet.minepi.com";
}

function sanitizeOptionalUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    return trimmed.slice(0, 300);
  }
  return null;
}

function sanitizeSlug(raw: unknown): string {
  const s = normalizeHandle(String(raw || ""))
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

function generateShortCode(prefix: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");
  return `${prefix}-${hex.slice(0, 6)}`;
}

async function fetchHorizonJson(url: string): Promise<Record<string, any>> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) {
    throw new HttpPayloadError("HORIZON_NOT_FOUND", "Registro não encontrado na blockchain Pi para esta rede.", 404);
  }
  if (!res.ok) {
    throw new HttpPayloadError("HORIZON_UNAVAILABLE", "Não foi possível consultar a rede Pi no momento.", 502);
  }
  return await res.json();
}

function matchAssetBalance(
  balances: Array<Record<string, any>>,
  assetCode: string,
  issuerAddress: string
): number {
  const codeUpper = assetCode.toUpperCase();
  for (const b of balances) {
    if (b.asset_type === "native" && (codeUpper === "PI" || codeUpper === "TESTPI")) {
      return Number(b.balance || 0);
    }
    if (
      String(b.asset_code || "").toUpperCase() === codeUpper &&
      String(b.asset_issuer || "").trim() === issuerAddress
    ) {
      return Number(b.balance || 0);
    }
  }
  return 0;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req, false);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonError("SERVER_CONFIG_ERROR", "Configuração do servidor incompleta.", corsHeaders, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = (url.searchParams.get("action") || "list").trim().toLowerCase();

      if (action === "list") {
        const q = (url.searchParams.get("q") || "").trim().toLowerCase();
        const category = (url.searchParams.get("category") || "").trim().toLowerCase();
        const levelParam = Number(url.searchParams.get("level") || 0);
        const networkParam = (url.searchParams.get("network") || "").trim().toLowerCase();

        let query = supabase
          .from("v_hb_businesses_public")
          .select("*")
          .order("verification_level", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(60);

        if (category && category !== "todos") {
          query = query.eq("category", category);
        }
        if (levelParam >= 1 && levelParam <= 3) {
          query = query.gte("verification_level", levelParam);
        }
        if (networkParam === "testnet" || networkParam === "mainnet") {
          query = query.eq("token_network", networkParam);
        }

        const { data: rows, error } = await query;
        if (error) {
          throw new HttpPayloadError("DB_LIST_ERROR", "Falha ao listar empresas do Hokage Business.", 500);
        }

        const filtered = (rows || []).filter((r: Record<string, any>) => {
          if (!q) return true;
          const hay = [r.name, r.slug, r.tagline, r.category, r.asset_code, r.owner_username, r.city_region]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });

        const bizIds = filtered.map((r: Record<string, any>) => r.id).filter(Boolean);
        let benefitsByBiz: Record<string, Array<Record<string, any>>> = {};
        if (bizIds.length > 0) {
          const { data: benefits } = await supabase
            .from("hb_benefits")
            .select("id, business_id, token_id, mode, title, description, required_amount, reward_type, redemptions_count")
            .in("business_id", bizIds)
            .eq("active", true)
            .order("created_at", { ascending: true });
          for (const bf of benefits || []) {
            if (!benefitsByBiz[bf.business_id]) benefitsByBiz[bf.business_id] = [];
            benefitsByBiz[bf.business_id].push(bf);
          }
        }

        const enriched = filtered.map((r: Record<string, any>) => ({
          ...r,
          benefits: benefitsByBiz[r.id] || [],
        }));

        return jsonOk("BUSINESS_LIST_OK", { businesses: enriched, total: enriched.length }, corsHeaders);
      }

      if (action === "detail") {
        const slug = sanitizeSlug(url.searchParams.get("slug") || "");
        if (!slug) {
          throw new HttpPayloadError("MISSING_SLUG", "Informe o slug da empresa.", 400);
        }
        const { data: biz, error } = await supabase
          .from("v_hb_businesses_public")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          throw new HttpPayloadError("DB_DETAIL_ERROR", "Falha ao carregar empresa.", 500);
        }
        if (!biz) {
          throw new HttpPayloadError("BUSINESS_NOT_FOUND", "Empresa não encontrada.", 404);
        }

        const { data: benefits } = await supabase
          .from("hb_benefits")
          .select("id, business_id, token_id, mode, title, description, required_amount, reward_type, redemptions_count")
          .eq("business_id", biz.id)
          .eq("active", true)
          .order("created_at", { ascending: true });

        return jsonOk("BUSINESS_DETAIL_OK", { business: { ...biz, benefits: benefits || [] } }, corsHeaders);
      }

      if (action === "eligibility") {
        const benefitId = (url.searchParams.get("benefit_id") || "").trim();
        const wallet = (url.searchParams.get("wallet") || "").trim();
        if (!benefitId || !isValidPiPublicKey(wallet)) {
          throw new HttpPayloadError("INVALID_ELIGIBILITY_PARAMS", "Informe um benefit_id e uma carteira Pi (G...) válida.", 400);
        }

        const { data: benefit, error: bfErr } = await supabase
          .from("hb_benefits")
          .select("id, mode, title, required_amount, reward_type, reward_payload, token_id, active")
          .eq("id", benefitId)
          .maybeSingle();

        if (bfErr || !benefit || !benefit.active) {
          throw new HttpPayloadError("BENEFIT_NOT_FOUND", "Benefício não encontrado ou inativo.", 404);
        }

        const { data: token, error: tkErr } = await supabase
          .from("hb_tokens")
          .select("network, asset_code, issuer_address")
          .eq("id", benefit.token_id)
          .maybeSingle();

        if (tkErr || !token) {
          throw new HttpPayloadError("TOKEN_NOT_FOUND", "Token vinculado não encontrado.", 404);
        }

        const horizonBase = getHorizonBaseUrl(token.network);
        const accountJson = await fetchHorizonJson(`${horizonBase}/accounts/${encodeURIComponent(wallet)}`);
        const balances = Array.isArray(accountJson?.balances) ? accountJson.balances : [];
        const currentBalance = matchAssetBalance(balances, token.asset_code, token.issuer_address);
        const requiredAmount = Number(benefit.required_amount || 0);
        const eligible = currentBalance >= requiredAmount;

        return jsonOk(
          "ELIGIBILITY_CHECK_OK",
          {
            eligible,
            current_balance: currentBalance,
            required_amount: requiredAmount,
            asset_code: token.asset_code,
            network: token.network,
            mode: benefit.mode,
            benefit_title: benefit.title,
            reward_payload: eligible ? benefit.reward_payload : {},
          },
          corsHeaders
        );
      }

      throw new HttpPayloadError("UNKNOWN_ACTION", "Ação GET não suportada.", 400);
    }

    if (req.method !== "POST") {
      return jsonError("METHOD_NOT_ALLOWED", "Método HTTP não suportado.", corsHeaders, 405);
    }

    const body = await parseJsonBody(req, 64 * 1024);
    const action = String(body.action || "").trim();
    const payload = (body.payload && typeof body.payload === "object") ? body.payload : {};

    const actor = await resolveActor(supabase, {
      accessToken: body.accessToken,
      web2Token: body.web2Token,
      requireExistingProfile: true,
    });

    if (action === "create_business") {
      const name = String(payload.name || "").trim().slice(0, 80);
      const slug = sanitizeSlug(payload.slug || name);
      const walletAddress = String(payload.wallet_address || "").trim();
      const category = String(payload.category || "servicos").trim().toLowerCase().slice(0, 40);
      const tagline = String(payload.tagline || "").trim().slice(0, 140) || null;
      const description = String(payload.description || "").trim().slice(0, 800) || null;
      const cityRegion = String(payload.city_region || "").trim().slice(0, 80) || null;
      const countryCode = String(payload.country_code || "BR").trim().toUpperCase().slice(0, 8) || "BR";
      const websiteUrl = sanitizeOptionalUrl(payload.website_url);
      const whatsappUrl = sanitizeOptionalUrl(payload.whatsapp_url);

      if (name.length < 3) {
        throw new HttpPayloadError("INVALID_NAME", "Nome da empresa deve ter pelo menos 3 caracteres.", 400);
      }
      if (!/^[a-z0-9-]{3,40}$/.test(slug) || RESERVED_HANDLES.has(slug)) {
        throw new HttpPayloadError("INVALID_SLUG", "Slug inválido ou reservado. Use 3-40 letras, números ou hífen.", 400);
      }
      if (!isValidPiPublicKey(walletAddress)) {
        throw new HttpPayloadError("INVALID_WALLET", "Informe uma chave pública Pi (G...) válida com 56 caracteres.", 400);
      }

      const { data: existingSlug } = await supabase
        .from("hb_businesses")
        .select("id, owner_uid")
        .eq("slug", slug)
        .maybeSingle();

      if (existingSlug && existingSlug.owner_uid !== actor.uid) {
        throw new HttpPayloadError("SLUG_TAKEN", "Este identificador de empresa já está em uso.", 409);
      }

      if (existingSlug) {
        const { data: updated, error: upErr } = await supabase
          .from("hb_businesses")
          .update({
            name,
            tagline,
            description,
            category,
            city_region: cityRegion,
            country_code: countryCode,
            wallet_address: walletAddress,
            website_url: websiteUrl,
            whatsapp_url: whatsappUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSlug.id)
          .select("*")
          .single();
        if (upErr) throw new HttpPayloadError("UPDATE_FAILED", "Falha ao atualizar empresa.", 500);
        return jsonOk("BUSINESS_UPDATED", { business: updated }, corsHeaders);
      }

      const { data: inserted, error: insErr } = await supabase
        .from("hb_businesses")
        .insert({
          owner_uid: actor.uid,
          owner_username: actor.username,
          slug,
          name,
          tagline,
          description,
          category,
          city_region: cityRegion,
          country_code: countryCode,
          wallet_address: walletAddress,
          website_url: websiteUrl,
          whatsapp_url: whatsappUrl,
          verification_level: 1,
          plan_tier: "free",
          status: "active",
        })
        .select("*")
        .single();

      if (insErr) {
        throw new HttpPayloadError("CREATE_FAILED", "Falha ao cadastrar empresa.", 500);
      }
      return jsonOk("BUSINESS_CREATED", { business: inserted }, corsHeaders, 201);
    }

    if (action === "register_token") {
      const businessId = String(payload.business_id || "").trim();
      const network = payload.network === "mainnet" ? "mainnet" : "testnet";
      const assetCode = String(payload.asset_code || "").trim().toUpperCase();
      const issuerAddress = String(payload.issuer_address || "").trim();
      const dexPoolId = String(payload.dex_pool_id || "").trim().slice(0, 80) || null;
      const utilitySummary = String(payload.utility_summary || "").trim().slice(0, 400);
      const maxSupply = payload.max_supply ? Number(payload.max_supply) : null;

      const { data: biz } = await supabase
        .from("hb_businesses")
        .select("id, owner_uid")
        .eq("id", businessId)
        .maybeSingle();

      if (!biz || biz.owner_uid !== actor.uid) {
        throw new HttpPayloadError("FORBIDDEN", "Você não tem permissão para configurar este negócio.", 403);
      }
      if (!/^[A-Z0-9]{2,12}$/.test(assetCode)) {
        throw new HttpPayloadError("INVALID_ASSET_CODE", "Código do token deve ter 2 a 12 caracteres alfanuméricos.", 400);
      }
      if (!isValidPiPublicKey(issuerAddress)) {
        throw new HttpPayloadError("INVALID_ISSUER", "Endereço emissor (G...) inválido.", 400);
      }
      if (utilitySummary.length < 10) {
        throw new HttpPayloadError("INVALID_UTILITY", "Descreva a utilidade comercial do token (mín. 10 caracteres).", 400);
      }

      const { data: tokenRow, error: tkErr } = await supabase
        .from("hb_tokens")
        .upsert(
          {
            business_id: biz.id,
            network,
            asset_code: assetCode,
            issuer_address: issuerAddress,
            dex_pool_id: dexPoolId,
            max_supply: maxSupply && maxSupply > 0 ? maxSupply : null,
            utility_summary: utilitySummary,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "network,asset_code,issuer_address" }
        )
        .select("*")
        .single();

      if (tkErr) {
        throw new HttpPayloadError("TOKEN_SAVE_FAILED", "Não foi possível registrar o token (verifique se já pertence a outra empresa).", 409);
      }
      return jsonOk("TOKEN_REGISTERED", { token: tokenRow }, corsHeaders);
    }

    if (action === "create_benefit") {
      const businessId = String(payload.business_id || "").trim();
      const tokenId = String(payload.token_id || "").trim();
      const mode = payload.mode === "hold_unlock" ? "hold_unlock" : "transfer_redeem";
      const title = String(payload.title || "").trim().slice(0, 120);
      const description = String(payload.description || "").trim().slice(0, 400) || null;
      const requiredAmount = Number(payload.required_amount || 0);
      const allowedRewardTypes = new Set(["voucher", "ebook", "vila_boost", "vip_access", "discount"]);
      const rewardType = allowedRewardTypes.has(String(payload.reward_type || "")) ? String(payload.reward_type) : "voucher";

      const { data: biz } = await supabase
        .from("hb_businesses")
        .select("id, owner_uid, plan_tier")
        .eq("id", businessId)
        .maybeSingle();

      if (!biz || biz.owner_uid !== actor.uid) {
        throw new HttpPayloadError("FORBIDDEN", "Você não tem permissão neste negócio.", 403);
      }
      if (title.length < 4 || !(requiredAmount > 0)) {
        throw new HttpPayloadError("INVALID_BENEFIT", "Informe um título válido e quantidade maior que zero.", 400);
      }

      if (biz.plan_tier !== "pro") {
        const { count } = await supabase
          .from("hb_benefits")
          .select("id", { count: "exact", head: true })
          .eq("business_id", biz.id)
          .eq("active", true);
        if ((count || 0) >= 3) {
          throw new HttpPayloadError("FREE_PLAN_LIMIT", "Plano gratuito permite até 3 benefícios ativos. Faça upgrade para Pro para benefícios ilimitados.", 403);
        }
      }

      const { data: benefit, error: bfErr } = await supabase
        .from("hb_benefits")
        .insert({
          business_id: biz.id,
          token_id: tokenId,
          mode,
          title,
          description,
          required_amount: requiredAmount,
          reward_type: rewardType,
          active: true,
        })
        .select("*")
        .single();

      if (bfErr) {
        throw new HttpPayloadError("BENEFIT_CREATE_FAILED", "Falha ao criar benefício.", 500);
      }
      return jsonOk("BENEFIT_CREATED", { benefit }, corsHeaders, 201);
    }

    if (action === "create_redemption_intent") {
      const benefitId = String(payload.benefit_id || "").trim();
      const { data: benefit } = await supabase
        .from("hb_benefits")
        .select("id, business_id, token_id, mode, title, required_amount, active")
        .eq("id", benefitId)
        .maybeSingle();

      if (!benefit || !benefit.active) {
        throw new HttpPayloadError("BENEFIT_NOT_FOUND", "Benefício não encontrado ou inativo.", 404);
      }
      if (benefit.mode !== "transfer_redeem") {
        throw new HttpPayloadError("INVALID_BENEFIT_MODE", "Este benefício usa verificação de saldo (Hold-to-Unlock), não transferência.", 400);
      }

      const [{ data: biz }, { data: token }] = await Promise.all([
        supabase.from("hb_businesses").select("id, name, wallet_address").eq("id", benefit.business_id).single(),
        supabase.from("hb_tokens").select("network, asset_code, issuer_address").eq("id", benefit.token_id).single(),
      ]);

      const expectedMemo = generateShortCode("HKB");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const { data: order, error: ordErr } = await supabase
        .from("hb_redemptions")
        .insert({
          benefit_id: benefit.id,
          business_id: benefit.business_id,
          user_uid: actor.uid,
          user_username: actor.username,
          mode: "transfer_redeem",
          expected_memo: expectedMemo,
          expected_amount: benefit.required_amount,
          status: "pending",
          expires_at: expiresAt,
        })
        .select("*")
        .single();

      if (ordErr) {
        throw new HttpPayloadError("ORDER_CREATE_FAILED", "Falha ao gerar ordem de resgate.", 500);
      }

      return jsonOk(
        "REDEMPTION_INTENT_CREATED",
        {
          redemption_id: order.id,
          business_name: biz?.name || "",
          destination_wallet: biz?.wallet_address || "",
          network: token?.network || "testnet",
          asset_code: token?.asset_code || "",
          issuer_address: token?.issuer_address || "",
          expected_amount: order.expected_amount,
          expected_memo: order.expected_memo,
          expires_at: order.expires_at,
        },
        corsHeaders,
        201
      );
    }

    if (action === "confirm_redemption") {
      const redemptionId = String(payload.redemption_id || "").trim();
      const txHash = String(payload.tx_hash || "").trim().toLowerCase();
      if (!redemptionId || !/^[a-f0-9]{64}$/.test(txHash)) {
        throw new HttpPayloadError("INVALID_TX_HASH", "Informe o hash da transação válido (64 caracteres hexadecimais).", 400);
      }

      const { data: order } = await supabase
        .from("hb_redemptions")
        .select("*")
        .eq("id", redemptionId)
        .maybeSingle();

      if (!order || order.user_uid !== actor.uid) {
        throw new HttpPayloadError("ORDER_NOT_FOUND", "Ordem de resgate não encontrada para este usuário.", 404);
      }
      if (order.status === "confirmed") {
        return jsonOk(
          "REDEMPTION_ALREADY_CONFIRMED",
          { redemption_id: order.id, voucher_code: order.voucher_code, status: order.status },
          corsHeaders
        );
      }
      if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
        await supabase.from("hb_redemptions").update({ status: "expired" }).eq("id", order.id);
        throw new HttpPayloadError("ORDER_EXPIRED", "Ordem expirada. Gere um novo código memo para resgatar.", 410);
      }

      const { data: txDup } = await supabase
        .from("hb_redemptions")
        .select("id")
        .eq("tx_hash", txHash)
        .maybeSingle();
      if (txDup) {
        throw new HttpPayloadError("TX_ALREADY_USED", "Esta transação já foi utilizada em outro resgate.", 409);
      }

      const { data: benefit } = await supabase
        .from("hb_benefits")
        .select("id, token_id, redemptions_count")
        .eq("id", order.benefit_id)
        .single();
      const [{ data: biz }, { data: token }] = await Promise.all([
        supabase.from("hb_businesses").select("wallet_address").eq("id", order.business_id).single(),
        supabase.from("hb_tokens").select("network, asset_code, issuer_address").eq("id", benefit.token_id).single(),
      ]);

      const horizonBase = getHorizonBaseUrl(token.network);
      const txJson = await fetchHorizonJson(`${horizonBase}/transactions/${txHash}`);
      if (txJson.successful !== true) {
        throw new HttpPayloadError("TX_NOT_SUCCESSFUL", "A transação informada não foi concluída com sucesso na rede Pi.", 400);
      }
      if (String(txJson.memo || "").trim() !== String(order.expected_memo || "").trim()) {
        throw new HttpPayloadError("MEMO_MISMATCH", `Memo divergente. Esperado: ${order.expected_memo}.`, 400);
      }

      const opsJson = await fetchHorizonJson(`${horizonBase}/transactions/${txHash}/operations?limit=50`);
      const records: Array<Record<string, any>> = Array.isArray(opsJson?._embedded?.records)
        ? opsJson._embedded.records
        : [];

      const codeUpper = String(token.asset_code || "").toUpperCase();
      const matchedOp = records.find((op) => {
        const isPay = op.type === "payment" || op.type === "path_payment_strict_receive" || op.type === "path_payment_strict_send";
        if (!isPay) return false;
        if (String(op.to || "").trim() !== String(biz.wallet_address || "").trim()) return false;
        const assetOk =
          (op.asset_type === "native" && (codeUpper === "PI" || codeUpper === "TESTPI")) ||
          (String(op.asset_code || "").toUpperCase() === codeUpper &&
            String(op.asset_issuer || "").trim() === String(token.issuer_address || "").trim());
        if (!assetOk) return false;
        return Number(op.amount || 0) >= Number(order.expected_amount || 0);
      });

      if (!matchedOp) {
        throw new HttpPayloadError(
          "PAYMENT_NOT_MATCHED",
          "Não foi encontrado pagamento compatível (carteira destino, token e valor mínimo) nesta transação.",
          400
        );
      }

      const voucherCode = generateShortCode("HKV");
      const nowIso = new Date().toISOString();

      const { error: confErr } = await supabase
        .from("hb_redemptions")
        .update({
          status: "confirmed",
          tx_hash: txHash,
          voucher_code: voucherCode,
          confirmed_at: nowIso,
        })
        .eq("id", order.id);

      if (confErr) {
        throw new HttpPayloadError("CONFIRM_SAVE_FAILED", "Falha ao registrar confirmação do resgate.", 500);
      }

      await supabase
        .from("hb_benefits")
        .update({ redemptions_count: Number(benefit.redemptions_count || 0) + 1 })
        .eq("id", benefit.id);

      return jsonOk(
        "REDEMPTION_CONFIRMED",
        {
          redemption_id: order.id,
          voucher_code: voucherCode,
          tx_hash: txHash,
          confirmed_at: nowIso,
          status: "confirmed",
        },
        corsHeaders
      );
    }

    if (action === "request_verification") {
      const businessId = String(payload.business_id || "").trim();
      const { data: biz } = await supabase
        .from("hb_businesses")
        .select("id, owner_uid")
        .eq("id", businessId)
        .maybeSingle();

      if (!biz || biz.owner_uid !== actor.uid) {
        throw new HttpPayloadError("FORBIDDEN", "Você não tem permissão para solicitar verificação deste negócio.", 403);
      }

      const evidence = {
        cnpj_or_id: String(payload.cnpj_or_id || "").trim().slice(0, 60),
        social_url: sanitizeOptionalUrl(payload.social_url) || "",
        notes: String(payload.notes || "").trim().slice(0, 400),
      };

      const { data: audit, error: audErr } = await supabase
        .from("hb_verification_audits")
        .insert({
          business_id: biz.id,
          target_level: 2,
          evidence,
          status: "pending",
        })
        .select("*")
        .single();

      if (audErr) {
        throw new HttpPayloadError("AUDIT_REQUEST_FAILED", "Não foi possível registrar o pedido de verificação.", 500);
      }
      return jsonOk("VERIFICATION_REQUESTED", { audit }, corsHeaders, 201);
    }

    throw new HttpPayloadError("UNKNOWN_ACTION", "Ação POST não suportada.", 400);
  } catch (err) {
    if (err instanceof HttpPayloadError) {
      return jsonError(err.code, err.message, corsHeaders, err.status);
    }
    console.error("business-api unexpected error:", err);
    return jsonError("INTERNAL_ERROR", "Erro interno ao processar requisição do Hokage Business.", corsHeaders, 500);
  }
});
