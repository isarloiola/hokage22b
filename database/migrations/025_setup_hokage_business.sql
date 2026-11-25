-- ============================================================
-- HOKAGE22B.COM — MIGRATION 025: HOKAGE BUSINESS MVP (PI DEX READY)
-- Arquitetura 100% Não-Custodial · Utilidade Comercial · Zero-Trust RLS
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj/sql/new
-- ============================================================

-- 1. Empresas cadastradas (vinculadas ao Hokage ID / Pi UID)
CREATE TABLE IF NOT EXISTS public.hb_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid TEXT NOT NULL,
  owner_username TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'servicos',
  city_region TEXT,
  country_code TEXT NOT NULL DEFAULT 'BR',
  wallet_address TEXT NOT NULL,
  website_url TEXT,
  whatsapp_url TEXT,
  verification_level SMALLINT NOT NULL DEFAULT 1 CHECK (verification_level BETWEEN 1 AND 3),
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hb_businesses_owner_uid ON public.hb_businesses (owner_uid);
CREATE INDEX IF NOT EXISTS idx_hb_businesses_status_level ON public.hb_businesses (status, verification_level DESC);

-- 2. Tokens comerciais registrados na Pi Network (Testnet hoje -> Mainnet Pi DEX)
CREATE TABLE IF NOT EXISTS public.hb_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.hb_businesses(id) ON DELETE CASCADE,
  network TEXT NOT NULL DEFAULT 'testnet' CHECK (network IN ('testnet', 'mainnet')),
  asset_code TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  dex_pool_id TEXT,
  max_supply NUMERIC,
  utility_summary TEXT NOT NULL,
  trust_score SMALLINT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  wallet_proof_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network, asset_code, issuer_address)
);

CREATE INDEX IF NOT EXISTS idx_hb_tokens_business_id ON public.hb_tokens (business_id);

