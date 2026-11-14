/**
 * HOKAGE22B — Compilador Nativo Node.js (Zero Dependências Externas)
 * Obra: Manual Pi Network (23 Capítulos)
 * Uso: node ebooks/manual-pi-network/build/compile_book.js
 */
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(BASE_DIR, 'content');
const CHAPTERS_DIR = path.join(CONTENT_DIR, 'chapters');
const ASSETS_DIR = path.join(BASE_DIR, 'assets');
const DIST_DIR = path.join(BASE_DIR, 'dist');

fs.mkdirSync(DIST_DIR, { recursive: true });

const PARTS = [
  { num: 'Parte I', title: 'Começando com a Pi', chapters: [1, 2, 3, 4, 5] },
  { num: 'Parte II', title: 'O mundo do dinheiro', chapters: [6, 7, 8, 9] },
  { num: 'Parte III', title: 'A Pi nesse cenário', chapters: [10, 11, 12, 13] },
  { num: 'Parte IV', title: 'Brasil', chapters: [14, 15] },
  { num: 'Parte V', title: 'Avançado e ação', chapters: [16, 17, 18] },
  { num: 'Parte VI', title: 'Tecnologia e futuro', chapters: [19, 20, 21, 22] },
  { num: 'Fechamento', title: 'Plano, glossário e fontes', chapters: [23] }
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

console.log('--- INICIANDO COMPILAÇÃO EDITORIAL: MANUAL PI NETWORK ---');

const aberturaPath = path.join(CONTENT_DIR, 'abertura.md');
const aberturaMd = fs.existsSync(aberturaPath) ? fs.readFileSync(aberturaPath, 'utf8') : '';

let fullMarkdown = aberturaMd + '\n';
let totalChapters = 0;

for (const part of PARTS) {
  fullMarkdown += `\n\n# ${part.num} — ${part.title}\n\n`;
  for (const ch of part.chapters) {
    const chFile = path.join(CHAPTERS_DIR, `${pad2(ch)}.md`);
    if (!fs.existsSync(chFile)) {
      console.error(`Erro: Capítulo não encontrado: ${chFile}`);
      process.exit(1);
    }
    const chContent = fs.readFileSync(chFile, 'utf8');
    fullMarkdown += `\n\n<!-- CHAPTER_${pad2(ch)} -->\n\n` + chContent;
    totalChapters++;
  }
}

const outMdPath = path.join(DIST_DIR, 'Manual-Pi-Network_COMPLETO.md');
fs.writeFileSync(outMdPath, fullMarkdown, 'utf8');

console.log(`[OK] ${totalChapters} capítulos verificados com sucesso.`);
console.log(`[OK] Markdown unificado salvo em: ${outMdPath} (${(Buffer.byteLength(fullMarkdown, 'utf8') / 1024).toFixed(1)} KB)`);
console.log(`[OK] Estilo base: ${path.join(ASSETS_DIR, 'style.css')}`);
