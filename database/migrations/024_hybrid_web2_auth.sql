-- ============================================================
-- HOKAGE22B.COM — MIGRATION 024: HYBRID WEB2 AUTH + PI LINKING
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Colunas de identidade híbrida em public.pioneiros
--    - auth_user_id: UUID do Supabase Auth (auth.users) para login Web2 (Magic Link / OAuth)
--    - auth_provider: 'pi' (nativo Pi SDK), 'web2' (e-mail/OAuth sem vínculo Pi ainda), 'hybrid' (ambos vinculados)
--    - is_pi_verified: true SOMENTE quando o perfil foi autenticado via Pi Network SDK (/v2/me)
ALTER TABLE public.pioneiros
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'pi',
  ADD COLUMN IF NOT EXISTS is_pi_verified BOOLEAN NOT NULL DEFAULT true;

-- Índice único parcial: um auth_user_id do Supabase Auth só pode pertencer a 1 Passaporte
CREATE UNIQUE INDEX IF NOT EXISTS idx_pioneiros_auth_user_id_unique
  ON public.pioneiros (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.pioneiros
  DROP CONSTRAINT IF EXISTS chk_pioneiros_auth_provider_valid;

ALTER TABLE public.pioneiros
  ADD CONSTRAINT chk_pioneiros_auth_provider_valid
  CHECK (auth_provider IN ('pi', 'web2', 'hybrid'));

-- 2. Atualiza view pública v_passaportes_publicos preservando ordem exata da 021
--    e adicionando auth_provider + is_pi_verified ao final (sem expor auth_user_id ou e-mail)
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
  COALESCE(checklist_state->'selected_titles', '[]'::jsonb) AS selected_titles,
  COALESCE(auth_provider, 'pi') AS auth_provider,
  COALESCE(is_pi_verified, true) AS is_pi_verified
FROM public.pioneiros
WHERE username IS NOT NULL AND length(trim(username)) > 0;

-- 3. Garante permissões e mantém tabela base public.pioneiros protegida (Zero-Trust)
GRANT SELECT ON public.v_passaportes_publicos TO anon, authenticated;
REVOKE SELECT ON TABLE public.pioneiros FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pioneiros TO service_role;
