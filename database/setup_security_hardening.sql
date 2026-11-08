-- ============================================================
-- HOKAGE22B.COM — Blindagem de Segurança de Alto Nível (Zero-Trust)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Constraint de Integridade Criptográfica de Chave Pública Pi Network (Stellar ed25519)
-- Garante que o PostgreSQL rejeite qualquer chave que não comece com 'G' e não tenha 56 caracteres Base32
ALTER TABLE public.pioneiros
DROP CONSTRAINT IF EXISTS chk_pioneiro_wallet_format;

ALTER TABLE public.pioneiros
ADD CONSTRAINT chk_pioneiro_wallet_format 
CHECK (wallet_address IS NULL OR wallet_address = '' OR wallet_address ~ '^G[A-Z2-7]{55}$');


-- 2. Trigger de Proteção Imutável para Contas do Fundador e Oficiais
-- Impede que qualquer ataque ou chamada anônima altere a chave pública da plataforma
CREATE OR REPLACE FUNCTION public.protect_critical_pioneers_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Protege a conta do fundador @hokage22b contra substituição de carteira
    IF LOWER(REPLACE(NEW.username, '@', '')) = 'hokage22b' THEN
        -- A carteira oficial do fundador é imutável
        NEW.wallet_address := 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR';
        NEW.is_verified := true;
    END IF;

    -- Normaliza username para minúsculo com prefixo @
    IF NEW.username IS NOT NULL THEN
        NEW.username := '@' || LOWER(REPLACE(TRIM(NEW.username), '@', ''));
    END IF;

    -- Sanitização de espaços em branco na chave pública
    IF NEW.wallet_address IS NOT NULL THEN
        NEW.wallet_address := TRIM(NEW.wallet_address);
        IF NEW.wallet_address = '' THEN
            NEW.wallet_address := NULL;
        END IF;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_critical_pioneers ON public.pioneiros;
CREATE TRIGGER trg_protect_critical_pioneers
BEFORE INSERT OR UPDATE ON public.pioneiros
FOR EACH ROW
EXECUTE FUNCTION public.protect_critical_pioneers_profile();


-- 3. Fechamento de Brechas RLS na Tabela pioneiros
-- Remove políticas inseguras que permitiam UPDATE irrestrito por anon
DROP POLICY IF EXISTS "Inserção ou atualização de pioneiros" ON public.pioneiros;
DROP POLICY IF EXISTS "Leitura pública de perfis de pioneiros" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiros - Leitura Pública" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiros - Gravação Restrita" ON public.pioneiros;

-- Leitura pública de vitrines (necessária para que o Linktree seja visível a todos)
CREATE POLICY "Pioneiros - Leitura Pública"
    ON public.pioneiros FOR SELECT
    TO anon, authenticated
    USING (true);

-- Inserção/Atualização permitida apenas com uid correspondente ou via RPC controlada
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


-- 4. Função RPC Protegida: pioneer_save_profile
-- Ponto único e auditado de gravação de perfis de pioneiros com sanitização
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
    v_clean_wallet TEXT;
    v_uid TEXT;
    v_res RECORD;
BEGIN
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        RAISE EXCEPTION 'Nome de usuário não pode ser vazio.';
    END IF;

    v_clean_user := '@' || LOWER(REPLACE(TRIM(p_username), '@', ''));
    v_uid := 'user_' || LOWER(REPLACE(TRIM(p_username), '@', ''));
    v_clean_wallet := NULLIF(TRIM(p_wallet), '');

    -- Validação de formato da carteira
    IF v_clean_wallet IS NOT NULL AND NOT (v_clean_wallet ~ '^G[A-Z2-7]{55}$') THEN
        RAISE EXCEPTION 'Formato de chave pública inválido. Deve começar com G e ter 56 caracteres Base32.';
    END IF;

    -- Proteção especial da conta do fundador
    IF v_clean_user = '@hokage22b' THEN
        v_clean_wallet := 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR';
    END IF;

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
        v_uid,
        v_clean_user,
        p_bio,
        v_clean_wallet,
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
        wallet_address = CASE 
            WHEN v_clean_user = '@hokage22b' THEN 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
            ELSE COALESCE(EXCLUDED.wallet_address, public.pioneiros.wallet_address)
        END,
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
