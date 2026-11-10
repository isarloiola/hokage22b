// ============================================================
// HOKAGE22B — Supabase Edge Function: Pi Network Payment Server
// Endpoint seguro para aprovar, validar montantes e completar pagamentos na Pi Network
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

    if (!paymentId || typeof paymentId !== "string") {
      return new Response(JSON.stringify({ error: "paymentId é obrigatório." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
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
        body: "{}",
      });

      const data = await response.json();
      console.log(`Pi Payment Approve [${paymentId}]: HTTP ${response.status}`, data);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    // 2. CONCLUSÃO DO PAGAMENTO (onReadyForServerCompletion)
    if (action === "complete") {
      if (!txid || typeof txid !== "string") {
        return new Response(JSON.stringify({ error: "txid da transação blockchain é obrigatório para conclusão." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Conclui oficialmente o pagamento na Pi Core Team Platform API
      const response = await fetch(`${piApiBase}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid }),
      });

      const data = await response.json();

      // Processamento contábil e ativação de serviços no Supabase
      if (response.ok && data) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const paidAmount = Number(data.amount) || 0;
        const metadata = data.metadata || {};

        // A. Anti-Tampering: Validação de montante mínimo para anúncios do mural
        if (metadata.adId) {
          const { data: ad, error: adErr } = await supabase
            .from("anuncios")
            .select("id, price_pi, status")
            .eq("id", metadata.adId)
            .maybeSingle();

          const expectedPrice = (ad && Number(ad.price_pi)) ? Number(ad.price_pi) : 0.314;

          if (paidAmount < expectedPrice) {
            console.error(`[Security Alert] Montante insuficiente: pago ${paidAmount} Pi, esperado ${expectedPrice} Pi.`);
          } else {
            // Ativa o anúncio com verificação de montante aprovada
            await supabase
              .from("anuncios")
              .update({ status: "ativo" })
              .eq("id", metadata.adId);
          }
        } else if (metadata.type === "ebook") {
          // B. Registro de compra de E-book com verificação de montante (mínimo 3.14 Pi)
          const expectedEbookPrice = 3.14;
          if (paidAmount >= expectedEbookPrice) {
            await supabase
              .from("doacoes")
              .insert([{
                donor_identifier: metadata.pioneer_username || "Pioneiro Pi",
                currency: "PI",
                amount: paidAmount,
                status: "recebido"
              }]);
          } else {
            console.error(`[Security Alert] Montante insuficiente para E-book: pago ${paidAmount} Pi.`);
          }
        }

        // C. Ledger Imutável de Transações (Idempotente)
        try {
          await supabase
            .from("transacoes_pi")
            .upsert({
              payment_id: paymentId,
              txid: txid || (data.transaction && data.transaction.txid) || null,
              from_address: data.from_address || null,
              to_address: data.to_address || null,
              amount: paidAmount,
              status: "completed",
              purpose: metadata.type || (metadata.adId ? "anuncio_mural" : "pagamento_geral"),
              metadata: metadata,
              created_at: new Date().toISOString()
            }, { onConflict: "payment_id" });
        } catch (ledgerErr) {
          console.warn("[Ledger Warning] Erro ao registrar na tabela transacoes_pi:", ledgerErr);
        }
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: response.status,
      });
    }

    // 3. CANCELAMENTO DO PAGAMENTO (onCancel ou limpeza de pendência com idempotência)
    if (action === "cancel") {
      const response = await fetch(`${piApiBase}/payments/${paymentId}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Key ${PI_SERVER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });

      const data = await response.json().catch(() => ({}));

      // Se a Pi Network responder que já foi cancelado ou não encontrado, trata como sucesso (idempotente)
      const isAlreadyCancelled = !response.ok && (
        (data && data.error && (typeof data.error === "string") && (data.error.includes("already_cancelled") || data.error.includes("not_found") || data.error.includes("expired"))) ||
        (data && data.error_message && (typeof data.error_message === "string") && (data.error_message.includes("already") || data.error_message.includes("cancelled") || data.error_message.includes("canceled") || data.error_message.includes("expired")))
      );

      if (isAlreadyCancelled) {
        return new Response(JSON.stringify({ status: "cancelled", message: "Pagamento já cancelado ou expirado na Pi Network.", data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

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
