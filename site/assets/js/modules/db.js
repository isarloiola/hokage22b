// ============================================================
// isar.pi — Module: Database Client (Supabase Integration)
// Sincronização em Nuvem com Segurança RLS (Row Level Security)
// ============================================================

(function () {
  'use strict';

  // Configuração do Supabase (Insira sua URL e Anon Key quando criar o projeto)
  const SUPABASE_URL = window.ISAR_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || '';

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

  window.IsarDB = {
    getClient: getClient,
    syncPioneerProfile: syncPioneerProfile,
    saveLead: saveLead,
    isConfigured: function () {
      return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    }
  };

})();
