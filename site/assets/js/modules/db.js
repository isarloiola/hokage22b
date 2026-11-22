// ============================================================
// isar.pi — Module: Database Client (Supabase Integration)
// Sincronização em Nuvem com Segurança RLS (Row Level Security)
// ============================================================

(function () {
  'use strict';

  // Configuração do Supabase (Produção Ativa)
  const SUPABASE_URL = window.ISAR_SUPABASE_URL || 'https://yhzoehwkuxteihsnagcj.supabase.co';
  const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem9laHdrdXh0ZWloc25hZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzg2OTgsImV4cCI6MjEwODg1NDY5OH0.0ym3I-8oyG3ot_J6ofoVl7pu1m7WyIORLiStQynHG5c';

  const MURAL_ACTION_URL = SUPABASE_URL + '/functions/v1/mural-action';

  async function callMuralAction(action, payload) {
    let accessToken = (window.HokagePi && window.HokagePi.getAccessToken)
      ? window.HokagePi.getAccessToken()
      : '';

    if (!accessToken) {
      try { accessToken = sessionStorage.getItem('hokage_pi_access_token') || ''; } catch (_) { }
    }

    if (!accessToken && window.Pi && typeof window.Pi.authenticate === 'function') {
      try {
        const auth = await window.Pi.authenticate(['username'], function () { });
        if (auth && auth.accessToken) {
          accessToken = auth.accessToken;
          try { sessionStorage.setItem('hokage_pi_access_token', accessToken); } catch (_) { }
        }
      } catch (_) { }
    }

    if (!accessToken) {
      throw new Error('Sessão Pi Network não autenticada. Conecte-se no Pi Browser.');
    }

    const res = await fetch(MURAL_ACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        action: action,
        accessToken: accessToken,
        payload: payload || {}
      })
    });

    const json = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      throw new Error(json.error || ('Erro no servidor (' + res.status + ')'));
    }
    return json;
  }

  let client = null;

  function getClient() {
    if (client) return client;
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } catch (err) {
        console.warn('Erro ao inicializar Supabase:', err);
      }
    }
    return client;
  }

  // Validador Criptográfico de Chave Pública Pi Network (Stellar Ed25519)
  function isValidPiPublicKey(address) {
    if (window.HokageUtils && typeof window.HokageUtils.isValidPiPublicKey === 'function') {
      return window.HokageUtils.isValidPiPublicKey(address);
    }
    if (!address || typeof address !== 'string') return false;
    return /^G[A-Z2-7]{55}$/.test(address.trim());
  }

  // Sincroniza o perfil do Pioneiro (delega com segurança para savePioneerProfile via Edge Function)
  async function syncPioneerProfile(profile) {
    if (!profile || !profile.username) return null;
    try {
      return await savePioneerProfile(profile.username, {
        checklist_state: profile.checklist || profile.checklist_state || {}
      });
    } catch (err) {
      console.warn('Supabase: Erro ao sincronizar pioneiro:', err && err.message ? err.message : err);
      return null;
    }
  }

  // Registra um novo lead no banco de dados Supabase
  async function saveLead(leadData) {
    const db = getClient();
    if (!db) return null;

    try {
      const payload = {
        name: leadData.name,
        email: leadData.email,
        source: leadData.source || 'ebook-manual-pi',
        pi_username: leadData.pi_username || null,
        reputation_score: parseInt(leadData.reputation || '0', 10)
      };

      const { data, error } = await db
        .from('leads')
        .insert([payload]);

      if (error) throw error;

      try {
        fetch(SUPABASE_URL + '/functions/v1/pi-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify_lead',
            name: payload.name,
            email: payload.email,
            source: payload.source,
            pi_username: payload.pi_username
          })
        }).catch(function () { });
      } catch (_) { }

      return data;
    } catch (err) {
      console.warn('Supabase: Erro ao salvar lead:', err.message);
      return null;
    }
  }

  // Busca o ranking dos melhores pioneiros (via view pública sem colunas sensíveis)
  async function getLeaderboard(limit) {
    const db = getClient();
    if (!db) return [];
    limit = limit || 10;

    try {
      const { data, error } = await db
        .from('v_passaportes_publicos')
        .select('username, reputation_score, level_name')
        .order('reputation_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase: Erro ao carregar leaderboard:', err.message);
      return [];
    }
  }

  // Busca o perfil salvo do pioneiro via view pública (Zero-Trust: sem SELECT direto na tabela pioneiros)
  async function getPioneerProfile(uidOrHandle) {
    const db = getClient();
    if (!db || !uidOrHandle) return null;

    try {
      let lookup = String(uidOrHandle).trim();
      if (!lookup.startsWith('@') && lookup.length > 24) {
        try {
          const cached = JSON.parse(localStorage.getItem('hokage_pi_user') || 'null');
          if (cached && cached.uid === lookup && cached.username) {
            lookup = cached.username;
          }
        } catch (_) {}
      }
      const clean = lookup.replace(/^@+/, '').toLowerCase();
      if (!clean) return null;

      const { data, error } = await db
        .from('v_passaportes_publicos')
        .select('*')
        .or('username.ilike.' + clean + ',username.ilike.@' + clean)
        .limit(1);

      if (error || !data || data.length === 0) return null;
      return data[0];
    } catch (err) {
      return null;
    }
  }

  // Busca os anúncios ativos no mural (com filtro de validade e hierarquia comercial)
  async function getAnuncios(category, opts) {
    const db = getClient();
    if (!db) return [];
    const options = opts && typeof opts === 'object' ? opts : {};
    const limit = Math.min(200, Math.max(1, parseInt(options.limit, 10) || 120));
    const offset = Math.max(0, parseInt(options.offset, 10) || 0);

    function filterValidAds(rows) {
      const now = Date.now();
      return (rows || []).filter(function (ad) {
        if (!ad) return false;
        const st = String(ad.status || 'ativo').toLowerCase();
        if (['suspenso', 'pendente', 'moderacao', 'pausado', 'vendido', 'expirado'].indexOf(st) !== -1) {
          return false;
        }
        if (String(ad.plan_tier || '').toLowerCase() === 'gratis' && ad.expires_at) {
          const expMs = new Date(ad.expires_at).getTime();
          if (Number.isFinite(expMs) && expMs < now) return false;
        }
        return true;
      });
    }

    try {
      let query = db
        .from('anuncios')
        .select('*')
        .or('status.eq.ativo,status.eq.demonstracao,is_founder_demo.eq.true')
        .order('created_at', { ascending: false });

      if (category && category !== 'todos') {
        query = query.eq('category', category);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;
      if (error) {
        // Fallback gracioso se a coluna is_founder_demo ainda não foi migrada
        const fallbackRes = await db
          .from('anuncios')
          .select('*')
          .eq('status', 'ativo')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (fallbackRes.error) throw fallbackRes.error;
        return filterValidAds(fallbackRes.data);
      }

      return filterValidAds(data);
    } catch (err) {
      console.warn('Supabase: Erro ao carregar anúncios:', err.message);
      return [];
    }
  }

  async function getMuralConfig() {
    try {
      const res = await fetch(MURAL_ACTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ action: 'get_config' })
      });
      const json = await res.json().catch(function () { return {}; });
      return (json && json.ok && json.data && json.data.config) ? json.data.config : null;
    } catch (_) {
      return null;
    }
  }

  // Cria um novo anúncio no mural (Backend-First: servidor valida pagamento/crédito via Edge Function)
  async function createAnuncio(adData) {
    if (!adData) return null;

    // Se já foi criado/liquidado no backend por pi-payment (com TXID verificado), não duplica via anon
    if (adData.payment_txid && !adData.paymentId && !adData.is_founder_demo) {
      return [adData];
    }

    // Se houver paymentId sem TXID pré-liquidado, delega à Edge Function mural-action
    if (adData.paymentId) {
      const res = await callMuralAction('create_ad', adData);
      return res && res.ad ? [res.ad] : [adData];
    }

    // Apenas demonstração do fundador pode usar fallback explícito se configurado
    if (!adData.is_founder_demo) {
      throw new Error('Criação de anúncio exige validação no servidor (Pi Payment ou Crédito de Indicação).');
    }

    const db = getClient();
    if (!db) return null;

    try {
      const tier = adData.plan_tier || 'bronze';
      const payload = {
        id: adData.id || ('ad_' + Date.now()),
        title: adData.title,
        description: adData.description,
        link_url: adData.link_url || null,
        image_url: adData.image_url || null,
        category: adData.category || 'geral',
        pioneer_username: adData.pioneer_username || '@pioneiro',
        pioneer_name: adData.pioneer_name || 'Pioneiro',
        plan_tier: tier,
        price_pi: parseFloat(adData.price_pi) || 0.0,
        status: adData.status || 'demonstracao',
        exposure_type: adData.exposure_type || (tier === 'ouro' ? 'priority' : 'rotation'),
        is_founder_demo: true,
        payment_txid: adData.payment_txid || 'FOUNDER_DEMO_OFFICIAL',
        created_at: adData.created_at || new Date().toISOString()
      };

      const { data, error } = await db.from('anuncios').insert([payload]);
      if (error && error.code === '23505') return [payload];
      if (error) throw error;
      return data || [payload];
    } catch (err) {
      console.warn('Supabase: Falha ao criar demonstração:', err.message);
      return null;
    }
  }

  // Registra denúncia de anúncio pela comunidade (Edge Function Zero-Trust)
  async function createDenuncia(denunciaData) {
    try {
      const res = await callMuralAction('create_report', {
        ad_id: denunciaData.ad_id,
        ad_title: denunciaData.ad_title,
        reason: denunciaData.reason,
        details: denunciaData.details
      });
      return res;
    } catch (err) {
      console.warn('Erro ao registrar denúncia:', err.message);
      throw err;
    }
  }

  // --- MÉTODOS DE ADMINISTRAÇÃO E GESTÃO (COM SUPORTE A RPC ZERO-TRUST) ---

  // Valida a chave mestra no servidor PostgreSQL
  async function verifyAdminAccess(secret) {
    const db = getClient();
    if (!db || !secret) return false;
    try {
      const { data, error } = await db.rpc('admin_verify_access', { p_secret: secret });
      if (error) return false;
      return Boolean(data);
    } catch (_) {
      return false;
    }
  }

  // Busca todos os anúncios (ativos, pausados, pendentes) para moderação
  async function getAllAnuncios(secret) {
    const db = getClient();
    if (!db) return [];

    try {
      if (secret) {
        const { data, error } = await db.rpc('admin_get_all_ads', { p_secret: secret });
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await db
        .from('anuncios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase: Erro ao carregar todos os anúncios:', err.message);
      return [];
    }
  }

  // Atualiza dados ou status de um anúncio (ex: ativo, pausado, destaque)
  async function updateAnuncio(id, updates, secret) {
    const db = getClient();
    if (!db || !id) return false;

    try {
      if (secret) {
        const rpcParams = {
          p_secret: secret,
          p_ad_id: id,
          p_new_status: updates.status || 'ativo',
          p_new_tier: updates.plan_tier || null,
          p_new_price: updates.price_pi != null ? parseFloat(updates.price_pi) : null,
          p_new_expires_at: updates.expires_at || null
        };
        let res = await db.rpc('admin_update_ad_status', rpcParams);
        if (res.error && /admin_update_ad_status|parameter|function/i.test(String(res.error.message || ''))) {
          delete rpcParams.p_new_expires_at;
          res = await db.rpc('admin_update_ad_status', rpcParams);
        }
        if (res.error) throw res.error;
        return res.data !== false;
      }
      const { error } = await db
        .from('anuncios')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase: Erro ao atualizar anúncio:', err.message);
      return false;
    }
  }

  // Exclui permanentemente um anúncio do mural
  async function deleteAnuncio(id, secret) {
    const db = getClient();
    if (!db || !id) return false;

    try {
      if (secret) {
        const { data, error } = await db.rpc('admin_delete_ad', {
          p_secret: secret,
          p_ad_id: id
        });
        if (error) throw error;
        return Boolean(data);
      }
      const { error } = await db
        .from('anuncios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase: Erro ao excluir anúncio:', err.message);
      return false;
    }
  }

  // Busca todos os leads capturados para o painel de contatos
  async function getAllLeads(secret) {
    const db = getClient();
    if (!db) return [];

    try {
      if (secret) {
        const { data, error } = await db.rpc('admin_get_leads', { p_secret: secret });
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await db
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase: Erro ao carregar leads:', err.message);
      return [];
    }
  }

  // Criação de anúncio administrativo com bypass seguro via RPC
  async function createAdminAnuncio(adData, secret) {
    const db = getClient();
    if (!db) return null;

    try {
      if (secret) {
        const fallbackId = (window.crypto && typeof window.crypto.randomUUID === 'function')
          ? window.crypto.randomUUID()
          : ('ad_' + Date.now());
        const { data, error } = await db.rpc('admin_create_ad', {
          p_secret: secret,
          p_id: adData.id || fallbackId,
          p_title: adData.title,
          p_description: adData.description,
          p_link_url: adData.link_url || null,
          p_category: adData.category || 'geral',
          p_tier: adData.plan_tier || 'prata',
          p_price: parseFloat(adData.price_pi) || 1.0,
          p_author: adData.pioneer_username || '@hokage22b'
        });
        if (error) throw error;
        return true;
      }
      return await createAnuncio(adData);
    } catch (err) {
      console.warn('Supabase: Erro ao criar anúncio admin:', err.message);
      return null;
    }
  }

  // Busca doações registradas
  async function getAllDoacoes() {
    const db = getClient();
    if (!db) return [];

    try {
      const { data, error } = await db
        .from('doacoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase: Erro ao carregar doações:', err.message);
      return [];
    }
  }

  // Comprime e redimensiona a imagem no navegador antes do upload
  async function compressImageFile(file, maxWidth, maxHeight, quality) {
    maxWidth = maxWidth || 1000;
    maxHeight = maxHeight || 1000;
    quality = quality || 0.82;

    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function (e) {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var width = img.width;
          var height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('Falha na compressão'));
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Faz o upload autenticado via Edge Function mural-action para o Supabase Storage (Bucket 'mural-images')
  async function uploadAdImage(file, onProgress) {
    if (!file) throw new Error('Nenhum arquivo selecionado');

    if (onProgress) onProgress('Otimizando imagem...');
    var compressedBlob = await compressImageFile(file, 1000, 1000, 0.82);

    var dataUrl = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Falha ao ler imagem otimizada.')); };
      reader.onload = function (ev) { resolve(String(ev && ev.target && ev.target.result || '')); };
      reader.readAsDataURL(compressedBlob);
    });

    if (onProgress) onProgress('Enviando com segurança para o servidor...');
    var res = await callMuralAction('upload_ad_image', { dataUrl: dataUrl });
    var uploadedUrl = res && (res.publicUrl || (res.data && res.data.publicUrl));
    if (!uploadedUrl) {
      throw new Error('Servidor não retornou a URL da imagem.');
    }
    return uploadedUrl;
  }

  // Incrementa contador atômico de cliques do anúncio
  async function incrementAdClick(adId) {
    var db = getClient();
    if (!db || !adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return null;

    try {
      var res = await db.rpc('increment_ad_click', { p_ad_id: adId });
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.warn('Erro ao registrar clique:', err.message);
      return null;
    }
  }

  // Incrementa contador atômico de visualizações do anúncio
  async function incrementAdView(adId) {
    var db = getClient();
    if (!db || !adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return null;

    try {
      var res = await db.rpc('increment_ad_view', { p_ad_id: adId });
      if (res.error) throw res.error;
      return res.data;
    } catch (_) {
      return null;
    }
  }

  // Incrementa visualizações em lote (1 única query para todos os anúncios visíveis)
  async function incrementAdViewsBatch(adIds) {
    var db = getClient();
    if (!db || !Array.isArray(adIds) || adIds.length === 0) return null;
    var validIds = adIds.filter(function (id) {
      return id && typeof id === 'string' && !id.startsWith('testnet_') && !id.startsWith('mock_') && id !== 'preview_card_mock' && id !== 'card-mock-1';
    });
    if (validIds.length === 0) return null;

    try {
      var res = await db.rpc('increment_ad_views_batch', { p_ad_ids: validIds });
      if (!res.error) return res.data;
    } catch (_) { }

    // Fallback caso a RPC batch ainda não tenha sido aplicada no banco
    for (var i = 0; i < validIds.length; i++) {
      incrementAdView(validIds[i]);
    }
    return null;
  }

  // Incrementa contador de visitas ao perfil do anunciante
  async function incrementAdProfileVisit(adId) {
    var db = getClient();
    if (!db || !adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return null;

    try {
      var res = await db.rpc('increment_ad_profile_visit', { p_ad_id: adId });
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.warn('Erro ao registrar visita ao perfil:', err.message);
      return null;
    }
  }

  // Incrementa curtida / apoio comunitário no anúncio
  async function incrementAdLike(adId) {
    var db = getClient();
    if (!db || !adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return null;

    try {
      var res = await db.rpc('increment_ad_like', { p_ad_id: adId });
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.warn('Erro ao registrar like:', err.message);
      return null;
    }
  }

  // Desfaz curtida no anúncio
  async function decrementAdLike(adId) {
    var db = getClient();
    if (!db || !adId || adId.startsWith('testnet_') || adId.startsWith('mock_') || adId === 'preview_card_mock') return null;

    try {
      var res = await db.rpc('decrement_ad_like', { p_ad_id: adId });
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.warn('Erro ao remover like:', err.message);
      return null;
    }
  }

  // --- MOTOR SAAS: GESTÃO DO ANUNCIANTE E VITRINE ---

  // Busca os anúncios publicados pelo próprio pioneiro (autenticado via mural-action; fallback público para visitantes)
  async function getMyAds(username) {
    var db = getClient();
    if (!username) return [];

    var cleanUser = String(username).replace(/@+/g, '').trim().toLowerCase();
    var escapedUser = cleanUser.replace(/[\\%_]/g, '\\$&');
    var list = [];

    // Só chama mural-action get_my_ads se houver sessão Pi autenticada do próprio usuário (não pede login ao visitar terceiros)
    var hasToken = '';
    var loggedHandle = '';
    try {
      if (window.HokagePi && typeof window.HokagePi.getAccessToken === 'function') {
        hasToken = window.HokagePi.getAccessToken() || '';
      }
      if (!hasToken) {
        hasToken = sessionStorage.getItem('hokage_pi_access_token') || '';
      }
      var rawUser = localStorage.getItem('hokage_pi_user') || sessionStorage.getItem('hokage_pi_user') || '';
      if (rawUser) {
        var parsedUser = JSON.parse(rawUser);
        if (parsedUser && parsedUser.username) {
          loggedHandle = String(parsedUser.username).replace(/@+/g, '').trim().toLowerCase();
        }
      }
    } catch (_) { }

    if (hasToken && loggedHandle && loggedHandle === cleanUser) {
      try {
        var edgeRes = await callMuralAction('get_my_ads', {});
        var edgeAds = (edgeRes && (edgeRes.ads || (edgeRes.data && edgeRes.data.ads))) || [];
        if (Array.isArray(edgeAds) && edgeAds.length > 0) {
          list = edgeAds;
        }
      } catch (_) { }
    }

    if (list.length === 0 && db) {
      try {
        var qRes = await db
          .from('anuncios')
          .select('*')
          .ilike('pioneer_username', '@' + escapedUser)
          .eq('status', 'ativo')
          .order('created_at', { ascending: false });
        if (qRes.data && Array.isArray(qRes.data) && qRes.data.length > 0) {
          list = qRes.data;
        }
      } catch (_) { }
    }

    // Se for o @hokage22b e não houver anúncio gravado no Supabase, fornece a mensagem oficial de Boas-Vindas
    if (list.length === 0 && cleanUser === 'hokage22b') {
      list = [{
        id: 'ad_official_hokage22b_welcome',
        title: 'Bem-vindo ao HOKAGE22B: A Economia Real na Pi Network 🌐',
        description: 'Seja muito bem-vindo, pioneiro! Este é o seu espaço descentralizado para criar Passaportes, aceitar Pi no seu negócio, conectar-se com pioneiros verificados e construir a utilidade real da moeda na Pi Network!',
        link_url: 'https://www.youtube.com/@justhokage22b',
        image_url: 'assets/img/ebook-pago-negocios.jpg',
        category: 'geral',
        pioneer_username: '@hokage22b',
        pioneer_name: 'HOKAGE22B',
        plan_tier: 'ouro',
        price_pi: 3.14,
        status: 'ativo',
        views_count: 777,
        clicks_count: 142
      }];
    }

    return list;
  }

  // Atualiza um anúncio pelo próprio anunciante (Edge Function Zero-Trust)
  async function updateMyAd(adId, username, data) {
    if (!adId || !username) return false;
    const payload = {
      ad_id: adId,
      title: data.title || '',
      description: data.description || '',
      link_url: data.link_url || null,
      image_url: data.image_url || null
    };
    if (data.category) payload.category = data.category;
    if (data.location !== undefined) payload.location = data.location;
    if (data.country_code) payload.country_code = data.country_code;
    if (data.payment_modes) payload.payment_modes = data.payment_modes;
    if (data.item_price !== undefined) payload.item_price = data.item_price;
    if (data.item_currency) payload.item_currency = data.item_currency;
    const res = await callMuralAction('update_ad', payload);
    return Boolean(res && res.ok);
  }

  async function setMyAdStatus(adId, status) {
    if (!adId || !status) return false;
    const res = await callMuralAction('set_ad_status', {
      ad_id: adId,
      status: status
    });
    return Boolean(res && res.ok);
  }

  async function deleteMyAd(adId) {
    if (!adId) return false;
    const res = await callMuralAction('delete_my_ad', {
      ad_id: adId
    });
    return Boolean(res && res.ok);
  }

  // Renova anúncio por mais 30 dias com pagamento validado no servidor
  async function renewMyAd(adId, username, paymentIdOrTxid) {
    if (!adId || !username || !paymentIdOrTxid) return false;
    const res = await callMuralAction('renew_ad', {
      ad_id: adId,
      paymentId: paymentIdOrTxid
    });
    return Boolean(res && res.ok);
  }

  // Salva o perfil completo do pioneiro (avatar, links sociais e mini-loja)
  async function savePioneerProfile(username, profileData) {
    var db = getClient();
    if (!db || !username) return null;

    try {
      var clean = String(username).replace(/@+/g, '').trim().toLowerCase();
      var cleanWallet = profileData.wallet_address ? String(profileData.wallet_address).trim() : null;

      // Validação Criptográfica de Blindagem: se informada, deve ser chave ed25519 válida
      if (cleanWallet && !isValidPiPublicKey(cleanWallet)) {
        throw new Error('Chave pública da Pi Wallet inválida (checksum CRC16 não confere)');
      }

      // 1. Gravação exclusiva via Edge Function segura com validação de token na Pi Core Team
      var token = (window.HokagePi && window.HokagePi.getAccessToken) ? window.HokagePi.getAccessToken() : '';
      if (!token) {
        try {
          token = sessionStorage.getItem('hokage_pi_access_token') || '';
        } catch (_) { }
      }
      if (!token) {
        throw new Error('Sessão Pi Network não autenticada. Conecte-se no Pi Browser para salvar seu Passaporte.');
      }

      var pendingRef = (window.HokageReferral && typeof window.HokageReferral.getPendingRef === 'function')
        ? window.HokageReferral.getPendingRef()
        : null;
      var edgeRes = await fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          profileData: profileData,
          refCode: pendingRef
        })
      });
      var edgeJson = await edgeRes.json().catch(function () { return {}; });
      if (!edgeRes.ok || !edgeJson.ok) {
        throw new Error((edgeJson && edgeJson.error) || 'Falha ao salvar perfil no servidor.');
      }
      var savedProf = edgeJson.profile || (edgeJson.data && edgeJson.data.profile) || {};
      if (edgeJson.referral) {
        savedProf._referralResult = edgeJson.referral;
        if (window.HokageReferral && typeof window.HokageReferral.clearPendingRef === 'function') {
          var r = edgeJson.referral;
          if (r.awarded || r.reason === 'already_referred' || r.reason === 'self_referral' || r.reason === 'self_referral_uid') {
            window.HokageReferral.clearPendingRef();
          }
        }
      }
      return savedProf;
    } catch (err) {
      console.warn('Erro ao salvar perfil do pioneiro:', err && err.message ? err.message : err);
      throw err;
    }
  }

  // Busca perfil público do pioneiro via view segura v_passaportes_publicos
  async function getPioneerFullProfile(username) {
    var db = getClient();
    if (!db || !username) return null;

    try {
      var clean = String(username).replace(/@+/g, '').trim().toLowerCase();
      var escaped = clean.replace(/[\\%_]/g, '\\$&');
      var res = await db
        .from('v_passaportes_publicos')
        .select('*')
        .ilike('username', '@' + escaped)
        .order('updated_at', { ascending: false })
        .limit(1);

      var data = (res.data && res.data.length > 0) ? res.data[0] : null;
      if (data) {
        if (data.checklist_state) {
          if (data.checklist_state.showcase_zero !== undefined) {
            data.showcase_zero = data.checklist_state.showcase_zero;
          }
          if (data.checklist_state.showcase_mural !== undefined) {
            data.showcase_mural = data.checklist_state.showcase_mural;
          }
          data.social_links = Array.isArray(data.checklist_state.social_links) ? data.checklist_state.social_links : [];
          if (Array.isArray(data.checklist_state.selected_titles)) {
            data.selected_titles = data.checklist_state.selected_titles;
          }
        } else {
          data.social_links = Array.isArray(data.social_links) ? data.social_links : [];
          data.selected_titles = Array.isArray(data.selected_titles) ? data.selected_titles : [];
          data.checklist_state = {
            showcase_zero: data.showcase_zero,
            showcase_mural: data.showcase_mural,
            social_links: data.social_links,
            selected_titles: data.selected_titles
          };
        }
      }
      return data;
    } catch (err) {
      console.warn('Erro ao obter perfil do pioneiro:', err);
      return null;
    }
  }

  // Busca lista de pioneiros para o Diretório Global Web3 (via view pública sem colunas privadas)
  async function getPioneersDirectory(options) {
    var db = getClient();
    if (!db) return [];
    options = options || {};
    var limit = options.limit || 30;

    try {
      var query = db
        .from('v_passaportes_publicos')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (options.search) {
        var cleanTerm = String(options.search)
          .replace(/@+/g, '')
          .replace(/[,()'"\\*%]+/g, ' ')
          .trim()
          .slice(0, 60);
        if (cleanTerm) {
          query = query.or('username.ilike.%' + cleanTerm + '%,bio.ilike.%' + cleanTerm + '%');
        }
      }

      var res = await query;
      if (res.error) throw res.error;
      var raw = res.data || [];
      var dedupMap = new Map();
      raw.forEach(function (row) {
        if (!row) return;
        var key = String(row.username || '').trim().replace(/^@+/, '').toLowerCase();
        if (!key) return;
        if (!dedupMap.has(key)) dedupMap.set(key, row);
      });
      return Array.from(dedupMap.values());
    } catch (err) {
      console.warn('Erro ao obter diretório de pioneiros:', err);
      return [];
    }
  }

  // --- Sistema de Comentários Comunitários do Mural ---
  async function getAdComments(adId) {
    const db = getClient();
    if (!db || !adId) return [];
    try {
      const res = await db
        .from('anuncio_comentarios')
        .select('id, ad_id, author_username, content, created_at')
        .eq('ad_id', String(adId))
        .order('created_at', { ascending: true })
        .limit(50);
      if (res.error) throw res.error;
      return res.data || [];
    } catch (err) {
      console.warn('Erro ao carregar comentários:', err);
      return [];
    }
  }

  async function getAdCommentCounts(adIds) {
    const db = getClient();
    if (!db || !Array.isArray(adIds) || adIds.length === 0) return {};
    try {
      const res = await db
        .from('anuncio_comentarios')
        .select('ad_id')
        .in('ad_id', adIds.map(String));
      if (res.error) throw res.error;
      const counts = {};
      (res.data || []).forEach(function (row) {
        counts[row.ad_id] = (counts[row.ad_id] || 0) + 1;
      });
      return counts;
    } catch (err) {
      console.warn('Erro ao contar comentários:', err);
      return {};
    }
  }

  async function createAdComment(commentData) {
    const adId = String(commentData.ad_id || '').trim();
    const content = String(commentData.content || '').trim().slice(0, 280);
    if (!adId || content.length < 2) {
      throw new Error('Dados inválidos para comentário.');
    }
    const res = await callMuralAction('create_comment', {
      ad_id: adId,
      content: content
    });
    return res && res.comment ? res.comment : null;
  }

  // --- Sistema de Avaliações & Reputação Verificada (Vitrine) ---
  async function getPioneerReviews(targetUsername) {
    const db = getClient();
    if (!db || !targetUsername) return [];
    const normalized = '@' + String(targetUsername).trim().replace(/^@+/, '').toLowerCase();
    try {
      const res = await db
        .from('pioneer_reviews')
        .select('id, target_username, reviewer_username, rating, comment, created_at')
        .eq('target_username', normalized)
        .order('created_at', { ascending: false })
        .limit(30);
      if (res.error) throw res.error;
      return res.data || [];
    } catch (err) {
      console.warn('Erro ao carregar avaliações do pioneiro:', err);
      return [];
    }
  }

  async function submitPioneerReview(reviewData) {
    const res = await callMuralAction('submit_review', {
      target_username: reviewData && reviewData.target_username,
      rating: reviewData && reviewData.rating,
      comment: reviewData && reviewData.comment
    });
    return res && res.review ? res.review : null;
  }

  async function uploadProfileImage(file) {
    if (!file) throw new Error('Arquivo de imagem inválido.');
    let dataUrl = '';
    if (typeof compressImageFile === 'function') {
      dataUrl = await compressImageFile(file, 640, 0.84);
    } else {
      dataUrl = await new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(new Error('Falha ao ler imagem.')); };
        reader.readAsDataURL(file);
      });
    }
    let token = '';
    try {
      token = (window.HokagePi && window.HokagePi.getAccessToken) ? window.HokagePi.getAccessToken() : '';
      if (!token) token = sessionStorage.getItem('hokage_pi_access_token') || '';
    } catch (_) {}
    if (!token) throw new Error('Conecte-se no Pi Browser para enviar sua foto de perfil.');

    const res = await fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_profile_image',
        accessToken: token,
        dataUrl: dataUrl
      })
    });
    const json = await res.json().catch(function () { return {}; });
    if (!res.ok || !json.ok) {
      throw new Error((json && json.error) || 'Falha ao enviar foto de perfil.');
    }
    const payload = json.data || json;
    return payload.publicUrl || payload.url || null;
  }

  // --- RPCs Administrativos Completos (Migration 023) ---
  async function getAdminDenuncias(secret) {
    const db = getClient();
    if (!db || !secret) return [];
    const { data, error } = await db.rpc('admin_get_denuncias', { p_secret: secret });
    if (error) throw error;
    return data || [];
  }

  async function resolveAdminDenuncia(secret, reportId, action) {
    const db = getClient();
    if (!db || !secret || !reportId) return false;
    const { data, error } = await db.rpc('admin_resolve_denuncia', {
      p_secret: secret,
      p_report_id: reportId,
      p_action: action || 'dismiss'
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function getAdminPioneiros(secret) {
    const db = getClient();
    if (!db || !secret) return [];
    const { data, error } = await db.rpc('admin_get_pioneiros', { p_secret: secret });
    if (error) throw error;
    return data || [];
  }

  async function updateAdminPioneerMerit(secret, uid, isAmbassador, journeyTier, contributionArea) {
    const db = getClient();
    if (!db || !secret || !uid) return false;
    const { data, error } = await db.rpc('admin_update_pioneer_merit', {
      p_secret: secret,
      p_uid: uid,
      p_is_ambassador: Boolean(isAmbassador),
      p_journey_tier: journeyTier || 'pioneiro',
      p_contribution_area: contributionArea || null
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function deleteAdminLead(secret, leadId) {
    const db = getClient();
    if (!db || !secret || !leadId) return false;
    const { data, error } = await db.rpc('admin_delete_lead', {
      p_secret: secret,
      p_lead_id: String(leadId)
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function getAdminEbooks(secret) {
    const db = getClient();
    if (!db || !secret) return [];
    const { data, error } = await db.rpc('admin_get_ebook_entitlements', { p_secret: secret });
    if (error) throw error;
    return data || [];
  }

  async function revokeAdminEbook(secret, entitlementId) {
    const db = getClient();
    if (!db || !secret || !entitlementId) return false;
    const { data, error } = await db.rpc('admin_revoke_ebook_access', {
      p_secret: secret,
      p_entitlement_id: entitlementId
    });
    if (error) throw error;
    return Boolean(data);
  }

  async function getAdminComments(secret) {
    const db = getClient();
    if (!db || !secret) return [];
    const { data, error } = await db.rpc('admin_get_recent_comments', { p_secret: secret });
    if (error) throw error;
    return data || [];
  }

  async function deleteAdminComment(secret, commentId) {
    const db = getClient();
    if (!db || !secret || !commentId) return false;
    const { data, error } = await db.rpc('admin_delete_comment', {
      p_secret: secret,
      p_comment_id: commentId
    });
    if (error) throw error;
    return Boolean(data);
  }

  window.IsarDB = {
    getClient: getClient,
    syncPioneerProfile: syncPioneerProfile,
    saveLead: saveLead,
    getLeaderboard: getLeaderboard,
    getPioneerProfile: getPioneerProfile,
    getAnuncios: getAnuncios,
    createAnuncio: createAnuncio,
    createDenuncia: createDenuncia,
    uploadAdImage: uploadAdImage,
    uploadProfileImage: uploadProfileImage,
    compressImageFile: compressImageFile,
    incrementAdClick: incrementAdClick,
    incrementAdView: incrementAdView,
    incrementAdViewsBatch: incrementAdViewsBatch,
    incrementAdProfileVisit: incrementAdProfileVisit,
    incrementAdLike: incrementAdLike,
    decrementAdLike: decrementAdLike,
    // Métodos SaaS do Anunciante e Vitrine
    isValidPiPublicKey: isValidPiPublicKey,
    getMyAds: getMyAds,
    updateMyAd: updateMyAd,
    setMyAdStatus: setMyAdStatus,
    deleteMyAd: deleteMyAd,
    renewMyAd: renewMyAd,
    getAdComments: getAdComments,
    getAdCommentCounts: getAdCommentCounts,
    createAdComment: createAdComment,
    getPioneerReviews: getPioneerReviews,
    submitPioneerReview: submitPioneerReview,
    getMuralConfig: getMuralConfig,
    savePioneerProfile: savePioneerProfile,
    getPioneerFullProfile: getPioneerFullProfile,
    getPioneersDirectory: getPioneersDirectory,
    getReferralStats: async function (username) {
      var db = getClient();
      if (!db || !username) return null;
      try {
        var { data, error } = await db.rpc('get_pioneer_referral_stats', { p_username: username });
        if (error) return null;
        return data;
      } catch (_) {
        return null;
      }
    },
    redeemReferralAd: async function (adPayload) {
      return await callMuralAction('redeem_referral_ad', adPayload);
    },
    // Métodos Admin com Proteção Zero-Trust
    verifyAdminAccess: verifyAdminAccess,
    getAllAnuncios: getAllAnuncios,
    updateAnuncio: updateAnuncio,
    deleteAnuncio: deleteAnuncio,
    getAllLeads: getAllLeads,
    deleteAdminLead: deleteAdminLead,
    createAdminAnuncio: createAdminAnuncio,
    getAllDoacoes: getAllDoacoes,
    getAdminDenuncias: getAdminDenuncias,
    resolveAdminDenuncia: resolveAdminDenuncia,
    getAdminPioneiros: getAdminPioneiros,
    updateAdminPioneerMerit: updateAdminPioneerMerit,
    getAdminEbooks: getAdminEbooks,
    revokeAdminEbook: revokeAdminEbook,
    getAdminComments: getAdminComments,
    deleteAdminComment: deleteAdminComment,
    isConfigured: function () {
      return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    }
  };

})();

