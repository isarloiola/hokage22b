// ============================================================
// HOKAGE22B.COM — Public Open API (v1)
// Camada pública somente-leitura para outros Pioneiros & Devs
// - CORS aberto (*) para consumo em sites, bots e widgets
// - Cache de borda (s-maxage=60) para proteção contra picos
// - Allowlist estrita de campos (nunca expõe uid, e-mail, IP ou denúncias)
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_VERSION = "v1";
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const PUBLIC_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hokage-client",
};

// Cache em memória simples para cotação (protege contra rate limit da CoinGecko)
let priceCache: { currency: string; data: Record<string, unknown>; expiresAt: number } | null = null;

function jsonOut(body: unknown, status = 200, cacheSeconds = 60): Response {
  const headers: Record<string, string> = {
    ...PUBLIC_CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "X-Hokage-API-Version": API_VERSION,
  };
  if (cacheSeconds > 0) {
    headers["Cache-Control"] = `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, stale-while-revalidate=300`;
  } else {
    headers["Cache-Control"] = "no-store";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function ok(code: string, data: Record<string, unknown>, cacheSeconds = 60): Response {
  return jsonOut({ ok: true, api_version: API_VERSION, code, data }, 200, cacheSeconds);
}

function err(code: string, message: string, status = 400): Response {
  return jsonOut({ ok: false, api_version: API_VERSION, code, error: message }, status, 0);
}

function normalizeHandle(raw: string | null): string {
  return String(raw || "").trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_.-]/g, "");
}

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

function clampOffset(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function computeJourneyTier(row: Record<string, unknown>): "hokage" | "construtor" | "pioneiro" {
  const uname = normalizeHandle(String(row.username || ""));
  const isAmb = Boolean(row.is_ambassador) || Number(row.referral_qualified_count || 0) >= 5 || uname === "hokage22b";
  if (isAmb) return "hokage";

  const hasWallet = Boolean(row.wallet_address && String(row.wallet_address).startsWith("G"));
  const products = Array.isArray(row.products) ? row.products : [];
  const rep = Number(row.reputation_score || 0);
  if (hasWallet && (products.length > 0 || rep >= 70)) return "construtor";

  return "pioneiro";
}

function projectPassport(row: Record<string, unknown>) {
  const username = normalizeHandle(String(row.username || ""));
  const tier = computeJourneyTier(row);
  let rawProducts: unknown[] = [];
  if (Array.isArray(row.products)) {
    rawProducts = row.products;
  } else if (typeof row.products === "string") {
    try {
      const parsed = JSON.parse(row.products);
      if (Array.isArray(parsed)) rawProducts = parsed;
    } catch (_) { /* ignore */ }
  }
  const products = rawProducts.slice(0, 20).map((item) => {
    const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      title: String(p?.title || "").slice(0, 120),
      price_pi: p?.price_pi ?? null,
      description: p?.description ? String(p.description).slice(0, 300) : null,
      image_url: p?.image_url ? String(p.image_url) : null,
    };
  });

  return {
    username,
    handle: `@${username}`,
    profile_url: `https://hokage22b.com/pioneiro?u=${encodeURIComponent(username)}`,
    journey_tier: tier,
    level_name: row.level_name || (tier === "hokage" ? "Hokage · Construtor Líder" : tier === "construtor" ? "Pioneiro Construtor" : "Pioneiro"),
    reputation_score: Number(row.reputation_score || 50),
    bio: row.bio || null,
    avatar_url: row.avatar_url || null,
    wallet_address: row.wallet_address || null,
    socials: {
      whatsapp_url: row.whatsapp_url || null,
      youtube_url: row.youtube_url || null,
      twitter_url: row.twitter_url || null,
      instagram_url: row.instagram_url || null,
    },
    products,
    updated_at: row.updated_at || null,
  };
}

function projectVilaAd(row: Record<string, unknown>) {
  const authorClean = normalizeHandle(String(row.pioneer_username || "pioneiro"));
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category || "geral",
    plan_tier: row.plan_tier || "bronze",
    country_code: row.country_code || "GLOBAL",
    payment_modes: row.payment_modes || "pi",
    link_url: row.link_url || null,
    image_url: row.image_url || null,
    author: {
      handle: `@${authorClean}`,
      name: row.pioneer_name || authorClean,
      passport_url: `https://hokage22b.com/pioneiro?u=${encodeURIComponent(authorClean)}`,
    },
    created_at: row.created_at,
  };
}

