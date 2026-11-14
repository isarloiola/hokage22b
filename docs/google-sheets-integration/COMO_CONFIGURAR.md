# 📊 Integração Google Sheets — isar.pi

Este guia passo a passo permite conectar o formulário de captura de leads e reservas do site **isar.pi** diretamente a uma planilha do Google Sheets, 100% gratuito e sem precisar de backend.

---

## 🚀 Passo a Passo (Leva menos de 3 minutos)

### 1. Criar a Planilha no Google Drive
1. Acesse [sheets.new](https://sheets.new) no seu navegador (com sua conta Google logada).
2. Dê um nome para a planilha no topo (exemplo: `Leads - isar.pi`).

---

### 2. Abrir o Editor do Google Apps Script
1. No menu superior da planilha, clique em **Extensões** (Extensions) → **Apps Script**.
2. Uma nova aba será aberta com um editor de código.
3. Apague qualquer código existente no arquivo `Código.gs`.
4. Abra o arquivo [`Code.gs`](./Code.gs) desta pasta, copie todo o conteúdo e cole no editor do Google Apps Script.
5. Clique no ícone de disquete **Salvar** (💾) ou pressione `Ctrl + S`.

---

### 3. Publicar como Web App (Implantar)
1. No canto superior direito da tela do Apps Script, clique no botão azul **Implantar** (Deploy) → **Nova implantação** (New deployment).
2. Na janela que abrir, clique na engrenagem **Selecionar tipo** (⚙️) ao lado de "Tipo" e selecione **App da Web** (Web app).
3. Preencha as opções exatamente assim:
   - **Descrição:** `Captura Leads isar.pi`
   - **Executar como:** `Eu (seu-email@gmail.com)`
   - **Quem pode acessar:** `Qualquer pessoa` (*Anyone*) ⚠️ **ATENÇÃO:** Essa opção é indispensável para que o site consiga enviar os dados!
4. Clique em **Implantar** (Deploy).
5. O Google pode pedir para autorizar o acesso. Clique em **Autorizar acesso**, selecione sua conta Google, depois em **Avançado** (Advanced) e **Acessar Captura Leads (não seguro)** e confirme em **Permitir**.
6. Uma janela mostrará a **URL do app da Web** (termina com `/exec`).
7. Clique em **Copiar** ao lado da URL.

---

### 4. Conectar a URL no Site
1. Abra o arquivo `site/assets/js/modules/lead.js`.
2. Localize a linha 10:
   ```javascript
   const GOOGLE_SHEETS_URL = window.ISAR_GOOGLE_SHEETS_URL || '';
   ```
3. Cole a sua URL entre as aspas:
   ```javascript
   const GOOGLE_SHEETS_URL = window.ISAR_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Salve o arquivo e faça o commit/push no GitHub!

---

## 📋 Como os dados aparecem na planilha

Assim que o primeiro visitante preencher o formulário ou clicar em reservar o Ebook #2, a planilha criará automaticamente o cabeçalho estilizado:

| Data / Hora | Nome | E-mail | Origem / Ação | Usuário Pi Network | Pontuação Reputação |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 29/10/2026 11:45:00 | Carlos Silva | carlos@exemplo.com | ebook-manual-pi | @carlos_pi | 90 |
| 29/10/2026 12:10:15 | Maria Souza | maria@exemplo.com | reserva-ebook-2 | Não conectado | 40 |

---

## 🔒 Segurança e Privacidade
- Os visitantes só conseguem enviar dados novos para a planilha; eles **não conseguem ler** os outros e-mails da planilha.
- O site continua funcionando e liberando o download instantaneamente mesmo se a internet do visitante estiver lenta (envio assíncrono em segundo plano).

