-- ============================================================
-- HOKAGE22B — FASE 1: BLINDAGEM DE SEGURANÇA E INTEGRIDADE (RLS)
-- Executar no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- ------------------------------------------------------------
-- 1. BLINDAGEM DA TABELA: public.pioneiros
-- ------------------------------------------------------------
-- Habilita RLS estrita
ALTER TABLE public.pioneiros ENABLE ROW LEVEL SECURITY;

-- Remove políticas permissivas ou antigas
DROP POLICY IF EXISTS "Pioneiros - Leitura Pública" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiros - Gravação Restrita" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiros - Atualização Restrita" ON public.pioneiros;
DROP POLICY IF EXISTS "Inserção ou atualização de pioneiros" ON public.pioneiros;
DROP POLICY IF EXISTS "Leitura pública de perfis de pioneiros" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiro pode consultar seu perfil" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiro pode atualizar seu próprio perfil" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiro pode modificar seu próprio score" ON public.pioneiros;

-- REGRA 1.1: Leitura pública das vitrines (Linktree visível a todos)
CREATE POLICY "pioneiros_select_public"
    ON public.pioneiros
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- REGRA 1.2: BLOQUEIO TOTAL de INSERT direto por anon
-- Apenas o backend autenticado (Edge Function / service_role) pode inserir
CREATE POLICY "pioneiros_insert_backend_only"
    ON public.pioneiros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (false);

-- REGRA 1.3: BLOQUEIO TOTAL de UPDATE direto por anon
-- Impede substituição de carteiras Pi e produtos de terceiros
CREATE POLICY "pioneiros_update_backend_only"
    ON public.pioneiros
    FOR UPDATE
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- REGRA 1.4: BLOQUEIO TOTAL de DELETE direto por anon
CREATE POLICY "pioneiros_delete_backend_only"
    ON public.pioneiros
    FOR DELETE
    TO anon, authenticated
    USING (false);


-- ------------------------------------------------------------
-- 2. BLINDAGEM DA TABELA: public.anuncios
-- ------------------------------------------------------------
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas
DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir moderação de anúncios" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir exclusão de anúncios" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir leitura de todos os anúncios" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_select_ativos" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_insert_pendente_only" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_update_blocked" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_delete_blocked" ON public.anuncios;

-- REGRA 2.1: Leitura pública APENAS de anúncios ativos
CREATE POLICY "anuncios_select_ativos"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (status = 'ativo');

-- REGRA 2.2: Permitir inserção de anúncios pagos diretamente como 'ativo'
DROP POLICY IF EXISTS "anuncios_insert_pendente_only" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- REGRA 2.3: BLOQUEIO TOTAL de UPDATE direto por anon
-- Apenas Edge Function (após TXID na blockchain) ou Admin RPC podem alterar
CREATE POLICY "anuncios_update_blocked"
    ON public.anuncios
    FOR UPDATE
    TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- REGRA 2.4: BLOQUEIO TOTAL de DELETE direto por anon
CREATE POLICY "anuncios_delete_blocked"
    ON public.anuncios
    FOR DELETE
    TO anon, authenticated
    USING (false);

-- TRIGGER DE SEGURANÇA PARA ANÚNCIOS (Enforce Server-Side)
-- Garante defaults seguros preservando o status 'ativo' imediato
CREATE OR REPLACE FUNCTION public.trg_enforce_anuncio_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.status := COALESCE(NEW.status, 'ativo');
        NEW.is_verified := COALESCE(NEW.is_verified, false);
        NEW.views_count := COALESCE(NEW.views_count, 0);
        NEW.clicks_count := COALESCE(NEW.clicks_count, 0);
        NEW.profile_visits := COALESCE(NEW.profile_visits, 0);
        NEW.likes_count := COALESCE(NEW.likes_count, 0);
        NEW.created_at := COALESCE(NEW.created_at, TIMEZONE('utc'::text, NOW()));
        NEW.expires_at := COALESCE(NEW.expires_at, TIMEZONE('utc'::text, NOW()) + INTERVAL '30 days');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_anuncio_defaults ON public.anuncios;
CREATE TRIGGER trg_anuncio_defaults
BEFORE INSERT ON public.anuncios
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_anuncio_defaults();


-- ------------------------------------------------------------
-- 3. TRIGGER DE INTEGRIDADE DA CARTEIRA DO FUNDADOR E ED25519
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_critical_pioneers_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- A conta do fundador @hokage22b possui carteira e nível imutáveis
    IF LOWER(REPLACE(NEW.username, '@', '')) = 'hokage22b' THEN
        NEW.wallet_address := 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR';
        NEW.level_name := 'Fundador Oficial';
    END IF;

    -- Normaliza username para minúsculo com prefixo @
    IF NEW.username IS NOT NULL THEN
        NEW.username := '@' || LOWER(REPLACE(TRIM(NEW.username), '@', ''));
    END IF;

    -- Sanitização e validação de carteira Pi
    IF NEW.wallet_address IS NOT NULL THEN
        NEW.wallet_address := TRIM(NEW.wallet_address);
        IF NEW.wallet_address = '' THEN
            NEW.wallet_address := NULL;
        ELSIF NOT (NEW.wallet_address ~ '^G[A-Z2-7]{55}$') THEN
            RAISE EXCEPTION 'Endereço de carteira Pi inválido. Deve iniciar com G e conter 56 caracteres Base32.';
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

