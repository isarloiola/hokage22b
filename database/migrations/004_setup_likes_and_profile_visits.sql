-- ============================================================
-- HOKAGE22B.COM — Métricas Avançadas: Visitas ao Perfil e Likes
-- Execute no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Adiciona colunas profile_visits e likes_count na tabela public.anuncios
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS profile_visits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 2. Função Atômica para Incrementar Visitas ao Perfil (Card Bronze, Prata, Ouro)
CREATE OR REPLACE FUNCTION public.increment_ad_profile_visit(p_ad_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_visits INTEGER;
BEGIN
    UPDATE public.anuncios
    SET profile_visits = COALESCE(profile_visits, 0) + 1
    WHERE id = p_ad_id
    RETURNING profile_visits INTO v_new_visits;

    RETURN COALESCE(v_new_visits, 0);
END;
$$;

-- 3. Função Atômica para Incrementar Likes / Apoios da Comunidade
CREATE OR REPLACE FUNCTION public.increment_ad_like(p_ad_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_likes INTEGER;
BEGIN
    UPDATE public.anuncios
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = p_ad_id
    RETURNING likes_count INTO v_new_likes;

    RETURN COALESCE(v_new_likes, 0);
END;
$$;

-- 4. Função Atômica para Desfazer Like (se o pioneiro desmarcar)
CREATE OR REPLACE FUNCTION public.decrement_ad_like(p_ad_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_likes INTEGER;
BEGIN
    UPDATE public.anuncios
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = p_ad_id
    RETURNING likes_count INTO v_new_likes;

    RETURN COALESCE(v_new_likes, 0);
END;
$$;

-- 5. Permissões de Execução Segura para Visitantes Públicos
REVOKE ALL ON FUNCTION public.increment_ad_profile_visit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_profile_visit(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.increment_ad_like(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_like(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.decrement_ad_like(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_ad_like(TEXT) TO anon, authenticated, service_role;

