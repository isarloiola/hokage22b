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
      const { data, error } = await db
        .from('anuncios')
        .insert([adData]);

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

