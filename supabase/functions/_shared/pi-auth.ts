// ============================================================
// HOKAGE22B — Shared Pi Network & Hybrid Web2 Authentication Helper
// ============================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpPayloadError } from "./http.ts";

export const RESERVED_HANDLES = new Set<string>([
  "admin",
  "hokage22b",
  "pi",
  "pinetwork",
  "suporte",
  "support",
  "oficial",
  "official",
  "root",
  "moderator",
  "sistema",
  "system",
  "vila",
  "mural",
  "pioneiro",
  "explorar",
  "diretorio",
  "monte",
  "jornada",
  "ferramentas",
  "zero",
  "um",
  "vender",
  "construir",
  "business",
  "empresas",
  "legal",
  "hackathon",
  "obrigado",
]);

export interface ResolvedActor {
  kind: "pi" | "web2";
  uid: string;
  username: string;
  isPiVerified: boolean;
  authUserId?: string;
  email?: string | null;
  isNewWeb2?: boolean;
}

export function normalizeHandle(handle: string): string {
  return String(handle || "").trim().replace(/^@+/, "").toLowerCase();
}

export async function verifyPiAccessToken(accessToken: string): Promise<{ uid: string; username: string }> {
  if (!accessToken || typeof accessToken !== "string") {
    throw new HttpPayloadError(
      "MISSING_ACCESS_TOKEN",
      "Autenticação Pi Browser obrigatória (accessToken ausente).",
      401
    );
  }

  const piResponse = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!piResponse.ok) {
    throw new HttpPayloadError(
      "PI_AUTH_EXPIRED",
      "Sessão Pi Network inválida ou expirada. Faça login novamente no Pi Browser.",
      401
    );
  }

  const piUser = await piResponse.json().catch(() => null);
  if (!piUser || !piUser.uid || !piUser.username) {
    throw new HttpPayloadError(
      "PI_IDENTITY_INVALID",
      "Falha ao obter identidade verificada da Pi Network.",
      401
    );
  }

  return {
    uid: String(piUser.uid),
    username: "@" + normalizeHandle(String(piUser.username)),
  };
}

export async function verifyWeb2AccessToken(
  supabase: SupabaseClient,
  web2Token: string
): Promise<{ authUserId: string; email: string | null }> {
  if (!web2Token || typeof web2Token !== "string" || !web2Token.trim()) {
    throw new HttpPayloadError(
      "WEB2_AUTH_EXPIRED",
      "Sessão Web inválida ou expirada. Solicite um novo link de acesso por e-mail.",
      401
    );
  }

  const { data, error } = await supabase.auth.getUser(web2Token.trim());
  if (error || !data?.user?.id) {
    throw new HttpPayloadError(
      "WEB2_AUTH_EXPIRED",
      "Sessão Web inválida ou expirada. Solicite um novo link de acesso por e-mail.",
      401
    );
  }

  return {
    authUserId: String(data.user.id),
    email: data.user.email ? String(data.user.email).toLowerCase() : null,
  };
}

export async function resolveActor(
  supabase: SupabaseClient,
  params: {
    accessToken?: unknown;
    web2Token?: unknown;
    requestedHandle?: unknown;
    requireExistingProfile?: boolean;
  }
): Promise<ResolvedActor> {
  const rawPiToken = typeof params.accessToken === "string" ? params.accessToken.trim() : "";
  if (rawPiToken) {
    const piUser = await verifyPiAccessToken(rawPiToken);
    return {
      kind: "pi",
      uid: piUser.uid,
      username: piUser.username,
      isPiVerified: true,
    };
  }

  const rawWeb2Token = typeof params.web2Token === "string" ? params.web2Token.trim() : "";
  if (rawWeb2Token) {
    const web2 = await verifyWeb2AccessToken(supabase, rawWeb2Token);
    const { data: existingRow, error: rowErr } = await supabase
      .from("pioneiros")
      .select("uid, username, is_pi_verified")
      .eq("auth_user_id", web2.authUserId)
      .maybeSingle();

    if (rowErr) {
      throw new HttpPayloadError("PROFILE_LOOKUP_FAILED", "Falha ao consultar seu perfil no servidor.", 500);
    }

    if (existingRow && existingRow.uid && existingRow.username) {
      return {
        kind: "web2",
        uid: String(existingRow.uid),
        username: "@" + normalizeHandle(String(existingRow.username)),
        isPiVerified: Boolean(existingRow.is_pi_verified),
        authUserId: web2.authUserId,
        email: web2.email,
        isNewWeb2: false,
      };
    }

    if (params.requireExistingProfile) {
      throw new HttpPayloadError(
        "WEB2_PROFILE_REQUIRED",
        "Crie seu @usuário no Passaporte antes de realizar esta ação.",
        403
      );
    }

    const clean = normalizeHandle(String(params.requestedHandle || ""));
    if (!/^[a-z0-9_]{3,24}$/.test(clean) || RESERVED_HANDLES.has(clean)) {
      throw new HttpPayloadError(
        "INVALID_HANDLE",
        "Escolha um @usuário válido entre 3 e 24 caracteres (letras minúsculas, números e _).",
        400
      );
    }

    const escaped = clean.replace(/[\\%_]/g, "\\$&");
    const { data: conflictRow } = await supabase
      .from("pioneiros")
      .select("uid")
      .or(`username.ilike.@${escaped},username.ilike.${escaped}`)
      .limit(1)
      .maybeSingle();

    if (conflictRow) {
      throw new HttpPayloadError(
        "HANDLE_TAKEN",
        "Este @usuário já está em uso. Escolha outro.",
        409
      );
    }

    return {
      kind: "web2",
      uid: `web2_${web2.authUserId}`,
      username: `@${clean}`,
      isPiVerified: false,
      authUserId: web2.authUserId,
      email: web2.email,
      isNewWeb2: true,
    };
  }

  throw new HttpPayloadError(
    "MISSING_ACCESS_TOKEN",
    "Autenticação obrigatória. Conecte via Pi Browser ou entre com seu e-mail.",
    401
  );
}
