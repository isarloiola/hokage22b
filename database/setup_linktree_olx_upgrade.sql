-- ============================================================
-- HOKAGE22B.COM — Upgrade Linktree + OLX + Reputação Pi
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Campos de Localização e Moeda nos Anúncios do Mural (OLX Web3)
ALTER TABLE public.anuncios
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Online / Digital';

ALTER TABLE public.anuncios
ADD COLUMN IF NOT EXISTS payment_modes TEXT DEFAULT 'pi';

ALTER TABLE public.anuncios
DROP CONSTRAINT IF EXISTS chk_anuncios_payment_modes;

ALTER TABLE public.anuncios
ADD CONSTRAINT chk_anuncios_payment_modes
CHECK (payment_modes IN ('pi', 'pi_reais', 'reais'));


-- 2. Tabela de Avaliações & Reputação Verificada de Pioneiros
--    Escrita exclusiva via Edge Function `mural-action` (Zero-Trust)
CREATE TABLE IF NOT EXISTS public.pioneer_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_username TEXT NOT NULL,
    reviewer_username TEXT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL CHECK (CHAR_LENGTH(TRIM(comment)) BETWEEN 2 AND 200),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_pioneer_review_pair UNIQUE (target_username, reviewer_username)
);

CREATE INDEX IF NOT EXISTS idx_pioneer_reviews_target
    ON public.pioneer_reviews (target_username, created_at DESC);

ALTER TABLE public.pioneer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews - Leitura Pública" ON public.pioneer_reviews;
CREATE POLICY "Reviews - Leitura Pública"
    ON public.pioneer_reviews FOR SELECT
    TO anon, authenticated
    USING (true);

