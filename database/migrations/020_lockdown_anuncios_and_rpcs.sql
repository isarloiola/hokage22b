-- ============================================================
-- FASE 0 SECURITY HARDENING — Migration 020
-- 1. Remove permissive anon INSERT policy from migration 017
-- 2. Enforce service_role-only INSERT on public.anuncios + support 'gratis'
-- 3. Revoke anon/authenticated EXECUTE on pioneer_renew_ad & pioneer_save_profile
-- 4. Validate email format on new public.leads inserts
-- ============================================================

-- 1. Remove regressão da migration 017
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;

-- 2. Unifica triggers de proteção na tabela anuncios
DROP TRIGGER IF EXISTS trg_anuncio_defaults ON public.anuncios;
DROP TRIGGER IF EXISTS trg_enforce_anuncio_defaults ON public.anuncios;

CREATE OR REPLACE FUNCTION public.enforce_anuncio_service_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Bloqueia inserção direta via chave anon/authenticated; apenas service_role (Edge Functions) pode inserir
  IF COALESCE(v_role, '') <> 'service_role' AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Publicação direta bloqueada. Utilize a API autenticada do portal.';
  END IF;

  IF NEW.plan_tier IS NULL OR NEW.plan_tier NOT IN ('ouro', 'prata', 'bronze', 'gratis') THEN
    NEW.plan_tier := 'bronze';
  END IF;

  IF NEW.plan_tier = 'gratis' THEN
    NEW.price_pi := 0;
    NEW.link_url := NULL;
    NEW.image_url := NULL;
  ELSIF NEW.plan_tier = 'bronze' THEN
    NEW.link_url := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_anuncio_service_only
  BEFORE INSERT ON public.anuncios
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_anuncio_service_only();

-- 3. Revoga RPCs de mutação que não devem ser chamadas diretamente por anon
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pioneer_renew_ad') THEN
    REVOKE ALL ON FUNCTION public.pioneer_renew_ad(text, text, text, text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.pioneer_renew_ad(text, text, text, text) TO service_role;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'pioneer_save_profile') THEN
    REVOKE ALL ON FUNCTION public.pioneer_save_profile(text, text, text, text, text, text, text, text, text, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.pioneer_save_profile(text, text, text, text, text, text, text, text, text, jsonb, jsonb, text) TO service_role;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Garante formato válido de e-mail em novos leads (impede payload XSS em mailto:)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_email_format_chk') THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_email_format_chk
      CHECK (email ~* '^[^@\s"<>''`]+@[^@\s"<>''`]+\.[^@\s"<>''`]+$') NOT VALID;
  END IF;
END $$;
