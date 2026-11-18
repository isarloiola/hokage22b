/**
 * ============================================================
 * HOKAGE22B.COM — Module: Monte Hokage Merit Progression
 * ============================================================
 * Núcleo determinístico (compatível com Node.js e Browser) para
 * calcular patente, selos e missões construtivas até o Monte.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root && typeof root === 'object') {
    root.HokageMonteProgression = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUEST_STORAGE_KEY = 'hokage_monte_quests_v1';

  const RANKS = [
    { level: 1, id: 'pioneiro', title: 'Pioneiro', icon: '🌱', minPercent: 0, color: '#94a3b8', perk: 'Passaporte Web3 e acesso às Ferramentas' },
    { level: 2, id: 'construtor', title: 'Construtor', icon: '🧱', minPercent: 25, color: '#a78bfa', perk: 'Selo Construtor + Destaque no Diretório' },
    { level: 3, id: 'guardiao', title: 'Guardião', icon: '🛡️', minPercent: 60, color: '#34d399', perk: 'Crédito Bronze + Comissão 25% Embaixador' },
    { level: 4, id: 'hokage', title: 'Hokage (O Monte)', icon: '🔥', minPercent: 90, color: '#fb923c', perk: 'Galeria Oficial do Monte + Máxima Confiança' }
  ];

  const MISSIONS = [
    {
      id: 'passport',
      track: 'Identidade',
      title: 'Ativar Passaporte Web3 (/@voce)',
      desc: 'Conecte no Pi Browser ou configure seu perfil público.',
      href: 'pioneiro',
      cta: 'Abrir Passaporte'
    },
    {
      id: 'wallet',
      track: 'Segurança',
      title: 'Validar Chave Pública G... (CRC16)',
      desc: 'Garanta uma carteira verificada sem expor sua passphrase.',
      href: 'ferramentas',
      cta: 'Validar Agora'
    },
    {
      id: 'product',
      track: 'Comércio P2P',
      title: 'Publicar Oferta na Vila ou Produto',
      desc: 'Coloque pelo menos 1 produto, serviço ou anúncio aceitando Pi.',
      href: 'mural',
      cta: 'Ir para A Vila'
    },
    {
      id: 'share',
      track: 'Alcance',
      title: 'Gerar QR Code ou Compartilhar Link',
      desc: 'Divulgue seu link curto oficial com convite embutido.',
      href: 'ferramentas',
      cta: 'Gerar QR Code'
    },
    {
      id: 'referral',
      track: 'Comunidade',
      title: 'Trazer 1 Pioneiro Qualificado',
      desc: 'Cada indicado pelo seu link ganha 1 Anúncio Bronze e soma mérito.',
      href: 'pioneiro',
      cta: 'Ver Convites'
    },
    {
      id: 'builder',
      track: 'Código & API',
      title: 'Explorar API Aberta, Embed ou GitHub',
      desc: 'Integre o Passaporte via SDK/Widget ou contribua com código.',
      href: 'desenvolvedores',
      cta: 'Área Dev'
    }
  ];

  function evaluateProgression(profileData, localFlags) {
    const prof = profileData && typeof profileData === 'object' ? profileData : {};
    const flags = localFlags && typeof localFlags === 'object' ? localFlags : {};

    const hasUsername = Boolean(prof.username && String(prof.username).trim());
    const hasWallet = Boolean(prof.wallet_address && /^G[A-Z2-7]{55}$/.test(String(prof.wallet_address).trim()));
    const hasProducts = Array.isArray(prof.products) && prof.products.length > 0;
    const hasRefs = Number(prof.referral_qualified_count || 0) > 0 || Boolean(prof.is_ambassador);
    const repScore = Number(prof.reputation_score || 0);

    const statusMap = {
      passport: hasUsername || Boolean(flags.passport),
      wallet: hasWallet || Boolean(flags.wallet_checked),
      product: hasProducts || Boolean(flags.mural_posted),
      share: Boolean(flags.shared_or_qr),
      referral: hasRefs || Boolean(flags.referral_shared),
      builder: Boolean(flags.dev_api_used) || Boolean(prof.github_url) || (Array.isArray(prof.social_links) && prof.social_links.some(function (s) { return s && s.network === 'github'; }))
    };

    const evaluatedMissions = MISSIONS.map(function (m) {
      return {
        id: m.id,
        track: m.track,
        title: m.title,
        desc: m.desc,
        href: m.href,
        cta: m.cta,
        done: Boolean(statusMap[m.id])
      };
    });

    const completedCount = evaluatedMissions.filter(function (m) { return m.done; }).length;
    const totalCount = evaluatedMissions.length;
    let scorePercent = Math.round((completedCount / totalCount) * 100);
    if (prof.is_ambassador && repScore >= 70) {
      scorePercent = Math.max(scorePercent, 90);
    }

    let currentRank = RANKS[0];
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (scorePercent >= RANKS[i].minPercent) {
        currentRank = RANKS[i];
        break;
      }
    }
    const nextRank = RANKS.find(function (r) { return r.level === currentRank.level + 1; }) || null;

    const badges = [];
    if (statusMap.passport) badges.push('🪪 Passaporte Ativo');
    if (statusMap.wallet) badges.push('🛡️ Carteira Verificada');
    if (statusMap.product) badges.push('🛍️ Comerciante Pi');
    if (statusMap.builder) badges.push('⚡ Dev Builder');
    if (prof.is_ambassador || statusMap.referral) badges.push('🏅 Embaixador');
    if (currentRank.level === 4) badges.push('🔥 Hokage');

    return {
      scorePercent: scorePercent,
      completedCount: completedCount,
      totalCount: totalCount,
      rank: currentRank,
      nextRank: nextRank,
      badges: badges,
      missions: evaluatedMissions
    };
  }

  function readLocalFlags() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(QUEST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      try {
        if (localStorage.getItem('hokage_pi_user') || localStorage.getItem('isar_pi_user')) {
          parsed.passport = true;
        }
      } catch (_) {}
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function markQuestFlag(flagKey) {
    if (!flagKey || typeof localStorage === 'undefined') return;
    try {
      const current = readLocalFlags();
      current[flagKey] = true;
      current.updated_at = Date.now();
      localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(current));
    } catch (_) {}
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderProgressionPanel(containerId, profileData, options) {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(containerId);
    if (!el) return;

    const opts = options && typeof options === 'object' ? options : {};
    const compact = Boolean(opts.compact);
    const prog = evaluateProgression(profileData, readLocalFlags());

    const badgesHtml = prog.badges.length
      ? prog.badges.map(function (b) {
          return '<span style="font-size:0.72rem;padding:3px 9px;border-radius:999px;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.35);color:#ddd6fe;font-weight:700">' + esc(b) + '</span>';
        }).join('')
      : '<span style="font-size:0.74rem;color:#a1a1aa">Complete sua primeira missão abaixo para desbloquear seu primeiro selo.</span>';

    const missionsHtml = compact ? '' : (
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:16px">' +
      prog.missions.map(function (m) {
        return (
          '<div style="background:rgba(9,9,11,0.75);border:1px solid ' + (m.done ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.09)') + ';border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;gap:10px">' +
            '<div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px">' +
                '<span style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#fbbf24;font-weight:800">' + esc(m.track) + '</span>' +
                '<span style="font-size:0.72rem;font-weight:800;color:' + (m.done ? '#34d399' : '#a1a1aa') + '">' + (m.done ? '✓ Concluída' : '○ Pendente') + '</span>' +
              '</div>' +
              '<div style="font-size:0.88rem;font-weight:800;color:#fff;margin-bottom:3px">' + esc(m.title) + '</div>' +
              '<div style="font-size:0.76rem;color:#a1a1aa;line-height:1.4">' + esc(m.desc) + '</div>' +
            '</div>' +
            '<a href="' + esc(m.href) + '" style="display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;border-radius:8px;font-size:0.76rem;font-weight:700;text-decoration:none;' +
              (m.done
                ? 'background:rgba(16,185,129,0.12);color:#6ee7b7;border:1px solid rgba(16,185,129,0.3)'
                : 'background:rgba(249,115,22,0.14);color:#fb923c;border:1px solid rgba(249,115,22,0.38)') + '">' +
              (m.done ? 'Revisar →' : esc(m.cta) + ' →') +
            '</a>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );

    const nextText = prog.nextRank
      ? ('Próxima patente: ' + prog.nextRank.icon + ' ' + prog.nextRank.title + ' (' + prog.nextRank.minPercent + '%)')
      : 'Patente máxima alcançada: 🔥 Hokage!';

    el.innerHTML =
      '<div style="background:linear-gradient(155deg,rgba(249,115,22,0.09),rgba(20,20,25,0.95));border:1px solid rgba(249,115,22,0.35);border-radius:16px;padding:18px 20px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px">' +
          '<div>' +
            '<div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:#fb923c;font-weight:800">Sua Evolução no Ecossistema</div>' +
            '<div style="font-size:1.12rem;font-weight:900;color:#fff;margin-top:2px">' + esc(prog.rank.icon) + ' Patente Atual: <span style="color:' + prog.rank.color + '">' + esc(prog.rank.title) + '</span></div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:1.15rem;font-weight:900;color:#fbbf24">' + prog.completedCount + '/' + prog.totalCount + ' missões (' + prog.scorePercent + '%)</div>' +
            '<div style="font-size:0.74rem;color:#a1a1aa">' + esc(nextText) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="height:8px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden;margin-bottom:12px">' +
          '<div style="height:100%;width:' + prog.scorePercent + '%;background:linear-gradient(90deg,#8b5cf6,#f97316,#fbbf24);border-radius:999px;transition:width 0.4s ease"></div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + badgesHtml + '</div>' +
        missionsHtml +
      '</div>';
  }

  return {
    RANKS: RANKS,
    MISSIONS: MISSIONS,
    evaluateProgression: evaluateProgression,
    readLocalFlags: readLocalFlags,
    markQuestFlag: markQuestFlag,
    renderProgressionPanel: renderProgressionPanel
  };
});
