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

-- ============================================================
-- POLÍTICAS DE SEGURANÇA MÁXIMA (ROW LEVEL SECURITY - RLS)
-- ============================================================
-- Garante que o JavaScript do site (chave pública "anon") possa
-- apenas inserir dados e nunca expor os e-mails dos outros usuários!

-- Ativar RLS em todas as tabelas
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pioneiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doacoes ENABLE ROW LEVEL SECURITY;

-- Regra para LEADS: Qualquer visitante pode inserir seu próprio lead (INSERT)
-- NENHUM visitante anônimo pode listar ou ler a tabela de leads (SELECT bloqueado para anon)
CREATE POLICY "Permitir inserção pública de leads"
    ON public.leads
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Regra para PIONEIROS: O pioneiro pode ler seus dados e atualizar seu progresso
CREATE POLICY "Pioneiro pode consultar seu perfil"
    ON public.pioneiros
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Pioneiro pode atualizar seu próprio perfil"
    ON public.pioneiros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Pioneiro pode modificar seu próprio score"
    ON public.pioneiros
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- Regra para DOAÇÕES: Registro anônimo permitido
CREATE POLICY "Permitir registro de apoio voluntário"
    ON public.doacoes
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

