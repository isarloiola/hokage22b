// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Network Payment Server
// Endpoint seguro para aprovar e completar pagamentos na Pi Network
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Trata preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, paymentId, txid } = await req.json();
    const PI_SERVER_API_KEY = Deno.env.get("PI_SERVER_API_KEY");

    if (!PI_SERVER_API_KEY) {
      throw new Error("PI_SERVER_API_KEY não configurada no Supabase Secrets.");
    }

    const piApiBase = "https://api.minepi.com/v2";

    // 1. APROVAÇÃO DO PAGAMENTO (onReadyForServerApproval)
    if (action === "approve") {
      const response = await fetch(`${piApiBase}/payments/${paymentId}/approve`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    // 2. CONCLUSÃO DO PAGAMENTO (onReadyForServerCompletion)
    if (action === "complete") {
      const response = await fetch(`${piApiBase}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      const data = await response.json();

      // Atualiza o status no banco de dados Supabase
      if (response.ok && data.metadata) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (data.metadata.adId) {
          // Ativa o anúncio no Mural dos Pioneiros
          await supabase
            .from("anuncios")
            .update({ status: "ativo" })
            .eq("id", data.metadata.adId);
        } else if (data.metadata.type === "ebook") {
          // Registra o pedido do e-book pago
          await supabase
            .from("doacoes")
            .insert([{
              donor_identifier: data.metadata.pioneer_username || "Pioneiro Pi",
              currency: "PI",
              amount: data.amount || 3.14,
              status: "recebido"
            }]);
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    // 3. CANCELAMENTO DO PAGAMENTO (onCancel ou limpeza de pendência)
    if (action === "cancel") {
      const response = await fetch(`${piApiBase}/payments/${paymentId}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

