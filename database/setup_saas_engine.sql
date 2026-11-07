-- ============================================================
-- HOKAGE22B.COM — Motor SaaS Completo (Expiração, Vitrines e Perfil)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Aprimoramento da Tabela de Anúncios (Expiração de 30 dias e Métricas)
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (TIMEZONE('utc'::text, NOW()) + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Atualiza anúncios existentes sem data de expiração para terem 30 dias a partir de agora
UPDATE public.anuncios 
SET expires_at = created_at + INTERVAL '30 days' 
WHERE expires_at IS NULL;

-- 2. Aprimoramento da Tabela de Pioneiros (Mini-Loja, Chave Pública e Redes Sociais)
CREATE TABLE IF NOT EXISTS public.pioneiros (
    uid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    auth_type TEXT DEFAULT 'pi-sdk',
    reputation_score INTEGER DEFAULT 50,
    level_name TEXT DEFAULT 'Pioneiro Iniciante',
    checklist_state JSONB DEFAULT '{}'::jsonb,
    bio TEXT,
    wallet_address TEXT,
    whatsapp_url TEXT,
    youtube_url TEXT,
    twitter_url TEXT,
    instagram_url TEXT,
    avatar_url TEXT,
    products JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Garante colunas caso a tabela já existisse anteriormente
ALTER TABLE public.pioneiros
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Habilita RLS em pioneiros
ALTER TABLE public.pioneiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de perfis de pioneiros" ON public.pioneiros;
CREATE POLICY "Leitura pública de perfis de pioneiros"
    ON public.pioneiros FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Inserção ou atualização de pioneiros" ON public.pioneiros;
CREATE POLICY "Inserção ou atualização de pioneiros"
    ON public.pioneiros FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Função RPC: Buscar Anúncios do Próprio Pioneiro (com dias restantes)
CREATE OR REPLACE FUNCTION public.pioneer_get_my_ads(p_username TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    link_url TEXT,
    image_url TEXT,
    category TEXT,
    plan_tier TEXT,
    price_pi NUMERIC,
    status TEXT,
    views_count INTEGER,
    clicks_count INTEGER,
    days_left INTEGER,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.link_url,
        a.image_url,
        a.category,
        a.plan_tier,
        a.price_pi,
        a.status,
        COALESCE(a.views_count, 0) AS views_count,
        COALESCE(a.clicks_count, 0) AS clicks_count,
        GREATEST(0, EXTRACT(DAY FROM (COALESCE(a.expires_at, a.created_at + INTERVAL '30 days') - NOW()))::INTEGER) AS days_left,
        a.created_at,
        COALESCE(a.expires_at, a.created_at + INTERVAL '30 days') AS expires_at
    FROM public.anuncios a
    WHERE LOWER(REPLACE(a.pioneer_username, '@', '')) = LOWER(REPLACE(p_username, '@', ''))
    ORDER BY a.created_at DESC;
END;
$$;

-- 4. Função RPC: Editar Anúncio pelo Próprio Anunciante
CREATE OR REPLACE FUNCTION public.pioneer_update_my_ad(
    p_ad_id TEXT,
    p_username TEXT,
    p_title TEXT,
    p_description TEXT,
    p_link_url TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.anuncios
    SET 
        title = COALESCE(NULLIF(TRIM(p_title), ''), title),
        description = COALESCE(NULLIF(TRIM(p_description), ''), description),
        link_url = NULLIF(TRIM(p_link_url), ''),
        image_url = NULLIF(TRIM(p_image_url), '')
    WHERE id = p_ad_id
      AND LOWER(REPLACE(pioneer_username, '@', '')) = LOWER(REPLACE(p_username, '@', ''));

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN (v_updated > 0);
END;
$$;

-- 5. Função RPC: Renovar Anúncio por mais 30 dias (ou turbinar plano)
CREATE OR REPLACE FUNCTION public.pioneer_renew_ad(
    p_ad_id TEXT,
    p_username TEXT,
    p_txid TEXT DEFAULT NULL,
    p_upgrade_tier TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE public.anuncios
    SET 
        expires_at = GREATEST(NOW(), COALESCE(expires_at, NOW())) + INTERVAL '30 days',
        status = 'ativo',
        plan_tier = COALESCE(NULLIF(p_upgrade_tier, ''), plan_tier),
        payment_txid = COALESCE(NULLIF(p_txid, ''), payment_txid)
    WHERE id = p_ad_id
      AND LOWER(REPLACE(pioneer_username, '@', '')) = LOWER(REPLACE(p_username, '@', ''));

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN (v_updated > 0);
END;
$$;

-- 6. Função RPC: Salvar/Atualizar Perfil Completo do Pioneiro (com Mini-Loja)
CREATE OR REPLACE FUNCTION public.pioneer_save_profile(
    p_username TEXT,
    p_bio TEXT DEFAULT NULL,
    p_wallet TEXT DEFAULT NULL,
    p_whatsapp TEXT DEFAULT NULL,
    p_youtube TEXT DEFAULT NULL,
    p_twitter TEXT DEFAULT NULL,
    p_instagram TEXT DEFAULT NULL,
    p_products JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_user TEXT;
    v_res RECORD;
BEGIN
    v_clean_user := '@' || LOWER(REPLACE(TRIM(p_username), '@', ''));

    INSERT INTO public.pioneiros (
        uid,
        username,
        bio,
        wallet_address,
        whatsapp_url,
        youtube_url,
        twitter_url,
        instagram_url,
        products,
        updated_at
    )
    VALUES (
        'user_' || LOWER(REPLACE(TRIM(p_username), '@', '')),
        v_clean_user,
        p_bio,
        p_wallet,
        p_whatsapp,
        p_youtube,
        p_twitter,
        p_instagram,
        COALESCE(p_products, '[]'::jsonb),
        NOW()
    )
    ON CONFLICT (uid) DO UPDATE SET
        username = EXCLUDED.username,
        bio = COALESCE(EXCLUDED.bio, public.pioneiros.bio),
        wallet_address = COALESCE(EXCLUDED.wallet_address, public.pioneiros.wallet_address),
        whatsapp_url = COALESCE(EXCLUDED.whatsapp_url, public.pioneiros.whatsapp_url),
        youtube_url = COALESCE(EXCLUDED.youtube_url, public.pioneiros.youtube_url),
        twitter_url = COALESCE(EXCLUDED.twitter_url, public.pioneiros.twitter_url),
        instagram_url = COALESCE(EXCLUDED.instagram_url, public.pioneiros.instagram_url),
        products = COALESCE(EXCLUDED.products, public.pioneiros.products),
        updated_at = NOW()
    RETURNING * INTO v_res;

    RETURN to_jsonb(v_res);
END;
$$;

-- 7. Atualização Segura da Função do Painel Admin (com Métricas e Imagem)
CREATE OR REPLACE FUNCTION public.admin_get_all_ads(p_secret TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    description TEXT,
    link_url TEXT,
    image_url TEXT,
    category TEXT,
    pioneer_username TEXT,
    pioneer_name TEXT,
    plan_tier TEXT,
    price_pi NUMERIC,
    status TEXT,
    payment_txid TEXT,
    views_count INTEGER,
    clicks_count INTEGER,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    days_left INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT admin_verify_access(p_secret) THEN
        RAISE EXCEPTION 'Acesso Negado: Chave de Seguranca Invalida';
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.link_url,
        a.image_url,
        a.category,
        a.pioneer_username,
        a.pioneer_name,
        a.plan_tier,
        a.price_pi,
        a.status,
        a.payment_txid,
        COALESCE(a.views_count, 0) AS views_count,
        COALESCE(a.clicks_count, 0) AS clicks_count,
        a.created_at,
        COALESCE(a.expires_at, a.created_at + INTERVAL '30 days') AS expires_at,
        GREATEST(0, EXTRACT(DAY FROM (COALESCE(a.expires_at, a.created_at + INTERVAL '30 days') - NOW()))::INTEGER) AS days_left
    FROM public.anuncios a
    ORDER BY a.created_at DESC;
END;
$$;

-- 8. Concede Permissões Seguras
GRANT EXECUTE ON FUNCTION public.pioneer_get_my_ads(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pioneer_update_my_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pioneer_renew_ad(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pioneer_save_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
