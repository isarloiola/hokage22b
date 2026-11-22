// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Profile Server
// Endpoint seguro para validação de identidade Pi Network e atualização de perfil
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
import { normalizeHandle, verifyPiAccessToken } from "../_shared/pi-auth.ts";
import { notifyAdmin } from "../_shared/notify.ts";

function sanitizeProfileHttpUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^\s<>"'`]+$/i.test(trimmed)) {
    return trimmed.slice(0, 300);
  }
  return null;
}

function sanitizeProfileImageUrl(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const a = raw.trim();
  if (!a) return null;
  if (
    /^https?:\/\/[^\s<>"'`]+$/i.test(a) ||
    /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(a) ||
    /^assets\/img\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|svg)$/i.test(a)
  ) {
    return a.slice(0, 360000);
  }
  return null;
}

function sanitizeProducts(rawProducts: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rawProducts)) return [];
  const clean: Record<string, unknown>[] = [];
  for (const item of rawProducts.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const rawLink = typeof p.link === "string" ? p.link.trim() : "";
    const safeLink = rawLink === "#" ? "#" : (sanitizeProfileHttpUrl(rawLink) || "");
    clean.push({
      title: String(p.title || "").trim().slice(0, 120),
      price: String(p.price || "").trim().slice(0, 40),
      price_fiat: p.price_fiat ? String(p.price_fiat).trim().slice(0, 40) : "",
      badge: p.badge ? String(p.badge).trim().slice(0, 40) : "",
      link: safeLink,
      image_url: sanitizeProfileImageUrl(p.image_url) || "",
      cta: p.cta ? String(p.cta).trim().slice(0, 40) : "",
    });
  }
  return clean;
}

