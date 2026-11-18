-- ============================================================
-- HOKAGE22B — Migration 019: Camada de Mérito & Views Públicas (API v1)
-- ============================================================
-- Execute no SQL Editor do Supabase.
-- Objetivos:
--   1. Padronizar a trilha de mérito: pioneiro -> construtor -> hokage
--   2. Registrar área de contribuição e data de conquista do Monte Hokage
--   3. Criar views públicas somente-leitura com allowlist estrita de colunas
--      (nunca expõe uid, referred_by_username, payment_txid ou dados privados)
-- ============================================================

-- 1. Colunas de jornada e mérito na tabela pioneiros
ALTER TABLE public.pioneiros
  ADD COLUMN IF NOT EXISTS journey_tier TEXT NOT NULL DEFAULT 'pioneiro',
  ADD COLUMN IF NOT EXISTS contribution_area TEXT,
  ADD COLUMN IF NOT EXISTS hokage_since TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pioneiros_journey_tier_check'
  ) THEN
    ALTER TABLE public.pioneiros
      ADD CONSTRAINT pioneiros_journey_tier_check
      CHECK (journey_tier IN ('pioneiro', 'construtor', 'hokage'));
  END IF;
END $$;

-- 2. Backfill seguro de journey_tier para registros existentes
UPDATE public.pioneiros
SET
  journey_tier = CASE
    WHEN is_ambassador = true OR COALESCE(referral_qualified_count, 0) >= 5 OR replace(lower(username), '@', '') = 'hokage22b'
      THEN 'hokage'
    WHEN wallet_address LIKE 'G%' AND (
      jsonb_array_length(COALESCE(products, '[]'::jsonb)) > 0
      OR COALESCE(reputation_score, 0) >= 70
    )
      THEN 'construtor'
    ELSE 'pioneiro'
  END,
  hokage_since = CASE
    WHEN (is_ambassador = true OR COALESCE(referral_qualified_count, 0) >= 5 OR replace(lower(username), '@', '') = 'hokage22b')
      AND hokage_since IS NULL
      THEN COALESCE(updated_at, NOW())
    ELSE hokage_since
  END;

-- 3. Índices para consultas rápidas da Public API v1
CREATE INDEX IF NOT EXISTS idx_pioneiros_journey_tier
  ON public.pioneiros (journey_tier, reputation_score DESC);

CREATE INDEX IF NOT EXISTS idx_anuncios_vila_public
  ON public.anuncios (status, country_code, category, created_at DESC);

-- 4. Views públicas somente-leitura (Allowlist estrita de colunas)
CREATE OR REPLACE VIEW public.v_passaportes_publicos AS
SELECT
  lower(username) AS username,
  bio,
  avatar_url,
  wallet_address,
  whatsapp_url,
  youtube_url,
  twitter_url,
  instagram_url,
  COALESCE(products, '[]'::jsonb) AS products,
  COALESCE(reputation_score, 50) AS reputation_score,
  level_name,
  journey_tier,
  contribution_area,
  hokage_since,
  updated_at
FROM public.pioneiros
WHERE username IS NOT NULL AND length(trim(username)) > 0;

CREATE OR REPLACE VIEW public.v_monte_hokage AS
SELECT
  username,
  bio,
  avatar_url,
  wallet_address,
  whatsapp_url,
  youtube_url,
  twitter_url,
  instagram_url,
  reputation_score,
  level_name,
  contribution_area,
  hokage_since,
  updated_at
FROM public.v_passaportes_publicos
WHERE journey_tier = 'hokage'
ORDER BY reputation_score DESC, hokage_since ASC NULLS LAST;

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
  created_at
FROM public.anuncios
WHERE status = 'ativo'
ORDER BY created_at DESC;

GRANT SELECT ON public.v_passaportes_publicos TO anon, authenticated;
GRANT SELECT ON public.v_monte_hokage TO anon, authenticated;
GRANT SELECT ON public.v_vila_publica TO anon, authenticated;
