# Pi dApp Starter Kit (GitHub Pages + Supabase Free)

Modelo mínimo e funcional extraído da arquitetura do **HOKAGE22B** para quem quer colocar um dApp na **Pi Network** no ar em poucos minutos, sem servidor pago e seguindo as regras de segurança do ecossistema (Zero Passphrase + validação no servidor).

## O que vem neste kit

1. `index.html` — Página mínima com **Pi SDK v2.0** (login + botão de pagamento teste em Sandbox/Produção).
2. `pi-payment-minimal.ts` — Edge Function Supabase (Deno) que valida o token em `api.minepi.com/v2/me`, aprova (`approve`) e completa (`complete`) o pagamento na API oficial da Pi.
3. `schema.sql` — Tabela mínima `transacoes_pi` com RLS ativado (leitura segura / escrita apenas via `service_role`).

## Passo a passo rápido (10 minutos)

1. Crie um projeto gratuito no **Supabase** e execute o `schema.sql` no SQL Editor.
2. Copie `pi-payment-minimal.ts` para `supabase/functions/pi-payment/index.ts` e faça deploy:
   ```bash
   npx supabase secrets set PI_SERVER_API_KEY=sua_chave_do_pi_developer_portal
   npx supabase functions deploy pi-payment --no-verify-jwt
   ```
3. No `index.html`, substitua `SUPABASE_FUNCTION_URL` pela URL da sua Edge Function.
4. Publique o `index.html` no **GitHub Pages** e cadastre o domínio no **Pi Developer Portal** (`develop.pi`).
5. Teste no **Pi Browser** (ou no Sandbox em `sandbox.minepi.com`).
