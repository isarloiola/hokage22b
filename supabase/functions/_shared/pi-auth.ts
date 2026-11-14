// ============================================================
// HOKAGE22B — Shared Pi Network Authentication Helper (/v2/me)
// ============================================================

import { HttpPayloadError } from "./http.ts";

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
