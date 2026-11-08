-- ============================================================
-- HOKAGE22B — BACKUP PRE-FASE 1 (ESTADO ANTERIOR À BLINDAGEM)
-- Data: 08/11/2026
-- Objetivo: Preservar as estruturas, triggers e políticas RLS
--           anteriores para permitir rollback imediato caso necessário.
-- ============================================================

-- 1. POLÍTICAS ANTERIORES DA TABELA PIONEIROS
-- DROP POLICY IF EXISTS "Pioneiros - Leitura Pública" ON public.pioneiros;
-- DROP POLICY IF EXISTS "Pioneiros - Gravação Restrita" ON public.pioneiros;
-- DROP POLICY IF EXISTS "Pioneiros - Atualização Restrita" ON public.pioneiros;

-- CREATE POLICY "Pioneiros - Leitura Pública"
--     ON public.pioneiros FOR SELECT
--     TO anon, authenticated
--     USING (true);

-- CREATE POLICY "Pioneiros - Gravação Restrita"
--     ON public.pioneiros FOR INSERT
--     TO anon, authenticated
--     WITH CHECK (
--         LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
--         OR uid = 'user_hokage22b'
--     );

-- CREATE POLICY "Pioneiros - Atualização Restrita"
--     ON public.pioneiros FOR UPDATE
--     TO anon, authenticated
--     USING (
--         LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
--         OR uid = 'user_hokage22b'
--     )
--     WITH CHECK (
--         LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
--         OR uid = 'user_hokage22b'
--     );

-- 2. POLÍTICAS ANTERIORES DA TABELA ANUNCIOS
-- DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
-- DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;

-- CREATE POLICY "Permitir leitura pública de anúncios ativos"
--     ON public.anuncios
--     FOR SELECT
--     TO anon, authenticated
--     USING (status = 'ativo');

-- CREATE POLICY "Permitir envio público de anúncio"
--     ON public.anuncios
--     FOR INSERT
--     TO anon, authenticated
--     WITH CHECK (true);

-- 3. POLÍTICAS ANTERIORES DA TABELA LEADS
-- DROP POLICY IF EXISTS "Permitir inserção pública de leads" ON public.leads;
-- CREATE POLICY "Permitir inserção pública de leads"
--     ON public.leads
--     FOR INSERT
--     TO anon, authenticated
--     WITH CHECK (true);

-- 4. POLÍTICAS ANTERIORES DA TABELA DOACOES
-- DROP POLICY IF EXISTS "Permitir registro de doações" ON public.doacoes;
-- CREATE POLICY "Permitir registro de doações"
--     ON public.doacoes
--     FOR INSERT
--     TO anon, authenticated
--     WITH CHECK (true);

