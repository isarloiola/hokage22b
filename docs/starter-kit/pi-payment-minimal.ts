// ============================================================
// HOKAGE22B Starter Kit — Supabase Edge Function Mínima (Deno)
// Valida o usuário em api.minepi.com/v2/me + approve + complete
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyPiUser(accessToken: string) {
  const res = await fetch("https://api.minepi.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Token Pi inválido ou expirado.");
  const user = await res.json();
  if (!user?.username) throw new Error("Usuário Pi não identificado.");
  return user as { uid: string; username: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const PI_KEY = Deno.env.get("PI_SERVER_API_KEY");
    const SB_URL = Deno.env.get("SUPABASE_URL");
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!PI_KEY || !SB_URL || !SB_KEY) throw new Error("Secrets não configurados no Supabase.");

    const { action, paymentId, txid, accessToken } = await req.json();
    if (!paymentId || !accessToken) return json({ ok: false, error: "paymentId e accessToken são obrigatórios." }, 400);

    const piUser = await verifyPiUser(accessToken);
    const supabase = createClient(SB_URL, SB_KEY);

    if (action === "approve") {
      const piRes = await fetch(`https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/approve`, {
        method: "POST",
        headers: { Authorization: `Key ${PI_KEY}` },
      });
      if (!piRes.ok) throw new Error("Falha ao aprovar pagamento na Pi API.");
      const payment = await piRes.json();

      await supabase.from("transacoes_pi").upsert({
        payment_id: paymentId,
        pioneer_username: "@" + String(piUser.username).toLowerCase(),
        amount: Number(payment?.amount || 0),
        status: "approved",
        metadata: payment?.metadata || {},
      }, { onConflict: "payment_id" });

      return json({ ok: true, status: "approved", paymentId });
    }

    if (action === "complete") {
      if (!txid) return json({ ok: false, error: "txid obrigatório para complete." }, 400);
      const piRes = await fetch(`https://api.minepi.com/v2/payments/${encodeURIComponent(paymentId)}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });
      if (!piRes.ok) throw new Error("Falha ao completar pagamento na Pi API.");

      await supabase.from("transacoes_pi").update({
        txid,
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("payment_id", paymentId);

      return json({ ok: true, status: "completed", paymentId, txid });
    }

    return json({ ok: false, error: "Ação inválida." }, 400);
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Erro interno" }, 400);
  }
});
