# Como Ativar Pagamentos Automáticos da Pi Network no Supabase

Para processar pagamentos na Pi Network sem expor sua Server API Key no navegador e sem pagar hospedagem:

## 1. Salvar a API Key nas Secrets do Supabase
1. Acesse seu painel do Supabase: [https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj](https://supabase.com/dashboard/project/yhzoehwkuxteihsnagcj)
2. No menu lateral, clique em **Project Settings > Edge Functions** (ou **Secrets**).
3. Adicione um novo segredo:
   - **Name:** `PI_SERVER_API_KEY`
   - **Value:** `COLE_AQUI_A_SUA_SERVER_API_KEY_DO_PI_DEVELOPER_PORTAL`
4. Clique em **Save**.

## 2. Criar a Edge Function
1. No menu lateral do Supabase, clique em **Edge Functions**.
2. Clique em **Create Function** e dê o nome: `pi-payment`.
3. Cole o código que está no arquivo `database/supabase-functions/pi-payment/index.ts`.
4. Clique em **Deploy**.

Pronto! Seu site agora tem um validador de pagamentos oficial da Pi Network na nuvem com custo R$ 0,00 e segurança total.

