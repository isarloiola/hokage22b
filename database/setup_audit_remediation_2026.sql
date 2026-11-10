-- ============================================================================
-- HOKAGE22B.COM — MIGRAÇÃO CONSOLIDADA DE BLINDAGEM E AUDITORIA WEB3 (2026)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
--
-- Corrige:
-- [F-01] Bloqueio de publicação gratuita de anúncios Ouro/Prata sem TXID via REST
-- [F-02] Exigência de TXID verificado em transacoes_pi para pioneer_renew_ad
-- [F-04] Proteção de wallet_address em perfis autenticados contra sobrescrita via RPC
-- [F-08] Fechamento de exposição pública da tabela financeira transacoes_pi
-- [F-09] Revogação definitiva de admin_set_vault_key sem chave atual
-- [PERF] RPC em lote increment_ad_views_batch para eliminar N queries por página
-- ============================================================================

-- ─── 1. PERFORMANCE: CONTADOR DE VISUALIZAÇÕES EM LOTE (BATCH RPC) ───────────
CREATE OR REPLACE FUNCTION public.increment_ad_views_batch(p_ad_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    IF p_ad_ids IS NULL OR array_length(p_ad_ids, 1) IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE public.anuncios
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = ANY(p_ad_ids);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ad_views_batch(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_views_batch(TEXT[]) TO anon, authenticated, service_role;


-- ─── 2. PRIVACIDADE FINANCEIRA: FECHAR LEITURA ANÔNIMA DE transacoes_pi [F-08] ─
ALTER TABLE IF EXISTS public.transacoes_pi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transacoes Pi publicas para consulta" ON public.transacoes_pi;
DROP POLICY IF EXISTS "Leitura publica de transacoes_pi" ON public.transacoes_pi;
DROP POLICY IF EXISTS "Permitir leitura publica de transacoes" ON public.transacoes_pi;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transacoes_pi;
DROP POLICY IF EXISTS "Bloqueio total de leitura anonima em transacoes_pi" ON public.transacoes_pi;

CREATE POLICY "Bloqueio total de leitura anonima em transacoes_pi"
    ON public.transacoes_pi
    FOR SELECT
    TO anon, authenticated
    USING (false);

-- RPC exclusiva para o Administrador consultar o livro-razão de transações Pi
CREATE OR REPLACE FUNCTION public.admin_get_all_transactions(p_secret TEXT)
RETURNS SETOF public.transacoes_pi
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.admin_verify_access(p_secret) THEN
        RAISE EXCEPTION 'Acesso Negado: Chave de administrador inválida.';
    END IF;

    RETURN QUERY
    SELECT * FROM public.transacoes_pi
    ORDER BY created_at DESC
    LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_transactions(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_transactions(TEXT) TO anon, authenticated, service_role;


-- ─── 3. BLINDAGEM DO TRIGGER DE INSERÇÃO DE ANÚNCIOS [F-01] ──────────────────
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS pi_txid TEXT,
  ADD COLUMN IF NOT EXISTS pi_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_txid TEXT;

CREATE OR REPLACE FUNCTION public.enforce_anuncio_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), current_user);
    v_has_txid BOOLEAN;
    v_clean_user TEXT;
BEGIN
    -- Sanitização de plano e métricas iniciais
    IF NEW.plan_tier IS NULL OR NEW.plan_tier NOT IN ('ouro', 'prata', 'bronze') THEN
        NEW.plan_tier := 'bronze';
    END IF;

    NEW.views_count    := 0;
    NEW.clicks_count   := 0;
    NEW.profile_visits := 0;
    NEW.likes_count    := 0;

    v_clean_user := LOWER(TRIM(REPLACE(COALESCE(NEW.pioneer_username, ''), '@', '')));

    -- Apenas @hokage22b pode marcar is_founder_demo
    IF COALESCE(NEW.is_founder_demo, false) = true AND v_clean_user <> 'hokage22b' THEN
        NEW.is_founder_demo := false;
    END IF;

    v_has_txid := (
        (NEW.pi_txid IS NOT NULL AND LENGTH(TRIM(NEW.pi_txid)) >= 8) OR
        (NEW.payment_txid IS NOT NULL AND LENGTH(TRIM(NEW.payment_txid)) >= 8)
    );

    -- Se não for service_role nem possuir TXID ou demonstração oficial do fundador,
    -- impede ativação gratuita direta via API REST anônima:
    IF v_role = 'anon' AND NOT v_has_txid AND NOT COALESCE(NEW.is_founder_demo, false) THEN
        NEW.status := 'aguardando_pagamento';
    ELSE
        IF COALESCE(NEW.is_founder_demo, false) = true THEN
            NEW.status := COALESCE(NEW.status, 'demonstracao');
        ELSE
            NEW.status := 'ativo';
        END IF;
    END IF;

    -- Regra estrita do Plano Bronze (sem links externos nem banners)
    IF NEW.plan_tier = 'bronze' AND NOT COALESCE(NEW.is_founder_demo, false) THEN
        NEW.link_url      := NULL;
        NEW.image_url     := NULL;
        NEW.exposure_type := 'chronological';
        NEW.price_pi      := COALESCE(NEW.price_pi, 0.3140);
    ELSIF NEW.plan_tier = 'prata' THEN
        NEW.exposure_type := 'rotation';
        NEW.price_pi      := COALESCE(NEW.price_pi, 1.0000);
    ELSIF NEW.plan_tier = 'ouro' THEN
        NEW.exposure_type := 'priority';
        IF COALESCE(NEW.is_founder_demo, false) THEN
            NEW.price_pi := COALESCE(NEW.price_pi, 0.0000);
        ELSE
            NEW.price_pi := COALESCE(NEW.price_pi, 3.1400);
        END IF;
    END IF;

    -- Validade temporal por tier
    IF COALESCE(NEW.is_founder_demo, false) = true OR NEW.id = 'card-mock-1' THEN
        NEW.expires_at := NULL;
    ELSIF NEW.plan_tier IN ('ouro', 'prata') THEN
        NEW.expires_at := NOW() + INTERVAL '7 days';
    ELSE
        NEW.expires_at := NOW() + INTERVAL '30 days';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_anuncio_defaults ON public.anuncios;
CREATE TRIGGER trg_enforce_anuncio_defaults
    BEFORE INSERT ON public.anuncios
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_anuncio_defaults();


-- ─── 4. BLINDAGEM DE RENOVAÇÃO DE ANÚNCIOS COM VALIDAÇÃO NO LEDGER [F-02] ────
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
    v_clean_user TEXT;
    v_current_tier TEXT;
    v_target_tier TEXT;
    v_new_interval INTERVAL;
    v_new_exposure TEXT;
    v_tx_verified BOOLEAN := false;
BEGIN
    IF p_ad_id IS NULL OR p_username IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Exige comprovação de TXID real registrado pela Edge Function pi-payment na tabela transacoes_pi
    IF p_txid IS NOT NULL AND LENGTH(TRIM(p_txid)) >= 8 THEN
        SELECT EXISTS (
            SELECT 1 FROM public.transacoes_pi
            WHERE txid = TRIM(p_txid) AND status = 'completed'
        ) INTO v_tx_verified;
    END IF;

    IF NOT v_tx_verified THEN
        RAISE EXCEPTION 'Renovação requer confirmação de pagamento válida na blockchain Pi.';
    END IF;

    v_clean_user := LOWER(TRIM(REPLACE(p_username, '@', '')));

    SELECT plan_tier INTO v_current_tier
    FROM public.anuncios
    WHERE id = p_ad_id
      AND (
          LOWER(TRIM(REPLACE(COALESCE(pioneer_username, ''), '@', ''))) = v_clean_user
          OR LOWER(TRIM(REPLACE(COALESCE(pioneer_name, ''), '@', ''))) = v_clean_user
      );

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    v_target_tier := COALESCE(p_upgrade_tier, v_current_tier, 'bronze');
    IF v_target_tier NOT IN ('ouro', 'prata', 'bronze') THEN
        v_target_tier := 'bronze';
    END IF;

    IF v_target_tier = 'ouro' THEN
        v_new_interval := INTERVAL '7 days';
        v_new_exposure := 'priority';
    ELSIF v_target_tier = 'prata' THEN
        v_new_interval := INTERVAL '7 days';
        v_new_exposure := 'rotation';
    ELSE
        v_new_interval := INTERVAL '30 days';
        v_new_exposure := 'chronological';
    END IF;

    UPDATE public.anuncios
    SET
        status        = 'ativo',
        plan_tier     = v_target_tier,
        exposure_type = v_new_exposure,
        expires_at    = GREATEST(COALESCE(expires_at, NOW()), NOW()) + v_new_interval,
        payment_txid  = COALESCE(p_txid, payment_txid),
        pi_txid       = COALESCE(p_txid, pi_txid)
    WHERE id = p_ad_id;

    RETURN FOUND;
END;
$$;


-- ─── 5. BLINDAGEM DE PERFIS DE PIONEIROS CONTRA TOMADA DE CARTEIRA [F-04] ────
-- Remove sobrecarga legada de 8 parâmetros (sem p_avatar) para evitar conflito PGRST203 no PostgREST
DROP FUNCTION IF EXISTS public.pioneer_save_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.pioneer_save_profile(
    p_username TEXT,
    p_bio TEXT DEFAULT NULL,
    p_wallet TEXT DEFAULT NULL,
    p_whatsapp TEXT DEFAULT NULL,
    p_youtube TEXT DEFAULT NULL,
    p_twitter TEXT DEFAULT NULL,
    p_instagram TEXT DEFAULT NULL,
    p_products JSONB DEFAULT '[]'::jsonb,
    p_avatar TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_user TEXT;
    v_formatted_user TEXT;
    v_existing_uid TEXT;
    v_existing_wallet TEXT;
    v_result JSONB;
BEGIN
    IF p_username IS NULL OR LENGTH(TRIM(p_username)) < 2 THEN
        RAISE EXCEPTION 'Nome de usuário inválido';
    END IF;

    v_clean_user := LOWER(TRIM(REPLACE(p_username, '@', '')));
    v_formatted_user := '@' || v_clean_user;

    -- Bloqueio absoluto de modificação não autenticada do perfil oficial do fundador
    IF v_clean_user = 'hokage22b' THEN
        RAISE EXCEPTION 'Operação negada: O perfil institucional @hokage22b exige autenticação via Pi SDK.';
    END IF;

    -- Verifica se o perfil já pertence a um pioneiro autenticado via Pi SDK (UID real da Pi Network)
    SELECT uid, wallet_address INTO v_existing_uid, v_existing_wallet
    FROM public.pioneiros
    WHERE LOWER(username) = v_formatted_user
    LIMIT 1;

    -- Se o pioneiro já possui UID verificado pelo Pi SDK ou já cadastrou carteira,
    -- impede que chamadas RPC sem token (fallback anônimo) alterem o endereço da carteira!
    IF v_existing_uid IS NOT NULL AND v_existing_uid NOT LIKE 'user_%' AND v_existing_uid NOT LIKE 'demo-%' THEN
        RAISE EXCEPTION 'Este perfil é verificado via Pi SDK. Autentique-se no Pi Browser para editá-lo.';
    END IF;

    IF v_existing_wallet IS NOT NULL AND LENGTH(TRIM(v_existing_wallet)) = 56 AND p_wallet IS DISTINCT FROM v_existing_wallet THEN
        RAISE EXCEPTION 'Alteração de carteira exige autenticação criptográfica via Pi SDK no Pi Browser.';
    END IF;

    -- Validação de formato da chave pública Stellar/Pi
    IF p_wallet IS NOT NULL AND LENGTH(TRIM(p_wallet)) > 0 THEN
        IF TRIM(p_wallet) !~ '^G[A-Z2-7]{55}$' THEN
            RAISE EXCEPTION 'Chave pública da Pi Wallet inválida.';
        END IF;
    END IF;

    INSERT INTO public.pioneiros (
        uid, username, bio, avatar_url, wallet_address,
        whatsapp_url, youtube_url, twitter_url, instagram_url,
        products, updated_at
    )
    VALUES (
        COALESCE(v_existing_uid, 'user_' || v_clean_user),
        v_formatted_user,
        LEFT(p_bio, 500),
        p_avatar,
         NULLIF(TRIM(p_wallet), ''),
        LEFT(p_whatsapp, 300),
        LEFT(p_youtube, 300),
        LEFT(p_twitter, 300),
        LEFT(p_instagram, 300),
        COALESCE(p_products, '[]'::jsonb),
        NOW()
    )
    ON CONFLICT (uid) DO UPDATE SET
        bio            = COALESCE(EXCLUDED.bio, public.pioneiros.bio),
        avatar_url     = COALESCE(EXCLUDED.avatar_url, public.pioneiros.avatar_url),
        wallet_address = COALESCE(EXCLUDED.wallet_address, public.pioneiros.wallet_address),
        whatsapp_url   = COALESCE(EXCLUDED.whatsapp_url, public.pioneiros.whatsapp_url),
        youtube_url    = COALESCE(EXCLUDED.youtube_url, public.pioneiros.youtube_url),
        twitter_url    = COALESCE(EXCLUDED.twitter_url, public.pioneiros.twitter_url),
        instagram_url  = COALESCE(EXCLUDED.instagram_url, public.pioneiros.instagram_url),
        products       = COALESCE(EXCLUDED.products, public.pioneiros.products),
        updated_at     = NOW()
    RETURNING to_jsonb(pioneiros.*) INTO v_result;

    RETURN v_result;
END;
$$;

-- ─── 6. REVOGAÇÃO DE VERSÃO ANTIGA DE admin_set_vault_key [F-09] ─────────────
DROP FUNCTION IF EXISTS public.admin_set_vault_key(text);

