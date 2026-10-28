// ============================================================
// isar.pi — Module: Pioneer Reputation System
// ============================================================

(function () {
  'use strict';

  const CHECKLIST_KEY = 'isar_pi_checklist_items';

  window.recordEbookDownload = function (format) {
    try {
      localStorage.setItem('isar_rep_downloaded', '1');
    } catch (_) {}

    if (window.showToast) {
      window.showToast('Download do ' + format.toUpperCase() + ' iniciado (+20 pts de Reputação)!', '📥');
    }
    window.calculateAndUpdateReputation();
  };

  window.handleReserveEbook2 = function () {
    try {
      localStorage.setItem('isar_rep_ebook2_reserved', '1');
    } catch (_) {}

    const btn = document.getElementById('btn-reserve-ebook2');
    const icon = document.getElementById('btn-reserve-icon');
    const text = document.getElementById('btn-reserve-text');
    if (btn) btn.classList.add('reserved');
    if (icon) icon.textContent = '✓';
    if (text) text.textContent = 'Reserva Confirmada (+30 pts)';

    if (window.showToast) {
      window.showToast('Reserva confirmada! Você receberá o Ebook #2 em primeira mão (+30 pts)!', '🚀');
    }
    window.calculateAndUpdateReputation();
  };

  window.calculateAndUpdateReputation = function () {
    let score = 0;

    // 1. Login Pi (+50 pts)
    const isLogged = !!localStorage.getItem('isar_pi_user');
    if (isLogged) score += 50;

    const taskLogin = document.getElementById('rep-task-login');
    if (taskLogin) taskLogin.classList.toggle('done', isLogged);

    // 2. Download do Manual (+20 pts)
    const hasDownloaded = !!localStorage.getItem('isar_rep_downloaded');
    if (hasDownloaded) score += 20;

    const taskDownload = document.getElementById('rep-task-download');
    if (taskDownload) taskDownload.classList.toggle('done', hasDownloaded);

    // 3. Checklist Mainnet (10 pts por etapa concluída, até +80 pts)
    let checkState = {};
    try {
      checkState = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (_) {}

    let completedChecklist = 0;
    for (let i = 1; i <= 8; i++) {
      if (checkState[i]) completedChecklist++;
    }
    const checkPts = completedChecklist * 10;
    score += checkPts;

    const taskChecklist = document.getElementById('rep-task-checklist');
    if (taskChecklist) taskChecklist.classList.toggle('done', completedChecklist >= 4);

    // 4. Reserva do Ebook #2 (+30 pts)
    const hasReservedEbook2 = !!localStorage.getItem('isar_rep_ebook2_reserved');
    if (hasReservedEbook2) score += 30;

    const taskEbook2 = document.getElementById('rep-task-ebook2');
    if (taskEbook2) taskEbook2.classList.toggle('done', hasReservedEbook2);

    const btnReserve = document.getElementById('btn-reserve-ebook2');
    const iconReserve = document.getElementById('btn-reserve-icon');
    const textReserve = document.getElementById('btn-reserve-text');
    if (btnReserve && hasReservedEbook2) {
      btnReserve.classList.add('reserved');
      if (iconReserve) iconReserve.textContent = '✓';
      if (textReserve) textReserve.textContent = 'Reserva Confirmada (+30 pts)';
    }

    // 5. Cadastro de Lead E-mail (+20 pts bônus)
    const hasLead = !!localStorage.getItem('isar_lead_user');
    if (hasLead) score += 20;

    // Atualizar UI de Reputação
    const scoreEl = document.getElementById('rep-score-val');
    if (scoreEl) scoreEl.textContent = score;

    let levelIcon = '🥉';
    let levelName = 'Pioneiro Iniciante';
    let nextText  = 'Próximo nível: 60 pts';
    let progressPct = Math.min(100, Math.round((score / 60) * 100));

    if (score >= 180) {
      levelIcon = '💎';
      levelName = 'Embaixador isar.pi';
      nextText  = 'Nível Máximo Alcançado!';
      progressPct = 100;
    } else if (score >= 120) {
      levelIcon = '🥇';
      levelName = 'Guardião da Rede';
      nextText  = 'Próximo nível: 180 pts (Embaixador)';
      progressPct = Math.min(100, Math.round(((score - 120) / 60) * 100));
    } else if (score >= 60) {
      levelIcon = '🥈';
      levelName = 'Pioneiro Autenticado';
      nextText  = 'Próximo nível: 120 pts (Guardião)';
      progressPct = Math.min(100, Math.round(((score - 60) / 60) * 100));
    }

    const levelIconEl = document.getElementById('rep-level-icon');
    const levelTextEl = document.getElementById('rep-level-text');
    const nextTextEl  = document.getElementById('rep-next-level-text');
    const progBarEl   = document.getElementById('rep-progress-bar');

    if (levelIconEl) levelIconEl.textContent = levelIcon;
    if (levelTextEl) levelTextEl.textContent = levelName;
    if (nextTextEl)  nextTextEl.textContent = nextText;
    if (progBarEl)   progBarEl.style.width = progressPct + '%';
  };

  window.IsarReputation = {
    calculate: window.calculateAndUpdateReputation
  };

})();
