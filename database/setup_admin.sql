-- ============================================================
-- HOKAGE22B.COM — Arquitetura de Segurança Máxima (Zero-Trust)
-- Funções RPC com SECURITY DEFINER e Proteção Server-Side
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
-- 2. FUNÇÕES ADMINISTRATIVAS SEGURAS (Executam no Servidor)
-- A validação da Chave Mestra é feita DIRETAMENTE NO POSTGRESQL.
-- Nenhum hacker consegue burlar pelo navegador.
-- ============================================================

-- Chave Mestra Segura: 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x'

-- A) Função para testar a chave e autenticar
CREATE OR REPLACE FUNCTION public.admin_verify_access(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- B) Listar todos os anúncios (ativos, pausados, pendentes)
CREATE OR REPLACE FUNCTION public.admin_get_all_ads(p_secret text)
RETURNS SETOF public.anuncios
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou ausente.';
  END IF;
  RETURN QUERY SELECT * FROM public.anuncios ORDER BY created_at DESC;
END;
$$;

-- C) Atualizar status do anúncio (ativar, pausar, promover para ouro)
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
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou ausente.';
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

-- D) Excluir anúncio definitivamente
CREATE OR REPLACE FUNCTION public.admin_delete_ad(p_secret text, p_ad_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou ausente.';
  END IF;

  DELETE FROM public.anuncios WHERE id = p_ad_id;
  RETURN FOUND;
END;
$$;

-- E) Listar todos os leads capturados
CREATE OR REPLACE FUNCTION public.admin_get_leads(p_secret text)
RETURNS SETOF public.leads
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou ausente.';
  END IF;
  RETURN QUERY SELECT * FROM public.leads ORDER BY created_at DESC;
END;
$$;

-- F) Criar anúncio com privilégio administrativo
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
  IF p_secret IS NULL OR p_secret != 'Hkg22b_Vlt_eef84749517404ac465ecfec97523162_Pi9x' THEN
    RAISE EXCEPTION 'Acesso Negado: Chave de seguranca incorreta ou ausente.';
  END IF;

  INSERT INTO public.anuncios (
    id, title, description, link_url, category, plan_tier, price_pi, pioneer_username, status
  ) VALUES (
    p_id, p_title, p_description, p_link_url, p_category, p_tier, p_price, p_author, 'ativo'
  );

  RETURN true;
END;
$$;
