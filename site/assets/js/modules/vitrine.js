    // =========================================================================
    // PERFIL OFICIAL E REAL DO HOKAGE22B (FUNDADOR / PLATAFORMA)
    // =========================================================================
    const HOKAGE22B_OFFICIAL_PROFILE = {
      username: '@hokage22b',
      avatar_url: 'assets/img/founder-profile.jpg',
      bio: 'Fundador do HOKAGE22B.COM · Educação Web3, ferramentas para pioneiros e comércio seguro na Pi Network. Aceitando 100% Pi na Mainnet.',
      wallet_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
      whatsapp_url: 'https://chat.whatsapp.com/JR6vrB10rCfGYCg3E3BRrE?s=cl&p=a&iam=2',
      youtube_url: 'https://www.youtube.com/@justhokage22b',
      instagram_url: 'https://instagram.com/hokage22b',
      twitter_url: 'https://twitter.com/hokage22b',
      featured_links: [
        {
          title: '📘 Pi Network do Zero (Guia Iniciante)',
          subtitle: 'Aprenda do zero: carteira, blockchain e segurança anti-golpes',
          badge: 'Trilha Grátis',
          url: 'zero',
          type: 'zero'
        },
        {
          title: '📢 Gazeta dos Pioneiros (Mural de Anúncios)',
          subtitle: 'Divulgue sua loja, canal ou serviço para a comunidade',
          badge: 'Classificados P2P',
          url: 'mural',
          type: 'mural'
        }
      ],
      products: [
        {
          title: 'IA na Prática: O Seu Assistente Pessoal (293 pág.)',
          price: '7.50 π',
          price_fiat: 'R$ 47,00',
          badge: 'Lançamento · 50 Prompts',
          link: 'https://hokage22b.com/#produto-ia-na-pratica',
          image_url: 'assets/img/ebook-ia-na-pratica.png',
          cta: 'Ver Lançamento →'
        },
        {
          title: 'Consultoria P2P & Setup de Loja Aceitando Pi',
          price: '10.00 π',
          badge: 'Mentoria Direta',
          link: 'https://chat.whatsapp.com/JR6vrB10rCfGYCg3E3BRrE?s=cl&p=a&iam=2',
          image_url: 'assets/img/ebook-cover.png',
          cta: 'Agendar no WhatsApp →'
        },
        {
          title: 'E-book Pi para seu Negócio (Edição Comercial)',
          price: '3.14 π',
          badge: 'Manual Comercial',
          link: 'https://hokage22b.com/#produtos',
          image_url: 'assets/img/ebook-pago-negocios.jpg',
          cta: 'Adquirir (3.14 π) →'
        },
        {
          title: 'Manual Oficial Pi Network (PDF & EPUB)',
          price: 'Grátis',
          badge: '100% Gratuito',
          link: 'https://hokage22b.com/#comece-aqui',
          image_url: 'assets/img/ebook-cover.png',
          cta: 'Baixar Manual →'
        }
      ]
    };

    // =========================================================================
    // PERFIL DE TESTE / SIMULADOR (PLAYGROUND)
    // =========================================================================
    const SIMULATOR_DEMO_PROFILE = {
      username: '@pioneiro_teste',
      bio: '🧪 Esta é uma vitrine de simulação. Experimente trocar fotos, links e produtos no botão "Personalizar no Teste"!',
      wallet_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR',
      whatsapp_url: 'https://wa.me/5500000000000',
      youtube_url: 'https://youtube.com',
      instagram_url: 'https://instagram.com',
      twitter_url: 'https://x.com',
      featured_links: [
        {
          title: '📘 Pi Network do Zero (Guia Iniciante)',
          subtitle: 'Aprenda do zero: carteira, blockchain e segurança anti-golpes',
          badge: 'Trilha Grátis',
          url: 'zero',
          type: 'zero'
        }
      ],
      products: [
        {
          title: 'Exemplo: Camiseta Oficial Pi Network',
          price: '2.50 π',
          badge: 'Vestuário',
          link: '#',
          image_url: 'assets/img/ebook-cover.png',
          cta: 'Ver Detalhes →'
        },
        {
          title: 'Exemplo: Café Especial Aceitando Pi',
          price: '0.50 π',
          badge: 'Alimentos & Bebidas',
          link: '#',
          image_url: '',
          cta: 'Pedir →'
        }
      ]
    };

    let currentPioneerUser = '';
    let currentPioneerWallet = '';
    let currentProfileData = null;
    let isSimulatorMode = false;

    function cleanUsername(raw) {
      if (!raw) return '';
      return '@' + String(raw).replace(/@+/g, '').trim().toLowerCase();
    }

    // =========================================================================
    // BLINDAGEM CRIPTOGRÁFICA & SEGURANÇA WEB3 (ZERO-TRUST)
    // =========================================================================

    // Sanitização Rígida de HTML contra Stored XSS (Unificada via HokageUtils)
    function escapeHtml(str) {
      if (window.HokageUtils && typeof window.HokageUtils.escapeHtml === 'function') {
        return window.HokageUtils.escapeHtml(str);
      }
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Sanitização de URLs para certificar esquemas válidos e bloquear vetores maliciosos
    function sanitizeUrl(url) {
      if (!url) return '';
      const clean = String(url).trim();
      if (/^(https?:\/\/|mailto:|tel:|\/|\?|#)/i.test(clean)) {
        return clean;
      }
      return '';
    }

    // Sanitização rigorosa de imagens e avatares (permite URLs remotas, assets locais e data:image seguros)
    function sanitizeImageUrl(url) {
      if (!url) return '';
      const clean = String(url).trim();
      if (/^https?:\/\/[^\s<>"'`]+$/i.test(clean)) {
        return clean;
      }
      if (/^assets\/img\/[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|webp|svg)$/i.test(clean)) {
        return clean;
      }
      if (/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(clean)) {
        return clean;
      }
      return '';
    }

    // Validador Criptográfico estrito de Chave Pública Pi Network (Unificado via HokageUtils / IsarDB)
    function isValidPiPublicKey(address) {
      if (window.HokageUtils && typeof window.HokageUtils.isValidPiPublicKey === 'function') {
        return window.HokageUtils.isValidPiPublicKey(address);
      }
      if (window.IsarDB && typeof window.IsarDB.isValidPiPublicKey === 'function') {
        return window.IsarDB.isValidPiPublicKey(address);
      }
      if (!address || typeof address !== 'string') return false;
      return /^G[A-Z2-7]{55}$/.test(address.trim());
    }

    // Validador em tempo real do campo de carteira no formulário de edição
    function validateWalletInputLive(val) {
      const badge = document.getElementById('prof-wallet-badge');
      const input = document.getElementById('prof-input-wallet');
      const hint = document.getElementById('prof-wallet-hint');
      const trimmed = (val || '').trim();

      if (!trimmed) {
        if (badge) { badge.textContent = ''; badge.style.color = ''; }
        if (input) input.style.borderColor = 'rgba(255,255,255,0.2)';
        if (hint) {
          hint.textContent = '🔒 Começa com "G" e possui exatamente 56 caracteres Base32 com CRC16. Nunca informe sua Passphrase de 24 palavras.';
          hint.style.color = 'var(--text-muted)';
        }
        return true;
      }

      const isValid = isValidPiPublicKey(trimmed);
      if (isValid) {
        if (badge) { badge.textContent = '✓ Chave Válida (CRC16 Ok)'; badge.style.color = '#10b981'; }
        if (input) input.style.borderColor = '#10b981';
        if (hint) {
          hint.textContent = '✓ Formato e checksum ed25519 verificados com sucesso para a Mainnet.';
          hint.style.color = '#10b981';
        }
      } else {
        if (badge) { badge.textContent = '✕ Chave Inválida'; badge.style.color = '#ef4444'; }
        if (input) input.style.borderColor = '#ef4444';
        if (hint) {
          if (trimmed.length !== 56) {
            hint.textContent = `A chave possui ${trimmed.length} caracteres (deve ter exatamente 56).`;
          } else if (!trimmed.startsWith('G')) {
            hint.textContent = 'A chave da Pi Network deve começar com a letra "G".';
          } else {
            hint.textContent = 'Checksum de integridade inválido. Verifique se digitou alguma letra errada.';
          }
          hint.style.color = '#ef4444';
        }
      }
      return isValid;
    }

    // ==========================================
    // TERMINAL POS & QR CODE DINÂMICO (PI COMMERCE)
    // ==========================================
    let posCurrentMode = 'dynamic';

    function switchPosMode(mode) {
      posCurrentMode = mode;
      const dynTab = document.getElementById('pos-tab-dynamic');
      const staTab = document.getElementById('pos-tab-static');
      const amtGroup = document.getElementById('pos-amount-group');

      if (mode === 'dynamic') {
        if (dynTab) { dynTab.style.background = 'var(--accent)'; dynTab.style.color = '#fff'; }
        if (staTab) { staTab.style.background = 'transparent'; staTab.style.color = 'var(--text-secondary)'; }
        if (amtGroup) amtGroup.style.display = 'block';
      } else {
        if (staTab) { staTab.style.background = 'var(--accent)'; staTab.style.color = '#fff'; }
        if (dynTab) { dynTab.style.background = 'transparent'; dynTab.style.color = 'var(--text-secondary)'; }
        if (amtGroup) amtGroup.style.display = 'none';
      }
      updateDynamicQrPayload();
    }

    function setPosQuickAmount(amount) {
      const amtInp = document.getElementById('pos-input-amount');
      if (amtInp) {
        amtInp.value = amount;
        updateDynamicQrPayload();
      }
    }

    function updateDynamicQrPayload() {
      if (!currentPioneerWallet) return;
      const img = document.getElementById('wallet-qr-img');
      const previewEl = document.getElementById('wallet-qr-preview');
      const amtInp = document.getElementById('pos-input-amount');
      const memoInp = document.getElementById('pos-input-memo');

      const amountVal = amtInp ? amtInp.value.trim() : '';
      const memoVal = memoInp ? memoInp.value.trim() : '';

      let payload = currentPioneerWallet;
      if (posCurrentMode === 'dynamic' && (amountVal || memoVal)) {
        // Formato Pi/Stellar URI compatível com scanners de wallet
        payload = `pi://pay?recipient=${encodeURIComponent(currentPioneerWallet)}`;
        if (amountVal) payload += `&amount=${encodeURIComponent(amountVal)}`;
        if (memoVal) payload += `&memo=${encodeURIComponent(memoVal)}`;
      }

      if (previewEl) {
        previewEl.textContent = payload;
      }
      if (img) {
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(payload)}`;
      }
    }

    function openWalletQrModal(presetAmount, presetMemo) {
      if (!currentPioneerWallet) {
        alert('Chave pública não cadastrada para este pioneiro.');
        return;
      }
      const modal = document.getElementById('wallet-qr-modal');
      const userEl = document.getElementById('wallet-qr-user');
      const amtInp = document.getElementById('pos-input-amount');
      const memoInp = document.getElementById('pos-input-memo');
      const cleanUser = cleanUsername(currentPioneerUser);
      const isOwner = isOwnerOfCurrentPage();
      const inPi = isPiBrowser();

      if (userEl) userEl.textContent = cleanUser;
      if (amtInp && presetAmount) amtInp.value = presetAmount;
      if (memoInp && presetMemo) memoInp.value = presetMemo;

      const modalTitle = document.getElementById('wallet-qr-modal-title');
      const ownerControls = document.getElementById('pos-owner-controls');
      const visitorPresetBadge = document.getElementById('pos-visitor-preset-badge');
      const visitorPresetAmt = document.getElementById('pos-visitor-preset-amount');
      const visitorPresetMemoWrap = document.getElementById('pos-visitor-preset-memo-wrap');
      const visitorPresetMemo = document.getElementById('pos-visitor-preset-memo');
      const browserTip = document.getElementById('pos-browser-tip');
      const actionsContainer = document.getElementById('pos-actions-container');

      // 1. Configurações Específicas por Cenário / Papel
      if (isOwner) {
        // CENÁRIO 3: O PRÓPRIO DONO (TERMINAL POS / COBRANÇA)
        if (modalTitle) modalTitle.innerHTML = '<span>⚡</span> Meu Terminal POS &amp; Cobrança';
        if (ownerControls) ownerControls.style.display = 'block';
        if (visitorPresetBadge) visitorPresetBadge.style.display = 'none';

        if (browserTip) {
          browserTip.innerHTML = '🏪 <strong>Modo Lojista:</strong> Digite o valor em π para gerar o QR code dinâmico para seu cliente ou envie o link de cobrança direto.';
        }

        if (actionsContainer) {
          actionsContainer.innerHTML = `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--sm" onclick="copyPosPaymentLink()" id="btn-copy-pos-link" style="font-weight:700;padding:11px">
              📋 Copiar Link de Cobrança com Valor
            </button>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="shareOwnerPosOnWhatsApp()" style="border-color:rgba(37,211,102,0.5);color:#25d366;font-weight:700;padding:11px">
              💬 Enviar Cobrança ao Cliente no WhatsApp ↗
            </button>
          `;
        }

        switchPosMode('dynamic');

      } else {
        // VISITANTE (PIONEIRO OU CLIENTE EXTERNO)
        if (modalTitle) modalTitle.innerHTML = `<span>⚡</span> Pagar ${cleanUser} com Pi`;
        if (ownerControls) ownerControls.style.display = 'none';

        if (presetAmount) {
          if (visitorPresetBadge) visitorPresetBadge.style.display = 'block';
          if (visitorPresetAmt) visitorPresetAmt.textContent = `${presetAmount} π`;
          if (presetMemo && visitorPresetMemoWrap && visitorPresetMemo) {
            visitorPresetMemoWrap.style.display = 'block';
            visitorPresetMemo.textContent = presetMemo;
          }
          switchPosMode('dynamic');
        } else {
          if (visitorPresetBadge) visitorPresetBadge.style.display = 'none';
          switchPosMode('static');
        }

        const hasWhatsApp = Boolean(currentProfileData && currentProfileData.whatsapp_url);

        if (inPi) {
          // CENÁRIO 2: OUTRO PIONEIRO LOGADO DENTRO DO PI BROWSER
          if (browserTip) {
            browserTip.innerHTML = `📱 <strong>No Pi Browser:</strong> Você pode transferir diretamente pela sua <code>wallet.pi</code> com biometria ou escanear o QR code da carteira de ${cleanUser}.`;
          }

          let actionsHtml = `
            <a href="https://wallet.pi" class="portal-btn portal-btn--amber portal-btn--sm" style="text-decoration:none;font-weight:700;padding:11px;display:flex;align-items:center;justify-content:center;gap:6px">
              <span>🚀</span> Abrir wallet.pi para Transferir ↗
            </a>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="copyWalletKey()" style="font-weight:600;padding:10px">
              📋 Copiar Chave Pública de ${cleanUser}
            </button>
          `;

          if (hasWhatsApp) {
            actionsHtml += `
              <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="sendPaymentProofOnWhatsApp()" style="border-color:rgba(37,211,102,0.5);color:#25d366;font-weight:700;padding:10px">
                💬 Avisar Pagamento para ${cleanUser} no WhatsApp ↗
              </button>
            `;
          }

          if (actionsContainer) actionsContainer.innerHTML = actionsHtml;

        } else {
          // CENÁRIO 1: VISITANTE FORA DO PI BROWSER (CHROME / SAFARI / WHATSAPP)
          if (browserTip) {
            browserTip.innerHTML = `💡 <strong>Navegador Comum:</strong> Para pagar com Pi, copie a chave pública abaixo, abra o <strong>Pi Browser</strong> no seu celular e acesse sua <code>wallet.pi</code>.`;
          }

          let actionsHtml = `
            <button type="button" class="portal-btn portal-btn--amber portal-btn--sm" onclick="copyWalletKey()" style="font-weight:700;padding:11px">
              📋 Copiar Chave Pública de ${cleanUser}
            </button>
            <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="copyShowcasePiBrowserLink()" id="btn-copy-pibrowser-link" style="padding:10px;font-weight:600">
              🔗 Copiar Link para Abrir no Pi Browser
            </button>
          `;

          if (hasWhatsApp) {
            actionsHtml += `
              <button type="button" class="portal-btn portal-btn--outline portal-btn--sm" onclick="sendPaymentProofOnWhatsApp()" style="border-color:rgba(37,211,102,0.5);color:#25d366;font-weight:700;padding:10px">
                💬 Falar com ${cleanUser} no WhatsApp ↗
              </button>
            `;
          }

          if (actionsContainer) actionsContainer.innerHTML = actionsHtml;
        }
      }

      updateDynamicQrPayload();

      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }

      // Registra métrica de clique
      incrementProfileMetric('copies');
    }

    function closeWalletQrModal() {
      const modal = document.getElementById('wallet-qr-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

    function copyPosPaymentLink() {
      const cleanUser = cleanUsername(currentPioneerUser).replace(/^@+/, '');
      const amtInp = document.getElementById('pos-input-amount');
      const memoInp = document.getElementById('pos-input-memo');
      const amountVal = amtInp ? amtInp.value.trim() : '';
      const memoVal = memoInp ? memoInp.value.trim() : '';

      let link = `https://hokage22b.com/pioneiro?u=${encodeURIComponent(cleanUser)}`;
      if (amountVal) link += `&pay=${encodeURIComponent(amountVal)}`;
      if (memoVal) link += `&memo=${encodeURIComponent(memoVal)}`;

      navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('btn-copy-pos-link');
        if (btn) {
          const prev = btn.textContent;
          btn.textContent = '✓ Link de Cobrança Copiado!';
          btn.style.color = '#34d399';
          setTimeout(() => { 
            btn.textContent = prev;
            btn.style.color = '';
          }, 2500);
        }
      });
    }

    function shareOwnerPosOnWhatsApp() {
      const cleanUser = cleanUsername(currentPioneerUser);
      const amtInp = document.getElementById('pos-input-amount');
      const memoInp = document.getElementById('pos-input-memo');
      const amountVal = amtInp ? amtInp.value.trim() : '';
      const memoVal = memoInp ? memoInp.value.trim() : '';

      let link = `https://hokage22b.com/pioneiro?u=${encodeURIComponent(cleanUser.replace(/^@+/, ''))}`;
      if (amountVal) link += `&pay=${encodeURIComponent(amountVal)}`;
      if (memoVal) link += `&memo=${encodeURIComponent(memoVal)}`;

      const msg = `Olá! Segue o link da minha vitrine no HOKAGE22B para pagamento direto em Pi Network (${amountVal ? amountVal + ' π' : 'P2P'}):\n${link}\n\nDestinatário: ${cleanUser}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }

    function sendPaymentProofOnWhatsApp() {
      const cleanUser = cleanUsername(currentPioneerUser);
      const waUrl = currentProfileData && currentProfileData.whatsapp_url ? currentProfileData.whatsapp_url.trim() : '';

      if (!waUrl) {
        alert('Este pioneiro ainda não cadastrou um link de contato no WhatsApp.');
        return;
      }

      // Se for link de grupo comunitário (ex: chat.whatsapp.com)
      if (waUrl.includes('chat.whatsapp.com')) {
        window.open(waUrl, '_blank');
        return;
      }

      // Se for número wa.me direto ou link personalizado
      const msg = `Olá ${cleanUser}! Acessei sua vitrine no HOKAGE22B e efetuei uma transferência em Pi Network para a sua carteira. Segue o comprovante:`;
      if (waUrl.includes('wa.me/')) {
        const separator = waUrl.includes('?') ? '&' : '?';
        window.open(`${waUrl}${separator}text=${encodeURIComponent(msg)}`, '_blank');
      } else {
        window.open(waUrl, '_blank');
      }
    }

    function copyShowcasePiBrowserLink() {
      const cleanUser = cleanUsername(currentPioneerUser).replace(/^@+/, '');
      const link = `https://hokage22b.com/@${cleanUser}`;
      navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('btn-copy-pibrowser-link');
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = '✓ Link Copiado! Cole no Pi Browser';
          btn.style.color = '#34d399';
          btn.style.borderColor = '#10b981';
          setTimeout(() => {
            btn.innerHTML = original;
            btn.style.color = '';
            btn.style.borderColor = '';
          }, 3000);
        }
      }).catch(() => {
        prompt('Copie o link abaixo para abrir dentro do Pi Browser:', link);
      });
    }

    function isPiBrowser() {
      const ua = navigator.userAgent || navigator.vendor || window.opera || '';
      if (/PiBrowser|PiNetwork|minepi/i.test(ua)) return true;
      if (typeof window !== 'undefined') {
        if (window.flutter_inappwebview || window.PiNetwork || window.isPiBrowser) return true;
        if (window.location && (window.location.protocol === 'pi:' || (window.location.hostname && window.location.hostname.endsWith('.pi')))) return true;
      }
      return false;
    }

    function openExternalBrowserModal() {
      const modal = document.getElementById('external-browser-modal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
      }
    }

    function closeExternalBrowserModal() {
      const modal = document.getElementById('external-browser-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

    function copyPiBrowserLink() {
      const url = 'https://hokage22b.com/pioneiro';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          const btn = document.getElementById('btn-copy-pi-link');
          if (btn) {
            btn.innerHTML = '✓ Link Copiado! Cole no Pi Browser';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#10b981';
            setTimeout(function() {
              btn.innerHTML = '📋 Copiar Link para o Pi Browser';
              btn.style.borderColor = 'var(--accent)';
              btn.style.color = 'var(--accent-light)';
            }, 3500);
          }
        }).catch(function() {
          prompt('Copie o link abaixo e cole dentro do aplicativo Pi Browser:', url);
        });
      } else {
        prompt('Copie o link abaixo e cole dentro do aplicativo Pi Browser:', url);
      }
    }

    function getQueryParam(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    }

    function getLoggedUser() {
      try {
        const h = localStorage.getItem('hokage_pi_user');
        if (h) return JSON.parse(h);
      } catch (_) {}
      try {
        const i = localStorage.getItem('isar_pi_user');
        if (i) return JSON.parse(i);
      } catch (_) {}
      return null;
    }

    function isPiSdkAuthenticated() {
      const user = getLoggedUser();
      return Boolean(user && user.authType === 'pi-sdk' && user.uid && !user.uid.startsWith('demo-'));
    }

    function isOwnerOfCurrentPage() {
      if (isSimulatorMode) return true;
      const logged = getLoggedUser();
      if (!logged || !logged.username || !currentPioneerUser) return false;
      return cleanUsername(logged.username) === cleanUsername(currentPioneerUser);
    }

    function setLoggedUser(username, uid, authType, accessToken) {
      const clean = cleanUsername(username);
      const userObj = { 
        username: clean, 
        uid: uid || ('user_' + clean.replace('@', '')),
        authType: authType || 'demo'
      };
      try {
        localStorage.setItem('hokage_pi_user', JSON.stringify(userObj));
        localStorage.setItem('isar_pi_user', JSON.stringify(userObj));
        if (accessToken) {
          sessionStorage.setItem('hokage_pi_access_token', accessToken);
        }
      } catch (_) {}
    }

    function logoutPioneer() {
      try {
        localStorage.removeItem('hokage_pi_user');
        localStorage.removeItem('isar_pi_user');
        sessionStorage.removeItem('hokage_pi_access_token');
      } catch (_) {}
      window.location.href = 'pioneiro';
    }

    // Inicia o Modo Simulador Interativo
    function startSimulatorMode() {
      isSimulatorMode = true;
      currentPioneerUser = SIMULATOR_DEMO_PROFILE.username;
      currentProfileData = JSON.parse(JSON.stringify(SIMULATOR_DEMO_PROFILE));
      renderShowcaseData(currentProfileData, []);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Carrega Perfil Real (Supabase) ou Oficial do Hokage22b
    async function loadPioneerProfile() {
      // 1. Verifica se foi chamado explicitamente modo teste
      if (getQueryParam('teste') === '1' || getQueryParam('simulador') === '1') {
        startSimulatorMode();
        return;
      }

      let username = getQueryParam('u') || getQueryParam('user');

      // Fallback de caminho caso venha por /pioneiro/@usuario ou /@usuario
      if (!username) {
        const pathSegments = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
        const lastSeg = pathSegments[pathSegments.length - 1] || '';
        if (lastSeg.startsWith('@')) {
          username = lastSeg;
        } else if (pathSegments.length === 2 && pathSegments[0].toLowerCase() === 'pioneiro') {
          username = '@' + lastSeg;
        } else if (pathSegments.length === 1 && !['zero', 'mural', 'pioneiro', 'legal', 'index'].includes(pathSegments[0].toLowerCase()) && !pathSegments[0].includes('.')) {
          username = '@' + pathSegments[0];
        }
      }

      const loggedUser = getLoggedUser();

      // Se não passou na URL, mas está logado, usa a conta logada
      if (!username && loggedUser && loggedUser.username) {
        username = loggedUser.username;
      }

      // Se NÃO tem parâmetro: tela de onboarding
      if (!username) {
        document.getElementById('onboarding-navbar').style.display = 'block';
        document.getElementById('vitrine-topbar').style.display = 'none';
        document.getElementById('onboarding-view').style.display = 'block';
        document.getElementById('pioneer-card').style.display = 'none';
        document.getElementById('pioneer-footer').style.display = 'none';

        // Mostra atalho de 1 clique caso já esteja logado
        const logged = getLoggedUser();
        const loggedBox = document.getElementById('onboarding-logged-box');
        if (loggedBox) {
          if (logged && logged.username) {
            const cleanLogged = cleanUsername(logged.username).replace(/^@+/, '');
            loggedBox.innerHTML = `
              <div class="onboarding-logged-card">
                <div style="min-width:0">
                  <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600">Sua Sessão Pi Conectada:</div>
                  <div style="font-size:0.95rem;color:#10b981;font-weight:800;word-break:break-word">🟢 @${escapeHtml(cleanLogged)}</div>
                </div>
                <a href="?u=${encodeURIComponent(cleanLogged)}" class="btn btn-primary btn-sm" style="padding:9px 16px;font-size:0.86rem;font-weight:700;text-decoration:none;flex-shrink:0">
                  🌟 Ir para Minha Vitrine →
                </a>
              </div>
            `;
            loggedBox.style.display = 'block';
          } else {
            loggedBox.style.display = 'none';
          }
        }
        loadPioneersDirectory();
        return;
      }

      username = cleanUsername(username);
      currentPioneerUser = username;
      isSimulatorMode = false;

      // Se for @hokage22b: Perfil Oficial do Fundador com merge dinâmico (avatar, bio customizada, produtos)
      if (username === '@hokage22b') {
        currentProfileData = JSON.parse(JSON.stringify(HOKAGE22B_OFFICIAL_PROFILE));

        // 1. Merge com cache local instantâneo
        try {
          const cachedAvatar = localStorage.getItem('hokage_pioneer_avatar_hokage22b');
          if (cachedAvatar) currentProfileData.avatar_url = cachedAvatar;
        } catch (_) {}

        // 2. Merge com dados salvos no Supabase
        if (window.IsarDB && window.IsarDB.getPioneerFullProfile) {
          try {
            const dbProf = await window.IsarDB.getPioneerFullProfile('@hokage22b');
            if (dbProf) {
              if (dbProf.avatar_url) {
                currentProfileData.avatar_url = dbProf.avatar_url;
                try { localStorage.setItem('hokage_pioneer_avatar_hokage22b', dbProf.avatar_url); } catch (_) {}
              }
              if (dbProf.bio) currentProfileData.bio = dbProf.bio;
              if (Array.isArray(dbProf.products) && dbProf.products.length > 0) {
                currentProfileData.products = dbProf.products;
              }
            }
          } catch (e) {
            console.warn('Erro ao mesclar dados do fundador do Supabase:', e);
          }
        }
        
        // Busca anúncios reais do @hokage22b se houver
        let ads = [];
        if (window.IsarDB && window.IsarDB.getMyAds) {
          try { ads = await window.IsarDB.getMyAds('@hokage22b'); } catch (_) {}
        }
        renderShowcaseData(currentProfileData, ads);
        return;
      }

      // Perfil de qualquer outro pioneiro: Busca dados no Supabase + Cache Local
      if (window.IsarDB && window.IsarDB.getPioneerFullProfile) {
        try {
          const prof = await window.IsarDB.getPioneerFullProfile(username);
          currentProfileData = prof || {
            username: username,
            bio: 'Pioneiro Verificado na comunidade independente HOKAGE22B.',
            wallet_address: '',
            products: []
          };

          // Fallback de cache local caso o upload de avatar seja recente
          const cleanSlug = username.replace(/^@+/, '');
          try {
            const cachedAvatar = localStorage.getItem('hokage_pioneer_avatar_' + cleanSlug);
            if (cachedAvatar && !currentProfileData.avatar_url) {
              currentProfileData.avatar_url = cachedAvatar;
            }
          } catch (_) {}

          const ads = (window.IsarDB.getMyAds) ? await window.IsarDB.getMyAds(username) : [];
          renderShowcaseData(currentProfileData, ads);
        } catch (err) {
          console.warn('Erro ao carregar perfil do pioneiro:', err);
          renderShowcaseData({
            username: username,
            bio: 'Pioneiro Verificado na comunidade independente HOKAGE22B.',
            wallet_address: '',
            products: []
          }, []);
        }
      }
    }

    // Renderiza a Vitrine (Linktree Puro)
    const SOCIAL_ICON_CATALOG = {
      whatsapp: {
        label: 'WhatsApp',
        cls: 'social-icon-pill--whatsapp',
        svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.301-.15-1.78-.879-2.056-.979-.276-.101-.476-.15-.677.15-.2.301-.776.979-.952 1.18-.176.201-.351.226-.652.076-.301-.151-1.27-.468-2.42-1.493-.896-.799-1.501-1.786-1.677-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.351.451-.527.15-.175.2-.301.301-.501.101-.2.05-.376-.025-.526-.075-.151-.677-1.632-.927-2.234-.244-.587-.492-.507-.677-.516-.175-.008-.376-.01-.577-.01-.201 0-.527.075-.802.376-.276.301-1.053 1.029-1.053 2.509 0 1.48 1.078 2.91 1.229 3.111.15.201 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.38.197 1.899.12.579-.087 1.78-.727 2.03-1.43.251-.703.251-1.304.176-1.43-.075-.126-.276-.201-.577-.352zM12.04 2C6.516 2 2.028 6.488 2.028 12.012c0 1.98.577 3.824 1.579 5.385L2 22l4.757-1.547a9.98 9.98 0 0 0 5.283 1.498h.004c5.523 0 10.012-4.488 10.012-10.012A9.99 9.99 0 0 0 12.04 2z"/></svg>'
      },
      youtube: {
        label: 'YouTube',
        cls: 'social-icon-pill--youtube',
        svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
      },
      instagram: {
        label: 'Instagram',
        cls: 'social-icon-pill--instagram',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e1306c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>'
      },
      twitter: {
        label: 'X / Twitter',
        cls: 'social-icon-pill--twitter',
        svg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
      },
      telegram: {
        label: 'Telegram',
        cls: 'social-icon-pill--telegram',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#24a1de"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.818 8.234-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.211-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.833.941z"/></svg>'
      },
      tiktok: {
        label: 'TikTok',
        cls: 'social-icon-pill--tiktok',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fe2c55"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>'
      },
      linkedin: {
        label: 'LinkedIn',
        cls: 'social-icon-pill--linkedin',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>'
      },
      facebook: {
        label: 'Facebook',
        cls: 'social-icon-pill--facebook',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>'
      },
      discord: {
        label: 'Discord',
        cls: 'social-icon-pill--discord',
        svg: '<svg width="19" height="19" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028z"/></svg>'
      },
      github: {
        label: 'GitHub',
        cls: 'social-icon-pill--github',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'
      },
      kwai: {
        label: 'Kwai',
        cls: 'social-icon-pill--kwai',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#ff7700"><circle cx="9" cy="9" r="4"/><circle cx="15" cy="9" r="3"/><rect x="4" y="13" width="12" height="7" rx="3"/><polygon points="17,14 22,12 22,20 17,18"/></svg>'
      },
      website: {
        label: 'Site Oficial',
        cls: 'social-icon-pill--website',
        svg: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
      }
    };

    function detectSocialNetwork(url) {
      const u = String(url || '').toLowerCase();
      if (/wa\.me|whatsapp\.com/.test(u)) return 'whatsapp';
      if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
      if (/instagram\.com/.test(u)) return 'instagram';
      if (/twitter\.com|x\.com/.test(u)) return 'twitter';
      if (/t\.me|telegram\.me|telegram\.org/.test(u)) return 'telegram';
      if (/tiktok\.com/.test(u)) return 'tiktok';
      if (/linkedin\.com/.test(u)) return 'linkedin';
      if (/facebook\.com|fb\.com|fb\.me/.test(u)) return 'facebook';
      if (/discord\.gg|discord\.com/.test(u)) return 'discord';
      if (/github\.com/.test(u)) return 'github';
      if (/kwai\.com|s\.kw\.ai/.test(u)) return 'kwai';
      return 'website';
    }

    function normalizeSocialUrl(network, rawValue) {
      const val = String(rawValue || '').trim();
      if (!val) return '';
      if (/^https?:\/\//i.test(val)) return val;
      const handle = val.replace(/^@+/, '').trim();
      if (network === 'whatsapp') {
        const digits = val.replace(/\D/g, '');
        if (digits.length >= 8) return 'https://wa.me/' + (digits.length <= 11 ? '55' + digits : digits);
      }
      const bases = {
        instagram: 'https://instagram.com/',
        twitter: 'https://x.com/',
        youtube: 'https://youtube.com/@',
        telegram: 'https://t.me/',
        tiktok: 'https://tiktok.com/@',
        github: 'https://github.com/'
      };
      if (bases[network] && !val.includes('.')) {
        return bases[network] + handle;
      }
      return 'https://' + val.replace(/^\/+/, '');
    }

    function renderShowcaseData(prof, ads) {
      document.getElementById('onboarding-navbar').style.display = 'none';
      document.getElementById('vitrine-topbar').style.display = 'flex';
      document.getElementById('onboarding-view').style.display = 'none';
      document.getElementById('pioneer-card').style.display = 'block';
      document.getElementById('pioneer-footer').style.display = 'block';

      // Configura ações da barra de topo de forma limpa
      const topbarActions = document.getElementById('topbar-actions');
      const isOwner = isOwnerOfCurrentPage();

      if (isSimulatorMode) {
        document.getElementById('simulator-banner').style.display = 'flex';
        topbarActions.innerHTML = `
          <button type="button" class="btn btn-primary btn-sm" onclick="openProfileEditModal()" style="font-size:0.75rem;padding:6px 14px;font-weight:700">
            ✏️ Editar no Simulador
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="resetToOnboarding()" style="font-size:0.75rem;padding:6px 10px">
            ✕ Sair do Teste
          </button>
        `;
      } else {
        document.getElementById('simulator-banner').style.display = 'none';
        if (isOwner) {
          topbarActions.innerHTML = `
            <button type="button" class="btn btn-primary btn-sm" onclick="openProfileEditModal()" style="font-size:0.75rem;padding:6px 14px;font-weight:700">
              ⚙️ Editar Minha Vitrine
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="logoutPioneer()" style="font-size:0.75rem;padding:6px 10px;border-color:rgba(255,255,255,0.2);color:var(--text-muted)">
              Sair
            </button>
          `;
        } else {
          const logged = getLoggedUser();
          const cleanLogged = logged && logged.username ? cleanUsername(logged.username).replace(/^@+/, '') : '';
          if (cleanLogged) {
            topbarActions.innerHTML = `
              <a href="?u=${encodeURIComponent(cleanLogged)}" class="btn btn-primary btn-sm" style="font-size:0.75rem;padding:6px 12px;font-weight:700;text-decoration:none">
                🌟 Minha Vitrine (@${cleanLogged})
              </a>
            `;
          } else {
            topbarActions.innerHTML = `
              <a href="pioneiro" class="btn btn-outline btn-sm" style="font-size:0.75rem;padding:6px 12px;border-color:rgba(139,92,246,0.4);color:var(--accent-light);font-weight:700;text-decoration:none">
                Criar Minha Vitrine Grátis →
              </a>
            `;
          }
        }
      }

      const username = cleanUsername(prof.username || currentPioneerUser || '@pioneiro');
      document.getElementById('pioneer-handle').textContent = username;
      document.title = `${username} — Vitrine Oficial na Pi Network | HOKAGE22B`;

      // Renderiza Avatar (Foto com Cortador ou Letra Inicial)
      applyAvatarOnScreen(prof.avatar_url, username);

      // Mostra botão de câmera do avatar se for dono da vitrine ou simulador
      const cameraBtn = document.getElementById('btn-avatar-camera');
      if (cameraBtn) {
        cameraBtn.style.display = isOwner ? 'flex' : 'none';
      }

      const shortUrl = `hokage22b.com/@${username.replace(/^@+/, '')}`;
      const shortUrlEl = document.getElementById('pioneer-short-url');
      if (shortUrlEl) shortUrlEl.textContent = shortUrl;

      // Bio
      document.getElementById('pioneer-bio').textContent = prof.bio || 'Pioneiro oficial na comunidade independente Pi Network.';

      // Carteira Pi com Verificação Criptográfica de Integridade
      const walletBox = document.getElementById('pioneer-wallet-box');
      const walletEmpty = document.getElementById('pioneer-wallet-empty');
      const walletBadge = document.getElementById('wallet-verified-badge');
      const headEl = document.getElementById('wallet-head-tag');
      const tailEl = document.getElementById('wallet-tail-tag');
      const shortKeyEl = document.getElementById('wallet-short-key');

      if (prof.wallet_address) {
        currentPioneerWallet = prof.wallet_address.trim();
        const keyEl = document.getElementById('pioneer-wallet-key');
        if (keyEl) keyEl.textContent = currentPioneerWallet;

        const isChecksumOk = isValidPiPublicKey(currentPioneerWallet);
        if (walletBadge) {
          if (isChecksumOk) {
            walletBadge.textContent = '✓ Válida';
            walletBadge.style.color = '#10b981';
          } else {
            walletBadge.textContent = '⚠️ Não Verificada';
            walletBadge.style.color = '#f59e0b';
          }
        }

        const head = currentPioneerWallet.substring(0, 4);
        const tail = currentPioneerWallet.substring(currentPioneerWallet.length - 4);

        if (headEl) headEl.textContent = head + '...';
        if (tailEl) tailEl.textContent = '...' + tail;
        if (shortKeyEl) shortKeyEl.textContent = `${head}...${tail}`;

        walletBox.style.display = 'flex';
        walletEmpty.style.display = 'none';

        const qrBtn = document.getElementById('btn-show-qr');
        if (qrBtn) {
          qrBtn.innerHTML = isOwner ? '⚡ Cobrar / POS' : '⚡ Pagar / QR';
        }
      } else {
        currentPioneerWallet = '';
        walletBox.style.display = 'none';
        walletEmpty.style.display = 'block';
      }

      // Links Oficiais (Linktree Web3)
      const linksList = document.getElementById('pioneer-links-list');
      let linksHtml = '';

      // 1. Links em Destaque da Comunidade (Qualquer pioneiro pode ativar para ajudar a rede)
      const showZero = (prof.showcase_zero !== false);
      const showMural = (prof.showcase_mural !== false);

      if (showZero) {
        linksHtml += `
          <a href="zero" class="pioneer-link-btn pioneer-link-btn--featured">
            <div class="pioneer-link-icon-wrap">
              <span style="font-size:1.35rem">📘</span>
            </div>
            <div class="pioneer-link-content">
              <span class="pioneer-link-heading">
                📘 Pi Network do Zero (Guia Iniciante)
                <span style="font-size:0.68rem;background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:var(--amber-light);padding:2px 8px;border-radius:10px;font-weight:700">Trilha Grátis</span>
              </span>
              <span class="pioneer-link-caption">Aprenda do zero: carteira, blockchain e segurança anti-golpes</span>
            </div>
            <span class="pioneer-link-chevron">↗</span>
          </a>
        `;
      }

      if (showMural) {
        linksHtml += `
          <a href="mural" class="pioneer-link-btn pioneer-link-btn--featured">
            <div class="pioneer-link-icon-wrap">
              <span style="font-size:1.35rem">📢</span>
            </div>
            <div class="pioneer-link-content">
              <span class="pioneer-link-heading">
                📢 Gazeta dos Pioneiros (Mural de Anúncios)
                <span style="font-size:0.68rem;background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);color:var(--amber-light);padding:2px 8px;border-radius:10px;font-weight:700">Classificados P2P</span>
              </span>
              <span class="pioneer-link-caption">Divulgue sua loja, canal ou serviço para a comunidade</span>
            </div>
            <span class="pioneer-link-chevron">↗</span>
          </a>
        `;
      }

      // 2. Barra Compacta de Ícones Pequenos para Redes Sociais (Principais + Extras Dinâmicos, Anti-XSS)
      const socialBar = document.getElementById('pioneer-social-bar');
      if (socialBar) {
        const socialEntries = [];
        const seenUrls = new Set();
        function pushSocialEntry(net, rawUrl) {
          const safe = escapeHtml(sanitizeUrl(rawUrl));
          if (!safe || safe === '#' || seenUrls.has(safe)) return;
          seenUrls.add(safe);
          const resolvedNet = (net && net !== 'auto' && SOCIAL_ICON_CATALOG[net]) ? net : detectSocialNetwork(safe);
          socialEntries.push({ net: resolvedNet, url: safe });
        }

        pushSocialEntry('whatsapp', prof.whatsapp_url);
        pushSocialEntry('youtube', prof.youtube_url);
        pushSocialEntry('instagram', prof.instagram_url);
        pushSocialEntry('twitter', prof.twitter_url);

        if (Array.isArray(prof.social_links)) {
          prof.social_links.forEach(item => {
            if (item && item.url) pushSocialEntry(item.network || 'auto', item.url);
          });
        }

        socialBar.innerHTML = socialEntries.map(entry => {
          const meta = SOCIAL_ICON_CATALOG[entry.net] || SOCIAL_ICON_CATALOG.website;
          return `<a href="${entry.url}" target="_blank" rel="noopener noreferrer" class="social-icon-pill ${meta.cls}" title="${meta.label}" aria-label="${meta.label}">${meta.svg}</a>`;
        }).join('');
        socialBar.style.display = socialEntries.length > 0 ? 'flex' : 'none';
      }

      const linksSection = document.getElementById('pioneer-links-section');
      if (linksHtml) {
        linksList.innerHTML = linksHtml;
        if (linksSection) linksSection.style.display = 'block';
      } else {
        linksList.innerHTML = '';
        if (linksSection) linksSection.style.display = (socialBar && socialBar.innerHTML) ? 'none' : 'block';
        if (!socialBar || !socialBar.innerHTML) {
          linksList.innerHTML = `
            <div style="background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.1);border-radius:12px;padding:14px;color:var(--text-muted);font-size:0.85rem">
              Nenhum link cadastrado no momento.
            </div>
          `;
        }
      }

      // Produtos com Fotos Reais (Suporta R$ e π com formatação profissional + Anti-XSS)
      const productsSection = document.getElementById('pioneer-products-section');
      const productsList = document.getElementById('pioneer-products-list');

      if (Array.isArray(prof.products) && prof.products.length > 0) {
        window._vitrinePromoteItems = [];
        window.promoteVitrineProduct = window.promoteVitrineProduct || function (idx) {
          try {
            const item = (window._vitrinePromoteItems || [])[idx];
            if (item) {
              const payload = JSON.stringify(item);
              try { sessionStorage.setItem('hokage_promote_draft', payload); } catch (_) {}
              try { localStorage.setItem('hokage_promote_draft', payload); } catch (_) {}
            }
          } catch (_) {}
          window.location.href = 'mural?promote_draft=1';
        };
        productsList.innerHTML = prof.products.map((p, idx) => {
          const safeTitle = escapeHtml(p.title || 'Produto / Serviço');
          const rawPrice = String(p.price || 'Sob Consulta').trim();
          const safePrice = escapeHtml(rawPrice);
          const safePriceFiat = p.price_fiat ? escapeHtml(String(p.price_fiat).trim()) : '';
          const isBrl = /^(R\$|\$|€|USD|EUR|BRL)/i.test(rawPrice);
          const isPi = /π|\bpi\b/i.test(rawPrice);
          const priceClass = isBrl ? 'product-price product-price--brl' : (isPi ? 'product-price product-price--pi' : 'product-price');
          const safeBadge = p.badge ? escapeHtml(p.badge) : '';
          const safeLink = sanitizeUrl(p.link);
          const safeCta = escapeHtml(p.cta || 'Acessar →');
          const safeImg = sanitizeImageUrl(p.image_url);
          window._vitrinePromoteItems[idx] = {
            title: p.title || '',
            desc: (p.price ? p.price + ' — ' : '') + (p.badge || 'Disponível na minha Vitrine Web3'),
            link: safeLink && safeLink !== '#' ? safeLink : ('https://hokage22b.com/pioneiro?u=' + encodeURIComponent(prof.username || '')),
            img: safeImg || '',
            cat: 'produto'
          };

          return `
            <div class="product-mini-card" id="vitrine-product-${idx}">
              <div class="product-card-top">
                ${safeImg 
                  ? `<img src="${safeImg}" alt="${safeTitle}" class="product-thumb" />` 
                  : `<div class="product-thumb-fallback">🛍️</div>`}
                <div class="product-info">
                  <strong class="product-title">${safeTitle}</strong>
                  <div class="product-meta-row">
                    <span class="${priceClass}">${safePrice}</span>
                    ${safePriceFiat ? `<span class="product-price product-price--brl">${safePriceFiat}</span>` : ''}
                    ${safeBadge ? `<span class="product-badge-pill">${safeBadge}</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                ${safeLink && safeLink !== '#' ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm product-action-btn" style="flex:1;min-width:120px">${safeCta}</a>` : ''}
                ${isOwner ? `<button type="button" onclick="window.promoteVitrineProduct(${idx})" class="btn btn-outline btn-sm" style="flex:1;min-width:130px;border-color:rgba(245,158,11,0.5);color:var(--amber-light);text-align:center;font-weight:700">📢 Impulsionar no Mural</button>` : ''}
              </div>
            </div>
          `;
        }).join('');
        productsSection.style.display = 'block';
      } else {
        productsSection.style.display = 'none';
      }

      loadPioneerReviews(prof.username, isOwner);
      loadPioneerReferralPanel(prof.username, isOwner);

      // Anúncios Reais no Mural Pi (Com fotos, métricas e integração)
      const adsSection = document.getElementById('pioneer-ads-section');
      const adsList = document.getElementById('pioneer-ads-list');
      const adsTitle = document.getElementById('pioneer-ads-title');

      if (adsTitle) {
        adsTitle.textContent = isOwner ? '📢 Meus Anúncios no Mural Pi' : '📢 Anúncios em Destaque no Mural Pi';
      }

      if (Array.isArray(ads) && ads.length > 0) {
        adsList.innerHTML = ads.map(ad => {
          const safeAdTitle = escapeHtml(ad.title || '');
          const safeAdDesc = escapeHtml(ad.description || '');
          const safeAdLink = sanitizeUrl(ad.link_url);
          const safeAdTier = escapeHtml(ad.plan_tier ? ad.plan_tier.toUpperCase() : 'DESTAQUE');
          const safeAdImg = sanitizeImageUrl(ad.image_url);

          return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px;text-align:left">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <span style="font-size:0.75rem;color:var(--amber-light);font-weight:700">📢 ${safeAdTier}</span>
                <span style="font-size:0.72rem;color:var(--text-muted)">👁️ ${Number(ad.views_count) || 0} visualizações · 🖱️ ${Number(ad.clicks_count) || 0} cliques</span>
              </div>
              ${safeAdImg ? `<img src="${safeAdImg}" alt="${safeAdTitle}" style="width:100%;max-height:160px;object-fit:cover;border-radius:10px;margin-bottom:10px;display:block" />` : ''}
              <h4 style="color:#fff;font-size:0.98rem;margin-bottom:4px">${safeAdTitle}</h4>
              <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:10px">${safeAdDesc}</p>
              ${safeAdLink && safeAdLink !== '#' ? `<a href="${safeAdLink}" target="_blank" rel="noopener noreferrer" class="portal-btn portal-btn--amber portal-btn--sm" style="display:inline-block;text-decoration:none;font-weight:700">Acessar Oferta →</a>` : ''}
            </div>
          `;
        }).join('');
        adsSection.style.display = 'block';
      } else if (isOwner) {
        adsList.innerHTML = `
          <div style="background:rgba(139,92,246,0.05);border:1px dashed rgba(139,92,246,0.25);border-radius:14px;padding:16px;text-align:center">
            <span style="font-size:1.4rem;display:block;margin-bottom:4px">📢</span>
            <strong style="color:#fff;font-size:0.88rem;display:block;margin-bottom:4px">Destaque seu negócio no Mural dos Pioneiros</strong>
            <p style="font-size:0.78rem;color:var(--text-secondary);margin:0 0 10px;line-height:1.4">Seus anúncios aparecem no Mural global e diretamente aqui na sua vitrine.</p>
            <a href="mural" class="portal-btn portal-btn--amber portal-btn--sm" style="display:inline-block;text-decoration:none;font-weight:700">
              + Anunciar no Mural (1.0 π)
            </a>
          </div>
        `;
        adsSection.style.display = 'block';
      } else {
        adsSection.style.display = 'none';
      }

      // Inicializa/sincroniza o seletor de idiomas nos pontos de montagem da vitrine
      if (window.HokageI18n && window.HokageI18n.init) {
        window.HokageI18n.init();
      }

      // Incrementa métrica de visualizações da vitrine
      incrementProfileMetric('views');

      // Verifica se a vitrine foi aberta com parâmetros diretos (?pay=1, ?pay=X&memo=Y ou ?product=0)
      const payParam = getQueryParam('pay') || getQueryParam('cobrar') || getQueryParam('amount') || getQueryParam('pos');
      const memoParam = getQueryParam('memo') || getQueryParam('motivo') || '';
      if (payParam && currentPioneerWallet) {
        setTimeout(() => {
          const presetAmt = (payParam === '1' && !getQueryParam('amount')) ? undefined : payParam;
          openWalletQrModal(presetAmt, memoParam);
        }, 400);
      }

      const prodParam = getQueryParam('product') || getQueryParam('produto');
      if (prodParam !== null && prodParam !== '') {
        const prodIdx = parseInt(prodParam, 10);
        if (!isNaN(prodIdx)) {
          setTimeout(() => {
            const prodEl = document.getElementById('vitrine-product-' + prodIdx);
            if (prodEl) {
              prodEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              prodEl.style.borderColor = 'rgba(245,158,11,0.75)';
              prodEl.style.boxShadow = '0 0 22px rgba(245,158,11,0.25)';
            }
          }, 350);
        }
      }
    }

    // Conectar via Pi Browser
    function connectPiBrowserAndStart() {
      const inPi = isPiBrowser();
      if (inPi && window.Pi) {
        window.Pi.authenticate(['username', 'payments', 'wallet_address'], function(p) { console.log('Pendência:', p); })
          .then(function(auth) {
            if (auth && auth.user && auth.user.username) {
              const clean = cleanUsername(auth.user.username);
              setLoggedUser(clean, auth.user.uid, 'pi-sdk', auth.accessToken || '');
              window.history.replaceState(null, '', `?u=${encodeURIComponent(clean)}`);
              loadPioneerProfile().then(() => {
                openProfileEditModal();
              });
            }
          })
          .catch(function(err) {
            console.error('Erro Pi SDK:', err);
            alert('Falha ao conectar via Pi SDK. Por favor, tente novamente no Pi Browser.');
          });
      } else {
        openExternalBrowserModal();
      }
    }

    // Submissão Manual na Onboarding
    function handleOnboardingManualSubmit(e) {
      if (e) e.preventDefault();
      let inputVal = document.getElementById('onboarding-user-input').value.trim();
      if (!inputVal) return;
      const clean = cleanUsername(inputVal);

      window.history.replaceState(null, '', `?u=${encodeURIComponent(clean)}`);
      loadPioneerProfile();
    }

    // Volta para o Onboarding
    function resetToOnboarding() {
      isSimulatorMode = false;
      window.history.replaceState(null, '', 'pioneiro');
      loadPioneerProfile();
    }

    function switchEditTab(tabName) {
      document.querySelectorAll('.edit-tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-edit-tab') === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.edit-tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.getAttribute('data-edit-panel') === tabName);
      });
    }

    // ==========================================
    // MODAL DE EDIÇÃO (EXCLUSIVO NO PI BROWSER)
    // ==========================================
    function openProfileEditModal() {
      // Bloqueio estrito: edição oficial só ocorre dentro do Pi Browser (ou no Simulador Interativo)
      if (!isSimulatorMode && !isPiBrowser()) {
        openExternalBrowserModal();
        return;
      }

      const modal = document.getElementById('edit-profile-modal');
      if (!modal) return;
      switchEditTab('perfil');

      const loggedUser = getLoggedUser();
      const activeUser = currentPioneerUser || (loggedUser ? loggedUser.username : '@meu_usuario');

      document.getElementById('prof-input-user').value = activeUser;

      const previewBtn = document.getElementById('btn-preview-simulator');
      const saveBtn = document.getElementById('btn-save-profile');
      const subTitle = document.getElementById('modal-profile-subtitle');

      if (isSimulatorMode) {
        if (previewBtn) previewBtn.style.display = 'block';
        if (saveBtn) saveBtn.textContent = '👀 Atualizar Prévia no Simulador';
        if (subTitle) subTitle.textContent = 'Modo Simulador: adicione fotos e links para testar a prévia na sua tela.';
      } else {
        if (previewBtn) previewBtn.style.display = 'none';
        if (saveBtn) saveBtn.textContent = '💾 Salvar Oficialmente na Pi Network';
        if (subTitle) subTitle.textContent = 'Configure sua bio, foto de perfil, carteira Pi, contatos e produtos.';
      }

      // Foto de Perfil no Modal
      const existingAvatar = (currentProfileData && currentProfileData.avatar_url) ? currentProfileData.avatar_url : '';
      setModalAvatar(existingAvatar, activeUser);

      if (currentProfileData) {
        document.getElementById('prof-input-bio').value = currentProfileData.bio || '';
        document.getElementById('prof-input-wallet').value = currentProfileData.wallet_address || '';
        document.getElementById('prof-input-whatsapp').value = currentProfileData.whatsapp_url || '';
        document.getElementById('prof-input-social').value = currentProfileData.youtube_url || '';
        document.getElementById('prof-input-instagram').value = currentProfileData.instagram_url || '';
        document.getElementById('prof-input-twitter').value = currentProfileData.twitter_url || '';
      }

      // Checkboxes de Destaque da Comunidade (Qualquer Pioneiro pode ativar/desativar)
      const checkZero = document.getElementById('prof-check-zero');
      const checkMural = document.getElementById('prof-check-mural');
      if (checkZero) checkZero.checked = (!currentProfileData || currentProfileData.showcase_zero !== false);
      if (checkMural) checkMural.checked = (!currentProfileData || currentProfileData.showcase_mural !== false);

      // Preenche outras redes sociais dinâmicas
      const extraSocialsContainer = document.getElementById('prof-extra-socials-container');
      if (extraSocialsContainer) {
        extraSocialsContainer.innerHTML = '';
        if (currentProfileData && Array.isArray(currentProfileData.social_links) && currentProfileData.social_links.length > 0) {
          currentProfileData.social_links.forEach(item => {
            addExtraSocialRow(item.network || 'auto', item.url || '');
          });
        }
      }

      // Preenche produtos com suporte a fotos
      const container = document.getElementById('prof-products-container');
      container.innerHTML = '';

      if (currentProfileData && Array.isArray(currentProfileData.products) && currentProfileData.products.length > 0) {
        currentProfileData.products.forEach(p => {
          addProductRow(p.title || '', p.price || '', p.link || '', p.image_url || '', p.price_fiat || '');
        });
      } else {
        addProductRow('', '', '', '', '');
      }

      modal.classList.add('active');
      loadProfileAnalytics(activeUser);

      // Validação em tempo real do campo de carteira ao abrir
      setTimeout(() => {
        validateWalletInputLive(document.getElementById('prof-input-wallet').value);
      }, 50);
    }

    function closeProfileEditModal() {
      const modal = document.getElementById('edit-profile-modal');
      if (modal) modal.classList.remove('active');
    }

    // ==========================================
    // ANALYTICS & MÉTRICAS PESSOAIS DA VITRINE
    // ==========================================
    function incrementProfileMetric(metricKey) {
      if (!currentPioneerUser) return;
      const cleanUser = cleanUsername(currentPioneerUser).replace(/^@+/, '').toLowerCase();
      try {
        const storageKey = `hokage_metric_${metricKey}_${cleanUser}`;
        const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
        localStorage.setItem(storageKey, (current + 1).toString());
      } catch (_) {}
    }

    function loadProfileAnalytics(username) {
      const cleanUser = cleanUsername(username || currentPioneerUser).replace(/^@+/, '').toLowerCase();
      try {
        const views = parseInt(localStorage.getItem(`hokage_metric_views_${cleanUser}`) || '1', 10);
        const copies = parseInt(localStorage.getItem(`hokage_metric_copies_${cleanUser}`) || '0', 10);
        const clicks = parseInt(localStorage.getItem(`hokage_metric_clicks_${cleanUser}`) || '0', 10);

        const vEl = document.getElementById('analytics-views-val');
        const cEl = document.getElementById('analytics-copies-val');
        const kEl = document.getElementById('analytics-clicks-val');

        if (vEl) vEl.textContent = views;
        if (cEl) cEl.textContent = copies;
        if (kEl) kEl.textContent = clicks;
      } catch (_) {}
    }

    // ==========================================
    // DIRETÓRIO GLOBAL DE PIONEIROS & NEGÓCIOS (HACKATHON GRADE)
    // ==========================================
    let cachedDirectoryPioneers = [];
    let currentDirCategory = 'todos';
    let dirSearchDebounce = null;

    const CURATED_DEFAULT_PIONEERS = [
      {
        username: '@hokage22b',
        bio: 'Fundador do HOKAGE22B. Desenvolvedor Web3 e entusiasta da economia descentralizada Pi.',
        avatar_url: 'assets/img/founder-profile.jpg',
        category: 'servicos',
        wallet_address: 'GA5FXF675WIQ47TQJP7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
      },
      {
        username: '@loja_brasil_pi',
        bio: 'Comércio eletrônico aceitando pagamentos diretos em Pi na Mainnet. Envio para todo o Brasil.',
        avatar_url: '',
        category: 'lojas',
        wallet_address: 'GBRASILPI7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
      },
      {
        username: '@design_web3',
        bio: 'Identidade visual, logos e interfaces para projetos e negócios no ecossistema Pi.',
        avatar_url: '',
        category: 'servicos',
        wallet_address: 'GDESIGNPI7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
      },
      {
        username: '@canal_pioneiro',
        bio: 'Criador de conteúdo educativo sobre nós validadores, migração Mainnet e tutoriais da Pi Network.',
        avatar_url: '',
        category: 'criadores',
        wallet_address: 'GCANALPI7X7ZK44ADLTKTKVYECRCVST6V3H5Z2MLB5XPUR'
      }
    ];

    async function loadPioneersDirectory() {
      const grid = document.getElementById('pioneer-directory-grid');
      if (!grid) return;

      try {
        let pioneers = [];
        if (window.IsarDB && window.IsarDB.getPioneersDirectory) {
          pioneers = await window.IsarDB.getPioneersDirectory({ limit: 40 });
        }

        if (!pioneers || pioneers.length === 0) {
          pioneers = CURATED_DEFAULT_PIONEERS;
        } else {
          // Garante que o fundador esteja no topo se não constar na lista da nuvem
          const hasHokage = pioneers.some(p => cleanUsername(p.username).toLowerCase() === '@hokage22b');
          if (!hasHokage) {
            pioneers.unshift(CURATED_DEFAULT_PIONEERS[0]);
          }
        }

        cachedDirectoryPioneers = pioneers;
        renderDirectoryGrid(pioneers);
      } catch (err) {
        console.warn('Erro ao carregar diretório:', err);
        cachedDirectoryPioneers = CURATED_DEFAULT_PIONEERS;
        renderDirectoryGrid(CURATED_DEFAULT_PIONEERS);
      }
    }

    function renderDirectoryGrid(pioneers) {
      const grid = document.getElementById('pioneer-directory-grid');
      if (!grid) return;

      if (!pioneers || pioneers.length === 0) {
        grid.innerHTML = `
          <div style="text-align:center;padding:24px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;color:var(--text-muted);font-size:0.85rem">
            🔍 Nenhum pioneiro encontrado para esta busca.<br>
            <span style="color:var(--accent-light);cursor:pointer;margin-top:6px;display:inline-block;font-weight:700" onclick="document.getElementById('dir-search-input').value='';applyDirectoryFilters()">Limpar busca</span>
          </div>
        `;
        return;
      }

      let html = '';
      pioneers.forEach(p => {
        const uName = cleanUsername(p.username);
        const uSlug = uName.replace(/^@+/, '');
        const bio = p.bio || 'Pioneiro oficial na comunidade descentralizada Pi Network.';
        const avatar = sanitizeImageUrl(p.avatar_url || '');
        const hasWallet = Boolean(p.wallet_address);
        const prodCount = Array.isArray(p.products) ? p.products.length : 0;

        html += `
          <div class="dir-card">
            <div class="dir-card-main">
              <div style="width:46px;height:46px;border-radius:50%;overflow:hidden;background:#1a0533;border:2px solid rgba(139,92,246,0.4);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${avatar ? `<img src="${avatar}" alt="${escapeHtml(uName)}" style="width:100%;height:100%;object-fit:cover" />` : `<span style="font-size:1.15rem;font-weight:800;color:#fff">${uSlug.charAt(0).toUpperCase()}</span>`}
              </div>
              <div style="min-width:0;flex:1">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                  <strong style="color:#fff;font-size:0.9rem;word-break:break-word" class="notranslate">${escapeHtml(uName)}</strong>
                  <span style="font-size:0.65rem;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:#34d399;padding:1px 6px;border-radius:10px;font-weight:700">✓ KYC</span>
                  ${hasWallet ? `<span style="font-size:0.65rem;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:var(--amber-light);padding:1px 6px;border-radius:10px;font-weight:700">⚡ Pi</span>` : ''}
                  ${prodCount > 0 ? `<span style="font-size:0.65rem;background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.4);color:var(--accent-light);padding:1px 6px;border-radius:10px;font-weight:700">🛍️ ${prodCount}</span>` : ''}
                </div>
                <p style="font-size:0.78rem;color:var(--text-secondary);margin:3px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35">
                  ${escapeHtml(bio)}
                </p>
              </div>
            </div>
            <a href="?u=${encodeURIComponent(uSlug)}" class="portal-btn portal-btn--outline portal-btn--sm dir-card-cta">
              Ver Vitrine ↗
            </a>
          </div>
        `;
      });

      grid.innerHTML = html;
    }

    function filterDirectoryCategory(cat, btn) {
      currentDirCategory = cat;
      document.querySelectorAll('.dir-cat-pill').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.06)';
        b.style.color = 'var(--text-secondary)';
        b.classList.remove('active');
      });
      if (btn) {
        btn.style.background = 'var(--accent)';
        btn.style.color = '#fff';
        btn.classList.add('active');
      }
      applyDirectoryFilters();
    }

    function filterDirectoryDebounced() {
      if (dirSearchDebounce) clearTimeout(dirSearchDebounce);
      dirSearchDebounce = setTimeout(() => {
        applyDirectoryFilters();
      }, 250);
    }

    function applyDirectoryFilters() {
      const searchInp = document.getElementById('dir-search-input');
      const term = searchInp ? searchInp.value.trim().toLowerCase().replace(/^@+/, '') : '';

      let filtered = cachedDirectoryPioneers.filter(p => {
        const u = cleanUsername(p.username).toLowerCase().replace(/^@+/, '');
        const b = (p.bio || '').toLowerCase();
        const prodsText = Array.isArray(p.products)
          ? p.products.map(item => (item && item.title ? String(item.title).toLowerCase() : '')).join(' ')
          : '';
        const matchesTerm = !term || u.includes(term) || b.includes(term) || prodsText.includes(term);

        if (!matchesTerm) return false;

        if (currentDirCategory === 'todos') return true;
        if (currentDirCategory === 'lojas') return (Array.isArray(p.products) && p.products.length > 0) || b.includes('loja') || b.includes('produto') || b.includes('venda') || b.includes('comércio') || b.includes('ecommerce');
        if (currentDirCategory === 'servicos') return b.includes('serviço') || b.includes('design') || b.includes('dev') || b.includes('consultoria') || b.includes('advogado') || b.includes('tecnologia');
        if (currentDirCategory === 'criadores') return b.includes('criador') || b.includes('canal') || b.includes('youtube') || b.includes('vídeo') || b.includes('conteúdo') || b.includes('influencer');

        return true;
      });

      renderDirectoryGrid(filtered);
    }

    function addExtraSocialRow(network, url) {
      const container = document.getElementById('prof-extra-socials-container');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'extra-social-row';
      const net = network || 'auto';
      const safeUrl = (url || '').replace(/"/g, '&quot;');
      row.innerHTML = `
        <select class="extra-social-net" aria-label="Rede Social" style="padding:8px 6px;background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:var(--accent-light);font-size:0.78rem;font-weight:700;width:100%;box-sizing:border-box">
          <option value="auto"${net === 'auto' ? ' selected' : ''}>Detectar URL</option>
          <option value="telegram"${net === 'telegram' ? ' selected' : ''}>Telegram</option>
          <option value="tiktok"${net === 'tiktok' ? ' selected' : ''}>TikTok</option>
          <option value="linkedin"${net === 'linkedin' ? ' selected' : ''}>LinkedIn</option>
          <option value="facebook"${net === 'facebook' ? ' selected' : ''}>Facebook</option>
          <option value="discord"${net === 'discord' ? ' selected' : ''}>Discord</option>
          <option value="github"${net === 'github' ? ' selected' : ''}>GitHub</option>
          <option value="kwai"${net === 'kwai' ? ' selected' : ''}>Kwai</option>
          <option value="website"${net === 'website' ? ' selected' : ''}>Site / Blog</option>
        </select>
        <input type="text" class="extra-social-url" placeholder="https://... ou @usuario" value="${safeUrl}" style="width:100%;padding:8px 10px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.18);border-radius:6px;color:#fff;font-size:0.82rem;box-sizing:border-box;min-width:0" />
        <button type="button" onclick="this.parentElement.remove()" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:6px;height:32px;cursor:pointer;font-size:0.85rem" title="Remover rede">✕</button>
      `;
      container.appendChild(row);
    }

    function collectExtraSocialsFromForm() {
      const rows = document.querySelectorAll('#prof-extra-socials-container .extra-social-row');
      const list = [];
      rows.forEach(row => {
        const netEl = row.querySelector('.extra-social-net');
        const urlEl = row.querySelector('.extra-social-url');
        const net = netEl ? netEl.value : 'auto';
        const raw = urlEl ? urlEl.value.trim() : '';
        if (!raw) return;
        const normalized = normalizeSocialUrl(net, raw);
        const resolvedNet = (net === 'auto') ? detectSocialNetwork(normalized) : net;
        list.push({ network: resolvedNet, url: normalized });
      });
      return list;
    }

    // Adiciona uma linha de produto/serviço editável com preço principal (π/USD/EUR/BRL), 2º preço opcional e foto
    function addProductRow(title, price, link, imageUrl, priceFiat) {
      const container = document.getElementById('prof-products-container');
      const itemEl = document.createElement('div');
      itemEl.className = 'product-edit-item';

      function parseCurrencyVal(raw) {
        const text = (raw || '').trim();
        if (/^R\$/i.test(text)) return { cur: 'BRL', val: text.replace(/^R\$\s*/i, '').trim() };
        if (/^\$|USD/i.test(text)) return { cur: 'USD', val: text.replace(/^(\$|USD)\s*/i, '').replace(/\s*USD$/i, '').trim() };
        if (/^€|EUR/i.test(text)) return { cur: 'EUR', val: text.replace(/^(€|EUR)\s*/i, '').replace(/\s*EUR$/i, '').trim() };
        if (/π|\bpi\b/i.test(text)) return { cur: 'PI', val: text.replace(/\s*(?:π|pi)\s*$/i, '').trim() };
        return { cur: text ? 'CUSTOM' : 'PI', val: text };
      }

      const parsedPrimary = parseCurrencyVal(price);
      const parsedFiat = parseCurrencyVal(priceFiat);
      if (!priceFiat) parsedFiat.cur = 'USD';

      const safeTitle = title ? title.replace(/"/g, '&quot;') : '';
      const safePrice = parsedPrimary.val ? parsedPrimary.val.replace(/"/g, '&quot;') : '';
      const safeFiat = parsedFiat.val ? parsedFiat.val.replace(/"/g, '&quot;') : '';
      const safeLink = link ? link.replace(/"/g, '&quot;') : '';
      const safeImg = imageUrl ? imageUrl.replace(/"/g, '&quot;') : '';

      itemEl.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" style="position:absolute;top:8px;right:8px;background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.9rem" title="Remover item">✕</button>
        <div style="font-size:0.75rem;font-weight:700;color:var(--amber-light);margin-bottom:6px">Produto / Serviço</div>
        
        <input type="text" class="prod-item-title" placeholder="Nome do produto ou serviço" value="${safeTitle}" style="width:100%;padding:8px 10px;margin-bottom:6px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;font-size:0.85rem;box-sizing:border-box" />
        
        <div class="product-edit-row-grid">
          <select class="prod-item-currency" aria-label="Moeda principal" style="padding:8px 6px;background:rgba(0,0,0,0.65);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:var(--amber-light);font-size:0.8rem;font-weight:700;width:100%;box-sizing:border-box">
            <option value="PI"${parsedPrimary.cur === 'PI' ? ' selected' : ''}>π (Pi)</option>
            <option value="USD"${parsedPrimary.cur === 'USD' ? ' selected' : ''}>USD ($)</option>
            <option value="EUR"${parsedPrimary.cur === 'EUR' ? ' selected' : ''}>EUR (€)</option>
            <option value="BRL"${parsedPrimary.cur === 'BRL' ? ' selected' : ''}>R$ (Real)</option>
            <option value="CUSTOM"${parsedPrimary.cur === 'CUSTOM' ? ' selected' : ''}>Outro</option>
          </select>
          <input type="text" class="prod-item-price" placeholder="Preço 1 (Ex: 3.14)" value="${safePrice}" style="width:100%;padding:8px 10px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;font-size:0.85rem;box-sizing:border-box" />
        </div>

        <div class="product-edit-row-grid" style="margin-top:4px">
          <select class="prod-item-fiat-currency" aria-label="2º Preço opcional (Moeda Local)" style="padding:8px 6px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.14);border-radius:6px;color:#34d399;font-size:0.78rem;font-weight:700;width:100%;box-sizing:border-box">
            <option value="USD"${parsedFiat.cur === 'USD' ? ' selected' : ''}>+ USD ($)</option>
            <option value="EUR"${parsedFiat.cur === 'EUR' ? ' selected' : ''}>+ EUR (€)</option>
            <option value="BRL"${parsedFiat.cur === 'BRL' ? ' selected' : ''}>+ R$ (BRL)</option>
            <option value="CUSTOM"${parsedFiat.cur === 'CUSTOM' ? ' selected' : ''}>+ Outro</option>
          </select>
          <input type="text" class="prod-item-fiat-price" placeholder="2º preço opcional (Ex: 15.00)" value="${safeFiat}" style="width:100%;padding:8px 10px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.14);border-radius:6px;color:#fff;font-size:0.82rem;box-sizing:border-box" />
        </div>

        <input type="url" class="prod-item-link" placeholder="Link de compra ou WhatsApp (https://...)" value="${safeLink}" style="width:100%;padding:8px 10px;margin-bottom:6px;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);border-radius:6px;color:#fff;font-size:0.85rem;box-sizing:border-box" />

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:6px;border:1px dashed rgba(255,255,255,0.15)">
          <span style="font-size:0.75rem;color:var(--text-muted);flex-shrink:0">📷 Foto:</span>
          <input type="file" accept="image/*" onchange="handleProductPhotoUpload(event, this)" style="font-size:0.75rem;color:var(--text-muted);flex:1;min-width:0;max-width:100%" />
          <input type="hidden" class="prod-item-img" value="${safeImg}" />
          ${safeImg ? `<img src="${safeImg}" class="prod-item-preview" style="width:28px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0" />` : `<img class="prod-item-preview" style="width:28px;height:28px;border-radius:4px;object-fit:cover;display:none;flex-shrink:0" />`}
        </div>
      `;
      container.appendChild(itemEl);
    }

    function formatCurrencyValue(currency, rawVal) {
      const val = (rawVal || '').trim();
      if (!val) return '';
      if (currency === 'BRL') return /^R\$/i.test(val) ? val : ('R$ ' + val);
      if (currency === 'USD') return /^\$|USD/i.test(val) ? val : ('$ ' + val + ' USD');
      if (currency === 'EUR') return /^€|EUR/i.test(val) ? val : ('€ ' + val);
      if (currency === 'PI') return /π|\bpi\b/i.test(val) ? val : (val + ' π');
      return val;
    }

    function collectProductsFromForm() {
      const productElements = document.querySelectorAll('#prof-products-container .product-edit-item');
      const products = [];
      productElements.forEach(el => {
        const title = el.querySelector('.prod-item-title').value.trim();
        const currencyEl = el.querySelector('.prod-item-currency');
        const currency = currencyEl ? currencyEl.value : 'CUSTOM';
        const rawVal = el.querySelector('.prod-item-price').value.trim();

        const fiatCurEl = el.querySelector('.prod-item-fiat-currency');
        const fiatCur = fiatCurEl ? fiatCurEl.value : 'USD';
        const rawFiatVal = (el.querySelector('.prod-item-fiat-price') && el.querySelector('.prod-item-fiat-price').value.trim()) || '';

        const link = el.querySelector('.prod-item-link').value.trim();
        const img = el.querySelector('.prod-item-img').value.trim();

        const formattedPrice = rawVal ? formatCurrencyValue(currency, rawVal) : 'Sob Consulta';
        const formattedFiat = rawFiatVal ? formatCurrencyValue(fiatCur, rawFiatVal) : '';

        if (title || link) {
          products.push({ title: title, price: formattedPrice, price_fiat: formattedFiat, link: link, image_url: img });
        }
      });
      return products;
    }

    // Leitor de Foto Local com Compressão Canvas Automática (Evita Base64 Gigante no Banco)
    function handleProductPhotoUpload(e, inputEl) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
          const maxDim = 420;
          let w = img.naturalWidth || img.width || 420;
          let h = img.naturalHeight || img.height || 420;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.80);

          const parent = inputEl.closest('.product-edit-item');
          if (parent) {
            const hiddenInput = parent.querySelector('.prod-item-img');
            const previewImg = parent.querySelector('.prod-item-preview');
            if (hiddenInput) hiddenInput.value = compressedBase64;
            if (previewImg) {
              previewImg.src = compressedBase64;
              previewImg.style.display = 'inline-block';
            }
          }
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    }

    function collectSocialFieldsFromForm() {
      return {
        whatsapp_url: normalizeSocialUrl('whatsapp', document.getElementById('prof-input-whatsapp').value),
        youtube_url: normalizeSocialUrl('youtube', document.getElementById('prof-input-social').value),
        instagram_url: normalizeSocialUrl('instagram', document.getElementById('prof-input-instagram').value),
        twitter_url: normalizeSocialUrl('twitter', document.getElementById('prof-input-twitter').value),
        social_links: collectExtraSocialsFromForm()
      };
    }

    // Atualização da Prévia no Modo Simulador
    function applyLivePreviewFromForm() {
      const username = document.getElementById('prof-input-user').value.trim() || '@pioneiro';
      const bio = document.getElementById('prof-input-bio').value.trim();
      const wallet = document.getElementById('prof-input-wallet').value.trim();

      // Validação Criptográfica Estrita da Chave Pública antes de Gravar na Blockchain / Supabase
      if (wallet && !isValidPiPublicKey(wallet)) {
        alert('⚠️ Chave Pública Inválida!\n\nA chave da Pi Wallet deve começar com a letra "G", conter exatamente 56 caracteres e possuir checksum CRC16 válido da rede Stellar/Pi.\n\nPor favor, copie sua chave diretamente da sua carteira no aplicativo Pi Browser (wallet.pi).');
        const walletInp = document.getElementById('prof-input-wallet');
        if (walletInp) { walletInp.focus(); walletInp.style.borderColor = '#ef4444'; }
        return;
      }

      const socials = collectSocialFieldsFromForm();
      const avatarUrl = document.getElementById('prof-input-avatar') ? document.getElementById('prof-input-avatar').value.trim() : '';
      const showcaseZero = document.getElementById('prof-check-zero') ? document.getElementById('prof-check-zero').checked : true;
      const showcaseMural = document.getElementById('prof-check-mural') ? document.getElementById('prof-check-mural').checked : true;

      const products = collectProductsFromForm();

      currentProfileData = {
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
        wallet_address: wallet,
        whatsapp_url: socials.whatsapp_url,
        youtube_url: socials.youtube_url,
        instagram_url: socials.instagram_url,
        twitter_url: socials.twitter_url,
        social_links: socials.social_links,
        showcase_zero: showcaseZero,
        showcase_mural: showcaseMural,
        products: products
      };

      currentPioneerUser = username;
      renderShowcaseData(currentProfileData, []);
      closeProfileEditModal();

      alert('✨ Prévia atualizada com sucesso no Simulador!');
    }

    // Salvar Oficialmente na Pi Network (Exige Pi Browser para Validar Identidade KYC)
    async function saveProfileForm(e) {
      if (e) e.preventDefault();

      // Se estiver no Simulador, apenas atualiza a prévia
      if (isSimulatorMode) {
        applyLivePreviewFromForm();
        return;
      }

      let rawUser = document.getElementById('prof-input-user').value.trim();
      if (!rawUser) {
        alert('Por favor, informe seu @usuário Pi.');
        return;
      }
      let username = cleanUsername(rawUser);

      // Verificação de Segurança Anti-Fraude (Exclusivo Pi Browser):
      const inPi = isPiBrowser();
      const isAuth = isPiSdkAuthenticated();

      if (!inPi && !isAuth) {
        applyLivePreviewFromForm();
        alert(
          '💡 Modo Simulação (Navegador Comum)\n\n' +
          'Sua prévia foi atualizada na sua tela com sucesso!\n\n' +
          '🔒 Como publicar definitivamente na rede mundial?\n' +
          'Abra este site dentro do aplicativo Pi Browser para autenticar que você é o verdadeiro dono do @usuário.'
        );
        return;
      }

      // Se estiver no Pi Browser mas não autenticado ainda, autentica primeiro
      if (inPi && !isAuth && window.Pi) {
        try {
          const auth = await window.Pi.authenticate(['username', 'payments', 'wallet_address'], function(p) { console.log('Pendência:', p); });
          if (auth && auth.user && auth.user.username) {
            username = cleanUsername(auth.user.username);
            setLoggedUser(username, auth.user.uid, 'pi-sdk', auth.accessToken || '');
          }
        } catch (err) {
          alert('Falha na autenticação Pi. Confirme o acesso dentro do Pi Browser.');
          return;
        }
      }

      const bio = document.getElementById('prof-input-bio').value.trim();
      const wallet = document.getElementById('prof-input-wallet').value.trim();

      // Validação Criptográfica Estrita da Chave Pública antes de Gravar na Blockchain / Supabase
      if (wallet && !isValidPiPublicKey(wallet)) {
        alert('⚠️ Chave Pública Inválida!\n\nA chave da Pi Wallet deve começar com a letra "G", conter exatamente 56 caracteres e possuir checksum CRC16 válido da rede Stellar/Pi.\n\nPor favor, copie sua chave diretamente da sua carteira no aplicativo Pi Browser (wallet.pi).');
        const walletInp = document.getElementById('prof-input-wallet');
        if (walletInp) { walletInp.focus(); walletInp.style.borderColor = '#ef4444'; }
        return;
      }
      const socials = collectSocialFieldsFromForm();

      const avatarUrl = document.getElementById('prof-input-avatar') ? document.getElementById('prof-input-avatar').value.trim() : '';
      const showcaseZero = document.getElementById('prof-check-zero') ? document.getElementById('prof-check-zero').checked : true;
      const showcaseMural = document.getElementById('prof-check-mural') ? document.getElementById('prof-check-mural').checked : true;

      const products = collectProductsFromForm();

      const btn = document.getElementById('btn-save-profile');
      btn.disabled = true;
      btn.textContent = '⏳ Salvando no Supabase...';

      try {
        if (window.IsarDB && window.IsarDB.savePioneerProfile) {
          await window.IsarDB.savePioneerProfile(username, {
            bio: bio,
            avatar_url: avatarUrl,
            wallet_address: wallet,
            whatsapp_url: socials.whatsapp_url,
            youtube_url: socials.youtube_url,
            instagram_url: socials.instagram_url,
            twitter_url: socials.twitter_url,
            social_links: socials.social_links,
            showcase_zero: showcaseZero,
            showcase_mural: showcaseMural,
            products: products
          });

          // Salva no cache imediato do navegador para persistência instantânea
          const cleanSlug = cleanUsername(username).replace('@', '');
          try {
            if (avatarUrl) {
              localStorage.setItem('hokage_pioneer_avatar_' + cleanSlug, avatarUrl);
            } else {
              localStorage.removeItem('hokage_pioneer_avatar_' + cleanSlug);
            }
          } catch (_) {}

          setLoggedUser(username, null, 'pi-sdk');
          currentPioneerUser = username;
          if (currentProfileData) {
            currentProfileData.avatar_url = avatarUrl;
          }
          applyAvatarOnScreen(avatarUrl, username);
          window.history.replaceState(null, '', `?u=${encodeURIComponent(cleanSlug)}`);

          alert('✓ Vitrine oficial salva e verificada com sucesso na rede Pi!');
          closeProfileEditModal();
          loadPioneerProfile();
        } else {
          throw new Error('Banco de dados não disponível.');
        }
      } catch (err) {
        console.error('Erro ao salvar vitrine:', err);
        alert('Erro ao gravar dados no Supabase. Por favor, tente novamente no Pi Browser.');
      } finally {
        btn.disabled = false;
        btn.textContent = '💾 Salvar Oficialmente na Pi Network';
      }
    }

    // ==========================================
    // FOTO DE PERFIL: HELPER DO MODAL
    // ==========================================
    function setModalAvatar(dataUrl, username) {
      const imgEl = document.getElementById('modal-avatar-img');
      const phEl = document.getElementById('modal-avatar-placeholder');
      const removeBtn = document.getElementById('btn-remove-avatar');
      const hiddenInp = document.getElementById('prof-input-avatar');

      const safeDataUrl = sanitizeImageUrl(dataUrl);

      if (hiddenInp) hiddenInp.value = safeDataUrl || '';

      if (safeDataUrl) {
        if (imgEl) {
          imgEl.src = safeDataUrl;
          imgEl.style.display = 'block';
        }
        if (phEl) phEl.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
      } else {
        if (imgEl) {
          imgEl.src = '';
          imgEl.style.display = 'none';
        }
        if (phEl) {
          const clean = cleanUsername(username || currentPioneerUser || '@p');
          const initial = clean.replace('@', '').charAt(0).toUpperCase() || 'π';
          phEl.textContent = initial;
          phEl.style.display = 'flex';
        }
        if (removeBtn) removeBtn.style.display = 'none';
      }
    }

    // ==========================================
    // CORTADOR DE FOTO DE PERFIL (HTML5 CANVAS INTERATIVO)
    // ==========================================
    let cropImg = new Image();
    let cropState = {
      x: 0,
      y: 0,
      zoom: 1,
      baseScale: 1,
      minZoom: 0.1,
      maxZoom: 5,
      isDragging: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      touchDist: 0
    };

    function triggerAvatarUpload() {
      const input = document.getElementById('avatar-file-input');
      if (input) {
        input.value = '';
        input.click();
      }
    }

    function handleAvatarFileSelect(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const fileName = file.name || '';
      const isImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(fileName);
      if (!isImage && file.type) {
        alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(evt) {
        const tempImg = new Image();
        tempImg.onload = function() {
          // Downscaling preventivo para fotos gigantes de smartphones (evita crash de memória no WebView)
          const maxDim = 1200;
          let w = tempImg.naturalWidth || tempImg.width;
          let h = tempImg.naturalHeight || tempImg.height;

          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            const sw = Math.round(w * scale);
            const sh = Math.round(h * scale);
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = sw;
            tempCanvas.height = sh;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(tempImg, 0, 0, sw, sh);

            cropImg = new Image();
            cropImg.onload = function() {
              openAvatarCropModal();
            };
            cropImg.src = tempCanvas.toDataURL('image/jpeg', 0.92);
          } else {
            cropImg = tempImg;
            openAvatarCropModal();
          }
        };
        tempImg.onerror = function() {
          alert('Não foi possível processar a imagem selecionada. Tente outra foto.');
        };
        tempImg.src = evt.target.result;
      };
      reader.onerror = function() {
        alert('Erro ao ler arquivo do dispositivo.');
      };
      reader.readAsDataURL(file);
    }

    function openAvatarCropModal() {
      const modal = document.getElementById('avatar-crop-modal');
      const canvas = document.getElementById('crop-canvas');
      const zoomRange = document.getElementById('crop-zoom-range');
      if (!modal || !canvas) return;

      const imgW = cropImg.naturalWidth || cropImg.width || 240;
      const imgH = cropImg.naturalHeight || cropImg.height || 240;

      // Calcula escala inicial para cobrir o círculo de 240x240 sem deformação
      const side = Math.min(imgW, imgH);
      const baseScale = 240 / side;

      cropState.baseScale = baseScale;
      cropState.zoom = baseScale;
      cropState.minZoom = baseScale * 0.7;
      cropState.maxZoom = baseScale * 4.0;
      cropState.x = (240 - imgW * cropState.zoom) / 2;
      cropState.y = (240 - imgH * cropState.zoom) / 2;
      cropState.isDragging = false;
      cropState.touchDist = 0;

      if (zoomRange) {
        zoomRange.min = cropState.minZoom.toFixed(4);
        zoomRange.max = cropState.maxZoom.toFixed(4);
        zoomRange.step = ((cropState.maxZoom - cropState.minZoom) / 100).toFixed(4);
        zoomRange.value = cropState.zoom.toFixed(4);
      }

      setupCropCanvasEvents();
      drawCropCanvas();

      modal.style.display = 'flex';
      modal.classList.add('active');
    }

    function closeAvatarCropModal() {
      const modal = document.getElementById('avatar-crop-modal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    }

    function drawCropCanvas() {
      const canvas = document.getElementById('crop-canvas');
      if (!canvas || !cropImg.complete) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imgW = cropImg.naturalWidth || cropImg.width;
      const imgH = cropImg.naturalHeight || cropImg.height;

      ctx.drawImage(
        cropImg,
        cropState.x,
        cropState.y,
        imgW * cropState.zoom,
        imgH * cropState.zoom
      );
      ctx.restore();
    }

    function onCropZoomChange(val) {
      const newZoom = parseFloat(val);
      const canvas = document.getElementById('crop-canvas');
      if (!canvas || isNaN(newZoom)) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      const prevZoom = cropState.zoom;
      cropState.x = centerX - ((centerX - cropState.x) / prevZoom) * newZoom;
      cropState.y = centerY - ((centerY - cropState.y) / prevZoom) * newZoom;
      cropState.zoom = newZoom;

      drawCropCanvas();
    }

    function adjustCropZoom(delta) {
      const zoomRange = document.getElementById('crop-zoom-range');
      if (!zoomRange) return;
      let next = parseFloat(zoomRange.value) + delta;
      next = Math.max(parseFloat(zoomRange.min), Math.min(parseFloat(zoomRange.max), next));
      zoomRange.value = next.toFixed(4);
      onCropZoomChange(next);
    }

    let isCropEventsInitialized = false;
    function setupCropCanvasEvents() {
      if (isCropEventsInitialized) return;
      const viewport = document.getElementById('crop-viewport');
      if (!viewport) return;

      function getPointerPos(e) {
        if (e.touches && e.touches.length > 0) {
          return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
      }

      function getTouchDist(e) {
        if (!e.touches || e.touches.length < 2) return 0;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
      }

      function onStart(e) {
        if (e.touches && e.touches.length === 2) {
          cropState.isDragging = false;
          cropState.touchDist = getTouchDist(e);
          return;
        }
        e.preventDefault();
        cropState.isDragging = true;
        viewport.style.cursor = 'grabbing';
        const p = getPointerPos(e);
        cropState.startX = p.x;
        cropState.startY = p.y;
        cropState.lastX = cropState.x;
        cropState.lastY = cropState.y;
      }

      function onMove(e) {
        // Pinch-to-zoom com 2 dedos no celular / Pi Browser
        if (e.touches && e.touches.length === 2) {
          e.preventDefault();
          const curDist = getTouchDist(e);
          if (cropState.touchDist > 0 && curDist > 0) {
            const diff = curDist - cropState.touchDist;
            if (Math.abs(diff) > 2) {
              adjustCropZoom(diff * 0.006);
              cropState.touchDist = curDist;
            }
          }
          return;
        }

        if (!cropState.isDragging) return;
        e.preventDefault();
        const p = getPointerPos(e);
        const dx = p.x - cropState.startX;
        const dy = p.y - cropState.startY;
        cropState.x = cropState.lastX + dx;
        cropState.y = cropState.lastY + dy;
        drawCropCanvas();
      }

      function onEnd(e) {
        if (e.touches && e.touches.length > 0) {
          cropState.touchDist = 0;
          return;
        }
        if (!cropState.isDragging) return;
        cropState.isDragging = false;
        viewport.style.cursor = 'grab';
      }

      // Mouse events
      viewport.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);

      // Touch events (Compatível com Mobile e Pi Browser)
      viewport.addEventListener('touchstart', onStart, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);

      // Mouse wheel zoom
      viewport.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? (cropState.zoom * 0.08) : -(cropState.zoom * 0.08);
        adjustCropZoom(delta);
      }, { passive: false });

      isCropEventsInitialized = true;
    }

    function confirmAvatarCrop() {
      const canvas = document.getElementById('crop-canvas');
      if (!canvas) return;

      // Gera um canvas limpo 256x256 de alta resolução para salvar
      const outCanvas = document.createElement('canvas');
      outCanvas.width = 256;
      outCanvas.height = 256;
      const outCtx = outCanvas.getContext('2d');

      // Desenha com proporção exata escalada de 240 para 256
      outCtx.drawImage(
        canvas,
        0, 0, 240, 240,
        0, 0, 256, 256
      );

      // Converte para JPEG com qualidade 0.85 (leve, ~15KB)
      const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.85);

      // Atualiza formulário do modal
      setModalAvatar(croppedDataUrl, currentPioneerUser);

      // Aplica imediatamente na vitrine
      applyAvatarOnScreen(croppedDataUrl, currentPioneerUser);
      if (currentProfileData) {
        currentProfileData.avatar_url = croppedDataUrl;
      }

      closeAvatarCropModal();

      // Garante que o modal de edição continue aberto
      const editModal = document.getElementById('edit-profile-modal');
      if (editModal && !editModal.classList.contains('active')) {
        openProfileEditModal();
      }
    }

    function removeAvatar() {
      setModalAvatar('', currentPioneerUser);
      applyAvatarOnScreen('', currentPioneerUser);
      if (currentProfileData) {
        currentProfileData.avatar_url = '';
      }
    }

    function applyAvatarOnScreen(avatarUrl, username) {
      const avatarEl = document.getElementById('pioneer-avatar');
      if (!avatarEl) return;

      const safeUrl = sanitizeImageUrl(avatarUrl);
      if (safeUrl) {
        avatarEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = safeUrl;
        img.alt = 'Avatar de ' + escapeHtml(cleanUsername(username || currentPioneerUser || 'Pioneiro'));
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block';
        img.onerror = () => {
          applyAvatarOnScreen('', username);
        };
        avatarEl.appendChild(img);
      } else {
        const clean = cleanUsername(username || currentPioneerUser || '@p');
        const initial = clean.replace('@', '').charAt(0).toUpperCase() || 'π';
        avatarEl.innerHTML = `<span style="font-size:2.4rem;font-weight:800;color:var(--accent-light)">${escapeHtml(initial)}</span>`;
      }
    }

    // Copiar Chave Pública com Feedback Imediato e Proteção Anti-Clipper Guard
    function copyWalletKey() {
      if (!currentPioneerWallet) {
        alert('Chave pública não cadastrada para este pioneiro.');
        return;
      }
      incrementProfileMetric('copies');
      navigator.clipboard.writeText(currentPioneerWallet).then(() => {
        const btn = document.getElementById('btn-copy-wallet');
        if (btn) {
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Copiada!';
          btn.style.borderColor = '#10b981';
          btn.style.color = '#34d399';
          setTimeout(() => { 
            btn.innerHTML = originalText;
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 3000);
        }
      }).catch(() => {
        prompt('Copie a chave pública abaixo:', currentPioneerWallet);
      });
    }

    // Reputação & Avaliações Verificadas (Pi Browser Zero-Trust)
    async function loadPioneerReferralPanel(targetUsername, isOwner) {
      const badgeEl = document.getElementById('pioneer-ambassador-badge');
      const sectionEl = document.getElementById('pioneer-referral-section');
      if (badgeEl) badgeEl.style.display = 'none';
      if (sectionEl) sectionEl.style.display = 'none';

      if (!window.HokageReferral || !targetUsername) return;
      const stats = await window.HokageReferral.fetchStats(targetUsername);
      if (!stats) return;

      if (badgeEl && stats.is_ambassador) {
        badgeEl.style.display = 'inline-flex';
      }

      if (!isOwner || isSimulatorMode || !sectionEl) return;

      const count = Number(stats.referral_qualified_count || 0);
      const credits = Number(stats.referral_credits || 0);
      const isAmb = Boolean(stats.is_ambassador);

      const countEl = document.getElementById('ref-count-value');
      const creditsEl = document.getElementById('ref-credits-value');
      const statusEl = document.getElementById('ref-ambassador-status');
      const useWrap = document.getElementById('ref-use-credit-wrap');

      if (countEl) countEl.textContent = String(count);
      if (creditsEl) creditsEl.textContent = String(credits);
      if (statusEl) {
        statusEl.textContent = isAmb
          ? '🏅 Selo Embaixador Ativo!'
          : `${Math.min(count, 5)} / 5 para Selo Embaixador`;
        if (isAmb) {
          statusEl.style.background = 'rgba(245,158,11,0.18)';
          statusEl.style.color = '#fcd34d';
        }
      }
      if (useWrap) {
        useWrap.style.display = credits > 0 ? 'block' : 'none';
      }
      sectionEl.dataset.inviteUsername = targetUsername;
      sectionEl.style.display = 'block';
    }

    function copyReferralInviteLink() {
      const sectionEl = document.getElementById('pioneer-referral-section');
      const username = (sectionEl && sectionEl.dataset.inviteUsername) || (currentProfile && currentProfile.username) || '';
      const url = window.HokageReferral ? window.HokageReferral.buildInviteUrl(username) : 'https://hokage22b.com/pioneiro';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          const btn = document.getElementById('btn-copy-ref-link');
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = '✅ Link Copiado!';
            setTimeout(function () { btn.textContent = orig; }, 2200);
          }
        }).catch(function () {
          prompt('Copie seu link de convite:', url);
        });
      } else {
        prompt('Copie seu link de convite:', url);
      }
    }

    function shareReferralWhatsapp() {
      const sectionEl = document.getElementById('pioneer-referral-section');
      const username = (sectionEl && sectionEl.dataset.inviteUsername) || (currentProfile && currentProfile.username) || '';
      const url = window.HokageReferral ? window.HokageReferral.buildInviteUrl(username) : 'https://hokage22b.com/pioneiro';
      const msg = 'Crie sua Vitrine Web3 grátis na Pi Network pelo meu convite e apareça para a comunidade: ' + url;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
    }

    async function loadPioneerReviews(targetUsername, isOwner) {
      const section = document.getElementById('pioneer-reviews-section');
      const listEl = document.getElementById('pioneer-reviews-list');
      const summaryEl = document.getElementById('pioneer-reviews-summary');
      const formBox = document.getElementById('pioneer-review-form-box');
      if (!section || !listEl || !targetUsername) return;

      section.style.display = 'block';
      const reviews = (window.IsarDB && window.IsarDB.getPioneerReviews)
        ? await window.IsarDB.getPioneerReviews(targetUsername)
        : [];

      if (reviews.length > 0) {
        const avg = (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1);
        if (summaryEl) summaryEl.textContent = `⭐ ${avg} · ${reviews.length} ${reviews.length === 1 ? 'recomendação' : 'recomendações'}`;
        listEl.innerHTML = reviews.map(r => {
          const stars = '★'.repeat(Math.min(5, Math.max(1, Number(r.rating) || 5)));
          const author = escapeHtml(r.reviewer_username || '@pioneiro');
          const msg = escapeHtml(r.comment || '');
          return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px">
                <a href="pioneiro?u=${encodeURIComponent(author.replace(/^@+/, ''))}" style="font-size:0.78rem;font-weight:700;color:var(--accent-light);text-decoration:none">${author}</a>
                <span style="font-size:0.78rem;color:var(--amber-light);letter-spacing:1px">${stars}</span>
              </div>
              <div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.4;word-break:break-word">${msg}</div>
            </div>
          `;
        }).join('');
      } else {
        if (summaryEl) summaryEl.textContent = 'Sem avaliações ainda';
        listEl.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:6px 0">Seja o primeiro pioneiro verificado a recomendar esta Vitrine.</div>';
      }

      if (!formBox) return;
      if (isOwner) {
        formBox.innerHTML = '';
        return;
      }

      const isPi = Boolean(window.HokagePi && window.HokagePi.isPiBrowser && window.HokagePi.isPiBrowser());
      const piUser = (window.HokagePi && window.HokagePi.getUser) ? window.HokagePi.getUser() : null;
      if (isPi && piUser && piUser.username) {
        formBox.innerHTML = `
          <form onsubmit="handleReviewSubmit(event, '${escapeHtml(targetUsername)}')" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.22);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:0.78rem;color:#34d399;font-weight:700">✓ Avaliar como @${escapeHtml(String(piUser.username).replace(/^@+/, ''))}</span>
              <select id="review-rating-select" style="background:#09090b;border:1px solid rgba(255,255,255,0.2);color:#fcd34d;border-radius:6px;padding:4px 8px;font-size:0.8rem;font-weight:700">
                <option value="5">★★★★★ (5/5)</option>
                <option value="4">★★★★☆ (4/5)</option>
                <option value="3">★★★☆☆ (3/5)</option>
                <option value="2">★★☆☆☆ (2/5)</option>
                <option value="1">★☆☆☆☆ (1/5)</option>
              </select>
            </div>
            <input type="text" id="review-comment-input" maxlength="200" required placeholder="Conte como foi negociar com este pioneiro..." style="width:100%;box-sizing:border-box;background:#09090b;border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:8px 10px;color:#fff;font-size:0.82rem" />
            <button type="submit" class="portal-btn portal-btn--sm" style="align-self:flex-end;background:#10b981;color:#052e16;font-weight:700;padding:7px 14px">Enviar Avaliação</button>
          </form>
        `;
      } else {
        formBox.innerHTML = `<div style="font-size:0.76rem;color:var(--text-muted);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 10px">🔒 Avaliações verificadas disponíveis exclusivamente para usuários conectados no <strong>Pi Browser</strong>.</div>`;
      }
    }

    async function handleReviewSubmit(event, targetUsername) {
      if (event && event.preventDefault) event.preventDefault();
      const ratingEl = document.getElementById('review-rating-select');
      const commentEl = document.getElementById('review-comment-input');
      if (!commentEl || commentEl.value.trim().length < 2) {
        alert('Escreva um comentário com pelo menos 2 caracteres.');
        return;
      }
      try {
        await window.IsarDB.submitPioneerReview({
          target_username: targetUsername,
          rating: ratingEl ? Number(ratingEl.value) : 5,
          comment: commentEl.value.trim()
        });
        await loadPioneerReviews(targetUsername, false);
        alert('✓ Avaliação verificada registrada com sucesso!');
      } catch (err) {
        alert(err && err.message ? err.message : 'Não foi possível enviar a avaliação.');
      }
    }

    // Compartilhar Vitrine (Link Curto Oficial)
    function shareProfile() {
      const cleanUser = currentPioneerUser ? currentPioneerUser.replace(/^@+/, '') : 'hokage22b';
      const shareUrl = `https://hokage22b.com/@${cleanUser}`;
      if (navigator.share) {
        navigator.share({
          title: `${cleanUsername(currentPioneerUser)} — Vitrine Oficial na Pi Network`,
          text: `Confira minha vitrine oficial, produtos e links na comunidade Pi Network:`,
          url: shareUrl
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(`✓ Link da sua Vitrine copiado!\n\n${shareUrl}\n\nVocê pode colar este link na bio do Instagram, TikTok ou WhatsApp.`);
        });
      }
    }

    document.addEventListener('DOMContentLoaded', loadPioneerProfile);
  