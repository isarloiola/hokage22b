-- ============================================================
-- HOKAGE22B.COM — Ativar Publicação Imediata de Anúncios no Mural
-- Remove a exigência de aprovação manual do administrador
-- Execute este script no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Remove a política antiga que restringia inserções apenas como 'pendente'
DROP POLICY IF EXISTS "anuncios_insert_pendente_only" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;

-- 2. Cria a nova política permitindo inserção direta de anúncios ativos
CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Atualiza o trigger do banco para aceitar status 'ativo' diretamente
CREATE OR REPLACE FUNCTION public.trg_enforce_anuncio_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Anúncio entra imediatamente como 'ativo' (descentralizado)
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

-- 4. Promove todos os anúncios pendentes existentes para 'ativo' imediatamente
UPDATE public.anuncios 
SET status = 'ativo' 
WHERE status = 'pendente';
