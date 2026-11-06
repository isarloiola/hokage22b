-- ============================================================
-- HOKAGE22B.COM — Permissões do Painel Administrativo Web3
-- Execute no SQL Editor do Supabase para habilitar a moderação:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Leitura de todos os anúncios (ativos, pausados e pendentes)
DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir leitura de todos os anúncios" ON public.anuncios;
CREATE POLICY "Permitir leitura de todos os anúncios"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- 2. Atualização de anúncios (aprovar, pausar, destacar como ouro)
DROP POLICY IF EXISTS "Permitir moderação de anúncios" ON public.anuncios;
CREATE POLICY "Permitir moderação de anúncios"
    ON public.anuncios
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- 3. Exclusão de anúncios
DROP POLICY IF EXISTS "Permitir exclusão de anúncios" ON public.anuncios;
CREATE POLICY "Permitir exclusão de anúncios"
    ON public.anuncios
    FOR DELETE
    TO anon, authenticated
    USING (true);

-- 4. Leitura de leads capturados (para consulta no painel)
DROP POLICY IF EXISTS "Permitir leitura de leads para admin" ON public.leads;
CREATE POLICY "Permitir leitura de leads para admin"
    ON public.leads
    FOR SELECT
    TO anon, authenticated
    USING (true);
