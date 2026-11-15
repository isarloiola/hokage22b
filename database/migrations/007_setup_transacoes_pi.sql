-- ============================================================
-- HOKAGE22B — Ledger Imutável de Transações Pi Network (Web3)
-- Conciliação Contábil, Idempotência e Auditoria Pública
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transacoes_pi (
    payment_id TEXT PRIMARY KEY,
    txid TEXT,
    from_address TEXT,
    to_address TEXT,
    amount NUMERIC(16, 6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    purpose TEXT DEFAULT 'geral',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativa RLS
ALTER TABLE public.transacoes_pi ENABLE ROW LEVEL SECURITY;

-- 1. Transparência Web3: qualquer pioneiro pode consultar o histórico de transações confirmadas
DROP POLICY IF EXISTS "Transacoes Pi publicas para consulta" ON public.transacoes_pi;
CREATE POLICY "Transacoes Pi publicas para consulta"
ON public.transacoes_pi FOR SELECT
TO public
USING (true);

-- 2. Escrita estritamente bloqueada para clientes diretos (anon / authenticated)
-- Somente o backend (service_role das Edge Functions) pode gravar ou alterar
REVOKE INSERT, UPDATE, DELETE ON public.transacoes_pi FROM public, anon, authenticated;

