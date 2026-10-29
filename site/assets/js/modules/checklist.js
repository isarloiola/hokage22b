// ============================================================
// isar.pi — Module: Checklist Mainnet & KYC
// ============================================================

(function () {
  'use strict';

  const CHECKLIST_KEY = 'isar_pi_checklist_items';

  window.toggleChecklistItem = function (id) {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (_) {}

    const chk = document.getElementById('chk-' + id);
    if (!chk) return;

    state[id] = chk.checked;
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(state));
    } catch (_) {}

    updateChecklistUI();
    if (window.calculateAndUpdateReputation) {
      window.calculateAndUpdateReputation();
    }
  };

  function updateChecklistUI() {
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '{}');
    } catch (_) {}

    const total = 8;
    let completed = 0;

    for (let i = 1; i <= total; i++) {
      const chk = document.getElementById('chk-' + i);
      const item = document.getElementById('item-chk-' + i);
      if (chk) {
        chk.checked = !!state[i];
        if (chk.checked) completed++;
      }
      if (item) {
        item.classList.toggle('checked', !!state[i]);
      }
    }

    const pct = Math.round((completed / total) * 100);
    const bar = document.getElementById('checklist-progress-bar');
    const text = document.getElementById('checklist-progress-text');

    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = pct + '% Concluído (' + completed + ' de ' + total + ')';

    const repChecklist = document.getElementById('rep-checklist-pts');
    if (repChecklist) repChecklist.textContent = '+' + (completed * 10) + ' / 80 pts';
  }

  window.IsarChecklist = {
    updateChecklistUI
  };

})();

