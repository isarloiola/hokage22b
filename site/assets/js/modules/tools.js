// ============================================================
// isar.pi — Module: Pioneer Tools, Web3 Business & Community
// Calculadora, Rastreador Blockchain, Monetização e Leaderboard
// ============================================================

(function () {
  'use strict';

  // --- 1. Troca de Abas no Dashboard de Membros ---
  function initMemberTabs() {
    const tabBtns = document.querySelectorAll('.member-tab-btn');
    const tabPanes = document.querySelectorAll('.member-tab-pane');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-tab');
        if (!targetId) return;

        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabPanes.forEach(function (p) { p.classList.remove('active'); });

        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        // Se abrir a aba de rankings, atualiza os dados em tempo real
        if (targetId === 'tab-ranking') {
          loadLeaderboard();
        }
      });
    });
  }

  // --- 2. Calculadora de Mineração Pi (Fórmula Oficial SCP) ---
  function initMiningCalculator() {
    const baseRate = 0.0035; // Taxa básica atual aproximada da rede (Pi/h)
    
    const securityCircleEl = document.getElementById('calc-security-circle');
    const lockupPctEl      = document.getElementById('calc-lockup-pct');
    const lockupDurEl      = document.getElementById('calc-lockup-dur');
    const referralsEl      = document.getElementById('calc-referrals');

    const resultHourlyEl  = document.getElementById('calc-result-hourly');
    const resultDailyEl   = document.getElementById('calc-result-daily');
    const resultMonthlyEl = document.getElementById('calc-result-monthly');

    function calculate() {
      if (!securityCircleEl) return;

      const scCount = parseInt(securityCircleEl.value, 10) || 0;
      const scFactor = (scCount / 5); // 0 a 1.0 (100% com 5 pessoas)

      const lockupPct = parseFloat(lockupPctEl.value) || 0.25;
      const lockupDur = parseFloat(lockupDurEl.value) || 1.0;
      // Multiplicador aproximado de bloqueio baseado na fórmula do Whitepaper
      const lockupMultiplier = 1 + (lockupPct * lockupDur * 1.5);

      const referrals = parseInt(referralsEl.value, 10) || 0;
      const refBonus = referrals * 0.25; // 25% de bônus por indicado ativo

      // Taxa estimada
      const hourlyRate = baseRate * (1 + scFactor) * lockupMultiplier * (1 + refBonus);
      const dailyRate = hourlyRate * 24;
      const monthlyRate = dailyRate * 30;

      if (resultHourlyEl) resultHourlyEl.textContent = hourlyRate.toFixed(4) + ' π/h';
      if (resultDailyEl) resultDailyEl.textContent = dailyRate.toFixed(2) + ' π/dia';
      if (resultMonthlyEl) resultMonthlyEl.textContent = monthlyRate.toFixed(1) + ' π/mês';
    }

    [securityCircleEl, lockupPctEl, lockupDurEl, referralsEl].forEach(function (el) {
      if (el) {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
      }
    });

    calculate();
  }

  // --- 3. Carregar Ranking de Reputação (Supabase em Tempo Real) ---
  async function loadLeaderboard() {
    const listEl = document.getElementById('ranking-list-body');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--gray-light)">Carregando ranking da rede... ⏳</div>';

    let pioneers = [];
    if (window.IsarDB && window.IsarDB.getLeaderboard) {
      pioneers = await window.IsarDB.getLeaderboard(10);
    }

    // Se a lista estiver vazia (início do projeto), fornece dados de exemplo com os pioneiros ativos
    if (!pioneers || pioneers.length === 0) {
      pioneers = [
        { username: '@hokage22b', reputation_score: 180, level_name: 'Embaixador isar.pi' },
        { username: '@pioneiro_brasil', reputation_score: 130, level_name: 'Guardião da Rede' },
        { username: '@web3_creator', reputation_score: 90, level_name: 'Pioneiro Autenticado' },
        { username: '@cripto_pioneer', reputation_score: 60, level_name: 'Pioneiro Autenticado' }
      ];
    }

    const medals = ['🥇', '🥈', '🥉'];
    let html = '';

    pioneers.forEach(function (p, index) {
      const pos = medals[index] || (index + 1) + 'º';
      const isTop = index < 3;
      html += `
        <div class="ranking-row ${isTop ? 'ranking-row--top' : ''}">
          <div class="ranking-pos">${pos}</div>
          <div class="ranking-user">
            <span class="ranking-avatar">👤</span>
            <div>
              <div class="ranking-username">${p.username || '@pioneiro'}</div>
              <div class="ranking-level">${p.level_name || 'Pioneiro'}</div>
            </div>
          </div>
          <div class="ranking-score">${p.reputation_score || 0} pts</div>
        </div>
      `;
    });

    listEl.innerHTML = html;
  }

  // --- 4. Modal do Clube Pi PRO ---
  window.openPiProModal = function () {
    const modal = document.getElementById('modal-pi-pro');
    if (modal) modal.classList.add('active');
  };

  window.closePiProModal = function () {
    const modal = document.getElementById('modal-pi-pro');
    if (modal) modal.classList.remove('active');
  };

  window.copyProPaymentDetails = function () {
    const wallet = 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR';
    const memo = '#PI-PRO-ISAR';
    const text = 'Carteira: ' + wallet + '\nMemo: ' + memo;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () {
        if (window.showToast) window.showToast('Carteira e Memo copiados com sucesso! Abra sua Pi Wallet.', '📋');
      });
    }
  };

  window.confirmProSubscription = function () {
    let username = 'Pioneiro PRO';
    try {
      const user = JSON.parse(localStorage.getItem('isar_pi_user') || 'null');
      if (user && user.username) username = user.username;
    } catch (_) {}

    // Grava no Supabase doações se configurado
    if (window.IsarDB && window.IsarDB.getClient) {
      const db = window.IsarDB.getClient();
      if (db) {
        db.from('doacoes').insert([{
          donor_identifier: username,
          currency: 'PI',
          amount: 1.0,
          status: 'confirmacao_solicitada'
        }]).then(function () {});
      }
    }

    if (window.showToast) {
      window.showToast('Assinatura registrada! Abrindo o grupo VIP...', '🎉');
    }
    window.closePiProModal();

    setTimeout(function () {
      window.open('https://chat.whatsapp.com/invite/hokage22b-pro', '_blank');
    }, 600);
  };

  window.IsarTools = {
    init: function () {
      initMemberTabs();
      initMiningCalculator();
    },
    loadLeaderboard: loadLeaderboard
  };

})();

