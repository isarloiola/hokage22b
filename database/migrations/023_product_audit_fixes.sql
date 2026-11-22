-- ============================================================
-- HOKAGE22B.COM — MIGRATION 023: PRODUCT AUDIT & MARKETPLACE FIXES
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- ─── 1. HIGIENE DE DADOS EM PRODUÇÃO ──────────────────────────────────────────
-- Remove resquício de teste de segurança da vitrine pública
DELETE FROM public.pioneiros
WHERE lower(regexp_replace(coalesce(username, ''), '^@+', '')) = 'testevuln';

-- Remove duplicatas de @hokage22b mantendo o registro mais completo e oficial
WITH ranked_hokage AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN uid NOT LIKE 'user_%' THEN 0 ELSE 1 END,
        CASE WHEN avatar_url IS NOT NULL AND length(trim(avatar_url)) > 0 THEN 0 ELSE 1 END,
        CASE WHEN products IS NOT NULL AND jsonb_typeof(products) = 'array' AND jsonb_array_length(products) > 0 THEN 0 ELSE 1 END,
        CASE WHEN wallet_address IS NOT NULL AND wallet_address ~ '^G[A-Z2-7]{55}$' THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST
    ) AS rn
  FROM public.pioneiros
  WHERE lower(regexp_replace(coalesce(username, ''), '^@+', '')) = 'hokage22b'
)
DELETE FROM public.pioneiros p
USING ranked_hokage r
WHERE p.ctid = r.ctid
  AND r.rn > 1;

-- Corrige link de anúncio real com ".com" sobrando
UPDATE public.anuncios
SET link_url = 'https://x.com/hokage22b'
WHERE lower(trim(coalesce(link_url, ''))) = 'https://x.com/hokage22b.com';


-- ─── 2. DEFAULTS DE CHAVE PRIMÁRIA, COLUNAS DO MARKETPLACE & CONSTRAINTS ──────
ALTER TABLE public.anuncios
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

ALTER TABLE public.denuncias
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::TEXT;

ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'GLOBAL',
  ADD COLUMN IF NOT EXISTS payment_modes TEXT DEFAULT 'pi',
  ADD COLUMN IF NOT EXISTS item_price TEXT,
  ADD COLUMN IF NOT EXISTS item_currency TEXT DEFAULT 'PI';

ALTER TABLE public.denuncias
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aberta';

ALTER TABLE public.anuncios
  DROP CONSTRAINT IF EXISTS chk_anuncios_status_valid;

ALTER TABLE public.anuncios
  ADD CONSTRAINT chk_anuncios_status_valid
  CHECK (status IN ('ativo', 'pendente', 'pausado', 'moderacao', 'vendido', 'expirado', 'suspenso', 'demonstracao'));


