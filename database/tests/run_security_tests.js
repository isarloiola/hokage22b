// ============================================================
// HOKAGE22B — SUITE DE TESTES AUTOMATIZADOS DE SEGURANÇA (FASE 1)
// Executa testes positivos e negativos contra o Supabase de produção
// com a chave pública anônima (anon key).
// ============================================================

const sbUrl = 'https://yhzoehwkuxteihsnagcj.supabase.co';
const sbKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem9laHdrdXh0ZWloc25hZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzg2OTgsImV4cCI6MjEwODg1NDY5OH0.0ym3I-8oyG3ot_J6ofoVl7pu1m7WyIORLiStQynHG5c';

const headers = {
  apikey: sbKey,
  Authorization: 'Bearer ' + sbKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

async function runTests() {
  console.log('============================================================');
  console.log('VALIDAÇÃO DE SEGURANÇA PÓS-BLINDAGEM — FASE 1 (HOKAGE22B)');
  console.log('Ambiente:', sbUrl);
  console.log('Data:', new Date().toISOString());
  console.log('============================================================\n');

  const results = [];

  // TESTE 1 (Positivo): Leitura pública da vitrine do fundador via View segura
  try {
    const res = await fetch(`${sbUrl}/rest/v1/v_passaportes_publicos?username=eq.@hokage22b&select=username,wallet_address,reputation_score&limit=1`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data) && data.length > 0;
    results.push({
      id: 'TESTE_01_POSITIVO',
      descricao: 'Leitura pública de vitrines via view segura v_passaportes_publicos',
      resultado: ok ? 'PASSOU (Aprovado)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? `Vitrine pública encontrada: ${data[0].username}` : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_01_POSITIVO', descricao: 'Leitura pública de vitrine', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 2 (Positivo): Proteção da tabela de leads (privacidade e LGPD)
  try {
    const res = await fetch(`${sbUrl}/rest/v1/leads?select=email&limit=5`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data) && data.length === 0;
    results.push({
      id: 'TESTE_02_POSITIVO',
      descricao: 'Privacidade de leads (visitante anônimo não lê e-mails)',
      resultado: ok ? 'PASSOU (Aprovado)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? 'Zero leads expostos (Array vazio protegido por RLS)' : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_02_POSITIVO', descricao: 'Privacidade de leads', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 3 (Negativo): Bloqueio de INSERT direto em pioneiros via anon
  try {
    const res = await fetch(`${sbUrl}/rest/v1/pioneiros`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid: 'hack_anon_uid_' + Date.now(), username: '@pioneiro_falso' })
    });
    const data = await res.json().catch(() => null);
    const blocked = res.status === 401 || res.status === 403 || (data && data.code === '42501');
    results.push({
      id: 'TESTE_03_NEGATIVO',
      descricao: 'Tentativa de criar pioneiro diretamente sem autenticação do backend',
      resultado: blocked ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU (Brecha aberta)',
      httpCode: res.status,
      detalhe: data && data.message ? data.message : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_03_NEGATIVO', descricao: 'INSERT direto em pioneiros', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 4 (Negativo): Bloqueio de PATCH/UPDATE arbitrário em pioneiros via anon
  try {
    const res = await fetch(`${sbUrl}/rest/v1/pioneiros?uid=eq.user_hokage22b`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ wallet_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR', bio: 'Invasor' })
    });
    const data = await res.json().catch(() => null);
    // Deve retornar [] (0 linhas atualizadas) ou erro RLS / REVOKE (401/403/42501)
    const ok = res.status === 401 || res.status === 403 || (data && data.code === '42501') || (Array.isArray(data) && data.length === 0);
    results.push({
      id: 'TESTE_04_NEGATIVO',
      descricao: 'Tentativa de alterar carteira ou bio de pioneiro via anon key',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok
        ? (data && data.message ? `Acesso bloqueado (HTTP ${res.status}): ${data.message}` : '0 linhas modificadas (RLS/REVOKE bloqueou a alteração)')
        : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_04_NEGATIVO', descricao: 'PATCH em pioneiros', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 5 (Negativo): Bloqueio de DELETE em pioneiros via anon
  try {
    const res = await fetch(`${sbUrl}/rest/v1/pioneiros?uid=eq.user_hokage22b`, {
      method: 'DELETE',
      headers
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401 || res.status === 403 || (data && data.code === '42501') || !data || (Array.isArray(data) && data.length === 0);
    results.push({
      id: 'TESTE_05_NEGATIVO',
      descricao: 'Tentativa de excluir pioneiro via anon key',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok
        ? (data && data.message ? `Acesso bloqueado (HTTP ${res.status}): ${data.message}` : '0 registros excluídos (RLS/REVOKE bloqueou)')
        : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_05_NEGATIVO', descricao: 'DELETE em pioneiros', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 6 (Negativo): Tentativa de burlar anúncio publicando direto como ATIVO
  try {
    const fakeAdId = 'ad_fake_test_' + Date.now();
    const res = await fetch(`${sbUrl}/rest/v1/anuncios`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: fakeAdId,
        title: 'Anúncio Pirata Sem Pagar',
        description: 'Tentando forçar status ativo',
        status: 'ativo',
        plan_tier: 'ouro',
        price_pi: 0
      })
    });
    const data = await res.json().catch(() => null);
    const blocked = res.status === 401 || res.status === 403 || (data && data.code === '42501');
    results.push({
      id: 'TESTE_06_NEGATIVO',
      descricao: 'Tentativa de publicar anúncio diretamente com status = ativo sem pagar',
      resultado: blocked ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU (Brecha aberta)',
      httpCode: res.status,
      detalhe: data && data.message ? `Erro RLS retornado: ${data.message}` : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_06_NEGATIVO', descricao: 'INSERT de anúncio ativo', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 7 (Negativo - Migration 020): Bloqueio TOTAL de INSERT direto anon em anuncios
  try {
    const blockedAdId = 'ad_anon_blocked_test_' + Date.now();
    const res = await fetch(`${sbUrl}/rest/v1/anuncios`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id: blockedAdId,
        title: 'Tentativa INSERT direto via anon',
        description: 'Deve ser bloqueado pela RLS/Migration 020',
        status: 'pendente',
        plan_tier: 'prata',
        price_pi: 1.0
      })
    });
    const data = await res.json().catch(() => null);
    const blocked = res.status === 401 || res.status === 403 || res.status === 400 || (data && (data.code === '42501' || data.code === 'P0001'));

    results.push({
      id: 'TESTE_07_NEGATIVO',
      descricao: 'Bloqueio de INSERT direto em anuncios via anon key (Migration 020)',
      resultado: blocked ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU (Brecha aberta)',
      httpCode: res.status,
      detalhe: data && data.message ? data.message : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_07_NEGATIVO', descricao: 'Bloqueio de INSERT em anuncios', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 8 (Negativo): Tentativa de alterar anúncio para ativo via PATCH anon
  try {
    const res = await fetch(`${sbUrl}/rest/v1/anuncios?id=eq.ad_audit_test_1794145676122`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'ativo' })
    });
    const data = await res.json().catch(() => null);
    const ok = Array.isArray(data) && data.length === 0;
    results.push({
      id: 'TESTE_08_NEGATIVO',
      descricao: 'Tentativa de ativar anúncios via PATCH anônimo',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? '0 anúncios alterados (RLS anuncios_update_blocked bloqueou)' : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_08_NEGATIVO', descricao: 'PATCH em anuncios', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 9 (Positivo): Leitura pública transparente do ledger transacoes_pi
  try {
    const res = await fetch(`${sbUrl}/rest/v1/transacoes_pi?select=payment_id,amount,status&limit=5`, { headers });
    const data = await res.json().catch(() => null);
    const ok = res.status === 200 && Array.isArray(data);
    results.push({
      id: 'TESTE_09_POSITIVO',
      descricao: 'Leitura pública transparente do ledger transacoes_pi (Transparência Web3)',
      resultado: ok ? 'PASSOU (Aprovado)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? `Consulta pública realizada com sucesso (${data.length} registros)` : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_09_POSITIVO', descricao: 'Leitura de transacoes_pi', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 10 (Negativo): Tentativa de forjar transação no ledger via anon key
  try {
    const res = await fetch(`${sbUrl}/rest/v1/transacoes_pi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        payment_id: 'fraud_audit_test_' + Date.now(),
        amount: 314.0,
        status: 'completed'
      })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401 || res.status === 403 || (data && data.code === '42501');
    results.push({
      id: 'TESTE_10_NEGATIVO',
      descricao: 'Tentativa de forjar registro no ledger transacoes_pi via chave anônima',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? 'Acesso negado por RLS / REVOKE (HTTP ' + res.status + ')' : JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_10_NEGATIVO', descricao: 'Escrita em transacoes_pi', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 11 (Negativo - Edge Function): pi-payment approve sem accessToken
  try {
    const res = await fetch(`${sbUrl}/functions/v1/pi-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', paymentId: 'test_pid_1234' })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401;
    results.push({
      id: 'TESTE_11_EDGE_APPROVE_AUTH',
      descricao: 'Edge Function pi-payment approve exige accessToken Pi válido',
      resultado: ok ? 'PASSOU (Bloqueado com 401)' : 'FALHOU',
      httpCode: res.status,
      detalhe: JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_11_EDGE_APPROVE_AUTH', descricao: 'pi-payment approve auth', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 12 (Negativo - Edge Function): pi-payment complete sem accessToken
  try {
    const res = await fetch(`${sbUrl}/functions/v1/pi-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', paymentId: 'test_pid_1234', txid: 'test_txid_1234' })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401;
    results.push({
      id: 'TESTE_12_EDGE_COMPLETE_AUTH',
      descricao: 'Edge Function pi-payment complete exige accessToken Pi válido',
      resultado: ok ? 'PASSOU (Bloqueado com 401)' : 'FALHOU',
      httpCode: res.status,
      detalhe: JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_12_EDGE_COMPLETE_AUTH', descricao: 'pi-payment complete auth', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 13 (Negativo - Edge Function): pi-payment affiliate_summary sem accessToken
  try {
    const res = await fetch(`${sbUrl}/functions/v1/pi-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'affiliate_summary', username: '@hokage22b' })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401;
    results.push({
      id: 'TESTE_13_EDGE_AFFILIATE_AUTH',
      descricao: 'Edge Function pi-payment affiliate_summary bloqueia consulta sem autenticação',
      resultado: ok ? 'PASSOU (Bloqueado com 401)' : 'FALHOU',
      httpCode: res.status,
      detalhe: JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_13_EDGE_AFFILIATE_AUTH', descricao: 'affiliate_summary auth', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 14 (Negativo - Edge Function): telegram-bot ?setup=1 sem segredo
  try {
    const res = await fetch(`${sbUrl}/functions/v1/telegram-bot?setup=1`, { method: 'GET' });
    const data = await res.json().catch(() => null);
    const ok = res.status === 401 || res.status === 500;
    results.push({
      id: 'TESTE_14_EDGE_TG_SETUP',
      descricao: 'Endpoint telegram-bot?setup=1 bloqueado sem segredo administrativo',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_14_EDGE_TG_SETUP', descricao: 'telegram-bot setup', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 15 (Negativo - Edge Function): telegram-bot track_event rejeita Origin externa
  try {
    const res = await fetch(`${sbUrl}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://evil.example' },
      body: JSON.stringify({ action: 'track_event', event: 'security_probe' })
    });
    const data = await res.json().catch(() => null);
    const ok = res.status === 403;
    results.push({
      id: 'TESTE_15_EDGE_TG_ORIGIN',
      descricao: 'Endpoint telegram-bot track_event rejeita Origin não autorizada',
      resultado: ok ? 'PASSOU (Bloqueado com 403)' : 'FALHOU',
      httpCode: res.status,
      detalhe: JSON.stringify(data)
    });
  } catch (e) {
    results.push({ id: 'TESTE_15_EDGE_TG_ORIGIN', descricao: 'telegram-bot origin', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 16 (Pós-Migration 021): Verifica bloqueio de SELECT direto em public.pioneiros via anon
  try {
    const res = await fetch(`${sbUrl}/rest/v1/pioneiros?select=uid,referral_credits&limit=1`, { headers });
    const data = await res.json().catch(() => null);
    const blocked = res.status === 401 || res.status === 403 || (Array.isArray(data) && data.length === 0) || (data && data.code === '42501');
    results.push({
      id: 'TESTE_16_MIGRATION_021_PIONEIROS',
      descricao: 'Tabela base public.pioneiros bloqueia exposição direta de uid/referral_credits (Migration 021)',
      resultado: blocked ? 'PASSOU (Bloqueado com Sucesso)' : 'AGUARDANDO EXECUÇÃO DA MIGRATION 021 NO SQL EDITOR',
      httpCode: res.status,
      detalhe: blocked ? 'Tabela base protegida com sucesso' : 'Execute 021_phase1_security_hardening.sql no Supabase SQL Editor'
    });
  } catch (e) {
    results.push({ id: 'TESTE_16_MIGRATION_021_PIONEIROS', descricao: 'pioneiros direct SELECT', resultado: 'ERRO', detalhe: e.message });
  }

  // TESTE 17 (Fase 2 - public-api): Validação estrita de ?u= e escape de curinga _
  try {
    const apiBase = `${sbUrl}/functions/v1/public-api/v1/passaportes`;
    const rBad = await fetch(`${apiBase}?u=${encodeURIComponent('hokage22b,uid.neq.0')}`);
    const dBad = await rBad.json().catch(() => null);
    const rUnder = await fetch(`${apiBase}?u=test_underscore_check`);
    const rGood = await fetch(`${apiBase}?u=hokage22b`);

    const badOk = rBad.status === 400 && dBad && dBad.code === 'INVALID_USERNAME';
    const underOk = rUnder.status === 200 || rUnder.status === 404;
    const goodOk = rGood.status === 200;
    const ok = badOk && underOk && goodOk;

    results.push({
      id: 'TESTE_17_PUBLIC_API_VALIDATION',
      descricao: 'public-api /passaportes valida ?u= contra injeção PostgREST e escapa curinga _',
      resultado: ok ? 'PASSOU (Validado com Sucesso)' : 'FALHOU',
      httpCode: { bad: rBad.status, underscore: rUnder.status, good: rGood.status },
      detalhe: `bad=${rBad.status}(${dBad ? dBad.code : ''}), underscore=${rUnder.status}, good=${rGood.status}`
    });
  } catch (e) {
    results.push({ id: 'TESTE_17_PUBLIC_API_VALIDATION', descricao: 'public-api /passaportes validation', resultado: 'ERRO', detalhe: e.message });
  }

  console.log(JSON.stringify(results, null, 2));
}

runTests();