-- 3. Benefícios e utilidades comerciais do token (Transfer-to-Redeem e Hold-to-Unlock)
CREATE TABLE IF NOT EXISTS public.hb_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.hb_businesses(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.hb_tokens(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('transfer_redeem', 'hold_unlock')),
  title TEXT NOT NULL,
  description TEXT,
  required_amount NUMERIC NOT NULL CHECK (required_amount > 0),
  reward_type TEXT NOT NULL DEFAULT 'voucher' CHECK (reward_type IN ('voucher', 'ebook', 'vila_boost', 'vip_access', 'discount')),
  reward_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  max_redemptions INT,
  redemptions_count INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hb_benefits_business_active ON public.hb_benefits (business_id, active);

-- 4. Ordens de resgate on-chain (idempotentes via tx_hash único)
CREATE TABLE IF NOT EXISTS public.hb_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id UUID NOT NULL REFERENCES public.hb_benefits(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.hb_businesses(id) ON DELETE CASCADE,
  user_uid TEXT NOT NULL,
  user_username TEXT NOT NULL,
  user_wallet TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('transfer_redeem', 'hold_unlock')),
  expected_memo TEXT UNIQUE,
  expected_amount NUMERIC NOT NULL,
  tx_hash TEXT,
  voucher_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hb_redemptions_tx_hash_unique
  ON public.hb_redemptions (tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hb_redemptions_user_uid ON public.hb_redemptions (user_uid, created_at DESC);

-- 5. Auditoria de verificação Nível 2 / Nível 3
CREATE TABLE IF NOT EXISTS public.hb_verification_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.hb_businesses(id) ON DELETE CASCADE,
  target_level SMALLINT NOT NULL CHECK (target_level IN (2, 3)),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- 6. Blindagem Zero-Trust (RLS + revogação de acesso direto ao cliente)
ALTER TABLE public.hb_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hb_verification_audits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.hb_businesses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hb_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hb_benefits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hb_redemptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.hb_verification_audits FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.hb_businesses TO service_role;
GRANT ALL ON TABLE public.hb_tokens TO service_role;
GRANT ALL ON TABLE public.hb_benefits TO service_role;
GRANT ALL ON TABLE public.hb_redemptions TO service_role;
GRANT ALL ON TABLE public.hb_verification_audits TO service_role;

-- 7. View pública somente leitura (sem expor owner_uid ou evidências privadas)
CREATE OR REPLACE VIEW public.v_hb_businesses_public AS
SELECT
  b.id,
  b.slug,
  b.name,
  b.tagline,
  b.description,
  b.category,
  b.city_region,
  b.country_code,
  b.owner_username,
  b.wallet_address,
  b.website_url,
  b.whatsapp_url,
  b.verification_level,
  b.plan_tier,
  b.created_at,
  t.id AS token_id,
  t.network AS token_network,
  t.asset_code,
  t.issuer_address,
  t.dex_pool_id,
  t.max_supply,
  t.utility_summary,
  t.trust_score,
  t.wallet_proof_verified,
  COALESCE((SELECT COUNT(*) FROM public.hb_benefits bf WHERE bf.business_id = b.id AND bf.active = true), 0) AS active_benefits_count,
  COALESCE((SELECT SUM(bf.redemptions_count) FROM public.hb_benefits bf WHERE bf.business_id = b.id), 0) AS total_redemptions_count
FROM public.hb_businesses b
LEFT JOIN LATERAL (
  SELECT *
  FROM public.hb_tokens tk
  WHERE tk.business_id = b.id
  ORDER BY tk.updated_at DESC, tk.created_at DESC
  LIMIT 1
) t ON true
WHERE b.status = 'active';

GRANT SELECT ON public.v_hb_businesses_public TO anon, authenticated;

-- 8. Seed Idempotente: Empresa #01 Piloto (HOKAGE22B Oficial)
INSERT INTO public.hb_businesses (
  owner_uid,
  owner_username,
  slug,
  name,
  tagline,
  description,
  category,
  city_region,
  country_code,
  wallet_address,
  website_url,
  whatsapp_url,
  verification_level,
  plan_tier,
  status
)
VALUES (
  'seed_hokage22b_official',
  '@hokage22b',
  'hokage22b',
  'HOKAGE22B Oficial',
  'Empresa #01 Piloto · Ecossistema Web3, E-books & A Vila',
  'Negócio piloto oficial validando o padrão Hokage Business na Pi Testnet antes da abertura da Pi DEX Mainnet.',
  'tecnologia',
  'Brasil · Global',
  'BR',
  'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
  'https://hokage22b.com',
  'https://chat.whatsapp.com/JR6vrB10rCfGYCg3E3BRrE?s=cl&p=a&iam=2',
  2,
  'pro',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.hb_tokens (
  business_id,
  network,
  asset_code,
  issuer_address,
  dex_pool_id,
  max_supply,
  utility_summary,
  trust_score,
  wallet_proof_verified
)
SELECT
  b.id,
  'testnet',
  'HKG22B',
  'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
  'TESTNET-HKG22B-PI',
  1000000,
  'Token piloto de utilidade comercial: resgate de destaques na Vila, e-books oficiais e acesso ao Clube Construtor VIP.',
  92,
  true
FROM public.hb_businesses b
WHERE b.slug = 'hokage22b'
ON CONFLICT (network, asset_code, issuer_address) DO NOTHING;

INSERT INTO public.hb_benefits (
  business_id,
  token_id,
  mode,
  title,
  description,
  required_amount,
  reward_type,
  reward_payload,
  active
)
SELECT
  b.id,
  t.id,
  'transfer_redeem',
  'Resgate Piloto: Destaque Bronze na Vila ou E-book Oficial',
  'Envie 10 HKG22B (Testnet) com o memo da ordem para liberar seu voucher de destaque na Vila ou acesso ao acervo oficial.',
  10,
  'vila_boost',
  '{"instructions":"Apresente o código do voucher para ativar seu Destaque Bronze na Vila ou E-book."}'::jsonb,
  true
FROM public.hb_businesses b
JOIN public.hb_tokens t ON t.business_id = b.id AND t.asset_code = 'HKG22B' AND t.network = 'testnet'
WHERE b.slug = 'hokage22b'
  AND NOT EXISTS (
    SELECT 1 FROM public.hb_benefits bf
    WHERE bf.business_id = b.id AND bf.mode = 'transfer_redeem' AND bf.reward_type = 'vila_boost'
  );

INSERT INTO public.hb_benefits (
  business_id,
  token_id,
  mode,
  title,
  description,
  required_amount,
  reward_type,
  reward_payload,
  active
)
SELECT
  b.id,
  t.id,
  'hold_unlock',
  'Clube Construtor VIP HOKAGE22B',
  'Mantenha pelo menos 50 HKG22B na sua carteira Pi (Testnet) para desbloquear acesso prioritário, descontos e benefícios do ecossistema.',
  50,
  'vip_access',
  '{"tier":"vip_builder","perks":["Acesso antecipado a recursos","Descontos em produtos oficiais","Selo Construtor VIP"]}'::jsonb,
  true
FROM public.hb_businesses b
JOIN public.hb_tokens t ON t.business_id = b.id AND t.asset_code = 'HKG22B' AND t.network = 'testnet'
WHERE b.slug = 'hokage22b'
  AND NOT EXISTS (
    SELECT 1 FROM public.hb_benefits bf
    WHERE bf.business_id = b.id AND bf.mode = 'hold_unlock' AND bf.reward_type = 'vip_access'
  );
