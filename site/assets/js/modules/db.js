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

  window.IsarDB = {
    getClient: getClient,
    syncPioneerProfile: syncPioneerProfile,
    saveLead: saveLead,
    getLeaderboard: getLeaderboard,
    getPioneerProfile: getPioneerProfile,
    isConfigured: function () {
      return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
    }
  };

})();

