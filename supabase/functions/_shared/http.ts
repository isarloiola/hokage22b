// ============================================================
// HOKAGE22B — Shared HTTP, CORS, Config & JSON Envelope Helpers
// Padronização API-First / Agent-Ready para todas as Edge Functions
// ============================================================

export const ALLOWED_ORIGINS = new Set([
  "https://hokage22b.com",
  "https://www.hokage22b.com",
  "https://isarloiola.github.io",
]);

export const MURAL_CONFIG = {
  plans: {
    ouro: { price_pi: 3.14, permanent: true, allows_link: true, allows_image: true },
    prata: { price_pi: 1.0, permanent: true, allows_link: true, allows_image: true },
    bronze: { price_pi: 0.314, permanent: true, allows_link: false, allows_image: false },
  },
  products: {
    "pi-para-seu-negocio": { id: "pi-para-seu-negocio", title: "Pi para seu negócio", price_pi: 3.14, price_brl: 19.9 },
    "ia-na-pratica": { id: "ia-na-pratica", title: "IA na Prática", price_pi: 7.5, price_brl: 47.0 },
  },
  categories: ["youtube", "produto", "servico", "mensagem", "geral"],
  payment_modes: ["pi", "pi_fiat", "fiat", "pi_reais", "reais"],
  countries: ["GLOBAL", "BR", "US", "PT", "ES", "NG", "PH", "VN", "IN", "EU", "OTHER"],
};

export function getCorsHeaders(req: Request, restrictOrigin = false): Record<string, string> {
  if (!restrictOrigin) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };
  }
  const origin = req.headers.get("origin") || "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowOrigin = (ALLOWED_ORIGINS.has(origin) || isLocal) ? origin : "https://hokage22b.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function jsonResponse(body: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export function jsonOk(
  code: string,
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  status = 200
): Response {
  return jsonResponse({ ok: true, code, data, ...data }, corsHeaders, status);
}

export function jsonError(
  code: string,
  message: string,
  corsHeaders: Record<string, string>,
  status = 400,
  extra: Record<string, unknown> = {}
): Response {
  return jsonResponse(
    {
      ok: false,
      code,
      error: message,
      error_detail: { code, message },
      ...extra,
    },
    corsHeaders,
    status
  );
}

export class HttpPayloadError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function parseJsonBody(req: Request, maxBytes = 32 * 1024): Promise<Record<string, any>> {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > maxBytes) {
    throw new HttpPayloadError("PAYLOAD_TOO_LARGE", "Payload excede o limite de segurança.", 413);
  }
  const rawText = await req.text();
  if (rawText.length > maxBytes) {
    throw new HttpPayloadError("PAYLOAD_TOO_LARGE", "Payload excede o limite de segurança.", 413);
  }
  if (!rawText.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Root JSON must be an object");
    }
    return parsed as Record<string, any>;
  } catch (_) {
    throw new HttpPayloadError("INVALID_JSON", "Corpo da requisição não é um JSON válido.", 400);
  }
}
