-- ============================================================
-- HOKAGE22B.COM — MURAL DOS PIONEIROS & GAZETA WEB3
-- MIGRATION: REESTRUTURAÇÃO DA LÓGICA COMERCIAL DO MURAL
-- ============================================================
-- 1. Hierarquia de Exposição:
--    - OURO: Destaque VIP no topo, campanha 7 dias, rotação equilibrada.
--    - PRATA: Destaque intermediário, campanha 7 dias, rotação equilibrada.
--    - BRONZE: Mural da comunidade, campanha 30 dias, cronológico recente.
-- 2. Status e Validade Segregados:
--    - Categoria: bronze | prata | ouro
--    - Status: ativo | pendente | expirado | suspenso | demonstracao
--    - Exposição: priority | rotation | chronological
-- 3. Ouro Fundador (Demonstração Institucional):
--    - Não requer pagamento, identificado claramente, não entra em receita comercial.
-- ============================================================

-- ------------------------------------------------------------
-- 1. NOVAS COLUNAS NA TABELA public.anuncios
-- ------------------------------------------------------------
ALTER TABLE public.anuncios 
ADD COLUMN IF NOT EXISTS is_founder_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS exposure_type TEXT DEFAULT 'chronological';

-- Comentários documentais
COMMENT ON COLUMN public.anuncios.is_founder_demo IS 'Indica se o anúncio é exemplar demonstrativo institucional do fundador (sem cobrança comercial).';
COMMENT ON COLUMN public.anuncios.exposure_type IS 'Tipo de ordenação comercial: priority (ouro), rotation (prata) ou chronological (bronze).';

