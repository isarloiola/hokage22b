-- ============================================================
-- HOKAGE22B.COM — Métricas de Performance dos Anúncios
-- Contador de Visualizações e Cliques (Atomic RPC)
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Adiciona colunas de métricas na tabela public.anuncios (se não existirem)
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;

-- 2. Função Atômica para Incrementar Cliques
CREATE OR REPLACE FUNCTION public.increment_ad_click(p_ad_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_clicks INTEGER;
BEGIN
    UPDATE public.anuncios
    SET clicks_count = COALESCE(clicks_count, 0) + 1
    WHERE id = p_ad_id
    RETURNING clicks_count INTO v_new_clicks;

    RETURN COALESCE(v_new_clicks, 0);
END;
$$;

-- 3. Função Atômica para Incrementar Visualizações
CREATE OR REPLACE FUNCTION public.increment_ad_view(p_ad_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_views INTEGER;
BEGIN
    UPDATE public.anuncios
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_ad_id
    RETURNING views_count INTO v_new_views;

    RETURN COALESCE(v_new_views, 0);
END;
$$;

-- 4. Permissões de Execução Segura para Visitantes Públicos
REVOKE ALL ON FUNCTION public.increment_ad_click(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_click(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.increment_ad_view(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_view(TEXT) TO anon, authenticated, service_role;

