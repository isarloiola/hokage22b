-- ============================================================
-- HOKAGE22B Starter Kit — Schema Mínimo de Transações Pi
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transacoes_pi (
  id BIGSERIAL PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  txid TEXT,
  pioneer_username TEXT NOT NULL,
  amount NUMERIC(12, 4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.transacoes_pi ENABLE ROW LEVEL SECURITY;

-- Nenhuma escrita anônima direta pelo navegador; apenas Edge Functions (service_role) escrevem.
REVOKE INSERT, UPDATE, DELETE ON public.transacoes_pi FROM anon, authenticated;
