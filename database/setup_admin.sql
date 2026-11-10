-- ============================================================
-- HOKAGE22B.COM — Arquitetura de Segurança Máxima (Zero-Trust)
-- Funções RPC com SECURITY DEFINER e Proteção Server-Side
-- Este arquivo é PÚBLICO no GitHub e NÃO contém nenhuma senha!
-- ============================================================

-- 1. REVOGAR PERMISSÕES PÚBLICAS PERIGOSAS (Blindagem do Banco)
-- Impede que qualquer pessoa usando a anon key leia leads ou altere anúncios
DROP POLICY IF EXISTS "Permitir leitura de leads para admin" ON public.leads;
DROP POLICY IF EXISTS "Permitir moderação de anúncios" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir exclusão de anúncios" ON public.anuncios;
DROP POLICY IF EXISTS "Permitir leitura de todos os anúncios" ON public.anuncios;

-- Restabelecer RLS pública estrita para visitantes:
-- Visitante comum só lê anúncios que estejam com status = 'ativo'
DROP POLICY IF EXISTS "Permitir leitura pública de anúncios ativos" ON public.anuncios;
CREATE POLICY "Permitir leitura pública de anúncios ativos"
    ON public.anuncios
    FOR SELECT
    TO anon, authenticated
    USING (status = 'ativo');

-- Visitante comum pode apenas enviar novos anúncios
DROP POLICY IF EXISTS "Permitir envio público de anúncio" ON public.anuncios;
CREATE POLICY "Permitir envio público de anúncio"
    ON public.anuncios
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Visitante comum pode apenas cadastrar seu e-mail (leads)
DROP POLICY IF EXISTS "Permitir inserção pública de leads" ON public.leads;
CREATE POLICY "Permitir inserção pública de leads"
    ON public.leads
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);


-- ============================================================
-- 2. TABELA OCULTA DE COFRE ADMINISTRATIVO
-- ============================================================
-- Esta tabela armazena APENAS o hash criptográfico da chave mestra.
-- Ela tem RLS ativa e NENHUMA política pública, logo é 100% INACESSÍVEL
-- por qualquer chamada da API REST externa ou pelo navegador.
CREATE TABLE IF NOT EXISTS public.admin_vault (
    id INT PRIMARY KEY DEFAULT 1,
    secret_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_vault ENABLE ROW LEVEL SECURITY;

-- Habilitação da Extensão pgcrypto para hashing criptográfico no PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 3. FUNÇÕES ADMINISTRATIVAS SEGURAS (Executam no Servidor)
-- ============================================================

-- A) Função Interna de Validação Criptográfica da Chave
CREATE OR REPLACE FUNCTION public.admin_verify_access(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_secret IS NULL OR LENGTH(TRIM(p_secret)) < 8 THEN
    RETURN false;
  END IF;

  v_hash := encode(digest(p_secret, 'sha256'), 'hex');

  RETURN EXISTS (
    SELECT 1 FROM public.admin_vault
    WHERE id = 1 AND secret_hash = v_hash
  );
END;
$$;

-- B) Função para Configurar ou Alterar a Chave Mestra (Blindada contra tomada não autorizada)
CREATE OR REPLACE FUNCTION public.admin_set_vault_key(p_current_key text, p_new_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_vault WHERE id = 1) THEN
    IF NOT public.admin_verify_access(p_current_key) THEN
      RAISE EXCEPTION 'Acesso Negado: A chave mestra atual está incorreta.';
    END IF;
  END IF;

  IF p_new_key IS NULL OR LENGTH(TRIM(p_new_key)) < 12 THEN
    RAISE EXCEPTION 'A nova chave mestra deve possuir no minimo 12 caracteres.';
  END IF;

  INSERT INTO public.admin_vault (id, secret_hash, updated_at)
  VALUES (1, encode(digest(p_new_key, 'sha256'), 'hex'), NOW())
  ON CONFLICT (id) DO UPDATE
  SET secret_hash = EXCLUDED.secret_hash, updated_at = NOW();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_vault_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_vault_key(text, text) TO service_role;

-- C) Listar todos os anúncios (ativos, pausados, pendentes)
CREATE OR REPLACE FUNCTION public.admin_get_all_ads(p_secret text)
RETURNS SETOF public.anuncios
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou nao configurada.';
  END IF;
  RETURN QUERY SELECT * FROM public.anuncios ORDER BY created_at DESC;
END;
$$;

-- D) Atualizar status do anúncio (ativar, pausar, promover para ouro)
CREATE OR REPLACE FUNCTION public.admin_update_ad_status(
  p_secret text,
  p_ad_id text,
  p_new_status text,
  p_new_tier text DEFAULT NULL,
  p_new_price numeric DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  IF p_new_tier IS NOT NULL AND p_new_price IS NOT NULL THEN
    UPDATE public.anuncios
    SET status = p_new_status, plan_tier = p_new_tier, price_pi = p_new_price
    WHERE id = p_ad_id;
  ELSE
    UPDATE public.anuncios
    SET status = p_new_status
    WHERE id = p_ad_id;
  END IF;

  RETURN FOUND;
END;
$$;

-- E) Excluir anúncio definitivamente
CREATE OR REPLACE FUNCTION public.admin_delete_ad(p_secret text, p_ad_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  DELETE FROM public.anuncios WHERE id = p_ad_id;
  RETURN FOUND;
END;
$$;

-- F) Listar todos os leads capturados
CREATE OR REPLACE FUNCTION public.admin_get_leads(p_secret text)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;
  RETURN QUERY SELECT * FROM public.leads ORDER BY created_at DESC;
END;
$$;

-- G) Criar anúncio com privilégio administrativo
CREATE OR REPLACE FUNCTION public.admin_create_ad(
  p_secret text,
  p_id text,
  p_title text,
  p_description text,
  p_link_url text,
  p_category text,
  p_tier text,
  p_price numeric,
  p_author text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.admin_verify_access(p_secret) THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta.';
  END IF;

  INSERT INTO public.anuncios (
    id, title, description, link_url, category, plan_tier, price_pi, pioneer_username, status
  ) VALUES (
    p_id, p_title, p_description, p_link_url, p_category, p_tier, p_price, p_author, 'ativo'
  );

  RETURN true;
END;
$$;

-- ============================================================
-- ATIVAÇÃO DA CHAVE MESTRA:
-- Para definir sua chave, execute a linha abaixo no Supabase
-- substituindo 'COLE_A_CHAVE_DO_ARQUIVO_COFRE_AQUI' pela chave
-- que está no seu arquivo local confidencial sys_access_vault_hkg22b.txt:
--
-- SELECT public.admin_set_vault_key('COLE_A_CHAVE_DO_ARQUIVO_COFRE_AQUI');
-- ============================================================
