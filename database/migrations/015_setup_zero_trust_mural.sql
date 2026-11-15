-- ============================================================
-- HOKAGE22B.COM — Blindagem Zero-Trust Total (Mural & Banco)
-- Execute APÓS fazer o deploy da Edge Function `mural-action`
-- no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. ANUNCIOS: Bloqueia INSERT/UPDATE/DELETE direto da role anon
--    Mantém apenas leitura pública (SELECT). Toda escrita passa pela Edge Function `mural-action` (service_role).
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_insert_public" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_update_blocked" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_delete_blocked" ON public.anuncios;

-- Índice único parcial em payment_txid para impedir reutilização do mesmo pagamento (replay attack)
CREATE UNIQUE INDEX IF NOT EXISTS idx_anuncios_unique_payment_txid
    ON public.anuncios (payment_txid)
    WHERE payment_txid IS NOT NULL AND payment_txid <> '';

-- 2. COMENTÁRIOS: Bloqueia INSERT direto da role anon (exige `mural-action` com Pi Auth + rate limit)
DROP POLICY IF EXISTS "Comentários - Inserção Validada" ON public.anuncio_comentarios;

-- 3. DENÚNCIAS: Bloqueia INSERT direto da role anon (exige `mural-action` com deduplicação)
DROP POLICY IF EXISTS "Permitir envio de denuncias" ON public.denuncias;

-- 4. REVOGAÇÃO DE RPCs SENSÍVEIS DA ROLE ANON
--    Somente `service_role` (Edge Functions) deve executar alterações de anúncios e perfis.
REVOKE EXECUTE ON FUNCTION public.pioneer_update_my_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pioneer_update_my_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.pioneer_renew_ad(TEXT, TEXT, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pioneer_renew_ad(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Caso `pioneer_save_profile` (9 args) exista, restringe também para service_role
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'pioneer_save_profile'
          AND pronamespace = 'public'::regnamespace
    ) THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.pioneer_save_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM anon, authenticated';
        EXECUTE 'GRANT EXECUTE ON FUNCTION public.pioneer_save_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso ao revogar pioneer_save_profile: %', SQLERRM;
END $$;

