/**
 * ============================================================
 * isar.pi — Google Apps Script para Captura de Leads e Reservas
 * ============================================================
 * 
 * Este script recebe as requisições POST do site (GitHub Pages)
 * e grava automaticamente em uma aba da sua planilha Google.
 * 
 * Instruções rápidas:
 * 1. Crie uma nova planilha no Google Sheets (ex: "Leads isar.pi")
 * 2. Clique no menu: Extensões > Apps Script
 * 3. Apague o código padrão que estiver lá e cole todo este arquivo
 * 4. Clique no ícone de Salvar (💾)
 * 5. Clique no botão azul "Implantar" (Deploy) > "Nova implantação"
 * 6. Tipo: selecione o ícone de engrenagem > "App da Web" (Web App)
 * 7. Descrição: "Captura de Leads isar.pi"
 * 8. Executar como: "Eu (seu-email@gmail.com)"
 * 9. Quem pode acessar: "Qualquer pessoa" (Anyone) -> ESSENCIAL!
 * 10. Clique em "Implantar" e copie a URL gerada (termina com /exec)
 * 11. Cole essa URL no arquivo site/assets/js/modules/lead.js (na variável GOOGLE_SHEETS_URL)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Aguarda até 10 segundos para evitar conflito de gravação simultânea
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Se for uma planilha nova e a linha 1 estiver vazia, cria os cabeçalhos
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Data / Hora",
        "Nome",
        "E-mail",
        "Origem / Ação",
        "Usuário Pi Network",
        "Pontuação Reputação"
      ];
      sheet.appendRow(headers);
      
      // Estiliza o cabeçalho
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#111827");
      headerRange.setFontColor("#f97316");
      sheet.setFrozenRows(1);
    }

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Formata a data e hora para o fuso horário de Brasília
    var timestamp = Utilities.formatDate(new Date(), "America/Sao_Paulo", "dd/MM/yyyy HH:mm:ss");
    var name = data.name || data.nome || "Não informado";
    var email = data.email || "Não informado";
    var source = data.source || data.origem || "Manual Pi Network";
    var piUser = data.pi_user || data.usuario_pi || "Visitante";
    var reputation = data.reputation || data.pontos_reputacao || 0;

    // Adiciona a linha com os dados
    sheet.appendRow([
      timestamp,
      name,
      email,
      source,
      piUser,
      reputation
    ]);

    // Retorna resposta de sucesso
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Lead registrado com sucesso" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Suporte para teste rápido abrindo a URL no navegador
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "online", service: "isar.pi Leads Webhook" }))
    .setMimeType(ContentService.MimeType.JSON);
}
