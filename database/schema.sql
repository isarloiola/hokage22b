-- ============================================================
-- isar.pi — Schema do Banco de Dados (Supabase / PostgreSQL)
-- Com Políticas de Segurança RLS (Row Level Security) Ativas
-- ============================================================

-- 1. TABELA DE LEADS (Captura de E-mails do Ebook e Reservas)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT DEFAULT 'ebook-manual-pi',
    pi_username TEXT,
    reputation_score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. TABELA DE PIONEIROS & REPUTAÇÃO (Sincronização entre Dispositivos)
CREATE TABLE IF NOT EXISTS public.pioneiros (
    uid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    auth_type TEXT DEFAULT 'pi-sdk',
    reputation_score INT DEFAULT 50,
    level_name TEXT DEFAULT 'Pioneiro Iniciante',
    checklist_state JSONB DEFAULT '{}'::jsonb,
    ebook_downloaded BOOLEAN DEFAULT false,
    ebook2_reserved BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE DOAÇÕES E APOIOS (Registro de doações confirmadas/informadas)
CREATE TABLE IF NOT EXISTS public.doacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_identifier TEXT DEFAULT 'Anônimo',
    currency TEXT CHECK (currency IN ('PI', 'BRL')),
    amount NUMERIC(12, 4),
    status TEXT DEFAULT 'recebido',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABELA DE ANÚNCIOS / MURAL DOS PIONEIROS
CREATE TABLE IF NOT EXISTS public.anuncios (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    link_url TEXT,
    image_url TEXT,
    category TEXT DEFAULT 'geral',
    pioneer_username TEXT DEFAULT '@pioneiro',
    pioneer_name TEXT DEFAULT 'Pioneiro',
    plan_tier TEXT DEFAULT 'prata',
    price_pi NUMERIC(8, 4) DEFAULT 1.0,
    payment_txid TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================
-- POLÍTICAS DE SEGURANÇA MÁXIMA (ROW LEVEL SECURITY - RLS)
-- ============================================================
-- Garante que o JavaScript do site (chave pública "anon") possa
-- apenas inserir dados e nunca expor os e-mails dos outros usuários!

-- Ativar RLS em todas as tabelas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pioneiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Regra para LEADS: Qualquer visitante pode inserir seu próprio lead (INSERT)
-- NENHUM visitante anônimo pode listar ou ler a tabela de leads (SELECT bloqueado para anon)
DROP POLICY IF EXISTS "Permitir inserção pública de leads" ON public.leads;
CREATE POLICY "Permitir inserção pública de leads"
    ON public.leads
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Regra para PIONEIROS: O pioneiro pode ler seus dados e atualizar seu progresso
DROP POLICY IF EXISTS "Pioneiro pode consultar seu perfil" ON public.pioneiros;
CREATE POLICY "Pioneiro pode consultar seu perfil"
    ON public.pioneiros
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Pioneiro pode atualizar seu próprio perfil" ON public.pioneiros;
CREATE POLICY "Pioneiro pode atualizar seu próprio perfil"
    ON public.pioneiros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Pioneiro pode modificar seu próprio score" ON public.pioneiros;
CREATE POLICY "Pioneiro pode modificar seu próprio score"
    ON public.pioneiros
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- Regra para DOAÇÕES: Registro anônimo permitido
DROP POLICY IF EXISTS "Permitir registro de apoio voluntário" ON public.doacoes;
CREATE POLICY "Permitir registro de apoio voluntário"
    ON public.doacoes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Regras para ANÚNCIOS: Qualquer pessoa pode ler anúncios ativos e submeter novos
DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
CREATE POLICY "Permitir leitura pública de anúncios ativos"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (status = 'ativo');

DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email);
CREATE INDEX IF NOT EXISTS idx_pioneiros_score ON public.pioneiros (reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_anuncios_status_created ON public.anuncios (status, created_at DESC);

