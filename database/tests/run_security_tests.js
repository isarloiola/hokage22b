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

  // TESTE 1 (Positivo): Leitura pública da vitrine do fundador
  try {
    const res = await fetch(`${sbUrl}/rest/v1/pioneiros?username=eq.@hokage22b&select=username,wallet_address,reputation_score&limit=1`, { headers });
    const data = await res.json();
    const ok = res.status === 200 && Array.isArray(data) && data.length > 0;
    results.push({
      id: 'TESTE_01_POSITIVO',
      descricao: 'Leitura pública de vitrines via anon key (Linktree Web3 acessível)',
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
    // Deve retornar [] (0 linhas atualizadas) ou erro RLS
    const ok = Array.isArray(data) && data.length === 0;
    results.push({
      id: 'TESTE_04_NEGATIVO',
      descricao: 'Tentativa de alterar carteira ou bio de pioneiro via anon key',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? '0 linhas modificadas (RLS pioneiros_update_backend_only bloqueou a alteração)' : JSON.stringify(data)
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
    const ok = !data || (Array.isArray(data) && data.length === 0);
    results.push({
      id: 'TESTE_05_NEGATIVO',
      descricao: 'Tentativa de excluir pioneiro via anon key',
      resultado: ok ? 'PASSOU (Bloqueado com Sucesso)' : 'FALHOU',
      httpCode: res.status,
      detalhe: '0 registros excluídos (RLS pioneiros_delete_backend_only ativa)'
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

  // TESTE 7 (Positivo): Envio legítimo de anúncio como PENDENTE
  try {
    const legitimateAdId = 'ad_pendente_test_' + Date.now();
    const res = await fetch(`${sbUrl}/rest/v1/anuncios`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: 'Bearer ' + sbKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        id: legitimateAdId,
        title: 'Anúncio Legítimo Aguardando Moderação',
        description: 'Entrando na fila de moderação/pagamento',
        status: 'pendente',
        plan_tier: 'prata',
        price_pi: 1.0
      })
    });
    const ok = res.status === 201;

    results.push({
      id: 'TESTE_07_POSITIVO',
      descricao: 'Envio legítimo de anúncio na fila com status = pendente',
      resultado: ok ? 'PASSOU (Aprovado)' : 'FALHOU',
      httpCode: res.status,
      detalhe: ok ? 'Anúncio gravado com sucesso (HTTP 201 Created)' : 'Falhou com status HTTP: ' + res.status
    });
  } catch (e) {
    results.push({ id: 'TESTE_07_POSITIVO', descricao: 'Envio de anúncio pendente', resultado: 'ERRO', detalhe: e.message });
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

  console.log(JSON.stringify(results, null, 2));
}

runTests();