// Validador Base32 + CRC16-XModem para chaves públicas Pi/Stellar (G...)
function validatePiPublicAddress(rawAddress: string): { valid: boolean; reason: string; address: string } {
  const addr = String(rawAddress || "").trim().toUpperCase();
  if (!addr) return { valid: false, reason: "Endereço vazio.", address: "" };
  if (addr.startsWith("S")) {
    return { valid: false, reason: "ALERTA: esta é uma chave SECRETA (S...). Nunca compartilhe.", address: "" };
  }
  if (!/^G[A-Z2-7]{55}$/.test(addr)) {
    return { valid: false, reason: "Formato inválido. Chaves públicas Pi têm 56 caracteres e começam com G.", address: addr };
  }

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < addr.length; i++) {
    const idx = alphabet.indexOf(addr[i]);
    if (idx === -1) return { valid: false, reason: "Caractere Base32 inválido.", address: addr };
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (bytes.length !== 35) return { valid: false, reason: "Comprimento binário inválido.", address: addr };

  // CRC16-XModem sobre os primeiros 33 bytes (version byte + 32-byte pubkey)
  let crc = 0x0000;
  for (let i = 0; i < 33; i++) {
    crc ^= bytes[i] << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  const expectedLow = crc & 0xff;
  const expectedHigh = (crc >>> 8) & 0xff;
  if (bytes[33] !== expectedLow || bytes[34] !== expectedHigh) {
    return { valid: false, reason: "Checksum CRC16 inválido (possível erro de digitação).", address: addr };
  }

  return { valid: true, reason: "Chave pública Pi válida (Base32 + CRC16 OK).", address: addr };
}

function resolveRoute(url: URL): string {
  const queryRoute = url.searchParams.get("route");
  if (queryRoute) {
    return "/" + queryRoute.replace(/^\/+/, "").replace(/^v1\/+/, "");
  }
  const path = url.pathname
    .replace(/^\/functions\/v1\/public-api/, "")
    .replace(/^\/public-api/, "")
    .replace(/^\/v1/, "");
  return path || "/";
}

const PUBLIC_PIONEER_SELECT =
  "username, bio, avatar_url, wallet_address, whatsapp_url, youtube_url, twitter_url, instagram_url, products, reputation_score, level_name, is_ambassador, referral_qualified_count, updated_at";

const PUBLIC_VILA_SELECT =
  "id, title, description, category, plan_tier, country_code, payment_modes, link_url, image_url, pioneer_username, pioneer_name, created_at";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: PUBLIC_CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return err("METHOD_NOT_ALLOWED", "A API pública HOKAGE22B aceita apenas requisições GET.", 405);
  }

  try {
    const url = new URL(req.url);
    const route = resolveRoute(url).replace(/\/+$/, "") || "/";

    // 0. Índice da API
    if (route === "/" || route === "/health") {
      return ok("API_READY", {
        service: "HOKAGE22B Public API",
        tagline: "Seja pioneiro. Torne-se Hokage.",
        endpoints: [
          "GET /v1/passaportes",
          "GET /v1/passaportes?u=hokage22b",
          "GET /v1/monte-hokage",
          "GET /v1/vila?country=BR&category=servico&payment=pi",
          "GET /v1/tools/validate-wallet?address=G...",
          "GET /v1/tools/pi-price?currency=BRL",
          "GET /v1/stats",
        ],
        docs_url: "https://hokage22b.com/desenvolvedores",
      }, 300);
    }

    // 1. Ferramenta Stateless: Validador de Chave Pública Pi
    if (route === "/tools/validate-wallet") {
      const address = url.searchParams.get("address") || "";
      const result = validatePiPublicAddress(address);
      return ok("WALLET_VALIDATION", result, 0);
    }

    // 2. Ferramenta Stateless: Cotação Pi Normalizada (com cache 60s)
    if (route === "/tools/pi-price") {
      const currency = String(url.searchParams.get("currency") || "BRL").trim().toLowerCase().replace(/[^a-z]/g, "") || "brl";
      const now = Date.now();
      if (priceCache && priceCache.currency === currency && now < priceCache.expiresAt) {
        return ok("PI_PRICE", { ...priceCache.data, cached: true }, 60);
      }
      const cgRes = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=${encodeURIComponent(currency)},usd&include_24hr_change=true`
      );
      if (!cgRes.ok) {
        return err("PRICE_UPSTREAM_UNAVAILABLE", "Fonte de cotação temporariamente indisponível.", 502);
      }
      const cgJson = await cgRes.json();
      const piData = cgJson?.["pi-network"] || {};
      const payload = {
        asset: "PI",
        currency: currency.toUpperCase(),
        price: piData[currency] ?? null,
        price_usd: piData.usd ?? null,
        change_24h: piData[`${currency}_24h_change`] ?? piData.usd_24h_change ?? null,
        source: "coingecko",
        updated_at: new Date().toISOString(),
      };
      priceCache = { currency, data: payload, expiresAt: now + 60_000 };
      return ok("PI_PRICE", { ...payload, cached: false }, 60);
    }

    // Conexão Supabase para endpoints de leitura
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!supabaseUrl || !supabaseKey) {
      return err("SERVER_MISCONFIGURED", "Ambiente Supabase não configurado.", 500);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Passaporte(s) do Pioneiro
    if (route === "/passaportes") {
      const u = normalizeHandle(url.searchParams.get("u"));
      if (u) {
        const { data, error } = await supabase
          .from("pioneiros")
          .select(PUBLIC_PIONEER_SELECT)
          .or(`username.ilike.${u},username.ilike.@${u}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) return err("PASSPORT_NOT_FOUND", `Passaporte @${u} não encontrado.`, 404);
        return ok("PASSPORT_DETAIL", { passport: projectPassport(data) }, 60);
      }

      const limit = clampLimit(url.searchParams.get("limit"));
      const offset = clampOffset(url.searchParams.get("offset"));
      const tierFilter = String(url.searchParams.get("tier") || "").trim().toLowerCase();

      const { data, error } = await supabase
        .from("pioneiros")
        .select(PUBLIC_PIONEER_SELECT)
        .order("reputation_score", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      let items = (data || []).map(projectPassport);
      if (tierFilter === "hokage" || tierFilter === "construtor" || tierFilter === "pioneiro") {
        items = items.filter((item) => item.journey_tier === tierFilter);
      }

      return ok("PASSPORT_LIST", {
        items,
        meta: { count: items.length, limit, offset },
      }, 60);
    }

    // 4. Monte Hokage (Líderes por Mérito)
    if (route === "/monte-hokage") {
      const limit = clampLimit(url.searchParams.get("limit"));
      const { data, error } = await supabase
        .from("pioneiros")
        .select(PUBLIC_PIONEER_SELECT)
        .or("is_ambassador.eq.true,referral_qualified_count.gte.5,username.ilike.hokage22b,username.ilike.@hokage22b")
        .order("reputation_score", { ascending: false })
        .limit(limit);

      if (error) throw error;
      const leaders = (data || []).map(projectPassport);
      return ok("MONTE_HOKAGE", {
        title: "O Monte Hokage",
        subtitle: "Líderes e construtores reconhecidos por contribuição real.",
        leaders,
        meta: { count: leaders.length },
      }, 120);
    }

    // 5. A Vila · Central P2P
    if (route === "/vila") {
      const limit = clampLimit(url.searchParams.get("limit"));
      const offset = clampOffset(url.searchParams.get("offset"));
      const country = String(url.searchParams.get("country") || "").trim().toUpperCase();
      const category = String(url.searchParams.get("category") || "").trim().toLowerCase();
      const payment = String(url.searchParams.get("payment") || "").trim().toLowerCase();
      const plan = String(url.searchParams.get("plan") || "").trim().toLowerCase();

      let query = supabase
        .from("anuncios")
        .select(PUBLIC_VILA_SELECT)
        .eq("status", "ativo")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (country && country !== "ALL") query = query.eq("country_code", country);
      if (category && category !== "all") query = query.eq("category", category);
      if (payment) query = query.eq("payment_modes", payment);
      if (plan) query = query.eq("plan_tier", plan);

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []).map(projectVilaAd);
      return ok("VILA_FEED", {
        items,
        meta: { count: items.length, limit, offset },
      }, 60);
    }

    // 6. Estatísticas Públicas Agregadas
    if (route === "/stats") {
      const [{ data: passRows }, { data: vilaRows }] = await Promise.all([
        supabase.from("pioneiros").select("username, is_ambassador, referral_qualified_count"),
        supabase.from("anuncios").select("id").eq("status", "ativo"),
      ]);

      const passports = passRows || [];
      const hokages = passports.filter((r) => {
        const u = normalizeHandle(String(r.username || ""));
        return Boolean(r.is_ambassador) || Number(r.referral_qualified_count || 0) >= 5 || u === "hokage22b";
      });

      return ok("ECOSYSTEM_STATS", {
        passaportes_ativos: passports.length,
        anuncios_vila_ativos: (vilaRows || []).length,
        monte_hokage_membros: hokages.length,
        updated_at: new Date().toISOString(),
      }, 120);
    }

    return err("ROUTE_NOT_FOUND", `Rota '${route}' não encontrada. Consulte GET /v1/health.`, 404);
  } catch (e) {
    console.error("public-api error:", e);
    return err("INTERNAL_ERROR", "Erro ao processar consulta pública.", 500);
  }
});
