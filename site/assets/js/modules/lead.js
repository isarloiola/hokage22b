// ============================================================
// isar.pi — Module: Lead Capture & Immediate Unlock
// ============================================================

(function () {
  'use strict';

  function initLeadUnlockForm() {
    const form        = document.getElementById('waitlist-form');
    const unlockedBox = document.getElementById('unlocked-lead-card');
    const nameEl      = document.getElementById('lead-unlocked-name');
    const emailEl     = document.getElementById('lead-unlocked-email');
    if (!form) return;

    // Verificar se o visitante já desbloqueou anteriormente
    try {
      const savedLead = localStorage.getItem('isar_lead_user');
      if (savedLead) {
        const lead = JSON.parse(savedLead);
        if (lead && lead.unlocked) {
          form.style.display = 'none';
          if (unlockedBox) unlockedBox.style.display = 'block';
          if (nameEl) nameEl.textContent = lead.name || 'Pioneiro';
          if (emailEl) emailEl.textContent = lead.email || '';
        }
      }
    } catch (_) {}

    function showError(id, show) {
      const el = document.getElementById(id);
      if (el) el.style.display = show ? 'block' : 'none';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let valid = true;

      const nameInput    = document.getElementById('waitlist-name');
      const emailInput   = document.getElementById('waitlist-email');
      const consentInput = document.getElementById('consent-lgpd');

      // Validate name
      if (!nameInput || nameInput.value.trim().length < 2) {
        showError('name-error', true);
        valid = false;
      } else {
        showError('name-error', false);
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput || !emailRegex.test(emailInput.value.trim())) {
        showError('email-error', true);
        valid = false;
      } else {
        showError('email-error', false);
      }

      // Validate consent
      if (!consentInput || !consentInput.checked) {
        showError('consent-error', true);
        valid = false;
      } else {
        showError('consent-error', false);
      }

      if (!valid) return;

      const leadData = {
        name:      nameInput.value.trim(),
        email:     emailInput.value.trim(),
        unlocked:  true,
        timestamp: new Date().toISOString(),
        source:    'ebook-manual-pi'
      };

      try {
        localStorage.setItem('isar_lead_user', JSON.stringify(leadData));
        const leads = JSON.parse(localStorage.getItem('isar_leads') || '[]');
        leads.push(leadData);
        localStorage.setItem('isar_leads', JSON.stringify(leads));
      } catch (_) {}

      // Trocar formulário pela caixa de download desbloqueado imediatamente
      form.style.display = 'none';
      if (unlockedBox) unlockedBox.style.display = 'block';
      if (nameEl) nameEl.textContent = leadData.name;
      if (emailEl) emailEl.textContent = leadData.email;

      if (window.showToast) {
        window.showToast('Manual liberado com sucesso! Baixe nos botões abaixo.', '🎉');
      }

      if (window.calculateAndUpdateReputation) {
        window.calculateAndUpdateReputation();
      }

      // Scroll suave para a caixa de download
      setTimeout(function () {
        if (unlockedBox) {
          const navH = document.getElementById('navbar') ? document.getElementById('navbar').offsetHeight : 80;
          const top = unlockedBox.getBoundingClientRect().top + window.scrollY - navH - 16;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      }, 200);
    });

    // Resetar erro ao digitar
    ['waitlist-name', 'waitlist-email', 'consent-lgpd'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', function () {
          const errMap = { 'waitlist-name': 'name-error', 'waitlist-email': 'email-error', 'consent-lgpd': 'consent-error' };
          showError(errMap[id], false);
        });
        el.addEventListener('change', function () {
          const errMap = { 'waitlist-name': 'name-error', 'waitlist-email': 'email-error', 'consent-lgpd': 'consent-error' };
          showError(errMap[id], false);
        });
      }
    });
  }

  // Permitir trocar o e-mail cadastrado
  window.resetLeadRegistration = function () {
    try {
      localStorage.removeItem('isar_lead_user');
    } catch (_) {}

    const form = document.getElementById('waitlist-form');
    const unlockedBox = document.getElementById('unlocked-lead-card');
    if (form) form.style.display = 'block';
    if (unlockedBox) unlockedBox.style.display = 'none';

    if (window.showToast) {
      window.showToast('Você pode cadastrar outro e-mail agora.', 'ℹ️');
    }
    if (window.calculateAndUpdateReputation) {
      window.calculateAndUpdateReputation();
    }
  };

  window.IsarLead = {
    initLeadUnlockForm
  };

})();
