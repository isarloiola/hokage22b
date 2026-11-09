-- ============================================================
-- HOKAGE22B.COM — Tabela de Denúncias da Comunidade (Moderação Descentralizada)
-- Execute este script no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Criação da Tabela de Denúncias
CREATE TABLE IF NOT EXISTS public.denuncias (
    id TEXT PRIMARY KEY,
    ad_id TEXT NOT NULL,
    ad_title TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    reporter_user TEXT DEFAULT '@pioneiro',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitação de Segurança RLS (Row Level Security)
ALTER TABLE public.denuncias ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança RLS
-- Qualquer pioneiro (autenticado ou anônimo) pode submeter uma denúncia legítima
DROP POLICY IF EXISTS "Permitir envio de denuncias" ON public.denuncias;
CREATE POLICY "Permitir envio de denuncias"
    ON public.denuncias
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Leitura de denúncias restrita (apenas admin ou serviço autenticado)
DROP POLICY IF EXISTS "Restringir leitura de denuncias" ON public.denuncias;
CREATE POLICY "Restringir leitura de denuncias"
    ON public.denuncias
    FOR SELECT
    TO authenticated
    USING (true);

-- 4. Índice para busca rápida de denúncias por anúncio e data
CREATE INDEX IF NOT EXISTS idx_denuncias_ad_created ON public.denuncias (ad_id, created_at DESC);

