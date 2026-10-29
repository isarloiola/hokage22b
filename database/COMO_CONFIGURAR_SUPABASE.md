# 🐘 Como Configurar o Supabase no isar.pi

O **Supabase** é a melhor opção para o projeto porque oferece:
1. **PostgreSQL Real:** Banco de dados relacional robusto, com backup e exportação em CSV.
2. **Segurança Máxima (RLS):** Qualquer um pode enviar seu e-mail pelo site, mas **ninguém de fora consegue ler a lista de e-mails dos outros**, pois o banco bloqueia leituras não autorizadas a nível de linha.
3. **Gratuito:** Até 500MB de dados e 50.000 usuários ativos por mês sem pagar nada.

---

## ⚡ Passo a Passo de 3 Minutos

### 1. Criar o Projeto Gratuito
1. Acesse [supabase.com](https://supabase.com) e entre com sua conta do GitHub (é 1 clique).
2. Clique no botão verde **"New Project"**.
3. Escolha:
   - **Name:** `isar-pi`
   - **Database Password:** Escolha uma senha forte e guarde-a.
   - **Region:** `South America (São Paulo)` para ter a menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde ~1 minuto até finalizar a criação.

---

### 2. Rodar o Script de Tabelas e Segurança
1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (um ícone com `>_`).
2. Clique em **"New query"**.
3. Abra o arquivo [`schema.sql`](./schema.sql) desta pasta, copie todo o conteúdo e cole no SQL Editor.
4. Clique no botão verde **"Run"** (ou aperte `Ctrl + Enter`).
5. Você verá a mensagem *"Success. No rows returned"*.
6. Pronto! As tabelas `leads`, `pioneiros` e `doacoes` foram criadas com as regras de segurança RLS ativadas.

---

### 3. Pegar as Chaves de Conexão
1. No menu lateral esquerdo, clique no ícone de engrenagem **Project Settings** → **API**.
2. Você verá duas informações:
   - **Project URL:** Ex: `https://xyzcompany.supabase.co`
   - **Project API Keys:** Copie a chave chamada **`anon` / `public`** (nunca a chave `service_role`).

---

### 4. Conectar no Site
Abra o arquivo `site/assets/js/modules/db.js` e cole suas credenciais nas linhas 8 e 9:

```javascript
const SUPABASE_URL = window.ISAR_SUPABASE_URL || 'https://sua-url-aqui.supabase.co';
const SUPABASE_ANON_KEY = window.ISAR_SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';
```

E no seu `site/index.html`, adicione a CDN do Supabase antes dos scripts:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/modules/db.js"></script>
```

