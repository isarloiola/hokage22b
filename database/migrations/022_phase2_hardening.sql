-- ============================================================
-- FASE 2 SECURITY HARDENING — Migration 022
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================
-- Objetivos:
--   1. Transição atômica (FOR UPDATE) em request_affiliate_payout_atomic
--   2. Incremento atômico de referral_credits (increment_pioneer_referral_credit)
--   3. Limitar e deduplicar batch de visualizações (increment_ad_views_batch <= 50 ativos)
--   4. Fixar search_path em admin_get_all_transactions
-- ============================================================

-- ─── 1. SAQUE ATÔMICO DE COMISSÕES DE AFILIADOS ──────────────────────────────
CREATE OR REPLACE FUNCTION public.request_affiliate_payout_atomic(
  p_username TEXT,
  p_wallet TEXT,
  p_min_pi NUMERIC DEFAULT 1.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_clean_handle TEXT;
  v_clean_wallet TEXT;
  v_ids TEXT[];
  v_total NUMERIC := 0;
  v_count INTEGER := 0;
  v_now TEXT := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
BEGIN
  v_clean_handle := regexp_replace(lower(trim(coalesce(p_username, ''))), '^@+', '');
  v_clean_wallet := trim(coalesce(p_wallet, ''));

  IF v_clean_handle = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'UNAUTHORIZED');
  END IF;

  IF v_clean_wallet !~ '^G[A-Z2-7]{55}$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_VALID_WALLET');
  END IF;

  -- Trava linhas elegíveis na transação (FOR UPDATE) para impedir double-spend concorrente
  WITH locked_rows AS MATERIALIZED (
    SELECT payment_id, amount
    FROM public.transacoes_pi
    WHERE purpose = 'affiliate_commission'
      AND status = 'pending'
      AND regexp_replace(lower(trim(coalesce(metadata->>'referrer_username', ''))), '^@+', '') = v_clean_handle
    ORDER BY created_at ASC
    FOR UPDATE
  )
  SELECT
    coalesce(array_agg(payment_id), ARRAY[]::TEXT[]),
    round(coalesce(sum(amount), 0), 4),
    count(*)::INTEGER
  INTO v_ids, v_total, v_count
  FROM locked_rows;

  IF v_count = 0 OR (v_total + 0.000001) < coalesce(p_min_pi, 1.0) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'MIN_PAYOUT_NOT_REACHED',
      'pending_pi', v_total,
      'commissions_count', v_count
    );
  END IF;

  UPDATE public.transacoes_pi
  SET
    status = 'requested',
    to_address = v_clean_wallet,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'referrer_wallet', v_clean_wallet,
      'payout_status', 'requested',
      'requested_at', v_now
    )
  WHERE payment_id = ANY(v_ids)
    AND purpose = 'affiliate_commission'
    AND status = 'pending';

  RETURN jsonb_build_object(
    'ok', true,
    'requested_pi', v_total,
    'commissions_count', v_count,
    'payment_ids', to_jsonb(v_ids),
    'requested_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_affiliate_payout_atomic(TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_affiliate_payout_atomic(TEXT, TEXT, NUMERIC) TO service_role;


-- ─── 2. INCREMENTO ATÔMICO DE CRÉDITO DE BOAS-VINDAS (GIVE & GET) ───────────
CREATE OR REPLACE FUNCTION public.increment_pioneer_referral_credit(
  p_uid TEXT,
  p_referred_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_credits INTEGER := 0;
  v_ref TEXT;
BEGIN
  IF coalesce(trim(p_uid), '') = '' THEN
    RETURN jsonb_build_object('updated', false, 'referral_credits', 0);
  END IF;

  UPDATE public.pioneiros
  SET
    referral_credits = coalesce(referral_credits, 0) + 1,
    referred_by_username = coalesce(referred_by_username, NULLIF(trim(p_referred_by), '')),
    updated_at = NOW()
  WHERE uid = trim(p_uid)
  RETURNING referral_credits, referred_by_username INTO v_credits, v_ref;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('updated', false, 'referral_credits', 0);
  END IF;

  RETURN jsonb_build_object(
    'updated', true,
    'referral_credits', coalesce(v_credits, 0),
    'referred_by_username', v_ref
  );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_pioneer_referral_credit(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_pioneer_referral_credit(TEXT, TEXT) TO service_role;


-- ─── 3. CONTADOR DE VISUALIZAÇÕES LIMITADO A 50 IDS ÚNICOS ATIVOS ────────────
CREATE OR REPLACE FUNCTION public.increment_ad_views_batch(p_ad_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_clean_ids TEXT[];
  v_updated_count INTEGER := 0;
BEGIN
  IF p_ad_ids IS NULL OR array_length(p_ad_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT trim(x)
    FROM unnest(p_ad_ids[1:50]) AS x
    WHERE x IS NOT NULL AND length(trim(x)) > 0
  )
  INTO v_clean_ids;

  IF v_clean_ids IS NULL OR array_length(v_clean_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.anuncios
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = ANY(v_clean_ids)
    AND status = 'ativo';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ad_views_batch(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_views_batch(TEXT[]) TO anon, authenticated, service_role;


-- ─── 4. SEARCH_PATH SEGURO NA RPC admin_get_all_transactions ─────────────────
DO $$
BEGIN
  ALTER FUNCTION public.admin_get_all_transactions(TEXT)
    SET search_path = public, extensions, pg_temp;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;
