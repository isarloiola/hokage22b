-- ============================================================
-- HOKAGE22B.COM — Blindagem do Mural & Sistema de Comentários
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Hardening da RPC pioneer_update_my_ad:
--    - Exige username e ad_id válidos
--    - Verifica propriedade exata do anúncio
--    - Impõe prazo máximo de 24 horas após a criação (created_at)
--    - Valida tamanhos e protocolo http(s) em links/imagens
DROP FUNCTION IF EXISTS public.pioneer_update_my_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.pioneer_update_my_ad(
    p_ad_id TEXT,
    p_username TEXT,
    p_title TEXT,
    p_description TEXT,
    p_link_url TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_user TEXT;
    v_clean_title TEXT;
    v_clean_desc TEXT;
    v_clean_link TEXT;
    v_clean_img TEXT;
    v_created_at TIMESTAMPTZ;
    v_owner TEXT;
    v_updated INTEGER;
BEGIN
    v_clean_user := LOWER(REPLACE(TRIM(COALESCE(p_username, '')), '@', ''));
    IF v_clean_user = '' OR TRIM(COALESCE(p_ad_id, '')) = '' THEN
        RAISE EXCEPTION 'Identificação de usuário ou anúncio inválida.';
    END IF;

    v_clean_title := TRIM(COALESCE(p_title, ''));
    v_clean_desc := TRIM(COALESCE(p_description, ''));
    IF CHAR_LENGTH(v_clean_title) < 2 OR CHAR_LENGTH(v_clean_title) > 80 THEN
        RAISE EXCEPTION 'O título deve ter entre 2 e 80 caracteres.';
    END IF;
    IF CHAR_LENGTH(v_clean_desc) < 5 OR CHAR_LENGTH(v_clean_desc) > 300 THEN
        RAISE EXCEPTION 'A descrição deve ter entre 5 e 300 caracteres.';
    END IF;

    v_clean_link := NULLIF(TRIM(COALESCE(p_link_url, '')), '');
    v_clean_img := NULLIF(TRIM(COALESCE(p_image_url, '')), '');

    IF v_clean_link IS NOT NULL AND NOT (v_clean_link ~* '^https?://') THEN
        RAISE EXCEPTION 'Link de destino inválido. Use http:// ou https://.';
    END IF;
    IF v_clean_img IS NOT NULL AND NOT (v_clean_img ~* '^https?://') THEN
        RAISE EXCEPTION 'URL de imagem inválida. Use http:// ou https://.';
    END IF;

    SELECT created_at, LOWER(REPLACE(COALESCE(pioneer_username, ''), '@', ''))
    INTO v_created_at, v_owner
    FROM public.anuncios
    WHERE id = p_ad_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF v_owner <> v_clean_user THEN
        RAISE EXCEPTION 'Você não tem permissão para editar este anúncio.';
    END IF;

    IF v_created_at IS NULL OR v_created_at < (NOW() - INTERVAL '24 hours') THEN
        RAISE EXCEPTION 'Prazo de edição expirado (máximo 24h após a publicação).';
    END IF;

    UPDATE public.anuncios
    SET
        title = v_clean_title,
        description = v_clean_desc,
        link_url = v_clean_link,
        image_url = v_clean_img
    WHERE id = p_ad_id
      AND LOWER(REPLACE(pioneer_username, '@', '')) = v_clean_user
      AND created_at >= (NOW() - INTERVAL '24 hours');

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN (v_updated > 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.pioneer_update_my_ad(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
TO anon, authenticated, service_role;


-- 2. Tabela de Comentários Comunitários do Mural
CREATE TABLE IF NOT EXISTS public.anuncio_comentarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_id TEXT NOT NULL,
    author_username TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(author_username)) BETWEEN 2 AND 32),
    content TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(content)) BETWEEN 2 AND 280),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anuncio_comentarios_ad_created
    ON public.anuncio_comentarios (ad_id, created_at ASC);

ALTER TABLE public.anuncio_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comentários - Leitura Pública" ON public.anuncio_comentarios;
CREATE POLICY "Comentários - Leitura Pública"
    ON public.anuncio_comentarios FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Comentários - Inserção Validada" ON public.anuncio_comentarios;
CREATE POLICY "Comentários - Inserção Validada"
    ON public.anuncio_comentarios FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        CHAR_LENGTH(TRIM(ad_id)) > 0
        AND CHAR_LENGTH(TRIM(author_username)) BETWEEN 2 AND 32
        AND CHAR_LENGTH(TRIM(content)) BETWEEN 2 AND 280
    );

