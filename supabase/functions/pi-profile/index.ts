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
import { verifyPiAccessToken } from "../_shared/pi-auth.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, false);

  // Trata requisições preflight OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("METHOD_NOT_ALLOWED", "Método não permitido.", corsHeaders, 405);
  }

  try {
    const body = await parseJsonBody(req, 512 * 1024);
    const { accessToken, profileData, refCode } = body;

    // 1. VALIDAÇÃO CRIPTOGRÁFICA DO TOKEN DIRETAMENTE NA API DA PI CORE TEAM (/v2/me)
    const piUser = await verifyPiAccessToken(accessToken);
    const verifiedUid = piUser.uid;
    const verifiedUsername = piUser.username;

    // 2. INICIALIZA CLIENT SUPABASE COM SERVICE_ROLE
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    let cleanAvatar: string | null = null;
    if (safeData.avatar_url) {
      const a = String(safeData.avatar_url).trim();
      if (
        /^https?:\/\/[^\s<>"'`]+$/i.test(a) ||
        /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(a) ||
        /^assets\/img\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|svg)$/i.test(a)
      ) {
        cleanAvatar = a;
      }
    }

    const checklistState = (safeData.checklist_state && typeof safeData.checklist_state === "object")
      ? { ...safeData.checklist_state }
      : {};
    if (safeData.showcase_zero !== undefined) checklistState.showcase_zero = Boolean(safeData.showcase_zero);
    if (safeData.showcase_mural !== undefined) checklistState.showcase_mural = Boolean(safeData.showcase_mural);

    const updatePayload = {
      uid: verifiedUid,
      username: verifiedUsername,
      bio: safeData.bio ? String(safeData.bio).slice(0, 500) : null,
      avatar_url: cleanAvatar,
      wallet_address: cleanWallet,
      whatsapp_url: safeData.whatsapp_url ? String(safeData.whatsapp_url).slice(0, 300) : null,
      youtube_url: safeData.youtube_url ? String(safeData.youtube_url).slice(0, 300) : null,
      twitter_url: safeData.twitter_url ? String(safeData.twitter_url).slice(0, 300) : null,
      instagram_url: safeData.instagram_url ? String(safeData.instagram_url).slice(0, 300) : null,
      checklist_state: checklistState,
      products: Array.isArray(safeData.products) ? safeData.products.slice(0, 20) : [],
      updated_at: new Date().toISOString(),
    };

    // 4. GRAVAÇÃO SEGURA NO SUPABASE (Com migração automática caso exista registro prévio user_<username>)
    const { data: existingByUser } = await supabase
      .from("pioneiros")
      .select("uid")
      .ilike("username", verifiedUsername)
      .maybeSingle();

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
        const { data: refData, error: refErr } = await supabase.rpc("process_pioneer_referral", {
          p_referrer_username: "@" + cleanRef,
          p_referred_uid: verifiedUid,
          p_referred_username: verifiedUsername,
        });
        if (!refErr) {
          referralResult = refData;
        } else {
          console.warn("Erro ao processar indicação:", refErr.message);
        }
      }
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