-- Validação de check constraints seguras (se ainda não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_anuncios_status_valid'
    ) THEN
        ALTER TABLE public.anuncios
        ADD CONSTRAINT chk_anuncios_status_valid 
        CHECK (status IN ('ativo', 'pendente', 'expirado', 'suspenso', 'demonstracao'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_anuncios_exposure_valid'
    ) THEN
        ALTER TABLE public.anuncios
        ADD CONSTRAINT chk_anuncios_exposure_valid 
        CHECK (exposure_type IN ('priority', 'rotation', 'chronological'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. TRIGGER SERVER-SIDE PARA ENFORCEMENT COMERCIAL E VALIDADE
-- ------------------------------------------------------------
-- Regras automáticas na inserção:
-- - Ouro: 7 dias de validade, exposure_type = 'priority'
-- - Prata: 7 dias de validade, exposure_type = 'rotation'
-- - Bronze: 30 dias de validade, exposure_type = 'chronological'
-- - Demonstrativo (is_founder_demo): status = 'demonstracao', sem expiração estrita
CREATE OR REPLACE FUNCTION public.trg_enforce_anuncio_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se for exemplar demonstrativo do fundador
    IF NEW.is_founder_demo = true THEN
        NEW.status := COALESCE(NULLIF(NEW.status, ''), 'demonstracao');
        NEW.plan_tier := COALESCE(NULLIF(NEW.plan_tier, ''), 'ouro');
        NEW.exposure_type := 'priority';
        NEW.created_at := COALESCE(NEW.created_at, TIMEZONE('utc'::text, NOW()));
        -- Demonstrativo não expira automaticamente no fluxo comercial
        NEW.expires_at := NULL;
        RETURN NEW;
    END IF;

    -- Garantia de status padrão seguro
    IF NEW.status IS NULL OR NEW.status = '' THEN
        NEW.status := 'ativo';
    END IF;

    -- Defaults de contadores zerados para evitar manipulação de métricas
    NEW.views_count := COALESCE(NEW.views_count, 0);
    NEW.clicks_count := COALESCE(NEW.clicks_count, 0);
    NEW.profile_visits := COALESCE(NEW.profile_visits, 0);
    NEW.likes_count := COALESCE(NEW.likes_count, 0);
    NEW.created_at := COALESCE(NEW.created_at, TIMEZONE('utc'::text, NOW()));

    -- Definição de validade e modo de exposição por categoria comercial:
    IF NEW.plan_tier = 'ouro' THEN
        NEW.exposure_type := 'priority';
        NEW.expires_at := COALESCE(NEW.expires_at, TIMEZONE('utc'::text, NOW()) + INTERVAL '7 days');
    ELSIF NEW.plan_tier = 'prata' THEN
        NEW.exposure_type := 'rotation';
        NEW.expires_at := COALESCE(NEW.expires_at, TIMEZONE('utc'::text, NOW()) + INTERVAL '7 days');
    ELSE
        -- bronze / padrão
        NEW.plan_tier := 'bronze';
        NEW.exposure_type := 'chronological';
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
-- 3. RENOVAÇÃO COMERCIAL RESPEITANDO O PERÍODO DE CADA PLANO
-- ------------------------------------------------------------
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
    v_effective_tier TEXT;
    v_add_interval INTERVAL;
    v_exposure TEXT;
BEGIN
    -- Busca o plano atual caso não haja upgrade
    SELECT COALESCE(NULLIF(p_upgrade_tier, ''), plan_tier) INTO v_effective_tier
    FROM public.anuncios
    WHERE id = p_ad_id;

    IF v_effective_tier = 'ouro' THEN
        v_add_interval := INTERVAL '7 days';
        v_exposure := 'priority';
    ELSIF v_effective_tier = 'prata' THEN
        v_add_interval := INTERVAL '7 days';
        v_exposure := 'rotation';
    ELSE
        v_add_interval := INTERVAL '30 days';
        v_exposure := 'chronological';
    END IF;

    UPDATE public.anuncios
    SET 
        expires_at = GREATEST(NOW(), COALESCE(expires_at, NOW())) + v_add_interval,
        status = 'ativo',
        plan_tier = v_effective_tier,
        exposure_type = v_exposure,
        payment_txid = COALESCE(NULLIF(p_txid, ''), payment_txid)
    WHERE id = p_ad_id
      AND LOWER(REPLACE(pioneer_username, '@', '')) = LOWER(REPLACE(p_username, '@', ''));

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN (v_updated > 0);
END;
$$;

-- ------------------------------------------------------------
-- 4. POLÍTICA DE LEITURA PÚBLICA (RLS ZERO-TRUST)
-- ------------------------------------------------------------
-- Garante no nível do banco de dados que:
-- - Anúncios expirados não aparecem em leitura pública regular
-- - Anúncios suspensos ou pendentes nunca aparecem publicamente
-- - Exemplares demonstrativos (is_founder_demo) permanecem visíveis
DROP POLICY IF EXISTS "anuncios_select_ativos" ON public.anuncios;
CREATE POLICY "anuncios_select_ativos"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (
        (status = 'ativo' AND (expires_at IS NULL OR expires_at > NOW()))
        OR is_founder_demo = true
        OR status = 'demonstracao'
    );

-- ------------------------------------------------------------
-- 5. ÍNDICES DE ALTA PERFORMANCE PARA O MURAL
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_anuncios_hierarchy_active 
ON public.anuncios (status, plan_tier, exposure_type, expires_at DESC, created_at DESC);

-- ------------------------------------------------------------
-- 6. ATUALIZAÇÃO SEGURA DOS ANÚNCIOS EXISTENTES
-- ------------------------------------------------------------
-- Atualiza os registros existentes para terem seus tipos de exposição adequados
UPDATE public.anuncios
SET exposure_type = CASE 
    WHEN plan_tier = 'ouro' THEN 'priority'
    WHEN plan_tier = 'prata' THEN 'rotation'
    ELSE 'chronological'
END
WHERE exposure_type IS NULL OR exposure_type = '';

-- Se existir o anúncio inicial do fundador no banco, marca com o selo institucional
UPDATE public.anuncios
SET is_founder_demo = true,
    status = 'demonstracao',
    exposure_type = 'priority'
WHERE pioneer_username ILIKE '%hokage22b%' AND plan_tier = 'ouro';

