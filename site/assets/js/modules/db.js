// ============================================================
// isar.pi — Module: Database Client (Supabase Integration)
// Sincronização em Nuvem com Segurança RLS (Row Level Security)
// ============================================================

(function () {
  'use strict';

  // Configuração do Supabase (Produção Ativa)
  const SUPABASE_URL = window.ISAR_SUPABASE_URL || 'https://yhzoehwkuxteihsnagcj.supabase.co';
  const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloem9laHdrdXh0ZWloc25hZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNzg2OTgsImV4cCI6MjEwODg1NDY5OH0.0ym3I-8oyG3ot_J6ofoVl7pu1m7WyIORLiStQynHG5c';

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
    if (!address || typeof address !== 'string') return false;
    const clean = address.trim();
    if (!/^G[A-Z2-7]{55}$/.test(clean)) return false;
    try {
      const RFC4648 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = 0;
      let value = 0;
      const bytes = [];
      for (let i = 0; i < clean.length; i++) {
        const idx = RFC4648.indexOf(clean[i]);
        if (idx === -1) return false;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
          bytes.push((value >>> (bits - 8)) & 255);
          bits -= 8;
        }
      }
      if (bytes.length !== 35) return false;
      if (bytes[0] !== 48) return false; // 0x30 = ed25519
      let crc = 0x0000;
      for (let i = 0; i < 33; i++) {
        let code = (crc >>> 8) & 0xff;
        code ^= bytes[i] & 0xff;
        code ^= code >>> 4;
        crc = (crc << 8) & 0xffff;
        crc ^= code;
        code = (code << 5) & 0xffff;
        crc ^= code;
        code = (code << 7) & 0xffff;
        crc ^= code;
      }
      const expectedCrc = bytes[33] | (bytes[34] << 8);
      return crc === expectedCrc;
    } catch (_) {
      return false;
    }
  }

  // Sincroniza o perfil do Pioneiro (pontuação, checklist e nível)
  async function syncPioneerProfile(profile) {
    const db = getClient();
    if (!db || !profile || !profile.uid) return null;

    try {
      const payload = {
        uid: profile.uid,
        username: profile.username || 'Pioneiro',
        auth_type: profile.authType || 'pi-sdk',
        reputation_score: profile.score || 50,
        level_name: profile.levelName || 'Pioneiro Iniciante',
        checklist_state: profile.checklist || {},
        updated_at: new Date().toISOString()
      };

      const { data, error } = await db
        .from('pioneiros')
        .upsert(payload, { onConflict: 'uid' });

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase: Erro ao sincronizar pioneiro:', err.message);
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
      return data;
    } catch (err) {
      console.warn('Supabase: Erro ao salvar lead:', err.message);
      return null;
    }
  }

  // Busca o ranking dos melhores pioneiros
  async function getLeaderboard(limit) {
    const db = getClient();
    if (!db) return [];
    limit = limit || 10;

    try {
      const { data, error } = await db
        .from('pioneiros')
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

  // Busca o perfil salvo do pioneiro na nuvem
  async function getPioneerProfile(uid) {
    const db = getClient();
    if (!db || !uid) return null;

    try {
      const { data, error } = await db
        .from('pioneiros')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  // Busca os anúncios ativos no mural
  async function getAnuncios(category) {
    const db = getClient();
    if (!db) return [];

    try {
      let query = db
        .from('anuncios')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });

      if (category && category !== 'todos') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase: Erro ao carregar anúncios:', err.message);
      return [];
    }
  }

  // Cria um novo anúncio no mural
  async function createAnuncio(adData) {
    const db = getClient();
    if (!db) return null;

    try {
      const payload = Object.assign({}, adData, {
        status: 'pendente',
        views_count: 0,
        clicks_count: 0
      });

      const { data, error } = await db
        .from('anuncios')
        .insert([payload]);

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Supabase: Erro ao criar anúncio:', err.message);
      return null;
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
        const { data, error } = await db.rpc('admin_update_ad_status', {
          p_secret: secret,
          p_ad_id: id,
          p_new_status: updates.status || 'ativo',
          p_new_tier: updates.plan_tier || null,
          p_new_price: updates.price_pi ? parseFloat(updates.price_pi) : null
        });
        if (error) throw error;
        return true;
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
        return true;
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
        const { data, error } = await db.rpc('admin_create_ad', {
          p_secret: secret,
          p_id: adData.id,
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

  // Faz o upload direto para o Supabase Storage (Bucket 'mural-images')
  async function uploadAdImage(file, onProgress) {
    var db = getClient();
    if (!db) throw new Error('Serviço de banco de dados indisponível');
    if (!file) throw new Error('Nenhum arquivo selecionado');

    if (onProgress) onProgress('Otimizando imagem...');
    var compressedBlob = await compressImageFile(file, 1000, 1000, 0.82);

    var cleanFileName = 'ad_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.jpg';

    if (onProgress) onProgress('Enviando para o servidor...');
    var res = await db.storage
      .from('mural-images')
      .upload(cleanFileName, compressedBlob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false
      });

    if (res.error) {
      console.warn('Erro no upload da imagem:', res.error);
      throw res.error;
    }

    var urlRes = db.storage
      .from('mural-images')
      .getPublicUrl(cleanFileName);

    return urlRes.data.publicUrl;
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

  // --- MOTOR SAAS: GESTÃO DO ANUNCIANTE E VITRINE ---

  // Busca os anúncios publicados pelo próprio pioneiro
  async function getMyAds(username) {
    var db = getClient();
    if (!username) return [];

    var cleanUser = username.replace('@', '').toLowerCase();
    var list = [];

    if (db) {
      try {
        var res = await db.rpc('pioneer_get_my_ads', { p_username: username });
        if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
          list = res.data;
        }
      } catch (err) {}

      if (list.length === 0) {
        try {
          var qRes = await db
            .from('anuncios')
            .select('*')
            .ilike('pioneer_username', '%' + cleanUser + '%')
            .eq('status', 'ativo')
            .order('created_at', { ascending: false });
          if (qRes.data && Array.isArray(qRes.data) && qRes.data.length > 0) {
            list = qRes.data;
          }
        } catch (_) {}
      }
    }

    // Se for o @hokage22b e não houver anúncio gravado no Supabase, fornece a mensagem oficial de Boas-Vindas
    if (list.length === 0 && cleanUser === 'hokage22b') {
      list = [{
        id: 'ad_official_hokage22b_welcome',
        title: 'Bem-vindo ao HOKAGE22B: A Economia Real na Pi Network 🌐',
        description: 'Seja muito bem-vindo, pioneiro! Este é o seu espaço descentralizado para criar vitrines, aceitar Pi no seu negócio, conectar-se com pioneiros verificados e construir a utilidade real da moeda. Juntos rumo à Open Mainnet!',
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

  // Atualiza um anúncio pelo próprio anunciante
  async function updateMyAd(adId, username, data) {
    var db = getClient();
    if (!db || !adId || !username) return false;

    try {
      var res = await db.rpc('pioneer_update_my_ad', {
        p_ad_id: adId,
        p_username: username,
        p_title: data.title || '',
        p_description: data.description || '',
        p_link_url: data.link_url || null,
        p_image_url: data.image_url || null
      });
      if (res.error) throw res.error;
      return Boolean(res.data);
    } catch (err) {
      console.warn('Erro ao atualizar meu anúncio:', err.message);
      return false;
    }
  }

  // Renova anúncio por mais 30 dias ou turbina plano
  async function renewMyAd(adId, username, txid, upgradeTier) {
    var db = getClient();
    if (!db || !adId || !username) return false;

    try {
      var res = await db.rpc('pioneer_renew_ad', {
        p_ad_id: adId,
        p_username: username,
        p_txid: txid || null,
        p_upgrade_tier: upgradeTier || null
      });
      if (res.error) throw res.error;
      return Boolean(res.data);
    } catch (err) {
      console.warn('Erro ao renovar anúncio:', err.message);
      return false;
    }
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

      // 1. Tenta salvar via Edge Function segura com validação de token na Pi Core Team
      var token = (window.HokagePi && window.HokagePi.getAccessToken) ? window.HokagePi.getAccessToken() : '';
      if (token) {
        try {
          var edgeRes = await fetch('https://yhzoehwkuxteihsnagcj.supabase.co/functions/v1/pi-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token, profileData: profileData })
          });
          if (edgeRes.ok) {
            var edgeJson = await edgeRes.json();
            if (edgeJson && edgeJson.profile) {
              return edgeJson.profile;
            }
          }
        } catch (edgeErr) {
          console.warn('Tentativa via Edge Function retornou erro, tentando fallback:', edgeErr);
        }
      }

      // Descobre o UID real existente para evitar violação de UNIQUE no username
      var targetUid = profileData.uid;
      if (!targetUid) {
        try {
          var existQuery = await db.from('pioneiros')
            .select('uid')
            .ilike('username', '@' + clean)
            .maybeSingle();
          if (existQuery && existQuery.data && existQuery.data.uid) {
            targetUid = existQuery.data.uid;
          }
        } catch (_) {}
      }
      if (!targetUid) targetUid = 'user_' + clean;

      var updatePayload = {
        uid: targetUid,
        username: '@' + clean,
        bio: profileData.bio || null,
        avatar_url: profileData.avatar_url || null,
        wallet_address: cleanWallet,
        whatsapp_url: profileData.whatsapp_url || null,
        youtube_url: profileData.youtube_url || null,
        twitter_url: profileData.twitter_url || null,
        instagram_url: profileData.instagram_url || null,
        checklist_state: {
          showcase_zero: profileData.showcase_zero !== false,
          showcase_mural: profileData.showcase_mural !== false
        },
        products: profileData.products || [],
        updated_at: new Date().toISOString()
      };

      var res = await db.from('pioneiros').upsert(updatePayload, { onConflict: 'uid' });
      if (res.error) {
        // Tenta update direto por username caso exista conflito de chave
        var updateRes = await db.from('pioneiros')
          .update(updatePayload)
          .ilike('username', '@' + clean);

        if (updateRes.error) {
          // Fallback para RPC
          var rpcRes = await db.rpc('pioneer_save_profile', {
            p_username: '@' + clean,
            p_bio: profileData.bio || null,
            p_wallet: profileData.wallet_address || null,
            p_whatsapp: profileData.whatsapp_url || null,
            p_youtube: profileData.youtube_url || null,
            p_twitter: profileData.twitter_url || null,
            p_instagram: profileData.instagram_url || null,
            p_products: profileData.products || [],
            p_avatar: profileData.avatar_url || null
          });
          if (rpcRes.error) throw rpcRes.error;
          return rpcRes.data;
        }
        return updateRes.data || updatePayload;
      }
      return res.data || updatePayload;
    } catch (err) {
      console.warn('Erro ao salvar perfil do pioneiro:', err.message);
      return null;
    }
  }

  // Busca perfil completo do pioneiro
  async function getPioneerFullProfile(username) {
    var db = getClient();
    if (!db || !username) return null;

    try {
      var clean = String(username).replace(/@+/g, '').trim().toLowerCase();
      var res = await db
        .from('pioneiros')
        .select('*')
        .ilike('username', '@' + clean)
        .order('updated_at', { ascending: false })
        .limit(1);

      var data = (res.data && res.data.length > 0) ? res.data[0] : null;
      if (data && data.checklist_state) {
        if (data.checklist_state.showcase_zero !== undefined) {
          data.showcase_zero = data.checklist_state.showcase_zero;
        }
        if (data.checklist_state.showcase_mural !== undefined) {
          data.showcase_mural = data.checklist_state.showcase_mural;
        }
      }
      return data;
    } catch (err) {
      console.warn('Erro ao obter perfil do pioneiro:', err);
      return null;
    }
  }

  // Busca lista de pioneiros para o Diretório Global Web3
  async function getPioneersDirectory(options) {
    var db = getClient();
    if (!db) return [];
    options = options || {};
    var limit = options.limit || 30;

    try {
      var query = db
        .from('pioneiros')
        .select('uid, username, bio, avatar_url, wallet_address, products, whatsapp_url, youtube_url, instagram_url, twitter_url, reputation_score, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (options.search) {
        var cleanTerm = String(options.search).replace(/@+/g, '').trim();
        query = query.or('username.ilike.%' + cleanTerm + '%,bio.ilike.%' + cleanTerm + '%');
      }

      var res = await query;
      if (res.error) throw res.error;
      return res.data || [];
    } catch (err) {
      console.warn('Erro ao obter diretório de pioneiros:', err);
      return [];
    }
  }

  window.IsarDB = {
    getClient: getClient,
    syncPioneerProfile: syncPioneerProfile,
    saveLead: saveLead,
    getLeaderboard: getLeaderboard,
    getPioneerProfile: getPioneerProfile,
    getAnuncios: getAnuncios,
    createAnuncio: createAnuncio,
    uploadAdImage: uploadAdImage,
    compressImageFile: compressImageFile,
    incrementAdClick: incrementAdClick,
    incrementAdView: incrementAdView,
    // Métodos SaaS do Anunciante e Vitrine
    isValidPiPublicKey: isValidPiPublicKey,
    getMyAds: getMyAds,
    updateMyAd: updateMyAd,
    renewMyAd: renewMyAd,
    savePioneerProfile: savePioneerProfile,
    getPioneerFullProfile: getPioneerFullProfile,
    getPioneersDirectory: getPioneersDirectory,
    // Métodos Admin com Proteção Zero-Trust
    verifyAdminAccess: verifyAdminAccess,
    getAllAnuncios: getAllAnuncios,
    updateAnuncio: updateAnuncio,
    deleteAnuncio: deleteAnuncio,
    getAllLeads: getAllLeads,
    createAdminAnuncio: createAdminAnuncio,
    getAllDoacoes: getAllDoacoes,
    isConfigured: function () {
      return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    }
  };

})();

