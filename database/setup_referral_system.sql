-- ============================================================
-- HOKAGE22B — Sistema Profissional de Indicação & Recompensas
-- ============================================================
-- Execute este script no SQL Editor do Supabase.
-- Regras sustentáveis e antifraude:
--   1. Cada pioneiro (uid Pi Network) só pode ser indicado 1 única vez.
--   2. Bloqueio de auto-indicação por UID e por @username.
--   3. 1º indicado qualificado = +1 Crédito Bronze (0.314 π).
--      A partir do 2º, ganha +1 Crédito Bronze a cada 2 indicados (2, 4, 6...).
--      Ao atingir 5 indicados qualificados = Selo Embaixador na Vitrine.
--   4. Créditos são consumidos atomicamente via RPC ao publicar no Mural.
-- ============================================================

-- 1. Colunas de recompensa na tabela pioneiros
ALTER TABLE public.pioneiros
  ADD COLUMN IF NOT EXISTS referral_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_qualified_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by_username TEXT;

-- Garante que créditos nunca fiquem negativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pioneiros_referral_credits_nonneg'
  ) THEN
    ALTER TABLE public.pioneiros
      ADD CONSTRAINT pioneiros_referral_credits_nonneg CHECK (referral_credits >= 0);
  END IF;
END $$;

-- 2. Tabela de auditoria de indicações (1 registro por indicado único)
CREATE TABLE IF NOT EXISTS public.indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_uid TEXT NOT NULL,
  referrer_username TEXT NOT NULL,
  referred_uid TEXT NOT NULL UNIQUE,
  referred_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'qualified',
  reward_granted INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicacoes_referrer_uid ON public.indicacoes (referrer_uid);
CREATE INDEX IF NOT EXISTS idx_indicacoes_referrer_username ON public.indicacoes (lower(referrer_username));

-- Blindagem RLS: somente service_role (Edge Functions) escreve/lê registros com UIDs
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicacoes_no_public_access" ON public.indicacoes;
CREATE POLICY "indicacoes_no_public_access"
  ON public.indicacoes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 3. RPC pública (somente leitura agregada, sem expor UIDs)
CREATE OR REPLACE FUNCTION public.get_pioneer_referral_stats(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_row RECORD;
BEGIN
  v_clean := '@' || regexp_replace(lower(trim(coalesce(p_username, ''))), '^@+', '');
  IF v_clean = '@' THEN
    RETURN jsonb_build_object(
      'referral_credits', 0,
      'referral_qualified_count', 0,
      'is_ambassador', false,
      'referred_by_username', NULL
    );
  END IF;

  SELECT
    coalesce(referral_credits, 0) AS referral_credits,
    coalesce(referral_qualified_count, 0) AS referral_qualified_count,
    coalesce(is_ambassador, false) AS is_ambassador,
    referred_by_username
  INTO v_row
  FROM public.pioneiros
  WHERE lower(username) = v_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'referral_credits', 0,
      'referral_qualified_count', 0,
      'is_ambassador', false,
      'referred_by_username', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'referral_credits', v_row.referral_credits,
    'referral_qualified_count', v_row.referral_qualified_count,
    'is_ambassador', v_row.is_ambassador,
    'referred_by_username', v_row.referred_by_username
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pioneer_referral_stats(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pioneer_referral_stats(TEXT) TO anon, authenticated, service_role;

-- 4. RPC atômica de processamento de indicação (somente service_role)
CREATE OR REPLACE FUNCTION public.process_pioneer_referral(
  p_referrer_username TEXT,
  p_referred_uid TEXT,
  p_referred_username TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_handle TEXT;
  v_new_handle TEXT;
  v_referrer RECORD;
  v_existing_id UUID;
  v_new_count INTEGER;
  v_credit_delta INTEGER := 0;
  v_ambassador BOOLEAN := false;
BEGIN
  v_ref_handle := '@' || regexp_replace(lower(trim(coalesce(p_referrer_username, ''))), '^@+', '');
  v_new_handle := '@' || regexp_replace(lower(trim(coalesce(p_referred_username, ''))), '^@+', '');

  IF v_ref_handle = '@' OR v_new_handle = '@' OR coalesce(trim(p_referred_uid), '') = '' THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'invalid_params');
  END IF;

  -- Bloqueia auto-indicação por username
  IF v_ref_handle = v_new_handle THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'self_referral');
  END IF;

  -- Localiza o indicador real na tabela pioneiros
  SELECT uid, username, coalesce(referral_qualified_count, 0) AS qualified_count
  INTO v_referrer
  FROM public.pioneiros
  WHERE lower(username) = v_ref_handle
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'referrer_not_found');
  END IF;

  -- Bloqueia auto-indicação por UID
  IF v_referrer.uid = p_referred_uid THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'self_referral_uid');
  END IF;

  -- Verifica se este UID já foi indicado anteriormente
  SELECT id INTO v_existing_id
  FROM public.indicacoes
  WHERE referred_uid = p_referred_uid
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_referred');
  END IF;

  -- Calcula recompensa sustentável:
  -- 1º indicado = +1 crédito (boas-vindas); depois a cada 2 indicados (2, 4, 6...) = +1 crédito.
  v_new_count := v_referrer.qualified_count + 1;
  IF v_new_count = 1 OR (v_new_count % 2 = 0) THEN
    v_credit_delta := 1;
  END IF;
  v_ambassador := (v_new_count >= 5);

  -- Registra indicação (UNIQUE em referred_uid protege contra concorrência)
  INSERT INTO public.indicacoes (
    referrer_uid,
    referrer_username,
    referred_uid,
    referred_username,
    status,
    reward_granted
  )
  VALUES (
    v_referrer.uid,
    v_referrer.username,
    p_referred_uid,
    v_new_handle,
    'qualified',
    v_credit_delta
  )
  ON CONFLICT (referred_uid) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'already_referred');
  END IF;

  -- Atualiza saldo e selo do indicador atomicamente
  UPDATE public.pioneiros
  SET
    referral_qualified_count = coalesce(referral_qualified_count, 0) + 1,
    referral_credits = coalesce(referral_credits, 0) + v_credit_delta,
    is_ambassador = is_ambassador OR ((coalesce(referral_qualified_count, 0) + 1) >= 5),
    updated_at = now()
  WHERE uid = v_referrer.uid;

  -- Registra quem indicou no perfil do convidado
  UPDATE public.pioneiros
  SET referred_by_username = v_referrer.username
  WHERE uid = p_referred_uid AND referred_by_username IS NULL;

  RETURN jsonb_build_object(
    'awarded', true,
    'referrer_username', v_referrer.username,
    'credits_added', v_credit_delta,
    'new_qualified_count', v_new_count,
    'is_ambassador', v_ambassador
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_pioneer_referral(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_pioneer_referral(TEXT, TEXT, TEXT) TO service_role;

-- 5. RPC atômica para resgatar 1 Crédito Bronze e publicar anúncio no Mural (somente service_role)
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
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
  v_ad RECORD;
  v_txid TEXT;
BEGIN
  -- Débito atômico: só funciona se referral_credits > 0
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

  INSERT INTO public.anuncios (
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
    now() + interval '30 days'
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
