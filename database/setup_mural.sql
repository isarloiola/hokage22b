-- ============================================================
-- HOKAGE22B.COM — Tabela de Anúncios da Gazeta dos Pioneiros
-- Execute este script no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Criação da Tabela de Anúncios
CREATE TABLE IF NOT EXISTS public.anuncios (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link_url TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'geral',
    pioneer_username TEXT DEFAULT '@pioneiro',
    pioneer_name TEXT DEFAULT 'Pioneiro',
    plan_tier TEXT DEFAULT 'prata',
    price_pi NUMERIC(8, 4) DEFAULT 1.0,
    payment_txid TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitação de Segurança RLS (Row Level Security)
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança
-- Qualquer visitante pode ler anúncios com status 'ativo'
DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
CREATE POLICY "Permitir leitura pública de anúncios ativos"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (status = 'ativo');

-- Qualquer pioneiro autenticado/anônimo que pagar pode inserir novo anúncio
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 4. Índice para alta performance na listagem da Gazeta
CREATE INDEX IF NOT EXISTS idx_anuncios_status_created ON public.anuncios (status, created_at DESC);
