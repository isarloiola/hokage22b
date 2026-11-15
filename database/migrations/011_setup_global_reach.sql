-- ============================================================
-- HOKAGE22B.COM — Alcance Global: Países & Moedas Universais
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

ALTER TABLE public.anuncios
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'GLOBAL';

CREATE INDEX IF NOT EXISTS idx_anuncios_country_code
    ON public.anuncios (country_code);

ALTER TABLE public.anuncios
DROP CONSTRAINT IF EXISTS chk_anuncios_payment_modes;

ALTER TABLE public.anuncios
ADD CONSTRAINT chk_anuncios_payment_modes
CHECK (payment_modes IN ('pi', 'pi_fiat', 'fiat', 'pi_reais', 'reais'));

