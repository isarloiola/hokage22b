// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Profile Server
// Endpoint seguro para validação de identidade Pi Network e atualização de perfil
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Trata requisições preflight OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { accessToken, profileData } = await req.json();

    if (!accessToken || typeof accessToken !== "string") {
      return new Response(
        JSON.stringify({ error: "accessToken da Pi Network é obrigatório para autenticação segura." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 1. VALIDAÇÃO CRIPTOGRÁFICA DO TOKEN DIRETAMENTE NA API DA PI CORE TEAM
    // Endpoint oficial: https://api.minepi.com/v2/me
    const piResponse = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!piResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Sessão Pi Network inválida ou expirada. Faça login novamente no Pi Browser." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const piUser = await piResponse.json();
    if (!piUser || !piUser.uid || !piUser.username) {
      return new Response(
        JSON.stringify({ error: "Falha ao obter identidade verificada da Pi Network." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Identidade autêntica extraída do servidor oficial do Pi
    const verifiedUid = String(piUser.uid);
    const verifiedUsername = "@" + String(piUser.username).replace(/^@+/, "").trim().toLowerCase();

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
        return new Response(
          JSON.stringify({ error: "Chave pública da Pi Wallet inválida. Deve iniciar com G e ter 56 caracteres." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    }

    let cleanAvatar: string | null = null;
    if (safeData.avatar_url) {
      const a = String(safeData.avatar_url).trim();
      if (/^https?:\/\/[^\s<>"'`]+$/i.test(a) || /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(a) || /^assets\/img\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|svg)$/i.test(a)) {
        cleanAvatar = a;
      }
    }

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
      checklist_state: safeData.checklist_state || {},
      products: Array.isArray(safeData.products) ? safeData.products.slice(0, 20) : [],
      updated_at: new Date().toISOString(),
    };

    // 4. GRAVAÇÃO SEGURA NO SUPABASE
    // O upsert é amarrado exclusivamente ao UID e USERNAME validados pelo Pi
    const { data, error } = await supabase
      .from("pioneiros")
      .upsert(updatePayload, { onConflict: "uid" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, profile: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