-- ─── 3. FIX: redeem_referral_credit_for_ad COM id EXPLÍCITO ───────────────────
CREATE OR REPLACE FUNCTION public.redeem_referral_credit_for_ad(
  p_uid TEXT,
  p_username TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_location TEXT,
  p_country_code TEXT,
  p_payment_modes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_remaining INTEGER;
  v_ad RECORD;
  v_txid TEXT;
  v_ad_id TEXT;
BEGIN
  UPDATE public.pioneiros
  SET
    referral_credits = referral_credits - 1,
    updated_at = now()
  WHERE uid = p_uid AND referral_credits > 0
  RETURNING referral_credits INTO v_remaining;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saldo de créditos de indicação insuficiente.';
  END IF;

  v_txid := 'REF_CREDIT_' || gen_random_uuid()::TEXT;
  v_ad_id := gen_random_uuid()::TEXT;

  INSERT INTO public.anuncios (
    id,
    title,
    description,
    link_url,
    image_url,
    category,
    location,
    country_code,
    payment_modes,
    pioneer_username,
    pioneer_name,
    plan_tier,
    price_pi,
    status,
    payment_txid,
    expires_at
  )
  VALUES (
    v_ad_id,
    p_title,
    p_description,
    NULL,
    NULL,
    coalesce(NULLIF(trim(p_category), ''), 'geral'),
    coalesce(NULLIF(trim(p_location), ''), 'Online / Global'),
    coalesce(NULLIF(trim(p_country_code), ''), 'GLOBAL'),
    coalesce(NULLIF(trim(p_payment_modes), ''), 'pi'),
    p_username,
    regexp_replace(p_username, '^@+', ''),
    'bronze',
    0,
    'ativo',
    v_txid,
    '2099-12-31T23:59:59.000Z'::timestamptz
  )
  RETURNING * INTO v_ad;

  RETURN jsonb_build_object(
    'ad', to_jsonb(v_ad),
    'remaining_credits', v_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_referral_credit_for_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_referral_credit_for_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- ─── 4. RPCS ADMINISTRATIVAS APRIMORADAS E NOVAS FILAS DE OPERAÇÃO ────────────
DROP FUNCTION IF EXISTS public.admin_get_all_ads(TEXT);
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
    days_left INTEGER,
    is_founder_demo BOOLEAN,
    likes_count INTEGER,
    location TEXT,
    country_code TEXT,
    payment_modes TEXT,
    item_price TEXT,
    item_currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    IF NOT public.admin_verify_access(p_secret) THEN
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
        GREATEST(0, EXTRACT(DAY FROM (COALESCE(a.expires_at, a.created_at + INTERVAL '30 days') - NOW()))::INTEGER) AS days_left,
        COALESCE(a.is_founder_demo, false) AS is_founder_demo,
        COALESCE(a.likes_count, 0) AS likes_count,
        a.location,
        COALESCE(a.country_code, 'GLOBAL') AS country_code,
        COALESCE(a.payment_modes, 'pi') AS payment_modes,
        a.item_price,
        COALESCE(a.item_currency, 'PI') AS item_currency
    FROM public.anuncios a
    ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_all_ads(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_ads(TEXT) TO anon, authenticated, service_role;


DROP FUNCTION IF EXISTS public.admin_update_ad_status(TEXT, TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_update_ad_status(TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.admin_update_ad_status(
  p_secret TEXT,
  p_ad_id TEXT,
  p_new_status TEXT,
  p_new_tier TEXT DEFAULT NULL,
  p_new_price NUMERIC DEFAULT NULL,
  p_new_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  UPDATE public.anuncios
  SET
    status = p_new_status,
    plan_tier = COALESCE(p_new_tier, plan_tier),
    price_pi = COALESCE(p_new_price, price_pi),
    expires_at = COALESCE(p_new_expires_at, expires_at)
  WHERE id = p_ad_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_ad_status(TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_ad_status(TEXT, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ) TO anon, authenticated, service_role;


-- Fila de Denúncias para o Admin
DROP FUNCTION IF EXISTS public.admin_get_denuncias(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_denuncias(p_secret TEXT)
RETURNS TABLE (
  id TEXT,
  ad_id TEXT,
  ad_title TEXT,
  reason TEXT,
  details TEXT,
  reporter_user TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  ad_status TEXT,
  ad_author TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.ad_id,
    COALESCE(d.ad_title, a.title, d.ad_id) AS ad_title,
    d.reason,
    d.details,
    d.reporter_user,
    COALESCE(d.status, 'aberta') AS status,
    d.created_at,
    a.status AS ad_status,
    a.pioneer_username AS ad_author
  FROM public.denuncias d
  LEFT JOIN public.anuncios a ON a.id = d.ad_id
  ORDER BY d.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_denuncias(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_denuncias(TEXT) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_resolve_denuncia(
  p_secret TEXT,
  p_report_id TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_ad_id TEXT;
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  SELECT ad_id INTO v_ad_id FROM public.denuncias WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF lower(trim(coalesce(p_action, ''))) = 'suspend_ad' THEN
    UPDATE public.anuncios SET status = 'suspenso' WHERE id = v_ad_id;
    UPDATE public.denuncias SET status = 'resolvida' WHERE ad_id = v_ad_id;
  ELSE
    UPDATE public.denuncias SET status = 'descartada' WHERE id = p_report_id;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_denuncia(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_denuncia(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;


-- Gestão de Pioneiros & Mérito Hokage no Admin
DROP FUNCTION IF EXISTS public.admin_get_pioneiros(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_pioneiros(p_secret TEXT)
RETURNS TABLE (
  uid TEXT,
  username TEXT,
  bio TEXT,
  wallet_address TEXT,
  reputation_score INTEGER,
  journey_tier TEXT,
  is_ambassador BOOLEAN,
  referral_qualified_count INTEGER,
  referral_credits INTEGER,
  contribution_area TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  RETURN QUERY
  SELECT
    p.uid,
    p.username,
    p.bio,
    p.wallet_address,
    COALESCE(p.reputation_score, 50) AS reputation_score,
    COALESCE(p.journey_tier, 'pioneiro') AS journey_tier,
    COALESCE(p.is_ambassador, false) AS is_ambassador,
    COALESCE(p.referral_qualified_count, 0) AS referral_qualified_count,
    COALESCE(p.referral_credits, 0) AS referral_credits,
    p.contribution_area,
    p.updated_at
  FROM public.pioneiros p
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 300;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_pioneiros(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_pioneiros(TEXT) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_update_pioneer_merit(
  p_secret TEXT,
  p_uid TEXT,
  p_is_ambassador BOOLEAN,
  p_journey_tier TEXT,
  p_contribution_area TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_tier TEXT := lower(trim(coalesce(p_journey_tier, 'pioneiro')));
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  IF v_tier NOT IN ('pioneiro', 'construtor', 'hokage') THEN
    v_tier := 'pioneiro';
  END IF;

  UPDATE public.pioneiros
  SET
    is_ambassador = COALESCE(p_is_ambassador, (v_tier = 'hokage')),
    journey_tier = v_tier,
    contribution_area = COALESCE(NULLIF(trim(p_contribution_area), ''), contribution_area),
    hokage_since = CASE WHEN v_tier = 'hokage' THEN COALESCE(hokage_since, NOW()) ELSE hokage_since END,
    updated_at = NOW()
  WHERE uid = p_uid;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_pioneer_merit(TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_pioneer_merit(TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO anon, authenticated, service_role;


-- Exclusão LGPD de Leads
CREATE OR REPLACE FUNCTION public.admin_delete_lead(
  p_secret TEXT,
  p_lead_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  DELETE FROM public.leads WHERE id::TEXT = trim(coalesce(p_lead_id, ''));
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_lead(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_lead(TEXT, TEXT) TO anon, authenticated, service_role;


-- Listagem e Revogação de E-books (Reembolso CDC)
DROP FUNCTION IF EXISTS public.admin_get_ebook_entitlements(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_ebook_entitlements(p_secret TEXT)
RETURNS TABLE (
  id UUID,
  user_uid TEXT,
  username TEXT,
  product_id TEXT,
  payment_id TEXT,
  granted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.user_uid,
    e.username,
    e.product_id,
    e.payment_id,
    e.granted_at
  FROM public.ebook_entitlements e
  ORDER BY e.granted_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ebook_entitlements(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ebook_entitlements(TEXT) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_revoke_ebook_access(
  p_secret TEXT,
  p_entitlement_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  DELETE FROM public.ebook_entitlements WHERE id = p_entitlement_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_ebook_access(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_revoke_ebook_access(TEXT, UUID) TO anon, authenticated, service_role;


-- Moderação de Comentários da Vila
DROP FUNCTION IF EXISTS public.admin_get_recent_comments(TEXT);
CREATE OR REPLACE FUNCTION public.admin_get_recent_comments(p_secret TEXT)
RETURNS TABLE (
  id UUID,
  ad_id TEXT,
  ad_title TEXT,
  author_username TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.ad_id,
    COALESCE(a.title, c.ad_id) AS ad_title,
    c.author_username,
    c.content,
    c.created_at
  FROM public.anuncio_comentarios c
  LEFT JOIN public.anuncios a ON a.id = c.ad_id
  ORDER BY c.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_recent_comments(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_recent_comments(TEXT) TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.admin_delete_comment(
  p_secret TEXT,
  p_comment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  DELETE FROM public.anuncio_comentarios WHERE id = p_comment_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_comment(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_comment(TEXT, UUID) TO anon, authenticated, service_role;


-- ─── 5. VIEW v_vila_publica ATUALIZADA COM PREÇO DA OFERTA ───────────────────
CREATE OR REPLACE VIEW public.v_vila_publica AS
SELECT
  id,
  title,
  description,
  category,
  plan_tier,
  COALESCE(country_code, 'GLOBAL') AS country_code,
  COALESCE(payment_modes, 'pi') AS payment_modes,
  link_url,
  image_url,
  pioneer_username,
  pioneer_name,
  created_at,
  item_price,
  COALESCE(item_currency, 'PI') AS item_currency
FROM public.anuncios
WHERE status = 'ativo'
  AND (expires_at IS NULL OR expires_at > NOW() OR plan_tier <> 'gratis')
ORDER BY created_at DESC;

GRANT SELECT ON public.v_vila_publica TO anon, authenticated;
