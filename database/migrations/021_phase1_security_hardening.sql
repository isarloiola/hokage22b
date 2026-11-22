-- ============================================================
-- FASE 1 SECURITY HARDENING — Migration 021
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================
-- Objetivos:
--   1. Remover upload público anônimo direto no bucket 'mural-images'
--   2. Criar tabela indexada 'ebook_entitlements' vinculada a user_uid/username
--   3. Atualizar view 'v_passaportes_publicos' e bloquear SELECT direto em 'pioneiros'
--   4. Revogar RPC 'pioneer_get_my_ads' para anon/authenticated
--   5. Endurecer search_path nas RPCs administrativas 'admin_*'
--   6. Bloquear INSERT direto anônimo em 'doacoes' e SELECT em 'denuncias'
-- ============================================================

-- 1. Storage 'mural-images': bloqueia upload anônimo direto (agora via Edge Function mural-action)
DROP POLICY IF EXISTS "Upload público de imagens para o mural" ON storage.objects;
DROP POLICY IF EXISTS "Upload público de imagens do Mural" ON storage.objects;

-- 2. Tabela dedicada para posse de E-books (elimina full-table scan e dependência de metadata)
CREATE TABLE IF NOT EXISTS public.ebook_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid TEXT,
  username TEXT NOT NULL,
  product_id TEXT NOT NULL,
  payment_id TEXT UNIQUE NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ebook_entitlements_user_prod_uniq UNIQUE (username, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_uid
  ON public.ebook_entitlements (user_uid);

CREATE INDEX IF NOT EXISTS idx_ebook_entitlements_username
  ON public.ebook_entitlements (lower(username));

ALTER TABLE public.ebook_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ebook_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ebook_entitlements TO service_role;

-- Backfill idempotente de compras de e-book já concluídas em transacoes_pi
INSERT INTO public.ebook_entitlements (user_uid, username, product_id, payment_id, granted_at)
SELECT
  NULLIF(TRIM(COALESCE(metadata->>'buyer_uid', '')), ''),
  '@' || regexp_replace(lower(trim(coalesce(metadata->>'pioneer_username', metadata->>'buyer_username', 'pioneiro'))), '^@+', ''),
  CASE
    WHEN lower(coalesce(metadata->>'productId', metadata->>'product_id', metadata->>'product', '')) = 'ia-na-pratica' THEN 'ia-na-pratica'
    ELSE 'pi-para-seu-negocio'
  END,
  payment_id,
  COALESCE(created_at, NOW())
FROM public.transacoes_pi
WHERE status = 'completed'
  AND purpose = 'ebook'
  AND coalesce(metadata->>'pioneer_username', metadata->>'buyer_username', '') <> ''
ON CONFLICT DO NOTHING;

-- Índice funcional para consultas de afiliados sem varredura completa
CREATE INDEX IF NOT EXISTS idx_transacoes_pi_affiliate_referrer
  ON public.transacoes_pi ((metadata->>'referrer_username'))
  WHERE purpose = 'affiliate_commission';

-- 3. Atualiza v_passaportes_publicos (preserva ordem da 019 e adiciona campos públicos de mérito/display)
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
  updated_at,
  COALESCE(is_ambassador, false) AS is_ambassador,
  COALESCE(referral_qualified_count, 0) AS referral_qualified_count,
  (checklist_state->'showcase_zero') AS showcase_zero,
  (checklist_state->'showcase_mural') AS showcase_mural,
  COALESCE(checklist_state->'social_links', '[]'::jsonb) AS social_links,
  COALESCE(checklist_state->'selected_titles', '[]'::jsonb) AS selected_titles
FROM public.pioneiros
WHERE username IS NOT NULL AND length(trim(username)) > 0;

GRANT SELECT ON public.v_passaportes_publicos TO anon, authenticated;
GRANT SELECT ON public.v_monte_hokage TO anon, authenticated;
GRANT SELECT ON public.v_vila_publica TO anon, authenticated;

-- Bloqueia SELECT direto na tabela base public.pioneiros (oculta uid, referred_by_username, referral_credits, checklist_state)
DROP POLICY IF EXISTS "pioneiros_select_public" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiros - Leitura Pública" ON public.pioneiros;
DROP POLICY IF EXISTS "Pioneiro pode consultar seu perfil" ON public.pioneiros;
DROP POLICY IF EXISTS "Leitura pública de perfis de pioneiros" ON public.pioneiros;
DROP POLICY IF EXISTS "pioneiros_select_backend_only" ON public.pioneiros;

CREATE POLICY "pioneiros_select_backend_only"
  ON public.pioneiros
  FOR SELECT
  TO anon, authenticated
  USING (false);

REVOKE SELECT ON TABLE public.pioneiros FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pioneiros TO service_role;

-- 4. Revoga pioneer_get_my_ads para anon/authenticated (donos agora usam mural-action get_my_ads autenticado)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'pioneer_get_my_ads'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    REVOKE ALL ON FUNCTION public.pioneer_get_my_ads(TEXT) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.pioneer_get_my_ads(TEXT) TO service_role;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 5. Fixa search_path em todas as funções SECURITY DEFINER administrativas
DO $$
BEGIN
  ALTER FUNCTION public.admin_verify_access(text) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_set_vault_key(text, text) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_get_all_ads(text) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_update_ad_status(text, text, text, text, numeric) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_delete_ad(text, text) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_get_leads(text) SET search_path = public, extensions, pg_temp;
  ALTER FUNCTION public.admin_create_ad(text, text, text, text, text, text, text, numeric, text) SET search_path = public, extensions, pg_temp;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. Fecha escrita anônima direta em 'doacoes' e leitura autenticada aberta em 'denuncias'
DROP POLICY IF EXISTS "Permitir registro de apoio voluntário" ON public.doacoes;
DROP POLICY IF EXISTS "Permitir registro de doacoes" ON public.doacoes;
DROP POLICY IF EXISTS "doacoes_insert_backend_only" ON public.doacoes;
CREATE POLICY "doacoes_insert_backend_only"
  ON public.doacoes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Restringir leitura de denuncias" ON public.denuncias;
DROP POLICY IF EXISTS "denuncias_select_admin" ON public.denuncias;
DROP POLICY IF EXISTS "denuncias_select_backend_only" ON public.denuncias;
CREATE POLICY "denuncias_select_backend_only"
  ON public.denuncias
  FOR SELECT
  TO anon, authenticated
  USING (false);
