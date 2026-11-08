-- ============================================================
-- HOKAGE22B — ROLLBACK FASE 1: RESTAURAR POLÍTICAS ANTERIORES
-- Utilize este script APENAS se precisar desfazer a blindagem da Fase 1.
-- Executar no SQL Editor do Supabase.
-- ============================================================

-- 1. RESTAURAR POLÍTICAS DA TABELA public.pioneiros
DROP POLICY IF EXISTS "pioneiros_select_public" ON public.pioneiros;
DROP POLICY IF EXISTS "pioneiros_insert_backend_only" ON public.pioneiros;
DROP POLICY IF EXISTS "pioneiros_update_backend_only" ON public.pioneiros;
DROP POLICY IF EXISTS "pioneiros_delete_backend_only" ON public.pioneiros;

CREATE POLICY "Pioneiros - Leitura Pública"
    ON public.pioneiros FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Pioneiros - Gravação Restrita"
    ON public.pioneiros FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
        OR uid = 'user_hokage22b'
    );

CREATE POLICY "Pioneiros - Atualização Restrita"
    ON public.pioneiros FOR UPDATE
    TO anon, authenticated
    USING (
        LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
        OR uid = 'user_hokage22b'
    )
    WITH CHECK (
        LOWER(REPLACE(username, '@', '')) <> 'hokage22b'
        OR uid = 'user_hokage22b'
    );


-- 2. RESTAURAR POLÍTICAS DA TABELA public.anuncios
DROP TRIGGER IF EXISTS trg_anuncio_defaults ON public.anuncios;
DROP FUNCTION IF EXISTS public.trg_enforce_anuncio_defaults();

DROP POLICY IF EXISTS "anuncios_select_ativos" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_insert_pendente_only" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_update_blocked" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_delete_blocked" ON public.anuncios;

CREATE POLICY "Permitir leitura pública de anúncios ativos"
    ON public.anuncios FOR SELECT
    TO anon, authenticated
    USING (status = 'ativo');

CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