function decodeProfileImageDataUrl(raw: unknown): { bytes: Uint8Array; ext: string; mime: string } {
  if (!raw || typeof raw !== "string") {
    throw new HttpPayloadError("INVALID_IMAGE", "Imagem Base64 inválida.", 400);
  }
  const trimmed = raw.trim();
  const match = trimmed.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match || trimmed.length > 2.8 * 1024 * 1024) {
    throw new HttpPayloadError("INVALID_IMAGE", "Formato inválido. Use JPEG, PNG ou WebP (máx. 2 MB).", 400);
  }
  const binaryStr = atob(match[2]);
  if (binaryStr.length < 16 || binaryStr.length > 2 * 1024 * 1024) {
    throw new HttpPayloadError("IMAGE_TOO_LARGE", "Tamanho da imagem fora do limite permitido (máx. 2 MB).", 413);
  }
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  if (isJpeg) return { bytes, ext: "jpg", mime: "image/jpeg" };
  if (isPng) return { bytes, ext: "png", mime: "image/png" };
  if (isWebp) return { bytes, ext: "webp", mime: "image/webp" };
  throw new HttpPayloadError("INVALID_IMAGE_BYTES", "Assinatura binária da imagem inválida.", 400);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, true);

  // Trata requisições preflight OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Método não permitido.", corsHeaders, 405);
  }

  try {
    const body = await parseJsonBody(req, 1024 * 1024);
    const { action, dataUrl, accessToken, profileData, refCode } = body;

    // 1. VALIDAÇÃO CRIPTOGRÁFICA DO TOKEN DIRETAMENTE NA API DA PI CORE TEAM (/v2/me)
    const piUser = await verifyPiAccessToken(accessToken);
    const verifiedUid = piUser.uid;
    const verifiedUsername = piUser.username;

    // 2. INICIALIZA CLIENT SUPABASE COM SERVICE_ROLE
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "upload_profile_image") {
      const { bytes, ext, mime } = decodeProfileImageDataUrl(dataUrl);
      const cleanH = normalizeHandle(verifiedUsername) || "pioneiro";
      const filePath = `profiles/${cleanH}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
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
      const { data: pubData } = supabase.storage.from("mural-images").getPublicUrl(filePath);
      return jsonOk("PROFILE_IMAGE_UPLOADED", { publicUrl: pubData.publicUrl }, corsHeaders, 200);
    }

    // 3. SANITIZAÇÃO E VALIDAÇÃO DOS DADOS DO PERFIL
    const safeData = profileData || {};
    let cleanWallet: string | null = null;
    if (safeData.wallet_address) {
      const w = String(safeData.wallet_address).trim();
      if (/^G[A-Z2-7]{55}$/.test(w)) {
        cleanWallet = w;
      } else {
        return jsonError(
          "INVALID_WALLET_ADDRESS",
          "Chave pública da Pi Wallet inválida. Deve iniciar com G e ter 56 caracteres.",
          corsHeaders,
          400
        );
      }
    }

    const cleanHandle = normalizeHandle(verifiedUsername);
    const cleanAvatar = sanitizeProfileImageUrl(safeData.avatar_url);
    const cleanProducts = sanitizeProducts(safeData.products);

    // Consulta estado real no servidor para validar títulos meritocráticos e preservar checklist_state
    const { data: existingByUser } = await supabase
      .from("pioneiros")
      .select("uid, is_ambassador, referral_qualified_count, reputation_score, wallet_address, referred_by_username, checklist_state, hokage_since")
      .ilike("username", verifiedUsername)
      .maybeSingle();

    const { data: existingByUid } = await supabase
      .from("pioneiros")
      .select("uid, is_ambassador, referral_qualified_count, reputation_score, wallet_address, referred_by_username, checklist_state, hokage_since")
      .eq("uid", verifiedUid)
      .maybeSingle();

    const existingFlags = existingByUid || existingByUser || null;
    const isBrandNewPioneer = !existingByUser && !existingByUid;

    const { data: activeAds } = await supabase
      .from("anuncios")
      .select("id")
      .ilike("pioneer_username", "@" + cleanHandle)
      .eq("status", "ativo")
      .limit(1);
    const hasActiveAd = Boolean(activeAds && activeAds.length > 0);

    const existingChecklist = (existingFlags?.checklist_state && typeof existingFlags.checklist_state === "object" && !Array.isArray(existingFlags.checklist_state))
      ? (existingFlags.checklist_state as Record<string, unknown>)
      : {};
    const rawChecklist = (safeData.checklist_state && typeof safeData.checklist_state === "object" && !Array.isArray(safeData.checklist_state))
      ? (safeData.checklist_state as Record<string, unknown>)
      : {};
    const checklistState: Record<string, unknown> = { ...existingChecklist, ...rawChecklist };
    if (safeData.showcase_zero !== undefined) checklistState.showcase_zero = Boolean(safeData.showcase_zero);
    if (safeData.showcase_mural !== undefined) checklistState.showcase_mural = Boolean(safeData.showcase_mural);
    if (safeData.dev_api_used !== undefined) checklistState.dev_api_used = Boolean(safeData.dev_api_used);

    const incomingSocialLinks = Array.isArray(rawChecklist.social_links)
      ? rawChecklist.social_links
      : (Array.isArray(safeData.social_links) ? safeData.social_links : null);

    if (incomingSocialLinks) {
      const sanitizedLinks: Array<{ network: string; url: string }> = [];
      for (const entry of incomingSocialLinks.slice(0, 12)) {
        if (!entry || typeof entry !== "object") continue;
        const eObj = entry as Record<string, unknown>;
        const safeSocialUrl = sanitizeProfileHttpUrl(eObj.url);
        if (!safeSocialUrl) continue;
        const rawNet = String(eObj.network || "auto").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24) || "auto";
        sanitizedLinks.push({ network: rawNet, url: safeSocialUrl });
      }
      checklistState.social_links = sanitizedLinks;
    }

    // Validação server-side de títulos exibidos no perfil (A-01)
    const isHokageServer =
      Boolean(existingFlags?.is_ambassador) ||
      Number(existingFlags?.referral_qualified_count || 0) >= 5 ||
      cleanHandle === "hokage22b";
    const isAmbassadorServer =
      Boolean(existingFlags?.is_ambassador) ||
      Number(existingFlags?.referral_qualified_count || 0) > 0;
    const hasGithubSocial = Array.isArray(checklistState.social_links) &&
      (checklistState.social_links as Array<{ network: string }>).some((s) => s.network === "github");
    const unlockedServerTitles = new Set<string>(["pioneiro", "pi_kyc"]);
    if (Boolean(cleanWallet) || cleanProducts.length > 0 || isHokageServer) unlockedServerTitles.add("construtor");
    if (hasGithubSocial || Boolean(checklistState.dev_api_used) || cleanHandle === "hokage22b") unlockedServerTitles.add("desenvolvedor");
    if (isHokageServer) unlockedServerTitles.add("hokage");
    if (cleanProducts.length > 0 || hasActiveAd) unlockedServerTitles.add("comerciante");
    if (isAmbassadorServer) unlockedServerTitles.add("embaixador");

    const rawSelectedTitles = Array.isArray(rawChecklist.selected_titles)
      ? rawChecklist.selected_titles
      : (Array.isArray(checklistState.selected_titles) ? checklistState.selected_titles : null);

    if (rawSelectedTitles) {
      const filteredTitles: string[] = [];
      for (const tid of rawSelectedTitles) {
        const cleanTid = String(tid || "").trim().toLowerCase();
        if (unlockedServerTitles.has(cleanTid) && !filteredTitles.includes(cleanTid)) {
          filteredTitles.push(cleanTid);
          if (filteredTitles.length >= 3) break;
        }
      }
      checklistState.selected_titles = filteredTitles.length > 0 ? filteredTitles : ["pioneiro"];
    }

    const repScore = Number(existingFlags?.reputation_score ?? 50);
    const computedJourneyTier = isHokageServer
      ? "hokage"
      : (Boolean(cleanWallet) && (cleanProducts.length > 0 || repScore >= 70) ? "construtor" : "pioneiro");

    const updatePayload = {
      uid: verifiedUid,
      username: verifiedUsername,
      bio: safeData.bio ? String(safeData.bio).slice(0, 500) : null,
      avatar_url: cleanAvatar,
      wallet_address: cleanWallet,
      whatsapp_url: sanitizeProfileHttpUrl(safeData.whatsapp_url),
      youtube_url: sanitizeProfileHttpUrl(safeData.youtube_url),
      twitter_url: sanitizeProfileHttpUrl(safeData.twitter_url),
      instagram_url: sanitizeProfileHttpUrl(safeData.instagram_url),
      checklist_state: checklistState,
      products: cleanProducts,
      journey_tier: computedJourneyTier,
      updated_at: new Date().toISOString(),
    };

    // 3b. RE-CHECAGEM ANTIFRAUDE DE CARTEIRA NA REDE DE INDICAÇÃO (impede Sybil após cadastro)
    if (cleanWallet) {
      const upperWallet = cleanWallet.toUpperCase();
      const relatedUids = new Set<string>();
      const relatedHandles = new Set<string>();

      if (existingFlags?.referred_by_username) {
        const refH = normalizeHandle(String(existingFlags.referred_by_username));
        if (refH) relatedHandles.add("@" + refH);
      }

      const { data: asReferred } = await supabase
        .from("indicacoes")
        .select("referrer_uid, referrer_username")
        .eq("referred_uid", verifiedUid)
        .limit(5);
      if (Array.isArray(asReferred)) {
        for (const rel of asReferred) {
          if (rel.referrer_uid && rel.referrer_uid !== verifiedUid) relatedUids.add(String(rel.referrer_uid));
          const h = normalizeHandle(String(rel.referrer_username || ""));
          if (h) relatedHandles.add("@" + h);
        }
      }

      const { data: asReferrer } = await supabase
        .from("indicacoes")
        .select("referred_uid")
        .eq("referrer_uid", verifiedUid)
        .limit(50);
      if (Array.isArray(asReferrer)) {
        for (const rel of asReferrer) {
          if (rel.referred_uid && rel.referred_uid !== verifiedUid) relatedUids.add(String(rel.referred_uid));
        }
      }

      if (relatedUids.size > 0) {
        const { data: relProfiles } = await supabase
          .from("pioneiros")
          .select("uid, wallet_address")
          .in("uid", Array.from(relatedUids));
        if (Array.isArray(relProfiles)) {
          const dup = relProfiles.find(
            (p) => p.uid !== verifiedUid && p.wallet_address && String(p.wallet_address).trim().toUpperCase() === upperWallet
          );
          if (dup) {
            return jsonError(
              "SELF_REFERRAL_WALLET",
              "Carteira Pi já vinculada a uma conta da sua rede de indicação.",
              corsHeaders,
              400
            );
          }
        }
      }

      for (const h of relatedHandles) {
        const { data: hProf } = await supabase
          .from("pioneiros")
          .select("uid, wallet_address")
          .ilike("username", h)
          .maybeSingle();
        if (
          hProf &&
          hProf.uid !== verifiedUid &&
          hProf.wallet_address &&
          String(hProf.wallet_address).trim().toUpperCase() === upperWallet
        ) {
          return jsonError(
            "SELF_REFERRAL_WALLET",
            "Carteira Pi já vinculada ao seu indicador.",
            corsHeaders,
            400
          );
        }
      }
    }

    // 4. GRAVAÇÃO SEGURA NO SUPABASE (Com migração automática caso exista registro prévio user_<username>)
    if (existingByUser && existingByUser.uid && existingByUser.uid !== verifiedUid) {
      await supabase
        .from("pioneiros")
        .update({ uid: verifiedUid })
        .eq("uid", existingByUser.uid);
    }

    const { data, error } = await supabase
      .from("pioneiros")
      .upsert(updatePayload, { onConflict: "uid" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 5. PROCESSAMENTO SEGURO DE INDICAÇÃO (Somente se a vitrine estiver minimamente qualificada)
    let referralResult: unknown = null;
    if (refCode && typeof refCode === "string") {
      const cleanRef = refCode.trim().replace(/^@+/, "").toLowerCase();
      const hasBio = Boolean(updatePayload.bio && updatePayload.bio.trim().length >= 10);
      const hasProducts = Array.isArray(updatePayload.products) && updatePayload.products.length > 0;
      const hasContact = Boolean(
        updatePayload.whatsapp_url ||
        updatePayload.youtube_url ||
        updatePayload.instagram_url ||
        updatePayload.twitter_url ||
        updatePayload.wallet_address
      );

      if (/^[a-z0-9_]{2,32}$/.test(cleanRef) && (hasBio || hasProducts || hasContact)) {
        let sameWalletBlocked = false;
        if (cleanWallet) {
          const { data: refProf } = await supabase
            .from("pioneiros")
            .select("wallet_address")
            .ilike("username", "@" + cleanRef)
            .maybeSingle();
          if (
            refProf?.wallet_address &&
            String(refProf.wallet_address).trim().toUpperCase() === cleanWallet.toUpperCase()
          ) {
            sameWalletBlocked = true;
            referralResult = { awarded: false, reason: "self_referral_wallet" };
          }
        }

        if (!sameWalletBlocked) {
          const { data: refData, error: refErr } = await supabase.rpc("process_pioneer_referral", {
            p_referrer_username: "@" + cleanRef,
            p_referred_uid: verifiedUid,
            p_referred_username: verifiedUsername,
          });
          if (!refErr) {
            referralResult = refData;
            // Garante que o convidado também receba +1 Crédito Bronze de Boas-Vindas (Give & Get)
            // atomicamente via RPC quando a versão SQL no banco ainda não tiver retornado invitee_credit_added
            if (refData && typeof refData === "object" && (refData as Record<string, unknown>).awarded === true) {
              const rObj = refData as Record<string, unknown>;
              if (!rObj.invitee_credit_added) {
                const { data: incRes, error: incErr } = await supabase.rpc("increment_pioneer_referral_credit", {
                  p_uid: verifiedUid,
                  p_referred_by: "@" + cleanRef,
                });
                const incMsg = String(incErr?.message || "");
                const missingIncRpc = Boolean(
                  incErr &&
                    (incErr.code === "42883" ||
                      incMsg.includes("Could not find the function") ||
                      incMsg.includes("does not exist"))
                );
                if (!incErr && incRes && typeof incRes === "object") {
                  const incObj = incRes as Record<string, unknown>;
                  if (data) {
                    data.referral_credits = Number(incObj.referral_credits ?? data.referral_credits ?? 1);
                    data.referred_by_username =
                      (incObj.referred_by_username as string | null) || data.referred_by_username || ("@" + cleanRef);
                  }
                  rObj.invitee_credit_added = 1;
                } else if (missingIncRpc) {
                  const newCredits = Number(data?.referral_credits || 0) + 1;
                  await supabase
                    .from("pioneiros")
                    .update({
                      referral_credits: newCredits,
                      referred_by_username: data?.referred_by_username || ("@" + cleanRef),
                    })
                    .eq("uid", verifiedUid);
                  if (data) {
                    data.referral_credits = newCredits;
                    data.referred_by_username = data.referred_by_username || ("@" + cleanRef);
                  }
                  rObj.invitee_credit_added = 1;
                }
              }
            }
          } else {
            console.warn("Erro ao processar indicação:", refErr.message);
          }
        }
      }
    }

    const refObj = (referralResult && typeof referralResult === "object")
      ? (referralResult as Record<string, unknown>)
      : null;
    const referralAwarded = Boolean(refObj && refObj.awarded === true);

    if (isBrandNewPioneer || referralAwarded) {
      const slug = verifiedUsername.replace(/^@+/, "");
      const bioPreview = updatePayload.bio ? updatePayload.bio.slice(0, 120) : "Sem bio ainda";
      const lines = [
        `Pioneiro: ${verifiedUsername}`,
        `Carteira Pi: ${cleanWallet ? cleanWallet.slice(0, 8) + "..." + cleanWallet.slice(-6) : "Não informada"}`,
        `Produtos no catálogo: ${updatePayload.products.length}`,
        `Bio: ${bioPreview}`,
      ];
      if (referralAwarded && refObj) {
        lines.push(`Indicado por: ${String(refObj.referrer_username || refCode || "")} (+1 Crédito Bronze para ambos!)`);
      }
      await notifyAdmin({
        priority: "normal",
        tag: isBrandNewPioneer ? "NOVO PIONEIRO" : "INDICAÇÃO ATIVADA",
        title: isBrandNewPioneer ? `Nova Vitrine Criada (${verifiedUsername})` : `Indicação Qualificada (${verifiedUsername})`,
        lines,
        linkUrl: `https://hokage22b.com/pioneiro?u=${encodeURIComponent(slug)}`,
        linkLabel: "Ver Vitrine do Pioneiro",
      });
    }

    return jsonOk(
      "PROFILE_SAVED",
      {
        success: true,
        profile: data,
        referral: referralResult,
      },
      corsHeaders,
      200
    );
  } catch (err) {
    if (err instanceof HttpPayloadError) {
      return jsonError(err.code, err.message, corsHeaders, err.status);
    }
    const msg = err && err.message ? String(err.message) : "Erro interno ao salvar perfil.";
    return jsonError("PROFILE_SAVE_FAILED", msg, corsHeaders, 500);
  }
});
