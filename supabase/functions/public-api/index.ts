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

// Cache em memória por moeda para cotação (protege contra rate limit e falhas temporárias)
const priceCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

async function fetchPiPriceWithFallback(currency: string): Promise<Record<string, unknown> | null> {
  try {
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=${encodeURIComponent(currency)},usd&include_24hr_change=true`,
      { headers: { Accept: "application/json" } }
    );
    if (cgRes.ok) {
      const cgJson = await cgRes.json();
      const piData = cgJson?.["pi-network"] || {};
      if (piData[currency] != null || piData.usd != null) {
        return {
          asset: "PI",
          currency: currency.toUpperCase(),
          price: piData[currency] ?? null,
          price_usd: piData.usd ?? null,
          change_24h: piData[`${currency}_24h_change`] ?? piData.usd_24h_change ?? null,
          source: "coingecko",
          updated_at: new Date().toISOString(),
        };
      }
    }
  } catch (_) { /* fallback below */ }

  try {
    const okxRes = await fetch("https://www.okx.com/api/v5/market/ticker?instId=PI-USDT", {
      headers: { Accept: "application/json" },
    });
    if (okxRes.ok) {
      const okxJson = await okxRes.json();
      const tick = Array.isArray(okxJson?.data) ? okxJson.data[0] : null;
      const usdPrice = Number(tick?.last || 0);
      if (usdPrice > 0) {
        const open24 = Number(tick?.open24h || 0);
        const chg24 = open24 > 0 ? Number((((usdPrice - open24) / open24) * 100).toFixed(2)) : null;
        let targetPrice: number | null = usdPrice;
        if (currency !== "usd") {
          try {
            const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
              headers: { Accept: "application/json" },
            });
            if (fxRes.ok) {
              const fxJson = await fxRes.json();
              const rate = Number(fxJson?.rates?.[currency.toUpperCase()] || 0);
              targetPrice = rate > 0 ? Number((usdPrice * rate).toFixed(4)) : null;
            }
          } catch (_) {
            targetPrice = null;
          }
        }
        return {
          asset: "PI",
          currency: currency.toUpperCase(),
          price: targetPrice,
          price_usd: usdPrice,
          change_24h: chg24,
          source: "okx",
          updated_at: new Date().toISOString(),
        };
      }
    }
  } catch (_) { /* ignore */ }

  return null;
}

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
    const rawPrice = p?.price_pi ?? p?.price ?? null;
    return {
      title: String(p?.title || "").slice(0, 120),
      price: rawPrice != null ? String(rawPrice).slice(0, 40) : null,
      price_pi: rawPrice,
      price_fiat: p?.price_fiat ? String(p.price_fiat).slice(0, 40) : null,
      badge: p?.badge ? String(p.badge).slice(0, 40) : null,
      link: p?.link ? String(p.link).slice(0, 300) : null,
      cta: p?.cta ? String(p.cta).slice(0, 40) : null,
      description: p?.description ? String(p.description).slice(0, 300) : null,
      image_url: p?.image_url ? String(p.image_url) : null,
    };
  });

  const rawSocialLinks = Array.isArray(row.social_links)
    ? row.social_links
    : (row.checklist_state && typeof row.checklist_state === "object" && !Array.isArray(row.checklist_state) && Array.isArray((row.checklist_state as Record<string, unknown>).social_links)
      ? ((row.checklist_state as Record<string, unknown>).social_links as unknown[])
      : []);
  let mapOfPiUrl: string | null = null;
  for (const s of rawSocialLinks) {
    if (!s || typeof s !== "object") continue;
    const sObj = s as Record<string, unknown>;
    if (String(sObj.network || "").toLowerCase() === "map_of_pi" && typeof sObj.url === "string") {
      const u = sObj.url.trim();
      if (/^https?:\/\//i.test(u)) {
        mapOfPiUrl = u.slice(0, 300);
        break;
      }
    }
  }

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
    map_of_pi_url: mapOfPiUrl,
    socials: {
      whatsapp_url: row.whatsapp_url || null,
      youtube_url: row.youtube_url || null,
      twitter_url: row.twitter_url || null,
      instagram_url: row.instagram_url || null,
    },
    products,
    auth_provider: row.auth_provider || "pi",
    is_pi_verified: row.is_pi_verified !== false,
    updated_at: row.updated_at || null,
  };
}

function dedupePassports(items: ReturnType<typeof projectPassport>[]) {
  const byUser = new Map<string, ReturnType<typeof projectPassport>>();
  for (const item of items) {
    if (!item.username) continue;
    const prev = byUser.get(item.username);
    if (!prev) {
      byUser.set(item.username, item);
      continue;
    }
    const prevScore = (prev.bio ? 2 : 0) + (prev.avatar_url ? 2 : 0) + (prev.products?.length ? 1 : 0);
    const currScore = (item.bio ? 2 : 0) + (item.avatar_url ? 2 : 0) + (item.products?.length ? 1 : 0);
    if (currScore > prevScore || (currScore === prevScore && String(item.updated_at || "") > String(prev.updated_at || ""))) {
      byUser.set(item.username, item);
    }
  }
  return Array.from(byUser.values());
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
    item_price: row.item_price || null,
    item_currency: row.item_currency || "PI",
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
  "username, bio, avatar_url, wallet_address, whatsapp_url, youtube_url, twitter_url, instagram_url, checklist_state, products, reputation_score, level_name, is_ambassador, referral_qualified_count, auth_provider, is_pi_verified, updated_at";

const PUBLIC_VILA_SELECT =
  "id, title, description, category, plan_tier, country_code, payment_modes, item_price, item_currency, link_url, image_url, pioneer_username, pioneer_name, created_at";

const PUBLIC_VILA_LEGACY_SELECT =
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
        docs_url: "https://hokage22b.com/construir",
      }, 300);
    }

    // 1. Ferramenta Stateless: Validador de Chave Pública Pi
    if (route === "/tools/validate-wallet") {
      const address = url.searchParams.get("address") || "";
      const result = validatePiPublicAddress(address);
      return ok("WALLET_VALIDATION", result, 0);
    }

    // 2. Ferramenta Stateless: Cotação Pi Normalizada (cache 5 min por moeda + fallback OKX)
    if (route === "/tools/pi-price") {
      const currency = String(url.searchParams.get("currency") || "BRL").trim().toLowerCase().replace(/[^a-z]/g, "") || "brl";
      const now = Date.now();
      const cached = priceCache.get(currency);
      if (cached && now < cached.expiresAt) {
        return ok("PI_PRICE", { ...cached.data, cached: true }, 60);
      }

      const fresh = await fetchPiPriceWithFallback(currency);
      if (fresh) {
        priceCache.set(currency, { data: fresh, expiresAt: now + 5 * 60_000 });
        return ok("PI_PRICE", { ...fresh, cached: false }, 60);
      }

      if (cached) {
        return ok("PI_PRICE", { ...cached.data, cached: true, stale: true }, 30);
      }

      return err("PRICE_UPSTREAM_UNAVAILABLE", "Fonte de cotação temporariamente indisponível.", 502);
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
      const rawU = url.searchParams.get("u") ?? url.searchParams.get("username");
      if (rawU !== null && rawU.trim() !== "") {
        const cleanU = rawU.trim().replace(/^@+/, "").toLowerCase();
        if (!/^[a-z0-9_.-]{2,32}$/.test(cleanU)) {
          return err(
            "INVALID_USERNAME",
            "Identificador @username inválido. Use apenas letras, números e underline (2 a 32 caracteres).",
            400
          );
        }
        const escapedU = cleanU.replace(/[\\%_]/g, "\\$&");
        const { data, error } = await supabase
          .from("pioneiros")
          .select(PUBLIC_PIONEER_SELECT)
          .or(`username.ilike.${escapedU},username.ilike.@${escapedU}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (!data) return err("PASSPORT_NOT_FOUND", `Passaporte @${cleanU} não encontrado.`, 404);
        return ok("PASSPORT_DETAIL", { passport: projectPassport(data) }, 60);
      }

      const limit = clampLimit(url.searchParams.get("limit"));
      const offset = clampOffset(url.searchParams.get("offset"));
      const tierFilter = String(url.searchParams.get("tier") || "").trim().toLowerCase();
      const hasMapOfPi = url.searchParams.get("has_map_of_pi") === "1";

      const { data, error } = await supabase
        .from("pioneiros")
        .select(PUBLIC_PIONEER_SELECT)
        .order("reputation_score", { ascending: false })
        .limit(500);

      if (error) throw error;

      let deduped = dedupePassports((data || []).map(projectPassport));
      if (tierFilter === "hokage" || tierFilter === "construtor" || tierFilter === "pioneiro") {
        deduped = deduped.filter((item) => item.journey_tier === tierFilter);
      }
      if (hasMapOfPi) {
        deduped = deduped.filter((item) => Boolean(item.map_of_pi_url));
      }
      const items = deduped.slice(offset, offset + limit);

      return ok("PASSPORT_LIST", {
        items,
        meta: { count: items.length, total: deduped.length, limit, offset },
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
        .limit(limit * 4);

      if (error) throw error;
      const leaders = dedupePassports((data || []).map(projectPassport)).slice(0, limit);
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

      const buildVilaQuery = (selectCols: string) => {
        let q = supabase
          .from("anuncios")
          .select(selectCols)
          .eq("status", "ativo")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (country && country !== "ALL") q = q.eq("country_code", country);
        if (category && category !== "all") q = q.eq("category", category);
        if (payment) q = q.eq("payment_modes", payment);
        if (plan) q = q.eq("plan_tier", plan);
        return q;
      };

      let { data, error } = await buildVilaQuery(PUBLIC_VILA_SELECT);
      if (error && /item_price|item_currency|42703|column/i.test(String(error.message || error.code || ""))) {
        const retry = await buildVilaQuery(PUBLIC_VILA_LEGACY_SELECT);
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;

      const items = (data || []).map(projectVilaAd);
      return ok("VILA_FEED", {
        items,
        meta: { count: items.length, limit, offset },
      }, 60);
    }

    // 6. Estatísticas Públicas Agregadas
    if (route === "/stats") {
      const [{ data: passRows }, { count: vilaActiveCount }] = await Promise.all([
        supabase.from("pioneiros").select("username, is_ambassador, referral_qualified_count"),
        supabase.from("anuncios").select("id", { count: "exact", head: true }).eq("status", "ativo"),
      ]);

      const uniqueUsers = new Map<string, boolean>();
      for (const r of (passRows || [])) {
        const u = normalizeHandle(String(r.username || ""));
        if (!u) continue;
        const isHok = Boolean(r.is_ambassador) || Number(r.referral_qualified_count || 0) >= 5 || u === "hokage22b";
        uniqueUsers.set(u, Boolean(uniqueUsers.get(u) || isHok));
      }
      const hokageCount = Array.from(uniqueUsers.values()).filter(Boolean).length;

      return ok("ECOSYSTEM_STATS", {
        passaportes_ativos: uniqueUsers.size,
        anuncios_vila_ativos: vilaActiveCount || 0,
        monte_hokage_membros: hokageCount,
        updated_at: new Date().toISOString(),
      }, 120);
    }

    return err("ROUTE_NOT_FOUND", `Rota '${route}' não encontrada. Consulte GET /v1/health.`, 404);
  } catch (e) {
    console.error("public-api error:", e);
    return err("INTERNAL_ERROR", "Erro ao processar consulta pública.", 500);
  }
});
