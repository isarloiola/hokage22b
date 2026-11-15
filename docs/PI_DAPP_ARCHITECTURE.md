# Arquitetura Custo Zero para dApps na Pi Network

Este guia documenta os blocos reutilizáveis do ecossistema **HOKAGE22B** para que outros desenvolvedores da comunidade Pi/Web3 possam construir aplicações reais sem custo de servidor dedicado, combinando **GitHub Pages + Supabase (Free Tier) + Pi SDK v2.0**.

---

## Visão Geral do Fluxo

```text
[Pi Browser / Navegador]
   │
   ├── 1. Roteamento curto (/@usuario) ──► site/404.html ──► pioneiro.html?u=@usuario
   ├── 2. Login Pi SDK (sem senha)     ──► accessToken
   └── 3. Chamada segura               ──► Supabase Edge Functions
                                             ├── Valida token em api.minepi.com/v2/me
                                             ├── Executa regra de negócio com service_role
                                             ├── Grava no Postgres (RLS protegido)
                                             └── Envia alerta admin (Telegram / Resend)
```

---

## Os 4 Blocos Reutilizáveis

### 1. Autenticação Server-Side sem Confiar no Cliente
**Arquivo:** `supabase/functions/_shared/pi-auth.ts`

Nunca confie apenas no `username` enviado pelo navegador. O helper `verifyPiAccessToken(accessToken)` consulta `https://api.minepi.com/v2/me` usando o `Bearer` token emitido pelo Pi SDK e retorna `{ uid, username }` verificados.

- **Regra de ouro:** O frontend nunca pede senha nem passphrase de 24 palavras.

### 2. Pagamentos Pi com Aprovação e Conclusão no Servidor
**Arquivos:**
- Backend: `supabase/functions/pi-payment/index.ts`
- Frontend: `site/assets/js/modules/pi-pay.js`
- Ledger SQL: `database/migrations/setup_transacoes_pi.sql`

O fluxo de pagamento U2A segue o ciclo oficial da Pi Network:
1. O cliente inicia o pagamento no Pi SDK.
2. `onReadyForServerApproval(paymentId)` aciona a Edge Function (`pi-payment`) com a `PI_SERVER_API_KEY` armazenada apenas como Secret no Supabase.
3. `onReadyForServerCompletion(paymentId, txid)` valida a conclusão no servidor e registra a transação no banco.

Para configurar as chaves no Supabase, consulte [`../database/COMO_ATIVAR_PAGAMENTOS_PI.md`](../database/COMO_ATIVAR_PAGAMENTOS_PI.md).

### 3. Links Curtos (`/@usuario`) em Hospedagem Estática
**Arquivo:** `site/404.html`

No GitHub Pages, caminhos como `https://hokage22b.com/@usuario` não existem fisicamente e caem no `404.html`. O script em `site/404.html` intercepta o `pathname` e redireciona instantaneamente preservando `search` e `hash`:
- `/@usuario` -> `/pioneiro.html?u=%40usuario`
- `/pioneiro/usuario` -> `/pioneiro.html?u=%40usuario`
- `/simulador` ou `/teste` -> `/pioneiro.html?teste=1`

### 4. Hardening Zero-Trust, Testes RLS e Notificações Admin
**Arquivos:**
- Histórico e guia de migrações: [`../database/README.md`](../database/README.md)
- Suite de testes de segurança: [`../database/tests/run_security_tests.js`](../database/tests/run_security_tests.js)
- Notificações assíncronas (Telegram / Resend): `supabase/functions/_shared/notify.ts`

O banco bloqueia escritas anônimas diretas nas tabelas sensíveis via RLS e testa regularmente com a `anon key` se dados privados (como `leads`) permanecem inacessíveis enquanto leituras públicas (como vitrines e mural) continuam funcionando.

---

## Como Adaptar para o Seu Projeto

1. Clone o repositório e revise `site/assets/js/config.js` para apontar para o seu projeto Supabase.
2. Aplique o schema base e as migrações desejadas descritas em [`../database/README.md`](../database/README.md).
3. Configure os secrets das Edge Functions no Supabase (`PI_SERVER_API_KEY` e, opcionalmente, `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ADMIN_CHAT_ID`).
4. Publique a pasta `site/` no GitHub Pages (ou Cloudflare Pages / Netlify).
